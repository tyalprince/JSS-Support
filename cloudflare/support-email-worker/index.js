// Cloudflare Email Worker for help@/questions@/support@/info@jumpstartsportspgh.com.
// Parses the raw inbound email, forwards a copy to tprince@jumpstartsports.com (unchanged
// behavior), and POSTs a clean JSON payload to JSS-Support's /api/inbound/email, which creates
// a prospect-channel support ticket.
//
// MIME-parsing logic below is copied verbatim from jss-hiring-indeed-email-worker — it isn't
// actually Indeed-specific, it's a general raw-email parser reused here as-is.
//
// Deploy: Cloudflare dashboard -> Workers & Pages -> Create Worker -> paste this file as the
// only source -> Settings -> Variables and Secrets, add:
//   TARGET_URL              = https://jss-support.vercel.app/api/inbound/email
//   SUPPORT_INBOUND_SECRET  = (the value given alongside this file — set as a Secret, not plaintext)
// Then in Email Routing -> Routing rules, point help@/questions@/support@/info@ at this worker
// as the "Send to a Worker" action.

export default {
  async email(message, env, ctx) {
    try {
      const raw = await streamToText(message.raw);
      const { headers, body } = splitHeaders(raw);
      const contentType = headers["content-type"] || "text/plain";
      const subject = decodeHeaderValue(headers["subject"] || "");

      const parts = { text: "", html: "", attachments: [] };
      parseBodyPart(contentType, headers["content-transfer-encoding"] || "7bit", body, parts);

      const payload = {
        from: message.from,
        to: message.to,
        subject,
        text: parts.text || stripHtml(parts.html) || "",
        html: parts.html || "",
      };

      ctx.waitUntil(
        (async () => {
          try {
            await message.forward("tprince@jumpstartsports.com");
          } catch (err) {
            console.error("Failed to forward inbound support email:", err);
          }
        })()
      );

      const response = await fetch(env.TARGET_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${env.SUPPORT_INBOUND_SECRET}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        console.error(`Inbound webhook responded ${response.status}: ${await response.text()}`);
      }
    } catch (err) {
      console.error("Failed to parse/forward inbound support email:", err);
    }
  },
};

async function streamToText(stream) {
  const reader = stream.getReader();
  const chunks = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      total += value.length;
    }
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return new TextDecoder("utf-8").decode(bytes);
}

function splitHeaders(raw) {
  const crlfIdx = raw.indexOf("\r\n\r\n");
  const lfIdx = raw.indexOf("\n\n");
  const useCrlf = crlfIdx !== -1 && (lfIdx === -1 || crlfIdx <= lfIdx);
  const headerEnd = useCrlf ? crlfIdx : lfIdx;
  const sepLen = useCrlf ? 4 : 2;
  if (headerEnd === -1) return { headers: {}, body: raw };
  const headerBlock = raw.slice(0, headerEnd);
  const body = raw.slice(headerEnd + sepLen);
  return { headers: parseHeaderBlock(headerBlock), body };
}

function parseHeaderBlock(block) {
  const unfolded = block.replace(/\r?\n[ \t]+/g, " ");
  const headers = {};
  for (const line of unfolded.split(/\r?\n/)) {
    const m = line.match(/^([^:]+):\s*(.*)$/);
    if (m) headers[m[1].toLowerCase().trim()] = m[2].trim();
  }
  return headers;
}

function getHeaderParam(headerValue, param) {
  const re = new RegExp(param + '="?([^";]+)"?', "i");
  const m = headerValue.match(re);
  return m ? m[1] : null;
}

function decodeHeaderValue(value) {
  return value.replace(/=\?([^?]+)\?([BQ])\?([^?]*)\?=/gi, (_match, charset, enc, text) => {
    try {
      if (enc.toUpperCase() === "B") {
        const bin = atob(text);
        const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
        return new TextDecoder(charset.toLowerCase()).decode(bytes);
      }
      return decodeQuotedPrintable(text.replace(/_/g, " "));
    } catch {
      return text;
    }
  });
}

function decodeQuotedPrintable(text) {
  const withoutSoftBreaks = text.replace(/=\r?\n/g, "");
  const bytes = [];
  for (let i = 0; i < withoutSoftBreaks.length; i++) {
    if (withoutSoftBreaks[i] === "=" && i + 2 < withoutSoftBreaks.length) {
      const hex = withoutSoftBreaks.slice(i + 1, i + 3);
      if (/^[0-9A-Fa-f]{2}$/.test(hex)) {
        bytes.push(parseInt(hex, 16));
        i += 2;
        continue;
      }
    }
    bytes.push(withoutSoftBreaks.charCodeAt(i));
  }
  return new TextDecoder("utf-8").decode(new Uint8Array(bytes));
}

function parseBodyPart(contentType, transferEncoding, body, out) {
  const typeMatch = contentType.match(/^([^;]+)/);
  const mime = (typeMatch ? typeMatch[1] : "text/plain").trim().toLowerCase();

  if (mime.startsWith("multipart/")) {
    const boundary = getHeaderParam(contentType, "boundary");
    if (!boundary) return;
    for (const rawPart of body.split("--" + boundary)) {
      const trimmed = rawPart.replace(/^\r?\n/, "");
      if (!trimmed || trimmed.startsWith("--")) continue;
      const { headers: partHeaders, body: partBody } = splitHeaders(trimmed);
      const partContentType = partHeaders["content-type"] || "text/plain";
      const partEncoding = (partHeaders["content-transfer-encoding"] || "7bit").toLowerCase();
      const disposition = partHeaders["content-disposition"] || "";
      const filename = getHeaderParam(disposition, "filename") || getHeaderParam(partContentType, "name");

      if (!filename) {
        parseBodyPart(partContentType, partEncoding, partBody, out);
      }
    }
  } else if (mime === "text/html") {
    out.html += decodeTextBody(body, transferEncoding);
  } else {
    out.text += decodeTextBody(body, transferEncoding);
  }
}

function decodeTextBody(body, encoding) {
  const enc = (encoding || "7bit").toLowerCase();
  if (enc === "base64") {
    try {
      const bin = atob(body.replace(/\r?\n/g, ""));
      return new TextDecoder("utf-8").decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
    } catch {
      return body;
    }
  }
  if (enc === "quoted-printable") return decodeQuotedPrintable(body);
  return body;
}

function stripHtml(html) {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

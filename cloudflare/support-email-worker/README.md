# support-email-worker

Cloudflare Email Worker that turns inbound mail to `help@`, `questions@`, `support@`, and
`info@` on both `jumpstartsportspittsburgh.com` and the legacy `jumpstartsportspgh.com` into
`prospect`-channel tickets in JSS-Support, while still forwarding a copy to
`tprince@jumpstartsports.com` like today. The ticket records which address it came in on, and
staff replies go out from that same address.

## Deploy

1. Cloudflare dashboard → Workers & Pages → Create → paste `index.js` as the worker's source,
   name it `jss-support-email-worker`, deploy.
2. Worker → Settings → Variables and Secrets:
   - `TARGET_URL` (plaintext) = `https://support.jumpstartsportspittsburgh.com/api/inbound/email`
     Use this exact host. Older hosts (`jss-support.vercel.app`, `jss-support-pittsburgh.vercel.app`)
     may redirect, and a redirect drops the `Authorization` header, so every email gets a 401 and
     no ticket (broken Oct 6-15, 2026). The target must not redirect.
   - `SUPPORT_INBOUND_SECRET` (**encrypt** — Secret, not plaintext) = the value given alongside
     this file. It must match `SUPPORT_INBOUND_SECRET` set on the JSS-Support Vercel project.
3. Email Routing → Routing rules, on **both** zones (`jumpstartsportspittsburgh.com` and
   `jumpstartsportspgh.com`) → for each of `help@`, `questions@`, `support@`, `info@`:
   change (or create) the action "Send to a Worker" → select `jss-support-email-worker`.

`tprince@jumpstartsports.com` needs to already be a verified destination address in Email
Routing for the `message.forward()` call to succeed (it already is, since it's the existing
forwarding target for these addresses).

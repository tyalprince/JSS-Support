# support-email-worker

Cloudflare Email Worker that turns inbound mail to `help@`, `questions@`, `support@`, and
`info@jumpstartsportspgh.com` into `prospect`-channel tickets in JSS-Support, while still
forwarding a copy to `tprince@jumpstartsports.com` like today.

## Deploy

1. Cloudflare dashboard → Workers & Pages → Create → paste `index.js` as the worker's source,
   name it `jss-support-email-worker`, deploy.
2. Worker → Settings → Variables and Secrets:
   - `TARGET_URL` (plaintext) = `https://jss-support.vercel.app/api/inbound/email`
   - `SUPPORT_INBOUND_SECRET` (**encrypt** — Secret, not plaintext) = the value given alongside
     this file. It must match `SUPPORT_INBOUND_SECRET` set on the JSS-Support Vercel project.
3. Email Routing → Routing rules → for each of `help@`, `questions@`, `support@`, `info@`:
   change the action from "Send to an email" to "Send to a Worker" → select
   `jss-support-email-worker`.

`tprince@jumpstartsports.com` needs to already be a verified destination address in Email
Routing for the `message.forward()` call to succeed (it already is, since it's the existing
forwarding target for these addresses).

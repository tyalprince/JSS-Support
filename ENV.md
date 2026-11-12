# Environment variables

Derived from the code (`process.env.*` in `api/**`, `import.meta.env.*` in `src/**`).
**Client** = exposed to the browser at build time (`VITE_` prefix; never put secrets here). **Server** = Vercel serverless functions only.

| Variable | Scope | Required | Notes |
|---|---|---|---|
| `VITE_SUPABASE_URL` | Client (server falls back to it) | Yes | Supabase project URL. |
| `VITE_SUPABASE_ANON_KEY` | Client | Yes | Anon/publishable key. |
| `VITE_SUPABASE_SCHEMA` | Client | No (default `public`) | Postgres schema for the browser client (PostgREST `db.schema`). Must be an exposed schema. Auth is not schema-scoped. |
| `SUPABASE_SCHEMA` | Server | No (default `public`) | Same, for `api/**`. Keep equal to `VITE_SUPABASE_SCHEMA`. |
| `SUPABASE_URL` | Server | Yes (or `VITE_SUPABASE_URL`) | |
| `SUPABASE_SERVICE_ROLE_KEY` | Server | Yes | Service-role key (bypasses RLS). |
| `RESEND_API_KEY` | Server | Yes for email replies | `api/_lib/sendEmail.js`. |
| `TELNYX_API_KEY` | Server | Yes for SMS replies | `api/_lib/sendSms.js`. |
| `TELNYX_PHONE_NUMBER` | Server | Yes for SMS replies | Sender number. |
| `ANTHROPIC_API_KEY` | Server | Yes for AI drafts | `api/tickets/[id]/draft.js`. Not blocked in sandbox. |
| `SANDBOX_MODE` | Server | No (unset = off) | `true`: Telnyx SMS never called (success-shaped result); Resend email only to `SANDBOX_EMAIL_ALLOWLIST` with subject prefixed `[SANDBOX] `. |
| `SANDBOX_EMAIL_ALLOWLIST` | Server | Only with `SANDBOX_MODE=true` | Comma-separated exact addresses or `@domain`. Unset/empty = no email sent. |
| `JSS_FRANCHISE` / `VITE_JSS_FRANCHISE` | Server / Client | No (unset = detected from `VERCEL_PROJECT_PRODUCTION_URL` / hostname, else `pittsburgh`) | Franchise slug (`src/lib/jssApps.js` `franchiseConfig`). Drives app-switcher links and `api/_lib/site.js`. |
| `JSS_SITE_DOMAIN` / `VITE_JSS_SITE_DOMAIN` | Server / Client | No (unset = the franchise's known domain, else none) | Franchise domain: this app at `support.<domain>` (email logo URL), public site `www.<domain>`, sibling apps at `crm.<domain>`, ... |
| `JSS_EMAIL_DOMAIN` / `VITE_JSS_EMAIL_DOMAIN` | Server | No (unset = site domain, else `jumpstartsportspittsburgh.com`) | Sending domain: `support@`/`info@`, the inbound addresses replies may come from, and the own-sender filter (which also always recognises Pittsburgh's domains). |

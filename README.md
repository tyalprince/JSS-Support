# JSS Support

Staff support-ticket portal for Jump Start Sports, built against the shared "JSS DB" Supabase
project (same database backing jss-crm, jss-staff-portal, jss-family-portal, and the vendor
portal). Vite + React SPA with Vercel serverless functions, matching the stack used by
jss-staff-portal and jumpstart-sports-portal.

## Local development

```
npm install
cp .env.example .env   # fill in VITE_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, etc.
npm run dev
```

`npm run dev` serves the SPA only — the `/api/*` serverless functions need `vercel dev` (or a
deployed preview) to run.

## Structure

- `src/` — the SPA (routing, auth, dashboard/tabs, ticket detail, AI draft UI)
- `api/` — Vercel serverless functions (service-role DB access, Resend/Telnyx/Anthropic calls)
- `supabase/migrations/` — schema history mirroring what's applied to the shared project

## Routes

- `/` — dashboard (tiered channels, overdue section, assigned-to-me toggle)
- `/tickets/:key` — either a channel tab (`prospect`, `program`, `camp`, `franchise`, `team`,
  `hiring`, `partner`) or a single ticket's detail page, depending on whether `:key` matches a
  known channel

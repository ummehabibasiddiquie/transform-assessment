# TRANSFORM Assessment

Work-simulation hiring for Operations Executive. Staff use the console. Candidates open a private link.

## Run locally

```bash
npm install
npm run setup
npm run dev
```

Open http://localhost:3000

- Admin: `ivan.p@example.net` / `transform123`
- Designer: `zara.a@example.net` / `transform123`
- Evaluator: `ivan.p@example.net` / `transform123`
- Hiring manager: `maria.s@example.com` / `transform123`

Candidates are not registered. Invite them from **Invite candidate**. Add more staff from **Staff users** (admin only).

Invite a candidate from the console and copy the assessment link. Email delivery is not required for this version.

Reset demo data with `npm run db:reset`.

## Deploy on Vercel

Local development uses **SQLite** (`file:./dev.db`). That file is not on Vercel and cannot be used in production — Vercel’s disk is empty on every deploy, so there are no staff accounts and login fails.

Use hosted **Postgres** (Neon is simplest):

1. Create a free database at [neon.tech](https://neon.tech) and copy the connection string (`postgresql://...sslmode=require`).
2. In Vercel → Project → Settings → Environment Variables, add for **Production**:
   - `DATABASE_URL` — the Neon / Postgres URL
   - `AUTH_SECRET` — a long random string (PowerShell: `[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }) -as [byte[]])`)
3. Redeploy. The Vercel build creates the tables and the demo staff accounts.

Login: `ivan.p@example.net` / `transform123`

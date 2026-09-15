# TRANSFORM Assessment

Work-simulation hiring for Operations Executive. Staff use the console. Candidates open a private link.

## Run locally

```bash
npm install
npm run setup
npm run dev
```

Open http://localhost:3000

- Staff: `ivan.p@example.net` / `transform123`

Invite a candidate from the console and copy the assessment link. Email delivery is not required for this version.

Reset demo data with `npm run db:reset`.

## Deploy on Vercel

This app is a Next.js project, so Vercel can host it. Do not use the local SQLite file in production — Vercel’s filesystem does not keep that data. Use a hosted Postgres database (Neon, Vercel Postgres, or Supabase) and set:

- `DATABASE_URL` — Postgres connection string
- `AUTH_SECRET` — a long random string (for example from `openssl rand -base64 32`)

After the first deploy, run Prisma against that database (`prisma db push` and `prisma db seed`) so roles and the Operations Executive paper exist.

Change `prisma/schema.prisma` `provider` from `sqlite` to `postgresql` before pointing `DATABASE_URL` at Postgres.

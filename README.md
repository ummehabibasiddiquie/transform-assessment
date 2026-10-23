# TRANSFORM Assessment

Work-simulation hiring for Operations Executive. Staff use the console. Candidates open a private link.

## Run locally

Local development uses **MySQL** from XAMPP, like the other internal apps.

1. Start MySQL in XAMPP and create a database named `transform_assessment` in phpMyAdmin (collation `utf8mb4_unicode_ci`).
2. Copy `.env.example` to `.env`. The default `DATABASE_URL` uses user `root` with no password.
3. Run:

```bash
npm install
npm run setup
npm run import:library "path/to/TRANSFORM_Master_Assessment_Content_Library_V4.xlsx"
npm run dev
```

Open http://localhost:3000

- Admin: `yahya.irani@example.net` / `transform123`
- Evaluator: `shirin.gafoor@example.net` / `transform123`
- Evaluator: `ivan.p@example.net` / `transform123`

The app has two staff roles: **Admin** and **Evaluator**. Assessment design and hiring-manager tasks (designing papers, managing the content library, final decisions) are done by the Admin. The seed script deactivates the old Designer and Hiring Manager demo accounts.

Candidates are not registered. Invite them from **Invite candidate**. Add more staff from **Staff users** (admin only).

Invite a candidate from the console and copy the assessment link. Email delivery is not required for this version.

Reset demo data with `npm run db:reset`.

Import the V4 content library with `npm run import:library "path/to/file.xlsx"`, or upload it from **Content library** in the staff console.

## Deploy on Vercel

Vercel uses hosted **Postgres** and its own schema file, `prisma/schema.postgres.prisma`. Keep it in step with `prisma/schema.prisma` when the database changes.

1. Create a free database at [neon.tech](https://neon.tech) and copy the connection string (`postgresql://...sslmode=require`).
2. In Vercel → Project → Settings → Environment Variables, add for **Production**:
   - `DATABASE_URL` — the Neon / Postgres URL
   - `AUTH_SECRET` — a long random string (PowerShell: `[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }) -as [byte[]])`)
3. Redeploy. The Vercel build creates the tables and the demo staff accounts.

Login (Admin): `yahya.irani@example.net` / `transform123`

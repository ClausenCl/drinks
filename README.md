# Drinks Tracker

Self-hosted drinks tracking app (dormitory use), built with Next.js + PostgreSQL + Prisma.

## Local dev (recommended)

1. Start Postgres:
   - `docker compose -f docker/docker-compose.yml up -d db`
2. Create `app/frontend/.env.local` based on `app/frontend/.env.local.example`.
3. Run migrations + seed:
   - `cd app/frontend && npm run db:migrate`
   - `cd app/frontend && npm run db:seed`
4. Start the app:
   - `cd app/frontend && npm run dev`

Seeded users:
- `admin` / `admin`
- `manager` / `manager`
- resident account: name `resident` with PIN `1234` (resident flow via house picker)

Usernames are treated case-insensitively on login (so `Admin` works too).

## How to use (current UX)

- Residents:
  - Open `/` and pick a house (A–E).
  - Pick your name; depending on your setting, PIN is requested either immediately or deferred.
  - Buying drinks (`/menu` and `/fridge/[id]`) does not require PIN in deferred mode.
  - PIN is required for protected resident pages such as History, Bills and Settings.
  - New member creation requires a 4-digit PIN and supports an optional “ask PIN immediately after name selection” mode.
- Admin / Getränkeminister:
  - Open `/` → click the small “Admin / Getränkeminister login” link (or go to `/admin-login`).
  - Sign in with `loginName` + password (admins/ministers are not drink-consumer accounts).
  - Fridge management now includes downloadable fridge QR codes (`PNG`) that deep-link to the fridge page.

## Production deployment notes

- Production compose (`docker/docker-compose.prod.yml`) now runs:
  - `web` (Next.js app),
  - `db` (Postgres),
  - `proxy` (Caddy on port `80`, removes `:3000` from the user URL),
  - `backup` (daily backup loop with optional SMTP email delivery).
- Set `PUBLIC_BASE_URL` (for QR links), e.g. `http://drinks.local`.
- To use email backups, set: `BACKUP_EMAIL_TO`, `BACKUP_EMAIL_FROM`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`.
- Backup defaults: enabled, every 24h (`BACKUP_INTERVAL_SECONDS=86400`), retention 14 days.

## Notes
- Prisma schema lives at `prisma/schema.prisma`.
- API routes are in `app/frontend/pages/api/*` and call shared code in `backend/*`.

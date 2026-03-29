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
  - Pick your name and enter your PIN.
  - New member creation requires a 4-digit PIN and supports an optional “ask PIN on purchase” mode.
- Admin / Getränkeminister:
  - Open `/` → click the small “Admin / Getränkeminister login” link (or go to `/admin-login`).
  - Sign in with `loginName` + password (admins/ministers are not drink-consumer accounts).

## Notes
- Prisma schema lives at `prisma/schema.prisma`.
- API routes are in `app/frontend/pages/api/*` and call shared code in `backend/*`.

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
- `resident` / `resident`

Usernames are treated case-insensitively on login (so `Admin` works too).

## Notes
- Prisma schema lives at `prisma/schema.prisma`.
- API routes are in `app/frontend/pages/api/*` and call shared code in `backend/*`.

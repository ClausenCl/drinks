# Frontend app (Next.js)

This folder contains the Drinks Tracker web app (UI + API routes).

## Local run

From this folder:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Database commands

The DB scripts load env from `app/frontend/.env.local`.

```bash
npm run db:migrate
npm run db:seed
```

## Useful scripts

- `npm run build` - production build
- `npm run start` - run built app
- `npm run lint` - lint TypeScript/React
- `npm run backup:run` - create one DB backup dump (and email it if SMTP is configured)
- `npm run backup:loop` - run continuous backup loop (used by production backup service)
- `npm run backup:restore:drill` - restore latest dump into test DB (`BACKUP_RESTORE_TEST_DB_URL` required)

## Structure

- `pages/` - pages router UI routes
- `pages/api/` - API handlers
- `components/` - shared UI components
- `scripts/` - prisma/env helper scripts

## Ops routes

- `admin.tsx`, `manager.tsx` are operation landing pages.
- `buy.tsx` is the dedicated resident buy-only landing route (`/menu` redirects to `/buy`).
- Domain pages:
  - `/admin/residents`, `/admin/fridges`, `/admin/finance`, `/admin/system`
  - `/manager/residents`, `/manager/fridges`, `/manager/finance`, `/manager/system`
- Printable fridge QR sheets:
  - `/admin/fridges-qr-sheet`
  - `/manager/fridges-qr-sheet`
- Resident detail workspace:
  - `/admin/residents/[id]`
  - `/manager/residents/[id]`

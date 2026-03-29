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

## Structure

- `pages/` - pages router UI routes
- `pages/api/` - API handlers
- `components/` - shared UI components
- `scripts/` - prisma/env helper scripts

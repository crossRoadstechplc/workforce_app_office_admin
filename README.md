# Workforce Control — Admin / CEO Portal

Production-oriented Next.js admin application for the workforce backend.

## Stack
- Next.js App Router + TypeScript
- Tailwind CSS
- TanStack Query / TanStack Table
- React Hook Form + Zod foundation
- Recharts
- Socket.IO client
- Vitest + React Testing Library
  
## Implemented modules
Dashboard, employee management, offices, schedules, attendance, worksheets, leave decisions, reports/CSV export, audit activity, notifications, realtime refresh, authentication/session handling, QA/release safeguards.

## Security model
The Express backend remains authoritative for role/permission checks and business rules. The Next.js BFF stores refresh tokens in an HttpOnly cookie. Access tokens live only in browser memory. Socket.IO authenticates with the current access token and only triggers REST-backed query invalidation.

## Local setup
```bash
cp .env.example .env.local
npm install
npm run dev
```

Expected backend defaults:
```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api/v1
BACKEND_API_BASE_URL=http://localhost:4000/api/v1
NEXT_PUBLIC_SOCKET_BASE_URL=http://localhost:4000
```

## QA
```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm run test:e2e
```

## Production
See `docs/RELEASE.md` and `docs/QA.md`.

The current backend only exposes recent audit activity through `/admin/dashboard/recent-activity?limit=100`; if full audit pagination/filtering is required later, add a dedicated backend audit endpoint rather than duplicating audit data in the frontend.

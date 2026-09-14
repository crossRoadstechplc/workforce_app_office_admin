# Admin portal production release

## Required environment
- `NEXT_PUBLIC_API_BASE_URL=https://api.example.com/api/v1`
- `BACKEND_API_BASE_URL=https://api.example.com/api/v1`
- `NEXT_PUBLIC_SOCKET_BASE_URL=https://api.example.com`
- `NEXT_PUBLIC_TASK_TRACKER_URL=https://your-task-tracker.vercel.app`
- `NEXT_PUBLIC_EMPLOYEE_WEB_URL=https://your-employee-app.web.app`
- `NEXT_PUBLIC_EMPLOYEE_APP_STORE_URL=https://apps.apple.com/app/idXXXXXXXX` (optional until listed)
- `NEXT_PUBLIC_EMPLOYEE_PLAY_STORE_URL=https://play.google.com/store/apps/details?id=workforce.app` (optional until listed)
- `NEXT_PUBLIC_EMPLOYEE_APP_SCHEME=workforce` (must match native URL scheme)
- `NEXT_PUBLIC_EMPLOYEE_ANDROID_PACKAGE=workforce.app`
- `NODE_ENV=production`

The API and Socket.IO URLs must use HTTPS in production.
`NEXT_PUBLIC_TASK_TRACKER_URL` is the public SPX Task Tracker origin (Continue handoff). Redeploy the portal after changing it.
`NEXT_PUBLIC_EMPLOYEE_*` powers the invite success screen (Open app / Get the app / Continue on web).

## Quality gate
```bash
npm ci
npm run lint
npm run typecheck
npm run test
npm run build
npm run test:e2e
```

## Production build
```bash
NEXT_PUBLIC_API_BASE_URL=https://api.example.com/api/v1 \
BACKEND_API_BASE_URL=https://api.example.com/api/v1 \
NEXT_PUBLIC_SOCKET_BASE_URL=https://api.example.com \
NODE_ENV=production \
npm run build:production
```

## Deployment
Deploy the Next.js server to Vercel or a Node/Docker host. Keep the Express API and Socket.IO endpoint reachable over TLS. Configure backend CORS for the exact admin portal origin. The refresh token stays in a Secure/HttpOnly Next.js cookie; the access token remains in browser memory.

## Release checks
- Admin login/refresh/logout
- Dashboard metrics and realtime invalidation
- Employee create/status/password reset
- Office and schedule edits
- Attendance correction
- Worksheet review
- Leave approve/reject
- CSV report download
- Audit activity display
- Notification unread/read behavior
- Keyboard navigation and focus visibility
- 390px, 768px, 1024px, 1440px widths

# Admin portal phases

## W0 — Foundation & design system — implemented
Next.js App Router, TypeScript, Tailwind CSS, source-owned UI primitives, responsive shell, query client, tables, cards, status language, loading/error states.

## W1 — Authentication — implemented
Next.js BFF login/refresh/logout handlers, HttpOnly refresh token, in-memory access token, ADMIN enforcement, session restore.

## W2 — Dashboard — implemented
Today metrics, attendance trend, leave summary, recent activity, refetch-ready query keys.

## W3 — Employee management — implemented
Employee list/search/pagination, create, detail, status changes, temporary password reset, office/schedule assignment.

## W4 — Offices & schedules — implemented
Office/geofence CRUD, activation safeguards, work schedule CRUD, working-day selection, late-grace explanation.

## W5 — Attendance & worksheets — implemented
Attendance filtering, timesheet details, location evidence, audited corrections, worksheet review and admin comments.

## W6 — Leave — implemented
Pending queue, history, request details, approve/reject with reason validation and realtime-safe refetch.

## W7 — Reports & audit — implemented
Timesheet/worksheet/leave reports, CSV export, recent audit activity. The current backend exposes the latest 100 audit entries rather than a dedicated paginated audit endpoint.

## W8 — Notifications & realtime — implemented
Persistent notifications, unread badge/read controls, authenticated Socket.IO connection, event-driven TanStack Query invalidation. REST remains authoritative.

## W9 — QA & production — implemented
Security headers, global error/not-found/loading boundaries, Playwright smoke/responsive tests, unit tests, production environment guard, QA/release documentation.

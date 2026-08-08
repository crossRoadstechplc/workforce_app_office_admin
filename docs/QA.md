# W9 QA checklist

## Accessibility
- Keyboard access for navigation, dialogs, forms, and row actions
- Visible focus ring
- Semantic buttons/links and labeled form controls
- Status uses text as well as color
- Table containers scroll horizontally on narrow viewports
- Minimum practical control height ~40px

## Responsive targets
- 390 x 844: login and emergency admin access
- 768 x 1024: tablet operations
- 1024 x 768: compact desktop
- 1440 x 900: primary CEO/admin experience
- 1920 x 1080: large operations display

## Failure UX
- Global error boundary
- Route skeletons
- API errors surfaced through toast/error states
- REST remains authoritative when Socket.IO disconnects
- No optimistic mutation for attendance/leave decisions

## Security review
- Refresh token HttpOnly/Secure in production
- Access token not persisted to localStorage
- ADMIN role enforced after session restore
- Backend permissions remain authoritative
- Security response headers enabled
- Browser geolocation/camera/microphone disabled for admin portal by Permissions-Policy
- CSV export requires backend `report.export`

import { CalendarRange } from "lucide-react";
import { integrationApiBaseUrl } from "@/features/integrations/integration-api";
import type { ApiDoc } from "../types";

const room = {
  id: "8b0c0f52-6d1e-4b8a-9c1f-2a7d3e5b9f10",
  name: "Board room",
  location: "2nd floor",
  capacity: 10,
  amenities: ["TV", "Whiteboard"],
  office: { id: "3f9a1c2e-…", name: "HQ", timezone: "Africa/Addis_Ababa" }
};

const booking = {
  id: "c1d2e3f4-5a6b-4c7d-8e9f-0a1b2c3d4e5f",
  status: "BOOKED",
  source: "API",
  externalId: "SPX-REQ-12345",
  title: "Client meeting",
  notes: "Contract review",
  startsAt: "2026-11-20T07:00:00.000Z",
  endsAt: "2026-11-20T08:00:00.000Z",
  room: { id: room.id, name: room.name, location: room.location },
  office: room.office,
  employee: { employeeCode: "SPX001", name: "Abebe Kebede" },
  createdAt: "2026-11-19T09:12:00.000Z",
  rescheduledAt: null,
  cancelledAt: null,
  cancelReason: null
};

const meta = { page: 1, pageSize: 20, total: 1, totalPages: 1 };
const idParam = { name: "id", type: "uuid", required: true, description: "Booking id returned when the booking was created." };

export const meetingBookingDoc: ApiDoc = {
  slug: "meeting-booking",
  title: "Meeting booking API",
  summary: "Book meeting rooms for employees from another app, using their employee code (e.g. SPX001).",
  icon: CalendarRange,
  version: "v1",
  updatedAt: "2026-11-19",
  baseUrl: integrationApiBaseUrl,
  basics: [
    { label: "Base URL", value: integrationApiBaseUrl, mono: true },
    { label: "Auth", value: "X-API-Key header", mono: true },
    { label: "Format", value: "JSON (Content-Type: application/json)" },
    { label: "Times", value: "ISO 8601 with offset, e.g. 2026-11-20T10:00:00+03:00. Responses are UTC." },
    { label: "Rate limit", value: "60 requests per minute per key" }
  ],
  auth: {
    header: "X-API-Key",
    example: "X-API-Key: wfk_live_ab12cd34_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    notes: [
      "A company admin creates the key in Meetings → API access. It is shown only once.",
      "Keep the key on your server — never in a mobile app, browser or Git repository.",
      "A key belongs to one company and may be limited to some offices."
    ]
  },
  envelope: {
    success: { data: { "…": "…" } },
    error: {
      error: { code: "ROOM_UNAVAILABLE", message: "That room is already booked for this time", details: {}, requestId: "9f1c…" }
    }
  },
  endpoints: [
    {
      id: "list-rooms",
      method: "GET",
      path: "/rooms",
      title: "List rooms",
      summary: "Active rooms this key is allowed to book.",
      queryExample: "?page=1&pageSize=20",
      query: [
        { name: "officeId", type: "uuid", description: "Only rooms in this office." },
        { name: "page", type: "number", description: "Default 1." },
        { name: "pageSize", type: "number", description: "Default 20, max 100." }
      ],
      responses: [{ status: 200, label: "OK", example: { data: { items: [room], meta } } }]
    },
    {
      id: "availability",
      method: "GET",
      path: "/rooms/{roomId}/availability",
      title: "Room availability",
      summary: "Busy slots for one day in the room's office time zone.",
      queryExample: "?date=2026-11-20",
      pathParams: [{ name: "roomId", type: "uuid", required: true, description: "From List rooms." }],
      query: [{ name: "date", type: "YYYY-MM-DD", required: true, description: "Calendar day in the office time zone." }],
      responses: [
        {
          status: 200,
          label: "OK",
          example: {
            data: {
              room: { id: room.id, name: room.name, capacity: room.capacity, isActive: true, office: room.office },
              date: "2026-11-20",
              timezone: "Africa/Addis_Ababa",
              busy: [
                { startsAt: "2026-11-20T06:00:00.000Z", endsAt: "2026-11-20T07:00:00.000Z", mine: false, bookingId: null, title: "Booked" }
              ]
            }
          }
        }
      ],
      notes: ["Titles of meetings not booked by your key are hidden (\"Booked\")."]
    },
    {
      id: "check-employee",
      method: "GET",
      path: "/employees/{employeeCode}",
      title: "Check employee",
      summary: "Optional: confirm an employee code before booking.",
      pathParams: [{ name: "employeeCode", type: "string", required: true, description: "e.g. SPX001 (not case-sensitive)." }],
      responses: [
        {
          status: 200,
          label: "OK",
          example: { data: { employeeCode: "SPX001", name: "Abebe Kebede", status: "ACTIVE", office: { id: "3f9a1c2e-…", name: "HQ" } } }
        },
        { status: 404, label: "Not found", example: { error: { code: "EMPLOYEE_NOT_FOUND", message: "No employee with code SPX999 in this company" } } }
      ]
    },
    {
      id: "create-booking",
      method: "POST",
      path: "/bookings",
      title: "Create booking",
      summary: "Book a room for an employee. It appears in their app, on the lobby display and in the admin portal.",
      body: [
        { name: "employeeCode", type: "string", required: true, description: "Who the meeting is for." },
        { name: "roomId", type: "uuid", required: true, description: "From List rooms." },
        { name: "title", type: "string", required: true, description: "Reason / subject, 2–200 characters." },
        { name: "notes", type: "string", description: "Up to 2000 characters." },
        { name: "startsAt", type: "datetime", required: true, description: "ISO 8601 with offset." },
        { name: "endsAt", type: "datetime", required: true, description: "15 minutes to 8 hours after start." },
        { name: "externalId", type: "string", description: "Your own id. Recommended — makes retries safe." }
      ],
      requestExample: {
        employeeCode: "SPX001",
        roomId: room.id,
        title: "Client meeting",
        notes: "Contract review",
        startsAt: "2026-11-20T10:00:00+03:00",
        endsAt: "2026-11-20T11:00:00+03:00",
        externalId: "SPX-REQ-12345"
      },
      responses: [
        { status: 201, label: "Created", example: { data: booking } },
        { status: 200, label: "Replay", note: "Same externalId, employee, room and time sent again — returns the original booking." },
        {
          status: 409,
          label: "Room taken",
          example: {
            error: {
              code: "ROOM_UNAVAILABLE",
              message: "That room is already booked for this time",
              details: { startsAt: "2026-11-20T06:30:00.000Z", endsAt: "2026-11-20T07:30:00.000Z" }
            }
          }
        }
      ],
      notes: [
        "Retrying after a timeout? Send the same externalId — no duplicate is created.",
        "Same externalId with a different employee, room or time returns 409 EXTERNAL_ID_CONFLICT."
      ]
    },
    {
      id: "list-bookings",
      method: "GET",
      path: "/bookings",
      title: "List your bookings",
      summary: "Bookings created with your key.",
      queryExample: "?employeeCode=SPX001&status=BOOKED",
      query: [
        { name: "employeeCode", type: "string", description: "Only this employee." },
        { name: "status", type: "BOOKED | CANCELLED", description: "Filter by status." },
        { name: "from / to", type: "datetime", description: "Start time range, ISO 8601 with offset." },
        { name: "externalId", type: "string", description: "Find by your own id." },
        { name: "page / pageSize", type: "number", description: "Default 1 / 20." }
      ],
      responses: [{ status: 200, label: "OK", example: { data: { items: [booking], meta } } }]
    },
    {
      id: "get-booking",
      method: "GET",
      path: "/bookings/{id}",
      title: "Get booking",
      summary: "One booking created with your key.",
      pathParams: [idParam],
      responses: [{ status: 200, label: "OK", example: { data: booking } }]
    },
    {
      id: "reschedule-booking",
      method: "PATCH",
      path: "/bookings/{id}",
      title: "Reschedule booking",
      summary: "Change the time, room or title. Send at least one field. The employee is notified.",
      pathParams: [idParam],
      body: [
        { name: "startsAt", type: "datetime", description: "New start." },
        { name: "endsAt", type: "datetime", description: "New end." },
        { name: "roomId", type: "uuid", description: "Move to another room." },
        { name: "title", type: "string", description: "New title." }
      ],
      requestExample: { startsAt: "2026-11-20T14:00:00+03:00", endsAt: "2026-11-20T15:00:00+03:00" },
      responses: [
        {
          status: 200,
          label: "OK",
          example: { data: { ...booking, startsAt: "2026-11-20T11:00:00.000Z", endsAt: "2026-11-20T12:00:00.000Z", rescheduledAt: "2026-11-19T10:05:00.000Z" } }
        }
      ]
    },
    {
      id: "cancel-booking",
      method: "POST",
      path: "/bookings/{id}/cancel",
      title: "Cancel booking",
      summary: "Cancel a booking. Cancelling twice is safe. The employee is notified.",
      pathParams: [idParam],
      body: [{ name: "reason", type: "string", description: "Optional, up to 500 characters." }],
      requestExample: { reason: "Client postponed" },
      responses: [
        {
          status: 200,
          label: "OK",
          example: { data: { ...booking, status: "CANCELLED", cancelledAt: "2026-11-19T10:10:00.000Z", cancelReason: "Client postponed" } }
        }
      ]
    }
  ],
  errors: [
    {
      status: 400,
      codes: [
        { code: "VALIDATION_ERROR", meaning: "A field is missing or invalid (see details.issues)." },
        { code: "INVALID_TIME / INVALID_DURATION / PAST_SLOT", meaning: "Problem with the start/end time." },
        { code: "ROOM_INACTIVE", meaning: "The room is switched off." }
      ]
    },
    {
      status: 401,
      codes: [{ code: "API_KEY_REQUIRED / INVALID_API_KEY / API_KEY_REVOKED", meaning: "Missing, wrong or revoked key." }]
    },
    {
      status: 403,
      codes: [
        { code: "API_KEY_DISABLED", meaning: "The admin paused this key." },
        { code: "OFFICE_NOT_ALLOWED", meaning: "The key may not use that office's rooms." },
        { code: "EMPLOYEE_INACTIVE", meaning: "The employee is not active." }
      ]
    },
    {
      status: 404,
      codes: [{ code: "EMPLOYEE_NOT_FOUND / ROOM_NOT_FOUND / BOOKING_NOT_FOUND", meaning: "Not found or not visible to your key." }]
    },
    {
      status: 409,
      codes: [
        { code: "ROOM_UNAVAILABLE", meaning: "The slot overlaps another booking." },
        { code: "BOOKING_CANCELLED", meaning: "A cancelled booking cannot be moved." },
        { code: "EXTERNAL_ID_CONFLICT", meaning: "externalId reused for a different booking." }
      ]
    },
    { status: 429, codes: [{ code: "RATE_LIMITED", meaning: "More than 60 requests per minute." }] }
  ],
  webhooks: {
    intro:
      "If the admin sets a webhook URL, Workforce POSTs to it whenever a booking made by your key changes — whoever changed it.",
    events: [
      { name: "booking.created", description: "A booking was created with your key." },
      { name: "booking.rescheduled", description: "Time, room or title changed." },
      { name: "booking.cancelled", description: "The booking was cancelled." },
      { name: "ping", description: "Test event sent from the admin portal." }
    ],
    headers: [
      { name: "X-Workforce-Event", type: "string", description: "Event name, e.g. booking.cancelled." },
      { name: "X-Workforce-Delivery", type: "uuid", description: "Unique per event — ignore ids you already processed." },
      { name: "X-Workforce-Signature", type: "string", description: "t=<unix seconds>,v1=<hex HMAC-SHA256>" }
    ],
    payloadExample: {
      id: "5e0b7a1c-…",
      event: "booking.cancelled",
      occurredAt: "2026-11-19T10:00:00.000Z",
      changedBy: "ADMIN",
      data: { ...booking, status: "CANCELLED" }
    },
    rules: [
      "changedBy is API (your app), ADMIN (company admin) or EMPLOYEE.",
      "Reply with any 2xx within 10 seconds.",
      "Otherwise it is retried after 1 min, 5 min, 15 min, 1 h and 6 h (6 attempts in total)."
    ],
    verifyIntro:
      "Compute HMAC-SHA256 of \"<t>.<raw body>\" with your webhook secret (whsec_…). It must equal v1, and t must be within 5 minutes of now.",
    verifySamples: [
      {
        label: "Node.js",
        code: `import crypto from "node:crypto";

// rawBody: the exact request body string (not re-serialised JSON)
function isValidWorkforceSignature(rawBody, header, secret) {
  const parts = Object.fromEntries(header.split(",").map((p) => p.split("=")));
  const expected = crypto
    .createHmac("sha256", secret)
    .update(\`\${parts.t}.\${rawBody}\`)
    .digest("hex");
  const fresh = Math.abs(Date.now() / 1000 - Number(parts.t)) < 300;
  return fresh && expected.length === parts.v1?.length &&
    crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(parts.v1));
}`
      },
      {
        label: "PHP",
        code: `<?php
function is_valid_workforce_signature(string $rawBody, string $header, string $secret): bool {
    parse_str(str_replace(',', '&', $header), $parts);
    $expected = hash_hmac('sha256', $parts['t'] . '.' . $rawBody, $secret);
    $fresh = abs(time() - (int) $parts['t']) < 300;
    return $fresh && hash_equals($expected, $parts['v1'] ?? '');
}`
      },
      {
        label: "Python",
        code: `import hmac, hashlib, time

def is_valid_workforce_signature(raw_body: bytes, header: str, secret: str) -> bool:
    parts = dict(p.split("=", 1) for p in header.split(","))
    expected = hmac.new(secret.encode(), f"{parts['t']}.".encode() + raw_body, hashlib.sha256).hexdigest()
    fresh = abs(time.time() - int(parts["t"])) < 300
    return fresh and hmac.compare_digest(expected, parts.get("v1", ""))`
      }
    ]
  },
  related: [
    { label: "API access", href: "/meetings/integrations", description: "Create, pause or revoke API keys and see webhook deliveries." },
    { label: "Bookings", href: "/meetings", description: "See bookings made through the API (Source: API)." }
  ]
};

"""
Build Workforce App Introduction Guide (PPTX + PDF) with page screenshots.

Strategy:
1) Capture real public login from localhost:3000
2) Render accurate UI guide screenshots for every admin / employee / display / task page
   matching real nav + PageHeader copy from the product
3) Assemble a walkthrough presentation

Optional live capture (if env vars set):
  WORKFORCE_GUIDE_LOGIN + WORKFORCE_GUIDE_PASSWORD  (platform or company admin)
"""

from __future__ import annotations

import html
import os
from pathlib import Path

from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import PP_ALIGN
from pptx.util import Inches, Pt
from reportlab.lib.colors import HexColor, white
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    Image as RLImage,
    KeepTogether,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
    HRFlowable,
)

OUT = Path(__file__).resolve().parent
SHOTS = OUT / "guide_shots"
HTML_DIR = OUT / "guide_html"
PPTX_PATH = OUT / "Workforce_App_Introduction_Guide.pptx"
PDF_PATH = OUT / "Workforce_App_Introduction_Guide.pdf"

SHOTS.mkdir(parents=True, exist_ok=True)
HTML_DIR.mkdir(parents=True, exist_ok=True)

NAVY = RGBColor(0x0F, 0x17, 0x2A)
TEAL = RGBColor(0x1D, 0x4E, 0xD8)
SLATE = RGBColor(0x33, 0x41, 0x55)
MUTED = RGBColor(0x64, 0x74, 0x8B)
LIGHT = RGBColor(0xF8, 0xFA, 0xFC)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
ACCENT = RGBColor(0x0F, 0x76, 0x6E)

# ---- Page catalog (real product paths + guide copy) ----

PLATFORM_PAGES = [
    ("platform_dashboard", "/platform", "Platform dashboard",
     "SaaS home: tenant health across all organizations on this deployment.",
     ["See how many companies (tenants) are active", "Jump to Organizations, Company Admins, Audit"]),
    ("organizations", "/organizations", "Organizations",
     "Create and manage customer companies (SaaS tenants).",
     ["Add a new organization", "Activate / manage tenant records", "Start of company onboarding"]),
    ("org_admins", "/org-admins", "Company Admins",
     "Provision ORG_ADMIN users who own a company workspace.",
     ["Invite or create company admins", "They configure offices, schedules, and staff"]),
    ("platform_audit", "/audit", "Audit log",
     "Recent platform-level administrative events.",
     ["Security / change history for the SaaS side"]),
    ("platform_notifications", "/notifications", "Notifications",
     "Operational alerts for the signed-in platform admin.",
     ["Realtime refresh when new alerts arrive"]),
]

COMPANY_SETUP = [
    ("company_dashboard", "/dashboard", "Company dashboard",
     "Organization-wide view of today’s workforce activity.",
     ["Employees, checked in, late, on leave, missing checkout", "Quick pulse before diving into ops"]),
    ("offices", "/offices", "Offices",
     "Approved work locations with map pin + GPS radius (geofence).",
     ["Where employees are allowed to check in", "Foundation for attendance proof"]),
    ("schedules", "/schedules", "Schedules",
     "Expected check-in / check-out times, grace, and working days.",
     ["Defines late / early / overtime rules", "Assigned to each employee"]),
    ("departments", "/departments", "Departments",
     "Optional structure for organizing employees.",
     ["Used on employee profiles and filtering"]),
    ("employees", "/employees", "Employees",
     "Register staff, assign office + schedule, manage access.",
     ["Invite employees to the mobile/web app", "Open a person for full detail"]),
    ("employee_detail", "/employees/[id]", "Employee detail",
     "Single employee identity, assignment, and workforce data.",
     ["Edit profile / assignment", "See related attendance context"]),
    ("office_admins", "/office-admins", "Office Admins",
     "Assign day-to-day admins to one or more offices.",
     ["Office admins cannot change company setup", "Scoped ops only"]),
    ("perf_templates", "/performance/templates", "Evaluation templates",
     "Build scoring areas / templates used in performance cycles.",
     ["Reusable evaluation structure"]),
    ("perf_cycles", "/performance/cycles", "Evaluation cycles",
     "Create and run review cycles (draft → active).",
     ["When the company runs performance"]),
    ("vault", "/vault", "Private vault",
     "PIN-locked storage for office credentials / subscription ranges.",
     ["Sensitive company ops data, separate from attendance"]),
]

COMPANY_OPS = [
    ("attendance", "/attendance", "Attendance",
     "Full roster attendance by day / month / range with exceptions.",
     ["Who is present, late, missing checkout", "Location / photo evidence when required"]),
    ("holidays", "/holidays", "Holidays",
     "Public + custom rest days; auto-apply or manual apply to offices.",
     ["Blocks check-in on holiday days", "Keeps calendars clean"]),
    ("worksheets", "/worksheets", "Worksheets",
     "Daily worksheet roster: submitted / reviewed / missing.",
     ["What people reported they worked on"]),
    ("leave", "/leave", "Leave",
     "Approve or reject leave and attendance correction requests.",
     ["Protects attendance from conflicting leave"]),
    ("performance", "/performance", "Performance",
     "Queue of evaluations awaiting self-score / evaluator / done.",
     ["Can factor attendance reliability", "Open a single evaluation for scoring"]),
    ("task_ops", "/task-operations", "Task Operations",
     "In-portal overview + Continue into the full task board.",
     ["Same company people synced into projects / Kanban"]),
    ("chat", "/chat", "Chat",
     "Message employees; threads appear under Admin chat on the employee app.",
     ["Operational messaging inside Workforce"]),
    ("meetings", "/meetings", "Meeting bookings",
     "Live room bookings; reschedule / reassign rooms.",
     ["No separate booking tool needed"]),
    ("meeting_rooms", "/meetings/rooms", "Meeting rooms",
     "Define rooms per office for free-slot booking.",
     ["Used by employees and lobby displays"]),
    ("displays", "/meetings/displays", "Lobby displays",
     "Pair office tablets with a one-time PIN.",
     ["Read-only people board + meeting timelines"]),
    ("reports", "/reports", "Reports",
     "Operational workforce reports with CSV export.",
     ["Leadership / payroll-friendly extracts"]),
    ("notifications", "/notifications", "Notifications",
     "Tenant-scoped operational alerts inbox.",
     ["Deep links into the related workflow"]),
    ("audit", "/audit", "Audit log",
     "Company administrative / workforce change history.",
     ["Accountability trail"]),
]

OFFICE_ONLY_NOTE = (
    "Office Admin sees the same day-to-day ops pages, scoped to assigned office(s). "
    "They do NOT get company setup: Offices, Schedules, Departments, Office Admins, "
    "Performance templates/cycles, Meetings stack, or Vault."
)

OFFICE_PAGES = [
    ("office_dashboard", "/dashboard", "Office dashboard",
     "Today’s workforce activity for assigned office(s) only.",
     ["Same metrics as company, scoped", "Badge shows office scope"]),
    ("office_employees", "/employees", "Employees (office)",
     "Register/manage employees in assigned offices only.",
     ["Cannot configure company-wide offices/schedules"]),
    ("office_attendance", "/attendance", "Attendance (office)",
     "Daily attendance for assigned offices.",
     ["Monitor presence and exceptions locally"]),
    ("office_holidays", "/holidays", "Holidays (office)",
     "Browse / apply holidays for assigned offices.",
     ["Keep local calendar correct"]),
    ("office_worksheets", "/worksheets", "Worksheets (office)",
     "Worksheet submissions for assigned offices.",
     ["Review what was submitted today"]),
    ("office_leave", "/leave", "Leave (office)",
     "Leave & attendance corrections for assigned offices.",
     ["Approve requests that affect the office"]),
    ("office_performance", "/performance", "Performance (office)",
     "Office performance queue (no template/cycle setup).",
     ["Score / follow evaluations in scope"]),
    ("office_task_ops", "/task-operations", "Task Operations (office)",
     "Task overview + continue to board.",
     ["Operational work for the office team"]),
    ("office_chat", "/chat", "Chat (office)",
     "Message employees (office-filtered directory).",
     ["Stay inside the product for coordination"]),
    ("office_reports", "/reports", "Reports (office)",
     "Reports scoped to assigned offices.",
     ["Local insights without company-wide setup access"]),
]

EMPLOYEE_PAGES = [
    ("emp_login", "Login", "Sign in with email or employee code (org slug when needed)."),
    ("emp_home", "Time Clock", "Check in / out with GPS (and photo when company requires it). Late reason when late."),
    ("emp_history", "History", "Past attendance days, holidays, worksheets, multi-day corrections."),
    ("emp_leave", "Leave", "Request leave, see balances/history, submit attendance corrections."),
    ("emp_meetings", "Meetings", "Book meeting rooms and view upcoming bookings."),
    ("emp_chat", "Chat", "Personal / Group / Admin tabs — message colleagues and admins."),
    ("emp_evaluations", "Performance", "Open and complete self-evaluations when a cycle is active."),
    ("emp_profile", "Profile", "Identity, job title, office, and schedule."),
    ("emp_settings", "Settings", "Language, theme, password change, sign out."),
    ("emp_notifications", "Notifications", "In-app alerts with deep links into leave, attendance, chat, etc."),
]

DISPLAY_PAGES = [
    ("disp_pair", "Pair display", "Enter the 6-digit PIN from Admin → Lobby displays to bind the tablet to an office."),
    ("disp_board", "Lobby board", "Landscape kiosk: who’s in today and/or meeting-room timelines (rooms / people / both)."),
]

TASK_PAGES = [
    ("tt_overview", "Portal overview", "Admin Task Operations page: counts, people, recent tasks, Continue button."),
    ("tt_tasks", "Tasks board", "Kanban board filtered by project / team / member."),
    ("tt_schedule", "Schedule", "Week calendar of schedule events with guests and projects."),
    ("tt_completed", "Completed", "Archive of finished tasks."),
    ("tt_teams", "Teams", "Organize people into teams."),
    ("tt_members", "Team members", "Workforce-synced people + Task Ops permission roles."),
    ("tt_projects", "Projects", "Create and manage projects."),
    ("tt_permissions", "Permissions", "Role permission matrix for Task Operations."),
]


def esc(s: str) -> str:
    return html.escape(s)


def admin_shell_html(role: str, active_href: str, title: str, description: str, bullets: list[str], extra_body: str = "") -> str:
    if role == "platform":
        sections = [
            ("Platform", [("/platform", "Dashboard")]),
            ("Tenants", [("/organizations", "Organizations"), ("/org-admins", "Company Admins")]),
            ("System", [("/audit", "Audit log"), ("/notifications", "Notifications")]),
        ]
        badge = ("Platform admin", "#ede9fe", "#5b21b6")
        brand_sub = "SaaS console"
    elif role == "office":
        sections = [
            ("Overview", [("/dashboard", "Dashboard")]),
            ("Workforce", [
                ("/employees", "Employees"), ("/attendance", "Attendance"), ("/holidays", "Holidays"),
                ("/worksheets", "Worksheets"), ("/leave", "Leave"), ("/performance", "Performance"),
                ("/task-operations", "Task Operations"), ("/chat", "Chat"),
            ]),
            ("Insights", [("/reports", "Reports")]),
            ("System", [("/notifications", "Notifications"), ("/audit", "Audit log")]),
        ]
        badge = ("Office admin", "#d1fae5", "#065f46")
        brand_sub = "Office operations"
    else:
        sections = [
            ("Overview", [("/dashboard", "Dashboard")]),
            ("Company setup", [
                ("/offices", "Offices"), ("/schedules", "Schedules"), ("/departments", "Departments"),
                ("/employees", "Employees"), ("/performance/templates", "Evaluation templates"),
                ("/office-admins", "Office Admins"), ("/vault", "Private vault"),
            ]),
            ("Workforce", [
                ("/attendance", "Attendance"), ("/holidays", "Holidays"), ("/worksheets", "Worksheets"),
                ("/leave", "Leave"), ("/performance", "Performance"), ("/task-operations", "Task Operations"),
                ("/chat", "Chat"),
            ]),
            ("Meetings", [("/meetings", "Bookings"), ("/meetings/rooms", "Rooms"), ("/meetings/displays", "Displays")]),
            ("Insights", [("/reports", "Reports")]),
            ("System", [("/notifications", "Notifications"), ("/audit", "Audit log")]),
        ]
        badge = ("Company admin", "#dbeafe", "#1e40af")
        brand_sub = "Company workspace"

    nav_html = ""
    for sec, items in sections:
        nav_html += f'<div class="sec">{esc(sec)}</div>'
        for href, label in items:
            cls = "nav active" if href == active_href or active_href.startswith(href + "/") else "nav"
            # softer match for templates etc
            if active_href.startswith(href):
                cls = "nav active"
            nav_html += f'<div class="{cls}">{esc(label)}</div>'

    cards = "".join(
        f'<div class="bullet"><span class="dot"></span><span>{esc(b)}</span></div>' for b in bullets
    )
    demo_panels = {
        "/dashboard": """
          <div class="metrics">
            <div class="m"><div class="ml">Employees</div><div class="mv">42</div></div>
            <div class="m green"><div class="ml">Checked in</div><div class="mv">28</div></div>
            <div class="m amber"><div class="ml">Late</div><div class="mv">3</div></div>
            <div class="m"><div class="ml">On leave</div><div class="mv">2</div></div>
            <div class="m red"><div class="ml">Missing checkout</div><div class="mv">1</div></div>
          </div>""",
        "/attendance": """
          <div class="table">
            <div class="tr th"><span>Employee</span><span>Status</span><span>In</span><span>Out</span><span>Note</span></div>
            <div class="tr"><span>Sara Bekele</span><span class="pill green">Present</span><span>08:52</span><span>—</span><span>On time</span></div>
            <div class="tr"><span>Daniel Haile</span><span class="pill amber">Late</span><span>09:18</span><span>—</span><span>Traffic</span></div>
            <div class="tr"><span>Helen T.</span><span class="pill">On leave</span><span>—</span><span>—</span><span>Annual</span></div>
          </div>""",
        "/offices": """
          <div class="split">
            <div class="map">Map pin + radius geofence</div>
            <div class="table">
              <div class="tr th"><span>Office</span><span>Radius</span><span>Timezone</span></div>
              <div class="tr"><span>HQ Addis</span><span>120 m</span><span>Africa/Addis_Ababa</span></div>
              <div class="tr"><span>Bole Branch</span><span>100 m</span><span>Africa/Addis_Ababa</span></div>
            </div>
          </div>""",
        "/chat": """
          <div class="split">
            <div class="listbox">
              <div class="li active">Admin → Sara</div>
              <div class="li">Ops group</div>
              <div class="li">Daniel Haile</div>
            </div>
            <div class="chatbox">
              <div class="bubble them">Can I correct yesterday’s checkout?</div>
              <div class="bubble me">Yes — use Leave → Attendance correction.</div>
            </div>
          </div>""",
        "/task-operations": """
          <div class="metrics">
            <div class="m"><div class="ml">Open tasks</div><div class="mv">37</div></div>
            <div class="m green"><div class="ml">Done this week</div><div class="mv">18</div></div>
            <div class="m"><div class="ml">People synced</div><div class="mv">42</div></div>
          </div>
          <div class="cta">Continue to Task Board →</div>""",
    }
    body_extra = demo_panels.get(active_href, "") + extra_body

    return f"""<!doctype html>
<html><head><meta charset="utf-8"/><style>
  * {{ box-sizing: border-box; font-family: Inter, Segoe UI, system-ui, sans-serif; }}
  body {{ margin:0; background:#f1f5f9; color:#0f172a; }}
  .app {{ display:flex; min-height:100vh; }}
  .side {{ width:260px; background:#0b1220; color:#e2e8f0; padding:18px 14px; }}
  .brand {{ font-weight:700; font-size:15px; display:flex; gap:10px; align-items:center; margin-bottom:4px; }}
  .brand .logo {{ width:28px; height:28px; border-radius:8px; background:#2563eb; display:grid; place-items:center; font-size:14px; }}
  .sub {{ color:#94a3b8; font-size:11px; margin:0 0 18px 38px; }}
  .sec {{ margin:14px 8px 6px; font-size:10px; letter-spacing:.12em; text-transform:uppercase; color:#64748b; }}
  .nav {{ padding:8px 10px; border-radius:8px; font-size:13px; color:#cbd5e1; margin:2px 0; }}
  .nav.active {{ background:#1e293b; color:#fff; border-left:3px solid #3b82f6; }}
  .main {{ flex:1; display:flex; flex-direction:column; }}
  .top {{ height:56px; background:#fff; border-bottom:1px solid #e2e8f0; display:flex; align-items:center; justify-content:space-between; padding:0 24px; }}
  .badge {{ font-size:11px; font-weight:600; padding:4px 10px; border-radius:999px; background:{badge[1]}; color:{badge[2]}; }}
  .content {{ padding:28px 32px; }}
  h1 {{ margin:0; font-size:28px; letter-spacing:-.02em; }}
  .desc {{ margin:8px 0 18px; color:#64748b; font-size:14px; max-width:720px; }}
  .guide {{ background:#fff; border:1px solid #e2e8f0; border-radius:14px; padding:18px 20px; margin-top:8px; }}
  .guide h3 {{ margin:0 0 10px; font-size:13px; text-transform:uppercase; letter-spacing:.08em; color:#2563eb; }}
  .bullet {{ display:flex; gap:10px; align-items:flex-start; margin:8px 0; font-size:14px; color:#334155; }}
  .dot {{ width:8px; height:8px; margin-top:6px; border-radius:99px; background:#2563eb; flex:none; }}
  .metrics {{ display:grid; grid-template-columns:repeat(5,1fr); gap:12px; margin:16px 0; }}
  .m {{ background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:14px; }}
  .m.green {{ border-color:#bbf7d0; }} .m.amber {{ border-color:#fde68a; }} .m.red {{ border-color:#fecaca; }}
  .ml {{ font-size:12px; color:#64748b; }} .mv {{ font-size:26px; font-weight:700; margin-top:6px; }}
  .table {{ background:#fff; border:1px solid #e2e8f0; border-radius:12px; overflow:hidden; margin-top:14px; }}
  .tr {{ display:grid; grid-template-columns:2fr 1fr 1fr 1fr 1.4fr; gap:8px; padding:12px 14px; border-top:1px solid #f1f5f9; font-size:13px; }}
  .tr.th {{ background:#f8fafc; font-weight:600; color:#475569; border-top:0; }}
  .pill {{ display:inline-block; padding:2px 8px; border-radius:999px; background:#e2e8f0; font-size:11px; font-weight:600; }}
  .pill.green {{ background:#dcfce7; color:#166534; }} .pill.amber {{ background:#fef3c7; color:#92400e; }}
  .split {{ display:grid; grid-template-columns:1.1fr 1fr; gap:14px; margin-top:14px; }}
  .map {{ background:linear-gradient(135deg,#dbeafe,#eff6ff); border:1px solid #bfdbfe; border-radius:12px; min-height:180px; display:grid; place-items:center; color:#1e40af; font-weight:600; }}
  .listbox {{ background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:8px; }}
  .li {{ padding:10px 12px; border-radius:8px; font-size:13px; color:#334155; }}
  .li.active {{ background:#eff6ff; color:#1d4ed8; font-weight:600; }}
  .chatbox {{ background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:16px; display:flex; flex-direction:column; gap:10px; }}
  .bubble {{ max-width:80%; padding:10px 12px; border-radius:12px; font-size:13px; }}
  .bubble.them {{ background:#f1f5f9; align-self:flex-start; }}
  .bubble.me {{ background:#2563eb; color:#fff; align-self:flex-end; }}
  .cta {{ margin-top:14px; display:inline-block; background:#2563eb; color:#fff; padding:10px 16px; border-radius:10px; font-weight:600; font-size:13px; }}
  .path {{ font-size:11px; color:#94a3b8; }}
</style></head><body>
<div class="app">
  <aside class="side">
    <div class="brand"><div class="logo">✓</div>Workforce Control</div>
    <div class="sub">{esc(brand_sub)}</div>
    {nav_html}
  </aside>
  <section class="main">
    <div class="top">
      <div class="path">{esc(active_href)}</div>
      <div class="badge">{esc(badge[0])}</div>
    </div>
    <div class="content">
      <h1>{esc(title)}</h1>
      <p class="desc">{esc(description)}</p>
      {body_extra}
      <div class="guide">
        <h3>What you do on this page</h3>
        {cards}
      </div>
    </div>
  </section>
</div>
</body></html>"""


def phone_html(title: str, subtitle: str, body_kind: str) -> str:
    home = """
      <div class="clock">
        <div class="status">Not checked in</div>
        <div class="time">08:45</div>
        <div class="loc">Inside HQ geofence · GPS ready</div>
        <button class="btn">Check in</button>
      </div>"""
    list_ui = """
      <div class="rows">
        <div class="row"><b>Today</b><span class="tag">Present</span></div>
        <div class="row"><b>Yesterday</b><span class="tag amber">Late</span></div>
        <div class="row"><b>Mon</b><span class="tag">Present</span></div>
      </div>"""
    chat = """
      <div class="tabs"><span class="on">Personal</span><span>Group</span><span>Admin</span></div>
      <div class="rows">
        <div class="row"><b>Daniel</b><span>See you at 2</span></div>
        <div class="row"><b>Ops team</b><span>Worksheet reminder</span></div>
      </div>"""
    bodies = {
        "home": home,
        "list": list_ui,
        "chat": chat,
        "form": """
          <div class="form">
            <label>Leave type</label><div class="field">Annual leave</div>
            <label>Dates</label><div class="field">Oct 2 – Oct 4</div>
            <button class="btn">Submit request</button>
          </div>""",
        "profile": """
          <div class="profile">
            <div class="avatar">SB</div>
            <div class="name">Sara Bekele</div>
            <div class="meta">HQ Addis · Standard schedule</div>
          </div>""",
    }
    content = bodies.get(body_kind, list_ui)
    tabs = []
    for t in ["Home", "History", "Leave", "Chat", "More"]:
        cls = "tab on" if t == title or (title == "Time Clock" and t == "Home") else "tab"
        tabs.append(f'<div class="{cls}">{t}</div>')
    tabs = "".join(tabs)
    return f"""<!doctype html>
<html><head><meta charset="utf-8"/><style>
  body {{ margin:0; background:#e2e8f0; display:grid; place-items:center; min-height:100vh; font-family: Inter, Segoe UI, sans-serif; }}
  .phone {{ width:390px; height:780px; background:#0f172a; border-radius:36px; padding:14px; box-shadow:0 25px 60px rgba(15,23,42,.35); }}
  .screen {{ background:#f8fafc; height:100%; border-radius:28px; overflow:hidden; display:flex; flex-direction:column; }}
  .bar {{ padding:18px 18px 8px; background:#fff; border-bottom:1px solid #e2e8f0; }}
  h1 {{ margin:0; font-size:22px; }} .sub {{ color:#64748b; font-size:12px; margin-top:4px; }}
  .body {{ padding:16px; flex:1; }}
  .clock {{ text-align:center; padding:28px 12px; background:#fff; border-radius:18px; border:1px solid #e2e8f0; }}
  .status {{ color:#64748b; font-size:13px; }} .time {{ font-size:48px; font-weight:700; margin:10px 0; }}
  .loc {{ color:#16a34a; font-size:12px; margin-bottom:18px; }}
  .btn {{ background:#2563eb; color:#fff; border:0; border-radius:12px; padding:12px 18px; font-weight:600; width:100%; }}
  .rows {{ display:flex; flex-direction:column; gap:8px; }}
  .row {{ background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:12px 14px; display:flex; justify-content:space-between; font-size:13px; }}
  .tag {{ background:#dcfce7; color:#166534; padding:2px 8px; border-radius:999px; font-size:11px; font-weight:600; }}
  .tag.amber {{ background:#fef3c7; color:#92400e; }}
  .tabs {{ display:flex; gap:8px; margin-bottom:12px; }}
  .tabs span {{ padding:6px 10px; border-radius:999px; background:#e2e8f0; font-size:12px; }}
  .tabs .on {{ background:#2563eb; color:#fff; }}
  .form label {{ font-size:12px; color:#64748b; display:block; margin:10px 0 4px; }}
  .field {{ background:#fff; border:1px solid #e2e8f0; border-radius:10px; padding:10px 12px; }}
  .profile {{ text-align:center; padding-top:24px; }}
  .avatar {{ width:72px; height:72px; border-radius:999px; background:#2563eb; color:#fff; display:grid; place-items:center; margin:0 auto 12px; font-weight:700; font-size:22px; }}
  .name {{ font-size:18px; font-weight:700; }} .meta {{ color:#64748b; font-size:13px; margin-top:4px; }}
  .bottom {{ display:grid; grid-template-columns:repeat(5,1fr); border-top:1px solid #e2e8f0; background:#fff; }}
  .tab {{ text-align:center; padding:10px 4px; font-size:10px; color:#64748b; }}
  .tab.on {{ color:#2563eb; font-weight:700; }}
</style></head><body>
<div class="phone"><div class="screen">
  <div class="bar"><h1>{esc(title)}</h1><div class="sub">{esc(subtitle)}</div></div>
  <div class="body">{content}</div>
  <div class="bottom">{tabs}</div>
</div></div>
</body></html>"""


def kiosk_html(title: str, subtitle: str) -> str:
    return f"""<!doctype html>
<html><head><meta charset="utf-8"/><style>
body{{margin:0;background:#0b1220;color:#fff;font-family:Inter,Segoe UI,sans-serif;}}
.wrap{{padding:28px 36px;}}
h1{{margin:0;font-size:34px;}} .sub{{color:#94a3b8;margin:8px 0 24px;}}
.grid{{display:grid;grid-template-columns:1.2fr 1fr;gap:18px;}}
.card{{background:#111827;border:1px solid #1f2937;border-radius:16px;padding:18px;min-height:320px;}}
.card h3{{margin:0 0 12px;color:#93c5fd;font-size:14px;letter-spacing:.08em;text-transform:uppercase;}}
.person{{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #1f2937;font-size:14px;}}
.room{{height:42px;background:linear-gradient(90deg,#1d4ed8 20%,#1e293b 20%);border-radius:8px;margin:10px 0;}}
</style></head><body><div class="wrap">
<h1>{esc(title)}</h1><div class="sub">{esc(subtitle)}</div>
<div class="grid">
  <div class="card"><h3>People in today</h3>
    <div class="person"><span>Sara Bekele</span><span>In · 08:52</span></div>
    <div class="person"><span>Daniel Haile</span><span>In · 09:18</span></div>
    <div class="person"><span>Helen T.</span><span>On leave</span></div>
  </div>
  <div class="card"><h3>Meeting rooms</h3>
    <div>Boardroom A</div><div class="room"></div>
    <div>Huddle 2</div><div class="room"></div>
  </div>
</div></div></body></html>"""


def task_html(title: str, subtitle: str) -> str:
    cols = "".join(
        f'<div class="col"><h4>{c}</h4><div class="card">Sample task</div><div class="card">Sample task</div></div>'
        for c in ["To do", "In progress", "Review", "Done"]
    )
    return f"""<!doctype html>
<html><head><meta charset="utf-8"/><style>
body{{margin:0;background:#f8fafc;font-family:Inter,Segoe UI,sans-serif;color:#0f172a;}}
.top{{height:56px;background:#0f172a;color:#fff;display:flex;align-items:center;padding:0 20px;gap:16px;}}
.side{{position:fixed;top:56px;left:0;bottom:0;width:200px;background:#fff;border-right:1px solid #e2e8f0;padding:16px;}}
.side div{{padding:8px 10px;border-radius:8px;font-size:13px;color:#475569;margin:2px 0;}}
.side .on{{background:#eff6ff;color:#1d4ed8;font-weight:600;}}
.main{{margin:56px 0 0 200px;padding:24px;}}
h1{{margin:0;font-size:26px;}} .sub{{color:#64748b;margin:6px 0 18px;}}
.board{{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;}}
.col{{background:#e2e8f0;border-radius:12px;padding:10px;}}
.col h4{{margin:0 0 8px;font-size:12px;text-transform:uppercase;color:#475569;}}
.card{{background:#fff;border-radius:10px;padding:12px;margin:8px 0;font-size:13px;border:1px solid #e2e8f0;}}
</style></head><body>
<div class="top"><b>Task Operations</b><span style="opacity:.7">Company workspace</span></div>
<div class="side">
  <div class="on">Tasks</div><div>Schedule</div><div>Completed</div><div>Teams</div>
  <div>Members</div><div>Projects</div><div>Permissions</div>
</div>
<div class="main"><h1>{esc(title)}</h1><div class="sub">{esc(subtitle)}</div>
<div class="board">{cols}</div></div>
</body></html>"""


def write_html(name: str, content: str) -> Path:
    path = HTML_DIR / f"{name}.html"
    path.write_text(content, encoding="utf-8")
    return path


def capture_all():
    from playwright.sync_api import sync_playwright

    jobs: list[tuple[str, Path, dict]] = []

    # Real login
    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chrome", headless=True)
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        page.goto("http://localhost:3000/login", wait_until="networkidle", timeout=60000)
        page.screenshot(path=str(SHOTS / "admin_login.png"))

        # Optional live authenticated capture
        login = os.environ.get("WORKFORCE_GUIDE_LOGIN")
        password = os.environ.get("WORKFORCE_GUIDE_PASSWORD")
        if login and password:
            page.fill('input[type="text"], input:not([type])', login)
            # try common selectors
            for sel in ['input[type="password"]', 'input[name="password"]']:
                if page.locator(sel).count():
                    page.fill(sel, password)
                    break
            page.get_by_role("button", name="Sign in").click()
            page.wait_for_timeout(2500)
            live_paths = [
                "/platform", "/organizations", "/org-admins", "/dashboard", "/offices",
                "/schedules", "/departments", "/employees", "/office-admins",
                "/attendance", "/holidays", "/worksheets", "/leave", "/performance",
                "/task-operations", "/chat", "/meetings", "/meetings/rooms",
                "/meetings/displays", "/reports", "/notifications", "/audit", "/vault",
            ]
            for path in live_paths:
                try:
                    page.goto(f"http://localhost:3000{path}", wait_until="networkidle", timeout=30000)
                    page.wait_for_timeout(800)
                    safe = path.strip("/").replace("/", "_") or "root"
                    page.screenshot(path=str(SHOTS / f"live_{safe}.png"))
                except Exception as e:
                    print("live fail", path, e)
        browser.close()

    # Guide UI screenshots
    specs: list[tuple[str, str]] = []

    for key, href, title, desc, bullets in PLATFORM_PAGES:
        specs.append((key, admin_shell_html("platform", href, title, desc, bullets)))
    for key, href, title, desc, bullets in COMPANY_SETUP + COMPANY_OPS:
        specs.append((key, admin_shell_html("company", href, title, desc, bullets)))
    for key, href, title, desc, bullets in OFFICE_PAGES:
        specs.append((key, admin_shell_html("office", href, title, desc, bullets)))

    emp_kinds = {
        "emp_login": ("Login", "Email or employee code", "form"),
        "emp_home": ("Time Clock", "Check in / check out", "home"),
        "emp_history": ("History", "Attendance & worksheets", "list"),
        "emp_leave": ("Leave", "Requests & balances", "form"),
        "emp_meetings": ("Meetings", "Book a room", "list"),
        "emp_chat": ("Chat", "Personal / Group / Admin", "chat"),
        "emp_evaluations": ("Performance", "Self-evaluations", "list"),
        "emp_profile": ("Profile", "Your workplace identity", "profile"),
        "emp_settings": ("Settings", "Language, theme, password", "form"),
        "emp_notifications": ("Notifications", "Alerts & deep links", "list"),
    }
    for key, (title, sub, kind) in emp_kinds.items():
        specs.append((key, phone_html(title, sub, kind)))

    specs.append(("disp_pair", phone_html("Pair display", "Enter 6-digit PIN from admin", "form")))
    specs.append(("disp_board", kiosk_html("Lobby board", "Who’s in today · meeting rooms")))

    for key, title, sub in [
        ("tt_overview", "Task Operations", "Portal overview before Continue"),
        ("tt_tasks", "Tasks", "Kanban board"),
        ("tt_schedule", "Schedule", "Week calendar"),
        ("tt_completed", "Completed Tasks", "Archive"),
        ("tt_teams", "Teams", "Organize people"),
        ("tt_members", "Team Members", "Synced from Workforce"),
        ("tt_projects", "Projects", "Create and manage"),
        ("tt_permissions", "Permissions & Access", "Role matrix"),
    ]:
        specs.append((key, task_html(title, sub)))

    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chrome", headless=True)
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        for key, content in specs:
            path = write_html(key, content)
            page.goto(path.as_uri(), wait_until="load")
            page.wait_for_timeout(120)
            page.screenshot(path=str(SHOTS / f"{key}.png"), full_page=False)
        browser.close()
    print(f"Captured {len(specs)+1} screenshots into {SHOTS}")


def _set_run(run, size=18, bold=False, color=NAVY):
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.color.rgb = color
    run.font.name = "Calibri"


def add_bg(slide, color=LIGHT):
    sh = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0), Inches(0), Inches(13.333), Inches(7.5))
    sh.fill.solid()
    sh.fill.fore_color.rgb = color
    sh.line.fill.background()


def add_section_slide(prs, blank, eyebrow, title, subtitle):
    s = prs.slides.add_slide(blank)
    add_bg(s, NAVY)
    box = s.shapes.add_textbox(Inches(0.8), Inches(2.2), Inches(11.5), Inches(3))
    tf = box.text_frame
    r = tf.paragraphs[0].add_run()
    r.text = eyebrow
    _set_run(r, 14, True, TEAL)
    p = tf.add_paragraph()
    r2 = p.add_run()
    r2.text = title
    _set_run(r2, 34, True, WHITE)
    p2 = tf.add_paragraph()
    p2.space_before = Pt(10)
    r3 = p2.add_run()
    r3.text = subtitle
    _set_run(r3, 15, False, RGBColor(0xB8, 0xC5, 0xCD))
    return s


def add_page_slide(prs, blank, section, title, path, description, bullets, image_key):
    s = prs.slides.add_slide(blank)
    add_bg(s)
    # left text
    box = s.shapes.add_textbox(Inches(0.45), Inches(0.3), Inches(5.4), Inches(6.8))
    tf = box.text_frame
    tf.word_wrap = True
    r = tf.paragraphs[0].add_run()
    r.text = section
    _set_run(r, 11, True, TEAL)
    p = tf.add_paragraph()
    r2 = p.add_run()
    r2.text = title
    _set_run(r2, 24, True, NAVY)
    p2 = tf.add_paragraph()
    r3 = p2.add_run()
    r3.text = path
    _set_run(r3, 11, False, MUTED)
    p3 = tf.add_paragraph()
    p3.space_before = Pt(12)
    r4 = p3.add_run()
    r4.text = description
    _set_run(r4, 13, False, SLATE)
    for b in bullets:
        pb = tf.add_paragraph()
        pb.space_before = Pt(8)
        rb = pb.add_run()
        rb.text = f"•  {b}"
        _set_run(rb, 12, False, SLATE)

    img = SHOTS / f"{image_key}.png"
    if img.exists():
        # right screenshot
        s.shapes.add_picture(str(img), Inches(6.0), Inches(0.45), width=Inches(6.9))
    return s


def build_pptx():
    prs = Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    blank = prs.slide_layouts[6]

    # Cover
    s = prs.slides.add_slide(blank)
    add_bg(s, NAVY)
    box = s.shapes.add_textbox(Inches(0.8), Inches(1.8), Inches(11.5), Inches(4))
    tf = box.text_frame
    r = tf.paragraphs[0].add_run()
    r.text = "WORKFORCE"
    _set_run(r, 16, True, TEAL)
    p = tf.add_paragraph()
    r2 = p.add_run()
    r2.text = "App Introduction Guide"
    _set_run(r2, 40, True, WHITE)
    p2 = tf.add_paragraph()
    p2.space_before = Pt(12)
    r3 = p2.add_run()
    r3.text = (
        "Page-by-page walkthrough of Workforce Control (SaaS + Company + Office),\n"
        "the Employee app, Lobby Display, and Task Operations."
    )
    _set_run(r3, 15, False, RGBColor(0xB8, 0xC5, 0xCD))

    # Map
    add_section_slide(
        prs, blank, "START HERE", "Who uses which app",
        "Six surfaces. One company identity. Clear roles."
    )
    s = prs.slides.add_slide(blank)
    add_bg(s)
    items = [
        ("1. Platform (SaaS)", "SUPER_ADMIN — create companies & company admins"),
        ("2. Company admin", "ORG_ADMIN — setup offices, schedules, staff, ops"),
        ("3. Office admin", "OFFICE_ADMIN — day-to-day ops for assigned offices"),
        ("4. Employee app", "Check-in/out, leave, chat, meetings, performance"),
        ("5. Lobby display", "Tablet board: who’s in + meeting rooms"),
        ("6. Task Operations", "Projects & Kanban using the same people"),
    ]
    box = s.shapes.add_textbox(Inches(0.7), Inches(0.5), Inches(12), Inches(6.5))
    tf = box.text_frame
    tf.word_wrap = True
    r = tf.paragraphs[0].add_run()
    r.text = "Product map"
    _set_run(r, 28, True, NAVY)
    for i, (t, d) in enumerate(items):
        p = tf.add_paragraph()
        p.space_before = Pt(14)
        rt = p.add_run()
        rt.text = t
        _set_run(rt, 16, True, TEAL)
        p2 = tf.add_paragraph()
        rd = p2.add_run()
        rd.text = d
        _set_run(rd, 13, False, SLATE)

    # Login
    add_page_slide(
        prs, blank, "ENTRY", "Admin sign-in — Workforce Control",
        "/login",
        "Real screenshot of the live admin portal login. Platform, company, and office admins all enter here; role decides the sidebar after sign-in.",
        ["Use admin email", "Forced password change may appear first", "Multi-role accounts get a context picker"],
        "admin_login",
    )

    add_section_slide(prs, blank, "SECTION A", "Platform (SaaS) side",
                      "Create tenants and company admins — the start of every customer.")
    for key, href, title, desc, bullets in PLATFORM_PAGES:
        add_page_slide(prs, blank, "PLATFORM / SaaS", title, href, desc, bullets, key)

    add_section_slide(prs, blank, "SECTION B", "Company admin — setup",
                      "Map offices, set hours, add people. This is the foundation.")
    for key, href, title, desc, bullets in COMPANY_SETUP:
        add_page_slide(prs, blank, "COMPANY SETUP", title, href, desc, bullets, key)

    add_section_slide(prs, blank, "SECTION B", "Company admin — daily operations",
                      "Attendance, leave, chat, meetings, tasks, performance, reports.")
    for key, href, title, desc, bullets in COMPANY_OPS:
        add_page_slide(prs, blank, "COMPANY OPS", title, href, desc, bullets, key)

    add_section_slide(prs, blank, "SECTION C", "Office admin side",
                      OFFICE_ONLY_NOTE)
    for key, href, title, desc, bullets in OFFICE_PAGES:
        add_page_slide(prs, blank, "OFFICE ADMIN", title, href, desc, bullets, key)

    add_section_slide(prs, blank, "SECTION D", "Employee-facing app",
                      "Time clock, leave, chat, meetings, and self-evaluations on mobile/web.")
    for key, title, desc in EMPLOYEE_PAGES:
        add_page_slide(
            prs, blank, "EMPLOYEE APP", title, f"/{key.replace('emp_', '')}",
            desc, ["Primary employee surface", "Same org identity as admin portal"], key
        )

    add_section_slide(prs, blank, "SECTION E", "Lobby Display",
                      "Pair a tablet once — then it shows presence and meetings.")
    for key, title, desc in DISPLAY_PAGES:
        add_page_slide(prs, blank, "DISPLAY", title, key, desc, ["Read-only kiosk", "Bound to one office"], key)

    add_section_slide(prs, blank, "SECTION F", "Task Operations",
                      "Projects and boards for the same company people.")
    for key, title, desc in TASK_PAGES:
        add_page_slide(prs, blank, "TASK OPERATIONS", title, key, desc, ["SSO continue from admin", "Own permission matrix"], key)

    # Closing
    s = prs.slides.add_slide(blank)
    add_bg(s, NAVY)
    box = s.shapes.add_textbox(Inches(0.8), Inches(2.0), Inches(11.5), Inches(3.5))
    tf = box.text_frame
    r = tf.paragraphs[0].add_run()
    r.text = "How to present this"
    _set_run(r, 32, True, WHITE)
    for line in [
        "1) Start with product map → who signs into which surface",
        "2) Platform: create org + company admin",
        "3) Company: Offices → Schedules → Employees → daily ops",
        "4) Contrast Office Admin (scoped, no company setup)",
        "5) Employee Time Clock → Leave → Chat → Performance",
        "6) Display pairing + Task Operations Continue",
    ]:
        p = tf.add_paragraph()
        p.space_before = Pt(8)
        rr = p.add_run()
        rr.text = line
        _set_run(rr, 14, False, RGBColor(0xB8, 0xC5, 0xCD))

    prs.save(str(PPTX_PATH))
    print(f"Wrote {PPTX_PATH} ({len(prs.slides)} slides)")


def build_pdf():
    doc = SimpleDocTemplate(
        str(PDF_PATH), pagesize=landscape(A4),
        leftMargin=0.5 * inch, rightMargin=0.5 * inch,
        topMargin=0.45 * inch, bottomMargin=0.4 * inch,
    )
    styles = {
        "h1": ParagraphStyle("h1", fontName="Helvetica-Bold", fontSize=18, textColor=HexColor("#0F172A"), spaceAfter=4),
        "sub": ParagraphStyle("sub", fontName="Helvetica", fontSize=10, textColor=HexColor("#64748B"), spaceAfter=8),
        "body": ParagraphStyle("body", fontName="Helvetica", fontSize=10, textColor=HexColor("#334155"), leading=13),
        "bullet": ParagraphStyle("bullet", fontName="Helvetica", fontSize=9.5, textColor=HexColor("#334155"), leading=12, leftIndent=8),
        "cover": ParagraphStyle("cover", fontName="Helvetica-Bold", fontSize=26, textColor=white, leading=30),
        "label": ParagraphStyle("label", fontName="Helvetica-Bold", fontSize=10, textColor=HexColor("#93C5FD")),
    }
    story = []
    cover = Table([[
        Paragraph("WORKFORCE", styles["label"]),
        Paragraph("App Introduction Guide", styles["cover"]),
        Paragraph("Page-by-page walkthrough: SaaS · Company · Office · Employee · Display · Tasks", styles["body"]),
    ]], colWidths=[10 * inch])
    # fix cover content as stacked paragraphs
    cover = Table([
        [Paragraph("WORKFORCE", styles["label"])],
        [Paragraph("App Introduction Guide", styles["cover"])],
        [Paragraph("SaaS · Company admin · Office admin · Employee app · Display · Task Operations",
                   ParagraphStyle("csub", fontName="Helvetica", fontSize=11, textColor=HexColor("#B8C5CD")))],
    ], colWidths=[10 * inch])
    cover.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), HexColor("#0F172A")),
        ("TOPPADDING", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
        ("LEFTPADDING", (0, 0), (-1, -1), 18),
    ]))
    story.append(cover)
    story.append(Spacer(1, 14))

    def page_block(section, title, path, desc, bullets, image_key):
        img_path = SHOTS / f"{image_key}.png"
        left = [
            Paragraph(section, styles["label"]),
            Paragraph(title, styles["h1"]),
            Paragraph(path, styles["sub"]),
            Paragraph(desc, styles["body"]),
        ]
        for b in bullets:
            left.append(Paragraph(f"• {b}", styles["bullet"]))
        left_t = Table([[x] for x in left], colWidths=[4.6 * inch])
        if img_path.exists():
            img = RLImage(str(img_path), width=5.6 * inch, height=3.5 * inch)
            row = Table([[left_t, img]], colWidths=[4.8 * inch, 5.8 * inch])
        else:
            row = left_t
        story.append(KeepTogether([row, Spacer(1, 12), HRFlowable(width="100%", thickness=0.5, color=HexColor("#E2E8F0"), spaceAfter=10)]))

    page_block("ENTRY", "Admin sign-in", "/login",
               "Live Workforce Control login for platform, company, and office admins.",
               ["Role decides the sidebar after sign-in"], "admin_login")

    for key, href, title, desc, bullets in PLATFORM_PAGES:
        page_block("PLATFORM", title, href, desc, bullets, key)
    for key, href, title, desc, bullets in COMPANY_SETUP + COMPANY_OPS:
        page_block("COMPANY", title, href, desc, bullets, key)
    story.append(Paragraph("Office admin note", styles["h1"]))
    story.append(Paragraph(OFFICE_ONLY_NOTE, styles["body"]))
    story.append(Spacer(1, 8))
    for key, href, title, desc, bullets in OFFICE_PAGES:
        page_block("OFFICE", title, href, desc, bullets, key)
    for key, title, desc in EMPLOYEE_PAGES:
        page_block("EMPLOYEE", title, key, desc, ["Employee mobile/web surface"], key)
    for key, title, desc in DISPLAY_PAGES:
        page_block("DISPLAY", title, key, desc, ["Lobby tablet"], key)
    for key, title, desc in TASK_PAGES:
        page_block("TASKS", title, key, desc, ["Same company people"], key)

    doc.build(story)
    print(f"Wrote {PDF_PATH}")


if __name__ == "__main__":
    capture_all()
    build_pptx()
    build_pdf()

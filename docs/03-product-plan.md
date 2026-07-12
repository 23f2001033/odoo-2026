# AssetFlow — Product Plan & Hackathon Strategy

> How we scope, prioritize, and sequence the build to (a) satisfy every line of the problem statement and (b) stand out from the ~dozens of teams building the same spec.

## 1. One-line Positioning

**"The single system for who-holds-what":** asset lifecycle + allocation + shared-resource booking + maintenance approvals + structured audits — the union of Snipe-IT, Limble, and a room-booking tool, which today no affordable product offers together (see [market research](02-market-research.md)).

## 2. Personas (drive the demo narrative)

| Persona | Story we demo |
|---|---|
| **Asha — Admin** | Sets up departments & categories in minutes, promotes Manoj to Asset Manager (proving no self-elevated roles), watches org-wide analytics |
| **Manoj — Asset Manager** | Registers a laptop (auto tag AF-0001 + QR), allocates it to Priya, approves Raj's transfer request, approves a maintenance request |
| **Deepa — Department Head** | Sees her department's assets, approves an in-dept transfer, books the projector for a team review |
| **Raj — Employee** | Tries to allocate Priya's laptop → blocked → raises transfer request; books Room B2; raises a maintenance ticket with a photo |
| **Kiran — Auditor (employee assigned to a cycle)** | Walks a floor scanning QR codes, marks Verified/Missing/Damaged, discrepancy report auto-generates |

## 3. Feature Prioritization

### P0 — Spec compliance (must exist; judges score against the PDF)

Everything in [01-problem-statement.md](01-problem-statement.md), specifically in build order:

1. **Auth + RBAC** — signup (Employee only), login, sessions, role checks on every route. Roles assignable only from Employee Directory.
2. **Org Setup** — departments (with hierarchy + head), categories (with optional custom fields), employee directory (promote/demote).
3. **Asset registry** — full registration form, auto asset tag `AF-####`, photo upload, shared/bookable flag, search/filter, per-asset detail page with allocation + maintenance history.
4. **Allocation & transfer** — allocate with expected return date; **double-allocation block with "held by X" + Transfer Request CTA**; transfer approval chain; return flow with condition notes; overdue auto-flag.
5. **Resource booking** — calendar view; **overlap rejection with boundary-touch acceptance**; statuses; cancel/reschedule; pre-slot reminder.
6. **Maintenance** — request with priority + photo; `Pending → Approved/Rejected → Technician Assigned → In Progress → Resolved`; automatic asset status flips.
7. **Audit cycles** — create with scope + date range; assign auditors; per-asset Verified/Missing/Damaged; auto discrepancy report; close = lock + status updates.
8. **Dashboard** — all 6 KPI cards, overdue vs. upcoming separation, quick actions.
9. **Notifications + activity log** — all listed notification types; immutable who/what/when log.
10. **Reports** — utilization, maintenance frequency, dept-wise allocation, booking heatmap, export (CSV at minimum).

### P1 — Differentiators (what makes us win; all research-backed)

| Feature | Why it wins | Effort |
|---|---|---|
| **QR code per asset** (generated at registration; scan → asset page; scan-to-verify inside audit flow) | Most-praised feature in the category; makes the audit demo physical and memorable | Low |
| **DB-level conflict enforcement** (unique partial index / exclusion constraint for allocation & booking overlaps) | Survives race conditions; lets us say "the rule is enforced in the database, not just the UI" — strong architecture signal | Low |
| **Live booking heatmap + idle-asset report** with real charts | Analytics is a purchase driver; most teams will show static numbers | Medium |
| **Email + in-app notifications** (overdue return, booking reminder) | The #1 spreadsheet gap; scheduled job shows engineering depth | Medium |
| **Seed data + demo mode** (realistic org: 4 depts, 40 assets, bookings, history) | Demo never starts from an empty screen; charts look alive | Low |
| **Responsive/PWA-quality mobile views** for booking + audit | Mission says "responsive"; field usage is the real-world context | Medium |

### P2 — Stretch (only if time remains)

- **Maintenance-due prediction**: flag assets whose maintenance frequency is trending up ("this projector has needed 3 repairs in 90 days — consider retirement") — rides the market's predictive-maintenance trend.
- **CSV import** for assets/employees (kills spreadsheet migration friction).
- **iCal export / calendar feed** for bookings.
- **Depreciation-style "nearing retirement" score** from acquisition date + category life (careful: display only, no accounting).
- **Global search** (⌘K) across assets, people, bookings.

### Explicitly NOT building

Purchasing, invoicing, accounting integration (out of scope per PDF), native mobile apps, IoT integration, multi-tenancy/SaaS billing.

## 4. What Most Teams Will Get Wrong (our edge)

1. **Conflict rules only in the frontend** — we enforce in transactions/constraints and can prove it.
2. **Empty-state demos** — we seed a full realistic org.
3. **Audit module as a checkbox** — we make it the demo climax (QR scan walk-through → discrepancy report → close cycle → asset flips to Lost).
4. **Role selection at signup** — the PDF explicitly forbids it; we demo the correct promote flow.
5. **Fake analytics** — our charts compute from real seeded transactions.
6. **No state-machine discipline** — we model asset/booking/maintenance/transfer states as explicit machines with validated transitions (this is what "proper ERP architecture" means to a judge).

## 5. Demo Script (7–8 minutes)

> Verified against the live app in milestone 9's rehearsal — every beat below is the actual, working mechanic, not the aspirational version. Demo logins: `Password123` for everyone (see `prisma/seed.ts` header).

1. **Hook (30s):** "A 1,000-asset org loses up to $60k/year to spreadsheet tracking — errors, lost items, missed maintenance. AssetFlow replaces that with one system."
2. As **Asha (Admin)**: Organization Setup → create a department, promote an employee to Asset Manager in the Employee Directory tab — the *only* place a role is ever assigned (signup never offers a role picker; show that too).
3. As **Manoj (Asset Manager)**: register a new asset → the auto-generated tag (`AF-08xx`) and its QR code appear immediately on the detail page → open the seeded **AF-0114 (MacBook Pro, held by Priya)** and try to allocate it to someone else → blocked with **"currently held by Priya Sharma"**.
4. **Conflict → transfer demo (the spec's own example):** as **Raj (Employee)**, open AF-0114's asset page — the *Request Transfer* button is what a non-holder sees (employees don't get a raw Allocate action; only Asset Manager does). Raj requests it for himself → as **Manoj** or **Deepa (Engineering Dept Head)**, approve from the Allocations & Transfers screen → allocation history updates atomically (Priya's closes, Raj's opens), asset never leaves Allocated the whole time.
5. **Booking demo:** open Bookings, select **Room B2** — the seeded 9:00–10:00 slot is there. Request 9:30–10:30 → rejected with the conflicting range named. Request 10:00–11:00 → accepted (starts right after — the boundary case). Show the week calendar, then Reports → Resource Booking Heatmap.
6. **Maintenance:** as any employee, raise a request with a photo on an available asset → as Manoj, approve (asset flips to Under Maintenance) → assign a technician → start → resolve (asset returns to Available, or back to Allocated if it was held) → show the per-asset Maintenance History on the asset detail page.
7. **Audit climax:** open the seeded **"Q3 Floor-1 Audit"** cycle (Kiran is the assigned auditor) → scan an asset's QR with a phone camera (one tap = Verified) → manually mark a different item Missing with a note → the discrepancy report card appears live on the page → close the cycle as Asha → the Missing asset flips to **Lost**, every Asset Manager gets an Audit Discrepancy notification. (The seed also ships a second, already-**closed** cycle — "Floor 2 Spot Check (Q2)" — showing the full lifecycle including an auto-raised maintenance ticket from a Damaged item, in case there's no time to run one live.)
8. **Close:** Dashboard KPIs + the overdue-return banner (Arjun's seeded overdue laptop) → the bell icon's notification dropdown → `/activity`'s Activity Log tab ("every action you just watched is in here, who did what, when") → Reports & Analytics, export a CSV.

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Scope is huge (10 screens) | Build in the P0 order above — each step is demoable alone; cut from the bottom of P1, never from P0 |
| Overlap/time logic bugs (timezones, boundaries) | Store UTC, test the boundary case (10:00 end vs 10:00 start) explicitly |
| RBAC leaks (employee hits admin route) | Central permission middleware + role matrix from the spec as test cases |
| Demo-day empty DB / broken seed | Idempotent seed script, run it in rehearsal |
| Team splits on stack debates | Decide architecture in the next session (see §7) and freeze it |

## 7. Open Decisions → Next Session (Design & Architecture)

To be decided together before writing code:

1. **Stack** — leading options (any works; pick for team familiarity + speed):
   - **Next.js (full-stack) + PostgreSQL + Prisma** — one codebase, fast, easy deploy (Vercel/Neon)
   - **React + Node/Express + PostgreSQL** — classic split, more "ERP architecture" to show
   - **Django + React** — batteries-included auth/admin, fast RBAC
   - PostgreSQL is strongly preferred regardless (exclusion constraints solve booking overlaps natively)
2. **Auth approach** — roll our own sessions/JWT vs. library (NextAuth/Passport/Django auth)
3. **File storage** for photos/documents (local vs. Cloudinary/S3)
4. **Notification delivery** — in-app only vs. in-app + email (Resend/Nodemailer); scheduler for reminders/overdue (cron)
5. **Data model review** — ERD for: users, departments, categories, assets, allocations, transfers, bookings, maintenance_requests, audit_cycles, audit_items, notifications, activity_log
6. **Team & timeline** — hackathon duration, team size, and who owns which module

---
*Next step: agree on §7, then produce `04-architecture.md` (ERD + API surface + state machines + folder structure) before any code.*

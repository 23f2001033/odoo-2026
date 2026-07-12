# AssetFlow — Problem Statement (Spec of Record)

> Extracted from `AssetFlow problem statement.pdf`. This is the checklist judges will score against — every rule below must be demonstrable in the demo.
> Mockup (POC): https://app.excalidraw.com/l/65VNwvy7c4X/5ceOBMjbDby

## Vision

A centralized ERP platform to track, allocate, and maintain physical assets and shared resources for **any** organization (offices, schools, hospitals, factories, agencies). Replaces spreadsheets and paper logs with structured asset lifecycles, centralized resource booking, and real-time visibility into **who holds what, where it is, and its condition**.

**Explicitly out of scope:** purchasing, invoicing, accounting. (Acquisition cost is stored for ranking/reports only — never wire it to accounting logic.)

## Core Requirements

1. Maintain departments, asset categories, and an employee directory
2. Track assets through a flexible lifecycle with state transitions
3. Allocate assets to employees/departments — **system must prevent double-allocation**
4. Book shared/limited resources by time slot — **overlap validation**
5. Route maintenance requests through an **approval workflow** before repair starts
6. Run scheduled **audit cycles** with assigned auditors and auto-generated discrepancy reports
7. Surface overdue returns, bookings, and maintenance via **notifications + KPI dashboard**
8. Proper ERP architecture, reusable modules, secure role-based workflows, intuitive UI/UX

## Asset Lifecycle States

`Available` · `Allocated` · `Reserved` · `Under Maintenance` · `Lost` · `Retired` · `Disposed`

Transitions are bidirectional where sensible (e.g. Available ↔ Under Maintenance, Allocated → Available).

## Hard Business Rules (judges will test these)

| Rule | Behavior |
|---|---|
| **No double-allocation** | Priya holds Laptop AF-0114. Raj tries to allocate it → system **blocks**, shows "currently held by Priya", offers a **Transfer Request** button instead. |
| **Booking overlap** | Room B2 booked 9:00–10:00. Request for 9:30–10:30 → **rejected** (overlaps). Request for 10:00–11:00 → **accepted** (boundary touch is fine). |
| **Maintenance gating** | Asset flips to *Under Maintenance* only **after approval**, and back to *Available* only on resolution. |
| **No self-assigned admin** | Signup creates an **Employee** account only — no role selection at signup. Roles are assigned **only** by Admin in the Employee Directory. |
| **Overdue auto-flagging** | Allocations past Expected Return Date are auto-flagged → Dashboard + Notifications. |
| **Audit closure** | Closing an audit cycle **locks** it and updates affected asset statuses (e.g. confirmed-missing → Lost). |

## The 10 Required Screens

### 1. Login / Signup
- Signup → Employee account only (no role picker)
- Email + password login, forgot password, session validation

### 2. Dashboard / Home
- KPI cards: Assets Available, Assets Allocated, Maintenance Today, Active Bookings, Pending Transfers, Upcoming Returns
- Overdue returns highlighted **separately** from upcoming ones
- Quick actions: Register Asset, Book Resource, Raise Maintenance Request

### 3. Organization Setup (Admin only — 3 tabs)
- **Tab A — Departments:** create/edit/deactivate; Department Head, optional Parent Department (hierarchy), Active/Inactive status
- **Tab B — Asset Categories:** create/edit (Electronics, Furniture, Vehicles…); optional category-specific fields (e.g. warranty period for Electronics)
- **Tab C — Employee Directory:** name, email, department, role, status; **the only place roles are assigned** (promote to Department Head / Asset Manager)

### 4. Asset Registration & Directory
- Register: Name, Category, **auto-generated Asset Tag (AF-0001…)**, Serial Number, Acquisition Date, Acquisition Cost, Condition, Location, photo/documents, **"shared/bookable" flag**
- Search/filter by: Asset Tag, Serial Number, **QR code**, category, status, department, location
- Lifecycle status shown per asset
- Per-asset history: allocation history + maintenance history

### 5. Asset Allocation & Transfer
- Allocate to employee/department with optional Expected Return Date
- Conflict rule (see table above) with Transfer Request fallback
- Transfer workflow: `Requested → Approved (Asset Manager / Dept Head) → Re-allocated` (history auto-updated)
- Return flow: mark returned, condition check-in notes, status → Available
- Overdue allocations auto-flagged

### 6. Resource Booking
- **Calendar view** of a resource's bookings
- Overlap validation (see table above)
- Booking statuses: Upcoming, Ongoing, Completed, Cancelled
- Cancel / reschedule; **reminder notification** before slot starts

### 7. Maintenance Management
- Raise request: asset, issue description, priority, photo attachment
- Workflow: `Pending → Approved / Rejected (Asset Manager) → Technician Assigned → In Progress → Resolved`
- Asset status auto-updates on approval and resolution
- Maintenance history retained per asset

### 8. Asset Audit
- Create Audit Cycle (scope: department/location, date range)
- Assign one or more auditors
- Auditor marks each asset: Verified / Missing / Damaged
- Auto-generated discrepancy report for flagged items
- Close cycle → locks it + updates asset statuses
- Audit history retained per cycle

### 9. Reports & Analytics
- Asset utilization trends; most-used vs. idle assets
- Maintenance frequency by asset/category
- Assets due for maintenance or nearing retirement
- Department-wise allocation summary
- **Resource booking heatmap** (peak usage windows)
- Exportable reports

### 10. Activity Logs & Notifications
- Notifications: Asset Assigned, Maintenance Approved/Rejected, Booking Confirmed/Cancelled/Reminder, Transfer Approved, Overdue Return Alert, Audit Discrepancy Flagged
- Full audit log of all actions (who did what, when)

## User Roles & Permissions

| Capability | Admin | Asset Manager | Dept Head | Employee |
|---|:-:|:-:|:-:|:-:|
| Org setup (depts, categories, roles) | ✅ | — | — | — |
| Create audit cycles | ✅ | — | — | — |
| Org-wide analytics | ✅ | — | — | — |
| Register / allocate assets | — | ✅ | — | — |
| Approve transfers, maintenance, audit discrepancies | — | ✅ | ✅ (dept transfers) | — |
| Approve returns + condition check-in | — | ✅ | — | — |
| View department assets | — | — | ✅ | — |
| Book shared resources | — | — | ✅ (for dept) | ✅ |
| View own assets | — | — | — | ✅ |
| Raise maintenance requests | — | — | — | ✅ |
| Initiate return/transfer requests | — | — | — | ✅ |

## Canonical End-to-End Workflow

1. Admin sets up departments, categories; promotes Department Heads / Asset Managers
2. Asset Manager registers asset → enters as **Available**
3. Asset allocated (or flagged shared/bookable); double-allocation blocked → transfer request path
4. Employees book shared resources by slot; overlaps auto-rejected
5. Holder raises maintenance request → approval required before work + status flip
6. Transfers/returns as needs change; overdue returns auto-flagged
7. Periodic audit cycles → verification → discrepancy reports → close
8. Everything visible via notifications, logs, reports

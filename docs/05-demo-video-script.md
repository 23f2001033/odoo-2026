# AssetFlow — Demo Video Script (≤5 minutes, functional flow only)

> For the portal's video submission: "covers only the functional flow of your application." No pitch, no market-research talk — straight through the features, screen by screen, proving the spec's business rules actually work. Distinct from the longer live-pitch script in [docs/03-product-plan.md §5](03-product-plan.md), which includes a hook and is timed for a judged walkthrough, not a recording.

## Before you hit record

1. **Reset to a clean seed** so the scripted moments below work exactly as written:
   ```bash
   npm run db:migrate && npm run db:seed
   ```
2. **Pre-log-in every persona in a separate browser tab/window** *before* recording. Logging in live burns 15–20s per switch you don't have in a 5-minute budget. You need three tabs:
   - Tab A — `asha@assetflow.dev` (Admin)
   - Tab B — `manoj@assetflow.dev` (Asset Manager)
   - Tab C — `raj@assetflow.dev` (Employee)
   - All passwords: `Password123`
3. Have the browser **maximized, zoom at 100%**, and close any dev tools/extensions banners before recording.
4. Do one silent dry run first — the timings below assume you already know where to click.

## Script

| Time | Screen / Tab | Action | Say |
|---|---|---|---|
| 0:00–0:15 | Tab C, `/signup` | Show the signup form. Point at the fields — name, email, password. **No role field.** | "Signing up only ever creates an Employee account — there's no role picker. Every other role is granted by an Admin, and only from one place." |
| 0:15–0:40 | Tab A, `/organization` → Employee Directory tab | Click "Manage" on an employee, open the role dropdown, show the four roles, close without changing (Manoj is already an Asset Manager from seed). | "This Employee Directory is the *only* place a role is ever assigned — Department Head, Asset Manager, Admin. Departments and asset categories with custom fields live in the other two tabs." |
| 0:40–1:00 | Tab A, `/dashboard` | Pan across the six KPI cards, point at the red overdue banner. | "The dashboard gives every role a live operational snapshot — assets available, allocated, active bookings, pending transfers — and overdue returns are flagged separately, in red, automatically." |
| 1:00–1:25 | Tab B, `/assets/register` | Fill name + category (Electronics — watch the warranty field appear), submit. Land on the new asset's page — point at the auto-generated tag and the QR code. | "Registering an asset auto-generates its tag and a QR code immediately — no manual numbering, and category-specific fields like warranty show up automatically based on what was set up in Organization Setup." |
| 1:25–2:10 | Tab B, asset `AF-0114` (search "MacBook") | Click **Allocate**, pick any employee, submit → **blocked**: "currently held by Priya Sharma." | "AF-0114 is already held by Priya. The system won't let a second person be allocated the same asset — it blocks it and names exactly who has it." |
| 2:10–2:35 | Tab C, same asset page | As Raj, click **Request Transfer**, submit (targets himself automatically). | "An employee can't allocate directly — but they can request a transfer of an asset someone else holds. That request now needs approval." |
| 2:35–2:55 | Tab B (or Deepa if you have a 4th tab), `/allocations` → Transfer Requests tab | Approve the pending request. | "Once approved, the transfer happens atomically — the old allocation closes, the new one opens, and the full history is preserved on the asset." |
| 2:55–3:30 | Tab C, `/bookings`, select Room B2 | Try booking 9:30–10:30 → rejected (overlaps the existing 9:00–10:00 slot). Try 10:00–11:00 → accepted. | "Room B2 is already booked 9 to 10. A request that overlaps gets rejected automatically — but a request that starts exactly when the previous one ends is allowed. That boundary case is handled correctly, not just the obvious overlap." |
| 3:30–3:40 | Same screen | Quick pan across the week calendar showing multiple bookings. | "The calendar shows every booking for a resource at a glance." |
| 3:40–4:10 | Tab C, `/maintenance` → Tab B | Raj raises a request with a photo → cut to Manoj approving it (asset flips to Under Maintenance) → resolve it (back to Available). | "Repairs route through approval before work starts — raising a request doesn't touch the asset's status. Only an approval does, and resolving it returns the asset to service automatically." |
| 4:10–4:45 | Tab A, `/audits/[id]` (the open "Q3 Floor-1 Audit" cycle) | Scan or manually mark one asset **Verified**, mark a different one **Missing** with a note. Point at the discrepancy report card that appears live. Click **Close Cycle**. | "During an audit, verifying an asset — even by scanning its QR code — is one tap. Anything flagged Missing or Damaged shows up immediately in an auto-generated discrepancy report. Closing the cycle locks it and flips confirmed-missing assets to Lost automatically." |
| 4:45–5:00 | Tab A, `/reports` and `/activity` | Quick pan: utilization bar chart, booking heatmap, one CSV export click. Cut to the Activity Log showing the actions just performed. | "Every one of those actions — the allocation, the transfer, the booking, the audit closure — is captured in a full audit trail, and the numbers behind every report are computed live from real data, not placeholders." |

**Total: ~5:00.** If you're running long, cut the Room B2 calendar pan (3:30–3:40) and the report pan can drop to a single screen instead of two — those are the two lowest-cost trims.

## What NOT to include (this is "functional flow only," not the pitch)

- No opening hook about spreadsheet costs or market size — that's for the live judged demo, not this video.
- No slides, no architecture diagrams, no talking over a title card. Screen recording only, narrating live actions.
- Don't explain *why* a feature exists — show that it *works*. Judges are checking the spec's rule list, not evaluating your product thinking here.

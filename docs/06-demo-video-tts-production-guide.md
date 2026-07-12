# AssetFlow — TTS-Narrated Demo Video: Script + Recording Guide

> For producing the portal's required video with an ElevenLabs voiceover instead of live narration.
> Same 12 beats and same ≤5:00 budget as [docs/05-demo-video-script.md](05-demo-video-script.md) — that
> doc is for narrating live while you record; this one is for generating audio first, then recording
> screen action to match it. Same rules apply: **functional flow only** — no hook, no pitch, no slides.

## How this workflow works

Don't try to record one continuous take while a pre-generated audio track plays in your ear — timing
will drift and you'll be re-recording constantly. Instead, work **block by block**:

1. Generate one short ElevenLabs audio clip per block (Part A below — 12 clips).
2. Record one continuous screen-capture take of the whole app walkthrough, silent, at your own pace
   (Part B below — same 12 beats, as steps to click through).
3. In a simple video editor, cut your screen recording into 12 segments and drop each audio clip under
   its matching segment (Part C below).

This is far more forgiving: you're not fighting to match a stranger's TTS pacing live, and if one line's
delivery sounds off, you regenerate just that one clip in ElevenLabs, not the whole recording.

## Before you start

1. **Reset to a clean seed** so every scripted moment below works exactly as written:
   ```bash
   npm run db:migrate && npm run db:seed
   ```
   (Run this against whichever environment you're recording — local dev, or the deployed
   `https://assetflow-flame.vercel.app` if you're demoing the live production app.)
2. **Pre-log-in three browser tabs** before recording — switching accounts live wastes time you don't
   have in a 5-minute budget:
   - Tab A — `asha@assetflow.dev` (Admin)
   - Tab B — `manoj@assetflow.dev` (Asset Manager)
   - Tab C — `raj@assetflow.dev` (Employee)
   - All passwords: `Password123`
3. Browser **maximized, zoom at 100%**, dev tools and extension banners closed.
4. Pick a screen recorder: **OBS Studio** (free, handles multi-tab browser capture reliably) is the
   safer choice for a 5-minute take. Windows' built-in Xbox Game Bar (`Win+G`) also works if you're
   capturing a single window.
5. Pick an editor to assemble the final cut: **Clipchamp** is already installed on Windows 11 (search
   the Start menu) and is enough for this — multi-track timeline, trim, export. DaVinci Resolve (free)
   is a heavier alternative if you want more control.
6. ElevenLabs: pick one clear, natural voice from the Voice Library (not a character voice) and keep it
   consistent across all 12 generations. A reasonable starting point for settings: Stability ~50%,
   Similarity ~80%, Style ~20–30%. Preview and nudge by ear — you're listening for "confident,
   unhurried, sounds like a product walkthrough," not dramatic or robotic.

---

## Part A — ElevenLabs narration script (12 clips)

Generate each block as its own clip. Numbers/codes are spelled out phonetically so the voice doesn't
mangle them — say them as written, not as they appear in the app UI.

**Target durations are what the *spoken audio* should land near** — each is shorter than its matching
action window in Part B, which is intentional: it leaves room for on-screen clicking/loading that
doesn't need narration under it.

---
**Block 1 · target ~10s**
```
Signing up only ever creates an Employee account. There's no role picker. Every other role is granted by an Admin, and only from one place.
```

**Block 2 · target ~12s**
```
This Employee Directory is the only place a role is ever assigned: Department Head, Asset Manager, or Admin. Departments and asset categories with custom fields live in the other two tabs.
```

**Block 3 · target ~11s**
```
The dashboard gives every role a live operational snapshot: assets available, allocated, active bookings, pending transfers. And overdue returns are flagged separately, in red, automatically.
```

**Block 4 · target ~13s**
```
Registering an asset auto-generates its tag and a QR code immediately. No manual numbering. And category-specific fields, like warranty, show up automatically based on what was set up in Organization Setup.
```

**Block 5 · target ~11s**
```
A F zero one one four is already held by Priya Sharma. The system won't let a second person be allocated the same asset. It blocks it, and names exactly who has it.
```

**Block 6 · target ~9s**
```
An employee can't allocate directly, but they can request a transfer of an asset someone else holds. That request now needs approval.
```

**Block 7 · target ~10s**
```
Once approved, the transfer happens atomically. The old allocation closes, the new one opens, and the full history is preserved on the asset.
```

**Block 8 · target ~16s**
```
Room B2 is already booked nine to ten. A request that overlaps gets rejected automatically. But a request that starts exactly when the previous one ends is allowed. That boundary case is handled correctly, not just the obvious overlap.
```

**Block 9 · target ~5s**
```
The calendar shows every booking for a resource at a glance.
```

**Block 10 · target ~12s**
```
Repairs route through approval before work starts. Raising a request doesn't touch the asset's status. Only an approval does, and resolving it returns the asset to service automatically.
```

**Block 11 · target ~16s**
```
During an audit, verifying an asset, even by scanning its QR code, is one tap. Anything flagged Missing or Damaged shows up immediately in an auto-generated discrepancy report. Closing the cycle locks it, and flips confirmed-missing assets to Lost automatically.
```

**Block 12 · target ~15s**
```
Every one of those actions, the allocation, the transfer, the booking, the audit closure, is captured in a full audit trail. And the numbers behind every report are computed live from real data, not placeholders.
```
---

Total spoken time: ~2:20. That leaves roughly 2:40 spread across the 12 action windows for clicking,
page loads, and reading on-screen results — plenty of slack, so don't rush the recording in Part B.

Export each clip as its own MP3/WAV named `block-01.mp3` … `block-12.mp3` so Part C's ordering is obvious.

---

## Part B — Screen recording steps (record silently, one continuous take)

Do one silent dry run first so you're not hunting for buttons on the real take. Timestamps are targets,
not hard cuts — you'll re-cut to match the actual audio lengths in Part C.

| # | ~Time | Tab | Steps |
|---|---|---|---|
| 1 | 0:00–0:15 | C, `/signup` | Show the signup form. Briefly point at name/email/password fields. Don't submit — the point is that no role field exists. |
| 2 | 0:15–0:40 | A, `/organization` → Employee Directory | Click "Manage" on Manoj's row, open the role dropdown, show the four roles, **close without changing**. Click through the Departments and Categories tabs briefly. |
| 3 | 0:40–1:00 | A, `/dashboard` | Slowly pan across the six KPI cards, then point at the red overdue banner. |
| 4 | 1:00–1:25 | B, `/assets/register` | Fill name, pick Category = Electronics (watch the warranty field appear), submit. Land on the new asset page — point at the auto-tag and QR code. |
| 5 | 1:25–2:10 | B, search "MacBook" → `AF-0114` | Click **Allocate**, pick any employee, submit → blocked message appears. Hold on the "currently held by Priya Sharma" message for ~2s so it's readable. |
| 6 | 2:10–2:35 | C, same asset page | As Raj, click **Request Transfer**, submit. |
| 7 | 2:35–2:55 | B (or Deepa), `/allocations` → Transfer Requests | Approve the pending request, show it clear from the list. |
| 8 | 2:55–3:30 | C, `/bookings` → Room B2 | Try 9:30–10:30 → rejected, show the conflict message. Try 10:00–11:00 → accepted. |
| 9 | 3:30–3:40 | same screen | Pan across the week calendar. |
| 10 | 3:40–4:10 | C then B, `/maintenance` | Raj raises a request with a photo → cut to Manoj approving (asset flips to Under Maintenance) → resolve (back to Available). |
| 11 | 4:10–4:45 | A, `/audits/[id]` — "Q3 Floor-1 Audit" | Mark one asset Verified (scan or manual), mark a different one Missing with a note. Let the discrepancy report card render. Click **Close Cycle**. |
| 12 | 4:45–5:00 | A, `/reports` then `/activity` | Pan the utilization chart and booking heatmap, click one CSV export. Cut to Activity Log showing the actions just performed. |

---

## Part C — Assembling in Clipchamp (or your editor of choice)

1. Import your one long screen recording, plus all 12 `block-XX` audio files.
2. Drop the screen recording onto the video track.
3. Split it at each action boundary from Part B's table — you'll end up with 12 rough video segments.
4. Add an audio track below the video track. For each segment, drag its matching `block-XX` clip onto
   the audio track, start aligned to the segment's start.
5. Trim each video segment's out-point to end just after its audio clip finishes (add ~0.5s buffer),
   then start the next segment immediately after. If a video segment is shorter than its audio (rare,
   given the slack built into Part A's targets), extend it with a freeze-frame on the last frame rather
   than speeding up the clip.
6. Mute the screen recording's own system audio (mouse clicks etc.) or drop it to ~10–15% volume if you
   want faint ambient realism under the narration.
7. Watch the full assembled timeline once end-to-end before exporting — check nothing drifts and the
   total is under 5:00.
8. Export at 1080p, MP4.

## Part D — Submitting

- Upload to YouTube (Unlisted or Public) or Google Drive with **"Anyone with the link"** access — the
  portal requires open access, a private/restricted link will fail review.
- Re-confirm runtime is ≤5:00 and the video contains **only** the functional walkthrough — no title
  card, no market-size hook, no explaining *why* a feature exists (see docs/05's "what NOT to include"
  section, same rules apply here).
- Paste the link into the portal's video submission field.

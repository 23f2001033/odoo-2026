# AssetFlow — Enterprise Asset & Resource Management System

Hackathon project: a centralized platform for organizations to track, allocate, and maintain physical assets and shared resources — asset lifecycle, allocation/transfer with conflict handling, time-slot resource booking, maintenance approval workflows, structured audit cycles, notifications, and analytics.

## Documentation

| Doc | Contents |
|---|---|
| [docs/01-problem-statement.md](docs/01-problem-statement.md) | Full spec extracted from the problem statement PDF — screens, roles, business rules (the judging checklist) |
| [docs/02-market-research.md](docs/02-market-research.md) | Market size, spreadsheet pain points, competitor gaps (Snipe-IT / Asset Panda / Limble), research-backed feature decisions |
| [docs/03-product-plan.md](docs/03-product-plan.md) | Prioritized build plan (P0/P1/P2), personas, demo script, risks, open architecture decisions |
| [docs/04-architecture.md](docs/04-architecture.md) | Full system design — stack, layered module architecture, ERD, state machines, DB-level conflict constraints, RBAC, API surface, jobs, testing, build order |

## Team Git Workflow (hackathon rules — evaluation depends on this)

- **Everyone commits their own code from their own GitHub account** — individual commits are scored. Verify your `git config user.email` matches an email registered on *your* GitHub account, or your commits won't count toward your contribution.
- **Push to `main` at least once every hour.** Small, working commits beat big ones. If `main` moved, `git pull --rebase` before pushing.
- **Commit messages describe what was done**, e.g. `Add booking overlap validation with exclusion constraint` — not `fix`, `update`, `wip`.
- Suggested flow per person: `git pull --rebase` → work on your module (module ownership in [docs/04-architecture.md §13](docs/04-architecture.md)) → `git add -A` → `git commit -m "..."` → `git push`.
- Never commit `.env` (already gitignored). Share secrets over Discord DMs, not the repo.

**Team leader checklist:** create public repo → submit link on portal **before 10:00 AM** → add mentor as collaborator → after coding ends, submit ≤5-min open-access demo video.

## Status

- [x] Problem statement analyzed
- [x] Market research & product plan documented
- [x] Design & architecture documented
- [ ] Implementation (milestone order in [docs/04-architecture.md §12](docs/04-architecture.md))

# DEPRECATED — migrated to the mcpcentral platform monorepo

**Status:** Source of truth moved 2026-07-23 (ADR-043, agent-server wave 1).

This codebase now lives in the platform monorepo:

- **Repo:** `mcpcentral-io/mcpcentral`
- **Path:** `apps/deep-researcher/`
- **Worker:** `mcpcentral-deep-researcher`
- **Serving:** https://deep-researcher.mcpcentral.io

## What this means

- **Do NOT edit code in this repository.** It is archived and read-only — changes here ship nowhere.
- **Do NOT re-point CI at this repository.** The worker is built and released from the monorepo via its path-filtered GitHub Actions workflow. Two writers would race the same Cloudflare Worker.
- This repository is preserved for **git history and historical reference only**.

## Where to work instead

```
mcpcentral-io/mcpcentral  →  apps/deep-researcher/
```

See **ADR-043** ("Agent-server class lands in the platform monorepo") under `docs/migration/ADRs/` in the monorepo for the rationale and the full wave-1 inventory.
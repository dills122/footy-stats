# FootyStats

FootyStats is an English football archive for exploring historical league tables,
club records, tier movement, and long-range promotion/relegation patterns.

Running site: [FootyStats](https://footy.dsteele.dev/)

## What You Can Explore

- Historical league tables by season and tier.
- Club overview pages with season history, movement, and performance milestones.
- League/tier overview pages with movement leaders, close seasons, notable marks, and churn.
- Deep-stat views for clubs and tiers.
- Movement explorer presets for comparing club paths through the pyramid.
- Print-friendly table, club, league, and deep-stat views.
- In-app data issue reporting for specific pages, clubs, seasons, or tables.

## Data Updates

The app ships with JSON data in `src/assets`, then checks
[`footy-data-kit`](https://github.com/dills122/footy-data-kit) releases for newer archive data.

When newer data is available, the app can refresh the archive in the browser:

- release metadata is read from GitHub's API;
- data files are downloaded from tagged `raw.githubusercontent.com` URLs;
- downloaded files are verified against Git blob checksums from the release tag;
- verified data is stored locally as a browser override;
- the shipped JSON remains the fallback.

This keeps the site static-host friendly while still allowing newer verified data to be used
without redeploying the app.

## Getting Started

```bash
nvm use
pnpm install
pnpm start
```

The dev server runs at `http://localhost:4200/` by default.

## Useful Commands

```bash
pnpm start        # local dev server
pnpm test         # Jest test suite
pnpm test:watch   # Jest watch mode
pnpm lint         # ESLint
pnpm build        # production build
```

## AI Central Context

This repo uses AI Central steering and local Codex skill links.

Tracked files:

- `AGENTS.md`
- `.codex/steering/repository-steering.md`
- `.codex/steering/testing-quality-gates-steering.md`

Ignored local links:

- `.codex/skills/`
- linked shared steering under `.codex/steering/`

Refresh local symlinks with:

```bash
pnpm codex:links
```

By default this expects AI Central at `../ai-central` relative to this repository. Set
`AI_CENTRAL_HOME` if your checkout lives somewhere else.

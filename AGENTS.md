# Footy Stats Agent Guide

This file is the root AI-agent guidance for `footy-stats`.

## Scope

- Applies to the full repository unless a nested `AGENTS.md` is closer to the edited file.
- Use `.codex/steering/*` for reusable repo-wide standards and skill context.
- Local links under `.codex/skills/` are generated from AI Central and are not source files.
- Shared steering symlinks under `.codex/steering/` are local AI Central links; repo-specific steering remains tracked.

## Project Summary

Footy Stats is an Angular application for exploring groomed historical football data, currently focused on Premier League data.

Core priorities:

- Make the football data easy to inspect, compare, and understand.
- Preserve stable data semantics for seasons, teams, standings, league tiers, and derived views.
- Prefer focused UI and data-model improvements over broad rewrites.
- Keep Angular, Material, ECharts, NgRx Signals, and Tailwind usage consistent with existing patterns.
- Update docs when setup, commands, data contracts, or user-facing workflows change.

## Repository Conventions

- Follow `.codex/steering/repository-steering.md` for repo scope and boundaries.
- Follow `.codex/steering/testing-quality-gates-steering.md` for verification expectations.
- Follow linked AI Central steering such as `.codex/steering/angular-steering.md`, `.codex/steering/javascript-esm-steering.md`, and `.codex/steering/frontend-design-steering.md` when present.
- Prefer existing helper APIs, route patterns, store patterns, and component conventions.
- Add focused tests for behavior changes.
- Avoid unrelated refactors and generated artifact churn.

## Useful Commands

- Install dependencies: `pnpm install`
- Start local dev server: `pnpm start`
- Build: `pnpm build`
- Test: `pnpm test`
- Watch tests: `pnpm test:watch`
- Lint: `pnpm lint`
- Refresh local AI Central links: `pnpm codex:links`

## Branch And PR Metadata

- Use feature branches for behavior, contract, test, or documentation changes unless explicitly asked to work on `main`.
- When work is ready, provide:
  - branch name
  - PR title
  - PR summary
  - test evidence

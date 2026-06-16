# Testing And Quality Gates

Testing should protect football-data behavior, Angular rendering assumptions, and deployment confidence.

## Default Expectations

- Add or update focused Jest coverage for behavior changes.
- Cover edge cases for standings, seasons, league tiers, sorting, filtering, routing, and link generation.
- Keep test fixtures small and explicit.
- Prefer deterministic data-transform tests over brittle DOM assertions when possible.
- Use Angular component tests when behavior depends on template bindings, Material controls, or user interaction.

## Before Finishing Work

Run the smallest reliable command that validates the changed area:

- Utility, pipe, store, or component behavior: `pnpm test`
- Type or production bundling changes: `pnpm build`
- Formatting or lint-sensitive edits: `pnpm lint`
- AI Central link changes: `pnpm codex:links`

If a command cannot run locally, document why and what risk remains.

## Quality Gates

- No known failing tests introduced by the change.
- No unrelated formatting churn.
- Public routes and deploy settings preserved unless intentionally changed.
- Docs updated for setup, command, or workflow changes.
- Data contract changes paired with focused tests and clear notes.

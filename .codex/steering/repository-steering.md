# Repository Scope And Priorities

This repository builds Footy Stats, an Angular application for exploring groomed historical football statistics.

Primary deliverables:

- Angular UI for navigating seasons, league tables, team performance, and historical comparisons
- Local static data assets that power the app experience
- Focused utility, store, and component code for turning football data into readable views

Core priorities:

- showcase the prepared football data clearly
- keep football-data semantics stable and inspectable
- make comparison workflows fast and understandable
- maintain accessible, responsive, data-dense UI surfaces
- preserve local-first development and static deploy compatibility

## Active Boundaries

- `src/app/components/` owns reusable Angular UI components.
- `src/app/store/` owns app state, derived data, and data-loading behavior.
- `src/app/types/` owns shared TypeScript view and domain types.
- `src/app/utils/` owns pure helpers such as link builders and data transforms.
- `src/assets/` owns static application data consumed by the frontend.
- `sql/` owns database exploration and hydration scripts; do not treat it as the runtime source of truth unless the app is changed to use it.
- `screenshots/` contains visual reference artifacts and should not churn during unrelated changes.

## Data Semantics

- Preserve season, team, standings, tier, and table semantics unless a task explicitly changes them.
- Prefer typed transforms over ad hoc template logic when shaping football data.
- Keep derived views deterministic and easy to test.
- Do not hand-edit generated or groomed data assets without confirming the source and intended data contract.

## Safe Refactor Boundaries

Do not refactor these without explicit instruction:

- public route names used by the GitHub Pages deployment
- static asset structure consumed by the Angular app
- league table and season data contracts
- existing store API shape used by components
- CI and deployment workflows

Safe default changes:

- feature-scoped component improvements
- focused accessibility and responsive-layout fixes
- typed helper extraction when it reduces real duplication
- tests for stores, pipes, utilities, and data transforms
- documentation updates for setup or workflow changes

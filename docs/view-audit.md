# FootyStats View Audit

Date: 2026-06-16

## Audit Goal

Evolve FootyStats from a dashboard-feeling application into a historical football archive, reference publication, and research tool.

Target perception:

- English football history archive
- Research tool
- Reference publication
- Digital encyclopedia

Avoid optimizing toward:

- Admin dashboard
- Analytics SaaS
- Business intelligence console
- Widget-heavy app UI

## Evidence Reviewed

- Current desktop screenshots for Dashboard and Teams
- Current desktop captures for Tables and Movement
- Attached design direction notes
- Live local app at `http://127.0.0.1:4200`
- Source files under `src/app` and `src/styles.scss`
- Desktop viewport: `1280 x 720`
- Mobile viewport check: `390 x 844`

## High-Level Findings

### 1. The Visual System Creates Too Much Chrome

The current global primitives make most UI surfaces visually heavy:

- `.app-surface` adds border, gradient, shadow, and blur.
- `.app-panel` adds another border, gradient, and shadow.
- `.app-data-shell` adds border, gradient, shadow, and blur.
- `.app-pill-control` and active states add bordered pills and gradients.

This makes every section compete for attention. The app reads as a dashboard because nearly all content is inside framed controls or panels.

Audit metrics from the rendered app:

- Dashboard: 15 bordered visible elements, 14 shadows, 11 gradients.
- Tables: 213 bordered visible elements, 24 shadows, 17 gradients.
- Movement default: 35 bordered visible elements, 19 shadows, 12 gradients.
- Teams: 511 bordered visible elements and 728 links due the large table.

Recommendation:

- Start the overhaul in `src/styles.scss`.
- Replace gradient-heavy surface primitives with flatter archive primitives.
- Use borders only for true data boundaries, not for every section.
- Use typography, spacing, and table structure as the main hierarchy.

### 2. Page Hierarchy Is Controls First, Data Second

The strongest content is often below controls:

- Tables starts with selector controls, then summary cards, then the league table.
- Movement starts with warning and filters; the chart appears below the fold after a club is selected.
- Teams starts with a large pill filter before the directory table.
- Dashboard leads with stat widgets before archive/navigation storytelling.

Recommendation:

- Adopt this rule for all major pages: `Data > Context > Controls`.
- Controls should support the archive, not visually dominate it.
- Place primary data views earlier and make filters quieter.

### 3. Typography Is Too Application-Sized

Current live heading scale:

- Dashboard H1: about `29px`
- Tables H1: about `29px`
- Movement H1: about `29px`
- Teams H1: about `29px`
- Feature card headings: `17px`
- Control section headings: about `16.8px`

This feels like app UI, not a publication or archive.

Recommendation:

- Introduce a publication scale.
- H1: `44-56px` desktop, `32-38px` mobile.
- Page lede: `18-20px`.
- Section headings: `28-36px`.
- Data table text can remain denser, but page framing should feel editorial.

### 4. The Palette Is Less Bad Than The Treatment

The dark navy, purple, and pink/red direction can work, but the repeated gradients, pink borders, glowing edges, and orange-red logo treatment make the palette feel noisy.

Contrast notes:

- `#e11d48` on `#0f172a` is about `3.8:1`.
- This is acceptable for large/bold text but too weak for small normal table text.
- The current pink/red is used for small values, active pills, links, borders, and highlights, so some usage is risky.

Recommendation:

- Keep navy as the foundation.
- Use one restrained accent for selection/action.
- Add a warmer archive-neutral surface color, not beige-heavy, for contrast.
- Stop using red/pink as the default data emphasis everywhere.
- Use semantic colors sparingly for promotion/relegation markers.

### 5. Mobile Has Horizontal Overflow Beyond Tables

At `390 x 844`, pages overflow horizontally:

- Dashboard scroll width: `476px`
- Tables scroll width: `736px`
- Movement scroll width: `476px`
- Teams scroll width: `758px`

Tables naturally need horizontal scrolling, but the toolbar and page shell also overflow. This should be fixed before table-specific mobile behavior.

Recommendation:

- Make toolbar/nav responsive first.
- Ensure `.app-page-shell` and `.app-surface` never exceed viewport width.
- Keep table overflow local to the table container only.
- Consider compact mobile navigation instead of full pill nav.

## Page Audit

## Dashboard

Current strengths:

- Copy is close to the target direction.
- It already introduces the archive concept.
- Primary navigation actions are present.

Current problems:

- The page still says "dashboard" visually because stats and feature cards dominate.
- The H1 is too small for a landing/archive entry point.
- Summary metrics have equal emphasis but do not tell a story.
- Feature cards repeat generic product claims instead of archive pathways.
- The disabled "View Rankings" action creates a dead primary-area control.

Recommended overhaul:

- Rename the route-facing concept away from Dashboard in UI, even if the route remains `/dashboard`.
- Lead with "English Football Archive" or "FootyStats Archive".
- Replace stat cards with a short narrative:
  - "Explore 137 seasons of English football history."
  - "Follow clubs through promotions, relegations, league tables, and long-run patterns."
- Make primary actions:
  - Browse Tables
  - Explore Clubs
  - Track Movement
- Convert feature cards into archive sections or remove them.
- Use a flatter first viewport with more whitespace and stronger type.

Priority: High

## Tables

Current strengths:

- The table itself is valuable and readable.
- Season summary data is useful.
- Selectors are simple.

Current problems:

- Controls are the first visual object on the page.
- The table is the product, but it appears after controls and summary cards.
- "League Table Viewer" sounds like an app tool, not an archive entry.
- Season summary is nested: summary card plus fact cards plus chips.
- Top-four highlighting uses a gold-ish badge treatment that clashes with the palette.
- Points use red, which is visually strong but not semantically clear.

Recommended overhaul:

- Page title should be content-first:
  - "2024 Premier League Table"
  - "Premier League, 2024"
- Put season/league controls inline near the title or in a quiet secondary row.
- Move the table directly below the title/context.
- Convert summary cards into a compact historical note above or beside the table.
- Use restrained table styling:
  - Sticky header
  - Clear row rhythm
  - Minimal borders
  - Subtle top/relegation markers
- Make promotion/relegation/top-four semantics explicit in a key.

Priority: High

## Movement

Current strengths:

- This is the most distinctive product feature.
- ECharts implementation is already substantial.
- URL state, quick picks, presets, and selected chips are useful.
- The chart height is generous once shown.

Current problems:

- Default page shows controls and an empty state, not the graph.
- With one selected club, the chart starts around `y=779px` in a `720px` desktop viewport, below the fold.
- Collapsing filters moves the chart to about `y=470px`, which proves layout order is the main issue.
- The data coverage warning is visually louder than the graph.
- The club picker has too many pill controls at once.
- The empty state requires the user to understand setup before seeing the unique feature.

Recommended overhaul:

- Treat Movement as the flagship page.
- Show an opinionated starter graph by default, such as selected common clubs or a "Big Six" / "Historic clubs" preset.
- Put the graph before filters.
- Move filters into a right sidebar on desktop or a drawer/disclosure below the graph.
- Keep the data coverage warning, but style it as a research note, not a warning panel.
- Add graph explanation:
  - lower tier number means higher league
  - gaps indicate missing or unavailable data
  - markers represent promotion/relegation
- Improve chart labeling and legend so the graph can stand alone.

Priority: Highest

## Teams

Current strengths:

- This page already feels closest to an archive index.
- The simple team directory structure is appropriate.
- External links are useful for research workflows.

Current problems:

- Alphabet filter is styled as large app pills.
- The table has 242 rows and 728 external links, which creates heavy visual density.
- The team names are not yet meaningful destination links.
- External links dominate each row and repeat the same three labels.
- Mobile table width forces page-level horizontal overflow.

Recommended overhaul:

- Replace pill alphabet buttons with a compact archive index:
  - `A B C D E F G ... All`
- Make team names the primary links when team profile pages exist.
- Collapse external links into quieter icon/text actions or a per-row details pattern.
- Consider grouping by initial letter with section headers.
- Add search only if it stays visually secondary.
- Keep the page simple; do not over-card it.

Priority: Medium-High

## Rankings

Current state:

- Navigation shows Rankings as disabled/coming soon.
- Dashboard includes a disabled View Rankings button.

Current problems:

- Disabled nav/actions imply incomplete product surface.
- The UI gives equal navigation weight to a page that does not exist.

Recommended overhaul:

- Remove Rankings from primary nav until it exists, or create a lightweight placeholder that explains planned rankings.
- Do not place disabled actions in the hero/primary flow.
- If rankings are planned, define the first useful archive ranking:
  - all-time points by club
  - top-flight seasons
  - titles/promotions/relegations
  - best defensive seasons

Priority: Medium

## Navigation And Brand

Current strengths:

- Brand name and archive label are clear.
- Sticky header is useful.

Current problems:

- Header is a full `app-surface`, so it competes with page content.
- Nav pills look like SaaS filters.
- Logo mark gradient is loud compared with the archive target.
- Mobile nav does not fit the viewport cleanly.

Recommended overhaul:

- Make header flatter and quieter.
- Use text nav or restrained tabs instead of pill buttons.
- Keep active state obvious but less saturated.
- Consider `Archive`, `Tables`, `Movement`, `Clubs` as nav labels.
- Use a compact mobile nav pattern.

Priority: High

## Component And Styling Inventory

Components that should be revisited early:

- `src/styles.scss`
  - Global tokens, backgrounds, surfaces, data shells, pill controls.
- `src/app/components/main-toolbar/*`
  - Header and primary nav visual direction.
- `src/app/pages/home/*`
  - Archive entry point and narrative hierarchy.
- `src/app/components/league-tables-viewer/*`
  - Controls-first layout.
- `src/app/components/season-summary-card/*`
  - Nested card summaries.
- `src/app/components/league-table/*`
  - Data table styling and semantic highlights.
- `src/app/pages/movement-explorer/*`
  - Flagship graph-first restructure.
- `src/app/components/team-list/*`
  - Archive index and external-link density.
- `src/app/components/notification-banner/*`
  - Research-note styling instead of warning chrome.

## Proposed Overhaul Sequence

## Prototype Slice For Direction Check

Before doing the full overhaul, build a small visible slice that answers one question:

> Does this feel more like a football history archive?

Recommended prototype scope:

- Flatten the global surface treatment enough to reduce gradients, shadows, and pink borders.
- Flatten the header and primary navigation.
- Reframe `/dashboard` as an archive home while preserving the existing route.
- Replace Dashboard stat cards with narrative archive copy and compact metadata.
- Convert the Teams alphabet filter from large app pills into a compact archive index.

Out of scope for the first prototype:

- Rebuilding Movement layout.
- Reworking ECharts options.
- Rebuilding Tables order and summary semantics.
- Adding team profile routes.
- Changing data contracts.

Why this slice:

- It is fast to review visually.
- It touches the main perception layer without risking data behavior.
- It produces one publication-style entry page and one archive-index page.
- It keeps the highest-risk page, Movement, unchanged until the direction is approved.

Prototype acceptance checks:

- `/dashboard` should read as an archive home, not a metrics dashboard.
- `/teams` should read more like an index and less like a filter form.
- Primary navigation should stop feeling like SaaS pill filters.
- No generated data or route contracts should change.
- Existing tests should continue to pass.

### Phase 1: Visual System Reset

- Flatten global background.
- Replace `.app-surface`, `.app-panel`, and `.app-data-shell` with restrained archive primitives.
- Reduce border, shadow, blur, and gradient use.
- Define typography scale.
- Define table, note, and index primitives.
- Fix mobile shell overflow.

Why first:

Most page-level problems are amplified by global styling. Fixing page layouts before tokens will cause churn.

### Phase 2: Header And Dashboard

- Flatten header/nav.
- Reframe Dashboard as archive home.
- Replace stat widgets with narrative entry copy.
- Promote three primary archive pathways.

Why second:

This sets the perception for the whole app.

### Phase 3: Tables

- Make the selected table the main object.
- Move controls into a secondary context row.
- Collapse summary cards into concise facts.
- Refine table semantics and highlights.

Why third:

Tables are a core archive use case and will validate the new data-presentation primitives.

### Phase 4: Movement

- Make graph-first layout.
- Add default starter graph.
- Move filters into sidebar/drawer.
- Restyle warning as research note.
- Improve legend and tier explanations.

Why fourth:

This is the highest-value product feature, but it benefits from the visual primitives established in earlier phases.

### Phase 5: Teams

- Convert alphabet pills to archive index.
- Reduce external-link density.
- Prepare for team profile pages.
- Fix mobile table behavior.

Why fifth:

Teams is already the strongest page conceptually, so it can follow the bigger hierarchy work.

## Recommended Acceptance Checks

- Desktop first viewport communicates "English football archive" without relying on nav text.
- Movement graph is visible on first load or immediately after default selection.
- Tables page shows the league table before large control panels.
- No page-level horizontal overflow at `390px` width except inside intended table scroll containers.
- Accent color is not used for small normal text below AA contrast.
- Visible bordered/shadowed elements are reduced by at least 50% on Dashboard, Tables, and Movement.
- Disabled primary actions are removed from hero/primary flows.
- `pnpm test`, `pnpm build`, and `pnpm lint` run cleanly or have documented pre-existing warnings.

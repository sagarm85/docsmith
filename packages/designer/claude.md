# claude.md — Operating rules for the `<doc-designer>` frontend

> These rules govern how any AI agent (Claude, or the Antigravity IDE agent) works
> in this package. They are **binding**. `design.md` is *what* to build; this file
> is *how you are allowed to build it*. When unsure, re-read `design.md` and
> `memory.md` before writing code. Do not improvise architecture.

---

## 0. Prime directives (read every session)

1. **The adapter is the only data source.** Never hardcode entities, tables,
   columns, or business values. Never ship sample invoices/customers/products.
   Every value on screen comes from the injected `DataSourceAdapter` or is a static
   label the user typed. Empty adapter → honest empty state, never a fake number.
2. **One renderer.** Preview and PDF both come from `@docsmith/core`'s
   `renderToHtml()`. Do not write a second renderer in the designer.
3. **The template is pure JSON data** — no code, no user-authored HTML, no `eval`,
   no functions in the saved object.
4. **No new runtime dependencies** beyond the approved list (§3). Adding one requires
   editing `design.md` §3, `memory.md`, and a note in `progress.md` — in the same
   change — with justification. Otherwise: hand-roll it.
5. **Business logic lives in `core`, not components.** Svelte files render and
   capture input. Money math, band ordering, binding resolution, pagination CSS, and
   formatting are `core`'s job.
6. **Follow the component tree and build order in `design.md` §14.** Do not invent
   new top-level regions or rename the bands.

If a requested change conflicts with these, stop and surface the conflict — do not
silently deviate.

---

## 1. Stack & tooling (fixed)

- **Svelte 5** (runes) + **Vite** + **TypeScript**, strict mode on.
- Output: a **custom element** `doc-designer` with Shadow DOM.
- Package manager: **pnpm** (monorepo workspace). Node ≥ 20.
- Lint/format: **ESLint** (typescript-eslint, svelte plugin) + **Prettier**. Code
  must pass `pnpm lint` and `pnpm typecheck` with **zero** warnings before commit.
- Tests: **Vitest** for unit; **@testing-library/svelte** for components; a small
  Playwright smoke test for the embed (Phase 2+). Chromium for Playwright is
  preinstalled at `/opt/pw-browsers` — never run `playwright install`.
- No CSS framework, no UI kit, no drag/state libraries (see `design.md` §3).

---

## 2. Repository conventions

- **TypeScript everywhere.** `.svelte` files use `<script lang="ts">`. No `any`
  except at un-typed boundaries, and then narrowed immediately with a comment.
- **Types are imported from `@docsmith/core`.** Do not redefine `Template`,
  `FieldMeta`, `DataSourceAdapter`, etc. locally — import them. One source of truth.
- **File naming:** components `PascalCase.svelte`; helpers `camelCase.ts`; shared
  primitives under `src/ui/`.
- **Component size:** if a `.svelte` file passes ~200 lines or grows a second
  responsibility, split it. Prefer many small components (see tree in `design.md` §14).
- **State:** the template object is the single store (`$state`). Everything derives
  (`$derived`). No global mutable singletons. Cross-component state is passed as
  props or via a small typed context, never via module-level `let`.
- **CSS:** component-scoped `<style>`; colors **only** via `--dd-*` tokens; never a
  raw hex in a component. Shared tokens live in `src/ui/tokens.css`.
- **Events:** lowercase Svelte 5 handlers (`onclick`, `ondrop`). Public component
  APIs use callback props (`onSelect`) and, at the custom-element boundary,
  `CustomEvent`.
- **Comments** explain *why*, not *what*. Every non-obvious workaround names what it
  compensates for.

---

## 3. Approved dependencies (exhaustive)

Runtime: `svelte`, `@docsmith/core`, `@docsmith/adapters` (interface types).
Dev: `vite`, `typescript`, `@sveltejs/vite-plugin-svelte`, `vitest`,
`@testing-library/svelte`, `eslint` + plugins, `prettier`, `@playwright/test`.

**Anything else is forbidden without the doc-update ritual in §0.4.** Specifically
forbidden: Tailwind/any CSS framework, dnd-kit/interact.js/SortableJS, Redux/Pinia/
XState, lodash, moment/dayjs (use `core`'s date formatter), any chart/PDF/rich-text
library.

---

## 4. Data & security rules

- All adapter calls are `async`, **cancellable** (abort on entity change), and
  de-duplicated. Every call has explicit **loading / empty / error** UI.
- **Never** interpolate untrusted values into HTML. Bound values are rendered as
  text nodes by `core`; the designer never `innerHTML`s adapter data.
- The preview runs in a **same-origin iframe**; never inject the host page with the
  document's print CSS.
- Image `src` from a URL is allowed; do not fetch-and-inline arbitrary remote content
  into the template. Uploaded assets (Phase 2) go through the host/adapter, not a
  hardcoded bucket.
- No telemetry, no external network calls except through the adapter and the
  configured `renderServiceUrl`.

---

## 5. Accessibility & UX gates (blocking)

A change cannot merge if it regresses any of: keyboard operability, focus-visible
rings, drag keyboard-alternative, light/dark correctness, contrast (§`design.md` 11–12),
reduced-motion, or the loading/empty/error triad on any async surface.

---

## 6. Definition of Done (per `design.md` §15)

Restated as a checklist the agent must self-verify before marking a task done:
- [ ] Renders from model only; no fabricated data; loading/empty/error all handled.
- [ ] Keyboard + screen-reader per §12; focus ring present.
- [ ] Light & dark correct; only `--dd-*` tokens for color.
- [ ] No business math in the component (delegated to `core`).
- [ ] Two-way where specified; all mutations go through the undo/redo command path.
- [ ] `pnpm lint && pnpm typecheck && pnpm test` all green; zero warnings.
- [ ] No new dependency; no undocumented `TODO`.
- [ ] Exercised in `examples/invoice-demo` against `StaticAdapter`.
- [ ] `progress.md` updated (component ticked, decisions/edge-cases noted).

---

## 7. Workflow discipline

- **Read before write.** At the start of a task, read `design.md` (the relevant
  section), `memory.md`, and the current `progress.md` state.
- **Small, reviewable changes.** One component or one concern per commit.
- **Update `progress.md` in the same change** that lands the work — never let it
  drift. If you discover a new decision, add it to `memory.md`.
- **Verify against a real adapter.** Use `StaticAdapter` (deterministic fixture data
  that stands in for an ERP — it is test scaffolding in the demo, NOT mock data shown
  as truth in production) for local runs, and `UnidbAdapter` against the demo engine
  for the end-to-end pagination check.
- **Do not mark a task done on partial work, failing tests, or unhandled async
  states.** Keep it in progress and note the blocker.

### Commit messages
Imperative, scoped: `feat(canvas): free-form element move/resize`,
`fix(preview): inject @page from printSetup`. Reference the `progress.md` item.

### Branch/PR
Feature branches off the repo default. PRs describe *what changed and how it was
verified* (which adapter, which document, screenshots of light+dark, and — for any
pagination change — a multi-page PDF/preview screenshot showing the repeated header).

---

## 8. The verification that matters most (pagination)

Any change touching `detail`, `printSetup`, or preview MUST be verified with a
**multi-page** document:
1. Bind (via `UnidbAdapter` against the demo engine, or a `StaticAdapter` fixture) a
   document with **enough line items to overflow one page** (≥ ~40 rows).
2. Open Preview → browser Print preview (and, when the service is up, Export PDF).
3. Confirm, and paste evidence in the PR:
   - column header row **repeats** at the top of page 2+ (native `<thead>`),
   - no line row is **split** across a page boundary (`break-inside: avoid`),
   - `reportHeader` prints **once**, `totals` prints **once** after the last row,
   - toggling A4↔Letter / portrait↔landscape / margins changes page geometry.
If any fail, the change is not done.

---

## 9. What to do when blocked or ambiguous

- If `design.md` doesn't cover a case: choose the option most consistent with §0 and
  the existing patterns, implement it, and **record the decision in `memory.md`** so
  it becomes canon. Do not leave it implicit.
- If a requirement seems to require a forbidden dependency or a second renderer:
  stop and flag it — there is almost always a hand-rolled or `core`-side path.
- Never fabricate data to "make the screen look finished." An empty state is correct.

---

## 10. Interop with the backend (contract, not implementation)

The frontend depends only on: (a) the `DataSourceAdapter` interface and (b) the
render service HTTP contract `POST {renderServiceUrl}/render {template, entity, id}
→ application/pdf`. Both are owned in `@docsmith/core`/`@docsmith/adapters` and the
backend package. Do not reach around them. If the contract needs to change, change
the type in `core` first and update `memory.md`.

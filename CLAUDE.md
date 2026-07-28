# CLAUDE.md — DocSmith agent entrypoint

You are working in **DocSmith** — a standalone, ERP-agnostic, embeddable document &
report template designer. It ships as a single custom element `<doc-designer>` plus a JS
SDK, pulls all data through one `DataSourceAdapter`, renders live previews in the browser,
and produces archival PDFs via a headless-Chromium render service. It is **not** tied to
any one app, ERP, or engine — a host integrates it by implementing one small data adapter.

## Read the governance docs first — they are canon, not suggestions

The frontend package (`packages/designer/`) carries four documents. Read all four before
writing or changing frontend code, and treat them as the source of truth:

| File | What it governs |
|------|-----------------|
| [`packages/designer/design.md`](packages/designer/design.md) | Full design & interaction spec: screen regions, banded hybrid layout, the template JSON shape, pagination rules, component build order (§14), Definition of Done (§15). |
| [`packages/designer/claude.md`](packages/designer/claude.md) | Operating rules: fixed stack, **exhaustive** approved-dependency list, data/security rules, blocking a11y gates, workflow discipline, and the pagination verification (§8). |
| [`packages/designer/memory.md`](packages/designer/memory.md) | Locked decisions **D-001…D-015** and their rationale. Do not relitigate; if one looks wrong, stop and ask. |
| [`packages/designer/progress.md`](packages/designer/progress.md) | Living checklist + phase map. **Update it in the same change that lands work**, and keep the "Now / Next / Notes" block current. |

## Non-negotiable rules (summarised from `packages/designer/claude.md`)

1. **Engine-truthful UI.** NEVER invent, mock, hardcode, or synthesise data. Every value
   comes from the adapter or is derived from one. Use loading / empty / error states — never
   fake numbers, rows, fields, or sample SQL.
2. **Fixed stack.** Svelte 5 + Vite + TypeScript (strict), compiled to ONE custom element.
   **Zero** extra runtime dependencies beyond the approved list in `claude.md §3` — adding one
   requires the documented doc-update ritual.
3. **Single renderer.** Preview AND PDF both call `core.renderToHtml(template, data)` from
   `@docsmith/core`. Do not write a second renderer. Import shared types (`Template`,
   `FieldMeta`, `DataSourceAdapter`) from `@docsmith/core` — never redefine them.
4. **Templates are pure JSON**, storage-agnostic. Persist via `onSave`, else localStorage.
5. **Every async surface** needs loading + empty + error states. A11y is a blocking gate
   (keyboard, focus rings, SR labels, contrast, reduced-motion). Light + dark via `--dd-*`
   tokens only.
6. **Green before done:** `pnpm lint && pnpm typecheck && pnpm test` must pass.

## Current state & where to start

- **Backend is shipped and green:** `@docsmith/core` (renderer, types, schema, format),
  `@docsmith/adapters` (Static / Rest / Unidb), `@docsmith/sdk`, and
  `@docsmith/render-service`. 8/8 tests pass; `pnpm demo` renders the invoice fixture to a
  3-page PDF with a repeating header.
- **Frontend `packages/designer/` is docs-only so far** — no code yet. Start at **Phase 0
  (Scaffold)** in `progress.md`, then **Phase 1 (MVP shell)**. Build components in the order
  in `design.md §14`; meet the per-component Definition of Done in `design.md §15`.
- **Phase 1 is done only when the pagination gate passes** (`claude.md §8`): a ≥40-row
  document paginates with the header repeating on every page and no row split across a break.

## When blocked or a doc is ambiguous

Follow `claude.md §9`: **stop and ask** rather than guess or invent data. New decisions get
recorded in `memory.md` (the *why*); status changes go in `progress.md` (the *what*).

## Useful commands

```bash
pnpm install         # workspace install (pnpm@9)
pnpm demo            # build core+adapters, render the invoice fixture → examples/invoice-demo
pnpm -r test         # run all package tests
pnpm -r typecheck    # strict typecheck across the workspace
pnpm build           # build core → adapters → sdk → render-service
```

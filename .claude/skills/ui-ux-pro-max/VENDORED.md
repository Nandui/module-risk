# Vendored dependency

`ui-ux-pro-max` v2.11.0 — https://github.com/nextlevelbuilder/ui-ux-pro-max-skill

Copied from `.claude/skills/ui-ux-pro-max` at that repository. MIT; see
`LICENSE` alongside this file. Nothing here is ours — to update, re-copy that
directory rather than editing in place.

A searchable CSV database (styles, palettes, font pairings, UX guidelines,
chart types, per-stack rules) queried through `scripts/search.py`. Pure Python
3, no dependencies, no network, no hooks. Verified working in this repo.

## What was not installed

The upstream repository bundles six further skills under `.claude/skills`:
`banner-design`, `brand`, `design`, `design-system`, `slides` and
`ui-styling`. They are not part of ui-ux-pro-max and mostly address work this
project does not do — social-media banners, marketing brand voice, HTML
presentations. Copy any of them from the upstream repo if that changes.

## Relationship to the impeccable skill

Both are installed and both match "improve this UI", so they will compete for
triggering. They are not redundant, but they are not interchangeable either:

- **impeccable** owns this project's own system. It reads `PRODUCT.md` and
  `DESIGN.md`, runs a deterministic detector against them, and its commands
  (`audit`, `polish`, `critique`) act on this codebase. It is the one that
  knows a fourth grey was removed and why.
- **ui-ux-pro-max** owns general design reference. It knows nothing about this
  project; it answers "what do people do for X" from a database.

Use ui-ux-pro-max as a lookup when a decision needs prior art, and impeccable
when the question is about this product. Where the two disagree, `DESIGN.md`
and the original brief win — both are specific to a statutory safety record
read by an inspector, which no general database can account for.

# Vendored dependency

`interface-design` v2026.6.20.1332 — https://github.com/Dammyjay93/interface-design

Reached via https://www.skills.sh/dammyjay93/interface-design/interface-design,
which this environment's network policy blocks; the source repository is the
same content and is what was cloned. MIT; see `LICENSE` alongside this file.
Nothing here is ours — to update, re-copy from that repository.

One self-contained `SKILL.md`, two slash commands, and the repo's `reference/`
templates. No scripts, no dependencies, no hooks, no network.

## What was installed where

- `.claude/skills/interface-design/` — the skill
- `.claude/commands/design-review.md` — `/design-review`
- `.claude/commands/design-deslop.md` — `/design-deslop`
- `reference/` — system template and two worked examples. The skill does not
  link these; they are carried over because they are the only thing that shows
  the intended output shape.

`agents/openai.yaml` is upstream's definition for a different harness. Kept
for fidelity with upstream; it does nothing here.

## Three design skills now match the same requests

`impeccable`, `ui-ux-pro-max` and `interface-design` all trigger on "improve
this UI". They divide up like this:

- **impeccable** — owns *this* project's system. Reads `PRODUCT.md` and
  `DESIGN.md`, runs a deterministic detector against them, and its commands
  act on this codebase. The only one that knows the register's history.
- **interface-design** — opinionated craft process for product UI
  specifically: dashboards, admin panels, data interfaces. Explicitly not for
  marketing pages. Closest in scope to this product of the three, and the only
  one with a de-slop pass.
- **ui-ux-pro-max** — a reference database. Knows nothing about this project;
  answers "what do people generally do for X".

Where they disagree, `DESIGN.md` and the original brief win. Two known
conflicts already exist and are deliberate:

- The brief pins Geist. ui-ux-pro-max's database and impeccable's detector
  both flag Geist as over-used. The brief wins.
- impeccable's craft floor bans an eyebrow above a heading outright. `eyebrow`
  is a named type role here and is used that way on `/sign-in`. Unresolved,
  and recorded rather than silently settled.

Adding a third opinion does not resolve either. Treat all three as advisers,
not authorities.

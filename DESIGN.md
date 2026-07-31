---
name: Risk register
description: Health and safety risk assessments across a leisure centre group.
colors:
  ink: "oklch(0.235 0.008 75)"
  ink-soft: "oklch(0.44 0.008 75)"
  muted: "oklch(0.525 0.008 78)"
  surface: "oklch(0.98 0.0035 85)"
  surface-raised: "oklch(1 0 0)"
  surface-sunk: "oklch(0.955 0.005 85)"
  rule: "oklch(0.905 0.005 85)"
  rule-strong: "oklch(0.855 0.006 85)"
  accent: "oklch(0.505 0.15 277)"
  accent-ink: "oklch(0.44 0.14 277)"
  accent-solid: "oklch(0.52 0.16 277)"
  accent-wash: "oklch(0.955 0.022 277)"
  accent-line: "oklch(0.82 0.06 277)"
  risk-1: "oklch(0.8 0.07 157)"
  risk-1-ink: "oklch(0.47 0.085 157)"
  risk-1-wash: "oklch(0.955 0.026 157)"
  risk-2: "oklch(0.74 0.0875 125)"
  risk-2-ink: "oklch(0.455 0.098 125)"
  risk-2-wash: "oklch(0.95 0.032 125)"
  risk-3: "oklch(0.68 0.105 93)"
  risk-3-ink: "oklch(0.44 0.08 93)"
  risk-3-wash: "oklch(0.945 0.038 93)"
  risk-4: "oklch(0.62 0.1225 61)"
  risk-4-ink: "oklch(0.425 0.09 61)"
  risk-4-wash: "oklch(0.94 0.04 61)"
  risk-5: "oklch(0.56 0.14 29)"
  risk-5-ink: "oklch(0.41 0.15 29)"
  risk-5-wash: "oklch(0.935 0.034 29)"
typography:
  signage:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2.75rem"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.03em"
  figure:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2rem"
    fontWeight: 600
    lineHeight: 1.05
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.3125rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.018em"
  title-sm:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.012em"
  ui-lg:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.55
  ui:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.5
  ui-sm:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.35
  stencil-xs:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.625rem"
    fontWeight: 600
    lineHeight: 1
  data-xs:
    fontFamily: "Geist Mono, ui-monospace, SFMono-Regular, monospace"
    fontSize: "0.75rem"
    lineHeight: 1.2
    fontFeature: "tnum 1"
  eyebrow:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 500
    lineHeight: 1.1
    letterSpacing: "0"
rounded:
  tile: "0"
  sm: "0.25rem"
  md: "0.375rem"
  sheet: "0.5rem"
spacing:
  rule: "1px"
  rail: "13.75rem"
  measure: "68ch"
components:
  button-primary:
    backgroundColor: "{colors.accent-solid}"
    textColor: "{colors.surface-raised}"
    rounded: "{rounded.md}"
    padding: "0 0.625rem"
    height: "2rem"
    typography: "{typography.ui}"
  button-outline:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "0 0.625rem"
    height: "2rem"
  button-walk:
    backgroundColor: "{colors.accent-solid}"
    textColor: "{colors.surface-raised}"
    rounded: "{rounded.md}"
    padding: "0 1rem"
    height: "2.5rem"
    typography: "{typography.ui-lg}"
  input-md:
    backgroundColor: "{colors.surface-sunk}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "0 0.625rem"
    height: "2rem"
  input-lg:
    backgroundColor: "{colors.surface-sunk}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "0 0.75rem"
    height: "2.5rem"
    typography: "{typography.ui-lg}"
  chip-neutral:
    backgroundColor: "{colors.surface-sunk}"
    textColor: "{colors.ink-soft}"
    rounded: "{rounded.sm}"
    padding: "0.125rem 0.375rem"
    typography: "{typography.ui-sm}"
  tile-band-5:
    backgroundColor: "{colors.risk-5}"
    textColor: "{colors.surface-raised}"
    rounded: "{rounded.tile}"
    size: "1.5rem"
---

# Design System: Risk register

## Overview

**Creative North Star: "The Operating System for a Safety Team"**

Linear's density and quiet structure, Attio's record-centric layout, Vercel's
typographic precision — on warm neutrals rather than cold slate, because this
is a tool people sit in for a working day and cold grey turns clinical after
an hour.

It should read as software a professional keeps open, not as a product being
sold to them. That means restraint everywhere: hairlines instead of cards,
tone instead of shadow, one accent used sparingly, and a type scale where the
steps are small and the weight does the work. Nothing here glows, floats,
blurs or gradients. The interface recedes and the record is what you see.

The previous system was signage — expanded display type, poolside tile, a
capacity-notice register. It was distinctive and it is gone deliberately. What
survives is everything load-bearing: the risk ramp with its greyscale and ISO
7010 properties, the square matrix, and the rule that severity owns colour.

**Key Characteristics:**

- Warm neutral surfaces, hue ~80, in both themes; never blue-black
- Hairlines and tone carry structure — no cards, no shadows, no glass
- One family (Geist) at 13px base; hierarchy from weight and tone, not size
- Small radii: 4px chips, 6px controls, 8px panels, and 0 on risk tiles
- Two colour systems that never mix: indigo for interface, the ramp for
  severity
- Light and dark are the same system with the tokens swapped — no component
  in the app knows which is active

## Colors

A warm neutral field, one indigo accent, and a five-step severity ramp that is
data rather than decoration. Roughly 60/30/10: most of any screen is neutral
surface, and colour appears only where it carries meaning.

### Primary

- **Indigo** (`{colors.accent}`): links, focus rings, the active rail marker,
  selection. Bright in dark, deep in light — it has to hold 4.5:1 against
  whichever canvas is behind it.
- **Indigo Solid** (`{colors.accent-solid}`): the accent as a *surface* — the
  primary button fill, with white on it. Deliberately a separate token: a
  colour bright enough to read as a link on near-black is too bright to put
  white on, and one dark enough for white text disappears as a link. Two
  tokens, one job each, and this one does not move between themes.
- **Indigo Wash** (`{colors.accent-wash}`): selection background, the tint
  under an active filter.

### Secondary

The five-step severity ramp. It is a **scale**, not a palette, and each step
ships four tokens: the tile fill, the text colour for that fill, an ink
version for type on the canvas, and a wash for chip backgrounds.

- **Band 1 — Clear** (`{colors.risk-1}`): Very low, scores 1–4.
- **Band 2 — Watch** (`{colors.risk-2}`): Low, scores 5–9.
- **Band 3 — Act** (`{colors.risk-3}`): Moderate, scores 10–12. The escalation
  threshold: 10 and above requires a documented action.
- **Band 4 — Escalate** (`{colors.risk-4}`): High, scores 13–16.
- **Band 5 — Stop** (`{colors.risk-5}`): Very high, scores 17–25.

The fills are **identical in both themes**. They are a safety encoding, not
decoration, and re-tuning them per theme would break the printed key. Only the
band-as-text and chip-background tokens invert, because a colour legible on
paper is not legible on near-black.

### Neutral

- **Ink** (`{colors.ink}`): all primary text. Never pure black, never pure
  white.
- **Ink Soft** (`{colors.ink-soft}`): secondary text, field labels.
- **Muted** (`{colors.muted}`): every quiet role — supporting prose, column
  heads, placeholders, metadata. Tuned against the darkest surface it lands
  on: 5.38 raised / 5.07 canvas / 4.73 sunk. **The lightest text tone that
  exists**, with nothing below it.
- **Surface** (`{colors.surface}`): the canvas.
- **Surface Raised** (`{colors.surface-raised}`): panels, rows, overlays.
- **Surface Sunk** (`{colors.surface-sunk}`): inputs, pressed states, anything
  set *into* the page.
- **Rule** / **Rule Strong**: hairlines. `rule` divides; `rule-strong` bounds
  an interactive edge.

### Named Rules

**The Two Scales Rule.** Indigo and the risk ramp are separate systems and may
never be substituted for one another. Indigo never encodes severity; a risk
colour never marks a link, a button or a focus ring. The accent hue sits
outside the ramp's range so the two can never be confused.

**The Greyscale Rule.** The ramp descends in lightness while chroma ascends, so
it survives a monochrome printout: an inspector can tell a 20 from a 6 with no
colour at all. Any new ramp colour must hold that property, checked as a
greyscale render rather than by eye.

**The Never-Colour-Alone Rule.** Risk level is always carried by the numeral
and the band word as well as the fill. No state may be readable only by hue.

**The Signage Crossover Rule.** Text on a band fill is dark on bands 1–4 and
white on band 5 — the crossover ISO 7010 makes between a black-on-yellow
warning and a white-on-red prohibition. The crossover point is a contrast
measurement, not a preference, and the dark tone is its own token rather than
the text ink: when the ink lightened, band 4 lost its headroom.

**The Legible Floor Rule.** Every text tone clears 4.5:1 on every surface it
can land on, **in both themes**. If a design wants something quieter than
`muted`, the answer is less text, smaller text, or more space — never a
lighter grey. Linear's own tertiary tone measures about 3.2:1 on its canvas;
that is not available here, because WCAG 2.2 AA is a legal duty for this
operator.

## Typography

**One family: Geist** (with `ui-sans-serif`, `system-ui`), and **Geist Mono**
for anything that has to line up in a column.

**Character:** Geist is Vercel's own face and is drawn for interface density.
There is deliberately no third display voice — at 13px base a separate display
face fragments the page, and the hierarchy is carried by size, weight and tone
working together. The previous system's expanded display face is gone with the
signage world it belonged to.

### Hierarchy

A ~1.2 ratio from a 13px base. The steps are small on purpose; weight and tone
separate them further than size alone could.

- **Signage** (`{typography.signage}`): the single numeral a screen is about.
  One per view, only inside a band-coloured block.
- **Figure** (`{typography.figure}`): report headline numbers.
- **Title** (`{typography.title}`): page titles.
- **Title Small** (`{typography.title-sm}`): sheet and section headings.
- **UI Large** (`{typography.ui-lg}`): the site-walk form, read at arm's
  length on a tablet.
- **UI** (`{typography.ui}`): the default, 13px.
- **UI Small** (`{typography.ui-sm}`): dense rows, chips.
- **Stencil XS** (`{typography.stencil-xs}`): the numeral inside a small tile.
- **Data XS** (`{typography.data-xs}`): references, dates, coordinates —
  anything comparable down a column, with tabular figures forced globally.
- **Eyebrow** (`{typography.eyebrow}`): column heads, metadata terms, section
  labels. Small and quiet — **not** letterspaced small caps, which shout at
  this density.

### Named Rules

**The Tabular Rule.** Anything a reader might compare down a column is set in
the data role with `tnum` on. Misaligned figures in a safety record read as
carelessness.

**The Three Levers Rule.** Hierarchy is built from size, weight and tone
together, never size alone. At this density two steps of size are nearly
invisible; a weight change is not.

**The Measure Rule.** Document and report prose is capped at 68ch. The register
is exempt: a table is scanned in columns, not read in lines.

**The One Numeral Rule.** Exactly one figure per view may take the signage
step, and it must sit inside a band-coloured block.

## Layout

A fixed 220px navigation rail on the left from the `md` breakpoint up, on the
same surface as the canvas rather than a different colour — a different tone
would fragment the app into "sidebar world" and "content world". A hairline is
enough. Below `md` it collapses to a sticky bar.

Content fills the remainder with no outer max-width. The register is
full-bleed: horizontal room buys a column, and the columns are the product.

Detail opens as a **contextual side panel** over the register rather than as a
route change, so the row a manager was reading stays visible behind it. On
mobile the same panel enters from the bottom. Panels are the only overlay —
there are no modals for tasks needing neither interruption nor protected focus.

**Command-driven.** ⌘K is a first-class way to move, not a convenience: the
palette reaches every centre, assessment and screen. Navigation should be
possible without the mouse, and the rail is the fallback rather than the
primary route.

Density is set per job. The register runs 44px rows at the small interface
size with a sticky header. The authoring flow uses the large size with 40px
controls, because it is operated one-handed on a tablet during a site walk —
that size is not a visual choice and must not be traded away for balance.

Grids that read as a ruled board — the matrix — use a 1px gap in the rule
colour, so the hairline shows through as the line between cells rather than as
a border around them.

Inputs are forced to 16px below `md`, or iOS zooms the viewport and the
assessor loses their place mid-form.

## Elevation & Depth

**Flat. Structure comes from hairlines and tone, and nothing else.**

There is no shadow vocabulary, no card elevation scale, no glass, no blur as
decoration. Surfaces separate by a single tone step — `surface` for the
canvas, `surface-raised` for planes, `surface-sunk` for anything recessed —
and the steps are deliberately small enough that you feel them rather than see
them. Inputs take the *sunk* tone: an input receives content, so it should
read as set into the page, not floating on it.

This holds in dark, where it has to: shadows do not read on near-black, so a
system that leaned on them would lose all its structure on theme switch.

The one exception is the selected cell of the risk matrix, which rises on a
hard offset in the ink tone with an inset ring. It is physical rather than
atmospheric — a tile pushed proud of the board — and it is the only thing in
the system that lifts.

### Named Rules

**The One Lift Rule.** Exactly one element rises off the surface, and it is the
selected matrix cell. If something else seems to need elevation, it needs a
hairline or a tone step instead.

**The Squint Rule.** Blurred, the interface should still show what is above
what and where sections divide, with nothing jumping out. If a border is the
first thing you see, it is too strong.

## Shapes

Small radii throughout: 4px on chips and tiny controls, 6px on buttons, inputs
and rows, 8px on panels. A large radius on a dense control reads as a toy.

The risk system is **square** — 0 radius. Matrix cells and tile chips have no
rounding at all, and that squareness is the one visual signal separating "this
is data about danger" from "this is interface".

Borders are hairlines in the rule tone, 1px, and are never used for emphasis.

## Components

### Buttons

- **Shape:** 6px. Never pill, never square.
- **Sizes:** 28px compact, 32px default, 40px for the site-walk flow.
- **Primary:** indigo solid with a white label, for the one affirmative action
  on a screen.
- **Ink:** near-black with a light label. Reserved for terminal, irreversible
  actions — sign-off above all — because they should not look like an ordinary
  primary action.
- **Outline / Ghost / Link:** hairline-bounded, transparent, underlined. Outline
  is the default variant; most buttons here are not the main action.
- **Danger:** band-5 wash, ink and hairline, inverting to a solid band-5 fill
  on hover. The only place a risk colour appears on a control, permitted
  because the control's meaning *is* severity.
- **Press:** `scale(0.98)` on `:active`. Tactile confirmation, nothing more.
- No gradients, no drop shadows, no icon in every button.

### Chips

4px radius, tight padding, 24px minimum height. Neutral chips take the
recessed tone; risk chips take their band's wash with that band's ink. Filter
chips show selection as a wash and a hairline, never as a colour swap that
could be mistaken for a risk band.

### Cards / Containers

There are none. Content sits on planes bounded by hairlines and separated by
space. A card inside a card is always wrong, and a grid of same-size
icon-plus-heading-plus-text panels is not a layout this system has.

### Inputs / Fields

Recessed fill, hairline border, 6px radius, lifting to the raised tone on
focus. Two densities: 32px for the register's filter row, 40px for authoring.
Errors shift the border to band 5, set `aria-invalid` and wire the message with
`aria-describedby` — never a red sentence floating near a box. Every field has
a real `<label>`; placeholder-as-label does not exist here.

### Navigation

A 220px rail on the canvas tone with a hairline right edge, items at the small
interface size, quiet at rest. Active state is a 2px indigo bar inset at the
left edge plus a tone change — the only persistent use of the accent as a
marker.

### The Tile Matrix (signature)

The 5×5 likelihood × severity grid as a ruled board. Square cells, 1px
rule-coloured gaps, tabular numerals. Likelihood ascends upward, as on every
printed matrix an assessor has seen — inverting it to match screen coordinates
would be tidier and practically wrong.

You tap into a cell. There are no dropdowns for likelihood and severity: the
two-dropdown pattern hides the shape of the risk, and the shape is the point.
Unselected cells sit back so the field reads as one board rather than 25
competing swatches; the selected cell comes to full strength and takes the one
lift.

The whole grid is a single tab stop with roving focus — arrows walk it, Enter
and Space commit, Home and End jump to the corners — and every cell names its
likelihood, severity, score and band in words for a screen reader.

Its reduced form, the **tile chip**, carries the same square tile into the
register and the PDF: the score numeral in the band fill with the L×S
coordinate beside it in the data role. Two per row, initial and residual, so
scanning the column shows the step-down controls achieved without reading a
number.

## Do's and Don'ts

### Do:

- **Do** keep indigo and the risk ramp completely separate.
- **Do** carry risk level in the numeral and the band word as well as the fill.
- **Do** check any new ramp colour as a greyscale render before accepting it.
- **Do** verify contrast in **both** themes. A tone that passes on paper can
  fail on near-black, and the duty applies to both.
- **Do** set anything comparable down a column in the data role with tabular
  figures.
- **Do** keep the 40px control size in the authoring flow.
- **Do** keep the register full-bleed.
- **Do** treat the print stylesheet as product surface — and keep it light,
  whatever the screen theme is doing.

### Don't:

- **Don't** introduce a shadow, a glass effect or a gradient. Structure is
  hairlines and tone.
- **Don't** add a second element that lifts off the surface.
- **Don't** round the matrix cells or the tile chips.
- **Don't** reach for a card, and never nest one.
- **Don't** use a risk colour on a control, except the danger button.
- **Don't** replace the matrix with two dropdowns.
- **Don't** add a fourth grey below `muted`.
- **Don't** give the rail a different surface tone from the canvas.
- **Don't** give status its own colour system. Status is shape and weight.
- **Don't** add a KPI row or a grid of donuts to reports. One verdict, one
  comparison, one trend, one distribution.
- **Don't** print the same figure twice on one screen.
- **Don't** chart a number that has no shape. Three data points belong in a
  table.
- **Don't** animate on scroll, bounce, or stagger. Motion is a 110ms state
  change or a 180ms settle, and everything collapses under
  `prefers-reduced-motion`.

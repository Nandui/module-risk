---
name: Risk register
description: Health and safety risk assessments across a leisure centre group.
colors:
  ink: "oklch(0.196 0.017 208)"
  ink-soft: "oklch(0.4 0.014 208)"
  muted: "oklch(0.535 0.012 200)"
  faint: "oklch(0.68 0.01 200)"
  surface: "oklch(0.968 0.004 168)"
  surface-raised: "oklch(1 0 0)"
  surface-sunk: "oklch(0.945 0.005 180)"
  rule: "oklch(0.884 0.006 175)"
  rule-strong: "oklch(0.82 0.008 180)"
  accent: "oklch(0.512 0.083 201.5)"
  accent-ink: "oklch(0.43 0.07 201.5)"
  accent-wash: "oklch(0.938 0.021 197)"
  accent-line: "oklch(0.8 0.045 200)"
  risk-1: "oklch(0.8 0.07 157)"
  risk-1-ink: "oklch(0.47 0.085 157)"
  risk-1-wash: "oklch(0.945 0.028 157)"
  risk-2: "oklch(0.74 0.0875 125)"
  risk-2-ink: "oklch(0.455 0.098 125)"
  risk-2-wash: "oklch(0.94 0.034 125)"
  risk-3: "oklch(0.68 0.105 93)"
  risk-3-ink: "oklch(0.44 0.08 93)"
  risk-3-wash: "oklch(0.935 0.04 93)"
  risk-4: "oklch(0.62 0.1225 61)"
  risk-4-ink: "oklch(0.425 0.09 61)"
  risk-4-wash: "oklch(0.93 0.042 61)"
  risk-5: "oklch(0.56 0.14 29)"
  risk-5-ink: "oklch(0.41 0.15 29)"
  risk-5-wash: "oklch(0.925 0.036 29)"
typography:
  figure:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2.75rem"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.03em"
    fontVariation: "wdth 125"
  title:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.02em"
    fontVariation: "wdth 125"
  title-sm:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.015em"
    fontVariation: "wdth 125"
  ui-lg:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.55
  ui:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  ui-sm:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.35
  data-xs:
    fontFamily: "Geist Mono, ui-monospace, SFMono-Regular, monospace"
    fontSize: "0.75rem"
    lineHeight: 1.1
    fontFeature: "tnum 1"
  eyebrow:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.08em"
    fontVariation: "wdth 125"
rounded:
  tile: "0"
  focus: "2px"
  chip: "3px"
  md: "0.5rem"
  sheet: "0.75rem"
spacing:
  rule: "2px"
  rail: "15rem"
  measure: "68ch"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.surface-raised}"
    rounded: "{rounded.md}"
    padding: "0 0.875rem"
    height: "2.25rem"
    typography: "{typography.ui}"
  button-primary-hover:
    backgroundColor: "{colors.accent-ink}"
  button-ink:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.surface-raised}"
    rounded: "{rounded.md}"
    padding: "0 0.875rem"
    height: "2.25rem"
  button-outline:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "0 0.875rem"
    height: "2.25rem"
  button-walk:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.surface-raised}"
    rounded: "{rounded.md}"
    padding: "0 1.25rem"
    height: "3rem"
    typography: "{typography.ui-lg}"
  input-md:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "0 0.625rem"
    height: "2.25rem"
  input-lg:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "0 0.875rem"
    height: "3rem"
    typography: "{typography.ui-lg}"
  chip-neutral:
    backgroundColor: "{colors.surface-sunk}"
    textColor: "{colors.ink-soft}"
    rounded: "{rounded.chip}"
    padding: "0.125rem 0.375rem"
    typography: "{typography.ui-sm}"
  tile-band-5:
    backgroundColor: "{colors.risk-5}"
    textColor: "{colors.surface-raised}"
    rounded: "{rounded.tile}"
    size: "1.75rem"
---

# Design System: Risk register

## Overview

**Creative North Star: "The Duty Manager's Board"**

The board at reception in a leisure centre: capacity notices, plant readings,
chalked times, statutory signage, a ruled grid with numbers written into it.
Things that have to be read at a glance, in bad light, by someone walking
past who has thirty seconds. That is the register, the assessment document and
the exported PDF, and it is why this system is built out of ruled grids,
stencilled numerals and signage colour rather than out of cards and gradients.

A centre is a pool **and** a sports hall **and** studios **and** changing
rooms **and** plant rooms **and** soft play **and** outdoor pitches. No motif
here may belong to only one of them. The world is the building's shared
administrative language, not any single room's material.

The register is cool, institutional and unhurried. It is not clinical and it
is not friendly. Its confidence comes from precision — hairlines that land on
the pixel, numerals that align down a column, a colour ramp that survives a
fax machine — rather than from expression. Someone reading this a year later
is usually reading it because something went wrong.

**Key Characteristics:**

- Ruled grids and hairlines, never cards, and never a card inside a card
- Stencilled numerals in an expanded display face; the number is the object
- Two colour systems that never mix: wayfinding teal for interface, the risk
  ramp for severity
- Flat by default, with exactly one earned lift
- Density is per-job: the register is tight, the site-walk form is generous

## Colors

A cool institutional neutral field, one wayfinding accent, and a five-step
severity ramp that is treated as data rather than as decoration.

### Primary

- **Wayfinding Teal** (`{colors.accent}`): The interface's only accent. Links,
  primary actions, focus rings, the active rail indicator, selection
  highlight. Named for the blue-green of leisure-centre signage and floor
  markings — not for the pool. It never means severity.
- **Wayfinding Teal Deep** (`{colors.accent-ink}`): Hover and pressed states,
  and teal used as text on a light surface where the base tone is too light
  to hold 4.5:1.
- **Wayfinding Wash** (`{colors.accent-wash}`): Selection background,
  `::selection`, and the tint under an active filter.

### Secondary

The five-step severity ramp. It is a **scale**, not a palette, and each step
ships four tokens: the tile fill, the text colour for that fill, an ink
version for type on a light surface, and a wash for chip backgrounds.

- **Band 1 — Clear** (`{colors.risk-1}`): Very low, scores 1–4.
- **Band 2 — Watch** (`{colors.risk-2}`): Low, scores 5–9.
- **Band 3 — Act** (`{colors.risk-3}`): Moderate, scores 10–12. This is where
  the escalation threshold sits: 10 and above requires a documented action.
- **Band 4 — Escalate** (`{colors.risk-4}`): High, scores 13–16.
- **Band 5 — Stop** (`{colors.risk-5}`): Very high, scores 17–25.

### Neutral

- **Board Slate** (`{colors.ink}`): All primary text, the sign-in panel, and
  terminal actions such as sign-off. Never pure black.
- **Board Slate Soft** (`{colors.ink-soft}`): Secondary text, field labels.
- **Muted** (`{colors.muted}`): Supporting prose and column headers. Holds
  4.69:1 on the page surface — it is the lightest text tone permitted.
- **Faint** (`{colors.faint}`): Placeholders and disabled text only. Never
  used for content.
- **Painted Wall** (`{colors.surface}`): The page. A cool off-white, never
  pure white.
- **Card Stock** (`{colors.surface-raised}`): The only white in the system,
  and only ever as a plane — panels, the rail, sheets, table bodies.
- **Recess** (`{colors.surface-sunk}`): Pressed and hovered states, disabled
  fields, the tone that reads as set-into the surface.
- **Rule** (`{colors.rule}`) and **Rule Strong** (`{colors.rule-strong}`):
  Hairlines. `rule` divides content; `rule-strong` bounds an interactive
  edge such as an input or an outline button.

### Named Rules

**The Two Scales Rule.** Wayfinding teal and the risk ramp are separate
systems and may never be substituted for one another. Teal never encodes
severity; a risk colour never marks a link, a button or a focus ring. A screen
where the two are confusable is a defect, not a style choice.

**The Greyscale Rule.** The ramp descends in lightness by ~0.06 per step while
chroma ascends, so it survives a monochrome printout: an inspector can tell a
20 from a 6 with no colour at all. Any new colour added to the ramp must hold
that property, and must be checked as a greyscale render, not by eye.

**The Never-Colour-Alone Rule.** Risk level is always carried by the numeral
and the band word as well as the fill. No state in this product may be
readable only by hue.

**The Signage Crossover Rule.** Text on a band fill is dark on bands 1–4 and
white on band 5, at 4.98:1 — the same crossover ISO 7010 makes between a black
-on-yellow warning and a white-on-red prohibition. The crossover point is a
contrast measurement, not a preference.

## Typography

**Display Font:** Archivo, at width axis 125 (with `ui-sans-serif`,
`system-ui`)
**Body Font:** Geist (with `ui-sans-serif`, `system-ui`)
**Label/Mono Font:** Geist Mono (with `ui-monospace`, `SFMono-Regular`)

**Character:** The expanded width axis on Archivo is what gives the
institutional signage register — without it this is just a bold sans, and the
whole world collapses into generic SaaS. Geist carries interface text at small
sizes without personality getting in the way; Geist Mono carries anything that
has to line up in a column. Three roles, no overlap: display announces, sans
explains, mono measures.

### Hierarchy

- **Figure** (`{typography.figure}`): Report headline numbers and the sign-in
  wordmark. One per view at most.
- **Title** (`{typography.title}`): Page titles.
- **Title Small** (`{typography.title-sm}`): Sheet headings, section headings
  inside a document, empty-state headings.
- **UI Large** (`{typography.ui-lg}`): The authoring form. Deliberately a step
  up from the interface default because it is read at arm's length on a tablet
  while standing.
- **UI** (`{typography.ui}`): The interface default.
- **UI Small** (`{typography.ui-sm}`): Register rows, chips, field labels.
- **Data XS** (`{typography.data-xs}`): References, dates, coordinates, any
  figure in a column. Tabular figures are forced globally, not left to a
  utility class being remembered.
- **Eyebrow** (`{typography.eyebrow}`): Small-caps labels — `<dt>` terms in
  document metadata, matrix axis labels, section markers.

### Named Rules

**The Tabular Rule.** Anything a reader might compare down a column is set in
the data role with `tnum` on. A reference number or a date in the sans face is
a bug — the columns will not align, and misaligned figures in a safety record
read as carelessness.

**The Width Axis Rule.** The display face is only the display face at width
125. Shipping Archivo at its default width is a failure to use the type, not a
neutral fallback.

**The Measure Rule.** Document and report prose is capped at 68ch. The
register is exempt: a table is scanned in columns, not read in lines.

## Layout

A fixed 15rem navigation rail on the left from the `md` breakpoint up, holding
the centre switcher and main nav; below `md` it collapses to a sticky top bar.
Content fills the remainder with no outer max-width — the register is
deliberately full-bleed, because horizontal room is what buys another column,
and another column is the whole value of the register.

Detail opens as a right-side sheet over the register rather than as a route
change, so the row a manager was reading stays visible behind it. On mobile the
same sheet enters from the bottom and caps at 88vh. Sheets are the only
overlay; there are no modals for tasks that need neither interruption nor
protected focus.

Density is set per job, not globally. The register uses the small interface
size with tight row padding and a sticky header. The authoring flow uses the
large size throughout, with 3rem control heights, because it is operated
one-handed on a tablet during a site walk. The assessment document sits between
them and is constrained to the reading measure.

Grids that read as a ruled board — the matrix, the tile field on sign-in — use
a 2px gap in the rule colour with matching padding, so the rule shows through
as the lines between cells rather than as a border around them.

Inputs are forced to 16px below the `md` breakpoint. Anything smaller makes iOS
zoom the viewport, which on a site walk means the assessor loses their place
mid-form.

## Elevation & Depth

**Flat, with one earned lift.** Surfaces are separated by hairlines and by tone
— `surface` for the page, `surface-raised` for planes, `surface-sunk` for
recessed and pressed states. There is no ambient shadow vocabulary, no card
elevation scale, and no glass.

The single exception is the selected cell of the risk matrix, which rises 3px
on a hard, zero-blur offset shadow in the ink tone, with an inset ink ring. It
is physical rather than atmospheric — a tile pushed proud of the board, not a
floating card. It is the only place in the system where anything lifts, and
that rationing is what makes it read as "this is the one you chose" at arm's
length on a tablet.

The one other use of shadow is the sheet overlay, which is a flat ink scrim at
25% rather than a blur.

### Named Rules

**The One Lift Rule.** Exactly one element in this system rises off the
surface, and it is the selected matrix cell. A second one devalues the first.
If a new element seems to need elevation, it needs a hairline or a tone step
instead.

## Shapes

Two form languages, deliberately in tension.

The interface is softly rounded at 0.5rem — buttons, inputs, panels, rail
items — with sheets slightly softer at 0.75rem. This is the administrative
layer, and it is unremarkable on purpose.

The risk system is **square**. Matrix cells, tile chips and the sign-in tile
field have no radius at all. The squareness is what makes them read as tile,
signage and board rather than as badges, and it is the one visual signal that
separates "this is data about danger" from "this is interface". Chips that
carry anything other than risk take a 3px radius — nearly square, but not
quite, so the two are distinguishable at a glance.

The focus ring carries its own 2px radius, tighter than anything it surrounds.
It is deliberately not the interface radius: the ring should read as drawn
around an element rather than as part of it, and it has to sit correctly around
square tiles and rounded buttons alike.

Borders are hairlines in the rule tone, on every side, at 1px. The system does
not use borders for emphasis.

## Components

### Buttons

- **Shape:** Softly rounded (0.5rem). Never pill, never square.
- **Primary:** Wayfinding teal with white label, for the main affirmative
  action on a screen.
- **Ink:** Board slate with a light label. Reserved for terminal, irreversible
  actions — sign-off above all — because they are heavier than an ordinary
  primary action and should not look like one.
- **Outline / Ghost / Link:** Hairline-bounded, transparent, and underlined
  respectively. Outline is the default variant; most buttons in this product
  are not the main action.
- **Danger:** Band-5 wash with band-5 ink and a band-5 hairline, inverting to
  a solid band-5 fill on hover. The only place a risk colour appears on a
  control, and it is permitted because the control's meaning *is* severity.
- **Sizes:** Three heights — 2rem compact, 2.25rem default, and 3rem for the
  site-walk flow. The large size exists for one-handed tablet use and must not
  be traded away for visual balance.
- **Hover / Focus:** Background shifts over 120ms. Focus is the global ring:
  a 2px teal outline at 2px offset, on every interactive element without
  exception.
- No gradients, no drop shadows, and no icon in every button. A button is a
  rectangle with a label that says what happens.

### Chips

- **Style:** 3px radius, tight padding, small interface size. Neutral chips
  take the recessed tone; risk chips take their band's wash with that band's
  ink.
- **State:** Filter chips in the register show selection as a wash and a
  hairline, never as a colour swap that could be mistaken for a risk band.

### Cards / Containers

There are no cards. Content sits on planes in the raised tone, bounded by
hairlines and separated by space. A card inside a card is always wrong, and a
grid of same-size icon-plus-heading-plus-text panels is not a layout this
system has.

### Inputs / Fields

- **Style:** Raised-tone fill, `rule-strong` hairline, 0.5rem radius. Two
  densities: 2.25rem for the register's filter row, 3rem for authoring.
- **Focus:** Border shifts to teal and the global focus ring appears.
- **Error:** Border shifts to band 5, `aria-invalid` is set, and the message
  is wired with `aria-describedby` — never a red sentence floating near a box.
- Every field has a real `<label>`. Placeholder-as-label does not exist here.

### Navigation

- **Style:** A 15rem rail on the raised tone with a hairline right edge.
  Items are interface-small, rounded, and quiet at rest.
- **Active:** A 2px teal bar inset at the left edge of the item, plus a tone
  change. The bar is the only persistent use of the accent as a marker.
- **Mobile:** The rail collapses into a sticky top bar with the same items
  behind a trigger.

### Register Rows

- **Status is shape and weight, never colour.** Risk owns colour, so status
  earns its distinction another way: draft is rule-outlined, signed off is a
  filled ink chip. A row of coloured status pills would put a second colour
  system next to the risk ramp and make both unreadable.
- **Overdue** is marked with a left edge-rule and a day count in the data role.
  Visually distinct, not alarming, and it survives greyscale.
- Rows are the small interface size with tight padding and a sticky header.
  The table scrolls horizontally rather than dropping columns.

### Charts

Hairline-ruled, no gridline fill, no legend where a direct label will do.
Reports carry three figures, one comparison table and one trend line — not a
KPI row and a grid of donuts. Every chart has a print variant, because the
figure an inspector sees is the printed one.

### The Tile Matrix (signature)

The 5×5 likelihood × severity grid, rendered as a ruled board. Square cells,
2px rule-coloured gaps, stencilled numerals in the display face at width 125.
Likelihood ascends upward, as on every printed matrix an assessor has ever
seen — inverting it to match screen coordinates would be technically tidier and
practically wrong.

You tap into a cell. There are no dropdowns for likelihood and severity, ever:
the two-dropdown pattern hides the shape of the risk, and the shape is the
point. Unselected cells sit at 70% opacity so the field reads as one board
rather than 25 competing swatches; the selected cell comes to full strength and
takes the one earned lift.

The whole grid is a single tab stop with roving focus. Arrow keys walk it,
Enter and Space commit, Home and End jump to the corners. Every cell names its
likelihood, severity, score and band in words for a screen reader.

Its reduced form, the **tile chip**, carries the same square tile into the
register and the PDF: the score numeral in the band fill, with the L×S
coordinate beside it in the data role. Two per row — initial and residual — so
scanning down the column shows the step-down that controls achieved, without
reading a number.

## Do's and Don'ts

### Do:

- **Do** keep wayfinding teal and the risk ramp completely separate. If a
  screen makes them confusable, that is a defect.
- **Do** carry risk level in the numeral and the band word as well as the
  fill, every time.
- **Do** check any new ramp colour as a greyscale render before accepting it.
- **Do** set anything comparable down a column in the data role with tabular
  figures.
- **Do** use the 3rem control size throughout the authoring flow. It exists for
  one-handed tablet use on a site walk.
- **Do** keep the register full-bleed. Horizontal room buys a column, and the
  columns are the product.
- **Do** treat the print stylesheet as product surface. The PDF is what an
  inspector reads, and it is rendered from this CSS by headless Chromium.
- **Do** ship the display face at width axis 125.

### Don't:

- **Don't** add a second element that lifts off the surface. One is the whole
  budget, and it belongs to the selected matrix cell.
- **Don't** round the matrix cells or the tile chips. The squareness is what
  separates danger data from interface.
- **Don't** reach for a card, and never nest one.
- **Don't** use a risk colour on a control, except the danger button, whose
  meaning genuinely is severity.
- **Don't** replace the matrix with two dropdowns, however much simpler the
  form would be.
- **Don't** let `faint` carry content. It is for placeholders and disabled
  text only.
- **Don't** ship the display face at its default width.
- **Don't** introduce a motif that belongs to only one room of the building.
  A centre is a pool and a hall and studios and changing rooms and plant rooms
  and soft play and outdoor pitches.
- **Don't** animate on scroll, bounce, or stagger. Motion is a 120ms state
  change or a 240ms settle, and everything collapses under
  `prefers-reduced-motion`.
- **Don't** give status its own colour system. Status is shape and weight;
  colour belongs to risk.
- **Don't** add a KPI row or a grid of donuts to reports. Three figures, one
  comparison table, one trend line.
- **Don't** route to a full page for assessment detail. It opens as a
  deep-linkable right sheet so the manager never loses their place in the
  register.

# Design plan

Written before building, as the brief requires. Each section states the decision,
which of the three jobs it serves, and — where the first instinct was the generic
admin-dashboard answer — what was changed and why.

---

## 1. Palette

Locked tokens from the brief, expressed in OKLCH so the neutrals stay on one cool
hue and the risk ramp is perceptually even.

| Token | Value | Note |
| --- | --- | --- |
| `--ink` | `oklch(0.196 0.017 208)` | ≈ `#0B1417`, water at depth |
| `--surface` | `oklch(0.968 0.004 168)` | ≈ `#F4F6F5`, tile grout |
| `--surface-raised` | `oklch(1 0 0)` | the only pure white, and only as a raised plane |
| `--rule` | `oklch(0.884 0.006 175)` | ≈ `#D5DCDB` hairlines |
| `--accent` | `oklch(0.512 0.083 201.5)` | ≈ `#0E7C86` chlorine teal |
| `--accent-wash` | `oklch(0.938 0.021 197)` | ≈ `#DCEDEF` |

Text never uses pure `#000`; the page never uses pure `#FFF`. `--surface-raised`
is white but is a *plane above* the page, not the page.

### The risk ramp — changed from the brief's literal hexes

The brief gives five hexes and then says two things about them: define them in
OKLCH so the steps are perceptually even, and make sure an inspector reading a
greyscale printout can still tell a 20 from a 6.

Converting the brief's hexes shows those two goals are in conflict:

```
#3F7D5A  L 0.538   #8A9A3C  L 0.654   #D19A2E  L 0.721
#C4682B  L 0.614   #A8342A  L 0.496
```

Lightness climbs to band 3 then falls back, so band 1 (green, L 0.538) and band 5
(red, L 0.496) are **within 0.04 L of each other**. Printed greyscale, a 6 and a
20 come out the same tone. The ramp fails the brief's own accessibility test.

**Changed:** kept the brief's hue journey (green → olive → ochre → orange → red)
and its muted, earthy chroma, but made lightness *monotonically descending* in
even 0.06 steps, with chroma monotonically ascending. Greyscale now reads as a
clean five-step ramp light → dark, and increasing density carries escalating
urgency — quiet risks recede, dangerous ones sit heavy on the page.

```
--risk-1  oklch(0.800 0.0700 157)   --risk-2  oklch(0.740 0.0875 125)
--risk-3  oklch(0.680 0.1050  93)   --risk-4  oklch(0.620 0.1225  61)
--risk-5  oklch(0.560 0.1400  29)
```

Every band ships four tokens: `--risk-N` (tile fill), `--risk-N-on` (the text
colour *for* that fill), `--risk-N-ink` (band colour as text on a light surface),
`--risk-N-wash` (chip background). All checked for sRGB gamut and WCAG AA.

`--risk-N-on` exists because contrast crosses over at band 5: bands 1–4 take ink
numerals (4.83:1 at the worst), band 5 takes white (4.98:1). That crossover is
not a compromise — it is exactly what ISO 7010 does, black on yellow warning,
white on red prohibition. Encoding it as a token means no one can pair it wrong.

Risk colour is never the brand colour, and brand teal never appears inside the
matrix. **Risk level is never colour alone** — every tile, chip and badge carries
the numeral or the band label, enforced by the component API rather than by
convention.

## 2. Type scale

Three roles, as locked.

- **Display** — Archivo, `wdth` 125 (Expanded), weight 700, tracking `-0.02em`,
  uppercase for eyebrows and section labels. Page titles, matrix numerals, key
  report figures. Used with restraint.
- **Body/UI** — Geist Sans. Not Inter.
- **Data** — Geist Mono, `font-variant-numeric: tabular-nums` set once on the
  `--font-data` role so every reference, date and score column aligns by default
  rather than by remembering a utility class.

Explicit scale, no intermediate sizes:

| Step | Size / line-height | Role |
| --- | --- | --- |
| `eyebrow` | 0.6875rem / 1 · 0.08em tracking · caps | display |
| `data-xs` | 0.75rem / 1.1 | mono |
| `ui-sm` | 0.8125rem / 1.35 | body — register rows, chips |
| `ui` | 0.875rem / 1.5 | body — default |
| `ui-lg` | 1rem / 1.55 | body — authoring inputs |
| `title-sm` | 1.125rem / 1.2 | display — sheet headers |
| `title` | 1.5rem / 1.15 | display — page titles |
| `figure` | 2.75rem / 1 | display — report figures, matrix score |

Register uses `ui-sm`; the authoring form uses `ui-lg`. That single split is what
makes one product feel right in both modes.

## 3. Layout concept

Persistent left rail — centre switcher at the very top, then nav. Never collapses
to a hamburger above 375px; below `md` it becomes a bottom-anchored bar because an
assessor walking a plant room holds a tablet one-handed (**Create**).

- **Registers go full-bleed.** No max-width, no card wrapper. Density is the point
  (**Check**).
- **Documents get a constrained measure** — 68ch for assessment detail and report
  prose (**Report**).
- **Detail opens as a right-side sheet over the register**, deep-linkable via
  `?a=<id>`, so a manager keeps their scroll position and their place in the list.
  Not a full page, not a centred modal.

Nothing sits in a drop-shadowed card. Planes separate by hairline rule and a 1-step
lightness change, the way grout separates tile.

## 4. Signature element — the tile matrix

A 5×5 likelihood × severity grid built as poolside tile: **square corners, 2px
grout gaps** in `--rule`, stencilled numerals in Archivo Expanded 700. Square
against an interface that is otherwise softly rounded (`--radius: 0.5rem`), so it
reads as a deliberate object rather than a chart.

You **tap into a cell**. There are no dropdowns. The selected cell raises on the
z-axis — a real transform, not a glow — and its numeral steps up a size. Full
keyboard operation: arrow keys walk the grid, Enter/Space commits, the grid is one
tab stop with `role="grid"` and per-cell `aria-label` naming likelihood, severity,
score and band in words.

Carried through as `<TileChip>`: a small square at the row's matrix position
showing the score numeral, with the L×S coordinate in mono beside it. Two per
register row (initial and residual). Scanning the register down the two chip
columns reveals the pattern of risk across a centre, and the initial → residual
step-down is visible without reading a number.

Everything around the matrix stays quiet — this is the one thing people remember.

## 5. What was revised away from the generic answer

The first instinct on four of these was the default admin-dashboard move. Each was
replaced:

1. **Risk ramp** — a straight RGB green→red ramp, which goes muddy mid-scale and
   collapses in greyscale. Replaced with the monotone-L OKLCH ramp above.
2. **Register status column** — coloured status pills for everything, the usual
   rainbow. Replaced with: risk owns colour, status owns *shape and weight*
   (rule-outlined for draft, filled ink for signed off). Overdue is marked with a
   left edge-rule and a mono day count — visually distinct, not alarming, and it
   survives greyscale.
3. **Reports** — a KPI row plus a grid of donuts. Replaced with the brief's three
   figures only, one comparison table, one trend line. Charts are hairline-ruled
   with no gridline fill, no legend where a direct label will do.
4. **Detail navigation** — a full page route per assessment. Replaced with the
   deep-linkable right sheet, so **Check** never loses its place.

## 6. Data model notes

The brief's schema is followed as given. Two additions, both carried over from the
content in the existing Centrely `riskly` module because they are already
controlled vocabularies and they make cross-centre reporting sharper:

- `finding.persons_at_risk` — a `text[]` constrained to
  `Staff | Customers | Children | Contractors | Visitors`.
- `hazard.category` — `Physical | Chemical | Biological | Ergonomic |
  Psychosocial | Environmental`, and the same on `control_measure`.

**Banding.** The brief specifies five bands over the 1–25 score; the source module
used four. Mapped as `1–4 · 5–9 · 10–12 · 13–16 · 17–25`, which puts 8/7/4/3/3 of
the 25 matrix cells in each band — fewer cells as severity climbs, the right shape
for safety. The printed key states those thresholds rather than the scores that
happen to occur (only products of two 1–5 ratings are reachable, so no finding is
ever 13, 14 or 19), because the key has to survive an inspector checking the
arithmetic. The source module's escalation threshold is preserved exactly: "needs
action" still begins at score 10, now band 3 rather than band "High".

Both the banding and the initial → residual arithmetic are covered by
`scripts/verify-risk.ts`, which is what caught `bandMeta` guessing whether its
argument was a score or a band and reporting every residual of 5 as "Very high".

**Append-only.** Signed-off assessments never mutate. A correction writes a new
`revision` row holding a full `jsonb` snapshot, and the trigger that blocks
updates to signed rows lives in the database, not in application code — so the
audit trail holds even against a direct SQL write.

## 7. Persistence — changed after the first build

The brief locked Supabase. It was built that way first, then moved to plain
Postgres at the client's request: Neon or Vercel Postgres with Prisma, Auth.js
v5 and Vercel Blob, matching the `centrely` suite so a developer can move
between the two apps.

What that costs and what it buys:

- **Supabase Auth → Auth.js v5** (credentials + JWT sessions). The password hash
  lives on `profile`, and the app role has *no* `SELECT` privilege on that
  column — sign-in reads it through a `SECURITY DEFINER` function instead.
- **Supabase Storage → Vercel Blob.** The browser uploads straight to Blob with
  a short-lived token issued by `/api/blob/upload`, which checks the caller may
  write to the centre named in the object path.
- **RLS survived the move, and is now actually testable.** Supabase's
  `auth.uid()` is replaced by a transaction-local session variable set by
  `withUser()`. Because identity is a `set_config` call rather than a signed
  JWT, the verification harness can be any role it likes — so RLS behaviour is
  now covered by 13 assertions that were impossible to write before.

The app connects as a least-privilege `module_risk_app` role, never as the
owner: RLS does not apply to a table's owner, so running the app on the
migration connection would silently disable every policy. `src/lib/db.ts`
refuses to start in production on the owner connection for exactly that
reason.

That role's credentials are derived rather than configured — an HMAC keyed on
the owner password, which is already present wherever this app runs. The
reasoning is a design decision, not a convenience: the second connection
string had exactly one failure mode, pointing it at the owner, and that
failure produces a working application that enforces nothing. A configuration
option whose only wrong setting is invisible should not be a configuration
option. `AUTH_SECRET` stays explicit, because it signs session cookies and a
leaked database credential should not also forge sessions.

# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Three roles, one organisation, several centres. Each does a different job and
needs a different density.

- **Assessor** (duty manager). Completes an assessment while walking a site —
  poolside, plant room, soft play, outdoor pitches. On a tablet or phone, often
  one-handed, sometimes in wet or bright conditions, standing up. Optimise for
  speed of entry and low error rate.
- **Centre manager.** Scans the register for what is overdue, what is high
  risk, and what is unresolved. At a desk. Optimise for information density and
  scanning.
- **Group H&S lead.** Compares centres and produces evidence for insurers and
  inspectors. Owns the controlled vocabulary and approves additions to it.
  Optimise for defensibility and export quality.

## Product Purpose

Replaces a paper and spreadsheet risk-assessment process across a leisure
centre group. Success is that an assessment written on a wet poolside is
defensible in front of an inspector a year later, and that the group can
compare risk across centres — which a folder of spreadsheets cannot do.

The PDF is the deliverable. Everything upstream exists to make it truthful.

## Positioning

Two mechanisms a neighbouring product could not truthfully copy without making
the same commitments:

- **Controlled vocabulary, enforced.** Hazards and control measures come from
  libraries, not free text. Adding to the library is deliberately effortful and
  flags the entry for H&S lead review. Prose cannot be compared across centres,
  and cross-centre comparison is the entire value of this product to a group.
- **Append-only after sign-off, enforced by the database.** A correction writes
  a new revision holding a full snapshot; it never mutates the signed record.
  The rule is a trigger, not application code, so the audit trail holds against
  a direct SQL write. Row level security is likewise real: the app connects as
  a least-privilege role for which policies actually apply.

Both are the difference between a record and a record that survives being
questioned.

## Operating Context

- **Jurisdiction: Ireland.** The governing instrument is the Safety, Health and
  Welfare at Work Act 2005, enforced by the Health and Safety Authority (HSA).
  Section 19 requires the employer to identify hazards, assess risks, and hold a
  written assessment. Section 20 requires a **Safety Statement**, which must
  set out the hazards, the risks, the protective and preventive measures, the
  resources, and **the names of the people responsible for safety duties**.
- **The Safety Statement is the governing document; risk assessments sit inside
  it.** The application currently models the assessments only. See open
  decisions below — this is a known gap, not a settled scope.
- Assessments must be reviewed when circumstances change, not merely on a timer.
  The app's `review_due_at` is a floor, not the whole obligation.
- Single organisation, multiple centres. `centre` is a first-class dimension on
  every record that belongs to one. There is no `org` column and no
  multi-tenancy to add later.
- Connectivity is assumed. No offline support, no sync engine, no outbox.

## Capabilities and Constraints

Confirmed and built:

- Risk score is likelihood (1–5) × severity (1–5), 1 to 25, banded into five
  levels at 1–4 / 5–9 / 10–12 / 13–16 / 17–25. A residual of 10 or above
  requires a documented action with an owner and a due date. Both the initial
  and the residual score are stored — the delta is the most persuasive number in
  any report and cannot be recomputed from the controls.
- Controls may only reduce risk. A residual above its initial score is rejected
  by a check constraint, and by the Zod schema first so the assessor gets a
  sentence rather than a constraint violation.
- Content carried from the `riskly` module of the Centrely suite, written
  against a real operation: 59 hazards, 105 control measures, 11 templates.
- Two further controlled vocabularies, also carried from that module because
  they sharpen cross-centre reporting: `finding.persons_at_risk`
  (Staff | Customers | Children | Contractors | Visitors) and a category on
  both `hazard` and `control_measure` (Physical | Chemical | Biological |
  Ergonomic | Psychosocial | Environmental).
- The printed band key states the band **thresholds**, not the scores that
  happen to occur. Only products of two 1–5 ratings are reachable, so no
  finding is ever 13, 14 or 19 — but the key has to survive an inspector
  checking the arithmetic.
- Photo evidence, server-rendered PDF, per-centre and cross-centre reporting.

Open decisions — record, do not invent:

- **The Safety Statement is not modelled.** Section 20's required contents —
  named persons responsible for safety duties, resources, the statement
  document itself — have no home in the current data model. Whether this app
  owns the Safety Statement or feeds one held elsewhere is undecided.
- **Named responsible persons at centre level** do not exist as a concept.
  `action.owner_id` names who fixes one thing; that is not the same as the
  statutory named duty-holder.
- Whether assessments must carry an explicit "who might be harmed" field
  distinct from the existing `persons_at_risk` array, in HSA's terms.
- Retention: how long a signed assessment and its revisions must be kept.

## Brand Commitments

- Name in the interface: **Risk register**. Repository: `module-risk`.
- Lineage: the domain content comes from the `riskly` module of the Centrely
  suite. This ships as its own application on the same stack, so a developer
  moves between the two without relearning anything. It is not a module inside
  Centrely's runtime.
- Typography pinned by the original brief: **Archivo Expanded** for display,
  **Geist Sans** for interface, **Geist Mono** for data. A saturated-pattern
  warning against Geist does not override this; the brief wins.
- Voice: plain, specific, unhedged. Error messages say what happened and what to
  do — "This assessment is signed off, so it can no longer be edited. Create a
  revision to record a correction." No exclamation marks, no apology, no
  cheerfulness at someone doing a safety job.

## Evidence on Hand

- The original build brief:
  `/root/.claude/uploads/…/df9e44b6-riskassessmentappbrief.md` (outside the
  repo; not durable).
- `DESIGN.md` and `.impeccable/design.json` — the visual system: tokens,
  type roles, layout, the signature matrix, and the named rules that govern
  them. Supersedes the earlier `docs/design-plan.md`.
- Seeded sample data: 3 invented centres, 9 assessments, 58 findings, 12
  actions. **Synthetic.** Not a real operator's data and must never be
  presented as one.

Absences future work must not fill by invention:

- No real customer, no testimonials, no case study, no usage numbers.
- No logo or brand assets have been supplied.
- The real operator's centres, staff names, incident history and existing
  Safety Statement are all unseen.
- Nobody has confirmed the hazard and control libraries against this operator's
  actual sites.

## Product Principles

1. **The record must survive being questioned.** Where a guarantee matters, the
   database enforces it, not the application. A rule that lives only in a form
   handler is a rule that a direct write breaks.
2. **Comparability outranks expressiveness.** Every place free text would be
   easier for one assessor, it destroys the group-level view. Controlled
   vocabulary wins, and "add new" stays deliberately effortful.
3. **Density is per-job, not global.** The register is a serious table; the
   authoring flow is one hazard at a time with large targets. The same
   information design serving both is a failure of both.
4. **Never invent safety facts.** No sample content, placeholder hazard or
   plausible-sounding control may reach a real assessment. An unmapped hazard
   throws rather than guessing.
5. **The PDF is the product's face to an inspector.** Export quality is a
   feature, not a formatting afterthought.

## Accessibility & Inclusion

**WCAG 2.2 AA is a legal duty here**, confirmed: a public-sector operator. In
Ireland the mechanism is the EU Web Accessibility Directive as transposed by
S.I. No. 358/2020, which requires conformance with EN 301 549 — future work
should confirm the exact conformance level and the accessibility-statement
obligation with the operator's own legal advice rather than treating this line
as settled.

What that means for design decisions here:

- 2.2 adds criteria this interface touches directly: **Target Size (Minimum)
  24×24 CSS px** — the risk matrix is a 25-cell grid of tap targets and is the
  first thing to check; **Focus Not Obscured**; **Dragging Movements**;
  **Consistent Help**; **Redundant Entry**; **Accessible Authentication**.
- The band ramp must stay legible in greyscale and to a dichromat: banding is
  carried by number and label as well as colour, never by hue alone.
- Usage conditions are part of accessibility here — bright poolside light,
  wet hands, one-handed operation on a tablet.

**Not yet done:** no formal WCAG 2.2 AA conformance pass has been run. A
deterministic detector pass over the sign-in and preview screens found no
contrast failures, but that is not a conformance audit and must not be
described as one.

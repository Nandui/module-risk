import { PrismaClient, type Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import {
  ASSESSMENTS,
  CENTRES,
  CONTROLS,
  HAZARDS,
  HAZARD_CONTROLS,
  TEMPLATES,
  actionFor,
  ratingsFor,
} from "./seed-content";

/**
 * Seed. Runs as the owner role (DATABASE_URL), which bypasses RLS — the app
 * role could not create the first profile, and there would be nobody to be.
 *
 * Idempotent: upserts the libraries so it can be re-run after adding content,
 * and skips the sample assessments if any already exist.
 *
 *   npm run db:seed
 */

const db = new PrismaClient();

const DEMO_PASSWORD = process.env.SEED_PASSWORD ?? "risk-demo-1234";

// Real-looking names: the rail, the register's assessor column and the
// Actions screen's owner grouping all read as uuid soup otherwise.
const DEMO_PEOPLE = [
  { email: "lead@example.com", fullName: "Fernando Serina", role: "hs_lead" },
  { email: "manager@example.com", fullName: "Marcus Yeo", role: "manager" },
  { email: "assessor@example.com", fullName: "Aoife Brennan", role: "assessor" },
  { email: "elaine@example.com", fullName: "Elaine Foster", role: "assessor" },
  { email: "james@example.com", fullName: "James Okafor", role: "assessor" },
  { email: "priya@example.com", fullName: "Priya Raman", role: "manager" },
] as const;

function monthsAgo(months: number): Date {
  return new Date(Date.now() - months * 30.44 * 86_400_000);
}

function addMonths(from: Date, months: number): Date {
  const d = new Date(from);
  d.setMonth(d.getMonth() + months);
  return d;
}

async function main() {
  // ---- people -----------------------------------------------------
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  const people = new Map<string, string>();
  for (const person of DEMO_PEOPLE) {
    const row = await db.profile.upsert({
      where: { email: person.email },
      update: { fullName: person.fullName, role: person.role },
      create: { ...person, passwordHash },
      select: { id: true },
    });
    people.set(person.email, row.id);
  }
  const leadId = people.get("lead@example.com")!;
  const managerId = people.get("manager@example.com")!;
  // Assessments are spread across assessors so the register's assessor column
  // and the Actions screen's owner grouping have something to show.
  const assessorIds = [
    people.get("assessor@example.com")!,
    people.get("elaine@example.com")!,
    people.get("james@example.com")!,
  ];

  // ---- centres ----------------------------------------------------
  const centres = new Map<string, string>();
  for (const centre of CENTRES) {
    const row = await db.centre.upsert({
      where: { code: centre.code },
      update: { name: centre.name, address: centre.address },
      create: centre,
      select: { id: true },
    });
    centres.set(centre.code, row.id);
  }

  // Everyone works across every centre in the demo data.
  for (const centreId of centres.values()) {
    for (const profileId of people.values()) {
      await db.centreMember.upsert({
        where: { centreId_profileId: { centreId, profileId } },
        update: {},
        create: { centreId, profileId },
      });
    }
  }

  // ---- libraries --------------------------------------------------
  const hazardIdByLabel = new Map<string, string>();
  for (const hazard of HAZARDS) {
    const row = await db.hazard.upsert({
      where: { label_category: { label: hazard.label, category: hazard.category } },
      update: { guidance: hazard.guidance },
      create: { ...hazard, createdById: leadId },
      select: { id: true },
    });
    hazardIdByLabel.set(hazard.label, row.id);
  }

  const controlIdByLabel = new Map<string, string>();
  for (const control of CONTROLS) {
    const row = await db.controlMeasure.upsert({
      where: { label: control.label },
      update: { category: control.category },
      create: { ...control, createdById: leadId },
      select: { id: true },
    });
    controlIdByLabel.set(control.label, row.id);
  }

  for (const template of TEMPLATES) {
    const ids = template.hazards
      .map((label) => hazardIdByLabel.get(label))
      .filter((id): id is string => Boolean(id));
    if (ids.length !== template.hazards.length) {
      throw new Error(
        `Template "${template.name}" references a hazard that is not in the library.`,
      );
    }
    await db.template.upsert({
      where: { name: template.name },
      update: { category: template.category, hazardIds: ids },
      create: { name: template.name, category: template.category, hazardIds: ids },
    });
  }

  // ---- sample assessments -----------------------------------------
  if ((await db.assessment.count()) > 0) {
    console.log("Assessments already present — skipping sample documents.");
    await report();
    return;
  }

  for (const [index, spec] of ASSESSMENTS.entries()) {
    const centreId = centres.get(spec.centreCode)!;
    const template = TEMPLATES.find((t) => t.name === spec.template)!;
    const created = monthsAgo(spec.monthsAgo + 0.1);

    // Always created as a draft. Findings cannot be attached to a signed-off
    // assessment — the append-only trigger refuses it — so the seed walks the
    // same path a real assessor does: draft, author, sign off.
    const assessment = await db.assessment.create({
      data: {
        centreId,
        templateId: (await db.template.findUnique({
          where: { name: spec.template },
          select: { id: true },
        }))!.id,
        title: spec.title,
        status: "draft",
        assessorId: assessorIds[index % assessorIds.length]!,
        reviewFrequencyMonths: spec.cadence,
        scopeNote: spec.scope,
        reviewDueAt: addMonths(new Date(), spec.cadence),
        createdAt: created,
      },
      select: { id: true },
    });

    const findings: Prisma.FindingUncheckedCreateInput[] = template.hazards.map(
      (label, i) => {
        const hazard = HAZARDS.find((h) => h.label === label)!;
        // The curated controls for this specific hazard. Falling back to the
        // category bucket produced findings like "Dropped free weights —
        // controlled by ball-stop netting", so a missing mapping is a seed
        // error rather than something to paper over.
        const labels = HAZARD_CONTROLS[label];
        if (!labels?.length) {
          throw new Error(`No controls mapped for hazard "${label}".`);
        }
        const picked = labels.map((controlLabel) => {
          const controlId = controlIdByLabel.get(controlLabel);
          if (!controlId) {
            throw new Error(
              `Hazard "${label}" maps to control "${controlLabel}", which is not in the library.`,
            );
          }
          return controlId;
        });

        return {
          assessmentId: assessment.id,
          hazardId: hazardIdByLabel.get(label)!,
          sortOrder: i,
          ...ratingsFor(label),
          controlMeasureIds: picked,
          personsAtRisk:
            hazard.category === "Chemical" || hazard.category === "Ergonomic"
              ? ["Staff"]
              : /children|soft play/i.test(label)
                ? ["Children", "Customers", "Staff"]
                : /contractor/i.test(label)
                  ? ["Contractors", "Staff"]
                  : ["Staff", "Customers", "Visitors"],
        };
      },
    );

    await db.finding.createMany({ data: findings });

    // An action for anything still at or above the escalation threshold.
    const saved = await db.finding.findMany({
      where: { assessmentId: assessment.id },
      select: {
        id: true,
        residualLikelihood: true,
        residualSeverity: true,
        hazard: { select: { label: true } },
      },
      orderBy: { sortOrder: "asc" },
    });

    for (const [i, finding] of saved.entries()) {
      if (finding.residualLikelihood * finding.residualSeverity < 10) continue;
      // Roughly a quarter of the actions on signed-off documents are closed,
      // so the Actions screen has both states to show.
      const closed = spec.status === "signed_off" && i % 4 === 0;
      await db.action.create({
        data: {
          findingId: finding.id,
          // centreId is filled by a trigger from the finding's assessment.
          centreId,
          description: actionFor(finding.hazard.label),
          // Spread across owners, with a couple left unassigned so the
          // Actions screen shows that state too.
          ownerId:
            (index + i) % 7 === 3
              ? null
              : [managerId, leadId, ...assessorIds][(index + i) % 5]!,
          dueAt: new Date(Date.now() + (i * 11 - 21) * 86_400_000),
          ...(closed
            ? {
                closedAt: new Date(Date.now() - 6 * 86_400_000),
                closedById: managerId,
                closureNote: "Completed and verified on site.",
              }
            : {}),
        },
      });
    }

    // Move the document to its real state. draft → in_review → signed_off is
    // the order the triggers expect, and the order a real document travels in.
    if (spec.status === "in_review") {
      await db.assessment.update({
        where: { id: assessment.id },
        data: { status: "in_review", reviewedById: managerId },
      });
    } else if (spec.status === "signed_off") {
      const signedAt = monthsAgo(spec.monthsAgo);
      await db.assessment.update({
        where: { id: assessment.id },
        data: {
          status: "signed_off",
          reviewedById: managerId,
          signedOffById: managerId,
          signedOffAt: signedAt,
          reviewDueAt: addMonths(signedAt, spec.cadence),
        },
      });

      // The record an inspector is shown.
      const full = await db.assessment.findUnique({
        where: { id: assessment.id },
        include: { findings: { orderBy: { sortOrder: "asc" } } },
      });
      const { findings: snapshotFindings, ...rest } = full!;
      await db.revision.create({
        data: {
          assessmentId: assessment.id,
          centreId,
          revisionNo: 1,
          snapshot: JSON.parse(
            JSON.stringify({ assessment: rest, findings: snapshotFindings }),
          ),
          reason: "Initial sign-off",
          createdById: managerId,
        },
      });
    }
  }

  await report();
}

async function report() {
  const [centres, hazards, controls, templates, assessments, findings, actions, revisions] =
    await Promise.all([
      db.centre.count(),
      db.hazard.count(),
      db.controlMeasure.count(),
      db.template.count(),
      db.assessment.count(),
      db.finding.count(),
      db.action.count(),
      db.revision.count(),
    ]);
  console.log(
    `Seeded: ${centres} centres, ${hazards} hazards, ${controls} controls, ` +
      `${templates} templates, ${assessments} assessments, ${findings} findings, ` +
      `${actions} actions, ${revisions} revisions.`,
  );
  console.log(
    `Demo sign-ins (password "${DEMO_PASSWORD}"): ` +
      DEMO_PEOPLE.map((p) => p.email).join(", "),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());

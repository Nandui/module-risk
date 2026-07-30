import type { AssessmentDetail, RegisterRow } from "@/lib/data/assessments";
import type { ActionListRow } from "@/lib/data/actions";
import { riskBand, riskScore, needsAction } from "@/lib/risk";
import { reviewState } from "@/lib/utils";

/**
 * Synthetic data for the design-system preview.
 *
 * Lets the register, the document and the actions list be reviewed — and their
 * density judged against real-looking content — without a database. Dev only;
 * the preview routes 404 in production.
 *
 * The content is drawn from the same leisure-centre material as the seed, so
 * what the preview shows is what the app will look like in use rather than
 * with lorem ipsum, which always flatters a layout.
 */

const DAY = 86_400_000;
const at = (days: number) => new Date(Date.now() + days * DAY).toISOString();

interface Spec {
  ref: string;
  title: string;
  centre: [string, string];
  assessor: string;
  status: RegisterRow["status"];
  initial: [number, number];
  residual: [number, number];
  findings: number;
  dueInDays: number | null;
  openActions: number;
}

const SPECS: Spec[] = [
  {
    ref: "RA-BT-0002",
    title: "Main pool bather supervision",
    centre: ["Bishopstown", "BT"],
    assessor: "Sarah Whitcombe",
    status: "signed_off",
    initial: [3, 5],
    residual: [2, 5],
    findings: 7,
    dueInDays: -31,
    openActions: 2,
  },
  {
    ref: "RA-HT-0003",
    title: "Pool plant and chemical handling",
    centre: ["Hilltop Sports & Pool", "HT"],
    assessor: "James Okafor",
    status: "in_review",
    initial: [2, 5],
    residual: [1, 5],
    findings: 9,
    dueInDays: 240,
    openActions: 1,
  },
  {
    ref: "RA-BT-0001",
    title: "Outdoor playing pitches",
    centre: ["Bishopstown", "BT"],
    assessor: "Fernando Serina",
    status: "signed_off",
    initial: [3, 5],
    residual: [2, 5],
    findings: 12,
    dueInDays: 21,
    openActions: 3,
  },
  {
    ref: "RA-RS-0002",
    title: "Changing rooms and lockers",
    centre: ["Riverside Leisure", "RS"],
    assessor: "Elaine Foster",
    status: "signed_off",
    initial: [4, 3],
    residual: [2, 3],
    findings: 6,
    dueInDays: -184,
    openActions: 0,
  },
  {
    ref: "RA-HT-0001",
    title: "Sports hall and court hire",
    centre: ["Hilltop Sports & Pool", "HT"],
    assessor: "Marcus Yeo",
    status: "in_review",
    initial: [4, 3],
    residual: [2, 3],
    findings: 4,
    dueInDays: 300,
    openActions: 0,
  },
  {
    ref: "RA-HT-0002",
    title: "Reception desk duties",
    centre: ["Hilltop Sports & Pool", "HT"],
    assessor: "Marcus Yeo",
    status: "signed_off",
    initial: [3, 3],
    residual: [2, 3],
    findings: 5,
    dueInDays: 12,
    openActions: 1,
  },
  {
    ref: "RA-RS-0001",
    title: "Soft play frame and sessions",
    centre: ["Riverside Leisure", "RS"],
    assessor: "Priya Raman",
    status: "signed_off",
    initial: [4, 4],
    residual: [2, 4],
    findings: 4,
    dueInDays: 305,
    openActions: 0,
  },
  {
    ref: "RA-BT-0003",
    title: "Wet-side changing village",
    centre: ["Bishopstown", "BT"],
    assessor: "Elaine Foster",
    status: "archived",
    initial: [4, 3],
    residual: [2, 2],
    findings: 6,
    dueInDays: 15,
    openActions: 0,
  },
  {
    ref: "RA-RS-0003",
    title: "Fitness suite",
    centre: ["Riverside Leisure", "RS"],
    assessor: "Priya Raman",
    status: "draft",
    initial: [0, 0],
    residual: [0, 0],
    findings: 0,
    dueInDays: null,
    openActions: 0,
  },
];

export const PREVIEW_REGISTER: RegisterRow[] = SPECS.map((spec, i) => {
  const initialScore = spec.findings ? riskScore(spec.initial[0], spec.initial[1]) : 0;
  const residualScore = spec.findings
    ? riskScore(spec.residual[0], spec.residual[1])
    : 0;
  const dueAt = spec.dueInDays === null ? null : at(spec.dueInDays);

  return {
    id: `preview-${i}`,
    reference: spec.ref,
    title: spec.title,
    status: spec.status,
    centreId: `centre-${spec.centre[1]}`,
    centreName: spec.centre[0],
    centreCode: spec.centre[1],
    assessorName: spec.assessor,
    reviewDueAt: dueAt,
    reviewState: reviewState(dueAt),
    findingCount: spec.findings,
    initialScore,
    residualScore,
    initialLikelihood: spec.initial[0],
    initialSeverity: spec.initial[1],
    residualLikelihood: spec.residual[0],
    residualSeverity: spec.residual[1],
    band: residualScore > 0 ? riskBand(residualScore) : null,
    openActions: spec.openActions,
    signedOffAt: spec.status === "signed_off" ? at(-200) : null,
  };
});

const FINDINGS: {
  hazard: string;
  category: AssessmentDetail["findings"][number]["hazardCategory"];
  guidance: string;
  initial: [number, number];
  residual: [number, number];
  persons: AssessmentDetail["findings"][number]["persons_at_risk"];
  controls: string[];
  notes?: string;
  action?: string;
}[] = [
  {
    hazard: "Chlorine gas release",
    category: "Chemical",
    guidance:
      "Segregated storage of acid and chlorine is non-negotiable. Assess ventilation, bunding and the evacuation route from the plant room.",
    initial: [2, 5],
    residual: [1, 5],
    persons: ["Staff", "Contractors"],
    controls: [
      "COSHH assessment for each product in use",
      "Acid and chlorine stored separately in bunded areas",
      "Mechanical ventilation to the plant room",
      "Spill kit available and staff trained in its use",
    ],
    notes:
      "Delivery bay is shared with the dry store. Deliveries are booked outside opening hours so the corridor stays clear.",
    action: "Commission gas detection in the plant room and record the alarm test.",
  },
  {
    hazard: "Acid splash to eyes or skin during dosing",
    category: "Chemical",
    guidance:
      "Manual dosing is the high-exposure task. Face protection and a working eyewash station within reach.",
    initial: [3, 4],
    residual: [2, 3],
    persons: ["Staff"],
    controls: [
      "Face shield, gloves and apron for dosing tasks",
      "Eyewash station within reach of the dosing point",
      "Trained operatives only for chemical handling",
    ],
  },
  {
    hazard: "Confined space working in plant room",
    category: "Physical",
    guidance:
      "Balance tanks and ducts. Permit to work, atmospheric testing, and never a lone worker.",
    initial: [2, 4],
    residual: [1, 4],
    persons: ["Staff", "Contractors"],
    controls: [
      "Permit to work for high-risk maintenance tasks",
      "Atmospheric testing before confined-space entry",
    ],
  },
  {
    hazard: "Noise exposure from pumps and plant",
    category: "Physical",
    guidance:
      "Measure at the operator position. Above 80 dB(A) daily exposure triggers hearing protection and information.",
    initial: [4, 2],
    residual: [2, 2],
    persons: ["Staff"],
    controls: [
      "Hearing protection provided in high-noise areas",
      "Task rotation to limit repeated exposure",
    ],
  },
  {
    hazard: "Manual handling of chemical drums",
    category: "Ergonomic",
    guidance:
      "Drum trolleys and decanting equipment remove most of this. Two-person handling is a weaker control than mechanical aid.",
    initial: [3, 3],
    residual: [2, 2],
    persons: ["Staff"],
    controls: [
      "Mechanical handling aid such as a trolley or drum lifter",
      "Manual handling training",
    ],
  },
];

export const PREVIEW_ASSESSMENT: AssessmentDetail = {
  assessment: {
    id: "preview-detail",
    reference: "RA-HT-0003",
    centre_id: "centre-HT",
    template_id: "template-plant",
    title: "Pool plant and chemical handling",
    status: "signed_off",
    assessor_id: "p1",
    reviewed_by: "p2",
    review_frequency_months: 12,
    review_due_at: at(-31),
    signed_off_at: at(-396),
    signed_off_by: "p2",
    scope_note:
      "Handling, dosing and storage of pool treatment chemicals, including the delivery bay and the balance tank. Excludes the wet-side changing village, which is assessed separately.",
    created_at: at(-400),
    updated_at: at(-396),
  },
  centre: {
    id: "centre-HT",
    name: "Hilltop Sports & Pool",
    code: "HT",
    address: "Beacon Road, Hilltop",
    created_at: at(-900),
  },
  assessor: {
    id: "p1",
    full_name: "James Okafor",
    email: "james@example.com",
    role: "assessor",
    created_at: at(-900),
  },
  signedOffBy: {
    id: "p2",
    full_name: "Marcus Yeo",
    email: "marcus@example.com",
    role: "manager",
    created_at: at(-900),
  },
  reviewedBy: {
    id: "p2",
    full_name: "Marcus Yeo",
    email: "marcus@example.com",
    role: "manager",
    created_at: at(-900),
  },
  templateName: "Pool plant room",
  findings: FINDINGS.map((f, i) => {
    const initialScore = riskScore(f.initial[0], f.initial[1]);
    const residualScore = riskScore(f.residual[0], f.residual[1]);
    return {
      id: `finding-${i}`,
      assessment_id: "preview-detail",
      hazard_id: `hazard-${i}`,
      sort_order: i,
      likelihood: f.initial[0],
      severity: f.initial[1],
      control_measure_ids: f.controls.map((_, ci) => `control-${i}-${ci}`),
      residual_likelihood: f.residual[0],
      residual_severity: f.residual[1],
      persons_at_risk: f.persons,
      notes: f.notes ?? null,
      photo_ids: [],
      created_at: at(-400),
      updated_at: at(-396),
      hazardLabel: f.hazard,
      hazardCategory: f.category,
      hazardGuidance: f.guidance,
      controls: f.controls.map((label, ci) => ({ id: `control-${i}-${ci}`, label })),
      actions: f.action
        ? [
            {
              id: `action-${i}`,
              finding_id: `finding-${i}`,
              centre_id: "centre-HT",
              description: f.action,
              owner_id: "p2",
              due_at: at(-9),
              closed_at: null,
              closed_by: null,
              closure_note: null,
              created_at: at(-396),
            },
          ]
        : [],
      initialScore,
      residualScore,
      needsAction: needsAction(residualScore),
    };
  }),
  revisions: [
    {
      id: "rev-2",
      assessment_id: "preview-detail",
      centre_id: "centre-HT",
      revision_no: 2,
      snapshot: {},
      reason: "Corrected the residual rating on acid dosing after the eyewash station was reinstated.",
      created_by: "p2",
      created_at: at(-120),
    },
    {
      id: "rev-1",
      assessment_id: "preview-detail",
      centre_id: "centre-HT",
      revision_no: 1,
      snapshot: {},
      reason: "Initial sign-off",
      created_by: "p2",
      created_at: at(-396),
    },
  ],
  headlineInitial: 12,
  headlineResidual: 8,
  openActions: 1,
};

// Recomputed so the fixture can never disagree with the engine.
PREVIEW_ASSESSMENT.headlineInitial = Math.max(
  ...PREVIEW_ASSESSMENT.findings.map((f) => f.initialScore),
);
PREVIEW_ASSESSMENT.headlineResidual = Math.max(
  ...PREVIEW_ASSESSMENT.findings.map((f) => f.residualScore),
);

const ACTION_SPECS: [string, string, string, string, number, [number, number]][] = [
  [
    "Commission gas detection in the plant room and record the alarm test.",
    "Marcus Yeo",
    "Hilltop Sports & Pool",
    "HT",
    -9,
    [1, 5],
  ],
  [
    "Re-run the zoned supervision assessment against current programme times.",
    "Marcus Yeo",
    "Bishopstown",
    "BT",
    -2,
    [2, 5],
  ],
  [
    "Add anti-slip matting along the deep-end walkway.",
    "Marcus Yeo",
    "Bishopstown",
    "BT",
    6,
    [2, 3],
  ],
  [
    "Book the five-year condition survey and circulate the report.",
    "Fernando Serina",
    "Bishopstown",
    "BT",
    18,
    [1, 5],
  ],
  [
    "Confirm AED response time from the furthest point of the gym floor.",
    "Priya Raman",
    "Riverside Leisure",
    "RS",
    -21,
    [2, 5],
  ],
  [
    "Check and record goal post anchoring before every booking.",
    "",
    "Hilltop Sports & Pool",
    "HT",
    30,
    [2, 5],
  ],
];

export const PREVIEW_ACTIONS: ActionListRow[] = ACTION_SPECS.map(
  ([description, owner, centreName, centreCode, dueInDays, residual], i) => {
    const residualScore = riskScore(residual[0], residual[1]);
    const dueAt = at(dueInDays);
    return {
      id: `preview-action-${i}`,
      description,
      dueAt,
      closedAt: null,
      state: dueInDays < 0 ? "overdue" : dueInDays <= 14 ? "due_soon" : "open",
      ownerId: owner ? `owner-${owner}` : null,
      ownerName: owner || "Unassigned",
      centreId: `centre-${centreCode}`,
      centreName,
      centreCode,
      assessmentId: "preview-detail",
      assessmentRef: `RA-${centreCode}-000${(i % 3) + 1}`,
      assessmentTitle: "Pool plant and chemical handling",
      hazardLabel: [
        "Chlorine gas release",
        "Swimmer in difficulty or drowning",
        "Slips, trips and falls on wet poolside",
        "Structural failure or falling debris",
        "Cardiac event during exertion",
        "Falling or unsecured goal posts",
      ][i]!,
      residualScore,
      band: riskBand(residualScore),
    };
  },
);

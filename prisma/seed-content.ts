import type { HazardCategory } from "@prisma/client";

/**
 * The domain content, carried over from the Centrely `riskly` module where it
 * was written against a real operation.
 *
 * Free-text hazard and control fields have been lifted into controlled
 * library rows: prose cannot be compared across centres, and cross-centre
 * comparison is the entire value of this product to a group.
 *
 * Kept as data rather than SQL so it stays reviewable in a diff and the
 * templates can reference hazards by label instead of by id.
 */

export interface HazardSeed {
  label: string;
  category: HazardCategory;
  guidance: string;
}

export const HAZARDS: HazardSeed[] = [
  // ---- Pool and poolside -----------------------------------------
  {
    label: "Swimmer in difficulty or drowning",
    category: "Physical",
    guidance:
      "The defining risk of a pool site. Assess supervision zones, sightlines and bather load separately for each pool and each programmed activity.",
  },
  {
    label: "Slips, trips and falls on wet poolside",
    category: "Physical",
    guidance:
      "The most frequent poolside injury. Consider surface finish, standing water, and whether the no-running rule is actually enforced at peak times.",
  },
  {
    label: "Diving into shallow water",
    category: "Physical",
    guidance:
      "Low likelihood, catastrophic severity. Depth markings, signage and lifeguard intervention are the controls that matter.",
  },
  {
    label: "Entrapment in pool grilles or outlets",
    category: "Physical",
    guidance:
      "Check grille fixings on every plant inspection. A missing or loose grille is an immediate closure.",
  },
  {
    label: "Eye or skin irritation from pool water chemistry",
    category: "Chemical",
    guidance:
      "Usually a dosing imbalance. Continuous monitoring plus manual testing gives you the evidence trail.",
  },
  {
    label: "Legionella in showers and spray features",
    category: "Biological",
    guidance:
      "Governed by the written control scheme. Temperature records and outlet flushing are the evidence an inspector will ask for.",
  },
  {
    label: "Cryptosporidium contamination of pool water",
    category: "Biological",
    guidance:
      "Faecal accident response procedure, filtration performance and turnover rate.",
  },
  // ---- Plant room ------------------------------------------------
  {
    label: "Chlorine gas release",
    category: "Chemical",
    guidance:
      "Segregated storage of acid and chlorine is non-negotiable. Assess ventilation, bunding and the evacuation route from the plant room.",
  },
  {
    label: "Acid splash to eyes or skin during dosing",
    category: "Chemical",
    guidance:
      "Manual dosing is the high-exposure task. Face protection and a working eyewash station within reach.",
  },
  {
    label: "Confined space working in plant room",
    category: "Physical",
    guidance:
      "Balance tanks and ducts. Permit to work, atmospheric testing, and never a lone worker.",
  },
  {
    label: "Contact with hot pipework or boiler surfaces",
    category: "Physical",
    guidance:
      "Lagging condition and guarding. Note any surface above 60°C reachable from a walkway.",
  },
  {
    label: "Electrical contact with plant and control panels",
    category: "Physical",
    guidance:
      "Fixed wiring inspection, panel locks, and isolation procedure before any maintenance.",
  },
  {
    label: "Noise exposure from pumps and plant",
    category: "Physical",
    guidance:
      "Measure at the operator position. Above 80 dB(A) daily exposure triggers hearing protection and information.",
  },
  {
    label: "Manual handling of chemical drums",
    category: "Ergonomic",
    guidance:
      "Drum trolleys and decanting equipment remove most of this. Two-person handling is a weaker control than mechanical aid.",
  },
  // ---- Changing rooms --------------------------------------------
  {
    label: "Slips on wet floors during cleaning",
    category: "Physical",
    guidance:
      "Cleaning during opening hours is the aggravating factor. Assess whether the schedule can move.",
  },
  {
    label: "Exposure to cleaning chemicals",
    category: "Chemical",
    guidance:
      "COSHH assessment per product. Dilution control and ventilation, not just gloves.",
  },
  {
    label: "Damaged locker doors and fittings",
    category: "Physical",
    guidance:
      "Picked up by routine inspection. Note the reporting-to-repair interval, which is where this usually fails.",
  },
  {
    label: "Bloodborne pathogens from sharps or bodily fluids",
    category: "Biological",
    guidance:
      "Spill kit, sharps box, and a trained response. Applies to changing rooms and toilets.",
  },
  {
    label: "Fungal infection from wet floor surfaces",
    category: "Biological",
    guidance:
      "Cleaning frequency and floor finish. Low severity but high exposure across every bather.",
  },
  {
    label: "Unsupervised children in the changing village",
    category: "Physical",
    guidance:
      "Admission policy, cubicle sightlines and the supervision ratio for group bookings.",
  },
  // ---- Gym and studio --------------------------------------------
  {
    label: "Dropped free weights",
    category: "Physical",
    guidance:
      "Platform condition, collar availability and whether unsupervised lifting is permitted.",
  },
  {
    label: "Incorrect lifting technique without instruction",
    category: "Ergonomic",
    guidance: "Induction quality is the control. Record who has been inducted and when.",
  },
  {
    label: "Trailing cables and equipment leads",
    category: "Physical",
    guidance: "Cable routing on cardio kit. Simple to fix, easy to let slide.",
  },
  {
    label: "Cardiac event during exertion",
    category: "Physical",
    guidance:
      "Health screening at induction, staff presence on the gym floor, AED location and response time.",
  },
  {
    label: "Equipment failure on resistance machines",
    category: "Physical",
    guidance:
      "Planned maintenance record and the daily visual check. Cable and pin condition specifically.",
  },
  {
    label: "Collisions during group exercise class",
    category: "Physical",
    guidance:
      "Class size against studio floor area, and the instructor's sightline to every participant.",
  },
  {
    label: "Overexertion in a class beyond ability",
    category: "Physical",
    guidance:
      "Pre-class screening and a stated intensity level. Instructors must be able to offer a regression.",
  },
  {
    label: "Noise exposure from studio sound systems",
    category: "Physical",
    guidance:
      "Set a volume limit. Instructors take the exposure repeatedly across a week, not participants.",
  },
  // ---- Sports hall and soft play ---------------------------------
  {
    label: "Collisions during court sports",
    category: "Physical",
    guidance:
      "Shared-space play and run-off distance to walls. Assess per sport, not per hall.",
  },
  {
    label: "Manual handling of heavy equipment such as goals and nets",
    category: "Ergonomic",
    guidance:
      "Trolleys and two-person lifts. Setup happens under time pressure between bookings, which is when it goes wrong.",
  },
  {
    label: "Falling or unsecured goal posts",
    category: "Physical",
    guidance:
      "Anchoring and the inspection record. A toppling goal is a fatality risk with children present.",
  },
  {
    label: "Slippery hall floor from moisture ingress",
    category: "Physical",
    guidance:
      "Entrance matting, roof condition and a wet-floor response that does not rely on someone noticing.",
  },
  {
    label: "Falls from height in the soft play frame",
    category: "Physical",
    guidance:
      "Netting condition, impact matting and the height of the highest accessible platform.",
  },
  {
    label: "Overcrowding in soft play",
    category: "Physical",
    guidance:
      "Session capacity and a counted admission. Overcrowding drives every other soft-play risk.",
  },
  {
    label: "Trapped limbs in soft play netting or rollers",
    category: "Physical",
    guidance: "Gap sizes against the equipment standard, checked on inspection.",
  },
  {
    label: "Poor hygiene of soft play surfaces",
    category: "Biological",
    guidance: "Deep-clean frequency and the response to a soiling incident.",
  },
  // ---- Outdoor areas and pitches ---------------------------------
  {
    label: "Uneven pitch surface or holes",
    category: "Physical",
    guidance:
      "Pre-session walk-through is the control that actually catches this. Record it.",
  },
  {
    label: "Waterlogged pitch surface or poor drainage",
    category: "Physical",
    guidance:
      "A closure decision, made against stated criteria rather than on the day by whoever is on duty.",
  },
  {
    label: "Damaged perimeter fencing or unsecured gates",
    category: "Physical",
    guidance:
      "Consider both unauthorised access in and a ball escaping into a roadway.",
  },
  {
    label: "Inappropriate footwear or unsafe studs",
    category: "Physical",
    guidance: "Pre-play check. The control fails when staff are unwilling to refuse play.",
  },
  {
    label: "Inadequate pitch or outdoor lighting",
    category: "Physical",
    guidance: "Lux level against the activity, plus the lamp replacement interval.",
  },
  {
    label: "Broken glass or sharp objects on the playing surface",
    category: "Physical",
    guidance:
      "Pre-use inspection and litter management. Higher on sites with public access.",
  },
  {
    label: "Severe weather including lightning and high winds",
    category: "Environmental",
    guidance:
      "A written lightning policy with a stated trigger, and a shelter that can be reached in time.",
  },
  {
    label: "Sun exposure and heat stress",
    category: "Environmental",
    guidance:
      "Applies to staff on long outdoor duties as much as to participants. Water, shade and rotation.",
  },
  {
    label: "Animal fouling or biological contamination of grounds",
    category: "Biological",
    guidance: "Inspection, removal and hand hygiene provision.",
  },
  {
    label: "Pests and vermin",
    category: "Biological",
    guidance:
      "Contracted pest control plus a sighting log that staff actually complete.",
  },
  {
    label: "Radon gas accumulation",
    category: "Chemical",
    guidance:
      "Measurement first. Applies to below-ground plant and store rooms in affected areas.",
  },
  {
    label: "Structural failure or falling debris",
    category: "Physical",
    guidance:
      "Condition survey interval. Low likelihood, fatal severity — it stays on the register.",
  },
  // ---- Reception and general -------------------------------------
  {
    label: "Aggressive or abusive customer behaviour",
    category: "Psychosocial",
    guidance:
      "Assess by location and time of day. Lone working after dark is the aggravating factor.",
  },
  {
    label: "Robbery during cash handling",
    category: "Physical",
    guidance:
      "Counting out of public view and varied banking times. Predictability is the hazard.",
  },
  {
    label: "Lone working at the front desk",
    category: "Psychosocial",
    guidance:
      "Check-in procedure, panic alarm and a named person who notices if contact stops.",
  },
  {
    label: "Display screen work at reception",
    category: "Ergonomic",
    guidance:
      "Workstation assessment. Low severity, but it is the most common staff complaint on any site.",
  },
  {
    label: "Slips on wet foyer floor in bad weather",
    category: "Physical",
    guidance: "Matting length is the single biggest factor. Three metres, not one.",
  },
  {
    label: "Fire in a public building",
    category: "Physical",
    guidance:
      "Fire risk assessment, evacuation of a wet-side population, and the roll call. Assess the pool evacuation specifically.",
  },
  {
    label: "Blocked escape routes",
    category: "Physical",
    guidance:
      "Found by inspection, caused by storage. Recurring finding on most sites.",
  },
  {
    label: "Working at height for maintenance",
    category: "Physical",
    guidance:
      "Access equipment, training and whether the task can be done from the ground instead.",
  },
  {
    label: "Contractor working without supervision or induction",
    category: "Physical",
    guidance: "Permit to work and a signed induction. Contractors do not know your site.",
  },
  {
    label: "Inadequate first aid or AED provision",
    category: "Physical",
    guidance:
      "Response time to the furthest point of the site, not just whether a kit exists.",
  },
  {
    label: "Stress from workload and shift patterns",
    category: "Psychosocial",
    guidance:
      "Rota stability, break-taking and cover arrangements. Assess honestly or not at all.",
  },
];

export const CONTROLS: { label: string; category: HazardCategory }[] = [
  // Supervision and procedure
  { label: "NPLQ-qualified lifeguards on poolside", category: "Physical" },
  { label: "Zoned poolside supervision with defined sightlines", category: "Physical" },
  { label: "Normal operating procedure (NOP) in place and current", category: "Physical" },
  { label: "Emergency action plan (EAP) in place and rehearsed", category: "Physical" },
  { label: "Rescue equipment available at poolside", category: "Physical" },
  { label: "Bather load limits set and counted", category: "Physical" },
  { label: "No-running policy enforced by staff", category: "Physical" },
  { label: "Depth markings and diving prohibition signage", category: "Physical" },
  { label: "Staff supervision during opening hours", category: "Physical" },
  { label: "Booking presence and supervision for hires", category: "Physical" },
  { label: "Rules briefing before activity", category: "Physical" },
  { label: "Booking controls limiting participant numbers", category: "Physical" },
  { label: "Session capacity enforced by counted admission", category: "Physical" },
  { label: "Admission and supervision-ratio policy for children", category: "Physical" },
  { label: "Activity briefing appropriate to the sport", category: "Physical" },
  { label: "Instructor-led induction before unsupervised use", category: "Physical" },
  { label: "Pre-activity health screening", category: "Physical" },
  { label: "Instructor able to offer a regression or alternative", category: "Physical" },
  // Inspection and maintenance
  { label: "Routine documented inspection", category: "Physical" },
  { label: "Pre-session walk-through of the playing surface", category: "Physical" },
  { label: "Defect reporting process with a named owner", category: "Physical" },
  { label: "Prompt repair or cordon off on discovery", category: "Physical" },
  { label: "Planned preventive maintenance schedule", category: "Physical" },
  { label: "Daily visual equipment check", category: "Physical" },
  { label: "Maintenance policy and condition survey", category: "Physical" },
  { label: "Boundary and fence inspection", category: "Physical" },
  { label: "Gates kept closed and locked when not in use", category: "Physical" },
  { label: "Ball-stop netting where required", category: "Physical" },
  { label: "Anchoring of goal posts checked before use", category: "Physical" },
  { label: "Lighting inspection and prompt lamp replacement", category: "Physical" },
  { label: "Drainage maintenance", category: "Physical" },
  { label: "Grille and outlet fixings checked at each plant inspection", category: "Physical" },
  { label: "Netting, matting and gap sizes checked on inspection", category: "Physical" },
  { label: "Fixed electrical installation inspection", category: "Physical" },
  { label: "Pipework lagging and guarding maintained", category: "Physical" },
  // Surfaces, signage and housekeeping
  { label: "Non-slip surfacing", category: "Physical" },
  { label: "Wet-floor signage deployed at the point of hazard", category: "Physical" },
  { label: "Prompt clean-up of spillages", category: "Physical" },
  { label: "Entrance matting of adequate length", category: "Physical" },
  { label: "Cleaning scheduled outside peak occupancy", category: "Physical" },
  { label: "Suitable footwear required and checked", category: "Physical" },
  { label: "Footwear rules communicated and enforced at entry", category: "Physical" },
  { label: "Signage at entrances stating the rules", category: "Physical" },
  { label: "Litter bins provided and emptied", category: "Physical" },
  { label: "Cable routing and management on equipment", category: "Physical" },
  { label: "Escape routes kept clear and checked on inspection", category: "Physical" },
  { label: "Lifting platform and collars provided in the free-weights area", category: "Physical" },
  // Chemical
  { label: "COSHH assessment for each product in use", category: "Chemical" },
  { label: "Acid and chlorine stored separately in bunded areas", category: "Chemical" },
  { label: "Mechanical ventilation to the plant room", category: "Chemical" },
  { label: "Spill kit available and staff trained in its use", category: "Chemical" },
  { label: "Automatic dosing with continuous monitoring", category: "Chemical" },
  { label: "Manual water testing at set intervals", category: "Chemical" },
  { label: "Correct dilution controlled at the point of use", category: "Chemical" },
  { label: "Eyewash station within reach of the dosing point", category: "Chemical" },
  { label: "Trained operatives only for chemical handling", category: "Chemical" },
  { label: "Gas detection and alarm in the plant room", category: "Chemical" },
  { label: "Radon measurement carried out", category: "Chemical" },
  { label: "Personal protective equipment provided and worn", category: "Chemical" },
  { label: "Face shield, gloves and apron for dosing tasks", category: "Chemical" },
  // Biological
  { label: "Written control scheme for legionella", category: "Biological" },
  { label: "Outlet temperature monitoring and flushing records", category: "Biological" },
  { label: "Faecal accident response procedure", category: "Biological" },
  { label: "Filtration performance and turnover rate verified", category: "Biological" },
  { label: "Deep-clean schedule with recorded completion", category: "Biological" },
  { label: "Sharps box and bodily-fluid spill kit provided", category: "Biological" },
  { label: "Hand hygiene facilities available and stocked", category: "Biological" },
  { label: "Contracted pest control with a sighting log", category: "Biological" },
  { label: "Prompt removal and safe disposal of contamination", category: "Biological" },
  // Ergonomic
  { label: "Manual handling training", category: "Ergonomic" },
  { label: "Mechanical handling aid such as a trolley or drum lifter", category: "Ergonomic" },
  { label: "Two-person lift for awkward loads", category: "Ergonomic" },
  { label: "Workstation assessment completed", category: "Ergonomic" },
  { label: "Task rotation to limit repeated exposure", category: "Ergonomic" },
  // Psychosocial
  { label: "Conflict management training", category: "Psychosocial" },
  { label: "Panic alarm at the work position", category: "Psychosocial" },
  { label: "CCTV coverage of the area", category: "Psychosocial" },
  { label: "No lone working after dark", category: "Psychosocial" },
  { label: "Lone-worker check-in procedure", category: "Psychosocial" },
  { label: "Cash counted away from public view", category: "Psychosocial" },
  { label: "Varied banking times and routes", category: "Psychosocial" },
  { label: "Safe with a drop slot", category: "Psychosocial" },
  { label: "Rota published in advance with protected breaks", category: "Psychosocial" },
  { label: "Incident reporting and post-incident support", category: "Psychosocial" },
  // Emergency and environmental
  { label: "Staff first aid training kept current", category: "Physical" },
  { label: "AED available on site with a known location", category: "Physical" },
  { label: "First aid kit checks recorded", category: "Physical" },
  { label: "Clear access maintained for emergency services", category: "Physical" },
  { label: "Emergency response procedure rehearsed", category: "Physical" },
  { label: "Fire risk assessment reviewed and actioned", category: "Physical" },
  { label: "Wet-side evacuation procedure rehearsed", category: "Physical" },
  { label: "Weather monitoring before and during outdoor activity", category: "Environmental" },
  { label: "Lightning policy with a stated closure trigger", category: "Environmental" },
  { label: "Evacuation route to indoor shelter identified", category: "Environmental" },
  { label: "Access to drinking water, shade and rest breaks", category: "Environmental" },
  { label: "Activity modified or cancelled on weather warning", category: "Environmental" },
  { label: "Sunscreen and hat guidance issued to staff", category: "Environmental" },
  { label: "Permit to work for high-risk maintenance tasks", category: "Physical" },
  { label: "Contractor induction signed before work starts", category: "Physical" },
  { label: "Atmospheric testing before confined-space entry", category: "Physical" },
  { label: "Isolation and lock-off before maintenance", category: "Physical" },
  { label: "Hearing protection provided in high-noise areas", category: "Physical" },
  { label: "Volume limit set on the sound system", category: "Physical" },
  { label: "Work at height avoided or done from the ground where possible", category: "Physical" },
  { label: "Staff radio communication", category: "Physical" },
];

/** The hazard walk-through for a given kind of space. */
export const TEMPLATES: {
  name: string;
  category: HazardCategory;
  hazards: string[];
}[] = [
  {
    name: "Pool plant room",
    category: "Chemical",
    hazards: [
      "Chlorine gas release",
      "Acid splash to eyes or skin during dosing",
      "Confined space working in plant room",
      "Contact with hot pipework or boiler surfaces",
      "Electrical contact with plant and control panels",
      "Noise exposure from pumps and plant",
      "Manual handling of chemical drums",
      "Legionella in showers and spray features",
      "Radon gas accumulation",
    ],
  },
  {
    name: "Poolside supervision",
    category: "Physical",
    hazards: [
      "Swimmer in difficulty or drowning",
      "Slips, trips and falls on wet poolside",
      "Diving into shallow water",
      "Entrapment in pool grilles or outlets",
      "Eye or skin irritation from pool water chemistry",
      "Cryptosporidium contamination of pool water",
      "Inadequate first aid or AED provision",
    ],
  },
  {
    name: "Changing village",
    category: "Biological",
    hazards: [
      "Slips on wet floors during cleaning",
      "Exposure to cleaning chemicals",
      "Damaged locker doors and fittings",
      "Bloodborne pathogens from sharps or bodily fluids",
      "Fungal infection from wet floor surfaces",
      "Unsupervised children in the changing village",
    ],
  },
  {
    name: "Fitness suite",
    category: "Physical",
    hazards: [
      "Dropped free weights",
      "Incorrect lifting technique without instruction",
      "Trailing cables and equipment leads",
      "Cardiac event during exertion",
      "Equipment failure on resistance machines",
    ],
  },
  {
    name: "Group exercise studio",
    category: "Physical",
    hazards: [
      "Collisions during group exercise class",
      "Overexertion in a class beyond ability",
      "Noise exposure from studio sound systems",
      "Slippery hall floor from moisture ingress",
    ],
  },
  {
    name: "Sports hall",
    category: "Physical",
    hazards: [
      "Collisions during court sports",
      "Manual handling of heavy equipment such as goals and nets",
      "Falling or unsecured goal posts",
      "Slippery hall floor from moisture ingress",
    ],
  },
  {
    name: "Soft play",
    category: "Physical",
    hazards: [
      "Falls from height in the soft play frame",
      "Overcrowding in soft play",
      "Trapped limbs in soft play netting or rollers",
      "Poor hygiene of soft play surfaces",
    ],
  },
  {
    name: "Outdoor pitches",
    category: "Environmental",
    hazards: [
      "Uneven pitch surface or holes",
      "Waterlogged pitch surface or poor drainage",
      "Damaged perimeter fencing or unsecured gates",
      "Inappropriate footwear or unsafe studs",
      "Inadequate pitch or outdoor lighting",
      "Broken glass or sharp objects on the playing surface",
      "Severe weather including lightning and high winds",
      "Sun exposure and heat stress",
      "Animal fouling or biological contamination of grounds",
      "Pests and vermin",
      "Structural failure or falling debris",
      "Inadequate first aid or AED provision",
    ],
  },
  {
    name: "Reception and front of house",
    category: "Psychosocial",
    hazards: [
      "Aggressive or abusive customer behaviour",
      "Robbery during cash handling",
      "Lone working at the front desk",
      "Display screen work at reception",
      "Slips on wet foyer floor in bad weather",
    ],
  },
  {
    name: "Cleaning and housekeeping",
    category: "Chemical",
    hazards: [
      "Slips on wet floors during cleaning",
      "Exposure to cleaning chemicals",
      "Bloodborne pathogens from sharps or bodily fluids",
      "Manual handling of chemical drums",
      "Working at height for maintenance",
    ],
  },
  {
    name: "Building and premises",
    category: "Physical",
    hazards: [
      "Fire in a public building",
      "Blocked escape routes",
      "Working at height for maintenance",
      "Contractor working without supervision or induction",
      "Structural failure or falling debris",
      "Stress from workload and shift patterns",
    ],
  },
];


/**
 * Which controls actually belong to which hazard.
 *
 * Curated rather than picked from the category bucket: "Physical" holds a
 * hundred controls spanning pools, pitches and plant rooms, so choosing from
 * it by index produced findings like "Dropped free weights — controlled by
 * ball-stop netting". A register that reads as nonsense teaches an assessor
 * to ignore it.
 */
export const HAZARD_CONTROLS: Record<string, string[]> = {
  // Pool and poolside
  "Swimmer in difficulty or drowning": [
    "NPLQ-qualified lifeguards on poolside",
    "Zoned poolside supervision with defined sightlines",
    "Rescue equipment available at poolside",
    "Emergency action plan (EAP) in place and rehearsed",
    "Bather load limits set and counted",
  ],
  "Slips, trips and falls on wet poolside": [
    "Non-slip surfacing",
    "No-running policy enforced by staff",
    "Wet-floor signage deployed at the point of hazard",
    "Prompt clean-up of spillages",
  ],
  "Diving into shallow water": [
    "Depth markings and diving prohibition signage",
    "Zoned poolside supervision with defined sightlines",
    "Rules briefing before activity",
  ],
  "Entrapment in pool grilles or outlets": [
    "Grille and outlet fixings checked at each plant inspection",
    "Routine documented inspection",
    "Prompt repair or cordon off on discovery",
  ],
  "Eye or skin irritation from pool water chemistry": [
    "Automatic dosing with continuous monitoring",
    "Manual water testing at set intervals",
  ],
  "Legionella in showers and spray features": [
    "Written control scheme for legionella",
    "Outlet temperature monitoring and flushing records",
    "Planned preventive maintenance schedule",
  ],
  "Cryptosporidium contamination of pool water": [
    "Faecal accident response procedure",
    "Filtration performance and turnover rate verified",
    "Manual water testing at set intervals",
  ],
  // Plant room
  "Chlorine gas release": [
    "COSHH assessment for each product in use",
    "Acid and chlorine stored separately in bunded areas",
    "Mechanical ventilation to the plant room",
    "Gas detection and alarm in the plant room",
    "Spill kit available and staff trained in its use",
  ],
  "Acid splash to eyes or skin during dosing": [
    "Face shield, gloves and apron for dosing tasks",
    "Eyewash station within reach of the dosing point",
    "Trained operatives only for chemical handling",
  ],
  "Confined space working in plant room": [
    "Permit to work for high-risk maintenance tasks",
    "Atmospheric testing before confined-space entry",
    "Staff radio communication",
  ],
  "Contact with hot pipework or boiler surfaces": [
    "Pipework lagging and guarding maintained",
    "Routine documented inspection",
  ],
  "Electrical contact with plant and control panels": [
    "Fixed electrical installation inspection",
    "Isolation and lock-off before maintenance",
    "Permit to work for high-risk maintenance tasks",
  ],
  "Noise exposure from pumps and plant": [
    "Hearing protection provided in high-noise areas",
    "Task rotation to limit repeated exposure",
  ],
  "Manual handling of chemical drums": [
    "Mechanical handling aid such as a trolley or drum lifter",
    "Manual handling training",
    "Two-person lift for awkward loads",
  ],
  // Changing rooms
  "Slips on wet floors during cleaning": [
    "Wet-floor signage deployed at the point of hazard",
    "Cleaning scheduled outside peak occupancy",
    "Suitable footwear required and checked",
    "Non-slip surfacing",
  ],
  "Exposure to cleaning chemicals": [
    "COSHH assessment for each product in use",
    "Correct dilution controlled at the point of use",
    "Personal protective equipment provided and worn",
  ],
  "Damaged locker doors and fittings": [
    "Routine documented inspection",
    "Defect reporting process with a named owner",
    "Prompt repair or cordon off on discovery",
  ],
  "Bloodborne pathogens from sharps or bodily fluids": [
    "Sharps box and bodily-fluid spill kit provided",
    "Hand hygiene facilities available and stocked",
    "Prompt removal and safe disposal of contamination",
  ],
  "Fungal infection from wet floor surfaces": [
    "Deep-clean schedule with recorded completion",
    "Hand hygiene facilities available and stocked",
  ],
  "Unsupervised children in the changing village": [
    "Admission and supervision-ratio policy for children",
    "Staff supervision during opening hours",
    "Signage at entrances stating the rules",
  ],
  // Gym and studio
  "Dropped free weights": [
    "Lifting platform and collars provided in the free-weights area",
    "Instructor-led induction before unsupervised use",
    "Staff supervision during opening hours",
  ],
  "Incorrect lifting technique without instruction": [
    "Instructor-led induction before unsupervised use",
    "Manual handling training",
  ],
  "Trailing cables and equipment leads": [
    "Cable routing and management on equipment",
    "Daily visual equipment check",
  ],
  "Cardiac event during exertion": [
    "Pre-activity health screening",
    "AED available on site with a known location",
    "Staff first aid training kept current",
    "Emergency response procedure rehearsed",
  ],
  "Equipment failure on resistance machines": [
    "Planned preventive maintenance schedule",
    "Daily visual equipment check",
    "Defect reporting process with a named owner",
  ],
  "Collisions during group exercise class": [
    "Booking controls limiting participant numbers",
    "Activity briefing appropriate to the sport",
    "Staff supervision during opening hours",
  ],
  "Overexertion in a class beyond ability": [
    "Pre-activity health screening",
    "Instructor able to offer a regression or alternative",
  ],
  "Noise exposure from studio sound systems": [
    "Volume limit set on the sound system",
    "Task rotation to limit repeated exposure",
  ],
  // Sports hall and soft play
  "Collisions during court sports": [
    "Activity briefing appropriate to the sport",
    "Booking controls limiting participant numbers",
    "Staff supervision during opening hours",
  ],
  "Manual handling of heavy equipment such as goals and nets": [
    "Mechanical handling aid such as a trolley or drum lifter",
    "Two-person lift for awkward loads",
    "Manual handling training",
  ],
  "Falling or unsecured goal posts": [
    "Anchoring of goal posts checked before use",
    "Routine documented inspection",
    "Staff supervision during opening hours",
  ],
  "Slippery hall floor from moisture ingress": [
    "Entrance matting of adequate length",
    "Prompt clean-up of spillages",
    "Routine documented inspection",
  ],
  "Falls from height in the soft play frame": [
    "Netting, matting and gap sizes checked on inspection",
    "Staff supervision during opening hours",
    "Signage at entrances stating the rules",
  ],
  "Overcrowding in soft play": [
    "Session capacity enforced by counted admission",
    "Admission and supervision-ratio policy for children",
  ],
  "Trapped limbs in soft play netting or rollers": [
    "Netting, matting and gap sizes checked on inspection",
    "Routine documented inspection",
    "Prompt repair or cordon off on discovery",
  ],
  "Poor hygiene of soft play surfaces": [
    "Deep-clean schedule with recorded completion",
    "Hand hygiene facilities available and stocked",
  ],
  // Outdoor areas and pitches
  "Uneven pitch surface or holes": [
    "Pre-session walk-through of the playing surface",
    "Routine documented inspection",
    "Prompt repair or cordon off on discovery",
  ],
  "Waterlogged pitch surface or poor drainage": [
    "Drainage maintenance",
    "Weather monitoring before and during outdoor activity",
    "Prompt repair or cordon off on discovery",
  ],
  "Damaged perimeter fencing or unsecured gates": [
    "Boundary and fence inspection",
    "Gates kept closed and locked when not in use",
    "Ball-stop netting where required",
  ],
  "Inappropriate footwear or unsafe studs": [
    "Footwear rules communicated and enforced at entry",
    "Suitable footwear required and checked",
  ],
  "Inadequate pitch or outdoor lighting": [
    "Lighting inspection and prompt lamp replacement",
    "Defect reporting process with a named owner",
  ],
  "Broken glass or sharp objects on the playing surface": [
    "Pre-session walk-through of the playing surface",
    "Litter bins provided and emptied",
    "Prompt removal and safe disposal of contamination",
  ],
  "Severe weather including lightning and high winds": [
    "Lightning policy with a stated closure trigger",
    "Weather monitoring before and during outdoor activity",
    "Evacuation route to indoor shelter identified",
    "Activity modified or cancelled on weather warning",
  ],
  "Sun exposure and heat stress": [
    "Access to drinking water, shade and rest breaks",
    "Sunscreen and hat guidance issued to staff",
    "Task rotation to limit repeated exposure",
  ],
  "Animal fouling or biological contamination of grounds": [
    "Prompt removal and safe disposal of contamination",
    "Routine documented inspection",
    "Hand hygiene facilities available and stocked",
  ],
  "Pests and vermin": [
    "Contracted pest control with a sighting log",
    "Litter bins provided and emptied",
  ],
  "Radon gas accumulation": ["Radon measurement carried out", "Mechanical ventilation to the plant room"],
  "Structural failure or falling debris": [
    "Maintenance policy and condition survey",
    "Routine documented inspection",
    "Prompt repair or cordon off on discovery",
  ],
  // Reception and general
  "Aggressive or abusive customer behaviour": [
    "Conflict management training",
    "Panic alarm at the work position",
    "CCTV coverage of the area",
    "Incident reporting and post-incident support",
  ],
  "Robbery during cash handling": [
    "Cash counted away from public view",
    "Varied banking times and routes",
    "Safe with a drop slot",
  ],
  "Lone working at the front desk": [
    "Lone-worker check-in procedure",
    "No lone working after dark",
    "Panic alarm at the work position",
  ],
  "Display screen work at reception": [
    "Workstation assessment completed",
    "Task rotation to limit repeated exposure",
  ],
  "Slips on wet foyer floor in bad weather": [
    "Entrance matting of adequate length",
    "Wet-floor signage deployed at the point of hazard",
    "Prompt clean-up of spillages",
  ],
  "Fire in a public building": [
    "Fire risk assessment reviewed and actioned",
    "Wet-side evacuation procedure rehearsed",
    "Escape routes kept clear and checked on inspection",
    "Clear access maintained for emergency services",
  ],
  "Blocked escape routes": [
    "Escape routes kept clear and checked on inspection",
    "Routine documented inspection",
  ],
  "Working at height for maintenance": [
    "Work at height avoided or done from the ground where possible",
    "Permit to work for high-risk maintenance tasks",
    "Planned preventive maintenance schedule",
  ],
  "Contractor working without supervision or induction": [
    "Contractor induction signed before work starts",
    "Permit to work for high-risk maintenance tasks",
  ],
  "Inadequate first aid or AED provision": [
    "Staff first aid training kept current",
    "AED available on site with a known location",
    "First aid kit checks recorded",
    "Clear access maintained for emergency services",
  ],
  "Stress from workload and shift patterns": [
    "Rota published in advance with protected breaks",
    "Incident reporting and post-incident support",
  ],
};

export const CENTRES = [
  { name: "Bishopstown", code: "BT", address: "Bishopstown Sports Complex, Cork" },
  { name: "Hilltop Sports & Pool", code: "HT", address: "Beacon Road, Hilltop" },
  { name: "Riverside Leisure", code: "RS", address: "Mill Quay, Riverside" },
];

/**
 * The sample assessments. Deliberately spread across states so the register
 * always has something overdue, something due soon and something clean.
 */
export const ASSESSMENTS: {
  centreCode: string;
  template: string;
  title: string;
  status: "draft" | "in_review" | "signed_off";
  monthsAgo: number;
  cadence: number;
  scope: string;
}[] = [
  {
    centreCode: "BT",
    template: "Outdoor pitches",
    title: "Outdoor playing pitches",
    status: "signed_off",
    monthsAgo: 11.3,
    cadence: 12,
    scope:
      "All-weather and grass pitches, including spectator areas and access routes.",
  },
  {
    centreCode: "BT",
    template: "Poolside supervision",
    title: "Main pool bather supervision",
    status: "signed_off",
    monthsAgo: 13,
    cadence: 12,
    scope: "Supervision of bathers in the main pool, including rescue response.",
  },
  {
    centreCode: "BT",
    template: "Changing village",
    title: "Wet-side changing village",
    status: "signed_off",
    monthsAgo: 11.5,
    cadence: 12,
    scope: "Routine use and cleaning of the wet-side changing facilities.",
  },
  {
    centreCode: "HT",
    template: "Sports hall",
    title: "Sports hall and court hire",
    status: "in_review",
    monthsAgo: 14,
    cadence: 12,
    scope: "Court sports, equipment setup and hall hire activities.",
  },
  {
    centreCode: "HT",
    template: "Reception and front of house",
    title: "Reception desk duties",
    status: "signed_off",
    monthsAgo: 5.6,
    cadence: 6,
    scope: "Front desk duties including lone working and handling cash.",
  },
  {
    centreCode: "HT",
    template: "Pool plant room",
    title: "Pool plant and chemical handling",
    status: "in_review",
    monthsAgo: 4,
    cadence: 12,
    scope: "Handling, dosing and storage of pool treatment chemicals.",
  },
  {
    centreCode: "RS",
    template: "Soft play",
    title: "Soft play frame and sessions",
    status: "signed_off",
    monthsAgo: 2,
    cadence: 12,
    scope: "Supervised soft play sessions for under-eights.",
  },
  {
    centreCode: "RS",
    template: "Changing village",
    title: "Changing rooms and lockers",
    status: "signed_off",
    monthsAgo: 18,
    cadence: 12,
    scope: "Dry-side changing rooms, lockers and toilets.",
  },
  {
    centreCode: "RS",
    template: "Fitness suite",
    title: "Fitness suite",
    status: "draft",
    monthsAgo: 0,
    cadence: 12,
    scope: "Gym floor, free weights and resistance machines.",
  },
];

/**
 * Ratings by hazard. Deliberate rather than random: pool and chemical
 * hazards carry fatal severity at low likelihood, slips carry high
 * likelihood at moderate severity. That is what a real register looks like.
 */
export function ratingsFor(label: string): {
  likelihood: number;
  severity: number;
  residualLikelihood: number;
  residualSeverity: number;
} {
  const has = (...needles: string[]) =>
    needles.some((n) => label.toLowerCase().includes(n));

  // Fatal severity, but only credible at all with a lapse in control.
  const fatal = has("drowning", "cardiac", "fire in a public", "diving", "goal posts");
  // Fatal severity and genuinely rare — the ones that stay on the register
  // precisely because the consequence is unsurvivable.
  const rareFatal = has("chlorine", "radon");
  // Fatal, and the controls cannot bring it down until a survey is done: the
  // residual honestly stays in band 4.
  const surveyPending = has("structural");
  // Serious and survivable, and the controls only take them so far.
  const major = has("confined", "height", "electrical", "legionella", "acid splash", "first aid");
  const minor = has("display screen", "fungal", "litter", "broken glass");
  // High exposure, moderate consequence: the everyday injuries.
  const frequent = has("slip", "trip", "noise");

  // Initial → residual, chosen so the seeded register spans all five bands
  // and the escalation threshold (10) actually catches something.
  if (surveyPending) return t(4, 5, 3, 5); // 20 → 15, band 5 → 4, high risk
  if (fatal) return t(3, 5, 2, 5); // 15 → 10, band 4 → 3, needs an action
  if (rareFatal) return t(2, 5, 1, 5); // 10 → 5,  band 3 → 2
  if (major) return t(4, 4, 3, 4); // 16 → 12, band 4 → 3, needs an action
  if (frequent) return t(4, 3, 2, 3); // 12 → 6,  band 3 → 2
  if (minor) return t(3, 2, 1, 2); // 6  → 2,  band 2 → 1
  return t(3, 3, 2, 2); //             9  → 4,  band 2 → 1
}

function t(
  likelihood: number,
  severity: number,
  residualLikelihood: number,
  residualSeverity: number,
) {
  return { likelihood, severity, residualLikelihood, residualSeverity };
}

/** The action text for a finding that still sits at or above the threshold. */
export function actionFor(label: string): string {
  const l = label.toLowerCase();
  if (l.includes("drowning"))
    return "Re-run the zoned supervision assessment against current programme times.";
  if (l.includes("chlorine"))
    return "Commission gas detection in the plant room and record the alarm test.";
  if (l.includes("structural"))
    return "Book the five-year condition survey and circulate the report.";
  if (l.includes("cardiac"))
    return "Confirm AED response time from the furthest point of the gym floor.";
  if (l.includes("fire"))
    return "Rehearse the wet-side evacuation and record attendance.";
  if (l.includes("diving"))
    return "Reinstate depth numerals at the shallow end and check sightlines.";
  if (l.includes("goal posts"))
    return "Check and record goal post anchoring before every booking.";
  if (l.includes("acid splash"))
    return "Service the eyewash station and move it within reach of the dosing point.";
  if (l.includes("confined"))
    return "Issue the confined-space permit template and train two more operatives.";
  if (l.includes("electrical"))
    return "Bring forward the fixed wiring inspection and fit locks to the panel doors.";
  if (l.includes("legionella"))
    return "Close the gaps in the outlet temperature log and reinstate weekly flushing.";
  if (l.includes("first aid"))
    return "Time the AED response from the furthest point of the site and record it.";
  if (l.includes("height"))
    return "Replace the step ladder with a podium and record who is trained on it.";
  return `Review the controls recorded against “${label}” and close the gap.`;
}

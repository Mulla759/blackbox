import type { HouseholdRecord, Tier } from "./types";

const wave = (n = 32, peak = 0.8) =>
  Array.from({ length: n }, (_, i) =>
    Math.max(0.08, Math.abs(Math.sin(i * 0.7) * peak) * (0.6 + Math.random() * 0.4))
  );

export const HOUSEHOLDS: HouseholdRecord[] = [
  {
    household: {
      id: "hh-marcus",
      persona: {
        name: "Marcus Beale",
        age: 67,
        pronouns: "he/him",
        household: "Lives alone",
        oneLine: "Vent-dependent since '19. Knows his runtime to the minute.",
      },
      modality: "voice",
      language: "English",
      riskTier: 1,
      address: "412 Cypress Ln, Apt 3",
      zone: "Zone 4 — East Bay",
      equipment: [
        { kind: "ventilator", powered: true, runtimeMin: 92 },
        { kind: "oxygen", powered: false, runtimeMin: 360 },
      ],
      caregiver: "Daughter, 35min away",
    },
    state: {
      equipmentRuntimeMin: 92,
      mobility: "immobile",
      comprehensionConfidence: 0.96,
      distressSignals: ["audible fatigue", "shortened sentences"],
      isolationScore: 0.7,
      unmetNeeds: ["backup battery", "evac transport (wheelchair van)"],
      lastContactAt: "2026-05-02T14:08:00Z",
      location: "home",
    },
    decision: {
      tier: "critical",
      rationale:
        "Ventilator battery <2h. Grid down in Zone 4 with no restoration ETA. Patient is alert but immobile and alone.",
      nextCheckInAt: "2026-05-02T14:18:00Z",
      brief:
        "Marcus, 67, vent-dependent. 92 min battery. No caregiver on site. Needs wheelchair-accessible transport to Mercy Shelter (powered, generator-backed). Patient consents to transport.",
      predictedTimeToHarmMin: 92,
      alternatives: [
        {
          label: "Dispatch wheelchair van + EMT escort to Mercy Shelter",
          rationale:
            "Mercy has 14 powered beds open. Van #7 is 18 min out. Best risk-adjusted outcome.",
          eta: "18 min",
          cost: "medium",
          recommended: true,
        },
        {
          label: "Drop backup battery, leave in place",
          rationale:
            "Buys 6h. Doesn't solve isolation or potential cascade outage.",
          eta: "26 min",
          cost: "low",
        },
        {
          label: "Hold for caregiver arrival (35 min)",
          rationale:
            "Caregiver ETA exceeds safety margin. Not recommended.",
          eta: "35 min",
          cost: "low",
        },
      ],
    },
    transcript: [
      { speaker: "agent", text: "Marcus, it's Lifeline. Power's out across your block. How's your vent doing?", ts: "14:06", amplitude: wave(28, 0.6) },
      { speaker: "person", text: "On battery. Says ninety-two minutes.", ts: "14:06", amplitude: wave(20, 0.5) },
      { speaker: "agent", text: "Got it. Any chest tightness right now, on a scale of 1 to 10?", ts: "14:07", amplitude: wave(22, 0.6) },
      { speaker: "person", text: "Maybe a four. Tired.", ts: "14:07", amplitude: wave(14, 0.4) },
      { speaker: "agent", text: "Okay. I'm pulling a wheelchair van toward you, headed for Mercy Shelter. Eighteen minutes. That work?", ts: "14:08", amplitude: wave(30, 0.7) },
      { speaker: "person", text: "Yeah. Tell them about the vent.", ts: "14:08", amplitude: wave(16, 0.45) },
    ],
  },
  {
    household: {
      id: "hh-devon",
      persona: {
        name: "Devon Park",
        age: 29,
        pronouns: "they/them",
        household: "Lives with partner",
        oneLine: "Deaf, primary language ASL. Partner is hearing.",
      },
      modality: "asl-video",
      language: "ASL",
      riskTier: 2,
      address: "88 Harbor St",
      zone: "Zone 2 — Downtown",
      equipment: [],
      caregiver: "Partner on site",
    },
    state: {
      equipmentRuntimeMin: null,
      mobility: "independent",
      comprehensionConfidence: 0.99,
      distressSignals: [],
      isolationScore: 0.2,
      unmetNeeds: ["confirmation that shelter has VRI/interpreter"],
      lastContactAt: "2026-05-02T13:55:00Z",
      location: "home",
    },
    decision: {
      tier: "watch",
      rationale:
        "Mobile, partnered, no equipment. Wants to evacuate but needs confirmed ASL interpreter access at destination shelter.",
      nextCheckInAt: "2026-05-02T14:25:00Z",
      brief:
        "Devon, 29, Deaf. Mobile, partnered. Awaiting shelter interpreter confirmation before they'll leave. Pre-stage VRI tablet at Mercy.",
      alternatives: [
        {
          label: "Confirm VRI tablet at Mercy, send go-ahead",
          rationale: "Removes the only blocker. Devon has already packed.",
          eta: "5 min",
          cost: "low",
          recommended: true,
        },
        {
          label: "Hold, recheck in 20 min",
          rationale: "If conditions stable, Devon's plan is fine.",
          cost: "low",
        },
      ],
    },
    transcript: [
      { speaker: "agent", text: "[ASL relay] Storm front arriving 4pm. Mercy Shelter is open. Do you want to go?" , ts: "13:52" },
      { speaker: "person", text: "Yes — but only if there's an interpreter on site. Last time there wasn't." , ts: "13:53" },
      { speaker: "agent", text: "Confirming VRI tablet now. I'll text you the moment it's set up." , ts: "13:55" },
    ],
  },
  {
    household: {
      id: "hh-wendell",
      persona: {
        name: "Wendell Hayes",
        age: 71,
        pronouns: "he/him",
        household: "Lives alone",
        oneLine: "Reads at 3rd-grade level. Trusts plain, short messages.",
      },
      modality: "sms-low-literacy",
      language: "English (plain)",
      riskTier: 2,
      address: "201 Maple Ct",
      zone: "Zone 4 — East Bay",
      equipment: [{ kind: "insulin-pump", powered: true, runtimeMin: 1440 }],
      caregiver: null,
    },
    state: {
      equipmentRuntimeMin: 1440,
      mobility: "assisted",
      comprehensionConfidence: 0.91,
      distressSignals: [],
      isolationScore: 0.6,
      unmetNeeds: ["transport (no car)", "insulin refill in 36h"],
      lastContactAt: "2026-05-02T14:00:00Z",
      location: "home",
    },
    decision: {
      tier: "watch",
      rationale:
        "Comprehension confirmed at 3rd-grade level. Van scheduled for 3pm. Insulin window opens in 36h — flag for shelter pharmacy.",
      nextCheckInAt: "2026-05-02T14:30:00Z",
      brief:
        "Wendell, 71, low literacy, insulin pump. Van #3 booked 15:00. Flag Mercy pharmacy for insulin refill within 36h.",
      alternatives: [
        {
          label: "Confirm van + pre-flag pharmacy",
          rationale: "Plan is working. One small handoff to add.",
          recommended: true,
          cost: "low",
        },
      ],
    },
    transcript: [
      { speaker: "agent", text: "Big storm. You need to leave. A van is coming at 3pm. Pack medicine. I will help.", ts: "13:58" },
      { speaker: "person", text: "ok. what time?", ts: "13:59" },
      { speaker: "agent", text: "3 pm. Two hours. I will text again at 2 pm.", ts: "14:00" },
      { speaker: "person", text: "ok thank you", ts: "14:00" },
    ],
  },
  {
    household: {
      id: "hh-mai",
      persona: {
        name: "Mai Vang",
        age: 78,
        pronouns: "she/her",
        household: "Lives with grandson",
        oneLine: "Hmong-speaking. Slower cadence. Grandson translates inconsistently.",
      },
      modality: "voice-translated",
      language: "Hmong",
      riskTier: 2,
      address: "1140 Birch Rd",
      zone: "Zone 5 — North",
      equipment: [{ kind: "cpap", powered: true, runtimeMin: 480 }],
      caregiver: "Grandson, on site",
    },
    state: {
      equipmentRuntimeMin: 480,
      mobility: "assisted",
      comprehensionConfidence: 0.88,
      distressSignals: [],
      isolationScore: 0.4,
      unmetNeeds: [],
      lastContactAt: "2026-05-02T13:40:00Z",
      location: "home",
    },
    decision: {
      tier: "stable",
      rationale:
        "Storm path moved north of Zone 5. CPAP has 8h runtime. Grandson present. Next check in 2h.",
      nextCheckInAt: "2026-05-02T15:40:00Z",
      brief: "Mai, 78. Stable. Recheck in 2h.",
      alternatives: [],
    },
    transcript: [
      { speaker: "agent", text: "[Hmong, slow cadence] Storm is moving away from your area. Are you and your grandson okay?", ts: "13:39" },
      { speaker: "person", text: "Yes. We are okay. Thank you for calling." , ts: "13:40" },
    ],
  },
  {
    household: {
      id: "hh-rosa",
      persona: {
        name: "Rosa Delgado",
        age: 54,
        pronouns: "she/her",
        household: "Lives with son (7)",
        oneLine: "Dialysis 3x/week. Next session tomorrow.",
      },
      modality: "voice-translated",
      language: "Spanish",
      riskTier: 1,
      address: "78 Ash Ave",
      zone: "Zone 3 — South",
      equipment: [{ kind: "dialysis", powered: false, runtimeMin: null }],
      caregiver: null,
    },
    state: {
      equipmentRuntimeMin: null,
      mobility: "independent",
      comprehensionConfidence: 0.95,
      distressSignals: ["worry about son"],
      isolationScore: 0.5,
      unmetNeeds: ["dialysis center status", "child-friendly shelter"],
      lastContactAt: "2026-05-02T13:30:00Z",
      location: "home",
    },
    decision: {
      tier: "critical",
      rationale:
        "Dialysis center on Pine St lost power. Rosa's session is in 18h — missing it puts her in medical emergency by 36h.",
      nextCheckInAt: "2026-05-02T14:15:00Z",
      brief:
        "Rosa, 54, dialysis tomorrow AM. Pine St center down. Reroute to St. Luke's (open, generator). Confirm transport + childcare for son.",
      predictedTimeToHarmMin: 36 * 60,
      alternatives: [
        {
          label: "Reroute to St. Luke's + family-friendly shelter",
          rationale: "St. Luke's confirmed open. Mercy has family bunks.",
          recommended: true,
          eta: "n/a (tomorrow 8am)",
          cost: "medium",
        },
        {
          label: "Wait for Pine St restoration",
          rationale: "Utility ETA is 'unknown.' Risk too high.",
          cost: "low",
        },
      ],
    },
    transcript: [
      { speaker: "agent", text: "[Spanish] Rosa, the Pine St dialysis center lost power. We're moving you to St. Luke's tomorrow. Same time.", ts: "13:28" },
      { speaker: "person", text: "[Spanish] Okay. What about Mateo? He can't stay alone." , ts: "13:29" },
      { speaker: "agent", text: "[Spanish] Mercy Shelter has a family room. He goes with you. I'll arrange the ride.", ts: "13:30" },
    ],
  },
  {
    household: {
      id: "hh-james",
      persona: {
        name: "James Okafor",
        age: 41,
        pronouns: "he/him",
        household: "Lives alone",
        oneLine: "Powered wheelchair user. Independent — values autonomy.",
      },
      modality: "voice",
      language: "English",
      riskTier: 2,
      address: "55 Elm St",
      zone: "Zone 2 — Downtown",
      equipment: [{ kind: "powered-wheelchair", powered: true, runtimeMin: 600 }],
      caregiver: null,
    },
    state: {
      equipmentRuntimeMin: 600,
      mobility: "assisted",
      comprehensionConfidence: 0.99,
      distressSignals: [],
      isolationScore: 0.3,
      unmetNeeds: [],
      lastContactAt: "2026-05-02T14:01:00Z",
      location: "shelter",
    },
    decision: {
      tier: "stable",
      rationale: "Self-evacuated to Mercy at 13:30. Chair charging. Alert and oriented.",
      nextCheckInAt: "2026-05-02T16:01:00Z",
      brief: "James — at Mercy, chair charging. Stable.",
      alternatives: [],
    },
    transcript: [
      { speaker: "agent", text: "Made it to Mercy okay?", ts: "14:00" },
      { speaker: "person", text: "Yep. Charger's plugged in. I'm good.", ts: "14:01" },
    ],
  },
  {
    household: {
      id: "hh-pat",
      persona: {
        name: "Patricia 'Pat' Munro",
        age: 82,
        pronouns: "she/her",
        household: "Widowed",
        oneLine: "Recovering from hip surgery. Daughter checks in by phone.",
      },
      modality: "voice",
      language: "English",
      riskTier: 3,
      address: "9 Larch Pl",
      zone: "Zone 1 — West",
      equipment: [],
      caregiver: "Daughter, daily call",
    },
    state: {
      equipmentRuntimeMin: null,
      mobility: "assisted",
      comprehensionConfidence: 0.93,
      distressSignals: [],
      isolationScore: 0.55,
      unmetNeeds: [],
      lastContactAt: "2026-05-02T11:00:00Z",
      location: "home",
    },
    decision: {
      tier: "recovery",
      rationale:
        "Storm passed Zone 1. Day 6 post-event. Watching for med adherence + isolation drift.",
      nextCheckInAt: "2026-05-03T11:00:00Z",
      brief: "Pat — recovery cadence. Day 6. Sleeping well, taking meds. Daughter engaged.",
      alternatives: [],
    },
    transcript: [
      { speaker: "agent", text: "Hi Pat, just checking in. Sleeping any better?", ts: "10:58" },
      { speaker: "person", text: "Some. Hip's still sore but I'm getting around.", ts: "10:59" },
      { speaker: "agent", text: "Good. Any trouble getting your prescription this week?", ts: "11:00" },
      { speaker: "person", text: "No, daughter picked it up Tuesday.", ts: "11:00" },
    ],
  },
  {
    household: {
      id: "hh-tomas",
      persona: {
        name: "Tomás Reyes",
        age: 59,
        pronouns: "he/him",
        household: "Caregiver to wife (Alzheimer's)",
        oneLine: "Primary caregiver. Watch for caregiver burnout signals.",
      },
      modality: "voice-translated",
      language: "Spanish",
      riskTier: 2,
      address: "33 Pine Ridge",
      zone: "Zone 3 — South",
      equipment: [],
      caregiver: "Self (caregiver to wife)",
    },
    state: {
      equipmentRuntimeMin: null,
      mobility: "independent",
      comprehensionConfidence: 0.97,
      distressSignals: ["fatigue", "short answers"],
      isolationScore: 0.75,
      unmetNeeds: ["respite", "wife's prescription refill"],
      lastContactAt: "2026-05-02T09:30:00Z",
      location: "home",
    },
    decision: {
      tier: "recovery",
      rationale:
        "Day 9 post-event. Caregiver fatigue signals rising. Schedule respite volunteer + pharmacy delivery.",
      nextCheckInAt: "2026-05-03T09:30:00Z",
      brief:
        "Tomás — caregiver burnout watch. Schedule respite volunteer Friday. Pharmacy delivery for wife's meds.",
      alternatives: [
        {
          label: "Schedule respite volunteer + pharmacy delivery",
          rationale: "Reduces load on Tomás before he tips into crisis.",
          recommended: true,
          cost: "low",
        },
      ],
    },
    transcript: [
      { speaker: "agent", text: "[Spanish] Tomás, how are YOU doing? Not Elena — you.", ts: "09:28" },
      { speaker: "person", text: "[Spanish] Tired. I'm okay. Just tired." , ts: "09:30" },
    ],
  },
  {
    household: {
      id: "hh-sade",
      persona: {
        name: "Sade Williams",
        age: 36,
        pronouns: "she/her",
        household: "Lives with two kids",
        oneLine: "Type 1 diabetic. Insulin pump + supplies on hand.",
      },
      modality: "sms-low-literacy",
      language: "English",
      riskTier: 3,
      address: "67 Cedar Way",
      zone: "Zone 5 — North",
      equipment: [{ kind: "insulin-pump", powered: true, runtimeMin: 2880 }],
      caregiver: null,
    },
    state: {
      equipmentRuntimeMin: 2880,
      mobility: "independent",
      comprehensionConfidence: 0.99,
      distressSignals: [],
      isolationScore: 0.2,
      unmetNeeds: [],
      lastContactAt: "2026-05-02T13:50:00Z",
      location: "home",
    },
    decision: {
      tier: "stable",
      rationale: "Storm path moved north. Sade has 48h supplies and is mobile. Standard cadence.",
      nextCheckInAt: "2026-05-02T17:50:00Z",
      brief: "Sade — stable. Recheck in 4h.",
      alternatives: [],
    },
    transcript: [
      { speaker: "agent", text: "Storm moved north. You and the kids okay?", ts: "13:49" },
      { speaker: "person", text: "all good", ts: "13:50" },
    ],
  },
  {
    household: {
      id: "hh-walter",
      persona: {
        name: "Walter Kim",
        age: 73,
        pronouns: "he/him",
        household: "Lives alone",
        oneLine: "Hard of hearing. TTY user. Stoic — under-reports symptoms.",
      },
      modality: "tty",
      language: "English",
      riskTier: 1,
      address: "200 Hill Rd",
      zone: "Zone 4 — East Bay",
      equipment: [{ kind: "oxygen", powered: true, runtimeMin: 240 }],
      caregiver: null,
    },
    state: {
      equipmentRuntimeMin: 240,
      mobility: "assisted",
      comprehensionConfidence: 0.85,
      distressSignals: ["delayed responses"],
      isolationScore: 0.85,
      unmetNeeds: ["welfare check confirmation"],
      lastContactAt: "2026-05-02T13:15:00Z",
      location: "home",
    },
    decision: {
      tier: "watch",
      rationale:
        "Walter under-reports. Delayed TTY responses + isolation score climbing. Tighten cadence; pre-stage neighbor welfare check.",
      nextCheckInAt: "2026-05-02T14:15:00Z",
      brief:
        "Walter — TTY user, stoic. Pre-stage neighbor welfare check via Zone 4 captain. Recheck in 60 min.",
      alternatives: [
        {
          label: "Tighten cadence to 30 min + neighbor welfare check on standby",
          rationale: "Walter won't ask for help. Watch closely without overreacting.",
          recommended: true,
          cost: "low",
        },
      ],
    },
    transcript: [
      { speaker: "agent", text: "Walter, how's the oxygen holding?", ts: "13:14" },
      { speaker: "person", text: "FINE", ts: "13:15" },
    ],
  },
  {
    household: {
      id: "hh-elena",
      persona: {
        name: "Elena Park",
        age: 24,
        pronouns: "she/her",
        household: "Lives with roommate",
        oneLine: "Anxiety + PTSD. Storm triggers acute episodes.",
      },
      modality: "voice",
      language: "English",
      riskTier: 3,
      address: "12 Riverside",
      zone: "Zone 2 — Downtown",
      equipment: [],
      caregiver: "Roommate on site",
    },
    state: {
      equipmentRuntimeMin: null,
      mobility: "independent",
      comprehensionConfidence: 0.92,
      distressSignals: ["fast speech", "panic register"],
      isolationScore: 0.3,
      unmetNeeds: ["calming script", "telehealth referral"],
      lastContactAt: "2026-05-02T14:05:00Z",
      location: "home",
    },
    decision: {
      tier: "watch",
      rationale:
        "Acute anxiety, not life-threatening. Roommate present. Stay on the call until breathing settles.",
      nextCheckInAt: "2026-05-02T14:35:00Z",
      brief: "Elena — panic episode, partner present. Stay on line. Telehealth on standby.",
      alternatives: [
        {
          label: "Stay on call + telehealth referral",
          rationale: "Human contact is the intervention. Telehealth ready if it escalates.",
          recommended: true,
          cost: "low",
        },
      ],
    },
    transcript: [
      { speaker: "agent", text: "Elena, I'm here. Storm sound is loud — you safe inside?", ts: "14:03" },
      { speaker: "person", text: "Yeah. I just — I can't slow down.", ts: "14:04" },
      { speaker: "agent", text: "Okay. Breathe with me. Four in, six out. I'll count.", ts: "14:05" },
    ],
  },
];

export const findHousehold = (id: string) =>
  HOUSEHOLDS.find((h) => h.household.id === id);

export const byTier = (tier: Tier) =>
  HOUSEHOLDS.filter((h) => h.decision.tier === tier);

export const tierCounts = () =>
  HOUSEHOLDS.reduce<Record<Tier, number>>(
    (acc, h) => {
      acc[h.decision.tier] += 1;
      return acc;
    },
    { stable: 0, watch: 0, critical: 0, recovery: 0 }
  );

/** Default household for the /me single-user demo. Marcus is the strongest narrative. */
export const DEFAULT_ME_ID = "hh-marcus";

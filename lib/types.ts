export type Tier = "stable" | "watch" | "critical" | "recovery";

export type Modality =
  | "voice"
  | "sms-low-literacy"
  | "asl-video"
  | "voice-translated"
  | "tty";

export type Mobility = "independent" | "assisted" | "immobile";

export type Equipment = {
  kind: "ventilator" | "oxygen" | "powered-wheelchair" | "dialysis" | "insulin-pump" | "cpap";
  powered: boolean;
  runtimeMin: number | null;
};

export type Persona = {
  name: string;
  age: number;
  pronouns: string;
  household: string;
  oneLine: string;
};

export type Household = {
  id: string;
  persona: Persona;
  modality: Modality;
  language: string;
  riskTier: 1 | 2 | 3;
  address: string;
  zone: string;
  equipment: Equipment[];
  caregiver?: string | null;
};

export type StateVector = {
  equipmentRuntimeMin: number | null;
  mobility: Mobility;
  comprehensionConfidence: number;
  distressSignals: string[];
  isolationScore: number;
  unmetNeeds: string[];
  lastContactAt: string;
  location: "home" | "shelter" | "in-transit" | "unknown";
};

export type Action = {
  label: string;
  rationale: string;
  eta?: string;
  cost?: "low" | "medium" | "high";
  recommended?: boolean;
};

export type AgentDecision = {
  tier: Tier;
  rationale: string;
  nextCheckInAt: string;
  brief: string;
  alternatives: Action[];
  predictedTimeToHarmMin?: number;
};

export type CheckInTurn = {
  speaker: "agent" | "person";
  text: string;
  ts: string;
  /** for voice modality, an indicative waveform amplitude per turn */
  amplitude?: number[];
};

export type HouseholdRecord = {
  household: Household;
  state: StateVector;
  decision: AgentDecision;
  transcript: CheckInTurn[];
};

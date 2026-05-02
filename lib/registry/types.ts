export type RegisteredContact = {
  id: string;
  phone_number: string;
  label?: string;
  /** Free text, e.g. "Minneapolis, MN" or "MN" — used for location-based broadcasts. */
  location: string;
  age?: number;
  disability?: string;
  preferred_language?: string;
  emergency_contact_phone?: string;
  latitude?: number;
  longitude?: number;
  communication_preferences?: {
    modality?: "sms" | "voice" | "both" | "asl_video";
    cadence?: "standard" | "slow" | "urgent";
  };
  /** Static path under /public for dashboard cards. */
  avatar_url?: string;
  /** Demo script: who runs the full SMS → voice kickoff. */
  demo_lane?: "kickoff" | "live_clear" | "follow_up";
  /** Short presenter instructions (keypad). */
  demo_presenter_cue?: string;
};

export type PersonProfile = RegisteredContact;

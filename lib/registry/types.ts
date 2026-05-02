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
};

export type PersonProfile = RegisteredContact;

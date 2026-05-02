export type RegisteredContact = {
  id: string;
  phone_number: string;
  label?: string;
  /** Free text, e.g. "Minneapolis, MN" or "MN" — used for location-based broadcasts. */
  location: string;
};

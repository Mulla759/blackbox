/**
 * Standard outbound copy when a disaster event triggers outreach.
 */
export function buildEmergencyAlertBody(eventName: string): string {
  const event = eventName.trim() || "An emergency";
  return `Emergency alert: ${event} in your area. Reply 1 if safe, 2 if need help, 3 for emergency.`;
}

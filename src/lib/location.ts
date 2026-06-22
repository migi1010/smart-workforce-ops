/**
 * Calculates the geodistance in meters between two coordinate points using the Haversine formula.
 */
export function haversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in meters
}

export type LocationStatus = "NORMAL" | "SUSPICIOUS" | "BLOCKED" | "LOCATION_DENIED";

/**
 * Evaluates the check-in event location status based on distance and radiuses.
 */
export function evaluateLocationStatus(
  distance: number | null | undefined,
  allowedRadius: number,
  warningRadius: number
): LocationStatus {
  if (distance === null || distance === undefined) {
    return "LOCATION_DENIED";
  }

  if (distance <= allowedRadius) {
    return "NORMAL";
  }

  if (distance > allowedRadius && distance <= warningRadius) {
    return "SUSPICIOUS";
  }

  return "BLOCKED";
}

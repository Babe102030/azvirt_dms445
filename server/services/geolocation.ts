/**
 * Geolocation Service
 * Handles GPS verification, geofence validation, and location logging
 */

/**
 * Calculate distance between two GPS coordinates using Haversine formula
 * Returns distance in meters
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Convert degrees to radians
 */
function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Check if a point is within a circular geofence
 */
export function isWithinCircularGeofence(
  userLat: number,
  userLon: number,
  centerLat: number,
  centerLon: number,
  radiusMeters: number
): boolean {
  const distance = calculateDistance(userLat, userLon, centerLat, centerLon);
  return distance <= radiusMeters;
}

/**
 * Calculate distance from point to circular geofence boundary
 * Negative = inside, positive = outside
 */
export function distanceToGeofence(
  userLat: number,
  userLon: number,
  centerLat: number,
  centerLon: number,
  radiusMeters: number
): number {
  const distance = calculateDistance(userLat, userLon, centerLat, centerLon);
  return distance - radiusMeters;
}

/**
 * Check if a point is within a polygon geofence using ray casting algorithm
 */
export function isWithinPolygonGeofence(
  userLat: number,
  userLon: number,
  polygonCoordinates: Array<{ lat: number; lng: number }>
): boolean {
  if (polygonCoordinates.length < 3) return false;

  let isInside = false;
  let j = polygonCoordinates.length - 1;

  for (let i = 0; i < polygonCoordinates.length; j = i++) {
    const xi = polygonCoordinates[i].lng;
    const yi = polygonCoordinates[i].lat;
    const xj = polygonCoordinates[j].lng;
    const yj = polygonCoordinates[j].lat;

    const intersect =
      yi > userLon !== yj > userLon &&
      userLat < ((xj - xi) * (userLon - yi)) / (yj - yi) + xi;
    if (intersect) isInside = !isInside;
  }

  return isInside;
}

/**
 * Validate GPS accuracy
 * Returns true if accuracy is acceptable (< 50 meters for most use cases)
 */
export function isGPSAccuracyAcceptable(
  accuracyMeters: number | undefined,
  threshold: number = 50
): boolean {
  if (!accuracyMeters) return false;
  return accuracyMeters <= threshold;
}

/**
 * Validate GPS coordinates
 */
export function isValidGPSCoordinate(
  latitude: number,
  longitude: number
): boolean {
  return (
    typeof latitude === "number" &&
    typeof longitude === "number" &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

/**
 * Check if location is suspicious (too far traveled in too short time)
 */
export function isSuspiciousLocation(
  prevLat: number,
  prevLon: number,
  currentLat: number,
  currentLon: number,
  timeDiffSeconds: number,
  maxSpeedMPS: number = 50 // ~180 km/h
): boolean {
  const distance = calculateDistance(prevLat, prevLon, currentLat, currentLon);
  const requiredTime = distance / maxSpeedMPS;
  return requiredTime > timeDiffSeconds;
}

/**
 * Format location for logging
 */
export function formatLocationLog(
  latitude: number,
  longitude: number,
  accuracy?: number
): string {
  return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}${
    accuracy ? ` (±${accuracy}m)` : ""
  }`;
}

/**
 * Generate geofence violation alert message
 */
export function generateViolationMessage(
  employeeName: string,
  jobSiteName: string,
  distanceMeters: number,
  eventType: "check_in" | "check_out"
): string {
  const action = eventType === "check_in" ? "checked in" : "checked out";
  return `${employeeName} ${action} at ${jobSiteName} but was ${distanceMeters}m outside the geofence`;
}

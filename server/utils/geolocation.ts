/**
 * Haversine Formula Implementation
 * Calculates the great-circle distance between two points on Earth
 * given their latitudes and longitudes.
 */

/**
 * Calculate distance between two geographic coordinates
 * @param lat1 Latitude of point 1 in degrees (-90 to 90)
 * @param lon1 Longitude of point 1 in degrees (-180 to 180)
 * @param lat2 Latitude of point 2 in degrees (-90 to 90)
 * @param lon2 Longitude of point 2 in degrees (-180 to 180)
 * @returns Distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in kilometers
}

/**
 * Check if a location is within a geofence radius
 * @param employeeLat Employee's latitude
 * @param employeeLon Employee's longitude
 * @param siteLat Site center latitude
 * @param siteLon Site center longitude
 * @param radiusKm Geofence radius in kilometers
 * @returns true if employee is within geofence, false otherwise
 */
export function isWithinGeofence(
  employeeLat: number,
  employeeLon: number,
  siteLat: number,
  siteLon: number,
  radiusKm: number
): boolean {
  const distance = calculateDistance(
    employeeLat,
    employeeLon,
    siteLat,
    siteLon
  );
  return distance <= radiusKm;
}

/**
 * Convert meters to kilometers
 */
export function metersToKilometers(meters: number): number {
  return meters / 1000;
}

/**
 * Convert kilometers to meters
 */
export function kilometersToMeters(kilometers: number): number {
  return kilometers * 1000;
}

/**
 * Validate GPS coordinates
 * @param latitude Latitude to validate
 * @param longitude Longitude to validate
 * @returns true if coordinates are valid
 */
export function isValidCoordinate(latitude: number, longitude: number): boolean {
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
 * Get bearing (direction) from one point to another
 * @param lat1 Starting latitude
 * @param lon1 Starting longitude
 * @param lat2 Ending latitude
 * @param lon2 Ending longitude
 * @returns Bearing in degrees (0-360)
 */
export function getBearing(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const y = Math.sin(dLon) * Math.cos(lat2 * (Math.PI / 180));
  const x =
    Math.cos(lat1 * (Math.PI / 180)) * Math.sin(lat2 * (Math.PI / 180)) -
    Math.sin(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.cos(dLon);
  const bearing = (Math.atan2(y, x) * 180) / Math.PI;
  return (bearing + 360) % 360; // Normalize to 0-360
}

/**
 * Calculate midpoint between two coordinates
 * @param lat1 First latitude
 * @param lon1 First longitude
 * @param lat2 Second latitude
 * @param lon2 Second longitude
 * @returns Midpoint as [latitude, longitude]
 */
export function getMidpoint(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): [number, number] {
  const lat1Rad = lat1 * (Math.PI / 180);
  const lon1Rad = lon1 * (Math.PI / 180);
  const lat2Rad = lat2 * (Math.PI / 180);
  const lon2Rad = lon2 * (Math.PI / 180);

  const Bx = Math.cos(lat2Rad) * Math.cos(lon2Rad - lon1Rad);
  const By = Math.cos(lat2Rad) * Math.sin(lon2Rad - lon1Rad);

  const latMid = Math.atan2(
    Math.sin(lat1Rad) + Math.sin(lat2Rad),
    Math.sqrt(
      (Math.cos(lat1Rad) + Bx) * (Math.cos(lat1Rad) + Bx) + By * By
    )
  );
  const lonMid = lon1Rad + Math.atan2(By, Math.cos(lat1Rad) + Bx);

  return [latMid * (180 / Math.PI), lonMid * (180 / Math.PI)];
}

/**
 * Check if accuracy is acceptable for geofencing
 * @param accuracyMeters GPS accuracy in meters
 * @param thresholdMeters Maximum acceptable accuracy threshold in meters
 * @returns true if accuracy is good enough
 */
export function isAcceptableAccuracy(
  accuracyMeters: number,
  thresholdMeters: number = 50
): boolean {
  return accuracyMeters <= thresholdMeters;
}

/**
 * Format distance for display
 * @param distanceKm Distance in kilometers
 * @returns Formatted string (e.g., "1.5 km" or "500 m")
 */
export function formatDistance(distanceKm: number): string {
  if (distanceKm < 0.001) {
    return "< 1 m";
  }
  if (distanceKm < 1) {
    const meters = Math.round(distanceKm * 1000);
    return `${meters} m`;
  }
  return `${distanceKm.toFixed(2)} km`;
}

/**
 * Get geofence status with human-readable message
 */
export interface GeofenceStatus {
  withinGeofence: boolean;
  distance: number;
  message: string;
  percentageInside: number;
}

export function getGeofenceStatus(
  distanceKm: number,
  radiusKm: number
): GeofenceStatus {
  const withinGeofence = distanceKm <= radiusKm;
  const percentageInside = Math.max(0, 100 - (distanceKm / radiusKm) * 100);

  let message: string;
  if (withinGeofence) {
    message = `Inside geofence (${formatDistance(distanceKm)} from center)`;
  } else {
    const overflow = distanceKm - radiusKm;
    message = `Outside geofence by ${formatDistance(overflow)}`;
  }

  return {
    withinGeofence,
    distance: distanceKm,
    message,
    percentageInside,
  };
}

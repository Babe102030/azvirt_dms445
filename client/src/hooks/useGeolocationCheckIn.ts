import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";

export interface GeolocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

export interface UseGeolocationCheckInReturn {
  location: GeolocationData | null;
  loading: boolean;
  error: string | null;
  requestLocation: () => Promise<GeolocationData | null>;
  clearLocation: () => void;
}

/**
 * React hook for accessing device geolocation
 * Handles permission requests, error handling, and location updates
 *
 * @returns Object containing location data, loading state, error, and control functions
 *
 * @example
 * const { location, loading, error, requestLocation } = useGeolocationCheckIn();
 *
 * const handleCheckIn = async () => {
 *   const geoData = await requestLocation();
 *   if (geoData) {
 *     // Send to server
 *   }
 * };
 */
export function useGeolocationCheckIn(): UseGeolocationCheckInReturn {
  const [location, setLocation] = useState<GeolocationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearLocation = useCallback(() => {
    setLocation(null);
    setError(null);
  }, []);

  const requestLocation = useCallback(async (): Promise<GeolocationData | null> => {
    setLoading(true);
    setError(null);

    return new Promise<GeolocationData | null>((resolve) => {
      // Check browser support
      if (!navigator.geolocation) {
        const errorMsg =
          "Geolocation is not supported by your browser. Please use a modern browser (Chrome, Firefox, Safari, Edge).";
        setError(errorMsg);
        toast.error(errorMsg);
        setLoading(false);
        resolve(null);
        return;
      }

      // Request current position with high accuracy
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const data: GeolocationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
          };

          setLocation(data);
          setError(null);
          setLoading(false);

          // Log for debugging
          console.debug(
            `[Geolocation] Position acquired: ${data.latitude.toFixed(6)}, ${data.longitude.toFixed(6)} (±${data.accuracy.toFixed(0)}m)`
          );

          resolve(data);
        },
        (err) => {
          let errorMsg = "Failed to get location";
          let shouldShowToast = true;

          switch (err.code) {
            case 1: // PERMISSION_DENIED
              errorMsg =
                "Location access denied. Please enable location permissions:\n\n" +
                "1. Click the lock icon in your address bar\n" +
                "2. Select 'Site Settings'\n" +
                "3. Allow location access\n" +
                "4. Reload the page";
              break;

            case 2: // POSITION_UNAVAILABLE
              errorMsg =
                "Location data is unavailable. Please ensure:\n\n" +
                "• GPS/Location services are enabled on your device\n" +
                "• You are outdoors or near a window\n" +
                "• Your browser has location permissions";
              break;

            case 3: // TIMEOUT
              errorMsg =
                "Location request timed out (exceeded 10 seconds). Please:\n\n" +
                "• Ensure location services are enabled\n" +
                "• Move to a location with better GPS signal\n" +
                "• Try again in a moment";
              break;

            default:
              errorMsg = `Unknown location error: ${err.message}`;
          }

          setError(errorMsg);
          setLoading(false);

          if (shouldShowToast) {
            toast.error(errorMsg);
          }

          console.error(`[Geolocation] Error: ${err.code} - ${err.message}`);
          resolve(null);
        },
        {
          // Request high accuracy (uses GPS instead of network)
          enableHighAccuracy: true,
          // Maximum time to wait for location (10 seconds)
          timeout: 10000,
          // Don't use cached position (always get fresh data)
          maximumAge: 0,
        }
      );
    });
  }, []);

  return {
    location,
    loading,
    error,
    requestLocation,
    clearLocation,
  };
}

/**
 * Alternative hook that continuously watches location
 * Useful for real-time tracking scenarios
 */
export function useLocationWatch(
  onLocationChange?: (location: GeolocationData) => void,
  onError?: (error: string) => void
) {
  const [location, setLocation] = useState<GeolocationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [watching, setWatching] = useState(false);

  const startWatching = useCallback(() => {
    if (!navigator.geolocation) {
      const errorMsg = "Geolocation not supported";
      setError(errorMsg);
      onError?.(errorMsg);
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const data: GeolocationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
        };

        setLocation(data);
        setError(null);
        onLocationChange?.(data);
      },
      (err) => {
        const errorMsg = `Location watch error: ${err.message}`;
        setError(errorMsg);
        onError?.(errorMsg);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000, // Update every 5 seconds max
      }
    );

    setWatching(true);

    return () => {
      navigator.geolocation.clearWatch(watchId);
      setWatching(false);
    };
  }, [onLocationChange, onError]);

  const stopWatching = useCallback(() => {
    setWatching(false);
  }, []);

  return {
    location,
    error,
    watching,
    startWatching,
    stopWatching,
  };
}

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, MapPin, CheckCircle, AlertTriangle, Loader2 } from "lucide-react";

interface GeolocationCheckInProps {
  jobSiteId: number;
  jobSiteName: string;
  geofenceRadius: number;
  onCheckIn: (latitude: number, longitude: number, accuracy?: number) => Promise<void>;
  onCheckOut?: (latitude: number, longitude: number, accuracy?: number) => Promise<void>;
  isCheckedIn?: boolean;
}

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: Date;
}

export function GeolocationCheckIn({
  jobSiteId,
  jobSiteName,
  geofenceRadius,
  onCheckIn,
  onCheckOut,
  isCheckedIn = false,
}: GeolocationCheckInProps) {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isWithinGeofence, setIsWithinGeofence] = useState(false);
  const [distanceFromGeofence, setDistanceFromGeofence] = useState<number | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);

  // Request GPS location
  const requestLocation = () => {
    setLoading(true);
    setError(null);

    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        const newLocation: LocationData = {
          latitude,
          longitude,
          accuracy: accuracy || undefined,
          timestamp: new Date(),
        };
        setLocation(newLocation);
        setGpsAccuracy(accuracy);

        // Check if accuracy is acceptable (< 50 meters)
        if (accuracy > 50) {
          setError(`GPS accuracy is ${Math.round(accuracy)}m. Please try again in an open area.`);
        }

        setLoading(false);
      },
      (err) => {
        let errorMessage = "Unable to get your location";
        switch (err.code) {
          case err.PERMISSION_DENIED:
            errorMessage = "Location permission denied. Please enable location access.";
            break;
          case err.POSITION_UNAVAILABLE:
            errorMessage = "Location information is unavailable.";
            break;
          case err.TIMEOUT:
            errorMessage = "Location request timed out.";
            break;
        }
        setError(errorMessage);
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  // Handle check-in
  const handleCheckIn = async () => {
    if (!location) {
      setError("Please get your location first");
      return;
    }

    setLoading(true);
    try {
      await onCheckIn(location.latitude, location.longitude, location.accuracy);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Check-in failed");
    } finally {
      setLoading(false);
    }
  };

  // Handle check-out
  const handleCheckOut = async () => {
    if (!location) {
      setError("Please get your location first");
      return;
    }

    if (!onCheckOut) {
      setError("Check-out is not available");
      return;
    }

    setLoading(true);
    try {
      await onCheckOut(location.latitude, location.longitude, location.accuracy);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Check-out failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          GPS Check-In
        </CardTitle>
        <CardDescription>{jobSiteName}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Geofence Status */}
        {location && (
          <div className="space-y-2">
            <div className="text-sm font-medium">Geofence Status</div>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
              {isWithinGeofence ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="text-sm text-green-600">Within geofence ({geofenceRadius}m)</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  <span className="text-sm text-yellow-600">
                    Outside geofence by {distanceFromGeofence}m
                  </span>
                </>
              )}
            </div>
          </div>
        )}

        {/* GPS Accuracy */}
        {gpsAccuracy !== null && (
          <div className="text-sm text-muted-foreground">
            GPS Accuracy: ±{Math.round(gpsAccuracy)}m
            {gpsAccuracy > 50 && (
              <span className="text-yellow-600 ml-2">(Consider moving to open area)</span>
            )}
          </div>
        )}

        {/* Location Display */}
        {location && (
          <div className="text-sm space-y-1 p-3 rounded-lg bg-muted">
            <div>Latitude: {location.latitude.toFixed(6)}</div>
            <div>Longitude: {location.longitude.toFixed(6)}</div>
            <div className="text-xs text-muted-foreground">
              {location.timestamp.toLocaleTimeString()}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4">
          <Button
            variant="outline"
            onClick={requestLocation}
            disabled={loading}
            className="flex-1"
          >
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {loading ? "Getting Location..." : "Get Location"}
          </Button>

          {!isCheckedIn ? (
            <Button
              onClick={handleCheckIn}
              disabled={!location || loading}
              className="flex-1"
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Check In
            </Button>
          ) : (
            <Button
              onClick={handleCheckOut}
              disabled={!location || !onCheckOut || loading}
              variant="destructive"
              className="flex-1"
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Check Out
            </Button>
          )}
        </div>

        {/* Info Text */}
        <div className="text-xs text-muted-foreground pt-2">
          For accurate check-in, please be within {geofenceRadius}m of the job site.
          GPS accuracy must be better than 50m.
        </div>
      </CardContent>
    </Card>
  );
}

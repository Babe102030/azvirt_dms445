"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Info } from "lucide-react";

interface ProjectSiteMapProps {
  siteLat: number;
  siteLon: number;
  siteName: string;
  radiusKm: number;
  userLat?: number;
  userLon?: number;
  googleMapsApiKey?: string;
}

/**
 * ProjectSiteMap Component
 *
 * Displays a visual map of the job site with geofence boundary.
 * Uses Google Static Maps API for rendering.
 *
 * Features:
 * - Site center marker (blue)
 * - Employee location marker (green, if available)
 * - Geofence radius indicator
 * - Responsive design
 *
 * @example
 * <ProjectSiteMap
 *   siteLat={40.7128}
 *   siteLon={-74.0060}
 *   siteName="Main Construction Site"
 *   radiusKm={0.1}
 *   userLat={40.7130}
 *   userLon={-74.0062}
 *   googleMapsApiKey="YOUR_API_KEY"
 * />
 */
export function ProjectSiteMap({
  siteLat,
  siteLon,
  siteName,
  radiusKm,
  userLat,
  userLon,
  googleMapsApiKey,
}: ProjectSiteMapProps) {
  // Build Google Static Maps URL
  const staticMapUrl = new URL(
    "https://maps.googleapis.com/maps/api/staticmap"
  );

  // Map configuration
  staticMapUrl.searchParams.set("size", "400x300");
  staticMapUrl.searchParams.set("zoom", "17");
  staticMapUrl.searchParams.set("style", "feature:water|color:0xcccccc");
  staticMapUrl.searchParams.set(
    "style",
    "feature:road|element:geometry|color:0xf0f0f0"
  );

  // Site center marker (blue)
  staticMapUrl.searchParams.set(
    "markers",
    `color:blue|label:S|anchor:center|${siteLat},${siteLon}`
  );

  // User location marker (green, if available)
  if (userLat && userLon) {
    staticMapUrl.searchParams.set(
      "markers",
      `color:green|label:U|anchor:center|${userLat},${userLon}`
    );
  }

  // Center the map on the site
  staticMapUrl.searchParams.set("center", `${siteLat},${siteLon}`);

  // Add API key if provided
  if (googleMapsApiKey) {
    staticMapUrl.searchParams.set("key", googleMapsApiKey);
  }

  // Calculate geofence circle path (simplified)
  // Note: For a true circle, you'd need to use the Google Maps JavaScript API
  const radiusMeters = radiusKm * 1000;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          {siteName}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Map Container */}
        <div className="relative overflow-hidden rounded-lg bg-gray-100 shadow-sm">
          <img
            src={staticMapUrl.toString()}
            alt={`Map of ${siteName}`}
            className="h-auto w-full"
            onError={(e) => {
              // Fallback if API key is invalid or missing
              (e.target as HTMLImageElement).src =
                "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300'%3E%3Crect fill='%23f0f0f0' width='400' height='300'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial' font-size='16' fill='%23999'%3EMap Preview%3C/text%3E%3C/svg%3E";
            }}
          />

          {/* Map Legend Overlay */}
          <div className="absolute bottom-3 left-3 rounded-lg bg-white/90 p-2 text-xs shadow-sm">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-blue-600" />
              <span>Site Center</span>
            </div>
            {userLat && userLon && (
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-green-600" />
                <span>Your Location</span>
              </div>
            )}
          </div>
        </div>

        {/* Site Information */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-900">
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">
              LATITUDE
            </p>
            <p className="mt-1 font-mono text-sm text-gray-900 dark:text-gray-100">
              {siteLat.toFixed(6)}
            </p>
          </div>

          <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-900">
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">
              LONGITUDE
            </p>
            <p className="mt-1 font-mono text-sm text-gray-900 dark:text-gray-100">
              {siteLon.toFixed(6)}
            </p>
          </div>
        </div>

        {/* Geofence Information */}
        <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
          <div className="flex items-start gap-3">
            <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600 dark:text-blue-400" />
            <div className="flex-1">
              <p className="font-semibold text-blue-900 dark:text-blue-300">
                Geofence Radius
              </p>
              <p className="mt-1 text-sm text-blue-800 dark:text-blue-200">
                Employees must be within{" "}
                <span className="font-mono font-bold">{radiusMeters.toFixed(0)}m</span> of
                the site center to successfully check in.
              </p>
            </div>
          </div>
        </div>

        {/* User Location Info (if available) */}
        {userLat && userLon && (
          <div className="rounded-lg bg-green-50 p-3 dark:bg-green-900/20">
            <p className="text-xs font-semibold text-green-600 dark:text-green-400">
              YOUR LOCATION
            </p>
            <p className="mt-2 font-mono text-sm text-green-900 dark:text-green-300">
              {userLat.toFixed(6)}, {userLon.toFixed(6)}
            </p>
          </div>
        )}

        {/* API Key Warning */}
        {!googleMapsApiKey && (
          <div className="rounded-lg bg-yellow-50 p-3 text-xs text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300">
            <p>
              <strong>Note:</strong> Provide a Google Maps API key in the component
              props for a fully functional map. Without it, you'll see a fallback image.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

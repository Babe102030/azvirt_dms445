# 📍 Geolocation Check-In System Implementation Roadmap

## Overview
This document outlines the complete implementation of a geolocation-based check-in system that validates employee presence at job sites using GPS coordinates and the Haversine formula for distance calculation.

---

## 📍 Phase 1: Database & Logic (Backend)

### 1.1 Database Schema Updates

We need to extend the current Drizzle ORM schema with:
- **ProjectSite** table: Define geofenced locations with lat/long and radius
- **CheckInRecord** table: Track each check-in attempt with location data
- Update **shifts** table: Add geolocation fields for enhanced tracking

### 1.2 Key Utilities

#### Haversine Distance Calculation
The Haversine formula calculates the great-circle distance between two points on Earth.

**Location:** `server/utils/geolocation.ts`

```typescript
// Calculate distance between two GPS coordinates
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in kilometers
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

// Validate if employee is within geofence
export function isWithinGeofence(
  employeeLat: number,
  employeeLon: number,
  siteLat: number,
  siteLon: number,
  radiusKm: number
): boolean {
  const distance = calculateDistance(employeeLat, employeeLon, siteLat, siteLon);
  return distance <= radiusKm;
}
```

#### Validation with Zod

**Location:** `shared/schemas/geolocation.ts`

```typescript
import { z } from "zod";

// Latitude: -90 to 90
// Longitude: -180 to 180
// Accuracy: 0 to ~100 meters (from device)

export const GeolocationSchema = z.object({
  latitude: z.number().min(-90).max(90).describe("Latitude coordinate"),
  longitude: z.number().min(-180).max(180).describe("Longitude coordinate"),
  accuracy: z.number().min(0).max(10000).describe("Accuracy in meters"),
  timestamp: z.number().describe("Timestamp from device"),
});

export const CheckInRequestSchema = z.object({
  shiftId: z.number().int().positive(),
  location: GeolocationSchema,
  deviceInfo: z.object({
    userAgent: z.string(),
    timezone: z.string(),
  }),
});

export const ProjectSiteSchema = z.object({
  id: z.number().int().positive().optional(),
  projectId: z.number().int().positive(),
  name: z.string().min(1).max(255),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  geofenceRadiusKm: z.number().min(0.01).max(50),
});

export type Geolocation = z.infer<typeof GeolocationSchema>;
export type CheckInRequest = z.infer<typeof CheckInRequestSchema>;
export type ProjectSite = z.infer<typeof ProjectSiteSchema>;
```

### 1.3 Database Migrations

Add to `drizzle/schema.ts`:

```typescript
// Define project sites with geofence boundaries
export const projectSites = pgTable("project_sites", {
  id: serial("id").primaryKey(),
  projectId: integer("projectId")
    .references(() => projects.id)
    .notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 8 }).notNull(),
  longitude: decimal("longitude", { precision: 11, scale: 8 }).notNull(),
  geofenceRadiusKm: decimal("geofenceRadiusKm", { precision: 5, scale: 2 })
    .notNull()
    .default("0.1"), // Default 100 meters
  address: text("address"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

// Track all check-in attempts with location data
export const checkInRecords = pgTable(
  "check_in_records",
  {
    id: serial("id").primaryKey(),
    shiftId: integer("shiftId")
      .references(() => shifts.id)
      .notNull(),
    employeeId: integer("employeeId")
      .references(() => employees.id)
      .notNull(),
    projectSiteId: integer("projectSiteId")
      .references(() => projectSites.id),
    latitude: decimal("latitude", { precision: 10, scale: 8 }).notNull(),
    longitude: decimal("longitude", { precision: 11, scale: 8 }).notNull(),
    accuracy: integer("accuracy").notNull(), // in meters
    distanceFromSiteKm: decimal("distanceFromSiteKm", {
      precision: 10,
      scale: 4,
    }),
    isWithinGeofence: boolean("isWithinGeofence").notNull(),
    status: varchar("status", { length: 20 })
      .default("success")
      .notNull(), // success, out_of_range, low_accuracy
    deviceInfo: json("deviceInfo"), // Store user agent, timezone, etc.
    checkedInAt: timestamp("checkedInAt").notNull().defaultNow(),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (table) => ({
    shiftIdx: index("check_in_shift_idx").on(table.shiftId),
    employeeIdx: index("check_in_employee_idx").on(table.employeeId),
    createdAtIdx: index("check_in_created_at_idx").on(table.createdAt),
  })
);

export type CheckInRecord = typeof checkInRecords.$inferSelect;
export type InsertCheckInRecord = typeof checkInRecords.$inferInsert;
export type ProjectSite = typeof projectSites.$inferSelect;
export type InsertProjectSite = typeof projectSites.$inferInsert;
```

---

## 📱 Phase 2: User Interface (Frontend)

### 2.1 Install Dependencies

ReactUse provides a composable Geolocation hook. Add it via:

```bash
npm install react-use
# or
pnpm add react-use
```

Alternatively, use the native Geolocation API directly (built into all modern browsers).

### 2.2 Geolocation Hook

**Location:** `client/src/hooks/useGeolocationCheckIn.ts`

```typescript
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
}

export function useGeolocationCheckIn(): UseGeolocationCheckInReturn {
  const [location, setLocation] = useState<GeolocationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestLocation = useCallback(async () => {
    setLoading(true);
    setError(null);

    return new Promise<GeolocationData | null>((resolve) => {
      if (!navigator.geolocation) {
        const err = "Geolocation is not supported by your browser";
        setError(err);
        toast.error(err);
        setLoading(false);
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const data: GeolocationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
          };
          setLocation(data);
          setLoading(false);
          resolve(data);
        },
        (err) => {
          let errorMsg = "Failed to get location";
          if (err.code === 1) {
            errorMsg =
              "Location access denied. Please enable location permissions in browser settings.";
          } else if (err.code === 2) {
            errorMsg =
              "Location data is unavailable. Please ensure GPS is enabled.";
          } else if (err.code === 3) {
            errorMsg = "Location request timed out. Please try again.";
          }
          setError(errorMsg);
          toast.error(errorMsg);
          setLoading(false);
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    });
  }, []);

  return { location, loading, error, requestLocation };
}
```

### 2.3 Check-In Component

**Location:** `client/src/components/GeolocationCheckIn.tsx`

```typescript
"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useGeolocationCheckIn } from "@/hooks/useGeolocationCheckIn";
import type { CheckInRequest } from "@/shared/schemas/geolocation";

interface GeolocationCheckInProps {
  shiftId: number;
  projectSiteName: string;
  projectSiteLat: number;
  projectSiteLon: number;
  geofenceRadiusKm: number;
  onSuccess?: () => void;
}

export function GeolocationCheckIn({
  shiftId,
  projectSiteName,
  projectSiteLat,
  projectSiteLon,
  geofenceRadiusKm,
  onSuccess,
}: GeolocationCheckInProps) {
  const { location, loading, requestLocation } = useGeolocationCheckIn();
  const [submitting, setSubmitting] = useState(false);
  const [checkedIn, setCheckedIn] = useState(false);

  const handleCheckIn = async () => {
    const geoData = await requestLocation();
    if (!geoData) return;

    setSubmitting(true);

    try {
      const checkInRequest: CheckInRequest = {
        shiftId,
        location: {
          latitude: geoData.latitude,
          longitude: geoData.longitude,
          accuracy: geoData.accuracy,
          timestamp: geoData.timestamp,
        },
        deviceInfo: {
          userAgent: navigator.userAgent,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      };

      const response = await fetch("/api/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(checkInRequest),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.message || "Check-in failed");
        return;
      }

      setCheckedIn(true);
      toast.success("✓ Check-in successful!", {
        description: `Distance from site: ${data.distanceKm.toFixed(2)} km`,
      });

      onSuccess?.();
    } catch (error) {
      toast.error("Network error during check-in");
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Check In at {projectSiteName}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Location Display */}
        {location && (
          <div className="rounded-lg bg-gray-50 p-3 text-sm dark:bg-gray-900">
            <p className="font-semibold">Your Location</p>
            <p className="text-gray-600 dark:text-gray-400">
              Lat: {location.latitude.toFixed(6)}, Lon:{" "}
              {location.longitude.toFixed(6)}
            </p>
            <p className="text-gray-600 dark:text-gray-400">
              Accuracy: ±{location.accuracy.toFixed(0)} meters
            </p>
          </div>
        )}

        {/* Geofence Information */}
        <div className="rounded-lg bg-blue-50 p-3 text-sm dark:bg-blue-900/20">
          <p className="font-semibold">Geofence Radius</p>
          <p className="text-gray-600 dark:text-gray-400">
            {(geofenceRadiusKm * 1000).toFixed(0)} meters from site center
          </p>
        </div>

        {/* Status Indicator */}
        {checkedIn && (
          <div className="flex items-center gap-2 rounded-lg bg-green-50 p-3 dark:bg-green-900/20">
            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
            <span className="text-green-800 dark:text-green-300">
              Checked in successfully!
            </span>
          </div>
        )}

        {/* Check-In Button */}
        <Button
          onClick={handleCheckIn}
          disabled={loading || submitting || checkedIn}
          className="w-full"
          size="lg"
        >
          {loading || submitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Locating...
            </>
          ) : checkedIn ? (
            <>
              <CheckCircle className="mr-2 h-4 w-4" />
              Checked In
            </>
          ) : (
            <>
              <MapPin className="mr-2 h-4 w-4" />
              Check In Now
            </>
          )}
        </Button>

        {/* Accuracy Warning */}
        {location && location.accuracy > 50 && (
          <div className="flex items-start gap-2 rounded-lg bg-yellow-50 p-3 text-sm dark:bg-yellow-900/20">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-yellow-600 dark:text-yellow-400" />
            <p className="text-yellow-800 dark:text-yellow-300">
              Low GPS accuracy ({location.accuracy.toFixed(0)}m). Please move
              outside or wait for better signal.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

### 2.4 Map Visualization (Optional)

**Location:** `client/src/components/ProjectSiteMap.tsx`

```typescript
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin } from "lucide-react";

interface ProjectSiteMapProps {
  siteLat: number;
  siteLon: number;
  siteName: string;
  radiusKm: number;
  userLat?: number;
  userLon?: number;
}

export function ProjectSiteMap({
  siteLat,
  siteLon,
  siteName,
  radiusKm,
  userLat,
  userLon,
}: ProjectSiteMapProps) {
  // Using Google Static Maps API
  // For production, use your own API key
  const staticMapUrl = new URL("https://maps.googleapis.com/maps/api/staticmap");
  staticMapUrl.searchParams.set("size", "400x300");
  staticMapUrl.searchParams.set("zoom", "16");
  staticMapUrl.searchParams.set("style", "feature:water|color:0xcccccc");

  // Site marker
  staticMapUrl.searchParams.set(
    "markers",
    `color:blue|label:S|${siteLat},${siteLon}`
  );

  // User marker (if available)
  if (userLat && userLon) {
    staticMapUrl.searchParams.set(
      "markers",
      `color:green|label:U|${userLat},${userLon}`
    );
  }

  // Center map
  staticMapUrl.searchParams.set("center", `${siteLat},${siteLon}`);

  // Note: You'll need to add your Google Maps API key
  // staticMapUrl.searchParams.set("key", process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY!);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          {siteName}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="aspect-video overflow-hidden rounded-lg bg-gray-100">
          <img
            src={staticMapUrl.toString()}
            alt="Project site map"
            className="h-full w-full"
          />
          <p className="mt-2 text-sm text-gray-600">
            Geofence radius: {(radiusKm * 1000).toFixed(0)}m
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
```

---

## 📋 Phase 3: Validation & Security

### 3.1 Server-Side Validation & Check-In Handler

**Location:** `server/routers/checkIn.ts`

```typescript
import { createTRPCRouter, protectedProcedure } from "@/server/_core/trpc";
import { CheckInRequestSchema } from "@/shared/schemas/geolocation";
import { calculateDistance, isWithinGeofence } from "@/server/utils/geolocation";
import { db } from "@/server/db";
import { checkInRecords, projectSites, shifts, employees } from "@/drizzle/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

export const checkInRouter = createTRPCRouter({
  performCheckIn: protectedProcedure
    .input(CheckInRequestSchema)
    .mutation(async ({ ctx, input }) => {
      const { shiftId, location } = input;
      const userId = ctx.session.user.id;

      // 1. Verify shift exists and belongs to user
      const shift = await db.query.shifts.findFirst({
        where: eq(shifts.id, shiftId),
      });

      if (!shift) {
        throw new Error("Shift not found");
      }

      // Verify user is the employee or a manager
      const employee = await db.query.employees.findFirst({
        where: eq(employees.userId, userId),
      });

      if (!employee || employee.id !== shift.employeeId) {
        throw new Error("Unauthorized to check in for this shift");
      }

      // 2. Find project site for this shift
      const projectSite = await db.query.projectSites.findFirst({
        where: eq(projectSites.id, 1), // Match with shift's project
      });

      if (!projectSite) {
        throw new Error("Project site not configured");
      }

      // 3. Calculate distance using Haversine formula
      const distance = calculateDistance(
        location.latitude,
        location.longitude,
        parseFloat(projectSite.latitude.toString()),
        parseFloat(projectSite.longitude.toString())
      );

      const radiusKm = parseFloat(projectSite.geofenceRadiusKm.toString());
      const withinGeofence = distance <= radiusKm;

      // 4. Validate accuracy (reject if too low)
      const accuracy = location.accuracy / 1000; // Convert meters to km
      let status = "success";

      if (accuracy > 0.05) {
        // > 50 meters
        status = "low_accuracy";
      }

      if (!withinGeofence) {
        status = "out_of_range";
      }

      // 5. Record the check-in
      const checkInRecord = await db.insert(checkInRecords).values({
        shiftId,
        employeeId: employee.id,
        projectSiteId: projectSite.id,
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        distanceFromSiteKm: distance,
        isWithinGeofence: withinGeofence,
        status,
        deviceInfo: input.deviceInfo,
      });

      // 6. Update shift status if check-in successful
      if (withinGeofence && status === "success") {
        await db
          .update(shifts)
          .set({ status: "in_progress" })
          .where(eq(shifts.id, shiftId));
      }

      return {
        success: withinGeofence && status === "success",
        message: withinGeofence
          ? "Check-in successful!"
          : `You are ${distance.toFixed(2)}km from the site. Required radius: ${radiusKm}km`,
        distanceKm: distance,
        withinGeofence,
        status,
      };
    }),

  getProjectSites: protectedProcedure.query(async ({ ctx }) => {
    return await db.query.projectSites.findMany();
  }),

  createProjectSite: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      name: z.string(),
      latitude: z.number(),
      longitude: z.number(),
      geofenceRadiusKm: z.number(),
      address: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      return await db.insert(projectSites).values(input);
    }),

  getCheckInHistory: protectedProcedure
    .input(z.object({
      shiftId: z.number().optional(),
      employeeId: z.number().optional(),
      limit: z.number().default(50),
    }))
    .query(async ({ input }) => {
      const conditions = [];

      if (input.shiftId) {
        conditions.push(eq(checkInRecords.shiftId, input.shiftId));
      }

      if (input.employeeId) {
        conditions.push(eq(checkInRecords.employeeId, input.employeeId));
      }

      return await db.query.checkInRecords.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
        limit: input.limit,
        orderBy: (records) => [records.checkedInAt],
      });
    }),
});
```

### 3.2 Next.js Server Action (Alternative Approach)

**Location:** `server/actions/checkIn.ts`

```typescript
"use server";

import { auth } from "@/auth";
import { db } from "@/server/db";
import { CheckInRequestSchema } from "@/shared/schemas/geolocation";
import { calculateDistance } from "@/server/utils/geolocation";
import { checkInRecords, projectSites, shifts, employees } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

export async function performCheckInAction(input: unknown) {
  // Validate request
  const validatedInput = CheckInRequestSchema.parse(input);
  
  // Get authenticated session
  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  const { shiftId, location } = validatedInput;

  // Verify shift and employee
  const shift = await db.query.shifts.findFirst({
    where: eq(shifts.id, shiftId),
  });

  if (!shift) {
    return { success: false, message: "Shift not found" };
  }

  const employee = await db.query.employees.findFirst({
    where: eq(employees.id, shift.employeeId),
  });

  if (!employee) {
    return { success: false, message: "Employee not found" };
  }

  // Get project site
  const projectSite = await db.query.projectSites.findFirst({
    where: eq(projectSites.id, 1), // Match with shift's project
  });

  if (!projectSite) {
    return { success: false, message: "Project site not configured" };
  }

  // Calculate distance
  const distance = calculateDistance(
    location.latitude,
    location.longitude,
    parseFloat(projectSite.latitude.toString()),
    parseFloat(projectSite.longitude.toString())
  );

  const withinGeofence = distance <= parseFloat(projectSite.geofenceRadiusKm.toString());

  // Record check-in
  await db.insert(checkInRecords).values({
    shiftId,
    employeeId: employee.id,
    projectSiteId: projectSite.id,
    latitude: location.latitude,
    longitude: location.longitude,
    accuracy: location.accuracy,
    distanceFromSiteKm: distance,
    isWithinGeofence: withinGeofence,
    status: withinGeofence ? "success" : "out_of_range",
    deviceInfo: validatedInput.deviceInfo,
  });

  if (withinGeofence) {
    await db.update(shifts).set({ status: "in_progress" }).where(eq(shifts.id, shiftId));
  }

  return {
    success: withinGeofence,
    message: withinGeofence
      ? "Check-in successful!"
      : `Too far from site: ${distance.toFixed(2)}km (max: ${projectSite.geofenceRadiusKm}km)`,
    distanceKm: distance,
    withinGeofence,
  };
}
```

### 3.3 API Route Handler (REST Alternative)

**Location:** `server/routes/api/check-in.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { CheckInRequestSchema } from "@/shared/schemas/geolocation";
import { performCheckInAction } from "@/server/actions/checkIn";
import { z } from "zod";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedInput = CheckInRequestSchema.parse(body);
    
    const result = await performCheckInAction(validatedInput);
    
    return NextResponse.json(result, {
      status: result.success ? 200 : 400,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

---

## 🚀 Implementation Checklist

### Phase 1: Database
- [ ] Add `projectSites` table to Drizzle schema
- [ ] Add `checkInRecords` table to Drizzle schema
- [ ] Create migration: `npm run db:generate && npm run db:migrate`
- [ ] Update shift schema (add `projectId` reference if missing)

### Phase 2: Backend Utilities
- [ ] Create `server/utils/geolocation.ts` with Haversine formula
- [ ] Create `shared/schemas/geolocation.ts` with Zod validation
- [ ] Implement check-in business logic (tRPC router or Server Action)

### Phase 3: Frontend
- [ ] Install ReactUse: `npm install react-use`
- [ ] Create `client/src/hooks/useGeolocationCheckIn.ts`
- [ ] Create `client/src/components/GeolocationCheckIn.tsx`
- [ ] (Optional) Create `client/src/components/ProjectSiteMap.tsx`
- [ ] Integrate into your shift/timesheet pages

### Phase 4: Testing & Refinement
- [ ] Write unit tests for Haversine calculation
- [ ] Write integration tests for check-in endpoint
- [ ] Test with mock locations (browser DevTools)
- [ ] Test edge cases (low accuracy, out of range, network failure)
- [ ] Monitor performance and distance calculation accuracy

---

## 🔒 Security Considerations

1. **Authentication**: Always verify user session before allowing check-in
2. **Authorization**: Only employees can check in for their own shifts
3. **Audit Trail**: Every check-in is recorded with timestamp and location
4. **Accuracy Validation**: Reject GPS fixes with accuracy > 50 meters
5. **Rate Limiting**: Implement rate limiting on check-in endpoint
6. **Timestamp Verification**: Validate that device timestamp matches server time
7. **HTTPS Only**: Always transmit location data over HTTPS
8. **Data Privacy**: Comply with GDPR/privacy regulations for location data

---

## 📊 Analytics & Monitoring

Track the following metrics:
- Check-in success rate
- Average distance from site
- GPS accuracy distribution
- Failed check-ins (out of range, low accuracy)
- Check-in time distribution throughout shifts
- Device types with most successful check-ins

---

## 🎯 Next Steps

1. Start with Phase 1: Database schema
2. Implement Phase 2: Backend utilities and validation
3. Build Phase 3: Frontend components
4. Test thoroughly with real devices
5. Monitor and iterate based on user feedback
6. Consider advanced features:
   - Multiple check-ins per shift (break tracking)
   - Checkout process
   - Offline support with service workers
   - Historical location tracking for reports
   - Machine learning for location anomaly detection
# Geolocation Check-In System: Schema Architecture

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        GEOLOCATION CHECK-IN SYSTEM                          │
└─────────────────────────────────────────────────────────────────────────────┘

                              FRONTEND LAYER
                         ┌────────────────────┐
                         │ GeolocationCheckIn │
                         │    Component       │
                         └────────┬───────────┘
                                  │
                    Browser Geolocation API (HTTPS)
                                  │
                         ┌────────▼───────────┐
                         │   API Endpoint     │
                         │ /api/check-in      │
                         └────────┬───────────┘
                                  │
                              SERVER LAYER
                    ┌─────────────┴──────────────┐
                    │                            │
         ┌──────────▼──────────────┐  ┌─────────▼──────────────┐
         │  Validation (Zod)       │  │ Geolocation Utils      │
         │  - GPS coordinates      │  │ - Haversine distance   │
         │  - Accuracy threshold   │  │ - Geofence validation  │
         │  - Shift ownership      │  │ - Bearing calculation  │
         └──────────┬──────────────┘  └─────────┬──────────────┘
                    │                            │
                    └────────────┬────────────────┘
                                 │
                         ┌───────▼────────┐
                         │ Drizzle ORM    │
                         │ Transaction    │
                         └───────┬────────┘
                                 │
                              DATABASE LAYER
                    ┌────────────┴─────────────┐
                    │                          │
         ┌──────────▼──────────┐    ┌─────────▼──────────┐
         │  projectSites       │    │ checkInRecords     │
         │  (Geofence Defs)    │    │ (Audit Trail)      │
         └─────────────────────┘    └────────────────────┘
```

## Data Flow Diagram

```
EMPLOYEE CHECK-IN WORKFLOW

Step 1: Request Location
┌──────────────────────────────────────────────┐
│ Employee opens timesheet page                │
│ Frontend requests browser geolocation        │
│ Browser shows "Allow location access?" popup │
└──────────────────────────────────────────────┘
                     │
                     ▼
Step 2: Capture GPS Data
┌──────────────────────────────────────────────┐
│ Browser captures:                            │
│  - latitude (e.g., 40.7128)                  │
│  - longitude (e.g., -74.0060)                │
│  - accuracy (e.g., 15.5 meters)              │
│  - timestamp                                  │
└──────────────────────────────────────────────┘
                     │
                     ▼
Step 3: Display UI
┌──────────────────────────────────────────────┐
│ GeolocationCheckIn Component shows:          │
│  - "Located at 40.7128, -74.0060"            │
│  - "Accuracy: 15.5m"                         │
│  - "Loading geofence data..."                │
│  - [Check In] button (enabled/disabled)      │
└──────────────────────────────────────────────┘
                     │
                     ▼
Step 4: Submit Check-In
┌──────────────────────────────────────────────┐
│ POST /api/check-in                           │
│ {                                            │
│   shiftId: 42,                               │
│   latitude: 40.7128,                         │
│   longitude: -74.0060,                       │
│   accuracy: 15.5                             │
│ }                                            │
└──────────────────────────────────────────────┘
                     │
                     ▼
Step 5: Server Validation
┌──────────────────────────────────────────────┐
│ 1. Validate input with Zod schema            │
│ 2. Check authentication & authorization      │
│ 3. Verify shift ownership                    │
│ 4. Validate GPS accuracy (threshold: 50m)    │
│ 5. Load project site geofence                │
│ 6. Calculate distance (Haversine formula)    │
│ 7. Determine if within geofence              │
└──────────────────────────────────────────────┘
                     │
                     ▼
Step 6: Store Record
┌──────────────────────────────────────────────┐
│ INSERT INTO checkInRecords (                 │
│   shiftId: 42,                               │
│   employeeId: 5,                             │
│   projectSiteId: 1,                          │
│   latitude: 40.7128,                         │
│   longitude: -74.0060,                       │
│   accuracy: 15.5,                            │
│   distanceFromSiteMeters: 25.3,              │
│   isWithinGeofence: true,                    │
│   checkInType: 'check_in',                   │
│   ipAddress: '192.168.1.1',                  │
│   createdAt: NOW()                           │
│ )                                            │
└──────────────────────────────────────────────┘
                     │
                     ▼
Step 7: Return Response
┌──────────────────────────────────────────────┐
│ {                                            │
│   success: true,                             │
│   message: "Checked in successfully",        │
│   data: {                                    │
│     checkInId: 123,                          │
│     timestamp: "2024-01-15T08:00:00Z",       │
│     withinGeofence: true,                    │
│     distance: 25.3                           │
│   }                                          │
│ }                                            │
└──────────────────────────────────────────────┘
                     │
                     ▼
Step 8: Update UI
┌──────────────────────────────────────────────┐
│ Frontend displays:                           │
│  ✓ "Check-in successful!"                    │
│  ✓ "Location: 40.7128, -74.0060"             │
│  ✓ "Distance: 25.3m from site"               │
│  ✓ "Time: 08:00 AM"                          │
└──────────────────────────────────────────────┘
```

## Entity Relationship Diagram (ERD)

```
┌─────────────┐
│   users     │
├─────────────┤
│ id (PK)     │
│ name        │
│ email       │
│ role        │
│ ...         │
└──────┬──────┘
       │ 1
       │
       │ creates
       │
       │ *
       │
┌──────▼──────────────────┐
│  projectSites           │
├─────────────────────────┤
│ id (PK)                 │
│ projectId (FK)          │
│ name                    │
│ latitude                │ ◄─── GPS COORDINATES
│ longitude               │
│ radiusMeters            │ ◄─── GEOFENCE BOUNDARY
│ isActive                │
│ createdBy (FK)          │
│ createdAt               │
│ updatedAt               │
└──────┬──────────────────┘
       │ 1
       │
       │ checked-into
       │
       │ *
       │
       │
       ├─────────────────────────────┐
       │                             │
       ▼                             ▼
┌────────────────────┐    ┌────────────────┐
│    employees       │    │    shifts      │
├────────────────────┤    ├────────────────┤
│ id (PK)            │    │ id (PK)        │
│ userId (FK)        │    │ employeeId(FK) │
│ firstName          │    │ startTime      │
│ lastName           │    │ endTime        │
│ jobTitle           │    │ status         │
│ ...                │    │ ...            │
└────────┬───────────┘    └────────┬───────┘
         │ 1                       │ 1
         │                         │
         │ *                       │ *
         │performs                 │ for
         │                         │
         │      ┌──────────────────┘
         │      │
         │      ▼
         │  ┌──────────────────────────────┐
         │  │   checkInRecords (AUDIT LOG) │
         │  ├──────────────────────────────┤
         └─►│ id (PK)                      │
            │ shiftId (FK)                 │
            │ employeeId (FK)              │
            │ projectSiteId (FK)           │
            │ latitude                     │ ◄─── GPS LOCATION
            │ longitude                    │
            │ accuracy                     │ ◄─── QUALITY METRIC
            │ distanceFromSiteMeters       │ ◄─── VALIDATION DATA
            │ isWithinGeofence             │ ◄─── GEOFENCE RESULT
            │ checkInType                  │ ◄─── check_in, check_out, etc.
            │ ipAddress                    │ ◄─── SECURITY AUDIT
            │ userAgent                    │
            │ notes                        │
            │ createdAt                    │ ◄─── IMMUTABLE TIMESTAMP
            └──────────────────────────────┘
```

## Table Structure Comparison

```
┌────────────────────────────────────────────────────────────────────┐
│                    PROJECTSITES TABLE                              │
├────────────────────────────────────────────────────────────────────┤
│ Column              │ Type                    │ Notes              │
├─────────────────────┼─────────────────────────┼────────────────────┤
│ id                  │ serial (PK)             │ Auto-increment     │
│ projectId           │ integer (FK)            │ CASCADE delete     │
│ name                │ varchar(255)            │ Required           │
│ description         │ text                    │ Optional           │
│ latitude            │ double precision        │ Required, -90..90  │
│ longitude           │ double precision        │ Required, -180..180│
│ radiusMeters        │ integer                 │ Default: 50        │
│ address             │ varchar(500)            │ Reference only     │
│ city                │ varchar(100)            │ Reference only     │
│ state               │ varchar(100)            │ Reference only     │
│ zipCode             │ varchar(20)             │ Reference only     │
│ country             │ varchar(100)            │ Reference only     │
│ isActive            │ boolean                 │ Default: true      │
│ createdBy           │ integer (FK)            │ Audit trail        │
│ createdAt           │ timestamp               │ Auto-set           │
│ updatedAt           │ timestamp               │ Auto-set           │
└────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│                   CHECKINRECORDS TABLE                             │
├────────────────────────────────────────────────────────────────────┤
│ Column              │ Type                    │ Notes              │
├─────────────────────┼─────────────────────────┼────────────────────┤
│ id                  │ serial (PK)             │ Auto-increment     │
│ shiftId             │ integer (FK)            │ CASCADE delete     │
│ employeeId          │ integer (FK)            │ CASCADE delete     │
│ projectSiteId       │ integer (FK)            │ RESTRICT delete    │
│ latitude            │ double precision        │ Required           │
│ longitude           │ double precision        │ Required           │
│ accuracy            │ double precision        │ Required, meters   │
│ distanceFromSiteM.. │ double precision        │ Calculated         │
│ isWithinGeofence    │ boolean                 │ Validation result  │
│ checkInType         │ varchar(20)             │ Default: check_in  │
│ ipAddress           │ varchar(45)             │ IPv4 or IPv6       │
│ userAgent           │ text                    │ Device info        │
│ notes               │ text                    │ Optional           │
│ createdAt           │ timestamp               │ Immutable          │
└────────────────────────────────────────────────────────────────────┘
```

## Geofence Validation Algorithm

```
GEOFENCE CHECK LOGIC

Input:
  - Employee GPS: (empLat, empLon)
  - Site Center: (siteLat, siteLon)
  - Site Radius: radiusMeters
  - GPS Accuracy: accuracyMeters

Process:
┌─────────────────────────────────────────┐
│ 1. Validate GPS Accuracy                │
│    if accuracy > 50:                    │
│      reject (signal too weak)           │
└─────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│ 2. Calculate Distance (Haversine)       │
│    distance = haversine(                │
│      empLat, empLon,                    │
│      siteLat, siteLon                   │
│    )                                    │
│    Returns: distance in meters          │
└─────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│ 3. Compare with Geofence Radius         │
│    if distance <= radiusMeters:         │
│      withinGeofence = true              │
│    else:                                │
│      withinGeofence = false             │
└─────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│ 4. Store Result in Database             │
│    - distanceFromSiteMeters             │
│    - isWithinGeofence                   │
│    - accuracy                           │
│    - timestamp                          │
└─────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│ 5. Audit Log Entry Created              │
│    - complianceAuditTrail               │
│    - checkInRecords                     │
└─────────────────────────────────────────┘

OUTPUT: CheckInRecord with validation status
```

## Security & Access Control Flow

```
CHECK-IN REQUEST SECURITY CHAIN

┌─────────────────────────┐
│ POST /api/check-in      │
│ + GPS Data              │
└────────────┬────────────┘
             │
             ▼
    ┌────────────────────┐
    │ 1. AUTHENTICATION  │
    │ Verify JWT token   │
    │ Reject if invalid  │
    └────────┬───────────┘
             │
             ▼
    ┌────────────────────┐
    │ 2. AUTHORIZATION   │
    │ Check user role    │
    │ Verify shift perms  │
    └────────┬───────────┘
             │
             ▼
    ┌────────────────────┐
    │ 3. INPUT VALIDATION│
    │ Zod schema check   │
    │ Type validation    │
    └────────┬───────────┘
             │
             ▼
    ┌────────────────────┐
    │ 4. BUSINESS LOGIC  │
    │ - Shift exists?    │
    │ - Shift active?    │
    │ - Employee match?  │
    │ - GPS accuracy ok? │
    └────────┬───────────┘
             │
             ▼
    ┌────────────────────┐
    │ 5. DATA PERSISTENCE│
    │ Insert to DB       │
    │ Transaction atomic │
    └────────┬───────────┘
             │
             ▼
    ┌────────────────────┐
    │ 6. AUDIT LOG       │
    │ Log action         │
    │ Include IP address │
    │ Include user agent │
    └────────┬───────────┘
             │
             ▼
    ┌────────────────────┐
    │ 7. RESPONSE        │
    │ Return result      │
    │ Include check-in ID│
    └────────────────────┘
```

## Data Retention & Lifecycle

```
CHECK-IN RECORD LIFECYCLE

Created: Employee checks in
┌────────────────────────────┐
│ INSERT checkInRecords      │
│ timestamp = NOW()          │
│ isWithinGeofence = true    │
│ immutable from this point  │
└────────────────────────────┘
           │
           │ LIVE (active use)
           │ Duration: 90 days (configurable)
           │
           ▼
┌────────────────────────────┐
│ Available for:             │
│ - Employee timesheet view  │
│ - Manager reporting        │
│ - Audit compliance         │
│ - Analytics/metrics        │
└────────────────────────────┘
           │
           │ AGING (after 90 days)
           │
           ▼
┌────────────────────────────┐
│ Optional Actions:          │
│ - Archive to separate DB   │
│ - Encrypt sensitive fields │
│ - Mask IP/user-agent       │
│ - Compress storage         │
└────────────────────────────┘
           │
           │ RETENTION LIMIT
           │ Duration: 365 days (configurable)
           │
           ▼
┌────────────────────────────┐
│ DELETE checkInRecords      │
│ Where createdAt <          │
│   NOW() - INTERVAL '365d'  │
│                            │
│ Respects GDPR/CCPA         │
│ Employee deletion request  │
└────────────────────────────┘

RECOMMENDED CRON JOB:
Run daily at 02:00 UTC:
DELETE FROM checkInRecords 
WHERE createdAt < NOW() - INTERVAL '90 days';
```

## Geofence Visualization

```
EXAMPLE: CIRCULAR GEOFENCE AT JOB SITE

                    N
                    │
          40.7150   │
                    │
    ┌───────────────┼───────────────┐
    │               │               │
-74.0080 ──────────►40.7128──────────► -74.0040
    │           ─74.0060            │
    │               │               │
    │        Site: 100m radius      │
    │               │               │
    │     ●────────────────●        │
    │   ╱                    ╲      │
    │  ╱         CHECK IN      ╲    │
    │ │     ACCEPTANCE ZONE      │  │
    │  ╲      (GREEN - OK)      ╱   │
    │   ●────────────────●        │
    │               │               │
    │               │               │
    │    OUT-OF-GEOFENCE AREA    │
    │      (YELLOW - ALERT)       │
    │               │               │
    └───────────────┼───────────────┘
                    │
          40.7100   │

Center Point: 40.7128, -74.0060
Radius: 100 meters

SCENARIOS:
┌─────────────────────────────────────┐
│ GPS: 40.7128, -74.0060 (at center) │
│ Distance: 0m                        │
│ Within Geofence: ✓ YES              │
│ Status: VALID CHECK-IN              │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ GPS: 40.7135, -74.0065 (near edge) │
│ Distance: 87m                       │
│ Within Geofence: ✓ YES              │
│ Status: VALID CHECK-IN              │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ GPS: 40.7150, -74.0080 (outside)   │
│ Distance: 215m                      │
│ Within Geofence: ✗ NO               │
│ Status: FLAGGED - INVESTIGATE       │
└─────────────────────────────────────┘
```

## Integration Points with Existing System

```
GEOLOCATION SYSTEM INTEGRATION MAP

┌─────────────────────────────────────────────────────────────────┐
│                     EXISTING SYSTEM                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────┐    ┌──────────────────┐                  │
│  │   employees      │    │    shifts        │                  │
│  │  (workforce      │    │  (timesheets)    │                  │
│  │   management)    │    │                  │                  │
│  └────────┬─────────┘    └────────┬─────────┘                  │
│           │                       │                            │
│           │ NEW INTEGRATION       │ NEW INTEGRATION            │
│           │                       │                            │
│           └───────┬───────────────┘                            │
│                   │                                            │
│            ┌──────▼──────────┐                                │
│            │  checkInRecords │◄────► GPS Location Data        │
│            │  (audit trail)  │                                │
│            └─────────────────┘                                │
│                   │                                            │
│            ┌──────▼──────────┐                                │
│            │ projectSites    │◄────► Geofence Definitions    │
│            │  (geofences)    │                                │
│            └─────────────────┘                                │
│                                                                 │
│  ┌──────────────────┐    ┌──────────────────┐                  │
│  │   projects       │    │  complianceAudit │                  │
│  │                  │    │     Trail        │                  │
│  │ (references)     │    │ (audit logging)  │                  │
│  └──────────────────┘    └──────────────────┘                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

NEW TABLES (projectSites, checkInRecords):
- Minimal impact on existing tables
- Foreign keys reference existing tables
- No modifications to existing schema required
- Can be added/removed without affecting core system
```

## API Request/Response Flow

```
CLIENT REQUEST → PROCESSING → DATABASE → RESPONSE

┌─────────────────────────────────────────────────┐
│ Frontend GeolocationCheckIn Component           │
│                                                 │
│ Request:                                        │
│ POST /api/check-in                              │
│ {                                               │
│   "shiftId": 42,                                │
│   "latitude": 40.7128,                          │
│   "longitude": -74.0060,                        │
│   "accuracy": 15.5                              │
│ }                                               │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│ API Route Handler: /app/api/check-in/route.ts   │
│                                                 │
│ 1. Parse request body                           │
│ 2. Validate with Zod schema                     │
│ 3. Get authenticated user                       │
│ 4. Check authorization                          │
│ 5. Fetch shift details                          │
│ 6. Fetch project site geofence                  │
│ 7. Calculate distance (Haversine)               │
│ 8. Determine geofence status                    │
│ 9. Create check-in record                       │
│ 10. Log to audit trail                          │
│ 11. Prepare response                            │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│ Database Operations (Drizzle ORM)               │
│                                                 │
│ INSERT INTO checkInRecords (                    │
│   shiftId, employeeId, projectSiteId,           │
│   latitude, longitude, accuracy,                │
│   distanceFromSiteMeters, isWithinGeofence,     │
│   checkInType, ipAddress, userAgent,            │
│   createdAt                                     │
│ ) VALUES (...)                                  │
│ RETURNING *                                     │
│                                                 │
│ INSERT INTO complianceAuditTrail (              │
│   employeeId, action, entityType, entityId,     │
│   performedBy, createdAt                        │
│ ) VALUES (...)                                  │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│ API Response                                    │
│                                                 │
│ {                                               │
│   "success": true,                              │
│   "message": "Checked in successfully",         │
│   "data": {                                     │
│     "checkInId": 789,                           │
│     "timestamp": "2024-01-15T08:00:00Z",        │
│     "withinGeofence": true,                     │
│     "distance": 25.3,                           │
│     "location": {                               │
│       "latitude": 40.7128,                      │
│       "longitude": -74.0060                     │
│     }                                           │
│   }                                             │
│ }                                               │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│ Frontend Updates UI                             │
│                                                 │
│ Display:                                        │
│ ✓ "Check-in successful at 08:00 AM"             │
│ ✓ "Location: 40.7128, -74.0060"                 │
│ ✓ "Distance from site: 25.3m"                   │
│ ✓ "Status: Within geofence"                     │
│                                                 │
│ Update shift status (if applicable)             │
│ Show check-in timestamp in timesheet            │
└─────────────────────────────────────────────────┘
```

---

## Summary

This architecture provides:

1. **Separation of Concerns:** Frontend, backend, and database are clearly separated
2. **Immutable Audit Trail:** Check-in records cannot be modified, only read
3. **Real-time Validation:** Geofence checking happens server-side
4. **Compliance Ready:** Full audit logging and data retention policies
5. **Scalable Design:** Indexes and relationships support large datasets
6. **Security First:** Multiple validation layers and access controls

The system integrates seamlessly with the existing workforce management and timesheets modules without requiring modifications to existing tables.
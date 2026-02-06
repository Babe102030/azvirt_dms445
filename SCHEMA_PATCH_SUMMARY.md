# Schema Patch Summary: Geolocation Check-In System

## Overview

Two new tables have been added to `drizzle/schema.ts` to support the Geolocation Check-In System for employee shift tracking.

## Tables Added

### 1. projectSites Table

**Purpose:** Store geofence boundaries and metadata for job sites where employees check in.

**Location in file:** Added at end of `drizzle/schema.ts`

**Columns:**
| Column | Type | Constraints | Purpose |
|--------|------|-----------|---------|
| id | serial | PRIMARY KEY | Unique identifier |
| projectId | integer | NOT NULL, FK → projects.id, CASCADE | Associated construction project |
| name | varchar(255) | NOT NULL | Site name (e.g., "Main Concrete Area") |
| description | text | | Additional site details |
| latitude | double precision | NOT NULL | Geographic latitude coordinate |
| longitude | double precision | NOT NULL | Geographic longitude coordinate |
| radiusMeters | integer | NOT NULL, default: 50 | Geofence radius in meters |
| address | varchar(500) | | Street address of site |
| city | varchar(100) | | City name |
| state | varchar(100) | | State/Province |
| zipCode | varchar(20) | | Postal code |
| country | varchar(100) | | Country name |
| isActive | boolean | NOT NULL, default: true | Enable/disable site for check-ins |
| createdBy | integer | FK → users.id | User who created the site |
| createdAt | timestamp | NOT NULL, default: NOW() | Creation timestamp |
| updatedAt | timestamp | NOT NULL, default: NOW() | Last update timestamp |

**TypeScript Types:**
```typescript
export type ProjectSite = typeof projectSites.$inferSelect;
export type InsertProjectSite = typeof projectSites.$inferInsert;
```

---

### 2. checkInRecords Table

**Purpose:** Log all employee check-ins with GPS coordinates, accuracy metrics, and geofence validation results.

**Location in file:** Added at end of `drizzle/schema.ts`

**Columns:**
| Column | Type | Constraints | Purpose |
|--------|------|-----------|---------|
| id | serial | PRIMARY KEY | Unique identifier |
| shiftId | integer | NOT NULL, FK → shifts.id, CASCADE | Associated work shift |
| employeeId | integer | NOT NULL, FK → employees.id, CASCADE | Employee checking in |
| projectSiteId | integer | NOT NULL, FK → projectSites.id, RESTRICT | Target project site |
| latitude | double precision | NOT NULL | GPS latitude of check-in location |
| longitude | double precision | NOT NULL | GPS longitude of check-in location |
| accuracy | double precision | NOT NULL | GPS accuracy in meters (from browser) |
| distanceFromSiteMeters | double precision | | Calculated distance from site center |
| isWithinGeofence | boolean | NOT NULL | True if check-in is within site radius |
| checkInType | varchar(20) | NOT NULL, default: 'check_in' | Type: 'check_in', 'check_out', 'break_start', 'break_end' |
| ipAddress | varchar(45) | | IP address of check-in request |
| userAgent | text | | Browser/device user agent string |
| notes | text | | Admin notes or reason for out-of-geofence check-in |
| createdAt | timestamp | NOT NULL, default: NOW() | Check-in timestamp |

**TypeScript Types:**
```typescript
export type CheckInRecord = typeof checkInRecords.$inferSelect;
export type InsertCheckInRecord = typeof checkInRecords.$inferInsert;
```

---

## Foreign Key Relationships

```
User (users)
  └── Creates ProjectSite
        ├── references project (projects)
        └── Has many CheckInRecords
              ├── references Shift (shifts)
              │     └── Has one Employee (employees)
              ├── references Employee (employees)
              └── references ProjectSite (projectSites)
```

**Delete Cascade Behavior:**
- `projectSites`: Cascade on `projectId` delete (if project deleted, all its sites deleted)
- `checkInRecords`: Cascade on `shiftId` and `employeeId` delete
- `checkInRecords`: Restrict on `projectSiteId` delete (cannot delete site if check-ins reference it)

---

## Migration Commands

### Generate Migration
```bash
npm run db:generate
# or
npx drizzle-kit generate:pg
```

### Apply Migration
```bash
npm run db:push
# or
npx drizzle-kit push:pg
```

### Verify in Database
```bash
psql -U [username] -d [database_name]
\dt projectSites
\dt checkInRecords
\d projectSites
\d checkInRecords
```

---

## Usage in Code

### Import Types
```typescript
import { 
  projectSites, 
  checkInRecords,
  ProjectSite, 
  InsertProjectSite,
  CheckInRecord, 
  InsertCheckInRecord 
} from "@/drizzle/schema";
```

### Create a Project Site
```typescript
import { db } from "@/server/db";
import { projectSites } from "@/drizzle/schema";

const newSite = await db.insert(projectSites).values({
  projectId: 1,
  name: "Main Concrete Pour Area",
  latitude: 40.7128,
  longitude: -74.0060,
  radiusMeters: 100,
  address: "123 Construction St",
  city: "New York",
  state: "NY",
  zipCode: "10001",
  country: "USA",
  createdBy: userId,
});
```

### Record a Check-In
```typescript
import { db } from "@/server/db";
import { checkInRecords } from "@/drizzle/schema";

const checkin = await db.insert(checkInRecords).values({
  shiftId: 42,
  employeeId: 5,
  projectSiteId: 1,
  latitude: 40.7128,
  longitude: -74.0060,
  accuracy: 15.5,
  distanceFromSiteMeters: 25.3,
  isWithinGeofence: true,
  checkInType: "check_in",
  ipAddress: "192.168.1.1",
  userAgent: "Mozilla/5.0...",
});
```

### Query Check-Ins for a Shift
```typescript
import { db } from "@/server/db";
import { checkInRecords, employees } from "@/drizzle/schema";
import { eq } from "drizzle-orm";

const checkins = await db
  .select()
  .from(checkInRecords)
  .where(eq(checkInRecords.shiftId, shiftId))
  .innerJoin(employees, eq(checkInRecords.employeeId, employees.id));
```

---

## Data Sensitivity & Privacy

⚠️ **Important:** Location data is personally identifiable and sensitive.

**Recommended Security Measures:**
1. **HTTPS Required:** Geolocation API only works over HTTPS
2. **Access Control:** Restrict who can view check-in records
3. **Data Retention:** Delete records older than 90 days (configurable)
4. **Encryption:** Consider encrypting latitude/longitude columns at rest
5. **Audit Logging:** Log all access to location data
6. **GDPR/CCPA Compliance:** Allow employees to request data deletion

**Example Cleanup:**
```sql
DELETE FROM checkInRecords WHERE createdAt < NOW() - INTERVAL '90 days';
```

---

## Performance Considerations

### Recommended Indexes

```sql
CREATE INDEX idx_checkInRecords_employeeId ON checkInRecords(employeeId);
CREATE INDEX idx_checkInRecords_shiftId ON checkInRecords(shiftId);
CREATE INDEX idx_checkInRecords_projectSiteId ON checkInRecords(projectSiteId);
CREATE INDEX idx_checkInRecords_createdAt ON checkInRecords(createdAt);
CREATE INDEX idx_projectSites_projectId ON projectSites(projectId);
```

Drizzle Kit may create these automatically, but verify they exist for optimal query performance.

---

## Files Modified

- `drizzle/schema.ts` - Added `projectSites` and `checkInRecords` table definitions with types

## Files Created

- `DRIZZLE_MIGRATION_GUIDE.md` - Comprehensive migration guide with troubleshooting
- `SCHEMA_PATCH_SUMMARY.md` - This file

---

## Next Steps

1. ✅ Run `npm run db:generate` to create migration
2. ✅ Review generated SQL in `drizzle/migrations/`
3. ✅ Run `npm run db:push` to apply migration
4. ⬜ Implement API endpoint: `/app/api/check-in/route.ts`
5. ⬜ Create Project Sites admin panel
6. ⬜ Integrate `GeolocationCheckIn` component into shift pages
7. ⬜ Add unit tests for geolocation utilities
8. ⬜ Test with real devices over HTTPS

---

## Rollback

To rollback this schema patch:

```sql
DROP TABLE IF EXISTS checkInRecords CASCADE;
DROP TABLE IF EXISTS projectSites CASCADE;
```

Then remove the table definitions from `drizzle/schema.ts` and regenerate migrations.

```
</script>
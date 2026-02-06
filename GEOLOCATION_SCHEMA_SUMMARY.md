# Geolocation Check-In System: Schema Patch Summary

## Executive Summary

The Drizzle ORM schema has been successfully patched with two new tables to support GPS-based employee check-ins for the Workforce & Timesheets system. This document provides a comprehensive overview of all changes.

## Changes Made

### Modified Files
- `drizzle/schema.ts` - Added `projectSites` and `checkInRecords` table definitions

### New Documentation Files
- `DRIZZLE_MIGRATION_GUIDE.md` - Complete migration walkthrough
- `SCHEMA_PATCH_SUMMARY.md` - Detailed schema reference
- `SCHEMA_QUICKSTART.md` - Quick start guide
- `SCHEMA_CODE_ADDITIONS.ts` - Exact code additions
- `GEOLOCATION_SCHEMA_SUMMARY.md` - This file

## Database Schema Changes

### Table 1: projectSites

**Purpose:** Define geographic boundaries (geofences) for job sites where employees can check in.

**Structure:**
```
projectSites (PostgreSQL table)
├─ id (serial, PK)
├─ projectId (integer, FK → projects.id, CASCADE)
├─ name (varchar 255, NOT NULL) - Site identifier
├─ description (text)
├─ latitude (double precision, NOT NULL) - GPS coordinate
├─ longitude (double precision, NOT NULL) - GPS coordinate
├─ radiusMeters (integer, default: 50) - Geofence radius
├─ address (varchar 500)
├─ city (varchar 100)
├─ state (varchar 100)
├─ zipCode (varchar 20)
├─ country (varchar 100)
├─ isActive (boolean, default: true) - Enable/disable checking
├─ createdBy (integer, FK → users.id)
├─ createdAt (timestamp, auto-set)
└─ updatedAt (timestamp, auto-set)
```

**TypeScript Exports:**
```typescript
export type ProjectSite = typeof projectSites.$inferSelect;
export type InsertProjectSite = typeof projectSites.$inferInsert;
```

**Key Features:**
- One project can have multiple sites
- Radius defines the geofence boundary (default 50 meters)
- Can be deactivated without deletion (preserves history)
- Tracks who created each site
- Full address information for reference

**Example Data:**
```
ID: 1
ProjectID: 5
Name: "Main Concrete Pour Area"
Latitude: 40.7128
Longitude: -74.0060
RadiusMeters: 100
Address: "123 Construction St, New York, NY 10001"
IsActive: true
```

---

### Table 2: checkInRecords

**Purpose:** Log all employee check-ins with GPS coordinates and geofence validation results.

**Structure:**
```
checkInRecords (PostgreSQL table)
├─ id (serial, PK)
├─ shiftId (integer, FK → shifts.id, CASCADE, NOT NULL)
├─ employeeId (integer, FK → employees.id, CASCADE, NOT NULL)
├─ projectSiteId (integer, FK → projectSites.id, RESTRICT, NOT NULL)
├─ latitude (double precision, NOT NULL) - Check-in GPS location
├─ longitude (double precision, NOT NULL) - Check-in GPS location
├─ accuracy (double precision, NOT NULL) - GPS accuracy in meters
├─ distanceFromSiteMeters (double precision) - Calculated distance from site
├─ isWithinGeofence (boolean, NOT NULL) - Validation result
├─ checkInType (varchar 20, default: 'check_in') - check_in, check_out, break_start, break_end
├─ ipAddress (varchar 45) - Client IP address
├─ userAgent (text) - Browser/device info
├─ notes (text) - Admin notes (e.g., reason for out-of-geofence)
└─ createdAt (timestamp, auto-set) - Check-in timestamp
```

**TypeScript Exports:**
```typescript
export type CheckInRecord = typeof checkInRecords.$inferSelect;
export type InsertCheckInRecord = typeof checkInRecords.$inferInsert;
```

**Key Features:**
- One record per check-in event
- Immutable (no updates after creation)
- Always validates against geofence on server
- Stores GPS accuracy for quality assessment
- Calculates and stores distance from site center
- Records device info for security audit
- Flexible check-in types (check-in, check-out, breaks)

**Example Data:**
```
ID: 1
ShiftID: 42
EmployeeID: 5
ProjectSiteID: 1
Latitude: 40.7130
Longitude: -74.0062
Accuracy: 15.5
DistanceFromSiteMeters: 25.3
IsWithinGeofence: true
CheckInType: "check_in"
IPAddress: "192.168.1.1"
CreatedAt: 2024-01-15 08:00:00
```

---

## Database Relationships

### Entity Relationship Diagram

```
┌─────────────┐
│   users     │
└──────┬──────┘
       │
       ├──────────────────┐
       │                  │
       ▼                  ▼
┌─────────────┐    ┌────────────────┐
│  employees  │    │  projectSites  │
└──────┬──────┘    └────────┬────────┘
       │                    │
       │         ┌──────────┘
       │         │
       ▼         ▼
    ┌──────────────────────┐
    │  shifts              │
    └──────┬───────────────┘
           │
           ▼
    ┌──────────────────────┐
    │  checkInRecords      │
    └──────────────────────┘
```

### Foreign Key Constraints

| Table | Foreign Key | References | Behavior |
|-------|-------------|-----------|----------|
| projectSites | projectId | projects.id | CASCADE delete |
| projectSites | createdBy | users.id | No action |
| checkInRecords | shiftId | shifts.id | CASCADE delete |
| checkInRecords | employeeId | employees.id | CASCADE delete |
| checkInRecords | projectSiteId | projectSites.id | RESTRICT delete |

**Delete Behavior Explanation:**
- **CASCADE:** If parent deleted, child records are automatically deleted
  - Deleting a project → deletes all its project sites
  - Deleting a shift → deletes all its check-in records
  - Deleting an employee → deletes all their check-in records
- **RESTRICT:** Prevents parent deletion if child records exist
  - Cannot delete a project site if check-in records reference it (maintains audit trail)

---

## Migration Process

### Quick Migration
```bash
# 1. Generate migration file from schema changes
npm run db:generate

# 2. Apply migration to database
npm run db:push

# 3. Verify tables exist
psql -U your_user -d your_db -c "\dt projectSites; \dt checkInRecords;"
```

### Manual Migration (if needed)
```bash
# Generate SQL only (don't apply)
npx drizzle-kit generate:pg

# Review the generated SQL
cat drizzle/migrations/[timestamp]_*.sql

# Apply manually
psql -U your_user -d your_db -f drizzle/migrations/[timestamp]_*.sql
```

### Rollback (if needed)
```sql
DROP TABLE IF EXISTS checkInRecords CASCADE;
DROP TABLE IF EXISTS projectSites CASCADE;
```

---

## TypeScript Integration

### Importing Types and Tables

```typescript
import {
  projectSites,
  checkInRecords,
  ProjectSite,
  InsertProjectSite,
  CheckInRecord,
  InsertCheckInRecord
} from "@/drizzle/schema";
import { db } from "@/server/db";
import { eq } from "drizzle-orm";
```

### Common Operations

**Insert a Project Site:**
```typescript
const site = await db.insert(projectSites).values({
  projectId: 1,
  name: "Site Name",
  latitude: 40.7128,
  longitude: -74.0060,
  radiusMeters: 100,
  isActive: true,
  createdBy: userId,
} satisfies InsertProjectSite).returning();
```

**Record a Check-In:**
```typescript
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
} satisfies InsertCheckInRecord).returning();
```

**Query Check-Ins:**
```typescript
const checkins: CheckInRecord[] = await db
  .select()
  .from(checkInRecords)
  .where(eq(checkInRecords.shiftId, shiftId));
```

**Query with Joins:**
```typescript
const checkinDetails = await db
  .select({
    checkin: checkInRecords,
    employee: employees,
    site: projectSites,
  })
  .from(checkInRecords)
  .innerJoin(employees, eq(checkInRecords.employeeId, employees.id))
  .innerJoin(projectSites, eq(checkInRecords.projectSiteId, projectSites.id))
  .where(eq(checkInRecords.shiftId, shiftId));
```

---

## Data Validation & Constraints

### Database Level

| Column | Constraint | Purpose |
|--------|-----------|---------|
| projectSites.projectId | NOT NULL, FK | Every site must belong to a project |
| projectSites.latitude | NOT NULL | Required for geofence calculation |
| projectSites.longitude | NOT NULL | Required for geofence calculation |
| projectSites.radiusMeters | NOT NULL, default 50 | Geofence must have a size |
| checkInRecords.shiftId | NOT NULL, FK | Every check-in belongs to a shift |
| checkInRecords.employeeId | NOT NULL, FK | Every check-in is by an employee |
| checkInRecords.latitude | NOT NULL | GPS location is mandatory |
| checkInRecords.longitude | NOT NULL | GPS location is mandatory |
| checkInRecords.accuracy | NOT NULL | Accuracy must be recorded |
| checkInRecords.isWithinGeofence | NOT NULL | Validation result must be stored |

### Application Level Validation (Zod)

See `/shared/schemas/geolocation.ts` for detailed Zod validation schemas:
- Latitude/Longitude bounds: -90 to 90 (latitude), -180 to 180 (longitude)
- Radius bounds: 10 to 1000 meters
- Accuracy threshold: ≤50 meters recommended for acceptance

---

## Security & Privacy Considerations

### Data Sensitivity
Location data is personally identifiable and subject to privacy regulations:
- **GDPR:** Right to access, rectification, erasure
- **CCPA:** Consumer data privacy rights
- **General Privacy:** Location can reveal patterns (home address, religious sites, etc.)

### Required Protections

1. **HTTPS Only**
   - Geolocation API requires HTTPS
   - All location data transmission must be encrypted

2. **Access Control**
   - Only employees can access their own check-ins
   - Managers can access their team's data
   - Admins can access all data
   - Implement row-level security if needed

3. **Data Retention**
   ```sql
   -- Example: Delete records older than 90 days
   DELETE FROM checkInRecords WHERE createdAt < NOW() - INTERVAL '90 days';
   ```

4. **Encryption**
   - Consider encrypting lat/lon columns at rest
   - Use PostgreSQL pgcrypto extension

5. **Audit Logging**
   - Log all access to check-in records
   - Use `complianceAuditTrail` table for this
   - Track who viewed/accessed location data

6. **Anonymization**
   - Remove IP addresses and user agents for old records
   - Implement PII masking in reporting

### Rate Limiting
Implement rate limiting on check-in endpoint:
```
Max 10 check-ins per employee per day
Max 100 check-ins per minute (system-wide)
```

---

## Performance Optimization

### Recommended Indexes

```sql
-- Primary queries
CREATE INDEX idx_checkInRecords_employeeId ON checkInRecords(employeeId);
CREATE INDEX idx_checkInRecords_shiftId ON checkInRecords(shiftId);
CREATE INDEX idx_checkInRecords_projectSiteId ON checkInRecords(projectSiteId);

-- Time-based queries
CREATE INDEX idx_checkInRecords_createdAt ON checkInRecords(createdAt DESC);

-- Compound indexes for common queries
CREATE INDEX idx_checkInRecords_shift_type ON checkInRecords(shiftId, checkInType);
CREATE INDEX idx_projectSites_projectId ON projectSites(projectId);
```

### Query Performance Tips

- Filter by `createdAt` for large result sets (use pagination)
- Index foreign keys (usually automatic)
- Use EXPLAIN ANALYZE to verify index usage
- Archive old check-in records to separate table if data grows large

---

## Integration Points

### With Existing System

**employees Table**
- Each employee can have multiple check-ins
- Employee must exist to create a check-in

**shifts Table**
- Each shift can have multiple check-ins
- Check-in is tied to specific shift

**projects Table**
- Each project can have multiple sites
- Cascade delete: removing project removes all its sites

**users Table**
- Tracks who created project sites
- Audit trail for site creation/modification

### Missing Integration (To Be Built)

1. **API Endpoint:** `/app/api/check-in/route.ts`
   - Accept geolocation data
   - Validate against geofence
   - Persist to checkInRecords

2. **Admin Panel:** Project Sites Management
   - CRUD operations for projectSites
   - Map visualization
   - Bulk import/export

3. **Frontend Component:** GeolocationCheckIn
   - Request browser geolocation
   - Display accuracy and geofence status
   - Submit to API

4. **Analytics:** Check-in Reports
   - Success rate by employee/site
   - Accuracy distribution
   - Out-of-geofence incidents

---

## Migration Checklist

- [ ] Read this summary document
- [ ] Review `DRIZZLE_MIGRATION_GUIDE.md` for detailed steps
- [ ] Run `npm run db:generate` to create migration
- [ ] Review generated SQL in `drizzle/migrations/`
- [ ] Run `npm run db:push` to apply migration
- [ ] Verify tables in database: `\dt projectSites; \dt checkInRecords;`
- [ ] Test insertion of sample data
- [ ] Verify TypeScript types are accessible in IDE
- [ ] Implement API endpoint
- [ ] Build admin panel for project sites
- [ ] Integrate frontend component
- [ ] Create unit tests
- [ ] Test on real device with HTTPS
- [ ] Deploy to production
- [ ] Monitor check-in success rates

---

## FAQ

**Q: Can I change the default radius from 50 meters?**
A: Yes, update `radiusMeters` in projectSites table or change the default in schema.

**Q: What if GPS accuracy is poor?**
A: The `accuracy` field is recorded. Server-side validation rejects accuracy > 50m by default.

**Q: Can an employee check in from a different site?**
A: Yes, but `isWithinGeofence` will be false. Business logic determines if this is allowed.

**Q: What happens if a project site is deleted?**
A: Deletion is RESTRICTED if check-in records exist. History is preserved.

**Q: How long should check-in records be kept?**
A: Implement a retention policy (e.g., 90 days) based on your privacy regulations.

**Q: Can employees see each other's check-ins?**
A: No, implement access control. Employees see only their own; managers see their team's.

**Q: What about offline check-ins?**
A: Currently not supported. Future enhancement could queue check-ins for sync when online.

---

## Related Documentation

- `DRIZZLE_MIGRATION_GUIDE.md` - Complete migration walkthrough
- `SCHEMA_PATCH_SUMMARY.md` - Schema reference and usage
- `SCHEMA_CODE_ADDITIONS.ts` - Exact code added to schema
- `SCHEMA_QUICKSTART.md` - Quick start guide
- `GEOLOCATION_IMPLEMENTATION_GUIDE.md` - API endpoint implementation
- `/shared/schemas/geolocation.ts` - Zod validation schemas
- `/server/utils/geolocation.ts` - Server-side utilities (Haversine, etc.)

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2024-01-15 | Initial schema patch with projectSites and checkInRecords tables |

---

**Last Updated:** 2024-01-15
**Status:** Ready for Migration
**Next Steps:** Run `npm run db:generate && npm run db:push`

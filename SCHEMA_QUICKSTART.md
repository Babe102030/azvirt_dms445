# Schema Migration Quick Start

## TL;DR - Just Run These Commands

```bash
# 1. Generate the migration
npm run db:generate

# 2. Review the generated SQL (optional but recommended)
ls -la drizzle/migrations/

# 3. Apply the migration
npm run db:push

# 4. Verify in your database
psql -U your_user -d your_db -c "\dt projectSites; \dt checkInRecords;"
```

## What Was Changed?

Two new tables have been added to `drizzle/schema.ts`:

### Table 1: `projectSites`
Stores job site locations with geofence boundaries.

```
projectSites
├── id (Primary Key)
├── projectId (Foreign Key → projects)
├── name, description
├── latitude, longitude (GPS coordinates)
├── radiusMeters (geofence radius, default: 50m)
├── address, city, state, zipCode, country
├── isActive (enable/disable)
├── createdBy (Foreign Key → users)
├── createdAt, updatedAt
```

### Table 2: `checkInRecords`
Logs employee check-ins with location data.

```
checkInRecords
├── id (Primary Key)
├── shiftId (Foreign Key → shifts)
├── employeeId (Foreign Key → employees)
├── projectSiteId (Foreign Key → projectSites)
├── latitude, longitude (GPS coordinates)
├── accuracy (GPS accuracy in meters)
├── distanceFromSiteMeters (calculated distance)
├── isWithinGeofence (boolean validation result)
├── checkInType (check_in, check_out, break_start, break_end)
├── ipAddress, userAgent (device info)
├── notes
├── createdAt
```

## Step-by-Step Migration

### Step 1: Generate Migration File
```bash
npm run db:generate
```
This creates a new SQL migration file in `drizzle/migrations/` based on the schema changes.

### Step 2: Review the Generated SQL (Optional)
```bash
cat drizzle/migrations/[timestamp]_*.sql
```
Look for CREATE TABLE statements for `projectSites` and `checkInRecords`.

### Step 3: Apply the Migration
```bash
npm run db:push
```
Applies the migration to your PostgreSQL database.

### Step 4: Verify Success
```bash
# Connect to your database
psql -U your_username -d your_database_name

# Check if tables exist
\dt projectSites
\dt checkInRecords

# View table structure
\d projectSites
\d checkInRecords

# Exit
\q
```

## Verification Checklist

- [ ] Migration generated without errors
- [ ] `npm run db:push` completed successfully
- [ ] Both tables exist in your database
- [ ] Foreign keys are properly created
- [ ] Default values are set (radiusMeters=50, isActive=true, checkInType='check_in')

## Using the New Tables

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

await db.insert(projectSites).values({
  projectId: 1,
  name: "Main Job Site",
  latitude: 40.7128,
  longitude: -74.0060,
  radiusMeters: 100,
  address: "123 Main St",
  city: "New York",
  state: "NY",
  zipCode: "10001",
  country: "USA",
  isActive: true,
  createdBy: userId,
});
```

### Record a Check-In
```typescript
import { db } from "@/server/db";
import { checkInRecords } from "@/drizzle/schema";

await db.insert(checkInRecords).values({
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
});
```

## Troubleshooting

### ❌ "Migration generation failed"
**Solution:** Ensure all referenced tables exist (projects, shifts, employees, users)

### ❌ "Foreign key constraint failed"
**Solution:** This shouldn't happen - check that Drizzle is up to date:
```bash
npm install drizzle-orm drizzle-kit@latest
```

### ❌ "Cannot drop table - foreign key constraint"
**Solution:** Drop in reverse order:
```sql
DROP TABLE IF EXISTS checkInRecords CASCADE;
DROP TABLE IF EXISTS projectSites CASCADE;
```

### ✅ "Tables already exist"
**Solution:** Your migration already ran. You're good to go!

## What's Next?

After the migration is complete:

1. **Create API Endpoint** - `/app/api/check-in/route.ts`
2. **Build Admin Panel** - Manage project sites and geofences
3. **Integrate Frontend** - Add GeolocationCheckIn component to timesheet pages
4. **Add Tests** - Test geolocation utilities
5. **Deploy & Monitor** - Track check-in success rates

## Need Help?

- Full migration guide: See `DRIZZLE_MIGRATION_GUIDE.md`
- Schema details: See `SCHEMA_PATCH_SUMMARY.md`
- Code additions: See `SCHEMA_CODE_ADDITIONS.ts`

## Related Files

- `drizzle/schema.ts` - Updated with new tables
- `DRIZZLE_MIGRATION_GUIDE.md` - Comprehensive guide
- `SCHEMA_PATCH_SUMMARY.md` - Detailed schema documentation
- `SCHEMA_CODE_ADDITIONS.ts` - Exact code added
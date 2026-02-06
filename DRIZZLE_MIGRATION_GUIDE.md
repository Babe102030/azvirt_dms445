# Drizzle Schema Migration Guide: Geolocation Check-In System

## Overview

This guide walks you through the process of migrating your Drizzle ORM schema to include the `projectSites` and `checkInRecords` tables required for the Geolocation Check-In System.

## What Changed

Two new tables have been added to `drizzle/schema.ts`:

### 1. `projectSites` Table
Stores geofence boundaries and metadata for job sites.

**Schema:**
```typescript
projectSites: {
  id: serial (PK)
  projectId: integer (FK → projects.id)
  name: varchar(255) [NOT NULL]
  description: text
  latitude: double precision [NOT NULL]
  longitude: double precision [NOT NULL]
  radiusMeters: integer [NOT NULL, default: 50]
  address: varchar(500)
  city: varchar(100)
  state: varchar(100)
  zipCode: varchar(20)
  country: varchar(100)
  isActive: boolean [NOT NULL, default: true]
  createdBy: integer (FK → users.id)
  createdAt: timestamp [NOT NULL, default: NOW()]
  updatedAt: timestamp [NOT NULL, default: NOW()]
}
```

### 2. `checkInRecords` Table
Logs all employee check-ins with location data and accuracy metrics.

**Schema:**
```typescript
checkInRecords: {
  id: serial (PK)
  shiftId: integer (FK → shifts.id, CASCADE on delete)
  employeeId: integer (FK → employees.id, CASCADE on delete)
  projectSiteId: integer (FK → projectSites.id, RESTRICT on delete)
  latitude: double precision [NOT NULL]
  longitude: double precision [NOT NULL]
  accuracy: double precision [NOT NULL]
  distanceFromSiteMeters: double precision
  isWithinGeofence: boolean [NOT NULL]
  checkInType: varchar(20) [NOT NULL, default: 'check_in']
  ipAddress: varchar(45)
  userAgent: text
  notes: text
  createdAt: timestamp [NOT NULL, default: NOW()]
}
```

## Migration Steps

### Step 1: Verify the Schema Update

The schema has already been updated in `drizzle/schema.ts`. Verify that both tables have been added at the end of the file:

```bash
tail -n 70 drizzle/schema.ts
```

You should see the `projectSites` and `checkInRecords` table definitions.

### Step 2: Generate the Migration

Use Drizzle Kit to generate the migration file:

```bash
npm run db:generate
# or
npx drizzle-kit generate:pg
```

This will create a new migration file in the `drizzle/migrations/` directory with SQL statements to create the two tables.

### Step 3: Review the Generated Migration

Check the generated migration file (it will have a timestamp in its name, e.g., `drizzle/migrations/0001_icy_wolverine.sql`):

```bash
ls -la drizzle/migrations/
cat drizzle/migrations/[latest-migration-file].sql
```

Expected SQL structure:
- CREATE TABLE `projectSites` with all columns and constraints
- CREATE TABLE `checkInRecords` with all columns and foreign key references

### Step 4: Apply the Migration

Push the migration to your database:

```bash
npm run db:push
# or
npx drizzle-kit push:pg
```

**Alternative:** If you use a manual migration workflow:
```bash
psql -U [username] -d [database_name] -f drizzle/migrations/[migration-file].sql
```

### Step 5: Verify the Tables in Your Database

Connect to your database and verify the tables were created:

```bash
psql -U [username] -d [database_name]
\dt projectSites
\dt checkInRecords
\d projectSites
\d checkInRecords
```

Expected output:
- Both tables should exist with all specified columns
- Foreign key constraints should be in place
- Indexes on foreign keys should be created automatically

## Schema Relationships

### Foreign Key Relationships:

```
projectSites
├── projectId → projects.id (CASCADE on delete)
└── createdBy → users.id

checkInRecords
├── shiftId → shifts.id (CASCADE on delete)
├── employeeId → employees.id (CASCADE on delete)
└── projectSiteId → projectSites.id (RESTRICT on delete)
```

**Key Notes:**
- `projectSites.projectId` has CASCADE delete: if a project is deleted, all its sites are deleted
- `checkInRecords.shiftId` and `employeeId` have CASCADE delete: if a shift or employee is deleted, check-in records are deleted
- `checkInRecords.projectSiteId` has RESTRICT delete: prevents deletion of a project site if check-in records reference it

## Type Exports

The following TypeScript types have been added to `drizzle/schema.ts` for use in your application:

```typescript
export type ProjectSite = typeof projectSites.$inferSelect;
export type InsertProjectSite = typeof projectSites.$inferInsert;

export type CheckInRecord = typeof checkInRecords.$inferSelect;
export type InsertCheckInRecord = typeof checkInRecords.$inferInsert;
```

Use these types in your API routes and components:

```typescript
import { ProjectSite, InsertProjectSite, CheckInRecord, InsertCheckInRecord } from "@/drizzle/schema";

// In your API endpoint
async function handleCheckIn(data: InsertCheckInRecord) {
  // ...
}
```

## Rollback (If Needed)

If you need to rollback this migration, Drizzle Kit doesn't automatically create rollback migrations. You can manually create one:

**Option 1: Drop the tables manually**
```sql
DROP TABLE IF EXISTS checkInRecords CASCADE;
DROP TABLE IF EXISTS projectSites CASCADE;
```

**Option 2: Use the Drizzle UI (if available)**
```bash
npx drizzle-kit studio
```

## Next Steps

1. **Create the API Endpoint**: Implement `/app/api/check-in/route.ts` to handle check-in requests
2. **Create Project Sites Admin**: Build an admin panel to manage project sites and geofences
3. **Frontend Integration**: Import the `GeolocationCheckIn` component into your timesheet/shift pages
4. **Testing**: Run unit tests and manual testing with real devices
5. **Monitoring**: Set up analytics to track check-in success rates and accuracy metrics

## Common Issues & Troubleshooting

### Issue: Migration fails with foreign key constraint error
**Solution:** Ensure that the `projects`, `shifts`, and `employees` tables already exist. They should, as they're referenced in the schema.

### Issue: `radiusMeters` column values need updating
**Solution:** The default value is 50 meters. You can update existing rows:
```sql
UPDATE projectSites SET radiusMeters = 100 WHERE id = [site_id];
```

### Issue: Need to add columns later
**Solution:** Use `npm run db:generate` to create a new migration with the additional columns.

## Database Performance

### Recommended Indexes

For better query performance, consider adding indexes (Drizzle Kit may create these automatically):

```sql
CREATE INDEX idx_checkInRecords_employeeId ON checkInRecords(employeeId);
CREATE INDEX idx_checkInRecords_shiftId ON checkInRecords(shiftId);
CREATE INDEX idx_checkInRecords_projectSiteId ON checkInRecords(projectSiteId);
CREATE INDEX idx_checkInRecords_createdAt ON checkInRecords(createdAt);
CREATE INDEX idx_projectSites_projectId ON projectSites(projectId);
```

## Data Retention & Privacy

**Important:** Location data is sensitive. Implement:

1. **Data Retention Policy**: Delete check-in records older than X days
2. **Encryption**: Consider encrypting latitude/longitude columns
3. **Access Control**: Restrict who can view check-in records
4. **GDPR Compliance**: Allow employees to request data deletion

Example cleanup query:
```sql
DELETE FROM checkInRecords WHERE createdAt < NOW() - INTERVAL '90 days';
```

## Support

For issues with Drizzle migrations, refer to:
- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [Drizzle Kit CLI](https://orm.drizzle.team/kit-docs/overview)
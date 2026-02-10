# New Features Documentation

This document outlines the new features added to the AzVirt DMS system, including database migrations, UI components, and navigation updates.

## Table of Contents

1. [Database Migration](#database-migration)
2. [New Database Tables](#new-database-tables)
3. [New UI Components](#new-ui-components)
4. [Navigation Updates](#navigation-updates)
5. [API Endpoints](#api-endpoints)
6. [Usage Guide](#usage-guide)

---

## Database Migration

### Migration File: `0006_flawless_morbius.sql`

**Location:** `drizzle/0006_flawless_morbius.sql`

**Status:** ✅ SQL file generated successfully

**Applied:** Migration SQL generated but requires database connection to apply.

### What Changed

The migration adds several new tables and modifies existing ones to support:
- Concrete base management
- Aggregate input tracking
- Email template customization
- Email branding configuration

---

## New Database Tables

### 1. `concrete_bases`

**Purpose:** Manage concrete production facilities/bases

**Columns:**
- `id` (serial, primary key)
- `name` (varchar 255, not null) - Base name
- `location` (text) - Physical location
- `capacity` (integer) - Production capacity in m³ per hour
- `status` (varchar 20, default 'active') - operational status
- `managerName` (varchar 255) - Base manager name
- `phoneNumber` (varchar 50) - Contact number
- `createdAt` (timestamp, default now)
- `updatedAt` (timestamp, default now)

**Use Case:** Track and manage multiple concrete production facilities, their capacity, and operational status.

---

### 2. `aggregate_inputs`

**Purpose:** Track material inputs at concrete bases

**Columns:**
- `id` (serial, primary key)
- `concreteBaseId` (integer, foreign key → concrete_bases.id, cascade delete)
- `date` (timestamp, default now)
- `materialType` (varchar 50) - cement, sand, gravel, water, admixture, other
- `materialName` (varchar 255) - Specific material name
- `quantity` (double precision) - Amount received
- `unit` (varchar 20) - Measurement unit (kg, ton, m³, L, bags)
- `supplier` (varchar 255) - Supplier name
- `batchNumber` (varchar 100) - Batch/lot number for traceability
- `receivedBy` (varchar 255) - Employee who received the material
- `notes` (text) - Additional notes
- `createdAt` (timestamp, default now)

**Foreign Keys:**
- `concreteBaseId` references `concrete_bases(id)` with ON DELETE CASCADE

**Use Case:** Maintain detailed records of all raw material inputs for production tracking, quality control, and inventory management.

---

### 3. `email_templates`

**Purpose:** Customizable email templates for system notifications

**Columns:**
- `id` (serial, primary key)
- `type` (varchar 50, unique, not null) - Template type identifier
- `name` (varchar 255) - Human-readable template name
- `description` (text) - Template description
- `subject` (varchar 500) - Email subject line
- `bodyHtml` (text) - HTML email body
- `bodyText` (text) - Plain text fallback
- `isCustom` (boolean, default false) - User-customized flag
- `isActive` (boolean, default true) - Active status
- `variables` (text) - JSON array of available variables
- `createdBy` (integer, foreign key → users.id)
- `createdAt` (timestamp, default now)
- `updatedAt` (timestamp, default now)

**Template Types:**
- `daily_production_report`
- `low_stock_alert`
- `purchase_order`
- `generic_notification`
- `delivery_confirmation`
- `quality_test_report`

**Use Case:** Allow administrators to customize email notifications sent by the system.

---

### 4. `email_branding`

**Purpose:** Configure email branding and styling

**Columns:**
- `id` (serial, primary key)
- `logoUrl` (text) - Company logo URL
- `primaryColor` (varchar 20, default '#f97316') - Primary brand color
- `secondaryColor` (varchar 20, default '#ea580c') - Secondary brand color
- `companyName` (varchar 255, default 'AzVirt') - Company name
- `footerText` (text) - Email footer text
- `headerStyle` (varchar 50, default 'gradient') - gradient, solid, or two-tone
- `fontFamily` (varchar 100, default 'Arial, sans-serif') - Email font
- `updatedBy` (integer, foreign key → users.id)
- `updatedAt` (timestamp, default now)

**Use Case:** Centralize email branding to maintain consistent visual identity across all system-generated emails.

---

### 5. `machines` Table Updates

**New Columns:**
- `totalWorkingHours` (double precision, default 0) - Accumulated working hours
- `concreteBaseId` (integer, foreign key → concrete_bases.id) - Associated base

**Purpose:** Link machines to concrete bases and track total operational hours.

---

## New UI Components

### 1. Aggregate Inputs Page

**File:** `client/src/pages/AggregateInputs.tsx`

**Route:** `/aggregate-inputs`

**Features:**
- Record new aggregate inputs with detailed information
- Filter by concrete base and material type
- View complete input history in table format
- Material type badges with color coding
- Supplier and batch number tracking

**Key Functions:**
- Add new aggregate input
- Filter inputs by base or material type
- Display input records with full details

**Components Used:**
- Dialog for input form
- Select dropdowns for filters
- Table for data display
- Badge components for visual categorization

---

### 2. AggregateInputStats Component

**File:** `client/src/components/AggregateInputStats.tsx`

**Purpose:** Display aggregate input statistics and analytics

**Features:**
- Summary cards showing:
  - Total inputs in time period
  - Material types tracked
  - Active concrete bases
  - Unique suppliers
- Material type breakdown with quantities
- Recent inputs list
- Configurable date range (default: 30 days)

**Props:**
```typescript
interface AggregateInputStatsProps {
  concreteBaseId?: number; // Filter by specific base
  days?: number; // Date range (default: 30)
}
```

**Use Cases:**
- Dashboard widgets
- Concrete base detail views
- Production analytics
- Inventory management reports

---

### 3. EmailTemplateCard Component

**File:** `client/src/components/EmailTemplateCard.tsx`

**Purpose:** Reusable card component for displaying email templates

**Features:**
- Visual status indicator (active/inactive)
- Template type badge with color coding
- Subject line preview
- Available variables display
- Action dropdown menu:
  - Edit template
  - Preview template
  - Toggle active status
  - Duplicate template
  - Delete (custom templates only)
- Metadata display (type, last updated)

**Props:**
```typescript
interface EmailTemplateCardProps {
  template: EmailTemplate;
  onEdit?: (template: EmailTemplate) => void;
  onPreview?: (template: EmailTemplate) => void;
  onToggleActive?: (template: EmailTemplate) => void;
  onDuplicate?: (template: EmailTemplate) => void;
  onDelete?: (template: EmailTemplate) => void;
}
```

---

### 4. EmailBrandingPreview Component

**File:** `client/src/components/EmailBrandingPreview.tsx`

**Purpose:** Live preview of email branding configuration

**Features:**
- Simulated email client interface
- Real-time branding preview
- Header style variations (gradient, solid, two-tone)
- Logo display (if configured)
- Sample content rendering
- Color swatch display
- Font family preview
- Responsive layout

**Props:**
```typescript
interface EmailBrandingPreviewProps {
  branding: {
    logoUrl?: string;
    primaryColor: string;
    secondaryColor: string;
    companyName: string;
    footerText?: string;
    headerStyle: string;
    fontFamily: string;
  };
  sampleContent?: {
    subject?: string;
    previewText?: string;
    bodyTitle?: string;
    bodyContent?: string[];
  };
}
```

---

## Navigation Updates

### DashboardLayout Menu Addition

**New Menu Item:**
```typescript
{
  icon: Package,
  label: "Aggregate Inputs",
  path: "/aggregate-inputs",
}
```

**Position:** After "Concrete Base DB" and before "Low Stock Settings"

**Icon:** Package (from lucide-react)

---

## API Endpoints

### Concrete Bases

**Router:** `appRouter.concreteBases`

```typescript
// List all concrete bases
concreteBases.list()

// Create new concrete base
concreteBases.create({
  name: string,
  location: string,
  capacity: number,
  status: "operational" | "maintenance" | "inactive",
  managerName?: string,
  phoneNumber?: string
})

// Update concrete base
concreteBases.update({
  id: number,
  data: { /* partial fields */ }
})
```

---

### Aggregate Inputs

**Router:** `appRouter.aggregateInputs`

```typescript
// List aggregate inputs (with optional filters)
aggregateInputs.list({
  concreteBaseId?: number,
  materialType?: string
})

// Create new aggregate input
aggregateInputs.create({
  concreteBaseId: number,
  date: Date,
  materialType: "cement" | "sand" | "gravel" | "water" | "admixture" | "other",
  materialName: string,
  quantity: number,
  unit: string,
  supplier?: string,
  batchNumber?: string,
  receivedBy?: string,
  notes?: string
})
```

---

## Usage Guide

### Recording Aggregate Inputs

1. Navigate to **Aggregate Inputs** page from the sidebar
2. Click **"Add Input"** button
3. Fill in the form:
   - **Concrete Base** (required): Select the production facility
   - **Material Type** (required): Choose from predefined types
   - **Material Name** (required): Enter specific material name
   - **Quantity** (required): Enter amount received
   - **Unit** (required): Select measurement unit
   - **Supplier** (optional): Enter supplier name
   - **Batch Number** (optional): Enter batch/lot number
   - **Received By** (optional): Enter employee name
   - **Notes** (optional): Add any additional information
4. Click **"Record Input"**

### Filtering Aggregate Inputs

Use the filters card to:
- Filter by specific concrete base
- Filter by material type
- Click "Clear Filters" to reset

### Using AggregateInputStats Component

```tsx
import AggregateInputStats from "@/components/AggregateInputStats";

// Show stats for all bases (last 30 days)
<AggregateInputStats />

// Show stats for specific base (last 7 days)
<AggregateInputStats concreteBaseId={1} days={7} />
```

### Using EmailTemplateCard Component

```tsx
import EmailTemplateCard from "@/components/EmailTemplateCard";

<EmailTemplateCard
  template={template}
  onEdit={(t) => handleEdit(t)}
  onPreview={(t) => handlePreview(t)}
  onToggleActive={(t) => handleToggle(t)}
  onDuplicate={(t) => handleDuplicate(t)}
  onDelete={(t) => handleDelete(t)}
/>
```

### Using EmailBrandingPreview Component

```tsx
import EmailBrandingPreview from "@/components/EmailBrandingPreview";

<EmailBrandingPreview
  branding={{
    logoUrl: "/logo.png",
    primaryColor: "#f97316",
    secondaryColor: "#ea580c",
    companyName: "AzVirt",
    footerText: "Custom footer text",
    headerStyle: "gradient",
    fontFamily: "Arial, sans-serif"
  }}
  sampleContent={{
    subject: "Daily Report",
    previewText: "Your daily summary",
    bodyTitle: "Production Report",
    bodyContent: ["Metric 1: Value 1", "Metric 2: Value 2"]
  }}
/>
```

---

## Material Type Color Coding

The system uses consistent color coding for material types:

| Material Type | Color | CSS Class |
|--------------|-------|-----------|
| Cement | Gray | `bg-gray-500` |
| Sand | Yellow | `bg-yellow-500` |
| Gravel | Stone | `bg-stone-500` |
| Water | Blue | `bg-blue-500` |
| Admixture | Purple | `bg-purple-500` |
| Other | Orange | `bg-orange-500` |

---

## Database Migration Commands

### Run Migration (Generate + Apply)
```bash
pnpm db:push
```

This command:
1. Generates SQL migration file in `drizzle/` directory
2. Attempts to apply migration to database

### Generate Migration Only
```bash
drizzle-kit generate
```

### Apply Existing Migrations
```bash
drizzle-kit migrate
```

---

## Future Enhancements

### Planned Features

1. **Aggregate Input Analytics**
   - Trend charts for material consumption
   - Supplier performance metrics
   - Inventory forecasting

2. **Email Template Builder**
   - Drag-and-drop template editor
   - Template testing interface
   - Variable insertion tool

3. **Concrete Base Dashboard Enhancements**
   - Production capacity utilization
   - Machine allocation visualization
   - Real-time inventory levels

4. **Batch Tracking**
   - QR code generation for batches
   - Traceability reports
   - Quality correlation analysis

---

## Troubleshooting

### Migration Issues

**Problem:** Migration fails with connection error
```
DrizzleQueryError: Failed query: CREATE SCHEMA IF NOT EXISTS "drizzle"
AggregateError [ECONNREFUSED]
```

**Solution:** Ensure PostgreSQL database is running and connection string is correct in `drizzle.config.ts`

---

**Problem:** Tables already exist
**Solution:** Drop existing tables or modify migration file to handle existing schema

---

### UI Component Issues

**Problem:** Component not rendering
**Solution:** 
1. Check import paths
2. Verify tRPC router is properly configured
3. Check browser console for errors

---

**Problem:** Data not loading
**Solution:**
1. Verify API endpoints are working (check Network tab)
2. Check authentication status
3. Verify database has data

---

## Contributing

When adding new features related to these components:

1. Update relevant schema files in `drizzle/schema.ts`
2. Run migration generation: `pnpm db:push`
3. Update API routers in `server/routers.ts`
4. Create/update UI components in `client/src/components/`
5. Add routes in `client/src/App.tsx`
6. Update navigation in `client/src/components/DashboardLayout.tsx`
7. Update this documentation

---

## Support

For questions or issues:
- Review code comments in component files
- Check existing patterns in similar components
- Refer to tRPC and Drizzle ORM documentation

---

**Last Updated:** 2024
**Version:** 1.0.0
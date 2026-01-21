# Phase 2: Complete Backend Implementations

## Overview
This document outlines the remaining backend implementations needed to complete Phase 2 of the three major features according to the IMPLEMENTATION_PLAN.md.

## Priority 1: Feature 3 - Mobile Quality Control (Missing Items)

### ✅ Completed
- Database schema with photo_urls, signatures, offline_sync_status, GPS location
- Upload QC photo procedure
- Save offline QC test procedure
- Sync offline tests procedure
- Get QC trends procedure
- Get failed tests procedure

### ❌ Missing - To Implement
1. **generateCompliancePDF** - Generate compliance certificates for audits
   - Create PDF template with AzVirt branding
   - Include test details, results, photos, signatures
   - Support EN 206, ASTM C94 standards
   - Return PDF URL or base64

---

## Priority 2: Feature 1 - Real-Time Delivery Tracking (Multiple Items Missing)

### ❌ Database Schema - To Implement
1. Add `status` field to deliveries table (currently exists as basic field)
2. Add `gps_location` field (lat,lng format)
3. Add `delivery_photos` field (JSON array of photo URLs)
4. Add `estimated_arrival` field (Unix timestamp ms)
5. Add `actual_arrival_time` field (Unix timestamp ms)
6. Add `actual_delivery_time` field (Unix timestamp ms)
7. Add `driver_notes` field (text)
8. Create `delivery_status_history` table:
   - id (primary key)
   - delivery_id (foreign key)
   - status (varchar)
   - timestamp (bigint)
   - gps_location (text)
   - notes (text)

### ❌ Backend Procedures - To Implement
1. **updateDeliveryStatus** - Update status with GPS capture
   - Validate status transitions
   - Record GPS location
   - Save to delivery_status_history table
   - Return success with updated delivery

2. **uploadDeliveryPhoto** - Upload delivery site photos
   - Accept base64 image data
   - Upload to S3 storage
   - Return photo URL
   - Update delivery with photo URL array

3. **getActiveDeliveries** - Real-time query
   - Filter by status (loaded, en_route, arrived, delivered)
   - Include GPS location, driver info, ETA
   - Order by scheduled time

4. **calculateETA** - Estimate arrival time
   - Accept current GPS location
   - Get delivery destination
   - Calculate distance and time
   - Consider traffic (optional - Google Maps API)
   - Return ETA timestamp

5. **getDeliveryHistory** - Status timeline
   - Query delivery_status_history table
   - Join with delivery details
   - Return chronological status changes

6. **sendCustomerNotification** - SMS alerts
   - Accept delivery ID and message type
   - Get customer phone from delivery
   - Send SMS via existing SMS service
   - Support templates: en_route, arrival_warning, delivered
   - Log notification sent

---

## Priority 3: Feature 2 - Smart Inventory Forecasting (Enhancement Needed)

### ✅ Basic Implementation Exists
- Material consumption logging
- Basic forecasting predictions
- Purchase order creation

### ❌ Advanced Features - To Implement
1. **Enhanced Consumption Rate Calculation**
   - Implement trend factor analysis
   - Calculate 30/60/90 day averages
   - Detect seasonal patterns

2. **Reorder Point Calculation** 
   - Safety stock calculation (lead time × daily rate × 1.5)
   - Dynamic reorder point updates
   - Alert when below reorder point

3. **Economic Order Quantity (EOQ)**
   - Implement EOQ formula
   - Consider holding costs and order costs
   - Suggest optimal order quantities

4. **Supplier Management**
   - Create suppliers table if missing
   - Track supplier performance (on-time delivery %)
   - Average lead time tracking

5. **Purchase Order Workflow**
   - Auto-generate PO from reorder recommendations
   - Email/SMS to suppliers
   - Track PO status (draft, sent, confirmed, received)
   - Auto-update inventory on receipt

---

## Implementation Order

### Step 1: Quality Control PDF Generation (1-2 hours)
- [ ] Create PDF generation utility using a library (e.g., pdfmake or jsPDF)
- [ ] Design compliance certificate template
- [ ] Implement generateCompliancePDF procedure
- [ ] Add tRPC endpoint
- [ ] Test with sample quality test data

### Step 2: Delivery Tracking Schema (1 hour)
- [ ] Update deliveries table schema in drizzle/schema.ts
- [ ] Create delivery_status_history table
- [ ] Run database migration
- [ ] Test schema changes

### Step 3: Delivery Tracking Backend (3-4 hours)
- [ ] Implement updateDeliveryStatus with history logging
- [ ] Implement uploadDeliveryPhoto with S3 integration
- [ ] Implement getActiveDeliveries query
- [ ] Implement calculateETA (basic distance-based)
- [ ] Implement getDeliveryHistory
- [ ] Implement sendCustomerNotification

### Step 4: Delivery Tracking tRPC Routes (1 hour)
- [ ] Create/update delivery router procedures
- [ ] Add input validation with zod schemas
- [ ] Add error handling
- [ ] Test endpoints

### Step 5: Advanced Forecasting (2-3 hours)
- [ ] Enhance consumption rate calculation
- [ ] Implement reorder point algorithm
- [ ] Implement EOQ calculation
- [ ] Create supplier performance tracking
- [ ] Enhance purchase order workflow

### Step 6: Testing & Documentation (1-2 hours)
- [ ] Write vitest tests for new procedures
- [ ] Test PDF generation
- [ ] Test delivery status flow end-to-end
- [ ] Test forecasting accuracy
- [ ] Update API documentation

---

## Estimated Total Time: 10-14 hours

## Dependencies
- S3 storage (already configured)
- SMS service (already implemented)
- Email service (SendGrid - already configured)
- Database migration capability (Drizzle - ready to use)

## Success Criteria
- [ ] All Quality Control tests can generate compliance PDFs
- [ ] Drivers can update delivery status with GPS and photos
- [ ] Managers can view real-time delivery tracking
- [ ] Customer notifications sent automatically
- [ ] Inventory forecasting provides accurate reorder recommendations
- [ ] All new procedures have passing vitest tests

---

**Status**: Ready to begin implementation
**Next Action**: Start with Step 1 (QC PDF Generation)

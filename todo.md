# AzVirt Document Management System - TODO

## Database Schema
- [x] Create documents table with file metadata
- [x] Create materials table for inventory management
- [x] Create deliveries table for tracking concrete deliveries
- [x] Create quality_tests table for QC records
- [x] Create projects table for construction projects

## Backend (tRPC Procedures)
- [x] Document upload procedure with S3 integration
- [x] Document list/search procedures
- [x] Document download/delete procedures
- [x] Materials CRUD procedures
- [x] Deliveries CRUD procedures
- [x] Quality tests CRUD procedures
- [x] Dashboard statistics procedure

## Frontend - Core Layout
- [x] Set up global theme with construction background image
- [x] Create dashboard layout with sidebar navigation
- [x] Implement responsive header component
- [x] Add user authentication UI

## Frontend - Document Management
- [x] Document upload interface with drag-and-drop
- [x] Document list view with search and filters
- [x] Document preview/download functionality
- [x] Document categorization (by project, type, date)

## Frontend - Dashboard Features
- [x] Dashboard statistics cards
- [x] Recent activity feed
- [x] Quick actions panel
- [x] Inventory overview section

## Frontend - Additional Modules
- [x] Inventory management interface
- [x] Delivery tracking interface
- [x] Quality control testing interface
- [x] Projects management interface

## Testing & Deployment
- [x] Write vitest tests for critical procedures
- [x] Test file upload and download flows
- [x] Test authentication and authorization
- [x] Create project checkpoint

## Design Updates
- [x] Update color scheme to match brand colors (Orange #FF6C0E, Dark #222222, Light Gray #C1C5C8, White)
- [x] Add Rethink Sans font as primary typography
- [x] Add Arial font as secondary typography
- [x] Update UI components with new color palette
- [x] Add orange accent colors to buttons and highlights
- [x] Update dashboard cards with new styling

## Printable Delivery Notes (Otpremnica)
- [x] Create delivery note print template component
- [x] Add print button to delivery details
- [x] Implement structured data tables for materials composition
- [x] Add signature sections for driver, receiver, and quality control
- [x] Style print layout with AzVirt branding
- [x] Add print-specific CSS for proper formatting

## Logo Integration
- [x] Extract AzVirt logo from background image
- [x] Add logo to sidebar header
- [x] Add logo to delivery note header
- [x] Ensure logo displays correctly in print mode

## Bug Fixes
- [x] Fix Select.Item empty value error on Documents page

## UI Enhancements
- [x] Add high-resolution background image to main content area

## Dashboard Widgets
- [x] Create backend procedure for delivery trends statistics
- [x] Create backend procedure for material consumption statistics
- [x] Build monthly delivery trends chart component
- [x] Build material consumption graph component
- [x] Integrate charts into dashboard homepage

## Design Consistency
- [x] Review and update DashboardLayout colors to match AzVirt brand
- [x] Ensure consistent orange accent usage throughout the interface
- [x] Verify background and text contrast for readability

## Workforce Management
- [x] Create employees table in database schema
- [x] Create work_hours table for tracking employee hours
- [x] Build employee management interface (add, edit, list)
- [ ] Create timesheet entry interface
- [ ] Add employee work hours reporting
- [ ] Create printable timesheet reports

## Concrete Base Management
- [x] Create concrete_bases table in database schema
- [x] Create machines table for equipment tracking
- [x] Create machine_maintenance table (lubrication, fuel, hours)
- [x] Create aggregate_input table for material tracking
- [ ] Build concrete base dashboard
- [x] Create machine management interface
- [x] Build maintenance logging interface (lubrication, fuel)
- [ ] Create aggregate input tracking interface
- [ ] Add machine working hours tracking
- [ ] Create printable maintenance reports

## Timesheet Entry Interface
- [x] Create timesheet entry form with clock in/out functionality
- [x] Add work hours calculation and validation
- [x] Build manager approval interface
- [x] Create backend procedure for weekly timesheet summaries
- [x] Create backend procedure for monthly timesheet summaries
- [x] Build timesheet summary component with date range selector
- [x] Add overtime hours calculation logic
- [x] Implement PDF export functionality for timesheet reports
- [x] Implement timesheet status tracking (pending, approved, rejected)

## Low-Stock Alert System
- [x] Add minimumStock field to materials table schema (already exists as minStock)
- [x] Create backend procedure to check low-stock materials
- [x] Implement email notification using notifyOwner helper
- [ ] Add scheduled job to check stock levels daily
- [ ] Create settings interface for configuring minimum stock thresholds
- [x] Add manual "Check Stock Now" button for immediate alerts

## Maintenance Report Template
- [x] Create MaintenanceReport component with print-optimized layout
- [x] Add machine information section
- [x] Add maintenance records table (lubrication, fuel, repairs)
- [x] Include service intervals and next maintenance date
- [x] Add cost summary section
- [x] Implement print preview modal
- [x] Add print button to Machines page

## Automated Daily Stock Check
- [x] Create scheduled task for 8 AM stock check
- [x] Implement email notification for low stock materials (via notifyOwner)
- [x] Add configuration for stock check timezone (UTC 8 AM)
- [x] Test the automated task


## SMS Critical Stock Alerts (NEW)
- [x] Add critical threshold field to materials table schema
- [x] Add SMS notification fields to users table (phoneNumber, smsNotificationsEnabled)
- [x] Create SMS service module (_core/sms.ts) with validation and error handling
- [x] Add database helper functions for critical stock and admin users with SMS
- [x] Add getCriticalStockMaterials() function to get materials below critical threshold
- [x] Add getAdminUsersWithSMS() function to get admin users with SMS enabled
- [x] Add updateUserSMSSettings() function to update user SMS preferences
- [x] Add critical threshold field to material create/update procedures
- [x] Add checkCriticalStock query procedure to check for critical stock levels
- [x] Add sendCriticalStockSMS mutation procedure to send SMS alerts to managers
- [x] Add updateSMSSettings procedure to auth router for user SMS configuration
- [x] Create Settings page for managers to configure SMS notifications and phone number
- [x] Add critical threshold field to Materials form
- [x] Display critical threshold in materials list
- [x] Add Settings menu item to dashboard sidebar
- [x] Add Settings route to App.tsx
- [x] Write comprehensive vitest tests for SMS service (10 tests, all passing)


## Bosnian/Serbian Translation (NEW)
- [x] Translate DashboardLayout navigation menu items
- [x] Translate all page titles and descriptions
- [x] Translate all form labels and placeholders
- [x] Translate all buttons and actions
- [x] Translate all toast notifications and error messages
- [x] Translate dashboard cards and statistics
- [x] Translate table headers and data labels
- [x] Translate dialog and modal content
- [x] Translate backend validation messages
- [x] Test all translations for consistency


## Multi-Language Support (NEW)
- [x] Create language context and provider for state management
- [x] Create translation files for English, Bosnian/Serbian, and Azerbaijani
- [x] Translate all UI text to Azerbaijani
- [x] Build language switcher component
- [x] Integrate language switcher into dashboard header
- [x] Add language preference persistence to user profile (localStorage)
- [x] Set Bosnian/Serbian as default language
- [x] Test language switching across all pages


## Feature 3: Mobile Quality Control & Digital Inspection Forms
### Database Schema
- [x] Add photo_urls field to quality_tests table (JSON array)
- [x] Add inspector_signature field to quality_tests table
- [x] Add supervisor_signature field to quality_tests table
- [x] Add offline_sync_status field to quality_tests table
- [x] Add test_location field (GPS coordinates)
- [x] Add compliance_standard field (EN 206, ASTM C94, etc.)
- [x] Push database schema changes

### Backend Procedures
- [x] Create uploadQCPhoto procedure with S3 integration
- [x] Create saveQCTestOffline procedure for offline mode support
- [x] Create syncOfflineQCTests procedure for batch sync
- [ ] Create generateCompliancePDF procedure for certificates
- [x] Create getQCTrends procedure for dashboard analytics
- [x] Create getFailedTests procedure with auto-notification
- [x] Add digital signature validation logic

### Frontend - Mobile QC Interface
- [x] Create responsive MobileQCForm component optimized for tablets/phones
- [x] Implement guided step-by-step test workflow UI
- [x] Add camera integration for photo capture
- [x] Build offline mode with localStorage caching
- [x] Create digital signature canvas component
- [x] Add auto-sync indicator and manual sync button
- [x] Implement touch-optimized form controls

### Frontend - QC Dashboard & Reports
- [x] Create QC trends dashboard with charts (pass/fail rates over time)
- [x] Build compliance certificate PDF template
- [x] Add photo gallery view for test documentation
- [x] Create failed test alerts notification system
- [x] Add export functionality for audit reports

### Testing
- [ ] Write vitest tests for QC photo upload
- [ ] Write vitest tests for offline sync logic
- [ ] Write vitest tests for compliance PDF generation
- [ ] Test mobile responsiveness on tablets and phones
- [ ] Test offline mode functionality


## Feature 1: Real-Time Delivery Tracking with Driver Mobile App
### Database Schema
- [ ] Add status field to deliveries table (loaded, en_route, arrived, delivered, returning, completed)
- [ ] Add gps_location field to deliveries table (latitude, longitude)
- [ ] Add delivery_photos field to deliveries table (JSON array of photo URLs)
- [ ] Add estimated_arrival field to deliveries table
- [ ] Add actual_arrival_time field to deliveries table
- [ ] Add actual_delivery_time field to deliveries table
- [ ] Add driver_notes field to deliveries table
- [ ] Create delivery_status_history table for tracking status changes with timestamps
- [ ] Push database schema changes

### Backend Procedures
- [ ] Create updateDeliveryStatus procedure with GPS capture
- [ ] Create uploadDeliveryPhoto procedure with S3 integration
- [ ] Create getActiveDeliveries procedure for real-time dashboard
- [ ] Create calculateETA procedure based on distance and traffic
- [ ] Create getDeliveryHistory procedure for status timeline
- [ ] Create sendCustomerNotification procedure for SMS alerts
- [ ] Add delivery status validation logic

### Frontend - Driver Mobile Interface
- [ ] Create responsive DriverDeliveryView component optimized for mobile phones
- [ ] Build large touch-friendly status update buttons
- [ ] Implement GPS location capture on status change
- [ ] Add camera integration for delivery site photos
- [ ] Create driver notes text input with voice-to-text option
- [ ] Add offline mode support for areas with poor connectivity
- [ ] Implement haptic feedback for button presses

### Frontend - Manager Dashboard
- [ ] Create live delivery tracking map with Google Maps integration
- [ ] Build real-time delivery status cards with auto-refresh
- [ ] Add ETA calculation and display
- [ ] Create delivery timeline view showing status history
- [ ] Build photo gallery for delivery documentation
- [ ] Add filter by status (active, completed, delayed)
- [ ] Create delivery performance analytics (on-time %, average delivery time)

### Customer Notifications
- [ ] Implement SMS notification when status changes to "En Route"
- [ ] Add 15-minute warning SMS with ETA
- [ ] Create delivery confirmation SMS with photo link
- [ ] Add customer notification preferences to projects table

### Testing
- [ ] Write vitest tests for delivery status updates
- [ ] Write vitest tests for GPS location capture
- [ ] Write vitest tests for ETA calculation
- [ ] Write vitest tests for customer SMS notifications
- [ ] Test mobile interface on various phone screen sizes
- [ ] Test offline mode and sync functionality


## Feature 2: Smart Inventory Forecasting & Auto-Reorder System
### Database Schema
- [ ] Add lead_time_days field to materials table
- [ ] Add reorder_point field to materials table (auto-calculated)
- [ ] Add optimal_order_quantity field to materials table
- [ ] Add supplier_id field to materials table
- [ ] Add last_order_date field to materials table
- [ ] Create suppliers table (name, contact, email, phone, lead_time)
- [ ] Create material_consumption_history table (material_id, date, quantity_used, delivery_id)
- [ ] Create purchase_orders table (supplier_id, order_date, expected_delivery, status, total_cost)
- [ ] Create purchase_order_items table (purchase_order_id, material_id, quantity, unit_price)
- [ ] Push database schema changes

### Backend Procedures - Forecasting Engine
- [ ] Create calculateConsumptionRate procedure (analyzes last 30/60/90 days)
- [ ] Create predictStockoutDate procedure using linear regression
- [ ] Create calculateOptimalReorderPoint procedure (consumption rate + lead time + safety stock)
- [ ] Create calculateOptimalOrderQuantity procedure (EOQ formula)
- [ ] Create getMaterialForecast procedure (30-day projection)
- [ ] Create identifyReorderNeeds procedure (materials below reorder point)

### Backend Procedures - Purchase Orders
- [ ] Create generatePurchaseOrder procedure
- [ ] Create sendPurchaseOrderToSupplier procedure (email/SMS)
- [ ] Create updatePurchaseOrderStatus procedure
- [ ] Create receivePurchaseOrder procedure (updates inventory)
- [ ] Create getPurchaseOrderHistory procedure
- [ ] Create getSupplierPerformance procedure (on-time delivery %)

### Frontend - Forecasting Dashboard
- [ ] Create inventory forecasting dashboard with 30-day projection charts
- [ ] Build consumption trend visualization (daily/weekly/monthly)
- [ ] Add reorder recommendations card with priority sorting
- [ ] Create stockout risk alerts with countdown timers
- [ ] Build multi-material comparison view
- [ ] Add "What-if" scenario calculator (if usage increases by X%)

### Frontend - Purchase Order Management
- [ ] Create purchase order creation form with auto-suggested quantities
- [ ] Build supplier management interface (add, edit, list)
- [ ] Add one-click purchase order generation from reorder recommendations
- [ ] Create purchase order approval workflow for managers
- [ ] Build purchase order tracking view (pending, sent, received)
- [ ] Add email/SMS template editor for supplier communications
- [ ] Create purchase order receiving interface (scan/manual entry)

### Frontend - Analytics & Optimization
- [ ] Create inventory cost analysis dashboard (holding costs, order costs)
- [ ] Build supplier performance scorecard
- [ ] Add material bundling suggestions (frequently ordered together)
- [ ] Create inventory turnover rate visualization
- [ ] Build ABC analysis chart (classify materials by value/usage)

### Testing
- [ ] Write vitest tests for consumption rate calculation
- [ ] Write vitest tests for stockout date prediction
- [ ] Write vitest tests for reorder point calculation
- [ ] Write vitest tests for purchase order generation
- [ ] Write vitest tests for supplier email/SMS sending
- [ ] Test forecasting accuracy with historical data


## Feature 2: Smart Inventory Forecasting & Auto-Reorder System
### Database Schema
- [x] Create material_consumption_log table (materialId, quantity, date, projectId, deliveryId)
- [x] Create purchase_orders table (materialId, quantity, supplier, status, orderDate, expectedDelivery)
- [x] Create forecast_predictions table (materialId, predictedRunoutDate, recommendedOrderQty, confidence)
- [x] Add email notification settings to materials table
- [x] Push database schema changes

### Backend - AI Forecasting Engine
- [x] Create recordConsumption procedure to log material usage
- [x] Create calculateConsumptionRate procedure (daily/weekly averages)
- [x] Create predictStockout procedure using linear regression
- [x] Create generateReorderRecommendations procedure
- [x] Create getLowStockMaterials procedure with threshold check
- [x] Add consumption tracking to delivery completion workflow

### Backend - Purchase Order System
- [x] Create createPurchaseOrder procedure
- [x] Create updatePurchaseOrderStatus procedure
- [x] Create getPurchaseOrders procedure with filters
- [x] Create sendLowStockEmail procedure with email template
- [x] Create sendPurchaseOrderEmail procedure to suppliers
- [x] Add automatic PO creation when stock below threshold

### Backend - Daily Production Reports
- [x] Create generateDailyProductionReport procedure
- [x] Create sendDailyProductionEmail procedure
- [x] Calculate total concrete produced per day
- [x] Calculate material consumption per day
- [x] Include delivery statistics in report
- [x] Schedule daily email at configurable time

### Frontend - Forecasting Dashboard
- [x] Create ForecastingDashboard component with charts
- [x] Display consumption trends (line chart)
- [x] Show predicted stockout dates with countdown
- [x] Create low stock alerts panel
- [x] Build reorder recommendations table
- [x] Add one-click purchase order creation

### Frontend - Purchase Orders
- [x] Create PurchaseOrdersPage component
- [x] Build PO creation form with supplier selection
- [x] Display active POs with status tracking
- [x] Add PO approval workflow
- [x] Show PO history and analytics

### Email Templates
- [x] Design low stock alert email template
- [x] Design purchase order email template
- [x] Design daily production report email template
- [x] Add email configuration settings page

### Testing
- [x] Write vitest tests for forecasting algorithms
- [x] Write vitest tests for consumption tracking
- [x] Write vitest tests for email sending
- [x] Test daily report generation

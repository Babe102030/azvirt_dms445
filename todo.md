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

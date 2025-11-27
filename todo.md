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

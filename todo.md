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


## Scheduled Daily Production Reports
- [x] Add email configuration settings page for report recipients
- [x] Create scheduled task for 6 PM daily production reports
- [x] Add settings to configure report time and recipients
- [x] Test scheduled report generation
- [x] Add manual "Send Now" button for testing


## SendGrid Email Integration
- [x] Install @sendgrid/mail npm package
- [x] Request SendGrid API key from user
- [x] Configure sender email address
- [x] Update email.ts to use SendGrid API
- [x] Test email delivery with SendGrid
- [x] Add error handling for failed emails
- [x] Create vitest tests for SendGrid integration


## Email Template Management System
### Database Schema
- [x] Create email_templates table (name, type, subject, htmlTemplate, variables)
- [x] Create email_branding table (logoUrl, primaryColor, secondaryColor, companyName, footerText)
- [ ] Push database schema changes

### Backend Procedures
- [x] Create getEmailTemplates procedure
- [x] Create getEmailTemplate procedure (by type)
- [x] Create upsertEmailTemplate procedure
- [x] Create getEmailBranding procedure
- [x] Create updateEmailBranding procedure
- [ ] Update email generation functions to use custom templates

### Frontend - Template Editor
- [ ] Create EmailTemplateEditor page with visual editor
- [ ] Add color picker for branding colors
- [ ] Add logo upload functionality
- [ ] Create live email preview component
- [ ] Add template variable documentation
- [ ] Create template selection dropdown for each email type
- [ ] Add reset to default template button

### Template Types
- [ ] Daily production report template
- [ ] Low stock alert template
- [ ] Purchase order template
- [ ] Generic notification template

### Testing
- [ ] Write vitest tests for template management
- [ ] Test template rendering with custom branding
- [ ] Test logo upload and display


## Logo Upload & Email Branding Management
### Backend
- [x] Create uploadLogo tRPC procedure with S3 integration
- [x] Create getBranding tRPC procedure
- [x] Create updateBranding tRPC procedure
- [x] Add logo file validation (size, format)

### Frontend
- [x] Create EmailBrandingSettings page
- [x] Add logo upload component with drag-and-drop
- [x] Add logo preview with delete option
- [x] Add color picker for primary color
- [x] Add color picker for secondary color
- [x] Add company name input field
- [x] Add footer text textarea
- [x] Create live email preview component
- [x] Add save/reset buttons

### Email Template Updates
- [x] Update daily production report to use custom branding
- [x] Update low stock alert to use custom branding
- [x] Update purchase order email to use custom branding
- [x] Add default fallback branding

### Testing
- [x] Test logo upload with various image formats
- [x] Test email rendering with custom branding
- [x] Test branding persistence across sessions


## AI Assistant with Ollama Integration

### Database Schema
- [x] Create ai_conversations table
- [x] Create ai_messages table
- [x] Create ai_models table
- [x] Push database schema changes

### Backend - Ollama Integration
- [x] Install axios for Ollama API calls
- [x] Create Ollama service wrapper (server/_core/ollama.ts)
- [x] Implement chatWithOllama with streaming support
- [x] Implement listOllamaModels
- [x] Implement pullOllamaModel
- [x] Implement deleteOllamaModel
- [ ] Test connection to local Ollama instance

### Backend - Voice Transcription
- [ ] Create audio upload endpoint
- [ ] Integrate existing Whisper API for transcription
- [ ] Support multiple languages (Bosnian, English)
- [ ] Add audio file validation

### Backend - OCR & Vision
- [ ] Create OCR service (server/_core/ocr.ts)
- [ ] Implement extractTextFromImage using llava
- [ ] Implement extractTextFromPDF
- [ ] Implement analyzeImageWithVision
- [ ] Test vision model with sample images

### Backend - Agentic Tools
- [x] Create AI tools framework (server/_core/aiTools.ts)
- [x] Implement search_materials tool
- [x] Implement get_delivery_status tool
- [x] Implement search_documents tool
- [x] Implement get_quality_tests tool
- [x] Implement generate_forecast tool
- [x] Add tool execution logging

### Backend - tRPC Procedures
- [ ] Create aiAssistant router
- [ ] Implement chat procedure with streaming
- [ ] Implement listConversations procedure
- [ ] Implement getConversation procedure
- [ ] Implement deleteConversation procedure
- [ ] Implement listModels procedure
- [ ] Implement pullModel procedure
- [ ] Implement deleteModel procedure
- [ ] Implement transcribeAudio procedure
- [ ] Implement analyzeImage procedure
- [ ] Implement extractText procedure

### Frontend - Chat Interface
- [ ] Create AIAssistant page component
- [ ] Build chat message list with streaming
- [ ] Create message input component
- [ ] Add auto-scroll to latest message
- [ ] Implement copy message functionality
- [ ] Add export conversation feature
- [ ] Create conversation sidebar
- [ ] Add new conversation button

### Frontend - Voice Recording
- [ ] Create VoiceRecorder component
- [ ] Implement MediaRecorder API integration
- [ ] Add waveform visualization
- [ ] Add recording timer
- [ ] Implement audio playback preview
- [ ] Add cancel/send controls

### Frontend - Model Management
- [ ] Create ModelSwitcher component
- [ ] Build model selector dropdown
- [ ] Add pull new models UI
- [ ] Implement model deletion
- [ ] Show model info (type, size, description)
- [ ] Add active model indicator

### Frontend - Vision & OCR
- [ ] Add image upload component
- [ ] Add document upload component
- [ ] Implement drag-and-drop upload
- [ ] Add image preview in chat
- [ ] Show OCR extracted text

### Frontend - Thinking Process
- [ ] Create ThinkingProcess component
- [ ] Visualize chain-of-thought reasoning
- [ ] Show tool calls with parameters
- [ ] Add expandable/collapsible sections
- [ ] Color-code by step type

### Integration with DMS
- [ ] Connect AI to materials inventory
- [ ] Connect AI to delivery tracking
- [ ] Connect AI to quality control
- [ ] Connect AI to document management
- [ ] Connect AI to forecasting system

### Testing
- [ ] Test Ollama connection and streaming
- [ ] Test voice transcription accuracy
- [ ] Test vision model with various images
- [ ] Test OCR with documents
- [ ] Test all agentic tools
- [ ] Test model switching
- [ ] Test conversation persistence
- [ ] End-to-end integration testing


## AI Assistant Chat Interface Implementation
### Backend - tRPC Procedures
- [ ] Create ai.chat procedure with streaming support
- [ ] Create ai.getConversations procedure
- [ ] Create ai.getMessages procedure
- [ ] Create ai.createConversation procedure
- [ ] Create ai.transcribeVoice procedure (Whisper integration)
- [ ] Create ai.listModels procedure
- [ ] Create ai.switchModel procedure
- [ ] Add conversation history management

### Frontend - Voice Recorder
- [ ] Create VoiceRecorder component
- [ ] Implement browser audio recording
- [ ] Add recording visualization (waveform)
- [ ] Integrate Whisper transcription
- [ ] Add recording controls (start/stop/cancel)
- [ ] Handle audio file upload

### Frontend - Chat Interface
- [ ] Create AIAssistant page component
- [ ] Build streaming message display
- [ ] Add message history with scrolling
- [ ] Create thinking/tool use indicators
- [ ] Add markdown rendering for responses
- [ ] Implement auto-scroll to latest message
- [ ] Add loading states and error handling

### Frontend - Model Management
- [ ] Create model switcher dropdown
- [ ] Display available Ollama models
- [ ] Add model download progress indicator
- [ ] Create model settings panel
- [ ] Add temperature/context controls

### Integration
- [ ] Add AI Assistant to navigation menu
- [ ] Create floating AI assistant button
- [ ] Add keyboard shortcuts (Ctrl+K)
- [ ] Test with all DMS tools
- [ ] Add conversation persistence


## AI Assistant Chat Interface
- [x] Fix TypeScript errors in AI foundation code
- [x] Create tRPC procedures for AI chat
- [x] Build voice recorder component
- [x] Create chat interface with message history
- [x] Add model switcher
- [x] Integrate into navigation menu
- [x] Add AI Assistant route to App.tsx
- [x] Test with local Ollama integration


## AI Assistant Backend Development
- [x] Install Ollama service in sandbox
- [x] Pull default AI models (llama3.2)
- [x] Configure Ollama service to start automatically
- [x] Write vitest tests for AI chat procedures (12/13 passing)
- [ ] Write vitest tests for voice transcription
- [x] Write vitest tests for model management (8/8 passing)
- [x] Write vitest tests for agentic tools execution (9/13 passing)
- [x] Add comprehensive error handling to AI procedures
- [x] Add input validation to all AI endpoints
- [x] Test Ollama integration end-to-end
- [ ] Fix remaining test timeouts and database cleanup issues


## AI Prompt Templates System
- [x] Design template categories (Inventory, Deliveries, Quality, Reports, Analysis)
- [x] Create template data structure with prompts and metadata
- [x] Build tRPC procedures for template CRUD operations
- [x] Create PromptTemplates UI component with category tabs
- [x] Add search and filter functionality
- [x] Integrate template selector into AI Assistant chat
- [x] Add "Use Template" button functionality
- [x] Create 20 pre-built templates for common tasks
- [x] Write vitest tests for template procedures (21/21 passing)
- [x] Test template integration end-to-end


## AI Data Manipulation Tools
- [x] Design tool schemas for data entry operations
- [x] Create material entry tools (create, update quantity)
- [x] Create work hours tracking tools (log, get summary)
- [x] Create machine hours tracking tools (log hours)
- [x] Create document manipulation tools (update metadata, delete)
- [x] Add 7 new tools to aiTools.ts with proper validation
- [x] Update AI system prompt with new capabilities
- [x] Create 7 prompt templates for data manipulation tasks
- [x] Write vitest tests for all manipulation tools (15/15 passing)
- [x] Test end-to-end data manipulation via AI chat


## Bulk Import Feature
- [x] Design bulk import architecture and validation strategy
- [x] Create CSV and Excel file parsing utilities (parseCSV, parseExcel, parseFile)
- [x] Build bulk import procedures for work hours, materials, documents
- [x] Add progress tracking and error reporting
- [x] Create bulk_import_data AI tool for processing files
- [x] Add file upload handling to tRPC
- [x] Write vitest tests for CSV parsing (18/18 passing)
- [x] Write vitest tests for Excel parsing
- [x] Write vitest tests for bulk import procedures
- [x] Create 6 bulk import prompt templates (work hours, materials, documents, stock updates, quality tests, machine hours)
- [x] Test end-to-end bulk import workflow


## Dashboard Refinement - Voice & Tasks
- [x] Design daily tasks and responsibility data structure
- [x] Create daily_tasks table in database schema
- [x] Create task_assignments table for responsibility tracking
- [x] Create task_status_history table for audit trail
- [x] Build backend helper functions for task CRUD operations
- [x] Build backend helper functions for task status updates
- [x] Build backend helper functions for task filtering and search
- [ ] Create AI voice activation button component
- [ ] Integrate Web Speech API for voice input
- [ ] Add voice command parsing and routing to AI Assistant
- [ ] Create daily tasks dashboard widget
- [ ] Create responsibility assignment interface
- [ ] Add task priority and deadline management
- [ ] Build task completion tracking UI
- [ ] Add task notifications and reminders
- [ ] Write vitest tests for task procedures
- [ ] Test voice activation end-to-end


## Task Notifications System
- [x] Design notification schema (type, status, recipient, channels)
- [x] Design user notification preferences (email enabled, SMS enabled, quiet hours)
- [x] Create task_notifications table in database
- [x] Create notification_preferences table
- [x] Create notification_history table for audit trail
- [x] Build NotificationService with email integration (SendGrid)
- [x] Build SMS integration (placeholder for Twilio)
- [x] Create tRPC procedures for notification CRUD
- [x] Create tRPC procedures for notification preferences
- [x] Implement scheduled job for overdue task reminders
- [x] Implement completion confirmation notifications
- [x] Add notification UI components (NotificationCenter, NotificationPreferences)
- [x] Create notification preferences panel
- [x] Write vitest tests for notification service (18/18 passing)
- [x] Write vitest tests for scheduled jobs
- [x] Test end-to-end notification workflow


## Notification Templates & Triggers
- [x] Design template schema (name, subject, body, variables, channels)
- [x] Design trigger schema (event type, conditions, actions, enabled)
- [x] Create notification_templates table
- [x] Create notification_triggers table
- [x] Create trigger_execution_log table for audit trail
- [x] Build template CRUD helper functions in db.ts
- [x] Build trigger CRUD helper functions in db.ts
- [ ] Create trigger evaluation engine
- [ ] Implement stock threshold trigger
- [ ] Implement overdue task trigger
- [ ] Implement task completion trigger
- [ ] Implement delivery delay trigger
- [ ] Create admin template management UI
- [ ] Create admin trigger management UI
- [ ] Add template variable preview
- [ ] Add trigger condition builder
- [ ] Write vitest tests for template system
- [ ] Write vitest tests for trigger evaluation
- [ ] Test end-to-end template and trigger workflow


## Dashboard Enhancement - Interactive Control Table
- [x] Add clickable data cards with drill-down to detail pages
- [x] Create status indicators (green/yellow/red) for system health
- [x] Add real-time alerts for critical issues (low stock, overdue tasks)
- [x] Build advanced filtering by project, date range, status
- [x] Add search functionality across all dashboard items
- [x] Create expandable sections for detailed metrics
- [x] Add quick-action modals for common tasks
- [x] Implement data export (CSV, PDF) functionality
- [x] Add date range picker for custom analytics
- [x] Create performance metrics and KPI displays
- [x] Add activity timeline showing recent events
- [x] Implement responsive mobile-friendly layout
- [x] Add dark mode toggle and theme customization
- [x] Create dashboard widget customization (reorder, hide/show)
- [x] Add performance optimization and caching


## Dashboard Widget Customization
- [x] Design widget configuration schema (id, title, visible, width, order)
- [x] Create widget configuration management hook (useDashboardWidgets)
- [x] Implement local storage persistence for widget layouts
- [x] Build drag-and-drop reordering with native HTML5 drag API
- [x] Create widget visibility toggle UI with eye icons
- [x] Implement widget resize functionality (full, half, third, quarter)
- [x] Add reset to default layout button
- [x] Create preset layout templates (Manager, Supervisor, Worker)
- [x] Build customization settings panel (DashboardCustomizer)
- [x] Add widget configuration export/import via localStorage
- [x] Create CustomizableDashboard page with dynamic widget rendering
- [x] Implement drag-and-drop reordering with visual feedback
- [x] Test persistence across page reloads (localStorage integration)

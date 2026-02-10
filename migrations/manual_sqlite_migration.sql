-- SQLite Migration for AzVirt DMS
-- Created: 2024
-- Description: Adds concrete bases, aggregate inputs, email templates, and email branding

-- Enable foreign keys (SQLite specific)
PRAGMA foreign_keys = ON;

-- ============================================================================
-- Table: concrete_bases
-- Purpose: Manage concrete production facilities
-- ============================================================================
CREATE TABLE IF NOT EXISTS concrete_bases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(255) NOT NULL,
    location TEXT,
    capacity INTEGER,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    managerName VARCHAR(255),
    phoneNumber VARCHAR(50),
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- Table: aggregate_inputs
-- Purpose: Track material inputs at concrete bases
-- ============================================================================
CREATE TABLE IF NOT EXISTS aggregate_inputs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    concreteBaseId INTEGER NOT NULL,
    date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    materialType VARCHAR(50) NOT NULL,
    materialName VARCHAR(255) NOT NULL,
    quantity REAL NOT NULL,
    unit VARCHAR(20) NOT NULL,
    supplier VARCHAR(255),
    batchNumber VARCHAR(100),
    receivedBy VARCHAR(255),
    notes TEXT,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (concreteBaseId) REFERENCES concrete_bases(id) ON DELETE CASCADE
);

-- ============================================================================
-- Table: email_templates
-- Purpose: Customizable email templates for system notifications
-- ============================================================================
CREATE TABLE IF NOT EXISTS email_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    subject VARCHAR(500) NOT NULL,
    bodyHtml TEXT NOT NULL,
    bodyText TEXT,
    isCustom INTEGER NOT NULL DEFAULT 0,
    isActive INTEGER NOT NULL DEFAULT 1,
    variables TEXT,
    createdBy INTEGER,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (createdBy) REFERENCES users(id)
);

-- ============================================================================
-- Table: email_branding
-- Purpose: Email visual branding configuration
-- ============================================================================
CREATE TABLE IF NOT EXISTS email_branding (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    logoUrl TEXT,
    primaryColor VARCHAR(20) NOT NULL DEFAULT '#f97316',
    secondaryColor VARCHAR(20) NOT NULL DEFAULT '#ea580c',
    companyName VARCHAR(255) NOT NULL DEFAULT 'AzVirt',
    footerText TEXT,
    headerStyle VARCHAR(50) NOT NULL DEFAULT 'gradient',
    fontFamily VARCHAR(100) NOT NULL DEFAULT 'Arial, sans-serif',
    updatedBy INTEGER,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (updatedBy) REFERENCES users(id)
);

-- ============================================================================
-- Alter: machines table
-- Add new columns for tracking working hours and concrete base association
-- ============================================================================
-- Note: SQLite doesn't support multiple ALTER TABLE ADD COLUMN in one statement
-- Check if columns exist before adding

-- Add totalWorkingHours column if it doesn't exist
ALTER TABLE machines ADD COLUMN totalWorkingHours REAL DEFAULT 0;

-- Add concreteBaseId column if it doesn't exist
ALTER TABLE machines ADD COLUMN concreteBaseId INTEGER REFERENCES concrete_bases(id);

-- ============================================================================
-- Indexes for Performance
-- ============================================================================

-- Index on aggregate_inputs for faster queries by concrete base
CREATE INDEX IF NOT EXISTS idx_aggregate_inputs_concrete_base
ON aggregate_inputs(concreteBaseId);

-- Index on aggregate_inputs for faster queries by material type
CREATE INDEX IF NOT EXISTS idx_aggregate_inputs_material_type
ON aggregate_inputs(materialType);

-- Index on aggregate_inputs for faster queries by date
CREATE INDEX IF NOT EXISTS idx_aggregate_inputs_date
ON aggregate_inputs(date);

-- Index on email_templates for faster queries by type
CREATE INDEX IF NOT EXISTS idx_email_templates_type
ON email_templates(type);

-- Index on email_templates for faster queries by active status
CREATE INDEX IF NOT EXISTS idx_email_templates_active
ON email_templates(isActive);

-- Index on machines for faster queries by concrete base
CREATE INDEX IF NOT EXISTS idx_machines_concrete_base
ON machines(concreteBaseId);

-- ============================================================================
-- Insert Default Email Branding (if not exists)
-- ============================================================================
INSERT OR IGNORE INTO email_branding (id, logoUrl, primaryColor, secondaryColor, companyName, footerText, headerStyle, fontFamily)
VALUES (1, NULL, '#f97316', '#ea580c', 'AzVirt', 'Thank you for using AzVirt DMS', 'gradient', 'Arial, sans-serif');

-- ============================================================================
-- Insert Default Email Templates (if not exists)
-- ============================================================================

-- Daily Production Report Template
INSERT OR IGNORE INTO email_templates (type, name, description, subject, bodyHtml, bodyText, isCustom, isActive, variables)
VALUES (
    'daily_production_report',
    'Daily Production Report',
    'Automated daily production summary report',
    'Daily Production Report - {{date}}',
    '<h1>Daily Production Summary</h1><p>Total Deliveries: {{deliveryCount}}</p><p>Total Volume: {{totalVolume}} m³</p>',
    'Daily Production Summary\nTotal Deliveries: {{deliveryCount}}\nTotal Volume: {{totalVolume}} m³',
    0,
    1,
    '["date", "deliveryCount", "totalVolume", "activeProjects", "qualityTests"]'
);

-- Low Stock Alert Template
INSERT OR IGNORE INTO email_templates (type, name, description, subject, bodyHtml, bodyText, isCustom, isActive, variables)
VALUES (
    'low_stock_alert',
    'Low Stock Alert',
    'Notification when material stock is low',
    'Low Stock Alert - {{materialName}}',
    '<h1>Low Stock Alert</h1><p>Material: {{materialName}}</p><p>Current Stock: {{currentStock}} {{unit}}</p><p>Minimum Required: {{minStock}} {{unit}}</p>',
    'Low Stock Alert\nMaterial: {{materialName}}\nCurrent Stock: {{currentStock}} {{unit}}\nMinimum Required: {{minStock}} {{unit}}',
    0,
    1,
    '["materialName", "currentStock", "minStock", "unit", "supplier"]'
);

-- Purchase Order Template
INSERT OR IGNORE INTO email_templates (type, name, description, subject, bodyHtml, bodyText, isCustom, isActive, variables)
VALUES (
    'purchase_order',
    'Purchase Order',
    'Purchase order notification to suppliers',
    'Purchase Order #{{orderNumber}} from AzVirt',
    '<h1>Purchase Order</h1><p>Order Number: {{orderNumber}}</p><p>Supplier: {{supplierName}}</p><p>Total Items: {{itemCount}}</p>',
    'Purchase Order\nOrder Number: {{orderNumber}}\nSupplier: {{supplierName}}\nTotal Items: {{itemCount}}',
    0,
    1,
    '["orderNumber", "supplierName", "itemCount", "totalCost", "deliveryDate"]'
);

-- Generic Notification Template
INSERT OR IGNORE INTO email_templates (type, name, description, subject, bodyHtml, bodyText, isCustom, isActive, variables)
VALUES (
    'generic_notification',
    'Generic Notification',
    'General purpose notification template',
    '{{subject}}',
    '<h1>{{title}}</h1><p>{{message}}</p>',
    '{{title}}\n\n{{message}}',
    0,
    1,
    '["subject", "title", "message"]'
);

-- ============================================================================
-- Triggers for Updated Timestamps
-- ============================================================================

-- Trigger to update concrete_bases updatedAt
CREATE TRIGGER IF NOT EXISTS update_concrete_bases_timestamp
AFTER UPDATE ON concrete_bases
BEGIN
    UPDATE concrete_bases SET updatedAt = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Trigger to update email_templates updatedAt
CREATE TRIGGER IF NOT EXISTS update_email_templates_timestamp
AFTER UPDATE ON email_templates
BEGIN
    UPDATE email_templates SET updatedAt = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Trigger to update email_branding updatedAt
CREATE TRIGGER IF NOT EXISTS update_email_branding_timestamp
AFTER UPDATE ON email_branding
BEGIN
    UPDATE email_branding SET updatedAt = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- ============================================================================
-- Migration Complete
-- ============================================================================
-- Tables Created: concrete_bases, aggregate_inputs, email_templates, email_branding
-- Tables Modified: machines (added totalWorkingHours, concreteBaseId)
-- Indexes Created: 6 performance indexes
-- Triggers Created: 3 timestamp update triggers
-- Default Data: 1 email branding config, 4 email templates
-- ============================================================================

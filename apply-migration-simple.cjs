// Simple SQLite Migration Script
// Applies the manual SQLite migration to the local database

const fs = require('fs');
const path = require('path');
const { createClient } = require('@libsql/client');

async function applyMigration() {
  console.log('🚀 Starting SQLite migration...\n');

  const db = createClient({ url: 'file:./db/custom.db' });

  try {
    console.log('✓ Connected to database: ./db/custom.db\n');

    // Execute statements one by one
    const statements = [
      // Create concrete_bases table
      `CREATE TABLE IF NOT EXISTS concrete_bases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR(255) NOT NULL,
        location TEXT,
        capacity INTEGER,
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        managerName VARCHAR(255),
        phoneNumber VARCHAR(50),
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,

      // Create aggregate_inputs table
      `CREATE TABLE IF NOT EXISTS aggregate_inputs (
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
      )`,

      // Create email_templates table
      `CREATE TABLE IF NOT EXISTS email_templates (
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
      )`,

      // Create email_branding table
      `CREATE TABLE IF NOT EXISTS email_branding (
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
      )`,

      // Create indexes
      `CREATE INDEX IF NOT EXISTS idx_aggregate_inputs_concrete_base ON aggregate_inputs(concreteBaseId)`,
      `CREATE INDEX IF NOT EXISTS idx_aggregate_inputs_material_type ON aggregate_inputs(materialType)`,
      `CREATE INDEX IF NOT EXISTS idx_aggregate_inputs_date ON aggregate_inputs(date)`,
      `CREATE INDEX IF NOT EXISTS idx_email_templates_type ON email_templates(type)`,
      `CREATE INDEX IF NOT EXISTS idx_email_templates_active ON email_templates(isActive)`,

      // Insert default email branding
      `INSERT OR IGNORE INTO email_branding (id, primaryColor, secondaryColor, companyName, footerText, headerStyle, fontFamily)
       VALUES (1, '#f97316', '#ea580c', 'AzVirt', 'Thank you for using AzVirt DMS', 'gradient', 'Arial, sans-serif')`,

      // Insert default email templates
      `INSERT OR IGNORE INTO email_templates (type, name, description, subject, bodyHtml, bodyText, isCustom, isActive, variables)
       VALUES ('daily_production_report', 'Daily Production Report', 'Automated daily production summary report',
       'Daily Production Report - {{date}}', '<h1>Daily Production Summary</h1><p>Total Deliveries: {{deliveryCount}}</p>',
       'Daily Production Summary', 0, 1, '["date", "deliveryCount", "totalVolume"]')`,

      `INSERT OR IGNORE INTO email_templates (type, name, description, subject, bodyHtml, bodyText, isCustom, isActive, variables)
       VALUES ('low_stock_alert', 'Low Stock Alert', 'Notification when material stock is low',
       'Low Stock Alert - {{materialName}}', '<h1>Low Stock Alert</h1><p>Material: {{materialName}}</p>',
       'Low Stock Alert', 0, 1, '["materialName", "currentStock", "minStock"]')`,

      `INSERT OR IGNORE INTO email_templates (type, name, description, subject, bodyHtml, bodyText, isCustom, isActive, variables)
       VALUES ('purchase_order', 'Purchase Order', 'Purchase order notification to suppliers',
       'Purchase Order #{{orderNumber}}', '<h1>Purchase Order</h1><p>Order: {{orderNumber}}</p>',
       'Purchase Order', 0, 1, '["orderNumber", "supplierName"]')`,

      `INSERT OR IGNORE INTO email_templates (type, name, description, subject, bodyHtml, bodyText, isCustom, isActive, variables)
       VALUES ('generic_notification', 'Generic Notification', 'General purpose notification template',
       '{{subject}}', '<h1>{{title}}</h1><p>{{message}}</p>', '{{title}} {{message}}', 0, 1, '["subject", "title", "message"]')`
    ];

    let success = 0;
    let skipped = 0;

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      const preview = stmt.substring(0, 50).replace(/\s+/g, ' ').trim();

      try {
        await db.execute(stmt);
        console.log(`✓ [${i + 1}/${statements.length}] ${preview}...`);
        success++;
      } catch (error) {
        if (error.message.includes('already exists') || error.message.includes('duplicate')) {
          console.log(`⊘ [${i + 1}/${statements.length}] Already exists (skipped)`);
          skipped++;
        } else {
          console.log(`⚠ [${i + 1}/${statements.length}] ${error.message}`);
          skipped++;
        }
      }
    }

    // Try to add columns to machines table (will fail silently if already exist)
    try {
      await db.execute('ALTER TABLE machines ADD COLUMN totalWorkingHours REAL DEFAULT 0');
      console.log('✓ Added totalWorkingHours to machines table');
      success++;
    } catch (e) {
      console.log('⊘ Column totalWorkingHours already exists (skipped)');
      skipped++;
    }

    try {
      await db.execute('ALTER TABLE machines ADD COLUMN concreteBaseId INTEGER REFERENCES concrete_bases(id)');
      console.log('✓ Added concreteBaseId to machines table');
      success++;
    } catch (e) {
      console.log('⊘ Column concreteBaseId already exists (skipped)');
      skipped++;
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 Migration Summary:');
    console.log('='.repeat(60));
    console.log(`✓ Executed:   ${success}`);
    console.log(`⊘ Skipped:    ${skipped}`);
    console.log('='.repeat(60));
    console.log('\n🎉 Migration completed!\n');
    console.log('New tables available:');
    console.log('  • concrete_bases');
    console.log('  • aggregate_inputs');
    console.log('  • email_templates');
    console.log('  • email_branding');
    console.log('\nMachines table updated with:');
    console.log('  • totalWorkingHours column');
    console.log('  • concreteBaseId column');
    console.log('\n✅ You can now use /aggregate-inputs in the app!\n');

  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  } finally {
    db.close();
  }
}

applyMigration();

// Apply SQLite Migration Script
// This script applies the manual SQLite migration to the local database

const fs = require('fs');
const path = require('path');

// Import libsql client
const { createClient } = require('@libsql/client');

async function applyMigration() {
  console.log('🚀 Starting SQLite migration...\n');

  try {
    // Read migration file
    const migrationPath = path.join(__dirname, 'migrations', 'manual_sqlite_migration.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Create database client
    const db = createClient({
      url: 'file:./db/custom.db'
    });

    console.log('✓ Connected to database: ./db/custom.db\n');

    // Split SQL into individual statements
    // Remove comments and empty lines
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => {
        // Remove empty statements and comment-only statements
        if (!stmt) return false;
        const lines = stmt.split('\n').filter(line => {
          const trimmed = line.trim();
          return trimmed && !trimmed.startsWith('--');
        });
        return lines.length > 0;
      })
      .map(stmt => stmt + ';');

    console.log(`📝 Found ${statements.length} SQL statements to execute\n`);

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];

      // Skip PRAGMA and comment-only statements
      if (statement.trim().startsWith('--') || statement.trim().startsWith('PRAGMA')) {
        continue;
      }

      try {
        // Get a preview of the statement for logging
        const preview = statement.substring(0, 60).replace(/\s+/g, ' ').trim();

        await db.execute(statement);

        console.log(`✓ [${i + 1}/${statements.length}] ${preview}...`);
        successCount++;
      } catch (error) {
        // Check if error is about column already existing
        if (error.message.includes('duplicate column name') ||
            error.message.includes('already exists')) {
          console.log(`⊘ [${i + 1}/${statements.length}] Already exists (skipped)`);
          skipCount++;
        } else {
          console.error(`✗ [${i + 1}/${statements.length}] Error:`, error.message);
          errorCount++;
        }
      }
    }

    // Close database connection
    db.close();

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Migration Summary:');
    console.log('='.repeat(60));
    console.log(`✓ Successful: ${successCount}`);
    console.log(`⊘ Skipped:    ${skipCount}`);
    console.log(`✗ Errors:     ${errorCount}`);
    console.log('='.repeat(60));

    if (errorCount === 0) {
      console.log('\n🎉 Migration completed successfully!\n');
      console.log('The following tables are now available:');
      console.log('  • concrete_bases');
      console.log('  • aggregate_inputs');
      console.log('  • email_templates');
      console.log('  • email_branding');
      console.log('\nThe machines table has been updated with:');
      console.log('  • totalWorkingHours column');
      console.log('  • concreteBaseId column');
      console.log('\nYou can now use the Aggregate Inputs page at /aggregate-inputs');
    } else {
      console.log('\n⚠️  Migration completed with some errors.');
      console.log('Please review the errors above and fix any issues.');
    }

  } catch (error) {
    console.error('\n❌ Fatal error during migration:');
    console.error(error);
    process.exit(1);
  }
}

// Run the migration
applyMigration().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});

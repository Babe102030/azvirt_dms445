/**
 * Database optimization script
 * Creates strategic indexes for improved query performance
 */

import mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("DATABASE_URL environment variable is not set");
  process.exit(1);
}

const indexes = [
  // Materials table indexes
  "CREATE INDEX IF NOT EXISTS idx_materials_project_id ON materials(projectId)",
  "CREATE INDEX IF NOT EXISTS idx_materials_status ON materials(status)",
  "CREATE INDEX IF NOT EXISTS idx_materials_stock_level ON materials(stockLevel)",
  "CREATE INDEX IF NOT EXISTS idx_materials_created_at ON materials(createdAt)",

  // Deliveries table indexes
  "CREATE INDEX IF NOT EXISTS idx_deliveries_project_id ON deliveries(projectId)",
  "CREATE INDEX IF NOT EXISTS idx_deliveries_status ON deliveries(status)",
  "CREATE INDEX IF NOT EXISTS idx_deliveries_expected_date ON deliveries(expectedDeliveryDate)",
  "CREATE INDEX IF NOT EXISTS idx_deliveries_created_at ON deliveries(createdAt)",

  // Quality tests table indexes
  "CREATE INDEX IF NOT EXISTS idx_quality_tests_project_id ON qualityTests(projectId)",
  "CREATE INDEX IF NOT EXISTS idx_quality_tests_status ON qualityTests(status)",
  "CREATE INDEX IF NOT EXISTS idx_quality_tests_created_at ON qualityTests(createdAt)",

  // Work hours table indexes
  "CREATE INDEX IF NOT EXISTS idx_work_hours_employee_id ON workHours(employeeId)",
  "CREATE INDEX IF NOT EXISTS idx_work_hours_project_id ON workHours(projectId)",
  "CREATE INDEX IF NOT EXISTS idx_work_hours_date ON workHours(date)",

  // Shifts table indexes
  "CREATE INDEX IF NOT EXISTS idx_shifts_employee_id ON shifts(employeeId)",
  "CREATE INDEX IF NOT EXISTS idx_shifts_project_id ON shifts(projectId)",
  "CREATE INDEX IF NOT EXISTS idx_shifts_status ON shifts(status)",
  "CREATE INDEX IF NOT EXISTS idx_shifts_start_time ON shifts(startTime)",

  // Location logs table indexes
  "CREATE INDEX IF NOT EXISTS idx_location_logs_employee_id ON locationLogs(employeeId)",
  "CREATE INDEX IF NOT EXISTS idx_location_logs_shift_id ON locationLogs(shiftId)",
  "CREATE INDEX IF NOT EXISTS idx_location_logs_job_site_id ON locationLogs(jobSiteId)",
  "CREATE INDEX IF NOT EXISTS idx_location_logs_timestamp ON locationLogs(timestamp)",

  // Geofence violations table indexes
  "CREATE INDEX IF NOT EXISTS idx_geofence_violations_employee_id ON geofenceViolations(employeeId)",
  "CREATE INDEX IF NOT EXISTS idx_geofence_violations_job_site_id ON geofenceViolations(jobSiteId)",
  "CREATE INDEX IF NOT EXISTS idx_geofence_violations_timestamp ON geofenceViolations(timestamp)",

  // Notification templates table indexes
  "CREATE INDEX IF NOT EXISTS idx_notification_templates_type ON notificationTemplates(templateType)",
  "CREATE INDEX IF NOT EXISTS idx_notification_templates_active ON notificationTemplates(isActive)",

  // Triggers table indexes
  "CREATE INDEX IF NOT EXISTS idx_triggers_project_id ON triggers(projectId)",
  "CREATE INDEX IF NOT EXISTS idx_triggers_active ON triggers(isActive)",

  // Trigger executions table indexes
  "CREATE INDEX IF NOT EXISTS idx_trigger_executions_trigger_id ON triggerExecutions(triggerId)",
  "CREATE INDEX IF NOT EXISTS idx_trigger_executions_timestamp ON triggerExecutions(executedAt)",

  // Compliance audit trail indexes
  "CREATE INDEX IF NOT EXISTS idx_compliance_audit_employee_id ON complianceAuditTrail(employeeId)",
  "CREATE INDEX IF NOT EXISTS idx_compliance_audit_timestamp ON complianceAuditTrail(timestamp)",

  // Users table indexes
  "CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)",
  "CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)",

  // Projects table indexes
  "CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status)",
  "CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(createdAt)",

  // Employees table indexes
  "CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department)",
  "CREATE INDEX IF NOT EXISTS idx_employees_employee_number ON employees(employeeNumber)",

  // Composite indexes for common queries
  "CREATE INDEX IF NOT EXISTS idx_materials_project_status ON materials(projectId, status)",
  "CREATE INDEX IF NOT EXISTS idx_deliveries_project_status ON deliveries(projectId, status)",
  "CREATE INDEX IF NOT EXISTS idx_work_hours_employee_date ON workHours(employeeId, date)",
  "CREATE INDEX IF NOT EXISTS idx_shifts_employee_status ON shifts(employeeId, status)",
  "CREATE INDEX IF NOT EXISTS idx_location_logs_employee_timestamp ON locationLogs(employeeId, timestamp)",
];

async function optimizeDatabase() {
  let connection;

  try {
    // Parse DATABASE_URL
    const url = new URL(DATABASE_URL);
    const config = {
      host: url.hostname,
      port: parseInt(url.port || "3306"),
      user: url.username,
      password: url.password,
      database: url.pathname.slice(1),
      ssl: url.hostname.includes("tidbcloud") ? { rejectUnauthorized: false } : undefined,
    };

    connection = await mysql.createConnection(config);
    console.log("✓ Connected to database");

    let created = 0;
    let skipped = 0;

    for (const indexSQL of indexes) {
      try {
        await connection.execute(indexSQL);
        created++;
        console.log(`✓ ${indexSQL}`);
      } catch (error) {
        if (error.code === "ER_DUP_KEYNAME") {
          skipped++;
        } else {
          console.error(`✗ Failed to create index: ${error.message}`);
        }
      }
    }

    console.log(`\n✓ Database optimization complete`);
    console.log(`  - Created: ${created} indexes`);
    console.log(`  - Skipped: ${skipped} (already exist)`);

    // Get index statistics
    const [stats] = await connection.execute(
      `SELECT 
        TABLE_NAME,
        INDEX_NAME,
        SEQ_IN_INDEX,
        COLUMN_NAME
      FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
      ORDER BY TABLE_NAME, INDEX_NAME`
    );

    console.log(`\n✓ Current indexes:`);
    console.log(stats);
  } catch (error) {
    console.error("✗ Database optimization failed:", error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

optimizeDatabase();

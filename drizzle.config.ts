import { defineConfig } from "drizzle-kit";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required to run drizzle commands");
}

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: connectionString,
  },
  schemaFilter: [
    "users",
    "projects",
    "materials",
    "suppliers",
    "material_consumption_history",
    "purchase_orders",
    "purchase_order_items",
    "concrete_recipes",
    "recipe_ingredients",
    "mixing_logs",
    "batch_ingredients",
    "deliveries",
    "delivery_status_history",
    "quality_tests",
    "employees",
    "shifts",
    "timesheet_approvals",
    "machines",
    "machine_work_hours",
    "tasks",
    "task_assignments",
    "ai_conversations",
    "ai_messages",
    "notifications",
    "documents",
    "email_templates",
    "email_branding",
  ],
});

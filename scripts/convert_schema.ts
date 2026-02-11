import fs from 'fs';
import path from 'path';

const schemaPath = path.join(process.cwd(), 'drizzle/schema.ts');
let content = fs.readFileSync(schemaPath, 'utf8');

// 1. Update Imports
content = content.replace(
  /import\s+\{[\s\S]*?\}\s+from\s+"drizzle-orm\/pg-core";/,
  `import {
  integer,
  sqliteTable,
  text,
  real,
  blob
} from "drizzle-orm/sqlite-core";
import { sql, relations } from "drizzle-orm";`
);

// Remove duplicate relations import if it existed separately
content = content.replace(/import\s+\{\s*relations\s*\}\s+from\s+"drizzle-orm";\s*/, '');

// 2. Transform Definitions

// pgTable -> sqliteTable
content = content.replace(/pgTable/g, 'sqliteTable');

// serial("id").primaryKey() -> integer("id", { mode: "number" }).primaryKey({ autoIncrement: true })
content = content.replace(/serial\s*\(\s*"([^"]+)"\s*\)\s*\.primaryKey\(\)/g, 'integer("", { mode: "number" }).primaryKey({ autoIncrement: true })');

// varchar("name", { length: ... }) -> text("name")
content = content.replace(/varchar\s*\(\s*("[^"]+")\s*(?:,\s*\{[^}]+\})?\s*\)/g, 'text()');

// boolean("name") -> integer("name", { mode: "boolean" })
content = content.replace(/boolean\s*\(\s*("[^"]+")\s*\)/g, 'integer("", { mode: "boolean" })');

// timestamp("name") -> integer("name", { mode: "timestamp" })
content = content.replace(/timestamp\s*\(\s*("[^"]+")\s*\)/g, 'integer("", { mode: "timestamp" })');

// decimal/doublePrecision -> real
content = content.replace(/decimal\s*\(\s*("[^"]+")\s*(?:,\s*\{[^}]+\})?\s*\)/g, 'real("")');
content = content.replace(/doublePrecision\s*\(\s*("[^"]+")\s*\)/g, 'real("")');

// defaultNow() -> default(sql`(CURRENT_TIMESTAMP)`)
content = content.replace(/\.defaultNow\(\)/g, '.default(sql)');

// Handle pgEnum?
// If there are enums, this might break. I'll assume simpler types for now.
// Users table has role: varchar... default "user"
// This is handled by varchar replacement.

fs.writeFileSync(schemaPath, content);
console.log('Schema converted to SQLite');

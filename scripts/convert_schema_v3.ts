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
content = content.replace(/serial\("([^"]+)"\)\.primaryKey\(\)/g, 'integer("$1", { mode: "number" }).primaryKey({ autoIncrement: true })');

// varchar("name", { length: ... }) -> text("name")
// Matches: varchar("name", { length: 255 }) or varchar("name")
// Regex: varchar\(\s*"([^"]+)"\s*(?:,\s*\{[^}]+\})?\s*\)
content = content.replace(/varchar\(\s*"([^"]+)"\s*(?:,\s*\{[^}]+\})?\s*\)/g, 'text("$1")');

// boolean("name") -> integer("name", { mode: "boolean" })
content = content.replace(/boolean\("([^"]+)"\)/g, 'integer("$1", { mode: "boolean" })');

// timestamp("name") -> integer("name", { mode: "timestamp" })
content = content.replace(/timestamp\("([^"]+)"\)/g, 'integer("$1", { mode: "timestamp" })');

// decimal("name", ...) -> real("name")
// doublePrecision("name") -> real("name")
content = content.replace(/decimal\(\s*"([^"]+)"\s*(?:,\s*\{[^}]+\})?\s*\)/g, 'real("$1")');
content = content.replace(/doublePrecision\("([^"]+)"\)/g, 'real("$1")');

// defaultNow() -> default(sql`(CURRENT_TIMESTAMP)`)
content = content.replace(/\.defaultNow\(\)/g, '.default(sql`(CURRENT_TIMESTAMP)`)');

// pgEnum - remove it from imports (done in step 1 by replacing block)
// If used in code: role: roleEnum("role") -> role: text("role")
// We don't have roleEnum imported, so we need to see how it was used.
// Original import included pgEnum.
// Usage: role: pgEnum(...) is unlikely for role column defined as varchar("role", ...).
// If there are specific pgEnum usages, we might need manual fix.
// But based on outline, role is varchar.

fs.writeFileSync(schemaPath, content);
console.log('Schema converted to SQLite');

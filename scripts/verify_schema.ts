#!/usr/bin/env tsx
/**
 * scripts/verify_schema.ts
 *
 * Simple verification script to:
 *  - confirm required tables exist in the target Postgres database
 *  - (optionally) run TypeScript compile check using `npx tsc --noEmit`
 *
 * Usage:
 *   - Make sure your environment contains a Postgres connection string:
 *       DATABASE_URL=postgres://user:pass@host:port/dbname
 *     or the equivalent PGHOST/PGUSER/PGPASSWORD/PGDATABASE/PGPORT variables.
 *
 *   - Run with tsx (ts-node/tsx available in this repo's dev deps):
 *       npx tsx ./scripts/verify_schema.ts
 *
 * Exit codes:
 *   0 - all checks passed
 *   non-zero - one or more checks failed
 */

import postgres from "postgres";
import { exec } from "child_process";
import { promisify } from "util";

const execP = promisify(exec);

type CheckResult = {
  name: string;
  found: boolean;
  triedNames: string[];
  message?: string;
};

function toSnakeCase(name: string) {
  // tiny camelCase -> snake_case converter
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1_$2")
    .toLowerCase();
}

async function checkTableExists(sql: any, tableBaseName: string): Promise<CheckResult> {
  // Try a few likely variants that might appear in the DB:
  //  - original name as provided (e.g. projectSites) — matches quoted mixed-case tables
  //  - lowercased (e.g. projectsites) — if created without quotes and name folded to lower
  //  - snake_case (e.g. project_sites) — common alternative naming
  const candidates = [
    tableBaseName,
    tableBaseName.toLowerCase(),
    toSnakeCase(tableBaseName),
  ];

  for (const candidate of candidates) {
    try {
      // Use pg_class + pg_namespace lookup to check exact relname in public schema
      const rows: Array<{ exists: boolean }> = await sql`
        SELECT EXISTS (
          SELECT 1
          FROM pg_class c
          JOIN pg_namespace n ON n.oid = c.relnamespace
          WHERE c.relname = ${candidate} AND n.nspname = 'public'
        ) AS "exists";
      `;
      if (rows && rows[0] && rows[0].exists) {
        return { name: tableBaseName, found: true, triedNames: candidates, message: `found as '${candidate}'` };
      }
    } catch (err) {
      // keep trying other variants; capture message at the end if nothing matches
      // but avoid failing early for transient query issues
    }
  }

  return { name: tableBaseName, found: false, triedNames: candidates, message: "not found" };
}

async function runTypeCheck() {
  // Run TypeScript compile check (no emit). We use npx so local devDeps tsserver/tsc are used.
  // If the environment doesn't have npx, the command will fail and we surface the error.
  try {
    const { stdout, stderr } = await execP("npx tsc --noEmit", {
      // Limit runtime to avoid long hangs
      timeout: 60_000,
      env: process.env,
    });
    return { ok: true, stdout, stderr };
  } catch (error: any) {
    // error may be from tsc returning non-zero exit code or exec failures
    return { ok: false, error };
  }
}

async function main() {
  console.log("verify_schema: starting");

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error(
      "ERROR: DATABASE_URL is not set. Please set DATABASE_URL or equivalent PG env vars and retry."
    );
    console.error(
      "Example: export DATABASE_URL='postgres://user:password@localhost:5432/mydb'"
    );
    process.exit(2);
  }

  // Connect using postgres library
  const sql = postgres(databaseUrl, {
    // keep defaults; this library will use env for settings
    application_name: "azvirt:verify_schema",
  });

  const requiredTables = ["projectSites", "checkInRecords"];
  const results: CheckResult[] = [];

  try {
    for (const tableName of requiredTables) {
      process.stdout.write(`Checking table '${tableName}'... `);
      const res = await checkTableExists(sql, tableName);
      results.push(res);
      if (res.found) {
        console.log(`OK (${res.message})`);
      } else {
        console.log("MISSING");
      }
    }
  } catch (err) {
    console.error("Unexpected error while checking tables:", err);
    await sql.end({ timeout: 5000 });
    process.exit(3);
  }

  // Summarize
  const missing = results.filter((r) => !r.found);
  if (missing.length === 0) {
    console.log("\nAll required tables were found in the database.");
  } else {
    console.log("\nMissing tables:");
    for (const m of missing) {
      console.log(` - ${m.name} (tried: ${m.triedNames.join(", ")})`);
    }
    console.log("\nTip: check that you connected to the correct database and that migrations were applied.");
  }

  // Run TypeScript check
  console.log("\nRunning TypeScript type check (tsc --noEmit) ...");
  const tscResult = await runTypeCheck();

  if (tscResult.ok) {
    console.log("TypeScript check passed.");
  } else {
    console.error("TypeScript check failed or errored.");
    // If it's an exec error, surface stderr/stdout if available
    if (tscResult.error) {
      // error may contain stdout/stderr on the error object depending on exec implementation
      const e = tscResult.error;
      if (e.stdout) {
        console.error("tsc stdout:\n", e.stdout.toString());
      }
      if (e.stderr) {
        console.error("tsc stderr:\n", e.stderr.toString());
      } else {
        console.error(e.message || e);
      }
    }
  }

  // close DB connection
  try {
    await sql.end({ timeout: 5000 });
  } catch {
    // ignore
  }

  // Decide exit code:
  // 0 if no missing tables and tsc ok
  if (missing.length === 0 && tscResult.ok) {
    console.log("\n✅ Verification succeeded.");
    process.exit(0);
  } else {
    console.error("\n❌ Verification failed.");
    const exitCode = 10 + Math.min(missing.length, 10);
    process.exit(exitCode);
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error("Unhandled error in verify_schema:", err);
    process.exit(99);
  });
}

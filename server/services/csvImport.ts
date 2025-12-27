import Papa from 'papaparse';
import * as db from '../db';

export interface ImportResult {
  success: number;
  failed: number;
  errors: Array<{ row: number; error: string }>;
  warnings: string[];
}

export interface CSVRow {
  [key: string]: string | number | boolean | null;
}

/**
 * Validates and imports materials from CSV
 */
export async function importMaterials(csvContent: string): Promise<ImportResult> {
  const result: ImportResult = {
    success: 0,
    failed: 0,
    errors: [],
    warnings: [],
  };

  return new Promise((resolve) => {
    Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true,
      complete: async (results: any) => {
        const rows = results.data as CSVRow[];

        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          try {
            // Validate required fields
            if (!row.name || !row.unit) {
              result.failed++;
              result.errors.push({
                row: i + 2,
                error: 'Missing required fields: name, unit',
              });
              continue;
            }

            // Check for duplicates
            const allMaterials = await db.getMaterials();
            const existing = allMaterials.find(m => m.name === String(row.name));

            if (existing) {
              result.warnings.push(
                `Row ${i + 2}: Material "${row.name}" already exists, skipping`
              );
              continue;
            }

            // Insert material with correct schema fields
            await db.createMaterial({
              name: String(row.name),
              unit: String(row.unit),
              quantity: Number(row.quantity) || 0,
              minStock: Number(row.minStock) || 10,
              category: (row.category || 'other') as any,
              supplier: row.supplier ? String(row.supplier) : undefined,
            });

            result.success++;
          } catch (error) {
            result.failed++;
            result.errors.push({
              row: i + 2,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }

        resolve(result);
      },
      error: (error: any) => {
        result.errors.push({
          row: 0,
          error: `CSV parsing error: ${error.message}`,
        });
        resolve(result);
      },
    });
  });
}

/**
 * Validates and imports employees from CSV
 */
export async function importEmployees(csvContent: string): Promise<ImportResult> {
  const result: ImportResult = {
    success: 0,
    failed: 0,
    errors: [],
    warnings: [],
  };

  return new Promise((resolve) => {
    Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true,
      complete: async (results: any) => {
        const rows = results.data as CSVRow[];

        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          try {
            // Validate required fields
            if (!row.firstName || !row.lastName || !row.employeeNumber || !row.position) {
              result.failed++;
              result.errors.push({
                row: i + 2,
                error: 'Missing required fields: firstName, lastName, employeeNumber, position',
              });
              continue;
            }

            // Check for duplicates by employeeNumber
            const allEmployees = await db.getEmployees();
            const existing = allEmployees.find(e => e.employeeNumber === String(row.employeeNumber));

            if (existing) {
              result.warnings.push(
                `Row ${i + 2}: Employee with number "${row.employeeNumber}" already exists, skipping`
              );
              continue;
            }

            // Insert employee with correct schema fields
            await db.createEmployee({
              firstName: String(row.firstName),
              lastName: String(row.lastName),
              employeeNumber: String(row.employeeNumber),
              position: String(row.position),
              department: (row.department || 'construction') as any,
              phoneNumber: row.phoneNumber ? String(row.phoneNumber) : undefined,
              email: row.email ? String(row.email) : undefined,
              hourlyRate: row.hourlyRate ? Number(row.hourlyRate) : undefined,
              status: 'active',
              hireDate: row.hireDate ? new Date(String(row.hireDate)) : undefined,
            });

            result.success++;
          } catch (error) {
            result.failed++;
            result.errors.push({
              row: i + 2,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }

        resolve(result);
      },
      error: (error: any) => {
        result.errors.push({
          row: 0,
          error: `CSV parsing error: ${error.message}`,
        });
        resolve(result);
      },
    });
  });
}

/**
 * Validates and imports projects from CSV
 */
export async function importProjects(csvContent: string): Promise<ImportResult> {
  const result: ImportResult = {
    success: 0,
    failed: 0,
    errors: [],
    warnings: [],
  };

  return new Promise((resolve) => {
    Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true,
      complete: async (results: any) => {
        const rows = results.data as CSVRow[];

        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          try {
            // Validate required fields
            if (!row.name || !row.location) {
              result.failed++;
              result.errors.push({
                row: i + 2,
                error: 'Missing required fields: name, location',
              });
              continue;
            }

            // Check for duplicates
            const allProjects = await db.getProjects();
            const existing = allProjects.find(p => p.name === String(row.name));

            if (existing) {
              result.warnings.push(
                `Row ${i + 2}: Project "${row.name}" already exists, skipping`
              );
              continue;
            }

            // Insert project with correct schema fields
            await db.createProject({
              name: String(row.name),
              location: String(row.location),
              status: (row.status || 'active') as any,
              startDate: row.startDate ? new Date(String(row.startDate)) : new Date(),
              endDate: row.endDate ? new Date(String(row.endDate)) : null,
              createdBy: Number(row.createdBy) || 1,
            });

            result.success++;
          } catch (error) {
            result.failed++;
            result.errors.push({
              row: i + 2,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }

        resolve(result);
      },
      error: (error: any) => {
        result.errors.push({
          row: 0,
          error: `CSV parsing error: ${error.message}`,
        });
        resolve(result);
      },
    });
  });
}

import driver, { getSession, recordToNative } from '../db/neo4j';

const recordToObj = recordToNative;

/**
 * Get all employees for shift assignment
 */
export async function getAllEmployees() {
  const session = getSession();
  try {
    const result = await session.run(`MATCH (e:User {role: 'employee'}) RETURN e`); // Assuming role approach or Employee label
    // Or just all users? Drizzle returned 'employees' table. 
    // In db.ts we decided User with properties is Employee.
    // Or maybe we have (:Employee) node?
    // In db.ts createEmployee -> (:User {role: 'employee', ...}).
    // But wait, there was `createEmployee` in db.ts. 
    // Is there an Employee label?
    // In db.ts `createEmployee` creates `(:User ...)` and sets properties. 
    // It doesn't explicitly add :Employee label unless role='employee' implies it?
    // Neo4j doesn't auto-label.
    // I'll assume we query User with role='employee' or similar.
    // Actually, let's query all Users for now or filter by property if needed.
    // Drizzle 'employees' table was likely separate or linked.
    // DB migration script migrated employees to User nodes?
    // Migration script: `MATCH (u:User) SET u.role = 'employee' ...`? No.
    // Migration script migrated `employees` table to `Employee` nodes?
    // No, I think I merged them into User or created Employee nodes.
    // Let's check `createEmployee` in db.ts.
    // It does `CREATE (e:Employee ...)` ? No, `CREATE (u:User ...)` or `MERGE (u:User ...)`?
    // In db.ts Step 239:
    // `createEmployee` -> `CREATE (e:Employee { ... })` !!
    // So there ARE Employee nodes.
    const resultEmp = await session.run(`MATCH (e:Employee) RETURN e`);
    return resultEmp.records.map(r => recordToObj(r, 'e'));
  } catch (error) {
    console.error("Failed to get employees:", error);
    return [];
  } finally {
    await session.close();
  }
}

/**
 * Get shifts for a specific date range
 */
export async function getShiftsForDateRange(startDate: Date, endDate: Date) {
  const session = getSession();
  try {
    const query = `
      MATCH (s:Shift)
      WHERE s.startTime >= datetime($startDate) AND s.startTime <= datetime($endDate)
      RETURN s
      ORDER BY s.startTime
    `;
    const result = await session.run(query, {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    });
    return result.records.map(r => recordToObj(r, 's'));
  } catch (error) {
    console.error("Failed to get shifts for date range:", error);
    return [];
  } finally {
    await session.close();
  }
}

/**
 * Get shifts for a specific employee
 */
export async function getEmployeeShifts(employeeId: number, startDate: Date, endDate: Date) {
  const session = getSession();
  try {
    const query = `
      MATCH (u:User {id: $employeeId})-[:HAS_SHIFT]->(s:Shift)
      WHERE s.startTime >= datetime($startDate) AND s.startTime <= datetime($endDate)
      RETURN s
      ORDER BY s.startTime
    `;
    // Note: User vs Employee node. If linked to User ID, match User.
    // The employeeId is likely User ID.
    const result = await session.run(query, {
      employeeId,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    });
    return result.records.map(r => recordToObj(r, 's'));
  } catch (error) {
    console.error("Failed to get employee shifts:", error);
    return [];
  } finally {
    await session.close();
  }
}

/**
 * Assign an employee to a shift
 */
export async function assignEmployeeToShift(
  employeeId: number,
  startTime: Date,
  endTime: Date,
  shiftDate: Date,
  createdBy: number
) {
  const session = getSession();
  try {
    // Check conflicts
    const conflictQuery = `
      MATCH (u:User {id: $employeeId})-[:HAS_SHIFT]->(s:Shift)
      WHERE date(s.startTime) = date($shiftDate)
      RETURN count(s) as count
    `;
    const conflictResult = await session.run(conflictQuery, {
      employeeId,
      shiftDate: shiftDate.toISOString()
    });

    if (conflictResult.records[0].get('count').toNumber() > 0) {
      return { success: false, message: "Employee already assigned to a shift on this date" };
    }

    const createQuery = `
      MATCH (u:User {id: $employeeId})
      CREATE (s:Shift {
        id: toInteger(timestamp()),
        employeeId: $employeeId,
        shiftDate: datetime($shiftDate),
        startTime: datetime($startTime),
        endTime: datetime($endTime),
        status: 'scheduled',
        createdBy: $createdBy,
        createdAt: datetime(),
        updatedAt: datetime()
      })
      MERGE (u)-[:HAS_SHIFT]->(s)
      RETURN s.id as id
    `;

    await session.run(createQuery, {
      employeeId,
      shiftDate: shiftDate.toISOString(),
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      createdBy
    });

    return { success: true, message: "Shift assigned successfully" };
  } catch (error) {
    console.error("Failed to assign shift:", error);
    return { success: false, message: "Database connection failed" };
  } finally {
    await session.close();
  }
}

/**
 * Update a shift assignment
 */
export async function updateShiftAssignment(
  shiftId: number,
  updates: { startTime?: Date; endTime?: Date; status?: "scheduled" | "in_progress" | "completed" | "cancelled" | "no_show" }
) {
  const session = getSession();
  try {
    if (Object.keys(updates).length === 0) {
      return { success: false, message: "No updates provided" };
    }

    let setClause = `s.updatedAt = datetime()`;
    let params: any = { shiftId };

    if (updates.startTime) {
      setClause += `, s.startTime = datetime($startTime)`;
      params.startTime = updates.startTime.toISOString();
    }
    if (updates.endTime) {
      setClause += `, s.endTime = datetime($endTime)`;
      params.endTime = updates.endTime.toISOString();
    }
    if (updates.status) {
      setClause += `, s.status = $status`;
      params.status = updates.status;
    }

    await session.run(`
      MATCH (s:Shift {id: $shiftId})
      SET ${setClause}
    `, params);

    return { success: true, message: "Shift updated successfully" };
  } catch (error) {
    console.error("Failed to update shift:", error);
    return { success: false, message: "Database connection failed" };
  } finally {
    await session.close();
  }
}

/**
 * Delete a shift assignment
 */
export async function deleteShiftAssignment(shiftId: number) {
  const session = getSession();
  try {
    await session.run(`MATCH (s:Shift {id: $shiftId}) DETACH DELETE s`, { shiftId });
    return { success: true, message: "Shift deleted successfully" };
  } catch (error) {
    console.error("Failed to delete shift:", error);
    return { success: false, message: "Database connection failed" };
  } finally {
    await session.close();
  }
}

/**
 * Check for shift conflicts
 */
export async function checkShiftConflicts(employeeId: number, shiftDate: Date) {
  const session = getSession();
  try {
    const result = await session.run(`
      MATCH (u:User {id: $employeeId})-[:HAS_SHIFT]->(s:Shift)
      WHERE date(s.startTime) = date($shiftDate)
      RETURN s
    `, {
      employeeId,
      shiftDate: shiftDate.toISOString()
    });
    return result.records.map(r => recordToObj(r, 's'));
  } catch (error) {
    console.error("Failed to check shift conflicts:", error);
    return [];
  } finally {
    await session.close();
  }
}

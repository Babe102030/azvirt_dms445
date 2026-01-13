import driver, { getSession, recordToNative } from './db/neo4j';
import { ENV } from './_core/env';
import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from '../drizzle/schema';

// Temporary types to replace Drizzle schema types
type InsertUser = any;
type InsertDocument = any;
type InsertProject = any;
type InsertMaterial = any;
type InsertDelivery = any;
type InsertQualityTest = any;
type InsertEmployee = any;
type InsertWorkHour = any;
type InsertConcreteBase = any;
type InsertMachine = any;
type InsertMachineMaintenance = any;
type InsertMachineWorkHour = any;
type InsertAggregateInput = any;
type InsertMaterialConsumptionLog = any;
type InsertPurchaseOrder = any;
type InsertShift = any;
type InsertShiftTemplate = any;
type InsertEmployeeAvailability = any;
type InsertComplianceAuditTrail = any;
type InsertBreakRecord = any;
type InsertTimesheetOfflineCache = any;

// Helper to convert Neo4j Node to JS Object
const recordToObj = recordToNative;

// Drizzle/SQLite connection for components that still need it
const sqliteClient = createClient({
  url: process.env.DATABASE_URL || 'file:local.db',
});

export const db = drizzle(sqliteClient, { schema });

export async function getDb() {
  return db;
}


export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");

  const session = getSession();
  try {
    const role = user.role || (user.openId === ENV.ownerOpenId ? 'admin' : 'user');

    // We strictly assume Migrated Users have integer-like IDs coming back as integers or we handle them.
    // Neo4j properties are just properties.
    await session.run(`
      MERGE (u:User {openId: $openId})
      ON CREATE SET 
        u.id = toInteger(timestamp()),  // Simple ID generation for new users
        u.name = $name,
        u.email = $email,
        u.loginMethod = $loginMethod,
        u.role = $role,
        u.lastSignedIn = datetime(),
        u.createdAt = datetime(),
        u.updatedAt = datetime()
      ON MATCH SET
        u.name = COALESCE($name, u.name),
        u.email = COALESCE($email, u.email),
        u.loginMethod = COALESCE($loginMethod, u.loginMethod),
        u.lastSignedIn = datetime(),
        u.updatedAt = datetime()
    `, {
      openId: user.openId,
      name: user.name || null,
      email: user.email || null,
      loginMethod: user.loginMethod || null,
      role: role
    });

  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  } finally {
    await session.close();
  }
}

export async function getUserByOpenId(openId: string) {
  const session = getSession();
  try {
    const result = await session.run(
      'MATCH (u:User {openId: $openId}) RETURN u',
      { openId }
    );
    if (result.records.length === 0) return undefined;
    return recordToObj(result.records[0], 'u');
  } finally {
    await session.close();
  }
}

// Documents
// Documents
export async function createDocument(doc: InsertDocument) {
  const session = getSession();
  try {
    const query = `
      CREATE (d:Document {
        id: toInteger(timestamp()),
        name: $name,
        description: $description,
        fileKey: $fileKey,
        fileUrl: $fileUrl,
        mimeType: $mimeType,
        fileSize: $fileSize,
        category: $category,
        uploadedBy: $uploadedBy,
        projectId: $projectId,
        createdAt: datetime(),
        updatedAt: datetime()
      })
      WITH d
      MATCH (u:User {id: $uploadedBy})
      MERGE (u)-[:UPLOADED]->(d)
      WITH d
      OPTIONAL MATCH (p:Project {id: $projectId})
      FOREACH (_ IN CASE WHEN p IS NOT NULL THEN [1] ELSE [] END |
        MERGE (p)-[:HAS_DOCUMENT]->(d)
      )
      RETURN d
    `;

    await session.run(query, {
      name: doc.name,
      description: doc.description || '',
      fileKey: doc.fileKey,
      fileUrl: doc.fileUrl,
      mimeType: doc.mimeType || '',
      fileSize: doc.fileSize || 0,
      category: doc.category || 'other',
      uploadedBy: doc.uploadedBy,
      projectId: doc.projectId || null
    });
  } catch (e) {
    console.error("Failed to create document", e);
    throw e;
  } finally {
    await session.close();
  }
}

export async function getDocuments(filters?: { projectId?: number; category?: string; search?: string }) {
  const session = getSession();
  try {
    let query = 'MATCH (d:Document)';
    let params: any = {};
    let whereClauses = [];

    if (filters?.projectId) {
      query = 'MATCH (p:Project {id: $projectId})-[:HAS_DOCUMENT]->(d)';
      params.projectId = filters.projectId;
    }

    if (filters?.category) {
      whereClauses.push('d.category = $category');
      params.category = filters.category;
    }

    if (filters?.search) {
      whereClauses.push('(toLower(d.name) CONTAINS toLower($search) OR toLower(d.description) CONTAINS toLower($search))');
      params.search = filters.search;
    }

    if (whereClauses.length > 0) {
      query += ' WHERE ' + whereClauses.join(' AND ');
    }

    query += ' RETURN d ORDER BY d.createdAt DESC';

    const result = await session.run(query, params);
    return result.records.map(r => recordToObj(r, 'd'));
  } finally {
    await session.close();
  }
}

export async function getDocumentById(id: number) {
  const session = getSession();
  try {
    const result = await session.run('MATCH (d:Document {id: $id}) RETURN d', { id });
    if (result.records.length === 0) return undefined;
    return recordToObj(result.records[0], 'd');
  } finally {
    await session.close();
  }
}

export async function deleteDocument(id: number) {
  const session = getSession();
  try {
    await session.run('MATCH (d:Document {id: $id}) DETACH DELETE d', { id });
  } finally {
    await session.close();
  }
}

// Projects
export async function createProject(project: InsertProject) {
  const session = getSession();
  try {
    const query = `
      MATCH (u:User {id: $createdBy})
      CREATE (p:Project {
        id: toInteger(timestamp()),
        name: $name,
        description: $description,
        location: $location,
        status: $status,
        startDate: datetime($startDate),
        endDate: datetime($endDate),
        createdBy: $createdBy,
        createdAt: datetime(),
        updatedAt: datetime()
      })
      MERGE (u)-[:CREATED]->(p)
      RETURN p
    `;
    await session.run(query, {
      name: project.name,
      description: project.description || '',
      location: project.location || '',
      status: project.status,
      startDate: project.startDate ? project.startDate.toISOString() : null,
      endDate: project.endDate ? project.endDate.toISOString() : null,
      createdBy: project.createdBy
    });
  } catch (e) {
    console.error("Failed to create project", e);
    throw e;
  } finally {
    await session.close();
  }
}

export async function getProjects() {
  const session = getSession();
  try {
    const result = await session.run('MATCH (p:Project) RETURN p ORDER BY p.createdAt DESC');
    return result.records.map(r => recordToObj(r, 'p'));
  } finally {
    await session.close();
  }
}

export async function getProjectById(id: number) {
  const session = getSession();
  try {
    const result = await session.run('MATCH (p:Project {id: $id}) RETURN p', { id });
    if (result.records.length === 0) return undefined;
    return recordToObj(result.records[0], 'p');
  } finally {
    await session.close();
  }
}

export async function updateProject(id: number, data: Partial<InsertProject>) {
  const session = getSession();
  try {
    let sets = [];
    let params: any = { id };

    Object.keys(data).forEach(key => {
      if (key === 'id') return;
      sets.push(`p.${key} = $${key}`);
      // Handle dates
      if (data[key] instanceof Date) {
        sets.push(`p.${key} = datetime($${key})`);
        params[key] = data[key].toISOString();
      } else {
        params[key] = data[key];
      }
    });

    // Always update updatedAt
    sets.push('p.updatedAt = datetime()');

    if (sets.length === 0) return;

    await session.run(`MATCH (p:Project {id: $id}) SET ${sets.join(', ')}`, params);
  } finally {
    await session.close();
  }
}

// Materials
export async function createMaterial(material: InsertMaterial) {
  const session = getSession();
  try {
    await session.run(`
      CREATE (m:Material {
        id: toInteger(timestamp()),
        name: $name,
        category: $category,
        unit: $unit,
        quantity: toInteger($quantity),
        minStock: toInteger($minStock),
        criticalThreshold: toInteger($criticalThreshold),
        supplier: $supplier,
        unitPrice: toInteger($unitPrice),
        createdAt: datetime(),
        updatedAt: datetime()
      })
    `, {
      name: material.name,
      category: material.category,
      unit: material.unit,
      quantity: material.quantity || 0,
      minStock: material.minStock || 0,
      criticalThreshold: material.criticalThreshold || 0,
      supplier: material.supplier || null,
      unitPrice: material.unitPrice || 0
    });
  } catch (e) {
    console.error("Failed to create material", e);
    throw e;
  } finally {
    await session.close();
  }
}

export async function getMaterials() {
  const session = getSession();
  try {
    const result = await session.run('MATCH (m:Material) RETURN m ORDER BY m.name');
    return result.records.map(r => recordToObj(r, 'm'));
  } finally {
    await session.close();
  }
}

export async function updateMaterial(id: number, data: Partial<InsertMaterial>) {
  const session = getSession();
  try {
    let sets = [];
    let params: any = { id };

    Object.keys(data).forEach(key => {
      if (key === 'id') return;

      // Handle integers
      if (['quantity', 'minStock', 'criticalThreshold', 'unitPrice'].includes(key)) {
        sets.push(`m.${key} = toInteger($${key})`);
      } else {
        sets.push(`m.${key} = $${key}`);
      }
      params[key] = data[key];
    });

    sets.push('m.updatedAt = datetime()');

    if (sets.length === 0) return;

    await session.run(`MATCH (m:Material {id: $id}) SET ${sets.join(', ')}`, params);
  } finally {
    await session.close();
  }
}

export async function deleteMaterial(id: number) {
  const session = getSession();
  try {
    await session.run('MATCH (m:Material {id: $id}) DETACH DELETE m', { id });
  } finally {
    await session.close();
  }
}

// Deliveries
export async function createDelivery(delivery: InsertDelivery) {
  const session = getSession();
  try {
    const query = `
      CREATE (d:Delivery {
        id: toInteger(timestamp()),
        projectId: $projectId,
        projectName: $projectName,
        concreteType: $concreteType,
        volume: toInteger($volume),
        scheduledTime: datetime($scheduledTime),
        status: $status,
        createdBy: $createdBy,
        createdAt: datetime(),
        updatedAt: datetime()
      })
      WITH d
      MATCH (u:User {id: $createdBy})
      MERGE (u)-[:CREATED]->(d)
      WITH d
      OPTIONAL MATCH (p:Project {id: $projectId})
      FOREACH (_ IN CASE WHEN p IS NOT NULL THEN [1] ELSE [] END |
        MERGE (d)-[:DELIVERED_TO]->(p)
      )
      RETURN d
    `;

    await session.run(query, {
      projectId: delivery.projectId || null,
      projectName: delivery.projectName,
      concreteType: delivery.concreteType,
      volume: delivery.volume,
      scheduledTime: delivery.scheduledTime.toISOString(),
      status: delivery.status,
      createdBy: delivery.createdBy
    });
  } catch (e) {
    console.error("Failed to create delivery", e);
    throw e;
  } finally {
    await session.close();
  }
}

export async function getDeliveries(filters?: { projectId?: number; status?: string }) {
  const session = getSession();
  try {
    let query = 'MATCH (d:Delivery)';
    let params: any = {};
    let where = [];

    if (filters?.projectId) {
      where.push('d.projectId = $projectId');
      params.projectId = filters.projectId;
    }
    if (filters?.status) {
      where.push('d.status = $status');
      params.status = filters.status;
    }

    if (where.length > 0) {
      query += ' WHERE ' + where.join(' AND ');
    }

    query += ' RETURN d ORDER BY d.scheduledTime DESC';

    const result = await session.run(query, params);
    return result.records.map(r => recordToObj(r, 'd'));
  } finally {
    await session.close();
  }
}

export async function updateDelivery(id: number, data: Partial<InsertDelivery>) {
  const session = getSession();
  try {
    let sets = [];
    let params: any = { id };

    Object.keys(data).forEach(key => {
      if (key === 'id') return;
      sets.push(`d.${key} = $${key}`);
      if (data[key] instanceof Date) {
        sets.push(`d.${key} = datetime($${key})`);
        params[key] = data[key].toISOString();
      } else {
        params[key] = data[key];
      }
    });

    sets.push('d.updatedAt = datetime()');
    if (sets.length === 0) return;

    await session.run(`MATCH (d:Delivery {id: $id}) SET ${sets.join(', ')}`, params);
  } finally {
    await session.close();
  }
}

// Quality Tests
export async function createQualityTest(test: InsertQualityTest) {
  const session = getSession();
  try {
    const query = `
      CREATE (q:QualityTest {
        id: toInteger(timestamp()),
        testName: $testName,
        testType: $testType,
        result: $result,
        unit: $unit,
        status: $status,
        deliveryId: $deliveryId,
        projectId: $projectId,
        testedBy: $testedBy,
        notes: $notes,
        createdAt: datetime(),
        updatedAt: datetime()
      })
      WITH q
      OPTIONAL MATCH (d:Delivery {id: $deliveryId})
      FOREACH (_ IN CASE WHEN d IS NOT NULL THEN [1] ELSE [] END |
        MERGE (d)-[:HAS_TEST]->(q)
      )
      WITH q
      OPTIONAL MATCH (p:Project {id: $projectId})
      FOREACH (_ IN CASE WHEN p IS NOT NULL THEN [1] ELSE [] END |
        MERGE (p)-[:HAS_TEST]->(q)
      )
      RETURN q
    `;

    await session.run(query, {
      testName: test.testName,
      testType: test.testType,
      result: test.result,
      unit: test.unit || '',
      status: test.status,
      deliveryId: test.deliveryId || null,
      projectId: test.projectId || null,
      testedBy: test.testedBy || '',
      notes: test.notes || ''
    });
  } catch (e) {
    console.error("Failed to create quality test", e);
    throw e;
  } finally {
    await session.close();
  }
}

export async function getQualityTests(filters?: { projectId?: number; deliveryId?: number }) {
  const session = getSession();
  try {
    let query = 'MATCH (q:QualityTest)';
    let params: any = {};
    let where = [];

    if (filters?.projectId) {
      where.push('q.projectId = $projectId');
      params.projectId = filters.projectId;
    }
    if (filters?.deliveryId) {
      where.push('q.deliveryId = $deliveryId');
      params.deliveryId = filters.deliveryId;
    }

    if (where.length > 0) {
      query += ' WHERE ' + where.join(' AND ');
    }

    query += ' RETURN q ORDER BY q.createdAt DESC';

    const result = await session.run(query, params);
    return result.records.map(r => recordToObj(r, 'q'));
  } finally {
    await session.close();
  }
}

export async function updateQualityTest(id: number, data: Partial<InsertQualityTest>) {
  const session = getSession();
  try {
    let sets = [];
    let params: any = { id };

    Object.keys(data).forEach(key => {
      if (key === 'id') return;
      sets.push(`q.${key} = $${key}`);
      params[key] = data[key];
    });

    sets.push('q.updatedAt = datetime()');
    if (sets.length === 0) return;

    await session.run(`MATCH (q:QualityTest {id: $id}) SET ${sets.join(', ')}`, params);
  } finally {
    await session.close();
  }
}

export async function getFailedQualityTests(days: number = 30) {
  const session = getSession();
  try {
    const result = await session.run(`
        MATCH (q:QualityTest) 
        WHERE q.status = 'fail' AND q.createdAt >= datetime() - duration({days: $days})
        RETURN q ORDER BY q.createdAt DESC
    `, { days });
    return result.records.map(r => recordToObj(r, 'q'));
  } finally {
    await session.close();
  }
}

export async function getQualityTestTrends(days: number = 30) {
  const session = getSession();
  try {
    const query = `
        MATCH (q:QualityTest)
        WHERE q.createdAt >= datetime() - duration({days: $days})
        RETURN 
          count(q) as total,
          sum(CASE WHEN q.status = 'pass' THEN 1 ELSE 0 END) as passed,
          sum(CASE WHEN q.status = 'fail' THEN 1 ELSE 0 END) as failed,
          sum(CASE WHEN q.status = 'pending' THEN 1 ELSE 0 END) as pending,
          q.testType as type,
          count(q.testType) as typeCount
    `;
    // Aggregation logic in Neo4j is slightly different, better to fetch raw and aggregate in JS for complex object structure match
    // Or simplified: fetch all and aggregate.

    const result = await session.run(`
        MATCH (q:QualityTest)
        WHERE q.createdAt >= datetime() - duration({days: $days})
        RETURN q.status as status, q.testType as testType
    `, { days });

    const records = result.records.map(r => ({ status: r.get('status'), testType: r.get('testType') }));
    const totalTests = records.length;
    if (totalTests === 0) return { passRate: 0, failRate: 0, pendingRate: 0, totalTests: 0, byType: [] };

    const passCount = records.filter(t => t.status === 'pass').length;
    const failCount = records.filter(t => t.status === 'fail').length;
    const pendingCount = records.filter(t => t.status === 'pending').length;

    const byTypeMap = new Map();
    records.forEach(r => {
      const type = r.testType || 'other';
      byTypeMap.set(type, (byTypeMap.get(type) || 0) + 1);
    });

    const byType = Array.from(byTypeMap.entries()).map(([type, total]) => ({ type, total }));

    return {
      passRate: (passCount / totalTests) * 100,
      failRate: (failCount / totalTests) * 100,
      pendingRate: (pendingCount / totalTests) * 100,
      totalTests,
      byType
    };
  } finally {
    await session.close();
  }
}

// ============ Employees ============
export async function createEmployee(employee: InsertEmployee) {
  const session = getSession();
  try {
    await session.run(`
      CREATE (e:Employee {
        id: toInteger(timestamp()),
        firstName: $firstName,
        lastName: $lastName,
        employeeNumber: $employeeNumber,
        position: $position,
        department: $department,
        phoneNumber: $phoneNumber,
        email: $email,
        hourlyRate: toInteger($hourlyRate),
        status: $status,
        hireDate: datetime($hireDate),
        createdAt: datetime(),
        updatedAt: datetime()
      })
    `, {
      firstName: employee.firstName,
      lastName: employee.lastName,
      employeeNumber: employee.employeeNumber,
      position: employee.position,
      department: employee.department,
      phoneNumber: employee.phoneNumber || '',
      email: employee.email || '',
      hourlyRate: employee.hourlyRate || 0,
      status: employee.status,
      hireDate: employee.hireDate ? employee.hireDate.toISOString() : null
    });
  } catch (e) {
    console.error("Failed to create employee", e);
    throw e;
  } finally {
    await session.close();
  }
}

export async function getEmployees(filters?: { department?: string; status?: string }) {
  const session = getSession();
  try {
    let query = 'MATCH (e:Employee)';
    let params: any = {};
    let where = [];

    if (filters?.department) {
      where.push('e.department = $department');
      params.department = filters.department;
    }
    if (filters?.status) {
      where.push('e.status = $status');
      params.status = filters.status;
    }

    if (where.length > 0) {
      query += ' WHERE ' + where.join(' AND ');
    }
    query += ' RETURN e ORDER BY e.createdAt DESC';

    const result = await session.run(query, params);
    return result.records.map(r => recordToObj(r, 'e'));
  } finally {
    await session.close();
  }
}

export async function getEmployeeById(id: number) {
  const session = getSession();
  try {
    const result = await session.run('MATCH (e:Employee {id: $id}) RETURN e', { id });
    if (result.records.length === 0) return undefined;
    return recordToObj(result.records[0], 'e');
  } finally {
    await session.close();
  }
}

export async function updateEmployee(id: number, data: Partial<InsertEmployee>) {
  const session = getSession();
  try {
    let sets = [];
    let params: any = { id };

    Object.keys(data).forEach(key => {
      if (key === 'id') return;
      if (key === 'hourlyRate') {
        sets.push(`e.${key} = toInteger($${key})`);
      } else if (data[key] instanceof Date) {
        sets.push(`e.${key} = datetime($${key})`);
        params[key] = data[key].toISOString();
      } else {
        sets.push(`e.${key} = $${key}`);
      }
      if (!(data[key] instanceof Date)) params[key] = data[key];
    });

    sets.push('e.updatedAt = datetime()');
    if (sets.length === 0) return;

    await session.run(`MATCH (e:Employee {id: $id}) SET ${sets.join(', ')}`, params);
  } finally {
    await session.close();
  }
}

export async function deleteEmployee(id: number) {
  const session = getSession();
  try {
    await session.run('MATCH (e:Employee {id: $id}) DETACH DELETE e', { id });
  } finally {
    await session.close();
  }
}

// ============ Work Hours ============
export async function createWorkHour(workHour: InsertWorkHour) {
  const session = getSession();
  try {
    const query = `
      CREATE (w:WorkHour {
        id: toInteger(timestamp()),
        employeeId: $employeeId,
        projectId: $projectId,
        date: datetime($date),
        startTime: datetime($startTime),
        endTime: datetime($endTime),
        hoursWorked: toInteger($hoursWorked),
        overtimeHours: toInteger($overtimeHours),
        workType: $workType,
        notes: $notes,
        status: $status,
        createdAt: datetime(),
        updatedAt: datetime()
      })
      WITH w
      MATCH (e:Employee {id: $employeeId})
      MERGE (e)-[:LOGGED]->(w)
      WITH w
      OPTIONAL MATCH (p:Project {id: $projectId})
      FOREACH (_ IN CASE WHEN p IS NOT NULL THEN [1] ELSE [] END |
        MERGE (w)-[:LOGGED_FOR]->(p)
      )
      RETURN w
    `;

    await session.run(query, {
      employeeId: workHour.employeeId,
      projectId: workHour.projectId || null,
      date: workHour.date.toISOString(),
      startTime: workHour.startTime.toISOString(),
      endTime: workHour.endTime ? workHour.endTime.toISOString() : null,
      hoursWorked: workHour.hoursWorked || 0,
      overtimeHours: workHour.overtimeHours || 0,
      workType: workHour.workType,
      notes: workHour.notes || '',
      status: workHour.status
    });
  } catch (e) {
    console.error("Failed to create work hour", e);
    throw e;
  } finally {
    await session.close();
  }
}

export async function getWorkHours(filters?: { employeeId?: number; projectId?: number; status?: string }) {
  const session = getSession();
  try {
    let query = 'MATCH (w:WorkHour)';
    let params: any = {};
    let where = [];

    if (filters?.employeeId) {
      where.push('w.employeeId = $employeeId');
      params.employeeId = filters.employeeId;
    }
    if (filters?.projectId) {
      where.push('w.projectId = $projectId');
      params.projectId = filters.projectId;
    }
    if (filters?.status) {
      where.push('w.status = $status');
      params.status = filters.status;
    }

    if (where.length > 0) {
      query += ' WHERE ' + where.join(' AND ');
    }

    query += ' RETURN w ORDER BY w.date DESC';

    const result = await session.run(query, params);
    return result.records.map(r => recordToObj(r, 'w'));
  } finally {
    await session.close();
  }
}

export async function updateWorkHour(id: number, data: Partial<InsertWorkHour>) {
  const session = getSession();
  try {
    let sets = [];
    let params: any = { id };

    Object.keys(data).forEach(key => {
      if (key === 'id') return;
      if (['hoursWorked', 'overtimeHours'].includes(key)) {
        sets.push(`w.${key} = toInteger($${key})`);
      } else if (data[key] instanceof Date) {
        sets.push(`w.${key} = datetime($${key})`);
        params[key] = data[key].toISOString();
      } else {
        sets.push(`w.${key} = $${key}`);
      }
      if (!(data[key] instanceof Date)) params[key] = data[key];
    });

    sets.push('w.updatedAt = datetime()');
    if (sets.length === 0) return;

    await session.run(`MATCH (w:WorkHour {id: $id}) SET ${sets.join(', ')}`, params);
  } finally {
    await session.close();
  }
}

// ============ Concrete Bases ============
export async function createConcreteBase(base: InsertConcreteBase) {
  const session = getSession();
  try {
    await session.run(`
      CREATE (c:ConcreteBase {
        id: toInteger(timestamp()),
        name: $name,
        location: $location,
        status: $status,
        capacity: toInteger($capacity),
        isActive: $isActive,
        createdAt: datetime(),
        updatedAt: datetime()
      })
    `, {
      name: base.name,
      location: base.location || '',
      status: base.status || 'active',
      capacity: base.capacity || 0,
      isActive: base.isActive
    });
  } catch (e) {
    console.error("Failed to create concrete base", e);
    throw e;
  } finally {
    await session.close();
  }
}

export async function getConcreteBases() {
  const session = getSession();
  try {
    const result = await session.run('MATCH (c:ConcreteBase) RETURN c ORDER BY c.createdAt DESC');
    return result.records.map(r => recordToObj(r, 'c'));
  } finally {
    await session.close();
  }
}

export async function getConcreteBaseById(id: number) {
  const session = getSession();
  try {
    const result = await session.run('MATCH (c:ConcreteBase {id: $id}) RETURN c', { id });
    if (result.records.length === 0) return undefined;
    return recordToObj(result.records[0], 'c');
  } finally {
    await session.close();
  }
}

export async function updateConcreteBase(id: number, data: Partial<InsertConcreteBase>) {
  const session = getSession();
  try {
    let sets = [];
    let params: any = { id };

    Object.keys(data).forEach(key => {
      if (key === 'id') return;
      if (key === 'capacity') {
        sets.push(`c.${key} = toInteger($${key})`);
      } else {
        sets.push(`c.${key} = $${key}`);
      }
      params[key] = data[key];
    });

    sets.push('c.updatedAt = datetime()');
    if (sets.length === 0) return;

    await session.run(`MATCH (c:ConcreteBase {id: $id}) SET ${sets.join(', ')}`, params);
  } finally {
    await session.close();
  }
}

// ============ Machines ============
export async function createMachine(machine: InsertMachine) {
  const session = getSession();
  try {
    const query = `
      CREATE (m:Machine {
        id: toInteger(timestamp()),
        name: $name,
        machineNumber: $machineNumber,
        type: $type,
        manufacturer: $manufacturer,
        model: $model,
        year: toInteger($year),
        concreteBaseId: $concreteBaseId,
        status: $status,
        totalWorkingHours: toInteger($totalWorkingHours),
        lastMaintenanceDate: datetime($lastMaintenanceDate),
        nextMaintenanceDate: datetime($nextMaintenanceDate),
        createdAt: datetime(),
        updatedAt: datetime()
      })
      WITH m
      OPTIONAL MATCH (c:ConcreteBase {id: $concreteBaseId})
      FOREACH (_ IN CASE WHEN c IS NOT NULL THEN [1] ELSE [] END |
        MERGE (m)-[:LOCATED_AT]->(c)
      )
      RETURN m
    `;

    await session.run(query, {
      name: machine.name,
      machineNumber: machine.machineNumber,
      type: machine.type,
      manufacturer: machine.manufacturer || '',
      model: machine.model || '',
      year: machine.year || 0,
      concreteBaseId: machine.concreteBaseId || null,
      status: machine.status,
      totalWorkingHours: machine.totalWorkingHours || 0,
      lastMaintenanceDate: machine.lastMaintenanceDate ? machine.lastMaintenanceDate.toISOString() : null,
      nextMaintenanceDate: machine.nextMaintenanceDate ? machine.nextMaintenanceDate.toISOString() : null
    });
  } catch (e) {
    console.error("Failed to create machine", e);
    throw e;
  } finally {
    await session.close();
  }
}

export async function getMachines(filters?: { concreteBaseId?: number; type?: string; status?: string }) {
  const session = getSession();
  try {
    let query = 'MATCH (m:Machine)';
    let params: any = {};
    let where = [];

    if (filters?.concreteBaseId) {
      where.push('m.concreteBaseId = $concreteBaseId');
      params.concreteBaseId = filters.concreteBaseId;
    }
    if (filters?.type) {
      where.push('m.type = $type');
      params.type = filters.type;
    }
    if (filters?.status) {
      where.push('m.status = $status');
      params.status = filters.status;
    }

    if (where.length > 0) {
      query += ' WHERE ' + where.join(' AND ');
    }
    query += ' RETURN m ORDER BY m.createdAt DESC';

    const result = await session.run(query, params);
    return result.records.map(r => recordToObj(r, 'm'));
  } finally {
    await session.close();
  }
}

export async function getMachineById(id: number) {
  const session = getSession();
  try {
    const result = await session.run('MATCH (m:Machine {id: $id}) RETURN m', { id });
    if (result.records.length === 0) return undefined;
    return recordToObj(result.records[0], 'm');
  } finally {
    await session.close();
  }
}

export async function updateMachine(id: number, data: Partial<InsertMachine>) {
  const session = getSession();
  try {
    let sets = [];
    let params: any = { id };

    Object.keys(data).forEach(key => {
      if (key === 'id') return;
      if (['year', 'totalWorkingHours'].includes(key)) {
        sets.push(`m.${key} = toInteger($${key})`);
      } else if (data[key] instanceof Date) {
        sets.push(`m.${key} = datetime($${key})`);
        params[key] = data[key].toISOString();
      } else {
        sets.push(`m.${key} = $${key}`);
      }
      if (!(data[key] instanceof Date)) params[key] = data[key];
    });

    sets.push('m.updatedAt = datetime()');
    if (sets.length === 0) return;

    await session.run(`MATCH (m:Machine {id: $id}) SET ${sets.join(', ')}`, params);
  } finally {
    await session.close();
  }
}

export async function deleteMachine(id: number) {
  const session = getSession();
  try {
    await session.run('MATCH (m:Machine {id: $id}) DETACH DELETE m', { id });
  } finally {
    await session.close();
  }
}

// ============ Machine Maintenance ============
export async function createMachineMaintenance(maintenance: InsertMachineMaintenance) {
  const session = getSession();
  try {
    const query = `
      CREATE (mm:MachineMaintenance {
        id: toInteger(timestamp()),
        machineId: $machineId,
        type: $maintenanceType,
        date: datetime($date),
        description: $description,
        cost: toInteger($cost),
        performedBy: $performedBy,
        createdAt: datetime(),
        updatedAt: datetime()
      })
      WITH mm
      MATCH (m:Machine {id: $machineId})
      MERGE (m)-[:UNDERWENT]->(mm)
      RETURN mm
    `;

    await session.run(query, {
      machineId: maintenance.machineId,
      maintenanceType: maintenance.maintenanceType,
      date: maintenance.date ? maintenance.date.toISOString() : null,
      description: maintenance.description || '',
      cost: maintenance.cost || 0,
      performedBy: maintenance.performedBy || ''
    });
  } catch (e) {
    console.error("Failed to create machine maintenance", e);
    throw e;
  } finally {
    await session.close();
  }
}

export async function getMachineMaintenance(filters?: { machineId?: number; maintenanceType?: string }) {
  const session = getSession();
  try {
    let query = 'MATCH (mm:MachineMaintenance)';
    let params: any = {};
    let where = [];

    if (filters?.machineId) {
      where.push('mm.machineId = $machineId');
      params.machineId = filters.machineId;
    }
    if (filters?.maintenanceType) {
      where.push('mm.type = $maintenanceType');
      params.maintenanceType = filters.maintenanceType;
    }

    if (where.length > 0) {
      query += ' WHERE ' + where.join(' AND ');
    }
    query += ' RETURN mm ORDER BY mm.date DESC';

    const result = await session.run(query, params);
    return result.records.map(r => recordToObj(r, 'mm'));
  } finally {
    await session.close();
  }
}

// ============ Machine Work Hours ============
export async function createMachineWorkHour(workHour: InsertMachineWorkHour) {
  const session = getSession();
  try {
    const query = `
      CREATE (mw:MachineWorkHour {
        id: toInteger(timestamp()),
        machineId: $machineId,
        projectId: $projectId,
        date: datetime($date),
        hours: toInteger($hours),
        operatorId: $operatorId,
        notes: $notes,
        createdAt: datetime(),
        updatedAt: datetime()
      })
      WITH mw
      MATCH (m:Machine {id: $machineId})
      MERGE (m)-[:WORKED]->(mw)
      WITH mw
      OPTIONAL MATCH (p:Project {id: $projectId})
      FOREACH (_ IN CASE WHEN p IS NOT NULL THEN [1] ELSE [] END |
        MERGE (mw)-[:WORKED_ON]->(p)
      )
      RETURN mw
    `;

    await session.run(query, {
      machineId: workHour.machineId,
      projectId: workHour.projectId || null,
      date: workHour.date.toISOString(),
      hours: workHour.hours,
      operatorId: workHour.operatorId || null,
      notes: workHour.notes || ''
    });
  } catch (e) {
    console.error("Failed to create machine work hour", e);
    throw e;
  } finally {
    await session.close();
  }
}

export async function getMachineWorkHours(filters?: { machineId?: number; projectId?: number }) {
  const session = getSession();
  try {
    let query = 'MATCH (mw:MachineWorkHour)';
    let params: any = {};
    let where = [];

    if (filters?.machineId) {
      where.push('mw.machineId = $machineId');
      params.machineId = filters.machineId;
    }
    if (filters?.projectId) {
      where.push('mw.projectId = $projectId');
      params.projectId = filters.projectId;
    }

    if (where.length > 0) {
      query += ' WHERE ' + where.join(' AND ');
    }
    query += ' RETURN mw ORDER BY mw.date DESC';

    const result = await session.run(query, params);
    return result.records.map(r => recordToObj(r, 'mw'));
  } finally {
    await session.close();
  }
}

// ============ Aggregate Inputs ============
export async function createAggregateInput(input: InsertAggregateInput) {
  const session = getSession();
  try {
    const query = `
      CREATE (ai:AggregateInput {
        id: toInteger(timestamp()),
        concreteBaseId: $concreteBaseId,
        materialType: $materialType,
        quantity: toInteger($quantity),
        source: $source,
        date: datetime($date),
        createdAt: datetime(),
        updatedAt: datetime()
      })
      WITH ai
      MATCH (c:ConcreteBase {id: $concreteBaseId})
      MERGE (c)-[:USED_INPUT]->(ai)
      RETURN ai
    `;

    await session.run(query, {
      concreteBaseId: input.concreteBaseId,
      materialType: input.materialType,
      quantity: input.quantity || 0,
      source: input.source || '',
      date: input.date.toISOString()
    });
  } catch (e) {
    console.error("Failed to create aggregate input", e);
    throw e;
  } finally {
    await session.close();
  }
}

export async function getAggregateInputs(filters?: { concreteBaseId?: number; materialType?: string }) {
  const session = getSession();
  try {
    let query = 'MATCH (ai:AggregateInput)';
    let params: any = {};
    let where = [];

    if (filters?.concreteBaseId) {
      where.push('ai.concreteBaseId = $concreteBaseId');
      params.concreteBaseId = filters.concreteBaseId;
    }
    if (filters?.materialType) {
      where.push('ai.materialType = $materialType');
      params.materialType = filters.materialType;
    }

    if (where.length > 0) {
      query += ' WHERE ' + where.join(' AND ');
    }
    query += ' RETURN ai ORDER BY ai.date DESC';

    const result = await session.run(query, params);
    return result.records.map(r => recordToObj(r, 'ai'));
  } finally {
    await session.close();
  }
}

export async function getWeeklyTimesheetSummary(employeeId: number | undefined, weekStart: Date) {
  const session = getSession();
  try {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    // Filter by employeeId if provided
    let match = 'MATCH (e:Employee)-[:LOGGED]->(w:WorkHour)';
    let where = 'WHERE w.date >= datetime($weekStart) AND w.date < datetime($weekEnd) AND w.status = "approved"';
    let params: any = { weekStart: weekStart.toISOString(), weekEnd: weekEnd.toISOString() };

    if (employeeId) {
      where += ' AND e.id = $employeeId';
      params.employeeId = employeeId;
    }

    const query = `
      ${match}
      ${where}
      RETURN
        e.id as employeeId,
        e.firstName + ' ' + e.lastName as employeeName,
        e.employeeNumber as employeeNumber,
        sum(w.hoursWorked) as totalHours,
        sum(CASE WHEN w.workType = 'regular' THEN w.hoursWorked ELSE 0 END) as regularHours,
        sum(w.overtimeHours) as overtimeHours,
        sum(CASE WHEN w.workType = 'weekend' THEN w.hoursWorked ELSE 0 END) as weekendHours,
        sum(CASE WHEN w.workType = 'holiday' THEN w.hoursWorked ELSE 0 END) as holidayHours,
        count(DISTINCT date(w.date)) as daysWorked
    `;

    const result = await session.run(query, params);

    return result.records.map(r => ({
      employeeId: r.get('employeeId').toNumber(), // Neo4j Integer to JS number
      employeeName: r.get('employeeName'),
      employeeNumber: r.get('employeeNumber'),
      totalHours: r.get('totalHours').toNumber(),
      regularHours: r.get('regularHours').toNumber(),
      overtimeHours: r.get('overtimeHours').toNumber(),
      weekendHours: r.get('weekendHours').toNumber(),
      holidayHours: r.get('holidayHours').toNumber(),
      daysWorked: r.get('daysWorked').toNumber()
    }));
  } finally {
    await session.close();
  }
}

export async function getMonthlyTimesheetSummary(employeeId: number | undefined, year: number, month: number) {
  const session = getSession();
  try {
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 1);

    let match = 'MATCH (e:Employee)-[:LOGGED]->(w:WorkHour)';
    let where = 'WHERE w.date >= datetime($monthStart) AND w.date < datetime($monthEnd) AND w.status = "approved"';
    let params: any = { monthStart: monthStart.toISOString(), monthEnd: monthEnd.toISOString() };

    if (employeeId) {
      where += ' AND e.id = $employeeId';
      params.employeeId = employeeId;
    }

    const query = `
      ${match}
      ${where}
      RETURN
        e.id as employeeId,
        e.firstName + ' ' + e.lastName as employeeName,
        e.employeeNumber as employeeNumber,
        e.department as department,
        e.hourlyRate as hourlyRate,
        sum(w.hoursWorked) as totalHours,
        sum(CASE WHEN w.workType = 'regular' THEN w.hoursWorked ELSE 0 END) as regularHours,
        sum(w.overtimeHours) as overtimeHours,
        sum(CASE WHEN w.workType = 'weekend' THEN w.hoursWorked ELSE 0 END) as weekendHours,
        sum(CASE WHEN w.workType = 'holiday' THEN w.hoursWorked ELSE 0 END) as holidayHours,
        count(DISTINCT date(w.date)) as daysWorked
    `;

    const result = await session.run(query, params);

    return result.records.map(r => ({
      employeeId: r.get('employeeId').toNumber(),
      employeeName: r.get('employeeName'),
      employeeNumber: r.get('employeeNumber'),
      department: r.get('department'),
      hourlyRate: r.get('hourlyRate').toNumber(),
      totalHours: r.get('totalHours').toNumber(),
      regularHours: r.get('regularHours').toNumber(),
      overtimeHours: r.get('overtimeHours').toNumber(),
      weekendHours: r.get('weekendHours').toNumber(),
      holidayHours: r.get('holidayHours').toNumber(),
      daysWorked: r.get('daysWorked').toNumber()
    }));
  } finally {
    await session.close();
  }
}

export async function getLowStockMaterials() {
  const session = getSession();
  try {
    const result = await session.run('MATCH (m:Material) WHERE m.quantity <= m.minStock RETURN m');
    return result.records.map(r => recordToObj(r, 'm'));
  } finally {
    await session.close();
  }
}


export async function getCriticalStockMaterials() {
  const session = getSession();
  try {
    // Check if criticalThreshold exists and > 0 (Neo4j properties might be missing if null, but we set them to 0 default in create)
    const result = await session.run('MATCH (m:Material) WHERE m.quantity <= m.criticalThreshold AND m.criticalThreshold > 0 RETURN m');
    return result.records.map(r => recordToObj(r, 'm'));
  } finally {
    await session.close();
  }
}

export async function getAdminUsersWithSMS() {
  const session = getSession();
  try {
    const result = await session.run("MATCH (u:User {role: 'admin', smsNotificationsEnabled: true}) WHERE u.phoneNumber IS NOT NULL RETURN u");
    return result.records.map(r => recordToObj(r, 'u'));
  } finally {
    await session.close();
  }
}

export async function updateUserSMSSettings(userId: number, phoneNumber: string, enabled: boolean) {
  const session = getSession();
  try {
    await session.run(`
      MATCH (u:User {id: $id})
      SET u.phoneNumber = $phoneNumber,
          u.smsNotificationsEnabled = $enabled,
          u.updatedAt = datetime()
    `, { id: userId, phoneNumber, enabled });
    return true;
  } catch (error) {
    console.error("Failed to update SMS settings:", error);
    return false;
  } finally {
    await session.close();
  }
}


// Material Consumption Tracking
export async function recordConsumption(consumption: InsertMaterialConsumptionLog) {
  const session = getSession();
  try {
    const query = `
      CREATE (l:MaterialConsumptionLog {
        id: toInteger(timestamp()),
        materialId: $materialId,
        quantity: toInteger($quantity),
        reason: $reason,
        projectId: $projectId,
        consumptionDate: datetime($consumptionDate),
        recordedBy: $recordedBy,
        createdAt: datetime(),
        updatedAt: datetime()
      })
      WITH l
      MATCH (m:Material {id: $materialId})
      MERGE (m)-[:CONSUMED]->(l)
      WITH l, m
      SET m.quantity = CASE WHEN m.quantity - l.quantity < 0 THEN 0 ELSE m.quantity - l.quantity END,
          m.updatedAt = datetime()
      WITH l
      OPTIONAL MATCH (p:Project {id: $projectId})
      FOREACH (_ IN CASE WHEN p IS NOT NULL THEN [1] ELSE [] END |
        MERGE (l)-[:USED_FOR]->(p)
      )
    `;

    await session.run(query, {
      materialId: consumption.materialId,
      quantity: consumption.quantity,
      reason: consumption.reason || '',
      projectId: consumption.projectId || null,
      consumptionDate: consumption.consumptionDate.toISOString(),
      recordedBy: consumption.recordedBy || null
    });
  } catch (e) {
    console.error("Failed to record consumption", e);
    throw e;
  } finally {
    await session.close();
  }
}

export async function getConsumptionHistory(materialId?: number, days: number = 30) {
  const session = getSession();
  try {
    let query = `
      MATCH (l:MaterialConsumptionLog)
      WHERE l.consumptionDate >= datetime() - duration({days: $days})
    `;
    let params: any = { days };

    if (materialId) {
      query += ' AND l.materialId = $materialId';
      params.materialId = materialId;
    }

    query += ' RETURN l ORDER BY l.consumptionDate DESC';

    const result = await session.run(query, params);
    return result.records.map(r => recordToObj(r, 'l'));
  } finally {
    await session.close();
  }
}

export async function calculateDailyConsumptionRate(materialId: number, days: number = 30) {
  const session = getSession();
  try {
    const result = await session.run(`
      MATCH (l:MaterialConsumptionLog)
      WHERE l.materialId = $materialId AND l.consumptionDate >= datetime() - duration({days: $days})
      RETURN 
        sum(l.quantity) as totalConsumed,
        count(DISTINCT date(l.consumptionDate)) as uniqueDays
    `, { materialId, days });

    if (result.records.length === 0) return 0;

    const record = result.records[0];
    const total = record.get('totalConsumed').toNumber();
    const uniqueDays = record.get('uniqueDays').toNumber();

    return uniqueDays > 0 ? total / uniqueDays : 0;
  } finally {
    await session.close();
  }
}

// Forecasting & Predictions
export async function generateForecastPredictions() {
  const session = getSession();
  try {
    const allMaterials = await getMaterials();
    const predictions: any[] = [];

    // Clear old predictions
    await session.run('MATCH (fp:ForecastPrediction) DETACH DELETE fp');

    for (const material of allMaterials) {
      const dailyRate = await calculateDailyConsumptionRate(material.id, 30);

      if (dailyRate > 0) {
        const daysUntilStockout = Math.floor(material.quantity / dailyRate);
        const predictedRunoutDate = new Date();
        predictedRunoutDate.setDate(predictedRunoutDate.getDate() + daysUntilStockout);
        const recommendedOrderQty = Math.ceil(dailyRate * 14 * 1.2);

        // Confidence calculation (simplified)
        const history = await getConsumptionHistory(material.id, 30);
        const confidence = Math.min(95, history.length * 3);

        const prediction = {
          materialId: material.id,
          materialName: material.name,
          currentStock: material.quantity,
          dailyConsumptionRate: Math.round(dailyRate),
          predictedRunoutDate: predictedRunoutDate.toISOString(),
          daysUntilStockout,
          recommendedOrderQty,
          confidence,
          calculatedAt: new Date().toISOString()
        };
        predictions.push(prediction);

        await session.run(`
          CREATE (fp:ForecastPrediction {
            id: toInteger(timestamp()),
            materialId: $materialId,
            materialName: $materialName,
            currentStock: toInteger($currentStock),
            dailyConsumptionRate: toInteger($dailyConsumptionRate),
            predictedRunoutDate: datetime($predictedRunoutDate),
            daysUntilStockout: toInteger($daysUntilStockout),
            recommendedOrderQty: toInteger($recommendedOrderQty),
            confidence: toInteger($confidence),
            calculatedAt: datetime($calculatedAt)
          })
          WITH fp
          MATCH (m:Material {id: $materialId})
          MERGE (m)-[:HAS_PREDICTION]->(fp)
        `, prediction);
      }
    }
    return predictions;
  } finally {
    await session.close();
  }
}

export async function getForecastPredictions() {
  const session = getSession();
  try {
    const result = await session.run('MATCH (fp:ForecastPrediction) RETURN fp ORDER BY fp.daysUntilStockout');
    return result.records.map(r => recordToObj(r, 'fp'));
  } finally {
    await session.close();
  }
}

// Purchase Orders
export async function createPurchaseOrder(order: InsertPurchaseOrder) {
  const session = getSession();
  try {
    const query = `
      CREATE (po:PurchaseOrder {
        id: toInteger(timestamp()),
        materialId: $materialId,
        quantity: toInteger($quantity),
        orderDate: datetime($orderDate),
        expectedDeliveryDate: datetime($expectedDeliveryDate),
        status: $status,
        supplier: $supplier,
        notes: $notes,
        createdAt: datetime(),
        updatedAt: datetime()
      })
      WITH po
      MATCH (m:Material {id: $materialId})
      MERGE (po)-[:FOR_MATERIAL]->(m)
      RETURN po
    `;

    await session.run(query, {
      materialId: order.materialId,
      quantity: order.quantity,
      orderDate: order.orderDate.toISOString(),
      expectedDeliveryDate: order.expectedDeliveryDate ? order.expectedDeliveryDate.toISOString() : null,
      status: order.status || 'pending',
      supplier: order.supplier || '',
      notes: order.notes || ''
    });
  } catch (e) {
    console.error("Failed to create purchase order", e);
    throw e;
  } finally {
    await session.close();
  }
}

export async function getPurchaseOrders(filters?: { status?: string; materialId?: number }) {
  const session = getSession();
  try {
    let query = 'MATCH (po:PurchaseOrder)';
    let params: any = {};
    let where = [];

    if (filters?.status) {
      where.push('po.status = $status');
      params.status = filters.status;
    }
    if (filters?.materialId) {
      where.push('po.materialId = $materialId');
      params.materialId = filters.materialId;
    }

    if (where.length > 0) {
      query += ' WHERE ' + where.join(' AND ');
    }
    query += ' RETURN po ORDER BY po.createdAt DESC';

    const result = await session.run(query, params);
    return result.records.map(r => recordToObj(r, 'po'));
  } finally {
    await session.close();
  }
}

export async function updatePurchaseOrder(id: number, data: Partial<InsertPurchaseOrder>) {
  const session = getSession();
  try {
    let sets = [];
    let params: any = { id };

    Object.keys(data).forEach(key => {
      if (key === 'id') return;
      if (key === 'quantity') {
        sets.push(`po.${key} = toInteger($${key})`);
      } else if (data[key] instanceof Date) {
        sets.push(`po.${key} = datetime($${key})`);
        params[key] = data[key].toISOString();
      } else {
        sets.push(`po.${key} = $${key}`);
      }
      if (!(data[key] instanceof Date)) params[key] = data[key];
    });

    sets.push('po.updatedAt = datetime()');
    if (sets.length === 0) return;

    await session.run(`MATCH (po:PurchaseOrder {id: $id}) SET ${sets.join(', ')}`, params);
  } finally {
    await session.close();
  }
}


// Report Settings
export async function getReportSettings(userId: number) {
  const session = getSession();
  try {
    const result = await session.run('MATCH (u:User {id: $userId})-[:HAS_SETTINGS]->(rs:ReportSettings) RETURN rs', { userId });
    if (result.records.length === 0) return null;
    return recordToObj(result.records[0], 'rs');
  } finally {
    await session.close();
  }
}

export async function upsertReportSettings(data: {
  userId: number;
  includeProduction?: boolean;
  includeDeliveries?: boolean;
  includeMaterials?: boolean;
  includeQualityControl?: boolean;
  reportTime?: string;
}) {
  const session = getSession();
  try {
    const query = `
      MATCH (u:User {id: $userId})
      MERGE (u)-[:HAS_SETTINGS]->(rs:ReportSettings)
      ON CREATE SET
        rs.id = toInteger(timestamp()),
        rs.userId = $userId,
        rs.includeProduction = $includeProduction,
        rs.includeDeliveries = $includeDeliveries,
        rs.includeMaterials = $includeMaterials,
        rs.includeQualityControl = $includeQualityControl,
        rs.reportTime = $reportTime,
        rs.createdAt = datetime(),
        rs.updatedAt = datetime()
      ON MATCH SET
        rs.includeProduction = COALESCE($includeProduction, rs.includeProduction),
        rs.includeDeliveries = COALESCE($includeDeliveries, rs.includeDeliveries),
        rs.includeMaterials = COALESCE($includeMaterials, rs.includeMaterials),
        rs.includeQualityControl = COALESCE($includeQualityControl, rs.includeQualityControl),
        rs.reportTime = COALESCE($reportTime, rs.reportTime),
        rs.updatedAt = datetime()
      RETURN rs.id as id
    `;

    const result = await session.run(query, {
      userId: data.userId,
      includeProduction: data.includeProduction !== undefined ? data.includeProduction : true,
      includeDeliveries: data.includeDeliveries !== undefined ? data.includeDeliveries : true,
      includeMaterials: data.includeMaterials !== undefined ? data.includeMaterials : true,
      includeQualityControl: data.includeQualityControl !== undefined ? data.includeQualityControl : true,
      reportTime: data.reportTime || '18:00'
    });

    return result.records[0]?.get('id').toNumber() || 0;
  } finally {
    await session.close();
  }
}

// Report Recipients
export async function getReportRecipients() {
  const session = getSession();
  try {
    const result = await session.run('MATCH (r:ReportRecipient) WHERE r.active = true RETURN r');
    return result.records.map(r => recordToObj(r, 'r'));
  } finally {
    await session.close();
  }
}

export async function getAllReportRecipients() {
  const session = getSession();
  try {
    const result = await session.run('MATCH (r:ReportRecipient) RETURN r ORDER BY r.createdAt DESC');
    return result.records.map(r => recordToObj(r, 'r'));
  } finally {
    await session.close();
  }
}

export async function addReportRecipient(email: string, name?: string) {
  const session = getSession();
  try {
    await session.run(`
      CREATE (r:ReportRecipient {
        id: toInteger(timestamp()),
        email: $email,
        name: $name,
        active: true,
        createdAt: datetime(),
        updatedAt: datetime()
      })
    `, { email, name: name || '' });
    return 0;
  } finally {
    await session.close();
  }
}

export async function removeReportRecipient(id: number) {
  const session = getSession();
  try {
    await session.run('MATCH (r:ReportRecipient {id: $id}) SET r.active = false, r.updatedAt = datetime()', { id });
  } finally {
    await session.close();
  }
}


// Email Templates
export async function getEmailTemplates() {
  const session = getSession();
  try {
    const result = await session.run('MATCH (et:EmailTemplate {isActive: true}) RETURN et');
    return result.records.map(r => recordToObj(r, 'et'));
  } finally {
    await session.close();
  }
}

export async function getEmailTemplateByType(type: string) {
  const session = getSession();
  try {
    const result = await session.run('MATCH (et:EmailTemplate {type: $type}) RETURN et', { type });
    if (result.records.length === 0) return null;
    return recordToObj(result.records[0], 'et');
  } finally {
    await session.close();
  }
}

export async function upsertEmailTemplate(data: {
  name: string;
  type: string;
  subject: string;
  htmlTemplate: string;
  variables?: string;
}) {
  const session = getSession();
  try {
    const query = `
      MERGE (et:EmailTemplate {type: $type})
      ON CREATE SET
        et.id = toInteger(timestamp()),
        et.name = $name,
        et.subject = $subject,
        et.htmlTemplate = $htmlTemplate,
        et.variables = $variables,
        et.isActive = true,
        et.createdAt = datetime(),
        et.updatedAt = datetime()
      ON MATCH SET
        et.name = $name,
        et.subject = $subject,
        et.htmlTemplate = $htmlTemplate,
        et.variables = $variables,
        et.updatedAt = datetime()
      RETURN et.id as id
    `;

    const result = await session.run(query, {
      name: data.name,
      type: data.type,
      subject: data.subject,
      htmlTemplate: data.htmlTemplate,
      variables: data.variables || ''
    });
    return result.records[0]?.get('id').toNumber() || 0;
  } finally {
    await session.close();
  }
}

// Email Branding
export async function getEmailBranding() {
  const session = getSession();
  try {
    const result = await session.run('MATCH (eb:EmailBranding) RETURN eb LIMIT 1');
    if (result.records.length === 0) return null;
    return recordToObj(result.records[0], 'eb');
  } finally {
    await session.close();
  }
}

export async function upsertEmailBranding(data: {
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  companyName?: string;
  footerText?: string;
}) {
  const session = getSession();
  try {
    const query = `
      MERGE (eb:EmailBranding {id: 1})
      ON CREATE SET
        eb.logoUrl = $logoUrl,
        eb.primaryColor = $primaryColor,
        eb.secondaryColor = $secondaryColor,
        eb.companyName = $companyName,
        eb.footerText = $footerText,
        eb.createdAt = datetime(),
        eb.updatedAt = datetime()
      ON MATCH SET
        eb.logoUrl = COALESCE($logoUrl, eb.logoUrl),
        eb.primaryColor = COALESCE($primaryColor, eb.primaryColor),
        eb.secondaryColor = COALESCE($secondaryColor, eb.secondaryColor),
        eb.companyName = COALESCE($companyName, eb.companyName),
        eb.footerText = COALESCE($footerText, eb.footerText),
        eb.updatedAt = datetime()
      RETURN eb.id as id
    `;

    const result = await session.run(query, {
      logoUrl: data.logoUrl || null,
      primaryColor: data.primaryColor || "#f97316",
      secondaryColor: data.secondaryColor || "#ea580c",
      companyName: data.companyName || "AzVirt",
      footerText: data.footerText || null
    });

    return result.records[0]?.get('id').toNumber() || 0;
  } finally {
    await session.close();
  }
}


// ============ AI Conversations ============
export async function createConversation(userId: number, title: string, modelName: string) {
  return createAiConversation({ userId, title, modelName });
}

export async function getConversations(userId: number) {
  return getAiConversations(userId);
}

export async function getConversation(id: number) {
  const session = getSession();
  try {
    const result = await session.run('MATCH (c:AiConversation {id: $id}) RETURN c', { id });
    if (result.records.length === 0) return undefined;

    // Map record to match expected interface
    const conv = recordToObj(result.records[0], 'c');
    return conv;
  } finally {
    await session.close();
  }
}

export async function updateConversationTitle(id: number, title: string) {
  const session = getSession();
  try {
    await session.run(`
      MATCH (c:AiConversation {id: $id}) 
      SET c.title = $title, c.updatedAt = datetime()
    `, { id, title });
  } finally {
    await session.close();
  }
}

export async function addMessage(
  conversationId: number,
  role: 'user' | 'assistant' | 'system',
  content: string,
  metadata?: any
) {
  const metaString = metadata ? JSON.stringify(metadata) : undefined;
  return createAiMessage({
    conversationId,
    role,
    content,
    metadata: metaString
  });
}

export async function getMessages(conversationId: number) {
  return getAiMessages(conversationId);
}

export async function getAvailableModels() {
  const session = getSession();
  try {
    const result = await session.run(`
      MATCH (m:AiModel {isAvailable: true}) 
      RETURN m 
      ORDER BY m.name
    `);
    return result.records.map(r => recordToObj(r, 'm'));
  } finally {
    await session.close();
  }
}

export async function upsertModel(name: string, displayName: string, type: "text" | "vision" | "code", size?: string) {
  const session = getSession();
  try {
    await session.run(`
      MERGE (m:AiModel {name: $name})
      ON CREATE SET
        m.id = toInteger(timestamp()),
        m.displayName = $displayName,
        m.type = $type,
        m.size = $size,
        m.isAvailable = true,
        m.lastUsed = datetime(),
        m.createdAt = datetime(),
        m.updatedAt = datetime()
      ON MATCH SET
        m.isAvailable = true,
        m.lastUsed = datetime(),
        m.updatedAt = datetime()
    `, { name, displayName, type, size: size || null });
  } finally {
    await session.close();
  }
}

export async function createAiConversation(data: { userId: number; title?: string; modelName?: string }) {
  const session = getSession();
  try {
    const query = `
      CREATE (c:AiConversation {
        id: toInteger(timestamp()),
        userId: $userId,
        title: $title,
        modelName: $modelName,
        createdAt: datetime(),
        updatedAt: datetime()
      })
      WITH c
      MATCH (u:User {id: $userId})
      MERGE (u)-[:HAS_CONVERSATION]->(c)
      RETURN c.id as id
    `;

    const result = await session.run(query, {
      userId: data.userId,
      title: data.title || "New Conversation",
      modelName: data.modelName || null
    });

    return result.records[0]?.get('id').toNumber();
  } finally {
    await session.close();
  }
}

export async function getAiConversations(userId: number) {
  const session = getSession();
  try {
    const result = await session.run(`
      MATCH (c:AiConversation {userId: $userId})
      RETURN c
      ORDER BY c.updatedAt DESC
    `, { userId }); // Using property directly for simplicity, though relationship check is better
    return result.records.map(r => recordToObj(r, 'c'));
  } finally {
    await session.close();
  }
}

export async function deleteAiConversation(conversationId: number) {
  const session = getSession();
  try {
    // Delete conversation and its messages
    await session.run(`
      MATCH (c:AiConversation {id: $conversationId})
      OPTIONAL MATCH (c)-[:HAS_MESSAGE]->(m:AiMessage)
      DETACH DELETE c, m
    `, { conversationId });
  } finally {
    await session.close();
  }
}

export async function createAiMessage(data: {
  conversationId: number;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  model?: string;
  audioUrl?: string;
  imageUrl?: string;
  thinkingProcess?: string;
  toolCalls?: string;
  metadata?: string;
}) {
  const session = getSession();
  try {
    const query = `
      MATCH (c:AiConversation {id: $conversationId})
      CREATE (m:AiMessage {
        id: toInteger(timestamp()),
        conversationId: $conversationId,
        role: $role,
        content: $content,
        model: $model,
        audioUrl: $audioUrl,
        imageUrl: $imageUrl,
        thinkingProcess: $thinkingProcess,
        toolCalls: $toolCalls,
        metadata: $metadata,
        createdAt: datetime(),
        updatedAt: datetime()
      })
      MERGE (c)-[:HAS_MESSAGE]->(m)
      SET c.updatedAt = datetime()
      RETURN m.id as id
    `;

    const result = await session.run(query, {
      conversationId: data.conversationId,
      role: data.role,
      content: data.content,
      model: data.model || null,
      audioUrl: data.audioUrl || null,
      imageUrl: data.imageUrl || null,
      thinkingProcess: data.thinkingProcess || null,
      toolCalls: data.toolCalls || null,
      metadata: data.metadata || null
    });

    return result.records[0]?.get('id').toNumber();
  } finally {
    await session.close();
  }
}

export async function getAiMessages(conversationId: number) {
  const session = getSession();
  try {
    const result = await session.run(`
      MATCH (c:AiConversation {id: $conversationId})-[:HAS_MESSAGE]->(m:AiMessage)
      RETURN m
      ORDER BY m.createdAt ASC
    `, { conversationId });
    return result.records.map(r => recordToObj(r, 'm'));
  } finally {
    await session.close();
  }
}


// ==================== DAILY TASKS ====================

export async function createTask(task: any) {
  const session = getSession();
  try {
    const query = `
      CREATE (t:DailyTask {
        id: toInteger(timestamp()),
        userId: $userId,
        title: $title,
        description: $description,
        status: $status,
        priority: $priority,
        dueDate: datetime($dueDate),
        createdAt: datetime(),
        updatedAt: datetime()
      })
      WITH t
      MATCH (u:User {id: $userId})
      MERGE (u)-[:CREATED_TASK]->(t)
      RETURN t.id as id
    `;

    const result = await session.run(query, {
      userId: task.userId,
      title: task.title,
      description: task.description || null,
      status: task.status || 'pending',
      priority: task.priority || 'medium',
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString() : null
    });

    return result.records[0]?.get('id').toNumber();
  } catch (e) {
    console.error("Failed to create task", e);
    throw e;
  } finally {
    await session.close();
  }
}

export async function getTasks(userId: number) {
  const session = getSession();
  try {
    const result = await session.run(`
      MATCH (t:DailyTask {userId: $userId}) 
      RETURN t 
      ORDER BY t.dueDate DESC
    `, { userId });
    return result.records.map(r => recordToObj(r, 't'));
  } finally {
    await session.close();
  }
}

export async function getTaskById(taskId: number) {
  const session = getSession();
  try {
    const result = await session.run('MATCH (t:DailyTask {id: $taskId}) RETURN t', { taskId });
    if (result.records.length === 0) return undefined;
    return recordToObj(result.records[0], 't');
  } finally {
    await session.close();
  }
}

export async function updateTask(taskId: number, updates: any) {
  const session = getSession();
  try {
    let sets = [];
    let params: any = { taskId };

    Object.keys(updates).forEach(key => {
      if (key === 'id' || key === 'userId') return;
      if (key === 'dueDate') {
        sets.push(`t.${key} = datetime($${key})`);
        params[key] = new Date(updates[key]).toISOString();
      } else {
        sets.push(`t.${key} = $${key}`);
        params[key] = updates[key];
      }
    });

    sets.push('t.updatedAt = datetime()');
    if (sets.length === 0) return;

    await session.run(`MATCH (t:DailyTask {id: $taskId}) SET ${sets.join(', ')}`, params);
  } finally {
    await session.close();
  }
}

export async function deleteTask(taskId: number) {
  const session = getSession();
  try {
    await session.run('MATCH (t:DailyTask {id: $taskId}) DETACH DELETE t', { taskId });
  } finally {
    await session.close();
  }
}

export async function getTasksByStatus(userId: number, status: string) {
  const session = getSession();
  try {
    const result = await session.run(`
      MATCH (t:DailyTask {userId: $userId, status: $status})
      RETURN t 
      ORDER BY t.dueDate DESC
    `, { userId, status });
    return result.records.map(r => recordToObj(r, 't'));
  } finally {
    await session.close();
  }
}

export async function getTasksByPriority(userId: number, priority: string) {
  const session = getSession();
  try {
    const result = await session.run(`
      MATCH (t:DailyTask {userId: $userId, priority: $priority})
      RETURN t 
      ORDER BY t.dueDate DESC
    `, { userId, priority });
    return result.records.map(r => recordToObj(r, 't'));
  } finally {
    await session.close();
  }
}

export async function getOverdueTasks(userId: number) {
  const session = getSession();
  try {
    const result = await session.run(`
      MATCH (t:DailyTask {userId: $userId})
      WHERE t.dueDate < datetime() AND t.status <> 'completed'
      RETURN t 
      ORDER BY t.dueDate
    `, { userId });
    return result.records.map(r => recordToObj(r, 't'));
  } finally {
    await session.close();
  }
}

export async function getTodaysTasks(userId: number) {
  const session = getSession();
  try {
    // Cypher doesn't have easy "today" range functions without external params usually, 
    // but we can pass string dates.
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const result = await session.run(`
      MATCH (t:DailyTask {userId: $userId})
      WHERE t.dueDate >= datetime($today) AND t.dueDate < datetime($tomorrow)
      RETURN t 
      ORDER BY t.dueDate
    `, { userId, today: today.toISOString(), tomorrow: tomorrow.toISOString() });
    return result.records.map(r => recordToObj(r, 't'));
  } finally {
    await session.close();
  }
}

// ==================== TASK ASSIGNMENTS ====================

export async function assignTask(assignment: any) {
  const session = getSession();
  try {
    const query = `
      MATCH (t:DailyTask {id: $taskId})
      MATCH (u:User {id: $assignedTo})
      CREATE (a:TaskAssignment {
        id: toInteger(timestamp()),
        taskId: $taskId,
        assignedTo: $assignedTo,
        assignedAt: datetime(),
        status: 'active'
      })
      MERGE (t)-[:HAS_ASSIGNMENT]->(a)
      MERGE (a)-[:ASSIGNED_TO]->(u)
      RETURN a.id as id
    `;

    const result = await session.run(query, {
      taskId: assignment.taskId,
      assignedTo: assignment.assignedTo
    });
    return result.records[0]?.get('id').toNumber();
  } finally {
    await session.close();
  }
}

export async function getTaskAssignments(taskId: number) {
  const session = getSession();
  try {
    const result = await session.run(`
      MATCH (t:DailyTask {id: $taskId})-[:HAS_ASSIGNMENT]->(a:TaskAssignment)
      RETURN a
    `, { taskId });
    return result.records.map(r => recordToObj(r, 'a'));
  } finally {
    await session.close();
  }
}

export async function updateTaskAssignment(assignmentId: number, updates: any) {
  const session = getSession();
  try {
    let sets: string[] = [];
    let params: any = { assignmentId };

    Object.keys(updates).forEach(key => {
      if (key === 'id') return;
      sets.push(`a.${key} = $${key}`);
      params[key] = updates[key];
    });

    if (sets.length === 0) return;

    await session.run(`MATCH (a:TaskAssignment {id: $assignmentId}) SET ${sets.join(', ')}`, params);
  } finally {
    await session.close();
  }
}

export async function getAssignmentsForUser(userId: number) {
  const session = getSession();
  try {
    const result = await session.run(`
      MATCH (u:User {id: $userId})<-[:ASSIGNED_TO]-(a:TaskAssignment)
      RETURN a 
      ORDER BY a.assignedAt DESC
    `, { userId });
    return result.records.map(r => recordToObj(r, 'a'));
  } finally {
    await session.close();
  }
}

// ==================== TASK STATUS HISTORY ====================

export async function recordTaskStatusChange(history: any) {
  const session = getSession();
  try {
    await session.run(`
      CREATE (h:TaskStatusHistory {
        id: toInteger(timestamp()),
        taskId: $taskId,
        oldStatus: $oldStatus,
        newStatus: $newStatus,
        changedBy: $changedBy,
        createdAt: datetime()
      })
      WITH h
      MATCH (t:DailyTask {id: $taskId})
      MERGE (t)-[:HAS_HISTORY]->(h)
    `, {
      taskId: history.taskId,
      oldStatus: history.oldStatus,
      newStatus: history.newStatus,
      changedBy: history.changedBy
    });
  } finally {
    await session.close();
  }
}

export async function getTaskHistory(taskId: number) {
  const session = getSession();
  try {
    const result = await session.run(`
      MATCH (t:DailyTask {id: $taskId})-[:HAS_HISTORY]->(h:TaskStatusHistory)
      RETURN h 
      ORDER BY h.createdAt DESC
    `, { taskId });
    return result.records.map(r => recordToObj(r, 'h'));
  } finally {
    await session.close();
  }
}


// ==================== TASK NOTIFICATIONS ====================

export async function createNotification(notification: any) {
  const session = getSession();
  try {
    const query = `
      CREATE (n:TaskNotification {
        id: toInteger(timestamp()),
        userId: $userId,
        title: $title,
        message: $message,
        type: $type,
        status: $status,
        priority: $priority,
        link: $link,
        readAt: null,
        scheduledFor: datetime($scheduledFor),
        sentAt: null,
        createdAt: datetime(),
        updatedAt: datetime()
      })
      WITH n
      MATCH (u:User {id: $userId})
      MERGE (u)-[:HAS_NOTIFICATION]->(n)
      RETURN n.id as id
    `;

    const result = await session.run(query, {
      userId: notification.userId,
      title: notification.title,
      message: notification.message,
      type: notification.type || 'info',
      status: notification.status || 'pending',
      priority: notification.priority || 'medium',
      link: notification.link || null,
      scheduledFor: notification.scheduledFor ? new Date(notification.scheduledFor).toISOString() : new Date().toISOString()
    });

    return result.records[0]?.get('id').toNumber();
  } finally {
    await session.close();
  }
}

export async function getNotifications(userId: number, limit: number = 50) {
  const session = getSession();
  try {
    const result = await session.run(`
      MATCH (n:TaskNotification {userId: $userId})
      RETURN n 
      ORDER BY n.createdAt DESC
      LIMIT toInteger($limit)
    `, { userId, limit });
    return result.records.map(r => recordToObj(r, 'n'));
  } finally {
    await session.close();
  }
}

export async function getUnreadNotifications(userId: number) {
  const session = getSession();
  try {
    const result = await session.run(`
      MATCH (n:TaskNotification {userId: $userId})
      WHERE n.status <> 'read'
      RETURN n 
      ORDER BY n.createdAt DESC
    `, { userId });
    return result.records.map(r => recordToObj(r, 'n'));
  } finally {
    await session.close();
  }
}

export async function markNotificationAsRead(notificationId: number) {
  const session = getSession();
  try {
    await session.run(`
      MATCH (n:TaskNotification {id: $notificationId})
      SET n.status = 'read', n.readAt = datetime(), n.updatedAt = datetime()
    `, { notificationId });
  } finally {
    await session.close();
  }
}

export async function updateNotificationStatus(notificationId: number, status: string, sentAt?: Date) {
  const session = getSession();
  try {
    await session.run(`
      MATCH (n:TaskNotification {id: $notificationId})
      SET n.status = $status, n.sentAt = datetime($sentAt), n.updatedAt = datetime()
    `, { notificationId, status, sentAt: sentAt ? sentAt.toISOString() : new Date().toISOString() });
  } finally {
    await session.close();
  }
}

export async function getPendingNotifications() {
  const session = getSession();
  try {
    const result = await session.run(`
      MATCH (n:TaskNotification {status: 'pending'})
      RETURN n 
      ORDER BY n.scheduledFor
    `);
    return result.records.map(r => recordToObj(r, 'n'));
  } finally {
    await session.close();
  }
}

// ==================== NOTIFICATION PREFERENCES ====================

export async function getOrCreateNotificationPreferences(userId: number) {
  const session = getSession();
  try {
    const result = await session.run(`
      MATCH (u:User {id: $userId})
      MERGE (u)-[:HAS_PREFERENCES]->(np:NotificationPreferences)
      ON CREATE SET
        np.id = toInteger(timestamp()),
        np.userId = $userId,
        np.emailEnabled = true,
        np.smsEnabled = false,
        np.inAppEnabled = true,
        np.overdueReminders = true,
        np.completionNotifications = true,
        np.assignmentNotifications = true,
        np.statusChangeNotifications = true,
        np.timezone = 'UTC',
        np.createdAt = datetime(),
        np.updatedAt = datetime()
      RETURN np
    `, { userId });

    return recordToObj(result.records[0], 'np');
  } finally {
    await session.close();
  }
}

export async function updateNotificationPreferences(userId: number, preferences: any) {
  const session = getSession();
  try {
    let sets = [];
    let params: any = { userId };

    Object.keys(preferences).forEach(key => {
      if (key === 'id' || key === 'userId') return;
      sets.push(`np.${key} = $${key}`);
      params[key] = preferences[key];
    });

    if (sets.length === 0) return;
    sets.push('np.updatedAt = datetime()');

    await session.run(`
      MATCH (u:User {id: $userId})-[:HAS_PREFERENCES]->(np:NotificationPreferences)
      SET ${sets.join(', ')}
    `, params);
  } finally {
    await session.close();
  }
}

export async function getNotificationPreferences(userId: number) {
  const session = getSession();
  try {
    const result = await session.run(`
      MATCH (u:User {id: $userId})-[:HAS_PREFERENCES]->(np:NotificationPreferences)
      RETURN np
    `, { userId }); // Query by relationship or userId property

    if (result.records.length === 0) return null;
    return recordToObj(result.records[0], 'np');
  } finally {
    await session.close();
  }
}

// ==================== NOTIFICATION HISTORY ====================

export async function recordNotificationHistory(history: any) {
  const session = getSession();
  try {
    await session.run(`
      CREATE (h:NotificationHistory {
        id: toInteger(timestamp()),
        notificationId: $notificationId,
        channel: $channel,
        status: $status,
        sentAt: datetime($sentAt),
        error: $error,
        userId: $userId
      })
      WITH h
      MATCH (n:TaskNotification {id: $notificationId})
      MERGE (n)-[:HAS_HISTORY]->(h)
    `, {
      notificationId: history.notificationId,
      channel: history.channel,
      status: history.status,
      sentAt: history.sentAt ? new Date(history.sentAt).toISOString() : new Date().toISOString(),
      error: history.error || null,
      userId: history.userId // Storing redundantly or could match user
    });
  } finally {
    await session.close();
  }
}

export async function getNotificationHistory(notificationId: number) {
  const session = getSession();
  try {
    const result = await session.run(`
      MATCH (n:TaskNotification {id: $notificationId})-[:HAS_HISTORY]->(h:NotificationHistory)
      RETURN h 
      ORDER BY h.sentAt DESC
    `, { notificationId });
    return result.records.map(r => recordToObj(r, 'h'));
  } finally {
    await session.close();
  }
}

export async function getNotificationHistoryByUser(userId: number, days: number = 30) {
  const session = getSession();
  try {
    const result = await session.run(`
      MATCH (h:NotificationHistory {userId: $userId})
      WHERE h.sentAt >= datetime() - duration({days: $days})
      RETURN h 
      ORDER BY h.sentAt DESC
    `, { userId, days });
    return result.records.map(r => recordToObj(r, 'h'));
  } finally {
    await session.close();
  }
}

export async function getFailedNotifications(hours: number = 24) {
  const session = getSession();
  try {
    const result = await session.run(`
      MATCH (h:NotificationHistory {status: 'failed'})
      WHERE h.sentAt >= datetime() - duration({hours: $hours})
      RETURN h 
      ORDER BY h.sentAt DESC
    `, { hours });
    return result.records.map(r => recordToObj(r, 'h'));
  } finally {
    await session.close();
  }
}


// ==================== NOTIFICATION TEMPLATES ====================
export async function getNotificationTemplates(limit = 50, offset = 0) {
  const session = getSession();
  try {
    const result = await session.run(`
      MATCH (nt:NotificationTemplate) 
      RETURN nt 
      ORDER BY nt.createdAt DESC 
      SKIP toInteger($offset) 
      LIMIT toInteger($limit)
    `, { limit, offset });
    return result.records.map(r => recordToObj(r, 'nt'));
  } finally {
    await session.close();
  }
}

export async function getNotificationTemplate(id: number) {
  const session = getSession();
  try {
    const result = await session.run('MATCH (nt:NotificationTemplate {id: $id}) RETURN nt', { id });
    if (result.records.length === 0) return undefined;
    return recordToObj(result.records[0], 'nt');
  } finally {
    await session.close();
  }
}

export async function createNotificationTemplate(data: {
  createdBy: number;
  name: string;
  description?: string;
  subject: string;
  bodyText: string;
  bodyHtml?: string;
  channels: ("email" | "sms" | "in_app")[];
  variables?: string[];
  tags?: string[];
}) {
  const session = getSession();
  try {
    const query = `
      CREATE (nt:NotificationTemplate {
        id: toInteger(timestamp()),
        name: $name,
        description: $description,
        subject: $subject,
        bodyText: $bodyText,
        bodyHtml: $bodyHtml,
        channels: $channels,
        variables: $variables,
        tags: $tags,
        createdBy: $createdBy,
        createdAt: datetime(),
        updatedAt: datetime()
      })
      WITH nt
      MATCH (u:User {id: $createdBy})
      MERGE (u)-[:CREATED_TEMPLATE]->(nt)
      RETURN nt.id as id
    `;

    const result = await session.run(query, {
      createdBy: data.createdBy,
      name: data.name,
      description: data.description || null,
      subject: data.subject,
      bodyText: data.bodyText,
      bodyHtml: data.bodyHtml || null,
      channels: JSON.stringify(data.channels),
      variables: data.variables ? JSON.stringify(data.variables) : null,
      tags: data.tags ? JSON.stringify(data.tags) : null,
    });

    return { insertId: result.records[0]?.get('id').toNumber() };
  } finally {
    await session.close();
  }
}

export async function updateNotificationTemplate(id: number, data: any) {
  const session = getSession();
  try {
    let sets = [];
    let params: any = { id };

    Object.keys(data).forEach(key => {
      if (key === 'id') return;
      if (['channels', 'variables', 'tags'].includes(key) && typeof data[key] !== 'string') {
        sets.push(`nt.${key} = $${key}`);
        params[key] = JSON.stringify(data[key]);
      } else {
        sets.push(`nt.${key} = $${key}`);
        params[key] = data[key];
      }
    });

    if (sets.length === 0) return;
    sets.push('nt.updatedAt = datetime()');

    await session.run(`MATCH (nt:NotificationTemplate {id: $id}) SET ${sets.join(', ')}`, params);
  } finally {
    await session.close();
  }
}

export async function deleteNotificationTemplate(id: number) {
  const session = getSession();
  try {
    await session.run('MATCH (nt:NotificationTemplate {id: $id}) DETACH DELETE nt', { id });
  } finally {
    await session.close();
  }
}

// ==================== NOTIFICATION TRIGGERS ====================
export async function getNotificationTriggers(limit = 50, offset = 0) {
  const session = getSession();
  try {
    const result = await session.run(`
      MATCH (tr:NotificationTrigger) 
      RETURN tr 
      ORDER BY tr.createdAt DESC 
      SKIP toInteger($offset) 
      LIMIT toInteger($limit)
    `, { limit, offset });
    return result.records.map(r => recordToObj(r, 'tr'));
  } finally {
    await session.close();
  }
}

export async function getNotificationTrigger(id: number) {
  const session = getSession();
  try {
    const result = await session.run('MATCH (tr:NotificationTrigger {id: $id}) RETURN tr', { id });
    if (result.records.length === 0) return undefined;
    return recordToObj(result.records[0], 'tr');
  } finally {
    await session.close();
  }
}

export async function getTriggersByTemplate(templateId: number) {
  const session = getSession();
  try {
    const result = await session.run(`
      MATCH (tr:NotificationTrigger)-[:USES_TEMPLATE]->(nt:NotificationTemplate {id: $templateId})
      RETURN tr 
      ORDER BY tr.createdAt DESC
    `, { templateId });
    return result.records.map(r => recordToObj(r, 'tr'));
  } finally {
    await session.close();
  }
}

export async function getTriggersByEventType(eventType: string) {
  const session = getSession();
  try {
    const result = await session.run(`
      MATCH (tr:NotificationTrigger {eventType: $eventType})
      RETURN tr 
      ORDER BY tr.createdAt DESC
    `, { eventType });
    return result.records.map(r => recordToObj(r, 'tr'));
  } finally {
    await session.close();
  }
}

export async function getActiveTriggers() {
  const session = getSession();
  try {
    const result = await session.run(`
      MATCH (tr:NotificationTrigger {isActive: true})
      RETURN tr 
      ORDER BY tr.createdAt DESC
    `);
    return result.records.map(r => recordToObj(r, 'tr'));
  } finally {
    await session.close();
  }
}

export async function createNotificationTrigger(data: {
  createdBy: number;
  templateId: number;
  name: string;
  description?: string;
  eventType: string;
  triggerCondition: any;
  actions: any;
}) {
  const session = getSession();
  try {
    const query = `
      CREATE (tr:NotificationTrigger {
        id: toInteger(timestamp()),
        name: $name,
        description: $description,
        eventType: $eventType,
        triggerCondition: $triggerCondition,
        actions: $actions,
        isActive: true,
        createdBy: $createdBy,
        createdAt: datetime(),
        updatedAt: datetime()
      })
      WITH tr
      MATCH (nt:NotificationTemplate {id: $templateId})
      MATCH (u:User {id: $createdBy})
      MERGE (tr)-[:USES_TEMPLATE]->(nt)
      MERGE (u)-[:CREATED_TRIGGER]->(tr)
      RETURN tr.id as id
    `;

    const result = await session.run(query, {
      createdBy: data.createdBy,
      templateId: data.templateId,
      name: data.name,
      description: data.description || null,
      eventType: data.eventType,
      triggerCondition: JSON.stringify(data.triggerCondition),
      actions: JSON.stringify(data.actions)
    });

    return { insertId: result.records[0]?.get('id').toNumber() };
  } finally {
    await session.close();
  }
}

export async function updateNotificationTrigger(id: number, data: any) {
  const session = getSession();
  try {
    let sets = [];
    let params: any = { id };

    Object.keys(data).forEach(key => {
      if (key === 'id') return;
      if (['triggerCondition', 'actions'].includes(key) && typeof data[key] !== 'string') {
        sets.push(`tr.${key} = $${key}`);
        params[key] = JSON.stringify(data[key]);
      } else {
        sets.push(`tr.${key} = $${key}`);
        params[key] = data[key];
      }
    });

    if (sets.length === 0) return;
    sets.push('tr.updatedAt = datetime()');

    await session.run(`MATCH (tr:NotificationTrigger {id: $id}) SET ${sets.join(', ')}`, params);
  } finally {
    await session.close();
  }
}

export async function deleteNotificationTrigger(id: number) {
  const session = getSession();
  try {
    await session.run('MATCH (tr:NotificationTrigger {id: $id}) DETACH DELETE tr', { id });
  } finally {
    await session.close();
  }
}

// ==================== TRIGGER EXECUTION LOG ====================
export async function recordTriggerExecution(data: {
  triggerId: number;
  entityType: string;
  entityId: number;
  conditionsMet: boolean;
  notificationsSent: number;
  error?: string;
}) {
  const session = getSession();
  try {
    const query = `
      CREATE (te:TriggerExecutionLog {
        id: toInteger(timestamp()),
        triggerId: $triggerId,
        entityType: $entityType,
        entityId: $entityId,
        conditionsMet: $conditionsMet,
        notificationsSent: $notificationsSent,
        error: $error,
        executedAt: datetime()
      })
      WITH te
      MATCH (tr:NotificationTrigger {id: $triggerId})
      MERGE (tr)-[:HAS_EXECUTION]->(te)
    `;

    await session.run(query, {
      triggerId: data.triggerId,
      entityType: data.entityType,
      entityId: data.entityId,
      conditionsMet: data.conditionsMet,
      notificationsSent: data.notificationsSent,
      error: data.error || null
    });
  } finally {
    await session.close();
  }
}

export async function getTriggerExecutionLog(triggerId: number, limit = 100) {
  const session = getSession();
  try {
    const result = await session.run(`
      MATCH (tr:NotificationTrigger {id: $triggerId})-[:HAS_EXECUTION]->(te:TriggerExecutionLog)
      RETURN te 
      ORDER BY te.executedAt DESC
      LIMIT toInteger($limit)
    `, { triggerId, limit });
    return result.records.map(r => recordToObj(r, 'te'));
  } finally {
    await session.close();
  }
}

export async function updateUserLanguagePreference(userId: number, language: string) {
  const session = getSession();
  try {
    await session.run(`
      MATCH (u:User {id: $userId})
      SET u.languagePreference = $language, u.updatedAt = datetime()
    `, { userId, language });
    return true;
  } catch (error) {
    console.error("Failed to update language preference:", error);
    return false;
  } finally {
    await session.close();
  }
}


// ============ SHIFT MANAGEMENT ============

export async function createShift(shift: any): Promise<number | null> {
  const session = getSession();
  try {
    const query = `
      MATCH (u:User {id: $employeeId})
      CREATE (s:Shift {
        id: toInteger(timestamp()),
        employeeId: $employeeId,
        projectId: $projectId,
        startTime: datetime($startTime),
        endTime: datetime($endTime),
        breakDuration: $breakDuration,
        notes: $notes,
        status: $status,
        createdAt: datetime(),
        updatedAt: datetime()
      })
      MERGE (u)-[:HAS_SHIFT]->(s)
      WITH s
      OPTIONAL MATCH (p:Project {id: $projectId})
      FOREACH (_ IN CASE WHEN p IS NOT NULL THEN [1] ELSE [] END |
        MERGE (s)-[:FOR_PROJECT]->(p)
      )
      RETURN s.id as id
    `;

    const result = await session.run(query, {
      employeeId: shift.employeeId,
      projectId: shift.projectId || null,
      startTime: new Date(shift.startTime).toISOString(),
      endTime: shift.endTime ? new Date(shift.endTime).toISOString() : null,
      breakDuration: shift.breakDuration || 0,
      notes: shift.notes || null,
      status: shift.status || 'scheduled'
    });

    return result.records[0]?.get('id').toNumber();
  } catch (error) {
    console.error("Failed to create shift:", error);
    return null;
  } finally {
    await session.close();
  }
}

export async function getAllShifts() {
  const session = getSession();
  try {
    const result = await session.run(`
      MATCH (s:Shift)
      RETURN s 
      ORDER BY s.startTime DESC
    `);
    return result.records.map(r => recordToObj(r, 's'));
  } catch (error) {
    console.error("Failed to get all shifts:", error);
    return [];
  } finally {
    await session.close();
  }
}

export async function getShiftsByEmployee(employeeId: number, startDate: Date, endDate: Date) {
  const session = getSession();
  try {
    const result = await session.run(`
      MATCH (u:User {id: $employeeId})-[:HAS_SHIFT]->(s:Shift)
      WHERE s.startTime >= datetime($startDate) AND s.startTime <= datetime($endDate)
      RETURN s 
      ORDER BY s.startTime DESC
    `, {
      employeeId,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    });
    return result.records.map(r => recordToObj(r, 's'));
  } catch (error) {
    console.error("Failed to get shifts:", error);
    return [];
  } finally {
    await session.close();
  }
}

export async function updateShift(id: number, updates: any) {
  const session = getSession();
  try {
    let sets = [];
    let params: any = { id };

    Object.keys(updates).forEach(key => {
      if (key === 'id') return;
      if (['startTime', 'endTime'].includes(key)) {
        sets.push(`s.${key} = datetime($${key})`);
        params[key] = new Date(updates[key]).toISOString();
      } else {
        sets.push(`s.${key} = $${key}`);
        params[key] = updates[key];
      }
    });

    if (sets.length === 0) return true;
    sets.push('s.updatedAt = datetime()');

    await session.run(`MATCH (s:Shift {id: $id}) SET ${sets.join(', ')}`, params);
    return true;
  } catch (error) {
    console.error("Failed to update shift:", error);
    return false;
  } finally {
    await session.close();
  }
}

export async function getShiftById(id: number) {
  const session = getSession();
  try {
    const result = await session.run('MATCH (s:Shift {id: $id}) RETURN s', { id });
    if (result.records.length === 0) return null;
    return recordToObj(result.records[0], 's');
  } catch (error) {
    console.error("Failed to get shift by id:", error);
    return null;
  } finally {
    await session.close();
  }
}

export async function deleteShift(id: number) {
  const session = getSession();
  try {
    await session.run('MATCH (s:Shift {id: $id}) DETACH DELETE s', { id });
    return true;
  } catch (error) {
    console.error("Failed to delete shift:", error);
    return false;
  } finally {
    await session.close();
  }
}

// ============ SHIFT TEMPLATES ============

export async function createShiftTemplate(template: any): Promise<number | null> {
  const session = getSession();
  try {
    const query = `
      CREATE (st:ShiftTemplate {
        id: toInteger(timestamp()),
        name: $name,
        startTime: $startTime,
        endTime: $endTime,
        duration: $duration,
        isActive: true,
        createdBy: $createdBy,
        createdAt: datetime(),
        updatedAt: datetime()
      })
      RETURN st.id as id
    `;

    const result = await session.run(query, {
      name: template.name,
      startTime: template.startTime,
      endTime: template.endTime,
      duration: template.duration,
      createdBy: template.createdBy
    });

    return result.records[0]?.get('id').toNumber();
  } catch (error) {
    console.error("Failed to create shift template:", error);
    return null;
  } finally {
    await session.close();
  }
}

export async function getShiftTemplates() {
  const session = getSession();
  try {
    const result = await session.run(`
      MATCH (st:ShiftTemplate {isActive: true})
      RETURN st
      ORDER BY st.name
    `);
    return result.records.map(r => recordToObj(r, 'st'));
  } catch (error) {
    console.error("Failed to get shift templates:", error);
    return [];
  } finally {
    await session.close();
  }
}

// ============ EMPLOYEE AVAILABILITY ============

export async function setEmployeeAvailability(availability: any) {
  const session = getSession();
  try {
    // Delete existing availability for this employee and day
    await session.run(`
      MATCH (u:User {id: $employeeId})-[r:HAS_AVAILABILITY]->(ea:EmployeeAvailability {dayOfWeek: $dayOfWeek})
      DELETE r, ea
    `, { employeeId: availability.employeeId, dayOfWeek: availability.dayOfWeek });

    // Create new availability
    const query = `
      MATCH (u:User {id: $employeeId})
      CREATE (ea:EmployeeAvailability {
        id: toInteger(timestamp()),
        employeeId: $employeeId,
        dayOfWeek: $dayOfWeek,
        startTime: $startTime,
        endTime: $endTime,
        isAvailable: $isAvailable,
        updatedAt: datetime()
      })
      MERGE (u)-[:HAS_AVAILABILITY]->(ea)
    `;

    await session.run(query, {
      employeeId: availability.employeeId,
      dayOfWeek: availability.dayOfWeek,
      startTime: availability.startTime,
      endTime: availability.endTime,
      isAvailable: availability.isAvailable !== undefined ? availability.isAvailable : true
    });
    return true;
  } catch (error) {
    console.error("Failed to set employee availability:", error);
    return false;
  } finally {
    await session.close();
  }
}

export async function getEmployeeAvailability(employeeId: number) {
  const session = getSession();
  try {
    const result = await session.run(`
      MATCH (u:User {id: $employeeId})-[:HAS_AVAILABILITY]->(ea:EmployeeAvailability)
      RETURN ea
      ORDER BY ea.dayOfWeek
    `, { employeeId });
    return result.records.map(r => recordToObj(r, 'ea'));
  } catch (error) {
    console.error("Failed to get employee availability:", error);
    return [];
  } finally {
    await session.close();
  }
}

// ============ COMPLIANCE & AUDIT TRAIL ============

export async function logComplianceAudit(audit: any) {
  const session = getSession();
  try {
    const query = `
      CREATE (ca:ComplianceAuditTrail {
        id: toInteger(timestamp()),
        employeeId: $employeeId,
        eventType: $eventType,
        description: $description,
        auditDate: datetime($auditDate),
        severity: $severity,
        metadata: $metadata,
        createdAt: datetime()
      })
      WITH ca
      MATCH (u:User {id: $employeeId})
      MERGE (u)-[:HAS_COMPLIANCE_EVENT]->(ca)
    `;

    await session.run(query, {
      employeeId: audit.employeeId,
      eventType: audit.eventType,
      description: audit.description || null,
      auditDate: new Date(audit.auditDate).toISOString(),
      severity: audit.severity || 'info',
      metadata: audit.metadata ? JSON.stringify(audit.metadata) : null
    });
    return true;
  } catch (error) {
    console.error("Failed to log compliance audit:", error);
    return false;
  } finally {
    await session.close();
  }
}

export async function getComplianceAudits(employeeId: number, startDate: Date, endDate: Date) {
  const session = getSession();
  try {
    const result = await session.run(`
      MATCH (u:User {id: $employeeId})-[:HAS_COMPLIANCE_EVENT]->(ca:ComplianceAuditTrail)
      WHERE ca.auditDate >= datetime($startDate) AND ca.auditDate <= datetime($endDate)
      RETURN ca
      ORDER BY ca.auditDate DESC
    `, {
      employeeId,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    });
    return result.records.map(r => recordToObj(r, 'ca'));
  } catch (error) {
    console.error("Failed to get compliance audits:", error);
    return [];
  } finally {
    await session.close();
  }
}

// ============ BREAK TRACKING ============

export async function recordBreak(breakRecord: any) {
  const session = getSession();
  try {
    const query = `
      MATCH (s:Shift {id: $shiftId})
      CREATE (b:BreakRecord {
        id: toInteger(timestamp()),
        shiftId: $shiftId,
        startTime: datetime($startTime),
        endTime: datetime($endTime),
        duration: $duration,
        type: $type,
        createdAt: datetime()
      })
      MERGE (s)-[:HAS_BREAK]->(b)
    `;

    await session.run(query, {
      shiftId: breakRecord.shiftId,
      startTime: new Date(breakRecord.startTime).toISOString(),
      endTime: breakRecord.endTime ? new Date(breakRecord.endTime).toISOString() : null,
      duration: breakRecord.duration || 0,
      type: breakRecord.type || 'standard'
    });
    return true;
  } catch (error) {
    console.error("Failed to record break:", error);
    return false;
  } finally {
    await session.close();
  }
}

export async function getBreakRules(jurisdiction: string) {
  const session = getSession();
  try {
    const result = await session.run(`
      MATCH (br:BreakRule {jurisdiction: $jurisdiction})
      RETURN br
    `, { jurisdiction });
    return result.records.map(r => recordToObj(r, 'br'));
  } catch (error) {
    console.error("Failed to get break rules:", error);
    return [];
  } finally {
    await session.close();
  }
}

// ============ OFFLINE SYNC ============

export async function cacheOfflineEntry(cache: any) {
  const session = getSession();
  try {
    const query = `
      CREATE (toc:TimesheetOfflineCache {
        id: toInteger(timestamp()),
        employeeId: $employeeId,
        data: $data,
        capturedAt: datetime($capturedAt),
        syncStatus: $syncStatus,
        createdAt: datetime(),
        updatedAt: datetime()
      })
      WITH toc
      MATCH (u:User {id: $employeeId})
      MERGE (u)-[:HAS_OFFLINE_ENTRY]->(toc)
    `;

    await session.run(query, {
      employeeId: cache.employeeId,
      data: JSON.stringify(cache.data),
      capturedAt: new Date(cache.capturedAt).toISOString(),
      syncStatus: cache.syncStatus || 'pending'
    });
    return true;
  } catch (error) {
    console.error("Failed to cache offline entry:", error);
    return false;
  } finally {
    await session.close();
  }
}

export async function getPendingOfflineEntries(employeeId: number) {
  const session = getSession();
  try {
    const result = await session.run(`
      MATCH (u:User {id: $employeeId})-[:HAS_OFFLINE_ENTRY]->(toc:TimesheetOfflineCache)
      WHERE toc.syncStatus = 'pending'
      RETURN toc
      ORDER BY toc.capturedAt ASC
    `, { employeeId });
    return result.records.map(r => recordToObj(r, 'toc'));
  } catch (error) {
    console.error("Failed to get pending offline entries:", error);
    return [];
  } finally {
    await session.close();
  }
}

export async function updateOfflineSyncStatus(id: number, status: string, syncedAt?: Date) {
  const session = getSession();
  try {
    await session.run(`
      MATCH (toc:TimesheetOfflineCache {id: $id})
      SET toc.syncStatus = $status, toc.syncedAt = datetime($syncedAt), toc.updatedAt = datetime()
    `, {
      id,
      status,
      syncedAt: syncedAt ? syncedAt.toISOString() : new Date().toISOString()
    });
    return true;
  } catch (error) {
    console.error("Failed to update offline sync status:", error);
    return false;
  } finally {
    await session.close();
  }
}


// ============ GEOLOCATION FUNCTIONS ============

export async function createJobSite(input: {
  projectId: number;
  name: string;
  description?: string;
  latitude: number;
  longitude: number;
  geofenceRadius?: number;
  address?: string;
  createdBy: number;
}) {
  const session = getSession();
  try {
    const query = `
      MATCH (p:Project {id: $projectId})
      CREATE (js:JobSite {
        id: toInteger(timestamp()),
        projectId: $projectId,
        name: $name,
        description: $description,
        latitude: $latitude,
        longitude: $longitude,
        geofenceRadius: $geofenceRadius,
        address: $address,
        isActive: true,
        createdBy: $createdBy,
        createdAt: datetime(),
        updatedAt: datetime()
      })
      MERGE (p)-[:HAS_JOB_SITE]->(js)
      RETURN js.id as id
    `;

    const result = await session.run(query, {
      projectId: input.projectId,
      name: input.name,
      description: input.description || null,
      latitude: input.latitude,
      longitude: input.longitude,
      geofenceRadius: input.geofenceRadius || 100,
      address: input.address || null,
      createdBy: input.createdBy
    });

    return result.records[0]?.get('id').toNumber();
  } catch (error) {
    console.error("Failed to create job site:", error);
    throw error;
  } finally {
    await session.close();
  }
}

export async function getJobSites(projectId?: number) {
  const session = getSession();
  try {
    let query = `MATCH (js:JobSite) WHERE js.isActive = true RETURN js`;
    let params: any = {};

    if (projectId) {
      query = `MATCH (p:Project {id: $projectId})-[:HAS_JOB_SITE]->(js:JobSite) WHERE js.isActive = true RETURN js`;
      params = { projectId };
    }

    const result = await session.run(query, params);
    return result.records.map(r => recordToObj(r, 'js'));
  } catch (error) {
    console.error("Failed to get job sites:", error);
    return [];
  } finally {
    await session.close();
  }
}

export async function createLocationLog(input: {
  shiftId: number;
  employeeId: number;
  jobSiteId: number;
  eventType: "check_in" | "check_out" | "location_update";
  latitude: number;
  longitude: number;
  accuracy?: number;
  isWithinGeofence: boolean;
  distanceFromGeofence?: number;
  deviceId?: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  const session = getSession();
  try {
    const query = `
      MATCH (u:User {id: $employeeId})
      MATCH (s:Shift {id: $shiftId})
      MATCH (js:JobSite {id: $jobSiteId})
      CREATE (ll:LocationLog {
        id: toInteger(timestamp()),
        shiftId: $shiftId,
        employeeId: $employeeId,
        jobSiteId: $jobSiteId,
        eventType: $eventType,
        latitude: $latitude,
        longitude: $longitude,
        accuracy: $accuracy,
        isWithinGeofence: $isWithinGeofence,
        distanceFromGeofence: $distanceFromGeofence,
        deviceId: $deviceId,
        ipAddress: $ipAddress,
        userAgent: $userAgent,
        timestamp: datetime()
      })
      MERGE (s)-[:HAS_LOCATION_LOG]->(ll)
      MERGE (u)-[:LOGGED_LOCATION]->(ll)
      MERGE (ll)-[:AT_SITE]->(js)
      RETURN ll.id as id
    `;

    const result = await session.run(query, {
      shiftId: input.shiftId,
      employeeId: input.employeeId,
      jobSiteId: input.jobSiteId,
      eventType: input.eventType,
      latitude: input.latitude,
      longitude: input.longitude,
      accuracy: input.accuracy || null,
      isWithinGeofence: input.isWithinGeofence,
      distanceFromGeofence: input.distanceFromGeofence || null,
      deviceId: input.deviceId || null,
      ipAddress: input.ipAddress || null,
      userAgent: input.userAgent || null
    });

    return result.records[0]?.get('id').toNumber();
  } catch (error) {
    console.error("Failed to create location log:", error);
    throw error;
  } finally {
    await session.close();
  }
}

export async function recordGeofenceViolation(input: {
  locationLogId: number;
  employeeId: number;
  jobSiteId: number;
  violationType: "outside_geofence" | "check_in_outside" | "check_out_outside";
  distanceFromGeofence: number;
  severity?: "warning" | "violation";
}) {
  const session = getSession();
  try {
    const query = `
      MATCH (ll:LocationLog {id: $locationLogId})
      MATCH (u:User {id: $employeeId})
      MATCH (js:JobSite {id: $jobSiteId})
      CREATE (gv:GeofenceViolation {
        id: toInteger(timestamp()),
        locationLogId: $locationLogId,
        employeeId: $employeeId,
        jobSiteId: $jobSiteId,
        violationType: $violationType,
        distanceFromGeofence: $distanceFromGeofence,
        severity: $severity,
        isResolved: false,
        timestamp: datetime()
      })
      MERGE (ll)-[:HAS_VIOLATION]->(gv)
      MERGE (u)-[:COMMITTED_VIOLATION]->(gv)
      MERGE (gv)-[:AT_SITE]->(js)
      RETURN gv.id as id
    `;

    const result = await session.run(query, {
      locationLogId: input.locationLogId,
      employeeId: input.employeeId,
      jobSiteId: input.jobSiteId,
      violationType: input.violationType,
      distanceFromGeofence: input.distanceFromGeofence,
      severity: input.severity || "warning"
    });

    return result.records[0]?.get('id').toNumber();
  } catch (error) {
    console.error("Failed to record geofence violation:", error);
    throw error;
  } finally {
    await session.close();
  }
}

export async function getLocationHistory(employeeId: number, limit: number = 50) {
  const session = getSession();
  try {
    const result = await session.run(`
      MATCH (u:User {id: $employeeId})-[:LOGGED_LOCATION]->(ll:LocationLog)
      RETURN ll
      ORDER BY ll.timestamp DESC
      LIMIT toInteger($limit)
    `, { employeeId, limit });
    return result.records.map(r => recordToObj(r, 'll'));
  } catch (error) {
    console.error("Failed to get location history:", error);
    return [];
  } finally {
    await session.close();
  }
}

export async function getGeofenceViolations(employeeId?: number, resolved?: boolean) {
  const session = getSession();
  try {
    let query = `MATCH (gv:GeofenceViolation)`;
    let whereClauses = [];
    let params: any = {};

    if (employeeId) {
      whereClauses.push(`gv.employeeId = $employeeId`);
      params.employeeId = employeeId;
    }
    if (resolved !== undefined) {
      whereClauses.push(`gv.isResolved = $resolved`);
      params.resolved = resolved;
    }

    if (whereClauses.length > 0) {
      query += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    query += ` RETURN gv ORDER BY gv.timestamp DESC`;

    const result = await session.run(query, params);
    return result.records.map(r => recordToObj(r, 'gv'));
  } catch (error) {
    console.error("Failed to get geofence violations:", error);
    return [];
  } finally {
    await session.close();
  }
}

export async function resolveGeofenceViolation(violationId: number, resolvedBy: number, notes?: string) {
  const session = getSession();
  try {
    await session.run(`
      MATCH (gv:GeofenceViolation {id: $violationId})
      SET gv.isResolved = true, 
          gv.resolvedBy = $resolvedBy, 
          gv.resolutionNotes = $notes, 
          gv.resolvedAt = datetime()
    `, { violationId, resolvedBy, notes });
    return true;
  } catch (error) {
    console.error("Failed to resolve geofence violation:", error);
    return false;
  } finally {
    await session.close();
  }
}

// ============ TIMESHEET APPROVALS ============

export async function requestTimesheetApproval(approval: any) {
  const session = getSession();
  try {
    const query = `
      MATCH (u:User {id: $employeeId})
      MATCH (s:Shift {id: $shiftId})
      CREATE (ta:TimesheetApproval {
        id: toInteger(timestamp()),
        shiftId: $shiftId,
        employeeId: $employeeId,
        status: 'pending',
        submittedAt: datetime(),
        comments: $comments
      })
      MERGE (s)-[:HAS_APPROVAL_REQUEST]->(ta)
      MERGE (u)-[:REQUESTED_APPROVAL]->(ta)
      RETURN ta.id as id
    `;
    const result = await session.run(query, {
      shiftId: approval.shiftId,
      employeeId: approval.employeeId,
      comments: approval.comments || null
    });
    return result.records[0]?.get('id').toNumber();
  } catch (error) {
    console.error("Failed to request timesheet approval:", error);
    return null;
  } finally {
    await session.close();
  }
}

export async function approveTimesheet(approvalId: number, approvedBy: number, comments?: string) {
  const session = getSession();
  try {
    await session.run(`
      MATCH (ta:TimesheetApproval {id: $approvalId})
      MATCH (u:User {id: $approvedBy})
      SET ta.status = 'approved', 
          ta.approvedBy = $approvedBy, 
          ta.approvedAt = datetime(), 
          ta.comments = $comments
      MERGE (ta)-[:APPROVED_BY]->(u)
    `, { approvalId, approvedBy, comments: comments || null });

    // Also update the Shift status
    await session.run(`
      MATCH (ta:TimesheetApproval {id: $approvalId})<-[:HAS_APPROVAL_REQUEST]-(s:Shift)
      SET s.status = 'approved'
    `, { approvalId });

    return true;
  } catch (error) {
    console.error("Failed to approve timesheet:", error);
    return false;
  } finally {
    await session.close();
  }
}

export async function rejectTimesheet(approvalId: number, rejectedBy: number, comments: string) {
  const session = getSession();
  try {
    await session.run(`
      MATCH (ta:TimesheetApproval {id: $approvalId})
      MATCH (u:User {id: $rejectedBy})
      SET ta.status = 'rejected', 
          ta.rejectedBy = $rejectedBy, 
          ta.rejectedAt = datetime(), 
          ta.rejectionReason = $comments
      MERGE (ta)-[:REJECTED_BY]->(u)
    `, { approvalId, rejectedBy, comments });

    // Also update Shift status
    await session.run(`
      MATCH (ta:TimesheetApproval {id: $approvalId})<-[:HAS_APPROVAL_REQUEST]-(s:Shift)
      SET s.status = 'rejected'
    `, { approvalId });

    return true;
  } catch (error) {
    console.error("Failed to reject timesheet:", error);
    return false;
  } finally {
    await session.close();
  }
}

export async function getPendingTimesheetApprovals(managerId?: number) {
  const session = getSession();
  try {
    // Ideally we filter by manager's team but for now return all or filter logic if we had teams modeled
    const result = await session.run(`
      MATCH (ta:TimesheetApproval {status: 'pending'})
      MATCH (ta)<-[:HAS_APPROVAL_REQUEST]-(s:Shift)
      MATCH (s)<-[:HAS_SHIFT]-(u:User)
      RETURN ta, s, u
      ORDER BY ta.submittedAt ASC
    `);

    // Complex return structure handling, usually we just return the approval objects 
    // or enriched objects. For now returning approval objects.
    return result.records.map(r => {
      const approval = recordToObj(r, 'ta');
      const shift = recordToObj(r, 's');
      const user = recordToObj(r, 'u');
      return { ...approval, shift, employee: user };
    });
  } catch (error) {
    console.error("Failed to get pending approvals:", error);
    return [];
  } finally {
    await session.close();
  }
}

export async function getTimesheetApprovalHistory(employeeId: number) {
  const session = getSession();
  try {
    const result = await session.run(`
      MATCH (u:User {id: $employeeId})-[:REQUESTED_APPROVAL]->(ta:TimesheetApproval)
      RETURN ta
      ORDER BY ta.submittedAt DESC
    `, { employeeId });
    return result.records.map(r => recordToObj(r, 'ta'));
  } catch (error) {
    console.error("Failed to get approval history:", error);
    return [];
  } finally {
    await session.close();
  }
}

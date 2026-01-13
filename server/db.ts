import driver, { getSession } from './db/neo4j';
import { ENV } from './_core/env';
import { InsertUser, InsertDocument, InsertProject, InsertMaterial, InsertDelivery, InsertQualityTest, InsertEmployee, InsertWorkHour, InsertConcreteBase, InsertMachine, InsertMachineMaintenance, InsertMachineWorkHour, InsertAggregateInput, InsertMaterialConsumptionLog } from "../drizzle/schema";

// Helper to convert Neo4j Node to JS Object
const recordToObj = (record: any, key: string = 'n') => {
  if (!record || !record.get(key)) return null;
  const node = record.get(key);
  return { ...node.properties, id: parseInt(node.properties.id) }; // Ensure ID is int for app compatibility
};


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
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(aiConversations).values({
    userId,
    title,
    modelName,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return result;
}

export async function getConversations(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(aiConversations)
    .where(eq(aiConversations.userId, userId))
    .orderBy(desc(aiConversations.updatedAt));
}

export async function getConversation(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const results = await db.select().from(aiConversations)
    .where(eq(aiConversations.id, id));
  return results[0];
}

export async function updateConversationTitle(id: number, title: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(aiConversations)
    .set({ title, updatedAt: new Date() })
    .where(eq(aiConversations.id, id));
}

export async function addMessage(
  conversationId: number,
  role: 'user' | 'assistant' | 'system',
  content: string,
  metadata?: any
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(aiMessages).values({
    conversationId,
    role,
    content,
    metadata: metadata ? JSON.stringify(metadata) : null,
    createdAt: new Date(),
  });

  // Update conversation timestamp
  await db.update(aiConversations)
    .set({ updatedAt: new Date() })
    .where(eq(aiConversations.id, conversationId));

  return result;
}

export async function getMessages(conversationId: number) {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(aiMessages)
    .where(eq(aiMessages.conversationId, conversationId))
    .orderBy(aiMessages.createdAt);
}

export async function getAvailableModels() {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(aiModels)
    .where(eq(aiModels.isAvailable, true))
    .orderBy(aiModels.name);
}

export async function upsertModel(name: string, displayName: string, type: "text" | "vision" | "code", size?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await db.select().from(aiModels)
    .where(eq(aiModels.name, name));

  if (existing.length > 0) {
    await db.update(aiModels)
      .set({ isAvailable: true, lastUsed: new Date() })
      .where(eq(aiModels.name, name));
  } else {
    await db.insert(aiModels).values({
      name,
      displayName,
      type,
      size: size || undefined,
      isAvailable: true,
      lastUsed: new Date(),
    });
  }
}

export async function createAiConversation(data: { userId: number; title?: string; modelName?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(aiConversations).values({
    userId: data.userId,
    title: data.title || "New Conversation",
    modelName: data.modelName,
  });

  return result[0].insertId;
}

export async function getAiConversations(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(aiConversations)
    .where(eq(aiConversations.userId, userId))
    .orderBy(aiConversations.updatedAt);
}

export async function deleteAiConversation(conversationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Delete all messages first
  await db.delete(aiMessages).where(eq(aiMessages.conversationId, conversationId));

  // Delete conversation
  await db.delete(aiConversations).where(eq(aiConversations.id, conversationId));
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
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(aiMessages).values({
    conversationId: data.conversationId,
    role: data.role,
    content: data.content,
    model: data.model,
    audioUrl: data.audioUrl,
    imageUrl: data.imageUrl,
    thinkingProcess: data.thinkingProcess,
    toolCalls: data.toolCalls,
    metadata: data.metadata,
  });

  // Update conversation timestamp
  await db.update(aiConversations)
    .set({ updatedAt: new Date() })
    .where(eq(aiConversations.id, data.conversationId));

  return result[0].insertId;
}

export async function getAiMessages(conversationId: number) {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(aiMessages)
    .where(eq(aiMessages.conversationId, conversationId))
    .orderBy(aiMessages.createdAt);
}


// ==================== DAILY TASKS ====================
import { dailyTasks, InsertDailyTask, taskAssignments, InsertTaskAssignment, taskStatusHistory, InsertTaskStatusHistory } from "../drizzle/schema";
import { ne } from "drizzle-orm";

export async function createTask(task: InsertDailyTask) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(dailyTasks).values(task);
  return result;
}

export async function getTasks(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(dailyTasks).where(eq(dailyTasks.userId, userId)).orderBy(desc(dailyTasks.dueDate));
}

export async function getTaskById(taskId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(dailyTasks).where(eq(dailyTasks.id, taskId)).limit(1);
  return result[0];
}

export async function updateTask(taskId: number, updates: Partial<InsertDailyTask>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.update(dailyTasks).set(updates).where(eq(dailyTasks.id, taskId));
}

export async function deleteTask(taskId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.delete(dailyTasks).where(eq(dailyTasks.id, taskId));
}

export async function getTasksByStatus(userId: number, status: string) {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(dailyTasks)
    .where(and(eq(dailyTasks.userId, userId), eq(dailyTasks.status, status as any)))
    .orderBy(desc(dailyTasks.dueDate));
}

export async function getTasksByPriority(userId: number, priority: string) {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(dailyTasks)
    .where(and(eq(dailyTasks.userId, userId), eq(dailyTasks.priority, priority as any)))
    .orderBy(desc(dailyTasks.dueDate));
}

export async function getOverdueTasks(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(dailyTasks)
    .where(and(
      eq(dailyTasks.userId, userId),
      lt(dailyTasks.dueDate, new Date()),
      ne(dailyTasks.status, 'completed')
    ))
    .orderBy(dailyTasks.dueDate);
}

export async function getTodaysTasks(userId: number) {
  const db = await getDb();
  if (!db) return [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return db.select().from(dailyTasks)
    .where(and(
      eq(dailyTasks.userId, userId),
      gte(dailyTasks.dueDate, today),
      lt(dailyTasks.dueDate, tomorrow)
    ))
    .orderBy(dailyTasks.dueDate);
}

// ==================== TASK ASSIGNMENTS ====================

export async function assignTask(assignment: InsertTaskAssignment) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.insert(taskAssignments).values(assignment);
}

export async function getTaskAssignments(taskId: number) {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(taskAssignments).where(eq(taskAssignments.taskId, taskId));
}

export async function updateTaskAssignment(assignmentId: number, updates: Partial<InsertTaskAssignment>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.update(taskAssignments).set(updates).where(eq(taskAssignments.id, assignmentId));
}

export async function getAssignmentsForUser(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(taskAssignments).where(eq(taskAssignments.assignedTo, userId)).orderBy(desc(taskAssignments.assignedAt));
}

// ==================== TASK STATUS HISTORY ====================

export async function recordTaskStatusChange(history: InsertTaskStatusHistory) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.insert(taskStatusHistory).values(history);
}

export async function getTaskHistory(taskId: number) {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(taskStatusHistory).where(eq(taskStatusHistory.taskId, taskId)).orderBy(desc(taskStatusHistory.createdAt));
}


// ==================== TASK NOTIFICATIONS ====================
import { taskNotifications, InsertTaskNotification, notificationPreferences, InsertNotificationPreference, notificationHistory, InsertNotificationHistory } from "../drizzle/schema";

export async function createNotification(notification: InsertTaskNotification) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(taskNotifications).values(notification);
  return result;
}

export async function getNotifications(userId: number, limit: number = 50) {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(taskNotifications)
    .where(eq(taskNotifications.userId, userId))
    .orderBy(desc(taskNotifications.createdAt))
    .limit(limit);
}

export async function getUnreadNotifications(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(taskNotifications)
    .where(and(
      eq(taskNotifications.userId, userId),
      ne(taskNotifications.status, 'read')
    ))
    .orderBy(desc(taskNotifications.createdAt));
}

export async function markNotificationAsRead(notificationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.update(taskNotifications)
    .set({ status: 'read', readAt: new Date() })
    .where(eq(taskNotifications.id, notificationId));
}

export async function updateNotificationStatus(notificationId: number, status: string, sentAt?: Date) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.update(taskNotifications)
    .set({ status: status as any, sentAt: sentAt || new Date() })
    .where(eq(taskNotifications.id, notificationId));
}

export async function getPendingNotifications() {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(taskNotifications)
    .where(eq(taskNotifications.status, 'pending'))
    .orderBy(taskNotifications.scheduledFor);
}

// ==================== NOTIFICATION PREFERENCES ====================

export async function getOrCreateNotificationPreferences(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await db.select().from(notificationPreferences)
    .where(eq(notificationPreferences.userId, userId))
    .limit(1);

  if (existing.length > 0) {
    return existing[0];
  }

  // Create default preferences
  const result = await db.insert(notificationPreferences).values({
    userId,
    emailEnabled: true,
    smsEnabled: false,
    inAppEnabled: true,
    overdueReminders: true,
    completionNotifications: true,
    assignmentNotifications: true,
    statusChangeNotifications: true,
    timezone: 'UTC',
  });

  return result;
}

export async function updateNotificationPreferences(userId: number, preferences: Partial<InsertNotificationPreference>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.update(notificationPreferences)
    .set(preferences)
    .where(eq(notificationPreferences.userId, userId));
}

export async function getNotificationPreferences(userId: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(notificationPreferences)
    .where(eq(notificationPreferences.userId, userId))
    .limit(1);

  return result[0] || null;
}

// ==================== NOTIFICATION HISTORY ====================

export async function recordNotificationHistory(history: InsertNotificationHistory) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.insert(notificationHistory).values(history);
}

export async function getNotificationHistory(notificationId: number) {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(notificationHistory)
    .where(eq(notificationHistory.notificationId, notificationId))
    .orderBy(desc(notificationHistory.sentAt));
}

export async function getNotificationHistoryByUser(userId: number, days: number = 30) {
  const db = await getDb();
  if (!db) return [];

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  return db.select().from(notificationHistory)
    .where(and(
      eq(notificationHistory.userId, userId),
      gte(notificationHistory.sentAt, cutoffDate)
    ))
    .orderBy(desc(notificationHistory.sentAt));
}

export async function getFailedNotifications(hours: number = 24) {
  const db = await getDb();
  if (!db) return [];

  const cutoffDate = new Date();
  cutoffDate.setHours(cutoffDate.getHours() - hours);

  return db.select().from(notificationHistory)
    .where(and(
      eq(notificationHistory.status, 'failed'),
      gte(notificationHistory.sentAt, cutoffDate)
    ))
    .orderBy(desc(notificationHistory.sentAt));
}


// ==================== NOTIFICATION TEMPLATES ====================
export async function getNotificationTemplates(limit = 50, offset = 0) {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(notificationTemplates).limit(limit).offset(offset).orderBy(desc(notificationTemplates.createdAt));
}

export async function getNotificationTemplate(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(notificationTemplates).where(eq(notificationTemplates.id, id)).limit(1);
  return result[0];
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
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(notificationTemplates).values({
    createdBy: data.createdBy,
    name: data.name,
    description: data.description || null,
    subject: data.subject,
    bodyText: data.bodyText,
    bodyHtml: data.bodyHtml || null,
    channels: JSON.stringify(data.channels) as any,
    variables: data.variables ? JSON.stringify(data.variables) : null,
    tags: data.tags ? JSON.stringify(data.tags) : null,
  } as any);

  // Extract insertId from MySQL result
  const insertId = (result as any)[0]?.insertId;
  return { insertId };
}

export async function updateNotificationTemplate(id: number, data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.update(notificationTemplates).set(data).where(eq(notificationTemplates.id, id));
}

export async function deleteNotificationTemplate(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.delete(notificationTemplates).where(eq(notificationTemplates.id, id));
}

// ==================== NOTIFICATION TRIGGERS ====================
export async function getNotificationTriggers(limit = 50, offset = 0) {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(notificationTriggers).limit(limit).offset(offset).orderBy(desc(notificationTriggers.createdAt));
}

export async function getNotificationTrigger(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(notificationTriggers).where(eq(notificationTriggers.id, id)).limit(1);
  return result[0];
}

export async function getTriggersByTemplate(templateId: number) {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(notificationTriggers).where(eq(notificationTriggers.templateId, templateId)).orderBy(desc(notificationTriggers.createdAt));
}

export async function getTriggersByEventType(eventType: string) {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(notificationTriggers).where(eq(notificationTriggers.eventType, eventType)).orderBy(desc(notificationTriggers.createdAt));
}

export async function getActiveTriggers() {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(notificationTriggers).where(eq(notificationTriggers.isActive, true)).orderBy(desc(notificationTriggers.createdAt));
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
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(notificationTriggers).values({
    createdBy: data.createdBy,
    templateId: data.templateId,
    name: data.name,
    description: data.description || null,
    eventType: data.eventType,
    triggerCondition: JSON.stringify(data.triggerCondition) as any,
    actions: JSON.stringify(data.actions) as any,
  } as any);

  const insertId = (result as any)[0]?.insertId;
  return { insertId }
}

export async function updateNotificationTrigger(id: number, data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.update(notificationTriggers).set(data).where(eq(notificationTriggers.id, id));
}

export async function deleteNotificationTrigger(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.delete(notificationTriggers).where(eq(notificationTriggers.id, id));
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
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.insert(triggerExecutionLog).values(data);
}

export async function getTriggerExecutionLog(triggerId: number, limit = 100) {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(triggerExecutionLog).where(eq(triggerExecutionLog.triggerId, triggerId)).limit(limit).orderBy(desc(triggerExecutionLog.executedAt));
}

export async function updateUserLanguagePreference(userId: number, language: string) {
  const db = await getDb();
  if (!db) return false;

  try {
    await db
      .update(users)
      .set({
        languagePreference: language,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
    return true;
  } catch (error) {
    console.error("Failed to update language preference:", error);
    return false;
  }
}


// ============ SHIFT MANAGEMENT ============

export async function createShift(shift: InsertShift): Promise<number | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db.insert(shifts).values(shift);
    return result[0].insertId as number;
  } catch (error) {
    console.error("Failed to create shift:", error);
    return null;
  }
}

export async function getAllShifts() {
  const db = await getDb();
  if (!db) return [];

  try {
    return await db
      .select()
      .from(shifts)
      .orderBy(shifts.shiftDate);
  } catch (error) {
    console.error("Failed to get all shifts:", error);
    return [];
  }
}

export async function getShiftsByEmployee(employeeId: number, startDate: Date, endDate: Date) {
  const db = await getDb();
  if (!db) return [];

  try {
    return await db
      .select()
      .from(shifts)
      .where(
        and(
          eq(shifts.employeeId, employeeId),
          gte(shifts.shiftDate, startDate),
          lte(shifts.shiftDate, endDate)
        )
      );
  } catch (error) {
    console.error("Failed to get shifts:", error);
    return [];
  }
}

export async function updateShift(id: number, updates: Partial<InsertShift>) {
  const db = await getDb();
  if (!db) return false;

  try {
    await db
      .update(shifts)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(shifts.id, id));
    return true;
  } catch (error) {
    console.error("Failed to update shift:", error);
    return false;
  }
}

// ============ SHIFT TEMPLATES ============

export async function createShiftTemplate(template: InsertShiftTemplate): Promise<number | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db.insert(shiftTemplates).values(template);
    return result[0].insertId as number;
  } catch (error) {
    console.error("Failed to create shift template:", error);
    return null;
  }
}

export async function getShiftTemplates() {
  const db = await getDb();
  if (!db) return [];

  try {
    return await db.select().from(shiftTemplates).where(eq(shiftTemplates.isActive, true));
  } catch (error) {
    console.error("Failed to get shift templates:", error);
    return [];
  }
}

// ============ EMPLOYEE AVAILABILITY ============

export async function setEmployeeAvailability(availability: InsertEmployeeAvailability) {
  const db = await getDb();
  if (!db) return false;

  try {
    // Delete existing availability for this employee and day
    await db
      .delete(employeeAvailability)
      .where(
        and(
          eq(employeeAvailability.employeeId, availability.employeeId),
          eq(employeeAvailability.dayOfWeek, availability.dayOfWeek)
        )
      );

    // Insert new availability
    await db.insert(employeeAvailability).values(availability);
    return true;
  } catch (error) {
    console.error("Failed to set employee availability:", error);
    return false;
  }
}

export async function getEmployeeAvailability(employeeId: number) {
  const db = await getDb();
  if (!db) return [];

  try {
    return await db
      .select()
      .from(employeeAvailability)
      .where(eq(employeeAvailability.employeeId, employeeId));
  } catch (error) {
    console.error("Failed to get employee availability:", error);
    return [];
  }
}

// ============ COMPLIANCE & AUDIT TRAIL ============

export async function logComplianceAudit(audit: InsertComplianceAuditTrail) {
  const db = await getDb();
  if (!db) return false;

  try {
    await db.insert(complianceAuditTrail).values(audit);
    return true;
  } catch (error) {
    console.error("Failed to log compliance audit:", error);
    return false;
  }
}

export async function getComplianceAudits(employeeId: number, startDate: Date, endDate: Date) {
  const db = await getDb();
  if (!db) return [];

  try {
    return await db
      .select()
      .from(complianceAuditTrail)
      .where(
        and(
          eq(complianceAuditTrail.employeeId, employeeId),
          gte(complianceAuditTrail.auditDate, startDate),
          lte(complianceAuditTrail.auditDate, endDate)
        )
      );
  } catch (error) {
    console.error("Failed to get compliance audits:", error);
    return [];
  }
}

// ============ BREAK TRACKING ============

export async function recordBreak(breakRecord: InsertBreakRecord) {
  const db = await getDb();
  if (!db) return false;

  try {
    await db.insert(breakRecords).values(breakRecord);
    return true;
  } catch (error) {
    console.error("Failed to record break:", error);
    return false;
  }
}

export async function getBreakRules(jurisdiction: string) {
  const db = await getDb();
  if (!db) return [];

  try {
    return await db
      .select()
      .from(breakRules)
      .where(eq(breakRules.jurisdiction, jurisdiction));
  } catch (error) {
    console.error("Failed to get break rules:", error);
    return [];
  }
}

// ============ OFFLINE SYNC ============

export async function cacheOfflineEntry(cache: InsertTimesheetOfflineCache) {
  const db = await getDb();
  if (!db) return false;

  try {
    await db.insert(timesheetOfflineCache).values(cache);
    return true;
  } catch (error) {
    console.error("Failed to cache offline entry:", error);
    return false;
  }
}

export async function getPendingOfflineEntries(employeeId: number) {
  const db = await getDb();
  if (!db) return [];

  try {
    return await db
      .select()
      .from(timesheetOfflineCache)
      .where(
        and(
          eq(timesheetOfflineCache.employeeId, employeeId),
          eq(timesheetOfflineCache.syncStatus, "pending")
        )
      );
  } catch (error) {
    console.error("Failed to get pending offline entries:", error);
    return [];
  }
}

export async function updateOfflineSyncStatus(id: number, status: string, syncedAt?: Date) {
  const db = await getDb();
  if (!db) return false;

  try {
    await db
      .update(timesheetOfflineCache)
      .set({
        syncStatus: status as any,
        syncedAt: syncedAt,
        updatedAt: new Date(),
      })
      .where(eq(timesheetOfflineCache.id, id));
    return true;
  } catch (error) {
    console.error("Failed to update offline sync status:", error);
    return false;
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
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(jobSites).values({
    projectId: input.projectId,
    name: input.name,
    description: input.description,
    latitude: input.latitude.toString() as any,
    longitude: input.longitude.toString() as any,
    geofenceRadius: input.geofenceRadius || 100,
    address: input.address,
    createdBy: input.createdBy,
  });

  return result[0].insertId;
}

export async function getJobSites(projectId?: number) {
  const db = await getDb();
  if (!db) return [];

  if (projectId) {
    return await db.select().from(jobSites).where(eq(jobSites.projectId, projectId));
  }

  return await db.select().from(jobSites);
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
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(locationLogs).values({
    shiftId: input.shiftId,
    employeeId: input.employeeId,
    jobSiteId: input.jobSiteId,
    eventType: input.eventType,
    latitude: input.latitude.toString() as any,
    longitude: input.longitude.toString() as any,
    accuracy: input.accuracy,
    isWithinGeofence: input.isWithinGeofence,
    distanceFromGeofence: input.distanceFromGeofence,
    deviceId: input.deviceId,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
  });

  return result[0].insertId;
}

export async function recordGeofenceViolation(input: {
  locationLogId: number;
  employeeId: number;
  jobSiteId: number;
  violationType: "outside_geofence" | "check_in_outside" | "check_out_outside";
  distanceFromGeofence: number;
  severity?: "warning" | "violation";
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(geofenceViolations).values({
    locationLogId: input.locationLogId,
    employeeId: input.employeeId,
    jobSiteId: input.jobSiteId,
    violationType: input.violationType,
    distanceFromGeofence: input.distanceFromGeofence,
    severity: input.severity || "warning",
  });

  return result[0].insertId;
}

export async function getLocationHistory(employeeId: number, limit: number = 50) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(locationLogs)
    .where(eq(locationLogs.employeeId, employeeId))
    .orderBy(desc(locationLogs.timestamp))
    .limit(limit);
}

export async function getGeofenceViolations(employeeId?: number, resolved?: boolean) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [];

  if (employeeId) {
    conditions.push(eq(geofenceViolations.employeeId, employeeId));
  }

  if (resolved !== undefined) {
    conditions.push(eq(geofenceViolations.isResolved, resolved));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  return await db
    .select()
    .from(geofenceViolations)
    .where(whereClause)
    .orderBy(desc(geofenceViolations.timestamp))
}

export async function resolveGeofenceViolation(violationId: number, resolvedBy: number, notes?: string) {
  const db = await getDb();
  if (!db) return false;

  try {
    await db
      .update(geofenceViolations)
      .set({
        isResolved: true,
        resolvedBy,
        resolutionNotes: notes,
        resolvedAt: new Date(),
      })
      .where(eq(geofenceViolations.id, violationId));

    return true;
  } catch (error) {
    console.error("Failed to resolve geofence violation:", error);
    return false;
  }
}


export async function getShiftById(id: number) {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db.select().from(shifts).where(eq(shifts.id, id)).limit(1);
    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error("Failed to get shift by id:", error);
    return null;
  }
}

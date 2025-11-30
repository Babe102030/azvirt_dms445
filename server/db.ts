import { eq, desc, like, and, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, users, 
  documents, InsertDocument,
  projects, InsertProject,
  materials, InsertMaterial,
  deliveries, InsertDelivery,
  qualityTests, InsertQualityTest,
  employees, InsertEmployee,
  workHours, InsertWorkHour,
  concreteBases, InsertConcreteBase,
  machines, InsertMachine,
  machineMaintenance, InsertMachineMaintenance,
  machineWorkHours, InsertMachineWorkHour,
  aggregateInputs, InsertAggregateInput
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Documents
export async function createDocument(doc: InsertDocument) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(documents).values(doc);
  return result;
}

export async function getDocuments(filters?: { projectId?: number; category?: string; search?: string }) {
  const db = await getDb();
  if (!db) return [];

  let conditions: any[] = [];
  
  if (filters?.projectId) {
    conditions.push(eq(documents.projectId, filters.projectId));
  }
  
  if (filters?.category) {
    conditions.push(eq(documents.category, filters.category as any));
  }
  
  if (filters?.search) {
    conditions.push(
      or(
        like(documents.name, `%${filters.search}%`),
        like(documents.description, `%${filters.search}%`)
      )
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  
  const result = await db
    .select()
    .from(documents)
    .where(whereClause)
    .orderBy(desc(documents.createdAt));
    
  return result;
}

export async function getDocumentById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(documents).where(eq(documents.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function deleteDocument(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(documents).where(eq(documents.id, id));
}

// Projects
export async function createProject(project: InsertProject) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(projects).values(project);
  return result;
}

export async function getProjects() {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db.select().from(projects).orderBy(desc(projects.createdAt));
  return result;
}

export async function getProjectById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateProject(id: number, data: Partial<InsertProject>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(projects).set(data).where(eq(projects.id, id));
}

// Materials
export async function createMaterial(material: InsertMaterial) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(materials).values(material);
  return result;
}

export async function getMaterials() {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db.select().from(materials).orderBy(materials.name);
  return result;
}

export async function updateMaterial(id: number, data: Partial<InsertMaterial>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(materials).set(data).where(eq(materials.id, id));
}

export async function deleteMaterial(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(materials).where(eq(materials.id, id));
}

// Deliveries
export async function createDelivery(delivery: InsertDelivery) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(deliveries).values(delivery);
  return result;
}

export async function getDeliveries(filters?: { projectId?: number; status?: string }) {
  const db = await getDb();
  if (!db) return [];

  let conditions: any[] = [];
  
  if (filters?.projectId) {
    conditions.push(eq(deliveries.projectId, filters.projectId));
  }
  
  if (filters?.status) {
    conditions.push(eq(deliveries.status, filters.status as any));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  
  const result = await db
    .select()
    .from(deliveries)
    .where(whereClause)
    .orderBy(desc(deliveries.scheduledTime));
    
  return result;
}

export async function updateDelivery(id: number, data: Partial<InsertDelivery>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(deliveries).set(data).where(eq(deliveries.id, id));
}

// Quality Tests
export async function createQualityTest(test: InsertQualityTest) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(qualityTests).values(test);
  return result;
}

export async function getQualityTests(filters?: { projectId?: number; deliveryId?: number }) {
  const db = await getDb();
  if (!db) return [];

  let conditions: any[] = [];
  
  if (filters?.projectId) {
    conditions.push(eq(qualityTests.projectId, filters.projectId));
  }
  
  if (filters?.deliveryId) {
    conditions.push(eq(qualityTests.deliveryId, filters.deliveryId));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  
  const result = await db
    .select()
    .from(qualityTests)
    .where(whereClause)
    .orderBy(desc(qualityTests.createdAt));
    
  return result;
}

export async function updateQualityTest(id: number, data: Partial<InsertQualityTest>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(qualityTests).set(data).where(eq(qualityTests.id, id));
}

// ============ Employees ============
export async function createEmployee(employee: InsertEmployee) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(employees).values(employee);
  return result;
}

export async function getEmployees(filters?: { department?: string; status?: string }) {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [];
  if (filters?.department) {
    conditions.push(eq(employees.department, filters.department as any));
  }
  if (filters?.status) {
    conditions.push(eq(employees.status, filters.status as any));
  }
  
  const result = conditions.length > 0
    ? await db.select().from(employees).where(and(...conditions)).orderBy(desc(employees.createdAt))
    : await db.select().from(employees).orderBy(desc(employees.createdAt));
  
  return result;
}

export async function getEmployeeById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(employees).where(eq(employees.id, id)).limit(1);
  return result[0];
}

export async function updateEmployee(id: number, data: Partial<InsertEmployee>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(employees).set(data).where(eq(employees.id, id));
}

export async function deleteEmployee(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(employees).where(eq(employees.id, id));
}

// ============ Work Hours ============
export async function createWorkHour(workHour: InsertWorkHour) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(workHours).values(workHour);
  return result;
}

export async function getWorkHours(filters?: { employeeId?: number; projectId?: number; status?: string }) {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [];
  if (filters?.employeeId) {
    conditions.push(eq(workHours.employeeId, filters.employeeId));
  }
  if (filters?.projectId) {
    conditions.push(eq(workHours.projectId, filters.projectId));
  }
  if (filters?.status) {
    conditions.push(eq(workHours.status, filters.status as any));
  }
  
  const result = conditions.length > 0
    ? await db.select().from(workHours).where(and(...conditions)).orderBy(desc(workHours.date))
    : await db.select().from(workHours).orderBy(desc(workHours.date));
  
  return result;
}

export async function updateWorkHour(id: number, data: Partial<InsertWorkHour>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(workHours).set(data).where(eq(workHours.id, id));
}

// ============ Concrete Bases ============
export async function createConcreteBase(base: InsertConcreteBase) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(concreteBases).values(base);
  return result;
}

export async function getConcreteBases() {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(concreteBases).orderBy(desc(concreteBases.createdAt));
}

export async function getConcreteBaseById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(concreteBases).where(eq(concreteBases.id, id)).limit(1);
  return result[0];
}

export async function updateConcreteBase(id: number, data: Partial<InsertConcreteBase>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(concreteBases).set(data).where(eq(concreteBases.id, id));
}

// ============ Machines ============
export async function createMachine(machine: InsertMachine) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(machines).values(machine);
  return result;
}

export async function getMachines(filters?: { concreteBaseId?: number; type?: string; status?: string }) {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [];
  if (filters?.concreteBaseId) {
    conditions.push(eq(machines.concreteBaseId, filters.concreteBaseId));
  }
  if (filters?.type) {
    conditions.push(eq(machines.type, filters.type as any));
  }
  if (filters?.status) {
    conditions.push(eq(machines.status, filters.status as any));
  }
  
  const result = conditions.length > 0
    ? await db.select().from(machines).where(and(...conditions)).orderBy(desc(machines.createdAt))
    : await db.select().from(machines).orderBy(desc(machines.createdAt));
  
  return result;
}

export async function getMachineById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(machines).where(eq(machines.id, id)).limit(1);
  return result[0];
}

export async function updateMachine(id: number, data: Partial<InsertMachine>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(machines).set(data).where(eq(machines.id, id));
}

export async function deleteMachine(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(machines).where(eq(machines.id, id));
}

// ============ Machine Maintenance ============
export async function createMachineMaintenance(maintenance: InsertMachineMaintenance) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(machineMaintenance).values(maintenance);
  return result;
}

export async function getMachineMaintenance(filters?: { machineId?: number; maintenanceType?: string }) {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [];
  if (filters?.machineId) {
    conditions.push(eq(machineMaintenance.machineId, filters.machineId));
  }
  if (filters?.maintenanceType) {
    conditions.push(eq(machineMaintenance.maintenanceType, filters.maintenanceType as any));
  }
  
  const result = conditions.length > 0
    ? await db.select().from(machineMaintenance).where(and(...conditions)).orderBy(desc(machineMaintenance.date))
    : await db.select().from(machineMaintenance).orderBy(desc(machineMaintenance.date));
  
  return result;
}

// ============ Machine Work Hours ============
export async function createMachineWorkHour(workHour: InsertMachineWorkHour) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(machineWorkHours).values(workHour);
  return result;
}

export async function getMachineWorkHours(filters?: { machineId?: number; projectId?: number }) {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [];
  if (filters?.machineId) {
    conditions.push(eq(machineWorkHours.machineId, filters.machineId));
  }
  if (filters?.projectId) {
    conditions.push(eq(machineWorkHours.projectId, filters.projectId));
  }
  
  const result = conditions.length > 0
    ? await db.select().from(machineWorkHours).where(and(...conditions)).orderBy(desc(machineWorkHours.date))
    : await db.select().from(machineWorkHours).orderBy(desc(machineWorkHours.date));
  
  return result;
}

// ============ Aggregate Inputs ============
export async function createAggregateInput(input: InsertAggregateInput) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(aggregateInputs).values(input);
  return result;
}

export async function getAggregateInputs(filters?: { concreteBaseId?: number; materialType?: string }) {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [];
  if (filters?.concreteBaseId) {
    conditions.push(eq(aggregateInputs.concreteBaseId, filters.concreteBaseId));
  }
  if (filters?.materialType) {
    conditions.push(eq(aggregateInputs.materialType, filters.materialType as any));
  }
  
  const result = conditions.length > 0
    ? await db.select().from(aggregateInputs).where(and(...conditions)).orderBy(desc(aggregateInputs.date))
    : await db.select().from(aggregateInputs).orderBy(desc(aggregateInputs.date));
  
  return result;
}

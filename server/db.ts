import { eq, desc, like, and, or, gte, lt, sql } from "drizzle-orm";
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
  aggregateInputs, InsertAggregateInput,
  materialConsumptionLog, InsertMaterialConsumptionLog,
  purchaseOrders, InsertPurchaseOrder,
  forecastPredictions, InsertForecastPrediction,
  aiConversations,
  aiMessages,
  aiModels,
  reportSettings,
  reportRecipients,
  emailBranding
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

export async function getFailedQualityTests(days: number = 30) {
  const db = await getDb();
  if (!db) return [];

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const result = await db
    .select()
    .from(qualityTests)
    .where(
      and(
        eq(qualityTests.status, 'fail'),
        gte(qualityTests.createdAt, cutoffDate)
      )
    )
    .orderBy(desc(qualityTests.createdAt));

  return result;
}

export async function getQualityTestTrends(days: number = 30) {
  const db = await getDb();
  if (!db) return { passRate: 0, failRate: 0, pendingRate: 0, totalTests: 0, byType: [] };

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const allTests = await db
    .select()
    .from(qualityTests)
    .where(gte(qualityTests.createdAt, cutoffDate));

  const totalTests = allTests.length;
  if (totalTests === 0) {
    return { passRate: 0, failRate: 0, pendingRate: 0, totalTests: 0, byType: [] };
  }

  const passCount = allTests.filter(t => t.status === 'pass').length;
  const failCount = allTests.filter(t => t.status === 'fail').length;
  const pendingCount = allTests.filter(t => t.status === 'pending').length;

  const byType = [
    { type: 'slump', total: allTests.filter(t => t.testType === 'slump').length },
    { type: 'strength', total: allTests.filter(t => t.testType === 'strength').length },
    { type: 'air_content', total: allTests.filter(t => t.testType === 'air_content').length },
    { type: 'temperature', total: allTests.filter(t => t.testType === 'temperature').length },
    { type: 'other', total: allTests.filter(t => t.testType === 'other').length },
  ];

  return {
    passRate: (passCount / totalTests) * 100,
    failRate: (failCount / totalTests) * 100,
    pendingRate: (pendingCount / totalTests) * 100,
    totalTests,
    byType,
  };
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

export async function getWeeklyTimesheetSummary(employeeId: number | undefined, weekStart: Date) {
  const db = await getDb();
  if (!db) return [];

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  let query = db
    .select({
      employeeId: workHours.employeeId,
      employeeName: sql<string>`CONCAT(${employees.firstName}, ' ', ${employees.lastName})`,
      employeeNumber: employees.employeeNumber,
      totalHours: sql<number>`SUM(${workHours.hoursWorked})`,
      regularHours: sql<number>`SUM(CASE WHEN ${workHours.workType} = 'regular' THEN ${workHours.hoursWorked} ELSE 0 END)`,
      overtimeHours: sql<number>`SUM(${workHours.overtimeHours})`,
      weekendHours: sql<number>`SUM(CASE WHEN ${workHours.workType} = 'weekend' THEN ${workHours.hoursWorked} ELSE 0 END)`,
      holidayHours: sql<number>`SUM(CASE WHEN ${workHours.workType} = 'holiday' THEN ${workHours.hoursWorked} ELSE 0 END)`,
      daysWorked: sql<number>`COUNT(DISTINCT DATE(${workHours.date}))`,
    })
    .from(workHours)
    .innerJoin(employees, eq(workHours.employeeId, employees.id))
    .where(
      and(
        gte(workHours.date, weekStart),
        lt(workHours.date, weekEnd),
        eq(workHours.status, "approved"),
        employeeId ? eq(workHours.employeeId, employeeId) : undefined
      )
    )
    .groupBy(workHours.employeeId, employees.firstName, employees.lastName, employees.employeeNumber);

  return await query;
}

export async function getMonthlyTimesheetSummary(employeeId: number | undefined, year: number, month: number) {
  const db = await getDb();
  if (!db) return [];

  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 1);

  let query = db
    .select({
      employeeId: workHours.employeeId,
      employeeName: sql<string>`CONCAT(${employees.firstName}, ' ', ${employees.lastName})`,
      employeeNumber: employees.employeeNumber,
      department: employees.department,
      hourlyRate: employees.hourlyRate,
      totalHours: sql<number>`SUM(${workHours.hoursWorked})`,
      regularHours: sql<number>`SUM(CASE WHEN ${workHours.workType} = 'regular' THEN ${workHours.hoursWorked} ELSE 0 END)`,
      overtimeHours: sql<number>`SUM(${workHours.overtimeHours})`,
      weekendHours: sql<number>`SUM(CASE WHEN ${workHours.workType} = 'weekend' THEN ${workHours.hoursWorked} ELSE 0 END)`,
      holidayHours: sql<number>`SUM(CASE WHEN ${workHours.workType} = 'holiday' THEN ${workHours.hoursWorked} ELSE 0 END)`,
      daysWorked: sql<number>`COUNT(DISTINCT DATE(${workHours.date}))`,
    })
    .from(workHours)
    .innerJoin(employees, eq(workHours.employeeId, employees.id))
    .where(
      and(
        gte(workHours.date, monthStart),
        lt(workHours.date, monthEnd),
        eq(workHours.status, "approved"),
        employeeId ? eq(workHours.employeeId, employeeId) : undefined
      )
    )
    .groupBy(workHours.employeeId, employees.firstName, employees.lastName, employees.employeeNumber, employees.department, employees.hourlyRate);

  return await query;
}

export async function getLowStockMaterials() {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(materials)
    .where(sql`${materials.quantity} <= ${materials.minStock}`);
}


export async function getCriticalStockMaterials() {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(materials)
    .where(sql`${materials.quantity} <= ${materials.criticalThreshold} AND ${materials.criticalThreshold} > 0`);
}

export async function getAdminUsersWithSMS() {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(users)
    .where(and(
      eq(users.role, 'admin'),
      eq(users.smsNotificationsEnabled, true),
      sql`${users.phoneNumber} IS NOT NULL`
    ));
}

export async function updateUserSMSSettings(userId: number, phoneNumber: string, enabled: boolean) {
  const db = await getDb();
  if (!db) return false;

  try {
    await db
      .update(users)
      .set({
        phoneNumber,
        smsNotificationsEnabled: enabled,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
    return true;
  } catch (error) {
    console.error("Failed to update SMS settings:", error);
    return false;
  }
}


// Material Consumption Tracking
export async function recordConsumption(consumption: InsertMaterialConsumptionLog) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.insert(materialConsumptionLog).values(consumption);
  
  // Update material quantity
  if (consumption.materialId) {
    const currentMaterials = await getMaterials();
    const material = currentMaterials.find(m => m.id === consumption.materialId);
    if (material) {
      await updateMaterial(consumption.materialId, {
        quantity: Math.max(0, material.quantity - consumption.quantity)
      });
    }
  }
}

export async function getConsumptionHistory(materialId?: number, days: number = 30) {
  const db = await getDb();
  if (!db) return [];
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  let query = db.select().from(materialConsumptionLog);
  
  if (materialId) {
    query = query.where(eq(materialConsumptionLog.materialId, materialId)) as any;
  }
  
  const result = await query.orderBy(desc(materialConsumptionLog.consumptionDate));
  return result;
}

export async function calculateDailyConsumptionRate(materialId: number, days: number = 30) {
  const db = await getDb();
  if (!db) return 0;
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  const consumptions = await db
    .select()
    .from(materialConsumptionLog)
    .where(eq(materialConsumptionLog.materialId, materialId));
  
  if (consumptions.length === 0) return 0;
  
  const totalConsumed = consumptions.reduce((sum, c) => sum + c.quantity, 0);
  const uniqueDays = new Set(consumptions.map(c => 
    new Date(c.consumptionDate).toDateString()
  )).size;
  
  return uniqueDays > 0 ? totalConsumed / uniqueDays : 0;
}

// Forecasting & Predictions
export async function generateForecastPredictions() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const allMaterials = await getMaterials();
  const predictions: InsertForecastPrediction[] = [];
  
  for (const material of allMaterials) {
    const dailyRate = await calculateDailyConsumptionRate(material.id, 30);
    
    if (dailyRate > 0) {
      const daysUntilStockout = Math.floor(material.quantity / dailyRate);
      const predictedRunoutDate = new Date();
      predictedRunoutDate.setDate(predictedRunoutDate.getDate() + daysUntilStockout);
      
      // Calculate recommended order quantity (2 weeks supply + buffer)
      const recommendedOrderQty = Math.ceil(dailyRate * 14 * 1.2);
      
      // Simple confidence based on data availability
      const consumptions = await getConsumptionHistory(material.id, 30);
      const confidence = Math.min(95, consumptions.length * 3);
      
      predictions.push({
        materialId: material.id,
        materialName: material.name,
        currentStock: material.quantity,
        dailyConsumptionRate: Math.round(dailyRate),
        predictedRunoutDate,
        daysUntilStockout,
        recommendedOrderQty,
        confidence,
        calculatedAt: new Date(),
      });
    }
  }
  
  // Clear old predictions and insert new ones
  await db.delete(forecastPredictions);
  if (predictions.length > 0) {
    await db.insert(forecastPredictions).values(predictions);
  }
  
  return predictions;
}

export async function getForecastPredictions() {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(forecastPredictions).orderBy(forecastPredictions.daysUntilStockout);
}

// Purchase Orders
export async function createPurchaseOrder(order: InsertPurchaseOrder) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.insert(purchaseOrders).values(order);
}

export async function getPurchaseOrders(filters?: { status?: string; materialId?: number }) {
  const db = await getDb();
  if (!db) return [];
  
  let conditions: any[] = [];
  
  if (filters?.status) {
    conditions.push(eq(purchaseOrders.status, filters.status as any));
  }
  
  if (filters?.materialId) {
    conditions.push(eq(purchaseOrders.materialId, filters.materialId));
  }
  
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  
  return await db
    .select()
    .from(purchaseOrders)
    .where(whereClause)
    .orderBy(desc(purchaseOrders.createdAt));
}

export async function updatePurchaseOrder(id: number, data: Partial<InsertPurchaseOrder>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(purchaseOrders).set(data).where(eq(purchaseOrders.id, id));
}


// Report Settings
export async function getReportSettings(userId: number) {
  const db = await getDb();
  if (!db) return null;
  
  const results = await db.select().from(reportSettings).where(eq(reportSettings.userId, userId)).limit(1);
  return results[0] || null;
}

export async function upsertReportSettings(data: {
  userId: number;
  includeProduction?: boolean;
  includeDeliveries?: boolean;
  includeMaterials?: boolean;
  includeQualityControl?: boolean;
  reportTime?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const existing = await getReportSettings(data.userId);
  
  if (existing) {
    await db.update(reportSettings)
      .set({
        includeProduction: data.includeProduction ?? existing.includeProduction,
        includeDeliveries: data.includeDeliveries ?? existing.includeDeliveries,
        includeMaterials: data.includeMaterials ?? existing.includeMaterials,
        includeQualityControl: data.includeQualityControl ?? existing.includeQualityControl,
        reportTime: data.reportTime ?? existing.reportTime,
        updatedAt: new Date(),
      })
      .where(eq(reportSettings.id, existing.id));
    return existing.id;
  } else {
    await db.insert(reportSettings).values({
      userId: data.userId,
      includeProduction: data.includeProduction ?? true,
      includeDeliveries: data.includeDeliveries ?? true,
      includeMaterials: data.includeMaterials ?? true,
      includeQualityControl: data.includeQualityControl ?? true,
      reportTime: data.reportTime ?? '18:00',
    });
    return 0; // MySQL doesn't support returning()
  }
}

// Report Recipients
export async function getReportRecipients() {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(reportRecipients).where(eq(reportRecipients.active, true));
}

export async function getAllReportRecipients() {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(reportRecipients).orderBy(desc(reportRecipients.createdAt));
}

export async function addReportRecipient(email: string, name?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.insert(reportRecipients).values({
    email,
    name: name || null,
    active: true,
  });
  return 0;
}

export async function removeReportRecipient(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(reportRecipients)
    .set({ active: false })
    .where(eq(reportRecipients.id, id));
}


// Email Templates
export async function getEmailTemplates() {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(emailTemplates).where(eq(emailTemplates.isActive, true));
}

export async function getEmailTemplateByType(type: string) {
  const db = await getDb();
  if (!db) return null;
  
  const results = await db.select().from(emailTemplates).where(eq(emailTemplates.type, type)).limit(1);
  return results[0] || null;
}

export async function upsertEmailTemplate(data: {
  name: string;
  type: string;
  subject: string;
  htmlTemplate: string;
  variables?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const existing = await getEmailTemplateByType(data.type);
  
  if (existing) {
    await db.update(emailTemplates)
      .set({
        name: data.name,
        subject: data.subject,
        htmlTemplate: data.htmlTemplate,
        variables: data.variables,
        updatedAt: new Date(),
      })
      .where(eq(emailTemplates.id, existing.id));
    return existing.id;
  } else {
    await db.insert(emailTemplates).values({
      name: data.name,
      type: data.type,
      subject: data.subject,
      htmlTemplate: data.htmlTemplate,
      variables: data.variables,
      isActive: true,
    });
    return 0;
  }
}

// Email Branding
export async function getEmailBranding() {
  const db = await getDb();
  if (!db) return null;
  
  const results = await db.select().from(emailBranding).limit(1);
  return results[0] || null;
}

export async function upsertEmailBranding(data: {
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  companyName?: string;
  footerText?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const existing = await getEmailBranding();
  
  if (existing) {
    await db.update(emailBranding)
      .set({
        logoUrl: data.logoUrl ?? existing.logoUrl,
        primaryColor: data.primaryColor ?? existing.primaryColor,
        secondaryColor: data.secondaryColor ?? existing.secondaryColor,
        companyName: data.companyName ?? existing.companyName,
        footerText: data.footerText ?? existing.footerText,
        updatedAt: new Date(),
      })
      .where(eq(emailBranding.id, existing.id));
    return existing.id;
  } else {
    await db.insert(emailBranding).values({
      logoUrl: data.logoUrl || null,
      primaryColor: data.primaryColor || "#f97316",
      secondaryColor: data.secondaryColor || "#ea580c",
      companyName: data.companyName || "AzVirt",
      footerText: data.footerText || null,
    });
    return 0;
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

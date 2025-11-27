import { eq, desc, like, and, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, users, 
  documents, InsertDocument,
  projects, InsertProject,
  materials, InsertMaterial,
  deliveries, InsertDelivery,
  qualityTests, InsertQualityTest
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

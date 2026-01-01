import { getDb } from "../db";
import { mixingLogs, batchIngredients, materials, type InsertMixingLog, type InsertBatchIngredient } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";

/**
 * Get all mixing logs with optional filtering
 */
export async function getAllMixingLogs(filters?: {
  status?: string;
  projectId?: number;
  deliveryId?: number;
}) {
  const db = await getDb();
  if (!db) return [];

  try {
    let query = db.select().from(mixingLogs);

    if (filters?.status) {
      query = query.where(eq(mixingLogs.status, filters.status as any));
    }
    if (filters?.projectId) {
      query = query.where(eq(mixingLogs.projectId, filters.projectId));
    }
    if (filters?.deliveryId) {
      query = query.where(eq(mixingLogs.deliveryId, filters.deliveryId));
    }

    return await query.orderBy(desc(mixingLogs.createdAt));
  } catch (error) {
    console.error("Failed to get mixing logs:", error);
    return [];
  }
}

/**
 * Get a single mixing log with its ingredients
 */
export async function getMixingLogById(id: number) {
  const db = await getDb();
  if (!db) return null;

  try {
    const logs = await db.select().from(mixingLogs).where(eq(mixingLogs.id, id));
    const log = logs[0];
    if (!log) return null;

    const ingredients = await db
      .select()
      .from(batchIngredients)
      .where(eq(batchIngredients.batchId, id));

    return {
      ...log,
      ingredients,
    };
  } catch (error) {
    console.error("Failed to get mixing log:", error);
    return null;
  }
}

/**
 * Generate next batch number
 */
export async function generateBatchNumber(): Promise<string> {
  const db = await getDb();
  if (!db) return `BATCH-${new Date().getFullYear()}-001`;

  try {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");

    // Get the count of batches created today
    const result = await db
      .select()
      .from(mixingLogs)
      .where(eq(mixingLogs.batchNumber, `BATCH-${year}${month}${day}-%`));

    const count = result.length + 1;
    return `BATCH-${year}${month}${day}-${String(count).padStart(3, "0")}`;
  } catch (error) {
    console.error("Failed to generate batch number:", error);
    return `BATCH-${new Date().getFullYear()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Create a new mixing log with ingredients
 */
export async function createMixingLog(
  log: InsertMixingLog,
  ingredients: InsertBatchIngredient[]
) {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db.insert(mixingLogs).values(log);
    const batchId = result[0].insertId;

    // Insert ingredients
    for (const ingredient of ingredients) {
      await db.insert(batchIngredients).values({
        ...ingredient,
        batchId,
      });
    }

    return batchId;
  } catch (error) {
    console.error("Failed to create mixing log:", error);
    return null;
  }
}

/**
 * Update mixing log status
 */
export async function updateMixingLogStatus(
  id: number,
  status: "planned" | "in_progress" | "completed" | "rejected",
  updates?: { endTime?: Date; approvedBy?: number; qualityNotes?: string }
) {
  const db = await getDb();
  if (!db) return false;

  try {
    const updateData: any = {
      status,
      updatedAt: new Date(),
    };
    
    if (updates?.endTime) updateData.endTime = updates.endTime;
    if (updates?.approvedBy) updateData.approvedBy = updates.approvedBy;
    if (updates?.qualityNotes) updateData.qualityNotes = updates.qualityNotes;
    
    await db
      .update(mixingLogs)
      .set(updateData)
      .where(eq(mixingLogs.id, id));

    return true;
  } catch (error) {
    console.error("Failed to update mixing log status:", error);
    return false;
  }
}

/**
 * Deduct materials from inventory for a batch
 */
export async function deductMaterialsFromInventory(batchId: number) {
  const db = await getDb();
  if (!db) return false;

  try {
    // Get batch ingredients
    const ingredients = await db
      .select()
      .from(batchIngredients)
      .where(eq(batchIngredients.batchId, batchId));

    // Deduct each material from inventory
    for (const ingredient of ingredients) {
      if (ingredient.materialId && !ingredient.inventoryDeducted) {
        // Use planned quantity if actual quantity is not set
        const quantityToDeduct = ingredient.actualQuantity || ingredient.plannedQuantity;
        
        // Get current material quantity
        const materialResult = await db
          .select()
          .from(materials)
          .where(eq(materials.id, ingredient.materialId));

        if (materialResult.length > 0) {
          const material = materialResult[0];
          const newQuantity = material.quantity - quantityToDeduct;

          // Update material quantity
          await db
            .update(materials)
            .set({ quantity: newQuantity })
            .where(eq(materials.id, ingredient.materialId));

          // Mark ingredient as deducted
          await db
            .update(batchIngredients)
            .set({ inventoryDeducted: true })
            .where(eq(batchIngredients.id, ingredient.id));
        }
      }
    }

    return true;
  } catch (error) {
    console.error("Failed to deduct materials from inventory:", error);
    return false;
  }
}

/**
 * Get batch ingredients with material details
 */
export async function getBatchIngredientsWithDetails(batchId: number) {
  const db = await getDb();
  if (!db) return [];

  try {
    return await db
      .select()
      .from(batchIngredients)
      .where(eq(batchIngredients.batchId, batchId));
  } catch (error) {
    console.error("Failed to get batch ingredients:", error);
    return [];
  }
}

/**
 * Get production summary for a date range
 */
export async function getProductionSummary(startDate: Date, endDate: Date) {
  const db = await getDb();
  if (!db) return null;

  try {
    const logs = await db
      .select()
      .from(mixingLogs)
      .where(
        eq(mixingLogs.status, "completed")
      );

    const filtered = logs.filter(
      (log) =>
        log.createdAt >= startDate &&
        log.createdAt <= endDate
    );

    const totalVolume = filtered.reduce((sum, log) => sum + parseFloat(log.volumeM3 as any), 0);
    const totalBatches = filtered.length;
    const avgVolumePerBatch = totalBatches > 0 ? totalVolume / totalBatches : 0;

    return {
      totalBatches,
      totalVolume,
      avgVolumePerBatch,
      batches: filtered,
    };
  } catch (error) {
    console.error("Failed to get production summary:", error);
    return null;
  }
}

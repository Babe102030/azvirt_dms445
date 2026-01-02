import { getDb } from "../db";
import { mixingLogs, batchIngredients, materials } from "../../drizzle/schema";
import { eq, gte, lte, desc, sql } from "drizzle-orm";

/**
 * Get daily batch production volume for the last N days
 */
export async function getDailyProductionVolume(days: number = 30) {
  const db = await getDb();
  if (!db) return [];

  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const batches = await db
      .select()
      .from(mixingLogs)
      .where(
        lte(mixingLogs.createdAt, new Date()) &&
        gte(mixingLogs.createdAt, startDate)
      )
      .orderBy(mixingLogs.createdAt);

    // Group by date and sum volumes
    const volumeByDate: Record<string, { date: string; volume: number; count: number }> = {};

    for (const batch of batches) {
      const dateStr = batch.createdAt.toISOString().split("T")[0];
      if (!volumeByDate[dateStr]) {
        volumeByDate[dateStr] = { date: dateStr, volume: 0, count: 0 };
      }
      volumeByDate[dateStr].volume += batch.volume || 0;
      volumeByDate[dateStr].count += 1;
    }

    return Object.values(volumeByDate).sort((a, b) => a.date.localeCompare(b.date));
  } catch (error) {
    console.error("Failed to get daily production volume:", error);
    return [];
  }
}

/**
 * Get material consumption trends for the last N days
 */
export async function getMaterialConsumptionTrends(days: number = 30) {
  const db = await getDb();
  if (!db) return [];

  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get completed batches
    const completedBatches = await db
      .select()
      .from(mixingLogs)
      .where(
        eq(mixingLogs.status, "completed") &&
        lte(mixingLogs.createdAt, new Date()) &&
        gte(mixingLogs.createdAt, startDate)
      );

    // Get ingredients for completed batches
    const consumptionByMaterial: Record<number, { materialId: number; totalQuantity: number; unit: string; name: string }> = {};

    for (const batch of completedBatches) {
      const ingredients = await db
        .select()
        .from(batchIngredients)
        .where(eq(batchIngredients.batchId, batch.id));

      for (const ingredient of ingredients) {
        if (ingredient.materialId) {
          if (!consumptionByMaterial[ingredient.materialId]) {
            // Get material info
            const materialInfo = await db
              .select()
              .from(materials)
              .where(eq(materials.id, ingredient.materialId));

            const material = materialInfo[0];
            consumptionByMaterial[ingredient.materialId] = {
              materialId: ingredient.materialId,
              totalQuantity: 0,
              unit: material?.unit || "kg",
              name: material?.name || "Unknown",
            };
          }
          consumptionByMaterial[ingredient.materialId].totalQuantity += ingredient.plannedQuantity || 0;
        }
      }
    }

    return Object.values(consumptionByMaterial)
      .sort((a: any, b: any) => b.totalQuantity - a.totalQuantity)
      .slice(0, 10); // Top 10 consumed materials
  } catch (error) {
    console.error("Failed to get material consumption trends:", error);
    return [];
  }
}

/**
 * Get production efficiency metrics
 */
export async function getProductionEfficiencyMetrics(days: number = 30) {
  const db = await getDb();
  if (!db) return null;

  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get all batches in the period
    const allBatches = await db
      .select()
      .from(mixingLogs)
      .where(
        lte(mixingLogs.createdAt, new Date()) &&
        gte(mixingLogs.createdAt, startDate)
      );

    const completedBatches = allBatches.filter(b => b.status === "completed");
    const rejectedBatches = allBatches.filter(b => b.status === "rejected");

    // Calculate metrics
    const totalBatches = allBatches.length;
    const successRate = totalBatches > 0 ? (completedBatches.length / totalBatches) * 100 : 0;
    const totalVolume = completedBatches.reduce((sum: number, b: any) => sum + (b.volume || 0), 0);
    const avgBatchVolume = completedBatches.length > 0 ? totalVolume / completedBatches.length : 0;

    // Calculate average batch time (in hours)
    let totalBatchTime = 0;
    let batchesWithTime = 0;

    for (const batch of completedBatches) {
      if (batch.startTime && batch.endTime) {
        const timeMs = batch.endTime.getTime() - batch.startTime.getTime();
        const timeHours = timeMs / (1000 * 60 * 60);
        totalBatchTime += timeHours;
        batchesWithTime += 1;
      }
    }

    const avgBatchTime = batchesWithTime > 0 ? totalBatchTime / batchesWithTime : 0;

    // Calculate utilization (completed batches / all batches)
    const utilization = totalBatches > 0 ? (completedBatches.length / totalBatches) * 100 : 0;

    return {
      totalBatches,
      completedBatches: completedBatches.length,
      rejectedBatches: rejectedBatches.length,
      successRate: Math.round(successRate * 100) / 100,
      totalVolume: Math.round(totalVolume * 100) / 100,
      avgBatchVolume: Math.round(avgBatchVolume * 100) / 100,
      avgBatchTime: Math.round(avgBatchTime * 100) / 100,
      utilization: Math.round(utilization * 100) / 100,
      period: `Last ${days} days`,
    };
  } catch (error) {
    console.error("Failed to get production efficiency metrics:", error);
    return null;
  }
}

/**
 * Get production volume by recipe
 */
export async function getProductionByRecipe(days: number = 30) {
  const db = await getDb();
  if (!db) return [];

  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const batches = await db
      .select()
      .from(mixingLogs)
      .where(
        eq(mixingLogs.status, "completed") &&
        lte(mixingLogs.createdAt, new Date()) &&
        gte(mixingLogs.createdAt, startDate)
      );

    // Group by recipe
    const volumeByRecipe: Record<number, { recipeId: number; recipeName: string; volume: number; count: number }> = {};

    for (const batch of batches) {
      if (batch.recipeId) {
        if (!volumeByRecipe[batch.recipeId]) {
          volumeByRecipe[batch.recipeId] = {
            recipeId: batch.recipeId,
            recipeName: batch.recipeName || "Unknown Recipe",
            volume: 0,
            count: 0,
          };
        }
        volumeByRecipe[batch.recipeId].volume += batch.volume || 0;
        volumeByRecipe[batch.recipeId].count += 1;
      }
    }

    return Object.values(volumeByRecipe)
      .sort((a: any, b: any) => b.volume - a.volume);
  } catch (error) {
    console.error("Failed to get production by recipe:", error);
    return [];
  }
}

/**
 * Get hourly production rate (batches per hour)
 */
export async function getHourlyProductionRate(days: number = 7) {
  const db = await getDb();
  if (!db) return [];

  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const completedBatches = await db
      .select()
      .from(mixingLogs)
      .where(
        eq(mixingLogs.status, "completed") &&
        lte(mixingLogs.createdAt, new Date()) &&
        gte(mixingLogs.createdAt, startDate)
      );

    // Group by hour
    const rateByHour: Record<string, { hour: string; count: number }> = {};

    for (const batch of completedBatches) {
      const hour = batch.createdAt.toISOString().split("T")[0] + " " + 
                   String(batch.createdAt.getHours()).padStart(2, "0") + ":00";
      
      if (!rateByHour[hour]) {
        rateByHour[hour] = { hour, count: 0 };
      }
      rateByHour[hour].count += 1;
    }

    return Object.values(rateByHour)
      .sort((a, b) => a.hour.localeCompare(b.hour));
  } catch (error) {
    console.error("Failed to get hourly production rate:", error);
    return [];
  }
}

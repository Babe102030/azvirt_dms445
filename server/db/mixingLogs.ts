import driver, { getSession, recordToNative } from '../db/neo4j';

// Temporary types
type InsertMixingLog = any;
type InsertBatchIngredient = any;

const recordToObj = recordToNative;

/**
 * Get all mixing logs with optional filtering
 */
export async function getAllMixingLogs(filters?: {
  status?: string;
  projectId?: number;
  deliveryId?: number;
}) {
  const session = getSession();
  try {
    let query = `MATCH (m:MixingLog)`;
    let whereClauses = [];
    let params: any = {};

    if (filters?.status) {
      whereClauses.push(`m.status = $status`);
      params.status = filters.status;
    }
    if (filters?.projectId) {
      whereClauses.push(`m.projectId = $projectId`);
      params.projectId = filters.projectId;
    }
    if (filters?.deliveryId) {
      whereClauses.push(`m.deliveryId = $deliveryId`);
      params.deliveryId = filters.deliveryId;
    }

    if (whereClauses.length > 0) {
      query += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    query += ` RETURN m ORDER BY m.createdAt DESC`;

    const result = await session.run(query, params);
    return result.records.map(r => recordToObj(r, 'm'));
  } catch (error) {
    console.error("Failed to get mixing logs:", error);
    return [];
  } finally {
    await session.close();
  }
}

/**
 * Get a single mixing log with its ingredients
 */
export async function getMixingLogById(id: number) {
  const session = getSession();
  try {
    // Fetch log
    const logResult = await session.run(`MATCH (m:MixingLog {id: $id}) RETURN m`, { id });
    if (logResult.records.length === 0) return null;

    const log = recordToObj(logResult.records[0], 'm');

    // Fetch ingredients
    const ingredientsResult = await session.run(`
      MATCH (m:MixingLog {id: $id})-[rel:USED_INGREDIENT]->(mat:Material)
      RETURN mat, rel
    `, { id });

    const ingredients = ingredientsResult.records.map(r => {
      const mat = recordToObj(r, 'mat');
      const rel = r.get('rel');
      return {
        id: rel.properties.id, // Relationship property?
        batchId: id,
        materialId: mat.id,
        materialName: mat.name,
        plannedQuantity: rel.properties.plannedQuantity,
        actualQuantity: rel.properties.actualQuantity,
        unit: rel.properties.unit,
        inventoryDeducted: rel.properties.inventoryDeducted || false
      };
    });

    return {
      ...log,
      ingredients
    };
  } catch (error) {
    console.error("Failed to get mixing log:", error);
    return null;
  } finally {
    await session.close();
  }
}

/**
 * Generate next batch number
 */
export async function generateBatchNumber(): Promise<string> {
  const session = getSession();
  try {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    const prefix = `BATCH-${year}${month}${day}-`;

    const result = await session.run(`
      MATCH (m:MixingLog)
      WHERE m.batchNumber STARTS WITH $prefix
      RETURN count(m) as count
    `, { prefix });

    const count = result.records[0]?.get('count').toNumber() + 1;
    return `${prefix}${String(count).padStart(3, "0")}`;
  } catch (error) {
    console.error("Failed to generate batch number:", error);
    return `BATCH-${new Date().getFullYear()}-${Math.random().toString(36).substr(2, 9)}`;
  } finally {
    await session.close();
  }
}

/**
 * Create a new mixing log with ingredients
 */
export async function createMixingLog(
  log: InsertMixingLog,
  ingredients: InsertBatchIngredient[]
) {
  const session = getSession();
  try {
    const query = `
      CREATE (m:MixingLog {
        id: toInteger(timestamp()),
        projectId: $projectId,
        deliveryId: $deliveryId,
        recipeId: $recipeId,
        recipeName: $recipeName,
        batchNumber: $batchNumber,
        volume: $volume,
        unit: $unit,
        status: $status, // 'planned', 'in_progress', 'completed'
        startTime: datetime($startTime),
        endTime: datetime($endTime),
        operatorId: $operatorId,
        notes: $notes,
        createdAt: datetime(),
        updatedAt: datetime()
      })
      RETURN m.id as id
    `;

    // Create Log
    const logResult = await session.run(query, {
      projectId: log.projectId || null,
      deliveryId: log.deliveryId || null,
      recipeId: log.recipeId || null,
      recipeName: log.recipeName || null,
      batchNumber: log.batchNumber,
      volume: log.volume || 0,
      unit: log.unit || 'm3',
      status: log.status || 'planned',
      startTime: log.startTime ? new Date(log.startTime).toISOString() : null,
      endTime: log.endTime ? new Date(log.endTime).toISOString() : null,
      operatorId: log.operatorId || null,
      notes: log.notes || null
    });

    const batchId = logResult.records[0]?.get('id').toNumber();

    // Create Ingredients (Relationships)
    for (const ingredient of ingredients) {
      await session.run(`
         MATCH (m:MixingLog {id: $batchId})
         MATCH (mat:Material {id: $materialId})
         MERGE (m)-[r:USED_INGREDIENT]->(mat)
         SET r.id = toInteger(timestamp() + $rand), // Pseudo-unique ID for relationship if needed
             r.plannedQuantity = $plannedQuantity,
             r.actualQuantity = $actualQuantity,
             r.unit = $unit,
             r.inventoryDeducted = false
       `, {
        batchId,
        materialId: ingredient.materialId,
        plannedQuantity: ingredient.plannedQuantity,
        actualQuantity: ingredient.actualQuantity || null,
        unit: ingredient.unit,
        rand: Math.floor(Math.random() * 1000)
      });
    }

    return batchId;
  } catch (error) {
    console.error("Failed to create mixing log:", error);
    return null;
  } finally {
    await session.close();
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
  const session = getSession();
  try {
    let setClause = `m.status = $status, m.updatedAt = datetime()`;
    let params: any = { id, status };

    if (updates?.endTime) {
      setClause += `, m.endTime = datetime($endTime)`;
      params.endTime = updates.endTime.toISOString();
    }
    if (updates?.approvedBy) {
      setClause += `, m.approvedBy = $approvedBy`;
      params.approvedBy = updates.approvedBy;
    }
    if (updates?.qualityNotes) {
      setClause += `, m.qualityNotes = $qualityNotes`;
      params.qualityNotes = updates.qualityNotes;
    }

    await session.run(`
      MATCH (m:MixingLog {id: $id})
      SET ${setClause}
    `, params);

    return true;
  } catch (error) {
    console.error("Failed to update mixing log status:", error);
    return false;
  } finally {
    await session.close();
  }
}

/**
 * Deduct materials from inventory for a batch
 */
export async function deductMaterialsFromInventory(batchId: number) {
  const session = getSession();
  try {
    // Atomic update: Deduct from material quantity where relationship is not already deducted
    // AND set deducted = true.
    const query = `
      MATCH (m:MixingLog {id: $batchId})-[r:USED_INGREDIENT]->(mat:Material)
      WHERE r.inventoryDeducted = false OR r.inventoryDeducted IS NULL
      WITH r, mat
      SET mat.quantity = mat.quantity - COALESCE(r.actualQuantity, r.plannedQuantity, 0),
          r.inventoryDeducted = true
    `;

    await session.run(query, { batchId });
    return true;
  } catch (error) {
    console.error("Failed to deduct materials from inventory:", error);
    return false;
  } finally {
    await session.close();
  }
}

/**
 * Get batch ingredients with material details
 */
export async function getBatchIngredientsWithDetails(batchId: number) {
  const session = getSession();
  try {
    const result = await session.run(`
      MATCH (m:MixingLog {id: $batchId})-[r:USED_INGREDIENT]->(mat:Material)
      RETURN mat, r
    `, { batchId });

    return result.records.map(r => {
      const mat = recordToObj(r, 'mat');
      const rel = r.get('r');
      return {
        ...rel.properties,
        batchId,
        materialId: mat.id,
        materialName: mat.name,
        materialUnit: mat.unit
      };
    });
  } catch (error) {
    console.error("Failed to get batch ingredients:", error);
    return [];
  } finally {
    await session.close();
  }
}

/**
 * Get production summary for a date range
 */
export async function getProductionSummary(startDate: Date, endDate: Date) {
  const session = getSession();
  try {
    // Aggregate in Cypher
    const query = `
      MATCH (m:MixingLog)
      WHERE m.status = 'completed' 
        AND m.createdAt >= datetime($startDate) 
        AND m.createdAt <= datetime($endDate)
      RETURN count(m) as totalBatches, sum(m.volume) as totalVolume, collect(m) as batches
    `;

    const result = await session.run(query, {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    });

    if (result.records.length === 0) return null;

    const record = result.records[0];
    const totalBatches = record.get('totalBatches').toNumber();
    const totalVolume = record.get('totalVolume') || 0; // sum might be null if 0 rows? Cypher sum is 0 usually.
    // sum returns float.

    return {
      totalBatches,
      totalVolume,
      avgVolumePerBatch: totalBatches > 0 ? totalVolume / totalBatches : 0,
      batches: record.get('batches').map((n: any) => {
        return { ...n.properties, id: parseInt(n.properties.id) };
      })
    };
  } catch (error) {
    console.error("Failed to get production summary:", error);
    return null;
  } finally {
    await session.close();
  }
}

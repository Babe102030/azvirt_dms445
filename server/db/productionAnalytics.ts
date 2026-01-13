import driver, { getSession } from '../db/neo4j';

/**
 * Get daily batch production volume for the last N days
 */
export async function getDailyProductionVolume(days: number = 30) {
  const session = getSession();
  try {
    const query = `
      MATCH (m:MixingLog)
      WHERE m.createdAt >= date() - duration('P'+$days+'D')
      RETURN date(m.createdAt) as date, sum(m.volume) as volume, count(m) as count
      ORDER BY date
    `;

    const result = await session.run(query, { days });
    return result.records.map(r => ({
      date: r.get('date').toString(),
      volume: r.get('volume') || 0,
      count: r.get('count').toNumber()
    }));
  } catch (error) {
    console.error("Failed to get daily production volume:", error);
    return [];
  } finally {
    await session.close();
  }
}

/**
 * Get material consumption trends for the last N days
 */
export async function getMaterialConsumptionTrends(days: number = 30) {
  const session = getSession();
  try {
    // Top 10 consumed materials
    const query = `
      MATCH (m:MixingLog {status: 'completed'})
      WHERE m.createdAt >= date() - duration('P'+$days+'D')
      MATCH (m)-[r:USED_INGREDIENT]->(mat:Material)
      RETURN mat.id as materialId, mat.name as name, mat.unit as unit, sum(COALESCE(r.actualQuantity, r.plannedQuantity)) as totalQuantity
      ORDER BY totalQuantity DESC
      LIMIT 10
    `;

    const result = await session.run(query, { days });
    return result.records.map(r => ({
      materialId: r.get('materialId').toNumber(),
      name: r.get('name'),
      unit: r.get('unit'),
      totalQuantity: r.get('totalQuantity') || 0
    }));
  } catch (error) {
    console.error("Failed to get material consumption trends:", error);
    return [];
  } finally {
    await session.close();
  }
}

/**
 * Get production efficiency metrics
 */
export async function getProductionEfficiencyMetrics(days: number = 30) {
  const session = getSession();
  try {
    const query = `
      MATCH (m:MixingLog)
      WHERE m.createdAt >= date() - duration('P'+$days+'D')
      WITH count(m) as totalBatches,
           count(CASE WHEN m.status = 'completed' THEN 1 END) as completedBatches,
           count(CASE WHEN m.status = 'rejected' THEN 1 END) as rejectedBatches,
           sum(CASE WHEN m.status = 'completed' THEN m.volume ELSE 0 END) as totalVolume,
           avg(CASE WHEN m.status = 'completed' AND m.startTime IS NOT NULL AND m.endTime IS NOT NULL 
               THEN duration.between(datetime(m.startTime), datetime(m.endTime)).seconds / 3600.0 ELSE NULL END) as avgBatchTimeHours
      RETURN totalBatches, completedBatches, rejectedBatches, totalVolume, avgBatchTimeHours
    `;

    const result = await session.run(query, { days });
    if (result.records.length === 0) return null;

    const r = result.records[0];
    const totalBatches = r.get('totalBatches').toNumber();
    const completedBatches = r.get('completedBatches').toNumber();
    const rejectedBatches = r.get('rejectedBatches').toNumber();
    const totalVolume = r.get('totalVolume') || 0;
    const avgBatchTime = r.get('avgBatchTimeHours') || 0;

    const successRate = totalBatches > 0 ? (completedBatches / totalBatches) * 100 : 0;
    const avgBatchVolume = completedBatches > 0 ? totalVolume / completedBatches : 0;
    const utilization = totalBatches > 0 ? (completedBatches / totalBatches) * 100 : 0;

    return {
      totalBatches,
      completedBatches,
      rejectedBatches,
      successRate: Math.round(successRate * 100) / 100,
      totalVolume: Math.round(totalVolume * 100) / 100,
      avgBatchVolume: Math.round(avgBatchVolume * 100) / 100,
      avgBatchTime: Math.round(avgBatchTime * 100) / 100,
      utilization: Math.round(utilization * 100) / 100,
      period: `Last ${days} days`
    };
  } catch (error) {
    console.error("Failed to get production efficiency metrics:", error);
    return null;
  } finally {
    await session.close();
  }
}

/**
 * Get production volume by recipe
 */
export async function getProductionByRecipe(days: number = 30) {
  const session = getSession();
  try {
    const query = `
      MATCH (m:MixingLog {status: 'completed'})
      WHERE m.createdAt >= date() - duration('P'+$days+'D')
      RETURN m.recipeId as recipeId, m.recipeName as recipeName, sum(m.volume) as volume, count(m) as count
      ORDER BY volume DESC
    `;

    const result = await session.run(query, { days });
    return result.records.map(r => ({
      recipeId: r.get('recipeId') ? r.get('recipeId').toNumber() : null,
      recipeName: r.get('recipeName') || "Unknown Recipe",
      volume: r.get('volume') || 0,
      count: r.get('count').toNumber()
    }));
  } catch (error) {
    console.error("Failed to get production by recipe:", error);
    return [];
  } finally {
    await session.close();
  }
}

/**
 * Get hourly production rate (batches per hour)
 */
export async function getHourlyProductionRate(days: number = 7) {
  const session = getSession();
  try {
    // Cypher doesn't easily format date to hour bucket string across days without APOC sometimes, 
    // but we can extract hour.
    // However, the original code grouped by "YYYY-MM-DD HH:00".

    const query = `
      MATCH (m:MixingLog {status: 'completed'})
      WHERE m.createdAt >= date() - duration('P'+$days+'D')
      WITH m, 
           toString(datetime(m.createdAt).year) + '-' + 
           toString(datetime(m.createdAt).month) + '-' + 
           toString(datetime(m.createdAt).day) + ' ' + 
           toString(datetime(m.createdAt).hour) + ':00' as hour
      RETURN hour, count(m) as count
      ORDER BY hour
    `;
    // Note: Manual string formatting in Cypher is verbose. 
    // Alternatively, return raw timestamps and aggregate in JS, but Cypher aggregation is preferred.
    // Let's try to simulate the format. In Neo4j 5.x apoc is useful, but standard cypher works too.
    // 'toString' on datetime components does not pad with zero automatically. 
    // We might accept simplified grouping or return raw.
    // Let's stick to returning raw m.createdAt and grouping in JS if complex formatting is needed,
    // OR use a simpler Cypher grouping.
    // Actually, distinct hour buckets.

    const result = await session.run(`
      MATCH (m:MixingLog {status: 'completed'})
      WHERE m.createdAt >= date() - duration('P'+$days+'D')
      RETURN m.createdAt as createdAt
    `, { days });

    // JS aggregation to ensure exact format match
    const rateByHour: Record<string, { hour: string; count: number }> = {};
    for (const r of result.records) {
      const d = new Date(r.get('createdAt').toString()); // ISO string
      const dateStr = d.toISOString().split("T")[0];
      const hourStr = String(d.getHours()).padStart(2, '0');
      const key = `${dateStr} ${hourStr}:00`;

      if (!rateByHour[key]) {
        rateByHour[key] = { hour: key, count: 0 };
      }
      rateByHour[key].count++;
    }

    return Object.values(rateByHour).sort((a, b) => a.hour.localeCompare(b.hour));

  } catch (error) {
    console.error("Failed to get hourly production rate:", error);
    return [];
  } finally {
    await session.close();
  }
}

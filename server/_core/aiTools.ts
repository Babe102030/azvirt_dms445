/**
 * AI Tools Framework
 * Provides agentic capabilities for AI assistant to interact with DMS data
 */

import { getDb } from '../db';
import { materials, deliveries, documents, qualityTests, forecastPredictions } from '../../drizzle/schema';
import { like, eq, and, gte, lte, desc } from 'drizzle-orm';

export interface Tool {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description: string;
      enum?: string[];
    }>;
    required: string[];
  };
  execute: (params: any, userId: number) => Promise<any>;
}

/**
 * Search materials inventory
 */
const searchMaterialsTool: Tool = {
  name: 'search_materials',
  description: 'Search materials inventory by name or check stock levels. Returns current stock, supplier info, and low stock warnings.',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Material name to search for (e.g., "cement", "gravel")',
      },
      checkLowStock: {
        type: 'boolean',
        description: 'If true, returns only materials below minimum stock level',
      },
    },
    required: [],
  },
  execute: async (params, userId) => {
    const db = await getDb();
    if (!db) return { error: 'Database not available' };
    
    let query = db.select().from(materials);

    if (params.query) {
      query = query.where(like(materials.name, `%${params.query}%`)) as any;
    }

    const results = await query;

    if (params.checkLowStock) {
      return results.filter(m => m.quantity <= m.minStock);
    }

    return results.map(m => ({
      id: m.id,
      name: m.name,
      category: m.category,
      quantity: m.quantity,
      unit: m.unit,
      minStock: m.minStock,
      supplier: m.supplier,
      isLowStock: m.quantity <= m.minStock,
      isCritical: m.quantity <= m.criticalThreshold,
    }));
  },
};

/**
 * Get delivery status
 */
const getDeliveryStatusTool: Tool = {
  name: 'get_delivery_status',
  description: 'Get real-time delivery status, GPS location, and ETA. Can search by delivery ID, project name, or status.',
  parameters: {
    type: 'object',
    properties: {
      deliveryId: {
        type: 'number',
        description: 'Specific delivery ID to lookup',
      },
      projectName: {
        type: 'string',
        description: 'Project name to filter deliveries',
      },
      status: {
        type: 'string',
        description: 'Delivery status to filter',
        enum: ['scheduled', 'loaded', 'en_route', 'arrived', 'delivered', 'returning', 'completed'],
      },
    },
    required: [],
  },
  execute: async (params, userId) => {
    const db = await getDb();
    if (!db) return { error: 'Database not available' };
    
    const conditions = [];

    if (params.deliveryId) {
      conditions.push(eq(deliveries.id, params.deliveryId));
    }
    if (params.projectName) {
      conditions.push(like(deliveries.projectName, `%${params.projectName}%`));
    }
    if (params.status) {
      conditions.push(eq(deliveries.status, params.status));
    }

    const results = await db
      .select()
      .from(deliveries)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(deliveries.scheduledTime))
      .limit(10);

    return results.map(d => ({
      id: d.id,
      projectName: d.projectName,
      concreteType: d.concreteType,
      volume: d.volume,
      status: d.status,
      scheduledTime: d.scheduledTime,
      driverName: d.driverName,
      vehicleNumber: d.vehicleNumber,
      gpsLocation: d.gpsLocation,
      estimatedArrival: d.estimatedArrival,
      notes: d.notes,
    }));
  },
};

/**
 * Search documents
 */
const searchDocumentsTool: Tool = {
  name: 'search_documents',
  description: 'Search documents by name, category, or project. Returns document metadata and download URLs.',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Document name to search for',
      },
      category: {
        type: 'string',
        description: 'Document category to filter',
        enum: ['contract', 'blueprint', 'report', 'certificate', 'invoice', 'other'],
      },
      projectId: {
        type: 'number',
        description: 'Project ID to filter documents',
      },
    },
    required: [],
  },
  execute: async (params, userId) => {
    const db = await getDb();
    if (!db) return { error: 'Database not available' };
    
    const conditions = [];

    if (params.query) {
      conditions.push(like(documents.name, `%${params.query}%`));
    }
    if (params.category) {
      conditions.push(eq(documents.category, params.category));
    }
    if (params.projectId) {
      conditions.push(eq(documents.projectId, params.projectId));
    }

    const results = await db
      .select()
      .from(documents)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(documents.createdAt))
      .limit(20);

    return results.map(d => ({
      id: d.id,
      name: d.name,
      description: d.description,
      category: d.category,
      fileUrl: d.fileUrl,
      mimeType: d.mimeType,
      fileSize: d.fileSize,
      createdAt: d.createdAt,
    }));
  },
};

/**
 * Get quality test results
 */
const getQualityTestsTool: Tool = {
  name: 'get_quality_tests',
  description: 'Retrieve quality control test results. Can filter by status, test type, or delivery.',
  parameters: {
    type: 'object',
    properties: {
      status: {
        type: 'string',
        description: 'Test status to filter',
        enum: ['pass', 'fail', 'pending'],
      },
      testType: {
        type: 'string',
        description: 'Type of test to filter',
        enum: ['slump', 'strength', 'air_content', 'temperature', 'other'],
      },
      deliveryId: {
        type: 'number',
        description: 'Delivery ID to get tests for',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of results to return (default: 10)',
      },
    },
    required: [],
  },
  execute: async (params, userId) => {
    const db = await getDb();
    if (!db) return { error: 'Database not available' };
    
    const conditions = [];

    if (params.status) {
      conditions.push(eq(qualityTests.status, params.status));
    }
    if (params.testType) {
      conditions.push(eq(qualityTests.testType, params.testType));
    }
    if (params.deliveryId) {
      conditions.push(eq(qualityTests.deliveryId, params.deliveryId));
    }

    const results = await db
      .select()
      .from(qualityTests)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(qualityTests.createdAt))
      .limit(params.limit || 10);

    return results.map(t => ({
      id: t.id,
      testName: t.testName,
      testType: t.testType,
      result: t.result,
      unit: t.unit,
      status: t.status,
      testedBy: t.testedBy,
      complianceStandard: t.complianceStandard,
      notes: t.notes,
      createdAt: t.createdAt,
    }));
  },
};

/**
 * Generate inventory forecast
 */
const generateForecastTool: Tool = {
  name: 'generate_forecast',
  description: 'Generate inventory forecast predictions showing when materials will run out and recommended order quantities.',
  parameters: {
    type: 'object',
    properties: {
      materialId: {
        type: 'number',
        description: 'Specific material ID to forecast (optional, forecasts all if not provided)',
      },
    },
    required: [],
  },
  execute: async (params, userId) => {
    const db = await getDb();
    if (!db) return { error: 'Database not available' };
    
    let query = db
      .select()
      .from(forecastPredictions)
      .orderBy(forecastPredictions.daysUntilStockout);

    if (params.materialId) {
      query = query.where(eq(forecastPredictions.materialId, params.materialId)) as any;
    }

    const results = await query.limit(20);

    return results.map(f => ({
      materialId: f.materialId,
      materialName: f.materialName,
      currentStock: f.currentStock,
      dailyConsumptionRate: f.dailyConsumptionRate,
      daysUntilStockout: f.daysUntilStockout,
      predictedRunoutDate: f.predictedRunoutDate,
      recommendedOrderQty: f.recommendedOrderQty,
      confidence: f.confidence,
      status: f.daysUntilStockout && f.daysUntilStockout < 7 ? 'critical' : 
              f.daysUntilStockout && f.daysUntilStockout < 14 ? 'warning' : 'ok',
    }));
  },
};

/**
 * Calculate statistics
 */
const calculateStatsTool: Tool = {
  name: 'calculate_stats',
  description: 'Calculate statistics and aggregations (total deliveries, average test results, etc.)',
  parameters: {
    type: 'object',
    properties: {
      metric: {
        type: 'string',
        description: 'Metric to calculate',
        enum: ['total_deliveries', 'total_concrete_volume', 'qc_pass_rate', 'active_projects'],
      },
      startDate: {
        type: 'string',
        description: 'Start date for filtering (ISO format)',
      },
      endDate: {
        type: 'string',
        description: 'End date for filtering (ISO format)',
      },
    },
    required: ['metric'],
  },
  execute: async (params, userId) => {
    const db = await getDb();
    if (!db) return { error: 'Database not available' };
    
    const { metric, startDate, endDate } = params;

    const dateConditions = [];
    if (startDate) {
      dateConditions.push(gte(deliveries.createdAt, new Date(startDate)));
    }
    if (endDate) {
      dateConditions.push(lte(deliveries.createdAt, new Date(endDate)));
    }

    switch (metric) {
      case 'total_deliveries': {
        const results = await db
          .select()
          .from(deliveries)
          .where(dateConditions.length > 0 ? and(...dateConditions) : undefined);
        return {
          metric: 'total_deliveries',
          value: results.length,
          period: { startDate, endDate },
        };
      }

      case 'total_concrete_volume': {
        const results = await db
          .select()
          .from(deliveries)
          .where(dateConditions.length > 0 ? and(...dateConditions) : undefined);
        const totalVolume = results.reduce((sum, d) => sum + (d.volume || 0), 0);
        return {
          metric: 'total_concrete_volume',
          value: totalVolume,
          unit: 'm³',
          period: { startDate, endDate },
        };
      }

      case 'qc_pass_rate': {
        const allTests = await db.select().from(qualityTests);
        const passedTests = allTests.filter(t => t.status === 'pass');
        const passRate = allTests.length > 0 ? (passedTests.length / allTests.length) * 100 : 0;
        return {
          metric: 'qc_pass_rate',
          value: Math.round(passRate * 10) / 10,
          unit: '%',
          totalTests: allTests.length,
          passedTests: passedTests.length,
        };
      }

      default:
        return { error: 'Unknown metric' };
    }
  },
};

// Export all tools
export const AI_TOOLS: Tool[] = [
  searchMaterialsTool,
  getDeliveryStatusTool,
  searchDocumentsTool,
  getQualityTestsTool,
  generateForecastTool,
  calculateStatsTool,
];

/**
 * Execute a tool by name
 */
export async function executeTool(
  toolName: string,
  parameters: any,
  userId: number
): Promise<any> {
  const tool = AI_TOOLS.find(t => t.name === toolName);
  
  if (!tool) {
    throw new Error(`Tool not found: ${toolName}`);
  }

  try {
    const result = await tool.execute(parameters, userId);
    return {
      success: true,
      toolName,
      parameters,
      result,
    };
  } catch (error) {
    console.error(`Tool execution failed for ${toolName}:`, error);
    return {
      success: false,
      toolName,
      parameters,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get tool definitions for AI model
 */
export function getToolDefinitions(): any[] {
  return AI_TOOLS.map(tool => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }));
}

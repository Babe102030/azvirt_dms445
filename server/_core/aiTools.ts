/**
 * AI Tools Framework
 * Provides agentic capabilities for AI assistant to interact with DMS data
 */

import { getDb } from '../db';
import { materials, projects } from '../../drizzle/schema';
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
 * Get project information
 */
const getProjectsTool: Tool = {
  name: 'get_projects',
  description: 'Get project information and status. Can filter by status or search by name.',
  parameters: {
    type: 'object',
    properties: {
      status: {
        type: 'string',
        description: 'Project status to filter',
        enum: ['planning', 'active', 'completed', 'on_hold'],
      },
      query: {
        type: 'string',
        description: 'Project name to search for',
      },
    },
    required: [],
  },
  execute: async (params, userId) => {
    const db = await getDb();
    if (!db) return { error: 'Database not available' };

    let query = db.select().from(projects);

    const conditions = [];
    if (params.status) {
      conditions.push(eq(projects.status, params.status));
    }
    if (params.query) {
      conditions.push(like(projects.name, `%${params.query}%`));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    const results = await query.orderBy(desc(projects.createdAt));

    return results.map(p => ({
      id: p.id,
      name: p.name,
      description: p.description,
      location: p.location,
      status: p.status,
      startDate: p.startDate,
      endDate: p.endDate,
      createdBy: p.createdBy,
      createdAt: p.createdAt,
    }));
  },
};

/**
 * Create material entry
 */
const createMaterialTool: Tool = {
  name: 'create_material',
  description: 'Add a new material to inventory. Use this to register new materials for tracking.',
  parameters: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'Material name',
      },
      category: {
        type: 'string',
        description: 'Material category',
        enum: ['cement', 'aggregate', 'admixture', 'water', 'other'],
      },
      unit: {
        type: 'string',
        description: 'Unit of measurement (kg, m³, L, etc.)',
      },
      quantity: {
        type: 'number',
        description: 'Initial quantity',
      },
      minStock: {
        type: 'number',
        description: 'Minimum stock level for alerts',
      },
      supplier: {
        type: 'string',
        description: 'Supplier name',
      },
      unitPrice: {
        type: 'number',
        description: 'Price per unit',
      },
    },
    required: ['name', 'unit'],
  },
  execute: async (params, userId) => {
    const db = await getDb();
    if (!db) return { error: 'Database not available' };

    const { name, category, unit, quantity, minStock, supplier, unitPrice } = params;

    const result = await db.insert(materials).values({
      name,
      category: category || 'other',
      unit,
      quantity: quantity || 0,
      minStock: minStock || 0,
      criticalThreshold: minStock ? Math.floor(minStock * 0.5) : 0,
      supplier: supplier || null,
      unitPrice: unitPrice || null,
    }).returning({ id: materials.id });

    return {
      success: true,
      materialId: result[0]?.id,
      message: `Material "${name}" created successfully`,
    };
  },
};

/**
 * Update material quantity
 */
const updateMaterialQuantityTool: Tool = {
  name: 'update_material_quantity',
  description: 'Update the quantity of a material in inventory. Use for stock adjustments, additions, or consumption.',
  parameters: {
    type: 'object',
    properties: {
      materialId: {
        type: 'number',
        description: 'ID of the material',
      },
      quantity: {
        type: 'number',
        description: 'New quantity value',
      },
      adjustment: {
        type: 'number',
        description: 'Amount to add (positive) or subtract (negative) from current quantity',
      },
    },
    required: ['materialId'],
  },
  execute: async (params, userId) => {
    const db = await getDb();
    if (!db) return { error: 'Database not available' };

    const { materialId, quantity, adjustment } = params;

    if (quantity !== undefined) {
      // Set absolute quantity
      await db
        .update(materials)
        .set({ quantity, updatedAt: new Date() })
        .where(eq(materials.id, materialId));

      return {
        success: true,
        materialId,
        newQuantity: quantity,
        message: 'Material quantity updated',
      };
    } else if (adjustment !== undefined) {
      // Adjust by amount
      const [material] = await db
        .select()
        .from(materials)
        .where(eq(materials.id, materialId));

      if (!material) {
        return { error: 'Material not found' };
      }

      const newQuantity = material.quantity + adjustment;

      await db
        .update(materials)
        .set({ quantity: newQuantity, updatedAt: new Date() })
        .where(eq(materials.id, materialId));

      return {
        success: true,
        materialId,
        previousQuantity: material.quantity,
        adjustment,
        newQuantity,
        message: `Material quantity ${adjustment > 0 ? 'increased' : 'decreased'} by ${Math.abs(adjustment)}`,
      };
    }

    return { error: 'Either quantity or adjustment must be provided' };
  },
};

/**
 * Create project
 */
const createProjectTool: Tool = {
  name: 'create_project',
  description: 'Create a new construction project with basic information.',
  parameters: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'Project name',
      },
      description: {
        type: 'string',
        description: 'Project description',
      },
      location: {
        type: 'string',
        description: 'Project location',
      },
      status: {
        type: 'string',
        description: 'Project status',
        enum: ['planning', 'active', 'completed', 'on_hold'],
      },
      startDate: {
        type: 'string',
        description: 'Start date (ISO format)',
      },
      endDate: {
        type: 'string',
        description: 'End date (ISO format)',
      },
    },
    required: ['name'],
  },
  execute: async (params, userId) => {
    const db = await getDb();
    if (!db) return { error: 'Database not available' };

    const { name, description, location, status, startDate, endDate } = params;

    const result = await db.insert(projects).values({
      name,
      description: description || null,
      location: location || null,
      status: status || 'planning',
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      createdBy: userId,
    }).returning({ id: projects.id });

    return {
      success: true,
      projectId: result[0]?.id,
      message: `Project "${name}" created successfully`,
    };
  },
};

// Export all tools
export const AI_TOOLS: Tool[] = [
  searchMaterialsTool,
  getProjectsTool,
  createMaterialTool,
  updateMaterialQuantityTool,
  createProjectTool,
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

/**
 * AI Tools Framework
 * Provides agentic capabilities for AI assistant to interact with DMS data
 */

import { getDb, generateForecastPredictions } from "../db";
import {
  materials,
  projects,
  deliveries,
  documents,
  qualityTests,
  workHours,
  machineWorkHours,
  users,
} from "../../drizzle/schema";
import { like, eq, and, gte, lte, desc, sql } from "drizzle-orm";

export interface Tool {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<
      string,
      {
        type: string;
        description: string;
        enum?: string[];
      }
    >;
    required: string[];
  };
  execute: (params: any, userId: number) => Promise<any>;
}

/**
 * Search materials inventory
 */
const searchMaterialsTool: Tool = {
  name: "search_materials",
  description:
    "Search materials inventory by name or check stock levels. Returns current stock, supplier info, and low stock warnings.",
  parameters: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: 'Material name to search for (e.g., "cement", "gravel")',
      },
      checkLowStock: {
        type: "boolean",
        description:
          "If true, returns only materials below minimum stock level",
      },
    },
    required: [],
  },
  execute: async (params, userId) => {
    const db = await getDb();
    if (!db) return { error: "Database not available" };

    let query = db.select().from(materials);

    if (params.query) {
      query = query.where(like(materials.name, `%${params.query}%`)) as any;
    }

    const results = await query;

    if (params.checkLowStock) {
      return results.filter((m) => m.quantity <= m.minStock);
    }

    return results.map((m) => ({
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
  name: "get_projects",
  description:
    "Get project information and status. Can filter by status or search by name.",
  parameters: {
    type: "object",
    properties: {
      status: {
        type: "string",
        description: "Project status to filter",
        enum: ["planning", "active", "completed", "on_hold"],
      },
      query: {
        type: "string",
        description: "Project name to search for",
      },
    },
    required: [],
  },
  execute: async (params, userId) => {
    const db = await getDb();
    if (!db) return { error: "Database not available" };

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

    return results.map((p) => ({
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
 * Track delivery status and history
 */
const getDeliveryStatusTool: Tool = {
  name: "get_delivery_status",
  description:
    "Get real-time delivery status, ticket numbers, and truck locations.",
  parameters: {
    type: "object",
    properties: {
      status: {
        type: "string",
        description: "Filter by delivery status",
        enum: [
          "scheduled",
          "loading",
          "in_transit",
          "arrived",
          "discharging",
          "completed",
          "cancelled",
        ],
      },
      projectName: {
        type: "string",
        description: "Search by project name",
      },
      driverName: {
        type: "string",
        description: "Search by driver name",
      },
    },
    required: [],
  },
  execute: async (params) => {
    const db = await getDb();
    if (!db) return { error: "Database not available" };

    let query = db.select().from(deliveries);
    const conditions = [];

    if (params.status) conditions.push(eq(deliveries.status, params.status));
    if (params.projectName)
      conditions.push(like(deliveries.projectName, `%${params.projectName}%`));
    if (params.driverName)
      conditions.push(like(deliveries.driverName, `%${params.driverName}%`));

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    const results = await query
      .orderBy(desc(deliveries.scheduledTime))
      .limit(20);
    return results;
  },
};

/**
 * Search documents and files
 */
const searchDocumentsTool: Tool = {
  name: "search_documents",
  description:
    "Find documents, reports, and uploaded files by name or project.",
  parameters: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Document name or type to search for",
      },
      projectId: {
        type: "number",
        description: "Filter by project ID",
      },
    },
    required: [],
  },
  execute: async (params) => {
    const db = await getDb();
    if (!db) return { error: "Database not available" };

    let query = db.select().from(documents);
    const conditions = [];

    if (params.query)
      conditions.push(like(documents.name, `%${params.query}%`));
    if (params.projectId)
      conditions.push(eq(documents.projectId, params.projectId));

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    return await query.orderBy(desc(documents.createdAt)).limit(15);
  },
};

/**
 * Get quality control test results
 */
const getQualityTestsTool: Tool = {
  name: "get_quality_tests",
  description:
    "Review quality control test results, slump tests, and strength reports.",
  parameters: {
    type: "object",
    properties: {
      testType: {
        type: "string",
        description: "Type of test (slump, strength, temperature, air_content)",
      },
      status: {
        type: "string",
        description: "Filter by status (pass, fail, pending)",
      },
      deliveryId: {
        type: "number",
        description: "Filter by specific delivery ID",
      },
    },
    required: [],
  },
  execute: async (params) => {
    const db = await getDb();
    if (!db) return { error: "Database not available" };

    let query = db.select().from(qualityTests);
    const conditions = [];

    if (params.testType)
      conditions.push(eq(qualityTests.testType, params.testType));
    if (params.status) conditions.push(eq(qualityTests.status, params.status));
    if (params.deliveryId)
      conditions.push(eq(qualityTests.deliveryId, params.deliveryId));

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    return await query.orderBy(desc(qualityTests.createdAt)).limit(20);
  },
};

/**
 * Generate forecasting predictions
 */
const generateForecastTool: Tool = {
  name: "generate_forecast",
  description:
    "Generate inventory forecasting predictions and stockout alerts based on historical usage.",
  parameters: {
    type: "object",
    properties: {
      materialName: {
        type: "string",
        description: "Specific material to forecast (optional)",
      },
    },
    required: [],
  },
  execute: async (params) => {
    const predictions = await generateForecastPredictions();
    if (params.materialName) {
      return predictions.filter((p) =>
        p.materialName
          .toLowerCase()
          .includes(params.materialName.toLowerCase()),
      );
    }
    return predictions;
  },
};

/**
 * Calculate business statistics
 */
const calculateStatsTool: Tool = {
  name: "calculate_stats",
  description:
    "Calculate business metrics like total production, delivery success rates, or inventory value.",
  parameters: {
    type: "object",
    properties: {
      metric: {
        type: "string",
        description: "The metric to calculate",
        enum: [
          "total_deliveries",
          "total_volume",
          "pass_rate",
          "inventory_value",
        ],
      },
      startDate: {
        type: "string",
        description: "ISO date for start of period",
      },
    },
    required: ["metric"],
  },
  execute: async (params) => {
    const db = await getDb();
    if (!db) return { error: "Database not available" };

    switch (params.metric) {
      case "total_deliveries":
        const [dCount] = await db
          .select({ count: sql<number>`count(*)` })
          .from(deliveries);
        return { total: dCount.count };
      case "total_volume":
        const [vSum] = await db
          .select({ total: sql<number>`sum(${deliveries.volume})` })
          .from(deliveries);
        return { totalVolume: vSum.total };
      case "pass_rate":
        const [tCount] = await db
          .select({ total: sql<number>`count(*)` })
          .from(qualityTests);
        const [pCount] = await db
          .select({ passed: sql<number>`count(*)` })
          .from(qualityTests)
          .where(eq(qualityTests.status, "pass"));
        return {
          totalTests: tCount.total,
          passRate: tCount.total > 0 ? (pCount.passed / tCount.total) * 100 : 0,
        };
      default:
        return { error: "Unknown metric" };
    }
  },
};

/**
 * Log employee work hours
 */
const logWorkHoursTool: Tool = {
  name: "log_work_hours",
  description: "Record employee work hours for timesheets.",
  parameters: {
    type: "object",
    properties: {
      employeeId: { type: "number", description: "Employee ID" },
      projectId: { type: "number", description: "Project ID" },
      date: { type: "string", description: "Date (ISO format)" },
      hours: { type: "number", description: "Total hours worked" },
      notes: { type: "string", description: "Work description" },
    },
    required: ["employeeId", "hours", "date"],
  },
  execute: async (params) => {
    const db = await getDb();
    if (!db) return { error: "Database not available" };

    const result = await db
      .insert(workHours)
      .values({
        employeeId: params.employeeId,
        projectId: params.projectId || null,
        date: new Date(params.date),
        hoursWorked: params.hours.toString(),
        notes: params.notes || "",
        status: "pending",
      })
      .returning({ id: workHours.id });

    return { success: true, logId: result[0].id, message: "Work hours logged" };
  },
};

/**
 * Log machine work hours
 */
const logMachineHoursTool: Tool = {
  name: "log_machine_hours",
  description: "Record operating hours for heavy machinery or concrete pumps.",
  parameters: {
    type: "object",
    properties: {
      machineId: { type: "number", description: "Machine ID" },
      hours: { type: "number", description: "Hours used" },
      date: { type: "string", description: "Date (ISO format)" },
      notes: { type: "string", description: "Usage notes" },
    },
    required: ["machineId", "hours"],
  },
  execute: async (params) => {
    const db = await getDb();
    if (!db) return { error: "Database not available" };

    const result = await db
      .insert(machineWorkHours)
      .values({
        machineId: params.machineId,
        hours: params.hours.toString(),
        date: new Date(params.date || new Date()),
      })
      .returning({ id: machineWorkHours.id });

    return {
      success: true,
      logId: result[0].id,
      message: "Machine hours logged",
    };
  },
};

/**
 * Create material entry
 */
const createMaterialTool: Tool = {
  name: "create_material",
  description:
    "Add a new material to inventory. Use this to register new materials for tracking.",
  parameters: {
    type: "object",
    properties: {
      name: {
        type: "string",
        description: "Material name",
      },
      category: {
        type: "string",
        description: "Material category",
        enum: ["cement", "aggregate", "admixture", "water", "other"],
      },
      unit: {
        type: "string",
        description: "Unit of measurement (kg, m³, L, etc.)",
      },
      quantity: {
        type: "number",
        description: "Initial quantity",
      },
      minStock: {
        type: "number",
        description: "Minimum stock level for alerts",
      },
      supplier: {
        type: "string",
        description: "Supplier name",
      },
      unitPrice: {
        type: "number",
        description: "Price per unit",
      },
    },
    required: ["name", "unit"],
  },
  execute: async (params, userId) => {
    const db = await getDb();
    if (!db) return { error: "Database not available" };

    const { name, category, unit, quantity, minStock, supplier, unitPrice } =
      params;

    const result = await db
      .insert(materials)
      .values({
        name,
        category: category || "other",
        unit,
        quantity: quantity || 0,
        minStock: minStock || 0,
        criticalThreshold: minStock ? Math.floor(minStock * 0.5) : 0,
        supplier: supplier || null,
        unitPrice: unitPrice || null,
      })
      .returning({ id: materials.id });

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
  name: "update_material_quantity",
  description:
    "Update the quantity of a material in inventory. Use for stock adjustments, additions, or consumption.",
  parameters: {
    type: "object",
    properties: {
      materialId: {
        type: "number",
        description: "ID of the material",
      },
      quantity: {
        type: "number",
        description: "New quantity value",
      },
      adjustment: {
        type: "number",
        description:
          "Amount to add (positive) or subtract (negative) from current quantity",
      },
    },
    required: ["materialId"],
  },
  execute: async (params, userId) => {
    const db = await getDb();
    if (!db) return { error: "Database not available" };

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
        message: "Material quantity updated",
      };
    } else if (adjustment !== undefined) {
      // Adjust by amount
      const [material] = await db
        .select()
        .from(materials)
        .where(eq(materials.id, materialId));

      if (!material) {
        return { error: "Material not found" };
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
        message: `Material quantity ${adjustment > 0 ? "increased" : "decreased"} by ${Math.abs(adjustment)}`,
      };
    }

    return { error: "Either quantity or adjustment must be provided" };
  },
};

/**
 * Create project
 */
const createProjectTool: Tool = {
  name: "create_project",
  description: "Create a new construction project with basic information.",
  parameters: {
    type: "object",
    properties: {
      name: {
        type: "string",
        description: "Project name",
      },
      description: {
        type: "string",
        description: "Project description",
      },
      location: {
        type: "string",
        description: "Project location",
      },
      status: {
        type: "string",
        description: "Project status",
        enum: ["planning", "active", "completed", "on_hold"],
      },
      startDate: {
        type: "string",
        description: "Start date (ISO format)",
      },
      endDate: {
        type: "string",
        description: "End date (ISO format)",
      },
    },
    required: ["name"],
  },
  execute: async (params, userId) => {
    const db = await getDb();
    if (!db) return { error: "Database not available" };

    const { name, description, location, status, startDate, endDate } = params;

    const result = await db
      .insert(projects)
      .values({
        name,
        description: description || null,
        location: location || null,
        status: status || "planning",
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        createdBy: userId,
      })
      .returning({ id: projects.id });

    return {
      success: true,
      projectId: result[0]?.id,
      message: `Project "${name}" created successfully`,
    };
  },
};

/**
 * Update document metadata
 */
const updateDocumentTool: Tool = {
  name: "update_document",
  description: "Update metadata for a document or file.",
  parameters: {
    type: "object",
    properties: {
      id: { type: "number", description: "Document ID" },
      name: { type: "string", description: "New document name" },
      projectId: {
        type: "number",
        description: "Associate with different project",
      },
    },
    required: ["id"],
  },
  execute: async (params) => {
    const db = await getDb();
    if (!db) return { error: "Database not available" };

    const { id, ...updates } = params;
    await db.update(documents).set(updates).where(eq(documents.id, id));

    return { success: true, message: "Document updated" };
  },
};

/**
 * Delete document
 */
const deleteDocumentTool: Tool = {
  name: "delete_document",
  description: "Remove a document from the system.",
  parameters: {
    type: "object",
    properties: {
      id: { type: "number", description: "Document ID" },
    },
    required: ["id"],
  },
  execute: async (params) => {
    const db = await getDb();
    if (!db) return { error: "Database not available" };

    await db.delete(documents).where(eq(documents.id, params.id));
    return { success: true, message: "Document deleted" };
  },
};

// Export all tools
export const AI_TOOLS: Tool[] = [
  searchMaterialsTool,
  getProjectsTool,
  getDeliveryStatusTool,
  searchDocumentsTool,
  getQualityTestsTool,
  generateForecastTool,
  calculateStatsTool,
  logWorkHoursTool,
  logMachineHoursTool,
  createMaterialTool,
  updateMaterialQuantityTool,
  createProjectTool,
  updateDocumentTool,
  deleteDocumentTool,
];

/**
 * Execute a tool by name
 */
export async function executeTool(
  toolName: string,
  parameters: any,
  userId: number,
): Promise<any> {
  const tool = AI_TOOLS.find((t) => t.name === toolName);

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
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get tool definitions for AI model
 */
export function getToolDefinitions(): any[] {
  return AI_TOOLS.map((tool) => ({
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }));
}

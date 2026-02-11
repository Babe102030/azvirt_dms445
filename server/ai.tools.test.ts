import { describe, it, expect, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import * as db from "./db";

/**
 * AI Agentic Tools Tests (with Mocks)
 * Tests the execution of AI tools by mocking the database layer.
 * This isolates the tool's logic from database connection issues.
 */

// Mock the entire db module
// This replaces the actual db object and functions with mocks.
vi.mock("./db", () => {
  const mockQueryBuilder = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([{ id: 1, name: "Mocked Item" }]),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([{ id: 456 }]),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    // Make the query builder thenable to handle direct awaits on queries
    then: (resolve: any) =>
      resolve([
        {
          id: 1,
          name: "Mocked Item",
          count: 10,
          total: 1000,
          totalTests: 20,
          passed: 18,
        },
      ]),
  };

  return {
    db: mockQueryBuilder, // Mock the 'db' object itself
    getDb: vi.fn().mockResolvedValue(mockQueryBuilder), // Mock the getDb function
    createMaterial: vi.fn().mockResolvedValue(123),
    deleteMaterial: vi.fn().mockResolvedValue(true),
    generateForecastPredictions: vi.fn().mockResolvedValue([
      {
        materialId: 1,
        materialName: "cement",
        predictedStockoutDate: new Date(),
        needsReorder: true,
      },
    ]),
  };
});

// Mock user context
const mockUser = {
  id: 1,
  openId: "test-user",
  name: "Test User",
  email: "test@example.com",
  role: "admin" as const,
  phoneNumber: null,
  smsNotificationsEnabled: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function createAuthContext() {
  return {
    user: mockUser,
    req: {} as any,
    res: {} as any,
  };
}

const ctx = createAuthContext();
const caller = appRouter.createCaller(ctx);

describe("AI Agentic Tools", () => {
  beforeEach(() => {
    // Reset mocks before each test to ensure isolation
    vi.clearAllMocks();
  });

  describe("Tool Execution", () => {
    it("should execute search_materials tool", async () => {
      const result = await caller.ai.executeTool({
        toolName: "search_materials",
        parameters: { query: "cement" },
      });
      expect(result.success).toBe(true);
      expect(result.toolName).toBe("search_materials");
      expect(Array.isArray(result.result)).toBe(true);
    });

    it("should execute get_delivery_status tool", async () => {
      const result = await caller.ai.executeTool({
        toolName: "get_delivery_status",
        parameters: { status: "completed" },
      });
      expect(result.success).toBe(true);
      expect(result.toolName).toBe("get_delivery_status");
      expect(Array.isArray(result.result)).toBe(true);
    });

    it("should execute search_documents tool", async () => {
      const result = await caller.ai.executeTool({
        toolName: "search_documents",
        parameters: { query: "test" },
      });
      expect(result.success).toBe(true);
      expect(result.toolName).toBe("search_documents");
      expect(Array.isArray(result.result)).toBe(true);
    });

    it("should execute get_quality_tests tool", async () => {
      const result = await caller.ai.executeTool({
        toolName: "get_quality_tests",
        parameters: { testType: "slump" },
      });
      expect(result.success).toBe(true);
      expect(result.toolName).toBe("get_quality_tests");
      expect(Array.isArray(result.result)).toBe(true);
    });

    it("should execute generate_forecast tool", async () => {
      const result = await caller.ai.executeTool({
        toolName: "generate_forecast",
        parameters: { materialName: "cement" },
      });
      expect(result.success).toBe(true);
      expect(result.toolName).toBe("generate_forecast");
      expect(Array.isArray(result.result)).toBe(true);
      expect(result.result[0]).toHaveProperty("predictedStockoutDate");
    });

    it("should execute calculate_stats tool", async () => {
      const result = await caller.ai.executeTool({
        toolName: "calculate_stats",
        parameters: { metric: "total_deliveries" },
      });
      expect(result.success).toBe(true);
      expect(result.toolName).toBe("calculate_stats");
      expect(result.result).toHaveProperty("total");
    });
  });

  describe("Tool Error Handling", () => {
    it("should handle invalid tool name", async () => {
      const result = await caller.ai.executeTool({
        toolName: "non_existent_tool",
        parameters: {},
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain("Tool not found");
    });
  });

  describe("Tool Response Format", () => {
    it("should return consistent response structure for success", async () => {
      const result = await caller.ai.executeTool({
        toolName: "search_materials",
        parameters: { query: "test" },
      });
      expect(result).toHaveProperty("success", true);
      expect(result).toHaveProperty("toolName");
      expect(result).toHaveProperty("parameters");
      expect(result).toHaveProperty("result");
    });

    it("should return consistent response structure for failure", async () => {
      const result = await caller.ai.executeTool({
        toolName: "non_existent_tool",
        parameters: {},
      });
      expect(result).toHaveProperty("success", false);
      expect(result).toHaveProperty("toolName");
      expect(result).toHaveProperty("parameters");
      expect(result).toHaveProperty("error");
    });

    it("should include original parameters in response", async () => {
      const params = { query: "cement" };
      const result = await caller.ai.executeTool({
        toolName: "search_materials",
        parameters: params,
      });
      expect(result.parameters).toEqual(params);
    });
  });

  describe("Tool Integration with Mock Database", () => {
    it("should call the mocked database functions correctly", async () => {
      // Execute a tool that uses the mocked generateForecastPredictions
      await caller.ai.executeTool({
        toolName: "generate_forecast",
        parameters: {},
      });
      expect(db.generateForecastPredictions).toHaveBeenCalled();

      // Execute a tool that uses the mocked getDb and the query builder
      await caller.ai.executeTool({
        toolName: "get_delivery_status",
        parameters: { status: "completed" },
      });
      expect(db.getDb).toHaveBeenCalled();
      // We can check if the chained methods were called on the mocked db object
      expect(db.db.select).toHaveBeenCalled();
      expect(db.db.from).toHaveBeenCalled();
    });
  });
});

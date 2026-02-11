/**
 * Trigger Evaluation Engine Tests
 *
 * Tests for condition evaluation, template variable substitution, and trigger execution
 */

import { describe, it, expect } from "vitest";
import {
  evaluateCondition,
  evaluateConditionGroup,
  evaluateConditions,
  substituteVariables,
  type Condition,
  type ConditionGroup,
} from "./services/triggerEvaluation";

describe("Trigger Evaluation Engine", () => {
  describe("evaluateCondition", () => {
    it("should evaluate equals operator correctly", () => {
      const condition: Condition = {
        field: "status",
        operator: "equals",
        value: "active",
      };
      const data = { status: "active" };
      expect(evaluateCondition(condition, data)).toBe(true);

      const data2 = { status: "inactive" };
      expect(evaluateCondition(condition, data2)).toBe(false);
    });

    it("should evaluate not_equals operator correctly", () => {
      const condition: Condition = {
        field: "status",
        operator: "not_equals",
        value: "inactive",
      };
      const data = { status: "active" };
      expect(evaluateCondition(condition, data)).toBe(true);
    });

    it("should evaluate greater_than operator correctly", () => {
      const condition: Condition = {
        field: "quantity",
        operator: "greater_than",
        value: 50,
      };
      const data = { quantity: 100 };
      expect(evaluateCondition(condition, data)).toBe(true);

      const data2 = { quantity: 30 };
      expect(evaluateCondition(condition, data2)).toBe(false);
    });

    it("should evaluate less_than operator correctly", () => {
      const condition: Condition = {
        field: "stock",
        operator: "less_than",
        value: 50,
      };
      const data = { stock: 30 };
      expect(evaluateCondition(condition, data)).toBe(true);

      const data2 = { stock: 100 };
      expect(evaluateCondition(condition, data2)).toBe(false);
    });

    it("should evaluate greater_than_or_equal operator correctly", () => {
      const condition: Condition = {
        field: "score",
        operator: "greater_than_or_equal",
        value: 50,
      };
      expect(evaluateCondition(condition, { score: 50 })).toBe(true);
      expect(evaluateCondition(condition, { score: 51 })).toBe(true);
      expect(evaluateCondition(condition, { score: 49 })).toBe(false);
    });

    it("should evaluate less_than_or_equal operator correctly", () => {
      const condition: Condition = {
        field: "age",
        operator: "less_than_or_equal",
        value: 30,
      };
      expect(evaluateCondition(condition, { age: 30 })).toBe(true);
      expect(evaluateCondition(condition, { age: 29 })).toBe(true);
      expect(evaluateCondition(condition, { age: 31 })).toBe(false);
    });

    it("should evaluate contains operator correctly (case insensitive)", () => {
      const condition: Condition = {
        field: "description",
        operator: "contains",
        value: "urgent",
      };
      const data = { description: "This is an URGENT task" };
      expect(evaluateCondition(condition, data)).toBe(true);

      const data2 = { description: "Normal task" };
      expect(evaluateCondition(condition, data2)).toBe(false);
    });

    it("should evaluate not_contains operator correctly", () => {
      const condition: Condition = {
        field: "tags",
        operator: "not_contains",
        value: "archived",
      };
      expect(evaluateCondition(condition, { tags: "active, pending" })).toBe(
        true,
      );
      expect(evaluateCondition(condition, { tags: "archived, old" })).toBe(
        false,
      );
    });

    it("should evaluate starts_with operator correctly", () => {
      const condition: Condition = {
        field: "code",
        operator: "starts_with",
        value: "PRJ",
      };
      expect(evaluateCondition(condition, { code: "PRJ-001" })).toBe(true);
      expect(evaluateCondition(condition, { code: "TSK-001" })).toBe(false);
    });

    it("should evaluate ends_with operator correctly", () => {
      const condition: Condition = {
        field: "filename",
        operator: "ends_with",
        value: ".pdf",
      };
      expect(evaluateCondition(condition, { filename: "document.pdf" })).toBe(
        true,
      );
      expect(evaluateCondition(condition, { filename: "image.jpg" })).toBe(
        false,
      );
    });

    it("should handle nested field paths", () => {
      const condition: Condition = {
        field: "user.role",
        operator: "equals",
        value: "admin",
      };
      const data = { user: { role: "admin" } };
      expect(evaluateCondition(condition, data)).toBe(true);
    });

    it("should return false for unknown operators", () => {
      const condition: Condition = {
        field: "status",
        operator: "unknown_operator" as any,
        value: "test",
      };
      expect(evaluateCondition(condition, { status: "test" })).toBe(false);
    });
  });

  describe("evaluateConditionGroup", () => {
    it("should evaluate AND group correctly (all conditions must pass)", () => {
      const group: ConditionGroup = {
        operator: "AND",
        conditions: [
          { field: "status", operator: "equals", value: "active" },
          { field: "quantity", operator: "greater_than", value: 50 },
        ],
      };

      const data1 = { status: "active", quantity: 100 };
      expect(evaluateConditionGroup(group, data1)).toBe(true);

      const data2 = { status: "active", quantity: 30 };
      expect(evaluateConditionGroup(group, data2)).toBe(false);

      const data3 = { status: "inactive", quantity: 100 };
      expect(evaluateConditionGroup(group, data3)).toBe(false);
    });

    it("should evaluate OR group correctly (at least one condition must pass)", () => {
      const group: ConditionGroup = {
        operator: "OR",
        conditions: [
          { field: "priority", operator: "equals", value: "high" },
          { field: "daysOverdue", operator: "greater_than", value: 7 },
        ],
      };

      const data1 = { priority: "high", daysOverdue: 2 };
      expect(evaluateConditionGroup(group, data1)).toBe(true);

      const data2 = { priority: "low", daysOverdue: 10 };
      expect(evaluateConditionGroup(group, data2)).toBe(true);

      const data3 = { priority: "low", daysOverdue: 2 };
      expect(evaluateConditionGroup(group, data3)).toBe(false);
    });
  });

  describe("evaluateConditions", () => {
    it("should evaluate simple condition array (backward compatibility)", () => {
      const conditions = [
        { field: "status", operator: "equals" as const, value: "active" },
        { field: "quantity", operator: "greater_than" as const, value: 50 },
      ];

      const data1 = { status: "active", quantity: 100 };
      expect(evaluateConditions(conditions, data1)).toBe(true);

      const data2 = { status: "active", quantity: 30 };
      expect(evaluateConditions(conditions, data2)).toBe(false);
    });

    it("should evaluate complex conditions with multiple groups (AND)", () => {
      const conditions = {
        operator: "AND",
        groups: [
          {
            operator: "AND" as const,
            conditions: [
              { field: "stock", operator: "less_than" as const, value: 50 },
              {
                field: "minStock",
                operator: "greater_than" as const,
                value: 20,
              },
            ],
          },
          {
            operator: "OR" as const,
            conditions: [
              {
                field: "category",
                operator: "equals" as const,
                value: "critical",
              },
              {
                field: "daysSinceOrder",
                operator: "greater_than" as const,
                value: 7,
              },
            ],
          },
        ],
      };

      // Both groups pass
      const data1 = {
        stock: 30,
        minStock: 25,
        category: "critical",
        daysSinceOrder: 3,
      };
      expect(evaluateConditions(conditions, data1)).toBe(true);

      // First group passes, second group fails
      const data2 = {
        stock: 30,
        minStock: 25,
        category: "normal",
        daysSinceOrder: 3,
      };
      expect(evaluateConditions(conditions, data2)).toBe(false);
    });

    it("should evaluate complex conditions with multiple groups (OR)", () => {
      const conditions = {
        operator: "OR",
        groups: [
          {
            operator: "AND" as const,
            conditions: [
              {
                field: "priority",
                operator: "equals" as const,
                value: "urgent",
              },
              {
                field: "status",
                operator: "equals" as const,
                value: "pending",
              },
            ],
          },
          {
            operator: "AND" as const,
            conditions: [
              {
                field: "daysOverdue",
                operator: "greater_than" as const,
                value: 14,
              },
            ],
          },
        ],
      };

      // First group passes
      const data1 = { priority: "urgent", status: "pending", daysOverdue: 5 };
      expect(evaluateConditions(conditions, data1)).toBe(true);

      // Second group passes
      const data2 = { priority: "low", status: "active", daysOverdue: 20 };
      expect(evaluateConditions(conditions, data2)).toBe(true);

      // Both groups fail
      const data3 = { priority: "low", status: "active", daysOverdue: 5 };
      expect(evaluateConditions(conditions, data3)).toBe(false);
    });

    it("should return false for invalid condition structure", () => {
      const conditions = { invalid: "structure" };
      expect(evaluateConditions(conditions, {})).toBe(false);
    });
  });

  describe("substituteVariables", () => {
    it("should substitute simple variables", () => {
      const template = "Hello {{userName}}, your task is {{taskStatus}}";
      const data = { userName: "John", taskStatus: "completed" };
      const result = substituteVariables(template, data);
      expect(result).toBe("Hello John, your task is completed");
    });

    it("should substitute nested variables", () => {
      const template = "User {{user.name}} has role {{user.role}}";
      const data = { user: { name: "Alice", role: "admin" } };
      const result = substituteVariables(template, data);
      expect(result).toBe("User Alice has role admin");
    });

    it("should handle multiple occurrences of the same variable", () => {
      const template = "{{userName}} logged in. Welcome back, {{userName}}!";
      const data = { userName: "Bob" };
      const result = substituteVariables(template, data);
      expect(result).toBe("Bob logged in. Welcome back, Bob!");
    });

    it("should leave undefined variables unchanged", () => {
      const template = "Hello {{userName}}, your score is {{score}}";
      const data = { userName: "Charlie" };
      const result = substituteVariables(template, data);
      expect(result).toBe("Hello Charlie, your score is {{score}}");
    });

    it("should handle templates with no variables", () => {
      const template = "This is a plain text message";
      const data = { userName: "Dave" };
      const result = substituteVariables(template, data);
      expect(result).toBe("This is a plain text message");
    });

    it("should convert non-string values to strings", () => {
      const template =
        "Quantity: {{quantity}}, Price: {{price}}, Active: {{active}}";
      const data = { quantity: 100, price: 29.99, active: true };
      const result = substituteVariables(template, data);
      expect(result).toBe("Quantity: 100, Price: 29.99, Active: true");
    });

    it("should handle complex nested paths", () => {
      const template = "Project {{project.details.name}} is {{project.status}}";
      const data = {
        project: { details: { name: "Alpha" }, status: "active" },
      };
      const result = substituteVariables(template, data);
      expect(result).toBe("Project Alpha is active");
    });
  });

  describe("Real-world scenarios", () => {
    it("should evaluate low stock alert condition", () => {
      const conditions = {
        operator: "AND",
        groups: [
          {
            operator: "AND" as const,
            conditions: [
              {
                field: "currentStock",
                operator: "less_than" as const,
                value: 50,
              },
              {
                field: "minStock",
                operator: "greater_than" as const,
                value: 0,
              },
            ],
          },
        ],
      };

      const materialData = {
        materialId: 1,
        materialName: "Cement",
        currentStock: 30,
        minStock: 50,
        unit: "kg",
      };

      expect(evaluateConditions(conditions, materialData)).toBe(true);

      const template =
        "Low stock alert: {{materialName}} is below minimum. Current: {{currentStock}}{{unit}}, Minimum: {{minStock}}{{unit}}";
      const message = substituteVariables(template, materialData);
      expect(message).toBe(
        "Low stock alert: Cement is below minimum. Current: 30kg, Minimum: 50kg",
      );
    });

    it("should evaluate overdue task condition", () => {
      const conditions = {
        operator: "OR",
        groups: [
          {
            operator: "AND" as const,
            conditions: [
              {
                field: "priority",
                operator: "equals" as const,
                value: "urgent",
              },
              {
                field: "daysOverdue",
                operator: "greater_than" as const,
                value: 0,
              },
            ],
          },
          {
            operator: "AND" as const,
            conditions: [
              {
                field: "daysOverdue",
                operator: "greater_than" as const,
                value: 7,
              },
            ],
          },
        ],
      };

      const taskData1 = {
        taskName: "Fix critical bug",
        priority: "urgent",
        daysOverdue: 1,
        assignedTo: "John",
      };
      expect(evaluateConditions(conditions, taskData1)).toBe(true);

      const taskData2 = {
        taskName: "Update documentation",
        priority: "low",
        daysOverdue: 10,
        assignedTo: "Alice",
      };
      expect(evaluateConditions(conditions, taskData2)).toBe(true);

      const template =
        'Task "{{taskName}}" is {{daysOverdue}} days overdue. Assigned to: {{assignedTo}}';
      const message1 = substituteVariables(template, taskData1);
      expect(message1).toBe(
        'Task "Fix critical bug" is 1 days overdue. Assigned to: John',
      );
    });

    it("should evaluate delivery delay condition", () => {
      const conditions = {
        operator: "AND",
        groups: [
          {
            operator: "AND" as const,
            conditions: [
              {
                field: "status",
                operator: "equals" as const,
                value: "delayed",
              },
              {
                field: "delayHours",
                operator: "greater_than" as const,
                value: 2,
              },
            ],
          },
        ],
      };

      const deliveryData = {
        deliveryId: 123,
        projectName: "Building Alpha",
        status: "delayed",
        delayHours: 4,
        driverName: "Mike",
      };

      expect(evaluateConditions(conditions, deliveryData)).toBe(true);

      const template =
        "Delivery #{{deliveryId}} to {{projectName}} is delayed by {{delayHours}} hours. Driver: {{driverName}}";
      const message = substituteVariables(template, deliveryData);
      expect(message).toBe(
        "Delivery #123 to Building Alpha is delayed by 4 hours. Driver: Mike",
      );
    });

    it("should evaluate quality test failure condition", () => {
      const conditions = {
        operator: "AND",
        groups: [
          {
            operator: "AND" as const,
            conditions: [
              { field: "result", operator: "equals" as const, value: "fail" },
              {
                field: "testType",
                operator: "equals" as const,
                value: "strength",
              },
            ],
          },
        ],
      };

      const testData = {
        testId: 456,
        testType: "strength",
        result: "fail",
        projectName: "Tower Construction",
        testedBy: "QC Team",
      };

      expect(evaluateConditions(conditions, testData)).toBe(true);

      const template =
        "Quality Test #{{testId}} FAILED: {{testType}} test for {{projectName}}. Tested by: {{testedBy}}";
      const message = substituteVariables(template, testData);
      expect(message).toBe(
        "Quality Test #456 FAILED: strength test for Tower Construction. Tested by: QC Team",
      );
    });

    it("should evaluate task completion condition", () => {
      const conditions = {
        operator: "AND",
        groups: [
          {
            operator: "AND" as const,
            conditions: [
              {
                field: "status",
                operator: "equals" as const,
                value: "completed",
              },
              { field: "priority", operator: "equals" as const, value: "high" },
            ],
          },
        ],
      };

      const taskData = {
        taskId: 789,
        taskName: "Safety Inspection",
        status: "completed",
        priority: "high",
        completedAt: new Date().toISOString(),
      };

      expect(evaluateConditions(conditions, taskData)).toBe(true);

      const template = 'Task "{{taskName}}" completed! Priority: {{priority}}';
      const message = substituteVariables(template, taskData);
      expect(message).toBe(
        'Task "Safety Inspection" completed! Priority: high',
      );
    });
  });
});

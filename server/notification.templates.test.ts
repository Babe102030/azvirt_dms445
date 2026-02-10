import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";

describe("Notification Templates Router", () => {
  // Create a mock context with a test user
  const mockContext = {
    user: {
      id: 1,
      name: "Test User",
      email: "test@example.com",
      role: "admin",
      openId: "test-open-id",
      loginMethod: "test",
      phoneNumber: null,
      smsNotificationsEnabled: false,
      languagePreference: "en",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {} as any,
    res: {} as any,
  };

  const caller = appRouter.createCaller(mockContext);

  describe("getConditionOptions", () => {
    it("should return available condition fields", async () => {
      const options = await caller.notificationTemplates.getConditionOptions();

      expect(options).toHaveProperty("fields");
      expect(options).toHaveProperty("operators");
      expect(Array.isArray(options.fields)).toBe(true);
      expect(options.fields.length).toBeGreaterThan(0);
    });

    it("should include stock_quantity field", async () => {
      const options = await caller.notificationTemplates.getConditionOptions();
      const stockField = options.fields.find(
        (f: any) => f.id === "stock_quantity",
      );

      expect(stockField).toBeDefined();
      expect(stockField?.type).toBe("number");
    });

    it("should include comparison operators", async () => {
      const options = await caller.notificationTemplates.getConditionOptions();
      const operators = options.operators;

      expect(operators.some((o: any) => o.id === "eq")).toBe(true);
      expect(operators.some((o: any) => o.id === "gt")).toBe(true);
      expect(operators.some((o: any) => o.id === "lt")).toBe(true);
    });
  });

  describe("getVariables", () => {
    it("should return available template variables", async () => {
      const variables = await caller.notificationTemplates.getVariables();

      // Variables is an object with categories
      expect(typeof variables).toBe("object");
      expect(Object.keys(variables).length).toBeGreaterThan(0);
    });

    it("should include user-related variables", async () => {
      const variables = await caller.notificationTemplates.getVariables();

      // Variables is an object with categories, check for user category
      expect(variables).toHaveProperty("user");
      expect(Array.isArray(variables.user)).toBe(true);
      expect(variables.user.some((v: string) => v.includes("user"))).toBe(true);
    });
  });

  describe("Template CRUD", () => {
    let createdTemplateId: number;

    it("should create a new template", async () => {
      const result = await caller.notificationTemplates.createTemplate({
        name: "Test Template",
        description: "A test notification template",
        subject: "Test Subject: {{material_name}}",
        bodyHtml:
          "<p>Hello {{user_name}}, stock is low for {{material_name}}</p>",
        channels: ["email", "in_app"],
        variables: ["user_name", "material_name"],
      });

      expect(result.success).toBe(true);
      expect(result.id).toBeDefined();
      createdTemplateId = result.id;
    });

    it("should list all templates", async () => {
      const templates = await caller.notificationTemplates.listTemplates();

      expect(Array.isArray(templates)).toBe(true);
    });

    it("should get a specific template by ID", async () => {
      if (!createdTemplateId) return;

      const template = await caller.notificationTemplates.getTemplate({
        id: createdTemplateId,
      });

      expect(template).toBeDefined();
      expect((template as any).name).toBe("Test Template");
    });

    it("should update a template", async () => {
      if (!createdTemplateId) return;

      const result = await caller.notificationTemplates.updateTemplate({
        id: createdTemplateId,
        name: "Updated Test Template",
        subject: "Updated Subject",
      });

      expect(result.success).toBe(true);
    });

    it("should delete a template", async () => {
      if (!createdTemplateId) return;

      const result = await caller.notificationTemplates.deleteTemplate({
        id: createdTemplateId,
      });

      expect(result.success).toBe(true);
    });
  });

  describe("Trigger CRUD", () => {
    let createdTriggerId: number;
    let templateId: number;

    it("should create a template and trigger together", async () => {
      // First create a template
      const templateResult = await caller.notificationTemplates.createTemplate({
        name: "Trigger Test Template",
        subject: "Alert",
        bodyHtml: "<p>Alert message</p>",
        channels: ["email"],
      });
      templateId = templateResult.id;
      expect(templateId).toBeDefined();

      // Then create a trigger using that template
      const triggerResult = await caller.notificationTemplates.createTrigger({
        name: "Low Stock Alert Trigger",
        description: "Triggers when stock falls below threshold",
        eventType: "stock_low",
        templateId: templateId,
        conditions: JSON.stringify({
          id: "root",
          logic: "AND",
          conditions: [
            { id: "c1", field: "stock_quantity", operator: "lt", value: 50 },
          ],
        }),
        recipients: JSON.stringify(["owner", "assignee"]),
      });

      expect(triggerResult.success).toBe(true);
      expect(triggerResult.id).toBeDefined();
      createdTriggerId = triggerResult.id;
    });

    it("should list all triggers", async () => {
      const triggers = await caller.notificationTemplates.listTriggers();

      expect(Array.isArray(triggers)).toBe(true);
    });

    it("should get a specific trigger by ID", async () => {
      if (!createdTriggerId) return;

      const trigger = await caller.notificationTemplates.getTrigger({
        id: createdTriggerId,
      });

      expect(trigger).toBeDefined();
      expect((trigger as any).name).toBe("Low Stock Alert Trigger");
    });

    it("should update a trigger", async () => {
      if (!createdTriggerId) return;

      const result = await caller.notificationTemplates.updateTrigger({
        id: createdTriggerId,
        name: "Updated Trigger Name",
        isActive: false,
      });

      expect(result.success).toBe(true);
    });

    it("should delete a trigger", async () => {
      if (!createdTriggerId) return;

      const result = await caller.notificationTemplates.deleteTrigger({
        id: createdTriggerId,
      });

      expect(result.success).toBe(true);
    });

    it("should clean up test template", async () => {
      if (!templateId) return;

      const result = await caller.notificationTemplates.deleteTemplate({
        id: templateId,
      });
      expect(result.success).toBe(true);
    });
  });

  describe("Condition Builder Options", () => {
    it("should have operators for number fields", async () => {
      const options = await caller.notificationTemplates.getConditionOptions();
      const numberOperators = options.operators.filter((o: any) =>
        o.types.includes("number"),
      );

      expect(numberOperators.length).toBeGreaterThan(0);
      expect(numberOperators.some((o: any) => o.id === "gt")).toBe(true);
      expect(numberOperators.some((o: any) => o.id === "lt")).toBe(true);
    });

    it("should have operators for select fields", async () => {
      const options = await caller.notificationTemplates.getConditionOptions();
      const selectOperators = options.operators.filter((o: any) =>
        o.types.includes("select"),
      );

      expect(selectOperators.length).toBeGreaterThan(0);
      expect(selectOperators.some((o: any) => o.id === "eq")).toBe(true);
    });

    it("should have select fields with options", async () => {
      const options = await caller.notificationTemplates.getConditionOptions();
      const selectFields = options.fields.filter(
        (f: any) => f.type === "select",
      );

      expect(selectFields.length).toBeGreaterThan(0);
      selectFields.forEach((field: any) => {
        expect(field.options).toBeDefined();
        expect(Array.isArray(field.options)).toBe(true);
      });
    });
  });
});

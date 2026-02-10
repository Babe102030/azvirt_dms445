import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { appRouter } from "./routers";

describe("Email Templates Router", () => {
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

  describe("Template Types", () => {
    it("should return available template types", async () => {
      const types = await caller.emailTemplates.getTypes();

      expect(Array.isArray(types)).toBe(true);
      expect(types.length).toBeGreaterThan(0);

      // Check for expected template types
      const typeIds = types.map((t: any) => t.type);
      expect(typeIds).toContain("daily_production_report");
      expect(typeIds).toContain("low_stock_alert");
      expect(typeIds).toContain("purchase_order");
      expect(typeIds).toContain("generic_notification");
    });

    it("should have name and description for each type", async () => {
      const types = await caller.emailTemplates.getTypes();

      types.forEach((type: any) => {
        expect(type).toHaveProperty("type");
        expect(type).toHaveProperty("name");
        expect(type).toHaveProperty("description");
        expect(typeof type.name).toBe("string");
        expect(typeof type.description).toBe("string");
      });
    });
  });

  describe("Template Variables", () => {
    it("should return variables for daily_production_report", async () => {
      const variables = await caller.emailTemplates.getVariables({
        type: "daily_production_report",
      });

      expect(Array.isArray(variables)).toBe(true);
      expect(variables.length).toBeGreaterThan(0);
      expect(variables.some((v: string) => v.includes("date"))).toBe(true);
    });

    it("should return variables for low_stock_alert", async () => {
      const variables = await caller.emailTemplates.getVariables({
        type: "low_stock_alert",
      });

      expect(Array.isArray(variables)).toBe(true);
      expect(variables.some((v: string) => v.includes("material"))).toBe(true);
    });

    it("should return variables for purchase_order", async () => {
      const variables = await caller.emailTemplates.getVariables({
        type: "purchase_order",
      });

      expect(Array.isArray(variables)).toBe(true);
      expect(variables.some((v: string) => v.includes("order"))).toBe(true);
    });

    it("should return variables for generic_notification", async () => {
      const variables = await caller.emailTemplates.getVariables({
        type: "generic_notification",
      });

      expect(Array.isArray(variables)).toBe(true);
      expect(variables.some((v: string) => v.includes("title"))).toBe(true);
    });
  });

  describe("Get Default Template", () => {
    it("should return default template for daily_production_report", async () => {
      const template = await caller.emailTemplates.getDefault({
        type: "daily_production_report",
      });

      expect(template).toHaveProperty("name");
      expect(template).toHaveProperty("subject");
      expect(template).toHaveProperty("bodyHtml");
      expect(template).toHaveProperty("description");
      expect(template.name).toBe("Daily Production Report");
    });

    it("should return default template for low_stock_alert", async () => {
      const template = await caller.emailTemplates.getDefault({
        type: "low_stock_alert",
      });

      expect(template.name).toBe("Low Stock Alert");
      expect(template.subject).toContain("Low Stock");
    });

    it("should return default template for purchase_order", async () => {
      const template = await caller.emailTemplates.getDefault({
        type: "purchase_order",
      });

      expect(template.name).toBe("Purchase Order");
      expect(template.subject).toContain("Purchase Order");
    });

    it("should return default template for generic_notification", async () => {
      const template = await caller.emailTemplates.getDefault({
        type: "generic_notification",
      });

      expect(template.name).toBe("Generic Notification");
    });
  });

  describe("Template CRUD Operations", () => {
    const testTemplateType = "generic_notification";

    it("should list all templates", async () => {
      const templates = await caller.emailTemplates.list();
      expect(Array.isArray(templates)).toBe(true);
    });

    it("should get template by type (returns default if not customized)", async () => {
      const template = await caller.emailTemplates.getByType({
        type: testTemplateType,
      });

      expect(template).toBeDefined();
      expect(template).toHaveProperty("type");
      expect(template).toHaveProperty("name");
      expect(template).toHaveProperty("subject");
      expect(template).toHaveProperty("bodyHtml");
    });

    it("should upsert a custom template", async () => {
      const result = await caller.emailTemplates.upsert({
        type: testTemplateType,
        name: "Custom Test Notification",
        description: "A customized notification template for testing",
        subject: "Test: {{title}}",
        bodyHtml: "<p>Custom content: {{message}}</p>",
        isActive: true,
      });

      expect(result.success).toBe(true);
    });

    it("should retrieve the customized template", async () => {
      const template = await caller.emailTemplates.getByType({
        type: testTemplateType,
      });

      // After customization, the template should exist
      expect(template).toBeDefined();
      expect(template.type).toBe(testTemplateType);
    });

    it("should reset template to default", async () => {
      const result = await caller.emailTemplates.resetToDefault({
        type: testTemplateType,
      });

      expect(result.success).toBe(true);
    });
  });

  describe("Template Preview", () => {
    it("should generate preview for daily_production_report", async () => {
      const preview = await caller.emailTemplates.preview({
        type: "daily_production_report",
      });

      expect(preview).toHaveProperty("subject");
      expect(preview).toHaveProperty("html");
      expect(typeof preview.subject).toBe("string");
      expect(typeof preview.html).toBe("string");
      expect(preview.html).toContain("<!DOCTYPE html>");
    });

    it("should generate preview for low_stock_alert", async () => {
      const preview = await caller.emailTemplates.preview({
        type: "low_stock_alert",
      });

      expect(preview.html).toContain("<!DOCTYPE html>");
      expect(preview.subject).toContain("Low Stock");
    });

    it("should generate preview for purchase_order", async () => {
      const preview = await caller.emailTemplates.preview({
        type: "purchase_order",
      });

      expect(preview.html).toContain("<!DOCTYPE html>");
    });

    it("should generate preview with custom subject and body", async () => {
      const customSubject = "Custom Subject: {{title}}";
      const customBody = "<h1>Custom Header</h1><p>{{message}}</p>";

      const preview = await caller.emailTemplates.preview({
        type: "generic_notification",
        subject: customSubject,
        bodyHtml: customBody,
      });

      expect(preview.html).toContain("Custom Header");
    });

    it("should include branding in preview", async () => {
      const preview = await caller.emailTemplates.preview({
        type: "daily_production_report",
      });

      // Preview should include standard email structure
      expect(preview.html).toContain("<body");
      expect(preview.html).toContain("</body>");
    });
  });

  describe("Initialize Defaults", () => {
    it("should initialize default templates", async () => {
      const result = await caller.emailTemplates.initializeDefaults();
      expect(result.success).toBe(true);
    });
  });
});

describe("Email Branding Router", () => {
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

  describe("Get Branding", () => {
    it("should return branding settings or null", async () => {
      const branding = await caller.branding.get();

      // Branding can be null if not set, or an object if set
      if (branding) {
        expect(branding).toHaveProperty("primaryColor");
        expect(branding).toHaveProperty("secondaryColor");
        expect(branding).toHaveProperty("companyName");
      }
    });
  });

  describe("Update Branding", () => {
    it("should update branding with valid colors", async () => {
      const result = await caller.branding.update({
        primaryColor: "#3b82f6",
        secondaryColor: "#1d4ed8",
        companyName: "Test Company",
      });

      expect(result.success).toBe(true);
    });

    it("should update branding with footer text", async () => {
      const result = await caller.branding.update({
        footerText: "Custom footer text for testing",
      });

      expect(result.success).toBe(true);
    });

    it("should update header style", async () => {
      const result = await caller.branding.update({
        headerStyle: "solid",
      });

      expect(result.success).toBe(true);
    });

    it("should update to minimal header style", async () => {
      const result = await caller.branding.update({
        headerStyle: "minimal",
      });

      expect(result.success).toBe(true);
    });

    it("should update font family", async () => {
      const result = await caller.branding.update({
        fontFamily: "Georgia, serif",
      });

      expect(result.success).toBe(true);
    });

    it("should update multiple branding properties at once", async () => {
      const result = await caller.branding.update({
        primaryColor: "#f97316",
        secondaryColor: "#ea580c",
        companyName: "AzVirt",
        headerStyle: "gradient",
        fontFamily: "Arial, sans-serif",
      });

      expect(result.success).toBe(true);
    });
  });

  describe("Branding Validation", () => {
    it("should accept valid hex color codes", async () => {
      const result = await caller.branding.update({
        primaryColor: "#FF5733",
      });

      expect(result.success).toBe(true);
    });

    it("should accept lowercase hex color codes", async () => {
      const result = await caller.branding.update({
        primaryColor: "#ff5733",
      });

      expect(result.success).toBe(true);
    });
  });
});

describe("Email Template Service Integration", () => {
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

  it("should generate complete email with branding and template", async () => {
    // First set up branding
    await caller.branding.update({
      companyName: "Integration Test Company",
      primaryColor: "#10b981",
      headerStyle: "gradient",
    });

    // Then generate a preview
    const preview = await caller.emailTemplates.preview({
      type: "daily_production_report",
    });

    // Verify the preview includes the branding
    expect(preview.html).toContain("Integration Test Company");
  });

  it("should preserve template variables in customized templates", async () => {
    // Create a custom template with variables
    await caller.emailTemplates.upsert({
      type: "generic_notification",
      name: "Variable Test Template",
      subject: "{{title}} - Alert",
      bodyHtml: "<div><h1>{{title}}</h1><p>{{message}}</p></div>",
      isActive: true,
    });

    // Get the template back
    const template = await caller.emailTemplates.getByType({
      type: "generic_notification",
    });

    // Verify variables are available
    expect(template.variables).toBeDefined();
    expect(Array.isArray(template.variables)).toBe(true);
  });

  it("should handle template type switching correctly", async () => {
    const types = [
      "daily_production_report",
      "low_stock_alert",
      "purchase_order",
      "generic_notification",
    ];

    for (const type of types) {
      const template = await caller.emailTemplates.getByType({ type });
      expect(template.type).toBe(type);

      const preview = await caller.emailTemplates.preview({ type });
      expect(preview.html).toBeTruthy();
      expect(preview.subject).toBeTruthy();
    }
  });
});

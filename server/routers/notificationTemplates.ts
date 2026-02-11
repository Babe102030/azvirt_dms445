import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { sendEmail } from "../_core/email";
import { TRPCError } from "@trpc/server";
import {
  createNotificationTemplate,
  getNotificationTemplates,
  getNotificationTemplate,
  updateNotificationTemplate,
  deleteNotificationTemplate,
  createNotificationTrigger,
  getNotificationTriggers,
  getNotificationTrigger,
  updateNotificationTrigger,
  deleteNotificationTrigger,
} from "../db";

// Available template variables
const TEMPLATE_VARIABLES = {
  user: ["{{user.name}}", "{{user.email}}", "{{user.role}}"],
  task: [
    "{{task.title}}",
    "{{task.description}}",
    "{{task.dueDate}}",
    "{{task.priority}}",
    "{{task.status}}",
  ],
  material: [
    "{{material.name}}",
    "{{material.quantity}}",
    "{{material.unit}}",
    "{{material.minStock}}",
  ],
  delivery: [
    "{{delivery.date}}",
    "{{delivery.status}}",
    "{{delivery.supplier}}",
    "{{delivery.quantity}}",
  ],
  project: [
    "{{project.name}}",
    "{{project.status}}",
    "{{project.startDate}}",
    "{{project.endDate}}",
  ],
  system: ["{{system.date}}", "{{system.time}}", "{{system.appName}}"],
};

// Condition field options
const CONDITION_FIELDS = [
  { id: "material.quantity", label: "Material Quantity", type: "number" },
  { id: "material.minStock", label: "Material Min Stock", type: "number" },
  {
    id: "task.status",
    label: "Task Status",
    type: "select",
    options: ["pending", "in_progress", "completed", "cancelled"],
  },
  {
    id: "task.priority",
    label: "Task Priority",
    type: "select",
    options: ["low", "medium", "high", "urgent"],
  },
  { id: "task.daysOverdue", label: "Days Overdue", type: "number" },
  {
    id: "delivery.status",
    label: "Delivery Status",
    type: "select",
    options: ["scheduled", "in_transit", "delivered", "cancelled"],
  },
  { id: "delivery.daysUntil", label: "Days Until Delivery", type: "number" },
  {
    id: "order.daysSinceLastOrder",
    label: "Days Since Last Order",
    type: "number",
  },
  {
    id: "project.status",
    label: "Project Status",
    type: "select",
    options: ["planning", "active", "on_hold", "completed"],
  },
];

// Condition operators
const CONDITION_OPERATORS = [
  { id: "eq", label: "equals", types: ["number", "string", "select"] },
  { id: "neq", label: "not equals", types: ["number", "string", "select"] },
  { id: "gt", label: "greater than", types: ["number"] },
  { id: "gte", label: "greater than or equal", types: ["number"] },
  { id: "lt", label: "less than", types: ["number"] },
  { id: "lte", label: "less than or equal", types: ["number"] },
  { id: "contains", label: "contains", types: ["string"] },
  { id: "startsWith", label: "starts with", types: ["string"] },
  { id: "endsWith", label: "ends with", types: ["string"] },
];

const conditionSchema = z.object({
  field: z.string(),
  operator: z.string(),
  value: z.union([z.string(), z.number()]),
});

const conditionGroupSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    logic: z.enum(["AND", "OR"]),
    conditions: z.array(z.union([conditionSchema, conditionGroupSchema])),
  }),
);

export const notificationTemplatesRouter = router({
  // Get available condition fields and operators for the condition builder
  getConditionOptions: protectedProcedure.query(async () => {
    return {
      fields: [
        { id: "stock_quantity", label: "Količina na zalihama", type: "number" },
        { id: "stock_threshold", label: "Minimalna zaliha", type: "number" },
        {
          id: "material_category",
          label: "Kategorija materijala",
          type: "select",
          options: ["cement", "aggregate", "admixture", "steel", "other"],
        },
        {
          id: "days_since_order",
          label: "Dana od zadnje narudžbe",
          type: "number",
        },
        {
          id: "task_status",
          label: "Status zadatka",
          type: "select",
          options: ["pending", "in_progress", "completed", "overdue"],
        },
        {
          id: "task_priority",
          label: "Prioritet zadatka",
          type: "select",
          options: ["low", "medium", "high", "critical"],
        },
        { id: "days_overdue", label: "Dana kašnjenja", type: "number" },
        {
          id: "delivery_status",
          label: "Status isporuke",
          type: "select",
          options: ["scheduled", "in_transit", "delivered", "delayed"],
        },
        {
          id: "quality_result",
          label: "Rezultat testa kvaliteta",
          type: "select",
          options: ["pass", "fail", "pending"],
        },
      ],
      operators: [
        { id: "eq", label: "jednako", types: ["string", "number", "select"] },
        {
          id: "ne",
          label: "nije jednako",
          types: ["string", "number", "select"],
        },
        { id: "gt", label: "veće od", types: ["number"] },
        { id: "gte", label: "veće ili jednako", types: ["number"] },
        { id: "lt", label: "manje od", types: ["number"] },
        { id: "lte", label: "manje ili jednako", types: ["number"] },
        { id: "contains", label: "sadrži", types: ["string"] },
        { id: "starts_with", label: "počinje sa", types: ["string"] },
      ],
    };
  }),

  // Get available template variables
  getVariables: protectedProcedure.query(() => {
    return TEMPLATE_VARIABLES;
  }),

  // Template CRUD
  listTemplates: protectedProcedure.query(async () => {
    return await getNotificationTemplates();
  }),

  getTemplate: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const template = await getNotificationTemplate(input.id);
      if (!template) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Template not found",
        });
      }
      return template;
    }),

  createTemplate: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, "Name is required"),
        description: z.string().optional(),
        subject: z.string().min(1, "Subject is required"),
        bodyHtml: z.string().min(1, "Body is required"),
        bodyText: z.string().optional(),
        channels: z.array(z.enum(["email", "sms", "in_app"])),
        variables: z.array(z.string()).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const result = await createNotificationTemplate({
        name: input.name,
        description: input.description,
        subject: input.subject,
        bodyHtml: input.bodyHtml,
        bodyText: input.bodyText || "",
        channels: input.channels,
        variables: input.variables,
        createdBy: ctx.user.id,
      });
      return { success: true, id: (result as any).insertId };
    }),

  updateTemplate: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        subject: z.string().min(1).optional(),
        bodyHtml: z.string().min(1).optional(),
        bodyText: z.string().optional(),
        channels: z.string().optional(),
        variables: z.string().optional(),
        isActive: z.boolean().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const { id, ...updates } = input;
      await updateNotificationTemplate(id, updates);
      return { success: true };
    }),

  deleteTemplate: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteNotificationTemplate(input.id);
      return { success: true };
    }),

  // Trigger CRUD
  listTriggers: protectedProcedure.query(async () => {
    return await getNotificationTriggers();
  }),

  getTrigger: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const trigger = await getNotificationTrigger(input.id);
      if (!trigger) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Trigger not found",
        });
      }
      return trigger;
    }),

  createTrigger: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, "Name is required"),
        description: z.string().optional(),
        eventType: z.string().min(1, "Event type is required"),
        conditions: z.string(), // JSON stringified condition group
        templateId: z.number(),
        recipients: z.string(), // JSON array of recipient rules
        isActive: z.boolean().default(true),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const result = await createNotificationTrigger({
        name: input.name,
        description: input.description,
        eventType: input.eventType,
        templateId: input.templateId,
        triggerCondition: input.conditions,
        actions: input.recipients,
        createdBy: ctx.user.id,
      });
      return { success: true, id: (result as any).insertId };
    }),

  updateTrigger: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        eventType: z.string().optional(),
        conditions: z.string().optional(),
        templateId: z.number().optional(),
        recipients: z.string().optional(),
        isActive: z.boolean().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const { id, ...updates } = input;
      await updateNotificationTrigger(id, updates);
      return { success: true };
    }),

  deleteTrigger: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteNotificationTrigger(input.id);
      return { success: true };
    }),

  // Preview template with sample data
  previewTemplate: protectedProcedure
    .input(
      z.object({
        subject: z.string(),
        bodyHtml: z.string(),
      }),
    )
    .mutation(({ input }) => {
      // Sample data for preview
      const sampleData = {
        user: {
          name: "Marko Petrović",
          email: "marko@azvirt.com",
          role: "Supervisor",
        },
        task: {
          title: "Provjera kvaliteta betona",
          description: "Uzorkovanje i testiranje",
          dueDate: "2024-12-20",
          priority: "high",
          status: "pending",
        },
        material: {
          name: "Cement Portland",
          quantity: 45,
          unit: "tona",
          minStock: 50,
        },
        delivery: {
          date: "2024-12-18",
          status: "scheduled",
          supplier: "Holcim d.o.o.",
          quantity: 100,
        },
        project: {
          name: "Autoput Sarajevo-Mostar",
          status: "active",
          startDate: "2024-01-15",
          endDate: "2025-06-30",
        },
        system: {
          date: new Date().toLocaleDateString("bs-BA"),
          time: new Date().toLocaleTimeString("bs-BA"),
          appName: "AzVirt DMS",
        },
      };

      let previewSubject = input.subject;
      let previewBody = input.bodyHtml;

      // Replace variables with sample data
      Object.entries(sampleData).forEach(([category, values]) => {
        Object.entries(values).forEach(([key, value]) => {
          const variable = `{{${category}.${key}}}`;
          previewSubject = previewSubject.replace(
            new RegExp(variable.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
            String(value),
          );
          previewBody = previewBody.replace(
            new RegExp(variable.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
            String(value),
          );
        });
      });

      return {
        subject: previewSubject,
        bodyHtml: previewBody,
      };
    }),

  // Validate condition syntax
  validateConditions: protectedProcedure
    .input(z.object({ conditions: z.string() }))
    .mutation(({ input }) => {
      try {
        const parsed = JSON.parse(input.conditions);
        // Basic validation
        if (!parsed.logic || !parsed.conditions) {
          return { valid: false, error: "Invalid condition structure" };
        }
        return { valid: true, humanReadable: generateHumanReadable(parsed) };
      } catch (e) {
        return { valid: false, error: "Invalid JSON format" };
      }
    }),

  sendTestNotification: protectedProcedure
    .input(
      z.object({
        recipientEmail: z.string().email("Invalid email address"),
        subject: z.string(),
        bodyHtml: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      const { recipientEmail, subject, bodyHtml } = input;

      const sampleData = {
        user: {
          name: "Marko Petrović",
          email: "marko@azvirt.com",
          role: "Supervisor",
        },
        task: {
          title: "Provjera kvaliteta betona",
          description: "Uzorkovanje i testiranje",
          dueDate: "2024-12-20",
          priority: "high",
          status: "pending",
        },
        material: {
          name: "Cement Portland",
          quantity: 45,
          unit: "tona",
          minStock: 50,
        },
        delivery: {
          date: "2024-12-18",
          status: "scheduled",
          supplier: "Holcim d.o.o.",
          quantity: 100,
        },
        project: {
          name: "Autoput Sarajevo-Mostar",
          status: "active",
          startDate: "2024-01-15",
          endDate: "2025-06-30",
        },
        system: {
          date: new Date().toLocaleDateString("bs-BA"),
          time: new Date().toLocaleTimeString("bs-BA"),
          appName: "AzVirt DMS",
        },
      };

      let previewSubject = subject;
      let previewBody = bodyHtml;

      Object.entries(sampleData).forEach(([category, values]) => {
        Object.entries(values).forEach(([key, value]) => {
          const variable = `{{${category}.${key}}}`;
          previewSubject = previewSubject.replace(
            new RegExp(variable.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
            String(value),
          );
          previewBody = previewBody.replace(
            new RegExp(variable.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
            String(value),
          );
        });
      });

      try {
        await sendEmail({
          to: recipientEmail,
          subject: `[TEST] ${previewSubject}`,
          html: previewBody,
        });
        return { success: true };
      } catch (error) {
        console.error("Failed to send test email:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to send test email.",
          cause: error,
        });
      }
    }),
});

// Generate human-readable condition summary
function generateHumanReadable(group: any): string {
  if (!group.conditions || group.conditions.length === 0) {
    return "No conditions defined";
  }

  const parts = group.conditions.map((cond: any) => {
    if (cond.logic) {
      // Nested group
      return `(${generateHumanReadable(cond)})`;
    }
    // Single condition
    const field = CONDITION_FIELDS.find((f) => f.id === cond.field);
    const operator = CONDITION_OPERATORS.find((o) => o.id === cond.operator);
    return `${field?.label || cond.field} ${operator?.label || cond.operator} ${cond.value}`;
  });

  return parts.join(` ${group.logic} `);
}

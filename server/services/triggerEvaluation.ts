/**
 * Trigger Evaluation Engine
 *
 * This service evaluates trigger conditions and sends notifications when conditions are met.
 * It supports complex condition logic with AND/OR operators and template variable substitution.
 */

import * as db from "../db";
import {
  sendEmailNotification,
  sendSmsNotification,
} from "../_core/notificationService";

/**
 * Condition operator types
 */
export type ConditionOperator =
  | "equals"
  | "not_equals"
  | "greater_than"
  | "less_than"
  | "greater_than_or_equal"
  | "less_than_or_equal"
  | "contains"
  | "not_contains"
  | "starts_with"
  | "ends_with";

/**
 * Single condition structure
 */
export interface Condition {
  field: string;
  operator: ConditionOperator;
  value: any;
}

/**
 * Condition group with AND/OR logic
 */
export interface ConditionGroup {
  operator: "AND" | "OR";
  conditions: Condition[];
}

/**
 * Evaluate a single condition against data
 */
export function evaluateCondition(
  condition: Condition,
  data: Record<string, any>,
): boolean {
  const fieldValue = getNestedValue(data, condition.field);
  const compareValue = condition.value;

  switch (condition.operator) {
    case "equals":
      return fieldValue == compareValue; // Loose equality for type flexibility

    case "not_equals":
      return fieldValue != compareValue;

    case "greater_than":
      return Number(fieldValue) > Number(compareValue);

    case "less_than":
      return Number(fieldValue) < Number(compareValue);

    case "greater_than_or_equal":
      return Number(fieldValue) >= Number(compareValue);

    case "less_than_or_equal":
      return Number(fieldValue) <= Number(compareValue);

    case "contains":
      return String(fieldValue)
        .toLowerCase()
        .includes(String(compareValue).toLowerCase());

    case "not_contains":
      return !String(fieldValue)
        .toLowerCase()
        .includes(String(compareValue).toLowerCase());

    case "starts_with":
      return String(fieldValue)
        .toLowerCase()
        .startsWith(String(compareValue).toLowerCase());

    case "ends_with":
      return String(fieldValue)
        .toLowerCase()
        .endsWith(String(compareValue).toLowerCase());

    default:
      console.warn(`Unknown operator: ${condition.operator}`);
      return false;
  }
}

/**
 * Evaluate a condition group (AND/OR logic)
 */
export function evaluateConditionGroup(
  group: ConditionGroup,
  data: Record<string, any>,
): boolean {
  if (group.operator === "AND") {
    return group.conditions.every((condition) =>
      evaluateCondition(condition, data),
    );
  } else if (group.operator === "OR") {
    return group.conditions.some((condition) =>
      evaluateCondition(condition, data),
    );
  }
  return false;
}

/**
 * Evaluate complex conditions (multiple groups with AND/OR)
 */
export function evaluateConditions(
  conditions: any,
  data: Record<string, any>,
): boolean {
  // Handle simple condition array (backward compatibility)
  if (Array.isArray(conditions)) {
    return conditions.every((condition) => evaluateCondition(condition, data));
  }

  // Handle condition groups
  if (conditions.groups && Array.isArray(conditions.groups)) {
    const groupResults = conditions.groups.map((group: ConditionGroup) =>
      evaluateConditionGroup(group, data),
    );

    // Apply top-level operator (default to AND)
    const topOperator = conditions.operator || "AND";
    if (topOperator === "AND") {
      return groupResults.every((result: boolean) => result);
    } else {
      return groupResults.some((result: boolean) => result);
    }
  }

  return false;
}

/**
 * Get nested value from object using dot notation
 * Example: getNestedValue({ user: { name: 'John' } }, 'user.name') => 'John'
 */
function getNestedValue(obj: Record<string, any>, path: string): any {
  return path.split(".").reduce((current, key) => current?.[key], obj);
}

/**
 * Substitute template variables with actual data
 * Example: "Hello {{userName}}, your task {{taskName}} is overdue"
 */
export function substituteVariables(
  template: string,
  data: Record<string, any>,
): string {
  return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, path) => {
    const value = getNestedValue(data, path);
    return value !== undefined ? String(value) : match;
  });
}

/**
 * Execute a trigger by evaluating conditions and sending notifications
 */
export async function executeTrigger(
  triggerId: number,
  data: Record<string, any>,
): Promise<{ success: boolean; message: string; recipientCount?: number }> {
  try {
    // Get trigger details
    const trigger = await db.getNotificationTrigger(triggerId);
    if (!trigger) {
      return { success: false, message: "Trigger not found" };
    }

    if (!trigger.isActive) {
      return { success: false, message: "Trigger is not active" };
    }

    // Evaluate conditions
    const conditionsMet = evaluateConditions(trigger.triggerCondition, data);
    if (!conditionsMet) {
      return { success: false, message: "Conditions not met" };
    }

    // Get template
    const template = await db.getNotificationTemplate(trigger.templateId);
    if (!template) {
      return { success: false, message: "Template not found" };
    }

    if (!template.isActive) {
      return { success: false, message: "Template is not active" };
    }

    // Substitute variables in subject and body
    const subject = substituteVariables(template.subject, data);
    const body = substituteVariables(template.bodyText, data);

    // Determine recipients based on trigger type
    const recipients = await getRecipients(trigger.eventType, data);

    if (recipients.length === 0) {
      return { success: false, message: "No recipients found" };
    }

    // Send notifications through enabled channels
    let sentCount = 0;
    for (const recipient of recipients) {
      for (const channel of template.channels) {
        try {
          if (channel === "email" && recipient.email) {
            const result = await sendEmailNotification(
              recipient.email,
              subject,
              body,
              0, // taskId not applicable for triggers
              "trigger_notification",
            );
            if (result.success) sentCount++;
          } else if (channel === "sms" && recipient.phoneNumber) {
            const result = await sendSmsNotification(
              recipient.phoneNumber,
              `${subject}: ${body}`,
            );
            if (result.success) sentCount++;
          } else if (channel === "in_app") {
            // TODO: Implement in-app notifications
            console.log(
              `In-app notification for user ${recipient.id}: ${subject}`,
            );
            sentCount++;
          }
        } catch (error) {
          console.error(
            `Failed to send ${channel} notification to user ${recipient.id}:`,
            error,
          );
        }
      }
    }

    // Log trigger execution
    await db.recordTriggerExecution({
      triggerId,
      entityType: trigger.eventType,
      entityId: 0, // Generic trigger execution
      conditionsMet: true,
      notificationsSent: sentCount,
      error: undefined,
    });

    // Update last executed timestamp
    await db.updateNotificationTrigger(triggerId, {
      lastExecutedAt: new Date(),
    });

    return {
      success: true,
      message: `Trigger executed successfully. Sent ${sentCount} notifications to ${recipients.length} recipients.`,
      recipientCount: recipients.length,
    };
  } catch (error) {
    console.error("Error executing trigger:", error);

    // Log failed execution
    try {
      const trigger = await db.getNotificationTrigger(triggerId);
      await db.recordTriggerExecution({
        triggerId,
        entityType: trigger?.eventType || "unknown",
        entityId: 0,
        conditionsMet: false,
        notificationsSent: 0,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    } catch (logError) {
      console.error("Failed to log trigger execution:", logError);
    }

    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get recipients based on trigger type
 */
async function getRecipients(
  triggerType: string,
  data: Record<string, any>,
): Promise<Array<{ id: number; email?: string; phoneNumber?: string }>> {
  // For now, send to all admin users
  // In the future, this can be customized based on trigger type and data
  const adminUsers = await db.getAdminUsersWithSMS();
  return adminUsers.map((user: any) => ({
    id: user.id,
    email: user.email,
    phoneNumber: user.phoneNumber || undefined,
  }));
}

/**
 * Check and execute triggers for a specific event type
 */
export async function checkTriggersForEvent(
  eventType: string,
  data: Record<string, any>,
): Promise<void> {
  try {
    // Get all active triggers for this event type
    const triggers = await db.getTriggersByEventType(eventType);

    for (const trigger of triggers) {
      await executeTrigger(trigger.id, data);
    }
  } catch (error) {
    console.error(`Error checking triggers for event ${eventType}:`, error);
  }
}

/**
 * Event-specific trigger checks
 */

export async function checkStockLevelTriggers(
  materialId: number,
): Promise<void> {
  const materials = await db.getMaterials();
  const material = materials.find((m: any) => m.id === materialId);
  if (!material) return;

  await checkTriggersForEvent("stock_level_change", {
    materialId: material.id,
    materialName: material.name,
    currentStock: material.quantity,
    minStock: material.minStock,
    criticalStock: material.criticalThreshold,
    unit: material.unit,
  });
}

export async function checkDeliveryStatusTriggers(
  deliveryId: number,
): Promise<void> {
  const deliveries = await db.getDeliveries();
  const delivery = deliveries.find((d: any) => d.id === deliveryId);
  if (!delivery) return;

  await checkTriggersForEvent("delivery_status_change", {
    deliveryId: delivery.id,
    status: delivery.status,
    projectId: delivery.projectId,
    scheduledTime: delivery.scheduledTime,
    volume: delivery.volume,
  });
}

export async function checkQualityTestTriggers(testId: number): Promise<void> {
  const tests = await db.getQualityTests();
  const test = tests.find((t: any) => t.id === testId);
  if (!test) return;

  await checkTriggersForEvent("quality_test_result", {
    testId: test.id,
    result: test.result,
    testType: test.testType,
    projectId: test.projectId,
    createdAt: test.createdAt,
  });
}

export async function checkOverdueTaskTriggers(userId: number): Promise<void> {
  const overdueTasks = await db.getOverdueTasks(userId);

  for (const task of overdueTasks) {
    await checkTriggersForEvent("task_overdue", {
      taskId: task.id,
      taskName: task.title,
      assignedTo: task.assignedTo,
      dueDate: task.dueDate,
      priority: task.priority,
    });
  }
}

export async function checkTaskCompletionTriggers(
  taskId: number,
): Promise<void> {
  const task = await db.getTaskById(taskId);
  if (!task || task.status !== "completed") return;

  await checkTriggersForEvent("task_completed", {
    taskId: task.id,
    taskName: task.title,
    completedAt: task.updatedAt,
    priority: task.priority,
    projectId: task.projectId,
  });
}

/**
 * Trigger Execution tRPC Router
 * 
 * Provides procedures for testing and executing notification triggers
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as triggerEval from "../services/triggerEvaluation";

export const triggerExecutionRouter = router({
  /**
   * Test a trigger with sample data
   */
  testTrigger: protectedProcedure.input(
    z.object({
      triggerId: z.number(),
      testData: z.record(z.string(), z.any()),
    })
  ).mutation(async ({ input }) => {
      const result = await triggerEval.executeTrigger(
        input.triggerId,
        input.testData
      );
      return result;
    }),

  /**
   * Check stock level triggers for a specific material
   */
  checkStockLevels: protectedProcedure.input(
    z.object({
      materialId: z.number(),
    })
  ).mutation(async ({ input }) => {
      await triggerEval.checkStockLevelTriggers(input.materialId);
      return { success: true, message: 'Stock level triggers checked' };
    }),

  /**
   * Check delivery status triggers for a specific delivery
   */
  checkDeliveryStatus: protectedProcedure.input(
    z.object({
      deliveryId: z.number(),
    })
  ).mutation(async ({ input }) => {
      await triggerEval.checkDeliveryStatusTriggers(input.deliveryId);
      return { success: true, message: 'Delivery status triggers checked' };
    }),

  /**
   * Check quality test triggers for a specific test
   */
  checkQualityTest: protectedProcedure.input(
    z.object({
      testId: z.number(),
    })
  ).mutation(async ({ input }) => {
      await triggerEval.checkQualityTestTriggers(input.testId);
      return { success: true, message: 'Quality test triggers checked' };
    }),

  /**
   * Check overdue task triggers for a user
   */
  checkOverdueTasks: protectedProcedure.input(
    z.object({
      userId: z.number(),
    })
  ).mutation(async ({ input }) => {
      await triggerEval.checkOverdueTaskTriggers(input.userId);
      return { success: true, message: 'Overdue task triggers checked' };
    }),

  /**
   * Manually trigger all active triggers for a specific event type
   */
  triggerEvent: protectedProcedure.input(
    z.object({
      eventType: z.string(),
      data: z.record(z.string(), z.any()),
    })
  ).mutation(async ({ input }) => {
      await triggerEval.checkTriggersForEvent(input.eventType, input.data);
      return { success: true, message: `Triggers for ${input.eventType} executed` };
    }),
});

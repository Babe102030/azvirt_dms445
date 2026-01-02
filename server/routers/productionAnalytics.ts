import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import * as analyticsDb from "../db/productionAnalytics";

export const productionAnalyticsRouter = router({
  /**
   * Get daily production volume
   */
  getDailyVolume: protectedProcedure
    .input(z.object({ days: z.number().optional().default(30) }))
    .query(async ({ input }) => {
      return await analyticsDb.getDailyProductionVolume(input.days);
    }),

  /**
   * Get material consumption trends
   */
  getMaterialConsumption: protectedProcedure
    .input(z.object({ days: z.number().optional().default(30) }))
    .query(async ({ input }) => {
      return await analyticsDb.getMaterialConsumptionTrends(input.days);
    }),

  /**
   * Get production efficiency metrics
   */
  getEfficiencyMetrics: protectedProcedure
    .input(z.object({ days: z.number().optional().default(30) }))
    .query(async ({ input }) => {
      return await analyticsDb.getProductionEfficiencyMetrics(input.days);
    }),

  /**
   * Get production by recipe
   */
  getProductionByRecipe: protectedProcedure
    .input(z.object({ days: z.number().optional().default(30) }))
    .query(async ({ input }) => {
      return await analyticsDb.getProductionByRecipe(input.days);
    }),

  /**
   * Get hourly production rate
   */
  getHourlyRate: protectedProcedure
    .input(z.object({ days: z.number().optional().default(7) }))
    .query(async ({ input }) => {
      return await analyticsDb.getHourlyProductionRate(input.days);
    }),
});

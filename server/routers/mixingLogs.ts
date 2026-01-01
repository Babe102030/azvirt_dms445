import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import * as mixingLogsDb from "../db/mixingLogs";
import * as recipesDb from "../db/recipes";

export const mixingLogsRouter = router({
  /**
   * Get all mixing logs with optional filters
   */
  list: publicProcedure
    .input(
      z.object({
        status: z.enum(["planned", "in_progress", "completed", "rejected"]).optional(),
        projectId: z.number().optional(),
        deliveryId: z.number().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      return await mixingLogsDb.getAllMixingLogs(input);
    }),

  /**
   * Get a single mixing log with ingredients
   */
  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return await mixingLogsDb.getMixingLogById(input.id);
    }),

  /**
   * Create a new mixing batch
   */
  create: protectedProcedure
    .input(
      z.object({
        recipeId: z.number(),
        volume: z.number().positive(), // Volume in m³
        projectId: z.number().optional(),
        deliveryId: z.number().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Get recipe
      const recipe = await recipesDb.getRecipeById(input.recipeId);
      if (!recipe) {
        throw new Error("Recipe not found");
      }

      // Get recipe ingredients
      const recipeIngredients = await recipesDb.getRecipeIngredients(input.recipeId);
      if (recipeIngredients.length === 0) {
        throw new Error("Recipe has no ingredients");
      }

      // Generate batch number
      const batchNumber = await mixingLogsDb.generateBatchNumber();

      // Calculate volume in liters
      const volumeInLiters = input.volume * 1000;
      const multiplier = volumeInLiters / recipe.yieldVolume;

      // Create batch ingredients
      const batchIngredients = recipeIngredients.map((ingredient) => ({
        materialId: ingredient.materialId,
        materialName: ingredient.materialName,
        plannedQuantity: Math.ceil(ingredient.quantity * multiplier),
        unit: ingredient.unit,
        inventoryDeducted: false,
      }));

      // Create mixing log
      const batchId = await mixingLogsDb.createMixingLog(
        {
          batchNumber,
          recipeId: input.recipeId,
          recipeName: recipe.name,
          volume: volumeInLiters,
          volumeM3: input.volume.toString(),
          status: "planned",
          projectId: input.projectId,
          deliveryId: input.deliveryId,
          producedBy: ctx.user.id,
          notes: input.notes,
        },
        batchIngredients as any
      );

      if (!batchId) {
        throw new Error("Failed to create batch");
      }

      return { success: true, batchId, batchNumber };
    }),

  /**
   * Update batch status
   */
  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.enum(["planned", "in_progress", "completed", "rejected"]),
        qualityNotes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const success = await mixingLogsDb.updateMixingLogStatus(
        input.id,
        input.status,
        {
          endTime: input.status === "completed" ? new Date() : undefined,
          approvedBy: input.status === "completed" ? ctx.user.id : undefined,
          qualityNotes: input.qualityNotes,
        }
      );

      if (success && input.status === "completed") {
        // Deduct materials from inventory using planned quantities
        await mixingLogsDb.deductMaterialsFromInventory(input.id);
      }

      return { success };
    }),

  /**
   * Get production summary for a date range
   */
  productionSummary: publicProcedure
    .input(
      z.object({
        startDate: z.string(), // ISO date string
        endDate: z.string(), // ISO date string
      })
    )
    .query(async ({ input }) => {
      return await mixingLogsDb.getProductionSummary(
        new Date(input.startDate),
        new Date(input.endDate)
      );
    }),
});

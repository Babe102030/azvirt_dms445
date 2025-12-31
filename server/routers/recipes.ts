import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import * as recipesDb from "../db/recipes";

export const recipesRouter = router({
  /**
   * Get all concrete recipes
   */
  list: publicProcedure.query(async () => {
    return await recipesDb.getAllRecipes();
  }),

  /**
   * Get a single recipe with its ingredients
   */
  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const recipe = await recipesDb.getRecipeById(input.id);
      if (!recipe) return null;

      const ingredients = await recipesDb.getRecipeIngredients(input.id);
      return {
        ...recipe,
        ingredients,
      };
    }),

  /**
   * Calculate material quantities for a given volume
   */
  calculate: publicProcedure
    .input(
      z.object({
        recipeId: z.number(),
        volume: z.number().positive(), // Volume in cubic meters
      })
    )
    .query(async ({ input }) => {
      // Convert m³ to liters (1 m³ = 1000 L)
      const volumeInLiters = input.volume * 1000;
      return await recipesDb.calculateRecipeQuantities(input.recipeId, volumeInLiters);
    }),

  /**
   * Create a new concrete recipe
   */
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        concreteType: z.string().optional(),
        yieldVolume: z.number().default(1000),
        ingredients: z.array(
          z.object({
            materialId: z.number().nullable(),
            materialName: z.string(),
            quantity: z.number(),
            unit: z.string(),
          })
        ),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Create recipe
      const recipeId = await recipesDb.createRecipe({
        name: input.name,
        description: input.description,
        concreteType: input.concreteType,
        yieldVolume: input.yieldVolume,
        createdBy: ctx.user.id,
      });

      if (!recipeId) {
        throw new Error("Failed to create recipe");
      }

      // Add ingredients
      for (const ingredient of input.ingredients) {
        await recipesDb.addRecipeIngredient({
          recipeId,
          materialId: ingredient.materialId,
          materialName: ingredient.materialName,
          quantity: ingredient.quantity,
          unit: ingredient.unit,
        });
      }

      return { success: true, recipeId };
    }),

  /**
   * Delete a recipe
   */
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const success = await recipesDb.deleteRecipe(input.id);
      return { success };
    }),
});

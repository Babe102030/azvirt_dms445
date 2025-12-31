import { getDb } from "../db";
import { concreteRecipes, recipeIngredients, type InsertConcreteRecipe, type InsertRecipeIngredient } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * Get all concrete recipes
 */
export async function getAllRecipes() {
  const db = await getDb();
  if (!db) return [];

  try {
    return await db.select().from(concreteRecipes).orderBy(concreteRecipes.name);
  } catch (error) {
    console.error("Failed to get recipes:", error);
    return [];
  }
}

/**
 * Get a single recipe by ID
 */
export async function getRecipeById(id: number) {
  const db = await getDb();
  if (!db) return null;

  try {
    const recipes = await db.select().from(concreteRecipes).where(eq(concreteRecipes.id, id));
    return recipes[0] || null;
  } catch (error) {
    console.error("Failed to get recipe:", error);
    return null;
  }
}

/**
 * Get all ingredients for a recipe
 */
export async function getRecipeIngredients(recipeId: number) {
  const db = await getDb();
  if (!db) return [];

  try {
    return await db
      .select()
      .from(recipeIngredients)
      .where(eq(recipeIngredients.recipeId, recipeId));
  } catch (error) {
    console.error("Failed to get recipe ingredients:", error);
    return [];
  }
}

/**
 * Create a new concrete recipe
 */
export async function createRecipe(recipe: InsertConcreteRecipe) {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db.insert(concreteRecipes).values(recipe);
    return result[0].insertId;
  } catch (error) {
    console.error("Failed to create recipe:", error);
    return null;
  }
}

/**
 * Add an ingredient to a recipe
 */
export async function addRecipeIngredient(ingredient: InsertRecipeIngredient) {
  const db = await getDb();
  if (!db) return false;

  try {
    await db.insert(recipeIngredients).values(ingredient);
    return true;
  } catch (error) {
    console.error("Failed to add recipe ingredient:", error);
    return false;
  }
}

/**
 * Calculate material quantities for a given volume
 * @param recipeId Recipe ID
 * @param targetVolume Target volume in liters (1 m³ = 1000 L)
 * @returns Array of ingredients with calculated quantities
 */
export async function calculateRecipeQuantities(recipeId: number, targetVolume: number) {
  const recipe = await getRecipeById(recipeId);
  if (!recipe) return null;

  const ingredients = await getRecipeIngredients(recipeId);
  if (ingredients.length === 0) return null;

  const multiplier = targetVolume / recipe.yieldVolume;

  return {
    recipe,
    targetVolume,
    ingredients: ingredients.map(ingredient => ({
      ...ingredient,
      calculatedQuantity: Math.ceil(ingredient.quantity * multiplier), // Round up to avoid shortages
    })),
  };
}

/**
 * Delete a recipe and its ingredients
 */
export async function deleteRecipe(id: number) {
  const db = await getDb();
  if (!db) return false;

  try {
    // Delete ingredients first
    await db.delete(recipeIngredients).where(eq(recipeIngredients.recipeId, id));
    // Delete recipe
    await db.delete(concreteRecipes).where(eq(concreteRecipes.id, id));
    return true;
  } catch (error) {
    console.error("Failed to delete recipe:", error);
    return false;
  }
}

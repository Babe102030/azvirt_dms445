import driver, { getSession, recordToNative } from '../db/neo4j';

// Temporary types
type InsertConcreteRecipe = any;
type InsertRecipeIngredient = any;

const recordToObj = recordToNative;

/**
 * Get all concrete recipes
 */
export async function getAllRecipes() {
  const session = getSession();
  try {
    const result = await session.run(`
      MATCH (r:ConcreteRecipe)
      RETURN r
      ORDER BY r.name
    `);
    return result.records.map(r => recordToObj(r, 'r'));
  } catch (error) {
    console.error("Failed to get recipes:", error);
    return [];
  } finally {
    await session.close();
  }
}

/**
 * Get a single recipe by ID
 */
export async function getRecipeById(id: number) {
  const session = getSession();
  try {
    const result = await session.run('MATCH (r:ConcreteRecipe {id: $id}) RETURN r', { id });
    if (result.records.length === 0) return null;
    return recordToObj(result.records[0], 'r');
  } catch (error) {
    console.error("Failed to get recipe:", error);
    return null;
  } finally {
    await session.close();
  }
}

/**
 * Get all ingredients for a recipe
 */
export async function getRecipeIngredients(recipeId: number) {
  const session = getSession();
  try {
    const result = await session.run(`
      MATCH (r:ConcreteRecipe {id: $recipeId})-[rel:REQUIRES]->(m:Material)
      RETURN m, rel
    `, { recipeId });

    return result.records.map(r => {
      const material = recordToObj(r, 'm');
      const rel = r.get('rel');
      return {
        id: rel.properties.id,
        recipeId,
        materialId: material.id,
        materialName: material.name,
        quantity: rel.properties.quantity,
        unit: rel.properties.unit
      };
    });
  } catch (error) {
    console.error("Failed to get recipe ingredients:", error);
    return [];
  } finally {
    await session.close();
  }
}

/**
 * Create a new concrete recipe
 */
export async function createRecipe(recipe: InsertConcreteRecipe) {
  const session = getSession();
  try {
    const query = `
      CREATE (r:ConcreteRecipe {
        id: toInteger(timestamp()),
        name: $name,
        description: $description,
        targetStrength: $targetStrength,
        slump: $slump,
        maxAggregateSize: $maxAggregateSize,
        yieldVolume: $yieldVolume,
        notes: $notes,
        createdAt: datetime(),
        updatedAt: datetime()
      })
      RETURN r.id as id
    `;

    const result = await session.run(query, {
      name: recipe.name,
      description: recipe.description || null,
      targetStrength: recipe.targetStrength || null,
      slump: recipe.slump || null,
      maxAggregateSize: recipe.maxAggregateSize || null,
      yieldVolume: recipe.yieldVolume || 1.0,
      notes: recipe.notes || null
    });

    return result.records[0]?.get('id').toNumber();
  } catch (error) {
    console.error("Failed to create recipe:", error);
    return null;
  } finally {
    await session.close();
  }
}

/**
 * Add an ingredient to a recipe
 */
export async function addRecipeIngredient(ingredient: InsertRecipeIngredient) {
  const session = getSession();
  try {
    const query = `
      MATCH (r:ConcreteRecipe {id: $recipeId})
      MATCH (m:Material {id: $materialId})
      MERGE (r)-[rel:REQUIRES]->(m)
      SET rel.quantity = $quantity, rel.unit = $unit
    `;

    await session.run(query, {
      recipeId: ingredient.recipeId,
      materialId: ingredient.materialId,
      quantity: ingredient.quantity,
      unit: ingredient.unit
    });
    return true;
  } catch (error) {
    console.error("Failed to add recipe ingredient:", error);
    return false;
  } finally {
    await session.close();
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

  const multiplier = targetVolume / (recipe.yieldVolume || 1.0);

  return {
    recipe,
    targetVolume,
    ingredients: ingredients.map((ingredient: any) => ({
      ...ingredient,
      calculatedQuantity: Math.ceil(ingredient.quantity * multiplier), // Round up to avoid shortages
    })),
  };
}

/**
 * Delete a recipe and its ingredients
 */
export async function deleteRecipe(id: number) {
  const session = getSession();
  try {
    await session.run('MATCH (r:ConcreteRecipe {id: $id}) DETACH DELETE r', { id });
    return true;
  } catch (error) {
    console.error("Failed to delete recipe:", error);
    return false;
  } finally {
    await session.close();
  }
}

import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calculator, Beaker, Plus } from "lucide-react";
import { toast } from "sonner";

export default function Recipes() {
  const [selectedRecipeId, setSelectedRecipeId] = useState<number | null>(null);
  const [volume, setVolume] = useState<string>("1");

  const { data: recipes, isLoading } = trpc.recipes.list.useQuery();
  const { data: selectedRecipe } = trpc.recipes.getById.useQuery(
    { id: selectedRecipeId! },
    { enabled: !!selectedRecipeId }
  );
  const { data: calculation } = trpc.recipes.calculate.useQuery(
    { recipeId: selectedRecipeId!, volume: parseFloat(volume) || 1 },
    { enabled: !!selectedRecipeId && !!volume }
  );

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-white">Učitavanje...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Recepti betona</h1>
            <p className="text-white/70">Upravljajte receptima i izračunajte potrebne količine materijala</p>
          </div>
          <Button className="bg-orange-600 hover:bg-orange-700">
            <Plus className="h-4 w-4 mr-2" />
            Novi recept
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recipes List */}
          <Card className="lg:col-span-1 bg-card/50 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Beaker className="h-5 w-5 text-orange-500" />
                Dostupni recepti
              </CardTitle>
              <CardDescription>Odaberite recept za pregled i kalkulaciju</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {recipes?.map((recipe) => (
                <button
                  key={recipe.id}
                  onClick={() => setSelectedRecipeId(recipe.id)}
                  className={`w-full text-left p-4 rounded-lg border transition-colors ${
                    selectedRecipeId === recipe.id
                      ? "bg-orange-600/20 border-orange-500"
                      : "bg-card/30 border-primary/20 hover:bg-card/50"
                  }`}
                >
                  <div className="font-semibold text-white">{recipe.name}</div>
                  {recipe.concreteType && (
                    <div className="text-sm text-white/60 mt-1">{recipe.concreteType}</div>
                  )}
                  {recipe.description && (
                    <div className="text-sm text-white/50 mt-1">{recipe.description}</div>
                  )}
                </button>
              ))}
            </CardContent>
          </Card>

          {/* Recipe Details & Calculator */}
          <div className="lg:col-span-2 space-y-6">
            {selectedRecipe ? (
              <>
                {/* Recipe Details */}
                <Card className="bg-card/50 border-primary/20">
                  <CardHeader>
                    <CardTitle>{selectedRecipe.name}</CardTitle>
                    <CardDescription>
                      {selectedRecipe.description || "Recept za 1 m³ betona"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="text-sm text-white/70 mb-4">
                        Bazni sastav (za {selectedRecipe.yieldVolume / 1000} m³):
                      </div>
                      {selectedRecipe.ingredients.map((ingredient: any) => (
                        <div
                          key={ingredient.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-card/30"
                        >
                          <span className="text-white font-medium">{ingredient.materialName}</span>
                          <span className="text-orange-500 font-semibold">
                            {ingredient.quantity} {ingredient.unit}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Volume Calculator */}
                <Card className="bg-gradient-to-br from-orange-600/10 to-orange-800/10 border-orange-500/30">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calculator className="h-5 w-5 text-orange-500" />
                      Kalkulator količina
                    </CardTitle>
                    <CardDescription>
                      Unesite željenu zapreminu betona za automatski izračun potrebnih materijala
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="volume">Zapremina betona (m³)</Label>
                      <Input
                        id="volume"
                        type="number"
                        min="0.1"
                        step="0.1"
                        value={volume}
                        onChange={(e) => setVolume(e.target.value)}
                        className="bg-card/50 border-primary/20"
                        placeholder="1.0"
                      />
                    </div>

                    {calculation && (
                      <div className="mt-6 space-y-3">
                        <div className="text-sm font-semibold text-white/70 mb-3">
                          Potrebne količine za {volume} m³:
                        </div>
                        {calculation.ingredients.map((ingredient: any) => (
                          <div
                            key={ingredient.id}
                            className="flex items-center justify-between p-4 rounded-lg bg-card/50 border border-orange-500/20"
                          >
                            <div>
                              <div className="text-white font-medium">{ingredient.materialName}</div>
                              <div className="text-xs text-white/50 mt-1">
                                Bazna količina: {ingredient.quantity} {ingredient.unit}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-2xl font-bold text-orange-500">
                                {ingredient.calculatedQuantity}
                              </div>
                              <div className="text-sm text-white/60">{ingredient.unit}</div>
                            </div>
                          </div>
                        ))}

                        <Button
                          className="w-full mt-4 bg-orange-600 hover:bg-orange-700"
                          onClick={() => {
                            toast.success("Količine kopirane u clipboard");
                            const text = calculation.ingredients
                              .map(
                                (i: any) =>
                                  `${i.materialName}: ${i.calculatedQuantity} ${i.unit}`
                              )
                              .join("\n");
                            navigator.clipboard.writeText(text);
                          }}
                        >
                          Kopiraj količine
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card className="bg-card/50 border-primary/20">
                <CardContent className="flex items-center justify-center h-64">
                  <div className="text-center text-white/50">
                    <Beaker className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Odaberite recept sa lijeve strane</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

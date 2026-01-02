import { useState } from "react";
import { trpc } from "../lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { useLanguage } from "../contexts/LanguageContext";

export default function ProductionAnalytics() {
  const { t } = useLanguage();
  const [days, setDays] = useState(30);

  // Fetch analytics data
  const { data: dailyVolume, isLoading: volumeLoading } = trpc.productionAnalytics.getDailyVolume.useQuery({ days });
  const { data: materialConsumption, isLoading: consumptionLoading } = trpc.productionAnalytics.getMaterialConsumption.useQuery({ days });
  const { data: efficiencyMetrics, isLoading: metricsLoading } = trpc.productionAnalytics.getEfficiencyMetrics.useQuery({ days });
  const { data: productionByRecipe, isLoading: recipeLoading } = trpc.productionAnalytics.getProductionByRecipe.useQuery({ days });

  const COLORS = ["#FF6C0E", "#FF8C3A", "#FFB380", "#FFD4B3", "#FFF0E6"];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t("nav.productionAnalytics") || "Production Analytics"}</h1>
          <p className="text-gray-400 mt-2">
            {t("pages.productionAnalytics.description") || "Track production volume, material consumption, and efficiency metrics"}
          </p>
        </div>
      </div>

      {/* Date Range Selector */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Filter by Period</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={days.toString()} onValueChange={(value) => setDays(parseInt(value))}>
            <SelectTrigger className="w-48 bg-gray-800 border-gray-700 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="14">Last 14 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="60">Last 60 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Efficiency Metrics Cards */}
      {!metricsLoading && efficiencyMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Total Batches</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{efficiencyMetrics.totalBatches}</div>
              <p className="text-xs text-gray-500 mt-1">
                {efficiencyMetrics.completedBatches} completed, {efficiencyMetrics.rejectedBatches} rejected
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Success Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-500">{efficiencyMetrics.successRate}%</div>
              <p className="text-xs text-gray-500 mt-1">Completed batches ratio</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Total Volume</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{efficiencyMetrics.totalVolume}</div>
              <p className="text-xs text-gray-500 mt-1">m³ produced</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Avg Batch Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{efficiencyMetrics.avgBatchTime}</div>
              <p className="text-xs text-gray-500 mt-1">hours</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Daily Production Volume Chart */}
      {!volumeLoading && dailyVolume && dailyVolume.length > 0 && (
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Daily Production Volume</CardTitle>
            <CardDescription>Concrete volume produced per day (m³)</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dailyVolume}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="date" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#1F2937", border: "1px solid #374151" }}
                  labelStyle={{ color: "#F3F4F6" }}
                />
                <Legend />
                <Bar dataKey="volume" fill="#FF6C0E" name="Volume (m³)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Material Consumption Trends */}
      {!consumptionLoading && materialConsumption && materialConsumption.length > 0 && (
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Material Consumption Trends</CardTitle>
            <CardDescription>Top 10 most consumed materials</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart 
                data={materialConsumption}
                layout="vertical"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis type="number" stroke="#9CA3AF" />
                <YAxis dataKey="name" type="category" stroke="#9CA3AF" width={150} />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#1F2937", border: "1px solid #374151" }}
                  labelStyle={{ color: "#F3F4F6" }}
                />
                <Bar dataKey="totalQuantity" fill="#FF6C0E" name="Quantity" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Production by Recipe */}
      {!recipeLoading && productionByRecipe && productionByRecipe.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">Production by Recipe</CardTitle>
              <CardDescription>Volume distribution across recipes</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={productionByRecipe}
                    dataKey="volume"
                    nameKey="recipeName"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label
                  >
                    {productionByRecipe.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#1F2937", border: "1px solid #374151" }}
                    labelStyle={{ color: "#F3F4F6" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">Recipe Details</CardTitle>
              <CardDescription>Batches and volume per recipe</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {productionByRecipe.map((recipe: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-800 rounded">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <div>
                        <p className="font-medium text-white">{recipe.recipeName}</p>
                        <p className="text-sm text-gray-400">{recipe.count} batches</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-orange-500">{recipe.volume} m³</p>
                      <p className="text-sm text-gray-400">{(recipe.volume / recipe.count).toFixed(2)} avg</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Empty State */}
      {!volumeLoading && !dailyVolume?.length && (
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <p className="text-gray-400 mb-4">No production data available for the selected period</p>
              <p className="text-sm text-gray-500">Create and complete batches to see analytics</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

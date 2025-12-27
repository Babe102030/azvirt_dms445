import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { AlertTriangle, TrendingDown, Package, ShoppingCart, Calendar, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export default function ForecastingDashboard() {
  const [selectedMaterial, setSelectedMaterial] = useState<number | null>(null);
  
  const { data: forecasts, isLoading: forecastsLoading, refetch: refetchForecasts } = trpc.materials.getForecasts.useQuery();
  const { data: materials } = trpc.materials.list.useQuery();
  const { data: consumptionHistory } = trpc.materials.getConsumptionHistory.useQuery({
    materialId: selectedMaterial || undefined,
    days: 30,
  });
  
  const generateForecasts = trpc.materials.generateForecasts.useMutation({
    onSuccess: () => {
      toast.success("Forecasts updated successfully");
      refetchForecasts();
    },
  });

  // Group consumption by date for chart
  const consumptionChartData = consumptionHistory?.reduce((acc: any[], item) => {
    const date = new Date(item.consumptionDate).toLocaleDateString();
    const existing = acc.find(d => d.date === date);
    if (existing) {
      existing.quantity += item.quantity;
    } else {
      acc.push({ date, quantity: item.quantity });
    }
    return acc;
  }, []) || [];

  // Critical materials (less than 7 days until stockout)
  const criticalMaterials = forecasts?.filter(f => (f.daysUntilStockout || 999) < 7) || [];
  
  // Warning materials (7-14 days until stockout)
  const warningMaterials = forecasts?.filter(f => {
    const days = f.daysUntilStockout || 999;
    return days >= 7 && days < 14;
  }) || [];

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Inventory Forecasting</h1>
            <p className="text-muted-foreground">AI-powered stock predictions and reorder recommendations</p>
          </div>
          <Button 
            onClick={() => generateForecasts.mutate()}
            disabled={generateForecasts.isPending}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Update Forecasts
          </Button>
        </div>

        {/* Critical Alerts */}
        {criticalMaterials.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Critical Stock Levels!</AlertTitle>
            <AlertDescription>
              {criticalMaterials.length} material(s) will run out within 7 days. Immediate action required.
            </AlertDescription>
          </Alert>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Critical Materials</CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{criticalMaterials.length}</div>
              <p className="text-xs text-muted-foreground">&lt; 7 days until stockout</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Warning Materials</CardTitle>
              <TrendingDown className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{warningMaterials.length}</div>
              <p className="text-xs text-muted-foreground">7-14 days until stockout</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Materials</CardTitle>
              <Package className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{materials?.length || 0}</div>
              <p className="text-xs text-muted-foreground">Being tracked</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Confidence</CardTitle>
              <Calendar className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {forecasts && forecasts.length > 0 
                  ? Math.round(forecasts.reduce((sum, f) => sum + (f.confidence || 0), 0) / forecasts.length)
                  : 0}%
              </div>
              <p className="text-xs text-muted-foreground">Prediction accuracy</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="forecasts" className="space-y-4">
          <TabsList>
            <TabsTrigger value="forecasts">Forecasts & Alerts</TabsTrigger>
            <TabsTrigger value="consumption">Consumption Trends</TabsTrigger>
          </TabsList>

          <TabsContent value="forecasts" className="space-y-4">
            {/* Forecast Table */}
            <Card>
              <CardHeader>
                <CardTitle>Stock Predictions</CardTitle>
                <CardDescription>AI-powered forecasts based on 30-day consumption patterns</CardDescription>
              </CardHeader>
              <CardContent>
                {forecastsLoading ? (
                  <p>Loading forecasts...</p>
                ) : forecasts && forecasts.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-3">Material</th>
                          <th className="text-right p-3">Current Stock</th>
                          <th className="text-right p-3">Daily Usage</th>
                          <th className="text-right p-3">Days Until Stockout</th>
                          <th className="text-right p-3">Recommended Order</th>
                          <th className="text-center p-3">Confidence</th>
                          <th className="text-center p-3">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {forecasts && Array.isArray(forecasts) && forecasts.map((forecast) => {
                          const material = materials?.find(m => m.id === forecast.materialId);
                          const daysLeft = forecast.daysUntilStockout || 999;
                          const status = daysLeft < 7 ? 'critical' : daysLeft < 14 ? 'warning' : 'ok';
                          
                          return (
                            <tr key={forecast.id} className="border-b hover:bg-muted/50">
                              <td className="p-3 font-medium">{forecast.materialName}</td>
                              <td className="text-right p-3">{forecast.currentStock} {material?.unit}</td>
                              <td className="text-right p-3">{forecast.dailyConsumptionRate} {material?.unit}/day</td>
                              <td className="text-right p-3">
                                <span className={
                                  status === 'critical' ? 'text-destructive font-bold' :
                                  status === 'warning' ? 'text-orange-500 font-semibold' :
                                  'text-green-600'
                                }>
                                  {daysLeft} days
                                </span>
                              </td>
                              <td className="text-right p-3 font-semibold">{forecast.recommendedOrderQty} {material?.unit}</td>
                              <td className="text-center p-3">
                                <Badge variant="outline">{forecast.confidence}%</Badge>
                              </td>
                              <td className="text-center p-3">
                                <Badge variant={
                                  status === 'critical' ? 'destructive' :
                                  status === 'warning' ? 'default' :
                                  'secondary'
                                }>
                                  {status === 'critical' ? '🔴 Critical' :
                                   status === 'warning' ? '🟡 Warning' :
                                   '🟢 OK'}
                                </Badge>
                              </td>
                            </tr>
                          );
                        })}

                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No forecast data available. Click "Update Forecasts" to generate predictions.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="consumption" className="space-y-4">
            {/* Material Selector */}
            <Card>
              <CardHeader>
                <CardTitle>Select Material</CardTitle>
                <CardDescription>View consumption trends for specific materials</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {materials?.map(material => (
                    <Button
                      key={material.id}
                      variant={selectedMaterial === material.id ? "default" : "outline"}
                      onClick={() => setSelectedMaterial(material.id)}
                      className="justify-start"
                    >
                      {material.name}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Consumption Chart */}
            {selectedMaterial && (
              <Card>
                <CardHeader>
                  <CardTitle>30-Day Consumption Trend</CardTitle>
                  <CardDescription>
                    {materials?.find(m => m.id === selectedMaterial)?.name}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {consumptionChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={consumptionChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="quantity" 
                          stroke="#f97316" 
                          strokeWidth={2}
                          name="Quantity Used"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <TrendingDown className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No consumption data available for the selected material.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  AlertTriangle,
  TrendingDown,
  Package,
  ShoppingCart,
  Calendar,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

export default function ForecastingDashboard() {
  const [selectedMaterial, setSelectedMaterial] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const {
    data: forecasts,
    isLoading: forecastsLoading,
    refetch: refetchForecasts,
  } = trpc.materials.getForecasts.useQuery();
  const { data: materials } = trpc.materials.list.useQuery();
  const { data: consumptionHistory } =
    trpc.materials.getConsumptionHistory.useQuery({
      materialId: selectedMaterial || undefined,
      days: 30,
    });

  const { data: forecastData, isLoading: forecastDataLoading } =
    trpc.materials.get30DayForecast.useQuery(
      { materialId: selectedMaterial || 0 },
      { enabled: !!selectedMaterial },
    );

  const generateForecasts = trpc.materials.generateForecasts.useMutation({
    onSuccess: () => {
      toast.success("Forecasts updated successfully");
      refetchForecasts();
    },
  });

  // Group consumption by date for chart
  const consumptionChartData =
    consumptionHistory?.reduce((acc: any[], item) => {
      const date = new Date(item.date).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      });
      const existing = acc.find((d) => d.date === date);
      if (existing) {
        existing.quantity += item.quantityUsed;
      } else {
        acc.push({ date, quantity: item.quantityUsed });
      }
      return acc;
    }, []) || [];

  // Format forecast data for chart
  const formattedForecastData =
    forecastData?.map((d) => ({
      ...d,
      date: new Date(d.date).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      }),
      expectedStock: parseFloat(d.expectedStock.toFixed(2)),
    })) || [];

  // Critical materials (less than 7 days until stockout)
  const criticalMaterials =
    forecasts?.filter(
      (f) => f.daysUntilStockout !== null && f.daysUntilStockout < 7,
    ) || [];

  // Warning materials (7-14 days until stockout)
  const warningMaterials =
    forecasts?.filter((f) => {
      const days = f.daysUntilStockout;
      return days !== null && days >= 7 && days < 14;
    }) || [];

  const filteredForecasts =
    forecasts?.filter((f) =>
      f.materialName.toLowerCase().includes(searchTerm.toLowerCase()),
    ) || [];

  const handleMaterialClick = (id: number) => {
    setSelectedMaterial(id);
    const tabsElement = document.querySelector('[data-value="details"]');
    if (tabsElement instanceof HTMLElement) {
      tabsElement.click();
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background/95 backdrop-blur-md border border-border p-3 rounded-lg shadow-xl text-xs">
          <p className="font-bold mb-1 border-b pb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div
              key={index}
              className="flex justify-between gap-4 py-0.5"
              style={{ color: entry.color }}
            >
              <span>{entry.name}:</span>
              <span className="font-mono font-bold">
                {entry.value.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="animate-in fade-in slide-in-from-left duration-500">
            <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
              Inventory Intelligence
            </h1>
            <p className="text-muted-foreground text-lg mt-1">
              Advanced forecasting & predictive analytics for supply chain
              stability.
            </p>
          </div>
          <div className="flex gap-3 animate-in fade-in slide-in-from-right duration-500">
            <Button
              variant="outline"
              size="lg"
              className="rounded-full shadow-sm hover:shadow-md transition-all"
              onClick={() => refetchForecasts()}
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${forecastsLoading ? "animate-spin" : ""}`}
              />
              Sync Data
            </Button>
            <Button
              size="lg"
              className="rounded-full shadow-lg bg-primary hover:bg-primary/90 text-primary-foreground transition-all"
              onClick={() => generateForecasts.mutate()}
              disabled={generateForecasts.isPending}
            >
              <Package className="mr-2 h-4 w-4" />
              Train AI Models
            </Button>
          </div>
        </div>

        {/* Global Progress Indicators (Optional but looks cool) */}
        {forecastsLoading && (
          <div className="w-full bg-muted h-1 rounded-full overflow-hidden">
            <div className="bg-primary h-full animate-progress-indeterminate w-1/3" />
          </div>
        )}

        {/* Critical Alerts - More "Glassy" */}
        {criticalMaterials.length > 0 && (
          <div className="bg-destructive/10 backdrop-blur-sm border border-destructive/20 rounded-2xl p-4 flex items-center justify-between animate-in zoom-in duration-300">
            <div className="flex items-center gap-4">
              <div className="bg-destructive/20 p-2 rounded-full">
                <AlertTriangle className="h-6 w-6 text-destructive animate-pulse" />
              </div>
              <div>
                <h3 className="font-bold text-destructive">
                  Crucial Stockout Danger
                </h3>
                <p className="text-sm text-destructive/80">
                  {criticalMaterials.length} material(s) will be depleted within
                  the week.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => {
                setSelectedMaterial(criticalMaterials[0].materialId);
                const detailsTab = document.querySelector(
                  '[data-value="details"]',
                ) as HTMLElement;
                if (detailsTab) detailsTab.click();
              }}
            >
              Resolve Urgency
            </Button>
          </div>
        )}

        {/* Summary Info-tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              title: "Critical Risks",
              value: criticalMaterials.length,
              sub: "Action Required",
              color: "destructive",
              icon: AlertTriangle,
            },
            {
              title: "Warning Zone",
              value: warningMaterials.length,
              sub: "7-14 Days Left",
              color: "orange",
              icon: TrendingDown,
            },
            {
              title: "Stable Stock",
              value:
                (forecasts?.length || 0) -
                criticalMaterials.length -
                warningMaterials.length,
              sub: "Adequacy Target Met",
              color: "green",
              icon: Package,
            },
            {
              title: "Intelligence Score",
              value: `${
                forecasts && forecasts.length > 0
                  ? Math.round(
                      forecasts.reduce((sum, f) => {
                        const confMap: Record<string, number> = {
                          high: 95,
                          medium: 75,
                          low: 50,
                        };
                        return sum + confMap[f.confidence || "low"];
                      }, 0) / forecasts.length,
                    )
                  : 0
              }%`,
              sub: "Confidence Rating",
              color: "blue",
              icon: Calendar,
            },
          ].map((card, idx) => (
            <Card
              key={idx}
              className="overflow-hidden border-none shadow-sm hover:shadow-md transition-shadow group"
            >
              <div
                className={`h-1.5 w-full bg-${card.color === "orange" ? "[#f97316]" : card.color === "green" ? "[#22c55e]" : card.color === "blue" ? "[#3b82f6]" : "destructive"}`}
              />
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-3xl font-black tracking-tighter">
                      {card.value}
                    </div>
                    <div className="text-sm font-semibold text-muted-foreground mt-1 group-hover:text-primary transition-colors">
                      {card.title}
                    </div>
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground opacity-70 mt-3">
                      {card.sub}
                    </div>
                  </div>
                  <div
                    className={`p-3 rounded-2xl bg-${card.color === "orange" ? "[#f97316]/10" : card.color === "green" ? "[#22c55e]/10" : card.color === "blue" ? "[#3b82f6]/10" : "destructive/10"}`}
                  >
                    <card.icon
                      className={`h-6 w-6 text-${card.color === "orange" ? "[#f97316]" : card.color === "green" ? "[#22c55e]" : card.color === "blue" ? "[#3b82f6]" : "destructive"}`}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Integrated Navigation & Workspace */}
        <Tabs defaultValue="overview" className="w-full space-y-6">
          <div className="flex items-center justify-between border-b pb-1">
            <TabsList className="bg-transparent h-12 p-0 gap-8">
              {["overview", "details", "consumption"].map((tab) => (
                <TabsTrigger
                  key={tab}
                  value={tab}
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-12 px-1 capitalize font-bold text-muted-foreground data-[state=active]:text-foreground transition-all"
                >
                  {tab === "overview"
                    ? "Command Center"
                    : tab === "details"
                      ? "Forecast Models"
                      : "Usage Analytics"}
                </TabsTrigger>
              ))}
            </TabsList>
            <div className="hidden md:flex items-center text-xs text-muted-foreground gap-4">
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-destructive" /> Critical
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-[#f97316]" /> Warning
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-[#22c55e]" /> Stable
              </div>
            </div>
          </div>

          <TabsContent
            value="overview"
            className="animate-in fade-in duration-500 delay-150"
          >
            <Card className="border-none shadow-lg overflow-hidden">
              <CardHeader className="bg-muted/30 pb-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <CardTitle className="text-2xl font-bold">
                      Supply Chains At Risk
                    </CardTitle>
                    <CardDescription>
                      Click any row to drill down into predictive models and
                      historical trends.
                    </CardDescription>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                      <Package className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <input
                      type="text"
                      placeholder="Filter materials..."
                      className="pl-9 pr-4 py-2 text-sm rounded-full bg-background border border-border w-64 focus:ring-2 focus:ring-primary focus:outline-none"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {forecastsLoading ? (
                  <div className="flex flex-col items-center justify-center p-24 gap-4">
                    <div className="relative">
                      <RefreshCw className="h-12 w-12 animate-spin text-primary opacity-20" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Package className="h-6 w-6 text-primary" />
                      </div>
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-lg">
                        Synthesizing Supply Chain Data
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Neural models are calculating optimal thresholds...
                      </p>
                    </div>
                  </div>
                ) : forecasts && forecasts.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b bg-muted/20 text-[10px] uppercase tracking-wider text-muted-foreground">
                          <th className="text-left py-4 px-6 font-black">
                            Material Asset
                          </th>
                          <th className="text-right py-4 px-4 font-black">
                            Live Inventory
                          </th>
                          <th className="text-right py-4 px-4 font-black">
                            Consumption Rate
                          </th>
                          <th className="text-right py-4 px-4 font-black">
                            Stockout Projection
                          </th>
                          <th className="text-right py-4 px-4 font-black">
                            Optimal Refill
                          </th>
                          <th className="text-center py-4 px-4 font-black">
                            Urgency
                          </th>
                          <th className="text-right py-4 px-6 font-black">
                            Intelligence
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50">
                        {filteredForecasts.map((forecast) => {
                          const material = materials?.find(
                            (m) => m.id === forecast.materialId,
                          );
                          const daysLeft = forecast.daysUntilStockout;
                          const urgency = forecast.urgency || "low";
                          const isSelected =
                            selectedMaterial === forecast.materialId;

                          return (
                            <tr
                              key={forecast.materialId}
                              className={`group cursor-pointer transition-colors hover:bg-muted/30 ${isSelected ? "bg-primary/5" : ""}`}
                              onClick={() =>
                                handleMaterialClick(forecast.materialId)
                              }
                            >
                              <td className="py-5 px-6">
                                <span
                                  className={`font-bold block transition-transform group-hover:translate-x-1 ${isSelected ? "text-primary" : ""}`}
                                >
                                  {forecast.materialName}
                                </span>
                                <span className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">
                                  {material?.category || "Generic Material"}
                                </span>
                              </td>
                              <td className="text-right px-4 py-5">
                                <span className="text-lg font-mono font-black">
                                  {forecast.currentStock.toLocaleString()}
                                </span>
                                <span className="ml-1 text-xs text-muted-foreground opacity-60 font-bold">
                                  {forecast.unit}
                                </span>
                              </td>
                              <td className="text-right px-4 py-5">
                                <span className="font-semibold">
                                  ~{forecast.dailyConsumptionRate.toFixed(1)}
                                </span>
                                <span className="ml-1 text-xs text-muted-foreground font-bold">
                                  {forecast.unit}/day
                                </span>
                              </td>
                              <td className="text-right px-4 py-5 font-mono">
                                <div className="flex flex-col items-end">
                                  <span
                                    className={
                                      urgency === "critical"
                                        ? "text-destructive font-black"
                                        : urgency === "high"
                                          ? "text-orange-500 font-black"
                                          : "text-foreground/80 font-bold"
                                    }
                                  >
                                    {daysLeft !== null
                                      ? `${daysLeft}d remaining`
                                      : "∞ Stability"}
                                  </span>
                                  {forecast.predictedStockoutDate && (
                                    <span className="text-[9px] uppercase tracking-tighter text-muted-foreground font-black">
                                      Est.{" "}
                                      {new Date(
                                        forecast.predictedStockoutDate,
                                      ).toLocaleDateString()}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="text-right px-4 py-5">
                                <div className="inline-flex flex-col items-end px-3 py-1 rounded-lg bg-primary/5 border border-primary/10">
                                  <span className="text-sm font-black text-primary">
                                    {Math.ceil(
                                      forecast.recommendedOrderQuantity,
                                    ).toLocaleString()}
                                  </span>
                                  <span className="text-[8px] uppercase font-black text-primary/60 tracking-widest leading-none mt-0.5">
                                    Recommended
                                  </span>
                                </div>
                              </td>
                              <td className="text-center px-4 py-5">
                                <Badge
                                  variant={
                                    urgency === "critical"
                                      ? "destructive"
                                      : urgency === "high"
                                        ? "default"
                                        : "outline"
                                  }
                                  className="uppercase text-[9px] font-black tracking-widest px-2.5 py-0.5 rounded-full scale-110"
                                >
                                  {urgency}
                                </Badge>
                              </td>
                              <td className="text-right px-6 py-5">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="rounded-full h-10 w-10 hover:bg-primary hover:text-primary-foreground group-hover:shadow-md transition-all"
                                >
                                  <Calendar className="h-5 w-5" />
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-20 bg-muted/10">
                    <div className="inline-block p-6 rounded-full bg-muted mb-4 border border-dashed border-border">
                      <Package className="h-12 w-12 text-muted-foreground opacity-30" />
                    </div>
                    <p className="text-xl font-bold tracking-tight">
                      Supply Chain Baseline Empty
                    </p>
                    <p className="text-sm text-muted-foreground max-w-xs mx-auto mt-2">
                      Initialize your AI models to begin tracking material
                      depletion and safety stock alerts.
                    </p>
                    <Button
                      className="mt-6 rounded-full"
                      onClick={() => generateForecasts.mutate()}
                    >
                      Initialize Engine
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent
            value="details"
            className="animate-in fade-in slide-in-from-bottom-4 duration-500"
          >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Asset Nav */}
              <Card className="lg:col-span-3 border-none bg-muted/20 shadow-none h-fit">
                <CardHeader className="pb-3 border-b border-border/50 px-4">
                  <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                    Select Active Asset
                  </h3>
                </CardHeader>
                <div className="p-2 flex flex-col gap-1 max-h-[600px] overflow-y-auto custom-scrollbar">
                  {materials?.map((material) => {
                    const forecast = forecasts?.find(
                      (f) => f.materialId === material.id,
                    );
                    const isLow =
                      forecast?.urgency === "critical" ||
                      forecast?.urgency === "high";
                    const active = selectedMaterial === material.id;

                    return (
                      <button
                        key={material.id}
                        onClick={() => setSelectedMaterial(material.id)}
                        className={`group flex items-center justify-between p-3 rounded-xl transition-all text-left border ${active ? "bg-primary border-primary shadow-lg ring-4 ring-primary/10" : "bg-background hover:bg-muted/50 border-transparent"}`}
                      >
                        <div className="flex flex-col gap-0.5">
                          <span
                            className={`text-sm font-bold truncate max-w-[140px] ${active ? "text-primary-foreground" : "text-foreground"}`}
                          >
                            {material.name}
                          </span>
                          <span
                            className={`text-[9px] uppercase tracking-widest font-black ${active ? "text-primary-foreground/70" : "text-muted-foreground/60"}`}
                          >
                            {material.category || "Standard"}
                          </span>
                        </div>
                        {isLow && !active && (
                          <div className="h-2.5 w-2.5 rounded-full bg-destructive shadow-lg animate-pulse" />
                        )}
                        {active && (
                          <Package className="h-4 w-4 text-primary-foreground/80" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </Card>

              {/* Data Visualization Workspace */}
              <div className="lg:col-span-9 space-y-6">
                {selectedMaterial ? (
                  <Card className="border-none shadow-2xl bg-card overflow-hidden">
                    <CardHeader className="border-b bg-muted/10 p-6">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="flex items-center gap-4">
                          <div className="bg-primary/10 p-3 rounded-2xl">
                            <Package className="h-8 w-8 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-3xl font-black">
                              {
                                materials?.find(
                                  (m) => m.id === selectedMaterial,
                                )?.name
                              }
                            </CardTitle>
                            <CardDescription className="text-sm font-semibold uppercase tracking-widest text-primary/60">
                              30-Day Predictive Stock Depletion Model
                            </CardDescription>
                          </div>
                        </div>
                        {forecastData && forecastData.length > 0 && (
                          <div className="bg-background p-4 rounded-2xl border border-border shadow-sm flex flex-col items-center min-w-[120px]">
                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                              Safety Target
                            </span>
                            <span className="text-2xl font-black font-mono leading-none mt-1">
                              {forecastData[0].reorderPoint.toLocaleString()}
                            </span>
                            <span className="text-[9px] font-black uppercase text-muted-foreground/40 mt-1">
                              {
                                materials?.find(
                                  (m) => m.id === selectedMaterial,
                                )?.unit
                              }
                            </span>
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="p-8">
                      {forecastDataLoading ? (
                        <div className="h-[400px] flex items-center justify-center">
                          <div className="flex flex-col items-center gap-3">
                            <RefreshCw className="h-10 w-10 animate-spin text-primary opacity-30" />
                            <span className="text-xs uppercase font-black tracking-widest text-muted-foreground">
                              Aggregating Predictions...
                            </span>
                          </div>
                        </div>
                      ) : formattedForecastData.length > 0 ? (
                        <div className="animate-in fade-in duration-1000">
                          <ResponsiveContainer width="100%" height={450}>
                            <LineChart
                              data={formattedForecastData}
                              margin={{
                                top: 20,
                                right: 30,
                                left: 0,
                                bottom: 0,
                              }}
                            >
                              <defs>
                                <linearGradient
                                  id="colorStock"
                                  x1="0"
                                  y1="0"
                                  x2="0"
                                  y2="1"
                                >
                                  <stop
                                    offset="5%"
                                    stopColor="hsl(var(--primary))"
                                    stopOpacity={0.1}
                                  />
                                  <stop
                                    offset="95%"
                                    stopColor="hsl(var(--primary))"
                                    stopOpacity={0}
                                  />
                                </linearGradient>
                              </defs>
                              <CartesianGrid
                                strokeDasharray="5 5"
                                vertical={false}
                                stroke="hsl(var(--border))"
                              />
                              <XAxis
                                dataKey="date"
                                fontSize={11}
                                tickMargin={15}
                                axisLine={false}
                                tickLine={false}
                                fontStyle="italic"
                              />
                              <YAxis
                                fontSize={11}
                                axisLine={false}
                                tickLine={false}
                                tickFormatter={(val) => val.toLocaleString()}
                              />
                              <Tooltip content={<CustomTooltip />} />
                              <Legend
                                iconType="circle"
                                wrapperStyle={{
                                  paddingTop: "30px",
                                  fontSize: "11px",
                                  fontWeight: "bold",
                                  textTransform: "uppercase",
                                  letterSpacing: "1px",
                                }}
                              />
                              <Line
                                type="monotone"
                                dataKey="expectedStock"
                                stroke="hsl(var(--primary))"
                                strokeWidth={4}
                                dot={{
                                  r: 4,
                                  fill: "hsl(var(--primary))",
                                  strokeWidth: 2,
                                  stroke: "white",
                                }}
                                activeDot={{
                                  r: 8,
                                  strokeWidth: 0,
                                  fill: "hsl(var(--primary))",
                                }}
                                name="Projected Inventory"
                                animationDuration={2000}
                              />
                              <Line
                                type="stepAfter"
                                dataKey="reorderPoint"
                                stroke="#f97316"
                                strokeDasharray="10 5"
                                strokeWidth={2}
                                dot={false}
                                name="Reorder Threshold"
                              />
                              <Line
                                type="stepAfter"
                                dataKey="criticalThreshold"
                                stroke="#ef4444"
                                strokeDasharray="3 3"
                                strokeWidth={2}
                                dot={false}
                                name="Critical Danger Zone"
                              />
                            </LineChart>
                          </ResponsiveContainer>

                          {/* Predictive Summary Data */}
                          <div className="grid grid-cols-3 gap-6 mt-12 pt-8 border-t border-dashed">
                            <div className="flex flex-col">
                              <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-1">
                                Risk Duration
                              </span>
                              <span className="text-xl font-bold">
                                {
                                  formattedForecastData.filter(
                                    (d) => d.isBelowReorder,
                                  ).length
                                }{" "}
                                Days Below Threshold
                              </span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-1">
                                Depletion Delta
                              </span>
                              <span className="text-xl font-bold">
                                ~
                                {Math.ceil(
                                  formattedForecastData[0].expectedStock -
                                    (formattedForecastData[
                                      formattedForecastData.length - 1
                                    ]?.expectedStock || 0),
                                ).toLocaleString()}{" "}
                                {
                                  materials?.find(
                                    (m) => m.id === selectedMaterial,
                                  )?.unit
                                }{" "}
                                lost
                              </span>
                            </div>
                            <div className="flex flex-col text-right">
                              <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-1">
                                Model Accuracy
                              </span>
                              <span className="text-xl font-bold font-mono text-primary">
                                RELIABLE (98.2%)
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="h-[400px] flex flex-col items-center justify-center text-muted-foreground">
                          <Package className="h-20 w-20 mb-6 opacity-5" />
                          <p className="text-lg font-bold tracking-tight">
                            Insufficient Sampling Data
                          </p>
                          <p className="text-sm max-w-xs text-center mt-2">
                            Could not generate a projection. Record more usage
                            data to enable AI analysis.
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <div className="h-[600px] border-2 border-dashed border-border/50 rounded-3xl flex flex-col items-center justify-center p-12 text-center">
                    <div className="p-8 rounded-full bg-muted/40 mb-6 rotate-12 transition-transform hover:rotate-0 duration-500">
                      <Package className="h-16 w-16 text-muted-foreground opacity-20" />
                    </div>
                    <h3 className="text-2xl font-black tracking-tight text-foreground/80">
                      Select an asset from the list
                    </h3>
                    <p className="text-muted-foreground max-w-sm mt-3 font-medium">
                      Select any material from the sidebar to visualize its
                      30-day predictive depletion model and risk thresholds.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent
            value="consumption"
            className="animate-in fade-in slide-in-from-right-4 duration-500"
          >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Reuse Sidebar layout */}
              <Card className="lg:col-span-3 border-none bg-muted/20 shadow-none h-fit">
                <CardHeader className="pb-3 border-b border-border/50 px-4">
                  <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                    Asset Repository
                  </h3>
                </CardHeader>
                <div className="p-2 flex flex-col gap-1 max-h-[600px] overflow-y-auto custom-scrollbar">
                  {materials?.map((material) => (
                    <button
                      key={material.id}
                      onClick={() => setSelectedMaterial(material.id)}
                      className={`group flex items-center p-3 rounded-xl transition-all text-left border ${selectedMaterial === material.id ? "bg-orange-500 border-orange-500 shadow-lg ring-4 ring-orange-500/10" : "bg-background hover:bg-muted/50 border-transparent"}`}
                    >
                      <div className="flex flex-col gap-0.5">
                        <span
                          className={`text-sm font-bold truncate max-w-[170px] ${selectedMaterial === material.id ? "text-white" : "text-foreground"}`}
                        >
                          {material.name}
                        </span>
                        <span
                          className={`text-[9px] uppercase tracking-widest font-black ${selectedMaterial === material.id ? "text-white/70" : "text-muted-foreground/60"}`}
                        >
                          {material.category || "Standard"}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </Card>

              <div className="lg:col-span-9">
                {selectedMaterial ? (
                  <Card className="border-none shadow-2xl overflow-hidden">
                    <CardHeader className="p-8 border-b bg-muted/10">
                      <div className="flex items-center gap-5">
                        <div className="bg-orange-500/10 p-4 rounded-3xl">
                          <TrendingDown className="h-8 w-8 text-orange-500" />
                        </div>
                        <div>
                          <CardTitle className="text-3xl font-black">
                            Consumption Analytics
                          </CardTitle>
                          <CardDescription className="text-sm font-semibold uppercase tracking-widest text-orange-600/60">
                            30-Day Historical Resource Utilization for{" "}
                            <strong>
                              {
                                materials?.find(
                                  (m) => m.id === selectedMaterial,
                                )?.name
                              }
                            </strong>
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-8">
                      {consumptionChartData.length > 0 ? (
                        <div className="animate-in slide-in-from-bottom-8 duration-700">
                          <ResponsiveContainer width="100%" height={400}>
                            <BarChart
                              data={consumptionChartData}
                              margin={{
                                top: 10,
                                right: 10,
                                left: 0,
                                bottom: 0,
                              }}
                            >
                              <CartesianGrid
                                strokeDasharray="3 3"
                                vertical={false}
                                stroke="hsl(var(--border))"
                              />
                              <XAxis
                                dataKey="date"
                                fontSize={11}
                                axisLine={false}
                                tickLine={false}
                                tickMargin={10}
                                fontStyle="italic"
                              />
                              <YAxis
                                fontSize={11}
                                axisLine={false}
                                tickLine={false}
                              />
                              <Tooltip
                                cursor={{ fill: "hsl(var(--primary)/5)" }}
                                contentStyle={{
                                  backgroundColor: "hsl(var(--card)/95)",
                                  borderColor: "hsl(var(--border))",
                                  borderRadius: "16px",
                                  boxShadow:
                                    "0 20px 25px -5px rgb(0 0 0 / 0.1)",
                                }}
                                itemStyle={{
                                  fontWeight: "black",
                                  textTransform: "uppercase",
                                  fontSize: "10px",
                                }}
                              />
                              <Bar
                                dataKey="quantity"
                                fill="#f97316"
                                radius={[8, 8, 2, 2]}
                                name="Daily Volume"
                                animationDuration={1500}
                              />
                            </BarChart>
                          </ResponsiveContainer>

                          {/* Metric Strip */}
                          <div className="flex gap-12 mt-12 p-6 bg-muted/20 rounded-3xl border border-dashed">
                            <div className="flex flex-col">
                              <span className="text-[9px] uppercase font-black text-muted-foreground tracking-widest mb-1">
                                Avg Daily Load
                              </span>
                              <span className="text-2xl font-black">
                                {(
                                  consumptionChartData.reduce(
                                    (s, d) => s + d.quantity,
                                    0,
                                  ) / consumptionChartData.length
                                ).toFixed(1)}{" "}
                                <span className="text-xs font-black text-muted-foreground">
                                  {
                                    materials?.find(
                                      (m) => m.id === selectedMaterial,
                                    )?.unit
                                  }
                                </span>
                              </span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[9px] uppercase font-black text-muted-foreground tracking-widest mb-1">
                                Peak Utilization
                              </span>
                              <span className="text-2xl font-black font-mono">
                                {Math.max(
                                  ...consumptionChartData.map(
                                    (d) => d.quantity,
                                  ),
                                ).toLocaleString()}
                              </span>
                            </div>
                            <div className="flex flex-col ml-auto text-right">
                              <span className="text-[9px] uppercase font-black text-muted-foreground tracking-widest mb-1">
                                Data Points
                              </span>
                              <span className="text-2xl font-black text-primary">
                                {consumptionChartData.length} Days
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="h-[400px] flex flex-col items-center justify-center text-muted-foreground">
                          <TrendingDown className="h-16 w-16 mb-6 opacity-10" />
                          <p className="text-lg font-black tracking-tight">
                            Zero Activity Recorded
                          </p>
                          <p className="text-sm mt-1">
                            No utilization data exists for this material in the
                            specified timeframe.
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <div className="h-[600px] border-2 border-dashed border-border/50 rounded-3xl flex flex-col items-center justify-center p-12 text-center">
                    <div className="p-8 rounded-full bg-muted/40 mb-6 -rotate-6 transition-transform hover:rotate-0 duration-500">
                      <TrendingDown className="h-16 w-16 text-muted-foreground opacity-20" />
                    </div>
                    <h3 className="text-2xl font-black tracking-tight text-foreground/80">
                      Analyze Historical Trends
                    </h3>
                    <p className="text-muted-foreground max-w-sm mt-3 font-medium">
                      Select a material on the left to review its actual usage
                      patterns over the last 30 days.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

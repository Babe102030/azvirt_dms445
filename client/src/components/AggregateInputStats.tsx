import React from "react";
import { trpc } from "@/lib/trpc";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Package,
  TrendingUp,
  Factory,
  Calendar,
  Truck,
} from "lucide-react";
import { format } from "date-fns";

interface AggregateInputStatsProps {
  concreteBaseId?: number;
  days?: number;
}

export default function AggregateInputStats({
  concreteBaseId,
  days = 30,
}: AggregateInputStatsProps) {
  const { data: inputs, isLoading } = trpc.aggregateInputs.list.useQuery(
    concreteBaseId ? { concreteBaseId } : undefined,
  );
  const { data: bases } = trpc.concreteBases.list.useQuery();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-3">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!inputs) {
    return null;
  }

  // Filter by date range
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  const recentInputs = inputs.filter(
    (input: any) => new Date(input.date) >= cutoffDate,
  );

  // Calculate statistics
  const totalInputs = recentInputs.length;

  // Group by material type
  const materialTypeStats = recentInputs.reduce((acc: any, input: any) => {
    const type = input.materialType;
    if (!acc[type]) {
      acc[type] = { count: 0, totalQuantity: 0, unit: input.unit };
    }
    acc[type].count += 1;
    acc[type].totalQuantity += input.quantity;
    return acc;
  }, {});

  // Group by concrete base
  const baseStats = recentInputs.reduce((acc: any, input: any) => {
    const baseId = input.concreteBaseId;
    if (!acc[baseId]) {
      acc[baseId] = { count: 0, baseId };
    }
    acc[baseId].count += 1;
    return acc;
  }, {});

  // Get most active material type
  const mostActiveMaterial = Object.entries(materialTypeStats).reduce(
    (max: any, [type, stats]: any) =>
      stats.count > (max.stats?.count || 0) ? { type, stats } : max,
    {},
  );

  // Get most active base
  const mostActiveBase = Object.entries(baseStats).reduce(
    (max: any, [baseId, stats]: any) =>
      stats.count > (max.stats?.count || 0) ? { baseId, stats } : max,
    {},
  );

  const getMaterialTypeBadgeColor = (type: string) => {
    const colors: Record<string, string> = {
      cement: "bg-gray-500",
      sand: "bg-yellow-500",
      gravel: "bg-stone-500",
      water: "bg-blue-500",
      admixture: "bg-purple-500",
      other: "bg-orange-500",
    };
    return colors[type] || "bg-gray-500";
  };

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              Total Inputs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalInputs}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Last {days} days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              Material Types
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Object.keys(materialTypeStats).length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {mostActiveMaterial.type && (
                <span>
                  Most active:{" "}
                  <Badge
                    className={`${getMaterialTypeBadgeColor(mostActiveMaterial.type)} text-xs`}
                  >
                    {mostActiveMaterial.type}
                  </Badge>
                </span>
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Factory className="h-4 w-4 text-muted-foreground" />
              Active Bases
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Object.keys(baseStats).length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {mostActiveBase.baseId && bases && (
                <span>
                  Most active:{" "}
                  {bases.find((b: any) => b.id === Number(mostActiveBase.baseId))
                    ?.name || "N/A"}
                </span>
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Truck className="h-4 w-4 text-muted-foreground" />
              Unique Suppliers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {
                new Set(
                  recentInputs
                    .map((i: any) => i.supplier)
                    .filter((s: any) => s),
                ).size
              }
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Active suppliers
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Material Type Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Material Type Breakdown</CardTitle>
          <CardDescription>
            Aggregate inputs by material type (last {days} days)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {Object.keys(materialTypeStats).length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No aggregate inputs recorded
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(materialTypeStats).map(
                ([type, stats]: [string, any]) => (
                  <div key={type} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge className={getMaterialTypeBadgeColor(type)}>
                        {type}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {stats.count} input{stats.count !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="text-sm font-medium">
                      {stats.totalQuantity.toFixed(2)} {stats.unit}
                    </div>
                  </div>
                ),
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Inputs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Inputs</CardTitle>
          <CardDescription>Latest 5 aggregate inputs</CardDescription>
        </CardHeader>
        <CardContent>
          {recentInputs.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No recent inputs
            </div>
          ) : (
            <div className="space-y-3">
              {recentInputs.slice(0, 5).map((input: any) => (
                <div
                  key={input.id}
                  className="flex items-start justify-between border-b pb-3 last:border-0"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge
                        className={`${getMaterialTypeBadgeColor(input.materialType)} text-xs`}
                      >
                        {input.materialType}
                      </Badge>
                      <span className="font-medium text-sm">
                        {input.materialName}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(input.date), "MMM dd, yyyy")}
                      </span>
                      <span className="flex items-center gap-1">
                        <Factory className="h-3 w-3" />
                        {bases?.find((b: any) => b.id === input.concreteBaseId)
                          ?.name || "N/A"}
                      </span>
                      {input.supplier && (
                        <span className="flex items-center gap-1">
                          <Truck className="h-3 w-3" />
                          {input.supplier}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-sm font-semibold whitespace-nowrap">
                    {input.quantity} {input.unit}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

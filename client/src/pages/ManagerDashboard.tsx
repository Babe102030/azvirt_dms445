/// <reference types="@types/google.maps" />
import { useState, useMemo, useEffect, useRef } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { MapView } from "@/components/Map";
import {
  Truck,
  Clock,
  AlertCircle,
  CheckCircle2,
  ImageIcon,
  Navigation,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

// Helper for status colors
const getStatusColor = (status: string) => {
  switch (status) {
    case "delivered":
      return "text-green-500 bg-green-500/10 border-green-500/20";
    case "en_route":
    case "in_transit":
      return "text-blue-500 bg-blue-500/10 border-blue-500/20";
    case "delayed":
      return "text-red-500 bg-red-500/10 border-red-500/20";
    default:
      return "text-yellow-500 bg-yellow-500/10 border-yellow-500/20";
  }
};

const calculateETA = (delivery: any) => {
  if (!delivery.estimatedArrival) return "N/A";

  const eta = new Date(delivery.estimatedArrival * 1000);
  const now = new Date();
  const diffMinutes = Math.floor((eta.getTime() - now.getTime()) / 60000);

  if (diffMinutes < 0) return "Arrived";
  if (diffMinutes < 60) return `${diffMinutes} min`;
  return `${Math.floor(diffMinutes / 60)}h ${diffMinutes % 60}m`;
};

export default function ManagerDashboard() {
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);

  const { data: deliveries, isLoading } =
    trpc.deliveries.getActiveDeliveries.useQuery(undefined, {
      refetchInterval: 30000,
    });

  const filteredDeliveries = useMemo(() => {
    if (!deliveries) return [];
    if (filterStatus === "all") return deliveries;
    return deliveries.filter((d) => d.status === filterStatus);
  }, [deliveries, filterStatus]);

  const stats = useMemo(() => {
    if (!deliveries) return { total: 0, active: 0, delayed: 0, completed: 0 };
    return {
      total: deliveries.length,
      active: deliveries.filter((d) =>
        ["en_route", "in_transit", "loaded"].includes(d.status),
      ).length,
      delayed: deliveries.filter((d) => d.status === "delayed").length,
      completed: deliveries.filter((d) => d.status === "delivered").length,
    };
  }, [deliveries]);

  // Update markers when map or deliveries change
  useEffect(() => {
    if (!mapInstance || !filteredDeliveries) return;

    // Clear existing markers
    markersRef.current.forEach((marker) => (marker.map = null));
    markersRef.current = [];

    // Add new markers
    filteredDeliveries.forEach((d) => {
      if (d.gpsLocation) {
        const [lat, lng] = d.gpsLocation.split(",").map(Number);

        if (!isNaN(lat) && !isNaN(lng)) {
          // Create marker element content
          const pinElement = document.createElement("div");
          pinElement.className = "flex items-center justify-center";

          let color = "#eab308"; // yellow default
          if (d.status === "delivered") color = "#22c55e"; // green
          if (d.status === "en_route") color = "#3b82f6"; // blue
          if (d.status === "delayed") color = "#ef4444"; // red

          pinElement.innerHTML = `
            <div style="
              background-color: ${color};
              width: 16px;
              height: 16px;
              border-radius: 50%;
              border: 2px solid white;
              box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            "></div>
          `;

          const marker = new google.maps.marker.AdvancedMarkerElement({
            map: mapInstance,
            position: { lat, lng },
            title: d.projectName,
            content: pinElement,
          });

          markersRef.current.push(marker);
        }
      }
    });
  }, [mapInstance, filteredDeliveries]);

  const analytics = useMemo(() => {
    // Mock analytics for demonstration as we might not have historical data endpoint yet
    // In a real scenario, this would come from a separate TRPC procedure
    return { onTime: 92, avgTime: 45 };
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Manager Dashboard</h1>
            <p className="text-white/70">
              Real-time delivery overview and tracking
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full md:w-[180px] bg-card/50 border-white/10">
                <SelectValue placeholder="Filter Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="en_route">En Route</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="delayed">Delayed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-card/40 backdrop-blur border-blue-500/20">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 rounded-full bg-blue-500/20 text-blue-400">
                <Truck className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Active Deliveries
                </p>
                <h3 className="text-2xl font-bold text-white">
                  {stats.active}
                </h3>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card/40 backdrop-blur border-green-500/20">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 rounded-full bg-green-500/20 text-green-400">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">On-Time Rate</p>
                <h3 className="text-2xl font-bold text-white">
                  {analytics.onTime}%
                </h3>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card/40 backdrop-blur border-yellow-500/20">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 rounded-full bg-yellow-500/20 text-yellow-400">
                <Clock className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Avg Delivery Time
                </p>
                <h3 className="text-2xl font-bold text-white">
                  {analytics.avgTime} min
                </h3>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card/40 backdrop-blur border-red-500/20">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 rounded-full bg-red-500/20 text-red-400">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Delayed</p>
                <h3 className="text-2xl font-bold text-white">
                  {stats.delayed}
                </h3>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
          {/* Map View */}
          <Card className="lg:col-span-2 bg-card/90 backdrop-blur border-primary/20 overflow-hidden flex flex-col">
            <CardHeader className="py-4 px-6 border-b border-white/5">
              <CardTitle className="text-lg flex items-center gap-2">
                <Navigation className="h-5 w-5 text-primary" />
                Live Map Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1 relative">
              <MapView
                initialCenter={{ lat: 44.7866, lng: 20.4489 }} // Default center (Belgrade roughly, customizable)
                initialZoom={12}
                onMapReady={(map) => setMapInstance(map)}
                className="h-full w-full"
              />
            </CardContent>
          </Card>

          {/* Activity / Timeline */}
          <Card className="bg-card/90 backdrop-blur border-primary/20 flex flex-col">
            <CardHeader className="py-4 px-6 border-b border-white/5">
              <CardTitle className="text-lg">Delivery Timeline</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-0">
              <div className="divide-y divide-white/5">
                {isLoading ? (
                  <div className="p-8 text-center text-muted-foreground">
                    Loading deliveries...
                  </div>
                ) : filteredDeliveries.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    No active deliveries matching filter.
                  </div>
                ) : (
                  filteredDeliveries.map((d) => (
                    <div
                      key={d.id}
                      className="p-4 hover:bg-white/5 transition-colors"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-medium text-white">
                          {d.projectName}
                        </div>
                        <Badge
                          variant="outline"
                          className={cn("capitalize", getStatusColor(d.status))}
                        >
                          {d.status.replace("_", " ")}
                        </Badge>
                      </div>

                      <div className="space-y-1.5">
                        <div className="text-sm text-muted-foreground flex items-center gap-2">
                          <span className="w-20">Type:</span>
                          <span className="text-white/80">
                            {d.concreteType}
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground flex items-center gap-2">
                          <span className="w-20">Volume:</span>
                          <span className="text-white/80">{d.volume}m³</span>
                        </div>
                        <div className="text-sm text-muted-foreground flex items-center gap-2">
                          <span className="w-20">Driver:</span>
                          <span className="text-white/80">
                            {d.driverName || "Unassigned"}
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground flex items-center gap-2">
                          <span className="w-20">ETA:</span>
                          <span
                            className={cn(
                              "font-medium",
                              calculateETA(d) === "Arrived"
                                ? "text-green-400"
                                : "text-blue-400",
                            )}
                          >
                            {calculateETA(d)}
                          </span>
                        </div>
                      </div>

                      {/* Photos Link */}
                      {d.deliveryPhotos &&
                        JSON.parse(d.deliveryPhotos).length > 0 && (
                          <div className="mt-3 pt-2 border-t border-white/5">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-full justify-start text-xs text-muted-foreground hover:text-white pl-0 hover:bg-transparent"
                                >
                                  <ImageIcon className="h-3 w-3 mr-2" />
                                  View Documentation Photos (
                                  {JSON.parse(d.deliveryPhotos).length})
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-3xl">
                                <DialogHeader>
                                  <DialogTitle>
                                    Delivery Photos - {d.projectName}
                                  </DialogTitle>
                                </DialogHeader>
                                <div className="grid grid-cols-2 gap-4 mt-4 max-h-[60vh] overflow-y-auto">
                                  {JSON.parse(d.deliveryPhotos).map(
                                    (photo: string, idx: number) => (
                                      <div
                                        key={idx}
                                        className="relative aspect-video rounded-lg overflow-hidden border border-border"
                                      >
                                        <img
                                          src={photo}
                                          alt={`Delivery ${idx + 1}`}
                                          className="object-cover w-full h-full"
                                        />
                                      </div>
                                    ),
                                  )}
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>
                        )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}

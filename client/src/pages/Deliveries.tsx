import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { Truck, Plus, Printer } from "lucide-react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { DeliveryNote } from "@/components/DeliveryNote";
import { LiveDeliveryMap } from "@/components/LiveDeliveryMap";

export default function Deliveries() {
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState<number | null>(null);
  const [showLiveTracking, setShowLiveTracking] = useState(true);

  const { data: deliveries, isLoading, refetch } = trpc.deliveries.list.useQuery();

  const createMutation = trpc.deliveries.create.useMutation({
    onSuccess: () => {
      toast.success("Delivery scheduled successfully");
      setCreateOpen(false);
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to schedule delivery: ${error.message}`);
    },
  });

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    createMutation.mutate({
      projectName: formData.get("projectName") as string,
      concreteType: formData.get("concreteType") as string,
      volume: parseInt(formData.get("volume") as string),
      scheduledTime: new Date(formData.get("scheduledTime") as string),
      driverName: formData.get("driverName") as string,
      vehicleNumber: formData.get("vehicleNumber") as string,
      notes: formData.get("notes") as string,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "delivered":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "in_transit":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "cancelled":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      default:
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Deliveries</h1>
            <p className="text-white/70">Track concrete deliveries</p>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="lg">
                <Plus className="mr-2 h-5 w-5" />
                Schedule Delivery
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card/95 backdrop-blur">
              <DialogHeader>
                <DialogTitle>Schedule New Delivery</DialogTitle>
                <DialogDescription>Schedule a concrete delivery</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <Label htmlFor="projectName">Project Name</Label>
                  <Input id="projectName" name="projectName" required />
                </div>
                <div>
                  <Label htmlFor="concreteType">Concrete Type</Label>
                  <Input id="concreteType" name="concreteType" placeholder="e.g., C30/37" required />
                </div>
                <div>
                  <Label htmlFor="volume">Volume (m³)</Label>
                  <Input id="volume" name="volume" type="number" required />
                </div>
                <div>
                  <Label htmlFor="scheduledTime">Scheduled Time</Label>
                  <Input id="scheduledTime" name="scheduledTime" type="datetime-local" required />
                </div>
                <div>
                  <Label htmlFor="driverName">Driver Name</Label>
                  <Input id="driverName" name="driverName" />
                </div>
                <div>
                  <Label htmlFor="vehicleNumber">Vehicle Number</Label>
                  <Input id="vehicleNumber" name="vehicleNumber" />
                </div>
                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea id="notes" name="notes" rows={3} />
                </div>
                <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Scheduling..." : "Schedule Delivery"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Live Delivery Tracking */}
        <LiveDeliveryMap />

        <Card className="bg-card/90 backdrop-blur border-primary/20">
          <CardHeader>
            <CardTitle>All Deliveries</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : deliveries && deliveries.length > 0 ? (
              <div className="space-y-2">
                {deliveries.map((delivery) => (
                  <div
                    key={delivery.id}
                    className="flex items-center justify-between p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <Truck className="h-8 w-8 text-primary" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{delivery.projectName}</h3>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                              delivery.status
                            )}`}
                          >
                            {delivery.status}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {delivery.volume}m³ {delivery.concreteType}
                        </p>
                        <div className="flex gap-4 mt-1">
                          <span className="text-xs text-muted-foreground">
                            Scheduled: {new Date(delivery.scheduledTime).toLocaleString()}
                          </span>
                          {delivery.driverName && (
                            <span className="text-xs text-muted-foreground">
                              Driver: {delivery.driverName}
                            </span>
                          )}
                          {delivery.vehicleNumber && (
                            <span className="text-xs text-muted-foreground">
                              Vehicle: {delivery.vehicleNumber}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedDelivery(delivery.id)}
                      >
                        <Printer className="h-4 w-4 mr-2" />
                        Print Note
                      </Button>
                    </div>
                  </div>
                ))}
                
                {/* Delivery Note Print View */}
                {selectedDelivery && deliveries && (
                  <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-auto">
                      <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
                        <h2 className="text-xl font-bold text-black">Delivery Note Preview</h2>
                        <Button
                          variant="outline"
                          onClick={() => setSelectedDelivery(null)}
                        >
                          Close
                        </Button>
                      </div>
                      <DeliveryNote
                        delivery={deliveries.find(d => d.id === selectedDelivery)!}
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No deliveries found. Schedule your first delivery to get started.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

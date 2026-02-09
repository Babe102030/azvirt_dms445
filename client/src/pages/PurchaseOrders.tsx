import { useState, useEffect } from "react";
import { useLocation } from "wouter";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  Package,
  FileDown,
} from "lucide-react";
import { toast } from "sonner";
import { ExportDialog, type ExportColumn } from "@/components/ExportDialog";
import { downloadExcelFile, generateExportFilename } from "@/lib/exportUtils";

export default function PurchaseOrders() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [selectedMaterialId, setSelectedMaterialId] = useState<number | null>(
    null,
  );
  const [formData, setFormData] = useState({
    quantity: "",
    supplier: "",
    supplierEmail: "",
    expectedDelivery: "",
    totalCost: "",
    notes: "",
  });

  const { data: purchaseOrders, refetch } = trpc.purchaseOrders.list.useQuery();
  const { data: materials } = trpc.materials.list.useQuery();
  const { data: forecasts } = trpc.materials.getForecasts.useQuery();
  const [location] = useLocation();

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const materialIdParam = searchParams.get("materialId");
    const quantityParam = searchParams.get("quantity");
    const notesParam = searchParams.get("notes");

    if (materialIdParam && materials) {
      const materialId = parseInt(materialIdParam);
      const material = materials.find((m) => m.id === materialId);

      if (material) {
        setSelectedMaterialId(materialId);
        setFormData((prev) => ({
          ...prev,
          quantity: quantityParam || "",
          supplier: material.supplier || "",
          supplierEmail: material.supplierEmail || "",
          notes: notesParam || "",
        }));
        setIsCreateOpen(true);

        // Clear query params to prevent reopening on refresh
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname,
        );
      }
    }
  }, [materials, location]);

  const createPO = trpc.purchaseOrders.create.useMutation({
    onSuccess: () => {
      toast.success("Purchase order created successfully");
      setIsCreateOpen(false);
      refetch();
      resetForm();
    },
  });

  const updatePO = trpc.purchaseOrders.update.useMutation({
    onSuccess: () => {
      toast.success("Purchase order updated");
      refetch();
    },
  });

  const sendToSupplier = trpc.purchaseOrders.sendToSupplier.useMutation({
    onSuccess: (data: any) => {
      if (data.success) {
        toast.success("Purchase order sent to supplier");
        refetch();
      } else {
        toast.error(data.message || "Failed to send email");
      }
    },
  });

  const exportMutation = trpc.export.purchaseOrders.useMutation({
    onSuccess: (data: any) => {
      downloadExcelFile(data.data, generateExportFilename("purchase_orders"));
      toast.success("Purchase orders exported successfully");
      setExportOpen(false);
    },
    onError: (error: any) => {
      toast.error(`Export failed: ${error.message}`);
    },
  });

  const resetForm = () => {
    setSelectedMaterialId(null);
    setFormData({
      quantity: "",
      supplier: "",
      supplierEmail: "",
      expectedDelivery: "",
      totalCost: "",
      notes: "",
    });
  };

  const handleCreate = () => {
    if (!selectedMaterialId) {
      toast.error("Please select a material");
      return;
    }

    const material = materials?.find((m) => m.id === selectedMaterialId);
    if (!material) return;

    createPO.mutate({
      materialId: selectedMaterialId,
      materialName: material.name,
      quantity: parseInt(formData.quantity),
      supplier: formData.supplier || undefined,
      supplierEmail: formData.supplierEmail || undefined,
      expectedDelivery: formData.expectedDelivery
        ? new Date(formData.expectedDelivery)
        : undefined,
      totalCost: formData.totalCost ? parseInt(formData.totalCost) : undefined,
      notes: formData.notes || undefined,
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4" />;
      case "approved":
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
      case "ordered":
        return <Send className="h-4 w-4 text-purple-500" />;
      case "received":
        return <Package className="h-4 w-4 text-green-500" />;
      case "cancelled":
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return null;
    }
  };

  const getStatusVariant = (
    status: string,
  ): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "received":
        return "default";
      case "cancelled":
        return "destructive";
      default:
        return "secondary";
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Purchase Orders</h1>
            <p className="text-muted-foreground">
              Manage material orders and supplier communications
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setExportOpen(true)}>
              <FileDown className="mr-2 h-4 w-4" />
              Export to Excel
            </Button>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Purchase Order
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create Purchase Order</DialogTitle>
                  <DialogDescription>
                    Generate a new purchase order for material restocking
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="material">Material *</Label>
                    <Select
                      onValueChange={(value) => {
                        const materialId = parseInt(value);
                        setSelectedMaterialId(materialId);
                        const material = materials?.find(
                          (m) => m.id === materialId,
                        );
                        const forecast = forecasts?.find(
                          (f) => f.materialId === materialId,
                        ) as any;
                        if (material) {
                          setFormData((prev) => ({
                            ...prev,
                            supplier: material.supplier || "",
                            supplierEmail: material.supplierEmail || "",
                            quantity:
                              forecast?.recommendedOrderQty?.toString() || "",
                          }));
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select material" />
                      </SelectTrigger>
                      <SelectContent>
                        {materials?.map((material) => (
                          <SelectItem
                            key={material.id}
                            value={material.id.toString()}
                          >
                            {`${material.name} (${material.quantity} ${material.unit} in stock)`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="quantity">Quantity *</Label>
                      <Input
                        id="quantity"
                        type="number"
                        value={formData.quantity}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            quantity: e.target.value,
                          }))
                        }
                        placeholder="Enter quantity"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="totalCost">Total Cost (optional)</Label>
                      <Input
                        id="totalCost"
                        type="number"
                        value={formData.totalCost}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            totalCost: e.target.value,
                          }))
                        }
                        placeholder="Enter cost"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="supplier">Supplier</Label>
                      <Input
                        id="supplier"
                        value={formData.supplier}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            supplier: e.target.value,
                          }))
                        }
                        placeholder="Supplier name"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="supplierEmail">Supplier Email</Label>
                      <Input
                        id="supplierEmail"
                        type="email"
                        value={formData.supplierEmail}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            supplierEmail: e.target.value,
                          }))
                        }
                        placeholder="supplier@example.com"
                      />
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="expectedDelivery">Expected Delivery</Label>
                    <Input
                      id="expectedDelivery"
                      type="date"
                      value={formData.expectedDelivery}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          expectedDelivery: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          notes: e.target.value,
                        }))
                      }
                      placeholder="Additional notes or requirements"
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsCreateOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleCreate} disabled={createPO.isPending}>
                    Create Purchase Order
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Purchase Orders Table */}
          <Card>
            <CardHeader>
              <CardTitle>All Purchase Orders</CardTitle>
              <CardDescription>
                Track and manage material orders
              </CardDescription>
            </CardHeader>
            <CardContent>
              {purchaseOrders && purchaseOrders.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3">PO #</th>
                        <th className="text-left p-3">Material</th>
                        <th className="text-right p-3">Quantity</th>
                        <th className="text-left p-3">Supplier</th>
                        <th className="text-left p-3">Order Date</th>
                        <th className="text-left p-3">Expected Delivery</th>
                        <th className="text-center p-3">Status</th>
                        <th className="text-center p-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {purchaseOrders.map((po: any) => (
                        <tr key={po.id} className="border-b hover:bg-muted/50">
                          <td className="p-3 font-mono text-sm">#{po.id}</td>
                          <td className="p-3 font-medium">{po.materialName}</td>
                          <td className="text-right p-3">{po.quantity}</td>
                          <td className="p-3">
                            {(po as any).supplier || "N/A"}
                          </td>
                          <td className="p-3">
                            {new Date(po.orderDate).toLocaleDateString()}
                          </td>
                          <td className="p-3">
                            {po.expectedDelivery
                              ? new Date(
                                  po.expectedDelivery,
                                ).toLocaleDateString()
                              : "TBD"}
                          </td>
                          <td className="text-center p-3">
                            <Badge
                              variant={getStatusVariant(po.status)}
                              className="flex items-center gap-1 w-fit mx-auto"
                            >
                              {getStatusIcon(po.status)}
                              {po.status}
                            </Badge>
                          </td>
                          <td className="text-center p-3">
                            <div className="flex gap-2 justify-center">
                              {po.status === "pending" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    updatePO.mutate({
                                      id: po.id,
                                      status: "approved",
                                    })
                                  }
                                >
                                  Approve
                                </Button>
                              )}
                              {po.status === "approved" && po.supplierEmail && (
                                <Button
                                  size="sm"
                                  onClick={() =>
                                    sendToSupplier.mutate({ orderId: po.id })
                                  }
                                  disabled={sendToSupplier.isPending}
                                >
                                  <Send className="mr-1 h-3 w-3" />
                                  Send to Supplier
                                </Button>
                              )}
                              {po.status === "ordered" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    updatePO.mutate({
                                      id: po.id,
                                      status: "received",
                                      actualDelivery: new Date(),
                                    })
                                  }
                                >
                                  Mark Received
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No purchase orders yet. Create one to get started.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      <ExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        title="Export Purchase Orders"
        description="Select columns to include in the Excel export"
        columns={[
          { key: "id", label: "PO #", enabled: true },
          { key: "materialName", label: "Material", enabled: true },
          { key: "quantity", label: "Quantity", enabled: true },
          { key: "supplier", label: "Supplier", enabled: true },
          { key: "orderDate", label: "Order Date", enabled: true },
          {
            key: "expectedDelivery",
            label: "Expected Delivery",
            enabled: false,
          },
          { key: "status", label: "Status", enabled: true },
          { key: "totalCost", label: "Total Cost", enabled: false },
        ]}
        onExport={async (selectedColumns) => {
          await exportMutation.mutateAsync({ columns: selectedColumns });
        }}
        isExporting={exportMutation.isPending}
      />
    </DashboardLayout>
  );
}

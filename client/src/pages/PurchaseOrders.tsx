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
  Users,
  Mail,
  Truck,
  Phone,
  Trash2,
  Edit,
} from "lucide-react";
import { toast } from "sonner";
import { ExportDialog, type ExportColumn } from "@/components/ExportDialog";
import { downloadExcelFile, generateExportFilename } from "@/lib/exportUtils";
import { TemplateEditor } from "@/components/TemplateEditor";

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

  // Supplier State
  const [isCreateSupplierOpen, setIsCreateSupplierOpen] = useState(false);
  const [supplierFormData, setSupplierFormData] = useState({
    name: "",
    contactPerson: "",
    email: "",
    phone: "",
  });

  // Template State
  const [isTemplateEditorOpen, setIsTemplateEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);

  const { data: purchaseOrders, refetch } = trpc.purchaseOrders.list.useQuery();
  const { data: materials } = trpc.materials.list.useQuery();
  const { data: forecasts } = trpc.materials.getForecasts.useQuery();
  const { data: suppliers, refetch: refetchSuppliers } =
    trpc.suppliers.list.useQuery();
  const { data: templates, refetch: refetchTemplates } =
    trpc.notificationTemplates.list.useQuery();
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

  const receivePO = trpc.purchaseOrders.receive.useMutation({
    onSuccess: () => {
      toast.success("Purchase order received and inventory updated");
      refetch();
    },
  });

  const createSupplier = trpc.suppliers.create.useMutation({
    onSuccess: () => {
      toast.success("Supplier created successfully");
      setIsCreateSupplierOpen(false);
      refetchSuppliers();
      setSupplierFormData({
        name: "",
        contactPerson: "",
        email: "",
        phone: "",
      });
    },
  });

  const deleteSupplier = trpc.suppliers.delete.useMutation({
    onSuccess: () => {
      toast.success("Supplier deleted successfully");
      refetchSuppliers();
    },
  });

  const upsertTemplate = trpc.notificationTemplates.upsert.useMutation({
    onSuccess: () => {
      toast.success("Template saved successfully");
      setIsTemplateEditorOpen(false);
      setEditingTemplate(null);
      refetchTemplates();
    },
  });

  const deleteTemplate = trpc.notificationTemplates.delete.useMutation({
    onSuccess: () => {
      toast.success("Template deleted");
      refetchTemplates();
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

  const handleCreateSupplier = () => {
    if (!supplierFormData.name) {
      toast.error("Supplier name is required");
      return;
    }
    createSupplier.mutate(supplierFormData);
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
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Purchase Order Management
            </h1>
            <p className="text-muted-foreground">
              Streamline procurement, manage suppliers, and track deliveries.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setExportOpen(true)}>
              <FileDown className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button className="shadow-md">
                  <Plus className="mr-2 h-4 w-4" />
                  New Order
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
        </div>

        <Tabs defaultValue="orders" className="w-full space-y-6">
          <TabsList className="bg-background border">
            <TabsTrigger value="orders" className="gap-2">
              <Package className="h-4 w-4" /> Orders
            </TabsTrigger>
            <TabsTrigger value="suppliers" className="gap-2">
              <Users className="h-4 w-4" /> Suppliers
            </TabsTrigger>
            <TabsTrigger value="receiving" className="gap-2">
              <Truck className="h-4 w-4" /> Receiving
            </TabsTrigger>
            <TabsTrigger value="templates" className="gap-2">
              <Mail className="h-4 w-4" /> Templates
            </TabsTrigger>
          </TabsList>

          <TabsContent value="orders">
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
                        <tr className="border-b bg-muted/50 text-xs uppercase text-muted-foreground">
                          <th className="text-left p-3 font-medium">PO #</th>
                          <th className="text-left p-3 font-medium">
                            Material
                          </th>
                          <th className="text-right p-3 font-medium">
                            Quantity
                          </th>
                          <th className="text-left p-3 font-medium">
                            Supplier
                          </th>
                          <th className="text-left p-3 font-medium">
                            Order Date
                          </th>
                          <th className="text-left p-3 font-medium">
                            Expected Delivery
                          </th>
                          <th className="text-center p-3 font-medium">
                            Status
                          </th>
                          <th className="text-center p-3 font-medium">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {purchaseOrders.map((po: any) => (
                          <tr
                            key={po.id}
                            className="border-b hover:bg-muted/50 transition-colors"
                          >
                            <td className="p-3 font-mono text-sm">#{po.id}</td>
                            <td className="p-3 font-medium">
                              {po.materialName}
                            </td>
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
                                {po.status === "approved" &&
                                  po.supplierEmail && (
                                    <Button
                                      size="sm"
                                      onClick={() =>
                                        sendToSupplier.mutate({
                                          orderId: po.id,
                                        })
                                      }
                                      disabled={sendToSupplier.isPending}
                                    >
                                      <Send className="mr-1 h-3 w-3" />
                                      Send
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
                                    Receive
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
                  <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-xl">
                    <Package className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    <p className="font-medium">No purchase orders found</p>
                    <p className="text-sm mt-1">
                      Create a new order to get started.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="suppliers">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Supplier Directory</CardTitle>
                  <CardDescription>
                    Manage external vendors and contact information
                  </CardDescription>
                </div>
                <Dialog
                  open={isCreateSupplierOpen}
                  onOpenChange={setIsCreateSupplierOpen}
                >
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Supplier
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Supplier</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label>Company Name *</Label>
                        <Input
                          value={supplierFormData.name}
                          onChange={(e) =>
                            setSupplierFormData((prev) => ({
                              ...prev,
                              name: e.target.value,
                            }))
                          }
                          placeholder="Acme Corp"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>Contact Person</Label>
                        <Input
                          value={supplierFormData.contactPerson}
                          onChange={(e) =>
                            setSupplierFormData((prev) => ({
                              ...prev,
                              contactPerson: e.target.value,
                            }))
                          }
                          placeholder="John Doe"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>Email</Label>
                        <Input
                          value={supplierFormData.email}
                          onChange={(e) =>
                            setSupplierFormData((prev) => ({
                              ...prev,
                              email: e.target.value,
                            }))
                          }
                          placeholder="contact@acme.com"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>Phone</Label>
                        <Input
                          value={supplierFormData.phone}
                          onChange={(e) =>
                            setSupplierFormData((prev) => ({
                              ...prev,
                              phone: e.target.value,
                            }))
                          }
                          placeholder="+1 234 567 890"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={handleCreateSupplier}>
                        Add Supplier
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {suppliers && suppliers.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {suppliers.map((supplier) => (
                      <Card key={supplier.id} className="overflow-hidden">
                        <CardHeader className="bg-muted/30 pb-3">
                          <div className="flex justify-between items-start">
                            <CardTitle className="text-lg">
                              {supplier.name}
                            </CardTitle>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => {
                                if (
                                  confirm(
                                    "Are you sure you want to delete this supplier?",
                                  )
                                ) {
                                  deleteSupplier.mutate({ id: supplier.id });
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="p-4 space-y-3">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Users className="h-4 w-4" />
                            <span>
                              {supplier.contactPerson || "No contact person"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Mail className="h-4 w-4" />
                            <span>{supplier.email || "No email"}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Phone className="h-4 w-4" />
                            <span>{supplier.phone || "No phone"}</span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-xl">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    <p>No suppliers found</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="receiving">
            <Card>
              <CardHeader>
                <CardTitle>Receiving Dock</CardTitle>
                <CardDescription>
                  Process incoming shipments and update inventory
                </CardDescription>
              </CardHeader>
              <CardContent>
                {(purchaseOrders?.filter((po: any) => po.status === "ordered")
                  ?.length ?? 0) > 0 ? (
                  <div className="space-y-4">
                    {purchaseOrders
                      ?.filter((po: any) => po.status === "ordered")
                      ?.map((po: any) => (
                        <div
                          key={po.id}
                          className="flex items-center justify-between p-4 border rounded-xl bg-background shadow-sm"
                        >
                          <div className="flex items-center gap-4">
                            <div className="bg-purple-500/10 p-3 rounded-full">
                              <Truck className="h-6 w-6 text-purple-600" />
                            </div>
                            <div>
                              <h4 className="font-bold">
                                Order #{po.id} - {po.supplierName || "Unknown"}
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                {po.quantity} {po.unit} of {po.materialName} •
                                Est. Delivery:{" "}
                                {new Date(
                                  po.expectedDelivery || new Date(),
                                ).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <Button
                            onClick={() => receivePO.mutate({ id: po.id })}
                            disabled={receivePO.isPending}
                          >
                            <Package className="mr-2 h-4 w-4" />
                            Receive Shipment
                          </Button>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-xl">
                    <Truck className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    <p>No pending shipments to receive</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="templates">
            {isTemplateEditorOpen ? (
              <TemplateEditor
                initialData={editingTemplate}
                onSave={(data) => {
                  upsertTemplate.mutate({
                    id: editingTemplate?.id,
                    ...data,
                    type: "purchase_order",
                  });
                }}
                onCancel={() => {
                  setIsTemplateEditorOpen(false);
                  setEditingTemplate(null);
                }}
              />
            ) : (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Communication Templates</CardTitle>
                    <CardDescription>
                      Standardize supplier emails and alerts
                    </CardDescription>
                  </div>
                  <Button onClick={() => setIsTemplateEditorOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    New Template
                  </Button>
                </CardHeader>
                <CardContent>
                  {templates && templates.length > 0 ? (
                    <div className="grid gap-4">
                      {templates
                        .filter((t: any) => t.type === "purchase_order")
                        .map((template: any) => (
                          <div
                            key={template.id}
                            className="flex items-center justify-between p-4 border rounded-xl bg-background shadow-sm"
                          >
                            <div className="flex items-center gap-4">
                              <div className="bg-blue-500/10 p-3 rounded-full">
                                <Mail className="h-6 w-6 text-blue-600" />
                              </div>
                              <div>
                                <h4 className="font-bold">{template.name}</h4>
                                <p className="text-sm text-muted-foreground">
                                  {template.subject}
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setEditingTemplate(template);
                                  setIsTemplateEditorOpen(true);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => {
                                  if (
                                    confirm(
                                      "Are you sure you want to delete this template?",
                                    )
                                  ) {
                                    deleteTemplate.mutate({ id: template.id });
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-xl">
                      <Mail className="h-12 w-12 mx-auto mb-4 opacity-20" />
                      <p>No templates found</p>
                      <Button
                        variant="outline"
                        className="mt-4"
                        onClick={() => setIsTemplateEditorOpen(true)}
                      >
                        Create Template
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
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

import React, { useState } from "react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Package, Plus, Filter, Calendar, Truck, Factory } from "lucide-react";
import { format } from "date-fns";

export default function AggregateInputs() {
  const [isAddInputOpen, setIsAddInputOpen] = useState(false);
  const [selectedBaseId, setSelectedBaseId] = useState<string>("");
  const [selectedMaterialType, setSelectedMaterialType] = useState<string>("");

  // Queries
  const { data: bases } = trpc.concreteBases.list.useQuery();
  const {
    data: inputs,
    isLoading: inputsLoading,
    refetch: refetchInputs,
  } = trpc.aggregateInputs.list.useQuery(
    selectedBaseId || selectedMaterialType
      ? {
          concreteBaseId: selectedBaseId ? Number(selectedBaseId) : undefined,
          materialType: selectedMaterialType || undefined,
        }
      : undefined,
  );

  // Mutations
  const createInputMutation = trpc.aggregateInputs.create.useMutation({
    onSuccess: () => {
      toast.success("Aggregate input recorded successfully");
      setIsAddInputOpen(false);
      refetchInputs();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleAddInput = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const concreteBaseId = formData.get("concreteBaseId") as string;
    if (!concreteBaseId) {
      toast.error("Please select a concrete base");
      return;
    }

    createInputMutation.mutate({
      concreteBaseId: Number(concreteBaseId),
      date: new Date(),
      materialType: formData.get("materialType") as any,
      materialName: formData.get("materialName") as string,
      quantity: Number(formData.get("quantity")),
      unit: formData.get("unit") as string,
      supplier: formData.get("supplier") as string,
      batchNumber: formData.get("batchNumber") as string,
      receivedBy: formData.get("receivedBy") as string,
      notes: formData.get("notes") as string,
    });
  };

  const materialTypes = [
    { value: "cement", label: "Cement" },
    { value: "sand", label: "Sand" },
    { value: "gravel", label: "Gravel" },
    { value: "water", label: "Water" },
    { value: "admixture", label: "Admixture" },
    { value: "other", label: "Other" },
  ];

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
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Package className="h-8 w-8 text-primary" />
              Aggregate Inputs
            </h1>
            <p className="text-muted-foreground mt-1">
              Track material inputs for concrete production
            </p>
          </div>
          <Dialog open={isAddInputOpen} onOpenChange={setIsAddInputOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Input
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Record Aggregate Input</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddInput} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="concreteBaseId">
                      Concrete Base <span className="text-red-500">*</span>
                    </Label>
                    <Select name="concreteBaseId" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select base" />
                      </SelectTrigger>
                      <SelectContent>
                        {bases?.map((base) => (
                          <SelectItem key={base.id} value={base.id.toString()}>
                            {base.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="materialType">
                      Material Type <span className="text-red-500">*</span>
                    </Label>
                    <Select name="materialType" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {materialTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="materialName">
                      Material Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="materialName"
                      name="materialName"
                      placeholder="e.g., Portland Cement Type I"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="quantity">
                      Quantity <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="quantity"
                      name="quantity"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="unit">
                      Unit <span className="text-red-500">*</span>
                    </Label>
                    <Select name="unit" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select unit" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="kg">Kilograms (kg)</SelectItem>
                        <SelectItem value="ton">Tons</SelectItem>
                        <SelectItem value="m3">Cubic Meters (m³)</SelectItem>
                        <SelectItem value="L">Liters (L)</SelectItem>
                        <SelectItem value="bags">Bags</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="supplier">Supplier</Label>
                    <Input
                      id="supplier"
                      name="supplier"
                      placeholder="Supplier name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="batchNumber">Batch Number</Label>
                    <Input
                      id="batchNumber"
                      name="batchNumber"
                      placeholder="Batch/Lot number"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="receivedBy">Received By</Label>
                    <Input
                      id="receivedBy"
                      name="receivedBy"
                      placeholder="Employee name"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    name="notes"
                    placeholder="Additional notes or observations"
                    rows={3}
                  />
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsAddInputOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createInputMutation.isPending}
                  >
                    {createInputMutation.isPending ? "Recording..." : "Record Input"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="filterBase">Concrete Base</Label>
                <Select
                  value={selectedBaseId}
                  onValueChange={setSelectedBaseId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All bases" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All bases</SelectItem>
                    {bases?.map((base) => (
                      <SelectItem key={base.id} value={base.id.toString()}>
                        {base.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="filterMaterialType">Material Type</Label>
                <Select
                  value={selectedMaterialType}
                  onValueChange={setSelectedMaterialType}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All types</SelectItem>
                    {materialTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedBaseId("");
                    setSelectedMaterialType("");
                  }}
                  className="w-full"
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Inputs Table */}
        <Card>
          <CardHeader>
            <CardTitle>Input Records</CardTitle>
            <CardDescription>
              {inputs?.length || 0} record(s) found
            </CardDescription>
          </CardHeader>
          <CardContent>
            {inputsLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading inputs...
              </div>
            ) : !inputs || inputs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No aggregate inputs recorded yet
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Concrete Base</TableHead>
                      <TableHead>Material Type</TableHead>
                      <TableHead>Material Name</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Batch #</TableHead>
                      <TableHead>Received By</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inputs.map((input: any) => (
                      <TableRow key={input.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            {format(new Date(input.date), "MMM dd, yyyy")}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Factory className="h-4 w-4 text-muted-foreground" />
                            {bases?.find((b) => b.id === input.concreteBaseId)
                              ?.name || "N/A"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={getMaterialTypeBadgeColor(
                              input.materialType,
                            )}
                          >
                            {input.materialType}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          {input.materialName}
                        </TableCell>
                        <TableCell>
                          {input.quantity} {input.unit}
                        </TableCell>
                        <TableCell>
                          {input.supplier ? (
                            <div className="flex items-center gap-2">
                              <Truck className="h-4 w-4 text-muted-foreground" />
                              {input.supplier}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {input.batchNumber || (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {input.receivedBy || (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {input.notes ? (
                            <div className="max-w-xs truncate" title={input.notes}>
                              {input.notes}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

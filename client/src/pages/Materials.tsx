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
import { Package, Plus, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export default function Materials() {
  const [createOpen, setCreateOpen] = useState(false);

  const { data: materials, isLoading, refetch } = trpc.materials.list.useQuery();

  const createMutation = trpc.materials.create.useMutation({
    onSuccess: () => {
      toast.success("Material added successfully");
      setCreateOpen(false);
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to add material: ${error.message}`);
    },
  });

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    createMutation.mutate({
      name: formData.get("name") as string,
      category: formData.get("category") as any,
      unit: formData.get("unit") as string,
      quantity: parseInt(formData.get("quantity") as string) || 0,
      minStock: parseInt(formData.get("minStock") as string) || 0,
      supplier: formData.get("supplier") as string,
      unitPrice: parseInt(formData.get("unitPrice") as string) || undefined,
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Materials</h1>
            <p className="text-white/70">Manage inventory and stock levels</p>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="lg">
                <Plus className="mr-2 h-5 w-5" />
                Add Material
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card/95 backdrop-blur">
              <DialogHeader>
                <DialogTitle>Add New Material</DialogTitle>
                <DialogDescription>Add a new material to inventory</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <Label htmlFor="name">Material Name</Label>
                  <Input id="name" name="name" required />
                </div>
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select name="category" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cement">Cement</SelectItem>
                      <SelectItem value="aggregate">Aggregate</SelectItem>
                      <SelectItem value="admixture">Admixture</SelectItem>
                      <SelectItem value="water">Water</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="quantity">Quantity</Label>
                    <Input id="quantity" name="quantity" type="number" defaultValue="0" />
                  </div>
                  <div>
                    <Label htmlFor="unit">Unit</Label>
                    <Input id="unit" name="unit" placeholder="kg, m³, L" required />
                  </div>
                </div>
                <div>
                  <Label htmlFor="minStock">Minimum Stock Level</Label>
                  <Input id="minStock" name="minStock" type="number" defaultValue="0" />
                </div>
                <div>
                  <Label htmlFor="supplier">Supplier</Label>
                  <Input id="supplier" name="supplier" />
                </div>
                <div>
                  <Label htmlFor="unitPrice">Unit Price</Label>
                  <Input id="unitPrice" name="unitPrice" type="number" />
                </div>
                <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Adding..." : "Add Material"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="bg-card/90 backdrop-blur border-white/10">
          <CardHeader>
            <CardTitle>Inventory</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : materials && materials.length > 0 ? (
              <div className="space-y-2">
                {materials.map((material) => {
                  const isLowStock = material.quantity <= material.minStock;
                  return (
                    <div
                      key={material.id}
                      className={`flex items-center justify-between p-4 rounded-lg transition-colors ${
                        isLowStock
                          ? "bg-yellow-500/10 border border-yellow-500/30"
                          : "bg-muted/50 hover:bg-muted"
                      }`}
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <Package className={`h-8 w-8 ${isLowStock ? "text-yellow-500" : "text-primary"}`} />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium">{material.name}</h3>
                            {isLowStock && (
                              <AlertTriangle className="h-4 w-4 text-yellow-500" />
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Category: {material.category}
                          </p>
                          <div className="flex gap-4 mt-1">
                            <span className="text-xs text-muted-foreground">
                              Stock: {material.quantity} {material.unit}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              Min: {material.minStock} {material.unit}
                            </span>
                            {material.supplier && (
                              <span className="text-xs text-muted-foreground">
                                Supplier: {material.supplier}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        {material.unitPrice && (
                          <p className="font-medium">${material.unitPrice}/{material.unit}</p>
                        )}
                        {isLowStock && (
                          <p className="text-xs text-yellow-500 mt-1">Low Stock</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No materials found. Add your first material to get started.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

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
import { Package, Plus, AlertTriangle, Bell, FileDown } from "lucide-react";
import { toast } from "sonner";
import { ExportDialog, type ExportColumn } from "@/components/ExportDialog";
import { downloadExcelFile, generateExportFilename } from "@/lib/exportUtils";

export default function Materials() {
  const [createOpen, setCreateOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  const { data: materials, isLoading, refetch } = trpc.materials.list.useQuery();

  const createMutation = trpc.materials.create.useMutation({
    onSuccess: () => {
      toast.success("Materijal uspješno dodan");
      setCreateOpen(false);
      refetch();
    },
    onError: (error) => {
      toast.error(`Neuspjelo dodavanje materijala: ${error.message}`);
    },
  });

  const checkStockMutation = trpc.materials.sendLowStockAlert.useMutation({
    onSuccess: (data) => {
      if ((data.materialsCount ?? 0) > 0) {
        toast.success(data.message);
      } else {
        toast.info(data.message);
      }
    },
    onError: (error) => {
      toast.error(`Neuspjela provjera zaliha: ${error.message}`);
    },
  });

  const exportMutation = trpc.export.materials.useMutation({
    onSuccess: (data) => {
      downloadExcelFile(data.data, generateExportFilename("materials"));
      toast.success("Materijali uspješno izvezeni");
      setExportOpen(false);
    },
    onError: (error) => {
      toast.error(`Neuspjeli izvoz: ${error.message}`);
    },
  });

  const exportColumns: ExportColumn[] = [
    { key: "id", label: "ID", enabled: true },
    { key: "name", label: "Naziv", enabled: true },
    { key: "category", label: "Kategorija", enabled: true },
    { key: "quantity", label: "Količina", enabled: true },
    { key: "unit", label: "Jedinica", enabled: true },
    { key: "minStock", label: "Min. zalihe", enabled: true },
    { key: "criticalThreshold", label: "Kritični prag", enabled: false },
    { key: "supplier", label: "Dobavljač", enabled: true },
    { key: "unitPrice", label: "Cijena", enabled: false },
    { key: "createdAt", label: "Datum kreiranja", enabled: false },
  ];

  const handleExport = async (selectedColumns: string[]) => {
    await exportMutation.mutateAsync({ columns: selectedColumns });
  };

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    createMutation.mutate({
      name: formData.get("name") as string,
      category: formData.get("category") as any,
      unit: formData.get("unit") as string,
      quantity: parseInt(formData.get("quantity") as string) || 0,
      minStock: parseInt(formData.get("minStock") as string) || 0,
      criticalThreshold: parseInt(formData.get("criticalThreshold") as string) || 0,
      supplier: formData.get("supplier") as string,
      unitPrice: parseInt(formData.get("unitPrice") as string) || undefined,
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Materijali</h1>
            <p className="text-white/70">Upravljajte zalihama i nivoima zaliha</p>
          </div>
          <div className="flex gap-3">
            <Button 
              size="lg" 
              variant="outline"
              onClick={() => setExportOpen(true)}
            >
              <FileDown className="mr-2 h-5 w-5" />
              Izvezi u Excel
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              onClick={() => checkStockMutation.mutate()}
              disabled={checkStockMutation.isPending}
            >
              <Bell className="mr-2 h-5 w-5" />
              {checkStockMutation.isPending ? "Provjeravam..." : "Provjeri zalihe odmah"}
            </Button>
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="lg">
                <Plus className="mr-2 h-5 w-5" />
                Dodaj materijal
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card/95 backdrop-blur">
              <DialogHeader>
                <DialogTitle>Dodaj novi materijal</DialogTitle>
                <DialogDescription>Dodajte novi materijal u inventar</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <Label htmlFor="name">Naziv materijala</Label>
                  <Input id="name" name="name" required />
                </div>
                <div>
                  <Label htmlFor="category">Kategorija</Label>
                  <Select name="category" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Izaberite kategoriju" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cement">Cement</SelectItem>
                      <SelectItem value="aggregate">Agregat</SelectItem>
                      <SelectItem value="admixture">Dodatak</SelectItem>
                      <SelectItem value="water">Voda</SelectItem>
                      <SelectItem value="other">Ostalo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="quantity">Količina</Label>
                    <Input id="quantity" name="quantity" type="number" defaultValue="0" />
                  </div>
                  <div>
                    <Label htmlFor="unit">Jedinica</Label>
                    <Input id="unit" name="unit" placeholder="kg, m³, L" required />
                  </div>
                </div>
                <div>
                  <Label htmlFor="minStock">Minimalni nivo zaliha</Label>
                  <Input id="minStock" name="minStock" type="number" defaultValue="0" />
                </div>
                <div>
                  <Label htmlFor="criticalThreshold">Kritični prag (nivo SMS upozorenja)</Label>
                  <Input id="criticalThreshold" name="criticalThreshold" type="number" defaultValue="0" />
                  <p className="text-xs text-muted-foreground mt-1">SMS upozorenja će biti poslana kada zalihe padnu ispod ovog nivoa</p>
                </div>
                <div>
                  <Label htmlFor="supplier">Dobavljač</Label>
                  <Input id="supplier" name="supplier" />
                </div>
                <div>
                  <Label htmlFor="unitPrice">Jedinična cijena</Label>
                  <Input id="unitPrice" name="unitPrice" type="number" />
                </div>
                <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Dodajem..." : "Dodaj materijal"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        <Card className="bg-card/90 backdrop-blur border-primary/20">
          <CardHeader>
            <CardTitle>Inventar</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Učitavanje...</div>
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
                            Kategorija: {material.category}
                          </p>
                          <div className="flex gap-4 mt-1">
                            <span className="text-xs text-muted-foreground">
                              Zaliha: {material.quantity} {material.unit}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              Min: {material.minStock} {material.unit}
                            </span>
                            {material.criticalThreshold > 0 && (
                              <span className="text-xs text-red-400">
                                Kritično: {material.criticalThreshold} {material.unit}
                              </span>
                            )}
                            {material.supplier && (
                              <span className="text-xs text-muted-foreground">
                                Dobavljač: {material.supplier}
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
                          <p className="text-xs text-yellow-500 mt-1">Niske zalihe</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Nisu pronađeni materijali. Dodajte svoj prvi materijal za početak.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <ExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        title="Izvezi materijale"
        description="Izaberite kolone koje želite uključiti u Excel izvoz"
        columns={exportColumns}
        onExport={handleExport}
        isExporting={exportMutation.isPending}
      />
    </DashboardLayout>
  );
}

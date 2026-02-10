import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Factory,
  Plus,
  Package,
  Cog,
  Activity,
  MapPin,
  Phone,
  User,
  Calendar,
  Truck,
  FileDown
} from "lucide-react";
import { format } from "date-fns";

export default function ConcreteBaseDashboard() {
  const [activeBaseId, setActiveBaseId] = useState<string>("");
  const [isAddBaseOpen, setIsAddBaseOpen] = useState(false);
  const [isAddInputOpen, setIsAddInputOpen] = useState(false);

  // Queries
  const { data: bases, isLoading: basesLoading, refetch: refetchBases } = trpc.concreteBases.list.useQuery();
  const { data: inputs, isLoading: inputsLoading, refetch: refetchInputs } = trpc.aggregateInputs.list.useQuery(
    activeBaseId ? { concreteBaseId: Number(activeBaseId) } : undefined
  );
  const { data: machines } = trpc.machines.list.useQuery(
    activeBaseId ? { concreteBaseId: Number(activeBaseId) } : undefined
  );

  // Mutations
  const createBaseMutation = trpc.concreteBases.create.useMutation({
    onSuccess: () => {
      toast.success("Concrete base added successfully");
      setIsAddBaseOpen(false);
      refetchBases();
    },
    onError: (err) => toast.error(err.message)
  });

  const createInputMutation = trpc.aggregateInputs.create.useMutation({
    onSuccess: () => {
      toast.success("Aggregate input recorded");
      setIsAddInputOpen(false);
      refetchInputs();
    },
    onError: (err) => toast.error(err.message)
  });

  const handleAddBase = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createBaseMutation.mutate({
      name: formData.get("name") as string,
      location: formData.get("location") as string,
      capacity: Number(formData.get("capacity")),
      managerName: formData.get("managerName") as string,
      phoneNumber: formData.get("phoneNumber") as string,
      status: "active"
    });
  };

  const handleAddInput = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createInputMutation.mutate({
      concreteBaseId: Number(activeBaseId),
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

  const activeBase = bases?.find(b => b.id.toString() === activeBaseId);

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Factory className="h-8 w-8 text-primary" />
              Concrete Base Management
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage production facilities, aggregate stock, and machine status
            </p>
          </div>
          <Dialog open={isAddBaseOpen} onOpenChange={setIsAddBaseOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Concrete Base
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Concrete Base</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddBase} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Base Name</Label>
                  <Input id="name" name="name" placeholder="e.g. North Mixing Plant" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="capacity">Capacity (m³/hr)</Label>
                    <Input id="capacity" name="capacity" type="number" placeholder="60" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input id="location" name="location" placeholder="City/Region" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="managerName">Manager Name</Label>
                    <Input id="managerName" name="managerName" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phoneNumber">Contact Phone</Label>
                    <Input id="phoneNumber" name="phoneNumber" />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={createBaseMutation.isPending}>
                  {createBaseMutation.isPending ? "Saving..." : "Create Base"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Base Selection Sidebar */}
          <Card className="lg:col-span-1 border-l-4 border-l-primary shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Select Plant
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {basesLoading ? (
                <div className="text-center py-4">Loading plants...</div>
              ) : bases?.map((base) => (
                <div
                  key={base.id}
                  onClick={() => setActiveBaseId(base.id.toString())}
                  className={`p-3 rounded-lg border cursor-pointer transition-all hover:bg-muted/50 ${activeBaseId === base.id.toString() ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-transparent'}`}
                >
                  <div className="font-medium flex items-center justify-between">
                    {base.name}
                    <Badge variant={base.status === 'active' ? 'default' : 'secondary'} className="text-[10px] h-4">
                      {base.status}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <MapPin className="h-3 w-3" /> {base.location}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Main Content Area */}
          <div className="lg:col-span-3 space-y-6">
            {!activeBaseId ? (
              <Card className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <Factory className="h-12 w-12 mb-4 opacity-20" />
                <p>Select a concrete base from the list to view dashboard</p>
              </Card>
            ) : (
              <>
                {/* Active Base Overview */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="bg-primary/5 border-primary/20">
                    <CardHeader className="pb-2">
                      <CardDescription className="text-xs">Daily Capacity</CardDescription>
                      <CardTitle className="text-2xl font-bold">{activeBase?.capacity || 0} m³/hr</CardTitle>
                    </CardHeader>
                  </Card>
                  <Card className="bg-orange-500/5 border-orange-500/20">
                    <CardHeader className="pb-2">
                      <CardDescription className="text-xs">Active Machines</CardDescription>
                      <CardTitle className="text-2xl font-bold">{machines?.filter(m => m.status === 'operational').length || 0}</CardTitle>
                    </CardHeader>
                  </Card>
                  <Card className="bg-blue-500/5 border-blue-500/20">
                    <CardHeader className="pb-2">
                      <CardDescription className="text-xs">Base Manager</CardDescription>
                      <CardTitle className="text-lg font-semibold truncate">{activeBase?.managerName || 'Not Assigned'}</CardTitle>
                    </CardHeader>
                  </Card>
                </div>

                <Tabs defaultValue="inventory" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="inventory" className="flex items-center gap-2">
                      <Package className="h-4 w-4" /> Aggregate Input
                    </TabsTrigger>
                    <TabsTrigger value="machines" className="flex items-center gap-2">
                      <Cog className="h-4 w-4" /> Equipment
                    </TabsTrigger>
                    <TabsTrigger value="details" className="flex items-center gap-2">
                      <Activity className="h-4 w-4" /> Facility Details
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="inventory" className="mt-4 space-y-4">
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <div>
                          <CardTitle className="text-lg">Aggregate Intake Log</CardTitle>
                          <CardDescription>Track raw materials arriving at this base</CardDescription>
                        </div>
                        <Dialog open={isAddInputOpen} onOpenChange={setIsAddInputOpen}>
                          <DialogTrigger asChild>
                            <Button size="sm">
                              <Plus className="mr-2 h-4 w-4" /> Record Input
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-md">
                            <DialogHeader>
                              <DialogTitle>Record Aggregate Input</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleAddInput} className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label htmlFor="materialType">Material Type</Label>
                                  <Select name="materialType" defaultValue="sand" required>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="cement">Cement</SelectItem>
                                      <SelectItem value="sand">Sand</SelectItem>
                                      <SelectItem value="gravel">Gravel</SelectItem>
                                      <SelectItem value="admixture">Admixture</SelectItem>
                                      <SelectItem value="other">Other</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="materialName">Specific Name</Label>
                                  <Input id="materialName" name="materialName" placeholder="Portland CEM II" required />
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label htmlFor="quantity">Quantity</Label>
                                  <Input id="quantity" name="quantity" type="number" step="0.01" required />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="unit">Unit</Label>
                                  <Select name="unit" defaultValue="tons">
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="tons">Tons</SelectItem>
                                      <SelectItem value="kg">Kilograms</SelectItem>
                                      <SelectItem value="m3">Cubic Meters</SelectItem>
                                      <SelectItem value="liters">Liters</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="supplier">Supplier</Label>
                                <Input id="supplier" name="supplier" />
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label htmlFor="batchNumber">Batch/Lot #</Label>
                                  <Input id="batchNumber" name="batchNumber" />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="receivedBy">Received By</Label>
                                  <Input id="receivedBy" name="receivedBy" />
                                </div>
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="notes">Notes</Label>
                                <Input id="notes" name="notes" />
                              </div>
                              <Button type="submit" className="w-full" disabled={createInputMutation.isPending}>
                                {createInputMutation.isPending ? "Recording..." : "Save Record"}
                              </Button>
                            </form>
                          </DialogContent>
                        </Dialog>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Date</TableHead>
                              <TableHead>Material</TableHead>
                              <TableHead>Quantity</TableHead>
                              <TableHead>Supplier</TableHead>
                              <TableHead>Batch</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {inputsLoading ? (
                              <TableRow><TableCell colSpan={5} className="text-center">Loading...</TableCell></TableRow>
                            ) : !inputs || inputs.length === 0 ? (
                              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No input records found</TableCell></TableRow>
                            ) : inputs.map((input) => (
                              <TableRow key={input.id}>
                                <TableCell className="text-xs">{format(new Date(input.date), "dd MMM yyyy")}</TableCell>
                                <TableCell>
                                  <div className="font-medium text-sm capitalize">{input.materialType}</div>
                                  <div className="text-[10px] text-muted-foreground">{input.materialName}</div>
                                </TableCell>
                                <TableCell className="font-semibold text-sm">{input.quantity} {input.unit}</TableCell>
                                <TableCell className="text-sm">{input.supplier || '-'}</TableCell>
                                <TableCell className="text-xs font-mono">{input.batchNumber || '-'}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="machines" className="mt-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Facility Equipment</CardTitle>
                        <CardDescription>Machines and heavy equipment assigned to this base</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {machines?.map((machine) => (
                            <div key={machine.id} className="flex items-center gap-4 p-4 border rounded-lg bg-muted/30">
                              <div className={`p-2 rounded-full ${machine.status === 'operational' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                <Cog className="h-5 w-5" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <span className="font-semibold truncate">{machine.name}</span>
                                  <Badge variant={machine.status === 'operational' ? 'default' : 'destructive'} className="text-[10px]">
                                    {machine.status}
                                  </Badge>
                                </div>
                                <div className="text-xs text-muted-foreground mt-1 flex gap-2">
                                  <span>#{machine.serialNumber}</span>
                                  <span>•</span>
                                  <span className="capitalize">{machine.type}</span>
                                </div>
                                <div className="mt-2 text-[10px] font-medium text-muted-foreground">
                                  Last Maint: {machine.lastMaintenanceAt ? format(new Date(machine.lastMaintenanceAt), "dd.MM.yyyy") : 'None'}
                                </div>
                              </div>
                            </div>
                          ))}
                          {(!machines || machines.length === 0) && (
                            <div className="col-span-2 text-center py-10 border border-dashed rounded-lg text-muted-foreground">
                              No machines assigned to this base. Manage assignments in Machines page.
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="details" className="mt-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Base Information</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="space-y-4">
                            <div className="flex items-start gap-3">
                              <MapPin className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                              <div>
                                <div className="text-sm font-semibold">Location</div>
                                <div className="text-sm text-muted-foreground">{activeBase?.location || 'No location provided'}</div>
                              </div>
                            </div>
                            <div className="flex items-start gap-3">
                              <User className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                              <div>
                                <div className="text-sm font-semibold">Plant Manager</div>
                                <div className="text-sm text-muted-foreground">{activeBase?.managerName || 'No manager assigned'}</div>
                              </div>
                            </div>
                            <div className="flex items-start gap-3">
                              <Phone className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                              <div>
                                <div className="text-sm font-semibold">Contact</div>
                                <div className="text-sm text-muted-foreground">{activeBase?.phoneNumber || 'No contact number'}</div>
                              </div>
                            </div>
                          </div>
                          <div className="space-y-4 border-l pl-8">
                            <div className="flex items-start gap-3">
                              <Activity className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                              <div>
                                <div className="text-sm font-semibold">Operational Status</div>
                                <Badge className="mt-1">{activeBase?.status}</Badge>
                              </div>
                            </div>
                            <div className="flex items-start gap-3">
                              <Calendar className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                              <div>
                                <div className="text-sm font-semibold">Added On</div>
                                <div className="text-sm text-muted-foreground">{activeBase?.createdAt ? format(new Date(activeBase.createdAt), "PPP") : '-'}</div>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="pt-4 flex gap-2">
                           <Button variant="outline" size="sm" className="flex-1">
                             <Cog className="mr-2 h-4 w-4" /> Edit Configuration
                           </Button>
                           <Button variant="outline" size="sm" className="flex-1">
                             <FileDown className="mr-2 h-4 w-4" /> Export Report
                           </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

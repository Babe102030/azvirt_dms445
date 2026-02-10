import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Cog, Plus, Trash2, Wrench, Fuel, FileText } from "lucide-react";
import { toast } from "sonner";
import MaintenanceReport from "@/components/MaintenanceReport";

export default function Machines() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isMaintenanceDialogOpen, setIsMaintenanceDialogOpen] = useState(false);
  const [isWorkHoursDialogOpen, setIsWorkHoursDialogOpen] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState<number | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [selectedMachineForReport, setSelectedMachineForReport] =
    useState<any>(null);

  const { data: machines, isLoading, refetch } = trpc.machines.list.useQuery();
  const { data: concreteBases } = trpc.concreteBases.list.useQuery();

  const createMutation = trpc.machines.create.useMutation({
    onSuccess: () => {
      toast.success("Machine added successfully");
      setIsAddDialogOpen(false);
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to add machine: ${error.message}`);
    },
  });

  const createMaintenanceMutation = trpc.machineMaintenance.create.useMutation({
    onSuccess: () => {
      toast.success("Maintenance record added successfully");
      setIsMaintenanceDialogOpen(false);
    },
    onError: (error) => {
      toast.error(`Failed to add maintenance record: ${error.message}`);
    },
  });

  const createWorkHoursMutation = trpc.machineWorkHours.create.useMutation({
    onSuccess: () => {
      toast.success("Working hours recorded successfully");
      setIsWorkHoursDialogOpen(false);
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to record working hours: ${error.message}`);
    },
  });

  const deleteMutation = trpc.machines.delete.useMutation({
    onSuccess: () => {
      toast.success("Machine removed successfully");
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to remove machine: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    createMutation.mutate({
      name: formData.get("name") as string,
      machineNumber: formData.get("machineNumber") as string,
      type: formData.get("type") as any,
      manufacturer: (formData.get("manufacturer") as string) || undefined,
      model: (formData.get("model") as string) || undefined,
      year: formData.get("year") ? Number(formData.get("year")) : undefined,
      concreteBaseId: formData.get("concreteBaseId")
        ? Number(formData.get("concreteBaseId"))
        : undefined,
      status: "operational",
    });
  };

  const handleMaintenanceSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedMachine) return;

    const formData = new FormData(e.currentTarget);
    const maintenanceType = formData.get("maintenanceType") as string;

    createMaintenanceMutation.mutate({
      machineId: selectedMachine,
      date: new Date(),
      maintenanceType: maintenanceType as any,
      description: (formData.get("description") as string) || undefined,
      lubricationType:
        maintenanceType === "lubrication"
          ? (formData.get("lubricationType") as string)
          : undefined,
      lubricationAmount:
        maintenanceType === "lubrication" && formData.get("lubricationAmount")
          ? Number(formData.get("lubricationAmount"))
          : undefined,
      fuelType:
        maintenanceType === "fuel"
          ? (formData.get("fuelType") as string)
          : undefined,
      fuelAmount:
        maintenanceType === "fuel" && formData.get("fuelAmount")
          ? Number(formData.get("fuelAmount"))
          : undefined,
      cost: formData.get("cost") ? Number(formData.get("cost")) : undefined,
      performedBy: (formData.get("performedBy") as string) || undefined,
      notes: (formData.get("notes") as string) || undefined,
    });
  };

  const handleWorkHoursSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedMachine) return;

    const formData = new FormData(e.currentTarget);
    const dateStr = formData.get("date") as string;
    const startTimeStr = formData.get("startTime") as string;
    const endTimeStr = formData.get("endTime") as string;

    const startTime = new Date(`${dateStr}T${startTimeStr}`);
    const endTime = endTimeStr
      ? new Date(`${dateStr}T${endTimeStr}`)
      : undefined;

    let hoursWorked = 0;
    if (endTime) {
      hoursWorked =
        Math.round(
          ((endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60)) * 10,
        ) / 10;
    }

    createWorkHoursMutation.mutate({
      machineId: selectedMachine,
      date: new Date(dateStr),
      startTime,
      endTime,
      hoursWorked:
        hoursWorked > 0 ? hoursWorked : Number(formData.get("hours") || 0),
      notes: formData.get("notes") as string,
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Cog className="h-8 w-8 text-primary" />
            Machine Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Track equipment, maintenance, and working hours
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90">
              <Plus className="mr-2 h-4 w-4" />
              Add Machine
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Machine</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Machine Name *</Label>
                  <Input id="name" name="name" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="machineNumber">Machine Number *</Label>
                  <Input id="machineNumber" name="machineNumber" required />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Type *</Label>
                <Select name="type" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mixer">Mixer</SelectItem>
                    <SelectItem value="pump">Pump</SelectItem>
                    <SelectItem value="truck">Truck</SelectItem>
                    <SelectItem value="excavator">Excavator</SelectItem>
                    <SelectItem value="crane">Crane</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="manufacturer">Manufacturer</Label>
                  <Input id="manufacturer" name="manufacturer" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="model">Model</Label>
                  <Input id="model" name="model" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="year">Year</Label>
                  <Input
                    id="year"
                    name="year"
                    type="number"
                    min="1900"
                    max="2100"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="concreteBaseId">Concrete Base</Label>
                  <Select name="concreteBaseId">
                    <SelectTrigger>
                      <SelectValue placeholder="Select base" />
                    </SelectTrigger>
                    <SelectContent>
                      {concreteBases?.map((base: any) => (
                        <SelectItem key={base.id} value={base.id.toString()}>
                          {base.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Adding..." : "Add Machine"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Maintenance Dialog */}
      <Dialog
        open={isMaintenanceDialogOpen}
        onOpenChange={setIsMaintenanceDialogOpen}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Log Maintenance</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleMaintenanceSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="maintenanceType">Maintenance Type *</Label>
              <Select name="maintenanceType" required>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lubrication">Lubrication</SelectItem>
                  <SelectItem value="fuel">Fuel</SelectItem>
                  <SelectItem value="oil_change">Oil Change</SelectItem>
                  <SelectItem value="repair">Repair</SelectItem>
                  <SelectItem value="inspection">Inspection</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input id="description" name="description" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="lubricationType">Lubrication Type</Label>
                <Input
                  id="lubricationType"
                  name="lubricationType"
                  placeholder="e.g., Engine Oil, Grease"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lubricationAmount">Amount (L)</Label>
                <Input
                  id="lubricationAmount"
                  name="lubricationAmount"
                  type="number"
                  step="0.1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fuelType">Fuel Type</Label>
                <Input
                  id="fuelType"
                  name="fuelType"
                  placeholder="e.g., Diesel, Gasoline"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fuelAmount">Fuel Amount (L)</Label>
                <Input
                  id="fuelAmount"
                  name="fuelAmount"
                  type="number"
                  step="0.1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cost">Cost (€)</Label>
                <Input id="cost" name="cost" type="number" step="0.01" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="performedBy">Performed By</Label>
                <Input id="performedBy" name="performedBy" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Input id="notes" name="notes" />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsMaintenanceDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMaintenanceMutation.isPending}
              >
                {createMaintenanceMutation.isPending
                  ? "Saving..."
                  : "Save Maintenance"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Card className="border-l-4 border-l-primary">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Machine #</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Manufacturer</TableHead>
              <TableHead>Total Hours</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center py-8 text-muted-foreground"
                >
                  Loading machines...
                </TableCell>
              </TableRow>
            ) : !machines || machines.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center py-8 text-muted-foreground"
                >
                  No machines found. Add your first machine to get started.
                </TableCell>
              </TableRow>
            ) : (
              machines.map((machine: any) => (
                <TableRow key={machine.id}>
                  <TableCell className="font-medium">
                    {machine.machineNumber}
                  </TableCell>
                  <TableCell>{machine.name}</TableCell>
                  <TableCell className="capitalize">{machine.type}</TableCell>
                  <TableCell>{machine.manufacturer || "-"}</TableCell>
                  <TableCell>{machine.totalWorkingHours || 0} hrs</TableCell>
                  <TableCell>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        machine.status === "operational"
                          ? "bg-green-500/20 text-green-700"
                          : machine.status === "maintenance"
                            ? "bg-yellow-500/20 text-yellow-700"
                            : machine.status === "repair"
                              ? "bg-red-500/20 text-red-700"
                              : "bg-gray-500/20 text-gray-700"
                      }`}
                    >
                      {machine.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedMachineForReport(machine);
                        setReportOpen(true);
                      }}
                      title="View Maintenance Report"
                    >
                      <FileText className="h-4 w-4 text-orange-600" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedMachine(machine.id);
                        setIsMaintenanceDialogOpen(true);
                      }}
                    >
                      <Wrench className="h-4 w-4 text-primary" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedMachine(machine.id);
                        setIsWorkHoursDialogOpen(true);
                      }}
                      title="Record Working Hours"
                    >
                      <Clock className="h-4 w-4 text-blue-600" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (
                          confirm(
                            "Are you sure you want to remove this machine?",
                          )
                        ) {
                          deleteMutation.mutate({ id: machine.id });
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog
        open={isWorkHoursDialogOpen}
        onOpenChange={setIsWorkHoursDialogOpen}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record Machine Working Hours</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleWorkHoursSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date *</Label>
              <Input
                id="date"
                name="date"
                type="date"
                required
                defaultValue={new Date().toISOString().split("T")[0]}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startTime">Start Time *</Label>
                <Input id="startTime" name="startTime" type="time" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endTime">End Time</Label>
                <Input id="endTime" name="endTime" type="time" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="hours">Total Hours (Manual Override)</Label>
              <Input
                id="hours"
                name="hours"
                type="number"
                step="0.1"
                placeholder="Calculated from times if empty"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes / Operator</Label>
              <Input
                id="notes"
                name="notes"
                placeholder="Operator name or task details"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsWorkHoursDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createWorkHoursMutation.isPending}
              >
                {createWorkHoursMutation.isPending
                  ? "Recording..."
                  : "Save Hours"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {selectedMachineForReport && (
        <MaintenanceReport
          machine={selectedMachineForReport}
          records={[]}
          open={reportOpen}
          onOpenChange={setReportOpen}
        />
      )}
    </div>
  );
}

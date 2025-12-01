import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
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
import { Clock, Play, Square, Check, X, Plus } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function Timesheets() {
  const { user } = useAuth();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  const { data: timesheets, isLoading, refetch } = trpc.timesheets.list.useQuery(
    statusFilter !== "all" ? { status: statusFilter as any } : undefined
  );
  
  const { data: employees } = trpc.employees.list.useQuery({ status: "active" });
  const { data: projects } = trpc.projects.list.useQuery();

  const clockInMutation = trpc.timesheets.clockIn.useMutation({
    onSuccess: () => {
      toast.success("Clocked in successfully");
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to clock in: ${error.message}`);
    },
  });

  const clockOutMutation = trpc.timesheets.clockOut.useMutation({
    onSuccess: () => {
      toast.success("Clocked out successfully");
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to clock out: ${error.message}`);
    },
  });

  const createMutation = trpc.timesheets.create.useMutation({
    onSuccess: () => {
      toast.success("Timesheet entry added successfully");
      setIsAddDialogOpen(false);
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to add entry: ${error.message}`);
    },
  });

  const approveMutation = trpc.timesheets.approve.useMutation({
    onSuccess: () => {
      toast.success("Timesheet approved");
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to approve: ${error.message}`);
    },
  });

  const rejectMutation = trpc.timesheets.reject.useMutation({
    onSuccess: () => {
      toast.success("Timesheet rejected");
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to reject: ${error.message}`);
    },
  });

  const handleClockIn = (employeeId: number, projectId?: number) => {
    clockInMutation.mutate({ employeeId, projectId });
  };

  const handleClockOut = (id: number) => {
    clockOutMutation.mutate({ id });
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const startTime = new Date(formData.get("date") as string + " " + formData.get("startTime") as string);
    const endTimeStr = formData.get("endTime") as string;
    const endTime = endTimeStr ? new Date(formData.get("date") as string + " " + endTimeStr) : undefined;
    
    let hoursWorked = 0;
    if (endTime) {
      hoursWorked = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60) * 10) / 10;
    }
    
    createMutation.mutate({
      employeeId: Number(formData.get("employeeId")),
      date: new Date(formData.get("date") as string),
      startTime,
      endTime,
      hoursWorked,
      projectId: formData.get("projectId") ? Number(formData.get("projectId")) : undefined,
      notes: formData.get("notes") as string || undefined,
      status: "pending",
    });
  };

  const calculateHours = (startTime: Date, endTime: Date | null) => {
    if (!endTime) return "In Progress";
    const hours = (new Date(endTime).getTime() - new Date(startTime).getTime()) / (1000 * 60 * 60);
    return `${hours.toFixed(1)} hrs`;
  };

  const activeEntry = timesheets?.find(t => !t.endTime && t.employeeId === selectedEmployee);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Clock className="h-8 w-8 text-primary" />
            Timesheets
          </h1>
          <p className="text-muted-foreground mt-1">
            Track employee work hours and manage approvals
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Add Entry
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add Timesheet Entry</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="employeeId">Employee *</Label>
                  <Select name="employeeId" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select employee" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees?.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id.toString()}>
                          {emp.firstName} {emp.lastName} ({emp.employeeNumber})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date">Date *</Label>
                    <Input id="date" name="date" type="date" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="projectId">Project</Label>
                    <Select name="projectId">
                      <SelectTrigger>
                        <SelectValue placeholder="Select project" />
                      </SelectTrigger>
                      <SelectContent>
                        {projects?.map((project) => (
                          <SelectItem key={project.id} value={project.id.toString()}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
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
                  <Label htmlFor="notes">Notes</Label>
                  <Input id="notes" name="notes" />
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Adding..." : "Add Entry"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Quick Clock In/Out */}
      <Card className="p-6 border-l-4 border-l-primary">
        <h2 className="text-lg font-semibold mb-4">Quick Clock In/Out</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Select Employee</Label>
            <Select value={selectedEmployee?.toString() || ""} onValueChange={(val) => setSelectedEmployee(Number(val))}>
              <SelectTrigger>
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>
              <SelectContent>
                {employees?.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id.toString()}>
                    {emp.firstName} {emp.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end gap-2">
            {activeEntry ? (
              <Button
                onClick={() => handleClockOut(activeEntry.id)}
                variant="destructive"
                className="flex-1"
                disabled={clockOutMutation.isPending}
              >
                <Square className="mr-2 h-4 w-4" />
                Clock Out
              </Button>
            ) : (
              <Button
                onClick={() => selectedEmployee && handleClockIn(selectedEmployee)}
                className="flex-1 bg-primary hover:bg-primary/90"
                disabled={!selectedEmployee || clockInMutation.isPending}
              >
                <Play className="mr-2 h-4 w-4" />
                Clock In
              </Button>
            )}
          </div>
        </div>
        {activeEntry && (
          <div className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-md">
            <p className="text-sm">
              Currently clocked in since {format(new Date(activeEntry.startTime), "HH:mm")}
            </p>
          </div>
        )}
      </Card>

      {/* Filter */}
      <Card className="p-4 border-l-4 border-l-primary">
        <div className="flex items-center gap-4">
          <Label>Filter by Status:</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Timesheets Table */}
      <Card className="border-l-4 border-l-primary">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Employee</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Start Time</TableHead>
              <TableHead>End Time</TableHead>
              <TableHead>Hours</TableHead>
              <TableHead>Project</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  Loading timesheets...
                </TableCell>
              </TableRow>
            ) : !timesheets || timesheets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No timesheet entries found.
                </TableCell>
              </TableRow>
            ) : (
              timesheets.map((entry) => {
                const employee = employees?.find(e => e.id === entry.employeeId);
                const project = projects?.find(p => p.id === entry.projectId);
                
                return (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium">
                      {employee ? `${employee.firstName} ${employee.lastName}` : `Employee #${entry.employeeId}`}
                    </TableCell>
                    <TableCell>{format(new Date(entry.date), "MMM dd, yyyy")}</TableCell>
                    <TableCell>{format(new Date(entry.startTime), "HH:mm")}</TableCell>
                    <TableCell>
                      {entry.endTime ? format(new Date(entry.endTime), "HH:mm") : "-"}
                    </TableCell>
                    <TableCell>{calculateHours(entry.startTime, entry.endTime)}</TableCell>
                    <TableCell>{project?.name || "-"}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        entry.status === "approved" ? "bg-green-500/20 text-green-700" :
                        entry.status === "rejected" ? "bg-red-500/20 text-red-700" :
                        "bg-yellow-500/20 text-yellow-700"
                      }`}>
                        {entry.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      {user?.role === "admin" && entry.status === "pending" && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => approveMutation.mutate({ id: entry.id })}
                            disabled={approveMutation.isPending}
                          >
                            <Check className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => rejectMutation.mutate({ id: entry.id })}
                            disabled={rejectMutation.isPending}
                          >
                            <X className="h-4 w-4 text-red-600" />
                          </Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

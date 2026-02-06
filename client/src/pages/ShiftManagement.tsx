import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Calendar as CalendarIcon,
  Clock,
  Users,
  Copy,
  Plus,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRightLeft,
} from "lucide-react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export default function ShiftManagement() {
  const { t } = useLanguage();
  const [date, setDate] = useState<Date>(new Date());
  const [selectedTab, setSelectedTab] = useState("calendar");
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [assignForm, setAssignForm] = useState({
    employeeId: "",
    templateId: "",
    startTime: "07:00",
    endTime: "19:00",
    shiftDate: format(new Date(), "yyyy-MM-dd"),
  });
  const [availabilityEmployeeId, setAvailabilityEmployeeId] =
    useState<string>("");
  const [templateForm, setTemplateForm] = useState({
    name: "",
    startTime: "07:00",
    endTime: "19:00",
    color: "#FF6C0E",
  });

  // Queries
  const {
    data: shifts,
    isLoading: shiftsLoading,
    refetch: refetchShifts,
  } = trpc.shiftAssignments.getShiftsForRange.useQuery({
    startDate: new Date(date.getFullYear(), date.getMonth(), 1),
    endDate: new Date(date.getFullYear(), date.getMonth() + 1, 0),
  });

  const { data: templates, isLoading: templatesLoading } =
    trpc.shiftAssignments.getTemplates.useQuery();
  const { data: employees, isLoading: employeesLoading } =
    trpc.shiftAssignments.getEmployees.useQuery();

  const { data: availabilityData, refetch: refetchAvailability } =
    trpc.shiftAssignments.getAvailability.useQuery(
      { employeeId: parseInt(availabilityEmployeeId) },
      { enabled: !!availabilityEmployeeId },
    );

  const {
    data: pendingSwaps,
    isLoading: swapsLoading,
    refetch: refetchSwaps,
  } = trpc.shiftAssignments.getPendingSwaps.useQuery();

  // Mutations
  const assignShiftMutation = trpc.shiftAssignments.assignShift.useMutation({
    onSuccess: () => {
      toast.success(t("common.success"));
      setIsAssignDialogOpen(false);
      refetchShifts();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const createTemplateMutation =
    trpc.shiftAssignments.createTemplate.useMutation({
      onSuccess: () => {
        toast.success(t("common.success"));
        setIsTemplateDialogOpen(false);
        trpc.useUtils().shiftAssignments.getTemplates.invalidate();
      },
      onError: (error) => {
        toast.error(error.message);
      },
    });

  const respondToSwapMutation = trpc.shiftAssignments.respondToSwap.useMutation(
    {
      onSuccess: () => {
        toast.success(t("common.success"));
        refetchSwaps();
        refetchShifts();
      },
      onError: (error) => {
        toast.error(error.message);
      },
    },
  );

  const setAvailabilityMutation =
    trpc.shiftAssignments.setAvailability.useMutation({
      onSuccess: () => {
        toast.success(t("common.success"));
        refetchAvailability();
      },
      onError: (error) => {
        toast.error(error.message);
      },
    });

  const handleAssignShift = async () => {
    if (!assignForm.employeeId) {
      toast.error("Please select an employee");
      return;
    }

    const baseDate = new Date(assignForm.shiftDate);
    const startParts = assignForm.startTime.split(":");
    const endParts = assignForm.endTime.split(":");

    const startTime = new Date(baseDate);
    startTime.setHours(parseInt(startParts[0]), parseInt(startParts[1]));

    const endTime = new Date(baseDate);
    endTime.setHours(parseInt(endParts[0]), parseInt(endParts[1]));

    await assignShiftMutation.mutateAsync({
      employeeId: parseInt(assignForm.employeeId),
      shiftDate: baseDate,
      startTime,
      endTime,
    });
  };

  const handleCreateTemplate = async () => {
    if (!templateForm.name) {
      toast.error("Please enter a template name");
      return;
    }

    const startParts = templateForm.startTime.split(":");
    const endParts = templateForm.endTime.split(":");
    const startHour = parseInt(startParts[0]);
    const startMin = parseInt(startParts[1]);
    const endHour = parseInt(endParts[0]);
    const endMin = parseInt(endParts[1]);

    let duration = endHour + endMin / 60 - (startHour + startMin / 60);
    if (duration < 0) duration += 24;

    await createTemplateMutation.mutateAsync({
      name: templateForm.name,
      startTime: templateForm.startTime,
      endTime: templateForm.endTime,
      durationHours: Math.round(duration * 10) / 10,
      color: templateForm.color,
    });
  };

  if (shiftsLoading || templatesLoading || employeesLoading || swapsLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[calc(100vh-10rem)]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto py-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {t("shiftManagement.title")}
            </h1>
            <p className="text-muted-foreground">
              {t("shiftManagement.description")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Dialog
              open={isAssignDialogOpen}
              onOpenChange={setIsAssignDialogOpen}
            >
              <DialogTrigger asChild>
                <Button className="bg-orange-500 hover:bg-orange-600">
                  <Plus className="h-4 w-4 mr-2" />
                  {t("shiftManagement.assignShift")}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t("shiftManagement.assignShift")}</DialogTitle>
                  <DialogDescription>
                    Assign a new shift to an employee.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label>{t("employees.title")}</Label>
                    <Select
                      value={assignForm.employeeId}
                      onValueChange={(v) =>
                        setAssignForm({ ...assignForm, employeeId: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select employee" />
                      </SelectTrigger>
                      <SelectContent>
                        {employees?.map((emp: any) => (
                          <SelectItem key={emp.id} value={emp.id.toString()}>
                            {emp.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>{t("shiftManagement.shiftTemplates")}</Label>
                    <Select
                      value={assignForm.templateId}
                      onValueChange={(v) => {
                        const template = templates?.find(
                          (t) => t.id.toString() === v,
                        );
                        if (template) {
                          setAssignForm({
                            ...assignForm,
                            templateId: v,
                            startTime: template.startTime,
                            endTime: template.endTime,
                          });
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select template (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        {templates?.map((temp) => (
                          <SelectItem key={temp.id} value={temp.id.toString()}>
                            {temp.name} ({temp.startTime} - {temp.endTime})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>{t("shiftManagement.shiftDate")}</Label>
                    <Input
                      type="date"
                      value={assignForm.shiftDate}
                      onChange={(e) =>
                        setAssignForm({
                          ...assignForm,
                          shiftDate: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>{t("shiftManagement.startTime")}</Label>
                      <Input
                        type="time"
                        value={assignForm.startTime}
                        onChange={(e) =>
                          setAssignForm({
                            ...assignForm,
                            startTime: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>{t("shiftManagement.endTime")}</Label>
                      <Input
                        type="time"
                        value={assignForm.endTime}
                        onChange={(e) =>
                          setAssignForm({
                            ...assignForm,
                            endTime: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsAssignDialogOpen(false)}
                  >
                    {t("common.cancel")}
                  </Button>
                  <Button
                    className="bg-orange-500 hover:bg-orange-600"
                    onClick={handleAssignShift}
                    disabled={assignShiftMutation.isPending}
                  >
                    {assignShiftMutation.isPending
                      ? t("common.loading")
                      : t("common.confirm")}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Tabs
          value={selectedTab}
          onValueChange={setSelectedTab}
          className="space-y-6"
        >
          <TabsList className="grid w-full grid-cols-4 md:w-[800px]">
            <TabsTrigger value="calendar">
              <CalendarIcon className="h-4 w-4 mr-2" />
              {t("common.filter")}
            </TabsTrigger>
            <TabsTrigger value="templates">
              <Copy className="h-4 w-4 mr-2" />
              {t("shiftManagement.shiftTemplates")}
            </TabsTrigger>
            <TabsTrigger value="swaps">
              <ArrowRightLeft className="h-4 w-4 mr-2" />
              {t("shiftManagement.shiftSwaps")}
              {pendingSwaps && pendingSwaps.length > 0 && (
                <Badge className="ml-2 bg-orange-500 text-white">
                  {pendingSwaps.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="availability">
              <Clock className="h-4 w-4 mr-2" />
              {t("shiftManagement.employeeAvailability")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="calendar" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle className="text-sm font-medium">
                    {t("shiftManagement.shiftDate")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(d) => d && setDate(d)}
                    className="rounded-md border"
                  />
                </CardContent>
              </Card>

              <Card className="lg:col-span-3">
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                  <div>
                    <CardTitle>{format(date, "MMMM d, yyyy")}</CardTitle>
                    <CardDescription>
                      {shifts?.filter(
                        (s) =>
                          format(new Date(s.startTime), "yyyy-MM-dd") ===
                          format(date, "yyyy-MM-dd"),
                      ).length || 0}{" "}
                      {t("nav.timesheets")}
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {shifts?.filter(
                      (s) =>
                        format(new Date(s.startTime), "yyyy-MM-dd") ===
                        format(date, "yyyy-MM-dd"),
                    ).length === 0 ? (
                      <div className="text-center py-12 bg-muted/20 rounded-lg border border-dashed">
                        <CalendarIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                        <p className="text-muted-foreground">
                          {t("shiftManagement.noShifts")}
                        </p>
                      </div>
                    ) : (
                      shifts
                        ?.filter(
                          (s) =>
                            format(new Date(s.startTime), "yyyy-MM-dd") ===
                            format(date, "yyyy-MM-dd"),
                        )
                        .map((shift) => (
                          <div
                            key={shift.id}
                            className="flex items-center justify-between p-4 rounded-lg border bg-card hover:shadow-md transition-shadow"
                          >
                            <div className="flex items-center gap-4">
                              <div className="h-10 w-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                                <Users className="h-5 w-5 text-orange-500" />
                              </div>
                              <div>
                                <p className="font-medium">
                                  {(shift as any).employeeName}
                                </p>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Clock className="h-3 w-3" />
                                  {format(
                                    new Date(shift.startTime),
                                    "HH:mm",
                                  )} -{" "}
                                  {shift.endTime
                                    ? format(new Date(shift.endTime), "HH:mm")
                                    : "??"}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <Badge
                                variant={
                                  shift.status === "scheduled"
                                    ? "outline"
                                    : "default"
                                }
                                className={cn(
                                  shift.status === "completed" &&
                                    "bg-green-500/10 text-green-500 hover:bg-green-500/20",
                                  shift.status === "in_progress" &&
                                    "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20",
                                  shift.status === "cancelled" &&
                                    "bg-red-500/10 text-red-500 hover:bg-red-500/20",
                                )}
                              >
                                {shift.status}
                              </Badge>
                              <Button variant="ghost" size="icon">
                                <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="templates">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {templates?.map((template) => (
                <Card key={template.id} className="overflow-hidden">
                  <div
                    className="h-2 w-full"
                    style={{ backgroundColor: template.color || "#FF6C0E" }}
                  />
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-xl">{template.name}</CardTitle>
                      {template.isActive ? (
                        <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {template.startTime} - {template.endTime}
                      </span>
                      <span className="text-muted-foreground ml-auto">
                        ({template.durationHours}h)
                      </span>
                    </div>
                    <Button variant="outline" className="w-full">
                      {t("common.edit")}
                    </Button>
                  </CardContent>
                </Card>
              ))}
              <Dialog
                open={isTemplateDialogOpen}
                onOpenChange={setIsTemplateDialogOpen}
              >
                <DialogTrigger asChild>
                  <Card className="border-dashed flex items-center justify-center hover:bg-muted/50 cursor-pointer transition-colors">
                    <CardContent className="py-12 text-center">
                      <Plus className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="font-medium text-muted-foreground">
                        {t("shiftManagement.createTemplate")}
                      </p>
                    </CardContent>
                  </Card>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {t("shiftManagement.createTemplate")}
                    </DialogTitle>
                    <DialogDescription>
                      Create a new shift template for quick assignment.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label>{t("materials.name")}</Label>
                      <Input
                        value={templateForm.name}
                        onChange={(e) =>
                          setTemplateForm({
                            ...templateForm,
                            name: e.target.value,
                          })
                        }
                        placeholder="e.g. Morning Shift"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label>{t("shiftManagement.startTime")}</Label>
                        <Input
                          type="time"
                          value={templateForm.startTime}
                          onChange={(e) =>
                            setTemplateForm({
                              ...templateForm,
                              startTime: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>{t("shiftManagement.endTime")}</Label>
                        <Input
                          type="time"
                          value={templateForm.endTime}
                          onChange={(e) =>
                            setTemplateForm({
                              ...templateForm,
                              endTime: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label>{t("shiftManagement.color")}</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={templateForm.color}
                          onChange={(e) =>
                            setTemplateForm({
                              ...templateForm,
                              color: e.target.value,
                            })
                          }
                          className="w-12 h-10 p-1"
                        />
                        <Input
                          value={templateForm.color}
                          onChange={(e) =>
                            setTemplateForm({
                              ...templateForm,
                              color: e.target.value,
                            })
                          }
                          className="flex-1"
                        />
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setIsTemplateDialogOpen(false)}
                    >
                      {t("common.cancel")}
                    </Button>
                    <Button
                      className="bg-orange-500 hover:bg-orange-600"
                      onClick={handleCreateTemplate}
                      disabled={createTemplateMutation.isPending}
                    >
                      {createTemplateMutation.isPending
                        ? t("common.loading")
                        : t("common.confirm")}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </TabsContent>

          <TabsContent value="swaps" className="space-y-6">
            <div className="grid grid-cols-1 gap-4">
              {pendingSwaps && pendingSwaps.length > 0 ? (
                pendingSwaps.map((item: any) => (
                  <Card key={item.swap.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">
                            {item.fromEmployee.name} →{" "}
                            {item.toEmployee?.name || "Open Request"}
                          </CardTitle>
                          <CardDescription>
                            {format(
                              new Date(item.shift.startTime),
                              "MMMM d, yyyy",
                            )}{" "}
                            • {format(new Date(item.shift.startTime), "HH:mm")}{" "}
                            -{" "}
                            {item.shift.endTime
                              ? format(new Date(item.shift.endTime), "HH:mm")
                              : "??"}
                          </CardDescription>
                        </div>
                        <Badge
                          variant="outline"
                          className="bg-orange-50 text-orange-700 border-orange-200"
                        >
                          {t("shiftManagement.swapRequested")}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {item.swap.notes && (
                        <p className="text-sm text-muted-foreground mb-4 p-3 bg-muted/30 rounded-lg italic">
                          "{item.swap.notes}"
                        </p>
                      )}
                      <div className="flex gap-2">
                        <Button
                          className="flex-1 bg-green-600 hover:bg-green-700"
                          onClick={() =>
                            respondToSwapMutation.mutate({
                              swapId: item.swap.id,
                              status: "approved",
                            })
                          }
                          disabled={respondToSwapMutation.isPending}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          {t("shiftManagement.approveSwap")}
                        </Button>
                        <Button
                          variant="outline"
                          className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
                          onClick={() =>
                            respondToSwapMutation.mutate({
                              swapId: item.swap.id,
                              status: "rejected",
                            })
                          }
                          disabled={respondToSwapMutation.isPending}
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          {t("shiftManagement.rejectSwap")}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center py-24 bg-muted/10 rounded-xl border border-dashed">
                  <ArrowRightLeft className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-10" />
                  <h3 className="text-lg font-medium">No Pending Swaps</h3>
                  <p className="text-muted-foreground">
                    All shift swap requests have been processed.
                  </p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="availability" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>
                  {t("shiftManagement.employeeAvailability")}
                </CardTitle>
                <CardDescription>
                  View and manage weekly availability for employees.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-end gap-4">
                  <div className="grid gap-2 flex-1 max-w-sm">
                    <Label>{t("employees.title")}</Label>
                    <Select
                      value={availabilityEmployeeId}
                      onValueChange={setAvailabilityEmployeeId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select employee" />
                      </SelectTrigger>
                      <SelectContent>
                        {employees?.map((emp: any) => (
                          <SelectItem key={emp.id} value={emp.id.toString()}>
                            {emp.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {availabilityEmployeeId ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[0, 1, 2, 3, 4, 5, 6].map((day) => {
                      const dayName = [
                        "Sunday",
                        "Monday",
                        "Tuesday",
                        "Wednesday",
                        "Thursday",
                        "Friday",
                        "Saturday",
                      ][day];
                      const record = availabilityData?.find(
                        (a: any) => a.dayOfWeek === day,
                      );

                      return (
                        <Card key={day} className="bg-muted/5">
                          <CardHeader className="p-4 pb-2">
                            <CardTitle className="text-sm font-medium">
                              {dayName}
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="p-4 pt-0 space-y-3">
                            <div className="flex items-center justify-between">
                              <Label className="text-xs text-muted-foreground">
                                Available
                              </Label>
                              <Badge
                                variant={
                                  record?.isAvailable !== false
                                    ? "default"
                                    : "secondary"
                                }
                              >
                                {record?.isAvailable !== false ? "Yes" : "No"}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <Label className="text-[10px] uppercase">
                                  Start
                                </Label>
                                <Input
                                  type="time"
                                  className="h-8 text-xs"
                                  defaultValue={record?.startTime || "09:00"}
                                  onBlur={(e) => {
                                    setAvailabilityMutation.mutate({
                                      employeeId: parseInt(
                                        availabilityEmployeeId,
                                      ),
                                      dayOfWeek: day,
                                      startTime: e.target.value,
                                      endTime: record?.endTime || "17:00",
                                      isAvailable: true,
                                    });
                                  }}
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[10px] uppercase">
                                  End
                                </Label>
                                <Input
                                  type="time"
                                  className="h-8 text-xs"
                                  defaultValue={record?.endTime || "17:00"}
                                  onBlur={(e) => {
                                    setAvailabilityMutation.mutate({
                                      employeeId: parseInt(
                                        availabilityEmployeeId,
                                      ),
                                      dayOfWeek: day,
                                      startTime: record?.startTime || "09:00",
                                      endTime: e.target.value,
                                      isAvailable: true,
                                    });
                                  }}
                                />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12 border rounded-lg bg-muted/10">
                    <p className="text-muted-foreground">
                      Select an employee to view or edit availability.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

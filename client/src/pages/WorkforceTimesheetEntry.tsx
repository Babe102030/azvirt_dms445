import React, { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { GeolocationCheckIn } from "@/components/GeolocationCheckIn";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Clock,
  MapPin,
  Calendar,
  History,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Play,
  Square
} from "lucide-react";
import { format } from "date-fns";
import DashboardLayout from "@/components/DashboardLayout";

export default function WorkforceTimesheetEntry() {
  const { user } = useAuth();
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [selectedJobSite, setSelectedJobSite] = useState<string>("");
  const [activeShift, setActiveShift] = useState<any>(null);

  // Queries
  const { data: projects, isLoading: projectsLoading } = trpc.projects.list.useQuery();
  const { data: jobSites, isLoading: jobSitesLoading } = trpc.geolocation.getJobSites.useQuery(
    { projectId: selectedProject ? Number(selectedProject) : undefined },
    { enabled: !!selectedProject }
  );

  // Get today's shifts for this employee to find if they are clocked in
  const { data: todayShifts, refetch: refetchShifts } = trpc.timesheets.getShifts.useQuery({
    employeeId: (user as any)?.id || 0,
    startDate: new Date(new Date().setHours(0, 0, 0, 0)),
    endDate: new Date(new Date().setHours(23, 59, 59, 999)),
  }, {
    enabled: !!user
  });

  // Mutations
  const clockInMutation = trpc.timesheets.clockIn.useMutation({
    onSuccess: () => {
      toast.success("Clock-in recorded successfully");
      refetchShifts();
    },
    onError: (error) => {
      toast.error(`Clock-in failed: ${error.message}`);
    }
  });

  const clockOutMutation = trpc.timesheets.clockOut.useMutation({
    onSuccess: () => {
      toast.success("Clock-out recorded successfully");
      refetchShifts();
      setActiveShift(null);
    },
    onError: (error) => {
      toast.error(`Clock-out failed: ${error.message}`);
    }
  });

  const geoCheckInMutation = trpc.geolocation.checkIn.useMutation({
    onSuccess: (data) => {
      if (data.warning) {
        toast.warning(data.warning);
      } else {
        toast.success("GPS Location verified and logged");
      }
    }
  });

  const geoCheckOutMutation = trpc.geolocation.checkOut.useMutation({
    onSuccess: (data) => {
      if (data.warning) {
        toast.warning(data.warning);
      } else {
        toast.success("GPS Location verified for clock-out");
      }
    }
  });

  // Effect to determine active shift
  useEffect(() => {
    if (todayShifts) {
      const active = todayShifts.find(s => s.status === "in_progress");
      setActiveShift(active || null);
    }
  }, [todayShifts]);

  const handleCheckIn = async (lat: number, lng: number, accuracy?: number) => {
    if (!selectedJobSite && !activeShift) {
      toast.error("Please select a job site first");
      return;
    }

    try {
      // 1. Clock in if not already clocked in
      let shiftId = activeShift?.id;
      if (!shiftId) {
        const result = await clockInMutation.mutateAsync({
          employeeId: (user as any)?.id || 0,
          notes: `Clocked in via mobile GPS at ${selectedJobSite}`
        });
        shiftId = result.shiftId;
      }

      // 2. Log Geolocation
      await geoCheckInMutation.mutateAsync({
        shiftId,
        jobSiteId: Number(selectedJobSite),
        latitude: lat,
        longitude: lng,
        accuracy: accuracy
      });

    } catch (err) {
      console.error(err);
    }
  };

  const handleCheckOut = async (lat: number, lng: number, accuracy?: number) => {
    if (!activeShift) return;

    try {
      // 1. Log Geolocation for checkout
      // We need to find which job site they are checking out from.
      // For simplicity, we use the selected one or the first available if not selected
      const siteId = selectedJobSite ? Number(selectedJobSite) : jobSites?.[0]?.id;

      if (siteId) {
        await geoCheckOutMutation.mutateAsync({
          shiftId: activeShift.id,
          jobSiteId: siteId,
          latitude: lat,
          longitude: lng,
          accuracy: accuracy
        });
      }

      // 2. Clock out
      await clockOutMutation.mutateAsync({
        id: activeShift.id
      });

    } catch (err) {
      console.error(err);
    }
  };

  const currentJobSite = jobSites?.find(js => js.id === Number(selectedJobSite));

  return (
    <DashboardLayout>
      <div className="max-w-md mx-auto space-y-6 pb-20">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Clock className="h-6 w-6 text-primary" />
            Timesheet Entry
          </h1>
          <p className="text-muted-foreground text-sm">
            Log your work hours and verify location
          </p>
        </div>

        {/* User Status Card */}
        <Card className="border-l-4 border-l-primary shadow-md">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-lg">{user?.name}</CardTitle>
                <CardDescription>Employee ID: {(user as any)?.employeeNumber || 'N/A'}</CardDescription>
              </div>
              <Badge variant={activeShift ? "default" : "secondary"} className={activeShift ? "bg-green-600" : ""}>
                {activeShift ? "Currently Working" : "Off Clock"}
              </Badge>
            </div>
          </CardHeader>
          {activeShift && (
            <CardContent>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Play className="h-4 w-4 text-green-500" />
                <span>Clocked in since: {format(new Date(activeShift.startTime), "HH:mm")}</span>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Selection Area */}
        {!activeShift && (
          <Card className="shadow-sm">
            <CardHeader className="pb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Select Assignment
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="project">Project</Label>
                <Select value={selectedProject} onValueChange={setSelectedProject}>
                  <SelectTrigger id="project">
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects?.map((p) => (
                      <SelectItem key={p.id} value={p.id.toString()}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="jobsite">Job Site / Geofence</Label>
                <Select
                  value={selectedJobSite}
                  onValueChange={setSelectedJobSite}
                  disabled={!selectedProject || jobSitesLoading}
                >
                  <SelectTrigger id="jobsite">
                    <SelectValue placeholder={jobSitesLoading ? "Loading sites..." : "Select job site"} />
                  </SelectTrigger>
                  <SelectContent>
                    {jobSites?.map((js: any) => (
                      <SelectItem key={js.id} value={js.id.toString()}>
                        {js.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Geolocation Section */}
        {(selectedJobSite || activeShift) ? (
          <GeolocationCheckIn
            jobSiteId={Number(selectedJobSite)}
            jobSiteName={currentJobSite?.name || "Active Shift"}
            geofenceRadius={currentJobSite?.geofenceRadius || 100}
            onCheckIn={handleCheckIn}
            onCheckOut={handleCheckOut}
            isCheckedIn={!!activeShift}
          />
        ) : (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Select a job site</AlertTitle>
            <AlertDescription>
              You must select a project and job site before you can clock in using GPS verification.
            </AlertDescription>
          </Alert>
        )}

        {/* Recent Activity */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
            <History className="h-4 w-4" />
            Today's Activity
          </h3>
          {todayShifts && todayShifts.length > 0 ? (
            <div className="space-y-2">
              {todayShifts.map((shift) => (
                <div key={shift.id} className="p-3 bg-muted/40 border rounded-lg flex justify-between items-center text-sm">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${shift.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                      {shift.status === 'completed' ? <CheckCircle2 className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                    </div>
                    <div>
                      <div className="font-medium">
                        {format(new Date(shift.startTime), "HH:mm")} - {shift.endTime ? format(new Date(shift.endTime), "HH:mm") : "Working..."}
                      </div>
                      <div className="text-xs text-muted-foreground capitalize">{shift.status.replace('_', ' ')}</div>
                    </div>
                  </div>
                  {shift.status === 'completed' && (
                    <Badge variant="outline" className="text-xs">
                      {Math.round(((new Date(shift.endTime!).getTime() - new Date(shift.startTime).getTime()) / 3600000) * 10) / 10} hrs
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 border border-dashed rounded-lg text-muted-foreground text-sm">
              No shifts recorded for today.
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

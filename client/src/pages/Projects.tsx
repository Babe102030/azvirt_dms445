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
import { FolderPlus, Folder, FileDown } from "lucide-react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { ExportDialog, type ExportColumn } from "@/components/ExportDialog";
import { downloadExcelFile, generateExportFilename } from "@/lib/exportUtils";

export default function Projects() {
  const [createOpen, setCreateOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  const { data: projects, isLoading, refetch } = trpc.projects.list.useQuery();

  const createMutation = trpc.projects.create.useMutation({
    onSuccess: () => {
      toast.success("Project created successfully");
      setCreateOpen(false);
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to create project: ${error.message}`);
    },
  });

  const exportMutation = trpc.export.projects.useMutation({
    onSuccess: (data) => {
      downloadExcelFile(data.data, generateExportFilename("projects"));
      toast.success("Projekti uspješno izvezeni");
      setExportOpen(false);
    },
    onError: (error) => {
      toast.error(`Neuspjeli izvoz: ${error.message}`);
    },
  });

  const exportColumns: ExportColumn[] = [
    { key: "id", label: "ID", enabled: true },
    { key: "name", label: "Naziv", enabled: true },
    { key: "description", label: "Opis", enabled: true },
    { key: "location", label: "Lokacija", enabled: true },
    { key: "status", label: "Status", enabled: true },
    { key: "startDate", label: "Datum početka", enabled: false },
    { key: "endDate", label: "Datum završetka", enabled: false },
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
      description: formData.get("description") as string,
      location: formData.get("location") as string,
      status: formData.get("status") as any,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "completed":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "on_hold":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Projects</h1>
            <p className="text-white/70">Manage construction projects</p>
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
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button size="lg">
                  <FolderPlus className="mr-2 h-5 w-5" />
                  New Project
                </Button>
              </DialogTrigger>
            <DialogContent className="bg-card/95 backdrop-blur">
              <DialogHeader>
                <DialogTitle>Create New Project</DialogTitle>
                <DialogDescription>Add a new construction project</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <Label htmlFor="name">Project Name</Label>
                  <Input id="name" name="name" required />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" name="description" rows={3} />
                </div>
                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input id="location" name="location" />
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select name="status" defaultValue="planning">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="planning">Planning</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="on_hold">On Hold</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Creating..." : "Create Project"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        <Card className="bg-card/90 backdrop-blur border-primary/20">
          <CardHeader>
            <CardTitle>All Projects</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : projects && projects.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {projects.map((project) => (
                  <Card key={project.id} className="bg-muted/50 border-primary/20">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <Folder className="h-8 w-8 text-primary" />
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                            project.status
                          )}`}
                        >
                          {project.status}
                        </span>
                      </div>
                      <CardTitle className="mt-4">{project.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">
                        {project.description || "No description"}
                      </p>
                      {project.location && (
                        <p className="text-xs text-muted-foreground">
                          📍 {project.location}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        Created: {new Date(project.createdAt).toLocaleDateString()}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No projects found. Create your first project to get started.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <ExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        title="Izvezi projekte"
        description="Izaberite kolone koje želite uključiti u Excel izvoz"
        columns={exportColumns}
        onExport={handleExport}
        isExporting={exportMutation.isPending}
      />
    </DashboardLayout>
  );
}

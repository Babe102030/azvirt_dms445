import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Beaker, CheckCircle, Clock, AlertCircle, Zap } from "lucide-react";
import { toast } from "sonner";

const STATUS_COLORS = {
  planned: "bg-blue-500/20 border-blue-500/30 text-blue-400",
  in_progress: "bg-yellow-500/20 border-yellow-500/30 text-yellow-400",
  completed: "bg-green-500/20 border-green-500/30 text-green-400",
  rejected: "bg-red-500/20 border-red-500/30 text-red-400",
};

const STATUS_ICONS = {
  planned: <Clock className="h-4 w-4" />,
  in_progress: <Zap className="h-4 w-4" />,
  completed: <CheckCircle className="h-4 w-4" />,
  rejected: <AlertCircle className="h-4 w-4" />,
};

export default function MixingLog() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>("");
  const [volume, setVolume] = useState<string>("1");
  const [projectId, setProjectId] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const { data: batches, isLoading, refetch } = trpc.mixingLogs.list.useQuery();
  const { data: recipes } = trpc.recipes.list.useQuery();
  const { data: projects } = trpc.projects.list.useQuery();

  const createBatchMutation = trpc.mixingLogs.create.useMutation({
    onSuccess: (data) => {
      toast.success(`Serija ${data.batchNumber} uspješno kreirana`);
      setIsDialogOpen(false);
      setSelectedRecipeId("");
      setVolume("1");
      setProjectId("");
      setNotes("");
      refetch();
    },
    onError: (error) => {
      toast.error(`Greška: ${error.message}`);
    },
  });

  const updateStatusMutation = trpc.mixingLogs.updateStatus.useMutation({
    onSuccess: (_, variables) => {
      const statusLabels: Record<string, string> = {
        in_progress: "Započeta",
        completed: "Završena",
        rejected: "Odbijena",
      };
      toast.success(`Serija ${statusLabels[variables.status]}`);
      refetch();
    },
    onError: (error) => {
      toast.error(`Greška: ${error.message}`);
    },
  });

  const handleCreateBatch = () => {
    if (!selectedRecipeId || !volume) {
      toast.error("Molimo popunite sve obavezne poljeeve");
      return;
    }

    createBatchMutation.mutate({
      recipeId: parseInt(selectedRecipeId),
      volume: parseFloat(volume),
      projectId: projectId ? parseInt(projectId) : undefined,
      notes: notes || undefined,
    });
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-white">Učitavanje...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Dnevnik miješanja</h1>
            <p className="text-white/70">Evidentirajte proizvedene serije betona i pratite potrošnju materijala</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-orange-600 hover:bg-orange-700">
                <Plus className="h-4 w-4 mr-2" />
                Nova serija
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-primary/20 max-w-md">
              <DialogHeader>
                <DialogTitle>Kreiraj novu seriju betona</DialogTitle>
                <DialogDescription>
                  Odaberite recept i količinu za novu seriju
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="recipe">Recept</Label>
                  <Select value={selectedRecipeId} onValueChange={setSelectedRecipeId}>
                    <SelectTrigger className="bg-card/50 border-primary/20">
                      <SelectValue placeholder="Odaberite recept" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-primary/20">
                      {recipes?.map((recipe) => (
                        <SelectItem key={recipe.id} value={recipe.id.toString()}>
                          {recipe.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="volume">Zapremina (m³)</Label>
                  <Input
                    id="volume"
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={volume}
                    onChange={(e) => setVolume(e.target.value)}
                    className="bg-card/50 border-primary/20"
                    placeholder="1.0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="project">Projekt (opciono)</Label>
                  <Select value={projectId} onValueChange={setProjectId}>
                    <SelectTrigger className="bg-card/50 border-primary/20">
                      <SelectValue placeholder="Odaberite projekt" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-primary/20">
                      {projects?.map((project) => (
                        <SelectItem key={project.id} value={project.id.toString()}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Napomene</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="bg-card/50 border-primary/20 min-h-24"
                    placeholder="Dodatne napomene o seriji..."
                  />
                </div>

                <Button
                  onClick={handleCreateBatch}
                  disabled={createBatchMutation.isPending}
                  className="w-full bg-orange-600 hover:bg-orange-700"
                >
                  {createBatchMutation.isPending ? "Kreiram..." : "Kreiraj seriju"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Batches List */}
        <div className="space-y-4">
          {batches && batches.length > 0 ? (
            batches.map((batch: any) => (
              <Card key={batch.id} className="bg-card/50 border-primary/20">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-white">{batch.batchNumber}</h3>
                        <div className={`px-3 py-1 rounded-full text-sm font-medium border flex items-center gap-2 ${STATUS_COLORS[batch.status as keyof typeof STATUS_COLORS]}`}>
                          {STATUS_ICONS[batch.status as keyof typeof STATUS_ICONS]}
                          {batch.status === "planned" && "Planirana"}
                          {batch.status === "in_progress" && "U tijeku"}
                          {batch.status === "completed" && "Završena"}
                          {batch.status === "rejected" && "Odbijena"}
                        </div>
                      </div>
                      <p className="text-white/70 mb-3">{batch.recipeName}</p>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-white/60">Zapremina:</span>
                          <p className="text-white font-semibold">{batch.volumeM3} m³</p>
                        </div>
                        <div>
                          <span className="text-white/60">Kreirano:</span>
                          <p className="text-white font-semibold">
                            {new Date(batch.createdAt).toLocaleDateString("bs-BA")}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Status Actions */}
                    <div className="flex gap-2 ml-4">
                      {batch.status === "planned" && (
                        <Button
                          size="sm"
                          onClick={() =>
                            updateStatusMutation.mutate({
                              id: batch.id,
                              status: "in_progress",
                            })
                          }
                          className="bg-yellow-600 hover:bg-yellow-700"
                        >
                          Započni
                        </Button>
                      )}
                      {batch.status === "in_progress" && (
                        <Button
                          size="sm"
                          onClick={() =>
                            updateStatusMutation.mutate({
                              id: batch.id,
                              status: "completed",
                            })
                          }
                          className="bg-green-600 hover:bg-green-700"
                        >
                          Završi
                        </Button>
                      )}
                    </div>
                  </div>

                  {batch.notes && (
                    <div className="mt-4 p-3 rounded-lg bg-card/30 border border-primary/10">
                      <p className="text-sm text-white/70">{batch.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="bg-card/50 border-primary/20">
              <CardContent className="flex items-center justify-center h-64">
                <div className="text-center text-white/50">
                  <Beaker className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nema evidentiranih serija</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Bot,
  Download,
  Trash2,
  Loader2,
  Info,
  Sparkles,
  Cloud,
  HardDrive,
  Eye,
  Code,
  CheckCircle2,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface ModelSwitcherProps {
  selectedModel: string;
  onModelChange: (model: string) => void;
  showModelInfo?: boolean;
  allowManagement?: boolean;
}

export function ModelSwitcher({
  selectedModel,
  onModelChange,
  showModelInfo = true,
  allowManagement = true,
}: ModelSwitcherProps) {
  const { t } = useLanguage();
  const [showPullDialog, setShowPullDialog] = useState(false);
  const [modelNameToPull, setModelNameToPull] = useState("");
  const [isPulling, setIsPulling] = useState(false);

  // Queries
  const { data: models = [], refetch: refetchModels } =
    trpc.ai.listModels.useQuery();

  // Mutations
  const pullModelMutation = trpc.ai.pullModel.useMutation({
    onSuccess: () => {
      refetchModels();
      setShowPullDialog(false);
      setModelNameToPull("");
    },
  });

  const deleteModelMutation = trpc.ai.deleteModel.useMutation({
    onSuccess: () => {
      refetchModels();
    },
  });

  const getModelInfo = (modelName: string) => {
    const model = models.find((m) => m.name === modelName);
    if (!model) return null;

    const isCloud = model.family === "gemini" || model.size === 0;
    const isVision =
      model.name.includes("vision") ||
      model.name.includes("llava") ||
      model.name.includes("ocr") ||
      model.name.includes("granite");
    const isCode =
      model.name.includes("coder") ||
      model.name.includes("code") ||
      model.name.includes("codellama");

    return {
      ...model,
      isCloud,
      isVision,
      isCode,
      sizeGB: model.size > 0 ? (model.size / (1024 * 1024 * 1024)).toFixed(2) : null,
    };
  };

  const handlePullModel = async () => {
    if (!modelNameToPull.trim()) return;

    setIsPulling(true);
    try {
      await pullModelMutation.mutateAsync({
        modelName: modelNameToPull.trim(),
      });
    } catch (error) {
      console.error("Failed to pull model:", error);
      alert("Failed to pull model. Please check the model name and try again.");
    } finally {
      setIsPulling(false);
    }
  };

  const handleDeleteModel = async (modelName: string) => {
    if (
      !confirm(
        `Are you sure you want to delete model "${modelName}"? This cannot be undone.`
      )
    ) {
      return;
    }

    try {
      await deleteModelMutation.mutateAsync({ modelName });
    } catch (error) {
      console.error("Failed to delete model:", error);
      alert("Failed to delete model. Please try again.");
    }
  };

  const selectedModelInfo = getModelInfo(selectedModel);

  // Categorize models
  const localModels = models.filter((m) => m.size > 0 && m.family !== "gemini");
  const cloudModels = models.filter((m) => m.size === 0 || m.family === "gemini");

  return (
    <div className="flex items-center gap-2">
      {/* Model Selector */}
      <Select value={selectedModel} onValueChange={onModelChange}>
        <SelectTrigger className="w-64">
          <SelectValue>
            <div className="flex items-center gap-2">
              {selectedModelInfo?.isCloud ? (
                <Cloud className="h-4 w-4 text-blue-500" />
              ) : (
                <HardDrive className="h-4 w-4 text-green-500" />
              )}
              <span>{selectedModel}</span>
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {/* Local Models Section */}
          {localModels.length > 0 && (
            <>
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                🖥️ Local Models
              </div>
              {localModels.map((model) => {
                const info = getModelInfo(model.name);
                return (
                  <SelectItem key={model.name} value={model.name}>
                    <div className="flex items-center gap-2">
                      {info?.isVision && <Eye className="h-3 w-3 text-purple-500" />}
                      {info?.isCode && <Code className="h-3 w-3 text-orange-500" />}
                      <span>{model.name}</span>
                      <span className="text-xs text-muted-foreground">
                        ({info?.sizeGB}GB)
                      </span>
                    </div>
                  </SelectItem>
                );
              })}
            </>
          )}

          {/* Cloud Models Section */}
          {cloudModels.length > 0 && (
            <>
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-2">
                ☁️ Cloud Models
              </div>
              {cloudModels.map((model) => (
                <SelectItem key={model.name} value={model.name}>
                  <div className="flex items-center gap-2">
                    <Cloud className="h-3 w-3 text-blue-500" />
                    <span>{model.name}</span>
                  </div>
                </SelectItem>
              ))}
            </>
          )}

          {models.length === 0 && (
            <div className="px-2 py-4 text-center text-sm text-muted-foreground">
              No models available
            </div>
          )}
        </SelectContent>
      </Select>

      {/* Model Info Tooltip */}
      {showModelInfo && selectedModelInfo && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Info className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="max-w-sm">
              <div className="space-y-2">
                <div className="font-semibold flex items-center gap-2">
                  <Bot className="h-4 w-4" />
                  {selectedModelInfo.name}
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Type:</span>
                    <div className="flex items-center gap-1 mt-1">
                      {selectedModelInfo.isCloud && (
                        <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-500/10 text-blue-500 rounded">
                          <Cloud className="h-3 w-3" />
                          Cloud
                        </span>
                      )}
                      {!selectedModelInfo.isCloud && (
                        <span className="flex items-center gap-1 px-2 py-0.5 bg-green-500/10 text-green-500 rounded">
                          <HardDrive className="h-3 w-3" />
                          Local
                        </span>
                      )}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Family:</span>
                    <div className="font-medium mt-1">{selectedModelInfo.family}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Parameters:</span>
                    <div className="font-medium mt-1">
                      {selectedModelInfo.parameterSize}
                    </div>
                  </div>
                  {selectedModelInfo.sizeGB && (
                    <div>
                      <span className="text-muted-foreground">Size:</span>
                      <div className="font-medium mt-1">
                        {selectedModelInfo.sizeGB} GB
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-1 pt-2 border-t">
                  {selectedModelInfo.isVision && (
                    <span className="flex items-center gap-1 px-2 py-1 bg-purple-500/10 text-purple-500 rounded text-xs">
                      <Eye className="h-3 w-3" />
                      Vision
                    </span>
                  )}
                  {selectedModelInfo.isCode && (
                    <span className="flex items-center gap-1 px-2 py-1 bg-orange-500/10 text-orange-500 rounded text-xs">
                      <Code className="h-3 w-3" />
                      Code
                    </span>
                  )}
                  {!selectedModelInfo.isVision && !selectedModelInfo.isCode && (
                    <span className="flex items-center gap-1 px-2 py-1 bg-blue-500/10 text-blue-500 rounded text-xs">
                      <Sparkles className="h-3 w-3" />
                      Chat
                    </span>
                  )}
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {/* Model Management */}
      {allowManagement && (
        <>
          {/* Pull New Model Button */}
          <Dialog open={showPullDialog} onOpenChange={setShowPullDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon" className="h-8 w-8">
                <Download className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Pull New Model</DialogTitle>
                <DialogDescription>
                  Download a model from the Ollama registry. This may take several
                  minutes depending on the model size.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="modelName">Model Name</Label>
                  <Input
                    id="modelName"
                    placeholder="e.g., llama3.2, mistral, codellama"
                    value={modelNameToPull}
                    onChange={(e) => setModelNameToPull(e.target.value)}
                    disabled={isPulling}
                  />
                  <p className="text-xs text-muted-foreground">
                    Visit{" "}
                    <a
                      href="https://ollama.com/library"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:underline"
                    >
                      ollama.com/library
                    </a>{" "}
                    to browse available models
                  </p>
                </div>

                {/* Popular Models Suggestions */}
                <div className="space-y-2">
                  <Label>Popular Models</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { name: "llama3.2", desc: "Fast chat" },
                      { name: "mistral", desc: "High quality" },
                      { name: "codellama", desc: "Code generation" },
                      { name: "llava", desc: "Vision model" },
                    ].map((model) => (
                      <Button
                        key={model.name}
                        variant="outline"
                        size="sm"
                        onClick={() => setModelNameToPull(model.name)}
                        disabled={isPulling}
                        className="justify-start"
                      >
                        <div className="text-left">
                          <div className="font-medium">{model.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {model.desc}
                          </div>
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowPullDialog(false)}
                  disabled={isPulling}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handlePullModel}
                  disabled={!modelNameToPull.trim() || isPulling}
                  className="bg-orange-500 hover:bg-orange-600"
                >
                  {isPulling ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Pulling...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Pull Model
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Delete Model Button (only for local models) */}
          {selectedModelInfo && !selectedModelInfo.isCloud && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
              onClick={() => handleDeleteModel(selectedModel)}
              disabled={deleteModelMutation.isPending}
            >
              {deleteModelMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </Button>
          )}
        </>
      )}

      {/* Active Model Indicator */}
      {selectedModelInfo && (
        <div className="flex items-center gap-1 px-2 py-1 bg-green-500/10 rounded">
          <CheckCircle2 className="h-3 w-3 text-green-500" />
          <span className="text-xs text-green-700 dark:text-green-400 font-medium">
            Active
          </span>
        </div>
      )}
    </div>
  );
}

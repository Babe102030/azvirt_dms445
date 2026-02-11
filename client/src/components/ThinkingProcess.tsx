import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Brain,
  ChevronDown,
  ChevronRight,
  Tool,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Database,
  FileText,
  Loader2,
} from "lucide-react";

interface ToolCall {
  name: string;
  parameters: Record<string, any>;
  result?: any;
  success?: boolean;
  error?: string;
  duration?: number;
}

interface ThinkingStep {
  id: string;
  type: "reasoning" | "tool_call" | "synthesis" | "error";
  content: string;
  toolCall?: ToolCall;
  timestamp: Date;
}

interface ThinkingProcessProps {
  steps: ThinkingStep[];
  isThinking?: boolean;
  collapsed?: boolean;
}

export function ThinkingProcess({
  steps,
  isThinking = false,
  collapsed = false,
}: ThinkingProcessProps) {
  const [isOpen, setIsOpen] = useState(!collapsed);
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());

  const toggleStep = (stepId: string) => {
    const newExpanded = new Set(expandedSteps);
    if (newExpanded.has(stepId)) {
      newExpanded.delete(stepId);
    } else {
      newExpanded.add(stepId);
    }
    setExpandedSteps(newExpanded);
  };

  const getStepIcon = (type: string) => {
    switch (type) {
      case "reasoning":
        return <Brain className="h-4 w-4 text-blue-500" />;
      case "tool_call":
        return <Tool className="h-4 w-4 text-orange-500" />;
      case "synthesis":
        return <Sparkles className="h-4 w-4 text-purple-500" />;
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Brain className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStepColor = (type: string) => {
    switch (type) {
      case "reasoning":
        return "border-blue-500/20 bg-blue-500/5";
      case "tool_call":
        return "border-orange-500/20 bg-orange-500/5";
      case "synthesis":
        return "border-purple-500/20 bg-purple-500/5";
      case "error":
        return "border-red-500/20 bg-red-500/5";
      default:
        return "border-gray-500/20 bg-gray-500/5";
    }
  };

  const getToolIcon = (toolName: string) => {
    if (toolName.includes("search") || toolName.includes("get")) {
      return <Database className="h-3 w-3" />;
    }
    if (toolName.includes("document")) {
      return <FileText className="h-3 w-3" />;
    }
    return <Tool className="h-3 w-3" />;
  };

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      fractionalSecondDigits: 3,
    });
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return "";
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  if (steps.length === 0 && !isThinking) {
    return null;
  }

  return (
    <Card className="p-4 border-2 border-dashed border-gray-300 dark:border-gray-700">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-purple-500" />
              <h3 className="font-semibold">Thinking Process</h3>
              {isThinking && (
                <Loader2 className="h-4 w-4 animate-spin text-purple-500" />
              )}
              {steps.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  ({steps.length} steps)
                </span>
              )}
            </div>
            {isOpen ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent className="mt-4">
          <div className="space-y-3">
            {/* Timeline */}
            <div className="relative pl-6 space-y-3">
              {/* Timeline line */}
              <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-gradient-to-b from-purple-500 via-blue-500 to-green-500" />

              {steps.map((step, index) => (
                <div key={step.id} className="relative">
                  {/* Timeline dot */}
                  <div className="absolute -left-4 top-2 w-4 h-4 rounded-full bg-white dark:bg-gray-900 border-2 border-purple-500 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-purple-500" />
                  </div>

                  {/* Step card */}
                  <Card
                    className={`p-3 border ${getStepColor(step.type)} transition-all hover:shadow-md`}
                  >
                    <div className="space-y-2">
                      {/* Step header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 flex-1">
                          {getStepIcon(step.type)}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium capitalize">
                                {step.type.replace("_", " ")}
                              </span>
                              {step.toolCall && (
                                <span className="text-xs px-2 py-0.5 bg-orange-500/20 text-orange-700 dark:text-orange-300 rounded-full font-mono">
                                  {step.toolCall.name}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {formatTimestamp(step.timestamp)}
                              {step.toolCall?.duration && (
                                <span className="ml-2 text-blue-600 dark:text-blue-400">
                                  • {formatDuration(step.toolCall.duration)}
                                </span>
                              )}
                            </p>
                          </div>
                        </div>

                        {/* Success/Error indicator */}
                        {step.toolCall && (
                          <div className="flex-shrink-0">
                            {step.toolCall.success ? (
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            ) : step.toolCall.error ? (
                              <XCircle className="h-4 w-4 text-red-500" />
                            ) : null}
                          </div>
                        )}
                      </div>

                      {/* Step content */}
                      <div className="text-sm whitespace-pre-wrap">
                        {step.content}
                      </div>

                      {/* Tool call details */}
                      {step.toolCall && (
                        <Collapsible
                          open={expandedSteps.has(step.id)}
                          onOpenChange={() => toggleStep(step.id)}
                        >
                          <CollapsibleTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-xs"
                            >
                              {expandedSteps.has(step.id) ? (
                                <>
                                  <ChevronDown className="h-3 w-3 mr-1" />
                                  Hide Details
                                </>
                              ) : (
                                <>
                                  <ChevronRight className="h-3 w-3 mr-1" />
                                  Show Details
                                </>
                              )}
                            </Button>
                          </CollapsibleTrigger>

                          <CollapsibleContent className="mt-2 space-y-2">
                            {/* Parameters */}
                            {step.toolCall.parameters &&
                              Object.keys(step.toolCall.parameters).length > 0 && (
                                <div>
                                  <div className="text-xs font-semibold text-muted-foreground mb-1">
                                    Parameters:
                                  </div>
                                  <div className="bg-gray-100 dark:bg-gray-900 rounded p-2 text-xs font-mono">
                                    <pre className="whitespace-pre-wrap break-all">
                                      {JSON.stringify(
                                        step.toolCall.parameters,
                                        null,
                                        2
                                      )}
                                    </pre>
                                  </div>
                                </div>
                              )}

                            {/* Result */}
                            {step.toolCall.result && (
                              <div>
                                <div className="text-xs font-semibold text-muted-foreground mb-1">
                                  Result:
                                </div>
                                <div className="bg-green-50 dark:bg-green-950/20 rounded p-2 text-xs font-mono">
                                  <pre className="whitespace-pre-wrap break-all">
                                    {typeof step.toolCall.result === "string"
                                      ? step.toolCall.result
                                      : JSON.stringify(step.toolCall.result, null, 2)}
                                  </pre>
                                </div>
                              </div>
                            )}

                            {/* Error */}
                            {step.toolCall.error && (
                              <div>
                                <div className="text-xs font-semibold text-red-600 dark:text-red-400 mb-1">
                                  Error:
                                </div>
                                <div className="bg-red-50 dark:bg-red-950/20 rounded p-2 text-xs font-mono text-red-700 dark:text-red-300">
                                  {step.toolCall.error}
                                </div>
                              </div>
                            )}
                          </CollapsibleContent>
                        </Collapsible>
                      )}
                    </div>
                  </Card>
                </div>
              ))}

              {/* Current thinking indicator */}
              {isThinking && (
                <div className="relative">
                  <div className="absolute -left-4 top-2 w-4 h-4 rounded-full bg-white dark:bg-gray-900 border-2 border-purple-500 flex items-center justify-center">
                    <Loader2 className="w-3 h-3 text-purple-500 animate-spin" />
                  </div>
                  <Card className="p-3 border border-purple-500/20 bg-purple-500/5">
                    <div className="flex items-center gap-2">
                      <Brain className="h-4 w-4 text-purple-500 animate-pulse" />
                      <span className="text-sm text-muted-foreground">
                        Thinking...
                      </span>
                    </div>
                  </Card>
                </div>
              )}
            </div>

            {/* Summary */}
            {steps.length > 0 && !isThinking && (
              <div className="pt-3 border-t border-dashed flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-4">
                  <span>
                    Total steps: <strong>{steps.length}</strong>
                  </span>
                  <span>
                    Tool calls:{" "}
                    <strong>
                      {steps.filter((s) => s.toolCall).length}
                    </strong>
                  </span>
                  <span>
                    Duration:{" "}
                    <strong>
                      {formatDuration(
                        steps.reduce(
                          (acc, s) => acc + (s.toolCall?.duration || 0),
                          0
                        )
                      )}
                    </strong>
                  </span>
                </div>
                {steps.filter((s) => s.toolCall?.success).length ===
                  steps.filter((s) => s.toolCall).length && (
                  <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>All tools succeeded</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

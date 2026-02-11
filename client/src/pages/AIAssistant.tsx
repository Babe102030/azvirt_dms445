import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { VoiceRecorder } from "@/components/VoiceRecorder";
import { VoiceActivationButton } from "@/components/VoiceActivationButton";
import { PromptTemplates } from "@/components/PromptTemplates";
import { ImageUpload } from "@/components/ImageUpload";
import { ModelSwitcher } from "@/components/ModelSwitcher";
import { ThinkingProcess } from "@/components/ThinkingProcess";
import {
  Send,
  Bot,
  User,
  Loader2,
  Trash2,
  Plus,
  Sparkles,
  Image as ImageIcon,
  Copy,
  Download,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Streamdown } from "streamdown";

export default function AIAssistant() {
  const { t } = useLanguage();
  const [, setLocation] = useLocation();
  const [message, setMessage] = useState("");
  const [currentConversationId, setCurrentConversationId] = useState<
    number | undefined
  >();
  const [selectedModel, setSelectedModel] = useState("llama3.2");
  const [showTemplates, setShowTemplates] = useState(false);
  const [showImageUpload, setShowImageUpload] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Queries
  const { data: conversations = [], refetch: refetchConversations } =
    trpc.ai.getConversations.useQuery();

  const { data: messages = [], refetch: refetchMessages } =
    trpc.ai.getMessages.useQuery(
      { conversationId: currentConversationId! },
      { enabled: !!currentConversationId },
    );

  const { data: models = [] } = trpc.ai.listModels.useQuery();

  const chatMutation = trpc.ai.chat.useMutation({
    onSuccess: (data) => {
      setCurrentConversationId(data.conversationId);
      refetchMessages();
      refetchConversations();
      setMessage("");
    },
  });

  const createConversationMutation = trpc.ai.createConversation.useMutation({
    onSuccess: (data) => {
      setCurrentConversationId(data.conversationId);
      refetchConversations();
    },
  });

  const deleteConversationMutation = trpc.ai.deleteConversation.useMutation({
    onSuccess: () => {
      setCurrentConversationId(undefined);
      refetchConversations();
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = () => {
    if (!message.trim()) return;

    chatMutation.mutate({
      conversationId: currentConversationId,
      message: message.trim(),
      model: selectedModel,
      useTools: true,
    });
  };

  const handleVoiceTranscription = (text: string, audioUrl?: string) => {
    chatMutation.mutate({
      conversationId: currentConversationId,
      message: text,
      model: selectedModel,
      audioUrl,
      useTools: true,
    });
  };

  const handleVoiceCommand = (command: string) => {
    const lower = command.toLowerCase();

    if (
      lower.startsWith("go to") ||
      lower.startsWith("open") ||
      lower.startsWith("navigate")
    ) {
      if (lower.includes("manager")) {
        setLocation("/manager-dashboard");
        return;
      }
      if (lower.includes("dashboard")) {
        setLocation("/");
        return;
      }
      if (lower.includes("document")) {
        setLocation("/documents");
        return;
      }
      if (lower.includes("project")) {
        setLocation("/projects");
        return;
      }
      if (lower.includes("material")) {
        setLocation("/materials");
        return;
      }
      if (lower.includes("recipe")) {
        setLocation("/recipes");
        return;
      }
      if (lower.includes("mixing")) {
        setLocation("/mixing-log");
        return;
      }
      if (lower.includes("analytic")) {
        setLocation("/production-analytics");
        return;
      }
      if (lower.includes("forecast")) {
        setLocation("/forecasting");
        return;
      }
      if (lower.includes("purchase")) {
        setLocation("/purchase-orders");
        return;
      }
      if (lower.includes("driver")) {
        setLocation("/driver-deliveries");
        return;
      }
      if (lower.includes("delivery") || lower.includes("deliveries")) {
        setLocation("/deliveries");
        return;
      }
      if (lower.includes("quality")) {
        setLocation("/quality");
        return;
      }
      if (lower.includes("employee") || lower.includes("staff")) {
        setLocation("/employees");
        return;
      }
      if (lower.includes("machine") || lower.includes("equipment")) {
        setLocation("/machines");
        return;
      }
      if (lower.includes("timesheet")) {
        setLocation("/timesheets");
        return;
      }
      if (lower.includes("setting") || lower.includes("configuration")) {
        setLocation("/settings");
        return;
      }
    }

    chatMutation.mutate({
      conversationId: currentConversationId,
      message: command,
      model: selectedModel,
      useTools: true,
    });
  };

  const handleNewConversation = () => {
    createConversationMutation.mutate({
      title: "New Conversation",
      modelName: selectedModel,
    });
  };

  const handleDeleteConversation = (id: number) => {
    if (
      confirm(t("aiAssistant.confirmDelete") || "Delete this conversation?")
    ) {
      deleteConversationMutation.mutate({ conversationId: id });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSelectTemplate = (template: string) => {
    setMessage(template);
    setShowTemplates(false);
  };

  const handleImageAnalyzed = (analysis: string, imageUrl: string) => {
    const messageText = `[Image Analysis]\n\n${analysis}`;
    chatMutation.mutate({
      conversationId: currentConversationId,
      message: messageText,
      model: selectedModel,
      imageUrl,
      useTools: true,
    });
  };

  const handleTextExtracted = (text: string, imageUrl: string) => {
    const messageText = `[OCR Text Extraction]\n\n${text}`;
    chatMutation.mutate({
      conversationId: currentConversationId,
      message: messageText,
      model: selectedModel,
      imageUrl,
      useTools: true,
    });
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] gap-4 p-4">
      {/* Sidebar - Conversation History */}
      <div className="w-64 flex flex-col gap-2 border-r border-border pr-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold">
            {t("aiAssistant.conversations") || "Conversations"}
          </h2>
          <Button size="icon" variant="outline" onClick={handleNewConversation}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto space-y-2">
          {conversations.map((conv: any) => (
            <div
              key={conv.id}
              className={`group p-3 cursor-pointer hover:bg-accent transition-colors rounded-md border ${
                currentConversationId === conv.id
                  ? "bg-accent border-orange-500"
                  : "border-transparent"
              }`}
              onClick={() => setCurrentConversationId(conv.id)}
            >
              <div className="flex items-center justify-between gap-2 overflow-hidden">
                <p className="text-sm font-medium truncate flex-1">
                  {conv.title || "New Conversation"}
                </p>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 flex-shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteConversation(conv.id);
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-4">
          {!currentConversationId && messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <Bot className="h-16 w-16 text-orange-500 mb-4" />
              <h3 className="text-xl font-semibold mb-2">
                {t("aiAssistant.welcome") || "Welcome to AI Assistant"}
              </h3>
              <p className="text-muted-foreground max-w-md">
                {t("aiAssistant.description") ||
                  "Ask me anything about your materials, deliveries, quality tests, or forecasts. I can help you manage your concrete production business."}
              </p>
            </div>
          ) : (
            messages.map((msg: any) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {msg.role !== "user" && (
                  <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                    <Bot className="h-5 w-5 text-orange-600" />
                  </div>
                )}
                <Card
                  className={`p-4 max-w-[80%] ${
                    msg.role === "user"
                      ? "bg-orange-500 text-white"
                      : "bg-muted"
                  }`}
                >
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <Streamdown>{msg.content}</Streamdown>
                  </div>
                </Card>
                {msg.role === "user" && (
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    <User className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
              </div>
            ))
          )}
          {chatMutation.isPending && (
            <div className="flex gap-3 justify-start">
              <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                <Bot className="h-5 w-5 text-orange-600" />
              </div>
              <Card className="p-4 bg-muted flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">AI is thinking...</span>
              </Card>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Input
                placeholder={
                  t("aiAssistant.placeholder") || "Type your message..."
                }
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyPress}
                className="pr-10"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <VoiceActivationButton
                  onTranscription={handleVoiceTranscription}
                />
              </div>
            </div>
            <Button
              onClick={handleSendMessage}
              disabled={chatMutation.isPending || !message.trim()}
              className="bg-orange-500 hover:bg-orange-600"
            >
              {chatMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ModelSwitcher
                selectedModel={selectedModel}
                onModelChange={setSelectedModel}
                models={models}
              />
              <Dialog open={showTemplates} onOpenChange={setShowTemplates}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Sparkles className="h-4 w-4" />
                    {t("aiAssistant.templates") || "Templates"}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>
                      {t("aiAssistant.selectTemplate") ||
                        "Select a Prompt Template"}
                    </DialogTitle>
                  </DialogHeader>
                  <PromptTemplates onSelect={handleSelectTemplate} />
                </DialogContent>
              </Dialog>
              <Dialog open={showImageUpload} onOpenChange={setShowImageUpload}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <ImageIcon className="h-4 w-4" />
                    {t("aiAssistant.analyzeImage") || "Analyze Image"}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {t("aiAssistant.uploadImage") ||
                        "Upload Image for Analysis"}
                    </DialogTitle>
                  </DialogHeader>
                  <ImageUpload
                    onAnalyzed={handleImageAnalyzed}
                    onTextExtracted={handleTextExtracted}
                    onClose={() => setShowImageUpload(false)}
                  />
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

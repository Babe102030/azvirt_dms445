import { useState, useRef, useEffect } from "react";
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

  // Mutations
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

  // Auto-scroll to bottom when new messages arrive
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

  const handleSelectTemplate = (prompt: string) => {
    setMessage(prompt);
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
    setShowImageUpload(false);
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
    setShowImageUpload(false);
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] gap-4">
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
          {conversations.map((conv) => (
            <Card
              key={conv.id}
              className={`p-3 cursor-pointer hover:bg-accent transition-colors ${
                currentConversationId === conv.id
                  ? "bg-accent border-orange-500"
                  : ""
              }`}
              onClick={() => setCurrentConversationId(conv.id)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {conv.title || "New Conversation"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(conv.updatedAt).toLocaleDateString()}
                  </p>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteConversation(conv.id);
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Bot className="h-6 w-6 text-orange-500" />
            <h1 className="text-2xl font-bold">
              {t("aiAssistant.title") || "AI Assistant"}
            </h1>
          </div>

          {/* Model Switcher */}
          <ModelSwitcher
            selectedModel={selectedModel}
            onModelChange={setSelectedModel}
            showModelInfo={true}
            allowManagement={true}
          />
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-4 mb-4">
          {!currentConversationId && messages.length === 0 && (
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
          )}

          {messages.map((msg) => (
            <div key={msg.id} className="space-y-2">
              <div
                className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "assistant" && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center">
                    <Bot className="h-5 w-5 text-white" />
                  </div>
                )}

                <Card
                  className={`max-w-[70%] p-4 ${
                    msg.role === "user" ? "bg-orange-500 text-white" : "bg-card"
                  }`}
                >
                  <div className="space-y-2">
                    {msg.role === "assistant" ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <Streamdown>{msg.content}</Streamdown>
                      </div>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap">
                        {msg.content}
                      </p>
                    )}

                    {(msg as any).imageUrl && (
                      <img
                        src={(msg as any).imageUrl}
                        alt="Uploaded"
                        className="mt-2 max-w-xs rounded border"
                      />
                    )}

                    {(msg as any).audioUrl && (
                      <audio controls className="mt-2 w-full">
                        <source src={(msg as any).audioUrl} type="audio/webm" />
                      </audio>
                    )}

                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/20">
                      <p className="text-xs opacity-70">
                        {new Date(msg.createdAt).toLocaleTimeString()}
                      </p>
                      {msg.role === "assistant" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2"
                          onClick={() => {
                            navigator.clipboard.writeText(msg.content);
                          }}
                          title="Copy message"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>

                {msg.role === "user" && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-500 flex items-center justify-center">
                    <User className="h-5 w-5 text-white" />
                  </div>
                )}
              </div>

              {/* Show thinking process for assistant messages */}
              {msg.role === "assistant" && (msg as any).thinkingProcess && (
                <div className="ml-11 max-w-[70%]">
                  <ThinkingProcess
                    steps={(msg as any).thinkingProcess}
                    collapsed={true}
                  />
                </div>
              )}
            </div>
          ))}

          {chatMutation.isPending && (
            <div className="flex gap-3 justify-start">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center">
                <Bot className="h-5 w-5 text-white" />
              </div>
              <Card className="p-4">
                <Loader2 className="h-5 w-5 animate-spin text-orange-500" />
              </Card>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="space-y-4">
          {/* Image Upload Dialog */}
          {showImageUpload && (
            <Card className="p-4 border-orange-500">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Upload Image for Analysis</h3>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowImageUpload(false)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <ImageUpload
                  onImageAnalyzed={handleImageAnalyzed}
                  onTextExtracted={handleTextExtracted}
                  mode="both"
                />
              </div>
            </Card>
          )}

          <div className="flex gap-2 items-end">
            <Dialog open={showTemplates} onOpenChange={setShowTemplates}>
              <DialogTrigger asChild>
                <Button variant="outline" size="icon" title="Šabloni upita">
                  <Sparkles className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Šabloni upita</DialogTitle>
                </DialogHeader>
                <PromptTemplates onSelectTemplate={handleSelectTemplate} />
              </DialogContent>
            </Dialog>

            <Button
              variant="outline"
              size="icon"
              title="Upload Image"
              onClick={() => setShowImageUpload(!showImageUpload)}
            >
              <ImageIcon className="h-4 w-4" />
            </Button>

            <div className="flex-1">
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={
                  t("aiAssistant.placeholder") ||
                  "Ask me anything about your business..."
                }
                disabled={chatMutation.isPending}
                className="resize-none"
              />
            </div>

            <VoiceRecorder
              onTranscription={handleVoiceTranscription}
              language="bs"
            />

            <VoiceActivationButton
              onCommand={handleVoiceCommand}
              isProcessing={chatMutation.isPending}
            />

            <Button
              onClick={handleSendMessage}
              disabled={!message.trim() || chatMutation.isPending}
              className="bg-orange-500 hover:bg-orange-600"
            >
              {chatMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

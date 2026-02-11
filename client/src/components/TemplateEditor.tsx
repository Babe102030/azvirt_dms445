import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
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
  Eye,
  Variable,
  Mail,
  MessageSquare,
  Bell,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  Send,
  Loader2,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface TemplateEditorProps {
  initialData?: {
    name: string;
    description: string;
    subject: string;
    bodyHtml: string;
    channels: string[];
  };
  onSave: (data: {
    name: string;
    description: string;
    subject: string;
    bodyHtml: string;
    bodyText: string;
    channels: string[];
  }) => void;
  onCancel: () => void;
}

export function TemplateEditor({
  initialData,
  onSave,
  onCancel,
}: TemplateEditorProps) {
  const [name, setName] = useState(initialData?.name || "");
  const [description, setDescription] = useState(
    initialData?.description || "",
  );
  const [subject, setSubject] = useState(initialData?.subject || "");
  const [bodyHtml, setBodyHtml] = useState(initialData?.bodyHtml || "");
  const [channels, setChannels] = useState<string[]>(
    initialData?.channels || ["email"],
  );
  const [expandedCategories, setExpandedCategories] = useState<string[]>([
    "user",
    "task",
  ]);
  const [copiedVariable, setCopiedVariable] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("edit");
  const [testRecipientEmail, setTestRecipientEmail] = useState("");

  const { data: currentUser } = trpc.auth.me.useQuery();
  const { data: variables } =
    trpc.notificationTemplates.getVariables.useQuery();
  const previewMutation =
    trpc.notificationTemplates.previewTemplate.useMutation();
  const sendTestMutation =
    trpc.notificationTemplates.sendTestNotification.useMutation({
      onSuccess: () => {
        toast.success(`Testni email poslan na ${testRecipientEmail}`);
      },
      onError: (error) => {
        toast.error(`Slanje nije uspjelo: ${error.message}`);
      },
    });

  useEffect(() => {
    if (currentUser?.email && !testRecipientEmail) {
      setTestRecipientEmail(currentUser.email);
    }
  }, [currentUser, testRecipientEmail]);

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category],
    );
  };

  const insertVariable = useCallback(
    (variable: string, target: "subject" | "body") => {
      if (target === "subject") {
        setSubject((prev) => prev + variable);
      } else {
        setBodyHtml((prev) => prev + variable);
      }
    },
    [],
  );

  const copyVariable = (variable: string) => {
    navigator.clipboard.writeText(variable);
    setCopiedVariable(variable);
    setTimeout(() => setCopiedVariable(null), 2000);
  };

  const toggleChannel = (channel: string) => {
    setChannels((prev) =>
      prev.includes(channel)
        ? prev.filter((c) => c !== channel)
        : [...prev, channel],
    );
  };

  const handlePreview = () => {
    previewMutation.mutate({ subject, bodyHtml });
    setActiveTab("preview");
  };

  const handleSendTest = () => {
    if (!testRecipientEmail) {
      toast.error("Unesite email adresu primaoca.");
      return;
    }
    sendTestMutation.mutate({
      recipientEmail: testRecipientEmail,
      subject,
      bodyHtml,
    });
  };

  const handleSave = () => {
    // Generate plain text version from HTML
    const bodyText = bodyHtml.replace(/<[^>]*>/g, "").trim();
    onSave({
      name,
      description,
      subject,
      bodyHtml,
      bodyText,
      channels,
    });
  };

  const categoryLabels: Record<string, string> = {
    user: "Korisnik",
    task: "Zadatak",
    material: "Materijal",
    delivery: "Isporuka",
    project: "Projekat",
    system: "Sistem",
  };

  const channelConfig = [
    { id: "email", label: "Email", icon: Mail, color: "bg-blue-500" },
    { id: "sms", label: "SMS", icon: MessageSquare, color: "bg-green-500" },
    {
      id: "in_app",
      label: "U aplikaciji",
      icon: Bell,
      color: "bg-purple-500",
    },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main Editor */}
      <div className="lg:col-span-2 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Osnovne informacije</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Naziv šablona</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="npr. Obavještenje o niskim zalihama"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Opis (opciono)</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Kratak opis namjene šablona"
              />
            </div>
          </CardContent>
        </Card>

        {/* Channel Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Kanali dostave</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              {channelConfig.map((channel) => (
                <div
                  key={channel.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    channels.includes(channel.id)
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50"
                  }`}
                  onClick={() => toggleChannel(channel.id)}
                >
                  <div className={`p-2 rounded-full ${channel.color}`}>
                    <channel.icon className="w-4 h-4 text-white" />
                  </div>
                  <span className="font-medium">{channel.label}</span>
                  <Switch
                    checked={channels.includes(channel.id)}
                    onCheckedChange={() => toggleChannel(channel.id)}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Template Content */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Sadržaj šablona</CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handlePreview}>
                  <Eye className="w-4 h-4 mr-2" />
                  Pregled
                </Button>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Send className="w-4 h-4 mr-2" />
                      Pošalji test
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Pošalji testni email</DialogTitle>
                      <DialogDescription>
                        Pošaljite pregled ovog šablona na email adresu.
                        Varijable će biti zamijenjene sa primjer podacima.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="test-email" className="text-right">
                          Email
                        </Label>
                        <Input
                          id="test-email"
                          value={testRecipientEmail}
                          onChange={(e) =>
                            setTestRecipientEmail(e.target.value)
                          }
                          className="col-span-3"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        onClick={handleSendTest}
                        disabled={sendTestMutation.isLoading}
                      >
                        {sendTestMutation.isLoading && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Pošalji
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="edit">Uređivanje</TabsTrigger>
                <TabsTrigger value="preview">Pregled</TabsTrigger>
              </TabsList>

              <TabsContent value="edit" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="subject">Naslov (Subject)</Label>
                  <Input
                    id="subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="npr. Upozorenje: Niske zalihe za {{material.name}}"
                  />
                  <p className="text-xs text-muted-foreground">
                    Kliknite na varijablu sa desne strane da je ubacite
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="body">Tijelo poruke (HTML)</Label>
                  <Textarea
                    id="body"
                    value={bodyHtml}
                    onChange={(e) => setBodyHtml(e.target.value)}
                    placeholder={`<h2>Upozorenje o zalihama</h2>
<p>Poštovani {{user.name}},</p>
<p>Obavještavamo vas da su zalihe materijala <strong>{{material.name}}</strong> pale ispod minimuma.</p>
<ul>
  <li>Trenutna količina: {{material.quantity}} {{material.unit}}</li>
  <li>Minimalna zaliha: {{material.minStock}} {{material.unit}}</li>
</ul>
<p>Molimo vas da preduzmete potrebne korake.</p>`}
                    rows={12}
                    className="font-mono text-sm"
                  />
                </div>
              </TabsContent>

              <TabsContent value="preview">
                {previewMutation.isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Generisanje pregleda...
                  </div>
                ) : previewMutation.data ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-muted rounded-lg">
                      <Label className="text-xs text-muted-foreground">
                        Naslov
                      </Label>
                      <p className="font-medium">
                        {previewMutation.data.subject}
                      </p>
                    </div>
                    <div className="p-4 bg-muted rounded-lg">
                      <Label className="text-xs text-muted-foreground">
                        Tijelo poruke
                      </Label>
                      <div
                        className="mt-2 prose prose-sm dark:prose-invert max-w-none"
                        dangerouslySetInnerHTML={{
                          __html: previewMutation.data.bodyHtml,
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Kliknite "Pregled" da vidite kako će izgledati poruka
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onCancel}>
            Otkaži
          </Button>
          <Button
            onClick={handleSave}
            disabled={!name || !subject || !bodyHtml}
          >
            Sačuvaj šablon
          </Button>
        </div>
      </div>

      {/* Variables Sidebar */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Variable className="w-5 h-5" />
              Dostupne varijable
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {variables &&
              Object.entries(variables).map(([category, vars]) => (
                <div
                  key={category}
                  className="border rounded-lg overflow-hidden"
                >
                  <button
                    className="w-full flex items-center justify-between p-3 bg-muted/50 hover:bg-muted transition-colors"
                    onClick={() => toggleCategory(category)}
                  >
                    <span className="font-medium">
                      {categoryLabels[category] || category}
                    </span>
                    {expandedCategories.includes(category) ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>
                  {expandedCategories.includes(category) && (
                    <div className="p-2 space-y-1">
                      {(vars as string[]).map((variable) => (
                        <div
                          key={variable}
                          className="flex items-center justify-between p-2 rounded hover:bg-muted/50 group"
                        >
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            {variable}
                          </code>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => copyVariable(variable)}
                            >
                              {copiedVariable === variable ? (
                                <Check className="w-3 h-3 text-green-500" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Savjeti</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              • Koristite varijable u dvostrukim vitičastim zagradama:{" "}
              <code className="bg-muted px-1 rounded">{"{{variable}}"}</code>
            </p>
            <p>• HTML tagovi su podržani za formatiranje</p>
            <p>• SMS poruke koriste samo tekst verziju</p>
            <p>• Testirajte šablon prije aktivacije</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

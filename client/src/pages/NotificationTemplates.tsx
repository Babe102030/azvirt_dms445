import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Plus, 
  Edit, 
  Trash2, 
  Mail, 
  MessageSquare, 
  Bell,
  Zap,
  FileText,
  ToggleLeft,
  ToggleRight,
  Search
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { TemplateEditor } from "@/components/TemplateEditor";
import { ConditionBuilder, createEmptyConditionGroup, serializeConditions, deserializeConditions } from "@/components/ConditionBuilder";

export default function NotificationTemplates() {
  const [activeTab, setActiveTab] = useState("templates");
  const [showTemplateEditor, setShowTemplateEditor] = useState(false);
  const [showTriggerEditor, setShowTriggerEditor] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [editingTrigger, setEditingTrigger] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Trigger form state
  const [triggerName, setTriggerName] = useState("");
  const [triggerDescription, setTriggerDescription] = useState("");
  const [triggerEventType, setTriggerEventType] = useState("");
  const [triggerTemplateId, setTriggerTemplateId] = useState<number | null>(null);
  const [triggerConditions, setTriggerConditions] = useState(createEmptyConditionGroup());

  const utils = trpc.useUtils();
  const { data: templates, isLoading: templatesLoading } = trpc.notificationTemplates.listTemplates.useQuery();
  const { data: triggers, isLoading: triggersLoading } = trpc.notificationTemplates.listTriggers.useQuery();

  const createTemplateMutation = trpc.notificationTemplates.createTemplate.useMutation({
    onSuccess: () => {
      toast.success("Šablon uspješno kreiran");
      utils.notificationTemplates.listTemplates.invalidate();
      setShowTemplateEditor(false);
    },
    onError: (error) => toast.error(error.message),
  });

  const updateTemplateMutation = trpc.notificationTemplates.updateTemplate.useMutation({
    onSuccess: () => {
      toast.success("Šablon uspješno ažuriran");
      utils.notificationTemplates.listTemplates.invalidate();
      setShowTemplateEditor(false);
      setEditingTemplate(null);
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteTemplateMutation = trpc.notificationTemplates.deleteTemplate.useMutation({
    onSuccess: () => {
      toast.success("Šablon uspješno obrisan");
      utils.notificationTemplates.listTemplates.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const createTriggerMutation = trpc.notificationTemplates.createTrigger.useMutation({
    onSuccess: () => {
      toast.success("Okidač uspješno kreiran");
      utils.notificationTemplates.listTriggers.invalidate();
      resetTriggerForm();
      setShowTriggerEditor(false);
    },
    onError: (error) => toast.error(error.message),
  });

  const updateTriggerMutation = trpc.notificationTemplates.updateTrigger.useMutation({
    onSuccess: () => {
      toast.success("Okidač uspješno ažuriran");
      utils.notificationTemplates.listTriggers.invalidate();
      resetTriggerForm();
      setShowTriggerEditor(false);
      setEditingTrigger(null);
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteTriggerMutation = trpc.notificationTemplates.deleteTrigger.useMutation({
    onSuccess: () => {
      toast.success("Okidač uspješno obrisan");
      utils.notificationTemplates.listTriggers.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const resetTriggerForm = () => {
    setTriggerName("");
    setTriggerDescription("");
    setTriggerEventType("");
    setTriggerTemplateId(null);
    setTriggerConditions(createEmptyConditionGroup());
  };

  const handleSaveTemplate = (data: any) => {
    if (editingTemplate) {
      updateTemplateMutation.mutate({
        id: editingTemplate.id,
        ...data,

      });
    } else {
      createTemplateMutation.mutate({
        ...data,
      });
    }
  };

  const handleEditTemplate = (template: any) => {
    setEditingTemplate(template);
    setShowTemplateEditor(true);
  };

  const handleEditTrigger = (trigger: any) => {
    setEditingTrigger(trigger);
    setTriggerName(trigger.name);
    setTriggerDescription(trigger.description || "");
    setTriggerEventType(trigger.eventType);
    setTriggerTemplateId(trigger.templateId);
    setTriggerConditions(deserializeConditions(trigger.triggerCondition || "{}"));
    setShowTriggerEditor(true);
  };

  const handleSaveTrigger = () => {
    const data = {
      name: triggerName,
      description: triggerDescription,
      eventType: triggerEventType,
      templateId: triggerTemplateId!,
      conditions: serializeConditions(triggerConditions),
      recipients: JSON.stringify(["assignee", "owner"]),
    };

    if (editingTrigger) {
      updateTriggerMutation.mutate({ id: editingTrigger.id, ...data });
    } else {
      createTriggerMutation.mutate(data);
    }
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case "email": return <Mail className="w-4 h-4" />;
      case "sms": return <MessageSquare className="w-4 h-4" />;
      case "in_app": return <Bell className="w-4 h-4" />;
      default: return null;
    }
  };

  const eventTypes = [
    { id: "stock_low", label: "Niske zalihe materijala" },
    { id: "task_overdue", label: "Zadatak kasni" },
    { id: "task_completed", label: "Zadatak završen" },
    { id: "delivery_scheduled", label: "Isporuka zakazana" },
    { id: "delivery_delayed", label: "Isporuka kasni" },
    { id: "quality_test_failed", label: "Test kvaliteta nije prošao" },
    { id: "document_uploaded", label: "Dokument uploadovan" },
  ];

  const filteredTemplates = templates?.filter((t) =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredTriggers = triggers?.filter((t) =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Šabloni obavještenja</h1>
            <p className="text-muted-foreground">
              Upravljajte šablonima poruka i automatskim okidačima
            </p>
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Pretraži..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-[250px]"
              />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="templates" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Šabloni ({templates?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="triggers" className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Okidači ({triggers?.length || 0})
            </TabsTrigger>
          </TabsList>

          {/* Templates Tab */}
          <TabsContent value="templates" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => { setEditingTemplate(null); setShowTemplateEditor(true); }}>
                <Plus className="w-4 h-4 mr-2" />
                Novi šablon
              </Button>
            </div>

            {templatesLoading ? (
              <div className="text-center py-8 text-muted-foreground">Učitavanje...</div>
            ) : filteredTemplates?.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-medium mb-2">Nema šablona</h3>
                  <p className="text-muted-foreground mb-4">
                    Kreirajte prvi šablon za obavještenja
                  </p>
                  <Button onClick={() => setShowTemplateEditor(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Kreiraj šablon
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {filteredTemplates?.map((template) => (
                  <Card key={template.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{template.name}</CardTitle>
                          {template.description && (
                            <CardDescription>{template.description}</CardDescription>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={template.isActive ? "default" : "secondary"}>
                            {template.isActive ? "Aktivan" : "Neaktivan"}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditTemplate(template)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            onClick={() => deleteTemplateMutation.mutate({ id: template.id })}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">Kanali:</span>
                          <div className="flex gap-1">
                            {(Array.isArray(template.channels) ? template.channels : JSON.parse(template.channels || "[]")).map((channel: string) => (
                              <Badge key={channel} variant="outline" className="gap-1">
                                {getChannelIcon(channel)}
                                {channel}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Naslov: <span className="text-foreground">{template.subject}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Triggers Tab */}
          <TabsContent value="triggers" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => { resetTriggerForm(); setEditingTrigger(null); setShowTriggerEditor(true); }}>
                <Plus className="w-4 h-4 mr-2" />
                Novi okidač
              </Button>
            </div>

            {triggersLoading ? (
              <div className="text-center py-8 text-muted-foreground">Učitavanje...</div>
            ) : filteredTriggers?.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Zap className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-medium mb-2">Nema okidača</h3>
                  <p className="text-muted-foreground mb-4">
                    Kreirajte automatske okidače za slanje obavještenja
                  </p>
                  <Button onClick={() => setShowTriggerEditor(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Kreiraj okidač
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {filteredTriggers?.map((trigger) => (
                  <Card key={trigger.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Zap className="w-5 h-5 text-yellow-500" />
                            {trigger.name}
                          </CardTitle>
                          {trigger.description && (
                            <CardDescription>{trigger.description}</CardDescription>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={trigger.isActive ? "default" : "secondary"}>
                            {trigger.isActive ? (
                              <><ToggleRight className="w-3 h-3 mr-1" /> Aktivan</>
                            ) : (
                              <><ToggleLeft className="w-3 h-3 mr-1" /> Neaktivan</>
                            )}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditTrigger(trigger)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            onClick={() => deleteTriggerMutation.mutate({ id: trigger.id })}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Događaj:</span>{" "}
                          <Badge variant="outline">
                            {eventTypes.find((e) => e.id === trigger.eventType)?.label || trigger.eventType}
                          </Badge>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Šablon:</span>{" "}
                          {templates?.find((t) => t.id === trigger.templateId)?.name || "Nepoznat"}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Template Editor Dialog */}
        <Dialog open={showTemplateEditor} onOpenChange={setShowTemplateEditor}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingTemplate ? "Uredi šablon" : "Novi šablon"}
              </DialogTitle>
            </DialogHeader>
            <TemplateEditor
              initialData={editingTemplate ? {
                name: editingTemplate.name,
                description: editingTemplate.description || "",
                subject: editingTemplate.subject,
                bodyHtml: editingTemplate.bodyHtml || "",
                channels: JSON.parse(editingTemplate.channels || "[]"),
              } : undefined}
              onSave={handleSaveTemplate}
              onCancel={() => { setShowTemplateEditor(false); setEditingTemplate(null); }}
            />
          </DialogContent>
        </Dialog>

        {/* Trigger Editor Dialog */}
        <Dialog open={showTriggerEditor} onOpenChange={setShowTriggerEditor}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingTrigger ? "Uredi okidač" : "Novi okidač"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Naziv okidača</Label>
                  <Input
                    value={triggerName}
                    onChange={(e) => setTriggerName(e.target.value)}
                    placeholder="npr. Obavijest o niskim zalihama"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tip događaja</Label>
                  <Select value={triggerEventType} onValueChange={setTriggerEventType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Odaberi događaj" />
                    </SelectTrigger>
                    <SelectContent>
                      {eventTypes.map((event) => (
                        <SelectItem key={event.id} value={event.id}>
                          {event.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Opis (opciono)</Label>
                <Input
                  value={triggerDescription}
                  onChange={(e) => setTriggerDescription(e.target.value)}
                  placeholder="Kratak opis namjene okidača"
                />
              </div>

              <div className="space-y-2">
                <Label>Šablon poruke</Label>
                <Select
                  value={triggerTemplateId?.toString() || ""}
                  onValueChange={(v) => setTriggerTemplateId(Number(v))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Odaberi šablon" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates?.map((template) => (
                      <SelectItem key={template.id} value={template.id.toString()}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <ConditionBuilder
                value={triggerConditions}
                onChange={setTriggerConditions}
              />

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => { setShowTriggerEditor(false); setEditingTrigger(null); }}>
                  Otkaži
                </Button>
                <Button
                  onClick={handleSaveTrigger}
                  disabled={!triggerName || !triggerEventType || !triggerTemplateId}
                >
                  {editingTrigger ? "Sačuvaj izmjene" : "Kreiraj okidač"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

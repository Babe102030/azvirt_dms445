import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Upload,
  X,
  Save,
  RotateCcw,
  Eye,
  Code,
  Palette,
  FileText,
  Mail,
  Info,
  Copy,
  Check,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

type EmailTemplateType =
  | "daily_production_report"
  | "low_stock_alert"
  | "purchase_order"
  | "generic_notification";

interface BrandingSettings {
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  companyName: string;
  footerText: string | null;
  headerStyle: "gradient" | "solid" | "minimal";
  fontFamily: string;
}

export default function EmailTemplateEditor() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState("templates");
  const [selectedTemplateType, setSelectedTemplateType] =
    useState<EmailTemplateType>("daily_production_report");
  const [isEditing, setIsEditing] = useState(false);
  const [copiedVariable, setCopiedVariable] = useState<string | null>(null);

  // Branding state
  const [branding, setBranding] = useState<BrandingSettings>({
    logoUrl: null,
    primaryColor: "#f97316",
    secondaryColor: "#ea580c",
    companyName: "AzVirt",
    footerText: "",
    headerStyle: "gradient",
    fontFamily: "Arial, sans-serif",
  });
  const [uploading, setUploading] = useState(false);

  // Template state
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [templateSubject, setTemplateSubject] = useState("");
  const [templateBodyHtml, setTemplateBodyHtml] = useState("");
  const [templateIsActive, setTemplateIsActive] = useState(true);

  // Preview state
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewSubject, setPreviewSubject] = useState("");

  // API hooks
  const utils = trpc.useUtils();

  const { data: brandingData, refetch: refetchBranding } =
    trpc.branding.get.useQuery();

  const { data: templateTypes } = trpc.emailTemplates.getTypes.useQuery();

  const { data: currentTemplate, refetch: refetchTemplate } =
    trpc.emailTemplates.getByType.useQuery(
      { type: selectedTemplateType },
      { enabled: !!selectedTemplateType },
    );

  const { data: templateVariables } = trpc.emailTemplates.getVariables.useQuery(
    { type: selectedTemplateType },
    { enabled: !!selectedTemplateType },
  );

  const updateBranding = trpc.branding.update.useMutation({
    onSuccess: () => {
      toast.success("Branding settings saved successfully");
      refetchBranding();
      generatePreview();
    },
    onError: () => toast.error("Failed to save branding settings"),
  });

  const uploadLogo = trpc.branding.uploadLogo.useMutation({
    onSuccess: (data) => {
      setBranding((prev) => ({ ...prev, logoUrl: data.url }));
      toast.success("Logo uploaded successfully");
      refetchBranding();
    },
    onError: (error) => toast.error(error.message || "Failed to upload logo"),
  });

  const upsertTemplate = trpc.emailTemplates.upsert.useMutation({
    onSuccess: () => {
      toast.success("Template saved successfully");
      refetchTemplate();
      setIsEditing(false);
    },
    onError: () => toast.error("Failed to save template"),
  });

  const resetToDefault = trpc.emailTemplates.resetToDefault.useMutation({
    onSuccess: () => {
      toast.success("Template reset to default");
      refetchTemplate();
    },
    onError: () => toast.error("Failed to reset template"),
  });

  const previewMutation = trpc.emailTemplates.preview.useMutation({
    onSuccess: (data) => {
      setPreviewHtml(data.html);
      setPreviewSubject(data.subject);
    },
  });

  // Initialize branding from API data
  useEffect(() => {
    if (brandingData) {
      setBranding({
        logoUrl: (brandingData as any).logoUrl || null,
        primaryColor: (brandingData as any).primaryColor || "#f97316",
        secondaryColor: (brandingData as any).secondaryColor || "#ea580c",
        companyName: (brandingData as any).companyName || "AzVirt",
        footerText: (brandingData as any).footerText || "",
        headerStyle: (brandingData as any).headerStyle || "gradient",
        fontFamily: (brandingData as any).fontFamily || "Arial, sans-serif",
      });
    }
  }, [brandingData]);

  // Initialize template from API data
  useEffect(() => {
    if (currentTemplate) {
      setTemplateName((currentTemplate as any).name || "");
      setTemplateDescription((currentTemplate as any).description || "");
      setTemplateSubject((currentTemplate as any).subject || "");
      setTemplateBodyHtml((currentTemplate as any).bodyHtml || "");
      setTemplateIsActive((currentTemplate as any).isActive ?? true);
      generatePreview();
    }
  }, [currentTemplate]);

  // Generate preview on template or branding change
  const generatePreview = () => {
    previewMutation.mutate({
      type: selectedTemplateType,
      subject: isEditing ? templateSubject : undefined,
      bodyHtml: isEditing ? templateBodyHtml : undefined,
    });
  };

  useEffect(() => {
    if (selectedTemplateType) {
      generatePreview();
    }
  }, [selectedTemplateType]);

  // File upload handler
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = [
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/svg+xml",
    ];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Only PNG, JPG, and SVG files are allowed");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo must be less than 2MB");
      return;
    }

    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(",")[1];
        await uploadLogo.mutateAsync({
          fileData: base64,
          fileName: file.name,
          mimeType: file.type,
        });
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast.error("Failed to upload logo");
    } finally {
      setUploading(false);
    }
  };

  // Save branding
  const handleSaveBranding = async () => {
    await updateBranding.mutateAsync({
      logoUrl: branding.logoUrl || undefined,
      primaryColor: branding.primaryColor,
      secondaryColor: branding.secondaryColor,
      companyName: branding.companyName,
      footerText: branding.footerText || undefined,
      headerStyle: branding.headerStyle,
      fontFamily: branding.fontFamily,
    });
  };

  // Save template
  const handleSaveTemplate = async () => {
    await upsertTemplate.mutateAsync({
      type: selectedTemplateType,
      name: templateName,
      description: templateDescription,
      subject: templateSubject,
      bodyHtml: templateBodyHtml,
      isActive: templateIsActive,
    });
  };

  // Reset template to default
  const handleResetTemplate = async () => {
    if (
      confirm(
        "Are you sure you want to reset this template to default? Your customizations will be lost.",
      )
    ) {
      await resetToDefault.mutateAsync({ type: selectedTemplateType });
    }
  };

  // Copy variable to clipboard
  const handleCopyVariable = (variable: string) => {
    navigator.clipboard.writeText(variable);
    setCopiedVariable(variable);
    setTimeout(() => setCopiedVariable(null), 2000);
    toast.success("Variable copied to clipboard");
  };

  // Insert variable into template
  const handleInsertVariable = (variable: string) => {
    setTemplateBodyHtml((prev) => prev + variable);
    toast.success("Variable inserted into template");
  };

  const fontOptions = [
    { value: "Arial, sans-serif", label: "Arial" },
    { value: "'Helvetica Neue', Helvetica, sans-serif", label: "Helvetica" },
    { value: "Georgia, serif", label: "Georgia" },
    { value: "'Times New Roman', Times, serif", label: "Times New Roman" },
    { value: "'Segoe UI', Tahoma, sans-serif", label: "Segoe UI" },
    { value: "Verdana, sans-serif", label: "Verdana" },
  ];

  return (
    <div className="container py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Email Template Editor</h1>
        <p className="text-muted-foreground mt-2">
          Customize your email templates and branding for all system
          communications
        </p>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="branding" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Branding
          </TabsTrigger>
          <TabsTrigger value="preview" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Preview
          </TabsTrigger>
        </TabsList>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Template Selection */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-lg">Template Type</CardTitle>
                <CardDescription>
                  Select a template to customize
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select
                  value={selectedTemplateType}
                  onValueChange={(value) => {
                    setSelectedTemplateType(value as EmailTemplateType);
                    setIsEditing(false);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templateTypes?.map((type) => (
                      <SelectItem key={type.type} value={type.type}>
                        <div className="flex flex-col items-start">
                          <span className="font-medium">{type.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {currentTemplate && (
                  <div className="space-y-3 pt-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Status
                      </span>
                      <Badge
                        variant={
                          (currentTemplate as any).isCustom
                            ? "default"
                            : "secondary"
                        }
                      >
                        {(currentTemplate as any).isCustom
                          ? "Customized"
                          : "Default"}
                      </Badge>
                    </div>
                    <Separator />
                    <p className="text-sm text-muted-foreground">
                      {
                        templateTypes?.find(
                          (t) => t.type === selectedTemplateType,
                        )?.description
                      }
                    </p>
                  </div>
                )}

                <div className="flex flex-col gap-2 pt-4">
                  <Button
                    onClick={() => {
                      setIsEditing(true);
                    }}
                    disabled={isEditing}
                    className="w-full"
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    Edit Template
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleResetTemplate}
                    disabled={(currentTemplate as any)?.isCustom === false}
                    className="w-full"
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Reset to Default
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Template Editor */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Template Editor</CardTitle>
                    <CardDescription>
                      Edit the subject and body of your email template
                    </CardDescription>
                  </div>
                  {isEditing && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setIsEditing(false);
                          refetchTemplate();
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSaveTemplate}
                        disabled={upsertTemplate.isPending}
                      >
                        <Save className="mr-2 h-4 w-4" />
                        Save
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="templateName">Template Name</Label>
                    <Input
                      id="templateName"
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Active</Label>
                    <div className="flex items-center gap-2 pt-2">
                      <Switch
                        checked={templateIsActive}
                        onCheckedChange={setTemplateIsActive}
                        disabled={!isEditing}
                      />
                      <span className="text-sm text-muted-foreground">
                        {templateIsActive ? "Enabled" : "Disabled"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="templateSubject">Email Subject</Label>
                  <Input
                    id="templateSubject"
                    value={templateSubject}
                    onChange={(e) => setTemplateSubject(e.target.value)}
                    disabled={!isEditing}
                    placeholder="Enter email subject with {{variables}}"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="templateBody">Email Body (HTML)</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={generatePreview}
                      disabled={previewMutation.isPending}
                    >
                      <RefreshCw
                        className={`mr-2 h-4 w-4 ${previewMutation.isPending ? "animate-spin" : ""}`}
                      />
                      Refresh Preview
                    </Button>
                  </div>
                  <Textarea
                    id="templateBody"
                    value={templateBodyHtml}
                    onChange={(e) => setTemplateBodyHtml(e.target.value)}
                    disabled={!isEditing}
                    rows={15}
                    className="font-mono text-sm"
                    placeholder="Enter HTML template content..."
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Variable Documentation */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Info className="h-5 w-5" />
                Available Template Variables
              </CardTitle>
              <CardDescription>
                Click on a variable to copy it, or use the insert button to add
                it to your template
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {templateVariables?.map((variable: string) => (
                  <div
                    key={variable}
                    className="flex items-center gap-1 bg-muted rounded-md overflow-hidden"
                  >
                    <button
                      onClick={() => handleCopyVariable(variable)}
                      className="px-3 py-2 hover:bg-muted-foreground/10 transition-colors font-mono text-sm"
                    >
                      {variable}
                      {copiedVariable === variable && (
                        <Check className="inline ml-2 h-3 w-3 text-green-500" />
                      )}
                    </button>
                    {isEditing && (
                      <button
                        onClick={() => handleInsertVariable(variable)}
                        className="px-2 py-2 hover:bg-primary/10 text-primary transition-colors border-l"
                        title="Insert into template"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Branding Tab */}
        <TabsContent value="branding" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Company Branding</CardTitle>
                <CardDescription>
                  Customize your company branding for all email communications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Logo Upload */}
                <div className="space-y-2">
                  <Label>Company Logo</Label>
                  <div className="flex items-center gap-4">
                    {branding.logoUrl ? (
                      <div className="relative">
                        <img
                          src={branding.logoUrl}
                          alt="Company logo"
                          className="h-20 w-auto object-contain border rounded p-2"
                        />
                        <Button
                          size="icon"
                          variant="destructive"
                          className="absolute -top-2 -right-2 h-6 w-6"
                          onClick={() =>
                            setBranding((prev) => ({ ...prev, logoUrl: null }))
                          }
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="h-20 w-20 border-2 border-dashed rounded flex items-center justify-center text-muted-foreground">
                        <Mail className="h-8 w-8" />
                      </div>
                    )}
                    <div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/svg+xml"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                      <Button
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        {uploading ? "Uploading..." : "Upload Logo"}
                      </Button>
                      <p className="text-xs text-muted-foreground mt-1">
                        PNG, JPG, or SVG (max 2MB)
                      </p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Company Name */}
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input
                    id="companyName"
                    value={branding.companyName}
                    onChange={(e) =>
                      setBranding((prev) => ({
                        ...prev,
                        companyName: e.target.value,
                      }))
                    }
                    placeholder="AzVirt"
                  />
                </div>

                {/* Colors */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="primaryColor">Primary Color</Label>
                    <div className="flex gap-2">
                      <Input
                        id="primaryColor"
                        type="color"
                        value={branding.primaryColor}
                        onChange={(e) =>
                          setBranding((prev) => ({
                            ...prev,
                            primaryColor: e.target.value,
                          }))
                        }
                        className="w-16 h-10 p-1 cursor-pointer"
                      />
                      <Input
                        type="text"
                        value={branding.primaryColor}
                        onChange={(e) =>
                          setBranding((prev) => ({
                            ...prev,
                            primaryColor: e.target.value,
                          }))
                        }
                        className="flex-1 font-mono"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="secondaryColor">Secondary Color</Label>
                    <div className="flex gap-2">
                      <Input
                        id="secondaryColor"
                        type="color"
                        value={branding.secondaryColor}
                        onChange={(e) =>
                          setBranding((prev) => ({
                            ...prev,
                            secondaryColor: e.target.value,
                          }))
                        }
                        className="w-16 h-10 p-1 cursor-pointer"
                      />
                      <Input
                        type="text"
                        value={branding.secondaryColor}
                        onChange={(e) =>
                          setBranding((prev) => ({
                            ...prev,
                            secondaryColor: e.target.value,
                          }))
                        }
                        className="flex-1 font-mono"
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Header Style */}
                <div className="space-y-2">
                  <Label>Header Style</Label>
                  <Select
                    value={branding.headerStyle}
                    onValueChange={(value) =>
                      setBranding((prev) => ({
                        ...prev,
                        headerStyle: value as BrandingSettings["headerStyle"],
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gradient">
                        Gradient - Modern gradient background
                      </SelectItem>
                      <SelectItem value="solid">
                        Solid - Single color background
                      </SelectItem>
                      <SelectItem value="minimal">
                        Minimal - White background with accent border
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Font Family */}
                <div className="space-y-2">
                  <Label>Font Family</Label>
                  <Select
                    value={branding.fontFamily}
                    onValueChange={(value) =>
                      setBranding((prev) => ({ ...prev, fontFamily: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {fontOptions.map((font) => (
                        <SelectItem
                          key={font.value}
                          value={font.value}
                          style={{ fontFamily: font.value }}
                        >
                          {font.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                {/* Footer Text */}
                <div className="space-y-2">
                  <Label htmlFor="footerText">Footer Text</Label>
                  <Textarea
                    id="footerText"
                    value={branding.footerText || ""}
                    onChange={(e) =>
                      setBranding((prev) => ({
                        ...prev,
                        footerText: e.target.value,
                      }))
                    }
                    placeholder="Custom footer text (leave empty for default)"
                    rows={2}
                  />
                </div>

                {/* Save Button */}
                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={handleSaveBranding}
                    disabled={updateBranding.isPending}
                    className="flex-1"
                  >
                    <Save className="mr-2 h-4 w-4" />
                    {updateBranding.isPending ? "Saving..." : "Save Branding"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (brandingData) {
                        setBranding({
                          logoUrl: (brandingData as any).logoUrl || null,
                          primaryColor:
                            (brandingData as any).primaryColor || "#f97316",
                          secondaryColor:
                            (brandingData as any).secondaryColor || "#ea580c",
                          companyName:
                            (brandingData as any).companyName || "AzVirt",
                          footerText: (brandingData as any).footerText || "",
                          headerStyle:
                            (brandingData as any).headerStyle || "gradient",
                          fontFamily:
                            (brandingData as any).fontFamily ||
                            "Arial, sans-serif",
                        });
                      }
                    }}
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Reset
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Live Branding Preview */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Live Preview</CardTitle>
                <CardDescription>
                  Preview how your branding will look in emails
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-hidden shadow-sm">
                  {/* Header Preview */}
                  <div
                    className="p-6"
                    style={{
                      background:
                        branding.headerStyle === "gradient"
                          ? `linear-gradient(135deg, ${branding.primaryColor} 0%, ${branding.secondaryColor} 100%)`
                          : branding.headerStyle === "solid"
                            ? branding.primaryColor
                            : "#ffffff",
                      borderBottom:
                        branding.headerStyle === "minimal"
                          ? `4px solid ${branding.primaryColor}`
                          : "none",
                      fontFamily: branding.fontFamily,
                    }}
                  >
                    <div className="flex items-center gap-4 justify-center">
                      {branding.logoUrl && (
                        <img
                          src={branding.logoUrl}
                          alt="Logo"
                          className="h-12 w-auto"
                          style={{
                            filter:
                              branding.headerStyle === "minimal"
                                ? "none"
                                : "brightness(0) invert(1)",
                          }}
                        />
                      )}
                      <h3
                        className="text-2xl font-bold"
                        style={{
                          color:
                            branding.headerStyle === "minimal"
                              ? branding.primaryColor
                              : "white",
                        }}
                      >
                        {branding.companyName}
                      </h3>
                    </div>
                  </div>

                  {/* Content Preview */}
                  <div
                    className="p-6 bg-white"
                    style={{ fontFamily: branding.fontFamily }}
                  >
                    <h4 className="text-lg font-semibold mb-2">
                      Sample Email Content
                    </h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      This preview shows how your emails will appear with your
                      custom branding settings.
                    </p>
                    <div className="space-y-2">
                      <div className="flex justify-between py-2 border-b">
                        <span className="text-sm">Example Metric</span>
                        <span className="font-semibold">120</span>
                      </div>
                      <div className="flex justify-between py-2 border-b">
                        <span className="text-sm">Another Metric</span>
                        <span className="font-semibold">85%</span>
                      </div>
                    </div>
                    <Button
                      className="mt-4 w-full"
                      style={{
                        backgroundColor: branding.secondaryColor,
                        color: "white",
                      }}
                    >
                      View Details
                    </Button>
                  </div>

                  {/* Footer Preview */}
                  <div
                    className="p-4 text-center text-sm"
                    style={{
                      backgroundColor: `${branding.primaryColor}10`,
                      fontFamily: branding.fontFamily,
                    }}
                  >
                    <p className="text-muted-foreground">
                      {branding.footerText ||
                        `This automated message is generated by ${branding.companyName} DMS.`}
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      © {new Date().getFullYear()} {branding.companyName}. All
                      rights reserved.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Preview Tab */}
        <TabsContent value="preview" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Email Preview
                  </CardTitle>
                  <CardDescription>
                    Full preview of the{" "}
                    {
                      templateTypes?.find(
                        (t) => t.type === selectedTemplateType,
                      )?.name
                    }{" "}
                    template with your branding
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Select
                    value={selectedTemplateType}
                    onValueChange={(value) => {
                      setSelectedTemplateType(value as EmailTemplateType);
                    }}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {templateTypes?.map((type) => (
                        <SelectItem key={type.type} value={type.type}>
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    onClick={generatePreview}
                    disabled={previewMutation.isPending}
                  >
                    <RefreshCw
                      className={`mr-2 h-4 w-4 ${previewMutation.isPending ? "animate-spin" : ""}`}
                    />
                    Refresh
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Subject Preview */}
              <div className="mb-4 p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium text-muted-foreground">
                    Subject:
                  </span>
                  <span className="font-semibold">{previewSubject}</span>
                </div>
              </div>

              {/* Email Preview */}
              <div className="border rounded-lg overflow-hidden bg-gray-100 p-4">
                <div className="max-w-[700px] mx-auto">
                  {previewHtml ? (
                    <iframe
                      srcDoc={previewHtml}
                      className="w-full min-h-[600px] bg-white rounded shadow-sm"
                      title="Email Preview"
                      sandbox="allow-same-origin"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-[400px] bg-white rounded">
                      <div className="text-center text-muted-foreground">
                        <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Loading preview...</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* View Source Toggle */}
              <Accordion type="single" collapsible className="mt-4">
                <AccordionItem value="source">
                  <AccordionTrigger className="text-sm">
                    <div className="flex items-center gap-2">
                      <Code className="h-4 w-4" />
                      View HTML Source
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="relative">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={() => {
                          navigator.clipboard.writeText(previewHtml);
                          toast.success("HTML copied to clipboard");
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <pre className="p-4 bg-muted rounded-lg overflow-auto max-h-[400px] text-xs">
                        <code>{previewHtml}</code>
                      </pre>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

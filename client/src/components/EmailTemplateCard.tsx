import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Mail,
  MoreVertical,
  Edit,
  Eye,
  ToggleLeft,
  ToggleRight,
  Copy,
  Trash2,
} from "lucide-react";

interface EmailTemplate {
  id: number;
  type: string;
  name: string;
  description?: string;
  subject: string;
  bodyHtml: string;
  bodyText?: string;
  isCustom: boolean;
  isActive: boolean;
  variables?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface EmailTemplateCardProps {
  template: EmailTemplate;
  onEdit?: (template: EmailTemplate) => void;
  onPreview?: (template: EmailTemplate) => void;
  onToggleActive?: (template: EmailTemplate) => void;
  onDuplicate?: (template: EmailTemplate) => void;
  onDelete?: (template: EmailTemplate) => void;
}

export default function EmailTemplateCard({
  template,
  onEdit,
  onPreview,
  onToggleActive,
  onDuplicate,
  onDelete,
}: EmailTemplateCardProps) {
  const getTemplateTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      daily_production_report: "Daily Production Report",
      low_stock_alert: "Low Stock Alert",
      purchase_order: "Purchase Order",
      generic_notification: "Generic Notification",
      delivery_confirmation: "Delivery Confirmation",
      quality_test_report: "Quality Test Report",
    };
    return labels[type] || type;
  };

  const getTemplateTypeColor = (type: string): string => {
    const colors: Record<string, string> = {
      daily_production_report: "bg-blue-500",
      low_stock_alert: "bg-red-500",
      purchase_order: "bg-green-500",
      generic_notification: "bg-gray-500",
      delivery_confirmation: "bg-purple-500",
      quality_test_report: "bg-yellow-500",
    };
    return colors[type] || "bg-gray-500";
  };

  const parseVariables = (variablesJson?: string): string[] => {
    if (!variablesJson) return [];
    try {
      return JSON.parse(variablesJson);
    } catch {
      return [];
    }
  };

  const variables = parseVariables(template.variables);

  return (
    <Card className="relative overflow-hidden hover:shadow-lg transition-shadow">
      {/* Status Indicator */}
      <div
        className={`absolute top-0 left-0 right-0 h-1 ${
          template.isActive ? "bg-green-500" : "bg-gray-400"
        }`}
      />

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              <Badge className={getTemplateTypeColor(template.type)}>
                {getTemplateTypeLabel(template.type)}
              </Badge>
              {template.isCustom && (
                <Badge variant="outline" className="text-xs">
                  Custom
                </Badge>
              )}
              <Badge
                variant={template.isActive ? "default" : "secondary"}
                className="text-xs"
              >
                {template.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
            <CardTitle className="text-lg">{template.name}</CardTitle>
            {template.description && (
              <CardDescription className="line-clamp-2">
                {template.description}
              </CardDescription>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onEdit && (
                <DropdownMenuItem onClick={() => onEdit(template)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Template
                </DropdownMenuItem>
              )}
              {onPreview && (
                <DropdownMenuItem onClick={() => onPreview(template)}>
                  <Eye className="h-4 w-4 mr-2" />
                  Preview
                </DropdownMenuItem>
              )}
              {onToggleActive && (
                <DropdownMenuItem onClick={() => onToggleActive(template)}>
                  {template.isActive ? (
                    <>
                      <ToggleLeft className="h-4 w-4 mr-2" />
                      Deactivate
                    </>
                  ) : (
                    <>
                      <ToggleRight className="h-4 w-4 mr-2" />
                      Activate
                    </>
                  )}
                </DropdownMenuItem>
              )}
              {onDuplicate && (
                <DropdownMenuItem onClick={() => onDuplicate(template)}>
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicate
                </DropdownMenuItem>
              )}
              {onDelete && template.isCustom && (
                <DropdownMenuItem
                  onClick={() => onDelete(template)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Subject Preview */}
        <div>
          <div className="text-xs font-semibold text-muted-foreground mb-1">
            Subject Line
          </div>
          <div className="text-sm bg-muted p-2 rounded-md line-clamp-1">
            {template.subject}
          </div>
        </div>

        {/* Variables */}
        {variables.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-muted-foreground mb-2">
              Available Variables
            </div>
            <div className="flex flex-wrap gap-1">
              {variables.slice(0, 6).map((variable) => (
                <Badge
                  key={variable}
                  variant="outline"
                  className="text-xs font-mono"
                >
                  {`{{${variable}}}`}
                </Badge>
              ))}
              {variables.length > 6 && (
                <Badge variant="outline" className="text-xs">
                  +{variables.length - 6} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          {onPreview && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => onPreview(template)}
            >
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
          )}
          {onEdit && (
            <Button
              variant="default"
              size="sm"
              className="flex-1"
              onClick={() => onEdit(template)}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
        </div>

        {/* Footer Info */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
          <span>Type: {template.type}</span>
          <span>
            Updated: {new Date(template.updatedAt).toLocaleDateString()}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

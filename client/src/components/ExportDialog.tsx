import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Download, FileSpreadsheet } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export type ExportColumn = {
  key: string;
  label: string;
  enabled: boolean;
};

export type ExportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  columns: ExportColumn[];
  onExport: (selectedColumns: string[]) => Promise<void>;
  isExporting?: boolean;
};

export function ExportDialog({
  open,
  onOpenChange,
  title,
  description,
  columns: initialColumns,
  onExport,
  isExporting = false,
}: ExportDialogProps) {
  const { t } = useLanguage();
  const [columns, setColumns] = useState<ExportColumn[]>(initialColumns);

  const toggleColumn = (key: string) => {
    setColumns((prev) =>
      prev.map((col) =>
        col.key === key ? { ...col, enabled: !col.enabled } : col,
      ),
    );
  };

  const selectAll = () => {
    setColumns((prev) => prev.map((col) => ({ ...col, enabled: true })));
  };

  const deselectAll = () => {
    setColumns((prev) => prev.map((col) => ({ ...col, enabled: false })));
  };

  const handleExport = async () => {
    const selectedColumns = columns
      .filter((col) => col.enabled)
      .map((col) => col.key);

    if (selectedColumns.length === 0) {
      return;
    }

    await onExport(selectedColumns);
  };

  const selectedCount = columns.filter((col) => col.enabled).length;
  const totalCount = columns.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-orange-500" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Column Selection Controls */}
          <div className="flex items-center justify-between border-b pb-3">
            <div className="text-sm text-muted-foreground">
              {t("export.selectedColumns")}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={selectAll}
                disabled={isExporting}
              >
                {t("export.selectAll")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={deselectAll}
                disabled={isExporting}
              >
                {t("export.deselectAll")}
              </Button>
            </div>
          </div>

          {/* Column Checkboxes */}
          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-3">
              {columns.map((column) => (
                <div
                  key={column.key}
                  className="flex items-center space-x-3 p-2 rounded-md hover:bg-accent transition-colors"
                >
                  <Checkbox
                    id={column.key}
                    checked={column.enabled}
                    onCheckedChange={() => toggleColumn(column.key)}
                    disabled={isExporting}
                  />
                  <Label
                    htmlFor={column.key}
                    className="flex-1 cursor-pointer text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {column.label}
                  </Label>
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Preview Section */}
          {selectedCount > 0 && (
            <div className="bg-muted/50 rounded-md p-3 border">
              <div className="text-xs font-medium text-muted-foreground mb-2">
                {t("export.preview")}
              </div>
              <div className="flex flex-wrap gap-2">
                {columns
                  .filter((col) => col.enabled)
                  .map((col) => (
                    <span
                      key={col.key}
                      className="inline-flex items-center px-2 py-1 rounded-md bg-orange-500/10 text-orange-500 text-xs font-medium"
                    >
                      {col.label}
                    </span>
                  ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isExporting}
          >
            {t("common.cancel")}
          </Button>
          <Button
            onClick={handleExport}
            disabled={isExporting || selectedCount === 0}
            className="bg-orange-500 hover:bg-orange-600"
          >
            {isExporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("export.exporting")}
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                {t("export.download")}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

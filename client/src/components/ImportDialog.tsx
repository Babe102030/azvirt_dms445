import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Loader2,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  FileText,
  Clock,
  Package,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type ImportType = "work_hours" | "materials" | "documents";

export type ImportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  importType: ImportType;
  onImportComplete?: () => void;
};

export function ImportDialog({
  open,
  onOpenChange,
  importType,
  onImportComplete,
}: ImportDialogProps) {
  const { t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fileDataBase64, setFileDataBase64] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);

  const previewMutation = trpc.bulkImport.previewFile.useMutation();
  const importMaterialsMutation = trpc.bulkImport.importMaterials.useMutation();
  const importWorkHoursMutation = trpc.bulkImport.importWorkHours.useMutation();
  const importDocumentsMutation = trpc.bulkImport.importDocuments.useMutation();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreviewData(null);
      setImportResult(null);

      // Read file as base64
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setFileDataBase64(result);
      };
      reader.onerror = () => {
        toast.error("Failed to read file");
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handlePreview = async () => {
    if (!file || !fileDataBase64) return;
    setIsProcessing(true);
    try {
      const result = await previewMutation.mutateAsync({
        fileData: fileDataBase64,
        fileName: file.name,
        importType,
      });
      setPreviewData(result);
    } catch (error: any) {
      toast.error(error.message || "Failed to preview file");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImport = async () => {
    if (!file || !fileDataBase64) return;
    setIsProcessing(true);
    try {
      let result;
      const payload = {
        fileData: fileDataBase64,
        fileName: file.name,
      };

      if (importType === "materials") {
        result = await importMaterialsMutation.mutateAsync(payload);
      } else if (importType === "work_hours") {
        result = await importWorkHoursMutation.mutateAsync(payload);
      } else {
        result = await importDocumentsMutation.mutateAsync(payload);
      }

      setImportResult(result);
      if (result.success) {
        toast.success(result.message);
        onImportComplete?.();
      }
    } catch (error: any) {
      toast.error(error.message || "Import failed");
    } finally {
      setIsProcessing(false);
    }
  };

  const reset = () => {
    setFile(null);
    setFileDataBase64(null);
    setPreviewData(null);
    setImportResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const getIcon = () => {
    switch (importType) {
      case "materials":
        return <Package className="h-5 w-5 text-orange-500" />;
      case "work_hours":
        return <Clock className="h-5 w-5 text-orange-500" />;
      case "documents":
        return <FileText className="h-5 w-5 text-orange-500" />;
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        onOpenChange(val);
        if (!val) reset();
      }}
    >
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getIcon()}
            {t("common.import")} {t(`nav.${importType}`)}
          </DialogTitle>
          <DialogDescription>
            Bulk import {importType.replace("_", " ")} records from CSV or
            Excel.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!file && (
            <div
              className="border-2 border-dashed rounded-xl p-12 text-center hover:bg-muted/50 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-20" />
              <h3 className="text-lg font-medium">Select file to import</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Supports CSV, XLSX, XLS
              </p>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileChange}
              />
            </div>
          )}

          {file && !previewData && !importResult && (
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="h-8 w-8 text-green-600" />
                <div>
                  <p className="font-medium truncate max-w-[300px]">
                    {file.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={reset}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handlePreview}
                  disabled={isProcessing || !fileDataBase64}
                >
                  {isProcessing ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  Preview
                </Button>
              </div>
            </div>
          )}

          {previewData && !importResult && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Badge variant="secondary">
                  {previewData.totalRows} records found
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={reset}
                  className="text-xs"
                >
                  Change file
                </Button>
              </div>

              <div className="border rounded-md overflow-hidden bg-card">
                <ScrollArea className="h-[250px]">
                  <table className="w-full text-xs">
                    <thead className="bg-muted sticky top-0 z-10">
                      <tr>
                        {previewData.columns.map((col: string) => (
                          <th
                            key={col}
                            className="p-2 text-left font-semibold border-b whitespace-nowrap"
                          >
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.preview.map((row: any, i: number) => (
                        <tr
                          key={i}
                          className="hover:bg-muted/50 border-b last:border-0"
                        >
                          {previewData.columns.map((col: string) => (
                            <td
                              key={col}
                              className="p-2 truncate max-w-[150px]"
                            >
                              {String(row[col] || "")}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ScrollArea>
              </div>

              <div className="p-3 bg-orange-50 border border-orange-100 text-orange-800 rounded-lg text-xs flex gap-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <p>
                  Please ensure the columns in your file match the required
                  schema. Missing or invalid data will result in failed records.
                </p>
              </div>
            </div>
          )}

          {importResult && (
            <div className="text-center py-6 space-y-6">
              <div
                className={cn(
                  "h-16 w-16 rounded-full flex items-center justify-center mx-auto",
                  importResult.failed === 0 ? "bg-green-100" : "bg-orange-100",
                )}
              >
                {importResult.failed === 0 ? (
                  <CheckCircle2 className="h-10 w-10 text-green-600" />
                ) : (
                  <AlertCircle className="h-10 w-10 text-orange-600" />
                )}
              </div>

              <div>
                <h3 className="text-lg font-bold">Import Finished</h3>
                <p className="text-sm text-muted-foreground">
                  {importResult.message}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
                <div className="p-4 bg-green-50 rounded-xl border border-green-100">
                  <p className="text-2xl font-bold text-green-700">
                    {importResult.imported}
                  </p>
                  <p className="text-[10px] text-green-600 uppercase font-bold">
                    Imported
                  </p>
                </div>
                <div className="p-4 bg-red-50 rounded-xl border border-red-100">
                  <p className="text-2xl font-bold text-red-700">
                    {importResult.failed}
                  </p>
                  <p className="text-[10px] text-red-600 uppercase font-bold">
                    Failed
                  </p>
                </div>
              </div>

              {importResult.errors?.length > 0 && (
                <div className="text-left border rounded-lg overflow-hidden bg-card">
                  <div className="bg-muted p-2 border-b">
                    <p className="text-xs font-semibold">Error Log (Top 10)</p>
                  </div>
                  <ScrollArea className="h-[120px] p-2">
                    <ul className="text-[10px] space-y-1">
                      {importResult.errors.map((err: any, i: number) => (
                        <li
                          key={i}
                          className="text-red-600 border-b border-red-50 pb-1 last:border-0"
                        >
                          <span className="font-bold">Row {err.rowIndex}:</span>{" "}
                          {err.error}
                        </li>
                      ))}
                    </ul>
                  </ScrollArea>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          {!importResult ? (
            <div className="flex w-full gap-2">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1"
              >
                {t("common.cancel")}
              </Button>
              <Button
                onClick={handleImport}
                disabled={!previewData || isProcessing}
                className="flex-1 bg-orange-500 hover:bg-orange-600"
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                )}
                Process Import
              </Button>
            </div>
          ) : (
            <Button className="w-full" onClick={() => onOpenChange(false)}>
              {t("common.close")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

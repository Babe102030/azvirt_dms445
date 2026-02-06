import React, { useCallback, useMemo, useState } from "react";
import { useDropzone } from "react-dropzone";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { useAppDispatch, useAppSelector } from "../store";
import {
  setRows,
  appendRows,
  clearRows,
  Row,
  selectImportedRows,
  selectImportedFileName,
  selectImportedAt,
} from "../store/importedRowsSlice";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
  CheckSquare,
  Square,
  Settings2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/**
 * Helper utilities
 */

const isExcelMime = (file: File) =>
  file.type ===
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
  file.name.toLowerCase().endsWith(".xlsx") ||
  file.name.toLowerCase().endsWith(".xls");

const isCsv = (file: File) =>
  file.type === "text/csv" || file.name.toLowerCase().endsWith(".csv");

/**
 * Export to CSV with proper escaping
 */
function exportToCSV(rows: Row[], fileName = "export.csv", columns?: string[]) {
  if (!rows || rows.length === 0) return;
  const keys =
    columns && columns.length > 0 ? columns : Object.keys(rows[0] || {});
  const csvLines = [keys.join(",")].concat(
    rows.map((r) =>
      keys
        .map((k) => {
          const val = r[k];
          if (val === null || val === undefined) return "";
          const s = String(val).replace(/"/g, '""');
          return `"${s}"`;
        })
        .join(","),
    ),
  );
  const blob = new Blob([csvLines.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Export to Excel via xlsx
 */
function exportToExcel(
  rows: Row[],
  fileName = "export.xlsx",
  columns?: string[],
) {
  if (!rows || rows.length === 0) return;
  const keys =
    columns && columns.length > 0 ? columns : Object.keys(rows[0] || {});
  const filtered = rows.map((r) => {
    const obj: Record<string, any> = {};
    keys.forEach((k) => {
      obj[k] = r[k];
    });
    return obj;
  });
  const ws = XLSX.utils.json_to_sheet(filtered);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([wbout], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Parse CSV with PapaParse in chunked mode
 */
function parseCsvWithPapa(
  file: File,
  dispatchAppend: (rows: Row[]) => void,
  onProgress?: (progress: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    let totalRows = 0;
    const estimatedTotal = file.size;

    Papa.parse(file, {
      header: true,
      dynamicTyping: false,
      worker: true,
      skipEmptyLines: true,
      chunkSize: 1024 * 1024,
      chunk: (results, parser) => {
        const data = results.data as Row[];
        totalRows += data.length;
        dispatchAppend(data);
        if (onProgress) {
          onProgress(Math.min(100, Math.round((totalRows / 10000) * 100)));
        }
      },
      complete: () => {
        if (onProgress) onProgress(100);
        resolve();
      },
      error: (err) => {
        reject(err);
      },
    });
  });
}

/**
 * Parse Excel files
 */
async function parseExcel(file: File): Promise<Row[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const json = XLSX.utils.sheet_to_json(ws, { defval: null });
  return json as Row[];
}

/**
 * Import Component
 */
export const ImportComponent: React.FC = () => {
  const dispatch = useAppDispatch();
  const [status, setStatus] = useState<"idle" | "parsing" | "done" | "error">(
    "idle",
  );
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const importedFileName = useAppSelector(selectImportedFileName);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      setError(null);
      setProgress(0);
      if (!acceptedFiles || acceptedFiles.length === 0) return;
      const file = acceptedFiles[0];
      setStatus("parsing");

      try {
        dispatch(clearRows());

        if (isCsv(file)) {
          await parseCsvWithPapa(
            file,
            (rows: Row[]) => {
              dispatch(appendRows(rows));
            },
            (p) => setProgress(p),
          );
          dispatch(setRows({ rows: [], fileName: file.name }));
        } else if (isExcelMime(file)) {
          const rows = await parseExcel(file);
          dispatch(setRows({ rows, fileName: file.name }));
          setProgress(100);
        } else {
          if (file.name.toLowerCase().endsWith(".txt")) {
            await parseCsvWithPapa(
              file,
              (r) => dispatch(appendRows(r)),
              (p) => setProgress(p),
            );
          } else {
            try {
              const rows = await parseExcel(file);
              dispatch(setRows({ rows, fileName: file.name }));
              setProgress(100);
            } catch (ex) {
              await parseCsvWithPapa(
                file,
                (r) => dispatch(appendRows(r)),
                (p) => setProgress(p),
              );
            }
          }
        }
        setStatus("done");
        toast.success(`Imported ${file.name} successfully`);
      } catch (ex: any) {
        setStatus("error");
        const errorMsg = ex?.message ?? String(ex);
        setError(errorMsg);
        toast.error(errorMsg);
      }
    },
    [dispatch],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: {
      "text/csv": [".csv"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
        ".xlsx",
      ],
      "application/vnd.ms-excel": [".xls"],
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5 text-orange-500" />
          Import Data
        </CardTitle>
        <CardDescription>
          Upload CSV, XLSX, or XLS files to import records
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          {...getRootProps()}
          role="button"
          tabIndex={0}
          aria-label="Import CSV or Excel file"
          className={cn(
            "border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 cursor-pointer",
            isDragActive
              ? "border-orange-500 bg-orange-50 dark:bg-orange-950/20"
              : "border-muted-foreground/25 hover:border-orange-500/50 hover:bg-muted/50",
          )}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center gap-3">
            <FileSpreadsheet className="h-12 w-12 text-muted-foreground opacity-50" />
            <div>
              <p className="font-semibold">
                {isDragActive
                  ? "Drop file here..."
                  : "Drag and drop your file, or click to browse"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Supports CSV, XLSX, XLS (up to 50MB)
              </p>
            </div>
          </div>
        </div>

        {status === "parsing" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Importing...</Label>
              <span className="text-xs text-muted-foreground">
                {Math.min(100, progress)}%
              </span>
            </div>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-orange-500 transition-all duration-300"
                style={{ width: `${Math.min(100, progress)}%` }}
              />
            </div>
          </div>
        )}

        {status === "done" && importedFileName && (
          <Alert className="border-green-200 bg-green-50 dark:bg-green-950/20">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800 dark:text-green-200">
              Successfully imported <strong>{importedFileName}</strong>
            </AlertDescription>
          </Alert>
        )}

        {status === "error" && error && (
          <Alert className="border-red-200 bg-red-50 dark:bg-red-950/20">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800 dark:text-red-200">
              {error}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

/**
 * Export Dialog Component
 */
interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  rows: Row[];
  fileName: string | null;
  columns: string[];
}

const ExportDialog: React.FC<ExportDialogProps> = ({
  isOpen,
  onClose,
  rows,
  fileName,
  columns,
}) => {
  const [format, setFormat] = useState<"csv" | "xlsx">("csv");
  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(
    new Set(columns),
  );
  const [isExporting, setIsExporting] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setSelectedColumns(new Set(columns));
    }
  }, [isOpen, columns]);

  const handleExport = async () => {
    if (selectedColumns.size === 0) return;

    setIsExporting(true);
    try {
      const selectedCols = Array.from(selectedColumns);
      const outName =
        (fileName ? fileName.replace(/\.[^.]+$/, "") : "exported") +
        (format === "csv" ? ".csv" : ".xlsx");

      // Small delay to allow UI to update
      await new Promise((resolve) => setTimeout(resolve, 100));

      if (format === "csv") {
        exportToCSV(rows, outName, selectedCols);
      } else {
        exportToExcel(rows, outName, selectedCols);
      }

      toast.success(`Exported ${selectedCols.length} columns as ${format}`);
      onClose();
    } catch (error) {
      toast.error("Export failed");
      console.error("Export error:", error);
    } finally {
      setIsExporting(false);
    }
  };

  const toggleColumn = (col: string) => {
    const newSet = new Set(selectedColumns);
    if (newSet.has(col)) {
      newSet.delete(col);
    } else {
      newSet.add(col);
    }
    setSelectedColumns(newSet);
  };

  const selectAll = () => {
    setSelectedColumns(new Set(columns));
  };

  const deselectAll = () => {
    setSelectedColumns(new Set());
  };

  const allSelected = selectedColumns.size === columns.length;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-orange-500" />
            Export Settings
          </DialogTitle>
          <DialogDescription>
            Choose which columns to include and select your preferred file
            format
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Column Selection Controls */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Columns to Export</Label>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectAll}
                  disabled={isExporting}
                  className="h-8 text-xs"
                >
                  <CheckSquare className="h-3.5 w-3.5 mr-1" />
                  Select All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={deselectAll}
                  disabled={isExporting}
                  className="h-8 text-xs"
                >
                  <Square className="h-3.5 w-3.5 mr-1" />
                  Deselect All
                </Button>
              </div>
            </div>

            <ScrollArea className="h-[250px] border rounded-lg p-4 bg-muted/30">
              <div className="space-y-2">
                {columns.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No columns available
                  </p>
                ) : (
                  columns.map((col) => (
                    <div
                      key={col}
                      className="flex items-center space-x-3 p-2 rounded-md hover:bg-accent transition-colors"
                    >
                      <Checkbox
                        id={`col-${col}`}
                        checked={selectedColumns.has(col)}
                        onCheckedChange={() => toggleColumn(col)}
                        disabled={isExporting}
                      />
                      <Label
                        htmlFor={`col-${col}`}
                        className="text-sm font-medium cursor-pointer flex-1 select-none"
                      >
                        {col}
                      </Label>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Preview Section */}
          {selectedColumns.size > 0 && (
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground">
                Preview ({selectedColumns.size} selected)
              </Label>
              <div className="flex flex-wrap gap-2">
                {Array.from(selectedColumns).map((col) => (
                  <Badge
                    key={col}
                    variant="secondary"
                    className="bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200"
                  >
                    {col}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Format Selection */}
          <div className="space-y-2">
            <Label htmlFor="export-format" className="text-sm font-semibold">
              File Format
            </Label>
            <Select
              value={format}
              onValueChange={(v) => setFormat(v as "csv" | "xlsx")}
              disabled={isExporting}
            >
              <SelectTrigger id="export-format">
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV (.csv)</SelectItem>
                <SelectItem value="xlsx">Excel (.xlsx)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isExporting}>
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={selectedColumns.size === 0 || isExporting}
            className="bg-orange-500 hover:bg-orange-600"
          >
            {isExporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Export ({selectedColumns.size})
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/**
 * Export Component
 */
export const ExportComponent: React.FC = () => {
  const rows = useAppSelector(selectImportedRows);
  const fileName = useAppSelector(selectImportedFileName);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const dispatch = useAppDispatch();

  const availableColumns = useMemo(() => {
    if (!rows || rows.length === 0) return [];
    return Object.keys(rows[0]);
  }, [rows]);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-orange-500" />
            Export Data
          </CardTitle>
          <CardDescription>
            Choose columns and format to export your imported data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!rows || rows.length === 0 ? (
            <Alert className="border-muted bg-muted/30">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No data available to export. Import a file first.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border">
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Data Summary</Label>
                  <p className="text-sm text-muted-foreground">
                    {rows.length} records from {fileName}
                  </p>
                </div>
                <Badge variant="secondary">
                  {availableColumns.length} columns
                </Badge>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => setIsExportDialogOpen(true)}
                  className="flex-1 bg-orange-500 hover:bg-orange-600"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export ({rows.length} rows)
                </Button>
                <Button
                  onClick={() => dispatch(clearRows())}
                  variant="outline"
                  className="flex-1"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear Data
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <ExportDialog
        isOpen={isExportDialogOpen}
        onClose={() => setIsExportDialogOpen(false)}
        rows={rows || []}
        fileName={fileName}
        columns={availableColumns}
      />
    </>
  );
};

/**
 * Main ImportExport Component
 */
export default function ImportExport() {
  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Import & Export</h2>
        <p className="text-muted-foreground mt-1">
          Manage your data with bulk import and export functionality
        </p>
      </div>
      <ImportComponent />
      <ExportComponent />
    </div>
  );
}

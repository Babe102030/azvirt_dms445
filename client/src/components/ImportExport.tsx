/azvirt_dms445/ceilnt / src / components / ImportExport.tsx;
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

/**
 * ImportExport.tsx
 *
 * - `ImportComponent` lets the user drop/click to import CSV / XLSX / XLS files.
 *   It uses PapaParse for CSV (chunked parsing) and xlsx for Excel files.
 *   Parsed rows are stored in Redux via the `setRows` / `appendRows` actions.
 *
 * - `ExportComponent` reads parsed rows from Redux and exports them as CSV or XLSX.
 *   Columns can be chosen via a native multi-select. Uses simple browser-driven download.
 *
 * Notes:
 * - This code assumes the project has `react-dropzone`, `papaparse`, `xlsx`, and redux setup.
 * - You can style the components to match your design system (Tailwind / Chakra / MUI).
 */

/* -------------------------- Helper utilities --------------------------- */

const isExcelMime = (file: File) =>
  file.type ===
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
  file.name.toLowerCase().endsWith(".xlsx") ||
  file.name.toLowerCase().endsWith(".xls");

const isCsv = (file: File) =>
  file.type === "text/csv" || file.name.toLowerCase().endsWith(".csv");

/**
 * Export rows to CSV and trigger download.
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
 * Export rows to Excel (.xlsx) via xlsx library.
 */
function exportToExcel(
  rows: Row[],
  fileName = "export.xlsx",
  columns?: string[],
) {
  if (!rows || rows.length === 0) return;
  const keys =
    columns && columns.length > 0 ? columns : Object.keys(rows[0] || {});
  // build array of objects filtered by columns (xlsx utils handles arrays of objects)
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

/* ------------------------- Import parsing logic ------------------------ */

/**
 * Parse CSV using PapaParse in chunked mode so big files don't blow memory.
 * Dispatches `appendRows` for each chunk; onComplete nothing else needed.
 */
function parseCsvWithPapa(
  file: File,
  dispatchAppend: (rows: Row[]) => void,
  onProgress?: (progress: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    let totalRows = 0;
    let estimatedTotal = 0;
    // Try to estimate from file size for a naive progress bar (optional)
    estimatedTotal = file.size;

    Papa.parse(file, {
      header: true,
      dynamicTyping: false,
      worker: true,
      skipEmptyLines: true,
      chunkSize: 1024 * 1024, // 1MB chunks
      chunk: (results, parser) => {
        // results.data is an array of objects (rows)
        const data = results.data as Row[];
        totalRows += data.length;
        dispatchAppend(data);
        if (onProgress) {
          // Use number of bytes parsed if available (not reliably exposed), fallback to row count
          onProgress(Math.min(100, Math.round((totalRows / 10000) * 100))); // heuristic
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
 * Parse Excel (.xlsx/.xls) using xlsx lib. Reads first sheet.
 */
async function parseExcel(file: File): Promise<Row[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const json = XLSX.utils.sheet_to_json(ws, { defval: null });
  return json as Row[];
}

/* ------------------------ React components ---------------------------- */

/**
 * ImportComponent
 *
 * Props: none
 *
 * Behavior:
 * - Accepts CSV/XLSX/XLS files via drop or click.
 * - Parses CSV in chunks (appending rows) and Excel in one go.
 * - Stores parsed rows in Redux slice.
 * - Shows simple progress and status messages.
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
        // Clear previous rows first
        dispatch(clearRows());

        if (isCsv(file)) {
          await parseCsvWithPapa(
            file,
            (rows: Row[]) => {
              dispatch(appendRows(rows));
            },
            (p) => setProgress(p),
          );
        } else if (isExcelMime(file)) {
          const rows = await parseExcel(file);
          dispatch(setRows({ rows, fileName: file.name }));
          setProgress(100);
        } else {
          // Unknown extension: try csv first then excel fallback
          if (file.name.toLowerCase().endsWith(".txt")) {
            await parseCsvWithPapa(
              file,
              (r) => dispatch(appendRows(r)),
              (p) => setProgress(p),
            );
          } else {
            // Attempt excel parse first
            try {
              const rows = await parseExcel(file);
              dispatch(setRows({ rows, fileName: file.name }));
              setProgress(100);
            } catch (ex) {
              // fallback to papa
              await parseCsvWithPapa(
                file,
                (r) => dispatch(appendRows(r)),
                (p) => setProgress(p),
              );
            }
          }
        }
        setStatus("done");
      } catch (ex: any) {
        setStatus("error");
        setError(ex?.message ?? String(ex));
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
    <div>
      <div
        {...getRootProps()}
        role="button"
        tabIndex={0}
        aria-label="Import CSV or Excel file"
        style={{
          border: "2px dashed #888",
          padding: 16,
          borderRadius: 6,
          textAlign: "center",
          background: isDragActive ? "#fafafa" : "transparent",
          cursor: "pointer",
        }}
      >
        <input {...getInputProps()} />
        <p>
          {isDragActive
            ? "Drop file here..."
            : "Drop or click to upload CSV / XLSX / XLS"}
        </p>
        <small>Supports CSV (chunked parsing) and Excel files</small>
      </div>

      <div style={{ marginTop: 12 }}>
        <strong>Status:</strong> {status}
        {status === "parsing" && (
          <>
            <div
              aria-hidden
              style={{
                height: 8,
                background: "#eee",
                borderRadius: 4,
                marginTop: 8,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${Math.min(100, progress)}%`,
                  height: "100%",
                  background: "#4f46e5",
                }}
              />
            </div>
            <div style={{ marginTop: 6 }}>
              Progress: {Math.min(100, progress)}%
            </div>
          </>
        )}
        {status === "done" && importedFileName && (
          <div style={{ marginTop: 8 }}>
            Imported: <strong>{importedFileName}</strong>
          </div>
        )}
        {status === "error" && error && (
          <div role="alert" style={{ color: "crimson", marginTop: 8 }}>
            Error: {error}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * ExportComponent
 *
 * - Reads rows from Redux.
 * - Lets user pick CSV or XLSX and select which columns to export.
 * - Exports selected columns in chosen format.
 */
export const ExportComponent: React.FC = () => {
  const rows = useAppSelector(selectImportedRows);
  const fileName = useAppSelector(selectImportedFileName);
  const [format, setFormat] = useState<"csv" | "xlsx">("csv");
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const dispatch = useAppDispatch();

  const availableColumns = useMemo(() => {
    if (!rows || rows.length === 0) return [];
    // Collect keys from first row (you may want to union across all rows)
    return Object.keys(rows[0]);
  }, [rows]);

  // ensure selectedColumns defaults to all columns when rows change
  React.useEffect(() => {
    if (availableColumns.length > 0 && selectedColumns.length === 0) {
      setSelectedColumns(availableColumns);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableColumns.join(",")]);

  const handleExport = useCallback(() => {
    if (!rows || rows.length === 0) return;
    const outName =
      (fileName ? fileName.replace(/\.[^.]+$/, "") : "exported") +
      (format === "csv" ? ".csv" : ".xlsx");

    if (format === "csv") {
      exportToCSV(rows, outName, selectedColumns);
    } else {
      exportToExcel(rows, outName, selectedColumns);
    }
  }, [rows, format, selectedColumns, fileName]);

  const toggleColumn = (col: string) => {
    setSelectedColumns((prev) =>
      prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col],
    );
  };

  const handleClear = () => {
    dispatch(clearRows());
  };

  return (
    <div style={{ marginTop: 16 }}>
      <h4>Export</h4>
      <div style={{ marginBottom: 8 }}>
        <label>
          <input
            type="radio"
            name="format"
            value="csv"
            checked={format === "csv"}
            onChange={() => setFormat("csv")}
          />{" "}
          CSV
        </label>{" "}
        <label style={{ marginLeft: 12 }}>
          <input
            type="radio"
            name="format"
            value="xlsx"
            checked={format === "xlsx"}
            onChange={() => setFormat("xlsx")}
          />{" "}
          Excel (.xlsx)
        </label>
      </div>

      <div style={{ marginBottom: 8 }}>
        <label htmlFor="columns">Columns to export (use checkboxes)</label>
        <div
          id="columns"
          style={{
            border: "1px solid #eee",
            padding: 8,
            borderRadius: 6,
            maxHeight: 160,
            overflow: "auto",
          }}
        >
          {availableColumns.length === 0 && <div>No columns available</div>}
          {availableColumns.map((col) => (
            <div key={col}>
              <label>
                <input
                  type="checkbox"
                  checked={selectedColumns.includes(col)}
                  onChange={() => toggleColumn(col)}
                  aria-label={`Include column ${col}`}
                />{" "}
                {col}
              </label>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="button"
          onClick={handleExport}
          disabled={!rows || rows.length === 0}
          aria-disabled={!rows || rows.length === 0}
        >
          Export ({rows ? rows.length : 0} rows)
        </button>

        <button
          type="button"
          onClick={handleClear}
          disabled={!rows || rows.length === 0}
        >
          Clear imported
        </button>
      </div>
    </div>
  );
};

export default function ImportExport() {
  return (
    <div>
      <ImportComponent />
      <ExportComponent />
    </div>
  );
}

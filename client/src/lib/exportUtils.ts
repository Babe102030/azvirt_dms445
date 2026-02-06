import * as XLSX from "xlsx";

export type ExportFormat = "csv" | "json" | "xlsx";

export interface ExportColumn {
  header: string;
  key: string;
}

/**
 * Generate a timestamped filename for exports
 */
export function generateExportFilename(
  prefix: string,
  extension: string = "xlsx",
): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);
  return `${prefix}_export_${timestamp}.${extension}`;
}

/**
 * Internal helper to trigger browser download
 */
function triggerDownload(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

/**
 * Converts data to CSV string with basic escaping
 */
export function convertToCSV(data: any[], columns: ExportColumn[]): string {
  const headers = columns
    .map((col) => `"${col.header.replace(/"/g, '""')}"`)
    .join(",");

  const rows = data.map((item) => {
    return columns
      .map((col) => {
        const val = item[col.key];
        const stringVal = val === null || val === undefined ? "" : String(val);
        return `"${stringVal.replace(/"/g, '""')}"`;
      })
      .join(",");
  });

  return [headers, ...rows].join("\n");
}

/**
 * Main export processor
 * Logic is wrapped in a promise to allow UI non-blocking behavior
 */
export async function exportData<T>({
  data,
  columns,
  format,
  filename,
}: {
  data: T[];
  columns: ExportColumn[];
  format: ExportFormat;
  filename: string;
}) {
  return new Promise<void>((resolve) => {
    // Timeout 0 to push to event loop and prevent UI freeze
    setTimeout(() => {
      if (format === "json") {
        const blob = new Blob([JSON.stringify(data, null, 2)], {
          type: "application/json",
        });
        triggerDownload(blob, `${filename}.json`);
      } else if (format === "csv") {
        const csvContent = convertToCSV(data, columns);
        const blob = new Blob([csvContent], {
          type: "text/csv;charset=utf-8;",
        });
        triggerDownload(blob, `${filename}.csv`);
      } else if (format === "xlsx") {
        const exportRows = data.map((item) => {
          const row: any = {};
          columns.forEach((col) => {
            row[col.header] = (item as any)[col.key];
          });
          return row;
        });

        const worksheet = XLSX.utils.json_to_sheet(exportRows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Data");

        const excelBuffer = XLSX.write(workbook, {
          bookType: "xlsx",
          type: "array",
        });

        const blob = new Blob([excelBuffer], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });
        triggerDownload(blob, `${filename}.xlsx`);
      }
      resolve();
    }, 0);
  });
}

/**
 * Download an Excel file from base64 data
 * @param base64Data - Base64 encoded Excel file data
 * @param filename - Name of the file to download
 */
export function downloadExcelFile(base64Data: string, filename: string) {
  // Convert base64 to blob
  const byteCharacters = atob(base64Data);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  // Create download link and trigger download
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

/**
 * Generate a timestamped filename for exports
 * @param prefix - Prefix for the filename (e.g., "materials", "employees")
 * @returns Filename with timestamp
 */
export function generateExportFilename(prefix: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);
  return `${prefix}_export_${timestamp}.xlsx`;
}

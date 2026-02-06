import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import {
  Material,
  Employee,
  Project,
  Delivery,
  Timesheet,
  QualityTest,
  PurchaseOrder,
} from "@prisma/client";
import prisma from "../_core/prisma"; // Assuming prisma client is available here

interface ExportColumn {
  key: string;
  header: string;
  width?: number;
}

interface ExportOptions {
  columns?: string[];
}

/**
 * Generic function to generate a PDF from data
 * @param data - The array of objects to export
 * @param allAvailableColumns - All possible columns for the data type
 * @param options - Export options including selected columns
 * @param title - Title for the PDF document
 * @returns A Promise that resolves to a Buffer containing the PDF data
 */
async function generatePdf<T extends Record<string, any>>(
  data: T[],
  allAvailableColumns: ExportColumn[],
  options?: ExportOptions,
  title: string = "Export Report",
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  let page = pdfDoc.addPage();

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontSize = 10;
  const textColor = rgb(0, 0, 0);
  const headerColor = rgb(0.2, 0.2, 0.2); // Darker color for headers

  const margin = 30;
  let y = page.getHeight() - margin;
  const rowHeight = 18;
  const headerRowHeight = 25;

  // Add title to the document
  page.drawText(title, {
    x: margin,
    y: y,
    font,
    fontSize: 18,
    color: headerColor,
  });
  y -= headerRowHeight * 2; // Move down for the actual content

  const selectedColumns = options?.columns
    ? allAvailableColumns.filter((col) => options.columns?.includes(col.key))
    : allAvailableColumns;

  // Function to draw headers on a page
  const drawHeaders = (currentPage: any, currentY: number) => {
    let currentX = margin;
    for (const col of selectedColumns) {
      currentPage.drawText(col.header, {
        x: currentX,
        y: currentY,
        font,
        fontSize,
        color: headerColor,
      });
      currentX += col.width || 80; // Default width if not specified
    }
    return currentY - rowHeight;
  };

  y = drawHeaders(page, y); // Draw initial headers

  // Draw data
  for (const item of data) {
    // Check if enough space for the next row, if not, add a new page
    if (y < margin + rowHeight) {
      page = pdfDoc.addPage();
      y = page.getHeight() - margin;
      y = drawHeaders(page, y); // Redraw headers on new page
    }

    let x = margin; // Reset x for each new row
    for (const col of selectedColumns) {
      const value = String(item[col.key as keyof T] || "");
      page.drawText(value, {
        x,
        y,
        font,
        fontSize,
        color: textColor,
      });
      x += col.width || 80;
    }
    y -= rowHeight; // Move down for next row
  }

  return Buffer.from(await pdfDoc.save());
}

export async function exportMaterialsToPdf(
  options?: ExportOptions,
): Promise<Buffer> {
  const materials = await prisma.material.findMany();

  const allColumns: ExportColumn[] = [
    { key: "id", header: "ID", width: 50 },
    { key: "name", header: "Material Name", width: 100 },
    { key: "category", header: "Category", width: 80 },
    { key: "unit", header: "Unit", width: 50 },
    { key: "quantity", header: "Quantity", width: 60 },
    { key: "minStock", header: "Min Stock", width: 60 },
    { key: "criticalThreshold", header: "Critical Threshold", width: 80 },
    { key: "supplier", header: "Supplier", width: 80 },
    { key: "unitPrice", header: "Unit Price", width: 60 },
    { key: "supplierEmail", header: "Supplier Email", width: 100 },
    { key: "createdAt", header: "Created At", width: 90 },
    { key: "updatedAt", header: "Updated At", width: 90 },
  ];

  return generatePdf<Material>(
    materials,
    allColumns,
    options,
    "Materials Export",
  );
}

export async function exportEmployeesToPdf(
  options?: ExportOptions,
): Promise<Buffer> {
  const employees = await prisma.employee.findMany();

  const allColumns: ExportColumn[] = [
    { key: "id", header: "ID", width: 50 },
    { key: "firstName", header: "First Name", width: 80 },
    { key: "lastName", header: "Last Name", width: 80 },
    { key: "employeeNumber", header: "Employee Number", width: 100 },
    { key: "position", header: "Position", width: 80 },
    { key: "department", header: "Department", width: 80 },
    { key: "phoneNumber", header: "Phone", width: 80 },
    { key: "email", header: "Email", width: 120 },
    { key: "hourlyRate", header: "Hourly Rate", width: 70 },
    { key: "status", header: "Status", width: 60 },
    { key: "hireDate", header: "Hire Date", width: 90 },
    { key: "createdAt", header: "Created At", width: 90 },
  ];

  return generatePdf<Employee>(
    employees,
    allColumns,
    options,
    "Employees Export",
  );
}

export async function exportProjectsToPdf(
  options?: ExportOptions,
): Promise<Buffer> {
  const projects = await prisma.project.findMany();

  const allColumns: ExportColumn[] = [
    { key: "id", header: "ID", width: 50 },
    { key: "name", header: "Project Name", width: 120 },
    { key: "location", header: "Location", width: 100 },
    { key: "status", header: "Status", width: 70 },
    { key: "startDate", header: "Start Date", width: 90 },
    { key: "endDate", header: "End Date", width: 90 },
    { key: "createdBy", header: "Created By", width: 100 },
    { key: "createdAt", header: "Created At", width: 90 },
  ];

  return generatePdf<Project>(projects, allColumns, options, "Projects Export");
}

export async function exportDeliveriesToPdf(
  options?: ExportOptions,
): Promise<Buffer> {
  const deliveries = await prisma.delivery.findMany();

  const allColumns: ExportColumn[] = [
    { key: "id", header: "ID", width: 50 },
    { key: "projectId", header: "Project ID", width: 80 },
    { key: "materialId", header: "Material ID", width: 80 },
    { key: "quantity", header: "Quantity", width: 60 },
    { key: "deliveryDate", header: "Delivery Date", width: 90 },
    { key: "status", header: "Status", width: 70 },
    { key: "supplier", header: "Supplier", width: 100 },
    { key: "notes", header: "Notes", width: 120 },
    { key: "createdAt", header: "Created At", width: 90 },
  ];

  return generatePdf<Delivery>(
    deliveries,
    allColumns,
    options,
    "Deliveries Export",
  );
}

export async function exportTimesheetsToPdf(
  options?: ExportOptions,
): Promise<Buffer> {
  const timesheets = await prisma.timesheet.findMany();

  const allColumns: ExportColumn[] = [
    { key: "id", header: "ID", width: 50 },
    { key: "employeeId", header: "Employee ID", width: 80 },
    { key: "projectId", header: "Project ID", width: 80 },
    { key: "date", header: "Date", width: 80 },
    { key: "hoursWorked", header: "Hours Worked", width: 80 },
    { key: "overtimeHours", header: "Overtime Hours", width: 90 },
    { key: "breakMinutes", header: "Break Minutes", width: 90 },
    { key: "status", header: "Status", width: 70 },
    { key: "notes", header: "Notes", width: 120 },
    { key: "createdAt", header: "Created At", width: 90 },
  ];

  return generatePdf<Timesheet>(
    timesheets,
    allColumns,
    options,
    "Timesheets Export",
  );
}

export async function exportQualityTestsToPdf(
  options?: ExportOptions,
): Promise<Buffer> {
  const qualityTests = await prisma.qualityTest.findMany();

  const allColumns: ExportColumn[] = [
    { key: "id", header: "ID", width: 50 },
    { key: "testName", header: "Test Name", width: 100 },
    { key: "testType", header: "Test Type", width: 80 },
    { key: "result", header: "Result", width: 60 },
    { key: "unit", header: "Unit", width: 50 },
    { key: "status", header: "Status", width: 70 },
    { key: "testedBy", header: "Tested By", width: 100 },
    { key: "createdAt", header: "Date", width: 90 },
  ];

  return generatePdf<QualityTest>(
    qualityTests,
    allColumns,
    options,
    "Quality Tests Export",
  );
}

export async function exportPurchaseOrdersToPdf(
  options?: ExportOptions,
): Promise<Buffer> {
  const purchaseOrders = await prisma.purchaseOrder.findMany();

  const allColumns: ExportColumn[] = [
    { key: "id", header: "PO #", width: 60 },
    { key: "materialName", header: "Material", width: 100 },
    { key: "quantity", header: "Quantity", width: 70 },
    { key: "supplier", header: "Supplier", width: 100 },
    { key: "orderDate", header: "Order Date", width: 90 },
    { key: "expectedDelivery", header: "Expected Delivery", width: 100 },
    { key: "status", header: "Status", width: 70 },
    { key: "totalCost", header: "Total Cost", width: 80 },
  ];

  return generatePdf<PurchaseOrder>(
    purchaseOrders,
    allColumns,
    options,
    "Purchase Orders Export",
  );
}

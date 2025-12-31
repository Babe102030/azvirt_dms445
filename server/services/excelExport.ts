import ExcelJS from 'exceljs';
import * as db from '../db';

export interface ExportColumn {
  key: string;
  header: string;
  width?: number;
}

export interface ExportOptions {
  columns?: string[]; // Selected column keys
  filters?: Record<string, any>;
}

/**
 * Export materials to Excel with customizable columns
 */
export async function exportMaterialsToExcel(options: ExportOptions = {}): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Materials');

  // Define all available columns
  const allColumns: ExportColumn[] = [
    { key: 'id', header: 'ID', width: 10 },
    { key: 'name', header: 'Material Name', width: 30 },
    { key: 'category', header: 'Category', width: 15 },
    { key: 'unit', header: 'Unit', width: 10 },
    { key: 'quantity', header: 'Quantity', width: 12 },
    { key: 'minStock', header: 'Min Stock', width: 12 },
    { key: 'criticalThreshold', header: 'Critical Threshold', width: 18 },
    { key: 'supplier', header: 'Supplier', width: 25 },
    { key: 'unitPrice', header: 'Unit Price', width: 12 },
    { key: 'supplierEmail', header: 'Supplier Email', width: 30 },
    { key: 'createdAt', header: 'Created At', width: 20 },
    { key: 'updatedAt', header: 'Updated At', width: 20 },
  ];

  // Filter columns based on selection
  const selectedColumns = options.columns
    ? allColumns.filter(col => options.columns!.includes(col.key))
    : allColumns;

  worksheet.columns = selectedColumns;

  // Style header row
  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' },
  };
  worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

  // Fetch data
  const materials = await db.getMaterials();

  // Add rows
  materials.forEach(material => {
    const row: any = {};
    selectedColumns.forEach(col => {
      row[col.key] = (material as any)[col.key];
    });
    worksheet.addRow(row);
  });

  // Add filters
  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: selectedColumns.length },
  };

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

/**
 * Export employees to Excel with customizable columns
 */
export async function exportEmployeesToExcel(options: ExportOptions = {}): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Employees');

  // Define all available columns
  const allColumns: ExportColumn[] = [
    { key: 'id', header: 'ID', width: 10 },
    { key: 'firstName', header: 'First Name', width: 20 },
    { key: 'lastName', header: 'Last Name', width: 20 },
    { key: 'employeeNumber', header: 'Employee Number', width: 18 },
    { key: 'position', header: 'Position', width: 25 },
    { key: 'department', header: 'Department', width: 20 },
    { key: 'phoneNumber', header: 'Phone', width: 18 },
    { key: 'email', header: 'Email', width: 30 },
    { key: 'hourlyRate', header: 'Hourly Rate', width: 15 },
    { key: 'status', header: 'Status', width: 12 },
    { key: 'hireDate', header: 'Hire Date', width: 15 },
    { key: 'createdAt', header: 'Created At', width: 20 },
  ];

  // Filter columns based on selection
  const selectedColumns = options.columns
    ? allColumns.filter(col => options.columns!.includes(col.key))
    : allColumns;

  worksheet.columns = selectedColumns;

  // Style header row
  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF70AD47' },
  };
  worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

  // Fetch data
  const employees = await db.getEmployees();

  // Add rows
  employees.forEach(employee => {
    const row: any = {};
    selectedColumns.forEach(col => {
      row[col.key] = (employee as any)[col.key];
    });
    worksheet.addRow(row);
  });

  // Add filters
  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: selectedColumns.length },
  };

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

/**
 * Export projects to Excel with customizable columns
 */
export async function exportProjectsToExcel(options: ExportOptions = {}): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Projects');

  // Define all available columns
  const allColumns: ExportColumn[] = [
    { key: 'id', header: 'ID', width: 10 },
    { key: 'name', header: 'Project Name', width: 30 },
    { key: 'location', header: 'Location', width: 30 },
    { key: 'status', header: 'Status', width: 15 },
    { key: 'startDate', header: 'Start Date', width: 15 },
    { key: 'endDate', header: 'End Date', width: 15 },
    { key: 'createdBy', header: 'Created By', width: 15 },
    { key: 'createdAt', header: 'Created At', width: 20 },
  ];

  // Filter columns based on selection
  const selectedColumns = options.columns
    ? allColumns.filter(col => options.columns!.includes(col.key))
    : allColumns;

  worksheet.columns = selectedColumns;

  // Style header row
  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFFC000' },
  };
  worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

  // Fetch data
  const projects = await db.getProjects();

  // Add rows
  projects.forEach(project => {
    const row: any = {};
    selectedColumns.forEach(col => {
      row[col.key] = (project as any)[col.key];
    });
    worksheet.addRow(row);
  });

  // Add filters
  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: selectedColumns.length },
  };

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

/**
 * Export deliveries to Excel with customizable columns
 */
export async function exportDeliveriesToExcel(options: ExportOptions = {}): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Deliveries');

  // Define all available columns
  const allColumns: ExportColumn[] = [
    { key: 'id', header: 'ID', width: 10 },
    { key: 'projectId', header: 'Project ID', width: 12 },
    { key: 'materialId', header: 'Material ID', width: 12 },
    { key: 'quantity', header: 'Quantity', width: 12 },
    { key: 'deliveryDate', header: 'Delivery Date', width: 18 },
    { key: 'status', header: 'Status', width: 15 },
    { key: 'supplier', header: 'Supplier', width: 25 },
    { key: 'notes', header: 'Notes', width: 40 },
    { key: 'createdAt', header: 'Created At', width: 20 },
  ];

  // Filter columns based on selection
  const selectedColumns = options.columns
    ? allColumns.filter(col => options.columns!.includes(col.key))
    : allColumns;

  worksheet.columns = selectedColumns;

  // Style header row
  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFED7D31' },
  };
  worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

  // Fetch data
  const deliveries = await db.getDeliveries();

  // Add rows
  deliveries.forEach(delivery => {
    const row: any = {};
    selectedColumns.forEach(col => {
      row[col.key] = (delivery as any)[col.key];
    });
    worksheet.addRow(row);
  });

  // Add filters
  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: selectedColumns.length },
  };

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

/**
 * Export timesheets to Excel with customizable columns
 */
export async function exportTimesheetsToExcel(options: ExportOptions = {}): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Timesheets');

  // Define all available columns
  const allColumns: ExportColumn[] = [
    { key: 'id', header: 'ID', width: 10 },
    { key: 'employeeId', header: 'Employee ID', width: 15 },
    { key: 'projectId', header: 'Project ID', width: 12 },
    { key: 'date', header: 'Date', width: 15 },
    { key: 'hoursWorked', header: 'Hours Worked', width: 15 },
    { key: 'overtimeHours', header: 'Overtime Hours', width: 15 },
    { key: 'breakMinutes', header: 'Break Minutes', width: 15 },
    { key: 'status', header: 'Status', width: 15 },
    { key: 'notes', header: 'Notes', width: 40 },
    { key: 'createdAt', header: 'Created At', width: 20 },
  ];

  // Filter columns based on selection
  const selectedColumns = options.columns
    ? allColumns.filter(col => options.columns!.includes(col.key))
    : allColumns;

  worksheet.columns = selectedColumns;

  // Style header row
  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF5B9BD5' },
  };
  worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

  // Fetch data
  const timesheets = await db.getWorkHours();

  // Add rows
  timesheets.forEach((timesheet: any) => {
    const row: any = {};
    selectedColumns.forEach(col => {
      row[col.key] = (timesheet as any)[col.key];
    });
    worksheet.addRow(row);
  });

  // Add filters
  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: selectedColumns.length },
  };

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

/**
 * Export all data to a single Excel file with multiple sheets
 */
export async function exportAllDataToExcel(options: Record<string, ExportOptions> = {}): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();

  // Add materials sheet
  const materialsSheet = workbook.addWorksheet('Materials');
  const materialsColumns: ExportColumn[] = [
    { key: 'id', header: 'ID', width: 10 },
    { key: 'name', header: 'Material Name', width: 30 },
    { key: 'category', header: 'Category', width: 15 },
    { key: 'unit', header: 'Unit', width: 10 },
    { key: 'quantity', header: 'Quantity', width: 12 },
    { key: 'minStock', header: 'Min Stock', width: 12 },
  ];
  materialsSheet.columns = materialsColumns;
  materialsSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  materialsSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
  const materials = await db.getMaterials();
  materials.forEach(m => materialsSheet.addRow(m));

  // Add employees sheet
  const employeesSheet = workbook.addWorksheet('Employees');
  const employeesColumns: ExportColumn[] = [
    { key: 'id', header: 'ID', width: 10 },
    { key: 'firstName', header: 'First Name', width: 20 },
    { key: 'lastName', header: 'Last Name', width: 20 },
    { key: 'employeeNumber', header: 'Employee Number', width: 18 },
    { key: 'position', header: 'Position', width: 25 },
    { key: 'department', header: 'Department', width: 20 },
  ];
  employeesSheet.columns = employeesColumns;
  employeesSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  employeesSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF70AD47' } };
  const employees = await db.getEmployees();
  employees.forEach(e => employeesSheet.addRow(e));

  // Add projects sheet
  const projectsSheet = workbook.addWorksheet('Projects');
  const projectsColumns: ExportColumn[] = [
    { key: 'id', header: 'ID', width: 10 },
    { key: 'name', header: 'Project Name', width: 30 },
    { key: 'location', header: 'Location', width: 30 },
    { key: 'status', header: 'Status', width: 15 },
    { key: 'startDate', header: 'Start Date', width: 15 },
  ];
  projectsSheet.columns = projectsColumns;
  projectsSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  projectsSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC000' } };
  const projects = await db.getProjects();
  projects.forEach(p => projectsSheet.addRow(p));

  // Add deliveries sheet
  const deliveriesSheet = workbook.addWorksheet('Deliveries');
  const deliveriesColumns: ExportColumn[] = [
    { key: 'id', header: 'ID', width: 10 },
    { key: 'projectName', header: 'Project', width: 30 },
    { key: 'concreteType', header: 'Concrete Type', width: 20 },
    { key: 'volume', header: 'Volume (m³)', width: 15 },
    { key: 'scheduledTime', header: 'Scheduled Time', width: 20 },
    { key: 'status', header: 'Status', width: 15 },
    { key: 'driverName', header: 'Driver', width: 20 },
    { key: 'vehicleNumber', header: 'Vehicle', width: 15 },
  ];
  deliveriesSheet.columns = deliveriesColumns;
  deliveriesSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  deliveriesSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFED7D31' } };
  const deliveries = await db.getDeliveries();
  deliveries.forEach(d => deliveriesSheet.addRow(d));

  // Add timesheets sheet
  const timesheetsSheet = workbook.addWorksheet('Timesheets');
  const timesheetsColumns: ExportColumn[] = [
    { key: 'id', header: 'ID', width: 10 },
    { key: 'employeeId', header: 'Employee ID', width: 15 },
    { key: 'projectId', header: 'Project ID', width: 15 },
    { key: 'shiftDate', header: 'Date', width: 15 },
    { key: 'startTime', header: 'Start Time', width: 20 },
    { key: 'endTime', header: 'End Time', width: 20 },
    { key: 'breakDuration', header: 'Break (min)', width: 15 },
    { key: 'status', header: 'Status', width: 15 },
  ];
  timesheetsSheet.columns = timesheetsColumns;
  timesheetsSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  timesheetsSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF5B9BD5' } };
  const timesheets = await db.getAllShifts();
  timesheets.forEach(t => timesheetsSheet.addRow(t));

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

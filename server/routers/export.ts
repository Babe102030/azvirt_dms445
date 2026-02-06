import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import * as excelExport from "../services/excelExport";

export const exportRouter = router({
  /**
   * Export materials to Excel
   */
  materials: publicProcedure
    .input(
      z.object({
        columns: z.array(z.string()).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const buffer = await excelExport.exportMaterialsToExcel({
        columns: input.columns,
      });

      // Convert buffer to base64 for transmission
      return {
        data: buffer.toString("base64"),
        filename: `materials_${new Date().toISOString().split("T")[0]}.xlsx`,
        mimeType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      };
    }),

  /**
   * Export employees to Excel
   */
  employees: publicProcedure
    .input(
      z.object({
        columns: z.array(z.string()).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const buffer = await excelExport.exportEmployeesToExcel({
        columns: input.columns,
      });

      return {
        data: buffer.toString("base64"),
        filename: `employees_${new Date().toISOString().split("T")[0]}.xlsx`,
        mimeType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      };
    }),

  /**
   * Export projects to Excel
   */
  projects: publicProcedure
    .input(
      z.object({
        columns: z.array(z.string()).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const buffer = await excelExport.exportProjectsToExcel({
        columns: input.columns,
      });

      return {
        data: buffer.toString("base64"),
        filename: `projects_${new Date().toISOString().split("T")[0]}.xlsx`,
        mimeType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      };
    }),

  /**
   * Export deliveries to Excel
   */
  deliveries: publicProcedure
    .input(
      z.object({
        columns: z.array(z.string()).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const buffer = await excelExport.exportDeliveriesToExcel({
        columns: input.columns,
      });

      return {
        data: buffer.toString("base64"),
        filename: `deliveries_${new Date().toISOString().split("T")[0]}.xlsx`,
        mimeType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      };
    }),

  /**
   * Export timesheets to Excel
   */
  timesheets: publicProcedure
    .input(
      z.object({
        columns: z.array(z.string()).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const buffer = await excelExport.exportTimesheetsToExcel({
        columns: input.columns,
      });

      return {
        data: buffer.toString("base64"),
        filename: `timesheets_${new Date().toISOString().split("T")[0]}.xlsx`,
        mimeType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      };
    }),

  /**
   * Export all data to a single Excel file with multiple sheets
   */
  all: publicProcedure
    .input(z.record(z.string(), z.array(z.string())).optional())
    .mutation(async ({ input }) => {
      // Transform input simple array to ExportOptions object structure expected by service
      const options: Record<string, { columns: string[] }> = {};
      if (input) {
        Object.entries(input).forEach(([key, columns]) => {
          options[key] = { columns };
        });
      }

      const buffer = await excelExport.exportAllDataToExcel(options);

      return {
        data: buffer.toString("base64"),
        filename: `azvirt_dms_export_${new Date().toISOString().split("T")[0]}.xlsx`,
        mimeType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      };
    }),

  /**
   * Export quality tests to Excel
   */
  qualityTests: publicProcedure
    .input(
      z.object({
        columns: z.array(z.string()).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const buffer = await excelExport.exportQualityTestsToExcel({
        columns: input.columns,
      });
      return {
        data: buffer.toString("base64"),
        filename: `quality_tests_${new Date().toISOString().split("T")[0]}.xlsx`,
        mimeType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      };
    }),

  /**
   * Export purchase orders to Excel
   */
  purchaseOrders: publicProcedure
    .input(
      z.object({
        columns: z.array(z.string()).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const buffer = await excelExport.exportPurchaseOrdersToExcel({
        columns: input.columns,
      });
      return {
        data: buffer.toString("base64"),
        filename: `purchase_orders_${new Date().toISOString().split("T")[0]}.xlsx`,
        mimeType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      };
    }),

  /**
   * Get available columns for each export type
   */
  getAvailableColumns: publicProcedure
    .input(
      z.enum([
        "materials",
        "employees",
        "projects",
        "deliveries",
        "timesheets",
        "qualityTests",
        "purchaseOrders",
      ]),
    )
    .query(({ input }) => {
      const columnDefinitions: Record<
        string,
        Array<{ key: string; label: string }>
      > = {
        materials: [
          { key: "id", label: "ID" },
          { key: "name", label: "Material Name" },
          { key: "category", label: "Category" },
          { key: "unit", label: "Unit" },
          { key: "quantity", label: "Quantity" },
          { key: "minStock", label: "Min Stock" },
          { key: "criticalThreshold", label: "Critical Threshold" },
          { key: "supplier", label: "Supplier" },
          { key: "unitPrice", label: "Unit Price" },
          { key: "supplierEmail", label: "Supplier Email" },
          { key: "createdAt", label: "Created At" },
          { key: "updatedAt", label: "Updated At" },
        ],
        employees: [
          { key: "id", label: "ID" },
          { key: "firstName", label: "First Name" },
          { key: "lastName", label: "Last Name" },
          { key: "employeeNumber", label: "Employee Number" },
          { key: "position", label: "Position" },
          { key: "department", label: "Department" },
          { key: "phoneNumber", label: "Phone" },
          { key: "email", label: "Email" },
          { key: "hourlyRate", label: "Hourly Rate" },
          { key: "status", label: "Status" },
          { key: "hireDate", label: "Hire Date" },
          { key: "createdAt", label: "Created At" },
        ],
        projects: [
          { key: "id", label: "ID" },
          { key: "name", label: "Project Name" },
          { key: "location", label: "Location" },
          { key: "status", label: "Status" },
          { key: "startDate", label: "Start Date" },
          { key: "endDate", label: "End Date" },
          { key: "createdBy", label: "Created By" },
          { key: "createdAt", label: "Created At" },
        ],
        deliveries: [
          { key: "id", label: "ID" },
          { key: "projectId", label: "Project ID" },
          { key: "materialId", label: "Material ID" },
          { key: "quantity", label: "Quantity" },
          { key: "deliveryDate", label: "Delivery Date" },
          { key: "status", label: "Status" },
          { key: "supplier", label: "Supplier" },
          { key: "notes", label: "Notes" },
          { key: "createdAt", label: "Created At" },
        ],
        timesheets: [
          { key: "id", label: "ID" },
          { key: "employeeId", label: "Employee ID" },
          { key: "projectId", label: "Project ID" },
          { key: "date", label: "Date" },
          { key: "hoursWorked", label: "Hours Worked" },
          { key: "overtimeHours", label: "Overtime Hours" },
          { key: "breakMinutes", label: "Break Minutes" },
          { key: "status", label: "Status" },
          { key: "notes", label: "Notes" },
          { key: "createdAt", label: "Created At" },
        ],
        qualityTests: [
          { key: "id", label: "ID" },
          { key: "testName", label: "Test Name" },
          { key: "testType", label: "Test Type" },
          { key: "result", label: "Result" },
          { key: "unit", label: "Unit" },
          { key: "status", label: "Status" },
          { key: "testedBy", label: "Tested By" },
          { key: "createdAt", label: "Date" },
        ],
        purchaseOrders: [
          { key: "id", header: "PO #" },
          { key: "materialName", header: "Material" },
          { key: "quantity", header: "Quantity" },
          { key: "supplier", header: "Supplier" },
          { key: "orderDate", header: "Order Date" },
          { key: "expectedDelivery", header: "Expected Delivery" },
          { key: "status", header: "Status" },
          { key: "totalCost", header: "Total Cost" },
        ],
      };

      return columnDefinitions[input];
    }),
});

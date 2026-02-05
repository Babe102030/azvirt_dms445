import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Calendar, FileDown, TrendingUp } from "lucide-react";
import { toast } from "sonner";

export default function TimesheetSummary() {
  const [reportType, setReportType] = useState<"weekly" | "monthly">("weekly");
  const [selectedEmployee, setSelectedEmployee] = useState<string>("all");
  const [weekStart, setWeekStart] = useState<string>(() => {
    const today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - today.getDay() + 1);
    return monday.toISOString().split("T")[0];
  });
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1);

  const { data: employees } = trpc.employees.list.useQuery({
    status: "active",
  });

  const { data: weeklySummary, isLoading: weeklyLoading } =
    trpc.timesheets.weeklySummary.useQuery(
      {
        employeeId:
          selectedEmployee !== "all" ? Number(selectedEmployee) : undefined,
        weekStart: new Date(weekStart),
      },
      { enabled: reportType === "weekly" },
    );

  const { data: monthlySummary, isLoading: monthlyLoading } =
    trpc.timesheets.monthlySummary.useQuery(
      {
        employeeId:
          selectedEmployee !== "all" ? Number(selectedEmployee) : undefined,
        year,
        month,
      },
      { enabled: reportType === "monthly" },
    );

  const isLoading = reportType === "weekly" ? weeklyLoading : monthlyLoading;
  const summaryData = reportType === "weekly" ? weeklySummary : monthlySummary;

  const exportToPDF = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Please allow popups to export PDF");
      return;
    }

    const title =
      reportType === "weekly"
        ? `Weekly Timesheet Summary - Week of ${new Date(weekStart).toLocaleDateString()}`
        : `Monthly Timesheet Summary - ${new Date(year, month - 1).toLocaleDateString("en-US", { month: "long", year: "numeric" })}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title}</title>
          <style>
            @page { size: A4 landscape; margin: 1cm; }
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
              background: white;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 30px;
              padding-bottom: 20px;
              border-bottom: 3px solid #FF6C0E;
            }
            .logo {
              font-size: 24px;
              font-weight: bold;
              color: #222;
            }
            .logo-accent {
              color: #FF6C0E;
            }
            h1 {
              font-size: 20px;
              color: #222;
              margin-bottom: 5px;
            }
            .subtitle {
              color: #666;
              font-size: 14px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
            }
            th {
              background: #FF6C0E;
              color: white;
              padding: 12px;
              text-align: left;
              font-weight: 600;
              font-size: 12px;
            }
            td {
              padding: 10px 12px;
              border-bottom: 1px solid #ddd;
              font-size: 11px;
            }
            tr:nth-child(even) {
              background: #f9f9f9;
            }
            .total-row {
              background: #FFF5F0 !important;
              font-weight: bold;
            }
            .footer {
              margin-top: 30px;
              padding-top: 20px;
              border-top: 2px solid #ddd;
              font-size: 10px;
              color: #666;
              text-align: center;
            }
            @media print {
              body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="logo"><span class="logo-accent">AZ</span>VIRT</div>
              <div class="subtitle">30 Years of Excellence</div>
            </div>
            <div style="text-align: right;">
              <h1>${title}</h1>
              <div class="subtitle">Generated: ${new Date().toLocaleString()}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Employee #</th                    ${reportType === "monthly" ? `<th>Department</th>` : ""}               <th>Days Worked</th>
                <th>Regular Hours</th>
                <th>Overtime Hours</th>
                <th>Weekend Hours</th>
                <th>Holiday Hours</th>
                <th>Total Hours</th>
                ${reportType === "monthly" ? "<th>Hourly Rate</th><th>Total Pay</th>" : ""}
              </tr>
            </thead>
            <tbody>
              ${
                (summaryData as unknown as any[])
                  ?.map((row: any) => {
                    const totalPay =
                      reportType === "monthly" &&
                      "hourlyRate" in row &&
                      row.hourlyRate
                        ? (row.regularHours || 0) * (row.hourlyRate as number) +
                          (row.overtimeHours || 0) *
                            (row.hourlyRate as number) *
                            1.5
                        : 0;

                    return `
                  <tr>
                    <td>${row.employeeName}</td>
                    <td>${row.employeeNumber}</td>
                    ${reportType === "monthly" ? `<td>${"department" in row ? row.department || "-" : "-"}</td>` : ""}
                    <td>${row.daysWorked || 0}</td>
                    <td>${(row.regularHours || 0).toFixed(1)}</td>
                    <td>${(row.overtimeHours || 0).toFixed(1)}</td>
                    <td>${(row.weekendHours || 0).toFixed(1)}</td>
                    <td>${(row.holidayHours || 0).toFixed(1)}</td>
                    <td><strong>${(row.totalHours || 0).toFixed(1)}</strong></td>
                    ${
                      reportType === "monthly"
                        ? `
                      <td>$${"hourlyRate" in row ? row.hourlyRate || 0 : 0}</td>
                      <td><strong>$${totalPay.toFixed(2)}</strong></td>
                    `
                        : ""
                    }
                  </tr>
                `;
                  })
                  .join("") ||
                "<tr><td colspan='10'>No data available</td></tr>"
              }
              ${
                summaryData && (summaryData as unknown as any[]).length > 1
                  ? `
                <tr class="total-row">
                  <td colspan="${reportType === "monthly" ? "3" : "2"}"><strong>TOTALS</strong></td>
                  <td><strong>${(summaryData as unknown as any[]).reduce((sum: any, row: any) => sum + (row.daysWorked || 0), 0)}</strong></td>
                  <td><strong>${(summaryData as unknown as any[]).reduce((sum: any, row: any) => sum + (row.regularHours || 0), 0).toFixed(1)}</strong></td>
                  <td><strong>${(summaryData as unknown as any[]).reduce((sum: any, row: any) => sum + (row.overtimeHours || 0), 0).toFixed(1)}</strong></td>
                  <td><strong>${(summaryData as unknown as any[]).reduce((sum: any, row: any) => sum + (row.weekendHours || 0), 0).toFixed(1)}</strong></td>
                  <td><strong>${(summaryData as unknown as any[]).reduce((sum: any, row: any) => sum + (row.holidayHours || 0), 0).toFixed(1)}</strong></td>
                  <td><strong>${(summaryData as unknown as any[]).reduce((sum: any, row: any) => sum + (row.totalHours || 0), 0).toFixed(1)}</strong></td>
                  ${
                    reportType === "monthly"
                      ? `
                    <td></td>
                    <td><strong>$${(summaryData as unknown as any[])
                      .reduce((sum: any, row: any) => {
                        const pay =
                          "hourlyRate" in row && row.hourlyRate
                            ? (row.regularHours || 0) *
                                (row.hourlyRate as number) +
                              (row.overtimeHours || 0) *
                                (row.hourlyRate as number) *
                                1.5
                            : 0;
                        return sum + pay;
                      }, 0)
                      .toFixed(2)}</strong></td>
                  `
                      : ""
                  }
                </tr>
              `
                  : ""
              }
            </tbody>
          </table>

          <div class="footer">
            <p>AzVirt Document Management System | Concrete & Construction Management</p>
            <p>This is an automatically generated report. All hours shown are approved hours only.</p>
          </div>

          <script>
            window.onload = function() {
              window.print();
              setTimeout(() => window.close(), 100);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <TrendingUp className="h-8 w-8 text-primary" />
            Timesheet Summary
          </h1>
          <p className="text-muted-foreground mt-1">
            View aggregated timesheet reports with overtime calculations
          </p>
        </div>
        <Button
          onClick={exportToPDF}
          disabled={
            !summaryData || (summaryData as unknown as any[]).length === 0
          }
        >
          <FileDown className="mr-2 h-4 w-4" />
          Export to PDF
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-6 border-l-4 border-l-primary">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label>Report Type</Label>
            <Select
              value={reportType}
              onValueChange={(val) =>
                setReportType(val as "weekly" | "monthly")
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Weekly Summary</SelectItem>
                <SelectItem value="monthly">Monthly Summary</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Employee</Label>
            <Select
              value={selectedEmployee}
              onValueChange={setSelectedEmployee}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Employees</SelectItem>
                {employees?.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id.toString()}>
                    {emp.firstName} {emp.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {reportType === "weekly" ? (
            <div className="space-y-2">
              <Label>Week Starting</Label>
              <Input
                type="date"
                value={weekStart}
                onChange={(e) => setWeekStart(e.target.value)}
              />
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Year</Label>
                <Input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  min="2020"
                  max="2030"
                />
              </div>
              <div className="space-y-2">
                <Label>Month</Label>
                <Select
                  value={month.toString()}
                  onValueChange={(val) => setMonth(Number(val))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <SelectItem key={m} value={m.toString()}>
                        {new Date(2024, m - 1).toLocaleDateString("en-US", {
                          month: "long",
                        })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </div>
      </Card>

      {/* Summary Table */}
      <Card className="border-l-4 border-l-primary">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Employee</TableHead>
              <TableHead>Employee #</TableHead>
              {reportType === "monthly" && <TableHead>Department</TableHead>}
              <TableHead>Days Worked</TableHead>
              <TableHead>Regular Hours</TableHead>
              <TableHead>Overtime Hours</TableHead>
              <TableHead>Weekend Hours</TableHead>
              <TableHead>Holiday Hours</TableHead>
              <TableHead>Total Hours</TableHead>
              {reportType === "monthly" && (
                <>
                  <TableHead>Hourly Rate</TableHead>
                  <TableHead>Total Pay</TableHead>
                </>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={reportType === "monthly" ? 11 : 9}
                  className="text-center py-8 text-muted-foreground"
                >
                  Loading summary...
                </TableCell>
              </TableRow>
            ) : !summaryData ||
              (summaryData as unknown as any[]).length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={reportType === "monthly" ? 11 : 9}
                  className="text-center py-8 text-muted-foreground"
                >
                  No approved timesheet entries found for the selected period.
                </TableCell>
              </TableRow>
            ) : (
              <>
                {(summaryData as unknown as any[]).map((row: any) => {
                  const totalPay =
                    reportType === "monthly" &&
                    "hourlyRate" in row &&
                    row.hourlyRate
                      ? (row.regularHours || 0) * (row.hourlyRate as number) +
                        (row.overtimeHours || 0) *
                          (row.hourlyRate as number) *
                          1.5
                      : 0;

                  return (
                    <TableRow key={row.employeeId}>
                      <TableCell className="font-medium">
                        {row.employeeName}
                      </TableCell>
                      <TableCell>{row.employeeNumber}</TableCell>
                      {reportType === "monthly" && (
                        <TableCell>
                          {"department" in row
                            ? (row.department as string) || "-"
                            : "-"}
                        </TableCell>
                      )}
                      <TableCell>{row.daysWorked || 0}</TableCell>
                      <TableCell>
                        {(row.regularHours || 0).toFixed(1)}
                      </TableCell>
                      <TableCell>
                        {(row.overtimeHours || 0).toFixed(1)}
                      </TableCell>
                      <TableCell>
                        {(row.weekendHours || 0).toFixed(1)}
                      </TableCell>
                      <TableCell>
                        {(row.holidayHours || 0).toFixed(1)}
                      </TableCell>
                      <TableCell className="font-bold">
                        {(row.totalHours || 0).toFixed(1)}
                      </TableCell>
                      {reportType === "monthly" && (
                        <>
                          <TableCell>
                            $
                            {"hourlyRate" in row && row.hourlyRate
                              ? (row.hourlyRate as number)
                              : 0}
                          </TableCell>
                          <TableCell className="font-bold">
                            ${totalPay.toFixed(2)}
                          </TableCell>
                        </>
                      )}
                    </TableRow>
                  );
                })}
                {(summaryData as unknown as any[]).length > 1 && (
                  <TableRow className="bg-primary/10 font-bold">
                    <TableCell colSpan={reportType === "monthly" ? 3 : 2}>
                      TOTALS
                    </TableCell>
                    <TableCell>
                      {(summaryData as unknown as any[]).reduce(
                        (sum: any, row: any) => sum + (row.daysWorked || 0),
                        0,
                      )}
                    </TableCell>
                    <TableCell>
                      {(summaryData as unknown as any[])
                        .reduce(
                          (sum: any, row: any) => sum + (row.regularHours || 0),
                          0,
                        )
                        .toFixed(1)}
                    </TableCell>
                    <TableCell>
                      {(summaryData as unknown as any[])
                        .reduce(
                          (sum: any, row: any) =>
                            sum + (row.overtimeHours || 0),
                          0,
                        )
                        .toFixed(1)}
                    </TableCell>
                    <TableCell>
                      {(summaryData as unknown as any[])
                        .reduce(
                          (sum: any, row: any) => sum + (row.weekendHours || 0),
                          0,
                        )
                        .toFixed(1)}
                    </TableCell>
                    <TableCell>
                      {(summaryData as unknown as any[])
                        .reduce(
                          (sum: any, row: any) => sum + (row.holidayHours || 0),
                          0,
                        )
                        .toFixed(1)}
                    </TableCell>
                    <TableCell>
                      {(summaryData as unknown as any[])
                        .reduce(
                          (sum: any, row: any) => sum + (row.totalHours || 0),
                          0,
                        )
                        .toFixed(1)}
                    </TableCell>
                    {reportType === "monthly" && (
                      <>
                        <TableCell></TableCell>
                        <TableCell>
                          $
                          {(summaryData as unknown as any[])
                            .reduce((sum: any, row: any) => {
                              const pay =
                                "hourlyRate" in row && row.hourlyRate
                                  ? (row.regularHours || 0) *
                                      (row.hourlyRate as number) +
                                    (row.overtimeHours || 0) *
                                      (row.hourlyRate as number) *
                                      1.5
                                  : 0;
                              return sum + pay;
                            }, 0)
                            .toFixed(2)}
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                )}
              </>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Summary Cards */}
      {summaryData && (summaryData as unknown as any[]).length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4 border-l-4 border-l-primary">
            <div className="flex items-center gap-3">
              <Calendar className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total Employees</p>
                <p className="text-2xl font-bold">
                  {(summaryData as unknown as any[]).length}
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-4 border-l-4 border-l-primary">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total Hours</p>
                <p className="text-2xl font-bold">
                  {(summaryData as unknown as any[])
                    .reduce(
                      (sum: any, row: any) => sum + (row.totalHours || 0),
                      0,
                    )
                    .toFixed(1)}
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-4 border-l-4 border-l-primary">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Overtime Hours</p>
                <p className="text-2xl font-bold">
                  {(summaryData as unknown as any[])
                    .reduce(
                      (sum: any, row: any) => sum + (row.overtimeHours || 0),
                      0,
                    )
                    .toFixed(1)}
                </p>
              </div>
            </div>
          </Card>
          {reportType === "monthly" && (
            <Card className="p-4 border-l-4 border-l-primary">
              <div className="flex items-center gap-3">
                <FileDown className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Payroll</p>
                  <p className="text-2xl font-bold">
                    $
                    {(summaryData as unknown as any[])
                      .reduce((sum: any, row: any) => {
                        const pay =
                          "hourlyRate" in row && row.hourlyRate
                            ? (row.regularHours || 0) *
                                (row.hourlyRate as number) +
                              (row.overtimeHours || 0) *
                                (row.hourlyRate as number) *
                                1.5
                            : 0;
                        return sum + pay;
                      }, 0)
                      .toFixed(2)}
                  </p>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

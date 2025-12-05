import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Printer, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface MaintenanceRecord {
  id: number;
  machineId: number;
  maintenanceType: "lubrication" | "fuel" | "repair" | "inspection";
  description: string;
  cost?: number;
  date: Date;
  nextDueDate?: Date;
}

interface Machine {
  id: number;
  name: string;
  type: string;
  model: string;
  serialNumber: string;
  purchaseDate: Date;
  lastMaintenanceDate?: Date;
  nextMaintenanceDate?: Date;
  baseId: number;
}

interface MaintenanceReportProps {
  machine: Machine;
  records: MaintenanceRecord[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function MaintenanceReport({
  machine,
  records,
  open,
  onOpenChange,
}: MaintenanceReportProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    if (contentRef.current) {
      const printWindow = window.open("", "", "width=800,height=600");
      if (printWindow) {
        printWindow.document.write(contentRef.current.innerHTML);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  const totalCost = records.reduce((sum, record) => sum + (record.cost || 0), 0);
  const lubricationRecords = records.filter((r) => r.maintenanceType === "lubrication");
  const fuelRecords = records.filter((r) => r.maintenanceType === "fuel");
  const repairRecords = records.filter((r) => r.maintenanceType === "repair");
  const inspectionRecords = records.filter((r) => r.maintenanceType === "inspection");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white">
        <DialogHeader>
          <DialogTitle>Machine Maintenance Report</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 mb-4">
          <Button onClick={handlePrint} className="bg-orange-600 hover:bg-orange-700">
            <Printer className="mr-2 h-4 w-4" />
            Print Report
          </Button>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="ml-auto"
          >
            <X className="mr-2 h-4 w-4" />
            Close
          </Button>
        </div>

        <div
          ref={contentRef}
          className="print-content bg-white p-8 text-black"
          style={{ fontSize: "12px", fontFamily: "Arial, sans-serif" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6 border-b-2 border-orange-600 pb-4">
            <div>
              <img src="/azvirt-logo.png" alt="AzVirt" style={{ height: "50px" }} />
            </div>
            <div className="text-center">
              <h1 style={{ fontSize: "20px", fontWeight: "bold", margin: "0" }}>
                MACHINE MAINTENANCE REPORT
              </h1>
              <p style={{ margin: "4px 0", color: "#666" }}>
                Report Date: {new Date().toLocaleDateString()}
              </p>
            </div>
            <div style={{ width: "100px" }}></div>
          </div>

          {/* Machine Information */}
          <div className="mb-6">
            <h2 style={{ fontSize: "14px", fontWeight: "bold", marginBottom: "8px" }}>
              MACHINE INFORMATION
            </h2>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <tbody>
                <tr style={{ borderBottom: "1px solid #ddd" }}>
                  <td style={{ padding: "6px", fontWeight: "bold", width: "25%" }}>
                    Machine Name:
                  </td>
                  <td style={{ padding: "6px" }}>{machine.name}</td>
                  <td style={{ padding: "6px", fontWeight: "bold", width: "25%" }}>
                    Type:
                  </td>
                  <td style={{ padding: "6px" }}>{machine.type}</td>
                </tr>
                <tr style={{ borderBottom: "1px solid #ddd" }}>
                  <td style={{ padding: "6px", fontWeight: "bold" }}>Model:</td>
                  <td style={{ padding: "6px" }}>{machine.model}</td>
                  <td style={{ padding: "6px", fontWeight: "bold" }}>Serial Number:</td>
                  <td style={{ padding: "6px" }}>{machine.serialNumber}</td>
                </tr>
                <tr style={{ borderBottom: "1px solid #ddd" }}>
                  <td style={{ padding: "6px", fontWeight: "bold" }}>Purchase Date:</td>
                  <td style={{ padding: "6px" }}>
                    {new Date(machine.purchaseDate).toLocaleDateString()}
                  </td>
                  <td style={{ padding: "6px", fontWeight: "bold" }}>
                    Last Maintenance:
                  </td>
                  <td style={{ padding: "6px" }}>
                    {machine.lastMaintenanceDate
                      ? new Date(machine.lastMaintenanceDate).toLocaleDateString()
                      : "N/A"}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: "6px", fontWeight: "bold" }}>
                    Next Maintenance:
                  </td>
                  <td style={{ padding: "6px" }}>
                    {machine.nextMaintenanceDate
                      ? new Date(machine.nextMaintenanceDate).toLocaleDateString()
                      : "N/A"}
                  </td>
                  <td style={{ padding: "6px", fontWeight: "bold" }}>Total Records:</td>
                  <td style={{ padding: "6px" }}>{records.length}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Lubrication Records */}
          {lubricationRecords.length > 0 && (
            <div className="mb-6">
              <h2 style={{ fontSize: "14px", fontWeight: "bold", marginBottom: "8px" }}>
                LUBRICATION RECORDS
              </h2>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ backgroundColor: "#FF6C0E", color: "white" }}>
                    <th style={{ padding: "6px", textAlign: "left" }}>Date</th>
                    <th style={{ padding: "6px", textAlign: "left" }}>Description</th>
                    <th style={{ padding: "6px", textAlign: "left" }}>Next Due</th>
                    <th style={{ padding: "6px", textAlign: "right" }}>Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {lubricationRecords.map((record) => (
                    <tr key={record.id} style={{ borderBottom: "1px solid #ddd" }}>
                      <td style={{ padding: "6px" }}>
                        {new Date(record.date).toLocaleDateString()}
                      </td>
                      <td style={{ padding: "6px" }}>{record.description}</td>
                      <td style={{ padding: "6px" }}>
                        {record.nextDueDate
                          ? new Date(record.nextDueDate).toLocaleDateString()
                          : "N/A"}
                      </td>
                      <td style={{ padding: "6px", textAlign: "right" }}>
                        ${record.cost?.toFixed(2) || "0.00"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Fuel Records */}
          {fuelRecords.length > 0 && (
            <div className="mb-6">
              <h2 style={{ fontSize: "14px", fontWeight: "bold", marginBottom: "8px" }}>
                FUEL RECORDS
              </h2>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ backgroundColor: "#FF6C0E", color: "white" }}>
                    <th style={{ padding: "6px", textAlign: "left" }}>Date</th>
                    <th style={{ padding: "6px", textAlign: "left" }}>Description</th>
                    <th style={{ padding: "6px", textAlign: "left" }}>Next Due</th>
                    <th style={{ padding: "6px", textAlign: "right" }}>Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {fuelRecords.map((record) => (
                    <tr key={record.id} style={{ borderBottom: "1px solid #ddd" }}>
                      <td style={{ padding: "6px" }}>
                        {new Date(record.date).toLocaleDateString()}
                      </td>
                      <td style={{ padding: "6px" }}>{record.description}</td>
                      <td style={{ padding: "6px" }}>
                        {record.nextDueDate
                          ? new Date(record.nextDueDate).toLocaleDateString()
                          : "N/A"}
                      </td>
                      <td style={{ padding: "6px", textAlign: "right" }}>
                        ${record.cost?.toFixed(2) || "0.00"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Repair Records */}
          {repairRecords.length > 0 && (
            <div className="mb-6">
              <h2 style={{ fontSize: "14px", fontWeight: "bold", marginBottom: "8px" }}>
                REPAIR RECORDS
              </h2>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ backgroundColor: "#FF6C0E", color: "white" }}>
                    <th style={{ padding: "6px", textAlign: "left" }}>Date</th>
                    <th style={{ padding: "6px", textAlign: "left" }}>Description</th>
                    <th style={{ padding: "6px", textAlign: "left" }}>Next Due</th>
                    <th style={{ padding: "6px", textAlign: "right" }}>Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {repairRecords.map((record) => (
                    <tr key={record.id} style={{ borderBottom: "1px solid #ddd" }}>
                      <td style={{ padding: "6px" }}>
                        {new Date(record.date).toLocaleDateString()}
                      </td>
                      <td style={{ padding: "6px" }}>{record.description}</td>
                      <td style={{ padding: "6px" }}>
                        {record.nextDueDate
                          ? new Date(record.nextDueDate).toLocaleDateString()
                          : "N/A"}
                      </td>
                      <td style={{ padding: "6px", textAlign: "right" }}>
                        ${record.cost?.toFixed(2) || "0.00"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Inspection Records */}
          {inspectionRecords.length > 0 && (
            <div className="mb-6">
              <h2 style={{ fontSize: "14px", fontWeight: "bold", marginBottom: "8px" }}>
                INSPECTION RECORDS
              </h2>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ backgroundColor: "#FF6C0E", color: "white" }}>
                    <th style={{ padding: "6px", textAlign: "left" }}>Date</th>
                    <th style={{ padding: "6px", textAlign: "left" }}>Description</th>
                    <th style={{ padding: "6px", textAlign: "left" }}>Next Due</th>
                    <th style={{ padding: "6px", textAlign: "right" }}>Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {inspectionRecords.map((record) => (
                    <tr key={record.id} style={{ borderBottom: "1px solid #ddd" }}>
                      <td style={{ padding: "6px" }}>
                        {new Date(record.date).toLocaleDateString()}
                      </td>
                      <td style={{ padding: "6px" }}>{record.description}</td>
                      <td style={{ padding: "6px" }}>
                        {record.nextDueDate
                          ? new Date(record.nextDueDate).toLocaleDateString()
                          : "N/A"}
                      </td>
                      <td style={{ padding: "6px", textAlign: "right" }}>
                        ${record.cost?.toFixed(2) || "0.00"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Summary */}
          <div className="mb-6 border-t-2 border-orange-600 pt-4">
            <h2 style={{ fontSize: "14px", fontWeight: "bold", marginBottom: "8px" }}>
              MAINTENANCE SUMMARY
            </h2>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <tbody>
                <tr style={{ borderBottom: "1px solid #ddd" }}>
                  <td style={{ padding: "6px", fontWeight: "bold" }}>
                    Total Lubrication Records:
                  </td>
                  <td style={{ padding: "6px" }}>{lubricationRecords.length}</td>
                  <td style={{ padding: "6px", fontWeight: "bold" }}>
                    Total Fuel Records:
                  </td>
                  <td style={{ padding: "6px" }}>{fuelRecords.length}</td>
                </tr>
                <tr style={{ borderBottom: "1px solid #ddd" }}>
                  <td style={{ padding: "6px", fontWeight: "bold" }}>
                    Total Repair Records:
                  </td>
                  <td style={{ padding: "6px" }}>{repairRecords.length}</td>
                  <td style={{ padding: "6px", fontWeight: "bold" }}>
                    Total Inspection Records:
                  </td>
                  <td style={{ padding: "6px" }}>{inspectionRecords.length}</td>
                </tr>
                <tr style={{ backgroundColor: "#FF6C0E", color: "white" }}>
                  <td style={{ padding: "8px", fontWeight: "bold" }}>TOTAL COST:</td>
                  <td style={{ padding: "8px", fontWeight: "bold", fontSize: "14px" }}>
                    ${totalCost.toFixed(2)}
                  </td>
                  <td></td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div style={{ marginTop: "20px", paddingTop: "12px", borderTop: "1px solid #ddd" }}>
            <p style={{ fontSize: "10px", color: "#666", margin: "0" }}>
              This is an official AzVirt maintenance report. For more information, contact your
              facility manager.
            </p>
            <p style={{ fontSize: "10px", color: "#666", margin: "4px 0 0 0" }}>
              Generated on {new Date().toLocaleString()}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

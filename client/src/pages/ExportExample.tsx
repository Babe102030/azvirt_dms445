import * as React from "react";
import { ExportDialog } from "@/components/export/ExportDialog";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Example data type
interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
  lastLogin: string;
}

// Example data
const MOCK_USERS: User[] = [
  { id: 1, name: "John Doe", email: "john@example.com", role: "Admin", status: "Active", lastLogin: "2023-10-01" },
  { id: 2, name: "Jane Smith", email: "jane@example.com", role: "Manager", status: "Active", lastLogin: "2023-10-05" },
  { id: 3, name: "Bob Johnson", email: "bob@example.com", role: "User", status: "Inactive", lastLogin: "2023-09-20" },
  { id: 4, name: "Alice Brown", email: "alice@example.com", role: "Editor", status: "Active", lastLogin: "2023-10-10" },
];

// Define columns for export
const EXPORT_COLUMNS = [
  { header: "User ID", key: "id" },
  { header: "Full Name", key: "name" },
  { header: "Email Address", key: "email" },
  { header: "Role", key: "role" },
  { header: "Account Status", key: "status" },
  { header: "Last Login Date", key: "lastLogin" },
];

export default function ExportExample() {
  const [isExportOpen, setIsExportOpen] = React.useState(false);

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">Manage your team and export directory data.</p>
        </div>
        <Button onClick={() => setIsExportOpen(true)} className="flex items-center gap-2">
          <Download className="size-4" />
          Export Directory
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MOCK_USERS.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.role}</TableCell>
                  <TableCell>{user.status}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/*
        Reusable Export Dialog Component
        - Pass any array of data
        - Pass column definitions (header + key)
        - Control visibility with isOpen/onClose
      */}
      <ExportDialog
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        data={MOCK_USERS}
        columns={EXPORT_COLUMNS}
        filenamePrefix="user_directory"
      />

      <div className="mt-12 bg-muted p-6 rounded-lg border">
        <h3 className="text-lg font-semibold mb-2">Architectural Summary</h3>
        <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
          <li><strong>Loose Coupling:</strong> The dialog doesn't know about 'Users', it only knows about generic 'T[]' and 'ExportColumn[]'.</li>
          <li><strong>UX:</strong> Users can drag to reorder columns and toggle visibility before generating the file.</li>
          <li><strong>Performance:</strong> Large datasets are processed asynchronously via a timeout-wrapped promise to maintain UI responsiveness.</li>
          <li><strong>Type Safety:</strong> TypeScript generics ensure that column keys match properties available on the data objects.</li>
        </ul>
      </div>
    </div>
  );
}

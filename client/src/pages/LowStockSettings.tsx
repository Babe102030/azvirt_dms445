import React, { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Bell, Save, Search, AlertTriangle, Info, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function LowStockSettings() {
  const [search, setSearch] = useState("");
  const [editedThresholds, setEditedThresholds] = useState<Record<number, { minStock: number; criticalThreshold: number }>>({});

  // Fetch materials list
  const { data: materials, isLoading, refetch } = trpc.materials.list.useQuery();

  // Mutation for updating material thresholds
  const updateMutation = trpc.materials.update.useMutation({
    onSuccess: () => {
      toast.success("Stock thresholds updated successfully");
      setEditedThresholds({});
      refetch();
    },
    onError: (err) => toast.error(`Failed to update thresholds: ${err.message}`)
  });

  const handleThresholdChange = (id: number, field: 'minStock' | 'criticalThreshold', value: string) => {
    const numValue = parseInt(value) || 0;
    const current = materials?.find(m => m.id === id);
    if (!current) return;

    setEditedThresholds(prev => ({
      ...prev,
      [id]: {
        minStock: field === 'minStock' ? numValue : (prev[id]?.minStock ?? current.minStock ?? 0),
        criticalThreshold: field === 'criticalThreshold' ? numValue : (prev[id]?.criticalThreshold ?? current.criticalThreshold ?? 0)
      }
    }));
  };

  const handleSave = async (id: number) => {
    const edits = editedThresholds[id];
    if (!edits) return;

    updateMutation.mutate({
      id,
      minStock: edits.minStock,
      criticalThreshold: edits.criticalThreshold
    });
  };

  const filteredMaterials = materials?.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Bell className="h-8 w-8 text-primary" />
              Low-Stock Alert Settings
            </h1>
            <p className="text-muted-foreground mt-1">
              Configure inventory thresholds to trigger automated alerts and SMS notifications
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Settings Table */}
          <Card className="lg:col-span-2 border-l-4 border-l-primary shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-4">
                <CardTitle className="text-lg">Material Thresholds</CardTitle>
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search materials..."
                    className="pl-8"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Material</TableHead>
                      <TableHead>In Stock</TableHead>
                      <TableHead>Low Stock Min</TableHead>
                      <TableHead>Critical Alert</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-12">
                          <div className="flex flex-col items-center gap-2">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <span className="text-muted-foreground">Loading inventory data...</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : filteredMaterials?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                          No materials match your search.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredMaterials?.map((m) => {
                        const isEdited = !!editedThresholds[m.id];
                        const minStock = editedThresholds[m.id]?.minStock ?? m.minStock ?? 0;
                        const criticalThreshold = editedThresholds[m.id]?.criticalThreshold ?? m.criticalThreshold ?? 0;
                        const isSavingThis = updateMutation.isPending && updateMutation.variables?.id === m.id;

                        return (
                          <TableRow key={m.id} className={isEdited ? "bg-primary/5" : ""}>
                            <TableCell>
                              <div className="font-medium">{m.name}</div>
                              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{m.category}</div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={m.quantity <= (m.minStock ?? 0) ? "destructive" : "outline"} className="font-mono">
                                {m.quantity} {m.unit}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  className="w-20 h-8"
                                  value={minStock}
                                  onChange={(e) => handleThresholdChange(m.id, 'minStock', e.target.value)}
                                />
                                <span className="text-[10px] text-muted-foreground font-medium">{m.unit}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  className="w-20 h-8 border-orange-200 focus-visible:ring-orange-200"
                                  value={criticalThreshold}
                                  onChange={(e) => handleThresholdChange(m.id, 'criticalThreshold', e.target.value)}
                                />
                                <span className="text-[10px] text-muted-foreground font-medium">{m.unit}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                variant={isEdited ? "default" : "ghost"}
                                disabled={!isEdited || updateMutation.isPending}
                                onClick={() => handleSave(m.id)}
                                className="h-8 px-3"
                              >
                                {isSavingThis ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <>
                                    <Save className="h-3 w-3 mr-1" />
                                    Update
                                  </>
                                )}
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Info Sidebar */}
          <div className="space-y-6">
            <Card className="bg-primary/5 border-primary/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Info className="h-4 w-4 text-primary" />
                  How Thresholds Work
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs space-y-4 text-muted-foreground leading-relaxed">
                <div>
                  <p className="font-semibold text-foreground mb-1">Low Stock Min:</p>
                  <p>When actual inventory falls below this value:</p>
                  <ul className="list-disc list-inside mt-1 ml-1 space-y-1">
                    <li>Material is flagged in the dashboard</li>
                    <li>Included in daily 7:00 AM summary emails</li>
                    <li>Status badges turn yellow/red</li>
                  </ul>
                </div>
                <div>
                  <p className="font-semibold text-foreground mb-1">Critical Threshold:</p>
                  <p>When quantity falls below this critical level:</p>
                  <ul className="list-disc list-inside mt-1 ml-1 space-y-1 text-orange-600 dark:text-orange-400">
                    <li>Immediate SMS alerts are sent to managers</li>
                    <li>High-priority system notifications generated</li>
                    <li>Urgent action required status</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  Alert Channels
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs space-y-4">
                <div className="p-3 bg-muted rounded-md">
                  <p className="font-medium mb-1">Email Summary</p>
                  <p className="text-muted-foreground">Sent every morning at 7:00 AM to all admin users with active email addresses.</p>
                </div>
                <div className="p-3 bg-muted rounded-md">
                  <p className="font-medium mb-1">SMS Real-time</p>
                  <p className="text-muted-foreground">Triggered instantly when inventory is deducted (e.g., via mixing logs) if it crosses the critical threshold.</p>
                </div>
                <div className="pt-2">
                  <Button variant="outline" className="w-full text-xs h-8" onClick={() => window.location.href='/settings'}>
                    Configure My SMS Settings
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="p-4 rounded-lg border border-dashed text-center">
               <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">System Job Status</p>
               <div className="mt-2 flex items-center justify-center gap-2 text-xs font-medium text-green-600">
                 <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                 Daily Stock Checker Active
               </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

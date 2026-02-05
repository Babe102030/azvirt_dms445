import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/contexts/LanguageContext";
import { CheckCircle2, XCircle, Clock, MessageSquare } from "lucide-react";

export default function TimesheetApproval() {
  const { t } = useLanguage();
  const [selectedTimesheet, setSelectedTimesheet] = useState<number | null>(
    null,
  );
  const [approvalComments, setApprovalComments] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  // Fetch pending timesheets for approval
  const {
    data: pendingTimesheets,
    isLoading,
    refetch,
  } = trpc.timesheetApprovals.getPendingForApproval.useQuery();

  // Mutations
  const approveMutation = trpc.timesheetApprovals.approve.useMutation({
    onSuccess: () => {
      setApprovalComments("");
      setSelectedTimesheet(null);
      refetch();
    },
  });

  const rejectMutation = trpc.timesheetApprovals.reject.useMutation({
    onSuccess: () => {
      setRejectionReason("");
      setSelectedTimesheet(null);
      refetch();
    },
  });

  const handleApprove = async (approvalId: number) => {
    setIsApproving(true);
    try {
      await approveMutation.mutateAsync({
        approvalId,
        comments: approvalComments || undefined,
      });
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async (approvalId: number) => {
    if (!rejectionReason.trim()) return;
    setIsRejecting(true);
    try {
      await rejectMutation.mutateAsync({
        approvalId,
        rejectionReason,
      });
    } finally {
      setIsRejecting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p>{t("common.loading")}</p>
        </div>
      </div>
    );
  }

  const pendingCount = pendingTimesheets?.length || 0;

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">
          {t("nav.timesheetApproval") || "Timesheet Approvals"}
        </h1>
        <p className="text-gray-600">
          {t("pages.timesheetApproval.description") ||
            "Review and approve employee timesheets"}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Pending Approval
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-500">
              {pendingCount}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Timesheets awaiting review
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Your Role
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">Manager</div>
            <p className="text-xs text-gray-500 mt-1">Approver</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Action Required
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-500">
              {pendingCount}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Items needing attention
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Pending Timesheets List */}
      {pendingCount === 0 ? (
        <Card>
          <CardContent className="pt-12 pb-12 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">All Caught Up!</h3>
            <p className="text-gray-600">No timesheets pending approval</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {pendingTimesheets?.map((item: any) => (
            <Card
              key={item.approval.id}
              className="hover:shadow-lg transition-shadow"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      {item.employee.name}
                    </CardTitle>
                    <CardDescription>
                      {new Date(item.shift.startTime).toLocaleDateString()} •{" "}
                      {item.shift.endTime
                        ? (
                            (new Date(item.shift.endTime).getTime() -
                              new Date(item.shift.startTime).getTime()) /
                            (1000 * 3600)
                          ).toFixed(1)
                        : "0"}{" "}
                      hours
                    </CardDescription>
                  </div>
                  <Badge
                    variant="outline"
                    className="bg-yellow-50 text-yellow-800 border-yellow-200"
                  >
                    <Clock className="h-3 w-3 mr-1" />
                    Pending
                  </Badge>
                </div>
              </CardHeader>

              <CardContent>
                {item.shift.notes && (
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-start gap-2">
                      <MessageSquare className="h-4 w-4 text-gray-600 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-gray-700">
                        {item.shift.notes}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  {/* Approve Dialog */}
                  <Dialog
                    open={
                      selectedTimesheet === item.approval.id && !isRejecting
                    }
                    onOpenChange={(open) => {
                      if (!open) {
                        setSelectedTimesheet(null);
                        setApprovalComments("");
                      }
                    }}
                  >
                    <DialogTrigger asChild>
                      <Button
                        onClick={() => setSelectedTimesheet(item.approval.id)}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Approve
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Approve Timesheet</DialogTitle>
                        <DialogDescription>
                          Approve timesheet for {item.employee.name} on{" "}
                          {new Date(item.shift.startTime).toLocaleDateString()}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">
                            Optional Comments
                          </label>
                          <Textarea
                            placeholder="Add any comments or notes..."
                            value={approvalComments}
                            onChange={(e) =>
                              setApprovalComments(e.target.value)
                            }
                            className="min-h-24"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleApprove(item.approval.id)}
                            disabled={isApproving}
                            className="flex-1 bg-green-600 hover:bg-green-700"
                          >
                            {isApproving ? "Approving..." : "Confirm Approval"}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => setSelectedTimesheet(null)}
                            disabled={isApproving}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>

                  {/* Reject Dialog */}
                  <Dialog
                    open={selectedTimesheet === item.approval.id && isRejecting}
                    onOpenChange={(open) => {
                      if (!open) {
                        setSelectedTimesheet(null);
                        setRejectionReason("");
                      }
                    }}
                  >
                    <DialogTrigger asChild>
                      <Button
                        onClick={() => {
                          setSelectedTimesheet(item.approval.id);
                          setIsRejecting(true);
                        }}
                        variant="outline"
                        className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Reject
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Reject Timesheet</DialogTitle>
                        <DialogDescription>
                          Provide a reason for rejecting this timesheet
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">
                            Rejection Reason *
                          </label>
                          <Textarea
                            placeholder="Explain why this timesheet is being rejected..."
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            className="min-h-24 border-red-200"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleReject(item.approval.id)}
                            disabled={isRejecting || !rejectionReason.trim()}
                            className="flex-1 bg-red-600 hover:bg-red-700"
                          >
                            {isRejecting ? "Rejecting..." : "Confirm Rejection"}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setSelectedTimesheet(null);
                              setIsRejecting(false);
                            }}
                            disabled={isRejecting}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

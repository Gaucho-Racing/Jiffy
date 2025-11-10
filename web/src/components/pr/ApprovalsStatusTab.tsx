import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit2 } from "lucide-react";
import { OutlineButton } from "@/components/ui/outline-button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  PurchaseRequest,
  PurchaseRequestApproval,
  ApprovalStatus,
  PurchaseRequestStatus,
  statusSteps,
  validStatusAdvancements,
} from "@/models/pr";
import { notify } from "@/lib/notify";
import { getAxiosErrorMessage } from "@/lib/axios-error-handler";
import { User } from "@/models/user";

interface ApprovalsStatusTabProps {
  currentUser: User;
  purchaseRequest: Partial<PurchaseRequest>;
  canApprove: boolean;
  canAdvance: boolean;
  onEditApproval: (
    approval: PurchaseRequestApproval,
    status: ApprovalStatus,
    note: string,
  ) => void;
  onAdvanceStatus: (
    nextStatus: PurchaseRequestStatus,
    note: string,
    finalCostCents: number,
  ) => Promise<void>;
}

export function ApprovalsStatusTab({
  currentUser,
  purchaseRequest,
  canAdvance,
  onEditApproval,
  onAdvanceStatus,
}: ApprovalsStatusTabProps) {
  const [showAdvanceDialog, setShowAdvanceDialog] = useState(false);
  const [advanceNote, setAdvanceNote] = useState("");
  const [finalCostCents, setFinalCostCents] = useState(0);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [approvalNote, setApprovalNote] = useState("");
  const [selectedApproval, setSelectedApproval] =
    useState<PurchaseRequestApproval | null>(null);
  const [selectedApprovalAction, setSelectedApprovalAction] =
    useState<ApprovalStatus | null>(null);
  const [isApproving, setIsApproving] = useState(false);

  const getApprovalStatusStyle = (approval: PurchaseRequestApproval) => {
    switch (approval.status) {
      case ApprovalStatus.ApprovalApproved:
        return "bg-green-600/70 border-green-600 text-green-100";
      case ApprovalStatus.ApprovalRejected:
        return "bg-red-600/50 border-red-600 text-red-100";
      case ApprovalStatus.ApprovalPending:
        return "bg-cyan-600/70 border-cyan-500/50 text-cyan-100";
      default:
        return "bg-gray-700/30 border-gray-800/50 text-gray-600";
    }
  };

  const getPurchaseRequestStatusStyle = (step: PurchaseRequestStatus) => {
    if (step === purchaseRequest.status) {
      switch (step) {
        case PurchaseRequestStatus.PurchaseRequestApproved:
          return "bg-green-600/70 border-green-600 text-green-100";
        case PurchaseRequestStatus.PurchaseRequestRejected:
          return "bg-red-600/50 border-red-600 text-red-100";
        case PurchaseRequestStatus.PurchaseRequestPending:
          return "bg-cyan-600/70 border-cyan-500/50 text-cyan-100";
        case PurchaseRequestStatus.PurchaseRequestOrdered:
          return "bg-blue-600/60 border-blue-600 text-white";
        case PurchaseRequestStatus.PurchaseRequestCollected:
          return "bg-gr-purple/60 border-gr-purple text-white";
        case PurchaseRequestStatus.PurchaseRequestReimbursed:
          return "bg-gr-pink/50 border-gr-pink text-white";
        default:
          return "bg-gray-400 text-white";
      }
    }
    return "bg-gray-700/30 border-gray-800/50 text-gray-600";
  };

  const handleAdvanceButton = () => {
    if (!purchaseRequest.status || !canAdvance) return;

    const next = validStatusAdvancements[purchaseRequest.status];
    if (next !== null) {
      setAdvanceNote("");
      setFinalCostCents(0);
      setShowAdvanceDialog(true);
    } else {
      notify.error("You cannot advance status from this state!");
    }
  };

  const handleAdvanceStatus = async () => {
    if (!purchaseRequest.status || !purchaseRequest.id) return;

    const nextStatus = validStatusAdvancements[purchaseRequest.status];
    if (!nextStatus) return;

    if (!advanceNote) {
      notify.error("Please add a note explaining this status change");
      return;
    }

    if (nextStatus === PurchaseRequestStatus.PurchaseRequestOrdered) {
      if (!finalCostCents || finalCostCents <= 0) {
        notify.error("Please enter the final cost of the order");
        return;
      }
    }

    setIsAdvancing(true);
    try {
      await onAdvanceStatus(nextStatus, advanceNote, finalCostCents);
      setShowAdvanceDialog(false);
    } finally {
      setIsAdvancing(false);
    }
  };

  const handleApprovalButton = (
    approval: PurchaseRequestApproval,
    action: ApprovalStatus,
  ) => {
    setSelectedApproval(approval);
    setSelectedApprovalAction(action);
    setApprovalNote(
      action === ApprovalStatus.ApprovalApproved ? "Looks good to me!" : "",
    );
    setShowApprovalDialog(true);
  };

  const handleApprovalSubmit = async () => {
    if (!approvalNote) {
      notify.error("Please add a note explaining your decision");
      return;
    }

    if (selectedApproval && selectedApprovalAction) {
      setIsApproving(true);
      try {
        onEditApproval(selectedApproval, selectedApprovalAction, approvalNote);
        setShowApprovalDialog(false);
        setApprovalNote("");
        setSelectedApproval(null);
        setSelectedApprovalAction(null);
      } catch (error: any) {
        notify.error(getAxiosErrorMessage(error) || "Failed to update approval status");
      } finally {
        setIsApproving(false);
      }
    }
  };

  return (
    <>
      <div className="mx-20 my-10">
        <div className="mb-12 flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-semibold">Current Status</h3>
          </div>
          {canAdvance && (
            <OutlineButton onClick={handleAdvanceButton}>
              Advance Status
            </OutlineButton>
          )}
        </div>

        <div className="mb-4 grid grid-cols-6 gap-2">
          {statusSteps.map((step) => (
            <div
              key={step}
              className={`overflow-hidden rounded-md border-2 py-1 text-center text-sm font-medium transition-colors ${getPurchaseRequestStatusStyle(step)}`}
            >
              {step}
            </div>
          ))}
        </div>

        <div>
          {purchaseRequest.approvals?.map((approval) => (
            <Card key={approval.id} className="mt-4">
              <CardHeader>
                <CardTitle>
                  <div className="flex items-center justify-between">
                    <p className="font-semibold">{approval.approver_group.name} Approval</p>
                    <p
                      className={`rounded-md border-2 px-4 py-0.5 text-sm font-medium ${getApprovalStatusStyle(approval)}`}
                    >
                      {approval.status}
                    </p>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">
                      {approval.user?.first_name
                        ? `Approved by: ${approval.user.first_name} ${approval.user.last_name}`
                        : null}
                    </span>
                    <span className="text-xs text-gray-400">
                      {approval.status !== ApprovalStatus.ApprovalPending
                        ? `Date: ${new Date(approval.updated_at).toLocaleString()}`
                        : null}
                    </span>
                  </div>

                    
                <div>
                  {((approval.approver_group.approvers?.some((approver) => approver.id === currentUser.id)) ?? false) &&
                    approval.status === ApprovalStatus.ApprovalPending && (
                      <div className="flex space-x-2 justify-end">
                        <Button
                          variant="outline"
                          onClick={() =>
                            handleApprovalButton(
                              approval,
                              ApprovalStatus.ApprovalApproved,
                            )
                          }
                          className="flex items-center py-5"
                        >
                          <Edit2 className="mr-2 h-4 w-4" />
                          Approve
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() =>
                            handleApprovalButton(
                              approval,
                              ApprovalStatus.ApprovalRejected,
                            )
                          }
                          className="flex items-center py-5"
                        >
                          <Edit2 className="mr-2 h-4 w-4" />
                          Reject
                        </Button>
                      </div>
                    )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <AlertDialog open={showAdvanceDialog} onOpenChange={setShowAdvanceDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Status Advancement</AlertDialogTitle>
            <AlertDialogDescription>
              <div>
                <p className="text-white">
                  You are advancing the status from{" "}
                  <span className="font-semibold">
                    {purchaseRequest.status}
                  </span>{" "}
                  to{" "}
                  <span className="font-semibold">
                    {purchaseRequest.status &&
                      validStatusAdvancements[purchaseRequest.status]}
                  </span>
                  ?
                </p>

                <p className="pt-4 text-red-500">
                  Upload a receipt photo after, or this may NOT be reimbursed.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            {purchaseRequest.status ===
              PurchaseRequestStatus.PurchaseRequestApproved && (
              <div>
                <Label htmlFor="final-cost" className="text-white">
                  Final Cost <span className="text-red-500">*</span>
                </Label>
                <div className="relative mt-2">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    $
                  </span>
                  <Input
                    id="final-cost"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={finalCostCents / 100}
                    onChange={(e) =>
                      setFinalCostCents(
                        Math.round(parseFloat(e.target.value) * 100),
                      )
                    }
                    className="pl-7"
                    required
                  />
                </div>
                {purchaseRequest.estimated_cost_cents && (
                  <p className="mt-1 text-xs text-gray-400">
                    Estimated cost: $
                    {(purchaseRequest.estimated_cost_cents / 100).toFixed(2)}
                  </p>
                )}
              </div>
            )}
            <div>
              <Label htmlFor="advance-note" className="text-white">
                Note <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="advance-note"
                placeholder="Add a note explaining this status change"
                value={advanceNote}
                onChange={(e) => setAdvanceNote(e.target.value)}
                className="mt-2"
                rows={3}
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isAdvancing}>Cancel</AlertDialogCancel>
            <Button onClick={handleAdvanceStatus} disabled={isAdvancing}>
              {isAdvancing ? "Loading..." : "Proceed"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={showApprovalDialog}
        onOpenChange={setShowApprovalDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selectedApprovalAction === ApprovalStatus.ApprovalApproved
                ? "Approve Request"
                : "Reject Request"}{" "}
              - ({selectedApproval?.approver_group.name})
            </AlertDialogTitle>
            <AlertDialogDescription>
              <div>
                <p className="text-white">
                  {selectedApprovalAction === ApprovalStatus.ApprovalApproved
                    ? "Are you sure you want to approve this for ordering and reimbursement? You cannot undo this action."
                    : "This will be sent back for amendment. Please explain how it can be amended for approval. You cannot undo this action."}
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="approval-note" className="text-white">
                Note <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="approval-note"
                placeholder={
                  selectedApprovalAction === ApprovalStatus.ApprovalApproved
                    ? "Add a note explaining your approval"
                    : "Add a note explaining your rejection"
                }
                value={approvalNote}
                onChange={(e) => setApprovalNote(e.target.value)}
                className="mt-2"
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isApproving}>Cancel</AlertDialogCancel>
            <Button
              onClick={handleApprovalSubmit}
              disabled={isApproving}
              variant={
                selectedApprovalAction === ApprovalStatus.ApprovalRejected
                  ? "destructive"
                  : "default"
              }
            >
              {isApproving
                ? "Loading..."
                : selectedApprovalAction === ApprovalStatus.ApprovalApproved
                  ? "Approve"
                  : "Reject"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

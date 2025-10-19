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
  Approval,
  ApprovalStatus,
  PurchaseRequestStatus,
  statusSteps,
  validStatusAdvancements,
} from "@/models/pr";
import { JIFFY_API_URL } from "@/consts/config";
import { notify } from "@/lib/notify";
import { getAxiosErrorMessage } from "@/lib/axios-error-handler";
import axios from "axios";

interface ApprovalsStatusTabProps {
  purchaseRequest: Partial<PurchaseRequest>;
  canApprove: boolean;
  canAdvance: boolean;
  onEditApproval: (approval: Approval, status: ApprovalStatus) => void;
  onAdvanceStatus: (updatedPR: PurchaseRequest) => void;
  getApprovalStatusStyle: (approval: Approval) => string;
  getPurchaseRequestStatusStyle: (step: PurchaseRequestStatus) => string;
}

export function ApprovalsStatusTab({
  purchaseRequest,
  canApprove,
  canAdvance,
  onEditApproval,
  onAdvanceStatus,
  getApprovalStatusStyle,
  getPurchaseRequestStatusStyle,
}: ApprovalsStatusTabProps) {
  const [showAdvanceDialog, setShowAdvanceDialog] = useState(false);
  const [advanceNote, setAdvanceNote] = useState("");
  const [finalCostCents, setFinalCostCents] = useState(0);

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

    try {
      await axios.patch(
        `${JIFFY_API_URL}/purchaserequests/${purchaseRequest.id}/status`,
        {
          status: nextStatus,
          note: advanceNote,
          final_cost_cents: finalCostCents,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("sentinel_access_token")}`,
          },
        },
      );

      const prResponse = await axios.get(
        `${JIFFY_API_URL}/purchaserequests/${purchaseRequest.id}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("sentinel_access_token")}`,
          },
        },
      );

      onAdvanceStatus(prResponse.data);
      setShowAdvanceDialog(false);
    } catch (error: any) {
      notify.error(getAxiosErrorMessage(error) || "Failed to advance status");
    }
  };

  return (
    <>
      <div className="mx-20 my-10">
        <div className="flex justify-between">
          <div className="mb-8">
            <h3>Current Status</h3>
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
              className={`overflow-hidden rounded-md px-4 py-1 text-center text-sm font-medium transition-colors ${getPurchaseRequestStatusStyle(step)}`}
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
                    <p className="font-semibold">{approval.type} Approval</p>
                    <p
                      className={`rounded-md px-4 py-2 text-sm font-medium ${getApprovalStatusStyle(approval)} ${
                        approval.status === ApprovalStatus.ApprovalApproved
                          ? "text-green-600"
                          : approval.status === ApprovalStatus.ApprovalRejected
                            ? "text-red-600"
                            : approval.status === ApprovalStatus.ApprovalPending
                              ? "text-cyan-600"
                              : "text-gray-600"
                      }`}
                    >
                      {approval.status}
                    </p>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <div>
                  <div className="mt-2 text-sm text-gray-100">
                    <p>
                      Approved by:{" "}
                      <span className="font-medium text-gray-100">
                        {approval.user?.first_name
                          ? `${approval.user.first_name} ${approval.user.last_name}`
                          : "Pending approval"}
                      </span>
                    </p>
                    <p>
                      Date:{" "}
                      <span className="font-medium text-gray-100">
                        {approval.status !== ApprovalStatus.ApprovalPending
                          ? new Date(approval.updated_at).toLocaleString()
                          : "N/A"}
                      </span>
                    </p>
                  </div>
                </div>
                <div>
                  {canApprove &&
                    approval.status === ApprovalStatus.ApprovalPending && (
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          onClick={() =>
                            onEditApproval(
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
                            onEditApproval(
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
            <AlertDialogTitle>Advance Purchase Request Status</AlertDialogTitle>
            <AlertDialogDescription>
              <div>
                <p className="text-white">
                  Are you sure you want to advance the status from{" "}
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
                {purchaseRequest.status ===
                  PurchaseRequestStatus.PurchaseRequestApproved && (
                  <p className="">
                    Please enter the actual final cost of the order.
                  </p>
                )}
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
                placeholder="Add a note explaining this status change..."
                value={advanceNote}
                onChange={(e) => setAdvanceNote(e.target.value)}
                className="mt-2"
                rows={3}
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button onClick={handleAdvanceStatus}>Proceed</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Edit2, AlertTriangle } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  PurchaseRequest,
  initPurchaseRequest,
  PurchaseRequestApproval,
  ApprovalStatus,
  PurchaseRequestStatus,
} from "@/models/pr";
import { Department } from "@/models/departments";
import { JIFFY_API_URL } from "@/consts/config";
import { notify } from "@/lib/notify";
import axios from "axios";
import { AuthLoading } from "@/components/AuthLoading";
import Header from "@/components/Header";
import { OutlineButton } from "@/components/ui/outline-button";
import Footer from "@/components/Footer";
import { useUser } from "@/lib/store";
import { checkCredentials } from "@/lib/auth";
import React from "react";
import { getAxiosErrorMessage } from "@/lib/axios-error-handler";
import { RequestDetailsTab } from "@/components/pr/RequestDetailsTab";
import { ApprovalsStatusTab } from "@/components/pr/ApprovalsStatusTab";
import { CheckoutScreenshotTab } from "@/components/pr/CheckoutScreenshotTab";
import { NotesTab } from "@/components/pr/NotesTab";

export default function PurchaseRequestDetailsPage() {
  const navigate = useNavigate();
  const currentUser = useUser();
  const id = useParams().id;
  const [purchaseRequest, setPurchaseRequest] =
    useState<Partial<PurchaseRequest>>(initPurchaseRequest);
  const [department, setDepartment] = useState<Department>();
  const [isLoading, setIsLoading] = useState(true);

  React.useEffect(() => {
    checkAuth().then(() => {});
  }, []);

  const checkAuth = async () => {
    const currentRoute = window.location.pathname + window.location.search;
    const status = await checkCredentials();
    if (status != 0) {
      if (currentRoute == "/") {
        navigate(`/auth/login`);
      } else {
        navigate(`/auth/login?route=${encodeURIComponent(currentRoute)}`);
      }
    }
  };

  const canApprove = () => {
    // rly need to change to (to add) custom approvers
    return (
      currentUser.roles.includes("d_admin") ||
      currentUser.roles.includes("d_officer") ||
      currentUser.roles.includes("d_lead")
    );
  };

  const canAdvance = () => {
    return purchaseRequest.user_id === currentUser.id || canApprove();
  };

  const canEdit = () => {
    return (
      purchaseRequest.user_id === currentUser.id &&
      (purchaseRequest.status ===
        PurchaseRequestStatus.PurchaseRequestPending ||
        purchaseRequest.status ===
          PurchaseRequestStatus.PurchaseRequestRejected)
    );
  };

  const advanceStatus = async (
    nextStatus: PurchaseRequestStatus,
    note: string,
    finalCostCents: number,
  ) => {
    if (!canAdvance()) {
      notify.error("You are not authorized to advance status");
      return;
    }
    try {
      await axios.patch(
        `${JIFFY_API_URL}/purchase-requests/${purchaseRequest.id}/status`,
        {
          status: nextStatus,
          note: note,
          final_cost_cents: finalCostCents,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("sentinel_access_token")}`,
          },
        },
      );

      const prResponse = await axios.get(
        `${JIFFY_API_URL}/purchase-requests/${id}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("sentinel_access_token")}`,
          },
        },
      );

      setPurchaseRequest(prResponse.data);
      notify.success(`Status advanced to ${nextStatus}`);
    } catch (error: any) {
      notify.error(getAxiosErrorMessage(error) || "Failed to advance status");
    }
  };

  const createNote = async (note: string) => {
    try {
      await axios.post(
        `${JIFFY_API_URL}/purchase-requests/${purchaseRequest.id}/notes`,
        {
          type: "Comment",
          note: note,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("sentinel_access_token")}`,
          },
        },
      );

      const prResponse = await axios.get(
        `${JIFFY_API_URL}/purchase-requests/${id}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("sentinel_access_token")}`,
          },
        },
      );
      setPurchaseRequest(prResponse.data);
      notify.success("Comment added!");
    } catch (error: any) {
      notify.error(getAxiosErrorMessage(error) || "Failed to create note");
    }
  };

  const editApproval = async (
    approval: PurchaseRequestApproval,
    status: ApprovalStatus,
    note: string,
  ) => {
    if (!canApprove()) {
      notify.error("You are not authorized to approve/reject this request");
      return;
    }
    try {
      await axios.patch(
        `${JIFFY_API_URL}/purchase-requests/${purchaseRequest?.id}/approvals/${approval.id}`,
        {
          status: status,
          note: note,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("sentinel_access_token")}`,
          },
        },
      );
      const prResponse = await axios.get(
        `${JIFFY_API_URL}/purchase-requests/${id}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("sentinel_access_token")}`,
          },
        },
      );
      setPurchaseRequest(prResponse.data);

      notify.success("Approval updated!");
    } catch (error: any) {
      notify.error(
        getAxiosErrorMessage(error) || "Failed to update approval status",
      );
    }
  };

  useEffect(() => {
    const fetchPurchaseRequest = async () => {
      try {
        const response = await axios.get(
          `${JIFFY_API_URL}/purchase-requests/${id}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("sentinel_access_token")}`,
            },
          },
        );
        const purchaseRequestData = response.data;
        setPurchaseRequest(purchaseRequestData);
      } catch (error: any) {
        notify.error(
          error.response?.data?.message || "Failed to fetch purchase request",
        );
        navigate("/");
      } finally {
        setIsLoading(false);
      }
    };
    fetchPurchaseRequest();
  }, [id, navigate]);

  useEffect(() => {
    if (!purchaseRequest.department_id) return;
    const fetchDepartment = async () => {
      try {
        const response = await axios.get(
          `${JIFFY_API_URL}/departments/${purchaseRequest.department_id}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("sentinel_access_token")}`,
            },
          },
        );
        setDepartment(response.data);
      } catch (error: any) {
        notify.error(
          error.response?.data?.message || "Failed to fetch department",
        );
      }
    };
    fetchDepartment();
  }, [purchaseRequest.department_id]);

  return (
    <>
      {currentUser.id == "" ? (
        <AuthLoading />
      ) : (
        <div className="flex flex-col justify-between">
          <Header />
          <div className="flex flex-col justify-start p-4 lg:px-32 lg:pt-16">
            <div className="flex flex-row items-center justify-between">
              <Button
                variant={"ghost"}
                onClick={() => navigate("/")}
                className="flex items-center"
              >
                <ArrowLeft className="mr-2 h-4 w-4 text-gray-400" />
                Back to home
              </Button>

              <div className="flex gap-2">
                {canEdit() && (
                  <Button
                    className="h-10 py-5"
                    size="default"
                    variant="outline"
                    onClick={() => navigate(`/pr/${id}/edit`)}
                  >
                    <Edit2 className="mr-2 h-4 w-4" />
                    Edit PR
                  </Button>
                )}
                <OutlineButton onClick={() => navigate("/pr/new")}>
                  <div className="flex items-center gap-2">
                    New Purchase Request
                  </div>
                </OutlineButton>
              </div>
            </div>
            {purchaseRequest.status ===
              PurchaseRequestStatus.PurchaseRequestRejected &&
              purchaseRequest.user_id === currentUser.id && (
                <div className="m-6">
                  <Card className="border-red-500 bg-black dark:bg-red-900/20">
                    <CardContent className="pt-6">
                      <div className="flex items-center space-x-3">
                        <AlertTriangle className="h-6 w-6 text-red-500" />
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-red-800 dark:text-red-200">
                            Purchase Request Rejected
                          </h3>
                          <p className="mt-1 text-sm text-red-600 dark:text-red-300">
                            This purchase request has been rejected. You can
                            edit and resubmit it for approval.
                          </p>
                        </div>
                        <Button
                          onClick={() => navigate(`/pr/${id}/edit`)}
                          className="bg-red-600 text-white hover:bg-red-700"
                        >
                          <Edit2 className="mr-2 h-4 w-4" />
                          Edit Request
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

            <div className="mx-5">
              <Tabs defaultValue="Request Details">
                <TabsList>
                  <TabsTrigger value="Request Details">
                    Request Details
                  </TabsTrigger>
                  <TabsTrigger value="Approvals and Status">
                    Approvals and Status
                  </TabsTrigger>
                  <TabsTrigger value="Checkout Screenshot">
                    Checkout Screenshot
                  </TabsTrigger>
                  <TabsTrigger value="Note History">Note History</TabsTrigger>
                </TabsList>
                <TabsContent value="Request Details">
                  <RequestDetailsTab
                    purchaseRequest={purchaseRequest}
                    department={department}
                    isLoading={isLoading}
                  />
                </TabsContent>
                <TabsContent value="Approvals and Status">
                  <ApprovalsStatusTab
                    purchaseRequest={purchaseRequest}
                    canApprove={canApprove()}
                    canAdvance={canAdvance()}
                    onEditApproval={editApproval}
                    onAdvanceStatus={advanceStatus}
                  />
                </TabsContent>
                <TabsContent value="Checkout Screenshot">
                  <CheckoutScreenshotTab />
                </TabsContent>
                <TabsContent value="Note History">
                  <NotesTab
                    purchaseRequest={purchaseRequest}
                    onCreateNote={createNote}
                  />
                </TabsContent>
              </Tabs>
            </div>
          </div>
          <Footer />
        </div>
      )}
    </>
  );
}

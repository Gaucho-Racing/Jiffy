import { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
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
import { RequestDetailsTab } from "@/pages/PurchaseRequestDetailsPageTabs/RequestDetailsTab";
import { ApprovalsStatusTab } from "@/pages/PurchaseRequestDetailsPageTabs/ApprovalsStatusTab";
import { AttachmentsTab } from "@/pages/PurchaseRequestDetailsPageTabs/AttachmentsTab";
import { NotesTab } from "@/pages/PurchaseRequestDetailsPageTabs/NotesTab";

export default function PurchaseRequestDetailsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentUser = useUser();
  const id = useParams().id;
  const [purchaseRequest, setPurchaseRequest] =
    useState<Partial<PurchaseRequest>>(initPurchaseRequest);
  const [department, setDepartment] = useState<Department>();
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("details");

  React.useEffect(() => {
    checkAuth().then(() => {});
  }, []);

  useEffect(() => {
    const hash = location.hash.replace("#", "");
    const validTabs = ["details", "approvals", "attachments", "notes"];

    if (hash && validTabs.includes(hash)) {
      setActiveTab(hash);
    }
    window.scrollTo(0, 0);
  }, [location.hash, location.pathname]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    navigate(`#${tab}`, { replace: true });
  };

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

  const canUpload = () => {
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

  const advanceStatus = async (
    nextStatus: PurchaseRequestStatus,
    note: string,
    finalCostCents?: number,
    reimbursementType?: string,
  ) => {
    if (!canAdvance()) {
      notify.error("You are not authorized to advance status");
      return;
    }
    try {
      // First PATCH field updates if provided
      const fieldUpdates: any = {};
      if (finalCostCents !== undefined && finalCostCents > 0) {
        fieldUpdates.final_cost_cents = finalCostCents;
      }
      if (reimbursementType) {
        fieldUpdates.reimbursement_type = reimbursementType;
      }

      // Only make PATCH call if we have fields to update
      if (Object.keys(fieldUpdates).length > 0) {
        await axios.patch(
          `${JIFFY_API_URL}/purchase-requests/${purchaseRequest.id}`,
          fieldUpdates,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("sentinel_access_token")}`,
            },
          },
        );
      }

      // Finally PATCH status change
      await axios.patch(
        `${JIFFY_API_URL}/purchase-requests/${purchaseRequest.id}/status`,
        {
          status: nextStatus,
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
      notify.success(`Status advanced to ${nextStatus}`);

      if (nextStatus === PurchaseRequestStatus.PurchaseRequestOrdered) {
        handleTabChange("attachments");
      }
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

  const uploadAttachment = async (
    file: File,
    type: string,
    description: string,
  ) => {
    if (!canUpload()) {
      notify.error("You are not authorized to upload attachments");
      return;
    }
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", type);
      formData.append("description", description);

      await axios.post(
        `${JIFFY_API_URL}/purchase-requests/${purchaseRequest.id}/attachments`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
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
      notify.success("Attachment uploaded successfully!");
    } catch (error: any) {
      notify.error(
        getAxiosErrorMessage(error) || "Failed to upload attachment",
      );
    }
  };

  useEffect(() => {
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
          <div className="flex flex-col justify-start p-4 lg:px-32 lg:pt-6">
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
                  <Card className="border-red-600">
                    <CardContent className="pt-6">
                      <div className="flex items-center space-x-6 pl-2">
                        <AlertTriangle className="h-8 w-8 text-red-600" />
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-red-600">
                            Purchase Request Rejected
                          </h3>
                          <p className="mt-1 text-sm text-red-600">
                            This purchase request has been rejected. You can
                            edit and resubmit it for approval.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

            <div>
              <Tabs value={activeTab} onValueChange={handleTabChange}>
                <TabsList>
                  <TabsTrigger value="details">Request Details</TabsTrigger>
                  <TabsTrigger value="approvals">
                    Approvals & Status
                  </TabsTrigger>
                  <TabsTrigger value="attachments">
                    Receipts & Attachments
                  </TabsTrigger>
                  <TabsTrigger value="notes">Activity & Note Log</TabsTrigger>
                </TabsList>
                <TabsContent value="details" className="min-h-[600px]">
                  <RequestDetailsTab
                    purchaseRequest={purchaseRequest}
                    department={department}
                    isLoading={isLoading}
                    onUpdate={fetchPurchaseRequest}
                    canAdvance={canAdvance()}
                  />
                </TabsContent>
                <TabsContent value="approvals" className="min-h-[600px]">
                  <ApprovalsStatusTab
                    currentUser={currentUser}
                    purchaseRequest={purchaseRequest}
                    canApprove={canApprove()}
                    canAdvance={canAdvance()}
                    onEditApproval={editApproval}
                    onAdvanceStatus={advanceStatus}
                  />
                </TabsContent>
                <TabsContent value="attachments" className="min-h-[600px]">
                  <AttachmentsTab
                    purchaseRequest={purchaseRequest}
                    onUploadAttachment={uploadAttachment}
                  />
                </TabsContent>
                <TabsContent value="notes" className="min-h-[600px]">
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

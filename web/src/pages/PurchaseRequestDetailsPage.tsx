import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Edit2, AlertTriangle } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  PurchaseRequest,
  initPurchaseRequest,
  Approval,
  ApprovalStatus,
  PurchaseRequestStatus,
  calculateItemTotalCents,
  calculateEstimatedCostCents,
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

export default function PurchaseRequestDetailsPage() {
  const navigate = useNavigate();
  const currentUser = useUser();
  const id = useParams().id;
  const [purchaseRequest, setPurchaseRequest] = useState<Partial<PurchaseRequest>>(initPurchaseRequest);
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

  const canApprove = () => { // rly need to change to (to add) custom approvers 
    return (
      currentUser.roles.includes("d_admin") ||
      currentUser.roles.includes("d_officer") ||
      currentUser.roles.includes("d_lead")
    );
  };

  const editApproval = async (approval: Approval, status: ApprovalStatus) => {
    if (!canApprove()) {
      notify.error("You are not authorized to approve/reject this request");
      return;
    }
    try {
      await axios.patch(
        `${JIFFY_API_URL}/approvals/${approval.id}`,
        {
          status: status,
          note: "", // need to do this
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("sentinel_access_token")}`,
          },
        },
      );
      const prResponse = await axios.get(
        `${JIFFY_API_URL}/purchaserequests/${id}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("sentinel_access_token")}`,
          },
        },
      );
      setPurchaseRequest(prResponse.data);

      notify.success("Approval status updated successfully!");
    } catch (error: any) {
      notify.error(
        getAxiosErrorMessage(error) || "Failed to update approval status",
      );
    }
  };


  const getApprovalStatusStyle = (approval: Approval) => {
    switch (approval.status) {
      case ApprovalStatus.ApprovalApproved:
        return "bg-green-600 text-white";
      case ApprovalStatus.ApprovalRejected:
        return "bg-red-600 text-white";
      case ApprovalStatus.ApprovalPending:
        return "bg-gray-900 text-white";
      default:
        return "bg-gray-400 text-white";
    }
  };

  useEffect(() => {
    const fetchPurchaseRequest = async () => {
      try {
        const response = await axios.get(
          `${JIFFY_API_URL}/purchaserequests/${id}`,
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

  const getPurchaseRequestStatusStyle = (step: PurchaseRequestStatus) => {
    if (step === purchaseRequest.status) {
      switch (step) {
        case PurchaseRequestStatus.PurchaseRequestApproved:
          return "bg-green-600 text-white";
        case PurchaseRequestStatus.PurchaseRequestRejected:
          return "bg-red-600 text-white";
        case PurchaseRequestStatus.PurchaseRequestPending:
          return "bg-cyan-600 text-white";
        case PurchaseRequestStatus.PurchaseRequestOrdered:
          return "bg-blue-600 text-white";
        case PurchaseRequestStatus.PurchaseRequestDelivered:
          return "bg-purple-600 text-white";
        case PurchaseRequestStatus.PurchaseRequestCollected:
          return "bg-yellow-500 text-white";
        default:
          return "bg-gray-400 text-white";
      }
    }
    return "bg-gray-800 text-gray-300";
  };

  const statusSteps = [
    PurchaseRequestStatus.PurchaseRequestRejected,
    PurchaseRequestStatus.PurchaseRequestPending,
    PurchaseRequestStatus.PurchaseRequestApproved,
    PurchaseRequestStatus.PurchaseRequestOrdered,
    PurchaseRequestStatus.PurchaseRequestDelivered,
    PurchaseRequestStatus.PurchaseRequestCollected,
  ];

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

              <OutlineButton onClick={() => navigate("/pr/new")}>
                <div className="flex items-center gap-2">
                  New Purchase Request
                </div>
              </OutlineButton>
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
                </TabsList>
                <TabsContent value="Request Details">
                  <div className="mx-4 my-10 mx-12 border-2 border-gray-800 rounded-lg p-8 pl-16 flex justify-start">
                    {isLoading ? (
                      <></>
                    ) : (
                      <div className="w-full space-y-8">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-y-10">
                          <div>
                            <p className="text-md mb-2 font-medium text-gray-400">Requester</p>
                            <div className="pl-8 text-md flex items-center">
                              <Avatar className="mr-4 h-12 w-12">
                                <AvatarImage src={purchaseRequest.user?.avatar_url} />
                                <AvatarFallback>CN</AvatarFallback>
                              </Avatar>
                              <div className="flex flex-col items-start justify-center">
                                <div>
                                  {purchaseRequest.user?.first_name} {purchaseRequest.user?.last_name}
                                </div>
                                <div className="text-gray-400">{purchaseRequest.user?.email}</div>
                              </div>
                            </div>
                          </div>
                          <div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-[auto_1fr] xl:gap-x-24 pt-2">
                                <p className="text-md font-medium text-gray-400">ID #</p>
                                <p className="text-md">{purchaseRequest.id}</p>
                                <p className="text-md font-medium text-gray-400">Date Requested</p>
                                <p className="text-md">{purchaseRequest.created_at
                                  ? new Date(purchaseRequest.created_at).toLocaleDateString()
                                  : ""}</p>
                                <p className="text-md font-medium text-gray-400">Status</p>
                                <p className="text-md">{purchaseRequest.status}</p>
                              </div>
                          </div>

                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-y-10">
                             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-[auto_1fr] lg:gap-x-24">
                              <p className="text-md font-medium text-gray-400">Subteam </p>
                              <p className="text-md">{department?.name}</p>
                              <p className="text-md font-medium text-gray-400">Component </p>
                              <p className="text-md">{purchaseRequest.component}</p>
                              <p className="text-md font-medium text-gray-400">Vendor </p>
                              <p className="text-md">{purchaseRequest.vendor}</p>
                              <p className="text-md font-medium text-gray-400">Priority </p>
                              <p className="text-md">{purchaseRequest.priority}</p>
                              <p className="text-md font-medium text-gray-400">Needed By </p>
                              <p className="text-md">{purchaseRequest.needed_by_date
                                ? new Date(purchaseRequest.needed_by_date).toLocaleDateString()
                                : ""}</p>
                              <p className="text-md font-medium text-gray-400">Description </p>
                              <p className="text-md">{purchaseRequest.description}</p>

                            </div>
                          <div>
                             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-[auto_1fr] lg:gap-x-10">
                              <p className="text-md font-medium text-gray-400">Estimated Item Total </p>
                              <p className="text-md">
                                ${purchaseRequest.items
                                  ? (calculateEstimatedCostCents(purchaseRequest.items) / 100).toFixed(2)
                                  : "0.00"}
                              </p>
                              <p className="text-md font-medium text-gray-400">Estimated Shipping/Tax </p>
                              <p className="text-md">
                                ${purchaseRequest.shipping_tax_cost_cents
                                  ? (purchaseRequest.shipping_tax_cost_cents / 100).toFixed(2)
                                  : "0.00"}
                              </p>
                              <p className="text-md font-medium text-gray-400">Estimated Cost </p>
                              <p className="text-md">
                                ${purchaseRequest.estimated_cost_cents
                                  ? (purchaseRequest.estimated_cost_cents / 100).toFixed(2)
                                  : "0.00"}
                              </p>
                              <p className="text-md font-medium text-gray-400">Who will order?</p>
                              <p className="text-md">{purchaseRequest.requested_purchaser}</p>
                              <p className="text-md font-medium text-gray-400">Final Price </p>
                              <p className="text-md">
                                {purchaseRequest.final_cost_cents && purchaseRequest.final_cost_cents > 0
                                  ? `$${(purchaseRequest.final_cost_cents / 100).toFixed(2)}`
                                  : ""}
                              </p>
                              <p className="text-md font-medium text-gray-400">Order Date</p>
                              <p className="text-md">{}</p>
                            </div>
                          </div>
                        </div>
                        <div>
                          <p className="mt-20 mb-2 text-md font-medium text-gray-400">
                            Items ({purchaseRequest.items?.length || 0})
                          </p>
                          <div className="grid grid-cols-1 gap-4 pb-2 sm:grid-cols-[1fr_6fr_4fr_4fr_4fr_12fr]">
                            <p className="text-sm font-medium text-gray-400"> </p>    
                            <p className="text-sm font-medium text-gray-400"> Item Name </p>    
                            <p className="text-sm font-medium text-gray-400"> Unit Price </p>    
                            <p className="text-sm font-medium text-gray-400"> Quantity </p>    
                            <p className="text-sm font-medium text-gray-400"> Item Total </p>    
                            <p className="text-sm font-medium text-gray-400"> URL </p>    
                          </div>
                          {purchaseRequest.items &&
                          purchaseRequest.items.length > 0 ? (
                            <div className="space-y-4">
                              {purchaseRequest.items.map((item, index) => (
                                <div
                                  key={item.id || index}
                                >
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_6fr_4fr_4fr_4fr_12fr]">
                                  <p className="text-sm font-medium text-gray-400">
                                    #{index + 1}
                                  </p>

                                  <p className="text-md text-white">
                                    {item.item_name || "N/A"}
                                  </p>

                                  <p className="text-md text-white">
                                    $
                                    {(
                                      (item.item_unit_price_cents || 0) /
                                      100
                                    ).toFixed(2)}
                                  </p>

                                  <p className="text-md text-white">
                                    {item.item_quantity || 0}
                                  </p>

                                  <p className="text-md text-white">
                                    $
                                    {(
                                      calculateItemTotalCents(item) / 100
                                    ).toFixed(2)}
                                  </p>
                                  <a
                                    href={item.item_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="break-all text-sm text-blue-400 underline"
                                  >
                                    {item.item_url}
                                  </a>
                                </div>
                                </div>
                              ))}

                              
                            </div>
                          ) : (
                            <div className="py-8 text-center text-gray-500">
                              <p>No items found for this purchase request.</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>
                <TabsContent value="Approvals and Status">
                  <div className="mx-20 my-10">
                    <div className="mb-4">
                      <h3>Current Status</h3>
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
                                <p className="font-semibold">
                                  {approval.type} Approval
                                </p>
                                <p
                                  className={`rounded-md px-4 py-2 text-sm font-medium ${getApprovalStatusStyle(approval)} ${
                                    approval.status ===
                                    ApprovalStatus.ApprovalApproved
                                      ? "text-green-600"
                                      : approval.status ===
                                          ApprovalStatus.ApprovalRejected
                                        ? "text-red-600"
                                        : approval.status ===
                                            ApprovalStatus.ApprovalPending
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
                                    {approval.status !==
                                    ApprovalStatus.ApprovalPending
                                      ? new Date(
                                          approval.updated_at,
                                        ).toLocaleString()
                                      : "N/A"}
                                  </span>
                                </p>
                              </div>
                            </div>
                            <div>
                              {canApprove() && (
                                <div className="flex space-x-2">
                                  <Button
                                    variant="outline"
                                    onClick={() =>
                                      editApproval(
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
                                      editApproval(
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
                </TabsContent>

                <TabsContent value="Checkout Screenshot"></TabsContent>
              </Tabs>
            </div>
          </div>
          <Footer />
        </div>
      )}
    </>
  );
}
 
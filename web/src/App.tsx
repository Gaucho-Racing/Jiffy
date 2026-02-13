import React from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { checkCredentials } from "@/lib/auth";
import Footer from "@/components/Footer";
import { AuthLoading } from "@/components/AuthLoading";
import { useUser } from "@/lib/store";
import Header from "./components/Header";
import { OutlineButton } from "./components/ui/outline-button";
import { JIFFY_API_URL } from "@/consts/config";
import axios from "axios";
import { notify } from "@/lib/notify";
import {
  PurchaseRequest,
  PurchaseRequestStatus,
} from "@/models/pr";
import { DataTable } from "@/components/data-table";

function App() {
  const navigate = useNavigate();
  const currentUser = useUser();
  const [purchaseRequests, setPurchaseRequests] = useState<PurchaseRequest[]>(
    [],
  );
  const [actionRequiredRequests, setActionRequiredRequests] = useState<
    PurchaseRequest[]
  >([]);

  React.useEffect(() => {
    checkAuth().then(() => {
      getPurchaseRequests();
      getActionRequiredRequests();
    });
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

  const getPurchaseRequests = async () => {
    try {
      const response = await axios.get(`${JIFFY_API_URL}/purchase-requests`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("sentinel_access_token")}`,
        },
      });
      const purchaseRequestData = response.data;
      setPurchaseRequests(
        Array.isArray(purchaseRequestData) ? purchaseRequestData : [],
      );
    } catch (error: any) {
      notify.error(
        error.response?.data?.message || "Failed to fetch purchase requests",
      );
    }
  };

  const getActionRequiredRequests = async () => {
    try {
      const response = await axios.get(
        `${JIFFY_API_URL}/purchase-requests/action-required`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("sentinel_access_token")}`,
          },
        },
      );
      const purchaseRequestData = response.data;
      setActionRequiredRequests(
        Array.isArray(purchaseRequestData) ? purchaseRequestData : [],
      );
    } catch (error: any) {
      notify.error(
        error.response?.data?.message ||
          "Failed to fetch action required requests",
      );
    }
  };


  return (
    <>
      {currentUser.id == "" ? (
        <AuthLoading />
      ) : (
        <div className="flex min-h-screen flex-col justify-between">
          <Header />
          <div className="flex min-h-screen flex-col justify-start p-4 lg:p-32 lg:pt-6">
            <div className=" place-self-end">
              <OutlineButton onClick={() => navigate("/pr/new")}>
                <div className="flex items-center gap-2">
                  New Purchase Request
                </div>
              </OutlineButton>
            </div>
            {actionRequiredRequests.length > 0 && (
              <>
                <div className="mt-8 mb-6">
                  <h2>Your Approval Is Required!</h2>
                </div>

                <DataTable data={actionRequiredRequests} />
              </>
            )}

            <div className="mb-6">
              <h2>All Purchase Requests</h2>
            </div>

            <DataTable data={purchaseRequests} />
          </div>
          <Footer />
        </div>
      )}
    </>
  );
}

export default App;

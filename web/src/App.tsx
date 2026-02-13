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
import { PurchaseRequest } from "@/models/pr";
import { DataTable } from "@/components/data-table";
import { AlertTriangle } from "lucide-react";

function App() {
  const navigate = useNavigate();
  const currentUser = useUser();
  const [purchaseRequests, setPurchaseRequests] = useState<PurchaseRequest[]>(
    [],
  );
  const [hasLoadedAllRequests, setHasLoadedAllRequests] = useState(false);
  const [actionRequiredRequests, setActionRequiredRequests] = useState<
    PurchaseRequest[]
  >([]);
  const [hasLoadedActionRequired, setHasLoadedActionRequired] = useState(false);
  const actionRequiredCount = actionRequiredRequests.length;

  const pulseDurationSeconds =
    actionRequiredCount > 0
      ? Math.max(0.4, 2.5 / (1 + actionRequiredCount * 0.2))
      : 2.5;

  React.useEffect(() => {
    const loadData = async () => {
      await checkAuth();
      await Promise.all([getPurchaseRequests(), getActionRequiredRequests()]);
    };

    loadData();
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
    } finally {
      setHasLoadedAllRequests(true);
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
    } finally {
      setHasLoadedActionRequired(true);
    }
  };

  return (
    <>
      {currentUser.id == "" ? (
        <AuthLoading />
      ) : (
        <div className="flex min-h-screen flex-col justify-between">
          <Header />
          <div className="mb-96 flex min-h-screen flex-col justify-start p-4 lg:p-32 lg:pt-6">
            <div className=" place-self-end">
              <OutlineButton onClick={() => navigate("/pr/new")}>
                <div className="flex items-center gap-2">
                  New Purchase Request
                </div>
              </OutlineButton>
            </div>
            {hasLoadedActionRequired && actionRequiredCount > 0 && (
              <div className="mb-12">
                <div className="mt-8">
                  <h2 className="inline-flex items-baseline gap-3">
                    <AlertTriangle
                      className="mx-1 h-10 w-10 translate-y-2.5 animate-pulse text-red-600"
                      style={{ animationDuration: `${pulseDurationSeconds}s` }}
                      aria-hidden="true"
                    />
                    <span className="inline-flex items-center gap-4 pb-12">
                      <span className="underline decoration-red-600">
                        Your Approval Is Required!
                      </span>
                      <span className="translate-y-1 text-sm font-normal italic">
                        (Approve or Reject these ASAP!)
                      </span>
                    </span>
                    <AlertTriangle
                      className="mx-1 h-10 w-10 translate-y-2.5 animate-pulse text-red-600"
                      style={{ animationDuration: `${pulseDurationSeconds}s` }}
                      aria-hidden="true"
                    />
                  </h2>
                </div>

                <DataTable data={actionRequiredRequests} />
              </div>
            )}

            {hasLoadedAllRequests && (
              <>
                <div className="mt-12 pb-12">
                  <h2 className="inline-flex items-baseline gap-4">
                    <span className="inline-flex items-center gap-4">
                      <span>All Purchase Requests</span>
                      <span className="translate-y-1 text-sm font-normal italic">
                        (Update your order status often to be reimbursed!)
                      </span>
                    </span>
                  </h2>
                </div>

                <DataTable data={purchaseRequests} />
              </>
            )}
          </div>
          <Footer />
        </div>
      )}
    </>
  );
}

export default App;

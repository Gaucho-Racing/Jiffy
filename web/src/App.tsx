import React from "react";
import { useState, useEffect } from "react";
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
import { columns, PurchaseRequest } from "@/models/pr";
import { DataTable } from "@/components/data-table";

function App() {
  const navigate = useNavigate();
  const currentUser = useUser();
  const [purchaseRequests, setPurchaseRequests] = useState<PurchaseRequest[]>([]);

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

  useEffect(() => {
    const fetchPurchaseRequests = async () => {
      try {
        const response = await axios.get(`${JIFFY_API_URL}/purchaserequests`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("sentinel_access_token")}`,
          },
        });
        const purchaseRequestData = response.data;
        setPurchaseRequests(purchaseRequestData);
      } catch (error: any) {
        notify.error(
          error.response?.data?.message || "Failed to fetch purchase requests",
        );
        navigate("/");
      }
    };

    fetchPurchaseRequests();
  }, [navigate]);

  return (
    <>
      {currentUser.id == "" ? (
        <AuthLoading />
      ) : (
        <div className="flex h-screen flex-col justify-between">
          <Header />
          <div className="flex h-screen flex-col justify-start p-4 lg:p-32 lg:pt-16">
            <div className="mb-6 flex flex-row items-center justify-between">
              <h2>All Purchase Requests</h2>

              <OutlineButton onClick={() => navigate("/pr/new")}>
                <div className="flex items-center gap-2">
                  New Purchase Request
                </div>
              </OutlineButton>
            </div>

            <DataTable columns={columns} data={purchaseRequests} />
          </div>
          <Footer />
        </div>
      )}
    </>
  );
}

export default App;

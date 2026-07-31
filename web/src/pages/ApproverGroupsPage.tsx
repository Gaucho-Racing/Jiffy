import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useUser } from "@/lib/store";
import { checkCredentials } from "@/lib/auth";
import { JIFFY_API_URL } from "@/consts/config";
import axios from "axios";
import { notify } from "@/lib/notify";
import { ApproverGroup } from "@/models/approver_group";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { OutlineButton } from "@/components/ui/outline-button";
import { ArrowLeft, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthLoading } from "@/components/AuthLoading";
import { getAxiosErrorMessage } from "@/lib/axios-error-handler";

export default function ApproverGroupsPage() {
  const navigate = useNavigate();
  const currentUser = useUser();
  const [approverGroups, setApproverGroups] = useState<ApproverGroup[]>([]);

  const isInnerCircle = () => {
    return (
      currentUser.groups.includes("Admins") ||
      currentUser.groups.includes("Officers") ||
      currentUser.groups.includes("Leads")
    );
  };

  useEffect(() => {
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

  const fetchApproverGroups = async () => {
    try {
      const response = await axios.get(`${JIFFY_API_URL}/approver-groups`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("sentinel_access_token")}`,
        },
      });
      const approverGroupsData = response.data;
      setApproverGroups(approverGroupsData);
    } catch (error: any) {
      notify.error(
        error.response?.data?.message || "Failed to fetch approver groups",
      );
      navigate("/");
    }
  };

  useEffect(() => {
    fetchApproverGroups();
  }, [navigate]);

  const createNewApproverGroup = async () => {
    try {
      const newGroup = {
        id: "",
        name: "New Approver Group",
        departments: [],
        approvers: [],
        threshold_cents: 1, // 1 cent default
      };

      await axios.post(`${JIFFY_API_URL}/approver-groups`, newGroup, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("sentinel_access_token")}`,
        },
      });

      notify.success("Approver group created successfully!");
      fetchApproverGroups();
    } catch (error: any) {
      notify.error(getAxiosErrorMessage(error));
    }
  };

  return (
    <>
      {currentUser.id == "" ? (
        <AuthLoading />
      ) : (
        <div className="flex flex-col justify-between">
          <Header />
          <div className="flex flex-col justify-start pt-4 lg:p-32 lg:pt-6">
            <div className="mb-2">
              <Button
                variant={"ghost"}
                onClick={() => navigate(`/`)}
                className="flex items-center"
              >
                <ArrowLeft className="mr-2 h-4 w-4 text-gray-400" />
                Back to home
              </Button>
            </div>
            <div className="place-self-end">
              {isInnerCircle() && (
                <OutlineButton onClick={createNewApproverGroup}>
                  <div className="flex items-center gap-2">
                    New Approver Group
                  </div>
                </OutlineButton>
              )}
            </div>
            <div className="mb-6">
              <h2>Approver Groups</h2>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {approverGroups.map((group) => (
                <Card key={group.id} className="border-neutral-800">
                  <CardHeader>
                    <CardTitle>{group.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4 space-y-6">
                      <div>
                        <span className="text-gray-400">Cost threshold: </span>
                        <span className="text-white">
                          ${(group.threshold_cents / 100).toFixed(2)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400">
                          Departments this applies to:{" "}
                        </span>
                        {group.departments?.length > 0 && (
                          <div>
                            <span className="text-white">
                              {group.departments
                                ?.map((department) => department.name)
                                .join(", ")}
                            </span>
                          </div>
                        )}
                      </div>
                      <div>
                        <span className="text-gray-400">Approvers: </span>
                        {group.approvers?.length > 0 && (
                          <div>
                            <span className="text-white">
                              {group.approvers
                                ?.map(
                                  (approver) =>
                                    approver.first_name +
                                    " " +
                                    approver.last_name,
                                )
                                .join(", ")}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    {isInnerCircle() && (
                      <OutlineButton
                        onClick={() => navigate(`/approver-groups/${group.id}`)}
                      >
                        <Edit2 className="mr-2 h-4 w-4" />
                        Edit
                      </OutlineButton>
                    )}
                  </CardFooter>
                </Card>
              ))}
            </div>
            {approverGroups.length === 0 && (
              <div className="mt-8 text-center text-gray-400">
                No approver groups found.
              </div>
            )}
          </div>
          <Footer />
        </div>
      )}
    </>
  );
}

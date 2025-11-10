import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { AuthLoading } from "@/components/AuthLoading";
import { useUser } from "@/lib/store";
import { checkCredentials } from "@/lib/auth";
import { JIFFY_API_URL } from "@/consts/config";
import axios from "axios";
import { notify } from "@/lib/notify";
import { ApproverGroup, initApproverGroup } from "@/models/approver_group";
import { User } from "@/models/user";
import { Department } from "@/models/departments";
import { MultiSelect, type Option } from "@/components/ui/multi-select";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { CardHeader, CardContent, Card } from "@/components/ui/card";
import { OutlineButton } from "@/components/ui/outline-button";
import { getAxiosErrorMessage } from "@/lib/axios-error-handler";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ApproverGroupsEditPage() {
  const navigate = useNavigate();
  const currentUser = useUser();
  const { id } = useParams<{ id: string }>();
  const [isLoading, setIsLoading] = useState(true);
  const [approverGroup, setApproverGroup] =
    useState<ApproverGroup>(initApproverGroup);
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [selectedDepartmentIds, setSelectedDepartmentIds] = useState<string[]>(
    [],
  );
  const [thresholdDollars, setThresholdDollars] = useState<string>("");
  const [name, setName] = useState<string>("");

  const isInnerCircle = () => {
    return (
      currentUser.roles.includes("d_admin") ||
      currentUser.roles.includes("d_officer") ||
      currentUser.roles.includes("d_lead")
    );
  };

  useEffect(() => {
    checkAuth();
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
    } else if (!isInnerCircle()) {
      notify.error("You are not authorized to access this page");
      navigate("/");
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [groupRes, usersRes, departmentsRes] = await Promise.all([
          axios.get(`${JIFFY_API_URL}/approver-groups/${id}`, {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("sentinel_access_token")}`,
            },
          }),
          axios.get(`${JIFFY_API_URL}/users`, {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("sentinel_access_token")}`,
            },
          }),
          axios.get(`${JIFFY_API_URL}/departments`, {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("sentinel_access_token")}`,
            },
          }),
        ]);

        setApproverGroup(groupRes.data);
        setUsers(usersRes.data);
        setDepartments(departmentsRes.data);
        setSelectedUserIds(
          groupRes.data.approvers?.map((u: User) => u.id) || [],
        );
        setSelectedDepartmentIds(
          groupRes.data.departments?.map((d: Department) => d.id) || [],
        );
        setThresholdDollars((groupRes.data.threshold_cents / 100).toFixed(2));
        setName(groupRes.data.name || "");
      } catch (error: any) {
        notify.error(error.response?.data?.message || "Failed to fetch data");
        navigate("/");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const departmentOptions: Option[] = departments.map((d) => ({
    value: d.id,
    label: d.name,
  }));

  const userOptions: Option[] = users.map((u) => ({
    value: u.id,
    label: `${u.first_name} ${u.last_name}`,
  }));

  const setSelectedUsers = (selectedIds: string[]) => {
    setSelectedUserIds(selectedIds);
    const selectedUserObjects = users.filter((u) => selectedIds.includes(u.id));
    console.log("Selected users:", selectedUserObjects);
  };

  const setSelectedDepartments = (selectedIds: string[]) => {
    setSelectedDepartmentIds(selectedIds);
    const selectedDepartmentObjects = departments.filter((d) =>
      selectedIds.includes(d.id),
    );
    console.log("Selected departments:", selectedDepartmentObjects);
  };

  const saveGroup = async () => {
    const selectedUserObjects = users.filter((u) =>
      selectedUserIds.includes(u.id),
    );
    const selectedDepartmentObjects = departments.filter((d) =>
      selectedDepartmentIds.includes(d.id),
    );
    const thresholdCents = Math.round(parseFloat(thresholdDollars) * 100);

    const dataToSend = {
      id: id,
      name: name,
      departments: selectedDepartmentObjects,
      approvers: selectedUserObjects,
      threshold_cents: thresholdCents,
    };
    try {
      await axios.patch(`${JIFFY_API_URL}/approver-groups/${id}`, dataToSend, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("sentinel_access_token")}`,
        },
      });
      notify.success("Approver group updated successfully!");
    } catch (error: any) {
      notify.error(getAxiosErrorMessage(error));
    }
  };

  if (isLoading) {
    return (
      <>
        {currentUser.id == "" ? (
          <AuthLoading />
        ) : (
          <div className="flex flex-col justify-between">
            <Header />
            <div className="flex flex-col justify-start p-4 lg:p-32 lg:pt-6">
              <div className="flex h-64 items-center justify-center">
                <div className="text-lg text-gray-400">
                  Loading approver group rules...
                </div>
              </div>
            </div>
            <Footer />
          </div>
        )}
      </>
    );
  }
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
                onClick={() => navigate(`/approver-groups`)}
                className="flex items-center"
              >
                <ArrowLeft className="mr-2 h-4 w-4 text-gray-400" />
                Back to rules
              </Button>

              <h2 className="mb-6">Editing Rule - {approverGroup.name}</h2>
              <Card>
                <CardHeader>
                  <OutlineButton onClick={saveGroup}>Save</OutlineButton>
                </CardHeader>
                <CardContent>
                  <div className="w-full max-w-xs space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Approver group name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="threshold">Price Threshold ($)</Label>
                      <Input
                        id="threshold"
                        type="number"
                        step="0.01"
                        min="0"
                        value={thresholdDollars}
                        onChange={(e) => setThresholdDollars(e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Departments</Label>
                      <MultiSelect
                        options={departmentOptions}
                        value={selectedDepartmentIds}
                        onChange={setSelectedDepartments}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Approvers</Label>
                      <MultiSelect
                        options={userOptions}
                        value={selectedUserIds}
                        onChange={setSelectedUsers}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
          <Footer />
        </div>
      )}
    </>
  );
}

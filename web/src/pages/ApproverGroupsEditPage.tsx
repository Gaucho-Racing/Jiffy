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
import { ArrowLeft, Trash2 } from "lucide-react";
import { CardHeader, CardContent, Card } from "@/components/ui/card";
import { OutlineButton } from "@/components/ui/outline-button";
import { getAxiosErrorMessage } from "@/lib/axios-error-handler";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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
  const [thresholdCents, setThresholdCents] = useState(1); // Default to 0.01 (1 cent)
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
        setThresholdCents(groupRes.data.threshold_cents);
        setName(groupRes.data.name || "");
      } catch (error: any) {
        notify.error(error.response?.data?.message || "Failed to fetch data");
        navigate("/approver-groups");
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
  };

  const setSelectedDepartments = (selectedIds: string[]) => {
    setSelectedDepartmentIds(selectedIds);
  };

  const saveGroup = async () => {
    if (!name || !thresholdCents) {
      notify.error("Please fill in all required fields");
      return;
    }

    const selectedUserObjects = users.filter((u) =>
      selectedUserIds.includes(u.id),
    );
    const selectedDepartmentObjects = departments.filter((d) =>
      selectedDepartmentIds.includes(d.id),
    );

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
      navigate("/approver-groups");
    } catch (error: any) {
      notify.error(getAxiosErrorMessage(error));
    }
  };

  const deleteGroup = async () => {
    try {
      await axios.delete(`${JIFFY_API_URL}/approver-groups/${id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("sentinel_access_token")}`,
        },
      });
      notify.success("Approver group deleted successfully!");
      navigate("/approver-groups");
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
                className="mb-8 flex items-center"
              >
                <ArrowLeft className="mr-2 h-4 w-4 text-gray-400" />
                Back to rules
              </Button>

              <h2 className="mb-6">Editing Rule - {approverGroup.name}</h2>
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <OutlineButton onClick={saveGroup}>Save</OutlineButton>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        {approverGroup.name === "Treasurer" ? (
                          <Button variant="destructive" disabled>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </Button>
                        ) : (
                          <Button variant="destructive">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </Button>
                        )}
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently
                            delete the approver group "{approverGroup.name}".
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={deleteGroup}>
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="w-full max-w-xs space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="Name" className="text-white">
                        Name <span className="text-red-500">*</span>
                      </Label>{" "}
                      <Input
                        id="name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Approver group name"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="threshold" className="text-white">
                        Threshold $ <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative mt-2">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                          $
                        </span>
                        <Input
                          id="threshold"
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={thresholdCents / 100}
                          onChange={(e) =>
                            setThresholdCents(
                              Math.round(parseFloat(e.target.value) * 100),
                            )
                          }
                          onBlur={(e) => {
                            const value = parseFloat(e.target.value) || 0;
                            if (value <= 0) {
                              setThresholdCents(1);
                            }
                          }}
                          className="pl-7"
                          required
                        />
                      </div>
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

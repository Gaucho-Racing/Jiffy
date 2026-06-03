import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import {
  PurchaseRequest,
  PurchaseRequestItem,
  PurchaseRequestNote,
  initPurchaseRequest,
  initPurchaseRequestItem,
  calculateEstimatedCostCents,
  NoteType,
} from "@/models/pr";
import { Department } from "@/models/departments";
import {
  ShippingAddress,
  initShippingAddress,
} from "@/models/shipping_address";
import { Calendar } from "@/components/ui/calendar";
import { JIFFY_API_URL } from "@/consts/config";
import { notify } from "@/lib/notify";
import axios from "axios";
import { AuthLoading } from "@/components/AuthLoading";
import Header from "@/components/Header";
import { OutlineButton } from "@/components/ui/outline-button";
import Footer from "@/components/Footer";
import {
  ComponentSelectField,
  COMPONENT_MICHIGAN_TRAVEL_2026,
  MICHIGAN_COMPONENT_DEPARTMENT_NAME,
  applyComponentDepartmentUpdate,
} from "@/components/ComponentSelectField";
import { getUser, useUser } from "@/lib/store";
import { checkCredentials } from "@/lib/auth";
import React from "react";
import { getAxiosErrorMessage } from "@/lib/axios-error-handler";
import { Calendar as CalendarIcon, ArrowLeft, Plus } from "lucide-react";

export default function EditPurchaseRequestPage() {
  const navigate = useNavigate();
  const currentUser = useUser();
  const { id } = useParams();
  const [purchaseRequest, setPurchaseRequest] =
    useState<Partial<PurchaseRequest>>(initPurchaseRequest);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [date, setDate] = React.useState<Date>();
  const [items, setItems] = useState<PurchaseRequestItem[]>([
    { ...initPurchaseRequestItem },
  ]);
  const [displayValues, setDisplayValues] = useState<{ [key: string]: string }>(
    {},
  );
  const [reimbursementAcknowledged, setReimbursementAcknowledged] =
    useState(false);
  const [attachmentAcknowledged, setAttachmentAcknowledged] = useState(false);
  const [shippingAddresses, setShippingAddresses] = useState<ShippingAddress[]>(
    [],
  );
  const [showCreateAddressDialog, setShowCreateAddressDialog] = useState(false);
  const [newAddress, setNewAddress] =
    useState<Partial<ShippingAddress>>(initShippingAddress);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter rejected notes
  const rejectedNotes =
    purchaseRequest.notes?.filter((note) => note.type === NoteType.Rejected) ||
    [];

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
    }
  };

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const response = await axios.get(`${JIFFY_API_URL}/departments`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("sentinel_access_token")}`,
          },
        });
        setDepartments(response.data);
      } catch (error: any) {
        notify.error(
          error.response?.data?.message || "Failed to fetch departments",
        );
      }
    };
    fetchDepartments();
  }, []);

  const isDepartmentLocked =
    purchaseRequest.component === COMPONENT_MICHIGAN_TRAVEL_2026;

  useEffect(() => {
    if (
      purchaseRequest.component !== COMPONENT_MICHIGAN_TRAVEL_2026 ||
      departments.length === 0
    ) {
      return;
    }
    const businessDept = departments.find(
      (d) => d.name === MICHIGAN_COMPONENT_DEPARTMENT_NAME,
    );
    if (businessDept && purchaseRequest.department_id !== businessDept.id) {
      setPurchaseRequest((prev) => ({
        ...prev,
        department_id: businessDept.id,
      }));
    }
  }, [purchaseRequest.component, departments]);

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
        const user = getUser();
        if (
          !(
            purchaseRequestData.user_id === user.id ||
            user.roles.includes("d_admin")
          )
        ) {
          notify.error("You can only edit your own purchase requests");
          navigate("/");
          return;
        }
        if (
          purchaseRequestData.status !== "Request Rejected" &&
          purchaseRequestData.status !== "Pending Approval"
        ) {
          notify.error("Cannot edit purchase request in current status");
          navigate(`/pr/${id}`);
          return;
        }

        setPurchaseRequest(purchaseRequestData);
        if (purchaseRequestData.needed_by_date) {
          setDate(new Date(purchaseRequestData.needed_by_date));
        }
        if (purchaseRequestData.items && purchaseRequestData.items.length > 0) {
          setItems(purchaseRequestData.items);
        } else {
          setItems([{ ...initPurchaseRequestItem }]);
        }
      } catch (error: any) {
        notify.error(
          error.response?.data?.message || "Failed to fetch purchase request",
        );
        navigate("/");
      } finally {
        setIsLoading(false);
      }
    };
    if (id) {
      fetchPurchaseRequest();
    }
  }, [id, navigate]);

  const fetchShippingAddresses = async () => {
    try {
      const response = await axios.get(`${JIFFY_API_URL}/shipping-addresses`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("sentinel_access_token")}`,
        },
      });
      setShippingAddresses(response.data || []);
    } catch (error: any) {
      notify.error(getAxiosErrorMessage(error));
    }
  };

  useEffect(() => {
    if (purchaseRequest.requested_purchaser === "Gaucho Racing") {
      fetchShippingAddresses();
    }
  }, [purchaseRequest.requested_purchaser]);

  const createShippingAddress = async () => {
    if (
      !newAddress.name ||
      !newAddress.street_address ||
      !newAddress.city ||
      !newAddress.state ||
      !newAddress.zip_code ||
      !newAddress.country
    ) {
      notify.error("Please fill in all required fields");
      return;
    }

    try {
      await axios.post(`${JIFFY_API_URL}/shipping-addresses`, newAddress, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("sentinel_access_token")}`,
        },
      });
      notify.success("Address created successfully!");
      setShowCreateAddressDialog(false);
      setNewAddress(initShippingAddress);
      fetchShippingAddresses();
    } catch (error: any) {
      notify.error(getAxiosErrorMessage(error));
    }
  };

  const addItem = () => {
    setItems([...items, { ...initPurchaseRequestItem }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
      setDisplayValues({});
    }
  };

  const updateItem = (
    index: number,
    field: keyof PurchaseRequestItem,
    value: string | number,
  ) => {
    const updatedItems = [...items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    setItems(updatedItems);
  };

  const isItemEmpty = (item: PurchaseRequestItem) => {
    return (
      item.name.trim() === "" &&
      item.url.trim() === "" &&
      item.unit_price_cents === 0 &&
      item.quantity === 1
    );
  };

  const handleItemBlur = (index: number) => {
    // add a new item if the last item has some content
    if (index === items.length - 1) {
      const currentItem = items[index];
      if (
        currentItem.name.trim() ||
        currentItem.url.trim() ||
        currentItem.unit_price_cents > 0
      ) {
        addItem();
      }
    }
  };

  const updatePurchaseRequest = async () => {
    if (!purchaseRequest.department_id) {
      notify.error("Please select a department");
      return;
    }
    if (!purchaseRequest.component) {
      notify.error("Please select a component");
      return;
    }
    if (!purchaseRequest.vendor) {
      notify.error("Please enter a vendor");
      return;
    }
    if (!purchaseRequest.priority) {
      notify.error("Please select a priority level");
      return;
    }
    if (!purchaseRequest.needed_by_date) {
      notify.error("Please select a needed by date");
      return;
    }
    if (!purchaseRequest.requested_purchaser) {
      notify.error("Please select who will be making this order");
      return;
    }

    const nonEmptyItems = items.filter((item) => !isItemEmpty(item));
    if (nonEmptyItems.length === 0) {
      notify.error("Please fill in at least one item");
      return;
    }
    if (
      purchaseRequest.requested_purchaser !== "Gaucho Racing" &&
      purchaseRequest.requested_purchaser &&
      !reimbursementAcknowledged
    ) {
      notify.error("Please acknowledge the reimbursement policy");
      return;
    }
    if (!attachmentAcknowledged) {
      notify.error("Please acknowledge the attachment policy");
      return;
    }

    const itemsCost = calculateEstimatedCostCents(nonEmptyItems);
    const estimatedCost = Math.max(
      0,
      itemsCost +
        (purchaseRequest.shipping_tax_cost_cents || 0) -
        (purchaseRequest.discounts_cents || 0),
    );
    const cleanItems = nonEmptyItems.map((item) => ({
      url: item.url,
      name: item.name,
      unit_price_cents: item.unit_price_cents,
      quantity: item.quantity,
    }));
    const dataToSend = {
      ...purchaseRequest,
      user_id: purchaseRequest.user_id,
      items: cleanItems,
      estimated_cost_cents: estimatedCost,
      needed_by_date: date ? date.toISOString() : null,
      shipping_address_id:
        purchaseRequest.requested_purchaser === "Gaucho Racing"
          ? purchaseRequest.shipping_address_id
          : "",
    };
    setIsSubmitting(true);

    try {
      const response = await axios.post(
        `${JIFFY_API_URL}/purchase-requests`,
        dataToSend,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("sentinel_access_token")}`,
          },
        },
      );
      notify.success("Purchase request updated successfully!");
      const id = response.data.id;
      navigate(`/pr/${id}#attachments`);
    } catch (error: any) {
      notify.error(getAxiosErrorMessage(error));
    } finally {
      setIsSubmitting(false);
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
                  Loading purchase request...
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
                onClick={() => navigate(`/pr/${id}`)}
                className="flex items-center"
              >
                <ArrowLeft className="mr-2 h-4 w-4 text-gray-400" />
                Back to home
              </Button>
              <div className="mx-20 my-10">
                <form
                  onSubmit={(e) => {
                    const form = e.currentTarget as HTMLFormElement;
                    if (!form.checkValidity()) {
                      e.preventDefault();
                      form.reportValidity();
                      return;
                    }
                    e.preventDefault();
                    updatePurchaseRequest();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                    }
                  }}
                >
                  {rejectedNotes && rejectedNotes.length > 0 && (
                    <div className="mb-6">
                      <h3 className="mb-2 font-medium text-red-600">
                        Amendment Needed
                      </h3>
                      <div className="space-y-4">
                        {rejectedNotes.map((note: PurchaseRequestNote) => (
                          <Card
                            key={note.id}
                            className="border-2 border-red-600"
                          >
                            <CardContent className="p-4">
                              <div className="mb-2 flex items-center justify-between">
                                <p className="text-sm font-medium text-white">
                                  Rejection By:{" "}
                                  {note.user?.first_name
                                    ? `${note.user.first_name} ${note.user.last_name}`
                                    : "Unknown User"}
                                </p>
                                <span className="rounded-md border border-red-600/30 bg-red-600/20 px-2 py-1 text-sm font-medium text-red-400">
                                  {note.type}
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <p className="text-sm text-gray-300">
                                  {note.note}
                                </p>
                                <p className="text-xs text-gray-400">
                                  {new Date(note.created_at).toLocaleString()}
                                </p>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                  <Card>
                    <CardHeader>
                      <CardTitle>
                        Edit Purchase Request #{purchaseRequest.id}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="ml-12 space-y-4">
                      <div className="grid grid-cols-2 items-center gap-4 pb-8">
                        <Label>
                          Has this already been ordered?{" "}
                          <span className="text-red-500">*</span>
                        </Label>
                        <RadioGroup
                          value={
                            purchaseRequest.placed_order_unapproved
                              ? "yes"
                              : "no"
                          }
                          onValueChange={(value) => {
                            const isUnapproved = value === "yes";
                            setPurchaseRequest({
                              ...purchaseRequest,
                              placed_order_unapproved: isUnapproved,
                              requested_purchaser: isUnapproved
                                ? `${currentUser.first_name} ${currentUser.last_name}`
                                : purchaseRequest.requested_purchaser,
                              shipping_address_id: isUnapproved
                                ? ""
                                : purchaseRequest.shipping_address_id,
                            });
                          }}
                        >
                          <div className="flex items-center space-x-2 pl-6">
                            <RadioGroupItem value="yes" id="yes" />
                            <Label
                              htmlFor="yes"
                              className="cursor-pointer font-normal"
                            >
                              Yes, I ordered before getting approved or I am
                              applying for reimbursement for an old order.
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2 pl-6">
                            <RadioGroupItem value="no" id="no" />
                            <Label
                              htmlFor="no"
                              className="cursor-pointer font-normal"
                            >
                              No, I will wait for full approval before ordering
                              (Recommended unless urgent).
                            </Label>
                          </div>
                        </RadioGroup>
                      </div>

                      <div className="grid grid-cols-2 items-center gap-4">
                        <Label htmlFor="department">
                          Department <span className="text-red-500">*</span>
                        </Label>
                        <Select
                          value={purchaseRequest.department_id}
                          disabled={isDepartmentLocked}
                          onValueChange={(value) =>
                            setPurchaseRequest({
                              ...purchaseRequest,
                              department_id: value,
                            })
                          }
                        >
                          <SelectTrigger id="department">
                            <SelectValue placeholder="Select a department" />
                          </SelectTrigger>
                          <SelectContent>
                            {departments.map((department) => (
                              <SelectItem
                                key={department.id}
                                value={department.id}
                              >
                                {department.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 items-start gap-4">
                        <Label htmlFor="component">
                          Component <span className="text-red-500">*</span>
                        </Label>
                        <ComponentSelectField
                          value={purchaseRequest.component || ""}
                          onChange={(component) =>
                            setPurchaseRequest((prev) =>
                              applyComponentDepartmentUpdate(
                                prev,
                                component,
                                departments,
                              ),
                            )
                          }
                        />
                      </div>
                      <div className="grid grid-cols-2 items-center gap-4">
                        <Label htmlFor="vendor">
                          Vendor <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="vendor"
                          type="text"
                          placeholder="ex: Amazon"
                          value={purchaseRequest.vendor || ""}
                          onChange={(e) =>
                            setPurchaseRequest({
                              ...purchaseRequest,
                              vendor: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="grid grid-cols-2 items-center gap-4">
                        <Label htmlFor="description">
                          Description & Justification{" "}
                          <span className="text-red-500">*</span>
                        </Label>
                        <Textarea
                          id="description"
                          placeholder="Why is this purchase needed for your project?"
                          value={purchaseRequest.description}
                          onChange={(e) =>
                            setPurchaseRequest({
                              ...purchaseRequest,
                              description: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="grid grid-cols-2 items-center gap-4">
                        <Label htmlFor="priority">
                          Priority <span className="text-red-500">*</span>
                        </Label>
                        <Select
                          value={purchaseRequest.priority?.toString()}
                          onValueChange={(value) =>
                            setPurchaseRequest({
                              ...purchaseRequest,
                              priority: parseInt(value, 10),
                            })
                          }
                        >
                          <SelectTrigger id="priority">
                            <SelectValue placeholder="Select a priority level" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">
                              1 - Need this school year
                            </SelectItem>
                            <SelectItem value="2">
                              2 - Need this quarter
                            </SelectItem>
                            <SelectItem value="3">
                              3 - Need this month
                            </SelectItem>
                            <SelectItem value="4">
                              4 - Need this WEEK
                            </SelectItem>
                            <SelectItem value="5">
                              5 - Need LITERALLY RIGHT NOW OR I AM GOING TO
                              DIE!!!
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid grid-cols-2 items-center gap-4">
                        <Label htmlFor="needed_by_date">
                          Needed By Date <span className="text-red-500">*</span>
                        </Label>
                        <div className="flex items-center">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                data-empty={!date}
                                className="w-[280px] w-full justify-start text-left font-normal data-[empty=true]:text-muted-foreground"
                              >
                                <CalendarIcon className="mr-2 w-4" />
                                {date ? format(date, "PPP") : "Select a date"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <Calendar
                                mode="single"
                                selected={date}
                                onSelect={(selectedDate) => {
                                  setDate(selectedDate);
                                  setPurchaseRequest({
                                    ...purchaseRequest,
                                    needed_by_date: selectedDate
                                      ? selectedDate.toISOString()
                                      : "",
                                  });
                                }}
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>
                      <div className="col-span-2">
                        <div className="mb-4 flex items-center justify-between">
                          <Label className="text-lg font-medium">
                            Items <span className="text-red-500">*</span>
                          </Label>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={addItem}
                            className="flex items-center gap-2"
                          >
                            <Plus className="h-4 w-4" />
                            Add Item
                          </Button>
                        </div>

                        <div className="space-y-2">
                          <div className="grid grid-cols-12 gap-2 border-b border-gray-600 bg-black pb-2 text-sm font-medium text-white">
                            <div className="col-span-4">
                              Item Name <span className="text-red-500">*</span>
                            </div>
                            <div className="col-span-2">
                              Unit Price <span className="text-red-500">*</span>
                            </div>
                            <div className="col-span-1">
                              Qty <span className="text-red-500">*</span>
                            </div>
                            <div className="col-span-3">URL</div>
                            <div className="col-span-1">Total</div>
                            <div className="col-span-1"></div>
                          </div>

                          {items.map((item, index) => (
                            <div
                              key={index}
                              className={`grid grid-cols-12 items-center gap-2 bg-black transition-opacity duration-200 ${isItemEmpty(item) ? "opacity-40" : "opacity-100"}`}
                            >
                              <div className="col-span-4">
                                <Input
                                  type="text"
                                  placeholder="Enter item name"
                                  required={!isItemEmpty(item)}
                                  value={item.name}
                                  onChange={(e) =>
                                    updateItem(index, "name", e.target.value)
                                  }
                                  onBlur={() => handleItemBlur(index)}
                                  onFocus={(e) => e.target.select()}
                                />
                              </div>
                              <div className="col-span-2">
                                <div className="relative">
                                  <span className="absolute left-2 top-1/2 -translate-y-1/2 transform text-sm text-gray-400">
                                    $
                                  </span>
                                  <Input
                                    type="text"
                                    placeholder="0.00"
                                    required={!isItemEmpty(item)}
                                    className="pl-6"
                                    value={
                                      displayValues[`price_${index}`] !==
                                      undefined
                                        ? displayValues[`price_${index}`]
                                        : item.unit_price_cents != null &&
                                            item.unit_price_cents !== 0
                                          ? (
                                              item.unit_price_cents / 100
                                            ).toString()
                                          : ""
                                    }
                                    onChange={(e) => {
                                      const value = e.target.value;
                                      if (
                                        value === "" ||
                                        /^\d*\.?\d{0,2}$/.test(value)
                                      ) {
                                        setDisplayValues((prev) => ({
                                          ...prev,
                                          [`price_${index}`]: value,
                                        }));
                                      }
                                    }}
                                    onBlur={(e) => {
                                      const value =
                                        parseFloat(e.target.value) || 0;
                                      updateItem(
                                        index,
                                        "unit_price_cents",
                                        Math.round(value * 100),
                                      );
                                      setDisplayValues((prev) => {
                                        const newValues = { ...prev };
                                        delete newValues[`price_${index}`];
                                        return newValues;
                                      });
                                    }}
                                    onFocus={(e) => e.target.select()}
                                  />
                                </div>
                              </div>

                              <div className="col-span-1">
                                <Input
                                  type="text"
                                  placeholder="1"
                                  required={!isItemEmpty(item)}
                                  value={
                                    displayValues[`qty_${index}`] !== undefined
                                      ? displayValues[`qty_${index}`]
                                      : item.quantity || ""
                                  }
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    if (value === "" || /^\d*$/.test(value)) {
                                      setDisplayValues((prev) => ({
                                        ...prev,
                                        [`qty_${index}`]: value,
                                      }));
                                    }
                                  }}
                                  onBlur={(e) => {
                                    const value = parseInt(e.target.value) || 0;
                                    updateItem(index, "quantity", value);
                                    setDisplayValues((prev) => {
                                      const newValues = { ...prev };
                                      delete newValues[`qty_${index}`];
                                      return newValues;
                                    });
                                  }}
                                  onFocus={(e) => e.target.select()}
                                />
                              </div>
                              <div className="col-span-3">
                                <Input
                                  type="url"
                                  placeholder="https://example.com"
                                  value={item.url}
                                  onChange={(e) =>
                                    updateItem(index, "url", e.target.value)
                                  }
                                  onBlur={() => handleItemBlur(index)}
                                  onFocus={(e) => e.target.select()}
                                />
                              </div>

                              <div className="col-span-1 text-sm font-medium text-white">
                                ${" "}
                                {(
                                  ((item.unit_price_cents || 0) *
                                    (item.quantity || 0)) /
                                  100
                                ).toFixed(2)}
                              </div>
                              <div className="col-span-1">
                                <button
                                  type="button"
                                  onClick={() => removeItem(index)}
                                  className="text-sm text-red-500 hover:text-red-700"
                                  disabled={items.length === 1}
                                >
                                  x
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 items-center gap-4">
                        <Label className="opacity-30">
                          Estimated Item Total
                        </Label>
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 transform text-sm text-muted-foreground">
                            $
                          </span>
                          <Input
                            disabled
                            id="estimated_item_total"
                            className="pl-6"
                            value={(
                              calculateEstimatedCostCents(items) / 100
                            ).toFixed(2)}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 items-center gap-4">
                        <Label htmlFor="shipping_tax_cost">
                          Shipping & Tax Cost
                        </Label>
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 transform text-sm text-gray-400">
                            $
                          </span>
                          <Input
                            id="shipping_tax_cost"
                            type="text"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            className="pl-6"
                            value={
                              displayValues["shipping"] !== undefined
                                ? displayValues["shipping"]
                                : purchaseRequest.shipping_tax_cost_cents !=
                                      null &&
                                    purchaseRequest.shipping_tax_cost_cents !==
                                      0
                                  ? (
                                      purchaseRequest.shipping_tax_cost_cents /
                                      100
                                    ).toString()
                                  : ""
                            }
                            onChange={(e) => {
                              const value = e.target.value;
                              if (
                                value === "" ||
                                /^\d*\.?\d{0,2}$/.test(value)
                              ) {
                                setDisplayValues((prev) => ({
                                  ...prev,
                                  shipping: value,
                                }));
                              }
                            }}
                            onBlur={(e) => {
                              const value = parseFloat(e.target.value) || 0;
                              setPurchaseRequest({
                                ...purchaseRequest,
                                shipping_tax_cost_cents: Math.round(
                                  value * 100,
                                ),
                              });
                              setDisplayValues((prev) => {
                                const newValues = { ...prev };
                                delete newValues["shipping"];
                                return newValues;
                              });
                            }}
                            onFocus={(e) => e.target.select()}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 items-center gap-4">
                        <Label htmlFor="discounts">Discounts</Label>
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 transform text-sm text-gray-400">
                            -$
                          </span>
                          <Input
                            id="discounts"
                            type="text"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            className="pl-6"
                            value={
                              displayValues["discounts"] !== undefined
                                ? displayValues["discounts"]
                                : purchaseRequest.discounts_cents != null &&
                                    purchaseRequest.discounts_cents !== 0
                                  ? (
                                      purchaseRequest.discounts_cents / 100
                                    ).toString()
                                  : ""
                            }
                            onChange={(e) => {
                              const value = e.target.value;
                              if (
                                value === "" ||
                                /^\d*\.?\d{0,2}$/.test(value)
                              ) {
                                setDisplayValues((prev) => ({
                                  ...prev,
                                  discounts: value,
                                }));
                              }
                            }}
                            onBlur={(e) => {
                              const value = parseFloat(e.target.value) || 0;
                              setPurchaseRequest({
                                ...purchaseRequest,
                                discounts_cents: Math.round(value * 100),
                              });
                              setDisplayValues((prev) => {
                                const newValues = { ...prev };
                                delete newValues["discounts"];
                                return newValues;
                              });
                            }}
                            onFocus={(e) => e.target.select()}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 items-center gap-4 pb-8">
                        <Label className="opacity-30">Estimated Cost</Label>
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 transform text-sm text-muted-foreground">
                            $
                          </span>
                          <Input
                            disabled
                            id="estimated_cost"
                            className="pl-6"
                            value={Math.max(
                              0,
                              (calculateEstimatedCostCents(items) +
                                (purchaseRequest.shipping_tax_cost_cents || 0) -
                                (purchaseRequest.discounts_cents || 0)) /
                                100,
                            ).toFixed(2)}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 items-center gap-4 pb-8">
                        <Label>
                          Who will be placing this order?{" "}
                          <span className="text-red-500">*</span>
                        </Label>
                        <RadioGroup
                          value={
                            purchaseRequest.requested_purchaser ===
                            "Gaucho Racing"
                              ? "club"
                              : purchaseRequest.requested_purchaser
                                ? "self"
                                : undefined
                          }
                          onValueChange={(value) => {
                            // Prevent selecting "club" if order was placed unapproved
                            if (
                              value === "club" &&
                              purchaseRequest.placed_order_unapproved
                            ) {
                              return;
                            }
                            setPurchaseRequest({
                              ...purchaseRequest,
                              requested_purchaser:
                                value === "club"
                                  ? "Gaucho Racing"
                                  : `${currentUser.first_name} ${currentUser.last_name}`,
                              shipping_address_id:
                                value === "self"
                                  ? ""
                                  : purchaseRequest.shipping_address_id,
                            });
                            if (value === "club") {
                              setReimbursementAcknowledged(false);
                            }
                          }}
                        >
                          <div className="flex items-center space-x-2 pl-6">
                            <RadioGroupItem
                              value="club"
                              id="club"
                              disabled={purchaseRequest.placed_order_unapproved}
                            />
                            <Label
                              htmlFor="club"
                              className={`cursor-pointer font-normal ${
                                purchaseRequest.placed_order_unapproved
                                  ? "cursor-not-allowed text-gray-500"
                                  : ""
                              }`}
                            >
                              Club - I want the club to order with Gaucho Racing
                              funds after approval (Not recommended for
                              technical items).
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2 pl-6">
                            <RadioGroupItem value="self" id="self" />
                            <Label
                              htmlFor="self"
                              className="cursor-pointer font-normal"
                            >
                              Me - I will wait for full approval, then order
                              myself and await reimbursement. Or I have already
                              bought this and am applying for reimbursement.
                            </Label>
                          </div>
                        </RadioGroup>
                      </div>
                      <div className="grid grid-cols-2 items-center gap-4 pb-8 ">
                        <Label
                          htmlFor="attachment-ack"
                          className="text-md cursor-pointer font-normal text-red-500"
                        >
                          I agree to IMMEDIATELY upload updated photo
                          attachments of a receipt or checkout page for this
                          request, or I WON'T be reimbursed.
                          <span className="text-red-500"> *</span>
                        </Label>
                        <div className="pl-6">
                          <Checkbox
                            id="attachment-ack"
                            checked={attachmentAcknowledged}
                            onCheckedChange={(checked) =>
                              setAttachmentAcknowledged(checked as boolean)
                            }
                          />
                        </div>
                      </div>
                      {purchaseRequest.requested_purchaser ===
                        "Gaucho Racing" && (
                        <div className="pb-8">
                          <div className="space-y-4">
                            <div className="flex flex-row items-center justify-between">
                              <h3 className="text-lg font-semibold">
                                Shipping Address
                              </h3>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setShowCreateAddressDialog(true)}
                                className="flex items-center gap-2"
                              >
                                <Plus className="h-4 w-4" />
                                New Address
                              </Button>
                            </div>
                            <div className="grid gap-3">
                              <Label htmlFor="shipping-address">
                                Select Shipping Address{" "}
                                <span className="text-red-500">*</span>
                              </Label>
                              <Select
                                value={
                                  purchaseRequest.shipping_address_id?.toString() ||
                                  "0"
                                }
                                onValueChange={(value) => {
                                  const addressId = value;
                                  if (addressId === "") {
                                    setPurchaseRequest({
                                      ...purchaseRequest,
                                      shipping_address_id: "",
                                      shipping_address: initShippingAddress,
                                    });
                                  } else {
                                    setPurchaseRequest({
                                      ...purchaseRequest,
                                      shipping_address_id: addressId,
                                    });
                                  }
                                }}
                              >
                                <SelectTrigger id="shipping-address">
                                  <SelectValue placeholder="Select an address" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="0">
                                    No shipping needed
                                  </SelectItem>
                                  {shippingAddresses.length === 0 ? (
                                    <SelectItem value="none" disabled>
                                      No addresses found. Create one above.
                                    </SelectItem>
                                  ) : (
                                    shippingAddresses.map((address) => (
                                      <SelectItem
                                        key={address.id}
                                        value={address.id.toString()}
                                      >
                                        {address.name} -{" "}
                                        {address.street_address}, {address.city}
                                        , {address.state} {address.zip_code}
                                      </SelectItem>
                                    ))
                                  )}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>
                      )}
                      {purchaseRequest.requested_purchaser !==
                        "Gaucho Racing" &&
                        purchaseRequest.requested_purchaser && (
                          <div className="grid grid-cols-2 items-center gap-4 pb-8 ">
                            <Label
                              htmlFor="reimbursement-ack"
                              className="text-md cursor-pointer font-normal text-red-500"
                            >
                              I understand if I place the order before it is
                              fully approved, it may not be fully reimbursed.
                              <span className="text-red-500"> *</span>
                            </Label>
                            <div className="pl-6">
                              <Checkbox
                                id="reimbursement-ack"
                                checked={reimbursementAcknowledged}
                                onCheckedChange={(checked) =>
                                  setReimbursementAcknowledged(
                                    checked as boolean,
                                  )
                                }
                              />
                            </div>
                          </div>
                        )}
                    </CardContent>

                    <CardFooter className="flex justify-between">
                      <div className="flex w-full items-center justify-end">
                        <div className="flex items-center justify-end">
                          <Button
                            variant={"outline"}
                            onClick={() => {
                              navigate(`/pr/${id}`);
                            }}
                            className="mr-2 py-5"
                          >
                            Cancel
                          </Button>
                          <OutlineButton type="submit" disabled={isSubmitting}>
                            {isSubmitting ? "Loading..." : "Submit Request"}
                          </OutlineButton>
                        </div>
                      </div>
                    </CardFooter>
                  </Card>
                </form>
              </div>
            </div>
          </div>

          <Footer />
        </div>
      )}
      <Dialog
        open={showCreateAddressDialog}
        onOpenChange={setShowCreateAddressDialog}
      >
        <DialogContent className="max-w-2xl bg-black">
          <DialogHeader>
            <DialogTitle>Create New Shipping Address</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="address-name">
                Address Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="address-name"
                placeholder="ex: My House, Machine Shop, etc."
                value={newAddress.name || ""}
                onChange={(e) =>
                  setNewAddress({ ...newAddress, name: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="street-address">
                Street Address <span className="text-red-500">*</span>
              </Label>
              <Input
                id="street-address"
                placeholder="6969 Segovia Rd"
                value={newAddress.street_address || ""}
                onChange={(e) =>
                  setNewAddress({
                    ...newAddress,
                    street_address: e.target.value,
                  })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="city">
                  City <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="city"
                  placeholder="Goleta"
                  value={newAddress.city || ""}
                  onChange={(e) =>
                    setNewAddress({ ...newAddress, city: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="state">
                  State <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="state"
                  placeholder="CA"
                  value={newAddress.state || ""}
                  onChange={(e) =>
                    setNewAddress({ ...newAddress, state: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="zip-code">
                  ZIP Code <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="zip-code"
                  placeholder="93117"
                  value={newAddress.zip_code || ""}
                  onChange={(e) =>
                    setNewAddress({ ...newAddress, zip_code: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="country">
                  Country <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="country"
                  placeholder="USA"
                  value={newAddress.country || ""}
                  onChange={(e) =>
                    setNewAddress({ ...newAddress, country: e.target.value })
                  }
                />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <p className="self-center pl-4 text-sm text-red-500">
              Remember to select after creating!
            </p>
            <div className="flex items-center justify-end">
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowCreateAddressDialog(false)}
                >
                  Cancel
                </Button>
                <Button onClick={createShippingAddress}>Create Address</Button>
              </DialogFooter>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

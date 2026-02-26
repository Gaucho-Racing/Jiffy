import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  PurchaseRequest,
  calculateItemTotalCents,
  calculateEstimatedCostCents,
  ReimbursementType,
} from "@/models/pr";
import { Department } from "@/models/departments";
import { useState } from "react";
import { Pencil, CalendarIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import axios from "axios";
import { JIFFY_API_URL } from "@/consts/config";
import { notify } from "@/lib/notify";
import { getAxiosErrorMessage } from "@/lib/axios-error-handler";

interface RequestDetailsTabProps {
  purchaseRequest: Partial<PurchaseRequest>;
  department?: Department;
  isLoading: boolean;
  onUpdate?: () => void;
  canAdvance?: boolean;
}

export function RequestDetailsTab({
  purchaseRequest,
  department,
  isLoading,
  onUpdate,
  canAdvance = false,
}: RequestDetailsTabProps) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingField, setEditingField] = useState<string>("");
  const [editingValue, setEditingValue] = useState<any>("");
  const [editingDate, setEditingDate] = useState<Date | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const openEditDialog = (
    fieldName: string,
    currentValue: any,
    fieldType: string,
  ) => {
    setEditingField(fieldName);

    if (fieldType === "date" && currentValue) {
      setEditingDate(new Date(currentValue));
      setEditingValue(new Date(currentValue).toISOString().split("T")[0]);
    } else if (fieldType === "cents") {
      setEditingValue(currentValue ? (currentValue / 100).toFixed(2) : "");
    } else if (fieldType === "boolean") {
      setEditingValue(currentValue ? "true" : "false");
    } else {
      setEditingValue(currentValue || "");
    }

    setEditDialogOpen(true);
  };

  const handleEditSubmit = async () => {
    setIsSubmitting(true);

    try {
      const fieldConfig: Record<string, { key: string; type: string }> = {
        Component: { key: "component", type: "text" },
        Vendor: { key: "vendor", type: "text" },
        Priority: { key: "priority", type: "number" },
        "Needed By": { key: "needed_by_date", type: "date" },
        Description: { key: "description", type: "text" },
        "Reimbursement Type": { key: "reimbursement_type", type: "text" },
        "Final Price": { key: "final_cost_cents", type: "cents" },
        "Who will order?": { key: "requested_purchaser", type: "text" },
        "Bought w/o approval?": {
          key: "placed_order_unapproved",
          type: "boolean",
        },
      };

      const config = fieldConfig[editingField];
      if (!config) return;

      let valueToSend: any = editingValue;

      if (config.type === "number") {
        valueToSend = parseInt(editingValue);
      } else if (config.type === "cents") {
        valueToSend = Math.round(parseFloat(editingValue) * 100);
        if (valueToSend < 1) {
          notify.error("Final Price must be at least $0.01");
          setIsSubmitting(false);
          return;
        }
      } else if (config.type === "boolean") {
        valueToSend = editingValue === "true";
      } else if (config.type === "date") {
        valueToSend = new Date(editingValue).toISOString();
      }

      await axios.patch(
        `${JIFFY_API_URL}/purchase-requests/${purchaseRequest.id}`,
        { [config.key]: valueToSend },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("sentinel_access_token")}`,
          },
        },
      );

      notify.success(`${editingField} updated successfully`);
      setEditDialogOpen(false);
      if (onUpdate) onUpdate();
    } catch (error: any) {
      notify.error(
        getAxiosErrorMessage(error) || `Failed to update ${editingField}`,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const getFieldLabel = () => {
    const labels: Record<string, string> = {
      Component: "Component",
      Vendor: "Vendor",
      Priority: "Priority (1-5)",
      "Needed By": "Needed By Date",
      Description: "Description",
      "Reimbursement Type": "Reimbursement Type",
      "Final Price": "Final Price ($)",
      "Who will order?": "Who will order?",
      "Bought w/o approval?": "Bought without approval?",
    };
    return labels[editingField] || editingField;
  };

  const renderEditInput = () => {
    if (editingField === "Description") {
      return (
        <Textarea
          value={editingValue}
          onChange={(e) => setEditingValue(e.target.value)}
          className="min-h-[100px]"
        />
      );
    }

    if (editingField === "Priority") {
      return (
        <Select
          value={editingValue?.toString()}
          onValueChange={setEditingValue}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">1 - Low Priority</SelectItem>
            <SelectItem value="2">2 - Normal</SelectItem>
            <SelectItem value="3">3 - Medium</SelectItem>
            <SelectItem value="4">4 - High</SelectItem>
            <SelectItem value="5">5 - Urgent</SelectItem>
          </SelectContent>
        </Select>
      );
    }

    if (editingField === "Needed By") {
      return (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              data-empty={!editingDate}
              className="w-full justify-start text-left font-normal data-[empty=true]:text-muted-foreground"
            >
              <CalendarIcon className="mr-2 w-4" />
              {editingDate ? format(editingDate, "PPP") : "Select a date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={editingDate}
              onSelect={(selectedDate) => {
                setEditingDate(selectedDate);
                setEditingValue(
                  selectedDate ? selectedDate.toISOString().split("T")[0] : "",
                );
              }}
            />
          </PopoverContent>
        </Popover>
      );
    }

    if (editingField === "Final Price") {
      return (
        <Input
          type="number"
          step="0.01"
          value={editingValue}
          onChange={(e) => setEditingValue(e.target.value)}
          placeholder="0.00"
        />
      );
    }

    if (editingField === "Who will order?") {
      const ownerName = `${purchaseRequest.user?.first_name} ${purchaseRequest.user?.last_name}`;
      return (
        <Select value={editingValue} onValueChange={setEditingValue}>
          <SelectTrigger>
            <SelectValue placeholder="Select purchaser" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Gaucho Racing">Gaucho Racing</SelectItem>
            <SelectItem value={ownerName}>{ownerName}</SelectItem>
          </SelectContent>
        </Select>
      );
    }

    if (editingField === "Bought w/o approval?") {
      return (
        <Select value={editingValue} onValueChange={setEditingValue}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="true">Yes</SelectItem>
            <SelectItem value="false">No</SelectItem>
          </SelectContent>
        </Select>
      );
    }

    if (editingField === "Reimbursement Type") {
      return (
        <Select value={editingValue} onValueChange={setEditingValue}>
          <SelectTrigger>
            <SelectValue placeholder="Select reimbursement type" />
          </SelectTrigger>
          <SelectContent>
            {/* <SelectItem value={ReimbursementType.ReimbursementNotYet}>
              {ReimbursementType.ReimbursementNotYet}
            </SelectItem> */}
            <SelectItem value={ReimbursementType.ReimbursementGR}>
              {ReimbursementType.ReimbursementGR}
            </SelectItem>
            <SelectItem value={ReimbursementType.ReimbursementAS}>
              {ReimbursementType.ReimbursementAS}
            </SelectItem>
            <SelectItem value={ReimbursementType.ReimbursementOther}>
              {ReimbursementType.ReimbursementOther}
            </SelectItem>
          </SelectContent>
        </Select>
      );
    }

    return (
      <Input
        type="text"
        value={editingValue}
        onChange={(e) => setEditingValue(e.target.value)}
      />
    );
  };
  return (
    <>
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit {editingField}</DialogTitle>
            <DialogDescription>
              Update the {editingField.toLowerCase()} for this purchase request.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-field">{getFieldLabel()}</Label>
              {renderEditInput()}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button onClick={handleEditSubmit} disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="mx-12 mx-4 my-10 flex justify-start rounded-lg border bg-background p-8 pl-24">
        {isLoading ? (
          <></>
        ) : (
          <div className="w-full space-y-8">
            <div className="grid grid-cols-1 gap-y-10 lg:grid-cols-2">
              <div>
                <p className="mb-2 font-medium text-gray-400">Requester</p>
                <div className="flex items-center pl-8">
                  <Avatar className="mr-4 h-12 w-12">
                    <AvatarImage src={purchaseRequest.user?.avatar_url} />
                    <AvatarFallback>CN</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col items-start justify-center">
                    <div>
                      {purchaseRequest.user?.first_name}{" "}
                      {purchaseRequest.user?.last_name}
                    </div>
                    <div className="text-gray-400">
                      {purchaseRequest.user?.email}
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <div className="grid grid-cols-1 pt-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-[auto_1fr] xl:gap-x-24">
                  <p className="font-medium text-gray-400">ID #</p>
                  <p>{purchaseRequest.id}</p>
                  <p className="font-medium text-gray-400">Date Requested</p>
                  <p>
                    {purchaseRequest.created_at
                      ? new Date(
                          purchaseRequest.created_at,
                        ).toLocaleDateString()
                      : ""}
                  </p>
                  <p className="font-medium text-gray-400">Status</p>
                  <p>{purchaseRequest.status}</p>
                </div>
              </div>
            </div>
            <div className="mb-20">
              <div className="grid grid-cols-1 gap-y-10 lg:grid-cols-2 lg:items-start">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 lg:gap-x-24 xl:grid-cols-[auto_1fr]">
                  <p className="font-medium text-gray-400">Subteam </p>
                  <p>{department?.name}</p>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-400">Component </p>
                    {canAdvance &&
                      purchaseRequest.status !== "Pending Approval" &&
                      purchaseRequest.status !== "Request Rejected" && (
                        <Pencil
                          className="h-4 w-4 cursor-pointer text-gray-600 hover:text-white"
                          onClick={() =>
                            openEditDialog(
                              "Component",
                              purchaseRequest.component,
                              "text",
                            )
                          }
                        />
                      )}
                  </div>
                  <p>{purchaseRequest.component}</p>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-400">Vendor </p>
                    {canAdvance &&
                      purchaseRequest.status !== "Pending Approval" &&
                      purchaseRequest.status !== "Request Rejected" && (
                        <Pencil
                          className="h-4 w-4 cursor-pointer text-gray-600 hover:text-white"
                          onClick={() =>
                            openEditDialog(
                              "Vendor",
                              purchaseRequest.vendor,
                              "text",
                            )
                          }
                        />
                      )}
                  </div>
                  <p>{purchaseRequest.vendor}</p>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-400">Priority </p>
                    {canAdvance &&
                      purchaseRequest.status !== "Pending Approval" &&
                      purchaseRequest.status !== "Request Rejected" && (
                        <Pencil
                          className="h-4 w-4 cursor-pointer text-gray-600 hover:text-white"
                          onClick={() =>
                            openEditDialog(
                              "Priority",
                              purchaseRequest.priority,
                              "number",
                            )
                          }
                        />
                      )}
                  </div>
                  <p>{purchaseRequest.priority}</p>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-400">Needed By </p>
                    {canAdvance &&
                      purchaseRequest.status !== "Pending Approval" &&
                      purchaseRequest.status !== "Request Rejected" && (
                        <Pencil
                          className="h-4 w-4 cursor-pointer text-gray-600 hover:text-white"
                          onClick={() =>
                            openEditDialog(
                              "Needed By",
                              purchaseRequest.needed_by_date,
                              "date",
                            )
                          }
                        />
                      )}
                  </div>
                  <p>
                    {purchaseRequest.needed_by_date
                      ? new Date(
                          purchaseRequest.needed_by_date,
                        ).toLocaleDateString()
                      : ""}
                  </p>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-400">Description </p>
                    {canAdvance &&
                      purchaseRequest.status !== "Pending Approval" &&
                      purchaseRequest.status !== "Request Rejected" && (
                        <Pencil
                          className="h-4 w-4 cursor-pointer text-gray-600 hover:text-white"
                          onClick={() =>
                            openEditDialog(
                              "Description",
                              purchaseRequest.description,
                              "text",
                            )
                          }
                        />
                      )}
                  </div>
                  <p className="max-h-32 break-all pr-4">
                    {purchaseRequest.description}
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 lg:gap-x-10 xl:grid-cols-[auto_1fr]">
                  <p className="font-medium text-gray-400">
                    Estimated Item Total{" "}
                  </p>
                  <p>
                    $
                    {purchaseRequest.items
                      ? (
                          calculateEstimatedCostCents(purchaseRequest.items) /
                          100
                        ).toFixed(2)
                      : "0.00"}
                  </p>
                  <p className="font-medium text-gray-400">
                    Estimated Shipping/Tax{" "}
                  </p>
                  <p>
                    $
                    {purchaseRequest.shipping_tax_cost_cents
                      ? (purchaseRequest.shipping_tax_cost_cents / 100).toFixed(
                          2,
                        )
                      : "0.00"}
                  </p>
                  <p className="font-medium text-gray-400">
                    Discounts{" "}
                  </p>
                  <p>
                    -$
                    {purchaseRequest.discounts_cents
                      ? (purchaseRequest.discounts_cents / 100).toFixed(
                          2,
                        )
                      : "0.00"}
                  </p>
                  <p className="font-medium text-gray-400">Estimated Cost </p>
                  <p>
                    $
                    {purchaseRequest.estimated_cost_cents
                      ? (purchaseRequest.estimated_cost_cents / 100).toFixed(2)
                      : "0.00"}
                  </p>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-400">Who will order?</p>
                    {canAdvance &&
                      purchaseRequest.status !== "Pending Approval" &&
                      purchaseRequest.status !== "Request Rejected" && (
                        <Pencil
                          className="h-4 w-4 cursor-pointer text-gray-600 hover:text-white"
                          onClick={() =>
                            openEditDialog(
                              "Who will order?",
                              purchaseRequest.requested_purchaser,
                              "text",
                            )
                          }
                        />
                      )}
                  </div>
                  <p>{purchaseRequest.requested_purchaser}</p>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-400">Final Price </p>
                    {canAdvance &&
                      purchaseRequest.status !== "Pending Approval" &&
                      purchaseRequest.status !== "Request Rejected" && (
                        <Pencil
                          className="h-4 w-4 cursor-pointer text-gray-600 hover:text-white"
                          onClick={() =>
                            openEditDialog(
                              "Final Price",
                              purchaseRequest.final_cost_cents,
                              "cents",
                            )
                          }
                        />
                      )}
                  </div>
                  <p>
                    {purchaseRequest.final_cost_cents &&
                    purchaseRequest.final_cost_cents > 0
                      ? `$${(purchaseRequest.final_cost_cents / 100).toFixed(2)}`
                      : ""}
                  </p>
                  <p className="font-medium text-gray-400">Requested Address</p>
                  <p className="max-h-32 overflow-y-auto">
                    {purchaseRequest.shipping_address?.name
                      ? `${purchaseRequest.shipping_address.name} - ${purchaseRequest.shipping_address.street_address}, ${purchaseRequest.shipping_address.city}, ${purchaseRequest.shipping_address.state} ${purchaseRequest.shipping_address.zip_code}`
                      : ""}
                  </p>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-400">
                      Bought w/o approval?
                    </p>
                    {canAdvance &&
                      purchaseRequest.status !== "Pending Approval" &&
                      purchaseRequest.status !== "Request Rejected" && (
                        <Pencil
                          className="h-4 w-4 cursor-pointer text-gray-600 hover:text-white"
                          onClick={() =>
                            openEditDialog(
                              "Bought w/o approval?",
                              purchaseRequest.placed_order_unapproved,
                              "boolean",
                            )
                          }
                        />
                      )}
                  </div>
                  <p>
                    {purchaseRequest.placed_order_unapproved ? "Yes" : "No"}
                  </p>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-400">
                      Reimbursement Type
                    </p>
                    {canAdvance && purchaseRequest.status === "Reimbursed" && (
                      <Pencil
                        className="h-4 w-4 cursor-pointer text-gray-600 hover:text-white"
                        onClick={() =>
                          openEditDialog(
                            "Reimbursement Type",
                            purchaseRequest.reimbursement_type,
                            "text",
                          )
                        }
                      />
                    )}
                  </div>
                  <p>{purchaseRequest.reimbursement_type}</p>
                </div>
              </div>
            </div>
            <div>
              <p className="mb-2 mt-20 font-medium text-gray-400">
                Items ({purchaseRequest.items?.length || 0})
              </p>
              <div className="grid grid-cols-1 gap-4 pb-2 sm:grid-cols-[1fr_8fr_4fr_4fr_4fr_10fr]">
                <p className="text-sm font-medium text-gray-400"> </p>
                <p className="text-sm font-medium text-gray-400"> Item Name </p>
                <p className="text-sm font-medium text-gray-400">
                  {" "}
                  Unit Price{" "}
                </p>
                <p className="text-sm font-medium text-gray-400"> Quantity </p>
                <p className="text-sm font-medium text-gray-400">
                  {" "}
                  Item Total{" "}
                </p>
                <p className="text-sm font-medium text-gray-400"> URL </p>
              </div>
              {purchaseRequest.items && purchaseRequest.items.length > 0 ? (
                <div className="space-y-4">
                  {purchaseRequest.items.map((item, index) => (
                    <div key={item.id || index}>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_8fr_4fr_4fr_4fr_10fr]">
                        <p className="text-sm font-medium text-gray-400">
                          #{index + 1}
                        </p>

                        <p className=" break-all text-sm">
                          {item.name || "N/A"}
                        </p>

                        <p className="text-sm">
                          ${((item.unit_price_cents || 0) / 100).toFixed(2)}
                        </p>

                        <p className="text-sm">{item.quantity || 0}</p>

                        <p className="text-sm">
                          ${(calculateItemTotalCents(item) / 100).toFixed(2)}
                        </p>
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="break-all text-sm text-blue-400 underline"
                        >
                          {item.url}
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
    </>
  );
}

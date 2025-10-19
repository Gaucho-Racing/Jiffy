import { User } from "@/models/user";
import { ColumnDef } from "@tanstack/react-table";
import { ShippingAddress } from "./shipping_address";

export enum PurchaseRequestStatus {
  PurchaseRequestPending = "Pending Approval",
  PurchaseRequestApproved = "Request Approved",
  PurchaseRequestRejected = "Request Rejected",
  PurchaseRequestOrdered = "Order Placed",
  PurchaseRequestDelivered = "Order Delivered",
  PurchaseRequestCollected = "Order Collected",
}

export enum ApprovalStatus {
  ApprovalPending = "Pending",
  ApprovalApproved = "Approved",
  ApprovalRejected = "Rejected",
}

export enum ApprovalType {
  LeadApproval = "Lead",
  TreasurerApproval = "Treasurer",
  PresidentApproval = "President",
}

export const statusSteps = [
  PurchaseRequestStatus.PurchaseRequestRejected,
  PurchaseRequestStatus.PurchaseRequestPending,
  PurchaseRequestStatus.PurchaseRequestApproved,
  PurchaseRequestStatus.PurchaseRequestOrdered,
  PurchaseRequestStatus.PurchaseRequestDelivered,
  PurchaseRequestStatus.PurchaseRequestCollected,
];

export const validStatusAdvancements: {
  [key: string]: PurchaseRequestStatus | null;
} = {
  [PurchaseRequestStatus.PurchaseRequestPending]: null,
  [PurchaseRequestStatus.PurchaseRequestApproved]:
    PurchaseRequestStatus.PurchaseRequestOrdered,
  [PurchaseRequestStatus.PurchaseRequestOrdered]:
    PurchaseRequestStatus.PurchaseRequestDelivered,
  [PurchaseRequestStatus.PurchaseRequestDelivered]:
    PurchaseRequestStatus.PurchaseRequestCollected,
  [PurchaseRequestStatus.PurchaseRequestCollected]: null,
  [PurchaseRequestStatus.PurchaseRequestRejected]: null,
};

export interface Approval {
  id: number;
  pr_id: number;
  user_id: string;
  user: User;
  type: ApprovalType;
  status: ApprovalStatus;
  note: string;
  created_at: Date;
  updated_at: Date;
}

export interface PurchaseRequestItem {
  id: number;
  purchase_request_id: number;
  item_url: string;
  item_name: string;
  item_unit_price_cents: number;
  item_quantity: number;
  created_at: Date;
  updated_at: Date;
}

export interface PurchaseRequest {
  id: number;
  department_id: string;
  component: string;
  user_id: string;
  user: User;
  status: PurchaseRequestStatus;
  approvals: Approval[];
  items: PurchaseRequestItem[];
  vendor: string;
  shipping_tax_cost_cents: number;
  estimated_cost_cents: number;
  final_cost_cents: number;
  description: string;
  priority: number;
  needed_by_date: string; // ISO string (time.Time in Go)
  requested_purchaser: string;
  shipping_address_id: number;
  shipping_address: ShippingAddress;
  screenshot_url: string;
  updated_at: Date;
  created_at: Date;
}

export const columns: ColumnDef<PurchaseRequest>[] = [
  {
    accessorKey: "id",
    header: () => <div className="text-left">ID</div>,
  },
  {
    accessorKey: "status",
    header: "Status",
  },
  {
    accessorKey: "priority",
    header: "Priority",
  },
  {
    accessorKey: "department_id",
    header: "Department",
  },
  {
    accessorFn: (purchaseRequest) => {
      return `${purchaseRequest.user?.first_name} ${purchaseRequest.user?.last_name}`;
    },
    header: "Requester",
  },
  {
    accessorFn: (purchaseRequest) => {
      if (!purchaseRequest.items || purchaseRequest.items.length === 0) {
        return "No items";
      }
      if (purchaseRequest.items.length === 1) {
        return purchaseRequest.items[0].item_name;
      }
      return `${purchaseRequest.items.length} items`;
    },
    header: "Items",
  },

  {
    accessorKey: "created_at",
    header: "Created At",
    cell: ({ row }) => {
      const value = row.original.created_at;
      return <span>{value ? new Date(value).toLocaleDateString() : ""}</span>;
    },
  },
];

export const initApproval: Approval = {
  id: 0,
  pr_id: 0,
  user_id: "",
  user: {} as User,
  status: ApprovalStatus.ApprovalPending,
  type: ApprovalType.LeadApproval,
  note: "",
  created_at: new Date(),
  updated_at: new Date(),
};

export const initPurchaseRequestItem: PurchaseRequestItem = {
  id: 0,
  purchase_request_id: 0,
  item_url: "",
  item_name: "",
  item_unit_price_cents: 0,
  item_quantity: 1,
  created_at: new Date(),
  updated_at: new Date(),
};

export const initPurchaseRequest: PurchaseRequest = {
  id: 0,
  department_id: "",
  component: "",
  user_id: "",
  user: {} as User,
  status: PurchaseRequestStatus.PurchaseRequestPending,
  approvals: [],
  items: [],
  vendor: "",
  shipping_tax_cost_cents: 0,
  estimated_cost_cents: 0,
  final_cost_cents: 0,
  description: "",
  priority: 1,
  needed_by_date: "",
  requested_purchaser: "",
  shipping_address_id: 0,
  shipping_address: {} as ShippingAddress,
  screenshot_url: "",
  updated_at: new Date(),
  created_at: new Date(),
};

// Helper functions for working with items
export const calculateItemTotalCents = (item: PurchaseRequestItem): number => {
  return item.item_unit_price_cents * item.item_quantity;
};

export const calculateEstimatedCostCents = (
  items: PurchaseRequestItem[],
): number => {
  return items.reduce(
    (total, item) => total + calculateItemTotalCents(item),
    0,
  );
};

export const getItemCount = (items: PurchaseRequestItem[]): number => {
  return items.length;
};

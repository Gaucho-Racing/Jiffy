import { User } from "@/models/user";
import { ColumnDef } from "@tanstack/react-table";
import { ShippingAddress } from "./shipping_address";

export enum PurchaseRequestStatus {
  PurchaseRequestPending = "Pending Approval",
  PurchaseRequestApproved = "Request Approved",
  PurchaseRequestRejected = "Request Rejected",
  PurchaseRequestOrdered = "Order Placed",
  PurchaseRequestCollected = "Order Collected",
  PurchaseRequestReimbursed = "Reimbursed",
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

export enum NoteType {
  RequestSubmitted = "Request Submitted",
  Approved = "Approved",
  Rejected = "Rejected",
  StatusChanged = "Status Changed",
  RequestAmended = "Request Amended",
  Comment = "Comment",
  AttachmentUploaded = "Attachment Uploaded",
  AttachmentDeleted = "Attachment Deleted",
}

export const statusSteps = [
  PurchaseRequestStatus.PurchaseRequestRejected,
  PurchaseRequestStatus.PurchaseRequestPending,
  PurchaseRequestStatus.PurchaseRequestApproved,
  PurchaseRequestStatus.PurchaseRequestOrdered,
  PurchaseRequestStatus.PurchaseRequestCollected,
  PurchaseRequestStatus.PurchaseRequestReimbursed,
];

export const validStatusAdvancements: {
  [key: string]: PurchaseRequestStatus | null;
} = {
  [PurchaseRequestStatus.PurchaseRequestPending]: null,
  [PurchaseRequestStatus.PurchaseRequestApproved]:
    PurchaseRequestStatus.PurchaseRequestOrdered,
  [PurchaseRequestStatus.PurchaseRequestOrdered]:
    PurchaseRequestStatus.PurchaseRequestCollected,
  [PurchaseRequestStatus.PurchaseRequestCollected]:
    PurchaseRequestStatus.PurchaseRequestReimbursed,
  [PurchaseRequestStatus.PurchaseRequestReimbursed]: null,
  [PurchaseRequestStatus.PurchaseRequestRejected]: null,
};

export enum AttachmentType {
  AttachmentReceipt = "Receipt",
  AttachmentCheckoutPage = "Checkout Page",
  AttachmentInvoice = "Invoice",
  AttachmentQuote = "Quote",
  AttachmentOther = "Other",
}

export interface PurchaseRequestAttachment {
  id: string;
  purchase_request_id: number;
  user_id: string;
  user: User;
  url: string;
  filename: string;
  file_size: number;
  content_type: string;
  type: AttachmentType;
  description: string;
  note: string;
}

export interface PurchaseRequestApproval {
  id: number;
  purchase_request_id: number;
  user_id: string;
  user: User;
  type: ApprovalType;
  status: ApprovalStatus;
  note: string;
}

export interface PurchaseRequestItem {
  id: number;
  purchase_request_id: number;
  url: string;
  name: string;
  unit_price_cents: number;
  quantity: number;
}

export interface PurchaseRequestNote {
  id: number;
  purchase_request_id: number;
  user_id: string;
  user: User;
  type: NoteType;
  note: string;
}

export interface PurchaseRequest {
  id: number;
  department_id: string;
  component: string;
  user_id: string;
  user: User;
  status: PurchaseRequestStatus;
  approvals: PurchaseRequestApproval[];
  attachments: PurchaseRequestAttachment[];
  items: PurchaseRequestItem[];
  notes: PurchaseRequestNote[];
  vendor: string;
  shipping_tax_cost_cents: number;
  estimated_cost_cents: number;
  final_cost_cents: number;
  description: string;
  priority: number;
  needed_by_date: string;
  requested_purchaser: string;
  shipping_address_id: number;
  shipping_address: ShippingAddress;
  screenshot_url: string;
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
        return purchaseRequest.items[0].name;
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

export const initPurchaseRequestApproval: PurchaseRequestApproval = {
  id: 0,
  purchase_request_id: 0,
  user_id: "",
  user: {} as User,
  status: ApprovalStatus.ApprovalPending,
  type: ApprovalType.LeadApproval,
  note: "",
};

export const initPurchaseRequestItem: PurchaseRequestItem = {
  id: 0,
  purchase_request_id: 0,
  url: "",
  name: "",
  unit_price_cents: 0,
  quantity: 1,
};

export const initPurchaseRequest: PurchaseRequest = {
  id: 0,
  department_id: "",
  component: "",
  user_id: "",
  user: {} as User,
  status: PurchaseRequestStatus.PurchaseRequestPending,
  approvals: [],
  attachments: [],
  items: [],
  notes: [],
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
};

export const calculateItemTotalCents = (item: PurchaseRequestItem): number => {
  return item.unit_price_cents * item.quantity;
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

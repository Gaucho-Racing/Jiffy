import { User } from "@/models/user";
import { ShippingAddress } from "@/models/shipping_address";
import { ApproverGroup } from "@/models/approver_group";

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

export enum ReimbursementType {
  ReimbursementNotYet = "Not Reimbursed Yet",
  ReimbursementGR = "GR",
  ReimbursementAS = "AS",
  ReimbursementOther = "Other",
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
  created_at: Date;
  updated_at: Date;
}

export interface PurchaseRequestApproval {
  id: string;
  purchase_request_id: number;
  user_id: string;
  user: User;
  approver_group_id: string;
  approver_group: ApproverGroup;
  status: ApprovalStatus;
  note: string;
  created_at: Date;
  updated_at: Date;
}

export interface PurchaseRequestItem {
  id: string;
  purchase_request_id: number;
  url: string;
  name: string;
  unit_price_cents: number;
  quantity: number;
  created_at: Date;
  updated_at: Date;
}

export interface PurchaseRequestNote {
  id: string;
  purchase_request_id: number;
  user_id: string;
  user: User;
  type: NoteType;
  note: string;
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
  placed_order_unapproved: boolean;
  shipping_address_id: string;
  shipping_address: ShippingAddress;
  reimbursement_type: ReimbursementType;
  screenshot_url: string;
  updated_at: Date;
  created_at: Date;
}

export const initPurchaseRequestApproval: PurchaseRequestApproval = {
  id: "",
  purchase_request_id: 0,
  user_id: "",
  user: {} as User,
  approver_group_id: "",
  approver_group: {} as ApproverGroup,
  status: ApprovalStatus.ApprovalPending,
  note: "",
  created_at: new Date(),
  updated_at: new Date(),
};

export const initPurchaseRequestItem: PurchaseRequestItem = {
  id: "",
  purchase_request_id: 0,
  url: "",
  name: "",
  unit_price_cents: 0,
  quantity: 1,
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
  placed_order_unapproved: false,
  shipping_address_id: "",
  shipping_address: {} as ShippingAddress,
  reimbursement_type: ReimbursementType.ReimbursementNotYet,
  screenshot_url: "",
  updated_at: new Date(),
  created_at: new Date(),
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

import { Department } from "./departments";
import { User } from "./user";

export interface ApproverGroup {
  id: string;
  name: string;
  departments: Department[];
  approvers: User[];
  threshold_cents: number;
  updated_at: Date;
  created_at: Date;
}

export const initApproverGroup: ApproverGroup = {
  id: "",
  name: "",
  departments: [],
  approvers: [],
  threshold_cents: 0,
  updated_at: new Date(),
  created_at: new Date(),
};

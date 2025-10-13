export interface Department {
  id: string;
  name: string;
  approvers: DepartmentApprover[];
  budgets: DepartmentBudget[];
  updated_at: Date;
  created_at: Date;
}

export interface DepartmentApprover {
  department_id: string;
  userId: string;
  created_at: Date;
}
export interface DepartmentBudget {
  id: string;
  department_id: string;
  date: Date;
  amount: number;
  created_at: Date;
}

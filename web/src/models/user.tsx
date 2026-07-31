export interface User {
  id: string;
  entity_id: string;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  gender: string;
  birthday: string;
  graduate_level: string;
  graduation_year: number;
  major: string;
  shirt_size: string;
  jacket_size: string;
  sae_registration_number: string;
  occupation_title: string;
  occupation_company: string;
  avatar_url: string;
  initial_role: string;
  groups: string[];
  updated_at: string;
  created_at: string;
}

export const initUser: User = {
  id: "",
  entity_id: "",
  username: "",
  first_name: "",
  last_name: "",
  email: "",
  phone_number: "",
  gender: "",
  birthday: "",
  graduate_level: "",
  graduation_year: 0,
  major: "",
  shirt_size: "",
  jacket_size: "",
  sae_registration_number: "",
  occupation_title: "",
  occupation_company: "",
  avatar_url: "",
  initial_role: "",
  groups: [],
  updated_at: "",
  created_at: "",
};

export function isAdmin(user: User | null | undefined): boolean {
  return !!user?.groups?.includes("Admins");
}

export function isInnerCircle(user: User | null | undefined): boolean {
  const groups = user?.groups ?? [];
  return (
    groups.includes("Admins") ||
    groups.includes("Officers") ||
    groups.includes("Leads")
  );
}

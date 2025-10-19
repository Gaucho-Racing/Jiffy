export interface ShippingAddress {
  id: number;
  user_id: string;
  name: string;
  street_address: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  created_at: Date;
  updated_at: Date;
}

export const initShippingAddress: ShippingAddress = {
  id: 0,
  user_id: "",
  name: "",
  street_address: "",
  city: "",
  state: "",
  zip_code: "",
  country: "",
  created_at: new Date(),
  updated_at: new Date(),
};

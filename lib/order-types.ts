export type FulfilmentType = "delivery" | "collection";
export type PaymentMethod = "card" | "cash";
export type PaymentStatus = "pending" | "paid" | "failed" | "refunded" | "not-required";
export type OrderStatus = "new" | "preparing" | "ready" | "out-for-delivery" | "completed";

export type OrderLine = {
  id: number;
  name: string;
  emoji: string;
  price: number;
  quantity: number;
  modifiers?: string[];
};

export type CustomerDetails = {
  name: string;
  phone: string;
  email?: string;
  address?: string;
  postcode?: string;
  notes?: string;
};

export type RestaurantOrder = {
  id: string;
  orderNumber: number;
  createdAt: string;
  updatedAt: string;
  fulfilment: FulfilmentType;
  paymentMethod: PaymentMethod;
  paymentStatus?: PaymentStatus;
  status: OrderStatus;
  customer: CustomerDetails;
  items: OrderLine[];
  subtotal: number;
  deliveryFee: number;
  serviceFee: number;
  total: number;
  estimatedMinutes: number;
};

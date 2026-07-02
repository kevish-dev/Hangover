import { apiClient } from "./axios";

export interface ApiPayment {
  id: string;
  bookingId: string;
  paymentIntentId: string | null;
  type: "TOKEN" | "BALANCE" | "FULL";
  status:
    | "CREATED"
    | "PENDING"
    | "SUCCESS"
    | "FAILED"
    | "CANCELLED"
    | "REFUNDED";
  amount: string;
  currency: string;
  razorpayOrderId: string;
  razorpayPaymentId: string | null;
  createdAt: string;
  paidAt: string | null;
  booking: {
    bookingReference: string;
    trip: { title: string };
    user: { email: string; profile?: { fullName: string | null } };
  };
}

export const paymentApi = {
  // Service returns { data: payments[], meta: { total, page, limit, totalPages } }
  getAllPayments: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
  }) => {
    const res = await apiClient.get<{ data: ApiPayment[]; meta: { total: number } }>(
      "/payments",
      { params }
    );
    return res.data;
  },
};

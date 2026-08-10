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
  paymentMethod: string | null;
  failureCode: string | null;
  failureReason: string | null;
  receiptNumber: string | null;
  createdAt: string;
  paidAt: string | null;
  refunds: Array<{
    id: string;
    amount: string;
    status: "PENDING" | "SUCCESS" | "FAILED";
    reason: string | null;
    razorpayRefundId: string | null;
    processedAt: string | null;
    createdAt: string;
  }>;
  booking: {
    id: string;
    bookingReference: string;
    status: "PENDING" | "RESERVED" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
    paymentStatus: string;
    numberOfTravelers: number;
    totalAmount: string;
    amountPaid: string;
    amountDue: string;
    trip: { id: string; title: string; location: string; slug: string } | null;
    festival: { id: string; title: string; location: string; slug: string } | null;
    crmTrip?: { id: string; name: string; destination?: { name: string } } | null;
    crmFestival?: { id: string; name: string; destination?: { name: string } } | null;
    customTrip: { id: string; reference: string; title: string; startDate: string; endDate: string; durationDays: number } | null;
    slot: {
      id: string;
      title: string | null;
      startDate: string | null;
      endDate: string | null;
      trip: { id: string; title: string; location: string; slug: string } | null;
      festival: { id: string; title: string; location: string; slug: string } | null;
    } | null;
    crmTripSlot?: {
      id: string;
      title?: string | null;
      startDate: string | null;
      endDate: string | null;
      crmTrip?: { id: string; name: string } | null;
    } | null;
    crmFestivalSlot?: {
      id: string;
      title?: string | null;
      startDate: string | null;
      endDate: string | null;
      crmFestival?: { id: string; name: string } | null;
    } | null;
    package: { id: string; title: string; price: string; tokenAmount: string } | null;
    user: {
      email: string;
      profile?: { fullName: string | null; phone: string | null } | null;
    };
  };
}

export const paymentApi = {
  // Service returns { data: payments[], meta: { total, page, limit, totalPages } }
  getAllPayments: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
  }) => {
    const res = await apiClient.get<{
      data: ApiPayment[];
      meta: { total: number; page: number; limit: number; totalPages: number };
    }>(
      "/payments",
      { params }
    );
    return res.data;
  },
};

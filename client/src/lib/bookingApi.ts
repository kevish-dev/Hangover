import { queryOptions } from "@tanstack/react-query";
import { apiClient } from "./axios";

export const finalizeBooking = async (bookingId: string): Promise<{ success: boolean; message: string }> => {
  const response = await apiClient.post<{ success: boolean; message: string }>(`/bookings/${bookingId}/finalize`);
  return response.data;
};


export function checkoutBookingsQuery(userId?: string) {
  return queryOptions({
    queryKey: ["checkout-bookings", userId],
    queryFn: async ({ signal }) => {
      const response = await apiClient.get<{ data: any[] }>("/bookings/me", {
        params: { limit: 100 },
        signal,
      });
      return response.data.data ?? [];
    },
    enabled: Boolean(userId),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}

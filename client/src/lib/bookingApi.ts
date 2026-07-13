import { apiClient } from "./axios";

export const finalizeBooking = async (bookingId: string): Promise<{ success: boolean; message: string }> => {
  const response = await apiClient.post<{ success: boolean; message: string }>(`/bookings/${bookingId}/finalize`);
  return response.data;
};

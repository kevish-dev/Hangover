import { apiClient } from "./axios";

export const finalizeCompletedTrips = async (): Promise<{ count: number; message: string }> => {
  const response = await apiClient.post<{ count: number; message: string }>("/bookings/finalize-completed");
  return response.data;
};

import { useQuery } from '@tanstack/react-query';
import { apiClient } from './axios';

export interface AnalyticsData {
  revenueVsCost: Array<{ name: string; revenue: number; cost: number }>;
  costBreakdown: Array<{ name: string; value: number }>;
  cashflow: Array<{ name: string; amount: number }>;
  travelers: Array<{ name: string; new: number; returning: number }>;
  ratings: Array<{ name: string; rating: number }>;
  crm: { revenue: number; cost: number; net: number; bookings: number; travelers: number };
}

export const useAnalytics = (timeframe: string) => {
  return useQuery({
    queryKey: ['analytics', timeframe],
    queryFn: async (): Promise<AnalyticsData> => {
      const response = await apiClient.get('/analytics', {
        params: { timeframe },
      });
      return response.data.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

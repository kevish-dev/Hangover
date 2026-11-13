import { queryOptions } from "@tanstack/react-query";
import { apiClient } from "./axios";

// Root owns polling; every consumer shares the same freshness/focus policy.
export const siteSettingsQuery = queryOptions({
  queryKey: ["site-settings"],
  queryFn: async () =>
    (await apiClient.get("/site-settings")).data.data as { maintenanceMode: boolean },
  staleTime: 30_000,
  refetchOnWindowFocus: false,
});

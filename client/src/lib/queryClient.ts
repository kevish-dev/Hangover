import { QueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        if (failureCount > 0 || !isAxiosError(error)) return false;
        if (error.response) return [502, 503, 504].includes(error.response.status);
        return error.code === "ERR_NETWORK";
      },
      retryDelay: 750,
    },
  },
});

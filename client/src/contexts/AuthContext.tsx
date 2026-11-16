import { createContext, useContext, ReactNode, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { apiClient } from "../lib/axios";

export interface User {
  name: string;
  id: string;
  email: string;
  googleId: string;
  role: "USER" | "ADMIN";
  isActive: boolean;
  profile?: any;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  logout: () => void;
  sessionError: boolean;
  retrySession: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: async ({ signal }) => {
      try {
        const response = await apiClient.get<{ user: User }>("/auth/me", { signal });
        return response.data;
      } catch (error) {
        if (isAxiosError(error) && [401, 403].includes(error.response?.status ?? 0)) {
          return { user: null };
        }
        throw error;
      }
    },
    retry: false,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  const user = data?.user || null;

  useEffect(() => {
    if (user) {
      const intent = localStorage.getItem("booking_redirect_intent");
      if (intent) {
        localStorage.removeItem("booking_redirect_intent");
        window.location.href = intent;
      }
    }
  }, [user]);

  const logout = async () => {
    try {
      await apiClient.post("/auth/logout");
      queryClient.setQueryData(["auth", "me"], { user: null });
      window.location.href = "/";
    } catch (error) {
      console.error("Failed to logout", error);
    }
  };

  return (
    <AuthContext.Provider value={{
      user, isLoading: isPending, logout,
      sessionError: isError && !data,
      retrySession: () => void refetch(),
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

import { createContext, useContext, ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      try {
        const response = await apiClient.get<{ user: User }>("/auth/me");
        return response.data;
      } catch (error) {
        return { user: null };
      }
    },
    retry: false,
  });

  const user = data?.user || null;

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
    <AuthContext.Provider value={{ user, isLoading, logout }}>
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

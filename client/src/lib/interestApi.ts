import { apiClient } from "./axios";

export interface InterestSubmissionInput {
  name: string;
  email?: string | null;
  whatsapp?: string | null;
  instagram?: string | null;
  crmTripId?: string | null;
  crmFestivalId?: string | null;
  tripId?: string | null;
  festivalId?: string | null;
}

export interface InterestSubmissionRecord {
  id: string;
  name: string;
  email: string | null;
  whatsapp: string | null;
  instagram: string | null;
  crmTripId: string | null;
  crmFestivalId: string | null;
  tripId: string | null;
  festivalId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InterestItemOverview {
  id: string;
  type: "CRM_TRIP" | "CRM_FESTIVAL" | "TRIP" | "FESTIVAL";
  title: string;
  isActive: boolean;
  isPublished: boolean;
  destinationName: string;
  submissions: InterestSubmissionRecord[];
}

export interface InterestOverviewResponse {
  totalEnabledCount: number;
  totalSubmissionsCount: number;
  items: InterestItemOverview[];
}

export const interestApi = {
  submitInterest: async (input: InterestSubmissionInput) => {
    const response = await apiClient.post("/interests", input);
    return response.data;
  },

  getOverview: async (): Promise<InterestOverviewResponse> => {
    const response = await apiClient.get("/interests");
    return response.data.data;
  },

  deleteSubmission: async (id: string) => {
    const response = await apiClient.delete(`/interests/${id}`);
    return response.data;
  },
};

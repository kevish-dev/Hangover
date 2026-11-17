import { isAxiosError } from "axios";
import { apiClient } from "./axios";

// ── Backend response types ────────────────────────────────────────

export interface ApiDestination {
  id: string;
  name: string;
  state: string;
  subheading: string | null;
}

export interface ApiTag {
  id: string;
  tag: string;
}

export interface ApiFaq {
  id: string;
  question: string;
  answer: string;
  order: number;
}

export interface ApiActivity {
  id: string;
  title: string;
  description: string | null;
  time: string | null;
  order: number;
}

export interface ApiItineraryDay {
  id?: string;
  day?: string;
  dayNumber?: number;
  title: string;
  description?: string | null;
  todos?: string[];
  activities?: string | string[];
}

export interface ApiItinerary {
  id: string;
  title: string;
  description: string | null;
  days: ApiItineraryDay[];
}

export interface ApiStayTransportItem {
  text: string;
  imageUrl: string;
}

export interface ApiSlot {
  id: string;
  startDate: string;
  endDate: string;
  capacity: number;
  filledSpots: number;
}

export interface ApiFestival {
  id: string;
  title: string;
  slug: string;
  publicSlug?: string | null;
  location: string;
  bannerImages: string[];
  videoUrl: string | null;
  duration: number;
  bestTimeToVisit: string;
  overview: string;
  highlights: ApiStayTransportItem[] | null;
  inclusions: string[];
  exclusions: string[];
  stayTransportImages: ApiStayTransportItem[] | null;
  price?: string; // Decimal comes as string from Prisma
  tokenAmount?: string;
  packages?: any[];
  isActive: boolean;
  isPublished: boolean;
  isListed?: boolean;
  isFeatured: boolean;
  destinationId: string | null;
  destination: ApiDestination | null;
  tags: ApiTag[];
  faqs: ApiFaq[];
  addOns?: Array<{
    id: string;
    title: string;
    description?: string | null;
    imageUrl?: string | null;
    price: string | number;
    maxQuantityPerBooking?: number | null;
    maxQuantityPerSlot?: number | null;
    purchaseCutoffOffsetDays?: number | null;
    isActive: boolean;
  }>;
  slots: ApiSlot[];
  itinerary?: ApiItineraryDay[];
  createdAt: string;
  updatedAt: string;
}

export interface ApiFestivalsResponse {
  data: ApiFestival[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ApiFeaturedFestivalsResponse {
  message: string;
  result: ApiFestival[];
}

// ── Fetch functions ───────────────────────────────────────────────

export async function fetchLegacyFestivals(signal?: AbortSignal): Promise<ApiFestival[]> {
  const response = await apiClient.get<ApiFestivalsResponse>("/festivals", {
    params: { page: 1, limit: 200 },
    signal,
  });
  return response.data.data ?? [];
}

export async function fetchCrmFestivals(signal?: AbortSignal): Promise<ApiFestival[]> {
  const response = await apiClient.get<{ data: ApiFestival[] }>("/crm-festivals/public", { signal });
  return response.data.data;
}

export async function fetchFestivalBySlug(slug: string, signal?: AbortSignal): Promise<ApiFestival> {
  const id = encodeURIComponent(slug);
  try {
    return (await apiClient.get<ApiFestival>(`/crm-festivals/public/${id}`, { signal })).data;
  } catch (error) {
    if (!isAxiosError(error) || error.response?.status !== 404) throw error;
    return (await apiClient.get<ApiFestival>(`/festivals/${id}`, { signal })).data;
  }
}

export async function fetchFeaturedFestivals(signal?: AbortSignal): Promise<ApiFestival[]> {
  const [featuredResult, crmFeaturedResult] = await Promise.allSettled([
    apiClient.get<ApiFeaturedFestivalsResponse & { data?: ApiFestival[] }>("/festivals/featured", { signal }),
    apiClient.get<{ data: ApiFestival[] }>("/crm-festivals/public/featured", { signal }),
  ]);
  if (featuredResult.status === "rejected" && crmFeaturedResult.status === "rejected") {
    throw crmFeaturedResult.reason;
  }
  const featured = featuredResult.status === "fulfilled" ? (featuredResult.value.data?.result || featuredResult.value.data?.data || []) : [];
  const crmFeatured = crmFeaturedResult.status === "fulfilled" ? (crmFeaturedResult.value.data?.data || []) : [];
  return [...featured, ...crmFeatured];
}

// ── Formatting helpers ────────────────────────────────────────────

export function formatPrice(price: string | number): string {
  const num = typeof price === "string" ? parseFloat(price) : price;
  if (isNaN(num)) return "Not Available";
  return `₹${num.toLocaleString("en-IN")}`;
}

export function priceToNumber(price: string | number): number {
  const num = typeof price === "string" ? parseFloat(price) : price;
  return isNaN(num) ? 0 : num;
}

export function formatDuration(days: number): string {
  if (!days || days <= 0) return "Not Available";
  if (days === 1) return "1 Day";
  return `${days} Days`;
}

export function formatAltitude(meters: number | null): string {
  if (!meters || meters <= 0) return "Not Available";
  return `${meters.toLocaleString("en-IN")} m`;
}

export function spotsLeft(capacity: number, filled: number): number {
  return Math.max(0, (capacity || 0) - (filled || 0));
}

// ── "Not Available" display value ─────────────────────────────────

export function safeValue(
  val: string | null | undefined,
  fallback = "Not Available",
): string {
  return val && val.trim().length > 0 ? val : fallback;
}

export function isNotAvailable(val: string | null | undefined): boolean {
  return !val || val.trim().length === 0 || val === "Not Available";
}

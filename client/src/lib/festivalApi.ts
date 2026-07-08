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
  id: string;
  dayNumber: number;
  title: string;
  description: string | null;
  activities: ApiActivity[];
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
  price: string; // Decimal comes as string from Prisma
  tokenAmount: string;
  isActive: boolean;
  isPublished: boolean;
  isFeatured: boolean;
  destinationId: string | null;
  destination: ApiDestination | null;
  tags: ApiTag[];
  faqs: ApiFaq[];
  slots: ApiSlot[];
  itinerary?: any;
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
  result: {
    data: ApiFestival[];
  };
}

// ── Fetch functions ───────────────────────────────────────────────

export async function fetchAllFestivals(): Promise<ApiFestival[]> {
  // Fetch with a high limit to get all festivals for client-side filtering
  const res = await apiClient.get<ApiFestivalsResponse>("/festivals", {
    params: { page: 1, limit: 200 },
  });
  return res.data.data;
}

export async function fetchFestivalBySlug(slug: string): Promise<ApiFestival> {
  const res = await apiClient.get<ApiFestival>(`/festivals/${slug}`);
  return res.data;
}

export async function fetchFeaturedFestivals(): Promise<ApiFestival[]> {
  const res = await apiClient.get<ApiFeaturedFestivalsResponse>("/festivals/featured");
  return res.data.result.data;
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

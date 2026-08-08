import { apiClient } from "./axios";

// ── Backend response types ────────────────────────────────────────

export interface ApiDestination {
  id: string;
  name: string;
  state: string;
  subheading: string | null;
}

export interface ApiTripTag {
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

export interface ApiTrip {
  id: string;
  title: string;
  slug: string;
  location: string;
  bannerImages: string[];
  duration: number;
  bestTimeToVisit: string;
  overview: string;
  highlights: ApiStayTransportItem[] | null;
  inclusions: string[];
  exclusions: string[];
  stayTransportImages: ApiStayTransportItem[] | null;
  capacity: number;
  filledSpots: number;
  startDate: string;
  endDate: string;
  tripType: string;
  isActive: boolean;
  isPublished: boolean;
  isFeatured: boolean;
  isSignature?: boolean;
  signatureOrder?: number;
  destinationId: string | null;
  destination: ApiDestination | null;
  tripTags: ApiTripTag[];
  faqs: ApiFaq[];
  itinerary?: ApiItineraryDay[];
  createdAt: string;
  updatedAt: string;
  slots?: any[];
  packages?: any[];
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
  isListed?: boolean;
  isCrmTrip?: boolean;
}

export interface ApiTripsResponse {
  data: ApiTrip[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// ── Fetch functions ───────────────────────────────────────────────

export async function fetchAllTrips(): Promise<ApiTrip[]> {
  const [tripsResult, itineraryTripsResult] = await Promise.allSettled([
    apiClient.get<ApiTripsResponse>("/trips", { params: { page: 1, limit: 200 } }),
    apiClient.get<{ data: ApiTrip[] }>("/crm-trips/public"),
  ]);
  const trips = tripsResult.status === "fulfilled" ? tripsResult.value.data.data : [];
  const itineraryTrips = itineraryTripsResult.status === "fulfilled" ? itineraryTripsResult.value.data.data : [];
  return [...trips, ...itineraryTrips];
}

export async function fetchTripBySlug(slug: string, shareToken?: string | null): Promise<ApiTrip> {
  try {
    const res = await apiClient.get<ApiTrip>(`/trips/${slug}`, {
      params: shareToken ? { shareToken } : undefined,
    });
    return res.data;
  } catch (error) {
    const res = await apiClient.get<ApiTrip>(`/crm-trips/public/${slug}`);
    return res.data;
  }
}

// ── Trip Type labels ──────────────────────────────────────────────

export const TRIP_TYPE_LABELS: Record<string, string> = {
  MOUNTAIN_TREK: "Mountain Trek",
  BEACH_ESCAPE: "Beach Escape",
  DESERT_EXPEDITION: "Desert Expedition",
  JUNGLE_WILDLIFE: "Jungle & Wildlife",
  HERITAGE_WALK: "Heritage Walk",
  ROAD_TRIP: "Road Trip",
  BACKPACKING_TOUR: "Backpacking Tour",
  PHOTOGRAPHY_TOUR: "Photography Tour",
  BONFIRE_RETREAT: "Bonfire Retreat",
  INSTITUTE_COLLEGE_TRIP: "Institute / College Trip",
  CUSTOM_TRIP: "Custom Trip",
};

export function formatTripType(tripType: string): string {
  return (
    TRIP_TYPE_LABELS[tripType] ||
    tripType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
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

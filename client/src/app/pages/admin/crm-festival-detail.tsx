import { type ReactNode, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Loader2,
  Plus,
  Trash2,
  UserPlus,
  Utensils,
  Video,
  Tent,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "../../../lib/axios";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { uploadGenericImageDirect, uploadGenericVideoDirect } from "../../../lib/directImageUpload";

type Master = {
  id: string;
  name: string;
  destinationId?: string;
  stayLocationId?: string;
  stayLocation?: { id: string; name: string };
};
type Activity = { id: string; name: string; description?: string | null };
type DayCommonInclusionKey =
  | "ILP_AND_PERMITS"
  | "BBQ"
  | "BONFIRE"
  | "TRIP_GUIDE";
type Day = {
  id: string;
  dayNumber: number;
  stayLocationId?: string | null;
  propertyId?: string | null;
  breakfast: boolean;
  lunch: boolean;
  dinner: boolean;
  notes?: string | null;
  isDropOff: boolean;
  dropOffLocationId?: string | null;
  stayLocation?: Master | null;
  property?: Master | null;
  dropOffLocation?: Master | null;
  visitingPlaces: { id: string; place: Master }[];
  activities: Activity[];
  commonInclusions: { id: string; key: DayCommonInclusionKey }[];
};
type Inclusion = {
  id: string;
  title: string;
  description?: string | null;
  type: string;
  itineraryDayId?: string | null;
};
type CommonInclusion = {
  id: string;
  key:
    | "BREAKFAST"
    | "DINNER"
    | "ILP_AND_PERMITS"
    | "TRAVEL"
    | "VEHICLE_TYPE"
    | "BBQ"
    | "BONFIRE"
    | "TRIP_GUIDE"
    | "FIRST_AID_KIT";
  numberOfDays?: number | null;
  isIncluded?: boolean | null;
  vehicleType?: "SEDAN" | "SUV" | "INNOVA" | "TRAVELLER" | null;
};
type Payment = {
  id: string;
  amount: string | number;
  status: string;
  type: string;
  paymentMethod?: string | null;
  paidAt?: string | null;
  notes?: { paymentLink?: string };
};
type CrmSlot = {
  id: string;
  title?: string | null;
  startDate: string;
  endDate: string;
  capacity: number;
  filledSpots: number;
  _count?: { bookings: number };
};
type Booking = {
  id: string;
  bookingReference: string;
  status: string;
  paymentStatus: string;
  totalAmount: string | number;
  tokenAmount: string | number;
  amountPaid: string | number;
  amountDue: string | number;
  numberOfTravelers: number;
  createdAt: string;
  crmFestivalSlotId?: string | null;
  crmFestivalSlot?: CrmSlot | null;
  user: {
    email: string;
    profile?: { fullName?: string | null; phone?: string | null } | null;
  };
  payments: Payment[];
};
type CrmFestival = {
  id: string;
  name: string;
  numberOfNights: number;
  destinationId: string;
  totalAmount: string | number | null;
  tokenAmount: string | number | null;
  airportPickupEnabled: boolean;
  airportDropEnabled: boolean;
  tripType?: string | null;
  bestTimeToVisit?: string | null;
  isActive: boolean;
  isFeatured: boolean;
  isPublished: boolean;
  isListed: boolean;
  operationsReminderDays: number;
  exclusions: string[];
  websiteOverview?: string | null;
  websiteFaqs?: { question: string; answer: string }[];
  websiteTags?: { id: string; tag: string }[];
  websiteBannerImages?: string[];
  websiteStayTransportImages?: string[];
  websiteHighlights?: { text: string; imageUrl?: string }[];
  websiteVideoUrl?: string | null;
  destination: Master;
  packages: Array<{ id: string; title: string; price: string | number; tokenAmount: string | number }>;
  addOns: Array<{ id: string; title: string; description?: string | null; imageUrl?: string | null; price: string | number; maxQuantityPerBooking?: number | null; maxQuantityPerSlot?: number | null; purchaseCutoffOffsetDays?: number | null; isActive: boolean }>;
  itineraryDays: Day[];
  inclusions: Inclusion[];
  commonInclusions: CommonInclusion[];
  slots: CrmSlot[];
};

export default function CrmFestivalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"itinerary" | "pricing" | "bookings" | "operations" | "ledger" | "website">("itinerary");

  const festivalQuery = useQuery({
    queryKey: ["crm-festivals", id],
    queryFn: async () => (await apiClient.get<CrmFestival>(`/crm-festivals/${id}`)).data,
    enabled: Boolean(id),
  });

  const festival = festivalQuery.data;

  // Video Upload State in Website Tab
  const [websiteVideoUrl, setWebsiteVideoUrl] = useState("");
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [savingVideo, setSavingVideo] = useState(false);

  useEffect(() => {
    if (festival?.websiteVideoUrl) {
      setWebsiteVideoUrl(festival.websiteVideoUrl);
    }
  }, [festival?.websiteVideoUrl]);

  if (festivalQuery.isLoading) {
    return (
      <div className="flex py-24 justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#b59410]" />
      </div>
    );
  }

  if (!festival) {
    return (
      <div className="py-12 text-center text-gray-500">
        Festival not found or removed.
      </div>
    );
  }

  const handleSaveVideoUrl = async () => {
    try {
      setSavingVideo(true);
      await apiClient.patch(`/crm-festivals/${id}`, {
        websiteVideoUrl: websiteVideoUrl.trim() || null,
      });
      toast.success("Video URL updated successfully");
      queryClient.invalidateQueries({ queryKey: ["crm-festivals", id] });
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to update video URL");
    } finally {
      setSavingVideo(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-16">
      <header className="space-y-3">
        <button
          onClick={() => navigate("/dashboard/crm-festivals")}
          className="inline-flex items-center text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Back to festivals
        </button>
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-xs font-bold text-[#b59410]">
                <Tent className="h-4 w-4" /> {festival.destination?.name}
              </span>
              <span className="rounded-full bg-[#781216]/10 px-2 py-0.5 text-[10px] font-bold text-[#781216]">
                {festival.numberOfNights} Nights ({festival.numberOfNights + 1} Days)
              </span>
            </div>
            <h1 className="mt-1 text-3xl font-extrabold text-gray-900">{festival.name}</h1>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b pb-2">
        {(
          [
            { key: "itinerary", label: "Itinerary & Inclusions" },
            { key: "pricing", label: "Pricing & Slots" },
            { key: "bookings", label: "Bookings" },
            { key: "operations", label: "Operations" },
            { key: "ledger", label: "Balance Sheet" },
            { key: "website", label: "Website & FAQs" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
              activeTab === tab.key
                ? "bg-[#781216] text-white shadow-sm"
                : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Contents */}
      {activeTab === "itinerary" && (
        <div className="space-y-6">
          <div className="rounded-xl border bg-white p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Configured Days ({festival.itineraryDays.length})</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {festival.itineraryDays.map((day) => (
                <div key={day.id} className="rounded-lg border p-4 bg-gray-50 space-y-2">
                  <span className="text-xs font-bold text-[#781216] uppercase">Day {day.dayNumber}</span>
                  <p className="text-sm font-semibold text-gray-900">{day.notes || "No notes set"}</p>
                  <p className="text-xs text-gray-500">
                    Stay: {day.stayLocation?.name || "None"} · Property: {day.property?.name || "None"}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === "pricing" && (
        <div className="rounded-xl border bg-white p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">Pricing & Slots</h2>
          </div>
          <div className="grid grid-cols-2 gap-4 max-w-md">
            <div className="p-4 bg-gray-50 rounded-lg border">
              <span className="text-xs text-gray-500 font-semibold uppercase">Total Price</span>
              <p className="text-2xl font-bold text-gray-900">₹{Number(festival.totalAmount || 0).toLocaleString()}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg border">
              <span className="text-xs text-gray-500 font-semibold uppercase">Token Amount</span>
              <p className="text-2xl font-bold text-gray-900">₹{Number(festival.tokenAmount || 0).toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === "website" && (
        <div className="space-y-6">
          <div className="rounded-xl border bg-white p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Video className="h-5 w-5 text-[#781216]" /> Festival Website Video
                </h2>
                <p className="text-xs text-gray-500">Upload or change the featured video for this festival detail page</p>
              </div>
              <label className="inline-flex h-9 cursor-pointer items-center justify-center rounded-md bg-[#781216] px-4 text-xs font-semibold text-white shadow hover:bg-[#5f0e11] transition">
                {uploadingVideo ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Plus className="mr-1.5 h-4 w-4" />}
                {uploadingVideo ? "Uploading..." : "Upload New Video"}
                <input
                  type="file"
                  className="hidden"
                  accept="video/*"
                  disabled={uploadingVideo}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      setUploadingVideo(true);
                      toast.loading("Uploading video...", { id: "vid-det" });
                      const url = await uploadGenericVideoDirect(file);
                      setWebsiteVideoUrl(url);
                      toast.success("Video uploaded! Click Save to apply", { id: "vid-det" });
                    } catch (err: any) {
                      toast.error("Video upload failed", { id: "vid-det" });
                    } finally {
                      setUploadingVideo(false);
                    }
                  }}
                />
              </label>
            </div>

            {websiteVideoUrl ? (
              <div className="space-y-3">
                <div className="relative aspect-video w-full max-w-2xl overflow-hidden rounded-xl border bg-black shadow-md">
                  <video src={websiteVideoUrl} controls className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setWebsiteVideoUrl("")}
                    className="absolute right-3 top-3 rounded-full bg-red-600 p-2 text-white shadow hover:bg-red-700 transition"
                    title="Remove video"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex items-center gap-3 max-w-2xl">
                  <Input
                    value={websiteVideoUrl}
                    onChange={(e) => setWebsiteVideoUrl(e.target.value)}
                    placeholder="Video URL"
                    className="text-xs"
                  />
                  <Button
                    onClick={handleSaveVideoUrl}
                    disabled={savingVideo}
                    className="bg-[#781216] text-white hover:bg-[#5f0e11] text-xs h-9 px-4 shrink-0"
                  >
                    {savingVideo && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                    Save Video URL
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex aspect-video w-full max-w-2xl flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 p-8 text-center">
                <Video className="h-10 w-10 text-gray-400 mb-3" />
                <p className="text-sm font-bold text-gray-700">No Video Attached</p>
                <p className="text-xs text-gray-500 mt-1 max-w-md">
                  Click "Upload New Video" above or paste a video URL below to attach a festival showcase video.
                </p>
                <div className="mt-4 flex items-center gap-2 w-full max-w-md">
                  <Input
                    value={websiteVideoUrl}
                    onChange={(e) => setWebsiteVideoUrl(e.target.value)}
                    placeholder="https://res.cloudinary.com/... or video URL"
                    className="text-xs bg-white"
                  />
                  <Button
                    onClick={handleSaveVideoUrl}
                    disabled={savingVideo || !websiteVideoUrl.trim()}
                    className="bg-[#781216] text-white hover:bg-[#5f0e11] text-xs h-9 px-4 shrink-0"
                  >
                    Save
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-xl border bg-white p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Overview</h2>
            <p className="text-sm text-gray-700 whitespace-pre-line">{festival.websiteOverview || "No overview specified."}</p>
          </div>
        </div>
      )}
    </div>
  );
}

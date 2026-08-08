import { FormEvent, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import {
  CalendarDays,
  ArrowDown,
  ArrowUp,
  Copy,
  ChevronRight,
  ImagePlus,
  Loader2,
  MapPin,
  MoreHorizontal,
  Plus,
  Trash2,
  X,
  ArrowLeft,
  Check,
  Receipt,
  Users,
  CreditCard,
  ShieldCheck,
  Video,
  Tent,
} from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "../../../lib/axios";
import AdminVerifyPaymentModal from "../../components/admin/AdminVerifyPaymentModal";
import { Button } from "../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { uploadGenericImageDirect, uploadGenericVideoDirect } from "../../../lib/directImageUpload";
import { useNavigate } from "react-router";

type Destination = { id: string; name: string };
type CrmFestival = {
  id: string;
  name: string;
  numberOfNights: number;
  destination: Destination;
  airportPickupEnabled: boolean;
  airportDropEnabled: boolean;
  tripType?: string | null;
  bestTimeToVisit?: string | null;
  isActive: boolean;
  isFeatured: boolean;
  isPublished: boolean;
  isListed: boolean;
  _count?: { itineraryDays: number; inclusions: number; bookings?: number };
};
type CrmFestivalDetail = CrmFestival & {
  totalAmount: string | number;
  tokenAmount: string | number;
  packages: Array<{ id: string; title: string; price: string | number; tokenAmount: string | number }>;
  addOns: Array<{ id: string; title: string; description?: string | null; imageUrl?: string | null; price: string | number; maxQuantityPerBooking?: number | null; maxQuantityPerSlot?: number | null; purchaseCutoffOffsetDays?: number | null; isActive: boolean }>;
  itineraryDays: Array<{ stayLocationId?: string | null; propertyId?: string | null; visitingPlaces: Array<{ placeId?: string; place: { id: string } }>; breakfast: boolean; lunch: boolean; dinner: boolean; transportEnabled?: boolean; transportText?: string | null; notes?: string | null; isDropOff: boolean; dropOffLocationId?: string | null; activities: Array<{ name: string }>; commonInclusions: Array<{ key: DayCommonInclusionKey }> }>;
  operationsReminderDays?: number;
  websiteOverview?: string | null;
  websiteFaqs?: Array<{ question: string; answer: string }>;
  websiteTags?: Array<{ id: string }>;
  websiteBannerImages?: string[];
  websiteStayTransportImages?: string[];
  websiteHighlights?: Array<{ text: string; imageUrl?: string } | string>;
  websiteVideoUrl?: string | null;
  slots?: Array<{ id: string; startDate: string; endDate: string; capacity: number; title?: string | null; priority: number; filledSpots?: number; _count?: { bookings: number } }>;
};
type WebsiteHighlightDraft = {
  text: string;
  imageUrl: string;
};
type PricingPackageDraft = {
  id?: string;
  title: string;
  price: string;
  tokenAmount: string;
};
type AddOnDraft = {
  id?: string;
  title: string;
  description: string;
  imageUrl: string;
  price: string;
  maxQuantityPerBooking: string;
  maxQuantityPerSlot: string;
  purchaseCutoffOffsetDays: string;
  isActive: boolean;
};
type Master = { id: string; name: string; stayLocationId?: string };
type DayCommonInclusionKey = "ILP_AND_PERMITS" | "BBQ" | "BONFIRE" | "TRIP_GUIDE";
type ItineraryDayDraft = {
  stayLocationId: string;
  propertyId: string;
  placeIds: string[];
  breakfast: boolean;
  lunch: boolean;
  dinner: boolean;
  transportEnabled: boolean;
  transportText: string;
  notes: string;
  isDropOff: boolean;
  dropOffLocationId: string;
  activities: Array<{ name: string; description: string }>;
  commonInclusions: DayCommonInclusionKey[];
};
type SlotDraft = {
  id?: string;
  startDate: string;
  endDate: string;
  capacity: string;
  title: string;
  priority: number;
};

const TRIP_TYPES = [
  "MOUNTAIN_TREK", "BEACH_ESCAPE", "DESERT_EXPEDITION", "JUNGLE_WILDLIFE",
  "HERITAGE_WALK", "ROAD_TRIP", "BACKPACKING_TOUR", "PHOTOGRAPHY_TOUR",
  "BONFIRE_RETREAT", "INSTITUTE_COLLEGE_TRIP", "CUSTOM_TRIP",
];

const FESTIVAL_DRAFTS_KEY = "crm-festival-drafts:v1";

const createEmptyDay = (): ItineraryDayDraft => ({
  stayLocationId: "",
  propertyId: "",
  placeIds: [],
  breakfast: false,
  lunch: false,
  dinner: false,
  transportEnabled: false,
  transportText: "",
  notes: "",
  isDropOff: false,
  dropOffLocationId: "",
  activities: [],
  commonInclusions: [],
});

const calculateEndDate = (startDate: string, nights: number) => {
  if (!startDate || Number.isNaN(Date.parse(startDate))) return "";
  const date = new Date(startDate);
  date.setDate(date.getDate() + nights);
  return date.toISOString().slice(0, 10);
};

const RequiredMark = () => <span className="text-red-500 font-bold ml-0.5">*</span>;

export default function CrmFestivalsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedFestival, setSelectedFestival] = useState<CrmFestivalDetail | null>(null);
  const [isFork, setIsFork] = useState(false);
  const [tagToDelete, setTagToDelete] = useState<{ id: string; name: string } | null>(null);

  const [activeTab, setActiveTab] = useState<"ACTIVE" | "DRAFT" | "ARCHIVED">("ACTIVE");
  const [destinationFilter, setDestinationFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [selectedFestivalForBooking, setSelectedFestivalForBooking] = useState<CrmFestivalDetail | null>(null);
  const [festivalToDel, setFestivalToDel] = useState<CrmFestival | null>(null);

  const festivalsQuery = useQuery({
    queryKey: ["crm-festivals"],
    queryFn: async () =>
      (await apiClient.get("/crm-festivals", { params: { limit: 100 } })).data,
  });

  const destinationsQuery = useQuery({
    queryKey: ["crm", "destinations"],
    queryFn: async () =>
      (await apiClient.get("/crm-destinations", { params: { limit: 200 } })).data.data as Destination[],
  });

  const availableTagsQuery = useQuery({
    queryKey: ["festival-tags"],
    queryFn: async () => (await apiClient.get("/trip-tags")).data.data as Array<{ id: string; tag: string }>,
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!festivalToDel) return;
      await apiClient.delete(`/crm-festivals/${festivalToDel.id}`);
    },
    onSuccess: () => {
      toast.success("Festival deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["crm-festivals"] });
      setFestivalToDel(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to delete festival");
    },
  });

  const handleEditFestival = async (festivalId: string) => {
    try {
      const { data } = await apiClient.get(`/crm-festivals/${festivalId}`);
      setSelectedFestival(data);
      setIsFork(false);
      setModalOpen(true);
    } catch (err) {
      toast.error("Failed to load festival details");
    }
  };

  const handleForkFestival = async (festivalId: string) => {
    try {
      const { data } = await apiClient.get(`/crm-festivals/${festivalId}`);
      setSelectedFestival(data);
      setIsFork(true);
      setModalOpen(true);
    } catch (err) {
      toast.error("Failed to load festival details for fork");
    }
  };

  const festivals: CrmFestival[] = festivalsQuery.data?.data || [];
  const destinations = destinationsQuery.data || [];

  const filteredFestivals = festivals.filter((fest) => {
    if (activeTab === "ACTIVE" && !fest.isActive) return false;
    if (activeTab === "DRAFT" && (fest.isActive || fest.isPublished)) return false;
    if (activeTab === "ARCHIVED" && fest.isActive) return false;
    if (destinationFilter !== "ALL" && fest.destination?.id !== destinationFilter) return false;
    if (search.trim() && !fest.name.toLowerCase().includes(search.toLowerCase().trim())) return false;
    return true;
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      <header className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#b59410]">CRM Operations</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-gray-900">Itinerary Festivals</h1>
          <p className="mt-2 text-sm text-gray-500">
            Create, fork, and manage curated festival itineraries, departure slots, prices, operational tasks, and website media.
          </p>
        </div>
        <Button
          onClick={() => {
            setSelectedFestival(null);
            setIsFork(false);
            setModalOpen(true);
          }}
          className="bg-[#781216] text-white hover:bg-[#5f0e11]"
        >
          <Plus className="mr-2 h-4 w-4" /> New festival
        </Button>
      </header>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
        <div className="flex gap-2 border-b sm:border-0">
          {(["ACTIVE", "DRAFT", "ARCHIVED"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-2 px-3 text-sm font-semibold transition-colors border-b-2 ${
                activeTab === tab ? "border-[#781216] text-[#781216]" : "border-transparent text-gray-500 hover:text-gray-900"
              }`}
            >
              {tab === "ACTIVE" ? "Active" : tab === "DRAFT" ? "Drafts" : "Archived"}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Input
            placeholder="Search festivals..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-64 h-9 text-xs"
          />
          <select
            value={destinationFilter}
            onChange={(e) => setDestinationFilter(e.target.value)}
            className="h-9 rounded-md border border-input bg-white px-3 text-xs"
          >
            <option value="ALL">All Destinations</option>
            {destinations.map((dest) => (
              <option key={dest.id} value={dest.id}>{dest.name}</option>
            ))}
          </select>
        </div>
      </div>

      {festivalsQuery.isLoading ? (
        <div className="flex py-12 justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#b59410]" /></div>
      ) : filteredFestivals.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 p-12 text-center text-gray-500">
          No festivals found matching your search and filter criteria.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredFestivals.map((fest) => (
            <div key={fest.id} className="group relative flex flex-col justify-between rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-[#b59410] hover:shadow-md">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#b59410]">
                    <Tent className="h-3.5 w-3.5" /> {fest.destination?.name || "Unassigned"}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {fest.isPublished && (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 uppercase">Published</span>
                    )}
                    {!fest.isActive && (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-600 uppercase">Archived</span>
                    )}
                  </div>
                </div>
                <h2 className="mt-3 text-lg font-bold text-gray-900 group-hover:text-[#781216] transition-colors">{fest.name}</h2>
                <p className="mt-1 text-xs text-gray-500">
                  {fest.numberOfNights} nights ({fest.numberOfNights + 1} days) · {fest._count?.itineraryDays || 0} itinerary days configured
                </p>
              </div>

              <div className="mt-6 flex items-center justify-between border-t pt-4">
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleEditFestival(fest.id)} className="h-8 text-xs">Edit</Button>
                  <Button variant="ghost" size="sm" onClick={() => handleForkFestival(fest.id)} title="Fork this festival into a new draft" className="h-8 text-xs text-gray-600"><Copy className="mr-1 h-3.5 w-3.5" /> Fork</Button>
                </div>
                <button type="button" onClick={() => navigate(`/dashboard/crm-festivals/${fest.id}`)} className="ml-auto font-medium text-[#781216] hover:underline text-xs flex items-center">
                  Open festival <ChevronRight className="ml-1 h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <FestivalFormModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          festival={selectedFestival}
          isFork={isFork}
          destinations={destinations}
          availableTags={availableTagsQuery.data || []}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ["crm-festivals"] });
            setModalOpen(false);
          }}
          onDeleteTag={(tagId, tagName) => setTagToDelete({ id: tagId, name: tagName })}
        />
      )}

      {tagToDelete && (
        <Dialog open={Boolean(tagToDelete)} onOpenChange={() => setTagToDelete(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-red-600">Delete Tag "{tagToDelete.name}"?</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-gray-600">This tag will be permanently deleted from all festivals and trips. Are you sure?</p>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setTagToDelete(null)}>Cancel</Button>
              <Button
                variant="destructive"
                onClick={async () => {
                  try {
                    await apiClient.delete(`/trip-tags/${tagToDelete.id}`);
                    toast.success("Tag deleted");
                    queryClient.invalidateQueries({ queryKey: ["festival-tags"] });
                  } catch (err: any) {
                    toast.error("Failed to delete tag");
                  } finally {
                    setTagToDelete(null);
                  }
                }}
              >
                Delete Tag
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function FestivalFormModal({
  isOpen,
  onClose,
  festival,
  isFork,
  destinations,
  availableTags,
  onSaved,
  onDeleteTag,
}: {
  isOpen: boolean;
  onClose: () => void;
  festival: CrmFestivalDetail | null;
  isFork: boolean;
  destinations: Destination[];
  availableTags: Array<{ id: string; tag: string }>;
  onSaved: () => void;
  onDeleteTag: (id: string, name: string) => void;
}) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [itineraryDayIndex, setItineraryDayIndex] = useState(0);

  // Form State
  const [name, setName] = useState("");
  const [nights, setNights] = useState("3");
  const [destinationId, setDestinationId] = useState("");
  const [pickup, setPickup] = useState(false);
  const [drop, setDrop] = useState(false);
  const [tripType, setTripType] = useState("");
  const [bestTimeToVisit, setBestTimeToVisit] = useState("");
  const [isPublished, setIsPublished] = useState(false);
  const [isFeatured, setIsFeatured] = useState(false);
  const [isListed, setIsListed] = useState(true);
  const [isActive, setIsActive] = useState(true);
  const [operationsReminderDays, setOperationsReminderDays] = useState("3");

  const [totalAmount, setTotalAmount] = useState("");
  const [tokenAmount, setTokenAmount] = useState("");
  const [packages, setPackages] = useState<PricingPackageDraft[]>([]);
  const [addOns, setAddOns] = useState<AddOnDraft[]>([]);
  const [customInclusions, setCustomInclusions] = useState<Array<{ title: string; description: string }>>([]);
  const [customExclusions, setCustomExclusions] = useState<string[]>([]);
  const [slots, setSlots] = useState<SlotDraft[]>([]);

  const [websiteOverview, setWebsiteOverview] = useState("");
  const [websiteFaqs, setWebsiteFaqs] = useState<Array<{ question: string; answer: string }>>([]);
  const [websiteTagIds, setWebsiteTagIds] = useState<string[]>([]);
  const [newWebsiteTag, setNewWebsiteTag] = useState("");
  const [websiteBannerImages, setWebsiteBannerImages] = useState<string[]>([]);
  const [websiteStayTransportImages, setWebsiteStayTransportImages] = useState<string[]>([]);
  const [websiteHighlights, setWebsiteHighlights] = useState<WebsiteHighlightDraft[]>([]);
  const [websiteVideoUrl, setWebsiteVideoUrl] = useState("");

  const [itineraryDays, setItineraryDays] = useState<ItineraryDayDraft[]>([]);
  const [uploadingHighlightIndex, setUploadingHighlightIndex] = useState<number | null>(null);
  const [uploadingVideo, setUploadingVideo] = useState(false);

  // Initialize Form
  useEffect(() => {
    if (festival) {
      setName(isFork ? `${festival.name} (Copy)` : festival.name);
      setNights(String(festival.numberOfNights));
      setDestinationId(festival.destination.id);
      setPickup(festival.airportPickupEnabled);
      setDrop(festival.airportDropEnabled);
      setTripType(festival.tripType || "");
      setBestTimeToVisit(festival.bestTimeToVisit || "");
      setIsPublished(isFork ? false : festival.isPublished);
      setIsFeatured(isFork ? false : festival.isFeatured);
      setIsListed(festival.isListed ?? true);
      setIsActive(festival.isActive ?? true);
      setOperationsReminderDays(String(festival.operationsReminderDays ?? 3));

      setTotalAmount(festival.totalAmount != null ? String(festival.totalAmount) : "");
      setTokenAmount(festival.tokenAmount != null ? String(festival.tokenAmount) : "");
      setPackages((festival.packages || []).map((pkg) => ({
        id: isFork ? undefined : pkg.id,
        title: pkg.title,
        price: String(pkg.price),
        tokenAmount: String(pkg.tokenAmount),
      })));
      setAddOns((festival.addOns || []).map((item) => ({
        id: isFork ? undefined : item.id,
        title: item.title,
        description: item.description || "",
        imageUrl: item.imageUrl || "",
        price: String(item.price),
        maxQuantityPerBooking: item.maxQuantityPerBooking != null ? String(item.maxQuantityPerBooking) : "",
        maxQuantityPerSlot: item.maxQuantityPerSlot != null ? String(item.maxQuantityPerSlot) : "",
        purchaseCutoffOffsetDays: item.purchaseCutoffOffsetDays != null ? String(item.purchaseCutoffOffsetDays) : "",
        isActive: item.isActive,
      })));

      setCustomExclusions(festival.exclusions || []);
      setWebsiteOverview(festival.websiteOverview || "");
      setWebsiteFaqs(festival.websiteFaqs || []);
      setWebsiteTagIds((festival.websiteTags || []).map((t) => t.id));
      setWebsiteBannerImages(festival.websiteBannerImages || []);
      setWebsiteStayTransportImages(festival.websiteStayTransportImages || []);
      setWebsiteVideoUrl(festival.websiteVideoUrl || "");

      setWebsiteHighlights((festival.websiteHighlights || []).map((h) =>
        typeof h === "string" ? { text: h, imageUrl: "" } : { text: h.text || "", imageUrl: h.imageUrl || "" }
      ));

      setSlots((festival.slots || []).map((s) => ({
        id: isFork ? undefined : s.id,
        startDate: s.startDate ? new Date(s.startDate).toISOString().slice(0, 10) : "",
        endDate: s.endDate ? new Date(s.endDate).toISOString().slice(0, 10) : "",
        capacity: String(s.capacity),
        title: s.title || "",
        priority: s.priority || 0,
      })));

      const totalDayCount = festival.numberOfNights + 1;
      const mappedDays: ItineraryDayDraft[] = Array.from({ length: totalDayCount }, (_, index) => {
        const dayData = festival.itineraryDays?.[index];
        return {
          stayLocationId: dayData?.stayLocationId || "",
          propertyId: dayData?.propertyId || "",
          placeIds: (dayData?.visitingPlaces || []).map((p) => p.placeId || p.place?.id).filter(Boolean) as string[],
          breakfast: Boolean(dayData?.breakfast),
          lunch: Boolean(dayData?.lunch),
          dinner: Boolean(dayData?.dinner),
          transportEnabled: Boolean(dayData?.transportEnabled),
          transportText: dayData?.transportText || "",
          notes: dayData?.notes || "",
          isDropOff: Boolean(dayData?.isDropOff),
          dropOffLocationId: dayData?.dropOffLocationId || "",
          activities: (dayData?.activities || []).map((a) => ({ name: a.name, description: "" })),
          commonInclusions: (dayData?.commonInclusions || []).map((c) => c.key as DayCommonInclusionKey),
        };
      });
      setItineraryDays(mappedDays);
    } else {
      setName("");
      setNights("3");
      setDestinationId(destinations[0]?.id || "");
      setPickup(false);
      setDrop(false);
      setTripType("");
      setBestTimeToVisit("");
      setIsPublished(false);
      setIsFeatured(false);
      setIsListed(true);
      setIsActive(true);
      setOperationsReminderDays("3");
      setTotalAmount("");
      setTokenAmount("");
      setPackages([]);
      setAddOns([]);
      setCustomInclusions([]);
      setCustomExclusions([]);
      setSlots([]);
      setWebsiteOverview("");
      setWebsiteFaqs([]);
      setWebsiteTagIds([]);
      setWebsiteBannerImages([]);
      setWebsiteStayTransportImages([]);
      setWebsiteHighlights([]);
      setWebsiteVideoUrl("");
      setItineraryDays([createEmptyDay(), createEmptyDay(), createEmptyDay(), createEmptyDay()]);
    }
  }, [festival, isFork, destinations]);

  // Destination Masters Query
  const mastersQuery = useQuery({
    queryKey: ["crm", "destination-masters", destinationId],
    queryFn: async () => {
      if (!destinationId) return { stays: [], properties: [], places: [], transfers: [] };
      const [staysRes, propsRes, placesRes, transfersRes] = await Promise.all([
        apiClient.get("/stay-locations", { params: { destinationId, limit: 200 } }),
        apiClient.get("/properties", { params: { limit: 500 } }),
        apiClient.get("/places", { params: { limit: 500 } }),
        apiClient.get("/transfer-locations", { params: { destinationId, limit: 200 } }),
      ]);
      return {
        stays: staysRes.data.data as Master[],
        properties: propsRes.data.data as Master[],
        places: placesRes.data.data as Master[],
        transfers: transfersRes.data.data as Master[],
      };
    },
    enabled: Boolean(destinationId),
  });

  const masters = mastersQuery.data || { stays: [], properties: [], places: [], transfers: [] };

  const createTagMutation = useMutation({
    mutationFn: async (tag: string) => (await apiClient.post("/trip-tags", { tag })).data.data,
    onSuccess: (newTag) => {
      queryClient.invalidateQueries({ queryKey: ["festival-tags"] });
      setWebsiteTagIds((prev) => [...prev, newTag.id]);
      setNewWebsiteTag("");
      toast.success(`Tag "${newTag.tag}" created`);
    },
  });

  const handleAddTag = () => {
    if (!newWebsiteTag.trim()) return;
    createTagMutation.mutate(newWebsiteTag.trim());
  };

  const submitMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (festival && !isFork) {
        return (await apiClient.patch(`/crm-festivals/${festival.id}`, payload)).data;
      }
      return (await apiClient.post("/crm-festivals", payload)).data;
    },
    onSuccess: () => {
      toast.success(festival && !isFork ? "Festival updated successfully" : "Festival created successfully");
      onSaved();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to save festival");
    },
  });

  const handleSave = () => {
    const parsedNights = parseInt(nights, 10);
    const parsedTotal = parseFloat(totalAmount);
    const parsedToken = parseFloat(tokenAmount);

    if (!name.trim()) return toast.error("Festival name is required");
    if (!destinationId) return toast.error("Destination is required");
    if (isNaN(parsedTotal) || parsedTotal <= 0) return toast.error("Valid total price is required");
    if (isNaN(parsedToken) || parsedToken < 0) return toast.error("Valid token amount is required");
    if (parsedToken > parsedTotal) return toast.error("Token amount cannot exceed total price");
    if (slots.length === 0) return toast.error("At least one departure slot is required");

    const payload = {
      name: name.trim(),
      numberOfNights: parsedNights,
      totalAmount: parsedTotal,
      tokenAmount: parsedToken,
      destinationId,
      airportPickupEnabled: pickup,
      airportDropEnabled: drop,
      tripType: tripType || null,
      bestTimeToVisit: bestTimeToVisit.trim() || null,
      isActive,
      isFeatured,
      isPublished,
      isListed,
      operationsReminderDays: parseInt(operationsReminderDays, 10) || 3,
      packages: packages.map((p) => ({ title: p.title, price: parseFloat(p.price), tokenAmount: parseFloat(p.tokenAmount) })),
      addOns: addOns.map((a) => ({
        title: a.title,
        description: a.description || null,
        imageUrl: a.imageUrl || null,
        price: parseFloat(a.price),
        maxQuantityPerBooking: a.maxQuantityPerBooking ? parseInt(a.maxQuantityPerBooking, 10) : null,
        maxQuantityPerSlot: a.maxQuantityPerSlot ? parseInt(a.maxQuantityPerSlot, 10) : null,
        purchaseCutoffOffsetDays: a.purchaseCutoffOffsetDays ? parseInt(a.purchaseCutoffOffsetDays, 10) : null,
        isActive: a.isActive,
      })),
      days: itineraryDays,
      exclusions: customExclusions.filter((e) => e.trim()),
      slots: slots.map((s) => ({
        id: s.id,
        startDate: new Date(s.startDate).toISOString(),
        endDate: new Date(s.endDate).toISOString(),
        capacity: parseInt(s.capacity, 10),
        title: s.title || null,
        priority: s.priority || 0,
      })),
      websiteOverview: websiteOverview.trim() || null,
      websiteFaqs,
      websiteTagIds,
      websiteBannerImages,
      websiteStayTransportImages,
      websiteHighlights,
      websiteVideoUrl: websiteVideoUrl.trim() || null,
    };

    submitMutation.mutate(payload);
  };

  const uploadHighlightImage = async (index: number, file?: File) => {
    if (!file) return;
    try {
      setUploadingHighlightIndex(index);
      toast.loading("Uploading image...", { id: "hl-up" });
      const url = await uploadGenericImageDirect(file);
      const next = [...websiteHighlights];
      next[index].imageUrl = url;
      setWebsiteHighlights(next);
      toast.success("Image uploaded", { id: "hl-up" });
    } catch (err: any) {
      toast.error("Failed to upload image", { id: "hl-up" });
    } finally {
      setUploadingHighlightIndex(null);
    }
  };

  const STEP_TITLES = [
    "Essentials", "Itinerary", "Pricing & Add-ons", "Departures", "Overview & FAQs", "Tags, Media & Video"
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-5 pb-3 border-b">
          <p className="text-[11px] font-bold uppercase tracking-widest text-[#781216]">
            {isFork ? "Fork Festival" : festival ? "Edit Festival" : "New Festival"} · Step {step} of 6
          </p>
          <DialogTitle className="text-xl font-bold text-gray-900">
            {step === 1 ? "Festival Essentials" : step === 2 ? `Itinerary · Day ${itineraryDayIndex + 1} of ${itineraryDays.length}` : step === 3 ? "Pricing & Add-ons" : step === 4 ? "Departures & Slots" : step === 5 ? "Website Overview & FAQs" : "Tags, Media & Video Upload"}
          </DialogTitle>
          <div className="mt-3 flex gap-1.5">
            {STEP_TITLES.map((title, idx) => (
              <div
                key={title}
                onClick={() => setStep(idx + 1)}
                className={`h-1.5 flex-1 rounded-full cursor-pointer transition-all ${
                  idx + 1 === step ? "bg-[#781216]" : idx + 1 < step ? "bg-[#b59410]" : "bg-gray-200"
                }`}
                title={`Step ${idx + 1}: ${title}`}
              />
            ))}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {step === 1 && (
            <div className="space-y-4">
              <label className="block space-y-1">
                <span className="text-xs font-bold uppercase text-gray-600">Festival Name<RequiredMark /></span>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ziro Festival of Music" />
              </label>

              <div className="grid grid-cols-2 gap-4">
                <label className="block space-y-1">
                  <span className="text-xs font-bold uppercase text-gray-600">Number of Nights<RequiredMark /></span>
                  <Input
                    type="number"
                    min="1"
                    max="60"
                    value={nights}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNights(val);
                      const count = parseInt(val, 10);
                      if (count > 0) {
                        const targetLen = count + 1;
                        setItineraryDays((prev) => {
                          if (targetLen > prev.length) {
                            return [...prev, ...Array.from({ length: targetLen - prev.length }, createEmptyDay)];
                          }
                          return prev.slice(0, targetLen);
                        });
                      }
                    }}
                  />
                </label>

                <label className="block space-y-1">
                  <span className="text-xs font-bold uppercase text-gray-600">Destination<RequiredMark /></span>
                  <select
                    value={destinationId}
                    onChange={(e) => setDestinationId(e.target.value)}
                    className="h-9 w-full rounded-md border border-input bg-white px-3 text-sm"
                  >
                    <option value="">Select destination</option>
                    {destinations.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
                  <input type="checkbox" checked={pickup} onChange={(e) => setPickup(e.target.checked)} className="rounded text-[#781216]" />
                  Include Airport Pickup
                </label>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
                  <input type="checkbox" checked={drop} onChange={(e) => setDrop(e.target.checked)} className="rounded text-[#781216]" />
                  Include Airport Drop
                </label>
              </div>
            </div>
          )}

          {step === 2 && (
            <ItineraryDayStep
              dayNumber={itineraryDayIndex + 1}
              day={itineraryDays[itineraryDayIndex] || createEmptyDay()}
              stays={masters.stays}
              properties={masters.properties}
              places={masters.places}
              transfers={masters.transfers}
              loading={mastersQuery.isLoading}
              onChange={(updated) => {
                const next = [...itineraryDays];
                next[itineraryDayIndex] = updated;
                setItineraryDays(next);
              }}
            />
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 border-b pb-4">
                <label className="block space-y-1">
                  <span className="text-xs font-bold uppercase text-gray-600">Default Price (₹)<RequiredMark /></span>
                  <Input type="number" min="0" value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)} placeholder="e.g. 25000" />
                </label>
                <label className="block space-y-1">
                  <span className="text-xs font-bold uppercase text-gray-600">Default Token Amount (₹)<RequiredMark /></span>
                  <Input type="number" min="0" value={tokenAmount} onChange={(e) => setTokenAmount(e.target.value)} placeholder="e.g. 5000" />
                </label>
              </div>

              {/* Packages */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-900">Custom Packages</h3>
                  <Button type="button" variant="outline" size="sm" onClick={() => setPackages([...packages, { title: "", price: "", tokenAmount: "" }])}>
                    <Plus className="mr-1 h-3.5 w-3.5" /> Add Package
                  </Button>
                </div>
                {packages.map((pkg, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border">
                    <Input placeholder="Package Title" value={pkg.title} onChange={(e) => { const next = [...packages]; next[idx].title = e.target.value; setPackages(next); }} className="flex-1 h-8 text-xs bg-white" />
                    <Input type="number" placeholder="Price" value={pkg.price} onChange={(e) => { const next = [...packages]; next[idx].price = e.target.value; setPackages(next); }} className="w-28 h-8 text-xs bg-white" />
                    <Input type="number" placeholder="Token" value={pkg.tokenAmount} onChange={(e) => { const next = [...packages]; next[idx].tokenAmount = e.target.value; setPackages(next); }} className="w-28 h-8 text-xs bg-white" />
                    <Button type="button" variant="ghost" size="icon" onClick={() => setPackages(packages.filter((_, i) => i !== idx))} className="text-red-600 h-8 w-8"><X className="h-4 w-4" /></Button>
                  </div>
                ))}
              </div>

              {/* AddOns */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-900">Add-ons</h3>
                  <Button type="button" variant="outline" size="sm" onClick={() => setAddOns([...addOns, { title: "", description: "", imageUrl: "", price: "", maxQuantityPerBooking: "", maxQuantityPerSlot: "", purchaseCutoffOffsetDays: "", isActive: true }])}>
                    <Plus className="mr-1 h-3.5 w-3.5" /> Add Add-on
                  </Button>
                </div>
                {addOns.map((item, idx) => (
                  <div key={idx} className="p-3 bg-gray-50 rounded-lg border space-y-2">
                    <div className="flex items-center gap-3">
                      <Input placeholder="Add-on Title" value={item.title} onChange={(e) => { const next = [...addOns]; next[idx].title = e.target.value; setAddOns(next); }} className="flex-1 h-8 text-xs bg-white" />
                      <Input type="number" placeholder="Price (₹)" value={item.price} onChange={(e) => { const next = [...addOns]; next[idx].price = e.target.value; setAddOns(next); }} className="w-32 h-8 text-xs bg-white" />
                      <Button type="button" variant="ghost" size="icon" onClick={() => setAddOns(addOns.filter((_, i) => i !== idx))} className="text-red-600 h-8 w-8"><X className="h-4 w-4" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-900">Departure Slots<RequiredMark /></h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSlots([...slots, { startDate: "", endDate: "", capacity: "12", title: "", priority: 0 }])}
                >
                  <Plus className="mr-1 h-3.5 w-3.5" /> Add Slot
                </Button>
              </div>

              {slots.map((s, idx) => (
                <div key={idx} className="flex flex-wrap items-center gap-3 p-3 bg-gray-50 rounded-lg border">
                  <Input
                    type="date"
                    value={s.startDate}
                    onChange={(e) => {
                      const next = [...slots];
                      const start = e.target.value;
                      next[idx].startDate = start;
                      next[idx].endDate = calculateEndDate(start, parseInt(nights, 10));
                      setSlots(next);
                    }}
                    className="w-36 h-8 text-xs bg-white"
                  />
                  <span className="text-xs text-gray-400">to</span>
                  <Input type="date" value={s.endDate} readOnly className="w-36 h-8 text-xs bg-gray-100" />
                  <Input
                    type="number"
                    placeholder="Capacity"
                    value={s.capacity}
                    onChange={(e) => { const next = [...slots]; next[idx].capacity = e.target.value; setSlots(next); }}
                    className="w-24 h-8 text-xs bg-white"
                  />
                  <Input
                    placeholder="Slot Title (optional)"
                    value={s.title}
                    onChange={(e) => { const next = [...slots]; next[idx].title = e.target.value; setSlots(next); }}
                    className="flex-1 min-w-[140px] h-8 text-xs bg-white"
                  />
                  <Button type="button" variant="ghost" size="icon" onClick={() => setSlots(slots.filter((_, i) => i !== idx))} className="text-red-600 h-8 w-8"><X className="h-4 w-4" /></Button>
                </div>
              ))}
              {slots.length === 0 && <p className="text-xs text-gray-500 italic">No departure slots added yet.</p>}
            </div>
          )}

          {step === 5 && (
            <div className="space-y-6">
              <label className="block space-y-1">
                <span className="text-xs font-bold uppercase text-gray-600">Website Overview</span>
                <Textarea value={websiteOverview} onChange={(e) => setWebsiteOverview(e.target.value)} placeholder="Compelling overview for festival details page..." className="min-h-[100px] text-xs" />
              </label>

              {/* FAQs */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-900">Website FAQs</h3>
                  <Button type="button" variant="outline" size="sm" onClick={() => setWebsiteFaqs([...websiteFaqs, { question: "", answer: "" }])}>
                    <Plus className="mr-1 h-3.5 w-3.5" /> Add FAQ
                  </Button>
                </div>
                {websiteFaqs.map((faq, idx) => (
                  <div key={idx} className="p-3 bg-gray-50 rounded-lg border space-y-2">
                    <div className="flex items-center gap-2">
                      <Input placeholder="Question" value={faq.question} onChange={(e) => { const next = [...websiteFaqs]; next[idx].question = e.target.value; setWebsiteFaqs(next); }} className="flex-1 h-8 text-xs font-semibold bg-white" />
                      <Button type="button" variant="ghost" size="icon" onClick={() => setWebsiteFaqs(websiteFaqs.filter((_, i) => i !== idx))} className="text-red-600 h-8 w-8"><X className="h-4 w-4" /></Button>
                    </div>
                    <Textarea placeholder="Answer" value={faq.answer} onChange={(e) => { const next = [...websiteFaqs]; next[idx].answer = e.target.value; setWebsiteFaqs(next); }} className="min-h-[60px] text-xs bg-white" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 6 && (
            <div className="space-y-6">
              {/* Tags */}
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase text-gray-600">Festival Tags</span>
                <div className="flex flex-wrap gap-2 items-center">
                  {availableTags.map((tag) => {
                    const active = websiteTagIds.includes(tag.id);
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => setWebsiteTagIds(active ? websiteTagIds.filter((id) => id !== tag.id) : [...websiteTagIds, tag.id])}
                        className={`px-3 py-1 rounded-full text-xs font-semibold border transition ${
                          active ? "bg-[#781216] text-white border-[#781216]" : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        {tag.tag}
                      </button>
                    );
                  })}
                  <div className="inline-flex gap-1">
                    <Input placeholder="New tag..." value={newWebsiteTag} onChange={(e) => setNewWebsiteTag(e.target.value)} className="h-8 w-28 text-xs" />
                    <Button type="button" variant="outline" size="sm" onClick={handleAddTag} className="h-8 text-xs"><Plus className="h-3 w-3" /></Button>
                  </div>
                </div>
              </div>

              {/* Banner Images */}
              <div className="space-y-3 border-t pt-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-900">Website Banner Images</h3>
                  <label className="inline-flex h-8 cursor-pointer items-center justify-center rounded-md border border-input bg-background px-3 text-xs font-medium shadow-sm hover:bg-accent">
                    <Plus className="mr-1 h-3.5 w-3.5" /> Upload Image
                    <input type="file" className="hidden" accept="image/*" onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        toast.loading("Uploading...", { id: "up-b" });
                        const url = await uploadGenericImageDirect(file);
                        setWebsiteBannerImages([...websiteBannerImages, url]);
                        toast.success("Uploaded banner", { id: "up-b" });
                      } catch (err) {
                        toast.error("Upload failed", { id: "up-b" });
                      }
                    }} />
                  </label>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  {websiteBannerImages.map((img, idx) => (
                    <div key={idx} className="group relative aspect-video overflow-hidden rounded-md border bg-gray-100">
                      <img src={img} alt="" className="h-full w-full object-cover" />
                      <button type="button" onClick={() => setWebsiteBannerImages(websiteBannerImages.filter((_, i) => i !== idx))} className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition"><X className="h-3 w-3" /></button>
                    </div>
                  ))}
                </div>
              </div>

              {/* EXTRA FIELD: Website Video Upload */}
              <div className="space-y-3 border-t pt-4">
                <div className="flex items-center justify-between border-b pb-2">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                      <Video className="h-4 w-4 text-[#781216]" /> Website Video Upload
                    </h3>
                    <p className="text-xs text-gray-500">Attach a featured video for this festival detail page</p>
                  </div>
                  <label className="inline-flex h-8 cursor-pointer items-center justify-center rounded-md border border-input bg-background px-3 text-xs font-medium shadow-sm hover:bg-accent transition">
                    {uploadingVideo ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Plus className="mr-1.5 h-3.5 w-3.5" />}
                    {uploadingVideo ? "Uploading..." : "Upload Video"}
                    <input type="file" className="hidden" accept="video/*" disabled={uploadingVideo} onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        setUploadingVideo(true);
                        toast.loading("Uploading video...", { id: "upload-vid" });
                        const url = await uploadGenericVideoDirect(file);
                        setWebsiteVideoUrl(url);
                        toast.success("Video uploaded successfully", { id: "upload-vid" });
                      } catch (err: any) {
                        toast.error("Video upload failed", { id: "upload-vid" });
                      } finally {
                        setUploadingVideo(false);
                      }
                    }} />
                  </label>
                </div>

                {websiteVideoUrl ? (
                  <div className="relative aspect-video w-full overflow-hidden rounded-lg border bg-black shadow-inner">
                    <video src={websiteVideoUrl} controls className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setWebsiteVideoUrl("")}
                      className="absolute right-2 top-2 rounded-full bg-red-600 p-1.5 text-white shadow hover:bg-red-700 transition"
                      title="Remove video"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex aspect-video w-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 p-6 text-center">
                    <Video className="h-8 w-8 text-gray-400 mb-2" />
                    <p className="text-xs font-semibold text-gray-600">No festival video uploaded</p>
                    <p className="text-[11px] text-gray-400 mt-1">Upload a video file (MP4/WebM) or paste a Cloudinary video URL below.</p>
                    <Input
                      value={websiteVideoUrl}
                      onChange={(e) => setWebsiteVideoUrl(e.target.value)}
                      placeholder="https://res.cloudinary.com/... or video URL"
                      className="mt-3 max-w-md h-8 text-xs bg-white"
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t px-6 py-4 bg-gray-50">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (step === 1) onClose();
              else if (step === 2 && itineraryDayIndex > 0) setItineraryDayIndex((i) => i - 1);
              else if (step === 2) setStep(1);
              else setStep(step - 1);
            }}
          >
            {step === 1 ? "Cancel" : "Back"}
          </Button>

          <div className="flex gap-2">
            {step < 6 ? (
              <Button
                type="button"
                className="bg-[#781216] text-white hover:bg-[#5f0e11]"
                onClick={() => {
                  if (step === 2 && itineraryDayIndex < itineraryDays.length - 1) {
                    setItineraryDayIndex((i) => i + 1);
                  } else {
                    setStep(step + 1);
                  }
                }}
              >
                {step === 2 && itineraryDayIndex < itineraryDays.length - 1 ? `Next (Day ${itineraryDayIndex + 2})` : "Continue"}
              </Button>
            ) : (
              <Button
                type="button"
                disabled={submitMutation.isPending}
                className="bg-[#781216] text-white hover:bg-[#5f0e11]"
                onClick={handleSave}
              >
                {submitMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {festival && !isFork ? "Save Changes" : "Create Festival"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ItineraryDayStep({
  dayNumber,
  day,
  stays,
  properties,
  places,
  transfers,
  loading,
  onChange,
}: {
  dayNumber: number;
  day: ItineraryDayDraft;
  stays: Master[];
  properties: Master[];
  places: Master[];
  transfers: Master[];
  loading: boolean;
  onChange: (updated: ItineraryDayDraft) => void;
}) {
  const filteredProperties = properties.filter((p) => !day.stayLocationId || p.stayLocationId === day.stayLocationId);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <label className="block space-y-1">
          <span className="text-xs font-bold uppercase text-gray-600">Stay Location</span>
          <select
            value={day.stayLocationId}
            onChange={(e) => onChange({ ...day, stayLocationId: e.target.value, propertyId: "", placeIds: [] })}
            className="h-9 w-full rounded-md border border-input bg-white px-3 text-sm"
          >
            <option value="">Choose location</option>
            {stays.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </label>

        <label className="block space-y-1">
          <span className="text-xs font-bold uppercase text-gray-600">Property / Hotel</span>
          <select
            value={day.propertyId}
            onChange={(e) => onChange({ ...day, propertyId: e.target.value })}
            className="h-9 w-full rounded-md border border-input bg-white px-3 text-sm"
          >
            <option value="">Choose property</option>
            {filteredProperties.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </label>
      </div>

      {/* Meals */}
      <div className="flex gap-4 border-y py-3">
        <span className="text-xs font-bold uppercase text-gray-600 self-center">Included Meals:</span>
        <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
          <input type="checkbox" checked={day.breakfast} onChange={(e) => onChange({ ...day, breakfast: e.target.checked })} className="rounded text-[#781216]" /> Breakfast
        </label>
        <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
          <input type="checkbox" checked={day.lunch} onChange={(e) => onChange({ ...day, lunch: e.target.checked })} className="rounded text-[#781216]" /> Lunch
        </label>
        <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
          <input type="checkbox" checked={day.dinner} onChange={(e) => onChange({ ...day, dinner: e.target.checked })} className="rounded text-[#781216]" /> Dinner
        </label>
      </div>

      <label className="block space-y-1">
        <span className="text-xs font-bold uppercase text-gray-600">Day Notes / Overview</span>
        <Textarea value={day.notes} onChange={(e) => onChange({ ...day, notes: e.target.value })} placeholder="Day plan summary..." className="min-h-[80px] text-xs" />
      </label>
    </div>
  );
}

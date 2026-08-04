import { FormEvent, useEffect, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import {
  CalendarDays,
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
import { uploadGenericImageDirect } from "../../../lib/directImageUpload";
import { useNavigate } from "react-router";

type Destination = { id: string; name: string };
type CrmTrip = {
  id: string;
  name: string;
  numberOfNights: number;
  destination: Destination;
  airportPickupEnabled: boolean;
  airportDropEnabled: boolean;
  _count?: { itineraryDays: number; inclusions: number; bookings?: number };
};
type CrmTripDetail = CrmTrip & {
  totalAmount: string | number;
  tokenAmount: string | number;
  packages: Array<{ title: string; price: string | number; tokenAmount: string | number }>;
  addOns: Array<{ title: string; description?: string | null; imageUrl?: string | null; price: string | number; maxQuantityPerBooking?: number | null; maxQuantityPerSlot?: number | null; purchaseCutoffOffsetDays?: number | null; isActive: boolean }>;
  itineraryDays: Array<{ stayLocationId?: string | null; propertyId?: string | null; visitingPlaces: Array<{ placeId?: string; place: { id: string } }>; breakfast: boolean; lunch: boolean; dinner: boolean; transportEnabled?: boolean; transportText?: string | null; notes?: string | null; isDropOff: boolean; dropOffLocationId?: string | null; activities: Array<{ name: string }>; commonInclusions: Array<{ key: DayCommonInclusionKey }> }>;
  operationsReminderDays?: number;
  slots?: Array<{ id: string; startDate: string; endDate: string; capacity: number; title?: string | null; priority: number; filledSpots?: number; _count?: { bookings: number } }>;
};
type PricingPackageDraft = {
  title: string;
  price: string;
  tokenAmount: string;
};
type AddOnDraft = {
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
  activities: string[];
  commonInclusions: DayCommonInclusionKey[];
};

const emptyItineraryDay = (): ItineraryDayDraft => ({
  stayLocationId: "", propertyId: "", placeIds: [], breakfast: false, lunch: false,
  dinner: false, transportEnabled: false, transportText: "", notes: "", isDropOff: false, dropOffLocationId: "", activities: [], commonInclusions: [],
});

type InclusionDraft = {
  title: string;
  description: string;
};

const generateDefaultInclusions = (
  name: string,
  nights: number,
  destinationId: string,
  itineraryDays: ItineraryDayDraft[],
  pickup: boolean,
  drop: boolean,
  stays: Master[],
  properties: Master[],
  places: Master[],
  transfers: Master[]
): InclusionDraft[] => {
  const list: InclusionDraft[] = [];

  list.push({
    title: `Accommodation for ${nights} ${nights === 1 ? "night" : "nights"}`,
    description: "",
  });

  if (pickup) {
    list.push({ title: "Pickup transfer", description: "" });
  }
  if (drop) {
    list.push({ title: "Drop transfer", description: "" });
  }

  itineraryDays.forEach((day, index) => {
    const dayNum = index + 1;

    if (day.breakfast) {
      list.push({ title: `Breakfast - Day ${dayNum}`, description: "" });
    }
    if (day.lunch) {
      list.push({ title: `Lunch - Day ${dayNum}`, description: "" });
    }
    if (day.dinner) {
      list.push({ title: `Dinner - Day ${dayNum}`, description: "" });
    }

    if (day.placeIds.length) {
      const placeNames = day.placeIds
        .map((id) => places.find((p) => p.id === id)?.name || "")
        .filter(Boolean)
        .join(", ");
      if (placeNames) {
        list.push({
          title: `Sightseeing - Day ${dayNum}`,
          description: placeNames,
        });
      }
    }

    if (day.activities.length) {
      list.push({
        title: `Activities - Day ${dayNum}`,
        description: day.activities.filter(Boolean).join(", "),
      });
    }

    if (day.propertyId) {
      const propName = properties.find((p) => p.id === day.propertyId)?.name || "";
      if (propName) {
        list.push({
          title: `Hotel stay - Day ${dayNum}`,
          description: propName,
        });
      }
    }

    if (day.isDropOff && day.dropOffLocationId) {
      const dropName = transfers.find((t) => t.id === day.dropOffLocationId)?.name || "";
      if (dropName) {
        list.push({
          title: `Drop-off transfer - Day ${dayNum}`,
          description: dropName,
        });
      }
    }

    if (day.transportEnabled) {
      list.push({
        title: `Transport - Day ${dayNum}`,
        description: day.transportText || "Transport provided",
      });
    }

    day.commonInclusions.forEach((key) => {
      const label =
        key === "ILP_AND_PERMITS"
          ? "ILP and permits"
          : key === "BBQ"
            ? "BBQ"
            : key === "BONFIRE"
              ? "Bonfire"
              : "Trip guide";
      list.push({
        title: `${label} - Day ${dayNum}`,
        description: "",
      });
    });
  });

  return list;
};

export default function CrmTripsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [editingTrip, setEditingTrip] = useState<CrmTripDetail | null>(null);
  const [menuTrip, setMenuTrip] = useState<string | null>(null);
  const [deleteTrip, setDeleteTrip] = useState<CrmTrip | null>(null);
  const [bookingsTrip, setBookingsTrip] = useState<CrmTrip | null>(null);
  const [viewMode, setViewMode] = useState<"trips" | "bookings">("trips");
  const tripsQuery = useQuery({
    queryKey: ["crm-trips"],
    queryFn: async () =>
      (await apiClient.get("/crm-trips", { params: { limit: 100 } })).data,
  });
  const destinationsQuery = useQuery({
    queryKey: ["crm", "destinations"],
    queryFn: async () =>
      (await apiClient.get("/crm-destinations", { params: { limit: 200 } }))
        .data.data as Destination[],
  });
  const trips: CrmTrip[] = tripsQuery.data?.data || [];

  const remove = async (tripToDel = deleteTrip) => {
    if (!tripToDel) return;
    try {
      await apiClient.delete(`/crm-trips/${tripToDel.id}`);
      toast.success("CRM trip deleted");
      setDeleteTrip(null);
      queryClient.invalidateQueries({ queryKey: ["crm-trips"] });
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Could not delete trip");
    }
  };
  const edit = async (tripId: string) => {
    try {
      const { data } = await apiClient.get(`/crm-trips/${tripId}`);
      setEditingTrip(data);
      setOpen(true);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Could not load this trip for editing");
    }
  };

  if (viewMode === "bookings" && bookingsTrip) {
    return (
      <CrmTripBookingsFullPage
        trip={bookingsTrip}
        onBack={() => {
          setViewMode("trips");
          setBookingsTrip(null);
        }}
      />
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      <header className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#b59410]">
            CRM foundation
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-gray-900">
            Itinerary trips
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Create a trip from master data, then shape each day of the
            itinerary.
          </p>
        </div>
        <Button
          onClick={() => { setEditingTrip(null); setOpen(true); }}
          className="bg-[#781216] text-white hover:bg-[#5f0e11]"
        >
          <Plus className="mr-2 h-4 w-4" />
          Create trip
        </Button>
      </header>
      {tripsQuery.isLoading ? (
        <div className="py-20 text-center text-gray-500">
          <Loader2 className="mx-auto mb-3 h-5 w-5 animate-spin" />
          Loading trips…
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {trips.map((trip) => (
            <article key={trip.id} className="relative flex flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="relative flex flex-1 justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    {trip.name}
                  </h2>
                  <p className="mt-2 flex items-center gap-1.5 text-sm text-gray-500">
                    <MapPin className="h-4 w-4" />
                    {trip.destination.name}
                  </p>
                </div>
                <div className="flex items-start gap-1">
                  <span className="h-fit rounded-full bg-[#fcf4e7] px-2.5 py-1 text-xs font-semibold text-[#8a620b]">
                    {trip.numberOfNights} nights
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="relative z-10 h-8 w-8"
                    onClick={(event) => {
                      event.stopPropagation();
                      setMenuTrip(menuTrip === trip.id ? null : trip.id);
                    }}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                  {menuTrip === trip.id && (
                    <div
                      className="absolute right-0 top-9 z-20 w-32 rounded-lg border bg-white p-1 shadow-lg"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <button
                        className="w-full rounded px-3 py-2 text-left text-sm hover:bg-gray-50"
                        onClick={() => {
                          setMenuTrip(null);
                          edit(trip.id);
                        }}
                      >
                        Edit
                      </button>
                      <button
                        className="w-full rounded px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                        onClick={() => {
                          setMenuTrip(null);
                          setDeleteTrip(trip);
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="relative mt-5 flex items-center gap-3 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {trip._count?.itineraryDays || trip.numberOfNights + 1} days
                </span>
                <span>{trip._count?.inclusions || 0} inclusions</span>
                <button type="button" onClick={() => navigate(`/dashboard/crm-trips/${trip.id}`)} className="ml-auto font-medium text-[#781216] hover:underline">Open trip <ChevronRight className="inline h-3.5 w-3.5" /></button>
              </div>
            </article>
          ))}
          {!trips.length && (
            <button
              type="button"
              onClick={() => { setEditingTrip(null); setOpen(true); }}
              className="col-span-full rounded-xl border-2 border-dashed border-gray-200 bg-white py-16 text-center text-gray-500 hover:border-[#b59410] hover:text-[#781216]"
            >
              <Plus className="mx-auto mb-3 h-6 w-6" />
              Create your first itinerary trip
            </button>
          )}
        </div>
      )}
      <CreateTripDialog
        open={open}
        onOpenChange={setOpen}
        trip={editingTrip}
        destinations={destinationsQuery.data || []}
        onCreated={() => {
          queryClient.invalidateQueries({ queryKey: ["crm-trips"] });
          setEditingTrip(null);
        }}
      />
      <Dialog
        open={Boolean(deleteTrip)}
        onOpenChange={(value) => {
          if (!value) setDeleteTrip(null);
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete itinerary trip?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-500">
            This permanently deletes {deleteTrip?.name} and its itinerary.
            Existing related records may prevent deletion.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteTrip(null)}>
              Cancel
            </Button>
            <Button
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={() => {
                if (!deleteTrip) return;
                const bookingsCount = deleteTrip._count?.bookings || 0;
                if (bookingsCount > 0) {
                  const tripToDel = deleteTrip;
                  setDeleteTrip(null);
                  toast.warning(
                    `This trip has ${bookingsCount} active booking(s). Deleting it will unlink all bookings.`,
                    {
                      description: "Are you sure you want to proceed and delete this trip?",
                      action: {
                        label: "Yes, Delete",
                        onClick: () => remove(tripToDel),
                      },
                      cancel: {
                        label: "Cancel",
                        onClick: () => {},
                      },
                      duration: 8000,
                    }
                  );
                } else {
                  remove();
                }
              }}
            >
              Delete trip
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CreateTripDialog({
  open,
  onOpenChange,
  trip,
  destinations,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  trip: CrmTripDetail | null;
  destinations: Destination[];
  onCreated: () => void;
}) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [nights, setNights] = useState("1");
  const [destinationId, setDestinationId] = useState("");
  const [itineraryDays, setItineraryDays] = useState<ItineraryDayDraft[]>([]);
  const [itineraryDayIndex, setItineraryDayIndex] = useState(0);
  const [packages, setPackages] = useState<PricingPackageDraft[]>([
    { title: "Standard", price: "", tokenAmount: "" },
  ]);
  const [addOns, setAddOns] = useState<AddOnDraft[]>([]);
  const [pickup, setPickup] = useState(false);
  const [drop, setDrop] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pricingError, setPricingError] = useState("");
  const [uploadingAddOnIndex, setUploadingAddOnIndex] = useState<number | null>(null);
  const [customInclusions, setCustomInclusions] = useState<InclusionDraft[]>([]);
  const [customExclusions, setCustomExclusions] = useState<string[]>([]);
  const [websiteOverview, setWebsiteOverview] = useState("");
  const [websiteFaqs, setWebsiteFaqs] = useState<{ question: string; answer: string }[]>([]);
  const [websiteTagIds, setWebsiteTagIds] = useState<string[]>(trip?.websiteTags?.map((t: any) => t.id) || []);
  const [newWebsiteTag, setNewWebsiteTag] = useState("");

  const tagsQuery = useQuery({
    queryKey: ["trip-tags"],
    queryFn: async () => (await apiClient.get("/trip-tags", { params: { limit: 200 } })).data,
  });

  const createTagMutation = useMutation({
    mutationFn: async (tag: string) => (await apiClient.post("/trip-tags", { tag })).data,
    onSuccess: (newTag) => {
      setWebsiteTagIds([...websiteTagIds, newTag.id]);
      setNewWebsiteTag("");
      queryClient.invalidateQueries({ queryKey: ["trip-tags"] });
    },
    onError: () => toast.error("Failed to create tag")
  });
  
  const availableTags = Array.isArray(tagsQuery.data) ? tagsQuery.data : tagsQuery.data?.data || [];
  const [slots, setSlots] = useState<{ id?: string; startDate: string; endDate: string; capacity: string; title: string; priority: string; bookedCount?: number }[]>([{ startDate: "", endDate: "", capacity: "", title: "", priority: "0" }]);
  const [operationsReminderDays, setOperationsReminderDays] = useState("3");
  const [websiteBannerImages, setWebsiteBannerImages] = useState<string[]>([]);
  const [websiteStayTransportImages, setWebsiteStayTransportImages] = useState<string[]>([]);
  const [websiteHighlights, setWebsiteHighlights] = useState<string[]>([]);
  const placesQuery = useQuery({ queryKey: ["crm", "places", "create"], queryFn: async () => (await apiClient.get("/places", { params: { activeOnly: true, limit: 500 } })).data.data as Master[], enabled: Boolean(destinationId) });
  const staysQuery = useQuery({ queryKey: ["crm", "stays", "create", destinationId], queryFn: async () => (await apiClient.get("/stay-locations", { params: { destinationId, activeOnly: true, limit: 200 } })).data.data as Master[], enabled: Boolean(destinationId) });
  const propertiesQuery = useQuery({ queryKey: ["crm", "properties", "create"], queryFn: async () => (await apiClient.get("/properties", { params: { activeOnly: true, limit: 500 } })).data.data as Master[], enabled: Boolean(destinationId) });
  const transfersQuery = useQuery({ queryKey: ["crm", "transfers", "create", destinationId], queryFn: async () => (await apiClient.get("/transfer-locations", { params: { destinationId, activeOnly: true, limit: 200 } })).data.data as Master[], enabled: Boolean(destinationId) });

  const reset = () => {
    setStep(1);
    setName("");
    setNights("1");
    setDestinationId("");
    setItineraryDays([]);
    setItineraryDayIndex(0);
    setPackages([{ title: "Standard", price: "", tokenAmount: "" }]);
    setAddOns([]);
    setUploadingAddOnIndex(null);
    setPickup(false);
    setDrop(false);
    setPricingError("");
    setCustomInclusions([]);
    setCustomExclusions([]);
    setWebsiteOverview("");
    setWebsiteFaqs([]);
    setWebsiteTagIds([]);
    setSlots([{ startDate: "", endDate: "", capacity: "", title: "", priority: "0" }]);
    setOperationsReminderDays("3");
    setWebsiteBannerImages([]);
    setWebsiteStayTransportImages([]);
    setWebsiteHighlights([]);
  };

  useEffect(() => {
    if (!open) return;
    if (!trip) {
      reset();
      return;
    }
    setStep(1);
    setName(trip.name);
    setNights(String(trip.numberOfNights));
    setDestinationId(trip.destination.id);
    setItineraryDayIndex(0);
    setItineraryDays(trip.itineraryDays.map((day) => ({
      stayLocationId: day.stayLocationId || "", propertyId: day.propertyId || "",
      placeIds: day.visitingPlaces.map((item) => item.placeId || item.place.id),
      breakfast: day.breakfast, lunch: day.lunch, dinner: day.dinner,
      transportEnabled: day.transportEnabled || false, transportText: day.transportText || "",
      notes: day.notes || "",
      isDropOff: day.isDropOff, dropOffLocationId: day.dropOffLocationId || "",
      activities: day.activities.map((activity) => activity.name),
      commonInclusions: day.commonInclusions.map((item) => item.key),
    })));
    setPackages(trip.packages.length ? trip.packages.map((item) => ({ title: item.title, price: String(item.price), tokenAmount: String(item.tokenAmount) })) : [{ title: "Standard", price: String(trip.totalAmount), tokenAmount: String(trip.tokenAmount) }]);
    setAddOns(trip.addOns.map((item) => ({
      title: item.title, description: item.description || "", imageUrl: item.imageUrl || "", price: String(item.price),
      maxQuantityPerBooking: item.maxQuantityPerBooking == null ? "" : String(item.maxQuantityPerBooking),
      maxQuantityPerSlot: item.maxQuantityPerSlot == null ? "" : String(item.maxQuantityPerSlot),
      purchaseCutoffOffsetDays: item.purchaseCutoffOffsetDays == null ? "" : String(item.purchaseCutoffOffsetDays), isActive: item.isActive,
    })));
    setPickup(trip.airportPickupEnabled);
    setDrop(trip.airportDropEnabled);
    setPricingError("");
    setCustomInclusions((trip.inclusions || []).map((inc) => ({ title: inc.title, description: inc.description || "" })));
    setCustomExclusions(trip.exclusions || []);
    setWebsiteOverview(trip.websiteOverview || "");
    setWebsiteFaqs((trip.websiteFaqs as any) || []);
    setWebsiteTagIds((trip.websiteTags || []).map((tag: any) => tag.id));
    setSlots(trip.slots?.length ? trip.slots.map((s) => ({ id: s.id, startDate: s.startDate ? s.startDate.split('T')[0] : "", endDate: s.endDate ? s.endDate.split('T')[0] : "", capacity: String(s.capacity), title: s.title || "", priority: String(s.priority), bookedCount: s._count?.bookings || 0 })) : [{ startDate: "", endDate: "", capacity: "", title: "", priority: "0" }]);
    setOperationsReminderDays(String(trip.operationsReminderDays ?? 3));
    setWebsiteBannerImages(trip.websiteBannerImages || []);
    setWebsiteStayTransportImages(trip.websiteStayTransportImages || []);
    setWebsiteHighlights((trip.websiteHighlights as any) || []);
  }, [open, trip]);

  const close = () => {
    reset();
    onOpenChange(false);
  };

  const updatePackage = (
    index: number,
    key: keyof PricingPackageDraft,
    value: string,
  ) => {
    setPackages((items) =>
      items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: value } : item,
      ),
    );
    setPricingError("");
  };
  const updateAddOn = (
    index: number,
    key: keyof AddOnDraft,
    value: AddOnDraft[keyof AddOnDraft],
  ) => {
    setAddOns((items) =>
      items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: value } : item,
      ),
    );
    setPricingError("");
  };

  const uploadAddOnImage = async (index: number, file?: File) => {
    if (!file) return;
    setUploadingAddOnIndex(index);
    try {
      const imageUrl = await uploadGenericImageDirect(file);
      updateAddOn(index, "imageUrl", imageUrl);
      toast.success("Add-on image uploaded");
    } catch (error: any) {
      toast.error(error?.message || "Could not upload the add-on image");
    } finally {
      setUploadingAddOnIndex(null);
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const action = (event.nativeEvent as SubmitEvent).submitter?.getAttribute("value");
    if (step === 1) {
      if (
        !name.trim() ||
        !destinationId ||
        !Number.isInteger(Number(nights)) ||
        Number(nights) < 0 ||
        Number(nights) > 365
      ) {
        toast.error("Enter a title, a destination, and 0–365 nights");
        return;
      }
      setItineraryDays(Array.from({ length: Number(nights) + 1 }, emptyItineraryDay));
      setItineraryDayIndex(0);
      setStep(2);
      return;
    }

    if (step === 2) return;

    const cleanPackages = packages.map((item) => ({
      title: item.title.trim(),
      price: Number(item.price),
      tokenAmount: Number(item.tokenAmount),
    }));
    const asOptionalInteger = (value: string) =>
      value.trim() === "" ? null : Number(value);
    const cleanAddOns = addOns.map((item) => ({
      title: item.title.trim(),
      description: item.description.trim() || null,
      imageUrl: item.imageUrl || null,
      price: Number(item.price),
      maxQuantityPerBooking: asOptionalInteger(item.maxQuantityPerBooking),
      maxQuantityPerSlot: asOptionalInteger(item.maxQuantityPerSlot),
      purchaseCutoffOffsetDays: asOptionalInteger(item.purchaseCutoffOffsetDays),
      isActive: item.isActive,
    }));
    const invalidPackage = cleanPackages.some(
      (item) =>
        !item.title ||
        !Number.isFinite(item.price) ||
        item.price <= 0 ||
        !Number.isFinite(item.tokenAmount) ||
        item.tokenAmount < 0 ||
        item.tokenAmount > item.price,
    );
    const invalidAddOn = cleanAddOns.some((item) =>
      !item.title ||
      !Number.isFinite(item.price) ||
      item.price <= 0 ||
      (item.maxQuantityPerBooking !== null && (!Number.isInteger(item.maxQuantityPerBooking) || item.maxQuantityPerBooking <= 0)) ||
      (item.maxQuantityPerSlot !== null && (!Number.isInteger(item.maxQuantityPerSlot) || item.maxQuantityPerSlot <= 0)) ||
      (item.purchaseCutoffOffsetDays !== null && (!Number.isInteger(item.purchaseCutoffOffsetDays) || item.purchaseCutoffOffsetDays < 0)),
    );
    if (invalidPackage || invalidAddOn) {
      setPricingError(
        invalidPackage
          ? "Each package needs a name, a price above ₹0, and a booking amount that does not exceed its price."
          : "Each add-on needs a name and price. Quantity limits must be whole numbers above zero; cutoff days may be zero or more.",
      );
      return;
    }
    const expectedDays = Number(nights) + 1;
    const invalidSlots = !slots.length || slots.some((slot) => {
      if (!slot.startDate || !slot.endDate || !Number.isInteger(Number(slot.capacity)) || Number(slot.capacity) < 1) return true;
      const start = new Date(`${slot.startDate}T00:00:00Z`);
      const end = new Date(`${slot.endDate}T00:00:00Z`);
      return Math.round((end.getTime() - start.getTime()) / 86400000) + 1 !== expectedDays;
    });
    if (step !== 3 && (invalidSlots || !Number.isInteger(Number(operationsReminderDays)) || Number(operationsReminderDays) < 0)) {
      setPricingError(invalidSlots ? `Add at least one departure with capacity. Each slot must span exactly ${expectedDays} calendar days.` : "Reminder days must be a whole number of zero or more.");
      return;
    }

    if (step === 3) {
      if (customInclusions.length === 0) {
        const defaults = generateDefaultInclusions(
          name,
          Number(nights),
          destinationId,
          itineraryDays,
          pickup,
          drop,
          staysQuery.data || [],
          propertiesQuery.data || [],
          placesQuery.data || [],
          transfersQuery.data || []
        );
        setCustomInclusions(defaults);
      }
      if (customExclusions.length === 0) {
        setCustomExclusions([
          "Any personal expenses or shopping",
          "Meals other than those specified in the itinerary",
          "Travel/Health insurance",
          "Airfare or train tickets",
          "Entry tickets for monuments or activities unless specified",
        ]);
      }
      setStep(4);
      return;
    }

    if (action === "continue" && step >= 4) {
      setStep(step + 1);
      return;
    }
    setSaving(true);
    try {
      const primaryPackage = cleanPackages[0];
      const payload = {
        name: name.trim(),
        numberOfNights: Number(nights),
        destinationId,
        totalAmount: primaryPackage.price,
        tokenAmount: primaryPackage.tokenAmount,
        airportPickupEnabled: pickup,
        airportDropEnabled: drop,
        days: itineraryDays.map((day) => ({
          ...day,
          stayLocationId: day.stayLocationId || null,
          propertyId: day.propertyId || null,
          dropOffLocationId: day.isDropOff ? day.dropOffLocationId || null : null,
          transportEnabled: day.transportEnabled,
          transportText: day.transportEnabled ? day.transportText.trim() || null : null,
          notes: day.notes.trim() || null,
          activities: day.activities.filter(Boolean).map((name) => ({ name })),
        })),
        packages: cleanPackages,
        addOns: cleanAddOns,
        manualInclusions: customInclusions.map((inc) => ({
          title: inc.title.trim(),
          description: inc.description?.trim() || null,
        })),
        exclusions: customExclusions.map((exc) => exc.trim()).filter(Boolean),
        websiteOverview: websiteOverview.trim() || null,
        websiteFaqs: websiteFaqs.filter(f => f.question && f.answer),
        websiteTags: websiteTags.filter(Boolean),
        operationsReminderDays: Number(operationsReminderDays),
        slots: slots.map(s => ({
          ...(s.id ? { id: s.id } : {}),
          startDate: new Date(`${s.startDate}T00:00:00Z`).toISOString(),
          endDate: new Date(`${s.endDate}T00:00:00Z`).toISOString(),
          capacity: Number(s.capacity),
          title: s.title?.trim() || null,
          priority: Number(s.priority) || 0
        })),
        websiteBannerImages,
        websiteStayTransportImages,
        websiteHighlights: websiteHighlights.filter(Boolean),
      };
      await (trip
        ? apiClient.patch(`/crm-trips/${trip.id}`, payload)
        : apiClient.post("/crm-trips", payload));
      toast.success(trip ? "CRM trip updated" : "CRM trip created");
      close();
      onCreated();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Could not create trip");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) close();
        else onOpenChange(true);
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {step === 1
              ? `${trip ? "Edit" : "New"} itinerary trip · basic details`
              : step === 2
                ? `New itinerary trip · day ${itineraryDayIndex + 1} of ${itineraryDays.length}`
                : step === 3
                  ? `${trip ? "Edit" : "New"} itinerary trip · pricing & options`
                  : step === 4 ? `${trip ? "Edit" : "New"} itinerary trip · departures & preview`
                  : step === 5 ? `${trip ? "Edit" : "New"} itinerary trip · overview & FAQs`
                  : step === 6 ? `${trip ? "Edit" : "New"} itinerary trip · tags & slots`
                  : step === 7 ? `${trip ? "Edit" : "New"} itinerary trip · banner images`
                  : `${trip ? "Edit" : "New"} itinerary trip · stay & transport images`
            }
          </DialogTitle>
        </DialogHeader>
        <form className="space-y-5" onSubmit={submit}>
          {step === 1 ? (
            <>
              <label className="block space-y-1.5">
                <span className="text-sm font-medium">Trip title</span>
                <Input
                  required
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="e.g. Tawang escape"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-sm font-medium">Number of nights</span>
                <Input
                  required
                  min="0"
                  max="365"
                  type="number"
                  value={nights}
                  onChange={(event) => setNights(event.target.value)}
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-sm font-medium">Destination</span>
                <select
                  required
                  className="h-9 w-full rounded-md border border-input bg-white px-3 text-sm"
                  value={destinationId}
                  onChange={(event) => setDestinationId(event.target.value)}
                >
                  <option value="">Select destination</option>
                  {destinations.map((destination) => (
                    <option key={destination.id} value={destination.id}>
                      {destination.name}
                    </option>
                  ))}
                </select>
              </label>
              <p className="rounded-lg bg-amber-50 px-3 py-2.5 text-xs text-amber-900">
                This creates {Math.max(0, Number(nights) || 0) + 1} itinerary
                days automatically.
              </p>
            </>
          ) : step === 2 ? (
            <ItineraryDayStep
              dayNumber={itineraryDayIndex + 1}
              day={itineraryDays[itineraryDayIndex]}
              stays={staysQuery.data || []}
              properties={propertiesQuery.data || []}
              places={placesQuery.data || []}
              transfers={transfersQuery.data || []}
              loading={staysQuery.isLoading || propertiesQuery.isLoading || placesQuery.isLoading || transfersQuery.isLoading}
              onChange={(nextDay) => setItineraryDays((days) => days.map((day, index) => index === itineraryDayIndex ? nextDay : day))}
            />
          ) : step === 3 ? (
            <>
              <section className="space-y-3 rounded-xl border border-[#b59410]/30 bg-[#fcf9f2] p-4">
                <div>
                  <h3 className="font-semibold text-gray-900">
                    Pricing packages <span className="text-red-500">*</span>
                  </h3>
                  <p className="mt-0.5 text-xs text-gray-600">
                    Add the same package choices travelers will see. The first
                    package is the default CRM booking price for now.
                  </p>
                </div>
                <div className="hidden grid-cols-[minmax(0,1fr)_130px_150px_32px] gap-3 px-1 text-[11px] font-bold uppercase tracking-wider text-gray-500 md:grid">
                  <span>Package name</span>
                  <span>Price (₹)</span>
                  <span>Booking amount (₹)</span>
                  <span />
                </div>
                <div className="space-y-3">
                  {packages.map((item, index) => (
                    <div
                      key={index}
                      className="grid gap-3 rounded-lg border border-gray-200 bg-white p-3 md:grid-cols-[minmax(0,1fr)_130px_150px_32px] md:items-start"
                    >
                      <label className="space-y-1">
                        <span className="text-xs font-medium text-gray-600 md:hidden">
                          Package name
                        </span>
                        <Input
                          value={item.title}
                          onChange={(event) =>
                            updatePackage(index, "title", event.target.value)
                          }
                          placeholder="e.g. Standard"
                        />
                      </label>
                      <label className="space-y-1">
                        <span className="text-xs font-medium text-gray-600 md:hidden">
                          Price (₹)
                        </span>
                        <Input
                          min="0"
                          step="0.01"
                          type="number"
                          value={item.price}
                          onChange={(event) =>
                            updatePackage(index, "price", event.target.value)
                          }
                          placeholder="0"
                        />
                      </label>
                      <label className="space-y-1">
                        <span className="text-xs font-medium text-gray-600 md:hidden">
                          Booking amount (₹)
                        </span>
                        <Input
                          min="0"
                          step="0.01"
                          type="number"
                          value={item.tokenAmount}
                          onChange={(event) =>
                            updatePackage(
                              index,
                              "tokenAmount",
                              event.target.value,
                            )
                          }
                          placeholder="0"
                        />
                      </label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-red-600 hover:bg-red-50 hover:text-red-700"
                        disabled={packages.length === 1}
                        aria-label="Remove package"
                        title={
                          packages.length === 1
                            ? "At least one package is required"
                            : "Remove package"
                        }
                        onClick={() =>
                          setPackages((items) =>
                            items.filter((_, itemIndex) => itemIndex !== index),
                          )
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-dashed"
                  onClick={() =>
                    setPackages((items) => [
                      ...items,
                      { title: "", price: "", tokenAmount: "" },
                    ])
                  }
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add package
                </Button>
              </section>

              <section className="space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-900">Optional add-ons</h3>
                  <p className="mt-0.5 text-xs text-gray-500">
                    Travelers can add these while booking, before the cutoff.
                  </p>
                </div>
                {addOns.map((item, index) => (
                  <div key={index} className="flex flex-col gap-4 rounded-lg border bg-gray-50 p-4 md:flex-row">
                    <div className="w-full shrink-0 md:w-32">
                      <span className="mb-2 block text-xs font-bold uppercase tracking-widest text-gray-500">Image</span>
                      {item.imageUrl ? (
                        <div className="group relative aspect-square w-full">
                          <img src={item.imageUrl} alt="" className="h-full w-full rounded-lg border bg-white object-cover shadow-sm" />
                          <button type="button" aria-label="Remove add-on image" onClick={() => updateAddOn(index, "imageUrl", "")} className="absolute -right-2 -top-2 hidden h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white shadow-md group-hover:flex"><X className="h-3 w-3" /></button>
                        </div>
                      ) : (
                        <label className={`flex aspect-square w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-white shadow-sm transition-colors ${uploadingAddOnIndex === index ? "cursor-not-allowed opacity-70" : "hover:bg-gray-50"}`}>
                          {uploadingAddOnIndex === index ? <Loader2 className="mb-2 h-6 w-6 animate-spin text-gray-400" /> : <ImagePlus className="mb-2 h-6 w-6 text-gray-400" />}
                          <span className="text-xs font-semibold text-gray-500">{uploadingAddOnIndex === index ? "Uploading..." : "Upload"}</span>
                          <input type="file" className="hidden" accept="image/*" disabled={uploadingAddOnIndex === index} onChange={(event) => uploadAddOnImage(index, event.target.files?.[0])} />
                        </label>
                      )}
                    </div>
                    <div className="grid flex-1 grid-cols-1 gap-4 md:grid-cols-2">
                      <label className="space-y-1.5"><span className="block text-xs font-bold uppercase tracking-widest text-gray-500">Name <span className="text-red-500">*</span></span><Input value={item.title} onChange={(event) => updateAddOn(index, "title", event.target.value)} placeholder="e.g. Airport pickup" /></label>
                      <label className="space-y-1.5"><span className="block text-xs font-bold uppercase tracking-widest text-gray-500">Price <span className="text-red-500">*</span></span><Input min="0" step="0.01" type="number" value={item.price} onChange={(event) => updateAddOn(index, "price", event.target.value)} placeholder="0" /></label>
                      <label className="space-y-1.5 md:col-span-2"><span className="block text-xs font-bold uppercase tracking-widest text-gray-500">Description</span><Input value={item.description} onChange={(event) => updateAddOn(index, "description", event.target.value)} placeholder="What is included?" /></label>
                      <label className="space-y-1.5"><span className="block text-xs font-bold uppercase tracking-widest text-gray-500">Max Qty (Per Booking)</span><Input min="1" type="number" value={item.maxQuantityPerBooking} onChange={(event) => updateAddOn(index, "maxQuantityPerBooking", event.target.value)} /></label>
                      <label className="space-y-1.5"><span className="block text-xs font-bold uppercase tracking-widest text-gray-500">Max Qty (Total / Slot)</span><Input min="1" type="number" value={item.maxQuantityPerSlot} onChange={(event) => updateAddOn(index, "maxQuantityPerSlot", event.target.value)} /></label>
                      <label className="space-y-1.5"><span className="block text-xs font-bold uppercase tracking-widest text-gray-500">Cutoff (Days Before Start)</span><Input min="0" type="number" value={item.purchaseCutoffOffsetDays} onChange={(event) => updateAddOn(index, "purchaseCutoffOffsetDays", event.target.value)} /></label>
                      <label className="flex items-center gap-2 self-end pb-2 text-xs font-bold uppercase tracking-widest text-gray-500"><input type="checkbox" checked={item.isActive} onChange={(event) => updateAddOn(index, "isActive", event.target.checked)} className="h-4 w-4 accent-[#781216]" />Active</label>
                    </div>
                    <Button type="button" variant="ghost" size="icon" className="shrink-0 text-red-600 hover:bg-red-50 hover:text-red-700" aria-label="Remove add-on" title="Remove add-on" onClick={() => setAddOns((items) => items.filter((_, itemIndex) => itemIndex !== index))}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-dashed"
                  onClick={() =>
                    setAddOns((items) => [
                      ...items,
                      { title: "", description: "", imageUrl: "", price: "", maxQuantityPerBooking: "", maxQuantityPerSlot: "", purchaseCutoffOffsetDays: "", isActive: true },
                    ])
                  }
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add add-on
                </Button>
              </section>

              {pricingError && (
                <p
                  role="alert"
                  className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
                >
                  {pricingError}
                </p>
              )}
              <div className="flex flex-wrap gap-5">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={pickup}
                    onChange={(event) => setPickup(event.target.checked)}
                  />
                  Include pickup
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={drop}
                    onChange={(event) => setDrop(event.target.checked)}
                  />
                  Include drop
                </label>
              </div>
            </>
          ) : step === 4 ? (
            <div className="space-y-6">
              <section className="space-y-3 rounded-xl border border-[#b59410]/30 bg-[#fcf9f2] p-4">
                <div className="flex items-center justify-between gap-3"><div><h3 className="font-semibold text-gray-900">Dated departure slots <span className="text-red-500">*</span></h3><p className="text-xs text-gray-600">Each departure must cover {Number(nights) + 1} calendar days. Dates lock after the first booking.</p></div><Button type="button" variant="outline" size="sm" onClick={() => setSlots([...slots, { startDate: "", endDate: "", capacity: "", title: "", priority: "0" }])}><Plus className="mr-1 h-3.5 w-3.5" />Add slot</Button></div>
                <div className="space-y-3">{slots.map((slot, index) => <div key={slot.id || index} className="grid gap-3 rounded-lg border border-gray-200 bg-white p-3 md:grid-cols-5"><label className="space-y-1"><span className="text-xs font-medium">Start</span><Input disabled={Boolean(slot.bookedCount)} type="date" value={slot.startDate} onChange={(e) => setSlots(slots.map((item, i) => i === index ? { ...item, startDate: e.target.value } : item))} /></label><label className="space-y-1"><span className="text-xs font-medium">End</span><Input disabled={Boolean(slot.bookedCount)} type="date" value={slot.endDate} onChange={(e) => setSlots(slots.map((item, i) => i === index ? { ...item, endDate: e.target.value } : item))} /></label><label className="space-y-1"><span className="text-xs font-medium">Capacity</span><Input min="1" type="number" value={slot.capacity} onChange={(e) => setSlots(slots.map((item, i) => i === index ? { ...item, capacity: e.target.value } : item))} /></label><label className="space-y-1"><span className="text-xs font-medium">Title</span><Input value={slot.title} onChange={(e) => setSlots(slots.map((item, i) => i === index ? { ...item, title: e.target.value } : item))} /></label><div className="flex items-end"><Button type="button" variant="ghost" size="sm" disabled={Boolean(slot.bookedCount) || slots.length === 1} className="text-red-600" onClick={() => setSlots(slots.filter((_, i) => i !== index))}><Trash2 className="mr-1 h-3.5 w-3.5" />Remove</Button></div>{slot.bookedCount ? <p className="md:col-span-5 text-xs text-amber-700">Dates are locked because this departure has {slot.bookedCount} booking(s).</p> : null}</div>)}</div>
                <label className="block max-w-xs space-y-1"><span className="text-xs font-bold uppercase tracking-wider text-gray-500">Reminder days before task</span><Input min="0" type="number" value={operationsReminderDays} onChange={(e) => setOperationsReminderDays(e.target.value)} /></label>
              </section>
              {/* Trip basic info preview summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 rounded-xl border border-gray-200 bg-gray-50/50 p-4 text-sm text-gray-700">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Trip Title</p>
                  <p className="font-semibold text-gray-900 truncate">{name}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Destination</p>
                  <p className="font-semibold text-gray-900 truncate">
                    {destinations.find((d) => d.id === destinationId)?.name || "Unknown"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Duration</p>
                  <p className="font-semibold text-gray-900 truncate">{nights} nights / {Number(nights) + 1} days</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Pricing Packages</p>
                  <p className="font-semibold text-gray-950 text-xs truncate">
                    {packages.map((pkg) => `${pkg.title || "Package"}: ₹${pkg.price || 0}`).join(", ")}
                  </p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Inclusions Editing Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b pb-2">
                    <div>
                      <h3 className="text-sm font-bold text-gray-900">Inclusions</h3>
                    </div>
                    <Button type="button" variant="ghost" size="sm" className="h-7 text-xs text-blue-600" onClick={() => setCustomInclusions([...customInclusions, { title: "", description: "" }])}>
                      <Plus className="mr-1 h-3 w-3" /> Add
                    </Button>
                  </div>
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {customInclusions.map((inc, index) => (
                      <div key={index} className="flex gap-2 items-start group">
                        <div className="flex-1 space-y-1">
                          <Input placeholder="Title (e.g. Guided tour)" value={inc.title} onChange={(e) => { const updated = [...customInclusions]; updated[index].title = e.target.value; setCustomInclusions(updated); }} className="h-7 text-xs font-medium border-transparent bg-gray-50 hover:bg-gray-100 focus:border-blue-500 focus:bg-white transition-colors" />
                          <Input placeholder="Optional description" value={inc.description} onChange={(e) => { const updated = [...customInclusions]; updated[index].description = e.target.value; setCustomInclusions(updated); }} className="h-7 text-xs text-gray-500 border-transparent bg-gray-50 hover:bg-gray-100 focus:border-blue-500 focus:bg-white transition-colors" />
                        </div>
                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => setCustomInclusions(customInclusions.filter((_, i) => i !== index))}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                    {customInclusions.length === 0 && <p className="text-xs text-gray-400 italic">No inclusions.</p>}
                  </div>
                </div>

                {/* Exclusions Editing Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b pb-2">
                    <div>
                      <h3 className="text-sm font-bold text-gray-900">Exclusions</h3>
                    </div>
                    <Button type="button" variant="ghost" size="sm" className="h-7 text-xs text-blue-600" onClick={() => setCustomExclusions([...customExclusions, ""])}>
                      <Plus className="mr-1 h-3 w-3" /> Add
                    </Button>
                  </div>
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {customExclusions.map((exc, index) => (
                      <div key={index} className="flex gap-2 items-center group">
                        <Input placeholder="Exclusion detail" value={exc} onChange={(e) => { const updated = [...customExclusions]; updated[index] = e.target.value; setCustomExclusions(updated); }} className="h-7 text-xs border-transparent bg-gray-50 hover:bg-gray-100 focus:border-blue-500 focus:bg-white transition-colors" />
                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" onClick={() => setCustomExclusions(customExclusions.filter((_, i) => i !== index))}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                    {customExclusions.length === 0 && <p className="text-xs text-gray-400 italic">No exclusions.</p>}
                  </div>
                </div>
              </div>
            </div>
          ) : step === 5 ? (
            <div className="space-y-6">
              <label className="block space-y-1.5">
                <span className="text-sm font-medium">Website Overview</span>
                <textarea
                  className="min-h-[120px] w-full rounded-md border border-input bg-white px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="A compelling description of the trip for the public website..."
                  value={websiteOverview}
                  onChange={(e) => setWebsiteOverview(e.target.value)}
                />
              </label>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="text-sm font-medium">Frequently Asked Questions (FAQs)</span>
                  <Button type="button" variant="outline" size="sm" onClick={() => setWebsiteFaqs([...websiteFaqs, { question: "", answer: "" }])}>
                    <Plus className="mr-1.5 h-3.5 w-3.5" /> Add FAQ
                  </Button>
                </div>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {websiteFaqs.map((faq, index) => (
                    <div key={index} className="flex gap-3 items-start p-3 rounded-lg border border-gray-200 bg-gray-50">
                      <div className="flex-1 space-y-2">
                        <Input placeholder="Question" value={faq.question} onChange={(e) => { const updated = [...websiteFaqs]; updated[index].question = e.target.value; setWebsiteFaqs(updated); }} className="h-8 text-xs font-semibold bg-white" />
                        <textarea className="min-h-[60px] w-full rounded-md border border-input bg-white px-3 py-2 text-xs shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" placeholder="Answer" value={faq.answer} onChange={(e) => { const updated = [...websiteFaqs]; updated[index].answer = e.target.value; setWebsiteFaqs(updated); }} />
                      </div>
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:bg-red-50" onClick={() => setWebsiteFaqs(websiteFaqs.filter((_, i) => i !== index))}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {websiteFaqs.length === 0 && <p className="text-xs text-gray-500 italic">No FAQs added yet.</p>}
                </div>
              </div>
            </div>
          ) : step === 6 ? (
            <div className="space-y-6">
              <label className="block space-y-2">
                <span className="text-sm font-medium">Trip Tags</span>
                <p className="text-xs text-gray-500 mb-3">Select or create tags to describe this trip (e.g., Adventure, Honeymoon, Relaxing)</p>
                <div className="flex flex-wrap gap-2 items-center">
                  {availableTags.map((tag: any) => {
                    const active = websiteTagIds.includes(tag.id);
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() =>
                          setWebsiteTagIds(
                            active
                              ? websiteTagIds.filter((id) => id !== tag.id)
                              : [...websiteTagIds, tag.id]
                          )
                        }
                        className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${active ? "border-[#781216] bg-[#781216] text-white shadow-sm" : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"}`}
                      >
                        {tag.tag}
                      </button>
                    );
                  })}
                  <Input
                    placeholder="New tag & enter..."
                    value={newWebsiteTag}
                    onChange={(e) => setNewWebsiteTag(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const val = newWebsiteTag.trim();
                        if (val && !createTagMutation.isPending) {
                          createTagMutation.mutate(val);
                        }
                      }
                    }}
                    disabled={createTagMutation.isPending}
                    className="h-7 text-xs w-32 rounded-full px-3 bg-white"
                  />
                </div>
              </label>
              
              <div className="space-y-3 pt-4">
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="text-sm font-medium">Available Slots</span>
                  <Button type="button" variant="outline" size="sm" onClick={() => setSlots([...slots, { startDate: "", endDate: "", capacity: "", title: "", priority: "0" }])}>
                    <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Slot
                  </Button>
                </div>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {slots.map((slot, index) => (
                    <div key={index} className="relative p-4 rounded-xl border border-gray-200 bg-gray-50 space-y-4 pr-10">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <label className="space-y-1.5">
                          <span className="text-xs font-semibold text-gray-700">Start Date</span>
                          <Input type="date" value={slot.startDate} onChange={(e) => { const updated = [...slots]; updated[index].startDate = e.target.value; setSlots(updated); }} className="h-9 bg-white text-sm" />
                        </label>
                        <label className="space-y-1.5">
                          <span className="text-xs font-semibold text-gray-700">End Date</span>
                          <Input type="date" value={slot.endDate} onChange={(e) => { const updated = [...slots]; updated[index].endDate = e.target.value; setSlots(updated); }} className="h-9 bg-white text-sm" />
                        </label>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <label className="space-y-1.5">
                          <span className="text-xs font-semibold text-gray-700">Capacity</span>
                          <Input type="number" min="1" value={slot.capacity} onChange={(e) => { const updated = [...slots]; updated[index].capacity = e.target.value; setSlots(updated); }} className="h-9 bg-white text-sm" placeholder="e.g. 20" />
                        </label>
                        <label className="space-y-1.5">
                          <span className="text-xs font-semibold text-gray-700">Sort Priority</span>
                          <Input type="number" value={slot.priority} onChange={(e) => { const updated = [...slots]; updated[index].priority = e.target.value; setSlots(updated); }} className="h-9 bg-white text-sm" placeholder="0" />
                        </label>
                        <label className="space-y-1.5">
                          <span className="text-xs font-semibold text-gray-700">Title (Optional)</span>
                          <Input value={slot.title} onChange={(e) => { const updated = [...slots]; updated[index].title = e.target.value; setSlots(updated); }} className="h-9 bg-white text-sm" placeholder="e.g. Special Batch" />
                        </label>
                      </div>
                      <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50" onClick={() => setSlots(slots.filter((_, i) => i !== index))}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {slots.length === 0 && <p className="text-xs text-gray-500 italic">No upcoming slots added.</p>}
                </div>
              </div>
            </div>
          ) : step === 7 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Website Banner Images</h3>
                  <p className="text-xs text-gray-500">High quality images for the trip detail hero section</p>
                </div>
                <label className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-8 px-3 cursor-pointer">
                  <Plus className="mr-1.5 h-3.5 w-3.5" /> Upload Image
                  <input type="file" className="hidden" accept="image/*" onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      toast.loading("Uploading...", { id: "upload" });
                      const url = await uploadGenericImageDirect(file);
                      setWebsiteBannerImages([...websiteBannerImages, url]);
                      toast.success("Uploaded successfully", { id: "upload" });
                    } catch (err: any) {
                      toast.error("Upload failed", { id: "upload" });
                    }
                  }} />
                </label>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {websiteBannerImages.map((img, idx) => (
                  <div key={idx} className="group relative aspect-video bg-gray-100 rounded-lg overflow-hidden border">
                    <img src={img} alt="" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => setWebsiteBannerImages(websiteBannerImages.filter((_, i) => i !== idx))} className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow"><X className="h-3 w-3" /></button>
                  </div>
                ))}
                {websiteBannerImages.length === 0 && <div className="col-span-full py-8 text-center text-sm text-gray-400 border-2 border-dashed rounded-lg">No banner images uploaded.</div>}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Stay & Transport Images</h3>
                  <p className="text-xs text-gray-500">Images showcasing the accommodation and travel</p>
                </div>
                <label className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-8 px-3 cursor-pointer">
                  <Plus className="mr-1.5 h-3.5 w-3.5" /> Upload Image
                  <input type="file" className="hidden" accept="image/*" onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      toast.loading("Uploading...", { id: "upload-st" });
                      const url = await uploadGenericImageDirect(file);
                      setWebsiteStayTransportImages([...websiteStayTransportImages, url]);
                      toast.success("Uploaded successfully", { id: "upload-st" });
                    } catch (err: any) {
                      toast.error("Upload failed", { id: "upload-st" });
                    }
                  }} />
                </label>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {websiteStayTransportImages.map((img, idx) => (
                  <div key={idx} className="group relative aspect-video bg-gray-100 rounded-lg overflow-hidden border">
                    <img src={img} alt="" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => setWebsiteStayTransportImages(websiteStayTransportImages.filter((_, i) => i !== idx))} className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow"><X className="h-3 w-3" /></button>
                  </div>
                ))}
                {websiteStayTransportImages.length === 0 && <div className="col-span-full py-8 text-center text-sm text-gray-400 border-2 border-dashed rounded-lg">No stay/transport images uploaded.</div>}
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2 border-t pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (step === 1) close();
                else if (step === 2 && itineraryDayIndex > 0) setItineraryDayIndex((index) => index - 1);
                else if (step === 2) setStep(1);
                else if (step === 3) { setItineraryDayIndex(Math.max(0, itineraryDays.length - 1)); setStep(2); }
                else setStep(step - 1);
              }}
            >
              {step === 1 ? "Cancel" : "Back"}
            </Button>
            
            {step >= 4 && (
              <Button
                type="submit"
                name="action"
                value="save"
                disabled={saving}
                variant="outline"
                className="border-[#781216] text-[#781216] hover:bg-[#781216] hover:text-white"
              >
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save
              </Button>
            )}

            <Button
              type={step === 1 || step === 3 || step === 8 ? "submit" : "button"}
              name="action"
              value="continue"
              onClick={(e) => {
                if (step === 2) {
                  if (itineraryDayIndex < itineraryDays.length - 1) setItineraryDayIndex((index) => index + 1);
                  else setStep(3);
                } else if (step >= 4 && step < 8) {
                  setStep(step + 1);
                }
              }}
              disabled={saving}
              className="bg-[#781216] text-white hover:bg-[#5f0e11]"
            >
              {saving && (step === 1 || step === 3 || step === 8) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {step === 1 ? "Continue" 
                : step === 2 ? itineraryDayIndex === itineraryDays.length - 1 ? "Continue to pricing" : "Next day" 
                : step === 3 ? "Continue to preview" 
                : step === 8 ? (trip ? "Save changes" : "Create trip") 
                : "Continue"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ItineraryDayStep({ dayNumber, day, stays, properties, places, transfers, loading, onChange }: {
  dayNumber: number;
  day: ItineraryDayDraft;
  stays: Master[];
  properties: Master[];
  places: Master[];
  transfers: Master[];
  loading: boolean;
  onChange: (day: ItineraryDayDraft) => void;
}) {
  const [activity, setActivity] = useState("");
  const dayProperties = properties.filter((property) => property.stayLocationId === day.stayLocationId);
  const dayPlaces = places.filter((place) => place.stayLocationId === day.stayLocationId);
  const update = (changes: Partial<ItineraryDayDraft>) => onChange({ ...day, ...changes });
  const togglePlace = (placeId: string, selected: boolean) => update({ placeIds: selected ? [...day.placeIds, placeId] : day.placeIds.filter((id) => id !== placeId) });
  const toggleInclusion = (key: DayCommonInclusionKey, selected: boolean) => update({ commonInclusions: selected ? [...day.commonInclusions, key] : day.commonInclusions.filter((item) => item !== key) });
  const addActivity = () => { const name = activity.trim(); if (!name) return; update({ activities: [...day.activities, name] }); setActivity(""); };

  return <section className="space-y-5">
    <div className="rounded-xl border border-[#b59410]/30 bg-[#fcf9f2] p-4"><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#b59410]">Itinerary setup</p><h3 className="mt-1 text-lg font-bold text-gray-900">Day {dayNumber}</h3><p className="mt-1 text-sm text-gray-600">Choose the stay, places, meals, inclusions and drop-off for this day. Everything is optional while you build.</p></div>
    {loading ? <div className="py-10 text-center text-sm text-gray-500"><Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />Loading master data…</div> : <>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block space-y-1.5"><span className="text-sm font-medium text-gray-700">Stay location</span><select className="h-9 w-full rounded-md border border-input bg-white px-3 text-sm" value={day.stayLocationId} onChange={(event) => update({ stayLocationId: event.target.value, propertyId: "", placeIds: [] })}><option value="">No stay selected</option>{stays.map((stay) => <option key={stay.id} value={stay.id}>{stay.name}</option>)}</select></label>
        <label className="block space-y-1.5"><span className="text-sm font-medium text-gray-700">Property</span><select disabled={!day.stayLocationId} className="h-9 w-full rounded-md border border-input bg-white px-3 text-sm disabled:bg-gray-50" value={day.propertyId} onChange={(event) => update({ propertyId: event.target.value })}><option value="">No property selected</option>{dayProperties.map((property) => <option key={property.id} value={property.id}>{property.name}</option>)}</select></label>
      </div>
      <div className="space-y-1.5"><span className="text-sm font-medium text-gray-700">Visiting places</span><div className="grid max-h-52 grid-cols-1 gap-1 overflow-y-auto rounded-md border border-input bg-white p-2 sm:grid-cols-2">{!day.stayLocationId && <p className="p-2 text-sm text-gray-500">Choose a stay location first.</p>}{dayPlaces.map((place) => <label key={place.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-50"><input type="checkbox" checked={day.placeIds.includes(place.id)} onChange={(event) => togglePlace(place.id, event.target.checked)} />{place.name}</label>)}{day.stayLocationId && !dayPlaces.length && <p className="p-2 text-sm text-gray-500">No visiting places exist for this stay location yet.</p>}</div></div>
      <div className="rounded-lg bg-gray-50 p-4"><p className="mb-3 text-sm font-semibold text-gray-800">Meals</p><div className="flex flex-wrap gap-4">{(["breakfast", "lunch", "dinner"] as const).map((meal) => <label key={meal} className="flex cursor-pointer items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={day[meal]} onChange={(event) => update({ [meal]: event.target.checked })} />{meal[0].toUpperCase() + meal.slice(1)}</label>)}</div></div>
      <div className="rounded-lg border border-amber-100 bg-amber-50/50 p-4"><p className="mb-3 text-sm font-semibold text-gray-800">Day inclusions</p><div className="flex flex-wrap gap-4">{([['ILP_AND_PERMITS', 'ILP and permits'], ['BBQ', 'BBQ'], ['BONFIRE', 'Bonfire'], ['TRIP_GUIDE', 'Trip guide']] as const).map(([key, label]) => <label key={key} className="flex cursor-pointer items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={day.commonInclusions.includes(key)} onChange={(event) => toggleInclusion(key, event.target.checked)} />{label}</label>)}</div></div>
      <div><p className="mb-2 text-sm font-medium text-gray-700">Activities</p><div className="space-y-2">{day.activities.map((name, index) => <div key={`${name}-${index}`} className="flex items-center justify-between rounded-md border border-gray-100 px-3 py-2 text-sm"><span>{name}</span><Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-red-600 hover:bg-red-50" onClick={() => update({ activities: day.activities.filter((_, activityIndex) => activityIndex !== index) })}><Trash2 className="h-3.5 w-3.5" /></Button></div>)}</div><div className="mt-2 flex gap-2"><Input value={activity} onChange={(event) => setActivity(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addActivity(); } }} placeholder="Add an activity" /><Button type="button" onClick={addActivity} variant="outline"><Plus className="h-4 w-4" /></Button></div></div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">Drop-off</p>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={day.isDropOff} onChange={(event) => update({ isDropOff: event.target.checked, dropOffLocationId: event.target.checked ? day.dropOffLocationId : "" })} />
            This is the drop-off day
          </label>
          <select disabled={!day.isDropOff} className="h-9 w-full rounded-md border border-input bg-white px-3 text-sm disabled:bg-gray-50" value={day.dropOffLocationId} onChange={(event) => update({ dropOffLocationId: event.target.value })}><option value="">Select transfer location</option>{transfers.map((transfer) => <option key={transfer.id} value={transfer.id}>{transfer.name}</option>)}</select>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">Transport</p>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={day.transportEnabled} onChange={(event) => update({ transportEnabled: event.target.checked, transportText: event.target.checked ? day.transportText : "" })} />
            Provide transport for this day
          </label>
          <Input disabled={!day.transportEnabled} placeholder="e.g. SUV Innova for sightseeing" value={day.transportText} onChange={(event) => update({ transportText: event.target.value })} className="h-9" />
        </div>

        <label className="block space-y-1.5 md:col-span-2">
          <span className="text-sm font-medium text-gray-700">Notes</span>
          <Textarea rows={3} value={day.notes} onChange={(event) => update({ notes: event.target.value })} placeholder="Optional notes for this day" />
        </label>
      </div>
    </>}
  </section>;
}

function CrmTripBookingsFullPage({ trip, onBack }: { trip: CrmTrip; onBack: () => void }) {
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showInstallmentModal, setShowInstallmentModal] = useState<any | null>(null);
  const [showVerifyModal, setShowVerifyModal] = useState<any | null>(null);

  const bookingsQuery = useQuery({
    queryKey: ["crm-trip-bookings", trip.id],
    queryFn: async () => (await apiClient.get(`/crm-trips/${trip.id}/bookings`)).data as Array<{
      id: string;
      bookingReference: string;
      status: string;
      paymentStatus: string;
      totalAmount: string | number;
      amountPaid: string | number;
      amountDue: string | number;
      numberOfTravelers: number;
      specialRequests?: string | null;
      user: { email: string; profile?: { fullName?: string | null; phone?: string | null } | null };
      payments?: Array<{
        id: string;
        amount: string | number;
        paymentMethod: string;
        status: string;
        paidAt?: string | null;
        razorpayPaymentId?: string | null;
      }>;
      travelers?: Array<{
        id: string;
        fullName: string;
        email?: string | null;
        phone?: string | null;
      }>;
    }>,
  });

  const bookings = bookingsQuery.data || [];

  // Calculate Premium Stats
  const totalBookings = bookings.length;
  const totalRevenue = bookings.reduce((sum, b) => sum + Number(b.totalAmount), 0);
  const totalPaid = bookings.reduce((sum, b) => sum + Number(b.amountPaid), 0);
  const totalOutstanding = bookings.reduce((sum, b) => sum + Number(b.amountDue), 0);

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      <div className="flex flex-col gap-4">
        {/* Back Button */}
        <div>
          <Button
            variant="ghost"
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 px-0 hover:bg-transparent"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Itineraries
          </Button>
        </div>

        {/* Header Block */}
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#b59410]">CRM bookings</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-gray-900">{trip.name}</h1>
            <p className="mt-2 text-sm text-gray-500">
              Manage and track customer bookings, collect payments, or request payment links.
            </p>
          </div>
          <div>
            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-[#781216] text-white hover:bg-[#5f0e11] font-semibold"
            >
              <Plus className="mr-2 h-4 w-4" /> Create booking
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Board */}
      <div className="grid gap-5 md:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Total Bookings</p>
          <p className="mt-2 text-3xl font-extrabold text-gray-900">{totalBookings}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Revenue Received</p>
          <p className="mt-2 text-3xl font-extrabold text-[#781216]">
            ₹{totalPaid.toLocaleString("en-IN")}
            <span className="text-xs font-normal text-gray-500 ml-1.5">of ₹{totalRevenue.toLocaleString("en-IN")}</span>
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Outstanding Due</p>
          <p className="mt-2 text-3xl font-extrabold text-amber-600">₹{totalOutstanding.toLocaleString("en-IN")}</p>
        </div>
      </div>

      {/* Future Tabs Bar */}
      <div className="flex border-b border-gray-200">
        <button className="border-b-2 border-[#781216] px-4 py-2.5 text-sm font-medium text-[#781216]">
          All Bookings
        </button>
        <button className="px-4 py-2.5 text-sm font-medium text-gray-400 hover:text-gray-600 cursor-not-allowed" disabled>
          Active Departures (Soon)
        </button>
        <button className="px-4 py-2.5 text-sm font-medium text-gray-400 hover:text-gray-600 cursor-not-allowed" disabled>
          Refunds & Cancellations (Soon)
        </button>
      </div>

      {/* Bookings Table List */}
      {bookingsQuery.isLoading ? (
        <div className="py-20 text-center text-sm text-gray-500">
          <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin text-gray-400" /> Loading bookings list…
        </div>
      ) : bookings.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-white py-16 text-center text-gray-400">
          <Users className="mx-auto mb-3 h-8 w-8 text-gray-300" />
          <p className="text-sm font-semibold">No bookings registered for this trip yet.</p>
          <p className="mt-1 text-xs">Click "Create booking" to add a customer manually.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-55/30 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                <th className="p-4">Reference</th>
                <th className="p-4">Customer</th>
                <th className="p-4">Travelers</th>
                <th className="p-4">Pricing</th>
                <th className="p-4">Due</th>
                <th className="p-4">Payment Status</th>
                <th className="p-4">Booking Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {bookings.map((booking) => {
                const due = Number(booking.amountDue);
                const pendingPayment = (booking.payments || []).find((p: any) => p.status === "PENDING_VERIFICATION");
                return (
                  <tr key={booking.id} className="hover:bg-gray-50/50">
                    <td className="p-4 font-mono text-xs font-bold text-gray-900">{booking.bookingReference}</td>
                    <td className="p-4">
                      <div className="font-semibold text-gray-900">{booking.user.profile?.fullName || "Traveler"}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{booking.user.email}</div>
                      {booking.user.profile?.phone && <div className="text-xs text-gray-400 mt-0.5">{booking.user.profile.phone}</div>}
                    </td>
                    <td className="p-4 font-semibold text-gray-700">{booking.numberOfTravelers} pax</td>
                    <td className="p-4">
                      <div className="font-semibold text-gray-900">₹{Number(booking.totalAmount).toLocaleString("en-IN")}</div>
                      <div className="text-xs text-gray-500 mt-0.5">Paid ₹{Number(booking.amountPaid).toLocaleString("en-IN")}</div>
                    </td>
                    <td className="p-4 font-bold text-gray-900">
                      {due > 0 ? (
                        <span className="text-amber-600">₹{due.toLocaleString("en-IN")}</span>
                      ) : (
                        <span className="text-green-600">Fully Paid</span>
                      )}
                    </td>
                    <td className="p-4">
                      {pendingPayment ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800 border border-amber-300 animate-pulse">
                          <ShieldCheck className="h-3 w-3 text-amber-600" /> Pending Verification
                        </span>
                      ) : (
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            booking.paymentStatus === "PAID"
                              ? "bg-green-50 text-green-700"
                              : booking.paymentStatus === "PARTIALLY_PAID"
                                ? "bg-amber-50 text-amber-700"
                                : "bg-gray-50 text-gray-700"
                          }`}
                        >
                          {booking.paymentStatus === "PAID"
                            ? "Paid"
                            : booking.paymentStatus === "PARTIALLY_PAID"
                              ? "Partially Paid"
                              : "Unpaid"}
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          booking.status === "CONFIRMED"
                            ? "bg-green-50 text-green-700"
                            : booking.status === "CANCELLED"
                              ? "bg-red-50 text-red-700"
                              : "bg-gray-50 text-gray-700"
                        }`}
                      >
                        {booking.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      {pendingPayment ? (
                        <Button
                          size="sm"
                          onClick={() => setShowVerifyModal({ ...pendingPayment, booking })}
                          className="h-8 bg-amber-600 hover:bg-amber-700 text-white font-bold"
                        >
                          <ShieldCheck className="mr-1 h-3.5 w-3.5" /> Verify UTR
                        </Button>
                      ) : (
                        due > 0 && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setShowInstallmentModal(booking)}
                            className="h-8 border-[#781216]/20 text-[#781216] hover:bg-[#781216]/5"
                          >
                            Add Installment
                          </Button>
                        )
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Verify Payment Modal */}
      {showVerifyModal && (
        <AdminVerifyPaymentModal
          payment={showVerifyModal}
          onClose={() => setShowVerifyModal(null)}
          onSuccess={() => {
            setShowVerifyModal(null);
            bookingsQuery.refetch();
          }}
        />
      )}

      {/* Create Booking Modal */}
      {showCreateModal && (
        <CreateCrmBookingModal
          trip={trip}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            bookingsQuery.refetch();
            queryClient.invalidateQueries({ queryKey: ["crm-trips"] });
          }}
        />
      )}

      {/* Add Installment Modal */}
      {showInstallmentModal && (
        <AddInstallmentModal
          trip={trip}
          booking={showInstallmentModal}
          onClose={() => setShowInstallmentModal(null)}
          onSuccess={() => {
            setShowInstallmentModal(null);
            bookingsQuery.refetch();
          }}
        />
      )}
    </div>
  );
}

function CreateCrmBookingModal({
  trip,
  onClose,
  onSuccess,
}: {
  trip: CrmTrip;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [numberOfTravelers, setNumberOfTravelers] = useState(1);
  const [paymentAmount, setPaymentAmount] = useState(String(trip.tokenAmount || ""));
  const [paymentAction, setPaymentAction] = useState<"MANUAL" | "SEND_LINK">("MANUAL");
  const [specialRequests, setSpecialRequests] = useState("");
  const [additionalTravelers, setAdditionalTravelers] = useState<Array<{ fullName: string; email: string; phone: string; gender: string; dateOfBirth: string }>>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const extraCount = Math.max(0, numberOfTravelers - 1);
    setAdditionalTravelers(
      Array.from({ length: extraCount }, (_, i) => additionalTravelers[i] || { fullName: "", email: "", phone: "", gender: "", dateOfBirth: "" })
    );
  }, [numberOfTravelers]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) {
      toast.error("Please enter traveler name and email");
      return;
    }
    const amt = Number(paymentAmount);
    if (!Number.isFinite(amt) || amt <= 0 || amt > Number(trip.totalAmount)) {
      toast.error(`Please enter a payment amount between ₹1 and ₹${Number(trip.totalAmount).toFixed(2)}`);
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim() || null,
        gender: gender || null,
        dateOfBirth: dateOfBirth || null,
        numberOfTravelers,
        paymentAmount: amt,
        paymentAction,
        specialRequests: specialRequests.trim() || null,
        additionalTravelers: additionalTravelers.filter((t) => t.fullName.trim()),
      };

      await apiClient.post(`/crm-trips/${trip.id}/bookings`, payload);
      toast.success("CRM booking created successfully!");
      onSuccess();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Could not register booking");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={(val) => { if (!val) onClose(); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>New CRM Booking</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-gray-500 uppercase">Customer Name *</span>
              <Input required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g. Rohan Sharma" />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-gray-500 uppercase">Customer Email *</span>
              <Input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="e.g. rohan@gmail.com" />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-gray-500 uppercase">Phone Number</span>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. +91 9876543210" />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-gray-500 uppercase">Gender</span>
              <select className="h-9 w-full rounded-md border border-input bg-white px-3 text-sm" value={gender} onChange={(e) => setGender(e.target.value)}>
                <option value="">Select Gender</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
                <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
              </select>
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-gray-500 uppercase">Date of Birth</span>
              <Input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-gray-500 uppercase">Travelers count</span>
              <Input type="number" min="1" value={numberOfTravelers} onChange={(e) => setNumberOfTravelers(Number(e.target.value) || 1)} />
            </label>
          </div>

          {/* Additional travelers details */}
          {additionalTravelers.length > 0 && (
            <div className="space-y-3 border-t pt-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700">Additional Travelers Details</h4>
              <div className="space-y-3 max-h-40 overflow-y-auto pr-1">
                {additionalTravelers.map((traveler, index) => (
                  <div key={index} className="grid gap-3 sm:grid-cols-3 p-3 rounded-lg border bg-gray-50/50">
                    <label className="col-span-full font-semibold text-xs text-gray-600">Traveler #{index + 2}</label>
                    <Input
                      placeholder="Full Name"
                      value={traveler.fullName}
                      onChange={(e) => {
                        const updated = [...additionalTravelers];
                        updated[index].fullName = e.target.value;
                        setAdditionalTravelers(updated);
                      }}
                      required
                      className="h-8 text-xs"
                    />
                    <Input
                      placeholder="Email"
                      type="email"
                      value={traveler.email}
                      onChange={(e) => {
                        const updated = [...additionalTravelers];
                        updated[index].email = e.target.value;
                        setAdditionalTravelers(updated);
                      }}
                      className="h-8 text-xs"
                    />
                    <select
                      className="h-8 rounded-md border border-input bg-white px-2 text-xs"
                      value={traveler.gender}
                      onChange={(e) => {
                        const updated = [...additionalTravelers];
                        updated[index].gender = e.target.value;
                        setAdditionalTravelers(updated);
                      }}
                    >
                      <option value="">Gender</option>
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pricing & Collection details */}
          <div className="space-y-3 border-t pt-3 bg-gray-55/20 rounded-xl p-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700">Initial Payment Setup</h4>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-1">
                <span className="text-xs font-semibold text-gray-500 uppercase">Payment Amount (₹)</span>
                <Input type="number" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} placeholder="₹" />
                <span className="text-[10px] text-gray-400 block mt-0.5">Prefilled token amount. (Total: ₹{Number(trip.totalAmount).toLocaleString("en-IN")})</span>
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-semibold text-gray-500 uppercase">Payment Collection Action</span>
                <select className="h-9 w-full rounded-md border border-input bg-white px-3 text-sm" value={paymentAction} onChange={(e) => setPaymentAction(e.target.value as any)}>
                  <option value="MANUAL">Collect Offline (Mark Paid)</option>
                  <option value="SEND_LINK">Send Razorpay Payment Link</option>
                </select>
              </label>
            </div>
          </div>

          <label className="block space-y-1">
            <span className="text-xs font-semibold text-gray-500 uppercase">Special requests / notes</span>
            <Textarea rows={2} value={specialRequests} onChange={(e) => setSpecialRequests(e.target.value)} placeholder="Food choices, pick-up details etc." />
          </label>

          <div className="flex justify-end gap-2 border-t pt-3">
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
            <Button type="submit" disabled={submitting} className="bg-[#781216] text-white hover:bg-[#5f0e11]">
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create booking
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AddInstallmentModal({
  trip,
  booking,
  onClose,
  onSuccess,
}: {
  trip: CrmTrip;
  booking: any;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [paymentAmount, setPaymentAmount] = useState(String(booking.amountDue || ""));
  const [paymentAction, setPaymentAction] = useState<"MANUAL" | "SEND_LINK">("MANUAL");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const amt = Number(paymentAmount);
    if (!Number.isFinite(amt) || amt <= 0 || amt > Number(booking.amountDue)) {
      toast.error(`Please enter a payment amount between ₹1 and ₹${Number(booking.amountDue).toFixed(2)}`);
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        paymentAmount: amt,
        paymentAction,
      };

      await apiClient.post(`/crm-trips/${trip.id}/bookings/${booking.id}/installments`, payload);
      toast.success("Installment logged successfully!");
      onSuccess();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Could not record installment");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={(val) => { if (!val) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Log Installment Payment</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="bg-gray-50 p-3 rounded-lg border text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-500">Booking Reference:</span>
              <span className="font-mono font-bold">{booking.bookingReference}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Customer:</span>
              <span className="font-semibold">{booking.user.profile?.fullName || booking.user.email}</span>
            </div>
            <div className="flex justify-between border-t pt-1 mt-1 text-sm font-semibold">
              <span>Outstanding Due:</span>
              <span className="text-amber-600">₹{Number(booking.amountDue).toLocaleString("en-IN")}</span>
            </div>
          </div>

          <label className="block space-y-1">
            <span className="text-xs font-semibold text-gray-500 uppercase">Payment Amount (₹)</span>
            <Input required type="number" max={Number(booking.amountDue)} value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} placeholder="₹" />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-semibold text-gray-500 uppercase">Payment Collection Action</span>
            <select className="h-9 w-full rounded-md border border-input bg-white px-3 text-sm" value={paymentAction} onChange={(e) => setPaymentAction(e.target.value as any)}>
              <option value="MANUAL">Collect Offline (Mark Paid)</option>
              <option value="SEND_LINK">Send Razorpay Payment Link</option>
            </select>
          </label>

          <div className="flex justify-end gap-2 border-t pt-3">
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
            <Button type="submit" disabled={submitting} className="bg-[#781216] text-white hover:bg-[#5f0e11]">
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Log Installment
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

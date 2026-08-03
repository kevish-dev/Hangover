import { FormEvent, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
} from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "../../../lib/axios";
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

type Destination = { id: string; name: string };
type CrmTrip = {
  id: string;
  name: string;
  numberOfNights: number;
  destination: Destination;
  airportPickupEnabled: boolean;
  airportDropEnabled: boolean;
  _count?: { itineraryDays: number; inclusions: number };
};
type CrmTripDetail = CrmTrip & {
  totalAmount: string | number;
  tokenAmount: string | number;
  packages: Array<{ title: string; price: string | number; tokenAmount: string | number }>;
  addOns: Array<{ title: string; description?: string | null; imageUrl?: string | null; price: string | number; maxQuantityPerBooking?: number | null; maxQuantityPerSlot?: number | null; purchaseCutoffOffsetDays?: number | null; isActive: boolean }>;
  itineraryDays: Array<{ stayLocationId?: string | null; propertyId?: string | null; visitingPlaces: Array<{ placeId?: string; place: { id: string } }>; breakfast: boolean; lunch: boolean; dinner: boolean; notes?: string | null; isDropOff: boolean; dropOffLocationId?: string | null; activities: Array<{ name: string }>; commonInclusions: Array<{ key: DayCommonInclusionKey }> }>;
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
  notes: string;
  isDropOff: boolean;
  dropOffLocationId: string;
  activities: string[];
  commonInclusions: DayCommonInclusionKey[];
};

const emptyItineraryDay = (): ItineraryDayDraft => ({
  stayLocationId: "", propertyId: "", placeIds: [], breakfast: false, lunch: false,
  dinner: false, notes: "", isDropOff: false, dropOffLocationId: "", activities: [], commonInclusions: [],
});

export default function CrmTripsPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingTrip, setEditingTrip] = useState<CrmTripDetail | null>(null);
  const [menuTrip, setMenuTrip] = useState<string | null>(null);
  const [deleteTrip, setDeleteTrip] = useState<CrmTrip | null>(null);
  const [bookingsTrip, setBookingsTrip] = useState<CrmTrip | null>(null);
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

  const remove = async () => {
    if (!deleteTrip) return;
    try {
      await apiClient.delete(`/crm-trips/${deleteTrip.id}`);
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
                <button type="button" onClick={() => setBookingsTrip(trip)} className="ml-auto font-medium text-[#781216] hover:underline">Open bookings <ChevronRight className="inline h-3.5 w-3.5" /></button>
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
      <CrmTripBookingsDialog trip={bookingsTrip} onOpenChange={(isOpen) => { if (!isOpen) setBookingsTrip(null); }} />
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
              onClick={remove}
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
      breakfast: day.breakfast, lunch: day.lunch, dinner: day.dinner, notes: day.notes || "",
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

    setSaving(true);
    try {
      const primaryPackage = cleanPackages[0];
      const payload = {
        name: name.trim(),
        numberOfNights: Number(nights),
        destinationId,
        // CRM bookings currently use one trip-level amount. Keep it aligned
        // with the first (default) package until package selection reaches bookings.
        totalAmount: primaryPackage.price,
        tokenAmount: primaryPackage.tokenAmount,
        airportPickupEnabled: pickup,
        airportDropEnabled: drop,
        days: itineraryDays.map((day) => ({
          ...day,
          stayLocationId: day.stayLocationId || null,
          propertyId: day.propertyId || null,
          dropOffLocationId: day.isDropOff ? day.dropOffLocationId || null : null,
          notes: day.notes.trim() || null,
          activities: day.activities.filter(Boolean).map((name) => ({ name })),
        })),
        packages: cleanPackages,
        addOns: cleanAddOns,
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
                : "New itinerary trip · pricing & options"}
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
          ) : (
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
          )}
          <div className="flex justify-end gap-2 border-t pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (step === 1) close();
                else if (step === 2 && itineraryDayIndex > 0) setItineraryDayIndex((index) => index - 1);
                else if (step === 2) setStep(1);
                else { setItineraryDayIndex(Math.max(0, itineraryDays.length - 1)); setStep(2); }
              }}
            >
              {step === 1 ? "Cancel" : "Back"}
            </Button>
            <Button
              type={step === 1 || step === 3 ? "submit" : "button"}
              onClick={() => {
                if (step !== 2) return;
                if (itineraryDayIndex < itineraryDays.length - 1) setItineraryDayIndex((index) => index + 1);
                else setStep(3);
              }}
              disabled={saving}
              className="bg-[#781216] text-white hover:bg-[#5f0e11]"
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {step === 1 ? "Continue" : step === 2 ? itineraryDayIndex === itineraryDays.length - 1 ? "Continue to pricing" : "Next day" : "Create trip"}
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
      <div className="grid gap-4 md:grid-cols-2"><div className="space-y-2"><p className="text-sm font-medium text-gray-700">Drop-off</p><label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={day.isDropOff} onChange={(event) => update({ isDropOff: event.target.checked, dropOffLocationId: event.target.checked ? day.dropOffLocationId : "" })} />This is the drop-off day</label><select disabled={!day.isDropOff} className="h-9 w-full rounded-md border border-input bg-white px-3 text-sm disabled:bg-gray-50" value={day.dropOffLocationId} onChange={(event) => update({ dropOffLocationId: event.target.value })}><option value="">Select transfer location</option>{transfers.map((transfer) => <option key={transfer.id} value={transfer.id}>{transfer.name}</option>)}</select></div><label className="block space-y-1.5"><span className="text-sm font-medium text-gray-700">Notes</span><Textarea rows={4} value={day.notes} onChange={(event) => update({ notes: event.target.value })} placeholder="Optional notes for this day" /></label></div>
    </>}
  </section>;
}

function CrmTripBookingsDialog({ trip, onOpenChange }: { trip: CrmTrip | null; onOpenChange: (open: boolean) => void }) {
  const bookingsQuery = useQuery({
    queryKey: ["crm-trip-bookings", trip?.id],
    queryFn: async () => (await apiClient.get(`/crm-trips/${trip!.id}/bookings`)).data as Array<{ id: string; bookingReference: string; status: string; paymentStatus: string; totalAmount: string | number; amountPaid: string | number; amountDue: string | number; numberOfTravelers: number; user: { email: string; profile?: { fullName?: string | null } | null } }> ,
    enabled: Boolean(trip),
  });
  const bookings = bookingsQuery.data || [];
  return <Dialog open={Boolean(trip)} onOpenChange={onOpenChange}><DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>{trip?.name} · bookings</DialogTitle></DialogHeader>{bookingsQuery.isLoading ? <div className="py-10 text-center text-sm text-gray-500"><Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />Loading bookings…</div> : !bookings.length ? <p className="rounded-lg bg-gray-50 p-6 text-center text-sm text-gray-500">No CRM bookings for this trip yet.</p> : <div className="overflow-hidden rounded-lg border border-gray-200"><div className="divide-y divide-gray-100">{bookings.map((booking) => <div key={booking.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold text-gray-900">{booking.user.profile?.fullName || booking.user.email}</p><p className="text-xs text-gray-500">{booking.bookingReference} · {booking.numberOfTravelers} traveler{booking.numberOfTravelers === 1 ? "" : "s"}</p></div><div className="text-left text-sm sm:text-right"><p className="font-medium text-gray-900">₹{Number(booking.totalAmount).toLocaleString("en-IN")}</p><p className="text-xs text-gray-500">Paid ₹{Number(booking.amountPaid).toLocaleString("en-IN")} · Due ₹{Number(booking.amountDue).toLocaleString("en-IN")}</p></div></div>)}</div></div>}<div className="flex justify-end"><Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button></div></DialogContent></Dialog>;
}

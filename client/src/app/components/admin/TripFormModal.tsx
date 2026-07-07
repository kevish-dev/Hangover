import React, { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import {
  Plus,
  UploadCloud,
  Loader2,
  Image as ImageIcon,
  Trash2,
  ArrowRight,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Trash,
} from "lucide-react";
import { apiClient } from "../../../lib/axios";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { ItineraryStep } from "./ItineraryStep";
import { formatTripType } from "../../../lib/tripApi";

// --- VALIDATION SCHEMA ---
const tripSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  location: z.string().min(2, "Location is required"),
  tripType: z.string().min(1, "Trip type is required"),
  bestTimeToVisit: z.string().min(1, "Best time is required"),
  price: z.coerce.number().min(0, "Price must be positive"),
  tokenAmount: z.coerce.number().min(0, "Booking amount must be positive"),
  slots: z.array(
    z.object({
      id: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      capacity: z.coerce.number().min(1, "Capacity must be at least 1"),
    })
  ).min(1, "At least one slot is required"),

  overview: z.string().min(10, "Overview must be detailed"),
  inclusions: z
    .array(z.object({ value: z.string().min(1) }))
    .min(1, "At least one inclusion"),
  exclusions: z
    .array(z.object({ value: z.string().min(1) }))
    .min(1, "At least one exclusion"),
  tripTags: z.array(z.object({ value: z.string().min(1) })).optional(),
  faqs: z
    .array(
      z.object({
        question: z.string().min(1, "Required"),
        answer: z.string().min(1, "Required"),
      }),
    )
    .optional(),
  packages: z.array(
    z.object({
      title: z.string().min(1, "Title is required"),
      price: z.coerce.number().min(0, "Price must be positive"),
      tokenAmount: z.coerce.number().min(0, "Booking amount must be positive"),
    })
  ).optional(),
  isPublished: z.boolean().default(false),
  isFeatured: z.boolean().default(false),
  itineraries: z.array(
    z.object({
      id: z.string().optional(),
      title: z.string().min(1, "Title is required"),
      description: z.string().optional(),
      days: z.array(
        z.object({
          id: z.string().optional(),
          dayNumber: z.coerce.number().min(1),
          title: z.string().min(1, "Day title is required"),
          description: z.string().optional(),
          activities: z.array(
            z.object({
              id: z.string().optional(),
              title: z.string().min(1, "Activity title is required"),
              description: z.string().optional(),
              time: z.string().optional(),
            })
          ).optional()
        })
      ).min(1, "At least one day is required")
    })
  ).optional(),
  }
);

type TripFormValues = z.infer<typeof tripSchema>;

const TRIP_TYPES = [
  "MOUNTAIN_TREK",
  "BEACH_ESCAPE",
  "DESERT_EXPEDITION",
  "JUNGLE_WILDLIFE",
  "HERITAGE_WALK",
  "ROAD_TRIP",
  "BACKPACKING_TOUR",
  "PHOTOGRAPHY_TOUR",
  "BONFIRE_RETREAT",
  "INSTITUTE_COLLEGE_TRIP",
  "CUSTOM_TRIP",
];

const STEPS = [
  "Basics",
  "Logistics",
  "Content",
  "FAQs & Tags",
  "Itinerary",
  "Stay & Transport",
  "Media",
];

interface TripFormModalProps {
  trip?: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TripFormModal({
  trip,
  open,
  onOpenChange,
}: TripFormModalProps) {
  const [step, setStep] = useState(0);
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  // Highlight State
  const [highlightItems, setHighlightItems] = useState<
    {
      id: string;
      text: string;
      type: "NEW" | "EXISTING";
      url?: string;
      file?: File;
      preview?: string;
    }[]
  >([]);

  // Stay & Transport State
  const [stayItems, setStayItems] = useState<
    {
      id: string;
      text: string;
      type: "NEW" | "EXISTING";
      url?: string;
      file?: File;
      preview?: string;
    }[]
  >([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const isEdit = !!trip;

  // Format date to YYYY-MM-DDTHH:mm for datetime-local input
  const formatDateForInput = (dateString: string) => {
    if (!dateString) return "";
    try {
      return format(new Date(dateString), "yyyy-MM-dd'T'HH:mm");
    } catch {
      return "";
    }
  };

  const form = useForm<TripFormValues>({
    resolver: zodResolver(tripSchema),
    defaultValues: {
      title: "",
      location: "",
      tripType: "MOUNTAIN_TREK",
      bestTimeToVisit: "",
      price: 0,
      tokenAmount: 0,
      slots: [{ startDate: "", endDate: "", capacity: 10 }],
      overview: "",
      inclusions: [],
      exclusions: [],
      tripTags: [],
      packages: [],
      faqs: [],
      isPublished: false,
      isFeatured: false,
    },
    mode: "onTouched",
  });

  // Reset form when trip prop changes or modal opens
  useEffect(() => {
    if (open) {
      if (trip) {
        form.reset({
          title: trip.title || "",
          location: trip.location || "",
          tripType: trip.tripType || "MOUNTAIN_TREK",
          bestTimeToVisit: trip.bestTimeToVisit || "",
          price: trip.price || 0,
          tokenAmount: trip.tokenAmount || 0,
          slots: trip.slots && trip.slots.length > 0 ? trip.slots.map((s: any) => ({
            id: s.id,
            startDate: formatDateForInput(s.startDate),
            endDate: formatDateForInput(s.endDate),
            capacity: s.capacity
          })) : [{ startDate: "", endDate: "", capacity: 10 }],
          overview: trip.overview || "",
          inclusions: trip.inclusions?.length
            ? trip.inclusions.map((i: string) => ({ value: i }))
            : [{ value: "" }],
          exclusions: trip.exclusions?.length
            ? trip.exclusions.map((e: string) => ({ value: e }))
            : [{ value: "" }],
          tripTags: trip.tripTags?.length
            ? trip.tripTags.map((t: any) => ({ value: t.tag }))
            : [{ value: "" }],
          faqs: trip.faqs?.length
            ? trip.faqs.map((f: any) => ({
                question: f.question,
                answer: f.answer,
              }))
            : [],
          packages: trip.packages?.length
            ? trip.packages.map((p: any) => ({
                title: p.title,
                price: p.price,
                tokenAmount: p.tokenAmount,
              }))
            : [],
          itineraries: trip.itineraries?.length
            ? trip.itineraries.map((it: any) => ({
                id: it.id,
                title: it.title,
                description: it.description || "",
                days: it.days?.map((d: any) => ({
                  id: d.id,
                  dayNumber: d.dayNumber,
                  title: d.title,
                  description: d.description || "",
                  activities: d.activities?.map((a: any) => ({
                    id: a.id,
                    title: a.title,
                    description: a.description || "",
                    time: a.time || "",
                  })) || []
                })) || []
              }))
            : [],
          isPublished: trip.isPublished || false,
          isFeatured: trip.isFeatured || false,
        });

        // Initialize Highlight items
        let parsedHighlights = trip.highlights || [];
        if (typeof parsedHighlights === "string") {
          try { parsedHighlights = JSON.parse(parsedHighlights); } catch(e) { parsedHighlights = []; }
        }
        setHighlightItems(
          Array.isArray(parsedHighlights) ? parsedHighlights.map((item: any) => ({
            id: Math.random().toString(),
            text: item.text || "",
            type: "EXISTING",
            url: item.imageUrl,
            preview: item.imageUrl,
          })) : []
        );

        // Initialize Stay items
        let parsedStay = trip.stayTransportImages || [];
        if (typeof parsedStay === "string") {
          try { parsedStay = JSON.parse(parsedStay); } catch(e) { parsedStay = []; }
        }
        setStayItems(
          Array.isArray(parsedStay) ? parsedStay.map((item: any) => ({
            id: Math.random().toString(),
            text: item.text || "",
            type: "EXISTING",
            url: item.imageUrl,
            preview: item.imageUrl,
          })) : []
        );
      } else {
        form.reset({
          title: "",
          location: "",
          tripType: "MOUNTAIN_TREK",
          bestTimeToVisit: "",
          price: 0,
          tokenAmount: 0,
          slots: [{ startDate: "", endDate: "", capacity: 10 }],
          overview: "",
          inclusions: [],
          exclusions: [],
          tripTags: [],
          packages: [],
          faqs: [],
          itineraries: [],
          isPublished: false,
          isFeatured: false,
        });
        setStayItems([]);
        setHighlightItems([]);
      }
      setStep(0);
      setImages([]);
      setImagePreviews([]);
    }
  }, [trip, open, form]);

  const {
    fields: inclusionFields,
    append: addInclusion,
    remove: removeInclusion,
  } = useFieldArray({
    control: form.control,
    name: "inclusions",
  });
  const {
    fields: exclusionFields,
    append: addExclusion,
    remove: removeExclusion,
  } = useFieldArray({
    control: form.control,
    name: "exclusions",
  });
  const {
    fields: tripTagFields,
    append: addTripTag,
    remove: removeTripTag,
  } = useFieldArray({
    control: form.control,
    name: "tripTags",
  });
  const {
    fields: packageFields,
    append: appendPackage,
    remove: removePackage,
  } = useFieldArray({
    name: "packages",
    control: form.control,
  });
  const {
    fields: slotFields,
    append: appendSlot,
    remove: removeSlot,
  } = useFieldArray({
    name: "slots",
    control: form.control,
  });
  const {
    fields: faqFields,
    append: addFaq,
    remove: removeFaq,
    move: moveFaq,
  } = useFieldArray({
    control: form.control,
    name: "faqs",
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setImages((prev) => [...prev, ...newFiles]);
      const newPreviews = newFiles.map((file) => URL.createObjectURL(file));
      setImagePreviews((prev) => [...prev, ...newPreviews]);
    }
    e.target.value = "";
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };


  // --- Highlights Handlers ---
  const addHighlightItem = () => {
    setHighlightItems((prev) => [
      ...prev,
      { id: Math.random().toString(), text: "", type: "NEW" },
    ]);
  };
  const removeHighlightItem = (index: number) => {
    setHighlightItems((prev) => {
      const newItems = [...prev];
      if (newItems[index].type === "NEW" && newItems[index].preview) {
        URL.revokeObjectURL(newItems[index].preview!);
      }
      newItems.splice(index, 1);
      return newItems;
    });
  };
  const updateHighlightItemText = (index: number, text: string) => {
    setHighlightItems((prev) => {
      const newItems = [...prev];
      newItems[index].text = text;
      return newItems;
    });
  };
  const handleHighlightImageChange = (
    index: number,
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setHighlightItems((prev) => {
        const newItems = [...prev];
        if (newItems[index].preview && newItems[index].type === "NEW") {
          URL.revokeObjectURL(newItems[index].preview!);
        }
        newItems[index].type = "NEW";
        newItems[index].file = file;
        newItems[index].preview = URL.createObjectURL(file);
        return newItems;
      });
    }
  };

  // --- Stay & Transport Handlers ---
  const addStayItem = () => {
    setStayItems((prev) => [
      ...prev,
      { id: Math.random().toString(), text: "", type: "NEW" },
    ]);
  };
  const removeStayItem = (index: number) => {
    setStayItems((prev) => {
      const newItems = [...prev];
      if (newItems[index].type === "NEW" && newItems[index].preview) {
        URL.revokeObjectURL(newItems[index].preview!);
      }
      newItems.splice(index, 1);
      return newItems;
    });
  };
  const updateStayItemText = (index: number, text: string) => {
    setStayItems((prev) => {
      const newItems = [...prev];
      newItems[index].text = text;
      return newItems;
    });
  };
  const handleStayImageChange = (
    index: number,
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setStayItems((prev) => {
        const newItems = [...prev];
        if (newItems[index].preview && newItems[index].type === "NEW") {
          URL.revokeObjectURL(newItems[index].preview!);
        }
        newItems[index].type = "NEW";
        newItems[index].file = file;
        newItems[index].preview = URL.createObjectURL(file);
        return newItems;
      });
    }
  };

  const deleteExistingImage = async (url: string) => {
    if (!trip?.id) return;
    if (
      !window.confirm(
        "Are you sure you want to permanently delete this banner image?",
      )
    )
      return;

    try {
      await apiClient.delete(`/trips/${trip.id}/banner-images`, {
        data: { imageUrl: url },
      });
      toast.success("Image deleted successfully");
      trip.bannerImages = trip.bannerImages.filter(
        (img: string) => img !== url,
      );
      queryClient.invalidateQueries({ queryKey: ["admin", "trips"] });
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to delete image");
    }
  };

  const deleteExistingGalleryImage = async (url: string) => {
    if (!trip?.id) return;
    if (
      !window.confirm(
        "Are you sure you want to permanently delete this gallery image?",
      )
    )
      return;

    try {
      await apiClient.delete(`/trips/${trip.id}/gallery-images`, {
        data: { imageUrl: url },
      });
      toast.success("Gallery image deleted successfully");
      trip.galleryImages = trip.galleryImages.filter(
        (img: string) => img !== url,
      );
      queryClient.invalidateQueries({ queryKey: ["admin", "trips"] });
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to delete image");
    }
  };

  const validateStep = async () => {
    let fieldsToValidate: (keyof TripFormValues)[] = [];
    if (step === 0)
      fieldsToValidate = [
        "title",
        "location",
        "tripType",
        "bestTimeToVisit",
        "price",
        "tokenAmount",
      ];
    else if (step === 1) {
      fieldsToValidate = ["slots"];
    } else if (step === 2) {
      fieldsToValidate = ["overview", "inclusions", "exclusions"];
    }
    if (step === 3) fieldsToValidate = ["faqs", "tripTags"];
    if (step === 4) fieldsToValidate = ["itineraries"];
    if (step === 5) return true; // Stay & Transport has local state, basic validation can be skipped or added if needed

    const isValid = await form.trigger(fieldsToValidate);

    if (step === 2) {
      const invalid = highlightItems.some(
        (i) => i.text.trim() === "" || (!i.preview && !i.url),
      );
      if (invalid) {
        toast.error(
          "Please fill text and select an image for all Highlight items.",
        );
        return false;
      }
    }

    if (step === 5) {
      const invalid = stayItems.some(
        (i) => i.text.trim() === "" || (!i.preview && !i.url),
      );
      if (invalid) {
        toast.error(
          "Please fill text and select an image for all Stay & Transport items.",
        );
        return false;
      }
    }

    return isValid;
  };

  const nextStep = async () => {
    if (await validateStep()) {
      setStep((s) => Math.min(STEPS.length - 1, s + 1));
    } else {
      toast.error("Validation Error: Please fill in all required fields marked with * to continue.", {
        position: "bottom-right",
      });
    }
  };
  const prevStep = () => setStep((s) => Math.max(0, s - 1));

  const onSubmit = async (data: TripFormValues) => {
    if (step !== STEPS.length - 1) return;

    setIsSubmitting(true);
    try {
      const payload = {
        ...data,
        slots: data.slots.map(s => ({
            ...s,
            startDate: s.startDate ? new Date(s.startDate).toISOString() : null,
            endDate: s.endDate ? new Date(s.endDate).toISOString() : null,
        })),
        inclusions: data.inclusions
          .map((i) => i.value)
          .filter((i) => i.trim() !== ""),
        exclusions: data.exclusions
          .map((e) => e.value)
          .filter((e) => e.trim() !== ""),
        tripTags: data.tripTags
          ?.map((t) => t.value)
          .filter((t) => t.trim() !== ""),
        packages: data.packages,
        itineraries: data.itineraries,
        faqs: data.faqs?.filter(
          (f) => f.question.trim() !== "" && f.answer.trim() !== "",
        ),
      };

      let tripId = trip?.id;

      if (isEdit) {
        await apiClient.put(`/trips/${tripId}`, payload);
        toast.success("Trip updated successfully!");
      } else {
        const createRes = await apiClient.post("/trips", payload);
        tripId = createRes.data.trip.id;
        toast.success("Trip created successfully!");
      }

      // Sync Stay & Transport Images
      if (stayItems.length > 0) {
        const stayFormData = new FormData();
        const stayPayload: any[] = [];
        let fileIndex = 0;

        stayItems.forEach((item) => {
          if (item.type === "NEW" && item.file) {
            stayFormData.append("images", item.file);
            stayPayload.push({ text: item.text, type: "NEW", fileIndex });
            fileIndex++;
          } else if (item.type === "EXISTING") {
            stayPayload.push({
              text: item.text,
              type: "EXISTING",
              url: item.url,
            });
          }
        });
        stayFormData.append("payload", JSON.stringify(stayPayload));

        await apiClient.post(`/trips/${tripId}/stay-transport`, stayFormData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        toast.success("Stay & Transport updated!");
      } else if (isEdit) {
        const stayFormData = new FormData();
        stayFormData.append("payload", JSON.stringify([]));
        await apiClient.post(`/trips/${tripId}/stay-transport`, stayFormData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      // Sync Highlights
      if (highlightItems.length > 0) {
        const highlightFormData = new FormData();
        const highlightPayload: any[] = [];
        let highlightFileIndex = 0;

        highlightItems.forEach((item) => {
          if (item.type === "NEW" && item.file) {
            highlightFormData.append("images", item.file);
            highlightPayload.push({ text: item.text, type: "NEW", fileIndex: highlightFileIndex });
            highlightFileIndex++;
          } else if (item.type === "EXISTING") {
            highlightPayload.push({
              text: item.text,
              type: "EXISTING",
              url: item.url,
            });
          }
        });
        highlightFormData.append("payload", JSON.stringify(highlightPayload));

        await apiClient.post(`/trips/${tripId}/highlights`, highlightFormData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        toast.success("Highlights updated!");
      } else if (isEdit) {
        const highlightFormData = new FormData();
        highlightFormData.append("payload", JSON.stringify([]));
        await apiClient.post(`/trips/${tripId}/highlights`, highlightFormData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      // Sync Banners
      if (images.length > 0) {
        const formData = new FormData();
        images.forEach((img) => formData.append("banners", img));
        await apiClient.post(`/trips/${tripId}/banner-images`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        toast.success("Banner images uploaded!");
      }

      queryClient.invalidateQueries({ queryKey: ["admin", "trips"] });
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to save trip");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === "Enter" && (e.target as HTMLElement).tagName !== "TEXTAREA") {
      e.preventDefault();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <div className="px-6 pt-6 pb-4 border-b">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              {isEdit ? "Edit Trip" : "Create New Trip"}
            </DialogTitle>
            <DialogDescription>
              {isEdit
                ? "Modify the details of your trip below."
                : "Follow the steps to configure all details for the new trip."}
            </DialogDescription>
          </DialogHeader>

          {/* Progress Steps */}
          <div className="flex items-center gap-2 mt-6">
            {STEPS.map((s, i) => (
              <React.Fragment key={s}>
                <div
                  className={`flex flex-col items-center gap-1.5 ${i <= step ? "text-[#781216]" : "text-gray-400"}`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-colors duration-300 ${i <= step ? "border-[#781216] bg-[#781216] text-white" : "border-gray-300 bg-white text-gray-500"}`}
                  >
                    {i + 1}
                  </div>
                  <span className="text-[10px] sm:text-xs font-medium text-center leading-tight">
                    {s}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={`flex-1 h-[2px] -mt-5 ${i < step ? "bg-[#781216]" : "bg-gray-200"}`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
          <form
            id="trip-form"
            onSubmit={form.handleSubmit(onSubmit as any)}
            onKeyDown={handleKeyDown}
            className="space-y-6"
          >
            {/* STEP 0: BASICS */}
            <div className={step === 0 ? "block" : "hidden"}>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label>Trip Title <span className="text-red-500">*</span></Label>
                  <Input
                    {...form.register("title")}
                    placeholder="e.g. Kedarkantha Winter Trek"
                  />
                  {form.formState.errors.title && (
                    <p className="text-sm text-red-500">
                      {form.formState.errors.title.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Location <span className="text-red-500">*</span></Label>
                  <Input
                    {...form.register("location")}
                    placeholder="e.g. Uttarakhand, India"
                  />
                  {form.formState.errors.location && (
                    <p className="text-sm text-red-500">
                      {form.formState.errors.location.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Trip Type <span className="text-red-500">*</span></Label>
                  <select
                    {...form.register("tripType")}
                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    {TRIP_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {formatTripType(t)}
                      </option>
                    ))}
                  </select>
                  {form.formState.errors.tripType && (
                    <p className="text-sm text-red-500">
                      {form.formState.errors.tripType.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Best Time to Visit <span className="text-red-500">*</span></Label>
                  <Input
                    {...form.register("bestTimeToVisit")}
                    placeholder="e.g. Dec to March"
                  />
                  {form.formState.errors.bestTimeToVisit && (
                    <p className="text-sm text-red-500">
                      {form.formState.errors.bestTimeToVisit.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Price (₹) <span className="text-red-500">*</span></Label>
                  <Input type="number" {...form.register("price")} />
                  {form.formState.errors.price && (
                    <p className="text-sm text-red-500">
                      {form.formState.errors.price.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Booking Amount (₹) <span className="text-red-500">*</span></Label>
                  <Input type="number" {...form.register("tokenAmount")} />
                  {form.formState.errors.tokenAmount && (
                    <p className="text-sm text-red-500">
                      {form.formState.errors.tokenAmount.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2 col-span-2">
                </div>

                {/* Packages Section */}
                <div className="col-span-2 space-y-4 border p-4 rounded-md mt-4">
                  <div>
                    <h3 className="font-semibold">Packages (Optional)</h3>
                  </div>
                  <p className="text-sm text-gray-500 mb-2">
                    If added, users will choose a package during booking. Otherwise, the Base Price is used.
                  </p>
                  {packageFields.map((field, index) => (
                    <div key={field.id} className="flex gap-4 items-start relative p-3 border rounded-md">
                      <div className="flex-1 space-y-2">
                        <Label>Title</Label>
                        <Input
                          placeholder="e.g. VIP Package"
                          {...form.register(`packages.${index}.title` as const)}
                        />
                        {form.formState.errors.packages?.[index]?.title && (
                          <p className="text-sm text-red-500">
                            {form.formState.errors.packages[index]?.title?.message}
                          </p>
                        )}
                      </div>
                      <div className="flex-1 space-y-2">
                        <Label>Price (₹) <span className="text-red-500">*</span></Label>
                        <Input
                          type="number"
                          {...form.register(`packages.${index}.price` as const)}
                        />
                        {form.formState.errors.packages?.[index]?.price && (
                          <p className="text-sm text-red-500">
                            {form.formState.errors.packages[index]?.price?.message}
                          </p>
                        )}
                      </div>
                      <div className="flex-1 space-y-2">
                        <Label>Booking Amount (₹) <span className="text-red-500">*</span></Label>
                        <Input
                          type="number"
                          {...form.register(`packages.${index}.tokenAmount` as const)}
                        />
                        {form.formState.errors.packages?.[index]?.tokenAmount && (
                          <p className="text-sm text-red-500">
                            {form.formState.errors.packages[index]?.tokenAmount?.message}
                          </p>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        className="text-red-500 mt-7"
                        onClick={() => removePackage(index)}
                      >
                        <Trash className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                <div className="space-y-2 col-span-2 flex flex-col sm:flex-row sm:items-center gap-4 mt-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isPublished"
                      {...form.register("isPublished")}
                      className="w-4 h-4 text-[#c8a96e] rounded border-gray-300 focus:ring-[#c8a96e]"
                    />
                    <Label htmlFor="isPublished" className="mb-0 cursor-pointer">
                      Publish this trip (visible to public)
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isFeatured"
                      {...form.register("isFeatured")}
                      className="w-4 h-4 text-[#c8a96e] rounded border-gray-300 focus:ring-[#c8a96e]"
                    />
                    <Label htmlFor="isFeatured" className="mb-0 cursor-pointer">
                      Feature this trip (highlight on homepage)
                    </Label>
                  </div>
                </div>
              </div>
            </div>

          {/* STEP 1: LOGISTICS (SLOTS & ALTITUDE) */}
            <div className={step === 1 ? "block" : "hidden"}>
              <div className="space-y-6">
                <div>
                  <div className="mb-2">
                    <Label>Slots (Dates & Capacity) <span className="text-red-500">*</span></Label>
                  </div>
                  {form.formState.errors.slots?.root && (
                    <p className="text-sm text-red-500 mb-2">
                      {form.formState.errors.slots.root.message}
                    </p>
                  )}
                  <div className="space-y-4">
                    {slotFields.map((field, index) => (
                      <div key={field.id} className="flex items-start gap-4 p-4 border rounded-md relative group">
                        <div className="flex-1 space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Start Date <span className="text-red-500">*</span></Label>
                              <Input
                                type="datetime-local"
                                {...form.register(`slots.${index}.startDate`)}
                              />
                              {form.formState.errors.slots?.[index]?.startDate && (
                                <p className="text-sm text-red-500">
                                  {form.formState.errors.slots[index]?.startDate?.message}
                                </p>
                              )}
                            </div>
                            <div className="space-y-2">
                              <Label>End Date <span className="text-red-500">*</span></Label>
                              <Input
                                type="datetime-local"
                                {...form.register(`slots.${index}.endDate`)}
                              />
                              {form.formState.errors.slots?.[index]?.endDate && (
                                <p className="text-sm text-red-500">
                                  {form.formState.errors.slots[index]?.endDate?.message}
                                </p>
                              )}
                            </div>
                            <div className="space-y-2 col-span-2">
                              <Label>Capacity for this Slot <span className="text-red-500">*</span></Label>
                              <Input
                                type="number"
                                {...form.register(`slots.${index}.capacity`)}
                              />
                              {form.formState.errors.slots?.[index]?.capacity && (
                                <p className="text-sm text-red-500">
                                  {form.formState.errors.slots[index]?.capacity?.message}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity absolute top-2 right-2"
                          onClick={() => removeSlot(index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                </div>
            </div>

            {/* STEP 2: CONTENT */}
            <div className={step === 2 ? "block" : "hidden"}>
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label>Overview <span className="text-red-500">*</span></Label>
                  <Textarea
                    {...form.register("overview")}
                    rows={4}
                    placeholder="Describe the trip..."
                    className="resize-none"
                  />
                  {form.formState.errors.overview && (
                    <p className="text-sm text-red-500">
                      {form.formState.errors.overview.message}
                    </p>
                  )}
                </div>

                {/* HIGHLIGHTS */}
                <div className="space-y-4 pt-2">
                  <div>
                    <Label className="text-base font-semibold">
                      Highlights
                    </Label>
                  </div>
                  {highlightItems.length === 0 ? (
                    <div className="py-6 text-center border-2 border-dashed border-gray-200 rounded-lg bg-gray-50 text-gray-500">
                      No highlights added. Click 'Add Highlight' to start.
                    </div>
                  ) : (
                    highlightItems.map((item, index) => (
                      <div
                        key={item.id}
                        className="p-4 border rounded-lg bg-white shadow-sm flex items-start gap-4 group"
                      >
                        <div className="w-24 h-24 shrink-0 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 flex flex-col items-center justify-center relative overflow-hidden">
                          {item.preview ? (
                            <img
                              src={item.preview}
                              alt="preview"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <ImageIcon className="w-8 h-8 text-gray-300" />
                          )}
                          <input
                            type="file"
                            accept="image/*"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            onChange={(e) => handleHighlightImageChange(index, e)}
                          />
                        </div>
                        <div className="flex-1 space-y-2">
                          <Label className="text-xs text-gray-500 uppercase font-semibold">
                            Highlight Description
                          </Label>
                          <Input
                            value={item.text}
                            onChange={(e) =>
                              updateHighlightItemText(index, e.target.value)
                            }
                            placeholder="e.g. Visit to highest peak"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeHighlightItem(index)}
                          className="text-red-500 hover:bg-red-50 mt-6 shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))
                  )}
                  <Button
                    type="button"
                    onClick={addHighlightItem}
                    className="bg-gray-900 hover:bg-gray-800 text-white flex items-center gap-2 mt-2 w-fit"
                    size="sm"
                  >
                    <Plus className="w-4 h-4 mr-1" /> Add Highlight
                  </Button>
                </div>

                {/* INCLUSIONS */}
                <div className="space-y-3 p-4 border rounded-lg bg-green-50/30 border-green-100">
                  <div>
                    <Label className="text-base font-semibold text-green-800">
                      Inclusions <span className="text-red-500">*</span>
                    </Label>
                  </div>
                  {inclusionFields.map((field, index) => (
                    <div key={field.id} className="flex items-center gap-2">
                      <Input
                        {...form.register(`inclusions.${index}.value`)}
                        placeholder={`Inclusion ${index + 1}`}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeInclusion(index)}
                        className="text-red-500 hover:bg-red-50 shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2 w-fit"
                    onClick={() => addInclusion({ value: "" })}
                  >
                    <Plus className="w-4 h-4 mr-1" /> Add
                  </Button>
                  {form.formState.errors.inclusions && (
                    <p className="text-sm text-red-500">
                      {form.formState.errors.inclusions.root?.message ||
                        form.formState.errors.inclusions.message}
                    </p>
                  )}
                </div>

                {/* EXCLUSIONS */}
                <div className="space-y-3 p-4 border rounded-lg bg-red-50/30 border-red-100">
                  <div>
                    <Label className="text-base font-semibold text-red-800">
                      Exclusions <span className="text-red-500">*</span>
                    </Label>
                  </div>
                  {exclusionFields.map((field, index) => (
                    <div key={field.id} className="flex items-center gap-2">
                      <Input
                        {...form.register(`exclusions.${index}.value`)}
                        placeholder={`Exclusion ${index + 1}`}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeExclusion(index)}
                        className="text-red-500 hover:bg-red-50 shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2 w-fit"
                    onClick={() => addExclusion({ value: "" })}
                  >
                    <Plus className="w-4 h-4 mr-1" /> Add
                  </Button>
                  {form.formState.errors.exclusions && (
                    <p className="text-sm text-red-500">
                      {form.formState.errors.exclusions.root?.message ||
                        form.formState.errors.exclusions.message}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* STEP 3: FAQs */}
            <div className={step === 3 ? "block" : "hidden"}>
              <div className="space-y-4">
                <div className="border-b pb-3">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Frequently Asked Questions
                    </h3>
                    <p className="text-sm text-gray-500">
                      Add common questions and answers for this trip.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {faqFields.length === 0 ? (
                    <div className="py-8 text-center border-2 border-dashed border-gray-200 rounded-lg bg-gray-50 text-gray-500">
                      No FAQs added yet. Click 'Add FAQ' to start.
                    </div>
                  ) : (
                    faqFields.map((field, index) => (
                      <div
                        key={field.id}
                        className="p-4 border rounded-lg bg-white shadow-sm flex flex-col gap-3 group relative"
                      >
                        <div className="flex justify-between items-center">
                          <Label className="text-xs text-gray-500 uppercase tracking-wider font-semibold">
                            Question {index + 1}
                          </Label>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                index > 0 && moveFaq(index, index - 1)
                              }
                              className="h-7 w-7 text-gray-400 hover:text-gray-800"
                              disabled={index === 0}
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                index < faqFields.length - 1 &&
                                moveFaq(index, index + 1)
                              }
                              className="h-7 w-7 text-gray-400 hover:text-gray-800"
                              disabled={index === faqFields.length - 1}
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </Button>
                            <div className="w-px h-4 bg-gray-200 mx-1" />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeFaq(index)}
                              className="h-7 w-7 text-red-500 hover:bg-red-50"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                        <div>
                          <Input
                            {...form.register(`faqs.${index}.question`)}
                            placeholder="e.g. What is the fitness level required?"
                            className="font-medium"
                          />
                          {form.formState.errors.faqs?.[index]?.question && (
                            <p className="text-xs text-red-500 mt-1">
                              {
                                form.formState.errors.faqs[index].question
                                  .message
                              }
                            </p>
                          )}
                        </div>
                        <div>
                          <Textarea
                            {...form.register(`faqs.${index}.answer`)}
                            placeholder="Provide a detailed answer..."
                            rows={2}
                            className="resize-none"
                          />
                          {form.formState.errors.faqs?.[index]?.answer && (
                            <p className="text-xs text-red-500 mt-1">
                              {form.formState.errors.faqs[index].answer.message}
                            </p>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                  <Button
                    type="button"
                    onClick={() => addFaq({ question: "", answer: "" })}
                    className="bg-gray-900 hover:bg-gray-800 text-white flex items-center gap-2 mt-2 w-fit"
                  >
                    <Plus className="w-4 h-4" /> Add FAQ
                  </Button>
                </div>

                {/* TRIP TAGS */}
                <div className="space-y-3 p-4 mt-6 border rounded-lg bg-blue-50/30 border-blue-100">
                  <div>
                    <Label className="text-base font-semibold text-blue-800">
                      Trip Tags
                    </Label>
                  </div>
                  <p className="text-xs text-gray-500">
                    Add tags to categorize this trip (e.g. Adventure, Couples,
                    Snow)
                  </p>
                  <div className="space-y-3">
                    {tripTagFields.map((field, index) => (
                      <div key={field.id} className="flex items-center gap-2">
                        <Input
                          {...form.register(`tripTags.${index}.value`)}
                          placeholder={`Tag ${index + 1}`}
                          className="bg-white"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeTripTag(index)}
                          className="text-red-500 hover:bg-red-50 shrink-0 border border-red-100 bg-white"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-2 w-fit"
                      onClick={() => addTripTag({ value: "" })}
                    >
                      <Plus className="w-4 h-4 mr-1" /> Add Tag
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* STEP 4: ITINERARY */}
            <div className={step === 4 ? "block" : "hidden"}>
              <ItineraryStep control={form.control} register={form.register} errors={form.formState.errors} />
            </div>

            {/* STEP 5: STAY & TRANSPORT */}
            <div className={step === 5 ? "block" : "hidden"}>
              <div className="space-y-4">
                <div className="border-b pb-3">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Stay & Transport Options
                    </h3>
                    <p className="text-sm text-gray-500">
                      Add images and descriptions for accommodation and
                      transport.
                    </p>
                  </div>
                </div>

                <div className="space-y-4 pt-2">
                  {stayItems.length === 0 ? (
                    <div className="py-8 text-center border-2 border-dashed border-gray-200 rounded-lg bg-gray-50 text-gray-500">
                      No Stay & Transport items added. Click 'Add Item' to
                      start.
                    </div>
                  ) : (
                    stayItems.map((item, index) => (
                      <div
                        key={item.id}
                        className="p-4 border rounded-lg bg-white shadow-sm flex items-start gap-4 group"
                      >
                        <div className="w-24 h-24 shrink-0 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 flex flex-col items-center justify-center relative overflow-hidden">
                          {item.preview ? (
                            <img
                              src={item.preview}
                              alt="preview"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <ImageIcon className="w-8 h-8 text-gray-300" />
                          )}
                          <input
                            type="file"
                            accept="image/*"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            onChange={(e) => handleStayImageChange(index, e)}
                          />
                        </div>
                        <div className="flex-1 space-y-2">
                          <Label className="text-xs text-gray-500 uppercase font-semibold">
                            Description
                          </Label>
                          <Input
                            value={item.text}
                            onChange={(e) =>
                              updateStayItemText(index, e.target.value)
                            }
                            placeholder="e.g. Volvo Semi-Sleeper Bus / Luxury Tents"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeStayItem(index)}
                          className="text-red-500 hover:bg-red-50 mt-6 shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))
                  )}
                  <Button
                    type="button"
                    onClick={addStayItem}
                    className="bg-[#781216] hover:bg-[#5a0d10] text-white flex items-center gap-2 mt-2 w-fit"
                  >
                    <Plus className="w-4 h-4" /> Add Item
                  </Button>
                </div>
              </div>
            </div>

            {/* STEP 6: MEDIA (BANNER IMAGES) */}
            <div className={step === 6 ? "block" : "hidden"}>
              <div className="space-y-4">
                {isEdit && trip?.bannerImages?.length > 0 && (
                  <div className="mb-6">
                    <h4 className="font-medium mb-3 text-sm text-gray-500">
                      Current Banner Images
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {trip.bannerImages.map((url: string, i: number) => (
                        <div
                          key={url}
                          className="relative group rounded-lg overflow-hidden border border-gray-200 aspect-video bg-gray-100"
                        >
                          <img
                            src={url}
                            alt={`Existing ${i}`}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button
                              type="button"
                              onClick={() => deleteExistingImage(url)}
                              className="w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg"
                              title="Delete Image"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="p-8 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 flex flex-col items-center justify-center text-center">
                  <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm border border-gray-100 mb-4">
                    <UploadCloud className="w-8 h-8 text-[#c8a96e]" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {isEdit
                      ? "Upload Additional Images"
                      : "Upload Banner Images"}
                  </h3>
                  <p className="text-sm text-gray-500 mb-6 max-w-sm">
                    High-quality images that will be shown at the top of the
                    trip page. Recommended size: 1920x1080.
                  </p>
                  <Label
                    htmlFor="image-upload"
                    className="cursor-pointer bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-6 py-2.5 rounded-lg font-medium transition-colors shadow-sm inline-flex items-center gap-2"
                  >
                    <ImageIcon className="w-4 h-4" />
                    Select Images
                    <input
                      id="image-upload"
                      type="file"
                      multiple
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageChange}
                    />
                  </Label>
                </div>

                {/* Previews */}
                {imagePreviews.length > 0 && (
                  <div className="mt-6">
                    <h4 className="font-medium mb-3 text-sm text-gray-500">
                      New Selected Banners ({imagePreviews.length})
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {imagePreviews.map((url, i) => (
                        <div
                          key={url}
                          className="relative group rounded-lg overflow-hidden border border-gray-200 aspect-video bg-gray-100"
                        >
                          <img
                            src={url}
                            alt={`Preview ${i}`}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button
                              type="button"
                              onClick={() => removeImage(i)}
                              className="w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}


              </div>
            </div>
          </form>
        </div>

        {/* Footer Navigation */}
        <div className="px-6 py-4 border-t bg-gray-50 flex flex-row items-center justify-between shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={prevStep}
            disabled={step === 0 || isSubmitting}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>

          {step < STEPS.length - 1 ? (
            <Button
              key="continue-btn"
              type="button"
              onClick={nextStep}
              className="bg-[#c8a96e] hover:bg-[#b8943a] text-white flex items-center gap-2"
            >
              Continue <ArrowRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              key="submit-btn"
              type="submit"
              form="trip-form"
              disabled={isSubmitting}
              className="bg-[#781216] hover:bg-[#9a1a1f] text-white flex items-center gap-2 px-8 shadow-md"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <UploadCloud className="w-4 h-4" />
              )}
              {isSubmitting
                ? "Saving..."
                : isEdit
                  ? "Save Changes"
                  : "Save Trip"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

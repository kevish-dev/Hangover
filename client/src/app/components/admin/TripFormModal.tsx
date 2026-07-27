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
  ClipboardList,
} from "lucide-react";
import { apiClient } from "../../../lib/axios";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { ItineraryStep } from "./ItineraryStep";
import { formatTripType } from "../../../lib/tripApi";
import { uploadBannerImagesDirect } from "../../../lib/directImageUpload";
import { showErrorToast } from "../../../lib/errors";

// --- VALIDATION SCHEMA ---
const tripSchema = z.object({
  circuitId: z.string().uuid().optional(),
  destinationId: z.string().uuid().optional(),
  title: z.string().min(3, "Title must be at least 3 characters"),
  location: z.string().min(2, "Location is required"),
  tripType: z.string().min(1, "Trip type is required"),
  bestTimeToVisit: z.string().min(1, "Best time is required"),
  slots: z.array(
    z.object({
      id: z.string().optional(),
      startDate: z.string().min(1, "Start date is required"),
      endDate: z.string().min(1, "End date is required"),
      title: z.string().optional(),
      priority: z.coerce.number().optional(),
      capacity: z.coerce.number().min(1, "Capacity must be at least 1"),
    })
  ).min(1, "At least one slot is required").superRefine((slots, context) => {
    slots.forEach((slot, index) => {
      if (slot.startDate && slot.endDate && new Date(slot.endDate) <= new Date(slot.startDate)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "End date must be after the start date",
          path: [index, "endDate"],
        });
      }
    });
  }),

  overview: z.string().optional(),
  inclusions: z.array(z.object({ value: z.string().optional() })).optional(),
  exclusions: z.array(z.object({ value: z.string().optional() })).optional(),
  tripTags: z.array(z.object({ value: z.string().optional() })).optional(),
  faqs: z
    .array(
      z.object({
        question: z.string().optional(),
        answer: z.string().optional(),
      }),
    )
    .optional(),
  packages: z.array(
    z.object({
      id: z.string().uuid().optional(),
      title: z.string().min(1, "Package name is required"),
      price: z.coerce.number().min(1, "Price must be greater than 0"),
      tokenAmount: z.coerce.number().min(0, "Booking amount must be 0 or more"),
    }).refine((value) => value.tokenAmount <= value.price, {
      message: "Booking amount cannot exceed the package price",
      path: ["tokenAmount"],
    })
  ).min(1, "At least one pricing package is required"),
  isPublished: z.boolean().default(false),
  isFeatured: z.boolean().default(false),
  isActive: z.boolean().default(true),
  isListed: z.boolean().default(true),
    itinerary: z.array(
      z.object({
        day: z.string().min(1, "Day is required"),
        title: z.string().min(1, "Title is required"),
        description: z.string().optional(),
        todos: z.preprocess((val) => typeof val === 'string' ? val.split('\n').filter(Boolean) : val, z.array(z.string())).optional(),
        tasks: z.array(
          z.object({
            id: z.string().uuid().optional(),
            category: z.string().min(1),
            title: z.string().min(1, "Task title is required"),
            description: z.string().optional(),
            unitPrice: z.coerce.number().positive().optional(),
            quantityNeeded: z.coerce.number().int().nonnegative().optional(),
            dueOffsetDays: z.coerce.number().int().nonnegative().optional(),
          })
        ).optional().default([]),
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

const TASK_CATEGORIES = [
  "HOTEL",
  "TRANSPORT",
  "PERMIT",
  "VENDOR",
  "ACTIVITY",
  "DOCUMENTATION",
  "PAYMENT_COLLECTION",
  "GENERAL",
];

const STEPS = [
  "Basics",
  "Logistics",
  "Content",
  "FAQs & Tags",
  "Itinerary",
  "Operations",
  "Stay & Transport",
  "Media",
];

interface TripFormModalProps {
  trip?: any;
  sourceCircuit?: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TripFormModal({
  trip,
  sourceCircuit,
  open,
  onOpenChange,
}: TripFormModalProps) {
  const [step, setStep] = useState(0);
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [localBannerImages, setLocalBannerImages] = useState<string[]>([]);

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
  const [canSubmit, setCanSubmit] = useState(false);
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
      circuitId: undefined,
      destinationId: undefined,
      title: "",
      location: "",
      tripType: "MOUNTAIN_TREK",
      bestTimeToVisit: "",
      slots: [{ startDate: "", endDate: "", capacity: 12 }],
      overview: "",
      inclusions: [],
      exclusions: [],
      tripTags: [],
      packages: [{ title: "Standard", price: 0, tokenAmount: 0 }],
      faqs: [],
      isPublished: false,
      isFeatured: false,
      isActive: true,
      isListed: true,
    },
    mode: "onTouched",
  });

  // Reset form when trip prop changes or modal opens
  useEffect(() => {
    if (open) {
      if (trip) {
        form.reset({
          title: trip.title || "",
          circuitId: trip.circuitId || undefined,
          destinationId: trip.destinationId || undefined,
          location: trip.location || "",
          tripType: trip.tripType || "MOUNTAIN_TREK",
          bestTimeToVisit: trip.bestTimeToVisit || "",
          slots: trip.slots && trip.slots.length > 0 ? trip.slots.map((s: any) => ({
            id: s.id,
            startDate: formatDateForInput(s.startDate),
            endDate: formatDateForInput(s.endDate),
            title: s.title || "",
            priority: s.priority || 0,
            capacity: s.capacity
          })) : [{ startDate: "", endDate: "", capacity: 12, title: "", priority: 0 }],
          overview: trip.overview || "",
          inclusions: Array.isArray(trip.inclusions) && trip.inclusions.length > 0
            ? trip.inclusions.map((i: any) => ({ value: typeof i === 'string' ? i : (i.value || "") }))
            : typeof trip.inclusions === 'string' && trip.inclusions.trim().startsWith('[')
              ? JSON.parse(trip.inclusions).map((i: any) => ({ value: typeof i === 'string' ? i : (i.value || "") }))
              : [{ value: "" }],
          exclusions: Array.isArray(trip.exclusions) && trip.exclusions.length > 0
            ? trip.exclusions.map((e: any) => ({ value: typeof e === 'string' ? e : (e.value || "") }))
            : typeof trip.exclusions === 'string' && trip.exclusions.trim().startsWith('[')
              ? JSON.parse(trip.exclusions).map((e: any) => ({ value: typeof e === 'string' ? e : (e.value || "") }))
              : [{ value: "" }],
          tripTags: [],
          faqs: trip.faqs?.length
            ? trip.faqs.map((f: any) => ({
                question: f.question,
                answer: f.answer,
              }))
            : [],
          packages: trip.packages?.length
            ? trip.packages.map((p: any) => ({
                id: p.id,
                title: p.title,
                price: Number(p.price),
                tokenAmount: Number(p.tokenAmount),
              }))
            : [{ title: "Standard", price: 0, tokenAmount: 0 }],
          itinerary: Array.isArray(trip.itinerary) ? trip.itinerary.map((day: any) => ({
            day: day.day || `Day ${day.dayNumber}`,
            title: day.title || "",
            description: day.description || "",
            todos: Array.isArray(day.todos) ? day.todos : [],
          })) : [],
          isPublished: trip.isPublished || false,
          isFeatured: trip.isFeatured || false,
          isActive: trip.isActive ?? true,
          isListed: trip.isListed ?? true,
        });
        // Keep the field-array source of truth in sync with the values shown
        // after editing an existing trip. This prevents validation from reading
        // a stale array while the inputs appear populated.
        replaceSlots(form.getValues("slots"));
        replaceInclusions(form.getValues("inclusions"));
        replaceExclusions(form.getValues("exclusions"));
        replaceTripTags(form.getValues("tripTags"));
        replacePackages(form.getValues("packages"));
        replaceFaqs(form.getValues("faqs"));
        form.clearErrors();

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

        let parsedBanners = trip.bannerImages || [];
        if (typeof parsedBanners === "string") {
          try { parsedBanners = JSON.parse(parsedBanners); } catch(e) { parsedBanners = []; }
        }
        setLocalBannerImages(Array.isArray(parsedBanners) ? parsedBanners : []);

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
      } else if (sourceCircuit) {
        form.reset({
          circuitId: sourceCircuit.id,
          destinationId: sourceCircuit.destinationId || undefined,
          title: sourceCircuit.title || "",
          location: sourceCircuit.location || "",
          tripType: sourceCircuit.tripType || "MOUNTAIN_TREK",
          bestTimeToVisit: sourceCircuit.bestTimeToVisit || "",
          slots: [{ startDate: "", endDate: "", capacity: 12, title: "", priority: 0 }],
          overview: sourceCircuit.overview || "",
          inclusions: (sourceCircuit.inclusions || []).map((value: string) => ({ value })),
          exclusions: (sourceCircuit.exclusions || []).map((value: string) => ({ value })),
          tripTags: (sourceCircuit.tags || []).map((tag: any) => ({ value: tag.tag })),
          packages: (sourceCircuit.packages || []).map((item: any) => ({
            title: item.title,
            price: Number(item.price),
            tokenAmount: Number(item.tokenAmount),
          })),
          faqs: (sourceCircuit.faqs || []).map((item: any) => ({ question: item.question, answer: item.answer })),
          itinerary: (sourceCircuit.days || []).map((day: any) => ({
            day: `Day ${day.dayNumber}`,
            title: day.title,
            description: day.description || "",
            todos: Array.isArray(day.todos) ? day.todos : [],
          })),
          isPublished: false,
          isFeatured: false,
          isActive: true,
          isListed: true,
        });
        replaceSlots(form.getValues("slots"));
        replaceInclusions(form.getValues("inclusions"));
        replaceExclusions(form.getValues("exclusions"));
        replaceTripTags(form.getValues("tripTags"));
        replacePackages(form.getValues("packages"));
        replaceFaqs(form.getValues("faqs"));
        setHighlightItems((Array.isArray(sourceCircuit.highlights) ? sourceCircuit.highlights : []).map((item: any) => ({
          id: Math.random().toString(),
          text: item.text || "",
          type: "EXISTING" as const,
          url: item.imageUrl,
          preview: item.imageUrl,
        })));
        setStayItems((Array.isArray(sourceCircuit.stayTransportImages) ? sourceCircuit.stayTransportImages : []).map((item: any) => ({
          id: Math.random().toString(),
          text: item.text || "",
          type: "EXISTING" as const,
          url: item.imageUrl,
          preview: item.imageUrl,
        })));

        let parsedBanners = sourceCircuit.bannerImages || [];
        if (typeof parsedBanners === "string") {
          try { parsedBanners = JSON.parse(parsedBanners); } catch(e) { parsedBanners = []; }
        }
        setLocalBannerImages(Array.isArray(parsedBanners) ? parsedBanners : []);
        
        form.clearErrors();
      } else {
        form.reset({
          circuitId: undefined,
          destinationId: undefined,
          title: "",
          location: "",
          tripType: "MOUNTAIN_TREK",
          bestTimeToVisit: "",
          slots: [{ startDate: "", endDate: "", capacity: 12 }],
          overview: "",
          inclusions: [],
          exclusions: [],
          tripTags: [],
          packages: [{ title: "Standard", price: 0, tokenAmount: 0 }],
          faqs: [],
          itinerary: [],
          isPublished: false,
          isFeatured: false,
          isActive: true,
          isListed: true,
        });
        replaceSlots(form.getValues("slots"));
        replaceInclusions(form.getValues("inclusions"));
        replaceExclusions(form.getValues("exclusions"));
        replaceTripTags([]);
        replacePackages([{ title: "Standard", price: 0, tokenAmount: 0 }]);
        replaceFaqs([]);
        form.clearErrors();
        setStayItems([]);
        setHighlightItems([]);
        setLocalBannerImages([]);
      }
      setStep(0);
      setImages([]);
      setImagePreviews([]);
    }
  }, [trip, sourceCircuit, open, form]);

  const {
    fields: inclusionFields,
    append: addInclusion,
    remove: removeInclusion,
    replace: replaceInclusions,
  } = useFieldArray({
    control: form.control,
    name: "inclusions",
  });
  const {
    fields: exclusionFields,
    append: addExclusion,
    remove: removeExclusion,
    replace: replaceExclusions,
  } = useFieldArray({
    control: form.control,
    name: "exclusions",
  });
  const {
    fields: tripTagFields,
    append: addTripTag,
    remove: removeTripTag,
    replace: replaceTripTags,
  } = useFieldArray({
    control: form.control,
    name: "tripTags",
  });
  const {
    fields: packageFields,
    append: appendPackage,
    remove: removePackage,
    replace: replacePackages,
  } = useFieldArray({
    name: "packages",
    control: form.control,
  });
  const {
    fields: slotFields,
    append: appendSlot,
    remove: removeSlot,
    replace: replaceSlots,
  } = useFieldArray({
    name: "slots",
    control: form.control,
  });
  const {
    fields: faqFields,
    append: addFaq,
    remove: removeFaq,
    move: moveFaq,
    replace: replaceFaqs,
  } = useFieldArray({
    control: form.control,
    name: "faqs",
  });
  
  const { fields: itineraryFields } = useFieldArray({
    control: form.control,
    name: "itinerary",
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
    if (!trip?.id) {
      setLocalBannerImages(prev => prev.filter(img => img !== url));
      return;
    }
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
      setLocalBannerImages(prev => prev.filter(img => img !== url));
      queryClient.invalidateQueries({ queryKey: ["admin", "trips"] });
    } catch (error: unknown) {
      showErrorToast(error, "Failed to delete image");
    }
  };



  // Human-readable labels for trip form fields
  const FIELD_LABELS: Record<string, string> = {
    title: "Trip Title",
    location: "Location",
    tripType: "Trip Type",
    bestTimeToVisit: "Best Time to Visit",
    packages: "Pricing Packages",
    slots: "Trip Slots",
    overview: "Overview",
    inclusions: "Inclusions",
    exclusions: "Exclusions",
    faqs: "FAQs",
    tripTags: "Tags",
    itinerary: "Itinerary",
  };

  const getStepErrors = (errors: any, fieldsToValidate: string[]): string[] => {
    const missing: string[] = [];
    for (const field of fieldsToValidate) {
      const err = errors[field];
      if (!err) continue;
      const label = FIELD_LABELS[field] || field;
      // Arrays (slots, inclusions, exclusions, etc.) can have a root message
      if (err.message) {
        missing.push(`${label}: ${err.message}`);
      } else if (err.root?.message) {
        missing.push(`${label}: ${err.root.message}`);
      } else if (Array.isArray(err)) {
        // Individual array-item errors — just flag the section
        missing.push(label);
      } else if (typeof err === "object") {
        missing.push(label);
      }
    }
    return missing;
  };

  const validateStep = async () => {
    let fieldsToValidate: (keyof TripFormValues)[] = [];
    if (step === 0)
      fieldsToValidate = [
        "title",
        "location",
        "tripType",
        "bestTimeToVisit",
        "packages",
      ];
    else if (step === 1) {
      fieldsToValidate = ["slots"];
    } else if (step === 2) {
      fieldsToValidate = ["overview", "inclusions", "exclusions"];
    }
    if (step === 3) fieldsToValidate = ["faqs", "tripTags"];
    if (step === 4) fieldsToValidate = ["itinerary"];
    if (step === 5) fieldsToValidate = ["itinerary"]; // Operations validates the tasks inside itinerary
    if (step === 6) return true; // Stay & Transport has local state, basic validation can be skipped or added if needed

    let fieldsToTrigger: any = fieldsToValidate;
    if (step === 4) {
      const itineraryCount = form.getValues("itinerary")?.length || 0;
      fieldsToTrigger = [];
      for (let i = 0; i < itineraryCount; i++) {
        fieldsToTrigger.push(`itinerary.${i}.day`);
        fieldsToTrigger.push(`itinerary.${i}.title`);
        fieldsToTrigger.push(`itinerary.${i}.description`);
        fieldsToTrigger.push(`itinerary.${i}.todos`);
      }
    }

    const isValid = await form.trigger(fieldsToTrigger);

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

    if (step === 6) {
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
    let fieldsToValidate: (keyof TripFormValues)[] = [];
    if (step === 0)
      fieldsToValidate = ["title", "location", "tripType", "bestTimeToVisit", "packages"];
    else if (step === 1) fieldsToValidate = ["slots"];
    else if (step === 2) fieldsToValidate = ["overview", "inclusions", "exclusions"];
    else if (step === 3) fieldsToValidate = ["faqs", "tripTags"];
    else if (step === 4) fieldsToValidate = ["itinerary"];
    else if (step === 5) fieldsToValidate = ["itinerary"]; // Operations validates the tasks inside itinerary

    if (await validateStep()) {
      setStep((s) => {
        const next = Math.min(STEPS.length - 1, s + 1);
        if (next === STEPS.length - 1) {
          setCanSubmit(false);
          setTimeout(() => setCanSubmit(true), 500);
        }
        return next;
      });
    } else {
      const errors = fieldsToValidate.reduce<Record<string, unknown>>(
        (stepErrors, field) => {
          const error = form.getFieldState(field).error;
          if (error) stepErrors[field] = error;
          return stepErrors;
        },
        {},
      );
      const missing = getStepErrors(errors, fieldsToValidate);
      if (missing.length > 0) {
        toast.error(
          <div>
            <p className="font-semibold mb-1">Please fix the following before continuing:</p>
            <ul className="list-disc list-inside space-y-0.5 text-sm">
              {missing.map((m, i) => <li key={i}>{m.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</li>)}
            </ul>
          </div>,
          { position: "bottom-right", duration: 5000 }
        );
      } else {
        // Fallback for highlight / stay errors already shown inside validateStep
        toast.error("Please fix all errors on this step before continuing.", { position: "bottom-right" });
      }
    }
  };
  const prevStep = () => setStep((s) => Math.max(0, s - 1));

  const onError = (errors: any) => {
    const missing = getStepErrors(errors, Object.keys(errors));
    if (missing.length > 0) {
      toast.error(
        <div>
          <p className="font-semibold mb-1">Please fix the following before submitting:</p>
          <ul className="list-disc list-inside space-y-0.5 text-sm">
            {missing.map((m, i) => <li key={i}>{m.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</li>)}
          </ul>
        </div>,
        { position: "bottom-right", duration: 5000 }
      );
    } else {
      toast.error("Please fill all required fields correctly.", { position: "bottom-right" });
    }
  };
  const onSubmit = async (data: TripFormValues) => {
    if (step !== STEPS.length - 1) return;

    setIsSubmitting(true);
    let tripId = trip?.id;
    let coreTripSaved = false;
    let createdNewTrip = false;
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
        itinerary: data.itinerary,
        faqs: data.faqs?.filter(
          (f) => f.question.trim() !== "" && f.answer.trim() !== "",
        ),
        ...(!isEdit && localBannerImages.length > 0 
            ? { bannerImages: localBannerImages } 
            : {}),
      };

      if (isEdit) {
        await apiClient.put(`/trips/${tripId}`, payload);
        coreTripSaved = true;
        toast.success("Trip updated successfully!");
      } else {
        const createRes = await apiClient.post("/trips", payload);
        tripId = createRes.data.trip.id;
        coreTripSaved = true;
        createdNewTrip = true;
        toast.success("Trip created successfully!");
      }

      // Sync Stay & Transport Images
      if (stayItems.length > 0) {
        const stayFormData = new FormData();
        const stayPayload: any[] = [];
        let fileIndex = 0;

        const stayPromises = stayItems.map(async (item) => {
          if (item.type === "NEW" && item.file) {
            return { file: item.file, item, type: "NEW" };
          }
          return { item, type: "EXISTING" };
        });

        const stayResults = await Promise.all(stayPromises);

        stayResults.forEach((result) => {
          if (result.type === "NEW" && result.file) {
            stayFormData.append("images", result.file);
            stayPayload.push({ text: result.item.text, type: "NEW", fileIndex });
            fileIndex++;
          } else if (result.type === "EXISTING") {
            stayPayload.push({
              text: result.item.text,
              type: "EXISTING",
              url: result.item.url,
            });
          }
        });
        stayFormData.append("payload", JSON.stringify(stayPayload));

        await apiClient.post(`/trips/${tripId}/stay-transport`, stayFormData, {
          headers: { "Content-Type": "multipart/form-data" }
        });
        toast.success("Stay & Transport updated!");
      } else if (isEdit) {
        const stayFormData = new FormData();
        stayFormData.append("payload", JSON.stringify([]));
        await apiClient.post(`/trips/${tripId}/stay-transport`, stayFormData, {
          headers: { "Content-Type": "multipart/form-data" }
        });
      }

      // Sync Highlights
      if (highlightItems.length > 0) {
        const highlightFormData = new FormData();
        const highlightPayload: any[] = [];
        let highlightFileIndex = 0;

        const highlightPromises = highlightItems.map(async (item) => {
          if (item.type === "NEW" && item.file) {
            return { file: item.file, item, type: "NEW" };
          }
          return { item, type: "EXISTING" };
        });

        const highlightResults = await Promise.all(highlightPromises);

        highlightResults.forEach((result) => {
          if (result.type === "NEW" && result.file) {
            highlightFormData.append("images", result.file);
            highlightPayload.push({ text: result.item.text, type: "NEW", fileIndex: highlightFileIndex });
            highlightFileIndex++;
          } else if (result.type === "EXISTING") {
            highlightPayload.push({
              text: result.item.text,
              type: "EXISTING",
              url: result.item.url,
            });
          }
        });
        highlightFormData.append("payload", JSON.stringify(highlightPayload));

        await apiClient.post(`/trips/${tripId}/highlights`, highlightFormData, {
          headers: { "Content-Type": "multipart/form-data" }
        });
        toast.success("Highlights updated!");
      } else if (isEdit) {
        const highlightFormData = new FormData();
        highlightFormData.append("payload", JSON.stringify([]));
        await apiClient.post(`/trips/${tripId}/highlights`, highlightFormData, {
          headers: { "Content-Type": "multipart/form-data" }
        });
      }

      // Sync Banners
      if (images.length > 0) {
        const uploadToast = toast.loading(`Uploading banners (0/${images.length})…`);
        await uploadBannerImagesDirect("trips", tripId, images, (completed, total) => {
          toast.loading(`Uploading banners (${completed}/${total})…`, { id: uploadToast });
        });
        toast.success("Banner images uploaded!", { id: uploadToast });
      }

      queryClient.invalidateQueries({ queryKey: ["admin", "trips"] });
      onOpenChange(false);
    } catch (error: any) {
      if (coreTripSaved) {
        await queryClient.invalidateQueries({ queryKey: ["admin", "trips"] });
        toast.warning(createdNewTrip ? "Trip created, but some media could not be uploaded" : "Trip saved, but some media could not be updated", {
          description: "The trip itself is safe. Open it from Trip Management and retry the media update.",
        });
        onOpenChange(false);
      } else {
        showErrorToast(error, isEdit ? "Could not update the trip" : "Could not create the trip");
      }
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
      <DialogContent className="!w-[calc(100%-0.75rem)] !max-h-[calc(100dvh-0.75rem)] sm:max-w-[800px] overflow-y-auto p-0 border-0 shadow-xl md:!w-full md:!max-h-[90vh] bg-white rounded-xl">
        <div className="px-4 pt-5 pb-3 sm:px-6 sm:pt-6 sm:pb-4 border-b">
          <div className="p-6 sm:p-8">
          <DialogHeader className="mb-6 border-b border-gray-100 pb-4">
            <DialogTitle className="text-xl sm:text-2xl font-bold pr-6">
              {isEdit ? "Edit Trip" : sourceCircuit ? "Create trip from circuit" : "Create New Trip"}
            </DialogTitle>
            <DialogDescription>
              {isEdit
                ? "Modify the details of your trip below."
                : sourceCircuit
                  ? `Forked from ${sourceCircuit.title}. Add departure dates and adjust anything that differs.`
                  : "Follow the steps to configure all details for the new trip."}
            </DialogDescription>
          </DialogHeader>

          {/* Progress Steps */}
          <div className="flex items-center gap-2 mt-4 sm:mt-6 overflow-x-auto pb-1">
            {STEPS.map((s, i) => (
              <React.Fragment key={s}>
                <div
                  className={`flex min-w-10 sm:min-w-0 flex-col items-center gap-1.5 ${i <= step ? "text-[#781216]" : "text-gray-400"}`}
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
                    className={`flex-1 min-w-3 sm:min-w-0 h-[2px] -mt-5 ${i < step ? "bg-[#781216]" : "bg-gray-200"}`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 scroll-smooth">
          <form
            id="trip-form"
            onSubmit={form.handleSubmit(onSubmit as any, onError)}
            onKeyDown={handleKeyDown}
            className="space-y-6"
          >
            {/* STEP 0: BASICS */}
            <div className={step === 0 ? "block" : "hidden"}>
              {sourceCircuit && !isEdit && (
                <div className="mb-4 rounded-xl border border-[#e8d9b7] bg-[#fbf7ed] p-4 text-sm text-[#6d541f]">
                  Content, pricing, itinerary, task templates, tags, and add-ons are inherited from this circuit. This trip will remain linked to the template for booking operations.
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2 space-y-2">
                  <Label className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-2 block">Trip Title <span className="text-red-500">*</span></Label>
                  <Input className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#b59410]/50 focus:border-[#b59410] transition-colors shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
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
                  <Label className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-2 block">Location <span className="text-red-500">*</span></Label>
                  <Input className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#b59410]/50 focus:border-[#b59410] transition-colors shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
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
                  <Label className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-2 block">Trip Type <span className="text-red-500">*</span></Label>
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
                  <Label className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-2 block">Best Time to Visit <span className="text-red-500">*</span></Label>
                  <Input className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#b59410]/50 focus:border-[#b59410] transition-colors shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                    {...form.register("bestTimeToVisit")}
                    placeholder="e.g. Dec to March"
                  />
                  {form.formState.errors.bestTimeToVisit && (
                    <p className="text-sm text-red-500">
                      {form.formState.errors.bestTimeToVisit.message}
                    </p>
                  )}
                </div>

                {/* Pricing Packages Section */}
                <div className="md:col-span-2 space-y-3 border-2 border-[#b59410]/30 bg-gray-50/30 p-3 sm:p-4 rounded-md">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-semibold text-gray-900">Pricing Packages <span className="text-red-500">*</span></h3>
                      <p className="text-xs text-gray-500 mt-0.5">Users choose a package when booking. At least one package is required.</p>
                    </div>
                  </div>
                  {form.formState.errors.packages?.root?.message && (
                    <p className="text-xs font-semibold text-red-600 mt-1.5 flex items-center gap-1.5 bg-red-50 p-2 rounded-md border border-red-100">⚠️ {}</p>
                  )}
                  {packageFields.map((field, index) => (
                    <div key={field.id} className="flex flex-col md:flex-row gap-3 md:gap-4 items-stretch md:items-start relative p-3 border rounded-md">
                      <div className="flex-1 space-y-2">
                        <Label className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-2 block">Title</Label>
                        <Input className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#b59410]/50 focus:border-[#b59410] transition-colors shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
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
                        <Label className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-2 block">Price (₹) <span className="text-red-500">*</span></Label>
                        <Input className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#b59410]/50 focus:border-[#b59410] transition-colors shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
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
                        <Label className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-2 block">Booking Amount (₹) <span className="text-red-500">*</span></Label>
                        <Input className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#b59410]/50 focus:border-[#b59410] transition-colors shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
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
                        className="text-red-500 self-end md:self-auto mt-0 md:mt-7"
                        onClick={() => removePackage(index)}
                        disabled={packageFields.length === 1}
                        title={packageFields.length === 1 ? "At least one package is required" : "Remove package"}
                      >
                        <Trash className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2 w-full border-dashed"
                    onClick={() => appendPackage({ title: "", price: 0, tokenAmount: 0 })}
                  >
                    <Plus className="w-4 h-4 mr-2" /> Add Package
                  </Button>
                </div>
                <div className="space-y-2 md:col-span-2 flex flex-col md:flex-row md:items-center gap-4 mt-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isPublished"
                      {...form.register("isPublished")}
                      className="w-4 h-4 text-[#b59410] rounded border-gray-300 focus:ring-[#b59410]"
                    />
                    <Label htmlFor="isPublished" className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-2 block mb-0 cursor-pointer">
                      Publish this trip (visible to public)
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isFeatured"
                      {...form.register("isFeatured")}
                      className="w-4 h-4 text-[#b59410] rounded border-gray-300 focus:ring-[#b59410]"
                    />
                    <Label htmlFor="isFeatured" className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-2 block mb-0 cursor-pointer">
                      Feature this trip (highlight on homepage)
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isListed"
                      {...form.register("isListed")}
                      className="w-4 h-4 text-[#b59410] rounded border-gray-300 focus:ring-[#b59410]"
                    />
                    <Label htmlFor="isListed" className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-2 block mb-0 cursor-pointer">
                      List in the public catalog
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isActive"
                      {...form.register("isActive")}
                      className="w-4 h-4 text-[#b59410] rounded border-gray-300 focus:ring-[#b59410]"
                    />
                    <Label htmlFor="isActive" className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-2 block mb-0 cursor-pointer">
                      Accept bookings
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
                    <Label className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-2 block">Slots (Dates & Capacity) <span className="text-red-500">*</span></Label>
                  </div>
                  {form.formState.errors.slots?.root && (
                    <p className="text-sm text-red-500 mb-2">
                      {form.formState.errors.slots.root.message}
                    </p>
                  )}
                  <div className="space-y-4">
                    {slotFields.map((field, index) => (
                      <div key={field.id} className="flex items-start gap-4 p-3 sm:p-4 pr-10 border rounded-md relative group">
                        <div className="flex-1 space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-2 block">Start Date <span className="text-red-500">*</span></Label>
                              <Input className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#b59410]/50 focus:border-[#b59410] transition-colors shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
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
                              <Label className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-2 block">End Date <span className="text-red-500">*</span></Label>
                              <Input className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#b59410]/50 focus:border-[#b59410] transition-colors shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                                type="datetime-local"
                                {...form.register(`slots.${index}.endDate`)}
                              />
                              {form.formState.errors.slots?.[index]?.endDate && (
                                <p className="text-sm text-red-500">
                                  {form.formState.errors.slots[index]?.endDate?.message}
                                </p>
                              )}
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-2 block">Title (e.g. Diwali Weekend)</Label>
                              <Input className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#b59410]/50 focus:border-[#b59410] transition-colors shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                                placeholder="Optional"
                                {...form.register(`slots.${index}.title`)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-2 block">Priority (1 is highest)</Label>
                              <Input className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#b59410]/50 focus:border-[#b59410] transition-colors shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                                type="number"
                                placeholder="0"
                                {...form.register(`slots.${index}.priority`)}
                              />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                              <Label className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-2 block">Capacity for this Slot <span className="text-red-500">*</span></Label>
                              <Input className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#b59410]/50 focus:border-[#b59410] transition-colors shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
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
                          className="text-red-500 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity absolute top-2 right-2"
                          onClick={() => removeSlot(index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => appendSlot({ startDate: "", endDate: "", capacity: 12, title: "", priority: 0 })}
                      className="mt-2"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Slot
                    </Button>
                  </div>
                </div>

                </div>
            </div>

            {/* STEP 2: CONTENT */}
            <div className={step === 2 ? "block" : "hidden"}>
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-2 block">Overview <span className="text-red-500">*</span></Label>
                  <Textarea {...form.register("overview")}
                    rows={4}
                    placeholder="Describe the trip..."
                    className="flex min-h-[80px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#b59410]/50 focus:border-[#b59410] transition-colors shadow-sm resize-y disabled:cursor-not-allowed disabled:opacity-50"
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
                    <Label className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-2 block text-base font-semibold">
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
                        className="p-3 sm:p-4 border rounded-lg bg-white shadow-sm flex flex-col md:flex-row items-stretch md:items-start gap-3 md:gap-4 group"
                      >
                        <div className="w-full h-32 md:w-24 md:h-24 shrink-0 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 flex flex-col items-center justify-center relative overflow-hidden">
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
                          <Label className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-2 block text-xs text-gray-500 uppercase font-semibold">
                            Highlight Description
                          </Label>
                          <Input className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#b59410]/50 focus:border-[#b59410] transition-colors shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
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
                          className="text-red-500 hover:bg-red-50 self-end md:self-auto mt-0 md:mt-6 shrink-0"
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
                    <Label className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-2 block text-base font-semibold text-green-800">
                      Inclusions <span className="text-red-500">*</span>
                    </Label>
                  </div>
                  {inclusionFields.map((field, index) => (
                    <div key={field.id} className="flex items-center gap-2">
                      <Input className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#b59410]/50 focus:border-[#b59410] transition-colors shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
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
                    <Label className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-2 block text-base font-semibold text-red-800">
                      Exclusions <span className="text-red-500">*</span>
                    </Label>
                  </div>
                  {exclusionFields.map((field, index) => (
                    <div key={field.id} className="flex items-center gap-2">
                      <Input className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#b59410]/50 focus:border-[#b59410] transition-colors shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
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
                          <Label className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-2 block text-xs text-gray-500 uppercase tracking-wider font-semibold">
                            Question {index + 1}
                          </Label>
                          <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
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
                          <Input {...form.register(`faqs.${index}.question`)}
                            placeholder="e.g. What is the fitness level required?"
                            className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#b59410]/50 focus:border-[#b59410] transition-colors shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
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
                          <Textarea {...form.register(`faqs.${index}.answer`)}
                            placeholder="Provide a detailed answer..."
                            rows={2}
                            className="flex min-h-[80px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#b59410]/50 focus:border-[#b59410] transition-colors shadow-sm resize-y disabled:cursor-not-allowed disabled:opacity-50"
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
                    <Label className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-2 block text-base font-semibold text-blue-800">
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
                        <Input {...form.register(`tripTags.${index}.value`)}
                          placeholder={`Tag ${index + 1}`}
                          className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#b59410]/50 focus:border-[#b59410] transition-colors shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
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

            {/* STEP 5: OPERATIONS */}
            <div className={step === 5 ? "block" : "hidden"}>
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-lg text-gray-900">Operations & Tasks</h3>
                    <p className="text-sm text-gray-500">
                      Internal operational tasks and templates to be materialized on departure.
                    </p>
                  </div>
                </div>
                {itineraryFields.map((field, dayIndex) => {
                  const day = form.getValues(`itinerary.${dayIndex}`);
                  return (
                    <section
                      key={field.id}
                      className="rounded-xl border border-[#eadcb9] bg-[#fcf8ef] p-4 sm:p-5"
                    >
                      <div className="mb-3 flex items-center justify-between border-b border-[#e1cf9d] pb-3">
                        <div className="flex items-center gap-2">
                          <ClipboardList className="h-5 w-5 text-[#8a6414]" />
                          <h4 className="font-semibold text-[#8a6414]">
                            {day?.day || `Day ${dayIndex + 1}`}{" "}
                            {day?.title ? `- ${day?.title}` : ""}
                          </h4>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const currentTasks = form.getValues(`itinerary.${dayIndex}.tasks`) || [];
                            form.setValue(`itinerary.${dayIndex}.tasks`, [
                              ...currentTasks,
                              {
                                category: "GENERAL",
                                title: "",
                                description: "",
                                unitPrice: undefined,
                                quantityNeeded: undefined,
                                dueOffsetDays: undefined,
                              },
                            ]);
                          }}
                        >
                          <Plus className="mr-1 h-4 w-4" /> Add Task
                        </Button>
                      </div>
                      {!(day?.tasks?.length) ? (
                        <p className="text-sm text-gray-500 italic">
                          No operational work configured for this day.
                        </p>
                      ) : (
                        day.tasks.map((_: any, taskIndex: number) => (
                          <div
                            key={taskIndex}
                            className="mb-3 grid gap-2 rounded-lg border bg-white p-3 md:grid-cols-2 shadow-sm"
                          >
                            <div className="flex justify-end md:col-span-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const currentTasks = form.getValues(`itinerary.${dayIndex}.tasks`);
                                  currentTasks.splice(taskIndex, 1);
                                  form.setValue(`itinerary.${dayIndex}.tasks`, currentTasks);
                                }}
                                className="h-6 px-2 text-red-500 hover:bg-red-50 hover:text-red-600"
                              >
                                <Trash2 className="h-3.5 w-3.5 mr-1" /> Remove Task
                              </Button>
                            </div>
                            <div>
                              <Label className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-2 block">
                                Category
                              </Label>
                              <select
                                {...form.register(`itinerary.${dayIndex}.tasks.${taskIndex}.category`)}
                                className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#b59410]/50 focus:border-[#b59410] transition-colors shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {TASK_CATEGORIES.map((value) => (
                                  <option key={value} value={value}>
                                    {value.replaceAll("_", " ")}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <Label className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-2 block">
                                Task title
                              </Label>
                              <Input
                                className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#b59410]/50 focus:border-[#b59410] transition-colors shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                                {...form.register(`itinerary.${dayIndex}.tasks.${taskIndex}.title`)}
                              />
                              {form.formState.errors.itinerary?.[dayIndex]?.tasks?.[taskIndex]?.title && (
                                <p className="mt-1 text-xs text-red-600">
                                  {form.formState.errors.itinerary[dayIndex]?.tasks?.[taskIndex]?.title?.message}
                                </p>
                              )}
                            </div>
                            <div className="md:col-span-2">
                              <Label className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-2 block">
                                Description
                              </Label>
                              <Input
                                className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#b59410]/50 focus:border-[#b59410] transition-colors shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                                {...form.register(`itinerary.${dayIndex}.tasks.${taskIndex}.description`)}
                              />
                            </div>
                            <div>
                              <Label className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-2 block">
                                Unit Price
                              </Label>
                              <Input
                                className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#b59410]/50 focus:border-[#b59410] transition-colors shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                                type="number"
                                min={0.01}
                                step="0.01"
                                {...form.register(`itinerary.${dayIndex}.tasks.${taskIndex}.unitPrice`)}
                              />
                            </div>
                            <div>
                              <Label className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-2 block">
                                Qty Needed
                              </Label>
                              <Input
                                className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#b59410]/50 focus:border-[#b59410] transition-colors shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                                type="number"
                                min={1}
                                step={1}
                                {...form.register(`itinerary.${dayIndex}.tasks.${taskIndex}.quantityNeeded`)}
                              />
                            </div>
                            <div className="flex items-end gap-2">
                              <div className="flex-1">
                                <Label className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-2 block">
                                  Due before departure (days)
                                </Label>
                                <Input
                                  className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#b59410]/50 focus:border-[#b59410] transition-colors shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                                  type="number"
                                  min={0}
                                  step={1}
                                  {...form.register(`itinerary.${dayIndex}.tasks.${taskIndex}.dueOffsetDays`)}
                                />
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </section>
                  );
                })}
              </div>
            </div>

            {/* STEP 6: STAY & TRANSPORT */}
            <div className={step === 6 ? "block" : "hidden"}>
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
                        className="p-3 sm:p-4 border rounded-lg bg-white shadow-sm flex flex-col md:flex-row items-stretch md:items-start gap-3 md:gap-4 group"
                      >
                        <div className="w-full h-32 md:w-24 md:h-24 shrink-0 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 flex flex-col items-center justify-center relative overflow-hidden">
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
                          <Label className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-2 block text-xs text-gray-500 uppercase font-semibold">
                            Description
                          </Label>
                          <Input className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#b59410]/50 focus:border-[#b59410] transition-colors shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
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
                          className="text-red-500 hover:bg-red-50 self-end md:self-auto mt-0 md:mt-6 shrink-0"
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

            {/* STEP 7: MEDIA (BANNER IMAGES) */}
            <div className={step === 7 ? "block" : "hidden"}>
              <div className="space-y-4">
                {localBannerImages.length > 0 && (
                  <div className="mb-6">
                    <h4 className="font-medium mb-3 text-sm text-gray-500">
                      Current Banner Images
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {localBannerImages.map((url: string, i: number) => (
                        <div
                          key={url}
                          className="relative group rounded-lg overflow-hidden border border-gray-200 aspect-video bg-gray-100"
                        >
                          <img
                            src={url}
                            alt={`Existing ${i}`}
                            className="w-full h-full object-cover"
                          />
                          {isEdit && (
                            <div className="absolute inset-0 bg-black/30 opacity-100 md:bg-black/40 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <button
                                type="button"
                                onClick={() => deleteExistingImage(url)}
                                className="w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg"
                                title="Delete Image"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="p-4 sm:p-8 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 flex flex-col items-center justify-center text-center">
                  <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm border border-gray-100 mb-4">
                    <UploadCloud className="w-8 h-8 text-[#b59410]" />
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
                  <Label htmlFor="image-upload" className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-2 block cursor-pointer bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-6 py-2.5 rounded-lg font-medium transition-colors shadow-sm inline-flex items-center gap-2"
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
                          <div className="absolute inset-0 bg-black/30 opacity-100 md:bg-black/40 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex items-center justify-center">
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
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-t bg-gray-50 flex flex-row items-center justify-between gap-2 shrink-0">
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
              className="bg-[#b59410] hover:bg-[#8a710c] text-white flex items-center gap-2"
            >
              Continue <ArrowRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              key="submit-btn"
              type="submit"
              form="trip-form"
              disabled={isSubmitting || !canSubmit}
              className="bg-[#781216] hover:bg-[#9a1a1f] text-white flex items-center gap-2 px-4 sm:px-8 shadow-md"
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
        </div>
      </DialogContent>
    </Dialog>
  );
}

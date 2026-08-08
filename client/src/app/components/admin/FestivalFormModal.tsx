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
  ImagePlus,
  X
} from "lucide-react";
import { apiClient } from "../../../lib/axios";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { ItineraryStep } from "./ItineraryStep";
import { uploadBannerImagesDirect, uploadGenericImageDirect } from "../../../lib/directImageUpload";
import {
  toAddOnFields,
  toArray,
  toFaqFields,
  toItineraryFields,
  toPackageFields,
  toTagFields,
  toValueFields,
} from "./formDataMappers";

// --- VALIDATION SCHEMA ---
const optionalPositiveInteger = z.preprocess(
  (a) => (a === "" ? undefined : a),
  z.coerce.number().int().positive().optional()
);

const optionalNonnegativeInteger = z.preprocess(
  (a) => (a === "" ? undefined : a),
  z.coerce.number().int().nonnegative().optional()
);
const festivalSchema = z.object({
  destinationId: z.string().uuid().optional(),
  title: z.string().min(3, "Title must be at least 3 characters"),
  location: z.string().min(2, "Location is required"),
  duration: z.coerce.number().min(1, "Duration must be at least 1 day"),
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
  tags: z.array(z.object({ value: z.string().min(1) })).optional(),
  packages: z.array(
    z.object({
      id: z.string().uuid().optional(),
      title: z.string().min(1, "Package name is required"),
      price: z.coerce.number().min(1, "Price must be greater than 0"),
      tokenAmount: z.coerce.number().min(0, "Booking amount must be 0 or more"),
    })
  ).min(1, "At least one pricing package is required"),
  faqs: z
    .array(
      z.object({
        question: z.string().optional(),
        answer: z.string().optional(),
      }),
    )
    .optional(),
  isPublished: z.boolean().default(false),
  isListed: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
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
  addOns: z.array(
    z.object({
      id: z.string().uuid().optional(),
      title: z.string().min(1, "Add-on title is required"),
      description: z.string().optional(),
      imageUrl: z.string().url("Enter a valid URL").optional().or(z.literal("")),
      price: z.coerce.number().positive(),
      maxQuantityPerBooking: optionalPositiveInteger,
      maxQuantityPerSlot: optionalPositiveInteger,
      purchaseCutoffOffsetDays: optionalNonnegativeInteger,
      isActive: z.boolean().default(true),
    })
  ).optional(),
  }
);

type FestivalFormValues = z.infer<typeof festivalSchema>;

type FestivalDraft = {
  id: string;
  name: string;
  updatedAt: string;
  values: FestivalFormValues;
};

const FESTIVAL_DRAFTS_KEY = "crm-festival-drafts:v1";

const readFestivalDrafts = (): FestivalDraft[] => {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(FESTIVAL_DRAFTS_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

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

interface FestivalFormModalProps {
  festival?: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FestivalFormModal({
  festival,
  open,
  onOpenChange,
}: FestivalFormModalProps) {
  const [step, setStep] = useState(0);
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [localBannerImages, setLocalBannerImages] = useState<string[]>([]);
  const [uploadingImageKey, setUploadingImageKey] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<FestivalDraft[]>([]);
  const [isSaveDraftOpen, setIsSaveDraftOpen] = useState(false);
  const [isDraftsOpen, setIsDraftsOpen] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [draftToDelete, setDraftToDelete] = useState<FestivalDraft | null>(null);

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
  const destinationsQuery = useQuery({
    queryKey: ["admin", "destinations", "festival-form"],
    queryFn: async () => (await apiClient.get("/destinations", { params: { adminView: true, limit: 200 } })).data.data as Array<{ id: string; name: string; state?: string | null }>,
    enabled: open,
  });
  const destinations = destinationsQuery.data || [];

  const isEdit = !!festival;

  // Format date to YYYY-MM-DDTHH:mm for datetime-local input
  const formatDateForInput = (dateString: string) => {
    if (!dateString) return "";
    try {
      return format(new Date(dateString), "yyyy-MM-dd'T'HH:mm");
    } catch {
      return "";
    }
  };

  const form = useForm<FestivalFormValues>({
    resolver: zodResolver(festivalSchema),
    defaultValues: {
      destinationId: undefined,
      title: "",
      location: "",
      duration: 1,
      bestTimeToVisit: "",
      slots: [{ startDate: "", endDate: "", capacity: 12 }],
      overview: "",
      inclusions: [],
      exclusions: [],
      tags: [],
      packages: [{ title: "Standard", price: 0, tokenAmount: 0 }],
      addOns: [],
      itinerary: [],
      faqs: [],
      isPublished: false,
      isListed: true,
      isFeatured: false,
    },
    mode: "onTouched",
  });

  // Reset form when festival prop changes or modal opens
  useEffect(() => {
    if (open) {
      setDrafts(readFestivalDrafts());
      if (festival) {
        form.reset({
          destinationId: festival.destinationId || undefined,
          title: festival.title || "",
          location: festival.location || "",
          duration: festival.duration || 1,
          bestTimeToVisit: festival.bestTimeToVisit || "",
          slots: festival.slots && festival.slots.length > 0 ? festival.slots.map((s: any) => ({
            id: s.id,
            startDate: formatDateForInput(s.startDate),
            endDate: formatDateForInput(s.endDate),
            title: s.title || "",
            priority: s.priority || 0,
            capacity: s.capacity
          })) : [{ startDate: "", endDate: "", capacity: 12, title: "", priority: 0 }],
          overview: festival.overview || "",
          inclusions: toValueFields(festival.inclusions),
          exclusions: toValueFields(festival.exclusions),
          tags: toTagFields(festival.tags),
          packages: toPackageFields(festival.packages).length
            ? toPackageFields(festival.packages)
            : [{ title: "Standard", price: 0, tokenAmount: 0 }],
          addOns: toAddOnFields(festival.addOns),
          itinerary: toItineraryFields(festival.itinerary),
          faqs: toFaqFields(festival.faqs),
          isPublished: festival.isPublished || false,
          isListed: festival.isListed !== false,
          isFeatured: festival.isFeatured || false,
        });
        // Keep the field-array source of truth in sync with the values shown
        // after editing an existing festival. This prevents validation from
        // reading a stale array while the inputs appear populated.
        replaceSlots(form.getValues("slots"));
        replaceInclusions(form.getValues("inclusions"));
        replaceExclusions(form.getValues("exclusions"));
        replaceTags(form.getValues("tags"));
        replacePackages(form.getValues("packages"));
        replaceAddOns(form.getValues("addOns"));
        replaceFaqs(form.getValues("faqs"));
        replaceItinerary(form.getValues("itinerary"));
        form.clearErrors();

        // Initialize Highlight items
        let parsedHighlights = festival.highlights || [];
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

        let parsedBanners = festival.bannerImages || [];
        if (typeof parsedBanners === "string") {
          try { parsedBanners = JSON.parse(parsedBanners); } catch(e) { parsedBanners = []; }
        }
        setLocalBannerImages(Array.isArray(parsedBanners) ? parsedBanners : []);

        // Initialize Stay items
        let parsedStay = festival.stayTransportImages || [];
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
          destinationId: undefined,
          title: "",
          location: "",
          duration: 1,
          bestTimeToVisit: "",
          slots: [{ startDate: "", endDate: "", capacity: 12 }],
          overview: "",
          inclusions: [],
          exclusions: [],
          packages: [{ title: "Standard", price: 0, tokenAmount: 0 }],
          tags: [],
          addOns: [],
          faqs: [],
          itinerary: [],
          isPublished: false,
          isListed: true,
          isFeatured: false,
        });
        replaceSlots(form.getValues("slots"));
        replaceInclusions(form.getValues("inclusions"));
        replaceExclusions(form.getValues("exclusions"));
        replaceTags([]);
        replacePackages([{ title: "Standard", price: 0, tokenAmount: 0 }]);
        replaceAddOns([]);
        replaceFaqs([]);
        replaceItinerary([]);
        form.clearErrors();
        setStayItems([]);
        setHighlightItems([]);
        setLocalBannerImages([]);
      }
      setStep(0);
      setImages([]);
      setImagePreviews([]);
      setVideoFile(null);
      setVideoPreview(null);
    }
  }, [festival, open, form]);

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
    fields: tagFields,
    append: addTag,
    remove: removeTag,
    replace: replaceTags,
  } = useFieldArray({
    control: form.control,
    name: "tags",
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
    fields: addOnsFields,
    append: appendAddOn,
    remove: removeAddOn,
    replace: replaceAddOns,
  } = useFieldArray({
    name: "addOns",
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

  const { fields: itineraryFields, replace: replaceItinerary } = useFieldArray({
    control: form.control,
    name: "itinerary",
  });

  const persistDrafts = (nextDrafts: FestivalDraft[]) => {
    window.localStorage.setItem(FESTIVAL_DRAFTS_KEY, JSON.stringify(nextDrafts));
    setDrafts(nextDrafts);
  };

  const saveDraft = () => {
    const name = draftName.trim();
    if (!name) {
      toast.error("Enter a name for this draft");
      return;
    }
    const values = JSON.parse(JSON.stringify(form.getValues())) as FestivalFormValues;
    const draft: FestivalDraft = {
      id: crypto.randomUUID(),
      name,
      updatedAt: new Date().toISOString(),
      values,
    };
    persistDrafts([draft, ...drafts]);
    setDraftName("");
    setIsSaveDraftOpen(false);
    toast.success("Festival draft saved", { description: "Images and the selected video are not stored in browser drafts." });
  };

  const restoreDraft = (draft: FestivalDraft) => {
    form.reset(draft.values);
    replaceSlots(draft.values.slots || []);
    replaceInclusions(draft.values.inclusions || []);
    replaceExclusions(draft.values.exclusions || []);
    replaceTags(draft.values.tags || []);
    replacePackages(draft.values.packages || []);
    replaceAddOns(draft.values.addOns || []);
    replaceFaqs(draft.values.faqs || []);
    replaceItinerary(draft.values.itinerary || []);
    form.clearErrors();
    setStep(0);
    setIsDraftsOpen(false);
    toast.success(`Restored draft: ${draft.name}`);
  };

  const deleteDraft = () => {
    if (!draftToDelete) return;
    persistDrafts(drafts.filter((draft) => draft.id !== draftToDelete.id));
    toast.success(`Deleted draft: ${draftToDelete.name}`);
    setDraftToDelete(null);
  };

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

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setVideoFile(file);
      setVideoPreview(URL.createObjectURL(file));
    }
    e.target.value = "";
  };

  const removeVideo = () => {
    setVideoFile(null);
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    setVideoPreview(null);
  };

  const deleteExistingVideo = async () => {
    if (!festival?.id || !window.confirm("Delete this video permanently?")) return;
    try {
      await apiClient.delete(`/festivals/${festival.id}/video`);
      toast.success("Video deleted");
      queryClient.invalidateQueries({ queryKey: ["admin", "festivals"] });
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to delete video");
    }
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
    if (!festival?.id) {
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
      await apiClient.delete(`/festivals/${festival.id}/banner-images`, {
        data: { imageUrl: url },
      });
      toast.success("Image deleted successfully");
      festival.bannerImages = festival.bannerImages.filter(
        (img: string) => img !== url,
      );
      setLocalBannerImages(prev => prev.filter(img => img !== url));
      queryClient.invalidateQueries({ queryKey: ["admin", "festivals"] });
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to delete image");
    }
  };

  // Human-readable labels for festival form fields
  const FIELD_LABELS: Record<string, string> = {
    title: "Festival Title",
    location: "Location",
    duration: "Duration (days)",
    bestTimeToVisit: "Best Time to Visit",
    packages: "Pricing Packages",
    slots: "Festival Slots",
    overview: "Overview",
    inclusions: "Inclusions",
    exclusions: "Exclusions",
    faqs: "FAQs",
    tags: "Tags",
    itinerary: "Itinerary",
  };

  const getStepErrors = (errors: any, fieldsToValidate: string[]): string[] => {
    const missing: string[] = [];
    for (const field of fieldsToValidate) {
      const err = errors[field];
      if (!err) continue;
      const label = FIELD_LABELS[field] || field;
      if (err.message) {
        missing.push(`${label}: ${err.message}`);
      } else if (err.root?.message) {
        missing.push(`${label}: ${err.root.message}`);
      } else if (Array.isArray(err)) {
        missing.push(label);
      } else if (typeof err === "object") {
        missing.push(label);
      }
    }
    return missing;
  };

  const validateStep = async () => {
    let fieldsToValidate: (keyof FestivalFormValues)[] = [];
    if (step === 0)
      fieldsToValidate = [
        "title",
        "location",
        "duration",
        "bestTimeToVisit",
        "packages",
        "addOns",
      ];
    else if (step === 1) {
      fieldsToValidate = ["slots"];
    } else if (step === 2) {
      fieldsToValidate = ["overview", "inclusions", "exclusions"];
    }
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
    let fieldsToValidate: (keyof FestivalFormValues)[] = [];
    if (step === 0)
      fieldsToValidate = ["title", "location", "duration", "bestTimeToVisit", "packages", "addOns"];
    else if (step === 1) fieldsToValidate = ["slots"];
    else if (step === 2) fieldsToValidate = ["overview", "inclusions", "exclusions"];
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
  const onSubmit = async (data: FestivalFormValues, saveFromCurrentStep = false) => {
    if (!saveFromCurrentStep && step !== STEPS.length - 1) return;

    setIsSubmitting(true);
    try {
      const payload = {
        ...data,
        // Send null explicitly when the unlinked option is selected so edits
        // disconnect the existing relation instead of leaving it unchanged.
        destinationId: data.destinationId || null,
        slots: data.slots.map((s: any) => ({
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
        tags: data.tags
          ?.map((t) => t.value)
          .filter((t) => t.trim() !== ""),
        packages: data.packages,
        addOns: data.addOns?.map((a) => ({
          ...a,
          description: a.description || undefined,
          imageUrl: a.imageUrl || undefined,
        })),
        itinerary: data.itinerary,
        faqs: data.faqs?.filter(
          (f) => f.question.trim() !== "" && f.answer.trim() !== "",
        ),
        ...(!isEdit && localBannerImages.length > 0 
            ? { bannerImages: localBannerImages } 
            : {}),
      };

      let festivalId = festival?.id;

      if (isEdit) {
        await apiClient.put(`/festivals/${festivalId}`, payload);
        toast.success("Festival updated successfully!");
      } else {
        const createRes = await apiClient.post("/festivals", payload);
        festivalId = createRes.data.festival.id;
        toast.success("Festival created successfully!");
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

        await apiClient.post(`/festivals/${festivalId}/stay-transport`, stayFormData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        toast.success("Stay & Transport updated!");
      } else if (isEdit) {
        const stayFormData = new FormData();
        stayFormData.append("payload", JSON.stringify([]));
        await apiClient.post(`/festivals/${festivalId}/stay-transport`, stayFormData, {
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

        await apiClient.post(`/festivals/${festivalId}/highlights`, highlightFormData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        toast.success("Highlights updated!");
      } else if (isEdit) {
        const highlightFormData = new FormData();
        highlightFormData.append("payload", JSON.stringify([]));
        await apiClient.post(`/festivals/${festivalId}/highlights`, highlightFormData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      // Sync Banners
      if (images.length > 0) {
        const uploadToast = toast.loading(`Uploading banners (0/${images.length})…`);
        await uploadBannerImagesDirect("festivals", festivalId, images, (completed, total) => {
          toast.loading(`Uploading banners (${completed}/${total})…`, { id: uploadToast });
        });
        toast.success("Banner images uploaded!", { id: uploadToast });
      }

      // Sync Video
      if (videoFile) {
        const videoFormData = new FormData();
        videoFormData.append("video", videoFile);
        await apiClient.post(`/festivals/${festivalId}/video`, videoFormData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        toast.success("Video uploaded!");
      }

      queryClient.invalidateQueries({ queryKey: ["admin", "festivals"] });
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to save festival");
    } finally {
      setIsSubmitting(false);
    }
  };

  const saveCurrentChanges = () => {
    void form.handleSubmit(
      (data) => onSubmit(data, true),
      onError,
    )();
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
              {isEdit ? "Edit Itinerary Festival" : "Create New Itinerary Festival"}
            </DialogTitle>
            <DialogDescription>
              {isEdit
                ? "Modify the details of your festival below."
                : "Follow the steps to configure all details for the new festival."}
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
            id="festival-form"
            onSubmit={form.handleSubmit(onSubmit as any, onError)}
            onKeyDown={handleKeyDown}
            className="space-y-6"
          >
            {/* STEP 0: BASICS */}
            <div className={step === 0 ? "block" : "hidden"}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2 space-y-2">
                  <Label className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-2 block">Festival Title <span className="text-red-500">*</span></Label>
                  <Input className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#b59410]/50 focus:border-[#b59410] transition-colors shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                    {...form.register("title")}
                    placeholder="e.g. Tomorrowland Winter"
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
                    placeholder="e.g. Alpe d'Huez, France"
                  />
                  {form.formState.errors.location && (
                    <p className="text-sm text-red-500">
                      {form.formState.errors.location.message}
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
                <div className="space-y-2">
                  <Label className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-2 block">Destination</Label>
                  <select
                    value={form.watch("destinationId") || ""}
                    onChange={(event) => form.setValue("destinationId", event.target.value || undefined, { shouldDirty: true })}
                    disabled={destinationsQuery.isLoading}
                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <option value="">No destination — leave unlinked</option>
                    {destinations.map((destination) => (
                      <option key={destination.id} value={destination.id}>
                        {destination.name}{destination.state ? `, ${destination.state}` : ""}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500">Choose another destination to relink this festival, or leave it unlinked.</p>
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

                <div className="md:col-span-2 space-y-4">
                  <div className="mb-2">
                    <Label className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-2 block">Optional add-ons</Label>
                    <p className="text-xs text-gray-500">Travelers can add these while booking, before the cutoff.</p>
                  </div>
                  {addOnsFields.map((field, index) => {
                    const currentUrl = form.watch(`addOns.${index}.imageUrl`);
                    return (
                      <div key={field.id} className="flex flex-col gap-4 p-4 border rounded-lg bg-gray-50 md:flex-row">
                        <div className="w-full md:w-32 shrink-0">
                          <Label className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-2 block">
                            Image
                          </Label>
                          {currentUrl ? (
                            <div className="relative group w-full aspect-square mt-1">
                              <img
                                src={currentUrl}
                                alt=""
                                className="w-full h-full rounded-lg object-cover border bg-white shadow-sm"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  form.setValue(`addOns.${index}.imageUrl`, "", {
                                    shouldDirty: true,
                                    shouldValidate: true,
                                  })
                                }
                                className="absolute -top-2 -right-2 hidden group-hover:flex items-center justify-center h-6 w-6 rounded-full bg-red-500 text-white shadow-md transition-transform hover:scale-110"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ) : (
                            <label
                              className={`mt-1 flex flex-col items-center justify-center w-full aspect-square rounded-lg border-2 border-dashed border-gray-300 bg-white transition-colors shadow-sm ${uploadingImageKey === `addOns.${index}` ? "opacity-70 cursor-not-allowed" : "hover:bg-gray-50 cursor-pointer"}`}
                            >
                              {uploadingImageKey === `addOns.${index}` ? (
                                <Loader2 className="h-6 w-6 text-gray-400 mb-2 animate-spin" />
                              ) : (
                                <ImagePlus className="h-6 w-6 text-gray-400 mb-2" />
                              )}
                              <span className="text-xs font-semibold text-gray-500">
                                {uploadingImageKey === `addOns.${index}` ? "Uploading..." : "Upload"}
                              </span>
                              <input
                                type="file"
                                className="hidden"
                                accept="image/*"
                                disabled={uploadingImageKey === `addOns.${index}`}
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  setUploadingImageKey(`addOns.${index}`);
                                  try {
                                    const url = await uploadGenericImageDirect(file);
                                    form.setValue(`addOns.${index}.imageUrl`, url, {
                                      shouldDirty: true,
                                      shouldValidate: true,
                                    });
                                    toast.success("Image uploaded successfully");
                                  } catch (err: any) {
                                    toast.error(err.message || "Failed to upload image");
                                  } finally {
                                    setUploadingImageKey(null);
                                  }
                                }}
                              />
                            </label>
                          )}
                        </div>
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-2 block">Name <span className="text-red-500">*</span></Label>
                            <Input className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                              {...form.register(`addOns.${index}.title`)}
                            />
                          </div>
                          <div>
                            <Label className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-2 block">Price <span className="text-red-500">*</span></Label>
                            <Input className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                              type="number"
                              min="0"
                              step="0.01"
                              {...form.register(`addOns.${index}.price`)}
                            />
                          </div>
                          <div className="md:col-span-2">
                            <Label className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-2 block">Description</Label>
                            <Input className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                              {...form.register(`addOns.${index}.description`)}
                            />
                          </div>
                          <div>
                            <Label className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-2 block">Max Qty (Per Booking)</Label>
                            <Input className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                              type="number"
                              min="1"
                              {...form.register(`addOns.${index}.maxQuantityPerBooking`)}
                            />
                          </div>
                          <div>
                            <Label className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-2 block">Max Qty (Total / Slot)</Label>
                            <Input className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                              type="number"
                              min="1"
                              {...form.register(`addOns.${index}.maxQuantityPerSlot`)}
                            />
                          </div>
                          <div>
                            <Label className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-2 block">Cutoff (days before start)</Label>
                            <Input className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                              type="number"
                              min="0"
                              {...form.register(`addOns.${index}.purchaseCutoffOffsetDays`)}
                            />
                          </div>
                          <div className="flex items-center gap-2 mt-auto pb-2">
                            <input
                              type="checkbox"
                              {...form.register(`addOns.${index}.isActive`)}
                              className="h-4 w-4 accent-[#781216]"
                            />
                            <Label className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-0 block">Active</Label>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          className="text-red-500 shrink-0 mt-6"
                          onClick={() => removeAddOn(index)}
                        >
                          <Trash className="w-4 h-4" />
                        </Button>
                      </div>
                    )
                  })}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2 w-full border-dashed"
                    onClick={() => appendAddOn({ title: "", price: 0, description: "", isActive: true })}
                  >
                    <Plus className="w-4 h-4 mr-2" /> Add Add-on
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
                      Publish this festival
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
                      List in public catalog
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
                      Feature this festival (showcase its video on the homepage)
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
                    placeholder="Describe the festival..."
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
                            placeholder="e.g. VIP Access passes"
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

            {/* STEP 3: FAQs & Tags */}
            <div className={step === 3 ? "block" : "hidden"}>
              <div className="space-y-4">
                <div className="border-b pb-3">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Frequently Asked Questions
                    </h3>
                    <p className="text-sm text-gray-500">
                      Add common questions and answers for this festival.
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
                            placeholder="e.g. Is there age restriction?"
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

                {/* FESTIVAL TAGS */}
                <div className="space-y-3 p-4 mt-6 border rounded-lg bg-blue-50/30 border-blue-100">
                  <div>
                    <Label className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-2 block text-base font-semibold text-blue-800">
                      Festival Tags
                    </Label>
                  </div>
                  <p className="text-xs text-gray-500">
                    Add tags to categorize this festival (e.g. EDM, Music, Camping)
                  </p>
                  <div className="space-y-3">
                    {tagFields.map((field, index) => (
                      <div key={field.id} className="flex items-center gap-2">
                        <Input {...form.register(`tags.${index}.value`)}
                          placeholder={`Tag ${index + 1}`}
                          className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#b59410]/50 focus:border-[#b59410] transition-colors shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeTag(index)}
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
                      onClick={() => addTag({ value: "" })}
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
                            placeholder="e.g. VIP Tents"
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

            {/* STEP 7: MEDIA (BANNER & VIDEO) */}
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
                    festival page. Recommended size: 1920x1080.
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

              {/* Video Upload Section */}
              <div className="mt-8 pt-8 border-t space-y-4">
                {isEdit && festival?.videoUrl && (
                  <div className="mb-6">
                    <h4 className="font-medium mb-3 text-sm text-gray-500">
                      Current Video
                    </h4>
                    <div className="relative group rounded-lg overflow-hidden border border-gray-200 aspect-video bg-gray-100 max-w-sm">
                      <video src={festival.videoUrl} controls className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/30 opacity-100 md:bg-black/40 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button
                          type="button"
                          onClick={deleteExistingVideo}
                          className="w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg"
                          title="Delete Video"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="p-4 sm:p-8 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 flex flex-col items-center justify-center text-center">
                  <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm border border-gray-100 mb-4">
                    <UploadCloud className="w-8 h-8 text-[#b59410]" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    Upload Hero Video
                  </h3>
                  <p className="text-sm text-gray-500 mb-6 max-w-sm">
                    A video that will play in the background of the festival hero section. Recommended short, lightweight video.
                  </p>
                  <Label htmlFor="video-upload" className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-2 block cursor-pointer bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-6 py-2.5 rounded-lg font-medium transition-colors shadow-sm inline-flex items-center gap-2"
                  >
                    <UploadCloud className="w-4 h-4" />
                    Select Video
                    <input
                      id="video-upload"
                      type="file"
                      accept="video/*"
                      className="hidden"
                      onChange={handleVideoChange}
                    />
                  </Label>
                </div>

                {videoPreview && (
                  <div className="mt-6">
                    <h4 className="font-medium mb-3 text-sm text-gray-500">
                      New Selected Video
                    </h4>
                    <div className="relative group rounded-lg overflow-hidden border border-gray-200 aspect-video bg-gray-100 max-w-sm">
                      <video src={videoPreview} controls className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/30 opacity-100 md:bg-black/40 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button
                          type="button"
                          onClick={removeVideo}
                          className="w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
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
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setDraftName(form.getValues("title") || "");
                  setIsSaveDraftOpen(true);
                }}
                disabled={isSubmitting}
              >
                Save draft
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDraftsOpen(true)}
                disabled={isSubmitting}
              >
                My drafts ({drafts.length})
              </Button>
              {isEdit && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={saveCurrentChanges}
                  disabled={isSubmitting}
                  className="flex items-center gap-2"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                  Save changes
                </Button>
              )}
              <Button
                key="continue-btn"
                type="button"
                onClick={nextStep}
                disabled={isSubmitting}
                className="bg-[#b59410] hover:bg-[#8a710c] text-white flex items-center gap-2"
              >
                Continue <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <Button
              key="submit-btn"
              type="submit"
              form="festival-form"
              disabled={isSubmitting || !canSubmit}
              className="bg-[#781216] hover:bg-[#9a1a1f] text-white flex items-center gap-2 px-4 sm:px-8 shadow-md transition-opacity duration-300 disabled:opacity-50"
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
                  : "Save Festival"}
            </Button>
          )}
        </div>
        </div>
      </DialogContent>

      <Dialog open={isSaveDraftOpen} onOpenChange={setIsSaveDraftOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Name this festival draft</DialogTitle>
            <DialogDescription>
              Save the details entered so far and continue later. Banner images and videos need to be selected again when you restore a draft.
            </DialogDescription>
          </DialogHeader>
          <Input
            autoFocus
            value={draftName}
            onChange={(event) => setDraftName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                saveDraft();
              }
            }}
            placeholder="e.g. Sunburn Goa – January plan"
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsSaveDraftOpen(false)}>Cancel</Button>
            <Button type="button" onClick={saveDraft} className="bg-[#781216] hover:bg-[#9a1a1f] text-white">Save draft</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isDraftsOpen} onOpenChange={setIsDraftsOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Festival drafts</DialogTitle>
            <DialogDescription>Restore a saved draft or remove one you no longer need.</DialogDescription>
          </DialogHeader>
          <div className="max-h-80 space-y-2 overflow-y-auto">
            {drafts.length === 0 ? (
              <p className="rounded-lg border border-dashed p-5 text-center text-sm text-gray-500">No festival drafts saved yet.</p>
            ) : drafts.map((draft) => (
              <div key={draft.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-gray-900">{draft.name}</p>
                  <p className="text-xs text-gray-500">Saved {format(new Date(draft.updatedAt), "dd MMM yyyy, h:mm a")}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={() => restoreDraft(draft)}>Restore</Button>
                  <Button type="button" size="sm" variant="outline" className="text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => setDraftToDelete(draft)}>Delete</Button>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!draftToDelete} onOpenChange={(nextOpen) => !nextOpen && setDraftToDelete(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete festival draft?</DialogTitle>
            <DialogDescription>
              {draftToDelete ? `“${draftToDelete.name}” will be permanently removed from this browser.` : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setDraftToDelete(null)}>Cancel</Button>
            <Button type="button" variant="destructive" onClick={deleteDraft}>Delete draft</Button>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}

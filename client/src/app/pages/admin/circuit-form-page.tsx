import { useEffect, useMemo, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as z from "zod";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  ClipboardList,
  Loader2,
  Plus,
  Trash2,
  Trash,
  ImagePlus,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate, useParams } from "react-router";
import { apiClient } from "../../../lib/axios";
import { formatTripType } from "../../../lib/tripApi";
import { uploadGenericImageDirect } from "../../../lib/directImageUpload";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { getErrorMessage, showErrorToast } from "../../../lib/errors";

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
] as const;

const TASK_CATEGORIES = [
  "HOTEL",
  "TRANSPORT",
  "PERMIT",
  "VENDOR",
  "ACTIVITY",
  "DOCUMENTATION",
  "PAYMENT_COLLECTION",
  "GENERAL",
] as const;

const optionalPositiveNumber = z.preprocess(
  (value) =>
    value === "" || value === null || value === undefined
      ? undefined
      : Number(value),
  z.number().positive("Amount must be greater than zero").optional(),
);
const optionalPositiveInteger = z.preprocess(
  (value) =>
    value === "" || value === null || value === undefined
      ? undefined
      : Number(value),
  z
    .number()
    .int("Enter a whole number")
    .positive("Quantity must be at least 1")
    .optional(),
);
const optionalNonnegativeInteger = z.preprocess(
  (value) =>
    value === "" || value === null || value === undefined
      ? undefined
      : Number(value),
  z
    .number()
    .int("Enter a whole number")
    .nonnegative("Days cannot be negative")
    .optional(),
);
const optionalUrl = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() === "" ? undefined : value,
  z.string().url("Enter a valid image URL").optional(),
);

const taskSchema = z.object({
  id: z.string().uuid().optional(),
  category: z.string().min(1),
  title: z.string().min(1, "Task title is required"),
  description: z.string().optional(),
  unitPrice: optionalPositiveNumber,
  quantityNeeded: optionalNonnegativeInteger,
  dueOffsetDays: optionalNonnegativeInteger,
});

const circuitSchema = z
  .object({
    title: z.string().min(2, "Title is required"),
    tripType: z.enum(TRIP_TYPES),
    location: z.string().min(1, "Location is required"),
    destinationId: z.string().optional(),
    overview: z.string().min(1, "Overview is required"),
    bestTimeToVisit: z.string().min(1, "Best time is required"),
    duration: z.coerce.number().int().positive(),
    operationsReminderDays: z.coerce.number().int().nonnegative(),
    isActive: z.boolean(),
    internalNotes: z.string().optional(),
    bannerImages: z.array(
      z.object({ value: z.string().url("Enter a valid URL") }),
    ),
    stayTransportImages: z.array(
      z.object({
        text: z.string().optional(),
        imageUrl: z.string().url("Enter a valid URL"),
      }),
    ),
    highlights: z.array(
      z.object({
        text: z.string().min(1, "Required"),
        imageUrl: z.string().url("Enter a valid URL"),
      }),
    ),
    inclusions: z
      .array(z.object({ value: z.string().min(1, "Required") }))
      .default([]),
    exclusions: z
      .array(z.object({ value: z.string().min(1, "Required") }))
      .default([]),
    tagIds: z.array(z.string()),
    packages: z
      .array(
        z.object({
          id: z.string().uuid().optional(),
          title: z.string().min(1, "Package title is required"),
          price: z.coerce.number().positive("Price must be positive"),
          tokenAmount: z.coerce.number().nonnegative(),
        }),
      )
      .min(1),
    addOns: z.array(
      z.object({
        id: z.string().uuid().optional(),
        title: z.string().min(1, "Add-on title is required"),
        description: z.string().optional(),
        imageUrl: optionalUrl,
        price: z.coerce.number().positive(),
        maxQuantityPerBooking: optionalPositiveInteger,
        maxQuantityPerSlot: optionalPositiveInteger,
        purchaseCutoffOffsetDays: optionalNonnegativeInteger,
        isActive: z.boolean(),
      }),
    ),
    faqs: z.array(
      z.object({
        id: z.string().optional(),
        question: z.string().min(1, "Question is required"),
        answer: z.string().min(1, "Answer is required"),
      }),
    ),
    days: z
      .array(
        z.object({
          id: z.string().uuid().optional(),
          dayNumber: z.coerce.number().int().positive(),
          title: z.string().min(1, "Day title is required"),
          description: z.string().optional(),
          todos: z.array(z.object({ value: z.string().min(1) })),
          tasks: z.array(taskSchema),
        }),
      )
      .min(1),
  })
  .superRefine((values, context) => {
    values.packages.forEach((item, index) => {
      if (item.tokenAmount > item.price) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Booking amount cannot exceed package price",
          path: ["packages", index, "tokenAmount"],
        });
      }
    });
    const dayNumbers = new Set<number>();
    values.days.forEach((day, index) => {
      if (dayNumbers.has(day.dayNumber)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Each itinerary day number must be unique",
          path: ["days", index, "dayNumber"],
        });
      }
      dayNumbers.add(day.dayNumber);
    });
  });

type CircuitFormValues = z.infer<typeof circuitSchema>;

const STEPS = [
  "Foundation",
  "Pricing & add-ons",
  "Content & FAQs",
  "Media & Highlights",
  "Itinerary",
  "Operations",
];
const inputClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm";

function firstFormError(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (typeof record.message === "string" && record.message)
    return record.message;
  for (const child of Object.values(record)) {
    const message = firstFormError(child);
    if (message) return message;
  }
  return null;
}

const emptyCircuit = (): CircuitFormValues => ({
  title: "",
  tripType: "MOUNTAIN_TREK",
  location: "",
  destinationId: "",
  overview: "",
  bestTimeToVisit: "",
  duration: 1,
  operationsReminderDays: 3,
  isActive: true,
  internalNotes: "",
  bannerImages: [],
  stayTransportImages: [],
  highlights: [],
  faqs: [],
  inclusions: [{ value: "" }],
  exclusions: [{ value: "" }],
  tagIds: [],
  packages: [{ title: "Standard", price: 1, tokenAmount: 0 }],
  addOns: [],
  days: [{ dayNumber: 1, title: "", description: "", todos: [], tasks: [] }],
});

const toFormValues = (circuit: any): CircuitFormValues => ({
  title: circuit.title || "",
  tripType: circuit.tripType || "MOUNTAIN_TREK",
  location: circuit.location || "",
  destinationId: circuit.destinationId || "",
  overview: circuit.overview || "",
  bestTimeToVisit: circuit.bestTimeToVisit || "",
  duration: Number(circuit.duration || 1),
  operationsReminderDays: Number(circuit.operationsReminderDays ?? 3),
  isActive: circuit.isActive ?? true,
  internalNotes: circuit.internalNotes || "",
  bannerImages: (circuit.bannerImages || []).map((value: string) => ({
    value,
  })),
  stayTransportImages: Array.isArray(circuit.stayTransportImages)
    ? circuit.stayTransportImages.map((h: any) => ({
        text: h.text || "",
        imageUrl: h.imageUrl || "",
      }))
    : [],
  highlights: (circuit.highlights || []).map((h: any) => ({
    text: h.text || "",
    imageUrl: h.imageUrl || "",
  })),
  faqs: (circuit.faqs || []).map((f: any) => ({
    id: f.id,
    question: f.question,
    answer: f.answer,
  })),
  inclusions: (circuit.inclusions || []).map((value: string) => ({ value })),
  exclusions: (circuit.exclusions || []).map((value: string) => ({ value })),
  tagIds: (circuit.tags || []).map((tag: any) => tag.id),
  packages: (circuit.packages || []).map((item: any) => ({
    id: item.id,
    title: item.title,
    price: Number(item.price),
    tokenAmount: Number(item.tokenAmount),
  })),
  addOns: (circuit.addOns || []).map((item: any) => ({
    id: item.id,
    title: item.title,
    description: item.description || "",
    imageUrl: item.imageUrl || "",
    price: Number(item.price),
    maxQuantityPerBooking: item.maxQuantityPerBooking ?? undefined,
    maxQuantityPerSlot: item.maxQuantityPerSlot ?? undefined,
    purchaseCutoffOffsetDays: item.purchaseCutoffOffsetDays ?? undefined,
    isActive: item.isActive ?? true,
  })),
  days: (circuit.days || []).map((day: any) => ({
    id: day.id,
    dayNumber: day.dayNumber,
    title: day.title,
    description: day.description || "",
    todos: (day.todos || []).map((value: string) => ({ value })),
    tasks: (day.tasks || []).map((task: any) => ({
      id: task.id,
      category: task.category,
      title: task.title,
      description: task.description || "",
      unitPrice:
        task.unitPrice == null ? undefined : Number(task.unitPrice),
      quantityNeeded:
        task.quantityNeeded == null ? undefined : Number(task.quantityNeeded),
      dueOffsetDays: task.dueOffsetDays ?? undefined,
    })),
  })),
});

function ErrorText({ message }: { message?: string }) {
  return message ? (
    <p className="mt-1 text-xs text-red-600">{message}</p>
  ) : null;
}

export default function CircuitFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id && id !== "new");

  const {
    data: circuit,
    isLoading: isLoadingCircuit,
    isError: isCircuitError,
  } = useQuery({
    queryKey: ["admin", "circuits", id],
    queryFn: async () => (await apiClient.get(`/circuits/${id}`)).data,
    enabled: isEditing,
  });
  const [step, setStep] = useState(0);
  const [canSubmit, setCanSubmit] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingImageKey, setUploadingImageKey] = useState<string | null>(
    null,
  );
  const [newTagValue, setNewTagValue] = useState("");
  const queryClient = useQueryClient();
  const form = useForm<CircuitFormValues>({
    resolver: zodResolver(circuitSchema) as any,
    defaultValues: emptyCircuit(),
    mode: "onTouched",
  });

  const destinationsQuery = useQuery({
    queryKey: ["admin", "destinations"],
    queryFn: async () =>
      (
        await apiClient.get("/destinations", {
          params: { adminView: true, limit: 200 },
        })
      ).data,
  });
  const tagsQuery = useQuery({
    queryKey: ["trip-tags"],
    queryFn: async () =>
      (await apiClient.get("/trip-tags", { params: { limit: 200 } })).data,
  });

  const createTagMutation = useMutation({
    mutationFn: async (tag: string) =>
      (await apiClient.post("/trip-tags", { tag })).data,
    onSuccess: (newTag) => {
      queryClient.invalidateQueries({ queryKey: ["trip-tags"] });
      form.setValue(
        "tagIds",
        [...(form.getValues("tagIds") || []), newTag.id],
        { shouldDirty: true },
      );
      setNewTagValue("");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to create tag");
    },
  });

  const inclusions = useFieldArray({
    control: form.control,
    name: "inclusions",
  });
  const exclusions = useFieldArray({
    control: form.control,
    name: "exclusions",
  });
  const banners = useFieldArray({
    control: form.control,
    name: "bannerImages",
  });
  const highlights = useFieldArray({
    control: form.control,
    name: "highlights",
  });
  const packages = useFieldArray({ control: form.control, name: "packages" });
  const addOns = useFieldArray({ control: form.control, name: "addOns" });
  const {
    fields: faqs,
    append: appendFaq,
    remove: removeFaq,
    swap: swapFaq,
  } = useFieldArray({ control: form.control, name: "faqs" });
  const days = useFieldArray({ control: form.control, name: "days" });
  const watchedDays = form.watch("days");

  useEffect(() => {
    if (isEditing && !circuit) return;

    let values = emptyCircuit();
    const draftKey = `circuit_form_draft_${id || "new"}`;
    const draft = localStorage.getItem(draftKey);

    if (isEditing && circuit) {
      values = toFormValues(circuit);
    } else if (draft) {
      try {
        values = JSON.parse(draft);
      } catch (e) {
        console.error("Failed to parse circuit draft", e);
      }
    }

    if (!values.inclusions.length) values.inclusions = [{ value: "" }];
    if (!values.exclusions.length) values.exclusions = [{ value: "" }];
    if (!values.packages.length)
      values.packages = [{ title: "Standard", price: 1, tokenAmount: 0 }];
    if (!values.days.length)
      values.days = [
        { dayNumber: 1, title: "", description: "", todos: [], tasks: [] },
      ];
    form.reset(values);
    setStep(0);
  }, [circuit, form, isEditing, id]);

  const saveDraft = () => {
    const values = form.getValues();
    const draftKey = `circuit_form_draft_${id || "new"}`;
    localStorage.setItem(draftKey, JSON.stringify(values));
    toast.success("Draft saved locally");
  };
  useEffect(() => {
    if (destinationsQuery.isError)
      toast.error(
        getErrorMessage(
          destinationsQuery.error,
          "Destinations could not be loaded",
        ),
        { id: "circuit-destinations-error" },
      );
    if (tagsQuery.isError)
      toast.error(
        getErrorMessage(tagsQuery.error, "Tags could not be loaded"),
        { id: "circuit-tags-error" },
      );
  }, [
    destinationsQuery.error,
    destinationsQuery.isError,
    tagsQuery.error,
    tagsQuery.isError,
  ]);

  const destinations = destinationsQuery.data?.data || [];
  const availableTags = Array.isArray(tagsQuery.data)
    ? tagsQuery.data
    : tagsQuery.data?.data || [];
  const selectedTags = form.watch("tagIds");

  const stepFields = useMemo<(keyof CircuitFormValues)[][]>(
    () => [
      [
        "title",
        "tripType",
        "location",
        "destinationId",
        "bestTimeToVisit",
        "duration",
        "isActive",
      ],
      ["packages", "addOns"],
      [
        "overview",
        "inclusions",
        "exclusions",
        "faqs",
        "tagIds",
        "internalNotes",
      ],
      ["bannerImages", "stayTransportImages", "highlights"],
      ["days"],
      ["days", "operationsReminderDays"],
    ],
    [],
  );

  const next = async () => {
    let fieldsToTrigger: any = stepFields[step];
    if (step === 4) {
      const daysCount = form.getValues("days")?.length || 0;
      fieldsToTrigger = [];
      for (let i = 0; i < daysCount; i++) {
        fieldsToTrigger.push(`days.${i}.dayNumber`);
        fieldsToTrigger.push(`days.${i}.title`);
        fieldsToTrigger.push(`days.${i}.description`);
        fieldsToTrigger.push(`days.${i}.todos`);
      }
    }

    if (await form.trigger(fieldsToTrigger)) {
      setStep((value) => {
        const next = Math.min(STEPS.length - 1, value + 1);
        if (next === STEPS.length - 1) {
          setCanSubmit(false);
          setTimeout(() => setCanSubmit(true), 500);
        }
        return next;
      });
    } else
      toast.error("Please fix the highlighted fields before continuing.", {
        description:
          firstFormError(form.formState.errors) ||
          "Review the required fields on this step.",
      });
  };

  const setDayItems = (
    dayIndex: number,
    key: "todos" | "tasks",
    values: any[],
  ) => {
    form.setValue(`days.${dayIndex}.${key}` as any, values, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const onSubmit = async (values: CircuitFormValues) => {
    if (step !== STEPS.length - 1) return;
    setIsSubmitting(true);
    try {
      const payload = {
        ...values,
        destinationId: values.destinationId || undefined,
        internalNotes: values.internalNotes || undefined,
        bannerImages: values.bannerImages.map((item) => item.value),
        highlights: values.highlights,
        inclusions: values.inclusions.map((item) => item.value),
        exclusions: values.exclusions.map((item) => item.value),
        days: values.days.map((day) => ({
          ...day,
          description: day.description || undefined,
          todos: day.todos.map((item) => item.value),
          tasks: day.tasks.map((task) => ({
            ...task,
            description: task.description || undefined,
            config: {},
          })),
        })),
        addOns: values.addOns.map((item) => ({
          ...item,
          description: item.description || undefined,
          imageUrl: item.imageUrl || undefined,
        })),
        stayTransportImages: values.stayTransportImages,
      };

      if (circuit?.id) await apiClient.put(`/circuits/${circuit.id}`, payload);
      else await apiClient.post("/circuits", payload);

      const draftKey = `circuit_form_draft_${id || "new"}`;
      localStorage.removeItem(draftKey);

      toast.success(
        circuit ? "Circuit template updated" : "Circuit template created",
      );
      await queryClient.invalidateQueries({ queryKey: ["admin", "circuits"] });
      navigate("/dashboard/circuits");
    } catch (error: unknown) {
      showErrorToast(
        error,
        circuit
          ? "Could not update the circuit"
          : "Could not create the circuit",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === "Enter" && (e.target as HTMLElement).tagName !== "TEXTAREA") {
      e.preventDefault();
    }
  };

  if (isEditing && isLoadingCircuit)
    return <div className="p-8 text-gray-500">Loading circuit...</div>;
  if (isCircuitError)
    return <div className="p-8 text-red-500">Failed to load circuit</div>;

  return (
    <div className="w-full max-w-5xl mx-auto py-8 px-4">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <button
            type="button"
            onClick={() => navigate("/dashboard/circuits")}
            className="text-gray-500 hover:text-gray-900 mb-2 flex items-center text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to circuits
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            {circuit ? "Edit circuit template" : "Create circuit template"}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <Button type="button" variant="outline" onClick={saveDraft}>
            Save Draft
          </Button>
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="border-b px-4 py-4 sm:px-6">
          <div className="p-6 sm:p-8">
            <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
              {STEPS.map((label, index) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => index < step && setStep(index)}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${index === step ? "bg-[#781216] text-white" : index < step ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-500"}`}
                >
                  {index + 1}. {label}
                </button>
              ))}
            </div>
          </div>

          <form
            onSubmit={form.handleSubmit(onSubmit, (errors) =>
              toast.error("Please fix the highlighted errors.", {
                description:
                  firstFormError(errors) || "Review the required fields.",
              }),
            )}
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 custom-scrollbar scroll-smooth">
              {step === 0 && (
                <div className="space-y-5">
                  <div className="rounded-xl border border-[#e8d9b7] bg-[#fbf7ed] p-4 text-sm text-[#6d541f]">
                    This is the reusable baseline. Dates belong to trips, not
                    circuits.
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-2 block">
                        Title *
                      </Label>
                      <Input
                        className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#b59410]/50 focus:border-[#b59410] transition-colors shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                        {...form.register("title")}
                        placeholder="Tawang Explorer"
                      />
                      <ErrorText
                        message={form.formState.errors.title?.message}
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-2 block">
                        Trip type *
                      </Label>
                      <select
                        {...form.register("tripType")}
                        className={inputClass}
                      >
                        {TRIP_TYPES.map((value) => (
                          <option key={value} value={value}>
                            {formatTripType(value)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-2 block">
                        Location *
                      </Label>
                      <Input
                        className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#b59410]/50 focus:border-[#b59410] transition-colors shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                        {...form.register("location")}
                        placeholder="Arunachal Pradesh"
                      />
                      <ErrorText
                        message={form.formState.errors.location?.message}
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-2 block">
                        Destination
                      </Label>
                      <select
                        {...form.register("destinationId")}
                        className={inputClass}
                      >
                        <option value="">No linked destination</option>
                        {destinations.map((item: any) => (
                          <option key={item.id} value={item.id}>
                            {item.name}, {item.state}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-2 block">
                        Best time to visit *
                      </Label>
                      <Input
                        className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#b59410]/50 focus:border-[#b59410] transition-colors shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                        {...form.register("bestTimeToVisit")}
                        placeholder="March to June"
                      />
                      <ErrorText
                        message={form.formState.errors.bestTimeToVisit?.message}
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-2 block">
                        Duration (days) *
                      </Label>
                      <Input
                        className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#b59410]/50 focus:border-[#b59410] transition-colors shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                        type="number"
                        min={1}
                        {...form.register("duration")}
                      />
                      <ErrorText
                        message={form.formState.errors.duration?.message}
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-2 block">
                        Operations reminder lead (days)
                      </Label>
                      <Input
                        className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#b59410]/50 focus:border-[#b59410] transition-colors shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                        type="number"
                        min={0}
                        {...form.register("operationsReminderDays")}
                      />
                      <ErrorText
                        message={
                          form.formState.errors.operationsReminderDays?.message
                        }
                      />
                    </div>
                  </div>
                  <label className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-2 flex items-center gap-2">
                    <input
                      type="checkbox"
                      {...form.register("isActive")}
                      className="h-4 w-4 accent-[#781216]"
                    />
                    Circuit is active
                  </label>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-7">
                  <section>
                    <div className="mb-3 flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">Packages</h3>
                        <p className="text-xs text-gray-500">
                          These are copied to every trip created from this
                          circuit.
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          packages.append({
                            title: "",
                            price: 1,
                            tokenAmount: 0,
                          })
                        }
                      >
                        <Plus className="mr-1 h-4 w-4" />
                        Package
                      </Button>
                    </div>
                    <div className="space-y-3">
                      {packages.fields.map((field, index) => (
                        <div
                          key={field.id}
                          className="flex gap-4 items-start rounded-xl border bg-gray-50 p-4"
                        >
                          <div className="flex-1 grid gap-3 md:grid-cols-[1fr_180px_180px]">
                            <div>
                              <Label className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-2 block">
                                Name
                              </Label>
                              <Input
                                className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#b59410]/50 focus:border-[#b59410] transition-colors shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                                {...form.register(`packages.${index}.title`)}
                              />
                              <ErrorText
                                message={
                                  form.formState.errors.packages?.[index]?.title
                                    ?.message
                                }
                              />
                            </div>
                            <div>
                              <Label className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-2 block">
                                Price
                              </Label>
                              <Input
                                className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#b59410]/50 focus:border-[#b59410] transition-colors shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                                type="number"
                                min={0.01}
                                step="0.01"
                                {...form.register(`packages.${index}.price`)}
                              />
                              <ErrorText
                                message={
                                  form.formState.errors.packages?.[index]?.price
                                    ?.message
                                }
                              />
                            </div>
                            <div>
                              <Label className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-2 block">
                                Booking amount
                              </Label>
                              <Input
                                className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#b59410]/50 focus:border-[#b59410] transition-colors shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                                type="number"
                                min={0}
                                step="0.01"
                                {...form.register(
                                  `packages.${index}.tokenAmount`,
                                )}
                              />
                              <ErrorText
                                message={
                                  form.formState.errors.packages?.[index]
                                    ?.tokenAmount?.message
                                }
                              />
                            </div>
                          </div>
                          <div className="flex flex-col gap-1 shrink-0 pt-6">
                            <div className="flex items-center gap-1">
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                disabled={index === 0}
                                onClick={() => packages.swap(index, index - 1)}
                              >
                                <ArrowUp className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                disabled={index === packages.fields.length - 1}
                                onClick={() => packages.swap(index, index + 1)}
                              >
                                <ArrowDown className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-600"
                                disabled={packages.fields.length === 1}
                                onClick={() => packages.remove(index)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                  <section>
                    <div className="mb-3 flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">Optional add-ons</h3>
                        <p className="text-xs text-gray-500">
                          Travelers can add these while booking, before the
                          cutoff.
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          addOns.append({
                            title: "",
                            description: "",
                            imageUrl: "",
                            price: 1,
                            maxQuantityPerBooking: 1,
                            maxQuantityPerSlot: 10,
                            purchaseCutoffOffsetDays: 3,
                            isActive: true,
                          })
                        }
                      >
                        <Plus className="mr-1 h-4 w-4" />
                        Add-on
                      </Button>
                    </div>
                    {addOns.fields.length === 0 ? (
                      <div className="rounded-xl border border-dashed p-6 text-center text-sm text-gray-500">
                        No add-ons configured.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {addOns.fields.map((field, index) => {
                          const currentUrl = form.watch(
                            `addOns.${index}.imageUrl`,
                          );
                          return (
                            <div
                              key={field.id}
                              className="rounded-xl border bg-gray-50 p-5 flex flex-col md:flex-row gap-6"
                            >
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
                                        form.setValue(
                                          `addOns.${index}.imageUrl`,
                                          "",
                                          {
                                            shouldDirty: true,
                                            shouldValidate: true,
                                          },
                                        )
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
                                      {uploadingImageKey === `addOns.${index}`
                                        ? "Uploading..."
                                        : "Upload"}
                                    </span>
                                    <input
                                      type="file"
                                      className="hidden"
                                      accept="image/*"
                                      disabled={
                                        uploadingImageKey === `addOns.${index}`
                                      }
                                      onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;
                                        setUploadingImageKey(`addOns.${index}`);
                                        try {
                                          const url =
                                            await uploadGenericImageDirect(
                                              file,
                                            );
                                          form.setValue(
                                            `addOns.${index}.imageUrl`,
                                            url,
                                            {
                                              shouldDirty: true,
                                              shouldValidate: true,
                                            },
                                          );
                                          toast.success(
                                            "Image uploaded successfully",
                                          );
                                        } catch (err: any) {
                                          toast.error(
                                            err.message ||
                                              "Failed to upload image",
                                          );
                                        } finally {
                                          setUploadingImageKey(null);
                                        }
                                      }}
                                    />
                                  </label>
                                )}
                                <ErrorText
                                  message={
                                    form.formState.errors.addOns?.[index]
                                      ?.imageUrl?.message
                                  }
                                />
                              </div>
                              <div className="flex-1 space-y-4">
                                <div className="flex items-start gap-4">
                                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                      <Label className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-2 block">
                                        Title
                                      </Label>
                                      <Input
                                        className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#b59410]/50 focus:border-[#b59410] transition-colors shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                                        {...form.register(
                                          `addOns.${index}.title`,
                                        )}
                                      />
                                      <ErrorText
                                        message={
                                          form.formState.errors.addOns?.[index]
                                            ?.title?.message
                                        }
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-2 block">
                                        Price
                                      </Label>
                                      <Input
                                        className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#b59410]/50 focus:border-[#b59410] transition-colors shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                                        type="number"
                                        min={0.01}
                                        step="0.01"
                                        {...form.register(
                                          `addOns.${index}.price`,
                                        )}
                                      />
                                      <ErrorText
                                        message={
                                          form.formState.errors.addOns?.[index]
                                            ?.price?.message
                                        }
                                      />
                                    </div>
                                  </div>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => addOns.remove(index)}
                                    className="text-red-600 mt-6 shrink-0 hover:bg-red-50 hover:text-red-700 transition-colors"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                                <div>
                                  <Label className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-2 block">
                                    Description
                                  </Label>
                                  <Textarea
                                    className="flex min-h-[80px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#b59410]/50 focus:border-[#b59410] transition-colors shadow-sm resize-y disabled:cursor-not-allowed disabled:opacity-50"
                                    rows={2}
                                    {...form.register(
                                      `addOns.${index}.description`,
                                    )}
                                  />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                  <div>
                                    <Label className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-2 block">
                                      Max Qty (Per Booking)
                                    </Label>
                                    <Input
                                      className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#b59410]/50 focus:border-[#b59410] transition-colors shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                                      type="number"
                                      min={1}
                                      step={1}
                                      {...form.register(
                                        `addOns.${index}.maxQuantityPerBooking`,
                                      )}
                                    />
                                    <ErrorText
                                      message={
                                        form.formState.errors.addOns?.[index]
                                          ?.maxQuantityPerBooking?.message
                                      }
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-2 block">
                                      Max Qty (Total / Slot)
                                    </Label>
                                    <Input
                                      className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#b59410]/50 focus:border-[#b59410] transition-colors shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                                      type="number"
                                      min={1}
                                      step={1}
                                      {...form.register(
                                        `addOns.${index}.maxQuantityPerSlot`,
                                      )}
                                    />
                                    <ErrorText
                                      message={
                                        form.formState.errors.addOns?.[index]
                                          ?.maxQuantityPerSlot?.message
                                      }
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-2 block">
                                      Cutoff (days)
                                    </Label>
                                    <Input
                                      className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#b59410]/50 focus:border-[#b59410] transition-colors shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                                      type="number"
                                      min={0}
                                      step={1}
                                      {...form.register(
                                        `addOns.${index}.purchaseCutoffOffsetDays`,
                                      )}
                                    />
                                    <ErrorText
                                      message={
                                        form.formState.errors.addOns?.[index]
                                          ?.purchaseCutoffOffsetDays?.message
                                      }
                                    />
                                  </div>
                                  <div className="flex items-center sm:pt-6">
                                    <label className="text-xs font-bold tracking-widest text-gray-500 uppercase flex items-center gap-2 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        {...form.register(
                                          `addOns.${index}.isActive`,
                                        )}
                                        className="h-4 w-4 accent-[#781216] cursor-pointer"
                                      />
                                      Active
                                    </label>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </section>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6">
                  <div>
                    <Label className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-2 block">
                      Overview *
                    </Label>
                    <Textarea
                      className="flex min-h-[80px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#b59410]/50 focus:border-[#b59410] transition-colors shadow-sm resize-y disabled:cursor-not-allowed disabled:opacity-50"
                      rows={6}
                      {...form.register("overview")}
                    />
                    <ErrorText
                      message={form.formState.errors.overview?.message}
                    />
                  </div>
                  <div className="grid gap-6 md:grid-cols-2">
                    <section>
                      <div className="mb-2 flex items-center justify-between">
                        <Label className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-2 block">
                          Inclusions
                        </Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => inclusions.append({ value: "" })}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {inclusions.fields.map((field, index) => (
                          <div key={field.id} className="mb-2">
                            <div className="flex gap-2">
                              <Input
                                className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#b59410]/50 focus:border-[#b59410] transition-colors shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                                {...form.register(`inclusions.${index}.value`)}
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => inclusions.remove(index)}
                                className="text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                            <ErrorText
                              message={
                                form.formState.errors.inclusions?.[index]?.value
                                  ?.message
                              }
                            />
                          </div>
                        ))}
                      </div>
                    </section>
                    <section>
                      <div className="mb-2 flex items-center justify-between">
                        <Label className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-2 block">
                          Exclusions
                        </Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => exclusions.append({ value: "" })}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {exclusions.fields.map((field, index) => (
                          <div key={field.id} className="mb-2">
                            <div className="flex gap-2">
                              <Input
                                className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#b59410]/50 focus:border-[#b59410] transition-colors shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                                {...form.register(`exclusions.${index}.value`)}
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => exclusions.remove(index)}
                                className="text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                            <ErrorText
                              message={
                                form.formState.errors.exclusions?.[index]?.value
                                  ?.message
                              }
                            />
                          </div>
                        ))}
                      </div>
                    </section>
                  </div>
                  <section>
                    <Label className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-2 block">
                      Tags
                    </Label>
                    <div className="mt-2 flex flex-wrap gap-2 items-center">
                      {availableTags.map((tag: any) => {
                        const active = (selectedTags || []).includes(tag.id);
                        return (
                          <button
                            key={tag.id}
                            type="button"
                            onClick={() =>
                              form.setValue(
                                "tagIds",
                                active
                                  ? (selectedTags || []).filter(
                                      (id) => id !== tag.id,
                                    )
                                  : [...(selectedTags || []), tag.id],
                                { shouldDirty: true },
                              )
                            }
                            className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${active ? "border-[#781216] bg-[#781216] text-white" : "border-gray-200 bg-white text-gray-600"}`}
                          >
                            {tag.tag}
                          </button>
                        );
                      })}
                      <div className="flex items-center gap-1">
                        <Input
                          value={newTagValue}
                          onChange={(e) => setNewTagValue(e.target.value)}
                          placeholder="New tag..."
                          className="h-7 text-xs w-32 rounded-full px-3"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              if (
                                newTagValue.trim() &&
                                !createTagMutation.isPending
                              ) {
                                createTagMutation.mutate(newTagValue.trim());
                              }
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-full"
                          disabled={
                            !newTagValue.trim() || createTagMutation.isPending
                          }
                          onClick={() =>
                            createTagMutation.mutate(newTagValue.trim())
                          }
                        >
                          {createTagMutation.isPending ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Plus className="w-3 h-3" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </section>
                  <div>
                    <Label className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-2 block">
                      Internal Notes
                    </Label>
                    <Textarea
                      {...form.register("internalNotes")}
                      placeholder="Any private notes..."
                      rows={3}
                      className={inputClass}
                    />
                  </div>

                  <div className="space-y-3 pt-4 border-t">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-2 block text-base font-medium">
                        FAQs
                      </Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => appendFaq({ question: "", answer: "" })}
                      >
                        <Plus className="h-4 w-4 mr-2" /> Add FAQ
                      </Button>
                    </div>
                    {faqs.map((field, index) => (
                      <div
                        key={field.id}
                        className="group rounded-lg border bg-card p-4"
                      >
                        <div className="flex items-start gap-4">
                          <div className="flex-1 space-y-4">
                            <div>
                              <Label className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-2 block">
                                Question
                              </Label>
                              <Input
                                {...form.register(
                                  `faqs.${index}.question` as const,
                                )}
                                placeholder="e.g. What is the cancellation policy?"
                                className={inputClass}
                              />
                              <ErrorText
                                message={
                                  form.formState.errors.faqs?.[index]?.question
                                    ?.message
                                }
                              />
                            </div>
                            <div>
                              <Label className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-2 block">
                                Answer
                              </Label>
                              <Textarea
                                {...form.register(
                                  `faqs.${index}.answer` as const,
                                )}
                                placeholder="Enter the answer..."
                                rows={2}
                                className={inputClass}
                              />
                              <ErrorText
                                message={
                                  form.formState.errors.faqs?.[index]?.answer
                                    ?.message
                                }
                              />
                            </div>
                          </div>
                          <div className="flex flex-col gap-1 shrink-0 pt-6">
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              disabled={index === 0}
                              onClick={() => swapFaq(index, index - 1)}
                            >
                              <ArrowUp className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              disabled={index === faqs.length - 1}
                              onClick={() => swapFaq(index, index + 1)}
                            >
                              <ArrowDown className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-600"
                              onClick={() => removeFaq(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-6">
                  <section>
                    <div className="mb-3 flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">Banner Images</h3>
                        <p className="text-xs text-gray-500">
                          Add banner images for this circuit.
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => banners.append({ value: "" })}
                      >
                        <Plus className="mr-1 h-4 w-4" /> Add Banner
                      </Button>
                    </div>
                    <div className="space-y-3">
                      {banners.fields.map((field, index) => {
                        const currentUrl = form.watch(
                          `bannerImages.${index}.value`,
                        );
                        return (
                          <div
                            key={field.id}
                            className="flex items-center gap-3 rounded-xl border bg-gray-50 p-4"
                          >
                            {currentUrl ? (
                              <div className="relative group shrink-0">
                                <img
                                  src={currentUrl}
                                  alt=""
                                  className="h-16 w-24 rounded object-cover"
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    form.setValue(
                                      `bannerImages.${index}.value`,
                                      "",
                                      {
                                        shouldDirty: true,
                                        shouldValidate: true,
                                      },
                                    )
                                  }
                                  className="absolute -top-2 -right-2 hidden group-hover:flex items-center justify-center h-5 w-5 rounded-full bg-red-500 text-white shadow"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex h-16 w-24 items-center justify-center rounded bg-gray-200 text-gray-400">
                                <ImagePlus className="h-6 w-6" />
                              </div>
                            )}
                            <div className="flex-1 flex items-center h-16">
                              <input
                                type="hidden"
                                {...form.register(
                                  `bannerImages.${index}.value`,
                                )}
                              />
                              <label
                                className={`text-sm font-bold tracking-widest text-gray-700 uppercase flex items-center gap-2 ${uploadingImageKey === `bannerImages.${index}` ? "opacity-70 cursor-not-allowed" : "cursor-pointer hover:text-gray-900 transition-colors"}`}
                              >
                                {uploadingImageKey ===
                                `bannerImages.${index}` ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <ImagePlus className="h-4 w-4" />
                                )}
                                <span>
                                  {uploadingImageKey === `bannerImages.${index}`
                                    ? "Uploading..."
                                    : "Upload New Image"}
                                </span>
                                <input
                                  type="file"
                                  className="hidden"
                                  accept="image/*"
                                  disabled={
                                    uploadingImageKey ===
                                    `bannerImages.${index}`
                                  }
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    setUploadingImageKey(
                                      `bannerImages.${index}`,
                                    );
                                    try {
                                      const url =
                                        await uploadGenericImageDirect(file);
                                      form.setValue(
                                        `bannerImages.${index}.value`,
                                        url,
                                        {
                                          shouldDirty: true,
                                          shouldValidate: true,
                                        },
                                      );
                                      toast.success(
                                        "Image uploaded successfully",
                                      );
                                    } catch (err: any) {
                                      toast.error(
                                        err.message || "Failed to upload image",
                                      );
                                    } finally {
                                      setUploadingImageKey(null);
                                    }
                                  }}
                                />
                              </label>
                              <ErrorText
                                message={
                                  form.formState.errors.bannerImages?.[index]
                                    ?.value?.message
                                }
                              />
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => banners.remove(index)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </section>

                  <div className="space-y-3 pt-6 border-t">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-2 block text-base font-medium">
                        Stay & Transport Images
                      </Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const current =
                            form.getValues("stayTransportImages") || [];
                          form.setValue("stayTransportImages", [
                            ...current,
                            { text: "", imageUrl: "" },
                          ]);
                        }}
                      >
                        <Plus className="h-4 w-4 mr-2" /> Add Image
                      </Button>
                    </div>
                    {((form.watch("stayTransportImages") || []) as any[]).map(
                      (field, index) => {
                        const currentUrl = form.watch(
                          `stayTransportImages.${index}.imageUrl`,
                        );
                        return (
                          <div
                            key={index}
                            className="flex items-center gap-3 rounded-xl border bg-gray-50 p-4"
                          >
                            {currentUrl ? (
                              <div className="relative group shrink-0">
                                <img
                                  src={currentUrl}
                                  alt=""
                                  className="h-16 w-24 rounded object-cover"
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    form.setValue(
                                      `stayTransportImages.${index}.imageUrl`,
                                      "",
                                      {
                                        shouldDirty: true,
                                        shouldValidate: true,
                                      },
                                    )
                                  }
                                  className="absolute -top-2 -right-2 hidden group-hover:flex items-center justify-center h-5 w-5 rounded-full bg-red-500 text-white shadow"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex h-16 w-24 items-center justify-center rounded bg-gray-200 text-gray-400">
                                <ImagePlus className="h-6 w-6" />
                              </div>
                            )}
                            <div className="flex flex-col gap-2 w-48 shrink-0 justify-center">
                              <input
                                type="hidden"
                                {...form.register(
                                  `stayTransportImages.${index}.imageUrl`,
                                )}
                              />
                              <label
                                className={`text-xs font-bold tracking-widest text-gray-700 uppercase flex items-center gap-2 ${uploadingImageKey === `stayTransportImages.${index}` ? "opacity-70 cursor-not-allowed" : "cursor-pointer hover:text-gray-900 transition-colors"}`}
                              >
                                {uploadingImageKey ===
                                `stayTransportImages.${index}` ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <ImagePlus className="h-4 w-4" />
                                )}
                                <span>
                                  {uploadingImageKey ===
                                  `stayTransportImages.${index}`
                                    ? "Uploading..."
                                    : "Upload Image"}
                                </span>
                                <input
                                  type="file"
                                  className="hidden"
                                  accept="image/*"
                                  disabled={
                                    uploadingImageKey ===
                                    `stayTransportImages.${index}`
                                  }
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    setUploadingImageKey(
                                      `stayTransportImages.${index}`,
                                    );
                                    try {
                                      const url =
                                        await uploadGenericImageDirect(file);
                                      form.setValue(
                                        `stayTransportImages.${index}.imageUrl`,
                                        url,
                                        {
                                          shouldDirty: true,
                                          shouldValidate: true,
                                        },
                                      );
                                      toast.success(
                                        "Image uploaded successfully",
                                      );
                                    } catch (err: any) {
                                      toast.error(
                                        err.message || "Failed to upload image",
                                      );
                                    } finally {
                                      setUploadingImageKey(null);
                                    }
                                  }}
                                />
                              </label>
                              <ErrorText
                                message={
                                  form.formState.errors.stayTransportImages?.[
                                    index
                                  ]?.imageUrl?.message
                                }
                              />
                            </div>
                            <div className="flex-1 space-y-1">
                              <Input
                                {...form.register(
                                  `stayTransportImages.${index}.text`,
                                )}
                                placeholder="Caption (optional)..."
                                className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#b59410]/50 focus:border-[#b59410] transition-colors shadow-sm"
                              />
                              <ErrorText
                                message={
                                  form.formState.errors.stayTransportImages?.[
                                    index
                                  ]?.text?.message
                                }
                              />
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="shrink-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => {
                                const current =
                                  form.getValues("stayTransportImages") || [];
                                form.setValue(
                                  "stayTransportImages",
                                  current.filter((_, i) => i !== index),
                                );
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        );
                      },
                    )}
                  </div>

                  <div className="space-y-3 pt-6 border-t">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-2 block text-base font-medium">
                          Highlights
                        </Label>
                        <p className="text-xs text-gray-500">
                          Key highlights and their associated icons/images.
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          highlights.append({ text: "", imageUrl: "" })
                        }
                      >
                        <Plus className="mr-1 h-4 w-4" /> Add Highlight
                      </Button>
                    </div>
                    <div className="space-y-3">
                      {highlights.fields.map((field, index) => {
                        const currentUrl = form.watch(
                          `highlights.${index}.imageUrl`,
                        );
                        return (
                          <div
                            key={field.id}
                            className="flex items-center gap-3 rounded-xl border bg-gray-50 p-4"
                          >
                            {currentUrl ? (
                              <div className="relative group shrink-0">
                                <img
                                  src={currentUrl}
                                  alt=""
                                  className="h-12 w-12 rounded-lg object-cover"
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    form.setValue(
                                      `highlights.${index}.imageUrl`,
                                      "",
                                      {
                                        shouldDirty: true,
                                        shouldValidate: true,
                                      },
                                    )
                                  }
                                  className="absolute -top-2 -right-2 hidden group-hover:flex items-center justify-center h-4 w-4 rounded-full bg-red-500 text-white shadow"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-200 text-gray-400">
                                <ImagePlus className="h-5 w-5" />
                              </div>
                            )}
                            <div className="w-auto shrink-0 flex items-center">
                              <input
                                type="hidden"
                                {...form.register(
                                  `highlights.${index}.imageUrl`,
                                )}
                              />
                              <label
                                className={`text-xs font-bold tracking-widest text-gray-700 uppercase flex items-center gap-2 ${uploadingImageKey === `highlights.${index}` ? "opacity-70 cursor-not-allowed" : "cursor-pointer hover:text-gray-900 transition-colors"}`}
                              >
                                {uploadingImageKey === `highlights.${index}` ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <ImagePlus className="h-4 w-4" />
                                )}
                                <span>
                                  {uploadingImageKey === `highlights.${index}`
                                    ? "Uploading..."
                                    : "Upload"}
                                </span>
                                <input
                                  type="file"
                                  className="hidden"
                                  accept="image/*"
                                  disabled={
                                    uploadingImageKey === `highlights.${index}`
                                  }
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    setUploadingImageKey(`highlights.${index}`);
                                    try {
                                      const url =
                                        await uploadGenericImageDirect(file);
                                      form.setValue(
                                        `highlights.${index}.imageUrl`,
                                        url,
                                        {
                                          shouldDirty: true,
                                          shouldValidate: true,
                                        },
                                      );
                                      toast.success(
                                        "Image uploaded successfully",
                                      );
                                    } catch (err: any) {
                                      toast.error(
                                        err.message || "Failed to upload image",
                                      );
                                    } finally {
                                      setUploadingImageKey(null);
                                    }
                                  }}
                                />
                              </label>
                              <ErrorText
                                message={
                                  form.formState.errors.highlights?.[index]
                                    ?.imageUrl?.message
                                }
                              />
                            </div>
                            <div className="flex-1">
                              <Input
                                className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#b59410]/50 focus:border-[#b59410] transition-colors shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                                {...form.register(`highlights.${index}.text`)}
                                placeholder="Highlight description"
                              />
                              <ErrorText
                                message={
                                  form.formState.errors.highlights?.[index]
                                    ?.text?.message
                                }
                              />
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => highlights.remove(index)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold">Day-by-Day Itinerary</h3>
                      <p className="text-sm text-gray-500">
                        What the traveler sees for each day of the circuit.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        days.append({
                          dayNumber: days.fields.length + 1,
                          title: "",
                          description: "",
                          todos: [],
                          tasks: [],
                        })
                      }
                    >
                      <Plus className="mr-1 h-4 w-4" /> Add Day
                    </Button>
                  </div>
                  {days.fields.map((field, dayIndex) => {
                    const day = watchedDays?.[dayIndex] || {};
                    return (
                      <section
                        key={field.id}
                        className="rounded-2xl border bg-white p-4 shadow-sm sm:p-5"
                      >
                        <div className="grid gap-3 md:grid-cols-[110px_1fr_auto]">
                          <div>
                            <Label className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-2 block">
                              Day
                            </Label>
                            <Input
                              className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#b59410]/50 focus:border-[#b59410] transition-colors shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                              type="number"
                              min={1}
                              step={1}
                              {...form.register(`days.${dayIndex}.dayNumber`)}
                            />
                            <ErrorText
                              message={
                                form.formState.errors.days?.[dayIndex]
                                  ?.dayNumber?.message
                              }
                            />
                          </div>
                          <div>
                            <Label className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-2 block">
                              Title
                            </Label>
                            <Input
                              className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#b59410]/50 focus:border-[#b59410] transition-colors shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                              {...form.register(`days.${dayIndex}.title`)}
                            />
                            <ErrorText
                              message={
                                form.formState.errors.days?.[dayIndex]?.title
                                  ?.message
                              }
                            />
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            disabled={days.fields.length === 1}
                            onClick={() => days.remove(dayIndex)}
                            className="self-end text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="mt-3">
                          <Label className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-2 block">
                            Description
                          </Label>
                          <Textarea
                            className="flex min-h-[80px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#b59410]/50 focus:border-[#b59410] transition-colors shadow-sm resize-y disabled:cursor-not-allowed disabled:opacity-50"
                            rows={3}
                            {...form.register(`days.${dayIndex}.description`)}
                          />
                        </div>
                        <div className="mt-4">
                          <div className="mb-2 flex items-center justify-between">
                            <Label className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-2 block">
                              Traveler-facing checklist (Optional)
                            </Label>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setDayItems(dayIndex, "todos", [
                                  ...(day.todos || []),
                                  { value: "" },
                                ])
                              }
                            >
                              <Plus className="mr-1 h-4 w-4" /> Item
                            </Button>
                          </div>
                          {(day.todos || []).map(
                            (_: any, todoIndex: number) => (
                              <div key={todoIndex} className="mb-2">
                                <div className="flex gap-2">
                                  <Input
                                    className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#b59410]/50 focus:border-[#b59410] transition-colors shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                                    {...form.register(
                                      `days.${dayIndex}.todos.${todoIndex}.value`,
                                    )}
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() =>
                                      setDayItems(
                                        dayIndex,
                                        "todos",
                                        (day.todos || []).filter(
                                          (_: any, index: number) =>
                                            index !== todoIndex,
                                        ),
                                      )
                                    }
                                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                                <ErrorText
                                  message={
                                    form.formState.errors.days?.[dayIndex]
                                      ?.todos?.[todoIndex]?.value?.message
                                  }
                                />
                              </div>
                            ),
                          )}
                        </div>
                      </section>
                    );
                  })}
                </div>
              )}

              {step === 5 && (
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold">Operations & Tasks</h3>
                      <p className="text-sm text-gray-500">
                        Internal operational tasks and templates to be
                        materialized on departure.
                      </p>
                    </div>
                  </div>
                  {days.fields.map((field, dayIndex) => {
                    const day = watchedDays?.[dayIndex] || {};
                    return (
                      <section
                        key={field.id}
                        className="rounded-xl border border-[#eadcb9] bg-[#fcf8ef] p-4 sm:p-5"
                      >
                        <div className="mb-3 flex items-center justify-between border-b border-[#e1cf9d] pb-3">
                          <div className="flex items-center gap-2">
                            <ClipboardList className="h-5 w-5 text-[#8a6414]" />
                            <h4 className="font-semibold text-[#8a6414]">
                              Day {day.dayNumber || dayIndex + 1}{" "}
                              {day.title ? `- ${day.title}` : ""}
                            </h4>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setDayItems(dayIndex, "tasks", [
                                ...(day.tasks || []),
                                {
                                  category: "GENERAL",
                                  title: "",
                                  description: "",
                                  unitPrice: undefined,
                                  quantityNeeded: undefined,
                                  dueOffsetDays: undefined,
                                },
                              ])
                            }
                          >
                            <Plus className="mr-1 h-4 w-4" /> Add Task
                          </Button>
                        </div>
                        {(day.tasks || []).length === 0 ? (
                          <p className="text-sm text-gray-500 italic">
                            No operational work configured for this day.
                          </p>
                        ) : (
                          (day.tasks || []).map((_: any, taskIndex: number) => (
                            <div
                              key={taskIndex}
                              className="mb-3 grid gap-2 rounded-lg border bg-white p-3 md:grid-cols-2 shadow-sm"
                            >
                              <div>
                                <Label className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-2 block">
                                  Category
                                </Label>
                                <select
                                  {...form.register(
                                    `days.${dayIndex}.tasks.${taskIndex}.category`,
                                  )}
                                  className={inputClass}
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
                                  {...form.register(
                                    `days.${dayIndex}.tasks.${taskIndex}.title`,
                                  )}
                                />
                                <ErrorText
                                  message={
                                    form.formState.errors.days?.[dayIndex]
                                      ?.tasks?.[taskIndex]?.title?.message
                                  }
                                />
                              </div>
                              <div className="md:col-span-2">
                                <Label className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-2 block">
                                  Description
                                </Label>
                                <Input
                                  className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#b59410]/50 focus:border-[#b59410] transition-colors shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                                  {...form.register(
                                    `days.${dayIndex}.tasks.${taskIndex}.description`,
                                  )}
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
                                  {...form.register(
                                    `days.${dayIndex}.tasks.${taskIndex}.unitPrice`,
                                  )}
                                />
                                <ErrorText
                                  message={
                                    form.formState.errors.days?.[dayIndex]
                                      ?.tasks?.[taskIndex]?.unitPrice
                                      ?.message
                                  }
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
                                  {...form.register(
                                    `days.${dayIndex}.tasks.${taskIndex}.quantityNeeded`,
                                  )}
                                />
                                <ErrorText
                                  message={
                                    form.formState.errors.days?.[dayIndex]
                                      ?.tasks?.[taskIndex]?.quantityNeeded
                                      ?.message
                                  }
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
                                    {...form.register(
                                      `days.${dayIndex}.tasks.${taskIndex}.dueOffsetDays`,
                                    )}
                                  />
                                  <ErrorText
                                    message={
                                      form.formState.errors.days?.[dayIndex]
                                        ?.tasks?.[taskIndex]?.dueOffsetDays
                                        ?.message
                                    }
                                  />
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() =>
                                    setDayItems(
                                      dayIndex,
                                      "tasks",
                                      (day.tasks || []).filter(
                                        (_: any, index: number) =>
                                          index !== taskIndex,
                                      ),
                                    )
                                  }
                                  className="text-red-600 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))
                        )}
                      </section>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex flex-col-reverse gap-3 border-t bg-white px-4 py-3 sm:flex-row sm:justify-between sm:px-6">
              <Button
                type="button"
                variant="outline"
                disabled={step === 0 || isSubmitting}
                onClick={() => setStep((value) => Math.max(0, value - 1))}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              {step < STEPS.length - 1 ? (
                <Button
                  type="button"
                  onClick={next}
                  className="bg-[#781216] hover:bg-[#5f0e11]"
                >
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={isSubmitting || !canSubmit}
                  className="bg-[#781216] hover:bg-[#5f0e11]"
                >
                  {isSubmitting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {circuit ? "Save template" : "Create template"}
                </Button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

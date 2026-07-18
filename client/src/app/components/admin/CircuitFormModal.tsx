import { useEffect, useMemo, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as z from "zod";
import {
  ArrowLeft,
  ArrowRight,
  ClipboardList,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "../../../lib/axios";
import { formatTripType } from "../../../lib/tripApi";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
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
  (value) => (value === "" || value === null || value === undefined ? undefined : Number(value)),
  z.number().positive("Amount must be greater than zero").optional(),
);
const optionalPositiveInteger = z.preprocess(
  (value) => (value === "" || value === null || value === undefined ? undefined : Number(value)),
  z.number().int("Enter a whole number").positive("Quantity must be at least 1").optional(),
);
const optionalNonnegativeInteger = z.preprocess(
  (value) => (value === "" || value === null || value === undefined ? undefined : Number(value)),
  z.number().int("Enter a whole number").nonnegative("Days cannot be negative").optional(),
);
const optionalUrl = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().url("Enter a valid image URL").optional(),
);

const taskSchema = z.object({
  id: z.string().uuid().optional(),
  category: z.enum(TASK_CATEGORIES),
  title: z.string().min(1, "Task title is required"),
  description: z.string().optional(),
  estimatedAmount: optionalPositiveNumber,
  dueOffsetDays: optionalNonnegativeInteger,
});

const circuitSchema = z.object({
  title: z.string().min(2, "Title is required"),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters and hyphens"),
  tripType: z.enum(TRIP_TYPES),
  location: z.string().min(1, "Location is required"),
  destinationId: z.string().optional(),
  overview: z.string().min(1, "Overview is required"),
  bestTimeToVisit: z.string().min(1, "Best time is required"),
  duration: z.coerce.number().int().positive(),
  basePrice: z.coerce.number().positive("Base price must be greater than zero"),
  baseTokenAmount: z.coerce.number().nonnegative(),
  operationsReminderDays: z.coerce.number().int().nonnegative(),
  isActive: z.boolean(),
  internalNotes: z.string().optional(),
  bannerImages: z.array(z.object({ value: z.string().url("Enter a valid URL") })),
  galleryImages: z.array(z.object({ value: z.string().url("Enter a valid URL") })),
  inclusions: z.array(z.object({ value: z.string().min(1) })).min(1),
  exclusions: z.array(z.object({ value: z.string().min(1) })).min(1),
  tagIds: z.array(z.string()),
  packages: z.array(z.object({
    id: z.string().uuid().optional(),
    title: z.string().min(1, "Package title is required"),
    price: z.coerce.number().positive(),
    tokenAmount: z.coerce.number().nonnegative(),
  })).min(1),
  addOns: z.array(z.object({
    id: z.string().uuid().optional(),
    title: z.string().min(1, "Add-on title is required"),
    description: z.string().optional(),
  imageUrl: optionalUrl,
  price: z.coerce.number().positive(),
  maxQuantityPerBooking: optionalPositiveInteger,
  purchaseCutoffOffsetDays: optionalNonnegativeInteger,
    isActive: z.boolean(),
  })),
  days: z.array(z.object({
    id: z.string().uuid().optional(),
    dayNumber: z.coerce.number().int().positive(),
    title: z.string().min(1, "Day title is required"),
    description: z.string().optional(),
    todos: z.array(z.object({ value: z.string().min(1) })),
    tasks: z.array(taskSchema),
  })).min(1),
}).superRefine((values, context) => {
  if (values.baseTokenAmount > values.basePrice) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "Base booking amount cannot exceed the base price", path: ["baseTokenAmount"] });
  }
  values.packages.forEach((item, index) => {
    if (item.tokenAmount > item.price) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: "Booking amount cannot exceed package price", path: ["packages", index, "tokenAmount"] });
    }
  });
  const dayNumbers = new Set<number>();
  values.days.forEach((day, index) => {
    if (dayNumbers.has(day.dayNumber)) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: "Each itinerary day number must be unique", path: ["days", index, "dayNumber"] });
    }
    dayNumbers.add(day.dayNumber);
  });
});

type CircuitFormValues = z.infer<typeof circuitSchema>;

const STEPS = ["Foundation", "Pricing & add-ons", "Content", "Itinerary & operations"];
const inputClass = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm";

function firstFormError(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (typeof record.message === "string" && record.message) return record.message;
  for (const child of Object.values(record)) {
    const message = firstFormError(child);
    if (message) return message;
  }
  return null;
}

const emptyCircuit = (): CircuitFormValues => ({
  title: "",
  slug: "",
  tripType: "MOUNTAIN_TREK",
  location: "",
  destinationId: "",
  overview: "",
  bestTimeToVisit: "",
  duration: 1,
  basePrice: 1,
  baseTokenAmount: 0,
  operationsReminderDays: 3,
  isActive: true,
  internalNotes: "",
  bannerImages: [],
  galleryImages: [],
  inclusions: [{ value: "" }],
  exclusions: [{ value: "" }],
  tagIds: [],
  packages: [{ title: "Standard", price: 1, tokenAmount: 0 }],
  addOns: [],
  days: [{ dayNumber: 1, title: "", description: "", todos: [], tasks: [] }],
});

const toFormValues = (circuit: any): CircuitFormValues => ({
  title: circuit.title || "",
  slug: circuit.slug || "",
  tripType: circuit.tripType || "MOUNTAIN_TREK",
  location: circuit.location || "",
  destinationId: circuit.destinationId || "",
  overview: circuit.overview || "",
  bestTimeToVisit: circuit.bestTimeToVisit || "",
  duration: Number(circuit.duration || 1),
  basePrice: Number(circuit.basePrice || 1),
  baseTokenAmount: Number(circuit.baseTokenAmount || 0),
  operationsReminderDays: Number(circuit.operationsReminderDays ?? 3),
  isActive: circuit.isActive ?? true,
  internalNotes: circuit.internalNotes || "",
  bannerImages: (circuit.bannerImages || []).map((value: string) => ({ value })),
  galleryImages: (circuit.galleryImages || []).map((value: string) => ({ value })),
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
      estimatedAmount: task.estimatedAmount == null ? undefined : Number(task.estimatedAmount),
      dueOffsetDays: task.dueOffsetDays ?? undefined,
    })),
  })),
});

function ErrorText({ message }: { message?: string }) {
  return message ? <p className="mt-1 text-xs text-red-600">{message}</p> : null;
}

export function CircuitFormModal({
  open,
  onOpenChange,
  circuit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  circuit?: any;
}) {
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();
  const form = useForm<CircuitFormValues>({
    resolver: zodResolver(circuitSchema) as any,
    defaultValues: emptyCircuit(),
    mode: "onTouched",
  });

  const destinationsQuery = useQuery({
    queryKey: ["admin", "destinations"],
    queryFn: async () => (await apiClient.get("/destinations", { params: { adminView: true, limit: 200 } })).data,
    enabled: open,
  });
  const tagsQuery = useQuery({
    queryKey: ["trip-tags"],
    queryFn: async () => (await apiClient.get("/trip-tags", { params: { limit: 200 } })).data,
    enabled: open,
  });

  const inclusions = useFieldArray({ control: form.control, name: "inclusions" });
  const exclusions = useFieldArray({ control: form.control, name: "exclusions" });
  const banners = useFieldArray({ control: form.control, name: "bannerImages" });
  const gallery = useFieldArray({ control: form.control, name: "galleryImages" });
  const packages = useFieldArray({ control: form.control, name: "packages" });
  const addOns = useFieldArray({ control: form.control, name: "addOns" });
  const days = useFieldArray({ control: form.control, name: "days" });
  const watchedDays = form.watch("days");

  useEffect(() => {
    if (!open) return;
    const values = circuit ? toFormValues(circuit) : emptyCircuit();
    if (!values.inclusions.length) values.inclusions = [{ value: "" }];
    if (!values.exclusions.length) values.exclusions = [{ value: "" }];
    if (!values.packages.length) values.packages = [{ title: "Standard", price: 1, tokenAmount: 0 }];
    if (!values.days.length) values.days = [{ dayNumber: 1, title: "", description: "", todos: [], tasks: [] }];
    form.reset(values);
    setStep(0);
  }, [circuit, form, open]);
  useEffect(() => {
    if (destinationsQuery.isError) toast.error(getErrorMessage(destinationsQuery.error, "Destinations could not be loaded"), { id: "circuit-destinations-error" });
    if (tagsQuery.isError) toast.error(getErrorMessage(tagsQuery.error, "Tags could not be loaded"), { id: "circuit-tags-error" });
  }, [destinationsQuery.error, destinationsQuery.isError, tagsQuery.error, tagsQuery.isError]);

  const destinations = destinationsQuery.data?.data || [];
  const availableTags = Array.isArray(tagsQuery.data) ? tagsQuery.data : tagsQuery.data?.data || [];
  const selectedTags = form.watch("tagIds");

  const stepFields = useMemo<(keyof CircuitFormValues)[][]>(() => [
    ["title", "slug", "tripType", "location", "destinationId", "bestTimeToVisit", "duration", "isActive"],
    ["basePrice", "baseTokenAmount", "packages", "addOns"],
    ["overview", "inclusions", "exclusions", "bannerImages", "galleryImages", "tagIds", "internalNotes"],
    ["days", "operationsReminderDays"],
  ], []);

  const next = async () => {
    if (await form.trigger(stepFields[step])) setStep((value) => Math.min(STEPS.length - 1, value + 1));
    else toast.error("Please fix the highlighted fields before continuing.", { description: firstFormError(form.formState.errors) || "Review the required fields on this step." });
  };

  const setDayItems = (dayIndex: number, key: "todos" | "tasks", values: any[]) => {
    form.setValue(`days.${dayIndex}.${key}` as any, values, { shouldDirty: true, shouldValidate: true });
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
        galleryImages: values.galleryImages.map((item) => item.value),
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
        highlights: circuit?.highlights || [],
        stayTransportImages: circuit?.stayTransportImages || [],
      };

      if (circuit?.id) await apiClient.put(`/circuits/${circuit.id}`, payload);
      else await apiClient.post("/circuits", payload);

      toast.success(circuit ? "Circuit template updated" : "Circuit template created");
      await queryClient.invalidateQueries({ queryKey: ["admin", "circuits"] });
      onOpenChange(false);
    } catch (error: unknown) {
      showErrorToast(error, circuit ? "Could not update the circuit" : "Could not create the circuit");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!w-[calc(100%-0.75rem)] sm:!w-full sm:max-w-5xl !max-h-[calc(100dvh-0.75rem)] overflow-hidden p-0">
        <div className="border-b px-4 py-4 sm:px-6">
          <DialogHeader>
            <DialogTitle>{circuit ? "Edit circuit template" : "Create circuit template"}</DialogTitle>
          </DialogHeader>
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

        <form onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
          <div className="max-h-[calc(100dvh-11rem)] overflow-y-auto px-4 py-5 sm:px-6">
            {step === 0 && (
              <div className="space-y-5">
                <div className="rounded-xl border border-[#e8d9b7] bg-[#fbf7ed] p-4 text-sm text-[#6d541f]">
                  This is the reusable baseline. Dates belong to trips, not circuits.
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div><Label>Title *</Label><Input {...form.register("title")} placeholder="Tawang Explorer" /><ErrorText message={form.formState.errors.title?.message} /></div>
                  <div><Label>Slug *</Label><Input {...form.register("slug")} placeholder="tawang-explorer" /><ErrorText message={form.formState.errors.slug?.message} /></div>
                  <div><Label>Trip type *</Label><select {...form.register("tripType")} className={inputClass}>{TRIP_TYPES.map((value) => <option key={value} value={value}>{formatTripType(value)}</option>)}</select></div>
                  <div><Label>Location *</Label><Input {...form.register("location")} placeholder="Arunachal Pradesh" /><ErrorText message={form.formState.errors.location?.message} /></div>
                  <div><Label>Destination</Label><select {...form.register("destinationId")} className={inputClass}><option value="">No linked destination</option>{destinations.map((item: any) => <option key={item.id} value={item.id}>{item.name}, {item.state}</option>)}</select></div>
                  <div><Label>Best time to visit *</Label><Input {...form.register("bestTimeToVisit")} placeholder="March to June" /></div>
                  <div><Label>Duration (days) *</Label><Input type="number" min={1} {...form.register("duration")} /></div>
                  <div><Label>Operations reminder lead (days)</Label><Input type="number" min={0} {...form.register("operationsReminderDays")} /></div>
                </div>
                <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" {...form.register("isActive")} className="h-4 w-4 accent-[#781216]" />Circuit is active</label>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-7">
                <div className="grid gap-4 md:grid-cols-2">
                  <div><Label>Base price *</Label><Input type="number" min={0.01} step="0.01" {...form.register("basePrice")} /><ErrorText message={form.formState.errors.basePrice?.message} /></div>
                  <div><Label>Base booking amount</Label><Input type="number" min={0} step="0.01" {...form.register("baseTokenAmount")} /><ErrorText message={form.formState.errors.baseTokenAmount?.message} /></div>
                </div>
                <section>
                  <div className="mb-3 flex items-center justify-between"><div><h3 className="font-semibold">Packages</h3><p className="text-xs text-gray-500">These are copied to every trip created from this circuit.</p></div><Button type="button" variant="outline" size="sm" onClick={() => packages.append({ title: "", price: 1, tokenAmount: 0 })}><Plus className="mr-1 h-4 w-4" />Package</Button></div>
                  <div className="space-y-3">{packages.fields.map((field, index) => <div key={field.id} className="grid gap-3 rounded-xl border bg-gray-50 p-4 md:grid-cols-[1fr_180px_180px_auto]"><div><Label>Name</Label><Input {...form.register(`packages.${index}.title`)} /><ErrorText message={form.formState.errors.packages?.[index]?.title?.message} /></div><div><Label>Price</Label><Input type="number" min={0.01} step="0.01" {...form.register(`packages.${index}.price`)} /><ErrorText message={form.formState.errors.packages?.[index]?.price?.message} /></div><div><Label>Booking amount</Label><Input type="number" min={0} step="0.01" {...form.register(`packages.${index}.tokenAmount`)} /><ErrorText message={form.formState.errors.packages?.[index]?.tokenAmount?.message} /></div><Button type="button" variant="ghost" size="icon" disabled={packages.fields.length === 1} onClick={() => packages.remove(index)} className="self-end text-red-600"><Trash2 className="h-4 w-4" /></Button></div>)}</div>
                </section>
                <section>
                  <div className="mb-3 flex items-center justify-between"><div><h3 className="font-semibold">Optional add-ons</h3><p className="text-xs text-gray-500">Travelers can add these while booking, before the cutoff.</p></div><Button type="button" variant="outline" size="sm" onClick={() => addOns.append({ title: "", description: "", imageUrl: "", price: 1, maxQuantityPerBooking: 1, purchaseCutoffOffsetDays: 3, isActive: true })}><Plus className="mr-1 h-4 w-4" />Add-on</Button></div>
                  {addOns.fields.length === 0 ? <div className="rounded-xl border border-dashed p-6 text-center text-sm text-gray-500">No add-ons configured.</div> : <div className="space-y-3">{addOns.fields.map((field, index) => <div key={field.id} className="rounded-xl border bg-gray-50 p-4"><div className="grid gap-3 md:grid-cols-3"><div><Label>Title</Label><Input {...form.register(`addOns.${index}.title`)} /><ErrorText message={form.formState.errors.addOns?.[index]?.title?.message} /></div><div><Label>Price</Label><Input type="number" min={0.01} step="0.01" {...form.register(`addOns.${index}.price`)} /><ErrorText message={form.formState.errors.addOns?.[index]?.price?.message} /></div><div><Label>Image URL</Label><Input type="url" {...form.register(`addOns.${index}.imageUrl`)} /><ErrorText message={form.formState.errors.addOns?.[index]?.imageUrl?.message} /></div><div className="md:col-span-3"><Label>Description</Label><Textarea rows={2} {...form.register(`addOns.${index}.description`)} /></div><div><Label>Maximum quantity</Label><Input type="number" min={1} step={1} {...form.register(`addOns.${index}.maxQuantityPerBooking`)} /><ErrorText message={form.formState.errors.addOns?.[index]?.maxQuantityPerBooking?.message} /></div><div><Label>Cutoff before departure (days)</Label><Input type="number" min={0} step={1} {...form.register(`addOns.${index}.purchaseCutoffOffsetDays`)} /><ErrorText message={form.formState.errors.addOns?.[index]?.purchaseCutoffOffsetDays?.message} /></div><div className="flex items-end justify-between"><label className="mb-2 flex items-center gap-2 text-sm"><input type="checkbox" {...form.register(`addOns.${index}.isActive`)} />Active</label><Button type="button" variant="ghost" size="icon" onClick={() => addOns.remove(index)} className="text-red-600"><Trash2 className="h-4 w-4" /></Button></div></div></div>)}</div>}
                </section>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div><Label>Overview *</Label><Textarea rows={6} {...form.register("overview")} /><ErrorText message={form.formState.errors.overview?.message} /></div>
                <div className="grid gap-6 md:grid-cols-2">
                  <section><div className="mb-2 flex items-center justify-between"><Label>Inclusions</Label><Button type="button" variant="ghost" size="sm" onClick={() => inclusions.append({ value: "" })}><Plus className="h-4 w-4" /></Button></div><div className="space-y-2">{inclusions.fields.map((field, index) => <div key={field.id} className="flex gap-2"><Input {...form.register(`inclusions.${index}.value`)} /><Button type="button" variant="ghost" size="icon" onClick={() => inclusions.remove(index)} className="text-red-600"><Trash2 className="h-4 w-4" /></Button></div>)}</div></section>
                  <section><div className="mb-2 flex items-center justify-between"><Label>Exclusions</Label><Button type="button" variant="ghost" size="sm" onClick={() => exclusions.append({ value: "" })}><Plus className="h-4 w-4" /></Button></div><div className="space-y-2">{exclusions.fields.map((field, index) => <div key={field.id} className="flex gap-2"><Input {...form.register(`exclusions.${index}.value`)} /><Button type="button" variant="ghost" size="icon" onClick={() => exclusions.remove(index)} className="text-red-600"><Trash2 className="h-4 w-4" /></Button></div>)}</div></section>
                </div>
                <div className="grid gap-6 md:grid-cols-2">
                  <section><div className="mb-2 flex items-center justify-between"><Label>Banner image URLs</Label><Button type="button" variant="ghost" size="sm" onClick={() => banners.append({ value: "" })}><Plus className="h-4 w-4" /></Button></div>{banners.fields.map((field, index) => <div key={field.id} className="mb-2 flex gap-2"><Input {...form.register(`bannerImages.${index}.value`)} /><Button type="button" variant="ghost" size="icon" onClick={() => banners.remove(index)}><Trash2 className="h-4 w-4" /></Button></div>)}</section>
                  <section><div className="mb-2 flex items-center justify-between"><Label>Gallery image URLs</Label><Button type="button" variant="ghost" size="sm" onClick={() => gallery.append({ value: "" })}><Plus className="h-4 w-4" /></Button></div>{gallery.fields.map((field, index) => <div key={field.id} className="mb-2 flex gap-2"><Input {...form.register(`galleryImages.${index}.value`)} /><Button type="button" variant="ghost" size="icon" onClick={() => gallery.remove(index)}><Trash2 className="h-4 w-4" /></Button></div>)}</section>
                </div>
                {availableTags.length > 0 && <section><Label>Tags</Label><div className="mt-2 flex flex-wrap gap-2">{availableTags.map((tag: any) => { const active = selectedTags.includes(tag.id); return <button key={tag.id} type="button" onClick={() => form.setValue("tagIds", active ? selectedTags.filter((id) => id !== tag.id) : [...selectedTags, tag.id], { shouldDirty: true })} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${active ? "border-[#781216] bg-[#781216] text-white" : "border-gray-200 bg-white text-gray-600"}`}>{tag.tag}</button>; })}</div></section>}
                <div><Label>Internal notes</Label><Textarea rows={3} {...form.register("internalNotes")} placeholder="Private planning notes; never shown to travelers." /></div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold">Day plan and task templates</h3><p className="text-sm text-gray-500">Operational tasks are materialized for bookings on a real departure.</p></div><Button type="button" variant="outline" size="sm" onClick={() => days.append({ dayNumber: days.fields.length + 1, title: "", description: "", todos: [], tasks: [] })}><Plus className="mr-1 h-4 w-4" />Day</Button></div>
                {days.fields.map((field, dayIndex) => {
                  const day = watchedDays[dayIndex];
                  return <section key={field.id} className="rounded-2xl border bg-white p-4 shadow-sm sm:p-5">
                    <div className="grid gap-3 md:grid-cols-[110px_1fr_auto]"><div><Label>Day</Label><Input type="number" min={1} step={1} {...form.register(`days.${dayIndex}.dayNumber`)} /><ErrorText message={form.formState.errors.days?.[dayIndex]?.dayNumber?.message} /></div><div><Label>Title</Label><Input {...form.register(`days.${dayIndex}.title`)} /><ErrorText message={form.formState.errors.days?.[dayIndex]?.title?.message} /></div><Button type="button" variant="ghost" size="icon" disabled={days.fields.length === 1} onClick={() => days.remove(dayIndex)} className="self-end text-red-600"><Trash2 className="h-4 w-4" /></Button></div>
                    <div className="mt-3"><Label>Description</Label><Textarea rows={3} {...form.register(`days.${dayIndex}.description`)} /></div>
                    <div className="mt-4"><div className="mb-2 flex items-center justify-between"><Label>Traveler-facing checklist</Label><Button type="button" variant="ghost" size="sm" onClick={() => setDayItems(dayIndex, "todos", [...(day.todos || []), { value: "" }])}><Plus className="mr-1 h-4 w-4" />Item</Button></div>{(day.todos || []).map((_: any, todoIndex: number) => <div key={todoIndex} className="mb-2 flex gap-2"><Input {...form.register(`days.${dayIndex}.todos.${todoIndex}.value`)} /><Button type="button" variant="ghost" size="icon" onClick={() => setDayItems(dayIndex, "todos", day.todos.filter((_: any, index: number) => index !== todoIndex))}><Trash2 className="h-4 w-4" /></Button></div>)}</div>
                    <div className="mt-5 rounded-xl border border-[#eadcb9] bg-[#fcf8ef] p-3 sm:p-4"><div className="mb-3 flex items-center justify-between"><div className="flex items-center gap-2"><ClipboardList className="h-4 w-4 text-[#8a6414]" /><Label>Operational task templates</Label></div><Button type="button" variant="outline" size="sm" onClick={() => setDayItems(dayIndex, "tasks", [...(day.tasks || []), { category: "GENERAL", title: "", description: "", estimatedAmount: undefined, dueOffsetDays: undefined }])}><Plus className="mr-1 h-4 w-4" />Task</Button></div>
                      {(day.tasks || []).length === 0 ? <p className="text-xs text-gray-500">No operational work configured for this day.</p> : (day.tasks || []).map((_: any, taskIndex: number) => <div key={taskIndex} className="mb-3 grid gap-2 rounded-lg border bg-white p-3 md:grid-cols-2"><div><Label>Category</Label><select {...form.register(`days.${dayIndex}.tasks.${taskIndex}.category`)} className={inputClass}>{TASK_CATEGORIES.map((value) => <option key={value}>{value.replaceAll("_", " ")}</option>)}</select></div><div><Label>Task title</Label><Input {...form.register(`days.${dayIndex}.tasks.${taskIndex}.title`)} /><ErrorText message={form.formState.errors.days?.[dayIndex]?.tasks?.[taskIndex]?.title?.message} /></div><div className="md:col-span-2"><Label>Description</Label><Input {...form.register(`days.${dayIndex}.tasks.${taskIndex}.description`)} /></div><div><Label>Estimated amount</Label><Input type="number" min={0.01} step="0.01" {...form.register(`days.${dayIndex}.tasks.${taskIndex}.estimatedAmount`)} /><ErrorText message={form.formState.errors.days?.[dayIndex]?.tasks?.[taskIndex]?.estimatedAmount?.message} /></div><div className="flex items-end gap-2"><div className="flex-1"><Label>Due before departure (days)</Label><Input type="number" min={0} step={1} {...form.register(`days.${dayIndex}.tasks.${taskIndex}.dueOffsetDays`)} /><ErrorText message={form.formState.errors.days?.[dayIndex]?.tasks?.[taskIndex]?.dueOffsetDays?.message} /></div><Button type="button" variant="ghost" size="icon" onClick={() => setDayItems(dayIndex, "tasks", day.tasks.filter((_: any, index: number) => index !== taskIndex))} className="text-red-600"><Trash2 className="h-4 w-4" /></Button></div></div>)}
                    </div>
                  </section>;
                })}
              </div>
            )}
          </div>

          <div className="flex flex-col-reverse gap-3 border-t bg-white px-4 py-3 sm:flex-row sm:justify-between sm:px-6">
            <Button type="button" variant="outline" disabled={step === 0 || isSubmitting} onClick={() => setStep((value) => Math.max(0, value - 1))}><ArrowLeft className="mr-2 h-4 w-4" />Back</Button>
            {step < STEPS.length - 1 ? <Button type="button" onClick={next} className="bg-[#781216] hover:bg-[#5f0e11]">Continue<ArrowRight className="ml-2 h-4 w-4" /></Button> : <Button type="submit" disabled={isSubmitting} className="bg-[#781216] hover:bg-[#5f0e11]">{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{circuit ? "Save template" : "Create template"}</Button>}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

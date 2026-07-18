import React, { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Plus, Loader2, Trash2, ArrowRight, ArrowLeft } from "lucide-react";
import { apiClient } from "../../../lib/axios";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { formatTripType } from "../../../lib/tripApi";

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

const circuitSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters"),
  slug: z.string().min(2, "Slug must be at least 2 characters"),
  tripType: z.string().min(1, "Trip type is required"),
  location: z.string().min(1, "Location is required"),
  destinationId: z.string().uuid().optional().or(z.literal("")),
  overview: z.string().min(1, "Overview is required"),
  bestTimeToVisit: z.string().min(1, "Best time is required"),
  duration: z.coerce.number().int().min(1, "Duration must be at least 1 day"),
  basePrice: z.coerce.number().min(0),
  baseTokenAmount: z.coerce.number().min(0),
  isActive: z.boolean().default(true),
  inclusions: z.array(z.object({ value: z.string().min(1, "Inclusion is required") })).min(1),
  exclusions: z.array(z.object({ value: z.string().min(1, "Exclusion is required") })).min(1),
  days: z.array(z.object({
    dayNumber: z.coerce.number().int().positive(),
    title: z.string().min(1, "Day title is required"),
    description: z.string().optional(),
  })).optional(),
  packages: z.array(z.object({
    title: z.string().min(1, "Package title is required"),
    price: z.coerce.number().min(1, "Price must be > 0"),
    tokenAmount: z.coerce.number().min(0),
  })).min(1),
});

type CircuitFormValues = z.infer<typeof circuitSchema>;

const STEPS = ["Basics", "Pricing & Packages", "Content", "Itinerary Days"];

export function CircuitFormModal({ open, onOpenChange, circuit }: { open: boolean, onOpenChange: (open: boolean) => void, circuit?: any }) {
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();
  const isEdit = !!circuit;

  const { data: destinationsData } = useQuery({
    queryKey: ["admin", "destinations"],
    queryFn: async () => {
      const res = await apiClient.get("/destinations?adminView=true");
      return res.data;
    },
    enabled: open,
  });
  const availableDestinations = destinationsData?.data || [];

  const form = useForm<CircuitFormValues>({
    resolver: zodResolver(circuitSchema),
    defaultValues: {
      title: "", slug: "", tripType: "MOUNTAIN_TREK", location: "", destinationId: "",
      overview: "", bestTimeToVisit: "", duration: 1, basePrice: 0, baseTokenAmount: 0,
      isActive: true, inclusions: [{ value: "" }], exclusions: [{ value: "" }],
      days: [{ dayNumber: 1, title: "", description: "" }],
      packages: [{ title: "Standard", price: 0, tokenAmount: 0 }],
    },
    mode: "onTouched",
  });

  const { fields: incFields, append: addInc, remove: rmInc } = useFieldArray({ control: form.control, name: "inclusions" });
  const { fields: excFields, append: addExc, remove: rmExc } = useFieldArray({ control: form.control, name: "exclusions" });
  const { fields: dayFields, append: addDay, remove: rmDay } = useFieldArray({ control: form.control, name: "days" });
  const { fields: pkgFields, append: addPkg, remove: rmPkg } = useFieldArray({ control: form.control, name: "packages" });

  useEffect(() => {
    if (open) {
      if (circuit) {
        form.reset({
          title: circuit.title || "",
          slug: circuit.slug || "",
          tripType: circuit.tripType || "MOUNTAIN_TREK",
          location: circuit.location || "",
          destinationId: circuit.destinationId || "",
          overview: circuit.overview || "",
          bestTimeToVisit: circuit.bestTimeToVisit || "",
          duration: circuit.duration || 1,
          basePrice: circuit.basePrice || 0,
          baseTokenAmount: circuit.baseTokenAmount || 0,
          isActive: circuit.isActive ?? true,
          inclusions: circuit.inclusions?.map((i: string) => ({ value: i })) || [{ value: "" }],
          exclusions: circuit.exclusions?.map((e: string) => ({ value: e })) || [{ value: "" }],
          days: circuit.days?.map((d: any) => ({ dayNumber: d.dayNumber, title: d.title, description: d.description })) || [{ dayNumber: 1, title: "", description: "" }],
          packages: circuit.packages?.map((p: any) => ({ title: p.title, price: p.price, tokenAmount: p.tokenAmount })) || [{ title: "Standard", price: 0, tokenAmount: 0 }],
        });
      } else {
        form.reset({
          title: "", slug: "", tripType: "MOUNTAIN_TREK", location: "", destinationId: "",
          overview: "", bestTimeToVisit: "", duration: 1, basePrice: 0, baseTokenAmount: 0,
          isActive: true, inclusions: [{ value: "" }], exclusions: [{ value: "" }],
          days: [{ dayNumber: 1, title: "", description: "" }],
          packages: [{ title: "Standard", price: 0, tokenAmount: 0 }],
        });
      }
      setStep(0);
    }
  }, [circuit, open, form]);

  const validateStep = async () => {
    let fieldsToValidate: (keyof CircuitFormValues)[] = [];
    if (step === 0) fieldsToValidate = ["title", "slug", "tripType", "location", "destinationId", "duration", "bestTimeToVisit", "isActive"];
    if (step === 1) fieldsToValidate = ["basePrice", "baseTokenAmount", "packages"];
    if (step === 2) fieldsToValidate = ["overview", "inclusions", "exclusions"];
    if (step === 3) fieldsToValidate = ["days"];
    
    const isValid = await form.trigger(fieldsToValidate);
    return isValid;
  };

  const nextStep = async () => {
    if (await validateStep()) {
      setStep((s) => Math.min(STEPS.length - 1, s + 1));
    } else {
      toast.error("Please fix validation errors on this step before continuing.");
    }
  };

  const prevStep = () => setStep((s) => Math.max(0, s - 1));

  const onSubmit = async (data: CircuitFormValues) => {
    setIsSubmitting(true);
    try {
      const payload: any = {
        title: data.title,
        slug: data.slug,
        tripType: data.tripType,
        location: data.location,
        overview: data.overview,
        bestTimeToVisit: data.bestTimeToVisit,
        duration: data.duration,
        basePrice: data.basePrice,
        baseTokenAmount: data.baseTokenAmount,
        isActive: data.isActive,
        inclusions: data.inclusions.map(i => i.value),
        exclusions: data.exclusions.map(e => e.value),
      };
      
      if (data.destinationId) {
        payload.destinationId = data.destinationId;
      }
      
      if (!isEdit) {
        // Can only create days and packages during circuit creation natively
        payload.days = data.days?.map(d => ({
          dayNumber: d.dayNumber,
          title: d.title,
          description: d.description || "",
        })) || [];
        payload.packages = data.packages.map(p => ({
          title: p.title,
          price: p.price,
          tokenAmount: p.tokenAmount,
        }));
      }

      if (isEdit) {
        // Exclude days and packages for updates as per updateCircuitSchema
        await apiClient.put(`/circuits/${circuit.id}`, payload);
        toast.success("Circuit updated successfully (Note: Days/Packages must be updated separately)");
      } else {
        await apiClient.post("/circuits", payload);
        toast.success("Circuit created successfully");
      }
      queryClient.invalidateQueries({ queryKey: ["admin", "circuits"] });
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Operation failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!w-[calc(100%-0.75rem)] !max-h-[calc(100dvh-0.75rem)] md:!w-full md:!max-h-[90vh] sm:max-w-[800px] overflow-y-auto p-4 sm:p-8">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Circuit" : "Create New Circuit"}</DialogTitle>
        </DialogHeader>

        <div className="flex items-center space-x-2 my-4 overflow-x-auto pb-2">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center shrink-0">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full font-semibold text-sm ${step === i ? "bg-[#781216] text-white" : step > i ? "bg-green-600 text-white" : "bg-gray-200 text-gray-500"}`}>
                {i + 1}
              </div>
              <span className={`ml-2 text-sm font-medium ${step === i ? "text-gray-900" : "text-gray-500"}`}>{s}</span>
              {i < STEPS.length - 1 && <div className="w-8 h-px bg-gray-300 mx-2" />}
            </div>
          ))}
        </div>

        <form id="circuit-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-4">
          
          {/* STEP 0: BASICS */}
          <div className={step === 0 ? "block" : "hidden"}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Title *</Label>
                <Input {...form.register("title")} placeholder="e.g. Backpacking Spiti" />
                {form.formState.errors.title && <p className="text-red-500 text-sm">{form.formState.errors.title.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Slug *</Label>
                <Input {...form.register("slug")} placeholder="backpacking-spiti" />
                {form.formState.errors.slug && <p className="text-red-500 text-sm">{form.formState.errors.slug.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Location *</Label>
                <Input {...form.register("location")} placeholder="Himachal Pradesh" />
                {form.formState.errors.location && <p className="text-red-500 text-sm">{form.formState.errors.location.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Trip Type *</Label>
                <select {...form.register("tripType")} className="flex h-10 w-full items-center rounded-md border border-input bg-background px-3 py-2 text-sm">
                  {TRIP_TYPES.map(t => <option key={t} value={t}>{formatTripType(t)}</option>)}
                </select>
                {form.formState.errors.tripType && <p className="text-red-500 text-sm">{form.formState.errors.tripType.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Destination (Optional)</Label>
                <select {...form.register("destinationId")} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="">-- None --</option>
                  {availableDestinations.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Best Time To Visit *</Label>
                <Input {...form.register("bestTimeToVisit")} placeholder="e.g. May to October" />
                {form.formState.errors.bestTimeToVisit && <p className="text-red-500 text-sm">{form.formState.errors.bestTimeToVisit.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Duration (Days) *</Label>
                <Input type="number" {...form.register("duration")} />
                {form.formState.errors.duration && <p className="text-red-500 text-sm">{form.formState.errors.duration.message}</p>}
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <input type="checkbox" {...form.register("isActive")} className="w-4 h-4 text-[#c8a96e]" />
              <Label>Activate Circuit (Visible to public)</Label>
            </div>
          </div>

          {/* STEP 1: PRICING & PACKAGES */}
          <div className={step === 1 ? "block" : "hidden"}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="space-y-2">
                <Label>Base Price *</Label>
                <Input type="number" {...form.register("basePrice")} />
                {form.formState.errors.basePrice && <p className="text-red-500 text-sm">{form.formState.errors.basePrice.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Base Token Amount *</Label>
                <Input type="number" {...form.register("baseTokenAmount")} />
                {form.formState.errors.baseTokenAmount && <p className="text-red-500 text-sm">{form.formState.errors.baseTokenAmount.message}</p>}
              </div>
            </div>

            <Label className="text-lg font-semibold">Packages</Label>
            <p className="text-sm text-gray-500 mb-4">Define pricing packages for this circuit.</p>
            {pkgFields.map((field, index) => (
              <div key={field.id} className="p-4 border border-gray-200 rounded-md mb-4 bg-gray-50 relative">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Package Title</Label>
                    <Input {...form.register(`packages.${index}.title`)} placeholder="e.g. Quad Sharing" />
                    {form.formState.errors.packages?.[index]?.title && <p className="text-red-500 text-xs mt-1">{form.formState.errors.packages[index].title.message}</p>}
                  </div>
                  <div>
                    <Label>Price</Label>
                    <Input type="number" {...form.register(`packages.${index}.price`)} />
                    {form.formState.errors.packages?.[index]?.price && <p className="text-red-500 text-xs mt-1">{form.formState.errors.packages[index].price.message}</p>}
                  </div>
                  <div>
                    <Label>Token Amount</Label>
                    <Input type="number" {...form.register(`packages.${index}.tokenAmount`)} />
                    {form.formState.errors.packages?.[index]?.tokenAmount && <p className="text-red-500 text-xs mt-1">{form.formState.errors.packages[index].tokenAmount.message}</p>}
                  </div>
                </div>
                {pkgFields.length > 1 && (
                  <Button type="button" variant="ghost" onClick={() => rmPkg(index)} className="absolute top-2 right-2 text-red-500 p-2 h-auto">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button type="button" variant="outline" onClick={() => addPkg({ title: "", price: 0, tokenAmount: 0 })} className="w-full mt-2">
              <Plus className="w-4 h-4 mr-2" /> Add Package
            </Button>
          </div>

          {/* STEP 2: CONTENT */}
          <div className={step === 2 ? "block" : "hidden"}>
            <div className="space-y-2 mb-6">
              <Label>Overview *</Label>
              <Textarea {...form.register("overview")} rows={5} placeholder="Detailed overview of the circuit..." />
              {form.formState.errors.overview && <p className="text-red-500 text-sm">{form.formState.errors.overview.message}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label className="font-semibold mb-2 block">Inclusions</Label>
                {incFields.map((field, index) => (
                  <div key={field.id} className="flex items-center gap-2 mb-2">
                    <Input {...form.register(`inclusions.${index}.value`)} placeholder="e.g. Accommodation" />
                    {incFields.length > 1 && (
                      <Button type="button" variant="ghost" onClick={() => rmInc(index)} className="text-red-500 p-2 h-auto"><Trash2 className="w-4 h-4" /></Button>
                    )}
                  </div>
                ))}
                <Button type="button" variant="outline" onClick={() => addInc({ value: "" })} className="w-full mt-2 text-sm"><Plus className="w-4 h-4 mr-2" /> Add Inclusion</Button>
              </div>
              
              <div>
                <Label className="font-semibold mb-2 block">Exclusions</Label>
                {excFields.map((field, index) => (
                  <div key={field.id} className="flex items-center gap-2 mb-2">
                    <Input {...form.register(`exclusions.${index}.value`)} placeholder="e.g. Flight tickets" />
                    {excFields.length > 1 && (
                      <Button type="button" variant="ghost" onClick={() => rmExc(index)} className="text-red-500 p-2 h-auto"><Trash2 className="w-4 h-4" /></Button>
                    )}
                  </div>
                ))}
                <Button type="button" variant="outline" onClick={() => addExc({ value: "" })} className="w-full mt-2 text-sm"><Plus className="w-4 h-4 mr-2" /> Add Exclusion</Button>
              </div>
            </div>
          </div>

          {/* STEP 3: ITINERARY DAYS */}
          <div className={step === 3 ? "block" : "hidden"}>
            {isEdit && (
              <div className="bg-orange-50 text-orange-800 p-3 rounded-md mb-4 text-sm font-medium border border-orange-200">
                Note: Updating an existing circuit's days directly via this form is disabled to protect existing day tasks. Use the dedicated Itinerary Editor for this circuit.
              </div>
            )}
            
            <Label className="text-lg font-semibold mb-4 block">Itinerary Days</Label>
            {dayFields.map((field, index) => (
              <div key={field.id} className="p-4 border border-gray-200 rounded-md mb-4 bg-gray-50 relative">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                  <div className="md:col-span-1">
                    <Label>Day Number</Label>
                    <Input type="number" {...form.register(`days.${index}.dayNumber`)} disabled={isEdit} />
                  </div>
                  <div className="md:col-span-3">
                    <Label>Day Title</Label>
                    <Input {...form.register(`days.${index}.title`)} placeholder="e.g. Arrival in Manali" disabled={isEdit} />
                  </div>
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea {...form.register(`days.${index}.description`)} rows={3} placeholder="Details about this day..." disabled={isEdit} />
                </div>
                
                {dayFields.length > 1 && !isEdit && (
                  <Button type="button" variant="ghost" onClick={() => rmDay(index)} className="absolute top-2 right-2 text-red-500 p-2 h-auto">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
            {!isEdit && (
              <Button type="button" variant="outline" onClick={() => addDay({ dayNumber: dayFields.length + 1, title: "", description: "" })} className="w-full">
                <Plus className="w-4 h-4 mr-2" /> Add Day
              </Button>
            )}
          </div>

          {/* NAVIGATION FOOTER */}
          <div className="flex flex-col-reverse md:flex-row md:justify-between gap-3 pt-6 border-t border-gray-100">
            <Button type="button" variant="outline" onClick={prevStep} disabled={step === 0 || isSubmitting} className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>
            
            {step < STEPS.length - 1 ? (
              <Button type="button" onClick={nextStep} className="bg-[#c8a96e] hover:bg-[#b8943a] text-white flex items-center gap-2">
                Continue <ArrowRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button type="submit" disabled={isSubmitting} className="bg-[#781216] hover:bg-[#9a1a1f] text-white flex items-center gap-2 px-8 shadow-md">
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {isEdit ? "Save Changes" : "Create Circuit"}
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

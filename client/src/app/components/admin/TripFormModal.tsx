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
import { Plus, UploadCloud, Loader2, Image as ImageIcon, Trash2, ArrowRight, ArrowLeft, ArrowUp, ArrowDown } from "lucide-react";
import { apiClient } from "../../../lib/axios";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";

// --- VALIDATION SCHEMA ---
const tripSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  location: z.string().min(2, "Location is required"),
  tripType: z.string().min(1, "Trip type is required"),
  difficultyLevel: z.string().min(1, "Difficulty is required"),
  bestTimeToVisit: z.string().min(1, "Best time is required"),
  price: z.coerce.number().min(0, "Price must be positive"),
  tokenAmount: z.coerce.number().min(0, "Token amount must be positive"),
  capacity: z.coerce.number().min(1, "Capacity must be at least 1"),
  
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  duration: z.coerce.number().min(1, "Duration must be at least 1 day"),
  groupSizeMin: z.coerce.number().min(1, "Min group size must be at least 1"),
  groupSizeMax: z.coerce.number().min(1, "Max group size must be at least 1"),
  maxAltitude: z.coerce.number().min(0, "Altitude must be valid"),

  overview: z.string().min(10, "Overview must be detailed"),
  highlights: z.array(z.object({ value: z.string().min(1) })).min(1, "At least one highlight"),
  inclusions: z.array(z.object({ value: z.string().min(1) })).min(1, "At least one inclusion"),
  exclusions: z.array(z.object({ value: z.string().min(1) })).min(1, "At least one exclusion"),
  tripTags: z.array(z.object({ value: z.string().min(1) })).optional(),
  faqs: z.array(z.object({ question: z.string().min(1, "Required"), answer: z.string().min(1, "Required") })).optional(),
  isPublished: z.boolean().default(false),
});

type TripFormValues = z.infer<typeof tripSchema>;

const TRIP_TYPES = [
  "MOUNTAIN_TREK", "BEACH_ESCAPE", "DESERT_EXPEDITION", "JUNGLE_WILDLIFE", 
  "HERITAGE_WALK", "ROAD_TRIP", "BACKPACKING_TOUR", "PHOTOGRAPHY_TOUR", 
  "BONFIRE_RETREAT", "INSTITUTE_COLLEGE_TRIP", "CUSTOM_TRIP"
];

const STEPS = ["Basics", "Logistics", "Content", "FAQs & Tags", "Media"];

interface TripFormModalProps {
  trip?: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TripFormModal({ trip, open, onOpenChange }: TripFormModalProps) {
  const [step, setStep] = useState(0);
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
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
      title: "", location: "", tripType: "MOUNTAIN_TREK", difficultyLevel: "Moderate",
      bestTimeToVisit: "", price: 0, tokenAmount: 0, capacity: 10,
      startDate: "", endDate: "", duration: 1, groupSizeMin: 4, groupSizeMax: 15, maxAltitude: 0,
      overview: "",
      highlights: [{ value: "" }], inclusions: [{ value: "" }], exclusions: [{ value: "" }],
      tripTags: [{ value: "" }],
      faqs: [{ question: "", answer: "" }],
      isPublished: false,
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
          difficultyLevel: trip.difficultyLevel || "",
          bestTimeToVisit: trip.bestTimeToVisit || "",
          price: trip.price || 0,
          tokenAmount: trip.tokenAmount || 0,
          capacity: trip.capacity || 10,
          startDate: formatDateForInput(trip.startDate),
          endDate: formatDateForInput(trip.endDate),
          duration: trip.duration || 1,
          groupSizeMin: trip.groupSizeMin || 4,
          groupSizeMax: trip.groupSizeMax || 15,
          maxAltitude: trip.maxAltitude || 0,
          overview: trip.overview || "",
          highlights: trip.highlights?.length ? trip.highlights.map((h: string) => ({ value: h })) : [{ value: "" }],
          inclusions: trip.inclusions?.length ? trip.inclusions.map((i: string) => ({ value: i })) : [{ value: "" }],
          exclusions: trip.exclusions?.length ? trip.exclusions.map((e: string) => ({ value: e })) : [{ value: "" }],
          tripTags: trip.tripTags?.length ? trip.tripTags.map((t: any) => ({ value: t.tag })) : [{ value: "" }],
          faqs: trip.faqs?.length ? trip.faqs.map((f: any) => ({ question: f.question, answer: f.answer })) : [{ question: "", answer: "" }],
          isPublished: trip.isPublished || false,
        });
      } else {
        form.reset({
          title: "", location: "", tripType: "MOUNTAIN_TREK", difficultyLevel: "Moderate",
          bestTimeToVisit: "", price: 0, tokenAmount: 0, capacity: 10,
          startDate: "", endDate: "", duration: 1, groupSizeMin: 4, groupSizeMax: 15, maxAltitude: 0,
          overview: "",
          highlights: [{ value: "" }], inclusions: [{ value: "" }], exclusions: [{ value: "" }],
          tripTags: [{ value: "" }],
          faqs: [{ question: "", answer: "" }],
          isPublished: false,
        });
      }
      setStep(0);
      setImages([]);
      setImagePreviews([]);
    }
  }, [trip, open, form]);

  const { fields: highlightFields, append: addHighlight, remove: removeHighlight } = useFieldArray({
    control: form.control, name: "highlights"
  });
  const { fields: inclusionFields, append: addInclusion, remove: removeInclusion } = useFieldArray({
    control: form.control, name: "inclusions"
  });
  const { fields: exclusionFields, append: addExclusion, remove: removeExclusion } = useFieldArray({
    control: form.control, name: "exclusions"
  });
  const { fields: tripTagFields, append: addTripTag, remove: removeTripTag } = useFieldArray({
    control: form.control, name: "tripTags"
  });
  const { fields: faqFields, append: addFaq, remove: removeFaq, move: moveFaq } = useFieldArray({
    control: form.control, name: "faqs"
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setImages(prev => [...prev, ...newFiles]);
      const newPreviews = newFiles.map(file => URL.createObjectURL(file));
      setImagePreviews(prev => [...prev, ...newPreviews]);
    }
    // Reset file input value to allow selecting the same file again if needed
    e.target.value = "";
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  const deleteExistingImage = async (url: string) => {
    if (!trip?.id) return;
    if (!window.confirm("Are you sure you want to permanently delete this banner image?")) return;

    try {
      await apiClient.delete(`/trips/${trip.id}/banner-images`, { data: { imageUrl: url } });
      toast.success("Image deleted successfully");
      // Optimistically update the local trip prop so UI reflects immediately
      trip.bannerImages = trip.bannerImages.filter((img: string) => img !== url);
      // Invalidate to refresh the underlying list data
      queryClient.invalidateQueries({ queryKey: ["admin", "trips"] });
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to delete image");
    }
  };

  const validateStep = async () => {
    let fieldsToValidate: (keyof TripFormValues)[] = [];
    if (step === 0) fieldsToValidate = ["title", "location", "tripType", "difficultyLevel", "bestTimeToVisit", "price", "tokenAmount", "capacity"];
    if (step === 1) fieldsToValidate = ["startDate", "endDate", "duration", "groupSizeMin", "groupSizeMax", "maxAltitude"];
    if (step === 2) fieldsToValidate = ["overview", "highlights", "inclusions", "exclusions"];
    if (step === 3) fieldsToValidate = ["faqs", "tripTags"];
    
    const isValid = await form.trigger(fieldsToValidate);
    return isValid;
  };

  const nextStep = async () => {
    if (await validateStep()) {
      setStep(s => Math.min(STEPS.length - 1, s + 1));
    }
  };
  const prevStep = () => setStep(s => Math.max(0, s - 1));

  const onSubmit = async (data: TripFormValues) => {
    if (step !== STEPS.length - 1) return;
    
    setIsSubmitting(true);
    try {
      const payload = {
        ...data,
        startDate: new Date(data.startDate).toISOString(),
        endDate: new Date(data.endDate).toISOString(),
        highlights: data.highlights.map(h => h.value).filter(h => h.trim() !== ""),
        inclusions: data.inclusions.map(i => i.value).filter(i => i.trim() !== ""),
        exclusions: data.exclusions.map(e => e.value).filter(e => e.trim() !== ""),
        tripTags: data.tripTags?.map(t => t.value).filter(t => t.trim() !== ""),
        faqs: data.faqs?.filter(f => f.question.trim() !== "" && f.answer.trim() !== ""),
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

      if (images.length > 0) {
        const formData = new FormData();
        images.forEach(img => formData.append("banners", img));
        await apiClient.post(`/trips/${tripId}/banner-images`, formData, {
          headers: { "Content-Type": "multipart/form-data" }
        });
        toast.success("Images uploaded!");
      }

      queryClient.invalidateQueries({ queryKey: ["admin", "trips"] });
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to save trip");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Intercept Enter key to prevent auto-submission on steps 1-3
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
            <DialogTitle className="text-2xl font-bold">{isEdit ? "Edit Trip" : "Create New Trip"}</DialogTitle>
            <DialogDescription>
              {isEdit ? "Modify the details of your trip below." : "Follow the steps to configure all details for the new trip."}
            </DialogDescription>
          </DialogHeader>
          
          {/* Progress Steps */}
          <div className="flex items-center gap-2 mt-6">
            {STEPS.map((s, i) => (
              <React.Fragment key={s}>
                <div className={`flex flex-col items-center gap-1.5 ${i <= step ? 'text-[#781216]' : 'text-gray-400'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-colors duration-300 ${i <= step ? 'border-[#781216] bg-[#781216] text-white' : 'border-gray-300 bg-white text-gray-500'}`}>
                    {i + 1}
                  </div>
                  <span className="text-xs font-medium">{s}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-[2px] -mt-5 ${i < step ? 'bg-[#781216]' : 'bg-gray-200'}`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
          <form id="trip-form" onSubmit={form.handleSubmit(onSubmit)} onKeyDown={handleKeyDown} className="space-y-6">
            
            {/* STEP 0: BASICS */}
            <div className={step === 0 ? "block" : "hidden"}>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label>Trip Title</Label>
                  <Input {...form.register("title")} placeholder="e.g. Kedarkantha Winter Trek" />
                  {form.formState.errors.title && <p className="text-sm text-red-500">{form.formState.errors.title.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Location</Label>
                  <Input {...form.register("location")} placeholder="e.g. Uttarakhand, India" />
                  {form.formState.errors.location && <p className="text-sm text-red-500">{form.formState.errors.location.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Trip Type</Label>
                  <select {...form.register("tripType")} className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                    {TRIP_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Difficulty Level</Label>
                  <Input {...form.register("difficultyLevel")} placeholder="e.g. Moderate to Difficult" />
                </div>
                <div className="space-y-2">
                  <Label>Best Time to Visit</Label>
                  <Input {...form.register("bestTimeToVisit")} placeholder="e.g. Dec to March" />
                </div>
                <div className="space-y-2">
                  <Label>Price (₹)</Label>
                  <Input type="number" {...form.register("price")} />
                  {form.formState.errors.price && <p className="text-sm text-red-500">{form.formState.errors.price.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Token Amount (₹)</Label>
                  <Input type="number" {...form.register("tokenAmount")} />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Total Capacity (Pax)</Label>
                  <Input type="number" {...form.register("capacity")} />
                </div>
                <div className="space-y-2 col-span-2 flex items-center gap-2 mt-2">
                  <input type="checkbox" id="isPublished" {...form.register("isPublished")} className="w-4 h-4 text-[#c8a96e] rounded border-gray-300 focus:ring-[#c8a96e]" />
                  <Label htmlFor="isPublished" className="mb-0 cursor-pointer">Publish this trip (visible to public)</Label>
                </div>
              </div>
            </div>

            {/* STEP 1: LOGISTICS */}
            <div className={step === 1 ? "block" : "hidden"}>
               <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input type="datetime-local" {...form.register("startDate")} />
                  {form.formState.errors.startDate && <p className="text-sm text-red-500">{form.formState.errors.startDate.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input type="datetime-local" {...form.register("endDate")} />
                  {form.formState.errors.endDate && <p className="text-sm text-red-500">{form.formState.errors.endDate.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Duration (Days)</Label>
                  <Input type="number" {...form.register("duration")} />
                </div>
                <div className="space-y-2">
                  <Label>Max Altitude (ft)</Label>
                  <Input type="number" {...form.register("maxAltitude")} />
                </div>
                <div className="space-y-2">
                  <Label>Min Group Size</Label>
                  <Input type="number" {...form.register("groupSizeMin")} />
                </div>
                <div className="space-y-2">
                  <Label>Max Group Size</Label>
                  <Input type="number" {...form.register("groupSizeMax")} />
                </div>
              </div>
            </div>

            {/* STEP 2: CONTENT */}
            <div className={step === 2 ? "block" : "hidden"}>
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label>Overview</Label>
                  <Textarea {...form.register("overview")} rows={4} placeholder="Describe the trip..." className="resize-none" />
                  {form.formState.errors.overview && <p className="text-sm text-red-500">{form.formState.errors.overview.message}</p>}
                </div>

                {/* HIGHLIGHTS */}
                <div className="space-y-3 p-4 border rounded-lg bg-gray-50/50">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">Highlights</Label>
                    <Button type="button" variant="outline" size="sm" onClick={() => addHighlight({ value: "" })}>
                      <Plus className="w-4 h-4 mr-1" /> Add
                    </Button>
                  </div>
                  {highlightFields.map((field, index) => (
                    <div key={field.id} className="flex items-center gap-2">
                      <Input {...form.register(`highlights.${index}.value`)} placeholder={`Highlight ${index + 1}`} />
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeHighlight(index)} className="text-red-500 hover:text-red-600 hover:bg-red-50 shrink-0">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  {form.formState.errors.highlights && <p className="text-sm text-red-500">{form.formState.errors.highlights.root?.message}</p>}
                </div>

                {/* INCLUSIONS */}
                <div className="space-y-3 p-4 border rounded-lg bg-green-50/30 border-green-100">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold text-green-800">Inclusions</Label>
                    <Button type="button" variant="outline" size="sm" onClick={() => addInclusion({ value: "" })}>
                      <Plus className="w-4 h-4 mr-1" /> Add
                    </Button>
                  </div>
                  {inclusionFields.map((field, index) => (
                    <div key={field.id} className="flex items-center gap-2">
                      <Input {...form.register(`inclusions.${index}.value`)} placeholder={`Inclusion ${index + 1}`} />
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeInclusion(index)} className="text-red-500 hover:bg-red-50 shrink-0">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                {/* EXCLUSIONS */}
                <div className="space-y-3 p-4 border rounded-lg bg-red-50/30 border-red-100">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold text-red-800">Exclusions</Label>
                    <Button type="button" variant="outline" size="sm" onClick={() => addExclusion({ value: "" })}>
                      <Plus className="w-4 h-4 mr-1" /> Add
                    </Button>
                  </div>
                  {exclusionFields.map((field, index) => (
                    <div key={field.id} className="flex items-center gap-2">
                      <Input {...form.register(`exclusions.${index}.value`)} placeholder={`Exclusion ${index + 1}`} />
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeExclusion(index)} className="text-red-500 hover:bg-red-50 shrink-0">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>



              </div>
            </div>

            {/* STEP 3: FAQs */}
            <div className={step === 3 ? "block" : "hidden"}>
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-3">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Frequently Asked Questions</h3>
                    <p className="text-sm text-gray-500">Add common questions and answers for this trip.</p>
                  </div>
                  <Button type="button" onClick={() => addFaq({ question: "", answer: "" })} className="bg-gray-900 hover:bg-gray-800 text-white flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Add FAQ
                  </Button>
                </div>
                
                <div className="space-y-4">
                  {faqFields.length === 0 ? (
                    <div className="py-8 text-center border-2 border-dashed border-gray-200 rounded-lg bg-gray-50 text-gray-500">
                      No FAQs added yet. Click 'Add FAQ' to start.
                    </div>
                  ) : (
                    faqFields.map((field, index) => (
                      <div key={field.id} className="p-4 border rounded-lg bg-white shadow-sm flex flex-col gap-3 group relative">
                        <div className="flex justify-between items-center">
                          <Label className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Question {index + 1}</Label>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => index > 0 && moveFaq(index, index - 1)} 
                              className="h-7 w-7 text-gray-400 hover:text-gray-800"
                              disabled={index === 0}
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </Button>
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => index < faqFields.length - 1 && moveFaq(index, index + 1)} 
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
                          <Input {...form.register(`faqs.${index}.question`)} placeholder="e.g. What is the fitness level required?" className="font-medium" />
                          {form.formState.errors.faqs?.[index]?.question && <p className="text-xs text-red-500 mt-1">{form.formState.errors.faqs[index].question.message}</p>}
                        </div>
                        <div>
                          <Textarea {...form.register(`faqs.${index}.answer`)} placeholder="Provide a detailed answer..." rows={2} className="resize-none" />
                          {form.formState.errors.faqs?.[index]?.answer && <p className="text-xs text-red-500 mt-1">{form.formState.errors.faqs[index].answer.message}</p>}
                        </div>
                      </div>
                    ))
                  )}
                </div>
                
                {/* TRIP TAGS */}
                <div className="space-y-3 p-4 mt-6 border rounded-lg bg-blue-50/30 border-blue-100">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold text-blue-800">Trip Tags</Label>
                    <Button type="button" variant="outline" size="sm" onClick={() => addTripTag({ value: "" })}>
                      <Plus className="w-4 h-4 mr-1" /> Add Tag
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500">Add tags to categorize this trip (e.g. Adventure, Couples, Snow)</p>
                  <div className="space-y-3">
                    {tripTagFields.map((field, index) => (
                      <div key={field.id} className="flex items-center gap-2">
                        <Input {...form.register(`tripTags.${index}.value`)} placeholder={`Tag ${index + 1}`} className="bg-white" />
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeTripTag(index)} className="text-red-500 hover:bg-red-50 shrink-0 border border-red-100 bg-white">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>

            {/* STEP 4: MEDIA (BANNER IMAGES) */}
            <div className={step === 4 ? "block" : "hidden"}>
              <div className="space-y-4">
                {isEdit && trip?.bannerImages?.length > 0 && (
                  <div className="mb-6">
                    <h4 className="font-medium mb-3 text-sm text-gray-500">Current Banner Images</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {trip.bannerImages.map((url: string, i: number) => (
                        <div key={url} className="relative group rounded-lg overflow-hidden border border-gray-200 aspect-video bg-gray-100">
                          <img src={url} alt={`Existing ${i}`} className="w-full h-full object-cover" />
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
                   <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm border border-gray-100 mb-4">
                     <UploadCloud className="w-8 h-8 text-[#c8a96e]" />
                   </div>
                   <h3 className="text-lg font-semibold text-gray-900 mb-1">
                     {isEdit ? "Upload Additional Images" : "Upload Banner Images"}
                   </h3>
                   <p className="text-sm text-gray-500 mb-6 max-w-sm">
                     High-quality images that will be shown at the top of the trip page. Recommended size: 1920x1080.
                   </p>
                   <Label htmlFor="image-upload" className="cursor-pointer bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-6 py-2.5 rounded-lg font-medium transition-colors shadow-sm inline-flex items-center gap-2">
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
                    <h4 className="font-medium mb-3 text-sm text-gray-500">New Selected Images ({imagePreviews.length})</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {imagePreviews.map((url, i) => (
                        <div key={url} className="relative group rounded-lg overflow-hidden border border-gray-200 aspect-video bg-gray-100">
                          <img src={url} alt={`Preview ${i}`} className="w-full h-full object-cover" />
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
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
              {isSubmitting ? "Saving..." : (isEdit ? "Save Changes" : "Publish Trip")}
            </Button>
          )}
        </div>

      </DialogContent>
    </Dialog>
  );
}

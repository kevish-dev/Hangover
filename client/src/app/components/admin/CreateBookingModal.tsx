import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../../lib/axios";
import { X, Loader2, User, MapPin, IndianRupee, Users, PlusCircle, ArrowLeft, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function CreateBookingModal({ 
  onClose, 
  onSuccess,
  prefillType = "TRIP",
  prefillItemId = ""
}: { 
  onClose: () => void, 
  onSuccess: () => void,
  prefillType?: "TRIP" | "FESTIVAL",
  prefillItemId?: string
}) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    email: "",
    fullName: "",
    phone: "",
    gender: "",
    dateOfBirth: "",
    govtIdAssetId: "",
    itemType: prefillType,
    itemId: prefillItemId,
    slotId: "",
    packageId: "",
    numberOfTravelers: 1,
    additionalTravelers: [] as any[],
    addOns: [] as any[],
    specialRequests: "",
    paymentAction: "SEND_LINK",
    initialPaymentType: "TOKEN",
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingGovtId, setIsUploadingGovtId] = useState(false);
  const [uploadingAdditionalIdx, setUploadingAdditionalIdx] = useState<number | null>(null);

  const { data: tripsData, isLoading: isLoadingTrips } = useQuery({
    queryKey: ["admin", "all-trips"],
    queryFn: () => apiClient.get("/trips?limit=100&adminView=true").then(res => res.data)
  });

  const { data: festivalsData, isLoading: isLoadingFestivals } = useQuery({
    queryKey: ["admin", "all-festivals"],
    queryFn: () => apiClient.get("/festivals?limit=100&adminView=true").then(res => res.data)
  });

  const items = formData.itemType === "TRIP" ? (tripsData?.data || []) : (festivalsData?.data || []);
  
  const { data: itemDetails, isLoading: isLoadingItemDetails } = useQuery({
    queryKey: ["admin", "item-details", formData.itemType, formData.itemId],
    queryFn: () => apiClient.get(`/${formData.itemType.toLowerCase()}s/${formData.itemId}?adminView=true`).then(res => res.data),
    enabled: !!formData.itemId
  });

  const slots = itemDetails?.slots || [];
  const packages = itemDetails?.packages || [];
  const availableAddOns = itemDetails?.addOns || [];

  const updateForm = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    if (step === 1 && !formData.email) {
      toast.error("Email is required.");
      return;
    }
    if (step === 2) {
      if (!formData.slotId || !formData.packageId) {
        toast.error("Please select a slot and package.");
        return;
      }
      
      // Initialize additional travelers if needed
      if (formData.numberOfTravelers > 1) {
        const extraCount = formData.numberOfTravelers - 1;
        const currentExtras = [...formData.additionalTravelers];
        while (currentExtras.length < extraCount) {
          currentExtras.push({ fullName: "", email: "", phone: "", gender: "", dateOfBirth: "", aadhaar: "" });
        }
        if (currentExtras.length > extraCount) {
          currentExtras.length = extraCount;
        }
        updateForm("additionalTravelers", currentExtras);
      }
    }

    if (step === 2 && formData.numberOfTravelers > 1) {
      setStep(3);
    } else if (step === 2 && availableAddOns.length > 0) {
      setStep(4);
    } else if (step === 3 && availableAddOns.length > 0) {
      setStep(4);
    } else if (step === 4 || (step === 3 && availableAddOns.length === 0) || (step === 2 && formData.numberOfTravelers === 1 && availableAddOns.length === 0)) {
      setStep(5);
    } else {
      setStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (step === 5) {
      if (availableAddOns.length > 0) setStep(4);
      else if (formData.numberOfTravelers > 1) setStep(3);
      else setStep(2);
    } else if (step === 4) {
      if (formData.numberOfTravelers > 1) setStep(3);
      else setStep(2);
    } else {
      setStep(prev => prev - 1);
    }
  };

  const handleAdditionalTravelerChange = (index: number, field: string, value: any) => {
    const updated = [...formData.additionalTravelers];
    updated[index] = { ...updated[index], [field]: value };
    updateForm("additionalTravelers", updated);
  };

  const handleGovtIdUpload = async (file: File | undefined, index?: number) => {
    if (!file) return;

    const form = new FormData();
    form.append("image", file);

    try {
      if (index !== undefined) {
        setUploadingAdditionalIdx(index);
      } else {
        setIsUploadingGovtId(true);
      }
      
      const res = await apiClient.post("/bookings/traveler/govt-id", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      
      if (index !== undefined) {
        handleAdditionalTravelerChange(index, "aadhaarAssetId", res.data.assetId);
      } else {
        updateForm("govtIdAssetId", res.data.assetId);
      }
      toast.success("Govt ID uploaded successfully");
    } catch (error) {
      toast.error("Failed to upload Govt ID");
    } finally {
      if (index !== undefined) {
        setUploadingAdditionalIdx(null);
      } else {
        setIsUploadingGovtId(false);
      }
    }
  };

  const handleAddOnChange = (addOnId: string, quantity: number) => {
    const existing = formData.addOns.filter(a => a.addOnId !== addOnId);
    if (quantity > 0) {
      existing.push({ addOnId, quantity });
    }
    updateForm("addOns", existing);
  };

  const handleSubmit = async () => {
    if (!formData.email || !formData.slotId || !formData.packageId) {
      toast.error("Please fill all required fields.");
      return;
    }
    
    setIsSubmitting(true);
    try {
      await apiClient.post("/bookings/admin-create", formData);
      toast.success("Booking created successfully!");
      onSuccess();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to create booking.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Pricing Summary Calculations
  const selectedPackage = packages.find((p: any) => p.id === formData.packageId);
  const basePrice = selectedPackage ? Number(selectedPackage.price) * formData.numberOfTravelers : 0;
  const tokenPerPerson = selectedPackage ? Number(selectedPackage.tokenAmount) : 0;
  
  let addOnsPrice = 0;
  formData.addOns.forEach(req => {
    const addon = availableAddOns.find((a: any) => a.id === req.addOnId);
    if (addon) addOnsPrice += Number(addon.price) * req.quantity;
  });

  const subTotal = basePrice + addOnsPrice;
  const gst = subTotal * 0.05;
  const total = subTotal + gst;
  const totalToken = (tokenPerPerson * formData.numberOfTravelers) * 1.05; // Token + 5% GST on token
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Create Booking</h2>
            <div className="flex items-center gap-2 mt-2">
              {[1, 2, 3, 4, 5].map(s => {
                if (s === 3 && formData.numberOfTravelers === 1) return null;
                if (s === 4 && availableAddOns.length === 0) return null;
                
                return (
                  <div key={s} className="flex items-center gap-2">
                    <div className={`h-2 w-8 rounded-full ${step >= s ? "bg-[#c8a96e]" : "bg-gray-200"}`} />
                  </div>
                )
              })}
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {step === 1 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                <User className="w-4 h-4 text-[#c8a96e]" /> Primary Traveler
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input 
                    type="email" 
                    value={formData.email}
                    onChange={(e) => updateForm("email", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c8a96e]"
                    placeholder="traveler@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input 
                    type="text" 
                    value={formData.fullName}
                    onChange={(e) => updateForm("fullName", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c8a96e]"
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input 
                    type="tel" 
                    value={formData.phone}
                    onChange={(e) => updateForm("phone", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c8a96e]"
                    placeholder="+91 9876543210"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                  <select 
                    value={formData.gender}
                    onChange={(e) => updateForm("gender", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c8a96e]"
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                  <input 
                    type="date" 
                    value={formData.dateOfBirth}
                    onChange={(e) => updateForm("dateOfBirth", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c8a96e]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Aadhar / Govt ID (Upload)</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="file" 
                      accept="image/*,.pdf"
                      onChange={(e) => handleGovtIdUpload(e.target.files?.[0])}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c8a96e] text-sm file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-[#c8a96e]/10 file:text-[#781216] hover:file:bg-[#c8a96e]/20 cursor-pointer"
                      disabled={isUploadingGovtId}
                    />
                    {isUploadingGovtId && <Loader2 className="w-4 h-4 animate-spin text-[#c8a96e] shrink-0" />}
                    {formData.govtIdAssetId && !isUploadingGovtId && <span className="text-xs text-green-600 font-medium shrink-0">Uploaded</span>}
                  </div>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-3 bg-gray-50 p-3 rounded-lg border border-gray-100">
                If the email matches an existing user, their profile will be linked (and updated with these details). If not, a new user will be created.
              </p>
            </div>
          )}

          {step === 2 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#c8a96e]" /> Trip & Slot
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select 
                    value={formData.itemType}
                    onChange={(e) => {
                      updateForm("itemType", e.target.value);
                      updateForm("itemId", "");
                      updateForm("slotId", "");
                      updateForm("packageId", "");
                      updateForm("addOns", []);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c8a96e]"
                  >
                    <option value="TRIP">Trip</option>
                    <option value="FESTIVAL">Festival</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Select {formData.itemType === "TRIP" ? "Trip" : "Festival"} *</label>
                  <select 
                    value={formData.itemId}
                    onChange={(e) => {
                      updateForm("itemId", e.target.value);
                      updateForm("slotId", "");
                      updateForm("packageId", "");
                      updateForm("addOns", []);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c8a96e]"
                    disabled={isLoadingTrips || isLoadingFestivals}
                  >
                    <option value="">-- Select --</option>
                    {items.map((item: any) => (
                      <option key={item.id} value={item.id}>{item.title}</option>
                    ))}
                  </select>
                </div>
              </div>

              {formData.itemId && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Select Slot *</label>
                    <select 
                      value={formData.slotId}
                      onChange={(e) => updateForm("slotId", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c8a96e]"
                      disabled={isLoadingItemDetails}
                    >
                      <option value="">-- Select Slot --</option>
                      {slots.map((s: any) => (
                        <option key={s.id} value={s.id}>
                          {s.startDate ? format(new Date(s.startDate), "PP") : "TBD"} - {s.capacity - s.filledSpots} spots left
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Select Package *</label>
                    <select 
                      value={formData.packageId}
                      onChange={(e) => updateForm("packageId", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c8a96e]"
                      disabled={isLoadingItemDetails}
                    >
                      <option value="">-- Select Package --</option>
                      {packages.map((p: any) => (
                        <option key={p.id} value={p.id}>
                          {p.title} (₹{Number(p.price).toLocaleString("en-IN")})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Number of Travelers</label>
                    <input 
                      type="number" 
                      min={1}
                      max={slots.find((s: any) => s.id === formData.slotId) ? (slots.find((s: any) => s.id === formData.slotId).capacity - slots.find((s: any) => s.id === formData.slotId).filledSpots) : 100}
                      value={formData.numberOfTravelers}
                      onChange={(e) => updateForm("numberOfTravelers", parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c8a96e]"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Users className="w-4 h-4 text-[#c8a96e]" /> Additional Travelers
              </h3>
              
              <div className="space-y-6">
                {formData.additionalTravelers.map((traveler, index) => (
                  <div key={index} className="p-4 border border-gray-200 rounded-xl bg-gray-50/50 relative">
                    <div className="absolute -top-3 -left-3 w-6 h-6 bg-[#c8a96e] text-white rounded-full flex items-center justify-center text-xs font-bold shadow-sm">
                      {index + 2}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Full Name</label>
                        <input 
                          type="text" 
                          value={traveler.fullName}
                          onChange={(e) => handleAdditionalTravelerChange(index, "fullName", e.target.value)}
                          className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c8a96e]"
                          placeholder="John Doe"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                        <input 
                          type="email" 
                          value={traveler.email}
                          onChange={(e) => handleAdditionalTravelerChange(index, "email", e.target.value)}
                          className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c8a96e]"
                          placeholder="Optional"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
                        <input 
                          type="text" 
                          value={traveler.phone}
                          onChange={(e) => handleAdditionalTravelerChange(index, "phone", e.target.value)}
                          className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c8a96e]"
                          placeholder="Optional"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Aadhar / Govt ID (Upload)</label>
                        <div className="flex items-center gap-2">
                          <input 
                            type="file" 
                            accept="image/*,.pdf"
                            onChange={(e) => handleGovtIdUpload(e.target.files?.[0], index)}
                            className="w-full px-3 py-1 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c8a96e] file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 cursor-pointer"
                            disabled={uploadingAdditionalIdx === index}
                          />
                          {uploadingAdditionalIdx === index && <Loader2 className="w-3 h-3 animate-spin text-[#c8a96e] shrink-0" />}
                          {traveler.aadhaarAssetId && uploadingAdditionalIdx !== index && <span className="text-[10px] text-green-600 font-medium shrink-0">Uploaded</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-[#c8a96e]" /> Add-Ons
              </h3>
              
              <div className="space-y-3">
                {availableAddOns.map((addon: any) => {
                  const selectedQty = formData.addOns.find(a => a.addOnId === addon.id)?.quantity || 0;
                  
                  return (
                    <div key={addon.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-xl">
                      <div>
                        <h4 className="font-semibold text-gray-900">{addon.title}</h4>
                        <p className="text-sm text-gray-500 line-clamp-1">{addon.description}</p>
                        <p className="text-sm font-medium text-[#781216] mt-1">₹{Number(addon.price).toLocaleString("en-IN")}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button 
                          type="button"
                          onClick={() => handleAddOnChange(addon.id, Math.max(0, selectedQty - 1))}
                          className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 text-gray-600"
                        >
                          -
                        </button>
                        <span className="w-4 text-center font-medium">{selectedQty}</span>
                        <button 
                          type="button"
                          onClick={() => handleAddOnChange(addon.id, addon.maxQuantityPerBooking ? Math.min(addon.maxQuantityPerBooking, selectedQty + 1) : selectedQty + 1)}
                          className="w-8 h-8 rounded-full border border-[#c8a96e] bg-[#c8a96e]/10 flex items-center justify-center hover:bg-[#c8a96e]/20 text-[#781216]"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                <IndianRupee className="w-4 h-4 text-[#c8a96e]" /> Payment & Summary
              </h3>
              
              <div className="bg-gray-50 rounded-xl p-5 mb-6 border border-gray-200">
                <h4 className="font-bold text-gray-900 border-b border-gray-200 pb-2 mb-3">Booking Summary</h4>
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>{selectedPackage?.title} (x{formData.numberOfTravelers})</span>
                    <span className="font-medium">₹{basePrice.toLocaleString("en-IN")}</span>
                  </div>
                  {formData.addOns.length > 0 && (
                    <div className="flex justify-between">
                      <span>Add-ons</span>
                      <span className="font-medium">₹{addOnsPrice.toLocaleString("en-IN")}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-gray-200 pt-2">
                    <span>Subtotal</span>
                    <span className="font-medium text-gray-900">₹{subTotal.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Taxes & Fees (5%)</span>
                    <span className="font-medium text-gray-900">₹{gst.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-300 pt-2 text-base font-bold text-gray-900">
                    <span>Total Cost</span>
                    <span className="text-[#781216]">₹{total.toLocaleString("en-IN")}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="border border-gray-200 rounded-xl p-4 flex gap-3 cursor-pointer hover:border-[#c8a96e]" onClick={() => updateForm("paymentAction", "SEND_LINK")}>
                  <div className="mt-1">
                    <input type="radio" checked={formData.paymentAction === "SEND_LINK"} readOnly />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Send Payment Link</h4>
                    <p className="text-xs text-gray-500 mt-1">Generate a Razorpay payment link and send it to the user's email.</p>
                  </div>
                </div>
                
                <div className="border border-gray-200 rounded-xl p-4 flex gap-3 cursor-pointer hover:border-[#c8a96e]" onClick={() => updateForm("paymentAction", "MARK_PAID")}>
                  <div className="mt-1">
                    <input type="radio" checked={formData.paymentAction === "MARK_PAID"} readOnly />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Mark as Paid</h4>
                    <p className="text-xs text-gray-500 mt-1">Create the booking as already paid offline and send invoice.</p>
                  </div>
                </div>
              </div>

              <div className="w-1/2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Initial Payment Type</label>
                <select 
                  value={formData.initialPaymentType}
                  onChange={(e) => updateForm("initialPaymentType", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c8a96e]"
                  disabled={totalToken === 0}
                >
                  {totalToken > 0 && <option value="TOKEN">Token Amount (₹{totalToken.toLocaleString("en-IN")})</option>}
                  <option value="FULL">Full Amount (₹{total.toLocaleString("en-IN")})</option>
                </select>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center shrink-0">
          <button 
            onClick={step === 1 ? onClose : handleBack}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-1"
          >
            {step === 1 ? "Cancel" : <><ArrowLeft className="w-4 h-4" /> Back</>}
          </button>
          
          {step < 5 ? (
            <button 
              onClick={handleNext}
              className="px-4 py-2 text-sm font-medium text-white bg-[#111827] hover:bg-black rounded-lg transition-colors flex items-center gap-1"
            >
              Next <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button 
              onClick={handleSubmit}
              disabled={isSubmitting || !formData.email || !formData.slotId || !formData.packageId}
              className="px-6 py-2 text-sm font-bold text-white bg-gradient-to-r from-[#c8a96e] to-[#b09561] hover:from-[#b09561] hover:to-[#967d4e] rounded-lg shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Create Booking
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

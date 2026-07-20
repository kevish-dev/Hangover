import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../../lib/axios";
import { X, Loader2, User, MapPin, IndianRupee } from "lucide-react";
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
  const [formData, setFormData] = useState({
    email: "",
    fullName: "",
    phone: "",
    gender: "",
    dateOfBirth: "",
    itemType: prefillType,
    itemId: prefillItemId,
    slotId: "",
    packageId: "",
    numberOfTravelers: 1,
    specialRequests: "",
    paymentAction: "SEND_LINK",
    initialPaymentType: "TOKEN",
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const updateForm = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center shrink-0">
          <h2 className="text-xl font-bold text-gray-900">Create Booking</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Step 1: User Details */}
          <div className="mb-8">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <User className="w-4 h-4 text-[#c8a96e]" /> 1. Traveler Details
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
            </div>
            <p className="text-xs text-gray-500 mt-2">If the email matches an existing user, their profile will be linked (and updated with these details). If not, a new user will be created.</p>
          </div>

          {/* Step 2: Trip Details */}
          <div className="mb-8">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#c8a96e]" /> 2. Trip & Slot
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
                    value={formData.numberOfTravelers}
                    onChange={(e) => updateForm("numberOfTravelers", parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c8a96e]"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Step 3: Payment */}
          <div>
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <IndianRupee className="w-4 h-4 text-[#c8a96e]" /> 3. Payment Action
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="border border-gray-200 rounded-xl p-4 flex gap-3 cursor-pointer hover:border-[#c8a96e]" onClick={() => updateForm("paymentAction", "SEND_LINK")}>
                <div className="mt-1">
                  <input type="radio" checked={formData.paymentAction === "SEND_LINK"} readOnly />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Send Payment Link</h4>
                  <p className="text-xs text-gray-500 mt-1">Generate a Razorpay payment link and send it to the user's email to complete the payment.</p>
                </div>
              </div>
              
              <div className="border border-gray-200 rounded-xl p-4 flex gap-3 cursor-pointer hover:border-[#c8a96e]" onClick={() => updateForm("paymentAction", "MARK_PAID")}>
                <div className="mt-1">
                  <input type="radio" checked={formData.paymentAction === "MARK_PAID"} readOnly />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Mark as Paid</h4>
                  <p className="text-xs text-gray-500 mt-1">Create the booking as already paid (e.g. collected offline) and send the invoice email.</p>
                </div>
              </div>
            </div>

            <div className="w-1/2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Initial Payment Type</label>
              <select 
                value={formData.initialPaymentType}
                onChange={(e) => updateForm("initialPaymentType", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c8a96e]"
              >
                <option value="TOKEN">Token Amount</option>
                <option value="FULL">Full Amount</option>
              </select>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 shrink-0">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleSubmit}
            disabled={isSubmitting || !formData.email || !formData.slotId || !formData.packageId}
            className="px-4 py-2 text-sm font-medium text-white bg-[#c8a96e] hover:bg-[#b09561] rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            Create Booking
          </button>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { apiClient } from "../../../lib/axios";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface DestinationFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  destination: any | null;
}

export function DestinationFormModal({ open, onOpenChange, destination }: DestinationFormModalProps) {
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    state: "",
    subheading: "",
    tripIds: [] as string[],
    isPublished: false,
  });

  const { data: tripsData } = useQuery({
    queryKey: ["admin", "trips"],
    queryFn: async () => {
      const res = await apiClient.get("/trips?limit=100&adminView=true");
      return res.data;
    },
    enabled: open, // Only fetch trips when modal is open
  });

  const availableTrips = tripsData?.data || [];

  useEffect(() => {
    if (destination) {
      setFormData({
        name: destination.name || "",
        state: destination.state || "",
        subheading: destination.subheading || "",
        tripIds: destination.trips?.map((t: any) => t.id) || [],
        isPublished: destination.isPublished || false,
      });
    } else {
      setFormData({
        name: "",
        state: "",
        subheading: "",
        tripIds: [],
        isPublished: false,
      });
    }
  }, [destination, open]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleTripToggle = (tripId: string) => {
    setFormData(prev => {
      const isSelected = prev.tripIds.includes(tripId);
      if (isSelected) {
        return { ...prev, tripIds: prev.tripIds.filter(id => id !== tripId) };
      } else {
        return { ...prev, tripIds: [...prev.tripIds, tripId] };
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      if (destination) {
        await apiClient.put(`/destinations/${destination.id}`, formData);
        toast.success("Destination updated successfully");
      } else {
        await apiClient.post("/destinations", formData);
        toast.success("Destination created successfully");
      }
      queryClient.invalidateQueries({ queryKey: ["admin", "destinations"] });
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error(destination ? "Failed to update destination" : "Failed to create destination");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto p-6 sm:p-8">
        <DialogHeader>
          <DialogTitle>{destination ? "Edit Destination" : "Create New Destination"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Destination Name *</label>
              <Input
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g., Manali"
                required
              />
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1 block">State / Region *</label>
              <Input
                name="state"
                value={formData.state}
                onChange={handleChange}
                placeholder="e.g., Himachal Pradesh"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Subheading / Description</label>
              <Textarea
                name="subheading"
                value={formData.subheading}
                onChange={handleChange}
                placeholder="A short catchy phrase about the destination..."
                rows={3}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Map Trips to this Destination</label>
              <div className="border border-gray-200 rounded-md p-3 max-h-48 overflow-y-auto bg-gray-50/50 space-y-2">
                {availableTrips.length === 0 ? (
                  <p className="text-sm text-gray-500 py-2">No trips available to map.</p>
                ) : (
                  availableTrips.map((trip: any) => (
                    <label key={trip.id} className="flex items-center space-x-3 p-2 hover:bg-white rounded cursor-pointer transition-colors border border-transparent hover:border-gray-200">
                      <input 
                        type="checkbox" 
                        checked={formData.tripIds.includes(trip.id)}
                        onChange={() => handleTripToggle(trip.id)}
                        className="w-4 h-4 text-[#c8a96e] rounded border-gray-300 focus:ring-[#c8a96e]"
                      />
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-900">{trip.title}</span>
                        <span className="text-xs text-gray-500">{trip.location}</span>
                      </div>
                    </label>
                  ))
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 mt-4">
              <input 
                type="checkbox" 
                id="isPublished"
                name="isPublished"
                checked={formData.isPublished}
                onChange={(e) => setFormData(prev => ({ ...prev, isPublished: e.target.checked }))}
                className="w-4 h-4 text-[#c8a96e] rounded border-gray-300 focus:ring-[#c8a96e]"
              />
              <label htmlFor="isPublished" className="text-sm font-medium cursor-pointer">Publish this destination (visible to public)</label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="bg-[#c8a96e] hover:bg-[#b8943a] text-white">
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                destination ? "Update Destination" : "Create Destination"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

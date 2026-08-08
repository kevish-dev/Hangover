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
    isPublished: false,
  });

  useEffect(() => {
    if (destination) {
      setFormData({
        name: destination.name || "",
        state: destination.state || "",
        subheading: destination.subheading || "",
        isPublished: destination.isPublished || false,
      });
    } else {
      setFormData({
        name: "",
        state: "",
        subheading: "",
        isPublished: false,
      });
    }
  }, [destination, open]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
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
      <DialogContent className="!w-[calc(100%-0.75rem)] !max-h-[calc(100dvh-0.75rem)] sm:max-w-[600px] overflow-y-auto p-0 border-0 shadow-lg md:!w-full md:!max-h-[90vh]">
        <div className="bg-white p-6 sm:p-8 rounded-lg">
          <DialogHeader className="mb-6">
            <span className="block text-[10px] font-bold tracking-[0.1em] text-[#b59410] uppercase mb-1">
              {destination ? "Update" : "Creation"}
            </span>
            <DialogTitle className="text-2xl font-medium tracking-tight text-gray-900">
              {destination ? "Edit Destination" : "New Destination"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-5">
              <div>
                <label className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-2 block">Destination Name</label>
                <Input
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g., Swiss Alps"
                  className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#b59410]/50 focus:border-[#b59410] transition-colors shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                  required
                />
              </div>
              
              <div>
                <label className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-2 block">State / Region</label>
                <Input
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  placeholder="e.g., Valais"
                  className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#b59410]/50 focus:border-[#b59410] transition-colors shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-2 block">Subheading</label>
                <Textarea
                  name="subheading"
                  value={formData.subheading}
                  onChange={handleChange}
                  placeholder="A short description of the destination..."
                  rows={2}
                  className="flex min-h-[80px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#b59410]/50 focus:border-[#b59410] transition-colors shadow-sm resize-y disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <input 
                  type="checkbox" 
                  id="isPublished"
                  name="isPublished"
                  checked={formData.isPublished}
                  onChange={(e) => setFormData(prev => ({ ...prev, isPublished: e.target.checked }))}
                  className="w-4 h-4 text-[#b59410] rounded border-gray-300 focus:ring-[#b59410]"
                />
                <label htmlFor="isPublished" className="text-sm text-gray-700 cursor-pointer">Publish destination to public site</label>
              </div>
            </div>

            <div className="flex flex-col-reverse md:flex-row md:justify-end gap-3 pt-8 border-t border-gray-100 mt-8">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="w-full md:w-auto text-gray-500 hover:text-gray-900">
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="w-full md:w-auto bg-[#b59410] hover:bg-[#8a710c] text-white">
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
        </div>
      </DialogContent>
    </Dialog>
  );
}

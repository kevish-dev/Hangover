import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../../lib/axios";
import { DestinationFormModal } from "../../components/admin/DestinationFormModal";
import { MapPin, Plus, Edit2, Trash2, Navigation, Eye, EyeOff } from "lucide-react";
import { Button } from "../../components/ui/button";
import { toast } from "sonner";

export default function AdminDestinationsPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDestination, setEditingDestination] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "destinations"],
    queryFn: async () => {
      const res = await apiClient.get("/destinations");
      return res.data;
    },
  });

  const handleDelete = async (destinationId: string) => {
    if (window.confirm("Are you sure you want to delete this destination? This action cannot be undone.")) {
      try {
        await apiClient.delete(`/destinations/${destinationId}`);
        toast.success("Destination deleted successfully");
        queryClient.invalidateQueries({ queryKey: ["admin", "destinations"] });
      } catch (error) {
        toast.error("Failed to delete destination");
      }
    }
  };

  const handleTogglePublish = async (destination: any) => {
    try {
      await apiClient.put(`/destinations/${destination.id}`, { isPublished: !destination.isPublished });
      toast.success(destination.isPublished ? "Destination unpublished" : "Destination published");
      queryClient.invalidateQueries({ queryKey: ["admin", "destinations"] });
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const openCreateModal = () => {
    setEditingDestination(null);
    setIsModalOpen(true);
  };

  const openEditModal = (destination: any) => {
    setEditingDestination(destination);
    setIsModalOpen(true);
  };

  if (isLoading) {
    return <div className="p-8 text-gray-500">Loading destinations...</div>;
  }

  const destinations = data?.data || [];

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <MapPin className="w-6 h-6 text-[#c8a96e]" />
            Destinations
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage destinations and map trips to them.
          </p>
        </div>
        <Button onClick={openCreateModal} className="bg-[#c8a96e] hover:bg-[#b8943a] text-white flex items-center gap-2">
          <Plus className="w-4 h-4" /> Create Destination
        </Button>
      </div>

      <DestinationFormModal 
        open={isModalOpen} 
        onOpenChange={setIsModalOpen} 
        destination={editingDestination} 
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {destinations.length === 0 ? (
          <div className="col-span-full py-12 text-center bg-white border border-gray-200 border-dashed rounded-xl">
            <p className="text-gray-500">No destinations found. Create your first destination above!</p>
          </div>
        ) : (
          destinations.map((destination: any) => (
            <div key={destination.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col group hover:shadow-md transition-shadow relative">
              <div className="p-5 flex-1 flex flex-col">
                {!destination.isPublished && (
                  <div className="absolute top-3 right-3 px-2.5 py-1 bg-red-100 text-red-700 rounded text-xs font-bold uppercase tracking-wider">
                    Draft
                  </div>
                )}
                <h3 className="font-bold text-lg text-gray-900 leading-tight line-clamp-1 pr-14">{destination.name}</h3>
                <div className="flex items-center gap-1.5 text-gray-500 text-sm mt-2">
                  <Navigation className="w-4 h-4 shrink-0" />
                  <span className="truncate">{destination.state}</span>
                </div>
                
                {destination.subheading && (
                  <p className="text-sm text-gray-600 mt-3 line-clamp-2">
                    {destination.subheading}
                  </p>
                )}

                <div className="mt-4 text-sm">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-100 text-gray-700 font-medium">
                    {destination.trips?.length || 0} {destination.trips?.length === 1 ? 'Trip' : 'Trips'} Linked
                  </span>
                </div>
                
                <div className="mt-auto pt-4 flex items-center justify-end gap-2 border-t border-gray-100 mt-6">
                  <button 
                    onClick={() => handleTogglePublish(destination)}
                    className={`text-sm font-medium transition-colors flex items-center gap-1 ${destination.isPublished ? 'text-gray-500 hover:text-orange-600' : 'text-gray-500 hover:text-green-600'}`}
                  >
                    {destination.isPublished ? <><EyeOff className="w-3.5 h-3.5" /> Unpublish</> : <><Eye className="w-3.5 h-3.5" /> Publish</>}
                  </button>
                  <div className="w-px h-3 bg-gray-300 mx-1" />
                  <button 
                    onClick={() => openEditModal(destination)}
                    className="text-sm font-medium text-gray-500 hover:text-[#c8a96e] transition-colors flex items-center gap-1"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Edit
                  </button>
                  <div className="w-px h-3 bg-gray-300 mx-1" />
                  <button 
                    onClick={() => handleDelete(destination.id)}
                    className="text-sm font-medium text-gray-500 hover:text-red-600 transition-colors flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

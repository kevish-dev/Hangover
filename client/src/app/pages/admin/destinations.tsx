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
      const res = await apiClient.get("/destinations?adminView=true");
      return res.data;
    },
  });

  const confirmAction = (title: string, description: string, actionLabel: string, actionFn: () => Promise<void>) => {
    toast(title, {
      description,
      position: "bottom-right",
      action: { label: actionLabel, onClick: actionFn },
      cancel: { label: "Cancel", onClick: () => {} },
    });
  };

  const handleDelete = (destinationId: string) => {
    confirmAction(
      "Delete Destination?",
      "Are you sure you want to delete this destination? This action cannot be undone.",
      "Delete",
      async () => {
        try {
          await apiClient.delete(`/destinations/${destinationId}`);
          toast.success("Destination deleted successfully");
          queryClient.invalidateQueries({ queryKey: ["admin", "destinations"] });
        } catch (error) {
          toast.error("Failed to delete destination");
        }
      }
    );
  };

  const handleTogglePublish = (destination: any) => {
    confirmAction(
      destination.isPublished ? "Unpublish Destination?" : "Publish Destination?",
      `Are you sure you want to ${destination.isPublished ? "unpublish" : "publish"} this destination?`,
      "Confirm",
      async () => {
        try {
          await apiClient.put(`/destinations/${destination.id}`, { isPublished: !destination.isPublished });
          toast.success(destination.isPublished ? "Destination unpublished" : "Destination published");
          queryClient.invalidateQueries({ queryKey: ["admin", "destinations"] });
        } catch (error) {
          toast.error("Failed to update status");
        }
      }
    );
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
    <div className="mx-auto max-w-7xl space-y-12 pb-16 font-sans">
      {/* Header */}
      <header className="pt-8">
        <span className="mb-2 block text-xs font-bold tracking-[0.1em] text-[#b59410] uppercase">
          Management Hub
        </span>
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-3xl font-medium tracking-tight text-gray-900">
              Destinations
            </h1>
            <p className="text-sm text-gray-500">
              Organize and manage your global travel offerings.
            </p>
          </div>
          <button 
            onClick={openCreateModal} 
            className="inline-flex items-center gap-2 rounded-lg border border-[#b59410] bg-white px-6 py-2.5 text-sm font-semibold tracking-[0.1em] text-[#b59410] uppercase transition-all duration-200 hover:bg-[#b59410] hover:text-white"
          >
            <Plus className="h-4 w-4" />
            Create Destination
          </button>
        </div>
      </header>

      <DestinationFormModal 
        open={isModalOpen} 
        onOpenChange={setIsModalOpen} 
        destination={editingDestination} 
      />

      {/* Grid Layout */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {destinations.length === 0 ? (
          <div 
            onClick={openCreateModal}
            className="col-span-full group flex cursor-pointer flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed border-gray-200 bg-white p-12 text-center transition-all hover:border-[#b59410] hover:bg-gray-50"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400 transition-colors group-hover:bg-[#fcf8ef] group-hover:text-[#b59410]">
              <Plus className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xs font-bold tracking-[0.1em] text-gray-500 uppercase transition-colors group-hover:text-[#b59410]">Add New Destination</h3>
              <p className="text-sm text-gray-400">Click to start creating a new luxury travel offering.</p>
            </div>
          </div>
        ) : (
          destinations.map((destination: any) => (
            <div 
              key={destination.id} 
              className="flex h-full flex-col rounded-lg border border-gray-200 bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:border-[#b59410] hover:bg-[#fcfcfc]"
            >
              <div className="mb-4 flex flex-1 flex-col space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-[20px] font-bold text-gray-900 line-clamp-1">{destination.name}</h3>
                  {!destination.isPublished && (
                    <span className="rounded bg-gray-100 px-2 py-0.5 text-[10px] font-semibold tracking-widest text-gray-500 uppercase">
                      DRAFT
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-gray-500">
                  <Navigation className="h-4 w-4 shrink-0" />
                  <span className="text-sm truncate">{destination.state}</span>
                </div>
                {destination.subheading && (
                  <p className="text-sm leading-relaxed text-gray-600 line-clamp-2">
                    {destination.subheading}
                  </p>
                )}
                <div className="pt-2">
                  <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-[11px] font-medium text-gray-600">
                    {destination.circuits?.length || 0} {destination.circuits?.length === 1 ? 'Circuit' : 'Circuits'} Linked
                  </span>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-gray-100 pt-4">
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => handleTogglePublish(destination)}
                    className={`flex items-center gap-1 text-sm font-medium transition-colors ${destination.isPublished ? 'text-gray-500 hover:text-orange-600' : 'text-gray-500 hover:text-[#b59410]'}`}
                  >
                    {destination.isPublished ? (
                      <><EyeOff className="h-4 w-4" /> Unpublish</>
                    ) : (
                      <><Eye className="h-4 w-4" /> Publish</>
                    )}
                  </button>
                  <button 
                    onClick={() => openEditModal(destination)}
                    className="flex items-center gap-1 text-sm font-medium text-gray-500 transition-colors hover:text-[#b59410]"
                  >
                    <Edit2 className="h-4 w-4" /> Edit
                  </button>
                </div>
                <button 
                  onClick={() => handleDelete(destination.id)}
                  className="flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-red-600 transition-colors"
                >
                  <Trash2 className="h-4 w-4" /> Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

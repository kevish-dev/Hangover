import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../../lib/axios";
import { TripFormModal } from "../../components/admin/TripFormModal";
import { Map, MapPin, Calendar, Users, IndianRupee, Plus, Edit2, Trash2, Eye, EyeOff } from "lucide-react";
import { format } from "date-fns";
import { Button } from "../../components/ui/button";
import { toast } from "sonner";

export default function AdminTripsPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTrip, setEditingTrip] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "trips"],
    queryFn: async () => {
      const res = await apiClient.get("/trips");
      return res.data;
    },
  });

  const handleDelete = async (tripId: string) => {
    if (window.confirm("Are you sure you want to delete this trip? This action cannot be undone.")) {
      try {
        await apiClient.delete(`/trips/${tripId}`);
        toast.success("Trip deleted successfully");
        queryClient.invalidateQueries({ queryKey: ["admin", "trips"] });
      } catch (error) {
        toast.error("Failed to delete trip");
      }
    }
  };

  const handleTogglePublish = async (trip: any) => {
    try {
      // Create a payload with the existing data to satisfy schema requirements if necessary, but prisma partial update allows just the flag.
      await apiClient.put(`/trips/${trip.id}`, { isPublished: !trip.isPublished });
      toast.success(trip.isPublished ? "Trip unpublished" : "Trip published");
      queryClient.invalidateQueries({ queryKey: ["admin", "trips"] });
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const openCreateModal = () => {
    setEditingTrip(null);
    setIsModalOpen(true);
  };

  const openEditModal = (trip: any) => {
    setEditingTrip(trip);
    setIsModalOpen(true);
  };

  if (isLoading) {
    return <div className="p-8 text-gray-500">Loading trips...</div>;
  }

  const trips = data?.data || [];

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Map className="w-6 h-6 text-[#c8a96e]" />
            Trip Management
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage your trips, itineraries, and media all in one place.
          </p>
        </div>
        <Button onClick={openCreateModal} className="bg-[#c8a96e] hover:bg-[#b8943a] text-white flex items-center gap-2">
          <Plus className="w-4 h-4" /> Create Trip
        </Button>
      </div>

      <TripFormModal 
        open={isModalOpen} 
        onOpenChange={setIsModalOpen} 
        trip={editingTrip} 
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {trips.length === 0 ? (
          <div className="col-span-full py-12 text-center bg-white border border-gray-200 border-dashed rounded-xl">
            <p className="text-gray-500">No trips found. Create your first trip above!</p>
          </div>
        ) : (
          trips.map((trip: any) => (
            <div key={trip.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col group hover:shadow-md transition-shadow">
              <div className="h-48 bg-gray-200 relative overflow-hidden">
                {trip.bannerImages && trip.bannerImages.length > 0 ? (
                  <img src={trip.bannerImages[0]} alt={trip.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-100">
                    No Image
                  </div>
                )}
                <div className="absolute top-3 left-3 px-2.5 py-1 bg-white/90 backdrop-blur-md rounded text-xs font-semibold text-gray-800 uppercase tracking-wider">
                  {trip.tripType.replace(/_/g, " ")}
                </div>
                {!trip.isPublished && (
                  <div className="absolute top-3 right-3 px-2.5 py-1 bg-red-100 text-red-700 rounded text-xs font-bold uppercase tracking-wider">
                    Draft
                  </div>
                )}
              </div>
              <div className="p-5 flex-1 flex flex-col">
                <h3 className="font-bold text-lg text-gray-900 leading-tight line-clamp-1">{trip.title}</h3>
                <div className="flex items-center gap-1.5 text-gray-500 text-sm mt-2">
                  <MapPin className="w-4 h-4 shrink-0" />
                  <span className="truncate">{trip.location}</span>
                </div>
                
                <div className="mt-4 grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span>{trip.startDate ? format(new Date(trip.startDate), "MMM d, yyyy") : 'TBD'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Users className="w-4 h-4 text-gray-400" />
                    <span>{trip.capacity} pax</span>
                  </div>
                </div>
                
                <div className="mt-auto pt-4 flex items-center justify-between border-t border-gray-100">
                  <div className="flex items-center font-semibold text-[#781216]">
                    <IndianRupee className="w-4 h-4" />
                    <span>{parseInt(trip.price).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleTogglePublish(trip)}
                      className={`text-sm font-medium transition-colors flex items-center gap-1 ${trip.isPublished ? 'text-gray-500 hover:text-orange-600' : 'text-gray-500 hover:text-green-600'}`}
                    >
                      {trip.isPublished ? <><EyeOff className="w-3.5 h-3.5" /> Unpublish</> : <><Eye className="w-3.5 h-3.5" /> Publish</>}
                    </button>
                    <div className="w-px h-3 bg-gray-300 mx-1" />
                    <button 
                      onClick={() => openEditModal(trip)}
                      className="text-sm font-medium text-gray-500 hover:text-[#c8a96e] transition-colors flex items-center gap-1"
                    >
                      <Edit2 className="w-3.5 h-3.5" /> Edit
                    </button>
                    <div className="w-px h-3 bg-gray-300 mx-1" />
                    <button 
                      onClick={() => handleDelete(trip.id)}
                      className="text-sm font-medium text-gray-500 hover:text-red-600 transition-colors flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../../lib/axios";
import { FileText, MapPin, Calendar, Users, IndianRupee, Eye, Settings2 } from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router";

export default function AdminFormsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "trips"],
    queryFn: async () => {
      const res = await apiClient.get("/trips");
      return res.data;
    },
  });

  if (isLoading) {
    return <div className="p-8 text-gray-500">Loading trips...</div>;
  }

  const trips = data?.data || [];

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-[#c8a96e]" />
            Trip Form Management
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            View individual form submissions and responses for each trip.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {trips.length === 0 ? (
          <div className="col-span-full py-12 text-center bg-white border border-gray-200 border-dashed rounded-xl">
            <p className="text-gray-500">No trips found.</p>
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
                  <div className="flex items-center">
                    <Link 
                      to={`/dashboard/forms/${trip.id}`}
                      className="text-sm font-medium text-[#c8a96e] hover:text-[#b8943a] transition-colors flex items-center gap-1"
                    >
                      <Settings2 className="w-4 h-4" /> Manage Forms
                    </Link>
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

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, MessageSquare, Star, Trash2, Eye, EyeOff, Search } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { getAllReviews, toggleReviewVisibility, deleteReview, type Review } from "../../../lib/reviewApi";

function reviewTripName(review: Review) {
  return review.booking?.crmTrip?.name || review.booking?.crmFestival?.name
    || review.booking?.crmTripSlot?.crmTrip.name || review.booking?.crmFestivalSlot?.crmFestival.name
    || review.customTrip?.title || review.trip?.title || review.festival?.title || "Unknown";
}

export default function AdminReviewsPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ["admin", "reviews"],
    queryFn: getAllReviews,
  });

  const toggleMutation = useMutation({
    mutationFn: toggleReviewVisibility,
    onSuccess: () => {
      toast.success("Review visibility updated");
      queryClient.invalidateQueries({ queryKey: ["admin", "reviews"] });
    },
    onError: () => toast.error("Failed to update visibility")
  });

  const deleteMutation = useMutation({
    mutationFn: deleteReview,
    onSuccess: () => {
      toast.success("Review deleted");
      queryClient.invalidateQueries({ queryKey: ["admin", "reviews"] });
    },
    onError: () => toast.error("Failed to delete review")
  });

  const filteredReviews = reviews.filter((r) => {
    const text = (r.comment || "").toLowerCase();
    const reviewerName = (r.user?.profile?.fullName || "").toLowerCase();
    const tripName = reviewTripName(r).toLowerCase();
    const query = searchQuery.toLowerCase();
    
    return text.includes(query) || reviewerName.includes(query) || tripName.includes(query);
  });

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#c8a96e]" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-950 flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-[#c8a96e]" />
            Review Management
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Monitor and curate guest experiences across all destinations.
          </p>
        </div>

        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 absolute left-0 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text"
            placeholder="Search reviews..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-4 py-3 bg-transparent border-0 border-b border-gray-200 focus:ring-0 focus:border-[#c8a96e] text-base md:text-sm text-gray-900 placeholder-gray-400 transition-colors outline-none shadow-none"
          />
        </div>
      </div>

      <div className="flex flex-col gap-6">
        {filteredReviews.length === 0 ? (
          <div className="border border-gray-100 bg-white p-12 text-center text-sm text-gray-500">
            No reviews found matching your criteria.
          </div>
        ) : (
          filteredReviews.map((review) => (
            <article key={review.id} className="bg-white border border-gray-100 p-6 md:p-8 flex flex-col gap-6 hover:shadow-md hover:border-gray-200 transition-all duration-300">
              <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 border-b border-gray-50 pb-4">
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] uppercase text-gray-400 tracking-widest font-bold">
                    {format(new Date(review.createdAt), "MMM d, yyyy")}
                  </span>
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="text-base text-gray-950 font-semibold">{review.user?.profile?.fullName || "Anonymous"}</h3>
                    <span className="bg-gray-50 border border-gray-100 text-gray-500 text-[10px] uppercase tracking-wider font-bold px-2.5 py-1 rounded-full">
                      {reviewTripName(review)}
                    </span>
                  </div>
                </div>
                
                <div className="flex flex-row-reverse md:flex-row items-center justify-between md:justify-end gap-4 w-full md:w-auto">
                  <div className="flex items-center gap-0.5 text-[#c8a96e]">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`w-4 h-4 ${i < review.rating ? "fill-current" : "text-gray-200"}`} />
                    ))}
                  </div>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                    (review.isPublished && review.publicConsent) ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60" : "bg-gray-50 text-gray-500 border border-gray-200/60"
                  }`}>
                    {review.isPublished && review.publicConsent && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>}
                    {(!review.isPublished || !review.publicConsent) && <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>}
                    {(review.isPublished && review.publicConsent) ? "Published" : review.publicConsent ? "Hidden" : "Private feedback"}
                  </span>
                </div>
              </div>
              
              <p className="text-sm md:text-base text-gray-700 max-w-4xl leading-relaxed whitespace-pre-wrap">
                {review.comment || "No comment provided."}
              </p>
              
              <div className="flex justify-end gap-2 mt-2">
                <button
                  disabled={!review.publicConsent || toggleMutation.isPending}
                  onClick={() => toggleMutation.mutate(review.id)}
                  className="p-2 text-gray-400 hover:text-gray-900 transition-colors duration-200 flex items-center justify-center rounded-full hover:bg-gray-50"
                  title={(review.isPublished && review.publicConsent) ? "Hide Review" : "Publish Review"}
                >
                  {(review.isPublished && review.publicConsent) ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
                <button
                  onClick={() => {
                    if (window.confirm("Are you sure you want to permanently delete this review?")) {
                      deleteMutation.mutate(review.id);
                    }
                  }}
                  className="p-2 text-gray-400 hover:text-red-600 transition-colors duration-200 flex items-center justify-center rounded-full hover:bg-red-50"
                  title="Delete"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}

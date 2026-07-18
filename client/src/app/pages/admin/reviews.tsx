import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, MessageSquare, Star, Trash2, Eye, EyeOff, Search } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { getAllReviews, toggleReviewVisibility, deleteReview } from "../../../lib/reviewApi";

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
    const tripName = (r.customTrip?.title || r.trip?.title || r.festival?.title || "").toLowerCase();
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
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-[#c8a96e]" />
            Reviews Dashboard
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage and moderate customer reviews across all trips and festivals.
          </p>
        </div>

        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text"
            placeholder="Search reviews..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#c8a96e] focus:border-transparent w-full"
          />
        </div>
      </div>

      <div className="md:hidden space-y-3">
        {filteredReviews.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white px-4 py-10 text-center text-sm text-gray-500">
            No reviews found.
          </div>
        ) : (
          filteredReviews.map((review) => (
            <article key={review.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-gray-900">{review.user?.profile?.fullName || "Anonymous"}</p>
                  <p className="mt-0.5 truncate text-xs text-gray-500">{review.customTrip?.title || review.trip?.title || review.festival?.title || "Unknown"}</p>
                </div>
                <span className={`shrink-0 rounded px-2 py-1 text-[11px] font-medium tracking-wide ${review.isPublished ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                  {review.isPublished ? "PUBLISHED" : "HIDDEN"}
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs">
                <div className="flex items-center font-semibold text-yellow-500">
                  {review.rating}<Star className="ml-1 h-4 w-4 fill-current" />
                </div>
                <span className="text-gray-500">{format(new Date(review.createdAt), "MMM d, yyyy")}</span>
              </div>
              <p className="mt-3 whitespace-pre-wrap break-words rounded-lg bg-gray-50 p-3 text-sm leading-6 text-gray-700">
                {review.comment || "No comment provided."}
              </p>
              <div className="mt-3 flex justify-end gap-2 border-t border-gray-100 pt-3">
                <button
                  onClick={() => toggleMutation.mutate(review.id)}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-gray-200 px-3 text-xs font-medium text-gray-600"
                >
                  {review.isPublished ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  {review.isPublished ? "Hide" : "Publish"}
                </button>
                <button
                  onClick={() => {
                    if (window.confirm("Are you sure you want to permanently delete this review?")) {
                      deleteMutation.mutate(review.id);
                    }
                  }}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-red-100 px-3 text-xs font-medium text-red-600"
                >
                  <Trash2 className="h-4 w-4" /> Delete
                </button>
              </div>
            </article>
          ))
        )}
      </div>

      <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Reviewer</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Trip/Festival</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Rating</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Comment</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredReviews.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    No reviews found.
                  </td>
                </tr>
              ) : (
                filteredReviews.map((review) => (
                  <tr key={review.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {format(new Date(review.createdAt), "MMM d, yyyy")}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-medium text-gray-900">{review.user?.profile?.fullName || "Anonymous"}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">{review.customTrip?.title || review.trip?.title || review.festival?.title || "Unknown"}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-yellow-400">
                        {review.rating} <Star className="w-4 h-4 ml-1 fill-current" />
                      </div>
                    </td>
                    <td className="px-6 py-4 max-w-xs truncate text-sm text-gray-600" title={review.comment || ""}>
                      {review.comment || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded text-xs font-medium tracking-wider ${review.isPublished ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                        {review.isPublished ? 'PUBLISHED' : 'HIDDEN'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right space-x-2">
                      <button 
                        onClick={() => toggleMutation.mutate(review.id)}
                        className="p-2 text-gray-400 hover:text-[#c8a96e] hover:bg-[#c8a96e]/10 rounded-lg transition-colors inline-flex"
                        title={review.isPublished ? "Hide Review" : "Publish Review"}
                      >
                        {review.isPublished ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <button 
                        onClick={() => {
                          if (window.confirm("Are you sure you want to permanently delete this review?")) {
                            deleteMutation.mutate(review.id);
                          }
                        }}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors inline-flex"
                        title="Delete Review"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

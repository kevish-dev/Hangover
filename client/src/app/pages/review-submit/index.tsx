import { useState } from "react";
import { useParams, useNavigate } from "react-router";
import { Star, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { submitReview } from "../../../lib/reviewApi";
import { useMutation } from "@tanstack/react-query";
import { showErrorToast } from "../../../lib/errors";

export default function ReviewSubmitPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!bookingId) throw new Error("Booking ID missing");
      if (rating === 0) throw new Error("Please select a rating");
      return submitReview({ bookingId, rating, comment: comment.trim() || undefined });
    },
    onSuccess: () => {
      setIsSuccess(true);
      toast.success("Thank you for your review!");
    },
    onError: (error: unknown) => showErrorToast(error, "Failed to submit review"),
  });

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm p-8 text-center space-y-6">
          <div className="flex justify-center">
            <div className="h-20 w-20 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-gray-900">Review Submitted!</h2>
            <p className="text-gray-500">Thank you for sharing your experience. We hope to see you on another trip soon!</p>
          </div>
          <button
            onClick={() => navigate("/profile")}
            className="w-full py-3 px-4 bg-[#781216] hover:bg-[#5a0d10] text-white font-medium rounded-xl transition-colors"
          >
            Go to Profile
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 flex justify-center">
      <div className="max-w-xl w-full">
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {/* Header */}
          <div className="bg-[#781216] px-8 py-10 text-center text-white">
            <h1 className="text-3xl font-bold mb-2">How was your trip?</h1>
            <p className="text-white/80">Your feedback helps us improve and helps other travelers.</p>
          </div>

          <div className="p-8 space-y-8">
            {/* Star Rating */}
            <div className="flex flex-col items-center space-y-4">
              <span className="text-sm font-medium text-gray-700">Tap to rate your experience</span>
              <div className="flex items-center space-x-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-1 focus:outline-none transition-transform hover:scale-110 active:scale-95"
                  >
                    <Star
                      className={`w-12 h-12 transition-colors ${
                        (hoverRating ? star <= hoverRating : star <= rating)
                          ? "fill-yellow-400 text-yellow-400"
                          : "fill-transparent text-gray-300"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Comment */}
            <div className="space-y-3">
              <label htmlFor="comment" className="block text-sm font-medium text-gray-700">
                Tell us more (Optional)
              </label>
              <textarea
                id="comment"
                rows={4}
                className="w-full rounded-xl border border-gray-200 p-4 text-gray-700 placeholder-gray-400 focus:border-[#781216] focus:ring-[#781216] transition-all resize-none"
                placeholder="What did you love? What could we improve?"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </div>

            {/* Submit */}
            <button
              onClick={() => submitMutation.mutate()}
              disabled={rating === 0 || submitMutation.isPending}
              className={`w-full py-4 px-4 rounded-xl text-white font-semibold text-lg transition-all
                ${rating === 0 
                  ? 'bg-gray-300 cursor-not-allowed' 
                  : 'bg-[#781216] hover:bg-[#5a0d10] shadow-md hover:shadow-lg'
                }
              `}
            >
              {submitMutation.isPending ? (
                <div className="flex items-center justify-center space-x-2">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span>Submitting...</span>
                </div>
              ) : (
                "Submit Review"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

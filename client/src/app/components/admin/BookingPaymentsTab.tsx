import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../../lib/axios";
import { toast } from "sonner";
import { format } from "date-fns";
import { IndianRupee, AlertCircle, Ban, RefreshCcw } from "lucide-react";
import { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

export function BookingPaymentsTab({ bookingId, booking }: { bookingId: string; booking: any }) {
  const queryClient = useQueryClient();
  const [refundingPayment, setRefundingPayment] = useState<any>(null);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");
  
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelRefundAmount, setCancelRefundAmount] = useState("");

  const refundMutation = useMutation({
    mutationFn: async ({ paymentId, amount, reason }: { paymentId: string, amount: number, reason: string }) => {
      const res = await apiClient.post(`/payments/${paymentId}/refund`, { amount, reason });
      return res.data;
    },
    onSuccess: () => {
      toast.success("Refund initiated successfully");
      setRefundingPayment(null);
      setRefundAmount("");
      setRefundReason("");
      queryClient.invalidateQueries({ queryKey: ["admin", "booking", bookingId] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to issue refund");
    }
  });

  const cancelMutation = useMutation({
    mutationFn: async ({ reason, refundAmount }: { reason: string, refundAmount?: number }) => {
      const res = await apiClient.post(`/bookings/${bookingId}/cancel-and-refund`, { reason, refundAmount });
      return res.data;
    },
    onSuccess: () => {
      toast.success("Booking cancelled successfully");
      setIsCancelling(false);
      setCancelReason("");
      setCancelRefundAmount("");
      queryClient.invalidateQueries({ queryKey: ["admin", "booking", bookingId] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to cancel booking");
    }
  });

  const handleRefundSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!refundingPayment) return;
    const amount = Number(refundAmount);
    if (!amount || amount <= 0) return toast.error("Enter a valid refund amount");
    refundMutation.mutate({ paymentId: refundingPayment.id, amount, reason: refundReason });
  };

  const handleCancelSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelReason.trim()) return toast.error("Cancellation reason is required");
    const amount = cancelRefundAmount ? Number(cancelRefundAmount) : 0;
    cancelMutation.mutate({ reason: cancelReason, refundAmount: amount });
  };

  const payments = booking.payments || [];

  return (
    <div className="p-4 md:p-6 bg-white space-y-8 rounded-b-xl border border-t-0 border-[#e8d9b7]/40 shadow-sm">
      {/* Cancel Booking Section */}
      {booking.status !== "CANCELLED" && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-red-800 font-semibold flex items-center gap-2">
                <Ban className="w-5 h-5" /> Cancel Booking
              </h4>
              <p className="text-xs text-red-600 mt-1">This action will cancel the booking and optionally issue a refund.</p>
            </div>
            {!isCancelling ? (
              <Button variant="destructive" size="sm" onClick={() => setIsCancelling(true)}>
                Cancel Booking
              </Button>
            ) : null}
          </div>
          
          {isCancelling && (
            <form onSubmit={handleCancelSubmit} className="mt-4 flex flex-col sm:flex-row items-end gap-3">
              <div className="flex-1 w-full">
                <label className="text-xs font-semibold text-red-800 mb-1 block">Reason for cancellation</label>
                <Input 
                  value={cancelReason} 
                  onChange={(e) => setCancelReason(e.target.value)} 
                  placeholder="e.g., Requested by user" 
                  className="bg-white border-red-200 focus-visible:ring-red-500"
                  required
                />
              </div>
              <div className="w-full sm:w-32">
                <label className="text-xs font-semibold text-red-800 mb-1 block">Refund Amount (₹)</label>
                <Input 
                  type="number"
                  value={cancelRefundAmount} 
                  onChange={(e) => setCancelRefundAmount(e.target.value)} 
                  placeholder="0" 
                  className="bg-white border-red-200 focus-visible:ring-red-500"
                />
              </div>
              <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                <Button variant="outline" type="button" onClick={() => setIsCancelling(false)} disabled={cancelMutation.isPending} className="flex-1 sm:flex-none">
                  Abort
                </Button>
                <Button variant="destructive" type="submit" disabled={cancelMutation.isPending} className="flex-1 sm:flex-none">
                  {cancelMutation.isPending ? "Cancelling..." : "Confirm"}
                </Button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Payments List */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
          <IndianRupee className="w-4 h-4 text-[#781216]" /> Payment History
        </h3>
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-gray-100 border-b border-gray-300">
                <tr>
                  <th className="px-4 py-3 font-semibold text-gray-600 border-r border-gray-300">Date</th>
                  <th className="px-4 py-3 font-semibold text-gray-600 border-r border-gray-300">Payment ID</th>
                  <th className="px-4 py-3 font-semibold text-gray-600 border-r border-gray-300 text-right">Amount</th>
                  <th className="px-4 py-3 font-semibold text-gray-600 border-r border-gray-300">Status</th>
                  <th className="px-4 py-3 font-semibold text-gray-600 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-gray-500 italic">No payments found</td>
                  </tr>
                ) : (
                  payments.map((p: any) => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 border-r border-gray-200">
                        {format(new Date(p.createdAt), "dd MMM yyyy, HH:mm")}
                      </td>
                      <td className="px-4 py-3 border-r border-gray-200 font-mono text-xs">
                        {p.razorpayPaymentId || p.id}
                      </td>
                      <td className="px-4 py-3 border-r border-gray-200 text-right font-semibold">
                        ₹{Number(p.amount).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 border-r border-gray-200">
                        <span className={`px-2 py-1 text-[10px] font-bold rounded-full ${p.status === 'SUCCESS' ? 'bg-green-100 text-green-800' : p.status === 'FAILED' ? 'bg-red-100 text-red-800' : p.status === 'REFUNDED' ? 'bg-purple-100 text-purple-800' : 'bg-yellow-100 text-yellow-800'}`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {(p.status === "SUCCESS" || p.status === "PARTIAL_REFUND") ? (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-xs h-7 gap-1"
                            onClick={() => {
                              setRefundingPayment(p);
                              setRefundAmount("");
                              setRefundReason("");
                            }}
                          >
                            <RefreshCcw className="w-3 h-3" /> Refund
                          </Button>
                        ) : null}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Refund Form Modal Overlay */}
      {refundingPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
            <div className="flex items-center gap-3 mb-4 text-red-700">
              <AlertCircle className="w-6 h-6" />
              <h3 className="font-semibold text-lg">Issue Refund</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Payment: <span className="font-mono text-xs font-bold">{refundingPayment.razorpayPaymentId || refundingPayment.id}</span>
              <br/>
              Max Refundable: <span className="font-semibold">₹{Number(refundingPayment.amount).toLocaleString()}</span>
            </p>
            
            <form onSubmit={handleRefundSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-700 mb-1 block">Refund Amount (₹)</label>
                <Input 
                  type="number" 
                  step="0.01" 
                  value={refundAmount} 
                  onChange={(e) => setRefundAmount(e.target.value)} 
                  placeholder={`Max: ${Number(refundingPayment.amount)}`}
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700 mb-1 block">Reason (Optional)</label>
                <Input 
                  value={refundReason} 
                  onChange={(e) => setRefundReason(e.target.value)} 
                  placeholder="e.g., Requested by user" 
                />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <Button variant="outline" type="button" onClick={() => setRefundingPayment(null)} disabled={refundMutation.isPending}>
                  Cancel
                </Button>
                <Button type="submit" disabled={refundMutation.isPending}>
                  {refundMutation.isPending ? "Processing..." : "Issue Refund"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

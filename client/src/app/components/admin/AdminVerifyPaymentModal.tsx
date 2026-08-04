import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Copy, Check, ShieldCheck, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "../../../lib/axios";

interface AdminVerifyPaymentModalProps {
  payment: {
    id: string;
    amount: number | string;
    utr?: string | null;
    paymentMethod?: string | null;
    status: string;
    bookingId: string;
    booking?: {
      bookingReference?: string;
      user?: {
        email: string;
        profile?: { fullName?: string | null; phone?: string | null } | null;
      };
    };
  };
  onClose: () => void;
  onSuccess: () => void;
}

export default function AdminVerifyPaymentModal({
  payment,
  onClose,
  onSuccess,
}: AdminVerifyPaymentModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [copiedUtr, setCopiedUtr] = useState(false);

  const copyUtr = () => {
    if (payment.utr) {
      navigator.clipboard.writeText(payment.utr);
      setCopiedUtr(true);
      toast.success("UTR copied to clipboard!");
      setTimeout(() => setCopiedUtr(false), 2000);
    }
  };

  const handleAction = async (action: "VERIFY" | "REJECT") => {
    setSubmitting(true);
    try {
      await apiClient.post(`/payments/${payment.id}/verify-upi`, { action });
      toast.success(
        action === "VERIFY"
          ? "Payment verified & approved successfully!"
          : "Payment rejected."
      );
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Action failed");
    } finally {
      setSubmitting(false);
    }
  };

  const customerName = payment.booking?.user?.profile?.fullName || payment.booking?.user?.email || "Customer";
  const customerEmail = payment.booking?.user?.email;
  const bookingRef = payment.booking?.bookingReference || payment.bookingId;

  return (
    <Dialog open onOpenChange={(val) => { if (!val) onClose(); }}>
      <DialogContent className="sm:max-w-md p-6">
        <DialogHeader className="pb-3 border-b border-gray-100">
          <DialogTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-amber-600" /> Verify UPI Payment
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Amount banner */}
          <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 text-center">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-800">Submitted Payment Amount</p>
            <p className="mt-1 text-3xl font-extrabold text-[#781216]">
              ₹{Number(payment.amount).toLocaleString("en-IN")}
            </p>
          </div>

          {/* Details list */}
          <div className="space-y-2.5 rounded-xl border border-gray-200 bg-gray-50/60 p-4 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-gray-500 font-semibold">Booking Ref:</span>
              <span className="font-mono font-bold text-gray-900">{bookingRef}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500 font-semibold">Customer:</span>
              <span className="font-semibold text-gray-900">{customerName}</span>
            </div>
            {customerEmail && (
              <div className="flex justify-between items-center">
                <span className="text-gray-500 font-semibold">Email:</span>
                <span className="text-gray-700">{customerEmail}</span>
              </div>
            )}
            <div className="flex justify-between items-center border-t border-gray-200 pt-2.5 mt-1">
              <span className="text-gray-500 font-bold uppercase">Submitted UTR / Ref No:</span>
              <div className="flex items-center gap-2 font-mono text-sm font-extrabold text-gray-900 bg-white px-2.5 py-1 rounded border">
                <span>{payment.utr || "N/A"}</span>
                {payment.utr && (
                  <button
                    type="button"
                    onClick={copyUtr}
                    className="text-gray-500 hover:text-gray-900 p-0.5"
                    title="Copy UTR"
                  >
                    {copiedUtr ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Verification buttons */}
          <div className="flex items-center justify-end gap-3 border-t pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleAction("REJECT")}
              disabled={submitting}
              className="text-red-600 hover:bg-red-50 border-red-200"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><XCircle className="mr-1.5 h-4 w-4" /> Reject</>}
            </Button>
            <Button
              type="button"
              onClick={() => handleAction("VERIFY")}
              disabled={submitting}
              className="bg-green-700 hover:bg-green-800 text-white font-bold"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><ShieldCheck className="mr-1.5 h-4 w-4" /> Mark as Verified</>}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

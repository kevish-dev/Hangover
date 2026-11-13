import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { QrCode, CreditCard, Copy, Check, Loader2, ShieldCheck, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "../../lib/axios";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingId: string;
  amount: number;
  paymentType?: "TOKEN" | "FULL" | "BALANCE";
  itemTitle?: string;
  onSuccess: (utrSubmitted?: boolean) => void;
  onTriggerRazorpay?: () => void;
}

export default function PaymentModal({
  isOpen,
  onClose,
  bookingId,
  amount,
  paymentType = "TOKEN",
  itemTitle,
  onSuccess,
  onTriggerRazorpay,
}: PaymentModalProps) {
  const [method, setMethod] = useState<"UPI" | "OTHER">("UPI");
  const [utr, setUtr] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const submitInFlight = useRef(false);

  const upiId = "8413872431-5@ybl";
  const payeeName = "DAWN TOURS AND TRAVELS";
  const roundedAmount = Number(amount || 0).toFixed(2);
  const upiString = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(payeeName)}&mc=0000&mode=02&purpose=00&am=${roundedAmount}&cu=INR`;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiString)}`;

  const copyUpiId = () => {
    navigator.clipboard.writeText(upiId);
    setCopiedUpi(true);
    toast.success("UPI ID copied to clipboard!");
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleUpiSubmit = async () => {
    if (submitInFlight.current) return;
    const cleanUtr = utr.trim();
    if (!cleanUtr) {
      toast.error("Please enter or paste your payment UTR / Reference number");
      return;
    }

    submitInFlight.current = true;
    setSubmitting(true);
    try {
      await apiClient.post("/payments/submit-upi-utr", {
        bookingId,
        amount: Number(amount),
        utr: cleanUtr,
        type: paymentType,
      });
      toast.success("Payment submitted with UTR! It is now pending admin verification.");
      onSuccess(true);
      onClose();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Could not submit UTR for verification");
    } finally {
      submitInFlight.current = false;
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md p-6">
        <DialogHeader className="pb-2 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold text-gray-900">Make Payment</DialogTitle>
            <span className="rounded-full bg-[#781216]/10 px-3 py-1 text-sm font-extrabold text-[#781216]">
              ₹{Number(amount).toLocaleString("en-IN")}
            </span>
          </div>
          {itemTitle && <p className="text-xs text-gray-500 mt-1 line-clamp-1">{itemTitle}</p>}
        </DialogHeader>

        {/* Method Selector Tabs */}
        <div className="grid grid-cols-2 gap-2 my-3 p-1 bg-gray-100 rounded-xl">
          <button
            type="button"
            onClick={() => setMethod("UPI")}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-bold transition-all ${
              method === "UPI"
                ? "bg-white text-[#781216] shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <QrCode className="h-4 w-4" /> UPI QR Code
          </button>
          <button
            type="button"
            onClick={() => setMethod("OTHER")}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-bold transition-all ${
              method === "OTHER"
                ? "bg-white text-[#781216] shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <CreditCard className="h-4 w-4" /> Cards & Netbanking
          </button>
        </div>

        {method === "UPI" ? (
          <div className="space-y-4 pt-1">
            {/* QR Code Container */}
            <div className="flex flex-col items-center justify-center rounded-2xl border border-amber-200/80 bg-amber-50/40 p-4 text-center">
              <div className="relative p-2 bg-white rounded-xl shadow-sm border border-gray-200">
                <img
                  src={qrImageUrl}
                  alt="UPI QR Code"
                  className="h-48 w-48 object-contain"
                />
              </div>
              <p className="mt-3 text-xs font-bold text-gray-800">{payeeName}</p>
              <div className="mt-1 flex items-center gap-2 rounded-lg bg-white px-3 py-1.5 border border-gray-200 text-xs font-mono">
                <span className="text-gray-600 font-semibold">{upiId}</span>
                <button
                  type="button"
                  onClick={copyUpiId}
                  className="text-[#781216] hover:text-[#5f0e11] p-0.5 rounded transition-colors"
                  title="Copy UPI ID"
                >
                  {copiedUpi ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
              <p className="mt-2 text-[11px] text-gray-500">Scan using Google Pay, PhonePe, Paytm or any UPI App</p>
            </div>

            {/* UTR Input Section */}
            <div className="space-y-2 border-t pt-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                Enter UTR / Transaction Reference No. *
              </label>
              <Input
                type="text"
                value={utr}
                onChange={(e) => setUtr(e.target.value)}
                placeholder="e.g. 423456789012 (12-digit UTR)"
                className="h-10 text-sm font-mono tracking-wide"
              />
              <p className="text-[11px] text-gray-500">
                After completing the UPI payment, copy and paste the 12-digit UTR / UPI reference ID from your UPI app.
              </p>

              <Button
                type="button"
                onClick={handleUpiSubmit}
                disabled={submitting || !utr.trim()}
                className="w-[#100%] w-full h-11 mt-2 bg-[#781216] text-white hover:bg-[#5f0e11] font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="mr-2 h-4 w-4" /> Submit Payment for Verification
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-4 text-center">
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
              <CreditCard className="mx-auto h-10 w-10 text-gray-400 mb-2" />
              <h4 className="font-semibold text-gray-900 text-sm">Online Gateway (Razorpay)</h4>
              <p className="text-xs text-gray-500 mt-1">
                Pay securely using Debit Card, Credit Card, Netbanking, or Wallet.
              </p>
            </div>

            <Button
              type="button"
              onClick={() => {
                onClose();
                if (onTriggerRazorpay) onTriggerRazorpay();
              }}
              className="w-full h-11 bg-gray-900 text-white hover:bg-black font-bold text-sm flex items-center justify-center gap-2"
            >
              Proceed with Razorpay Gateway <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

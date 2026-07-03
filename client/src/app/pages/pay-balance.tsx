import { useParams, useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { apiClient, API_URL } from "../../lib/axios";
import { Loader2, IndianRupee, MapPin, CalendarCheck, ShieldCheck, User, AlertCircle, CheckCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useAuth } from "../../contexts/AuthContext";
import { motion } from "framer-motion";

export default function PayBalancePage() {
  const { bookingId } = useParams();
  const { user, isLoading: authLoading } = useAuth();
  const [processing, setProcessing] = useState(false);
  
  const [paymentStep, setPaymentStep] = useState<"form" | "verifying" | "success" | "failed">("form");
  const [pendingVerify, setPendingVerify] = useState<any>(null);
  const [paymentError, setPaymentError] = useState("");

  const { data: booking, isLoading, error, refetch } = useQuery({
    queryKey: ["booking", bookingId],
    queryFn: async () => {
      const res = await apiClient.get(`/bookings/${bookingId}`);
      return res.data;
    },
    enabled: !!user && !!bookingId,
    retry: false,
  });

  useEffect(() => {
    if (!pendingVerify || paymentStep !== "verifying") return;

    apiClient
      .post("/payments/verify", {
        razorpayOrderId: pendingVerify.razorpayOrderId,
        razorpayPaymentId: pendingVerify.razorpayPaymentId,
        razorpaySignature: pendingVerify.razorpaySignature,
      })
      .then(() => {
        setPaymentStep("success");
        refetch();
      })
      .catch((err: any) => {
        setPaymentError(
          err?.response?.data?.message ||
            "Payment verification failed. Please contact support."
        );
        setPaymentStep("failed");
      });
  }, [pendingVerify, paymentStep, refetch]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-[#c8a96e]" />
      </div>
    );
  }



  if (!user) {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9999,
          background: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(4px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1rem",
        }}
      >
        <div
          style={{
            background: "#fff",
            width: "100%",
            maxWidth: "425px",
            borderRadius: "12px",
            padding: "2.5rem 2rem",
            fontFamily: "'Poppins', sans-serif",
            boxShadow:
              "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
            textAlign: "center",
          }}
        >
          <h2
            style={{
              fontSize: "1.25rem",
              fontWeight: 600,
              color: "#1e1a14",
              marginBottom: "0.5rem",
            }}
          >
            Sign In to Continue
          </h2>
          <p
            style={{
              fontSize: "0.875rem",
              color: "rgba(30,26,20,0.6)",
              marginBottom: "2rem",
            }}
          >
            Please sign in to your account to view your balance and complete your payment.
          </p>
          <button
            type="button"
            onClick={() => {
              localStorage.setItem(
                "booking_redirect_intent",
                `/bookings/${bookingId}/pay-balance`,
              );
                window.location.href = `${API_URL}/auth/google`;
            }}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              padding: "0.75rem",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              background: "#fff",
              color: "#0f172a",
              fontSize: "0.9rem",
              fontWeight: 500,
              cursor: "pointer",
              transition: "background 0.2s",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "#f8fafc")
            }
            onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
          >
            <svg
              viewBox="0 0 24 24"
              style={{ width: "1.25rem", height: "1.25rem" }}
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Continue with Google
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-[#c8a96e]" />
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="max-w-xl mx-auto mt-16 p-8 bg-red-50 text-red-800 rounded-xl border border-red-100 text-center">
        <h2 className="text-lg font-bold mb-2">Booking Not Found</h2>
        <p className="text-sm">We couldn't find this booking. Please check the link and try again.</p>
      </div>
    );
  }

  if (paymentStep === "verifying") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f0e6] font-['Poppins',sans-serif]">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center p-12 max-w-md">
          <Loader2 size={60} color="#781216" className="mx-auto mb-6 animate-spin" strokeWidth={1} />
          <h2 className="text-2xl font-light mb-3 text-[#1e1a14]">Confirming your payment…</h2>
          <p className="text-gray-500 font-light text-sm">Your payment was received. We're verifying it — this takes just a moment.</p>
        </motion.div>
      </div>
    );
  }

  if (paymentStep === "failed") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f0e6] font-['Poppins',sans-serif]">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center p-12 max-w-md">
          <AlertCircle size={52} color="#c0392b" strokeWidth={1.2} className="mx-auto mb-5" />
          <h2 className="text-2xl font-light mb-3 text-[#1e1a14]">Verification Issue</h2>
          <p className="text-gray-600 mb-2 text-sm">{paymentError}</p>
          <p className="text-[13px] text-gray-500 mb-6">Your payment may have been captured. Please contact us on WhatsApp with your payment details.</p>
          <a href="https://wa.me/917374898467" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 bg-[#25D366] text-white px-6 py-3 rounded-lg font-medium text-sm">Contact Support</a>
        </motion.div>
      </div>
    );
  }

  if (paymentStep === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f0e6] font-['Poppins',sans-serif]">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center p-12 max-w-md">
          <CheckCircle size={52} color="#781216" strokeWidth={1.2} className="mx-auto mb-5" />
          <h2 className="text-[1.6rem] font-light mb-2 text-[#1e1a14] tracking-[-0.02em]">Payment Successful!</h2>
          <p className="text-[#781216] font-semibold tracking-[0.06em] mb-4">{booking.bookingReference}</p>
          <p className="text-gray-600 mb-8 text-sm font-light leading-[1.8]">Your balance has been fully settled. We're looking forward to seeing you on the trip!</p>
          <button onClick={() => window.location.href = "/"} className="text-[#781216] font-semibold text-xs tracking-widest uppercase border-b-[1.5px] border-[#781216]/30 pb-[3px]">← Return to Home</button>
        </motion.div>
      </div>
    );
  }

  const handlePayBalance = async () => {
    setProcessing(true);
    try {
      const initiateRes = await apiClient.post("/payments/balance/initiate", {
        bookingId: booking.id,
      });
      const { razorpayOrderId, razorpayKeyId, amount, currency } = initiateRes.data;

      const options = {
        key: razorpayKeyId,
        amount,
        currency,
        name: "Hangover Trails",
        description: `${booking.trip.title} — Balance Payment`,
        order_id: razorpayOrderId,
        prefill: {
          email: user.email,
          contact: booking.user?.profile?.phone || "",
        },
        theme: { color: "#781216" },
        handler: async (response: any) => {
          setPaymentStep("verifying");
          setPendingVerify({
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
          });
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on("payment.failed", function (response: any) {
        toast.error(`Payment failed: ${response.error.description}`);
      });
      rzp.open();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to initiate payment");
    } finally {
      setProcessing(false);
    }
  };

  const isEligible = booking.status === "RESERVED" && booking.paymentStatus === "PARTIALLY_PAID";

  return (
    <div className="max-w-2xl mx-auto px-4 py-16">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-[#781216] p-6 text-white">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <IndianRupee className="w-6 h-6 opacity-80" />
            Pay Balance
          </h1>
          <p className="text-white/70 text-sm mt-1">
            Complete your payment for booking <span className="font-mono text-white/90">{booking.bookingReference}</span>
          </p>
        </div>

        <div className="p-8">
          <div className="mb-8 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-100 pb-2">Trip Summary</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="block text-gray-500 mb-1">Destination</span>
                <span className="font-medium text-gray-900 flex items-center gap-1">
                  <MapPin className="w-4 h-4 text-[#c8a96e]" />
                  {booking.trip.title}
                </span>
              </div>
              <div>
                <span className="block text-gray-500 mb-1">Travelers</span>
                <span className="font-medium text-gray-900 flex items-center gap-1">
                  <User className="w-4 h-4 text-[#c8a96e]" />
                  {booking.numberOfTravelers} Person(s)
                </span>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl p-6 mb-8 border border-gray-100">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-4">Payment Details</h2>
            <div className="space-y-3">
              <div className="flex justify-between text-gray-600">
                <span>Total Amount</span>
                <span>₹{Number(booking.totalAmount).toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between text-green-700">
                <span>Amount Paid</span>
                <span>- ₹{Number(booking.amountPaid).toLocaleString("en-IN")}</span>
              </div>
              <div className="border-t border-gray-200 pt-3 flex justify-between font-bold text-gray-900 text-lg">
                <span>Balance Due</span>
                <span>₹{Number(booking.amountDue).toLocaleString("en-IN")}</span>
              </div>
            </div>
          </div>

          {!isEligible ? (
            <div className="bg-blue-50 border border-blue-100 text-blue-800 p-4 rounded-lg flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm">No action required</p>
                <p className="text-xs mt-1 opacity-90">
                  This booking's payment status is <strong className="uppercase">{booking.paymentStatus.replace("_", " ")}</strong>. 
                  There is no outstanding balance due.
                </p>
              </div>
            </div>
          ) : (
            <button
              onClick={handlePayBalance}
              disabled={processing}
              className="w-full bg-[#781216] text-white py-4 rounded-xl font-semibold hover:bg-[#5a0c10] transition-colors disabled:opacity-70 flex justify-center items-center gap-2"
            >
              {processing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  Pay ₹{Number(booking.amountDue).toLocaleString("en-IN")} Now
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

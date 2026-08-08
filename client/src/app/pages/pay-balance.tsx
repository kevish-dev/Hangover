import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  Headphones,
  IndianRupee,
  Loader2,
  LockKeyhole,
  MapPin,
  Package,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  UserRound,
  Users,
  WalletCards,
} from "lucide-react";
import { toast } from "sonner";
import { apiClient, API_URL } from "../../lib/axios";
import { useAuth } from "../../contexts/AuthContext";
import PaymentModal from "../components/PaymentModal";

type PaymentStep = "form" | "verifying" | "success" | "failed";

type PendingVerification = {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
};

const SUPPORT_PHONE = "918415929069";

const formatCurrency = (value: string | number | null | undefined) => {
  const amount = Number(value || 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

const formatDate = (value?: string | null, includeYear = true) => {
  if (!value) return "To be announced";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "To be announced";
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    ...(includeYear ? { year: "numeric" } : {}),
  });
};

const formatDateRange = (start?: string | null, end?: string | null) => {
  if (!start && !end) return "Dates to be announced";
  if (!end) return formatDate(start);
  return `${formatDate(start, false)} — ${formatDate(end)}`;
};

const paymentMethodLabel = (method?: string | null) => {
  if (!method) return "Online payment";
  return method.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
};

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" style={{ width: 20, height: 20, flexShrink: 0 }}>
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 0 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

function LoadingPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#f5f0e6", fontFamily: "'Poppins', sans-serif" }}>
      <div style={{ minHeight: "clamp(420px, 70vh, 620px)", background: "#1e1a14", padding: "130px clamp(1.5rem,5vw,5rem) 210px" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto" }}>
          <div className="animate-pulse" style={{ width: 160, height: 12, borderRadius: 999, background: "rgba(242,237,228,0.12)", marginBottom: 28 }} />
          <div className="animate-pulse" style={{ width: "min(560px, 80vw)", height: 52, borderRadius: 10, background: "rgba(242,237,228,0.1)", marginBottom: 18 }} />
          <div className="animate-pulse" style={{ width: "min(420px, 65vw)", height: 15, borderRadius: 999, background: "rgba(242,237,228,0.08)" }} />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px]" style={{ maxWidth: 1180, margin: "-170px auto 0", padding: "0 clamp(1rem,4vw,2rem) 80px", gap: 30, position: "relative" }}>
        {[520, 430].map((height) => (
          <div key={height} className="animate-pulse" style={{ minHeight: height, width: "100%", borderRadius: 18, background: "rgba(255,255,255,0.9)", border: "1px solid rgba(30,26,20,0.06)" }} />
        ))}
      </div>
    </div>
  );
}

function SignedOutPage({ bookingId }: { bookingId?: string }) {
  return (
    <div style={{ minHeight: "100vh", background: "#1e1a14", fontFamily: "'Poppins', sans-serif", display: "grid", placeItems: "center", padding: "110px 20px 50px", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", width: 520, height: 520, borderRadius: "50%", border: "1px solid rgba(184,148,58,0.1)", top: -230, right: -170 }} />
      <div style={{ position: "absolute", width: 280, height: 280, borderRadius: "50%", background: "rgba(120,18,22,0.18)", filter: "blur(90px)", bottom: -80, left: -70 }} />
      <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }} style={{ width: "100%", maxWidth: 480, background: "#fff", borderRadius: 18, padding: "clamp(28px,6vw,46px)", boxShadow: "0 30px 90px rgba(0,0,0,0.28)", textAlign: "center", position: "relative", zIndex: 1 }}>
        <div style={{ width: 54, height: 54, borderRadius: "50%", margin: "0 auto 22px", display: "grid", placeItems: "center", background: "rgba(184,148,58,0.1)", border: "1px solid rgba(184,148,58,0.22)" }}>
          <LockKeyhole size={22} color="#b8943a" strokeWidth={1.5} />
        </div>
        <p style={{ margin: "0 0 10px", color: "#b8943a", fontSize: "0.65rem", fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase" }}>/ Secure Payment</p>
        <h1 style={{ margin: "0 0 12px", color: "#1e1a14", fontSize: "clamp(1.7rem,5vw,2.15rem)", fontWeight: 300, letterSpacing: "-0.035em", lineHeight: 1.18 }}>Sign in to view your booking</h1>
        <p style={{ margin: "0 auto 28px", color: "rgba(30,26,20,0.56)", fontSize: "0.84rem", fontWeight: 300, lineHeight: 1.8, maxWidth: 350 }}>We protect your trip and payment details. Continue with the account used to make this booking.</p>
        <button
          type="button"
          onClick={() => {
            localStorage.setItem("booking_redirect_intent", `/bookings/${bookingId}/pay-balance`);
            window.location.href = `${API_URL}/auth/google`;
          }}
          style={{ width: "100%", minHeight: 52, border: "1px solid rgba(30,26,20,0.12)", borderRadius: 9, background: "#fff", color: "#1e1a14", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, fontFamily: "'Poppins', sans-serif", fontSize: "0.84rem", fontWeight: 500, cursor: "pointer", boxShadow: "0 5px 18px rgba(30,26,20,0.06)" }}
        >
          <GoogleMark /> Continue with Google
        </button>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, marginTop: 22, color: "rgba(30,26,20,0.4)", fontSize: "0.64rem" }}>
          <ShieldCheck size={13} strokeWidth={1.5} /> Your booking remains private and protected
        </div>
      </motion.div>
    </div>
  );
}

function ResultPage({
  type,
  booking,
  onBack,
  errorMessage,
}: {
  type: "verifying" | "success" | "failed";
  booking: any;
  onBack: () => void;
  errorMessage?: string;
}) {
  const item = booking?.crmTrip || booking?.customTrip || booking?.trip || booking?.festival || booking?.slot?.trip || booking?.slot?.festival;
  const itemTitle = item?.title || item?.name || "the trip";
  const itemPath = booking?.customTrip ? "/profile" : item?.id
    ? (booking?.festival || booking?.slot?.festival ? `/festivals/${item.id}` : `/trips/${item.id}`)
    : "/trips";
  const isVerifying = type === "verifying";
  const isSuccess = type === "success";
  const Icon = isVerifying ? Loader2 : isSuccess ? CheckCircle2 : AlertCircle;
  const iconColor = isSuccess ? "#228b22" : type === "failed" ? "#c0392b" : "#b8943a";

  return (
    <div aria-live="polite" style={{ minHeight: "100vh", background: "#1e1a14", fontFamily: "'Poppins', sans-serif", padding: "110px 20px 70px", display: "grid", placeItems: "center", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", width: 480, height: 480, borderRadius: "50%", border: "1px solid rgba(184,148,58,0.09)", top: -220, right: -160 }} />
      <motion.div initial={{ opacity: 0, y: 18, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.5 }} style={{ width: "100%", maxWidth: 620, borderRadius: 20, background: "#fff", boxShadow: "0 22px 70px rgba(30,26,20,0.11)", overflow: "hidden", border: "1px solid rgba(30,26,20,0.07)" }}>
        <div style={{ background: "#1e1a14", padding: "34px 38px", textAlign: "center" }}>
          <div style={{ width: 66, height: 66, borderRadius: "50%", display: "grid", placeItems: "center", margin: "0 auto 18px", background: `${iconColor}1A`, border: `1px solid ${iconColor}55` }}>
            <Icon size={30} color={iconColor} strokeWidth={1.4} className={isVerifying ? "animate-spin" : ""} />
          </div>
          <p style={{ color: "#b8943a", margin: "0 0 8px", fontSize: "0.64rem", letterSpacing: "0.2em", fontWeight: 600, textTransform: "uppercase" }}>
            {isVerifying ? "/ Payment Received" : isSuccess ? "/ Booking Confirmed" : "/ Verification Support"}
          </p>
          <h1 style={{ color: "#f2ede4", margin: 0, fontSize: "clamp(1.75rem,5vw,2.35rem)", fontWeight: 300, letterSpacing: "-0.03em" }}>
            {isVerifying ? "Confirming your payment" : isSuccess ? "Your balance is settled" : "We need a closer look"}
          </h1>
        </div>
        <div style={{ padding: "clamp(28px,6vw,46px)", textAlign: "center" }}>
          <p style={{ color: "rgba(30,26,20,0.58)", fontSize: "0.86rem", fontWeight: 300, lineHeight: 1.8, margin: "0 auto 24px", maxWidth: 450 }}>
            {isVerifying
              ? "Razorpay has returned your payment. We are securely matching it with your booking now—please keep this page open."
              : isSuccess
                ? `Your place on ${itemTitle} is confirmed. A detailed payment receipt will be sent to your email.`
                : "Your payment may already be captured, so please do not make another payment. Our team can verify it safely for you."}
          </p>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "9px 14px", borderRadius: 999, background: "#f7f3eb", color: "#781216", fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.06em", marginBottom: 28 }}>
            <ReceiptText size={14} /> {booking.bookingReference}
          </div>
          {type === "failed" && errorMessage && <div role="alert" style={{ maxWidth: 440, margin: "0 auto 24px", padding: "11px 14px", borderRadius: 8, background: "rgba(192,57,43,0.07)", color: "#a93226", fontSize: "0.68rem", lineHeight: 1.6 }}>{errorMessage}</div>}
          {!isVerifying && (
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              {isSuccess ? (
                <>
                  <Link to="/profile" style={{ textDecoration: "none", background: "#781216", color: "#fff", padding: "13px 22px", borderRadius: 8, fontSize: "0.76rem", fontWeight: 600, letterSpacing: "0.04em" }}>View My Bookings</Link>
                  <Link to={itemPath} style={{ textDecoration: "none", border: "1px solid rgba(30,26,20,0.14)", color: "#1e1a14", padding: "13px 22px", borderRadius: 8, fontSize: "0.76rem", fontWeight: 500 }}>View Trip</Link>
                </>
              ) : (
                <>
                  <a href={`https://wa.me/${SUPPORT_PHONE}?text=${encodeURIComponent(`Hi, I need help verifying payment for booking ${booking.bookingReference}.`)}`} target="_blank" rel="noreferrer" style={{ textDecoration: "none", background: "#781216", color: "#fff", padding: "13px 22px", borderRadius: 8, fontSize: "0.76rem", fontWeight: 600 }}>Contact Payment Support</a>
                  <button type="button" onClick={onBack} style={{ border: "1px solid rgba(30,26,20,0.14)", background: "#fff", color: "#1e1a14", padding: "13px 22px", borderRadius: 8, fontFamily: "inherit", fontSize: "0.76rem", fontWeight: 500, cursor: "pointer" }}>Retry Verification</button>
                </>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

export default function PayBalancePage() {
  const { bookingId } = useParams();
  const { user, isLoading: authLoading } = useAuth();
  const [processing, setProcessing] = useState(false);
  const [paymentStep, setPaymentStep] = useState<PaymentStep>("form");
  const [pendingVerify, setPendingVerify] = useState<PendingVerification | null>(null);
  const [paymentError, setPaymentError] = useState("");

  const { data: booking, isLoading, error, refetch } = useQuery({
    queryKey: ["booking", bookingId],
    queryFn: async () => {
      const response = await apiClient.get(`/bookings/${bookingId}`);
      return response.data;
    },
    enabled: Boolean(user && bookingId),
    retry: false,
  });
  const maintenance = useQuery({
    queryKey: ["site-settings"],
    queryFn: async () => (await apiClient.get("/site-settings")).data.data as { maintenanceMode: boolean },
  });

  useEffect(() => {
    if (!pendingVerify || paymentStep !== "verifying") return;

    apiClient
      .post("/payments/verify", pendingVerify)
      .then(async () => {
        await refetch();
        setProcessing(false);
        setPaymentStep("success");
      })
      .catch(async (verifyError: any) => {
        const refreshed = await refetch().catch(() => null);
        const refreshedBooking = refreshed?.data;
        if (refreshedBooking?.paymentStatus === "PAID" || refreshedBooking?.status === "CONFIRMED") {
          setProcessing(false);
          setPaymentStep("success");
          return;
        }
        setPaymentError(verifyError?.response?.data?.message || "Payment verification needs manual review.");
        setProcessing(false);
        setPaymentStep("failed");
      });
  }, [pendingVerify, paymentStep, refetch]);

  useEffect(() => {
    if (paymentStep !== "form") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [paymentStep]);

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const item = booking?.crmTrip || booking?.customTrip || booking?.trip || booking?.festival || booking?.slot?.trip || booking?.slot?.festival || booking?.crmTripSlot?.crmTrip;
  const isCrm = Boolean(booking?.crmTrip || booking?.crmTripSlot);
  const isCustom = booking?.source === "CUSTOM" || Boolean(booking?.customTrip);
  const isFestival = Boolean(booking?.festival || booking?.slot?.festival);
  const itemPath = isCustom ? "/profile" : item?.id ? (isFestival ? `/festivals/${item.id}` : `/trips/${item.id}`) : "/trips";
  const itemTitle = item?.title || item?.name || "Upcoming Journey";
  const itemLocation = isCustom ? "Private custom itinerary" : (item?.location || item?.destination?.name || "Location to be announced");
  const heroBanner = item?.bannerImages?.[0] || item?.websiteBannerImages?.[0] || booking?.crmTrip?.websiteBannerImages?.[0] || "";
  const tripStartDate = booking?.crmTripSlot?.startDate || booking?.customTrip?.startDate || booking?.slot?.startDate;
  const tripEndDate = booking?.crmTripSlot?.endDate || booking?.customTrip?.endDate || booking?.slot?.endDate;
  const durationDays = item?.numberOfNights ? item.numberOfNights + 1 : (item?.duration || item?.durationDays);
  const totalAmount = Number(booking?.totalAmount || 0);
  const amountPaid = Number(booking?.amountPaid || 0);
  const amountDue = Number(booking?.amountDue || 0);
  const paymentProgress = totalAmount > 0 ? Math.min(100, Math.max(0, (amountPaid / totalAmount) * 100)) : 0;
  const isInitialPayment = booking?.status === "PENDING" && (booking?.paymentStatus === "PENDING" || booking?.paymentStatus === "FAILED");
  const initialPaymentAmount = booking?.initialPaymentType === "TOKEN" ? Number(booking?.tokenAmount || 0) : totalAmount;
  const isMaintenanceMode = maintenance.data?.maintenanceMode === true;
  const pendingUtrPayment = useMemo(
    () => (booking?.payments || []).find((payment: any) => payment.status === "PENDING_VERIFICATION"),
    [booking?.payments],
  );
  const hasPendingUtr = Boolean(pendingUtrPayment);
  const isEligible = !isMaintenanceMode && !hasPendingUtr && ((booking?.status === "RESERVED" && booking?.paymentStatus === "PARTIALLY_PAID" && amountDue > 0) || isInitialPayment);
  const isPaid = booking?.status === "CONFIRMED" || booking?.paymentStatus === "PAID";
  const isRefunded = booking?.paymentStatus === "REFUNDED" || booking?.paymentStatus === "PARTIALLY_REFUNDED";
  const isCancelled = booking?.status === "CANCELLED";
  const displayAmount = isPaid || isCancelled || isRefunded ? amountPaid : (isInitialPayment ? initialPaymentAmount : amountDue);
  const statusLabel = hasPendingUtr
    ? "UTR Verification Pending"
    : isEligible
    ? (isInitialPayment ? "Payment Pending" : "Spot Reserved")
    : isPaid
    ? "Booking Confirmed"
    : isRefunded
    ? "Refunded"
    : isCancelled
    ? "Booking Cancelled"
    : String(booking?.status || "Payment Unavailable").replace(/_/g, " ");
  const heroEyebrow = hasPendingUtr
    ? "/ UTR Verification Pending Admin Review"
    : isEligible
    ? (isInitialPayment ? "/ Secure Booking Payment" : "/ Secure Balance Payment")
    : isPaid
    ? "/ Payment Complete"
    : "/ Booking Payment Status";
  const heroTitle = hasPendingUtr ? (
    <>UTR Verification<br /><em style={{ color: "#c8a96e", fontStyle: "italic" }}>under admin review.</em></>
  ) : isEligible ? (
    isInitialPayment ? (
      <>Secure your journey<br /><em style={{ color: "#c8a96e", fontStyle: "italic" }}>complete your booking.</em></>
    ) : (
      <>Complete the journey<br /><em style={{ color: "#c8a96e", fontStyle: "italic" }}>you already chose.</em></>
    )
  ) : isPaid ? (
    <>Your journey is<br /><em style={{ color: "#c8a96e", fontStyle: "italic" }}>fully confirmed.</em></>
  ) : (
    <>Review your<br /><em style={{ color: "#c8a96e", fontStyle: "italic" }}>booking status.</em></>
  );
  const successfulPayments = useMemo(
    () => (booking?.payments || []).filter((payment: any) => payment.status === "SUCCESS").sort((a: any, b: any) => new Date(a.paidAt || a.createdAt).getTime() - new Date(b.paidAt || b.createdAt).getTime()),
    [booking?.payments],
  );
  const bookingPayment = successfulPayments.find((payment: any) => payment.type === "TOKEN") || successfulPayments[0];
  const travelerNames = useMemo(() => {
    const names = [booking?.user?.profile?.fullName, ...(booking?.travelers || []).map((traveler: any) => traveler.fullName)].filter(Boolean);
    return Array.from(new Set(names)) as string[];
  }, [booking?.travelers, booking?.user?.profile?.fullName]);

  if (authLoading) return <LoadingPage />;
  if (!user) return <SignedOutPage bookingId={bookingId} />;
  if (isLoading) return <LoadingPage />;

  if (error || !booking) {
    const status = (error as any)?.response?.status;
    return (
      <div style={{ minHeight: "100vh", background: "#1e1a14", fontFamily: "'Poppins', sans-serif", padding: "120px 20px 70px", display: "grid", placeItems: "center" }}>
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} style={{ width: "100%", maxWidth: 560, background: "#fff", borderRadius: 18, padding: "42px 34px", textAlign: "center", border: "1px solid rgba(30,26,20,0.08)", boxShadow: "0 20px 60px rgba(30,26,20,0.09)" }}>
          <AlertCircle size={40} color="#781216" strokeWidth={1.3} style={{ margin: "0 auto 18px" }} />
          <h1 style={{ margin: "0 0 10px", color: "#1e1a14", fontWeight: 300, fontSize: "1.8rem" }}>{status === 403 ? "This booking belongs to another account" : status === 404 ? "Booking not found" : "We could not load this booking"}</h1>
          <p style={{ color: "rgba(30,26,20,0.55)", fontSize: "0.82rem", lineHeight: 1.75, margin: "0 0 25px" }}>{status === 403 ? "Please sign in with the account used to make this booking." : "Return to your profile and try opening the booking again."}</p>
          <Link to="/profile" style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "#781216", color: "#fff", padding: "12px 20px", borderRadius: 8, textDecoration: "none", fontSize: "0.76rem", fontWeight: 600 }}><ArrowLeft size={14} /> Back to My Bookings</Link>
        </motion.div>
      </div>
    );
  }

  if (paymentStep === "verifying" || paymentStep === "success" || paymentStep === "failed") {
    return <ResultPage type={paymentStep} booking={booking} errorMessage={paymentError} onBack={() => { setPaymentError(""); setPaymentStep("verifying"); }} />;
  }

  const supportLink = `https://wa.me/${SUPPORT_PHONE}?text=${encodeURIComponent(`Hi, I need help with balance payment for booking ${booking.bookingReference}.`)}`;

  const handlePayBalance = async () => {
    if (processing || !isEligible) return;
    setProcessing(true);
    setPaymentError("");

    try {
      if (!(window as any).Razorpay) {
        throw new Error("Secure checkout did not load. Please refresh the page and try again.");
      }

      const isInitial = booking.status === "PENDING";
      const endpoint = isInitial ? "/payments/initiate" : "/payments/balance/initiate";
      const payload = isInitial 
        ? { bookingId: booking.id, type: booking.initialPaymentType || "FULL" }
        : { bookingId: booking.id };

      const initiateResponse = await apiClient.post(endpoint, payload);
      const { razorpayOrderId, razorpayKeyId, amount, currency } = initiateResponse.data;

      const options = {
        key: razorpayKeyId,
        amount,
        currency,
        name: "Hangover Trails",
        description: `${itemTitle} — ${isInitial ? "Booking Payment" : "Balance Payment"}`,
        order_id: razorpayOrderId,
        prefill: {
          name: booking.user?.profile?.fullName || user.name || "",
          email: user.email,
          contact: booking.user?.profile?.phone || "",
        },
        theme: { color: "#781216" },
        modal: {
          ondismiss: () => {
            setProcessing(false);
            toast.info("Checkout closed. Your booking is unchanged.");
          },
        },
        handler: (response: any) => {
          setPaymentStep("verifying");
          setPendingVerify({
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
          });
        },
      };

      const razorpay = new (window as any).Razorpay(options);
      razorpay.on("payment.failed", async (response: any) => {
        const failure = response?.error || {};
        await apiClient.post("/payments/failed", {
          razorpayOrderId: failure.metadata?.order_id || razorpayOrderId,
          razorpayPaymentId: failure.metadata?.payment_id,
          reason: failure.description,
          code: failure.code,
        }).catch(() => undefined);
        setProcessing(false);
        toast.error(failure.description || "Payment could not be completed. Please try again.");
      });
      razorpay.open();
    } catch (payError: any) {
      setProcessing(false);
      const message = payError?.response?.data?.message || payError?.message || "Unable to open secure checkout.";
      setPaymentError(message);
      toast.error(message);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f5f0e6", fontFamily: "'Poppins', sans-serif", color: "#1e1a14" }}>
      <header style={{ minHeight: "clamp(480px, 70vh, 640px)", position: "relative", overflow: "hidden", background: "#1e1a14", padding: "112px clamp(1.25rem,5vw,5rem) 220px" }}>
        {heroBanner && <img src={heroBanner} alt="" aria-hidden="true" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.14, filter: "saturate(0.65) contrast(1.05)" }} />}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(100deg, rgba(16,14,11,0.98) 8%, rgba(30,26,20,0.9) 58%, rgba(30,26,20,0.72) 100%)" }} />
        <div style={{ position: "absolute", width: 420, height: 420, borderRadius: "50%", border: "1px solid rgba(184,148,58,0.11)", top: -170, right: -100 }} />
        <div style={{ position: "relative", zIndex: 1, maxWidth: 1180, margin: "0 auto" }}>
          <Link to="/profile" style={{ display: "inline-flex", alignItems: "center", gap: 7, color: "rgba(242,237,228,0.55)", textDecoration: "none", fontSize: "0.7rem", fontWeight: 400, marginBottom: 36 }}><ArrowLeft size={14} /> Back to my bookings</Link>
          <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ color: "#b8943a", fontSize: "0.66rem", fontWeight: 600, letterSpacing: "0.24em", textTransform: "uppercase", margin: "0 0 15px" }}>{heroEyebrow}</motion.p>
          <motion.h1 initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} style={{ color: "#f2ede4", fontSize: "clamp(2.25rem,5.3vw,4.35rem)", fontWeight: 300, letterSpacing: "-0.045em", lineHeight: 1.04, margin: "0 0 20px", maxWidth: 760 }}>{heroTitle}</motion.h1>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.12 }} style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <span style={{ color: "rgba(242,237,228,0.66)", fontSize: "0.82rem", fontWeight: 300 }}>{itemTitle}</span>
            <span style={{ width: 3, height: 3, borderRadius: "50%", background: "#b8943a" }} />
            <span style={{ color: "rgba(242,237,228,0.45)", fontSize: "0.7rem", letterSpacing: "0.08em" }}>{booking.bookingReference}</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "#d7bd79", background: "rgba(184,148,58,0.1)", border: "1px solid rgba(184,148,58,0.24)", padding: "5px 10px", borderRadius: 999, fontSize: "0.6rem", fontWeight: 600, letterSpacing: "0.09em", textTransform: "uppercase" }}><BadgeCheck size={12} /> {statusLabel}</span>
          </motion.div>
        </div>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px]" style={{ maxWidth: 1180, margin: "-175px auto 0", padding: "0 clamp(1rem,4vw,2rem) clamp(4rem,8vw,7rem)", gap: "clamp(24px,4vw,42px)", position: "relative", zIndex: 2, alignItems: "start" }}>
        <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="order-2 lg:order-1" style={{ display: "flex", flexDirection: "column", gap: 22, minWidth: 0 }}>
          <article style={{ background: "#fff", borderRadius: 18, overflow: "hidden", border: "1px solid rgba(30,26,20,0.07)", boxShadow: "0 18px 55px rgba(30,26,20,0.08)" }}>
            <div className="grid grid-cols-1 sm:grid-cols-[230px_minmax(0,1fr)]">
              <div style={{ minHeight: 240, position: "relative", background: "#29231c" }}>
                {heroBanner ? <img src={heroBanner} alt={itemTitle} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: "rgba(242,237,228,0.4)" }}><Sparkles size={30} strokeWidth={1.2} /></div>}
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(20,17,13,0.55), transparent 60%)" }} />
                <span style={{ position: "absolute", left: 16, bottom: 15, background: "rgba(20,17,13,0.78)", color: "#f2ede4", padding: "6px 10px", borderRadius: 6, fontSize: "0.58rem", letterSpacing: "0.13em", textTransform: "uppercase", backdropFilter: "blur(8px)" }}>{isFestival ? "Festival" : isCrm ? "Itinerary Trip" : "Curated Trip"}</span>
              </div>
              <div style={{ padding: "clamp(24px,4vw,34px)" }}>
                <p style={{ color: "#b8943a", fontSize: "0.61rem", fontWeight: 600, letterSpacing: "0.16em", textTransform: "uppercase", margin: "0 0 9px" }}>Your Booking</p>
                <h2 style={{ color: "#1e1a14", fontSize: "clamp(1.35rem,3vw,1.9rem)", fontWeight: 500, letterSpacing: "-0.03em", lineHeight: 1.2, margin: "0 0 11px" }}>{itemTitle}</h2>
                <p style={{ display: "flex", alignItems: "center", gap: 6, color: "rgba(30,26,20,0.5)", fontSize: "0.75rem", margin: "0 0 22px" }}><MapPin size={14} color="#781216" strokeWidth={1.5} /> {itemLocation}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 16 }}>
                  {[
                    { icon: CalendarDays, label: "Travel dates", value: formatDateRange(tripStartDate, tripEndDate) },
                    { icon: Clock3, label: "Duration", value: durationDays ? `${durationDays} ${durationDays === 1 ? "day" : "days"}` : "To be announced" },
                    { icon: Users, label: "Travel party", value: `${booking.numberOfTravelers} ${booking.numberOfTravelers === 1 ? "traveler" : "travelers"}` },
                    { icon: Package, label: "Selected plan", value: isCustom ? "Private custom trip" : booking.package?.title || booking.crmTripSlot?.title || booking.slot?.title || "Standard trip plan" },
                  ].map(({ icon: Icon, label, value }) => (
                    <div key={label} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                      <div style={{ width: 30, height: 30, borderRadius: 8, display: "grid", placeItems: "center", flexShrink: 0, background: "rgba(120,18,22,0.055)" }}><Icon size={14} color="#781216" strokeWidth={1.5} /></div>
                      <div><span style={{ display: "block", color: "rgba(30,26,20,0.36)", fontSize: "0.55rem", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 3 }}>{label}</span><span style={{ display: "block", color: "rgba(30,26,20,0.76)", fontSize: "0.72rem", lineHeight: 1.45 }}>{value}</span></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </article>

          {hasPendingUtr && (
            <article style={{ background: "#fff", borderRadius: 16, padding: "24px 28px", border: "1px solid rgba(184,148,58,0.3)", boxShadow: "0 10px 30px rgba(184,148,58,0.06)" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                <div style={{ width: 38, height: 38, borderRadius: "50%", background: "rgba(184,148,58,0.12)", display: "grid", placeItems: "center", flexShrink: 0, marginTop: 2 }}>
                  <Clock3 size={20} color="#9f7f2f" />
                </div>
                <div>
                  <p style={{ margin: "0 0 6px", color: "#9f7f2f", fontSize: "0.62rem", fontWeight: 600, letterSpacing: "0.16em", textTransform: "uppercase" }}>Manual Payment Submitted</p>
                  <h3 style={{ margin: "0 0 8px", color: "#1e1a14", fontSize: "1.1rem", fontWeight: 500 }}>UTR Verification Pending Admin Review</h3>
                  <p style={{ margin: "0 0 10px", color: "rgba(30,26,20,0.65)", fontSize: "0.74rem", lineHeight: 1.7 }}>
                    We have received your payment submission of <strong>{formatCurrency(pendingUtrPayment.amount)}</strong> with transaction reference (UTR: <code style={{ background: "#f5f0e6", padding: "2px 7px", borderRadius: 4, fontFamily: "monospace", color: "#781216", fontWeight: 600 }}>{pendingUtrPayment.utr || "N/A"}</code>).
                  </p>
                  <p style={{ margin: 0, color: "rgba(30,26,20,0.52)", fontSize: "0.68rem", lineHeight: 1.6 }}>
                    Our administration team is cross-checking this UTR with bank records. Once verified, your booking status will update automatically and your official payment receipt will be sent to your email address.
                  </p>
                </div>
              </div>
            </article>
          )}

          <article style={{ background: "#fff", borderRadius: 16, padding: "clamp(24px,4vw,32px)", border: "1px solid rgba(30,26,20,0.07)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
              <div><p style={{ color: "#b8943a", fontSize: "0.6rem", fontWeight: 600, letterSpacing: "0.16em", textTransform: "uppercase", margin: "0 0 6px" }}>Booking at a glance</p><h3 style={{ margin: 0, color: "#1e1a14", fontSize: "1.15rem", fontWeight: 500 }}>Everything tied to this reservation</h3></div>
              <span style={{ color: "rgba(30,26,20,0.46)", fontSize: "0.66rem", border: "1px solid rgba(30,26,20,0.1)", padding: "7px 10px", borderRadius: 6, overflowWrap: "anywhere" }}>{booking.bookingReference}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 14 }}>
              <div style={{ borderRadius: 12, background: "#f8f5ef", padding: 18 }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 13 }}><WalletCards size={17} color="#228b22" /><span style={{ fontSize: "0.75rem", fontWeight: 600 }}>Booking payment received</span></div>
                <p style={{ margin: "0 0 5px", color: "#1e1a14", fontSize: "1.15rem", fontWeight: 600 }}>{formatCurrency(bookingPayment?.amount || amountPaid)}</p>
                <p style={{ margin: 0, color: "rgba(30,26,20,0.44)", fontSize: "0.62rem", lineHeight: 1.6 }}>{bookingPayment ? `${paymentMethodLabel(bookingPayment.paymentMethod)} · ${formatDate(bookingPayment.paidAt || bookingPayment.createdAt)}` : "Your initial payment has secured this spot."}</p>
                {bookingPayment?.receiptNumber && <p style={{ margin: "8px 0 0", color: "rgba(30,26,20,0.4)", fontSize: "0.58rem" }}>Receipt {bookingPayment.receiptNumber}</p>}
              </div>
              <div style={{ borderRadius: 12, background: "#f8f5ef", padding: 18 }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 13 }}><UserRound size={17} color="#781216" /><span style={{ fontSize: "0.75rem", fontWeight: 600 }}>Travel party</span></div>
                <p style={{ margin: "0 0 5px", color: "#1e1a14", fontSize: "0.82rem", fontWeight: 500 }}>{travelerNames.length ? travelerNames.slice(0, 3).join(", ") : `${booking.numberOfTravelers} registered traveler${booking.numberOfTravelers === 1 ? "" : "s"}`}</p>
                <p style={{ margin: 0, color: "rgba(30,26,20,0.44)", fontSize: "0.62rem", lineHeight: 1.6 }}>{booking.numberOfTravelers} spot{booking.numberOfTravelers === 1 ? "" : "s"} reserved for the selected dates</p>
              </div>
            </div>
            {booking.specialRequests && <div style={{ marginTop: 14, padding: "15px 18px", borderRadius: 10, border: "1px solid rgba(184,148,58,0.18)", background: "rgba(184,148,58,0.045)" }}><span style={{ color: "#9f7f2f", fontSize: "0.56rem", letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 600 }}>Special request</span><p style={{ color: "rgba(30,26,20,0.62)", margin: "5px 0 0", fontSize: "0.7rem", lineHeight: 1.65 }}>{booking.specialRequests}</p></div>}
          </article>

          {(isEligible || isPaid) && <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "18px 20px", borderRadius: 12, border: "1px solid rgba(34,139,34,0.13)", background: "rgba(34,139,34,0.045)" }}>
            <ShieldCheck size={20} color="#228b22" strokeWidth={1.5} style={{ flexShrink: 0, marginTop: 1 }} />
            <div><p style={{ margin: "0 0 4px", color: "#1e1a14", fontSize: "0.75rem", fontWeight: 600 }}>{isPaid ? "You are fully paid and confirmed" : "Your reserved spot stays protected"}</p><p style={{ margin: 0, color: "rgba(30,26,20,0.5)", fontSize: "0.66rem", lineHeight: 1.65 }}>{isPaid ? "Your original trip price, selected dates, and travel party are confirmed. Your detailed payment receipt is available by email." : "The balance payment confirms your booking. It does not reserve the slot twice or change your selected dates, party size, or original trip price."}</p></div>
          </div>}
        </motion.section>

        <motion.aside initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.08 }} className="order-1 lg:order-2 lg:sticky lg:top-24" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ borderRadius: 18, background: "#fff", boxShadow: "0 20px 60px rgba(30,26,20,0.12)", border: "1px solid rgba(30,26,20,0.07)", overflow: "hidden" }}>
            <div style={{ background: isEligible ? "#781216" : "#1e1a14", padding: "25px 26px 23px", color: "#fff" }}>
              <p style={{ margin: "0 0 7px", color: "rgba(255,255,255,0.6)", fontSize: "0.58rem", fontWeight: 500, letterSpacing: "0.16em", textTransform: "uppercase" }}>{isEligible ? (isInitialPayment ? "Payment due now" : "Balance due now") : isPaid ? "Payment completed" : "Booking payment status"}</p>
              <p style={{ margin: 0, fontSize: "clamp(2rem,5vw,2.65rem)", fontWeight: 500, letterSpacing: "-0.04em", lineHeight: 1.05 }}>{formatCurrency(displayAmount)}</p>
              {isEligible && booking.balanceDueDate && !isInitialPayment && <p style={{ margin: "9px 0 0", color: "rgba(255,255,255,0.57)", fontSize: "0.62rem" }}>Requested by {formatDate(booking.balanceDueDate)}</p>}
            </div>
            <div style={{ padding: "25px 26px 27px" }}>
              <div style={{ marginBottom: 22 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}><span style={{ color: "rgba(30,26,20,0.45)", fontSize: "0.6rem", letterSpacing: "0.08em", textTransform: "uppercase" }}>Payment progress</span><span style={{ color: "#228b22", fontSize: "0.66rem", fontWeight: 600 }}>{Math.round(paymentProgress)}% paid</span></div>
                <div style={{ height: 6, borderRadius: 999, background: "rgba(30,26,20,0.08)", overflow: "hidden" }}><div style={{ height: "100%", width: `${paymentProgress}%`, borderRadius: 999, background: "linear-gradient(90deg,#b8943a,#781216)", transition: "width 0.4s ease" }} /></div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingBottom: 18, marginBottom: 18, borderBottom: "1px solid rgba(30,26,20,0.08)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: "0.72rem" }}><span style={{ color: "rgba(30,26,20,0.5)" }}>Total booking value</span><span style={{ color: "#1e1a14", fontWeight: 500 }}>{formatCurrency(totalAmount)}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: "0.72rem" }}><span style={{ color: "rgba(30,26,20,0.5)" }}>Already paid</span><span style={{ color: "#228b22", fontWeight: 500 }}>− {formatCurrency(amountPaid)}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: "0.8rem" }}><span style={{ color: "#1e1a14", fontWeight: 600 }}>Balance to pay</span><span style={{ color: "#781216", fontWeight: 700 }}>{formatCurrency(amountDue)}</span></div>
              </div>

              {paymentError && <div role="alert" style={{ display: "flex", gap: 8, padding: "10px 12px", borderRadius: 8, background: "rgba(192,57,43,0.07)", color: "#a93226", fontSize: "0.64rem", lineHeight: 1.55, marginBottom: 14 }}><AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} /> {paymentError}</div>}

              {hasPendingUtr ? (
                <div style={{ padding: "16px 18px", borderRadius: 9, background: "rgba(184,148,58,0.09)", border: "1px solid rgba(184,148,58,0.25)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#9f7f2f", fontSize: "0.74rem", fontWeight: 600, marginBottom: 6 }}>
                    <Clock3 size={16} /> UTR Verification Pending
                  </div>
                  <p style={{ margin: "0 0 8px", color: "rgba(30,26,20,0.64)", fontSize: "0.64rem", lineHeight: 1.6 }}>
                    Submitted UTR: <strong style={{ fontFamily: "monospace" }}>{pendingUtrPayment.utr || "N/A"}</strong> for {formatCurrency(pendingUtrPayment.amount)}. Our admin team is verifying your payment with the bank.
                  </p>
                  <p style={{ margin: 0, color: "rgba(30,26,20,0.5)", fontSize: "0.58rem", lineHeight: 1.5 }}>
                    Once verified, your receipt will be emailed to you. Online checkout is temporarily paused.
                  </p>
                </div>
              ) : isEligible ? (
                <button type="button" onClick={() => setShowPaymentModal(true)} disabled={processing} aria-busy={processing} style={{ width: "100%", minHeight: 54, border: "none", borderRadius: 9, background: processing ? "rgba(120,18,22,0.66)" : "#781216", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", gap: 9, fontFamily: "'Poppins', sans-serif", fontSize: "0.77rem", fontWeight: 600, letterSpacing: "0.04em", cursor: processing ? "wait" : "pointer", boxShadow: "0 10px 25px rgba(120,18,22,0.2)", transition: "transform 0.2s ease, background 0.2s ease" }}>
                  {processing ? <><Loader2 size={17} className="animate-spin" /> Processing…</> : <>Pay {formatCurrency(displayAmount)} <ArrowRight size={16} /></>}
                </button>
              ) : (
                <div style={{ padding: "15px", borderRadius: 9, background: amountDue <= 0 ? "rgba(34,139,34,0.07)" : "rgba(184,148,58,0.08)", border: `1px solid ${amountDue <= 0 ? "rgba(34,139,34,0.16)" : "rgba(184,148,58,0.2)"}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, color: isPaid ? "#228b22" : "#9f7f2f", fontSize: "0.72rem", fontWeight: 600, marginBottom: 5 }}>{isPaid ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}{isPaid ? "Payment complete" : isRefunded ? "Refund recorded" : isCancelled ? "Booking cancelled" : isMaintenanceMode ? "Payments are temporarily paused" : "Payment currently unavailable"}</div>
                  <p style={{ margin: 0, color: "rgba(30,26,20,0.52)", fontSize: "0.62rem", lineHeight: 1.6 }}>{isPaid ? "There is no outstanding balance on this booking." : isMaintenanceMode ? "Maintenance is in progress. Your booking details remain available, and payment can resume once maintenance ends." : `This booking is ${String(booking.status).toLowerCase().replace(/_/g, " ")}. Contact us if you need help.`}</p>
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: 9, marginTop: 18 }}>
                {[{ icon: LockKeyhole, text: "Encrypted Razorpay checkout" }, { icon: Check, text: "Original booking price protected" }, { icon: ReceiptText, text: "Detailed receipt sent by email" }].map(({ icon: Icon, text }) => <div key={text} style={{ display: "flex", alignItems: "center", gap: 8, color: "rgba(30,26,20,0.45)", fontSize: "0.61rem" }}><Icon size={13} color="#b8943a" strokeWidth={1.6} /> {text}</div>)}
              </div>
            </div>
          </div>

          <a href={supportLink} target="_blank" rel="noreferrer" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 12, borderRadius: 13, padding: "16px 18px", background: "rgba(255,255,255,0.64)", border: "1px solid rgba(30,26,20,0.08)" }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", display: "grid", placeItems: "center", background: "rgba(184,148,58,0.1)", flexShrink: 0 }}><Headphones size={16} color="#9f7f2f" /></div>
            <div><span style={{ color: "#1e1a14", fontSize: "0.69rem", fontWeight: 600, display: "block", marginBottom: 2 }}>Need payment help?</span><span style={{ color: "rgba(30,26,20,0.45)", fontSize: "0.59rem" }}>Chat with our team on WhatsApp</span></div>
            <ArrowRight size={14} color="rgba(30,26,20,0.35)" style={{ marginLeft: "auto" }} />
          </a>
        </motion.aside>
      </main>

      <footer style={{ borderTop: "1px solid rgba(30,26,20,0.08)", padding: "22px clamp(1.25rem,5vw,5rem)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap", color: "rgba(30,26,20,0.42)", fontSize: "0.61rem" }}>
        <span>© {new Date().getFullYear()} Hangover Trails · Secure booking payments</span>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}><IndianRupee size={12} /> All amounts shown in INR · Taxes included</div>
      </footer>

      {showPaymentModal && booking && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          bookingId={booking.id}
          amount={displayAmount}
          paymentType={isInitialPayment ? (booking.initialPaymentType || "FULL") : "BALANCE"}
          itemTitle={itemTitle}
          onSuccess={(utrSubmitted) => {
            setShowPaymentModal(false);
            if (utrSubmitted) {
              setPaymentStep("success");
            } else {
              refetch();
            }
          }}
          onTriggerRazorpay={() => {
            setShowPaymentModal(false);
            handlePayBalance();
          }}
        />
      )}
    </div>
  );
}

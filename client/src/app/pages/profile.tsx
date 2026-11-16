import { SessionUnavailable } from "../components/SessionUnavailable";
import { useCallback, useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  MapPin,
  Clock,
  Users,
  Calendar,
  Ticket,
  LogOut,
  Settings,
  ChevronRight,
  Loader2,
  PackageOpen,
  RotateCcw,
  ReceiptText,
  CreditCard,
  Star,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import {
  fetchMyBookings,
  isUpcomingBooking,
  isPastBooking,
  formatBookingDate,
  formatTravelMonth,
  type ApiBooking,
  type BookingStatus,
} from "../../lib/profileApi";
import { formatPrice, formatDuration, formatTripType } from "../../lib/tripApi";
import { SiteFooter } from "../components/site-footer";
import { ProfileSettings } from "../components/profile-settings";
import { mediaImageUrl } from "../../lib/media";
import { toast } from "sonner";
import { getErrorMessage } from "../../lib/errors";

// ── Status badge styling ──────────────────────────────────────────

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  PENDING:             { bg: "rgba(200,169,110,0.12)", color: "#b8943a",  label: "Pending" },
  PENDING_VERIFICATION:{ bg: "rgba(217,119,6,0.12)", color: "#d97706",  label: "UTR Verifying" },
  RESERVED:            { bg: "rgba(200,169,110,0.12)", color: "#b8943a",  label: "Upcoming" },
  CONFIRMED:           { bg: "rgba(34,139,34,0.10)",   color: "#228b22",  label: "Upcoming" },
  COMPLETED:           { bg: "rgba(34,139,34,0.10)",   color: "#228b22",  label: "Completed" },
  CANCELLED:           { bg: "rgba(120,18,22,0.08)",   color: "#781216",  label: "Cancelled" },
  REFUNDED:            { bg: "rgba(109,40,217,0.08)",  color: "#7c3aed",  label: "Refunded" },
  PARTIALLY_REFUNDED:  { bg: "rgba(245,158,11,0.10)", color: "#d97706",  label: "Part. Refund" },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.PENDING;
  return (
    <span
      className="profile-booking-status"
      style={{
        display: "inline-block",
        padding: "3px 10px",
        borderRadius: "4px",
        background: s.bg,
        color: s.color,
        fontSize: "0.6rem",
        fontWeight: 600,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        fontFamily: "'Poppins', sans-serif",
      }}
    >
      {s.label}
    </span>
  );
}

// ── Booking card ──────────────────────────────────────────────────

function BookingCard({ booking }: { booking: ApiBooking }) {
  const [hovered, setHovered] = useState(false);
  const item: any = booking.customTrip || booking.trip || booking.festival || booking.crmTrip || booking.crmFestival;
  const isCustom = booking.source === "CUSTOM" || Boolean(booking.customTrip);
  const isFestival = Boolean(booking.festival || booking.crmFestival);
  const isCrm = booking.source === "CRM" || Boolean(booking.crmTrip || booking.crmFestival);
  const isCrmTripViewable = isCrm && (
    item?.isPublished || 
    (booking.status !== "PENDING" && booking.status !== "CANCELLED")
  );
  const heroImage = item?.bannerImages?.[0] || item?.websiteBannerImages?.[0] || booking.crmTrip?.websiteBannerImages?.[0] || booking.crmFestival?.websiteBannerImages?.[0] || "";
  const state = isCustom ? "Private custom trip" : (item as any)?.destination?.state || (item as any)?.destination?.name || booking.crmTrip?.destination?.name || booking.crmFestival?.destination?.name || (item as any)?.location || "";
  const travelStart = booking.customTrip?.startDate || booking.slot?.startDate || booking.crmTripSlot?.startDate || booking.crmFestivalSlot?.startDate;
  const paid = parseFloat(booking.amountPaid || "0");
  const due = parseFloat(booking.amountDue || "0");
  const isFullyRefunded = booking.paymentStatus === "REFUNDED";
  const isPartiallyRefunded = booking.paymentStatus === "PARTIALLY_REFUNDED";
  const isRefunded = isFullyRefunded || isPartiallyRefunded;
  const pendingUtrPayment = (booking.payments || []).find((p: any) => p.status === "PENDING_VERIFICATION");
  const hasPendingUtr = Boolean(pendingUtrPayment);
  const canPayBalance =
    !hasPendingUtr &&
    ((due > 0 && booking.status === "RESERVED" && booking.paymentStatus === "PARTIALLY_PAID") ||
    (booking.status === "PENDING" && (booking.paymentStatus === "PENDING" || booking.paymentStatus === "FAILED")));

  // Sum up all successful or pending refunds across payments
  const totalRefunded = (booking.payments || []).reduce((sum, p) => {
    return sum + (p.refunds || []).reduce((rSum, r) => {
      return r.status === "SUCCESS" || r.status === "PENDING" ? rSum + parseFloat(r.amount) : rSum;
    }, 0);
  }, 0);

  // Determine the status badge to show — prefer pending UTR state, then refunded states
  const badgeStatus: string = hasPendingUtr
    ? "PENDING_VERIFICATION"
    : isFullyRefunded
    ? "REFUNDED"
    : isPartiallyRefunded
    ? "PARTIALLY_REFUNDED"
    : booking.status;

  return (
    <motion.div
      className="profile-booking-card"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        background: "#ffffff",
        border: `1px solid ${
          isFullyRefunded
            ? "rgba(109,40,217,0.15)"
            : hovered
            ? "rgba(120,18,22,0.18)"
            : "rgba(30,26,20,0.07)"
        }`,
        borderRadius: "12px",
        overflow: "hidden",
        transition: "border-color 0.25s ease, box-shadow 0.25s ease",
        boxShadow: hovered ? "0 4px 20px rgba(30,26,20,0.06)" : "0 1px 4px rgba(30,26,20,0.03)",
        fontFamily: "'Poppins', sans-serif",
        opacity: isFullyRefunded ? 0.85 : 1,
      }}
    >
      {/* Thumbnail */}
      <div
        className="profile-booking-thumbnail hidden sm:block"
        style={{
          width: "180px",
          minHeight: "160px",
          flexShrink: 0,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {heroImage ? (
          <img
            src={mediaImageUrl(heroImage, { width: 400, height: 320 })}
            alt={item?.title}
            loading="lazy"
            decoding="async"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transition: "transform 0.5s ease",
              transform: hovered ? "scale(1.06)" : "scale(1)",
              filter: isFullyRefunded ? "grayscale(40%)" : "none",
            }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              background: "#ede8dc",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "rgba(30,26,20,0.3)",
              fontSize: "0.72rem",
            }}
          >
            No Image
          </div>
        )}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(to right, transparent 60%, rgba(255,255,255,0.4) 100%)",
          }}
        />
        {/* Refunded overlay ribbon */}
        {isFullyRefunded && (
          <div style={{
            position: "absolute",
            top: "10px",
            left: "-24px",
            background: "#7c3aed",
            color: "#fff",
            fontSize: "0.52rem",
            fontWeight: 700,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            padding: "3px 32px",
            transform: "rotate(-45deg)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
          }}>
            Refunded
          </div>
        )}
      </div>

      {/* Content */}
      <div
        className="profile-booking-content"
        style={{
          flex: 1,
          padding: "18px 22px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          gap: "10px",
          minWidth: 0,
        }}
      >
        {/* Top: state + title + status */}
        <div>
          <div className="profile-booking-heading" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", marginBottom: "4px" }}>
            <div className="profile-booking-location" style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <MapPin size={10} color="#781216" />
              <span
                style={{
                  color: "#781216",
                  fontSize: "0.58rem",
                  fontWeight: 600,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                }}
              >
                {state}
              </span>
            </div>
            <StatusBadge status={badgeStatus} />
          </div>
          <h3
            className="profile-booking-title"
            style={{
              color: "#1e1a14",
              fontSize: "1rem",
              fontWeight: 600,
              letterSpacing: "-0.01em",
              margin: "0 0 3px",
              lineHeight: 1.3,
            }}
          >
            {item?.title || item?.name || "Your trip"}
          </h3>
          <p
            className="profile-booking-reference"
            style={{
              color: "rgba(30,26,20,0.38)",
              fontSize: "0.64rem",
              fontWeight: 400,
              margin: 0,
            }}
          >
            {booking.bookingReference} · Booked {formatBookingDate(booking.createdAt)}
          </p>
        </div>

        {/* Meta row */}
        <div
          className="profile-booking-meta"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            flexWrap: "wrap",
          }}
        >
          {[
            { icon: Calendar, text: `Travel ${formatTravelMonth(travelStart)}` },
            { icon: Users, text: `${booking.numberOfTravelers} Traveler${booking.numberOfTravelers > 1 ? "s" : ""}` },
            ...((item as any)?.duration || booking.customTrip?.durationDays ? [{ icon: Clock, text: formatDuration((item as any)?.duration || booking.customTrip?.durationDays) }] : []),
          ].map(({ icon: Icon, text }, i) => (
            <div className="profile-booking-meta-item" key={i} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <Icon size={11} color="rgba(30,26,20,0.35)" strokeWidth={1.5} />
              <span style={{ color: "rgba(30,26,20,0.5)", fontSize: "0.68rem", fontWeight: 400 }}>
                {text}
              </span>
            </div>
          ))}
        </div>

        {/* Refund receipt info — shown for refunded bookings */}
        {isRefunded && totalRefunded > 0 && (
          <div className="profile-booking-refund" style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            background: isFullyRefunded ? "rgba(109,40,217,0.06)" : "rgba(245,158,11,0.07)",
            border: `1px solid ${isFullyRefunded ? "rgba(109,40,217,0.15)" : "rgba(245,158,11,0.2)"}`,
            borderRadius: "6px",
            padding: "6px 10px",
          }}>
            <ReceiptText size={11} color={isFullyRefunded ? "#7c3aed" : "#d97706"} strokeWidth={1.5} />
            <span style={{
              color: isFullyRefunded ? "#7c3aed" : "#d97706",
              fontSize: "0.65rem",
              fontWeight: 600,
              fontFamily: "'Poppins', sans-serif",
            }}>
              {isFullyRefunded ? "Full refund" : "Partial refund"} of {formatPrice(totalRefunded)} initiated
              {booking.cancellationReason ? ` · ${booking.cancellationReason}` : ""}
            </span>
          </div>
        )}

        {/* Price + action */}
        <div
          className="profile-booking-footer"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingTop: "10px",
            borderTop: "1px solid rgba(30,26,20,0.06)",
            flexWrap: "wrap",
            gap: "8px",
          }}
        >
          <div className="profile-booking-payment" style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
            {paid > 0 && !isFullyRefunded && (
              <div>
                <span style={{ color: "rgba(30,26,20,0.35)", fontSize: "0.55rem", fontWeight: 400, display: "block", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                  Paid
                </span>
                <span style={{ color: "#1e1a14", fontSize: "0.92rem", fontWeight: 700, letterSpacing: "-0.02em" }}>
                  {formatPrice(paid)}
                </span>
              </div>
            )}
            {due > 0 && booking.status !== "CANCELLED" && !isRefunded && (
              <div style={{ marginLeft: "6px" }}>
                <span style={{ color: "rgba(30,26,20,0.35)", fontSize: "0.55rem", fontWeight: 400, display: "block", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                  Balance Due
                </span>
                <span style={{ color: "#b8943a", fontSize: "0.92rem", fontWeight: 600 }}>
                  {formatPrice(due)}
                </span>
              </div>
            )}
            {isFullyRefunded && !isCustom && (
              <div>
                <span style={{ color: "rgba(30,26,20,0.35)", fontSize: "0.55rem", fontWeight: 400, display: "block", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                  Refunded
                </span>
                <span style={{ color: "#7c3aed", fontSize: "0.92rem", fontWeight: 700, letterSpacing: "-0.02em" }}>
                  {formatPrice(totalRefunded)}
                </span>
              </div>
            )}
            {paid === 0 && due === 0 && !isRefunded && (
              <span style={{ color: "#1e1a14", fontSize: "0.92rem", fontWeight: 700 }}>
                {formatPrice(booking.totalAmount)}
              </span>
            )}
          </div>

          {/* CTAs */}
          <div className="profile-booking-actions" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {booking.status === "COMPLETED" && !booking.review && (
              <Link
                className="profile-booking-primary-action"
                to={`/bookings/${booking.id}/review`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  background: "#781216",
                  color: "#fff",
                  fontSize: "0.68rem",
                  fontWeight: 600,
                  textDecoration: "none",
                  padding: "5px 12px",
                  borderRadius: "6px",
                  whiteSpace: "nowrap",
                }}
              >
                <Star size={10} /> Leave a review
              </Link>
            )}
            {canPayBalance && (
              <Link
                className="profile-booking-primary-action"
                to={`/bookings/${booking.id}/pay-balance`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  background: "#b8943a",
                  color: "#fff",
                  fontSize: "0.68rem",
                  fontWeight: 600,
                  textDecoration: "none",
                  padding: "5px 12px",
                  borderRadius: "6px",
                  whiteSpace: "nowrap",
                  transition: "background 0.2s ease",
                  letterSpacing: "0.02em",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#9f7f2f")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "#b8943a")}
              >
                <CreditCard size={10} /> {booking.status === "PENDING" ? "Complete Booking" : "Pay Balance"}
              </Link>
            )}
            {/* Book Again — only shown for fully refunded trips */}
            {isFullyRefunded && (
              <Link
                className="profile-booking-primary-action"
                to={`/book/${item?.id}${isFestival ? "?type=festival" : ""}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  background: "#781216",
                  color: "#fff",
                  fontSize: "0.68rem",
                  fontWeight: 600,
                  textDecoration: "none",
                  padding: "5px 12px",
                  borderRadius: "6px",
                  whiteSpace: "nowrap",
                  transition: "background 0.2s ease",
                  letterSpacing: "0.02em",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#5e0e11")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "#781216")}
              >
                <RotateCcw size={10} /> Book Again
              </Link>
            )}
            {isCustom ? (
              <span style={{ color: "rgba(30,26,20,0.45)", fontSize: "0.72rem", fontWeight: 500 }}>Private itinerary</span>
            ) : !item?.id ? (
              <span style={{ color: "rgba(30,26,20,0.45)", fontSize: "0.72rem", fontWeight: 500 }}>Itinerary unavailable</span>
            ) : isCrm && !isCrmTripViewable ? (
              <span style={{ color: "rgba(30,26,20,0.45)", fontSize: "0.72rem", fontWeight: 500 }}>
                {booking.status === "PENDING" ? "Pending payment" : "Itinerary unavailable"}
              </span>
            ) : (
              <Link
                className="profile-booking-view-action"
                to={isFestival ? `/festivals/${item?.id}` : `/trips/${item?.id}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  color: hovered ? "#781216" : "rgba(30,26,20,0.45)",
                  fontSize: "0.72rem",
                  fontWeight: 500,
                  textDecoration: "none",
                  transition: "color 0.2s ease",
                  whiteSpace: "nowrap",
                }}
              >
                View {isFestival ? "Festival" : "Trip"} <ChevronRight size={12} />
              </Link>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── Section header ────────────────────────────────────────────────

function SectionHeader({ title, count }: { title: string; count: number }) {
  return (
    <div
      className="profile-section-header"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        marginBottom: "16px",
        marginTop: "8px",
      }}
    >
      <div
        style={{
          width: "6px",
          height: "6px",
          borderRadius: "50%",
          background: title.toLowerCase().includes("upcoming") ? "#b8943a" : "rgba(30,26,20,0.2)",
        }}
      />
      <h2
        style={{
          color: "#1e1a14",
          fontSize: "1.05rem",
          fontWeight: 600,
          margin: 0,
          letterSpacing: "-0.01em",
          fontFamily: "'Poppins', sans-serif",
        }}
      >
        {title}
      </h2>
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: "20px",
          height: "20px",
          borderRadius: "50%",
          background: "rgba(30,26,20,0.06)",
          color: "rgba(30,26,20,0.5)",
          fontSize: "0.62rem",
          fontWeight: 600,
          fontFamily: "'Poppins', sans-serif",
        }}
      >
        {count}
      </span>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────

function EmptyState({ message }: { message: string }) {
  return (
    <div
      className="profile-empty-state"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "3rem 1rem",
        gap: "12px",
      }}
    >
      <PackageOpen size={36} color="rgba(30,26,20,0.15)" strokeWidth={1.2} />
      <p
        style={{
          color: "rgba(30,26,20,0.38)",
          fontSize: "0.85rem",
          fontWeight: 400,
          fontFamily: "'Poppins', sans-serif",
          textAlign: "center",
        }}
      >
        {message}
      </p>
      <Link
        to="/trips"
        style={{
          color: "#781216",
          fontSize: "0.78rem",
          fontWeight: 500,
          textDecoration: "none",
          fontFamily: "'Poppins', sans-serif",
        }}
      >
        Explore Trips →
      </Link>
    </div>
  );
}

// ── Profile page tabs ─────────────────────────────────────────────

type Tab = "bookings" | "settings";

// ── Main profile page ─────────────────────────────────────────────

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading, logout, sessionError, retrySession } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("bookings");
  const [bookings, setBookings] = useState<ApiBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !sessionError && !user) {
      navigate("/", { replace: true });
    }
  }, [authLoading, sessionError, user, navigate]);

  const loadBookings = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      setBookings(await fetchMyBookings());
    } catch (err) {
      const message = getErrorMessage(err, "Failed to load bookings");
      setError(message);
      toast.error(message, { id: "profile-bookings-load-error" });
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Fetch bookings
  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  if (authLoading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#f5f0e6",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Loader2
          size={28}
          color="#781216"
          strokeWidth={1.5}
          style={{ animation: "spin 1s linear infinite" }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (sessionError) return <SessionUnavailable onRetry={retrySession} />;
  if (!user) return null;

  const upcoming = bookings.filter(isUpcomingBooking);
  const past = bookings.filter(isPastBooking);
  const completedCount = bookings.filter((b) => b.status === "COMPLETED").length;
  const cancelledCount = bookings.filter((b) => b.status === "CANCELLED" && b.paymentStatus !== "REFUNDED").length;
  const refundedCount = bookings.filter((b) => b.paymentStatus === "REFUNDED" || b.paymentStatus === "PARTIALLY_REFUNDED").length;

  const displayName = user.name || user.email?.split("@")[0] || "User";
  const initials = displayName.charAt(0).toUpperCase();

  return (
    <div className="profile-page" style={{ background: "#f5f0e6", minHeight: "100vh", fontFamily: "'Poppins', sans-serif" }}>
      {/* ── Dark header ── */}
      <div
        className="profile-header"
        style={{
          background: "#1e1a14",
          paddingTop: "100px",
          paddingBottom: "0",
        }}
      >
        <div
          className="profile-header-inner"
          style={{
            maxWidth: "1080px",
            margin: "0 auto",
            padding: "0 clamp(1.5rem,5vw,4rem)",
          }}
        >
          {/* Profile info row */}
          <div
            className="profile-hero-row"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "24px",
              paddingBottom: "28px",
            }}
          >
            {/* Left: avatar + name */}
            <div className="profile-identity" style={{ display: "flex", alignItems: "center", gap: "18px" }}>
              <div
                className="profile-avatar"
                style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #781216 0%, #b8943a 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontSize: "1.3rem",
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {initials}
              </div>
              <div className="profile-identity-copy">
                <p
                  style={{
                    color: "rgba(242,237,228,0.45)",
                    fontSize: "0.58rem",
                    fontWeight: 500,
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    margin: "0 0 2px",
                  }}
                >
                  / Traveler Profile
                </p>
                <h1
                  className="profile-display-name"
                  style={{
                    color: "#f2ede4",
                    fontSize: "1.5rem",
                    fontWeight: 600,
                    letterSpacing: "-0.02em",
                    margin: "0 0 2px",
                  }}
                >
                  {displayName}
                </h1>
                <p
                  className="profile-email"
                  style={{
                    color: "rgba(242,237,228,0.4)",
                    fontSize: "0.75rem",
                    fontWeight: 300,
                    margin: 0,
                  }}
                >
                  {user.email}
                </p>
              </div>
            </div>

            {/* Right: stats */}
            <div className="profile-stats" style={{ display: "flex", gap: "24px" }}>
              {[
                { value: upcoming.length, label: "Upcoming" },
                { value: completedCount, label: "Completed" },
                { value: cancelledCount, label: "Cancelled" },
                ...(refundedCount > 0 ? [{ value: refundedCount, label: "Refunded" }] : []),
              ].map(({ value, label }) => (
                <div
                  className="profile-stat-card"
                  key={label}
                  style={{
                    textAlign: "center",
                    padding: "8px 16px",
                    border: "1px solid rgba(242,237,228,0.08)",
                    borderRadius: "8px",
                  }}
                >
                  <p
                    className="profile-stat-value"
                    style={{
                      color: "#f2ede4",
                      fontSize: "1.4rem",
                      fontWeight: 700,
                      margin: 0,
                      letterSpacing: "-0.03em",
                    }}
                  >
                    {value}
                  </p>
                  <p
                    className="profile-stat-label"
                    style={{
                      color: "rgba(242,237,228,0.35)",
                      fontSize: "0.55rem",
                      fontWeight: 400,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      margin: 0,
                    }}
                  >
                    {label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Tab bar */}
          <div
            className="profile-tabs-bar"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderTop: "1px solid rgba(242,237,228,0.06)",
            }}
          >
            <div className="profile-tabs" style={{ display: "flex", gap: "0" }}>
              {([
                { key: "bookings" as Tab, label: "My Bookings", icon: Ticket },
                { key: "settings" as Tab, label: "Profile Settings", icon: Settings },
              ]).map(({ key, label, icon: Icon }) => (
                <button
                  className="profile-tab"
                  key={key}
                  onClick={() => setActiveTab(key)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "14px 20px",
                    background: "none",
                    border: "none",
                    borderBottom: `2px solid ${activeTab === key ? "#b8943a" : "transparent"}`,
                    color: activeTab === key ? "#f2ede4" : "rgba(242,237,228,0.35)",
                    fontSize: "0.75rem",
                    fontWeight: activeTab === key ? 600 : 400,
                    letterSpacing: "0.02em",
                    cursor: "pointer",
                    fontFamily: "'Poppins', sans-serif",
                    transition: "color 0.2s ease, border-color 0.2s ease",
                  }}
                >
                  <Icon size={13} strokeWidth={1.5} />
                  {label}
                </button>
              ))}
            </div>
            <button
              className="profile-signout"
              aria-label="Sign out"
              onClick={logout}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                padding: "10px 16px",
                background: "none",
                border: "none",
                color: "rgba(242,237,228,0.35)",
                fontSize: "0.7rem",
                fontWeight: 400,
                cursor: "pointer",
                fontFamily: "'Poppins', sans-serif",
                transition: "color 0.2s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#c0392b")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(242,237,228,0.35)")}
            >
              <LogOut size={12} strokeWidth={1.5} />
              <span className="profile-signout-label">Sign Out</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Tab content ── */}
      <div
        className="profile-content"
        style={{
          maxWidth: "1080px",
          margin: "0 auto",
          padding: "clamp(1.5rem,3vw,2.5rem) clamp(1.5rem,5vw,4rem) 4rem",
        }}
      >
        <AnimatePresence mode="wait">
          {activeTab === "bookings" && (
            <motion.div
              key="bookings"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              {loading ? (
                <div style={{ display: "flex", justifyContent: "center", padding: "4rem 0" }}>
                  <Loader2
                    size={24}
                    color="#781216"
                    strokeWidth={1.5}
                    style={{ animation: "spin 1s linear infinite" }}
                  />
                  <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>
              ) : error ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "3rem 1rem",
                    color: "#c0392b",
                    fontSize: "0.88rem",
                    fontWeight: 500,
                  }}
                >
                  <p>{error}</p>
                  <button type="button" onClick={loadBookings} style={{ marginTop: "12px", color: "#781216", background: "none", border: 0, textDecoration: "underline", fontWeight: 600, cursor: "pointer" }}>Try again</button>
                </div>
              ) : bookings.length === 0 ? (
                <EmptyState message="You haven't booked any trips yet. Start exploring!" />
              ) : (
                <>
                  {/* Upcoming */}
                  {upcoming.length > 0 && (
                    <div style={{ marginBottom: "clamp(2rem,4vw,3rem)" }}>
                      <SectionHeader title="Upcoming Trips" count={upcoming.length} />
                      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        {upcoming.map((b) => (
                          <BookingCard key={b.id} booking={b} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Past */}
                  {past.length > 0 && (
                    <div>
                      <SectionHeader title="Past Trips" count={past.length} />
                      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        {past.map((b) => (
                          <BookingCard key={b.id} booking={b} />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}

          {activeTab === "settings" && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              <ProfileSettings />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <SiteFooter />
      <style>{`
        @media (max-width: 767px) {
          .profile-page {
            overflow-x: hidden;
          }
          .profile-header {
            padding-top: 72px !important;
          }
          .profile-header-inner {
            padding: 0 16px !important;
          }
          .profile-hero-row {
            align-items: stretch !important;
            flex-direction: column;
            flex-wrap: nowrap !important;
            gap: 16px !important;
            padding-bottom: 16px !important;
          }
          .profile-identity {
            gap: 12px !important;
            min-width: 0;
          }
          .profile-avatar {
            width: 48px !important;
            height: 48px !important;
            font-size: 1.1rem !important;
          }
          .profile-identity-copy {
            min-width: 0;
          }
          .profile-display-name {
            font-size: 1.2rem !important;
            line-height: 1.25;
            overflow-wrap: anywhere;
          }
          .profile-email {
            font-size: 0.68rem !important;
            overflow-wrap: anywhere;
          }
          .profile-stats {
            display: grid !important;
            grid-template-columns: repeat(auto-fit, minmax(64px, 1fr));
            gap: 8px !important;
            width: 100%;
          }
          .profile-stat-card {
            min-width: 0;
            padding: 7px 4px !important;
          }
          .profile-stat-value {
            font-size: 1.08rem !important;
          }
          .profile-stat-label {
            font-size: 0.48rem !important;
            letter-spacing: 0.06em !important;
          }
          .profile-tabs-bar {
            align-items: stretch !important;
            min-width: 0;
          }
          .profile-tabs {
            flex: 1 1 auto;
            min-width: 0;
          }
          .profile-tab {
            flex: 1 1 0;
            justify-content: center;
            gap: 4px !important;
            min-width: 0;
            min-height: 44px;
            padding: 10px 5px !important;
            font-size: 0.64rem !important;
            line-height: 1.2;
          }
          .profile-signout {
            flex: 0 0 42px;
            justify-content: center;
            min-height: 44px;
            padding: 10px 8px !important;
          }
          .profile-signout-label {
            display: none;
          }
          .profile-content {
            padding: 20px 12px 48px !important;
          }
          .profile-section-header {
            margin-bottom: 12px !important;
          }
          .profile-empty-state {
            padding: 2rem 12px !important;
          }
          .profile-booking-card {
            flex-direction: column;
            border-radius: 10px !important;
          }
          .profile-booking-thumbnail {
            display: block !important;
            width: 100% !important;
            height: 112px;
            min-height: 0 !important;
          }
          .profile-booking-content {
            padding: 13px 14px !important;
            gap: 9px !important;
          }
          .profile-booking-heading {
            align-items: flex-start !important;
            gap: 8px !important;
          }
          .profile-booking-location {
            min-width: 0;
          }
          .profile-booking-location span {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          .profile-booking-status {
            flex-shrink: 0;
            padding: 3px 7px !important;
            font-size: 0.54rem !important;
          }
          .profile-booking-title {
            font-size: 0.92rem !important;
            overflow-wrap: anywhere;
          }
          .profile-booking-reference {
            font-size: 0.59rem !important;
            overflow-wrap: anywhere;
          }
          .profile-booking-meta {
            display: grid !important;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 7px 10px !important;
          }
          .profile-booking-meta-item {
            min-width: 0;
          }
          .profile-booking-meta-item span {
            font-size: 0.63rem !important;
            overflow-wrap: anywhere;
          }
          .profile-booking-refund {
            align-items: flex-start !important;
            padding: 7px 8px !important;
          }
          .profile-booking-refund span {
            overflow-wrap: anywhere;
          }
          .profile-booking-footer {
            align-items: stretch !important;
            flex-direction: column;
            gap: 10px !important;
          }
          .profile-booking-payment {
            width: 100%;
          }
          .profile-booking-actions {
            align-items: stretch !important;
            gap: 8px !important;
            width: 100%;
          }
          .profile-booking-primary-action,
          .profile-booking-view-action {
            flex: 1 1 0;
            justify-content: center;
            box-sizing: border-box;
            min-height: 38px;
            padding: 8px 10px !important;
          }
        }
      `}</style>
    </div>
  );
}

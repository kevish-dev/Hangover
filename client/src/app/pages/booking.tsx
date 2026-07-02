import { useState, useEffect } from "react";
import { useParams, Link } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft,
  Upload,
  Plus,
  Trash2,
  Info,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  CreditCard,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import {
  fetchTripBySlug,
  formatPrice,
  formatDuration,
  type ApiTrip,
} from "../../lib/tripApi";
import { SiteFooter } from "../components/site-footer";

// ── Shared input styles ───────────────────────────────────────────
const inputBase: React.CSSProperties = {
  width: "100%",
  padding: "11px 14px",
  background: "#ffffff",
  border: "1px solid rgba(30,26,20,0.14)",
  borderRadius: "8px",
  fontSize: "0.84rem",
  fontFamily: "'Poppins', sans-serif",
  fontWeight: 300,
  color: "#1e1a14",
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.2s ease",
};

function Field({
  label,
  required,
  children,
  hint,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "5px",
      }}
    >
      <label
        style={{
          color: "#1e1a14",
          fontSize: "0.72rem",
          fontWeight: 500,
          letterSpacing: "0.04em",
          fontFamily: "'Poppins', sans-serif",
        }}
      >
        {label} {required && <span style={{ color: "#781216" }}>*</span>}
      </label>
      {children}
      {hint && (
        <p
          style={{
            color: "rgba(30,26,20,0.38)",
            fontSize: "0.65rem",
            margin: 0,
            fontFamily: "'Poppins', sans-serif",
          }}
        >
          {hint}
        </p>
      )}
    </div>
  );
}

function Input({ ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      {...props}
      onFocus={(e) => {
        setFocused(true);
        props.onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        props.onBlur?.(e);
      }}
      style={{
        ...inputBase,
        borderColor: focused ? "#781216" : "rgba(30,26,20,0.14)",
        ...props.style,
      }}
    />
  );
}

function Select({
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const [focused, setFocused] = useState(false);
  return (
    <select
      {...props}
      onFocus={(e) => {
        setFocused(true);
        props.onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        props.onBlur?.(e);
      }}
      style={{
        ...inputBase,
        cursor: "pointer",
        borderColor: focused ? "#781216" : "rgba(30,26,20,0.14)",
        WebkitAppearance: "none",
      }}
    >
      {children}
    </select>
  );
}

function AadhaarUpload({ label, name }: { label: string; name: string }) {
  const [fileName, setFileName] = useState<string | null>(null);
  return (
    <Field
      label={label}
      required
      hint="PDF or image — max 5MB. Used only for identity verification."
    >
      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          padding: "11px 14px",
          borderRadius: "8px",
          border: `1.5px dashed ${fileName ? "#781216" : "rgba(30,26,20,0.2)"}`,
          background: fileName ? "rgba(120,18,22,0.03)" : "#faf8f4",
          cursor: "pointer",
          transition: "border-color 0.2s, background 0.2s",
          fontFamily: "'Poppins', sans-serif",
        }}
      >
        <Upload
          size={15}
          color={fileName ? "#781216" : "rgba(30,26,20,0.38)"}
          strokeWidth={1.5}
        />
        <span
          style={{
            color: fileName ? "#781216" : "rgba(30,26,20,0.5)",
            fontSize: "0.78rem",
            fontWeight: 300,
          }}
        >
          {fileName ?? "Choose file…"}
        </span>
        <input
          type="file"
          name={name}
          accept="image/*,.pdf"
          style={{ display: "none" }}
          onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
        />
      </label>
    </Field>
  );
}

// ── Section divider ───────────────────────────────────────────────
function FormSection({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          marginBottom: "20px",
        }}
      >
        <div
          style={{
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            background: "rgba(120,18,22,0.07)",
            border: "1px solid rgba(120,18,22,0.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Icon size={14} color="#781216" strokeWidth={1.5} />
        </div>
        <div>
          <h3
            style={{
              color: "#1e1a14",
              fontSize: "1rem",
              fontWeight: 500,
              letterSpacing: "-0.015em",
              margin: 0,
            }}
          >
            {title}
          </h3>
          <div
            style={{
              width: "24px",
              height: "1.5px",
              background: "#781216",
              marginTop: "4px",
              borderRadius: "1px",
            }}
          />
        </div>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "14px",
        }}
        className="grid-cols-1 sm:grid-cols-2"
      >
        {children}
      </div>
    </div>
  );
}

// ── Additional traveler form ───────────────────────────────────────
function TravelerForm({
  index,
  onRemove,
}: {
  index: number;
  onRemove: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{
        duration: 0.35,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      style={{
        border: "1px solid rgba(30,26,20,0.09)",
        borderRadius: "12px",
        padding: "22px",
        background: "#faf8f4",
        position: "relative",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "18px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <div
            style={{
              width: "24px",
              height: "24px",
              borderRadius: "50%",
              background: "#781216",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span
              style={{
                color: "#fff",
                fontSize: "0.6rem",
                fontWeight: 700,
                fontFamily: "'Poppins', sans-serif",
              }}
            >
              {index + 1}
            </span>
          </div>
          <span
            style={{
              color: "#1e1a14",
              fontSize: "0.88rem",
              fontWeight: 500,
              fontFamily: "'Poppins', sans-serif",
            }}
          >
            Traveler {index + 1}
          </span>
        </div>
        <button
          onClick={onRemove}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "4px",
            color: "rgba(30,26,20,0.4)",
            padding: "4px 8px",
            borderRadius: "4px",
            fontFamily: "'Poppins', sans-serif",
            fontSize: "0.7rem",
            transition: "color 0.2s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#781216")}
          onMouseLeave={(e) =>
            (e.currentTarget.style.color = "rgba(30,26,20,0.4)")
          }
        >
          <Trash2 size={13} /> Remove
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "14px",
        }}
        className="grid-cols-1 sm:grid-cols-2"
      >
        <Field label="First Name" required>
          <Input type="text" placeholder="First name" />
        </Field>
        <Field label="Last Name" required>
          <Input type="text" placeholder="Last name" />
        </Field>
        <Field label="Email ID" required>
          <Input type="email" placeholder="email@example.com" />
        </Field>
        <Field label="Contact Number" required>
          <Input type="tel" placeholder="+91 98765 43210" />
        </Field>
        <Field label="Date of Birth" required>
          <Input type="date" />
        </Field>
        <Field label="Gender" required>
          <Select>
            <option value="">Select gender</option>
            <option>Male</option>
            <option>Female</option>
            <option>Non-binary</option>
            <option>Prefer not to say</option>
          </Select>
        </Field>
        <div className="sm:col-span-2">
          <AadhaarUpload
            label="Upload Aadhaar Card"
            name={`traveler-${index}-aadhaar`}
          />
        </div>
      </div>
    </motion.div>
  );
}

// ── Page ──────────────────────────────────────────────────────────
export default function BookingPage() {
  const { slug } = useParams();
  const [trip, setTrip] = useState<ApiTrip | null>(null);
  const [loading, setLoading] = useState(true);

  const [solo, setSolo] = useState<"yes" | "no" | null>(null);
  const [travelers, setTravelers] = useState<number[]>([]);
  const [primaryEmail, setPrimaryEmail] = useState("");
  const [primaryPhone, setPrimaryPhone] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    fetchTripBySlug(slug)
      .then((data) => setTrip(data))
      .catch(() => setTrip(null))
      .finally(() => setLoading(false));
  }, [slug]);

  const addTraveler = () => setTravelers((t) => [...t, Date.now()]);
  const removeTraveler = (id: number) =>
    setTravelers((t) => t.filter((x) => x !== id));

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f5f0e6",
          fontFamily: "'Poppins', sans-serif",
        }}
      >
        <p style={{ color: "rgba(30,26,20,0.4)" }}>Loading trip…</p>
      </div>
    );
  }

  if (!trip) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f5f0e6",
          fontFamily: "'Poppins', sans-serif",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <p
            style={{
              color: "rgba(30,26,20,0.4)",
              marginBottom: "16px",
            }}
          >
            Trip not found.
          </p>
          <Link
            to="/trips"
            style={{
              color: "#781216",
              textDecoration: "none",
              fontSize: "0.82rem",
            }}
          >
            ← Back to trips
          </Link>
        </div>
      </div>
    );
  }

  // Map backend fields to display values
  const tripName = trip.title;
  const tripImage = trip.bannerImages?.[0] || trip.galleryImages?.[0] || "";
  const tripPrice = formatPrice(trip.price);
  const tripDuration = formatDuration(trip.duration);
  const tripDestination = trip.location;
  const tripDifficulty = trip.difficultyLevel;
  const tripSlug = trip.slug;

  const numTravelers = 1 + travelers.length;
  const totalAmountDue = Number(trip.price) * numTravelers;
  const tokenAmountDue = Number(trip.tokenAmount) * numTravelers;
  const isTokenZero = tokenAmountDue === 0;

  if (submitted) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f5f0e6",
          fontFamily: "'Poppins', sans-serif",
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{
            textAlign: "center",
            maxWidth: "480px",
            padding: "3rem 2rem",
          }}
        >
          <CheckCircle
            size={52}
            color="#781216"
            strokeWidth={1.2}
            style={{ margin: "0 auto 20px" }}
          />
          <h2
            style={{
              color: "#1e1a14",
              fontSize: "1.6rem",
              fontWeight: 300,
              letterSpacing: "-0.02em",
              margin: "0 0 12px",
            }}
          >
            Booking Request Received!
          </h2>
          <p
            style={{
              color: "rgba(30,26,20,0.55)",
              fontSize: "0.88rem",
              fontWeight: 300,
              lineHeight: 1.8,
              margin: "0 0 28px",
            }}
          >
            We've received your booking for{" "}
            <strong style={{ fontWeight: 500 }}>{tripName}</strong>. A
            confirmation will be sent to{" "}
            <strong style={{ color: "#781216" }}>
              {primaryEmail || "your email"}
            </strong>{" "}
            and{" "}
            <strong style={{ color: "#781216" }}>
              {primaryPhone || "your phone"}
            </strong>{" "}
            within 2 hours.
          </p>
          <Link
            to={`/trips/${slug}`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              color: "#781216",
              fontSize: "0.78rem",
              fontWeight: 600,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              textDecoration: "none",
              borderBottom: "1.5px solid rgba(120,18,22,0.25)",
              paddingBottom: "3px",
            }}
          >
            ← Back to Trip Details
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div
      style={{
        background: "#f5f0e6",
        minHeight: "100vh",
        fontFamily: "'Poppins', sans-serif",
      }}
    >
      {/* ── Page banner ── */}
      <div
        style={{
          background: "#1e1a14",
          paddingTop: "100px",
          paddingBottom: "clamp(2rem,4vw,3rem)",
          paddingLeft: "clamp(1.5rem,5vw,6rem)",
          paddingRight: "clamp(1.5rem,5vw,6rem)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `url(${tripImage})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            opacity: 0.08,
          }}
        />
        <div
          style={{
            maxWidth: "1280px",
            margin: "0 auto",
            position: "relative",
            zIndex: 1,
          }}
        >
          <Link
            to={`/trips/${slug}`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              color: "rgba(242,237,228,0.55)",
              fontSize: "0.72rem",
              letterSpacing: "0.06em",
              textDecoration: "none",
              marginBottom: "14px",
              transition: "color 0.2s",
            }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLAnchorElement).style.color = "#f2ede4")
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLAnchorElement).style.color =
                "rgba(242,237,228,0.55)")
            }
          >
            <ArrowLeft size={13} /> Back to {tripName}
          </Link>
          <p
            style={{
              color: "#C8A96E",
              fontSize: "0.68rem",
              fontWeight: 500,
              letterSpacing: "0.26em",
              textTransform: "uppercase",
              marginBottom: "8px",
            }}
          >
            / Book Your Trip
          </p>
          <h1
            style={{
              color: "#f2ede4",
              fontSize: "clamp(1.6rem,3.5vw,2.6rem)",
              fontWeight: 300,
              letterSpacing: "-0.025em",
              lineHeight: 1.15,
              margin: 0,
            }}
          >
            {tripName}
          </h1>
        </div>
      </div>

      {/* ── Main form + summary ── */}
      <div
        style={{
          maxWidth: "1280px",
          margin: "0 auto",
          padding: "clamp(2rem,4vw,3.5rem) clamp(1.5rem,5vw,6rem)",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 340px",
            gap: "clamp(2rem,4vw,4rem)",
            alignItems: "start",
          }}
          className="grid-cols-1 lg:grid-cols-[1fr_340px]"
        >
          {/* ══ LEFT: Form ══ */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setSubmitted(true);
            }}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "36px",
            }}
          >
            {/* ── 1. Primary Traveler ── */}
            <div
              style={{
                background: "#ffffff",
                borderRadius: "14px",
                border: "1px solid rgba(30,26,20,0.07)",
                padding: "clamp(22px,3vw,32px)",
                boxShadow: "0 2px 10px rgba(30,26,20,0.04)",
              }}
            >
              <FormSection title="Primary Traveler" icon={User}>
                <Field label="First Name" required>
                  <Input type="text" placeholder="Arjun" />
                </Field>
                <Field label="Middle Name">
                  <Input type="text" placeholder="Optional" />
                </Field>
                <Field label="Last Name" required>
                  <Input type="text" placeholder="Sharma" />
                </Field>
                <Field
                  label="Email ID"
                  required
                  hint="Booking confirmation will be sent here."
                >
                  <Input
                    type="email"
                    placeholder="arjun@email.com"
                    value={primaryEmail}
                    onChange={(e) => setPrimaryEmail(e.target.value)}
                  />
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Address" required>
                    <Input type="text" placeholder="House / Street / Colony" />
                  </Field>
                </div>
                <Field label="PIN Code" required>
                  <Input type="text" placeholder="400001" maxLength={6} />
                </Field>
                <Field
                  label="Contact Number"
                  required
                  hint="WhatsApp updates will be sent here."
                >
                  <Input
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={primaryPhone}
                    onChange={(e) => setPrimaryPhone(e.target.value)}
                  />
                </Field>
                <Field label="Date of Birth" required>
                  <Input type="date" />
                </Field>
                <Field label="Gender" required>
                  <Select>
                    <option value="">Select gender</option>
                    <option>Male</option>
                    <option>Female</option>
                    <option>Non-binary</option>
                    <option>Prefer not to say</option>
                  </Select>
                </Field>
                <div className="sm:col-span-2">
                  <AadhaarUpload
                    label="Upload Aadhaar Card"
                    name="primary-aadhaar"
                  />
                </div>
              </FormSection>

              {/* Confirmation notice */}
              {(primaryEmail || primaryPhone) && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35 }}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "10px",
                    background: "rgba(120,18,22,0.04)",
                    border: "1px solid rgba(120,18,22,0.12)",
                    borderRadius: "8px",
                    padding: "12px 14px",
                    marginTop: "18px",
                  }}
                >
                  <AlertCircle
                    size={15}
                    color="#781216"
                    strokeWidth={1.5}
                    style={{ flexShrink: 0, marginTop: "1px" }}
                  />
                  <p
                    style={{
                      color: "rgba(30,26,20,0.7)",
                      fontSize: "0.74rem",
                      fontWeight: 300,
                      lineHeight: 1.65,
                      margin: 0,
                    }}
                  >
                    Your booking confirmation, trip documents and payment
                    receipt will be sent to{" "}
                    {primaryEmail && (
                      <strong
                        style={{
                          color: "#781216",
                          fontWeight: 500,
                        }}
                      >
                        {primaryEmail}
                      </strong>
                    )}
                    {primaryEmail && primaryPhone && " and "}
                    {primaryPhone && (
                      <strong
                        style={{
                          color: "#781216",
                          fontWeight: 500,
                        }}
                      >
                        {primaryPhone}
                      </strong>
                    )}
                    . Please ensure you have active access to both before
                    submitting.
                  </p>
                </motion.div>
              )}

              {/* Solo toggle */}
              <div
                style={{
                  marginTop: "22px",
                  paddingTop: "20px",
                  borderTop: "1px solid rgba(30,26,20,0.06)",
                }}
              >
                <p
                  style={{
                    color: "#1e1a14",
                    fontSize: "0.82rem",
                    fontWeight: 500,
                    marginBottom: "12px",
                  }}
                >
                  Travelling Solo?{" "}
                  <span
                    style={{
                      color: "rgba(30,26,20,0.4)",
                      fontWeight: 300,
                    }}
                  >
                    — helps us plan the group better
                  </span>
                </p>
                <div style={{ display: "flex", gap: "10px" }}>
                  {(["yes", "no"] as const).map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => {
                        setSolo(v);
                        if (v === "yes") setTravelers([]);
                      }}
                      style={{
                        padding: "9px 24px",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontFamily: "'Poppins', sans-serif",
                        fontSize: "0.78rem",
                        fontWeight: solo === v ? 600 : 400,
                        background: solo === v ? "#781216" : "transparent",
                        border: `1.5px solid ${solo === v ? "#781216" : "rgba(30,26,20,0.14)"}`,
                        color: solo === v ? "#fff" : "rgba(30,26,20,0.6)",
                        transition: "all 0.22s ease",
                        textTransform: "capitalize",
                      }}
                    >
                      {v === "yes" ? "Yes, just me" : "No, with others"}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* ── 2. Additional Travelers ── */}
            <AnimatePresence>
              {solo === "no" && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.35 }}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "16px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: "10px",
                    }}
                  >
                    <div>
                      <h3
                        style={{
                          color: "#1e1a14",
                          fontSize: "1rem",
                          fontWeight: 500,
                          letterSpacing: "-0.015em",
                          margin: "0 0 4px",
                        }}
                      >
                        Your Travel Group
                      </h3>
                      <p
                        style={{
                          color: "rgba(30,26,20,0.45)",
                          fontSize: "0.74rem",
                          fontWeight: 300,
                          margin: 0,
                        }}
                      >
                        Add details for each person travelling with you.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={addTraveler}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        background: "rgba(120,18,22,0.06)",
                        border: "1.5px solid rgba(120,18,22,0.2)",
                        borderRadius: "6px",
                        padding: "9px 18px",
                        color: "#781216",
                        fontFamily: "'Poppins', sans-serif",
                        fontSize: "0.74rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        letterSpacing: "0.04em",
                        transition: "background 0.2s, border-color 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        (
                          e.currentTarget as HTMLButtonElement
                        ).style.background = "rgba(120,18,22,0.1)";
                        (
                          e.currentTarget as HTMLButtonElement
                        ).style.borderColor = "#781216";
                      }}
                      onMouseLeave={(e) => {
                        (
                          e.currentTarget as HTMLButtonElement
                        ).style.background = "rgba(120,18,22,0.06)";
                        (
                          e.currentTarget as HTMLButtonElement
                        ).style.borderColor = "rgba(120,18,22,0.2)";
                      }}
                    >
                      <Plus size={14} /> Add Traveler
                    </button>
                  </div>

                  {travelers.length === 0 && (
                    <div
                      style={{
                        border: "1.5px dashed rgba(30,26,20,0.14)",
                        borderRadius: "10px",
                        padding: "28px",
                        textAlign: "center",
                      }}
                    >
                      <p
                        style={{
                          color: "rgba(30,26,20,0.38)",
                          fontSize: "0.8rem",
                          fontWeight: 300,
                          margin: 0,
                          fontFamily: "'Poppins', sans-serif",
                        }}
                      >
                        Click "Add Traveler" to add group members.
                      </p>
                    </div>
                  )}

                  <AnimatePresence>
                    {travelers.map((id, i) => (
                      <TravelerForm
                        key={id}
                        index={i}
                        onRemove={() => removeTraveler(id)}
                      />
                    ))}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── 3. Booking Amount ── */}
            <div
              style={{
                background: "#ffffff",
                borderRadius: "14px",
                border: "1px solid rgba(30,26,20,0.07)",
                padding: "clamp(22px,3vw,32px)",
                boxShadow: "0 2px 10px rgba(30,26,20,0.04)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  marginBottom: "20px",
                }}
              >
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    background: "rgba(120,18,22,0.07)",
                    border: "1px solid rgba(120,18,22,0.15)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <CreditCard size={14} color="#781216" strokeWidth={1.5} />
                </div>
                <div>
                  <h3
                    style={{
                      color: "#1e1a14",
                      fontSize: "1rem",
                      fontWeight: 500,
                      letterSpacing: "-0.015em",
                      margin: 0,
                    }}
                  >
                    Booking Amount
                  </h3>
                  <div
                    style={{
                      width: "24px",
                      height: "1.5px",
                      background: "#781216",
                      marginTop: "4px",
                      borderRadius: "1px",
                    }}
                  />
                </div>
              </div>

              {/* Price breakdown */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                  marginBottom: "20px",
                }}
              >
                {[
                  {
                    label: "Trip Price (per person)",
                    val: tripPrice,
                  },
                  {
                    label: `Travelers`,
                    val: `× ${1 + travelers.length}`,
                  },
                ].map(({ label, val }) => (
                  <div
                    key={label}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span
                      style={{
                        color: "rgba(30,26,20,0.5)",
                        fontSize: "0.78rem",
                        fontWeight: 300,
                      }}
                    >
                      {label}
                    </span>
                    <span
                      style={{
                        color: "#1e1a14",
                        fontSize: "0.82rem",
                        fontWeight: 500,
                      }}
                    >
                      {val}
                    </span>
                  </div>
                ))}
                <div
                  style={{
                    height: "1px",
                    background: "rgba(30,26,20,0.07)",
                    margin: "4px 0",
                  }}
                />
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span
                    style={{
                      color: "#1e1a14",
                      fontSize: "0.82rem",
                      fontWeight: 600,
                    }}
                  >
                    {isTokenZero
                      ? "Total Payment Due Now"
                      : "Token / Partial Payment Due Now"}
                  </span>
                  <span
                    style={{
                      color: "#781216",
                      fontSize: "1.05rem",
                      fontWeight: 700,
                      letterSpacing: "-0.02em",
                    }}
                  >
                    {isTokenZero
                      ? formatPrice(totalAmountDue)
                      : formatPrice(tokenAmountDue)}
                  </span>
                </div>
              </div>

              {/* Partial payment info */}
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "9px",
                  background: isTokenZero
                    ? "rgba(120,18,22,0.06)"
                    : "rgba(184,148,58,0.06)",
                  border: isTokenZero
                    ? "1px solid rgba(120,18,22,0.18)"
                    : "1px solid rgba(184,148,58,0.18)",
                  borderRadius: "8px",
                  padding: "12px 14px",
                  marginBottom: "20px",
                }}
              >
                <Info
                  size={14}
                  color={isTokenZero ? "#781216" : "#b8943a"}
                  strokeWidth={1.5}
                  style={{ flexShrink: 0, marginTop: "1px" }}
                />
                <p
                  style={{
                    color: "rgba(30,26,20,0.65)",
                    fontSize: "0.72rem",
                    fontWeight: 300,
                    lineHeight: 1.65,
                    margin: 0,
                  }}
                >
                  <span
                    style={{
                      color: isTokenZero ? "#781216" : "#b8943a",
                      fontWeight: 600,
                    }}
                  >
                    {isTokenZero
                      ? "Full payment required."
                      : "Partial payment accepted."}
                  </span>{" "}
                  {isTokenZero
                    ? `Pay ${formatPrice(totalAmountDue)} now to confirm your booking.`
                    : `Pay ${formatPrice(tokenAmountDue)} now to confirm your spot. The remaining balance is due 14 days before departure. Full payment options are available on the next step.`}
                </p>
              </div>

              {/* Payment method placeholder */}
              <div
                style={{
                  border: "1.5px dashed rgba(30,26,20,0.14)",
                  borderRadius: "8px",
                  padding: "20px",
                  textAlign: "center",
                }}
              >
                <CreditCard
                  size={22}
                  color="rgba(30,26,20,0.22)"
                  strokeWidth={1.2}
                  style={{ margin: "0 auto 8px" }}
                />
                <p
                  style={{
                    color: "rgba(30,26,20,0.35)",
                    fontSize: "0.76rem",
                    fontWeight: 300,
                    margin: 0,
                  }}
                >
                  Payment gateway — UPI / Card / Net Banking will appear here at
                  checkout.
                </p>
              </div>
            </div>

            {/* ── Submit ── */}
            <div>
              <button
                type="submit"
                style={{
                  width: "100%",
                  background: "#781216",
                  color: "#fff",
                  border: "none",
                  borderRadius: "10px",
                  padding: "16px",
                  fontFamily: "'Poppins', sans-serif",
                  fontSize: "0.88rem",
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                  transition: "background 0.25s ease",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "#9a1a1f")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "#781216")
                }
              >
                Confirm Booking
              </button>
              <p
                style={{
                  color: "rgba(30,26,20,0.35)",
                  fontSize: "0.68rem",
                  textAlign: "center",
                  marginTop: "10px",
                  fontWeight: 300,
                  lineHeight: 1.6,
                }}
              >
                By submitting, you agree to Hangover Trails' booking terms and
                cancellation policy.
              </p>
            </div>
          </form>

          {/* ══ RIGHT: Trip summary (sticky) ══ */}
          <div className="hidden lg:block" style={{ alignSelf: "stretch" }}>
            <div
              style={{
                position: "sticky",
                top: "100px",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              {/* Trip card */}
              <div
                style={{
                  background: "#ffffff",
                  border: "1px solid rgba(30,26,20,0.08)",
                  borderRadius: "14px",
                  overflow: "hidden",
                  boxShadow: "0 4px 20px rgba(30,26,20,0.06)",
                }}
              >
                {/* Image */}
                <div
                  style={{
                    aspectRatio: "16/10",
                    overflow: "hidden",
                  }}
                >
                  <img
                    src={tripImage}
                    alt={tripName}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                </div>

                <div style={{ padding: "20px 22px 22px" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      marginBottom: "6px",
                    }}
                  >
                    <MapPin size={10} color="#781216" />
                    <span
                      style={{
                        color: "#781216",
                        fontSize: "0.6rem",
                        fontWeight: 500,
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                      }}
                    >
                      {tripDestination}
                    </span>
                  </div>
                  <h3
                    style={{
                      color: "#1e1a14",
                      fontSize: "1.02rem",
                      fontWeight: 500,
                      letterSpacing: "-0.015em",
                      lineHeight: 1.3,
                      margin: "0 0 14px",
                    }}
                  >
                    {tripName}
                  </h3>

                  {[
                    { label: "Duration", val: tripDuration },

                    {
                      label: "Difficulty",
                      val: tripDifficulty,
                    },
                    {
                      label: "Best Time",
                      val: trip.bestTimeToVisit || "Not Available",
                    },
                  ].map(({ label, val }) => (
                    <div
                      key={label}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "8px 0",
                        borderBottom: "1px solid rgba(30,26,20,0.05)",
                      }}
                    >
                      <span
                        style={{
                          color: "rgba(30,26,20,0.42)",
                          fontSize: "0.72rem",
                        }}
                      >
                        {label}
                      </span>
                      <span
                        style={{
                          color: "#1e1a14",
                          fontSize: "0.74rem",
                          fontWeight: 500,
                        }}
                      >
                        {val}
                      </span>
                    </div>
                  ))}

                  <div
                    style={{
                      marginTop: "16px",
                      paddingTop: "14px",
                      borderTop: "1px solid rgba(30,26,20,0.06)",
                    }}
                  >
                    <p
                      style={{
                        color: "rgba(30,26,20,0.38)",
                        fontSize: "0.58rem",
                        letterSpacing: "0.14em",
                        textTransform: "uppercase",
                        margin: "0 0 3px",
                      }}
                    >
                      Price per person
                    </p>
                    <p
                      style={{
                        color: "#781216",
                        fontSize: "1.4rem",
                        fontWeight: 600,
                        letterSpacing: "-0.03em",
                        margin: 0,
                      }}
                    >
                      {tripPrice}
                    </p>
                  </div>
                </div>
              </div>

              {/* Need help card */}
              <div
                style={{
                  background: "#ffffff",
                  border: "1px solid rgba(30,26,20,0.07)",
                  borderRadius: "12px",
                  padding: "16px 18px",
                }}
              >
                <p
                  style={{
                    color: "#1e1a14",
                    fontSize: "0.78rem",
                    fontWeight: 500,
                    margin: "0 0 4px",
                  }}
                >
                  Need help booking?
                </p>
                <p
                  style={{
                    color: "rgba(30,26,20,0.48)",
                    fontSize: "0.7rem",
                    fontWeight: 300,
                    lineHeight: 1.65,
                    margin: "0 0 12px",
                  }}
                >
                  Our team is available on WhatsApp to walk you through the
                  process.
                </p>
                <a
                  href={`https://wa.me/917374898467?text=Hi, I need help booking the ${tripName} trip.`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "7px",
                    background: "#25D366",
                    color: "#fff",
                    borderRadius: "6px",
                    padding: "10px",
                    textDecoration: "none",
                    fontSize: "0.72rem",
                    fontWeight: 500,
                    fontFamily: "'Poppins', sans-serif",
                    transition: "background 0.2s",
                  }}
                  onMouseEnter={(e) =>
                    ((e.currentTarget as HTMLAnchorElement).style.background =
                      "#1db954")
                  }
                  onMouseLeave={(e) =>
                    ((e.currentTarget as HTMLAnchorElement).style.background =
                      "#25D366")
                  }
                >
                  Chat on WhatsApp
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}

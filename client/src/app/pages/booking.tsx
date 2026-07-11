import { useState, useEffect } from "react";
import { useParams, Link, useSearchParams, useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft,
  Upload,
  Plus,
  Trash2,
  Info,
  User,
  MapPin,
  CreditCard,
  CheckCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";
import {
  fetchTripBySlug,
  formatPrice,
  formatDuration,
  type ApiTrip,
} from "../../lib/tripApi";
import { fetchFestivalBySlug } from "../../lib/festivalApi";
import { apiClient, API_URL } from "../../lib/axios";
import { useAuth } from "../../contexts/AuthContext";
import { SiteFooter } from "../components/site-footer";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { getMyProfile } from "../../lib/profileApi";
import { mediaImageUrl } from "../../lib/media";

// Razorpay is loaded as a static <script> in index.html
declare const Razorpay: any;

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


function FilePickerField({
  label,
  required,
  hint,
  file,
  onChange,
  existingUrl,
  existingMimeType,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  file: File | null;
  onChange: (f: File | null) => void;
  existingUrl?: string | null;
  existingMimeType?: string | null;
}) {
  const previewUrl = file ? URL.createObjectURL(file) : existingUrl;
  const isPdf = file ? file.type === "application/pdf" : existingMimeType === "application/pdf";

  return (
    <Field label={label} required={required} hint={hint}>
      {previewUrl && !isPdf && (
        <div style={{ marginBottom: "12px" }}>
          <img
            src={previewUrl}
            alt="Govt ID Preview"
            style={{
              width: "100%",
              maxHeight: "160px",
              objectFit: "cover",
              borderRadius: "8px",
              border: "1px solid rgba(30,26,20,0.1)",
              background: "#f0f0f0"
            }}
          />
        </div>
      )}
      {previewUrl && isPdf && (
        <a href={previewUrl} target="_blank" rel="noreferrer" style={{ color: "#781216", fontSize: "0.78rem" }}>
          View uploaded PDF
        </a>
      )}
      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          padding: "11px 14px",
          borderRadius: "8px",
          border: `1.5px dashed ${file || existingUrl ? "#781216" : "rgba(30,26,20,0.2)"}`,
          background: file || existingUrl ? "rgba(120,18,22,0.03)" : "#faf8f4",
          cursor: "pointer",
          transition: "border-color 0.2s, background 0.2s",
          fontFamily: "'Poppins', sans-serif",
        }}
      >
        <Upload
          size={15}
          color={file || existingUrl ? "#781216" : "rgba(30,26,20,0.38)"}
          strokeWidth={1.5}
        />
        <span
          style={{
            color: file || existingUrl ? "#781216" : "rgba(30,26,20,0.5)",
            fontSize: "0.78rem",
            fontWeight: 300,
          }}
        >
          {file ? file.name : existingUrl ? "Replace file…" : "Choose file…"}
        </span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif,application/pdf"
          required={required && !existingUrl && !file}
          style={{ display: "none" }}
          onChange={(e) => onChange(e.target.files?.[0] ?? null)}
        />
      </label>
    </Field>
  );
}

function UncontrolledFilePicker({
  label,
  name,
  required,
  hint,
}: {
  label: string;
  name: string;
  required?: boolean;
  hint?: string;
}) {
  const [file, setFile] = useState<File | null>(null);
  return (
    <Field label={label} required={required} hint={hint}>
      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          padding: "11px 14px",
          borderRadius: "8px",
          border: `1.5px dashed ${file ? "#781216" : "rgba(30,26,20,0.2)"}`,
          background: file ? "rgba(120,18,22,0.03)" : "#faf8f4",
          cursor: "pointer",
          transition: "border-color 0.2s, background 0.2s",
          fontFamily: "'Poppins', sans-serif",
        }}
      >
        <Upload
          size={15}
          color={file ? "#781216" : "rgba(30,26,20,0.38)"}
          strokeWidth={1.5}
        />
        <span
          style={{
            color: file ? "#781216" : "rgba(30,26,20,0.5)",
            fontSize: "0.78rem",
            fontWeight: 300,
          }}
        >
          {file ? file.name : "Choose file…"}
        </span>
        <input
          type="file"
          name={name}
          accept="image/jpeg,image/png,image/webp,image/avif,application/pdf"
          required={required && !file}
          style={{ display: "none" }}
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
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
          <Input name={`traveler-${index}-firstName`} type="text" placeholder="First name" required />
        </Field>
        <Field label="Last Name" required>
          <Input name={`traveler-${index}-lastName`} type="text" placeholder="Last name" required />
        </Field>
        <Field label="Email ID" required>
          <Input name={`traveler-${index}-email`} type="email" placeholder="email@example.com" required />
        </Field>
        <Field label="Contact Number" required>
          <Input name={`traveler-${index}-phone`} type="tel" placeholder="+91 98765 43210" required />
        </Field>
        <Field label="Date of Birth" required>
          <Input name={`traveler-${index}-dob`} type="date" required />
        </Field>
        <Field label="Gender" required>
          <Select name={`traveler-${index}-gender`} required>
            <option value="">Select gender</option>
            <option>Male</option>
            <option>Female</option>
            <option>Non-binary</option>
            <option>Prefer not to say</option>
          </Select>
        </Field>
        <div className="sm:col-span-2">
          <UncontrolledFilePicker
            label="Upload Aadhaar Card"
            name={`traveler-${index}-aadhaar`}
            hint="Clear photo or scan — max 8 MB"
            required={true}
          />
        </div>
      </div>
    </motion.div>
  );
}

// ── Page ──────────────────────────────────────────────────────────
export default function BookingPage() {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const resumeBookingId = searchParams.get("resume"); // set when coming from "Complete Payment" CTA
  const isFestival = searchParams.get("type") === "festival";
  const urlSlotId = searchParams.get("slotId");
  const { user, isLoading: authLoading } = useAuth();

  const [trip, setTrip] = useState<any>(null); // polymorphic
  const [loading, setLoading] = useState(true);
  const [selectedSlotId, setSelectedSlotId] = useState<string>(urlSlotId || "");

  // Form state
  const [solo, setSolo] = useState<"yes" | "no" | null>("yes");
  const [travelers, setTravelers] = useState<number[]>([]);
  const [primaryEmail, setPrimaryEmail] = useState("");
  const [primaryPhone, setPrimaryPhone] = useState("");
  const [specialRequests, setSpecialRequests] = useState("");

  // Primary traveler controlled fields (uncontrolled inputs fail after await in submit handler)
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [address, setAddress] = useState("");
  const [pinCode, setPinCode] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState("");

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: getMyProfile,
    enabled: !!user,
  });

  // Pre-fill from profile once loaded
  useEffect(() => {
    if (user && !primaryEmail) setPrimaryEmail(user.email);
    if (profile?.phone && !primaryPhone) setPrimaryPhone(profile.phone);
    if (profile?.fullName) {
      const parts = profile.fullName.trim().split(" ");
      if (!firstName) setFirstName(parts[0] || "");
      if (!lastName)  setLastName(parts.slice(1).join(" ") || "");
    }
    if (profile?.addressLine1 && !address) {
      let addr = profile.addressLine1;
      // Auto-clean the corrupted data where pincode was saved into addressLine1
      if (profile.postalCode && addr.endsWith(", " + profile.postalCode)) {
        addr = addr.slice(0, -(profile.postalCode.length + 2));
      }
      setAddress(addr);
    }
    if (profile?.postalCode && !pinCode) setPinCode(profile.postalCode);
    if (profile?.dateOfBirth && !dateOfBirth) setDateOfBirth(new Date(profile.dateOfBirth).toISOString().split("T")[0]);
    if (profile?.gender && !gender) setGender(profile.gender);
  }, [user, profile]);

  // Govt ID upload state
  const [govtIdImage, setGovtIdImage] = useState<File | null>(null);

  const [hasBooked, setHasBooked] = useState(false);
  const [reservedBooking, setReservedBooking] = useState<any>(null);
  const [pendingBooking, setPendingBooking] = useState<any>(null);

  // Payment choice
  const [paymentChoice, setPaymentChoice] = useState<"FULL" | "TOKEN">("FULL");
  const [selectedPackageId, setSelectedPackageId] = useState<string | null | undefined>(undefined);

  // Booking flow state
  const [bookingStep, setBookingStep] = useState<
    "form" | "paying" | "verifying" | "success" | "failed"
  >("form");
  const [submitting, setSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [pendingVerify, setPendingVerify] = useState<{
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
    bookingReference: string;
    amountPaid: number;
    paymentType: string;
  } | null>(null);
  const [successData, setSuccessData] = useState<{
    bookingReference: string;
    amountPaid: number;
    paymentType: string;
  } | null>(null);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    const fetcher = isFestival ? fetchFestivalBySlug : fetchTripBySlug;
    fetcher(slug)
      .then((data) => setTrip(data))
      .catch(() => setTrip(null))
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (user && trip) {
      apiClient
        .get(`/bookings/me?limit=100`)
        .then((res) => {
          const bookings = res.data?.data || [];
          const belongsToCurrentItem = (booking: any) => {
            const itemId = isFestival
              ? booking.festivalId || booking.festival?.id || booking.slot?.festivalId
              : booking.tripId || booking.trip?.id || booking.slot?.tripId;
            return itemId === trip.id;
          };
          const confirmed = bookings.find(
            (b: any) => belongsToCurrentItem(b) && b.status === "CONFIRMED",
          );
          const reserved = bookings.find(
            (b: any) => belongsToCurrentItem(b) && b.status === "RESERVED",
          );
          const pending = bookings.find(
            (b: any) => belongsToCurrentItem(b) && b.status === "PENDING",
          );
          setHasBooked(!!confirmed);
          setReservedBooking(reserved || null);
          setPendingBooking(pending || null);
        })
        .catch(console.error);
    }
  }, [user, trip]);

  useEffect(() => {
    if (selectedPackageId === undefined && trip) {
      if (trip.packages?.length > 0) {
        setSelectedPackageId(trip.packages[0].id);
      } else {
        setSelectedPackageId(null);
      }
    }
  }, [trip, selectedPackageId]);

  useEffect(() => {
    if (trip?.slots?.length > 0 && !selectedSlotId) {
      setSelectedSlotId(trip.slots[0].id);
    }
  }, [trip, selectedSlotId]);

  // Prevent scrolling when forced login is active
  useEffect(() => {
    if (!authLoading && !user) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [user, authLoading]);

  const selectedSlot = trip?.slots?.find((s: any) => s.id === selectedSlotId);
  const spotsLeft = selectedSlot ? selectedSlot.capacity - (selectedSlot.filledSpots || 0) : 0;
  const canAddMoreTravelers = 1 + travelers.length < spotsLeft;

  const addTraveler = () => {
    if (canAddMoreTravelers) {
      setTravelers((t) => [...t, Date.now()]);
    }
  };
  const removeTraveler = (id: number) =>
    setTravelers((t) => t.filter((x) => x !== id));

  // ── Submit handler ────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Extract additional traveler data synchronously before any await
    const form = e.currentTarget as HTMLFormElement;
    const formData = new FormData(form);
    const extractedTravelers = travelers.map((_, index) => {
      const tFirstName = formData.get(`traveler-${index}-firstName`) as string;
      const tLastName = formData.get(`traveler-${index}-lastName`) as string;
      return {
        firstName: tFirstName,
        lastName: tLastName,
        email: formData.get(`traveler-${index}-email`) as string,
        phone: formData.get(`traveler-${index}-phone`) as string,
        dob: formData.get(`traveler-${index}-dob`) as string,
        gender: formData.get(`traveler-${index}-gender`) as string,
        aadhaarFile: formData.get(`traveler-${index}-aadhaar`) as File | null,
      };
    });

    setBookingError(null);

    if (!selectedSlotId) {
      const msg = "Please select a slot before proceeding.";
      setBookingError(msg);
      toast.error(msg);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // 1. Auth guard — redirect to Google login if not logged in
    if (!user) {
      localStorage.setItem("booking_redirect_intent", `/book/${slug}`);
      window.location.href = `${API_URL}/auth/google`;
      return;
    }

    // Validate Govt ID uploaded
    if (!govtIdImage && !profile?.govtIdImageUrl) {
      const msg =
        "Please upload a clear picture of your Aadhaar / Govt ID before proceeding.";
      setBookingError(msg);
      toast.error(msg);
      const govtSection = document.getElementById("govt-id-section");
      if (govtSection) {
        govtSection.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    }

    setSubmitting(true);
    setBookingStep("paying");

    try {
      // 2. Upload Govt ID & Update Profile (skip if no new image provided)
      if (govtIdImage) {
        const idForm = new FormData();
        idForm.append("govtIdType", "AADHAAR");
        idForm.append("image", govtIdImage);
        await apiClient.post("/users/me/govt-id", idForm, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      // Read profile data from controlled state — NOT from e.currentTarget (null after await)
      const profileData = {
        fullName: `${firstName} ${lastName}`.trim(),
        phone: primaryPhone,
        addressLine1: address || undefined,
        postalCode: pinCode || undefined,
        gender: gender || undefined,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth).toISOString() : undefined,
      };
      await apiClient.put("/users/me/profile", profileData);

      // Upload additional travelers govt IDs
      const additionalTravelers = await Promise.all(extractedTravelers.map(async (t) => {
        let aadhaarAssetId = null;
        if (t.aadhaarFile && t.aadhaarFile.size > 0) {
          const idForm = new FormData();
          idForm.append("image", t.aadhaarFile);
          const uploadRes = await apiClient.post("/bookings/traveler/govt-id", idForm);
          aadhaarAssetId = uploadRes.data.assetId;
        }
        return {
          fullName: `${t.firstName || ""} ${t.lastName || ""}`.trim(),
          email: t.email,
          phone: t.phone,
          dateOfBirth: t.dob,
          gender: t.gender,
          aadhaarAssetId,
        };
      }));

      // 3. Create the booking
      const numberOfTravelers = 1 + travelers.length;
      
      const payload: any = {
        numberOfTravelers,
        specialRequests: specialRequests || undefined,
        initialPaymentType: isTokenZero ? "FULL" : paymentChoice,
        additionalTravelers,
      };
      if (selectedPackageId) {
        payload.packageId = selectedPackageId;
      }
      
      if (selectedSlotId) {
        payload.slotId = selectedSlotId;
      }
      
      const bookingRes = await apiClient.post("/bookings", payload);
      const {
        id: bookingId,
        bookingReference,
        initialPaymentType,
      } = bookingRes.data;

      // 4. Initiate Razorpay payment — TOKEN or FULL based on backend decision
      const paymentType = initialPaymentType; // "TOKEN" or "FULL"
      const initiateRes = await apiClient.post("/payments/initiate", {
        bookingId,
        type: paymentType,
      });
      const { razorpayOrderId, razorpayKeyId, amount, currency } =
        initiateRes.data;

      // 4. Open Razorpay checkout (SDK already loaded in index.html)
      await new Promise<void>((resolve, reject) => {
        const options = {
          key: razorpayKeyId,
          amount,
          currency,
          name: "Hangover Trails",
          description: `${trip!.title} — ${paymentType === "TOKEN" ? "Booking Payment" : "Full Payment"}`,
          order_id: razorpayOrderId,
          prefill: {
            email: primaryEmail,
            contact: primaryPhone,
          },
          theme: {
            color: "#781216",
          },
          modal: {
            ondismiss: async () => {
              reject(new Error("Payment cancelled. You can try again."));
            },
          },
          handler: (response: {
            razorpay_order_id: string;
            razorpay_payment_id: string;
            razorpay_signature: string;
          }) => {
            // Immediately show verifying screen — don't make the user wait on this modal
            setBookingStep("verifying");
            setPendingVerify({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
              bookingReference,
              amountPaid: amount / 100,
              paymentType,
            });
            resolve();
          },
        };

        const rzp = new Razorpay(options);

        // Listen for failed attempts within the modal (user can still retry after this)
        rzp.on("payment.failed", async function (response: any) {
          try {
            await apiClient.post("/payments/failed", {
              razorpayOrderId: response.error.metadata.order_id,
              razorpayPaymentId: response.error.metadata.payment_id,
              reason: response.error.description,
              code: response.error.code,
            });
          } catch (e) {
            // Ignore if the backend call fails, the webhook might catch it anyway
          }
          toast.error(`Payment failed: ${response.error.description}`);
        });

        rzp.open();
      });
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Something went wrong. Please try again.";
      setBookingError(msg);
      setBookingStep("form");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Run verify in background once pendingVerify is set ──────────
  useEffect(() => {
    if (!pendingVerify || bookingStep !== "verifying") return;

    apiClient
      .post("/payments/verify", {
        razorpayOrderId: pendingVerify.razorpayOrderId,
        razorpayPaymentId: pendingVerify.razorpayPaymentId,
        razorpaySignature: pendingVerify.razorpaySignature,
      })
      .then(() => {
        setSuccessData({
          bookingReference: pendingVerify.bookingReference,
          amountPaid: pendingVerify.amountPaid,
          paymentType: pendingVerify.paymentType,
        });
        setBookingStep("success");
      })
      .catch((err: any) => {
        setBookingError(
          err?.response?.data?.message ||
            "Payment verification failed. Please contact support.",
        );
        setBookingStep("failed");
      });
  }, [pendingVerify, bookingStep]);

  if (loading || authLoading) {
    return (
      <div
        style={{
          background: "#f5f0e6",
          minHeight: "100vh",
          fontFamily: "'Poppins', sans-serif",
        }}
      >
        {/* Banner Skeleton */}
        <div
          style={{
            background: "#1e1a14",
            paddingTop: "100px",
            paddingBottom: "clamp(2rem,4vw,3rem)",
            paddingLeft: "clamp(1.5rem,5vw,6rem)",
            paddingRight: "clamp(1.5rem,5vw,6rem)",
          }}
        >
          <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
            <motion.div
              className="h-4 w-24 rounded mb-6"
              style={{ background: "rgba(255,255,255,0.06)" }}
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
            <motion.div
              className="h-10 w-64 md:w-96 rounded"
              style={{ background: "rgba(255,255,255,0.08)" }}
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0.2,
              }}
            />
          </div>
        </div>

        {/* Content Skeleton */}
        <div
          style={{
            maxWidth: "1280px",
            margin: "0 auto",
            padding: "clamp(2rem,4vw,4rem) clamp(1.5rem,5vw,6rem)",
          }}
        >
          <div className="flex flex-col lg:flex-row gap-12">
            {/* Left Column Form */}
            <div className="flex-1 space-y-10">
              <motion.div
                className="h-[300px] rounded-xl"
                style={{
                  background: "rgba(30,26,20,0.03)",
                  border: "1px solid rgba(30,26,20,0.05)",
                }}
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
              <motion.div
                className="h-[200px] rounded-xl"
                style={{
                  background: "rgba(30,26,20,0.03)",
                  border: "1px solid rgba(30,26,20,0.05)",
                }}
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 0.1,
                }}
              />
              <motion.div
                className="h-[150px] rounded-xl"
                style={{
                  background: "rgba(30,26,20,0.03)",
                  border: "1px solid rgba(30,26,20,0.05)",
                }}
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 0.2,
                }}
              />
            </div>

            {/* Right Column Summary */}
            <div className="w-full lg:w-[400px] shrink-0">
              <motion.div
                className="h-[500px] rounded-2xl"
                style={{
                  background: "rgba(30,26,20,0.04)",
                  border: "1px solid rgba(30,26,20,0.06)",
                }}
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 0.3,
                }}
              />
            </div>
          </div>
        </div>
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
          <button
            type="button"
            onClick={() => navigate(-1)}
            style={{
              color: "#781216",
              textDecoration: "none",
              fontSize: "0.82rem",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0
            }}
          >
            ← Go Back
          </button>
        </div>
      </div>
    );
  }

  // Map backend fields to display values
  const tripName = trip.title;
  const tripImage =
    trip.bannerImages?.[0] || trip.highlights?.[0]?.imageUrl || "";
  const tripDuration = formatDuration(trip.duration);
  const tripDestination = trip.location;

  const activePackage = trip.packages?.find((p: any) => p.id === selectedPackageId);
  const basePrice = activePackage ? Number(activePackage.price) : Number(trip.price || 0);
  const baseToken = activePackage ? Number(activePackage.tokenAmount) : Number(trip.tokenAmount || 0);

  const tripPrice = formatPrice(basePrice);

  const numTravelers = 1 + travelers.length;
  const baseTotalAmount = basePrice * numTravelers;
  const totalGst = baseTotalAmount * 0.05;
  const totalAmountDue = baseTotalAmount + totalGst;

  const baseTokenTotal = baseToken * numTravelers;
  const tokenGst = baseTokenTotal * 0.05;
  const tokenAmountDue = baseTokenTotal + tokenGst;
  const isTokenZero = tokenAmountDue === 0;

  // ── Verifying screen (shown immediately after Razorpay handler fires) ─
  if (bookingStep === "verifying") {
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
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          style={{
            textAlign: "center",
            maxWidth: "400px",
            padding: "3rem 2rem",
          }}
        >
          <div
            style={{
              position: "relative",
              width: "60px",
              height: "60px",
              margin: "0 auto 24px",
            }}
          >
            <Loader2
              size={60}
              color="#781216"
              strokeWidth={1}
              style={{ animation: "spin 1s linear infinite" }}
            />
          </div>
          <h2
            style={{
              color: "#1e1a14",
              fontSize: "1.4rem",
              fontWeight: 300,
              letterSpacing: "-0.02em",
              margin: "0 0 10px",
            }}
          >
            Confirming your booking…
          </h2>
          <p
            style={{
              color: "rgba(30,26,20,0.5)",
              fontSize: "0.82rem",
              fontWeight: 300,
              lineHeight: 1.7,
              margin: 0,
            }}
          >
            Your payment was received. We're confirming your booking — this
            takes just a moment.
          </p>
        </motion.div>
      </div>
    );
  }

  // ── Failed screen (verify failed after payment) ─────────────────
  if (bookingStep === "failed") {
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
          <AlertCircle
            size={52}
            color="#c0392b"
            strokeWidth={1.2}
            style={{ margin: "0 auto 20px" }}
          />
          <h2
            style={{
              color: "#1e1a14",
              fontSize: "1.5rem",
              fontWeight: 300,
              letterSpacing: "-0.02em",
              margin: "0 0 12px",
            }}
          >
            Verification Issue
          </h2>
          <p
            style={{
              color: "rgba(30,26,20,0.6)",
              fontSize: "0.85rem",
              fontWeight: 300,
              lineHeight: 1.8,
              margin: "0 0 8px",
            }}
          >
            {bookingError}
          </p>
          <p
            style={{
              color: "rgba(30,26,20,0.45)",
              fontSize: "0.75rem",
              fontWeight: 300,
              lineHeight: 1.7,
              margin: "0 0 28px",
            }}
          >
            Your payment may have been captured. Please contact us on WhatsApp
            with your payment details and we'll resolve it immediately.
          </p>
          <a
            href="https://wa.me/917374898467?text=Hi, I need help with a payment verification issue."
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "7px",
              background: "#25D366",
              color: "#fff",
              borderRadius: "8px",
              padding: "12px 24px",
              textDecoration: "none",
              fontSize: "0.8rem",
              fontWeight: 600,
              fontFamily: "'Poppins', sans-serif",
            }}
          >
            Contact Support on WhatsApp
          </a>
        </motion.div>
      </div>
    );
  }

  // ── Success screen ─────────────────────────────────────────────
  if (bookingStep === "success" && successData) {
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
              margin: "0 0 8px",
            }}
          >
            Booking Confirmed!
          </h2>
          <p
            style={{
              color: "#781216",
              fontSize: "1rem",
              fontWeight: 600,
              letterSpacing: "0.06em",
              margin: "0 0 16px",
            }}
          >
            {successData.bookingReference}
          </p>
          <p
            style={{
              color: "rgba(30,26,20,0.55)",
              fontSize: "0.88rem",
              fontWeight: 300,
              lineHeight: 1.8,
              margin: "0 0 8px",
            }}
          >
            {successData.paymentType === "FULL"
              ? "Full payment received."
              : "Booking payment received. Your spot is reserved."}{" "}
            A confirmation has been sent to{" "}
            <strong style={{ color: "#781216" }}>
              {primaryEmail || "your email"}
            </strong>
            .
          </p>
          <p
            style={{
              color: "rgba(30,26,20,0.42)",
              fontSize: "0.78rem",
              fontWeight: 300,
              margin: "0 0 28px",
            }}
          >
            Amount paid:{" "}
            <strong style={{ fontWeight: 600 }}>
              ₹{successData.amountPaid.toLocaleString("en-IN")}
            </strong>
          </p>
          <Link
            to={`/profile`}
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
            Go to Profile Dashboard →
          </Link>
        </motion.div>
      </div>
    );
  }

  // ── RESERVED booking: show balance payment screen ──────────────
  // This fires if the user navigated here via "Complete Payment" from trip-detail
  // OR if they somehow landed here while already having a RESERVED booking.
  const activeReservedBooking = reservedBooking || (resumeBookingId ? { id: resumeBookingId } : null);

  if (!hasBooked && activeReservedBooking && !submitting && bookingStep === "form") {
    const booking = reservedBooking; // may be null if only resumeBookingId is set
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
          <div
            style={{
              width: "60px",
              height: "60px",
              borderRadius: "50%",
              background: "rgba(184,148,58,0.1)",
              border: "1px solid rgba(184,148,58,0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 20px",
            }}
          >
            <CreditCard size={26} color="#b8943a" strokeWidth={1.5} />
          </div>
          <h2
            style={{
              color: "#1e1a14",
              fontSize: "1.5rem",
              fontWeight: 300,
              letterSpacing: "-0.02em",
              margin: "0 0 8px",
            }}
          >
            Booking Payment Received
          </h2>
          <p
            style={{
              color: "rgba(30,26,20,0.55)",
              fontSize: "0.88rem",
              fontWeight: 300,
              lineHeight: 1.8,
              margin: "0 0 8px",
            }}
          >
            Your spot is reserved. Complete the balance payment to confirm your booking.
          </p>
          {booking && (
            <p
              style={{
                color: "#b8943a",
                fontSize: "0.95rem",
                fontWeight: 600,
                margin: "0 0 28px",
              }}
            >
              Balance due: ₹{Number(booking.amountDue).toLocaleString("en-IN")}
            </p>
          )}
          {bookingError && (
            <p style={{ color: "#c0392b", fontSize: "0.82rem", marginBottom: "16px" }}>
              {bookingError}
            </p>
          )}
          <button
            disabled={submitting}
            onClick={async () => {
              setSubmitting(true);
              setBookingError(null);
              setBookingStep("paying");
              try {
                const bookingIdToUse = activeReservedBooking.id;
                const initiateRes = await apiClient.post("/payments/balance/initiate", {
                  bookingId: bookingIdToUse,
                });
                const { razorpayOrderId, razorpayKeyId, amount, currency } = initiateRes.data;
                // Fetch bookingReference
                const bookingRef = reservedBooking?.bookingReference || "";

                await new Promise<void>((resolve, reject) => {
                  const options = {
                    key: razorpayKeyId,
                    amount,
                    currency,
                    name: "Hangover Trails",
                    description: `${trip!.title} — Balance Payment`,
                    order_id: razorpayOrderId,
                    prefill: { email: user?.email, contact: primaryPhone },
                    theme: { color: "#b8943a" },
                    modal: {
                      ondismiss: () => {
                        reject(new Error("Payment cancelled. You can try again."));
                      },
                    },
                    handler: (response: any) => {
                      setBookingStep("verifying");
                      setPendingVerify({
                        razorpayOrderId: response.razorpay_order_id,
                        razorpayPaymentId: response.razorpay_payment_id,
                        razorpaySignature: response.razorpay_signature,
                        bookingReference: bookingRef,
                        amountPaid: amount / 100,
                        paymentType: "BALANCE",
                      });
                      resolve();
                    },
                  };
                  const rzp = new Razorpay(options);
                  rzp.on("payment.failed", async (response: any) => {
                    try {
                      await apiClient.post("/payments/failed", {
                        razorpayOrderId: response.error.metadata.order_id,
                        razorpayPaymentId: response.error.metadata.payment_id,
                        reason: response.error.description,
                        code: response.error.code,
                      });
                    } catch (e) {}
                    toast.error(`Payment failed: ${response.error.description}`);
                  });
                  rzp.open();
                });
              } catch (err: any) {
                const msg = err?.response?.data?.message || err?.message || "Something went wrong.";
                setBookingError(msg);
                setBookingStep("form");
              } finally {
                setSubmitting(false);
              }
            }}
            style={{
              background: submitting ? "rgba(184,148,58,0.5)" : "#b8943a",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              padding: "14px 32px",
              fontSize: "0.85rem",
              fontWeight: 600,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              cursor: submitting ? "not-allowed" : "pointer",
              fontFamily: "'Poppins', sans-serif",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "16px",
            }}
          >
            {submitting ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : null}
            {submitting ? "Processing..." : "Pay Balance Now"}
          </button>
          <br />
          <Link
            to={`/profile`}
            style={{
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
            Go to Profile Dashboard →
          </Link>
        </motion.div>
      </div>
    );
  }

  if (pendingBooking) {
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
          <AlertCircle
            size={52}
            color="#b8943a"
            strokeWidth={1.2}
            style={{ margin: "0 auto 20px" }}
          />
          <h2
            style={{
              color: "#1e1a14",
              fontSize: "1.6rem",
              fontWeight: 300,
              letterSpacing: "-0.02em",
              margin: "0 0 8px",
            }}
          >
            Pending Payment
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
            You already have a pending booking for this trip. Please complete the payment from your profile.
          </p>
          <Link
            to={`/profile`}
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
            Go to Profile Dashboard →
          </Link>
        </motion.div>
      </div>
    );
  }

  if (hasBooked) {
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
              margin: "0 0 8px",
            }}
          >
            Already Booked
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
            You have already booked this trip. Your spot is confirmed.
          </p>
          <Link
            to={`/profile`}
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
            Go to Profile Dashboard →
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
            backgroundImage: `url(${mediaImageUrl(tripImage, { width: 1280, height: 480, fit: "fill" })})`,
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
          <button
            type="button"
            onClick={() => navigate(-1)}
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
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: 0
            }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.color = "#f2ede4")
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.color =
                "rgba(242,237,228,0.55)")
            }
          >
            <ArrowLeft size={13} /> Back to {tripName}
          </button>
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
          {/* ══ LEFT: Selection & Form ══ */}
          <div style={{ display: "flex", flexDirection: "column", gap: "2.5rem" }}>
            {/* ══ Slots & Packages Selection ══ */}
            <div style={{
              display: "grid",
              gridTemplateColumns: trip?.packages?.length > 0 ? "1fr 1fr" : "1fr",
              gap: "24px"
            }}>
              {/* Slots Column */}
              <div>
                <h3 style={{
                  color: "#1e1a14",
                  fontSize: "1rem",
                  fontWeight: 400,
                  marginBottom: "12px",
                  fontFamily: "'Playfair Display', serif"
                }}>
                  Select a Slot
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {[...(trip?.slots || [])].sort((a: any, b: any) => {
                    const pA = a.priority || Infinity;
                    const pB = b.priority || Infinity;
                    if (pA !== pB) return pA - pB;
                    return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
                  }).map((slot: any) => {
                    const available = slot.capacity - (slot.filledSpots || 0);
                    const isSoldOut = available <= 0;
                    const isSelected = selectedSlotId === slot.id;
                    return (
                      <div
                        key={slot.id}
                        onClick={() => !isSoldOut && setSelectedSlotId(slot.id)}
                        style={{
                          padding: "10px 12px",
                          borderRadius: "6px",
                          border: isSelected ? "1.5px solid #c8a96e" : "1px solid rgba(30,26,20,0.1)",
                          background: isSelected ? "rgba(200,169,110,0.05)" : "#fff",
                          cursor: isSoldOut ? "not-allowed" : "pointer",
                          opacity: isSoldOut ? 0.6 : 1,
                          transition: "all 0.2s ease",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center"
                        }}
                      >
                        <div style={{ color: "#1e1a14", fontSize: "0.85rem", fontWeight: 500, fontFamily: "'Poppins', sans-serif" }}>
                          {new Date(slot.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })} - {new Date(slot.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          {slot.title && <span style={{ marginLeft: "6px", fontWeight: 400, fontSize: "0.75rem", color: "rgba(30,26,20,0.7)" }}>({slot.title})</span>}
                        </div>
                        <div style={{ fontSize: "0.7rem", color: isSoldOut ? "#ef4444" : "rgba(30,26,20,0.5)", fontFamily: "'Poppins', sans-serif" }}>
                          {isSoldOut ? "Sold Out" : `${available} spots left`}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Packages Column */}
              {trip?.packages?.length > 0 && (
                <div>
                  <h3 style={{
                    color: "#1e1a14",
                    fontSize: "0.9rem",
                    fontWeight: 400,
                    marginBottom: "12px",
                    fontFamily: "'Playfair Display', serif"
                  }}>
                    Select a Package
                  </h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>

                    {trip.packages.map((pkg: any) => {
                      const isSelected = selectedPackageId === pkg.id;
                      return (
                        <div
                          key={pkg.id}
                          onClick={() => setSelectedPackageId(pkg.id)}
                          style={{
                            padding: "8px 10px",
                            borderRadius: "6px",
                            border: isSelected ? "1.5px solid #c8a96e" : "1px solid rgba(30,26,20,0.1)",
                            background: isSelected ? "rgba(200,169,110,0.05)" : "#fff",
                            cursor: "pointer",
                            transition: "all 0.2s ease",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center"
                          }}
                        >
                          <div style={{ color: "#1e1a14", fontSize: "0.95rem", fontWeight: 500, fontFamily: "'Poppins', sans-serif" }}>
                            {pkg.title}
                          </div>
                          <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#781216", fontFamily: "'Poppins', sans-serif" }}>
                            {formatPrice(pkg.price)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <hr style={{ border: "none", borderTop: "1px solid rgba(30,26,20,0.1)", margin: "0" }} />

            {/* ══ Form ══ */}
            <form
            onSubmit={handleSubmit}
            onInvalid={(e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const firstInvalid = form.querySelector(
                ":invalid",
              ) as HTMLElement;
              if (firstInvalid && e.target === firstInvalid) {
                const input = firstInvalid as HTMLInputElement;
                let fieldName = "";

                // Try to extract the field name from the closest label
                const parentDiv = input.closest("div");
                const labelEl = parentDiv?.querySelector("label");
                if (labelEl && labelEl.textContent) {
                  fieldName = labelEl.textContent.replace("*", "").trim();
                }

                if (!fieldName) {
                  fieldName =
                    input.name || input.placeholder || "a required field";
                }

                let errorMessage = `Please fill out: ${fieldName}`;
                if (
                  input.validity.typeMismatch ||
                  input.validity.patternMismatch
                ) {
                  errorMessage = `Please enter a valid ${fieldName}.`;
                }

                toast.error(errorMessage);
                firstInvalid.focus();
                firstInvalid.scrollIntoView({
                  behavior: "smooth",
                  block: "center",
                });
              }
            }}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "36px",
            }}
          >
            {/* ── Error banner ── */}
            <AnimatePresence>
              {bookingError && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "10px",
                    background: "rgba(192,57,43,0.07)",
                    border: "1px solid rgba(192,57,43,0.22)",
                    borderRadius: "10px",
                    padding: "14px 16px",
                  }}
                >
                  <AlertCircle
                    size={16}
                    color="#c0392b"
                    strokeWidth={1.5}
                    style={{ flexShrink: 0, marginTop: "1px" }}
                  />
                  <p
                    style={{
                      color: "#c0392b",
                      fontSize: "0.82rem",
                      fontWeight: 400,
                      margin: 0,
                      lineHeight: 1.6,
                    }}
                  >
                    {bookingError}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Not logged in notice ── */}
            {!user && (
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "10px",
                  background: "rgba(184,148,58,0.06)",
                  border: "1px solid rgba(184,148,58,0.22)",
                  borderRadius: "10px",
                  padding: "14px 16px",
                }}
              >
                <Info
                  size={15}
                  color="#b8943a"
                  strokeWidth={1.5}
                  style={{ flexShrink: 0, marginTop: "1px" }}
                />
                <p
                  style={{
                    color: "rgba(30,26,20,0.7)",
                    fontSize: "0.78rem",
                    fontWeight: 300,
                    margin: 0,
                    lineHeight: 1.65,
                  }}
                >
                  <span style={{ color: "#b8943a", fontWeight: 600 }}>
                    You're not signed in.
                  </span>{" "}
                  Clicking "Confirm Booking" will redirect you to Google login,
                  then bring you back here automatically.
                </p>
              </div>
            )}

            {/* ── 1. Primary Traveler ── */}
            <div
              key={profile?.id || "loading"}
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
                  <Input type="text" name="firstName" placeholder="Arjun" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                </Field>
                <Field label="Middle Name">
                  <Input type="text" name="middleName" placeholder="Optional" />
                </Field>
                <Field label="Last Name" required>
                  <Input type="text" name="lastName" placeholder="Sharma" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
                </Field>
                <Field
                  label="Email ID"
                  required
                  hint="Booking confirmation will be sent here."
                >
                  <Input
                    type="email"
                    name="email"
                    placeholder="arjun@email.com"
                    value={primaryEmail}
                    onChange={(e) => setPrimaryEmail(e.target.value)}
                    required
                  />
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Address" required>
                    <Input
                      type="text"
                      name="address"
                      placeholder="House / Street / Colony"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      required
                    />
                  </Field>
                </div>
                <Field label="PIN Code" required>
                  <Input
                    type="text"
                    name="pinCode"
                    placeholder="400001"
                    maxLength={6}
                    value={pinCode}
                    onChange={(e) => setPinCode(e.target.value)}
                    required
                  />
                </Field>
                <Field
                  label="Contact Number"
                  required
                  hint="WhatsApp updates will be sent here."
                >
                  <Input
                    type="tel"
                    name="phoneNumber"
                    placeholder="+91 98765 43210"
                    value={primaryPhone}
                    onChange={(e) => setPrimaryPhone(e.target.value)}
                    required
                  />
                </Field>
                <Field label="Date of Birth" required>
                  <Input type="date" name="dateOfBirth" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} required />
                </Field>
                <Field label="Gender" required>
                  <Select name="gender" value={gender} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setGender(e.target.value)} required>
                    <option value="">Select gender</option>
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Non-binary</option>
                    <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
                  </Select>
                </Field>
                <div className="sm:col-span-2" id="govt-id-section">
                  <FilePickerField
                    label="Aadhaar / Govt ID"
                    required={!profile?.govtIdImageUrl}
                    hint="Clear photo or scan — max 8 MB"
                    file={govtIdImage}
                    onChange={setGovtIdImage}
                    existingUrl={profile?.govtIdImageUrl}
                    existingMimeType={profile?.govtIdMimeType}
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
                      disabled={!canAddMoreTravelers}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        background: canAddMoreTravelers ? "rgba(120,18,22,0.06)" : "rgba(30,26,20,0.05)",
                        border: canAddMoreTravelers ? "1.5px solid rgba(120,18,22,0.2)" : "1.5px solid rgba(30,26,20,0.1)",
                        borderRadius: "6px",
                        padding: "9px 18px",
                        color: canAddMoreTravelers ? "#781216" : "rgba(30,26,20,0.4)",
                        fontFamily: "'Poppins', sans-serif",
                        fontSize: "0.74rem",
                        fontWeight: 600,
                        cursor: canAddMoreTravelers ? "pointer" : "not-allowed",
                        letterSpacing: "0.04em",
                        transition: "background 0.2s, border-color 0.2s, opacity 0.2s",
                        opacity: canAddMoreTravelers ? 1 : 0.7,
                      }}
                      onMouseEnter={(e) => {
                        if (canAddMoreTravelers) {
                          (e.currentTarget as HTMLButtonElement).style.background = "rgba(120,18,22,0.1)";
                          (e.currentTarget as HTMLButtonElement).style.borderColor = "#781216";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (canAddMoreTravelers) {
                          (e.currentTarget as HTMLButtonElement).style.background = "rgba(120,18,22,0.06)";
                          (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(120,18,22,0.2)";
                        }
                      }}
                    >
                      <Plus size={14} /> {canAddMoreTravelers ? "Add Traveler" : "No Spots Left"}
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

            {/* ── 3. Special Requests ── */}
            <div
              style={{
                background: "#ffffff",
                borderRadius: "14px",
                border: "1px solid rgba(30,26,20,0.07)",
                padding: "clamp(22px,3vw,32px)",
                boxShadow: "0 2px 10px rgba(30,26,20,0.04)",
              }}
            >
              <Field
                label="Special Requests"
                hint="Dietary preferences, accessibility needs, room preferences, etc."
              >
                <textarea
                  value={specialRequests}
                  onChange={(e) => setSpecialRequests(e.target.value)}
                  placeholder="Any specific requirements or requests..."
                  rows={3}
                  style={{
                    ...inputBase,
                    resize: "vertical",
                    minHeight: "80px",
                  }}
                />
              </Field>
            </div>

            {/* ── 4. Booking Amount ── */}
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
                    label: "Price (per person)",
                    val: formatPrice(basePrice),
                  },
                  {
                    label: `Travelers`,
                    val: `x ${numTravelers}`,
                  },
                  {
                    label: `GST (5%)`,
                    val: formatPrice(totalGst),
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
                    Payment Due Now
                  </span>
                  <span
                    style={{
                      color: "#781216",
                      fontSize: "1.05rem",
                      fontWeight: 700,
                      letterSpacing: "-0.02em",
                    }}
                  >
                    {paymentChoice === "FULL" || isTokenZero
                      ? formatPrice(totalAmountDue)
                      : formatPrice(tokenAmountDue)}
                  </span>
                </div>
              </div>

              {/* Payment choice */}
              {!isTokenZero && (
                <div style={{ marginBottom: "20px" }}>
                  <h4
                    style={{
                      color: "#1e1a14",
                      fontSize: "0.9rem",
                      fontWeight: 600,
                      margin: "0 0 12px",
                    }}
                  >
                    Select Payment Option
                  </h4>
                  <div
                    style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}
                  >
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        cursor: "pointer",
                        background:
                          paymentChoice === "FULL"
                            ? "rgba(120,18,22,0.06)"
                            : "#faf8f4",
                        border:
                          paymentChoice === "FULL"
                            ? "1.5px solid #781216"
                            : "1.5px solid rgba(30,26,20,0.1)",
                        padding: "12px 16px",
                        borderRadius: "8px",
                        flex: 1,
                      }}
                    >
                      <input
                        type="radio"
                        name="paymentChoice"
                        value="FULL"
                        checked={paymentChoice === "FULL"}
                        onChange={() => setPaymentChoice("FULL")}
                        style={{ accentColor: "#781216" }}
                      />
                      <span
                        style={{
                          fontSize: "0.85rem",
                          fontWeight: 500,
                          color: "#1e1a14",
                        }}
                      >
                        Full Payment ({formatPrice(totalAmountDue)})
                      </span>
                    </label>
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        cursor: "pointer",
                        background:
                          paymentChoice === "TOKEN"
                            ? "rgba(120,18,22,0.06)"
                            : "#faf8f4",
                        border:
                          paymentChoice === "TOKEN"
                            ? "1.5px solid #781216"
                            : "1.5px solid rgba(30,26,20,0.1)",
                        padding: "12px 16px",
                        borderRadius: "8px",
                        flex: 1,
                      }}
                    >
                      <input
                        type="radio"
                        name="paymentChoice"
                        value="TOKEN"
                        checked={paymentChoice === "TOKEN"}
                        onChange={() => setPaymentChoice("TOKEN")}
                        style={{ accentColor: "#781216" }}
                      />
                      <span
                        style={{
                          fontSize: "0.85rem",
                          fontWeight: 500,
                          color: "#1e1a14",
                        }}
                      >
                        Booking Payment ({formatPrice(tokenAmountDue)})
                      </span>
                    </label>
                  </div>
                </div>
              )}

              {/* Payment info banner */}
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "9px",
                  background:
                    paymentChoice === "FULL" || isTokenZero
                      ? "rgba(120,18,22,0.06)"
                      : "rgba(184,148,58,0.06)",
                  border:
                    paymentChoice === "FULL" || isTokenZero
                      ? "1px solid rgba(120,18,22,0.18)"
                      : "1px solid rgba(184,148,58,0.18)",
                  borderRadius: "8px",
                  padding: "12px 14px",
                  marginBottom: "20px",
                }}
              >
                <Info
                  size={14}
                  color={
                    paymentChoice === "FULL" || isTokenZero
                      ? "#781216"
                      : "#b8943a"
                  }
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
                      color:
                        paymentChoice === "FULL" || isTokenZero
                          ? "#781216"
                          : "#b8943a",
                      fontWeight: 600,
                    }}
                  >
                    {paymentChoice === "FULL" || isTokenZero
                      ? "Full payment selected."
                      : "Partial payment selected."}
                  </span>{" "}
                  {paymentChoice === "FULL" || isTokenZero
                    ? `Pay ${formatPrice(totalAmountDue)} now to confirm your booking.`
                    : `Pay ${formatPrice(tokenAmountDue)} now to confirm your spot. The remaining ${formatPrice(totalAmountDue - tokenAmountDue)} is due before departure.`}
                </p>
              </div>
            </div>

            {/* ── Submit ── */}
            <div>
              <button
                type="submit"
                disabled={submitting}
                style={{
                  width: "100%",
                  background: submitting ? "rgba(120,18,22,0.5)" : "#781216",
                  color: "#fff",
                  border: "none",
                  borderRadius: "10px",
                  padding: "16px",
                  fontFamily: "'Poppins', sans-serif",
                  fontSize: "0.88rem",
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  cursor: submitting ? "not-allowed" : "pointer",
                  transition: "background 0.25s ease",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                }}
                onMouseEnter={(e) => {
                  if (!submitting) e.currentTarget.style.background = "#9a1a1f";
                }}
                onMouseLeave={(e) => {
                  if (!submitting) e.currentTarget.style.background = "#781216";
                }}
              >
                {submitting ? (
                  <>
                    <Loader2
                      size={16}
                      style={{ animation: "spin 1s linear infinite" }}
                    />
                    Processing…
                  </>
                ) : user ? (
                  "Confirm & Pay Now"
                ) : (
                  "Sign in & Continue →"
                )}
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
          </div>

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
                    src={mediaImageUrl(tripImage, { width: 640, height: 400 })}
                    alt={tripName}
                    loading="lazy"
                    decoding="async"
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
                      label: "Dates",
                      val: selectedSlot?.startDate && selectedSlot?.endDate
                        ? `${new Date(selectedSlot.startDate).toLocaleDateString("en-IN", { month: "short", day: "numeric" })} – ${new Date(selectedSlot.endDate).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}`
                        : "Not Available",
                    },
                    ...(activePackage ? [{ label: "Package", val: activePackage.title }] : []),
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

                  {/* Live price breakdown in sidebar */}
                  <div
                    style={{
                      marginTop: "16px",
                      paddingTop: "14px",
                      borderTop: "1px solid rgba(30,26,20,0.06)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "baseline",
                        marginBottom: "6px",
                      }}
                    >
                      <p
                        style={{
                          color: "rgba(30,26,20,0.38)",
                          fontSize: "0.58rem",
                          letterSpacing: "0.14em",
                          textTransform: "uppercase",
                          margin: 0,
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
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginTop: "12px",
                      }}
                    >
                      <p
                        style={{
                          color: "rgba(30,26,20,0.38)",
                          fontSize: "0.58rem",
                          letterSpacing: "0.14em",
                          textTransform: "uppercase",
                          margin: 0,
                        }}
                      >
                        GST (5%)
                      </p>
                      <p
                        style={{
                          color: "#1e1a14",
                          fontSize: "0.9rem",
                          fontWeight: 500,
                          margin: 0,
                        }}
                      >
                        {formatPrice(totalGst)}
                      </p>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginTop: "8px",
                      }}
                    >
                      <p
                        style={{
                          color: "rgba(30,26,20,0.38)",
                          fontSize: "0.58rem",
                          letterSpacing: "0.14em",
                          textTransform: "uppercase",
                          margin: 0,
                        }}
                      >
                        Total{numTravelers > 1 ? ` (${numTravelers} travelers)` : ""}
                      </p>
                      <p
                        style={{
                          color: "#1e1a14",
                          fontSize: "0.9rem",
                          fontWeight: 600,
                          margin: 0,
                        }}
                      >
                        {formatPrice(totalAmountDue)}
                      </p>
                    </div>
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
      {/* Forced Login Overlay if not logged in */}
      {!authLoading && !user && (
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
              Sign In to Book
            </h2>
            <p
              style={{
                fontSize: "0.875rem",
                color: "rgba(30,26,20,0.6)",
                marginBottom: "2rem",
              }}
            >
              Welcome back! Please sign in to your account to continue booking
              this trip.
            </p>
            <button
              type="button"
              onClick={() => {
                localStorage.setItem(
                  "booking_redirect_intent",
                  `/book/${slug}`,
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
      )}

      <SiteFooter />
    </div>
  );
}

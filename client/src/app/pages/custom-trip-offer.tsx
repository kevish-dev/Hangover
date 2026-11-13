import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  Loader2,
  LockKeyhole,
  Map,
  ShieldCheck,
  Upload,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../../contexts/AuthContext";
import { API_URL, apiClient } from "../../lib/axios";
import { customTripApi, type CustomTrip } from "../../lib/customTripApi";
import { getMyProfile, type UserProfile } from "../../lib/profileApi";
import { SiteFooter } from "../components/site-footer";

declare const Razorpay: any;

const input =
  "w-full rounded-lg border border-[#d9d2c7] bg-white px-3.5 py-3 text-sm text-[#1e1a14] outline-none focus:border-[#781216] focus:ring-2 focus:ring-[#781216]/10";
const money = (value: string | number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value));
const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

type TravelerForm = {
  fullName: string;
  gender: string;
  dateOfBirth: string;
  phone: string;
  file: File | null;
};

function MessagePage({ title, message }: { title: string; message: string }) {
  return (
    <>
      <main className="flex min-h-[75vh] items-center justify-center bg-[#f7f3eb] px-4 pt-28">
        <div className="max-w-lg rounded-2xl border bg-white p-8 text-center shadow-sm">
          <AlertCircle className="mx-auto mb-4 h-10 w-10 text-[#781216]" />
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="mt-3 text-sm leading-6 text-gray-600">{message}</p>
          <Link
            to="/trips"
            className="mt-6 inline-block rounded-lg bg-[#781216] px-5 py-3 text-sm font-semibold text-white"
          >
            Explore public trips
          </Link>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

export default function CustomTripOfferPage() {
  const { token = "" } = useParams();
  const { user, isLoading: authLoading } = useAuth();
  const [offer, setOffer] = useState<CustomTrip | null>(null);
  const [profile, setProfile] = useState<Partial<UserProfile> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [checkout, setCheckout] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<{
    reference: string;
    paymentType: string;
  } | null>(null);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [govtIdType, setGovtIdType] = useState("AADHAAR");
  const [govtFile, setGovtFile] = useState<File | null>(null);
  const [paymentChoice, setPaymentChoice] = useState<"TOKEN" | "FULL">("TOKEN");
  const [specialRequests, setSpecialRequests] = useState("");
  const [travelers, setTravelers] = useState<TravelerForm[]>([]);

  useEffect(() => {
    if (authLoading) return;
    setLoading(true);
    customTripApi
      .offer(token)
      .then((data) => {
        setOffer(data);
        setPaymentChoice(
          Number(data.tokenAmount) > 0 &&
            Number(data.tokenAmount) < Number(data.totalAmount)
            ? "TOKEN"
            : "FULL",
        );
        setTravelers(
          Array.from({ length: Math.max(0, data.travelerCount - 1) }, () => ({
            fullName: "",
            gender: "",
            dateOfBirth: "",
            phone: "",
            file: null,
          })),
        );
      })
      .catch((e) =>
        setError(
          e?.response?.data?.message ||
            "This private custom trip offer is unavailable.",
        ),
      )
      .finally(() => setLoading(false));
  }, [token, user?.id, authLoading]);

  useEffect(() => {
    if (!user) return;
    getMyProfile()
      .then((data) => {
        setProfile(data);
        setFullName(data.fullName || user.name || "");
        setPhone(data.phone || "");
        setGovtIdType(data.govtIdType || "AADHAAR");
      })
      .catch(() => setProfile({}));
  }, [user?.id]);

  const login = () => {
    localStorage.setItem("booking_redirect_intent", `/custom-trip/${token}`);
    window.location.href = `${API_URL}/auth/google`;
  };
  const updateTraveler = (index: number, key: keyof TravelerForm, value: any) =>
    setTravelers((current) =>
      current.map((traveler, i) =>
        i === index ? { ...traveler, [key]: value } : traveler,
      ),
    );

  const completePayment = async (booking: any, type: "TOKEN" | "FULL") => {
    const initiated = (
      await apiClient.post("/payments/initiate", {
        bookingId: booking.id,
        type,
      })
    ).data;
    await new Promise<void>((resolve, reject) => {
      const razorpay = new Razorpay({
        key: initiated.razorpayKeyId,
        amount: initiated.amount,
        currency: initiated.currency,
        name: "Hangover Trails",
        description: `${offer?.title || "Custom trip"} — ${type === "TOKEN" ? "Booking payment" : "Full payment"}`,
        order_id: initiated.razorpayOrderId,
        prefill: { name: fullName, email: user?.email, contact: phone },
        theme: { color: "#781216" },
        modal: {
          ondismiss: () =>
            reject(
              new Error(
                "Payment window closed. Your pending booking is saved and you can retry from this private offer.",
              ),
            ),
        },
        handler: async (response: any) => {
          try {
            await apiClient.post("/payments/verify", {
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });
            setSuccess({
              reference: booking.bookingReference,
              paymentType: type,
            });
            resolve();
          } catch (verifyError) {
            reject(verifyError);
          }
        },
      });
      razorpay.on("payment.failed", async (response: any) => {
        await apiClient
          .post("/payments/failed", {
            razorpayOrderId:
              response.error.metadata?.order_id || initiated.razorpayOrderId,
            razorpayPaymentId: response.error.metadata?.payment_id,
            reason: response.error.description,
            code: response.error.code,
          })
          .catch(() => undefined);
        toast.error(
          response.error.description || "Payment failed. You can retry.",
        );
      });
      razorpay.open();
    });
  };

  const retryPendingPayment = async () => {
    if (!offer?.booking || !offer.canBook) return;
    setSubmitting(true);
    try {
      await completePayment(
        offer.booking,
        offer.booking.initialPaymentType ||
          (Number(offer.tokenAmount) > 0 &&
          Number(offer.tokenAmount) < Number(offer.totalAmount)
            ? "TOKEN"
            : "FULL"),
      );
    } catch (e: any) {
      toast.error(
        e?.response?.data?.message ||
          e?.message ||
          "Could not complete the payment.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const bookAndPay = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) return login();
    if (!offer?.canBook)
      return toast.error(
        "Sign in with the email address this offer was prepared for.",
      );
    const hasPrimaryId = Boolean(
      profile?.govtIdImageUrl || profile?.govtIdNumber || govtFile,
    );
    if (!fullName.trim() || !phone.trim())
      return toast.error("Primary traveler name and phone are required.");
    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length !== 10)
      return toast.error("Primary traveler phone must be exactly 10 digits.");
    for (let i = 0; i < travelers.length; i++) {
      if (travelers[i].phone) {
        const cleanTPhone = travelers[i].phone.replace(/\D/g, "");
        if (cleanTPhone.length !== 10) {
          return toast.error(`Traveler ${i + 2} phone must be exactly 10 digits.`);
        }
      }
    }
    if (!hasPrimaryId)
      return toast.error("Upload a government ID for the primary traveler.");
    if (
      travelers.some((traveler) => !traveler.fullName.trim() || !traveler.file)
    )
      return toast.error(
        "Every additional traveler needs a name and government ID.",
      );
    if (govtFile && govtFile.size > 10 * 1024 * 1024) {
      return toast.error("Primary traveler ID exceeds 10 MB. Please choose a smaller file.");
    }
    const oversizedTraveler = travelers.find((t) => t.file && t.file.size > 10 * 1024 * 1024);
    if (oversizedTraveler) {
      return toast.error(`Traveler ${oversizedTraveler.fullName || "ID"} file exceeds 10 MB.`);
    }
    setSubmitting(true);
    try {
      await apiClient.put("/users/me/profile", {
        fullName: fullName.trim(),
        phone: phone.trim(),
      });
      if (govtFile) {
        const body = new FormData();
        body.append("govtIdType", govtIdType);
        body.append("image", govtFile);
        await apiClient.post("/users/me/govt-id", body, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }
      const additionalTravelers = await Promise.all(
        travelers.map(async (traveler) => {
          const body = new FormData();
          body.append("image", traveler.file!);
          const upload = await apiClient.post(
            "/bookings/traveler/govt-id",
            body,
            { headers: { "Content-Type": "multipart/form-data" } },
          );
          return {
            fullName: traveler.fullName.trim(),
            gender: traveler.gender || null,
            dateOfBirth: traveler.dateOfBirth || null,
            phone: traveler.phone || null,
            aadhaarAssetId: upload.data.assetId,
          };
        }),
      );
      const booking = await customTripApi.book(token, {
        additionalTravelers,
        specialRequests,
        initialPaymentType:
          Number(offer.tokenAmount) <= 0 ||
          Number(offer.tokenAmount) >= Number(offer.totalAmount)
            ? "FULL"
            : paymentChoice,
      });
      if (booking.status !== "PENDING") {
        setSuccess({
          reference: booking.bookingReference,
          paymentType: booking.initialPaymentType || paymentChoice,
        });
        return;
      }
      const type = booking.initialPaymentType as "TOKEN" | "FULL";
      await completePayment(booking, type);
    } catch (e: any) {
      toast.error(
        e?.response?.data?.message ||
          e?.message ||
          "Could not complete the booking.",
      );
      customTripApi
        .offer(token)
        .then(setOffer)
        .catch(() => undefined);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || authLoading)
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f3eb]">
        <Loader2 className="h-8 w-8 animate-spin text-[#781216]" />
      </main>
    );
  if (error || !offer)
    return (
      <MessagePage
        title="Offer unavailable"
        message={error || "The secure link is invalid or no longer active."}
      />
    );
  if (offer.status === "EXPIRED")
    return (
      <MessagePage
        title="This offer has expired"
        message="Please contact the Hangover Trails team to refresh the dates or validity. Your inquiry records are not affected."
      />
    );
  if (success)
    return (
      <>
        <main className="flex min-h-[80vh] items-center justify-center bg-[#f7f3eb] px-4 pt-28">
          <div className="max-w-xl rounded-2xl border bg-white p-8 text-center shadow-sm">
            <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-600" />
            <p className="mt-4 text-xs font-bold uppercase tracking-widest text-[#a17d2c]">
              {success.paymentType === "FULL"
                ? "Booking confirmed"
                : "Trip reserved"}
            </p>
            <h1 className="mt-2 text-3xl font-bold">You’re on the trail.</h1>
            <p className="mt-3 text-gray-600">
              Booking reference <strong>{success.reference}</strong>. Your
              receipt and trip details are available in your profile.
            </p>
            <Link
              to="/profile"
              className="mt-6 inline-block rounded-lg bg-[#781216] px-6 py-3 text-sm font-semibold text-white"
            >
              View my bookings
            </Link>
          </div>
        </main>
        <SiteFooter />
      </>
    );

  return (
    <>
      <main className="bg-[#f7f3eb] text-[#1e1a14]">
        <section className="relative min-h-[440px] overflow-hidden">
          {offer.bannerImages[0] && (
            <img
              src={offer.bannerImages[0]}
              alt={offer.title}
              className="absolute inset-0 h-full w-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/15" />
          <div className="relative mx-auto flex min-h-[440px] max-w-6xl flex-col justify-end px-5 pb-12 text-white md:px-8">
            <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#ead59b]">
              <LockKeyhole className="h-4 w-4" />
              Private custom trip
            </div>
            <h1 className="max-w-4xl text-4xl font-bold leading-tight md:text-6xl">
              {offer.title}
            </h1>
            <p className="mt-3 text-sm text-white/80">
              Prepared exclusively for {offer.customerName}
            </p>
          </div>
        </section>
        <section className="mx-auto grid max-w-6xl gap-8 px-5 py-10 md:px-8 lg:grid-cols-[1fr_340px]">
          <div className="space-y-10">
            <p className="text-base leading-8 text-gray-700">
              {offer.description}
            </p>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {[
                [
                  CalendarDays,
                  "Travel dates",
                  `${formatDate(offer.startDate)} – ${formatDate(offer.endDate)}`,
                ],
                [Clock3, "Duration", `${offer.durationDays} days`],
                [Users, "Travelers", offer.travelerCount],
                [CreditCard, "Total price", money(offer.totalAmount)],
              ].map(([Icon, k, v]: any) => (
                <div key={k} className="rounded-xl border bg-white p-4">
                  <Icon className="mb-2 h-5 w-5 text-[#781216]" />
                  <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">
                    {k}
                  </p>
                  <p className="mt-1 text-sm font-semibold">{v}</p>
                </div>
              ))}
            </div>
            <section>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#a17d2c]">
                What makes it special
              </p>
              <h2 className="mt-2 text-2xl font-bold">Trip highlights</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {offer.highlights.map((h, i) => (
                  <div key={i} className="rounded-xl border bg-white p-5">
                    <CheckCircle2 className="mb-3 h-5 w-5 text-[#781216]" />
                    <h3 className="font-bold">{h.title}</h3>
                    {h.description && (
                      <p className="mt-2 text-sm leading-6 text-gray-600">
                        {h.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
            <section>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#a17d2c]">
                Your route
              </p>
              <h2 className="mt-2 text-2xl font-bold">Day-wise itinerary</h2>
              <div className="mt-5 space-y-4 border-l border-[#c8a96e] pl-5">
                {offer.itinerary.map((d) => (
                  <article
                    key={d.day}
                    className="relative rounded-xl border bg-white p-5 before:absolute before:-left-[27px] before:top-6 before:h-3 before:w-3 before:rounded-full before:bg-[#781216]"
                  >
                    <p className="text-xs font-bold uppercase tracking-wide text-[#781216]">
                      Day {d.day}
                    </p>
                    <h3 className="mt-1 text-lg font-bold">{d.title}</h3>
                    {d.description && (
                      <p className="mt-2 text-sm leading-7 text-gray-600">
                        {d.description}
                      </p>
                    )}
                    {d.activities?.length > 0 && (
                      <ul className="mt-3 list-disc pl-5 text-sm text-gray-600">
                        {d.activities.map((a, i) => (
                          <li key={i}>{a}</li>
                        ))}
                      </ul>
                    )}
                  </article>
                ))}
              </div>
            </section>
          </div>
          <aside className="h-fit rounded-2xl border bg-white p-5 shadow-sm lg:sticky lg:top-24">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
              Private group price
            </p>
            <p className="mt-1 text-3xl font-bold">
              {money(offer.totalAmount)}
            </p>
            {Number(offer.tokenAmount) > 0 &&
              Number(offer.tokenAmount) < Number(offer.totalAmount) && (
                <p className="mt-1 text-sm text-gray-600">
                  Reserve with {money(offer.tokenAmount)}
                </p>
              )}
            <div className="my-5 border-t" />
            {offer.pricingNotes && (
              <p className="mb-4 whitespace-pre-wrap text-xs leading-5 text-gray-600">
                {offer.pricingNotes}
              </p>
            )}
            <p className="flex gap-2 text-xs text-gray-500">
              <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" />
              This offer is private and can only be booked by its intended
              customer account.
            </p>
            {offer.status === "CONVERTED" ? (
              <div className="mt-5">
                <div className="rounded-lg bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
                  <CheckCircle2 className="mr-2 inline h-4 w-4" />
                  This offer has been booked.
                </div>
                {offer.booking?.status === "PENDING" && offer.canBook && (
                  <button
                    disabled={submitting}
                    onClick={retryPendingPayment}
                    className="mt-3 w-full rounded-lg bg-[#781216] px-5 py-3.5 text-sm font-bold text-white disabled:opacity-50"
                  >
                    {submitting && (
                      <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                    )}
                    Complete pending payment
                  </button>
                )}
                <Link
                  to="/profile"
                  className="mt-3 block text-center text-xs font-semibold text-[#781216]"
                >
                  View booking
                </Link>
              </div>
            ) : (
              <button
                onClick={() => (user ? setCheckout(true) : login())}
                className="mt-5 w-full rounded-lg bg-[#781216] px-5 py-3.5 text-sm font-bold text-white"
              >
                {user ? "Continue to traveler details" : "Sign in to book"}
              </button>
            )}
            <p className="mt-3 text-center text-[11px] text-gray-400">
              Valid until {new Date(offer.validUntil).toLocaleString("en-IN")}
            </p>
          </aside>
        </section>
        {checkout && offer.status !== "CONVERTED" && (
          <section className="border-t bg-white">
            <form
              onSubmit={bookAndPay}
              className="mx-auto max-w-4xl space-y-7 px-5 py-10 md:px-8"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-[#a17d2c]">
                    Secure checkout
                  </p>
                  <h2 className="mt-1 text-2xl font-bold">
                    Traveler and payment details
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setCheckout(false)}
                  className="text-sm font-semibold text-gray-500"
                >
                  Close
                </button>
              </div>
              {!offer.canBook && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  This offer belongs to another email address. Sign out and use
                  the account matching the offer recipient.
                </div>
              )}
              <div className="rounded-xl border p-5">
                <h3 className="mb-4 font-bold">Primary traveler</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold">
                      Full name *
                    </label>
                    <input
                      required
                      className={input}
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold">
                      Phone * (10 digits)
                    </label>
                    <input
                      required
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      pattern="[0-9]{10}"
                      title="Phone number must be exactly 10 digits"
                      placeholder="9876543210"
                      className={input}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold">
                      Government ID type
                    </label>
                    <select
                      className={input}
                      value={govtIdType}
                      onChange={(e) => setGovtIdType(e.target.value)}
                    >
                      <option>AADHAAR</option>
                      <option>PASSPORT</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold">
                      Government ID{" "}
                      {profile?.govtIdImageUrl || profile?.govtIdNumber
                        ? "(already on profile)"
                        : "*"}
                    </label>
                    <label
                      className={`${input} flex cursor-pointer items-center gap-2`}
                    >
                      <Upload className="h-4 w-4" />
                      <span className="truncate">
                        {govtFile?.name || "Upload image or PDF"}
                      </span>
                      <input
                        hidden
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/avif,application/pdf"
                        onChange={(e) => {
                          const f = e.target.files?.[0] || null;
                          if (f && f.size > 10 * 1024 * 1024) {
                            toast.error("File exceeds 10 MB. Please choose a smaller photo or compress it.");
                            e.target.value = "";
                            return;
                          }
                          setGovtFile(f);
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>
              {travelers.map((traveler, index) => (
                <div key={index} className="rounded-xl border p-5">
                  <h3 className="mb-4 font-bold">Traveler {index + 2}</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <input
                      required
                      placeholder="Full name *"
                      className={input}
                      value={traveler.fullName}
                      onChange={(e) =>
                        updateTraveler(index, "fullName", e.target.value)
                      }
                    />
                    <input
                      placeholder="Phone (10 digits)"
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      pattern="[0-9]{10}"
                      title="Phone number must be exactly 10 digits"
                      className={input}
                      value={traveler.phone}
                      onChange={(e) =>
                        updateTraveler(index, "phone", e.target.value.replace(/\D/g, "").slice(0, 10))
                      }
                    />
                    <select
                      className={input}
                      value={traveler.gender}
                      onChange={(e) =>
                        updateTraveler(index, "gender", e.target.value)
                      }
                    >
                      <option value="">Gender (optional)</option>
                      <option>MALE</option>
                      <option>FEMALE</option>
                      <option>OTHER</option>
                      <option>PREFER_NOT_TO_SAY</option>
                    </select>
                    <input
                      type="date"
                      className={input}
                      value={traveler.dateOfBirth}
                      onChange={(e) =>
                        updateTraveler(index, "dateOfBirth", e.target.value)
                      }
                    />
                    <label
                      className={`${input} flex cursor-pointer items-center gap-2 md:col-span-2`}
                    >
                      <Upload className="h-4 w-4" />
                      <span>
                        {traveler.file?.name || "Upload government ID *"}
                      </span>
                      <input
                        hidden
                        required
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/avif,application/pdf"
                        onChange={(e) => {
                          const f = e.target.files?.[0] || null;
                          if (f && f.size > 10 * 1024 * 1024) {
                            toast.error("File exceeds 10 MB. Please choose a smaller photo or compress it.");
                            e.target.value = "";
                            return;
                          }
                          updateTraveler(
                            index,
                            "file",
                            f,
                          );
                        }}
                      />
                    </label>
                  </div>
                </div>
              ))}
              <div className="rounded-xl border p-5">
                <h3 className="mb-4 font-bold">Payment</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {Number(offer.tokenAmount) > 0 &&
                    Number(offer.tokenAmount) < Number(offer.totalAmount) && (
                      <label
                        className={`cursor-pointer rounded-xl border p-4 ${paymentChoice === "TOKEN" ? "border-[#781216] bg-[#781216]/5" : ""}`}
                      >
                        <input
                          type="radio"
                          name="payment"
                          className="mr-2"
                          checked={paymentChoice === "TOKEN"}
                          onChange={() => setPaymentChoice("TOKEN")}
                        />
                        <strong>
                          Booking payment · {money(offer.tokenAmount)}
                        </strong>
                        <p className="mt-1 pl-5 text-xs text-gray-500">
                          Balance{" "}
                          {money(
                            Number(offer.totalAmount) -
                              Number(offer.tokenAmount),
                          )}
                          {offer.balanceDueDate
                            ? ` due by ${formatDate(offer.balanceDueDate)}`
                            : ""}
                        </p>
                      </label>
                    )}
                  <label
                    className={`cursor-pointer rounded-xl border p-4 ${paymentChoice === "FULL" ? "border-[#781216] bg-[#781216]/5" : ""}`}
                  >
                    <input
                      type="radio"
                      name="payment"
                      className="mr-2"
                      checked={paymentChoice === "FULL"}
                      onChange={() => setPaymentChoice("FULL")}
                    />
                    <strong>Full payment · {money(offer.totalAmount)}</strong>
                    <p className="mt-1 pl-5 text-xs text-gray-500">
                      Pay the complete group price now.
                    </p>
                  </label>
                </div>
                <textarea
                  className={`${input} mt-4`}
                  rows={3}
                  placeholder="Special requests (optional)"
                  value={specialRequests}
                  onChange={(e) => setSpecialRequests(e.target.value)}
                />
              </div>
              <button
                disabled={submitting || !offer.canBook}
                className="w-full rounded-lg bg-[#781216] px-5 py-4 text-sm font-bold text-white disabled:opacity-50"
              >
                {submitting && (
                  <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                )}
                {submitting
                  ? "Preparing secure payment…"
                  : `Book and pay ${money(paymentChoice === "FULL" ? offer.totalAmount : offer.tokenAmount)}`}
              </button>
            </form>
          </section>
        )}
      </main>
      <SiteFooter />
    </>
  );
}

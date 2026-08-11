import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  CalendarDays,
  Image as ImageIcon,
  Loader2,
  Mail,
  Phone,
  User,
  Users,
} from "lucide-react";
import { type ReactNode, useState } from "react";
import { Link, useParams } from "react-router";
import { apiClient } from "../../../lib/axios";
import { BalanceSheetTab } from "../../components/admin/BookingDetailModal";
import { BookingPaymentsTab } from "../../components/admin/BookingPaymentsTab";
import { BookingOperationsGrid } from "./booking-detail";

type Profile = {
  fullName?: string | null;
  phone?: string | null;
  alternatePhone?: string | null;
  gender?: string | null;
  dateOfBirth?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  emergencyContactRelation?: string | null;
  bloodGroup?: string | null;
  medicalNotes?: string | null;
  govtIdImageUrl?: string | null;
};

type Booking = {
  id: string;
  bookingReference: string;
  status: string;
  paymentStatus: string;
  numberOfTravelers: number;
  createdAt: string;
  user: { email: string; profile?: Profile | null };
  travelers: Array<{
    id: string;
    fullName: string;
    email?: string | null;
    phone?: string | null;
    gender?: string | null;
    dateOfBirth?: string | null;
    aadhaar?: string | null;
  }>;
  crmTrip?: { id: string; name: string } | null;
  crmTripSlot?: {
    startDate?: string | null;
    endDate?: string | null;
    title?: string | null;
  } | null;
  crmFestival?: { id: string; name: string } | null;
  crmFestivalSlot?: {
    startDate?: string | null;
    endDate?: string | null;
    title?: string | null;
  } | null;
};

const date = (value?: string | null) =>
  value
    ? new Date(value).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "Not provided";

export default function CrmBookingDetailPage() {
  const { tripId = "", festivalId = "", bookingId = "" } = useParams();
  const [activeTab, setActiveTab] = useState<
    "details" | "operations" | "ledger" | "payments"
  >("details");
  const bookingQuery = useQuery({
    queryKey: ["crm-booking", bookingId],
    queryFn: async () =>
      (await apiClient.get(`/bookings/${bookingId}`)).data as Booking,
    enabled: Boolean(bookingId),
  });
  const booking = bookingQuery.data;

  if (bookingQuery.isLoading)
    return (
      <div className="py-20 text-center text-sm text-gray-500">
        <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
        Loading booking…
      </div>
    );
  if (bookingQuery.isError || !booking)
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
        This booking could not be loaded.
      </div>
    );

  const profile = booking.user.profile;
  const tripName =
    booking.crmFestival?.name ||
    booking.crmTrip?.name ||
    "Itinerary festival/trip";
  const isFestivalBooking = Boolean(booking.crmFestival);
  const tripPath = isFestivalBooking
    ? `/dashboard/crm-festivals/${booking.crmFestival?.id || festivalId || ""}`
    : `/dashboard/crm-trips/${tripId || booking.crmTrip?.id || ""}`;
  const slot = booking.crmFestivalSlot || booking.crmTripSlot;

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-12">
      <Link
        to={tripPath}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-[#781216]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to {tripName}
      </Link>
      <header className="rounded-xl border border-gray-200 bg-white p-5 md:p-6">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#b59410]">
              {tripName}
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900">
              Booking {booking.bookingReference}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Created {date(booking.createdAt)} · {booking.numberOfTravelers}{" "}
              traveler{booking.numberOfTravelers === 1 ? "" : "s"}
            </p>
          </div>
          <div className="flex gap-2">
            <StatusBadge label={booking.status} />
            <StatusBadge
              label={booking.paymentStatus.replaceAll("_", " ")}
              paid={booking.paymentStatus === "PAID"}
            />
          </div>
        </div>
      </header>
      <nav
        className="flex overflow-x-auto border-b border-gray-200"
        aria-label="Booking sections"
      >
        <TabButton
          active={activeTab === "details"}
          onClick={() => setActiveTab("details")}
        >
          Customer details
        </TabButton>
        <TabButton
          active={activeTab === "operations"}
          onClick={() => setActiveTab("operations")}
        >
          Operations
        </TabButton>
        <TabButton
          active={activeTab === "ledger"}
          onClick={() => setActiveTab("ledger")}
        >
          Ledger
        </TabButton>
        <TabButton
          active={activeTab === "payments"}
          onClick={() => setActiveTab("payments")}
        >
          Payments & refunds
        </TabButton>
      </nav>
      {activeTab === "details" ? (
        <section className="space-y-5">
          <div className="rounded-xl border border-gray-200 bg-white">
            <div className="border-b px-5 py-4">
              <h2 className="flex items-center gap-2 font-bold text-gray-900">
                <User className="h-4 w-4 text-[#781216]" />
                Lead customer
              </h2>
            </div>
            <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
              <Detail
                label="Name"
                value={profile?.fullName || "Not provided"}
              />
              <Detail
                label="Email"
                value={booking.user.email}
                icon={<Mail className="h-3.5 w-3.5" />}
              />
              <Detail
                label="Phone"
                value={profile?.phone || "Not provided"}
                icon={<Phone className="h-3.5 w-3.5" />}
              />
              <Detail
                label="Alternate phone"
                value={profile?.alternatePhone || "Not provided"}
              />
              <Detail
                label="Gender"
                value={profile?.gender || "Not provided"}
              />
              <Detail
                label="Date of birth"
                value={date(profile?.dateOfBirth)}
              />
              <Detail
                label="Address"
                value={
                  [
                    profile?.addressLine1,
                    profile?.addressLine2,
                    profile?.city,
                    profile?.state,
                    profile?.postalCode,
                    profile?.country,
                  ]
                    .filter(Boolean)
                    .join(", ") || "Not provided"
                }
              />
              <Detail
                label="Emergency contact"
                value={
                  [
                    profile?.emergencyContactName,
                    profile?.emergencyContactRelation,
                    profile?.emergencyContactPhone,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "Not provided"
                }
              />
              <Detail
                label="Blood group"
                value={profile?.bloodGroup || "Not provided"}
              />
              <Detail
                label="Medical notes"
                value={profile?.medicalNotes || "None"}
              />
              {profile?.govtIdImageUrl ? (
                <a
                  href={profile.govtIdImageUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 self-end text-sm font-semibold text-[#781216] hover:underline"
                >
                  <ImageIcon className="h-4 w-4" />
                  View Aadhaar / government ID
                </a>
              ) : (
                <Detail label="Government ID" value="Not uploaded" />
              )}
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white">
            <div className="border-b px-5 py-4">
              <h2 className="flex items-center gap-2 font-bold text-gray-900">
                <Users className="h-4 w-4 text-[#781216]" />
                Co-passengers
              </h2>
              <p className="mt-1 text-xs text-gray-500">
                {booking.travelers.length} additional traveler
                {booking.travelers.length === 1 ? "" : "s"}
              </p>
            </div>
            {booking.travelers.length ? (
              <div className="divide-y divide-gray-100">
                {booking.travelers.map((traveler, index) => (
                  <div
                    key={traveler.id}
                    className="grid gap-3 px-5 py-4 sm:grid-cols-2 lg:grid-cols-[1.1fr_1fr_1fr_1fr_auto]"
                  >
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                        Traveler {index + 2}
                      </p>
                      <p className="mt-1 font-semibold text-gray-900">
                        {traveler.fullName}
                      </p>
                    </div>
                    <Detail
                      label="Email"
                      value={traveler.email || "Not provided"}
                    />
                    <Detail
                      label="Phone"
                      value={traveler.phone || "Not provided"}
                    />
                    <div>
                      <p className="text-xs font-medium text-gray-500">
                        Gender · Date of birth
                      </p>
                      <p className="mt-1 text-sm text-gray-800">
                        {traveler.gender || "Not provided"} ·{" "}
                        {date(traveler.dateOfBirth)}
                      </p>
                    </div>
                    {traveler.aadhaar ? (
                      <a
                        href={traveler.aadhaar}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 self-center text-sm font-semibold text-[#781216] hover:underline"
                      >
                        <ImageIcon className="h-4 w-4" />
                        View ID
                      </a>
                    ) : (
                      <span className="self-center text-sm text-gray-400">
                        ID not uploaded
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="p-8 text-center text-sm text-gray-500">
                No co-passengers have been added.
              </p>
            )}
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="flex items-center gap-2 font-bold text-gray-900">
              <CalendarDays className="h-4 w-4 text-[#781216]" />
              Departure
            </h2>
            <p className="mt-2 text-sm text-gray-700">
              {slot?.startDate
                ? `${date(slot.startDate)} – ${date(slot.endDate)}`
                : "Departure has not been scheduled."}
              {slot?.title ? ` · ${slot.title}` : ""}
            </p>
          </div>
        </section>
      ) : activeTab === "operations" ? (
        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <BookingOperationsGrid bookingId={booking.id} />
        </section>
      ) : activeTab === "ledger" ? (
        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-4 font-bold text-gray-900">Booking ledger</h2>
          <BalanceSheetTab
            bookingId={booking.id}
            queryKeySuffix="crm-booking"
          />
        </section>
      ) : (
        <BookingPaymentsTab
          bookingId={booking.id}
          booking={booking}
          onPaymentChange={() => bookingQuery.refetch()}
        />
      )}
    </div>
  );
}

function TabButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 border-b-2 px-4 py-3 text-sm font-semibold ${active ? "border-[#781216] text-[#781216]" : "border-transparent text-gray-500 hover:text-gray-800"}`}
    >
      {children}
    </button>
  );
}
function Detail({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: ReactNode;
}) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-800">
        {icon}
        {value}
      </p>
    </div>
  );
}
function StatusBadge({
  label,
  paid = false,
}: {
  label: string;
  paid?: boolean;
}) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${paid ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-600"}`}
    >
      {label}
    </span>
  );
}

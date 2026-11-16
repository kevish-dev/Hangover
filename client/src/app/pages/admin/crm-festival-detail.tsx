import { type ReactNode, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Loader2,
  Plus,
  Trash2,
  UserPlus,
  Utensils,
} from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "../../../lib/axios";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";

type Master = {
  id: string;
  name: string;
  destinationId?: string;
  stayLocationId?: string;
  stayLocation?: { id: string; name: string };
};
type Activity = { id: string; name: string; description?: string | null };
type DayCommonInclusionKey =
  | "ILP_AND_PERMITS"
  | "BBQ"
  | "BONFIRE"
  | "TRIP_GUIDE";
type Day = {
  id: string;
  dayNumber: number;
  stayLocationId?: string | null;
  propertyId?: string | null;
  breakfast: boolean;
  lunch: boolean;
  dinner: boolean;
  notes?: string | null;
  isDropOff: boolean;
  dropOffLocationId?: string | null;
  stayLocation?: Master | null;
  property?: Master | null;
  dropOffLocation?: Master | null;
  visitingPlaces: { id: string; place: Master }[];
  activities: Activity[];
  commonInclusions: { id: string; key: DayCommonInclusionKey }[];
};
type Inclusion = {
  id: string;
  title: string;
  description?: string | null;
  type: string;
  itineraryDayId?: string | null;
};
type CommonInclusion = {
  id: string;
  key:
    | "BREAKFAST"
    | "DINNER"
    | "ILP_AND_PERMITS"
    | "TRAVEL"
    | "VEHICLE_TYPE"
    | "BBQ"
    | "BONFIRE"
    | "TRIP_GUIDE"
    | "FIRST_AID_KIT";
  numberOfDays?: number | null;
  isIncluded?: boolean | null;
  vehicleType?: "SEDAN" | "SUV" | "INNOVA" | "TRAVELLER" | null;
};
type Payment = {
  id: string;
  amount: string | number;
  status: string;
  type: string;
  paymentMethod?: string | null;
  paidAt?: string | null;
  notes?: { paymentLink?: string };
};
type CrmSlot = {
  id: string;
  title?: string | null;
  startDate: string;
  endDate: string;
  capacity: number;
  filledSpots: number;
  _count?: { bookings: number };
};
type Booking = {
  id: string;
  bookingReference: string;
  status: string;
  paymentStatus: string;
  totalAmount: string | number;
  tokenAmount: string | number;
  amountPaid: string | number;
  amountDue: string | number;
  numberOfTravelers: number;
  createdAt: string;
  crmFestivalSlotId?: string | null;
  crmFestivalSlot?: CrmSlot | null;
  user: {
    email: string;
    profile?: { fullName?: string | null; phone?: string | null } | null;
  };
  payments: Payment[];
};
type Festival = {
  id: string;
  name: string;
  numberOfNights: number;
  totalAmount: string | number;
  tokenAmount: string | number;
  operationsReminderDays: number;
  destination: Master;
  itineraryDays: Day[];
  inclusions: Inclusion[];
  commonInclusions: CommonInclusion[];
  slots: CrmSlot[];
};

const message = (error: any, fallback: string) =>
  error?.response?.data?.message || fallback;

export default function CrmFestivalDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [createBookingOpen, setCreateBookingOpen] = useState(false);
  const [installmentBooking, setInstallmentBooking] = useState<Booking | null>(
    null,
  );
  const [activeTab, setActiveTab] = useState<
    "stays" | "bookings" | "operations" | "ledger"
  >("stays");
  const tripQuery = useQuery({
    queryKey: ["crm-festival", id],
    queryFn: async ({ signal }) => (await apiClient.get(`/crm-festivals/${id}`, { signal })).data as Festival,
    enabled: Boolean(id),
  });
  const festival = tripQuery.data;
  const bookingsQuery = useQuery({
    queryKey: ["crm-festival-bookings", id],
    queryFn: async ({ signal }) =>
      (await apiClient.get(`/crm-festivals/${id}/bookings`, { signal })).data as Booking[],
    enabled: Boolean(id) && activeTab === "bookings",
  });
  const placesQuery = useQuery({
    queryKey: ["crm", "places"],
    queryFn: async ({ signal }) =>
      (await apiClient.get("/places", {
        signal,
          params: { activeOnly: true, limit: 500 },
      })).data.data as Master[],
    enabled: Boolean(festival) && activeTab === "stays",
    staleTime: 60_000,
  });
  const staysQuery = useQuery({
    queryKey: ["crm", "stays", festival?.destination.id],
    queryFn: async ({ signal }) =>
      (await apiClient.get("/stay-locations", {
        signal,
          params: {
          destinationId: festival!.destination.id,
          activeOnly: true,
          limit: 200,
        },
      })).data.data as Master[],
    enabled: Boolean(festival) && activeTab === "stays",
    staleTime: 60_000,
  });
  const propertiesQuery = useQuery({
    queryKey: ["crm", "properties"],
    queryFn: async ({ signal }) =>
      (await apiClient.get("/properties", {
        signal,
          params: { activeOnly: true, limit: 500 },
      })).data.data as Master[],
    enabled: Boolean(festival) && activeTab === "stays",
    staleTime: 60_000,
  });
  const transfersQuery = useQuery({
    queryKey: ["crm", "transfers", festival?.destination.id],
    queryFn: async ({ signal }) =>
      (await apiClient.get("/transfer-locations", {
        signal,
          params: {
          destinationId: festival!.destination.id,
          activeOnly: true,
          limit: 200,
        },
      })).data.data as Master[],
    enabled: Boolean(festival) && activeTab === "stays",
    staleTime: 60_000,
  });
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["crm-festival", id] });
  const refreshBookings = () =>
    queryClient.invalidateQueries({ queryKey: ["crm-festival-bookings", id] });
  const request = async (call: () => Promise<unknown>, success?: string) => {
    try {
      await call();
      if (success) toast.success(success);
      refresh();
    } catch (error) {
      toast.error(message(error, "Could not save change"));
    }
  };

  if (tripQuery.isPending && id) {
    return (
      <div className="py-20 text-center text-gray-500">
        <Loader2 className="mx-auto mb-3 h-5 w-5 animate-spin" />Loading
        itinerary…
      </div>
    );
  }
  if (!festival) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-800">
        {message(tripQuery.error, "This CRM festival could not be loaded.")}{" "}
        <button type="button" className="underline" onClick={() => void tripQuery.refetch()}>Retry</button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      <Link
        to="/dashboard/crm-festivals"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-[#781216]"
      >
        <ArrowLeft className="h-4 w-4" />All itinerary trips
      </Link>
      <header className="rounded-xl border border-gray-200 bg-white p-5 md:p-6">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#b59410]">
              {festival.destination.name}
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-gray-900">
              {festival.name}
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              {festival.numberOfNights} nights · {festival.itineraryDays.length}{" "}
              itinerary days · ₹{Number(festival.totalAmount).toLocaleString(
                "en-IN",
              )} total · ₹{Number(festival.tokenAmount).toLocaleString("en-IN")}
              {" "}
              token
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => setCreateBookingOpen(true)}
              className="bg-[#781216] text-white hover:bg-[#5f0e11]"
            >
              <UserPlus className="mr-2 h-4 w-4" />Create booking
            </Button>
          </div>
        </div>
      </header>
      <div className="flex overflow-x-auto border-b border-gray-200">
        <button
          type="button"
          onClick={() => setActiveTab("stays")}
          className={`shrink-0 border-b-2 px-4 py-3 text-sm font-semibold ${
            activeTab === "stays"
              ? "border-[#781216] text-[#781216]"
              : "border-transparent text-gray-500"
          }`}
        >
          Itinerary
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("bookings")}
          className={`shrink-0 border-b-2 px-4 py-3 text-sm font-semibold ${
            activeTab === "bookings"
              ? "border-[#781216] text-[#781216]"
              : "border-transparent text-gray-500"
          }`}
        >
          Bookings
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("operations")}
          className={`shrink-0 border-b-2 px-4 py-3 text-sm font-semibold ${
            activeTab === "operations"
              ? "border-[#781216] text-[#781216]"
              : "border-transparent text-gray-500"
          }`}
        >
          Operations calendar
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("ledger")}
          className={`shrink-0 border-b-2 px-4 py-3 text-sm font-semibold ${
            activeTab === "ledger"
              ? "border-[#781216] text-[#781216]"
              : "border-transparent text-gray-500"
          }`}
        >
          Ledger
        </button>
      </div>
      {activeTab === "stays"
        ? (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    Itinerary builder
                  </h2>
                  <p className="text-sm text-gray-500">
                    Every change updates generated inclusions automatically.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    request(
                      () =>
                        apiClient.post(`/crm-festivals/${id}/itinerary-days`, {}),
                      "Day added",
                    )}
                >
                  <Plus className="mr-1.5 h-4 w-4" />Add day
                </Button>
              </div>
              {festival.itineraryDays.map((day, index) => (
                <DayCard
                  key={day.id}
                  day={day}
                  places={placesQuery.data || []}
                  stays={staysQuery.data || []}
                  properties={propertiesQuery.data || []}
                  transfers={transfersQuery.data || []}
                  request={request}
                  canDelete={festival.itineraryDays.length > 1 &&
                    index === festival.itineraryDays.length - 1}
                  onDelete={() =>
                    request(
                      () =>
                        apiClient.delete(`/crm-festivals/itinerary-days/${day.id}`),
                      "Final day removed",
                    )}
                />
              ))}
            </section>
            <aside className="space-y-4 xl:sticky xl:top-4 xl:h-fit">
              <CommonInclusions
                commonInclusions={festival.commonInclusions || []}
                festivalId={id}
                request={request}
              />
              <div className="rounded-xl border border-gray-200 bg-white">
                <div className="border-b px-5 py-4">
                  <h2 className="font-bold text-gray-900">
                    Generated inclusions
                  </h2>
                  <p className="mt-1 text-xs text-gray-500">
                    Read-only and synchronized from the itinerary.
                  </p>
                </div>
                <div className="divide-y divide-gray-100">
                  {festival.inclusions.map((inclusion) => (
                    <div key={inclusion.id} className="px-5 py-3">
                      <p className="flex items-start gap-2 text-sm font-medium text-gray-800">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                        {inclusion.title}
                      </p>
                      {inclusion.description && (
                        <p className="ml-6 mt-1 text-xs leading-relaxed text-gray-500">
                          {inclusion.description}
                        </p>
                      )}
                    </div>
                  ))}
                  {!festival.inclusions.length && (
                    <p className="px-5 py-8 text-center text-sm text-gray-500">
                      No inclusions yet.
                    </p>
                  )}
                </div>
              </div>
            </aside>
          </div>
        )
        : activeTab === "bookings"
        ? (
          bookingsQuery.isError && !bookingsQuery.data ? (
            <div role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-800">
              {message(bookingsQuery.error, "Bookings could not be loaded.")}{" "}
              <button type="button" className="underline" onClick={() => void bookingsQuery.refetch()}>Retry</button>
            </div>
          ) : (
            <BookingPanel
              bookings={bookingsQuery.data || []}
              loading={bookingsQuery.isPending}
              onCreate={() => setCreateBookingOpen(true)}
              onInstallment={setInstallmentBooking}
              onOpen={(booking) =>
                navigate(`/dashboard/crm-festivals/${id}/bookings/${booking.id}`)}
            />
          )
        )
        : activeTab === "operations"
        ? <CrmOperationsCalendar festivalId={id} />
        : <CrmFestivalLedger festivalId={id} />}
      <CrmBookingDetailsDialog
        open={createBookingOpen}
        onOpenChange={setCreateBookingOpen}
        festival={festival}
        onCreated={refreshBookings}
      />
      <InstallmentDialog
        festivalId={id}
        booking={installmentBooking}
        onOpenChange={(open) => {
          if (!open) setInstallmentBooking(null);
        }}
        onCreated={refreshBookings}
      />
    </div>
  );
}

type CalendarTask = {
  id: string;
  title: string;
  description?: string | null;
  category: string;
  status: string;
  dueAt?: string | null;
  unitPrice?: string | number | null;
  quantityAcquired?: number | null;
  quantityNeeded?: number | null;
  booking: {
    id: string;
    bookingReference: string;
    user: { email: string; profile?: { fullName?: string | null } | null };
  };
};
type CalendarBooking = {
  id: string;
  bookingReference: string;
  numberOfTravelers: number;
  user: { email: string; profile?: { fullName?: string | null } | null };
};
const isoDate = (value: string | Date) =>
  new Date(value).toISOString().slice(0, 10);
const calendarDates = (start: string, end: string) => {
  const values: string[] = [];
  const cursor = new Date(start);
  const last = isoDate(end);
  while (isoDate(cursor) <= last) {
    values.push(isoDate(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return values;
};

function CrmOperationsCalendar({ festivalId }: { festivalId: string }) {
  const queryClient = useQueryClient();
  const [slotId, setSlotId] = useState("");
  const [selectedTask, setSelectedTask] = useState<CalendarTask | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const operationsQuery = useQuery({
    queryKey: ["crm-festival-operations", festivalId, slotId],
    queryFn: async () =>
      (await apiClient.get(`/crm-festivals/${festivalId}/operations`, {
        params: slotId ? { slotId } : {},
      })).data,
    enabled: Boolean(festivalId),
  });
  const data = operationsQuery.data as {
    slots: CrmSlot[];
    slot: CrmSlot;
    tasks: CalendarTask[];
    bookings: CalendarBooking[];
  } | undefined;
  const refresh = () => {
    queryClient.invalidateQueries({
      queryKey: ["crm-festival-operations", festivalId],
    });
    queryClient.invalidateQueries({ queryKey: ["crm-festival-ledger", festivalId] });
    queryClient.invalidateQueries({ queryKey: ["admin", "operations"] });
    queryClient.invalidateQueries({ queryKey: ["admin", "ledger"] });
  };
  if (operationsQuery.isLoading) {
    return (
      <div className="py-16 text-center text-sm text-gray-500">
        <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />Loading
        operations…
      </div>
    );
  }
  if (!data?.slot) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
        Add a dated departure slot before viewing operations.
      </div>
    );
  }
  const tasksByDate = new Map<string, CalendarTask[]>();
  for (const task of data.tasks) {
    if (!task.dueAt) continue;
    const key = isoDate(task.dueAt);
    tasksByDate.set(key, [...(tasksByDate.get(key) || []), task]);
  }
  const today = isoDate(new Date());
  return (
    <section className="space-y-4">
      <div className="flex flex-col justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#b59410]">
            Departure operations
          </p>
          <h2 className="mt-1 text-xl font-bold text-gray-900">
            All-booking task calendar
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Tasks are individual to each booking; click a card to record cost,
            quantity, or completion.
          </p>
        </div>
        <div className="flex gap-2">
          <select
            value={slotId || data.slot.id}
            onChange={(e) => setSlotId(e.target.value)}
            className="h-9 max-w-xs rounded-md border border-input bg-white px-3 text-sm"
          >
            {data.slots.map((slot) => (
              <option key={slot.id} value={slot.id}>
                {new Date(slot.startDate).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                })} – {new Date(slot.endDate).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                })}
                {slot.title ? ` · ${slot.title}` : ""}
              </option>
            ))}
          </select>
          <Button
            type="button"
            variant="outline"
            onClick={() => setManualOpen(true)}
            disabled={!data.bookings.length}
          >
            <Plus className="mr-1 h-4 w-4" />Task
          </Button>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {calendarDates(data.slot.startDate, data.slot.endDate).map((date) => {
          const tasks = tasksByDate.get(date) || [];
          const active = tasks.filter((task) => task.status !== "CANCELLED");
          const overdue = active.some((task) =>
            task.status !== "DONE" && date < today
          );
          const allDone = active.length > 0 &&
            active.every((task) => task.status === "DONE");
          const state = overdue
            ? "border-red-300 bg-red-50"
            : !active.length
            ? "border-gray-200 bg-white"
            : allDone
            ? "border-emerald-300 bg-emerald-50"
            : "border-amber-300 bg-amber-50";
          return (
            <div
              key={date}
              className={`flex h-[34rem] min-h-0 flex-col rounded-xl border p-3 ${state}`}
            >
              <div className="mb-3 flex shrink-0 items-center justify-between">
                <div>
                  <p className="font-bold text-gray-900">
                    {new Date(`${date}T00:00:00Z`).toLocaleDateString("en-IN", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                    })}
                  </p>
                  <p className="text-[11px] text-gray-500">
                    {tasks.length} task{tasks.length === 1 ? "" : "s"}
                  </p>
                </div>
                <CalendarDays className="h-4 w-4 text-gray-400" />
              </div>
              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                {tasks.map((task) => (
                  <button
                    type="button"
                    key={task.id}
                    onClick={() => setSelectedTask(task)}
                    className={`w-full rounded-md border border-black/5 bg-white/85 px-2.5 py-2 text-left text-xs shadow-sm hover:ring-1 hover:ring-[#781216] ${
                      task.status === "DONE"
                        ? "text-gray-400 line-through"
                        : "text-gray-800"
                    }`}
                  >
                    <p className="font-semibold">{task.title}</p>
                    <p className="mt-0.5 text-[11px] text-gray-500 no-underline">
                      {task.booking.bookingReference} ·{" "}
                      {task.booking.user.profile?.fullName ||
                        task.booking.user.email}
                    </p>
                  </button>
                ))}
                {!tasks.length && (
                  <p className="py-8 text-center text-xs text-gray-400">
                    No tasks
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <TaskCompletionDialog
        task={selectedTask}
        onOpenChange={(open) => {
          if (!open) setSelectedTask(null);
        }}
        onSaved={refresh}
      />
      <ManualCalendarTaskDialog
        open={manualOpen}
        onOpenChange={setManualOpen}
        bookings={data.bookings}
        dates={calendarDates(data.slot.startDate, data.slot.endDate)}
        onSaved={refresh}
      />
    </section>
  );
}

function TaskCompletionDialog(
  { task, onOpenChange, onSaved }: {
    task: CalendarTask | null;
    onOpenChange: (value: boolean) => void;
    onSaved: () => void;
  },
) {
  const [unitPrice, setUnitPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    setUnitPrice(task?.unitPrice == null ? "" : String(task.unitPrice));
    setQuantity(
      task?.quantityAcquired == null ? "" : String(task.quantityAcquired),
    );
    setDone(task?.status === "DONE");
  }, [task]);
  const save = async () => {
    if (!task) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        status: done ? "DONE" : task.status,
      };
      if (unitPrice !== "") payload.unitPrice = Number(unitPrice);
      if (quantity !== "") payload.quantityAcquired = Number(quantity);
      await apiClient.patch(`/operations/${task.id}`, payload);
      toast.success(done ? "Task completed" : "Task updated");
      onSaved();
      onOpenChange(false);
    } catch (error) {
      toast.error(message(error, "Could not update task"));
    } finally {
      setSaving(false);
    }
  };
  return (
    <Dialog open={Boolean(task)} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Operation task</DialogTitle>
        </DialogHeader>
        {task && (
          <div className="space-y-4">
            <div>
              <p
                className={`font-semibold ${
                  task.status === "DONE"
                    ? "line-through text-gray-400"
                    : "text-gray-900"
                }`}
              >
                {task.title}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                {task.booking.bookingReference} ·{" "}
                {task.booking.user.profile?.fullName || task.booking.user.email}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Unit cost (₹)">
                <Input
                  min="0"
                  step="0.01"
                  type="number"
                  placeholder="Optional"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                />
              </Field>
              <Field label="Quantity acquired">
                <Input
                  min="0"
                  step="1"
                  type="number"
                  placeholder="Defaults to 1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </Field>
            </div>
            <p className="-mt-2 text-xs text-gray-500">
              Saving a unit cost without a quantity records one unit in the
              ledger.
            </p>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <input
                type="checkbox"
                checked={done || task.status === "DONE"}
                disabled={task.status === "DONE"}
                onChange={(e) => setDone(e.target.checked)}
              />Mark this task complete
            </label>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                disabled={saving}
                onClick={save}
                className="bg-[#781216] text-white hover:bg-[#5f0e11]"
              >
                {saving && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}Save
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ManualCalendarTaskDialog(
  { open, onOpenChange, bookings, dates, onSaved }: {
    open: boolean;
    onOpenChange: (value: boolean) => void;
    bookings: CalendarBooking[];
    dates: string[];
    onSaved: () => void;
  },
) {
  const [bookingId, setBookingId] = useState("");
  const [title, setTitle] = useState("");
  const [dueAt, setDueAt] = useState(dates[0] || "");
  const [saving, setSaving] = useState(false);
  const save = async () => {
    if (!bookingId || !title.trim() || !dueAt) {
      return toast.error("Choose a booking, date, and task title");
    }
    setSaving(true);
    try {
      await apiClient.post(`/operations/bookings/${bookingId}`, {
        title: title.trim(),
        category: "GENERAL",
        dueAt: new Date(`${dueAt}T00:00:00Z`).toISOString(),
      });
      toast.success("Task added");
      setBookingId("");
      setTitle("");
      onSaved();
      onOpenChange(false);
    } catch (error) {
      toast.error(message(error, "Could not add task"));
    } finally {
      setSaving(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add booking task</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Field label="Booking">
            <select
              className="h-9 w-full rounded-md border border-input bg-white px-3 text-sm"
              value={bookingId}
              onChange={(e) => setBookingId(e.target.value)}
            >
              <option value="">Choose a booking</option>
              {bookings.map((booking) => (
                <option key={booking.id} value={booking.id}>
                  {booking.bookingReference} ·{" "}
                  {booking.user.profile?.fullName || booking.user.email}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Task title">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Confirm special room request"
            />
          </Field>
          <Field label="Calendar date">
            <select
              className="h-9 w-full rounded-md border border-input bg-white px-3 text-sm"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
            >
              {dates.map((date) => (
                <option key={date} value={date}>
                  {new Date(`${date}T00:00:00Z`).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </option>
              ))}
            </select>
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              disabled={saving}
              onClick={save}
              className="bg-[#781216] text-white hover:bg-[#5f0e11]"
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Add
              task
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

type CrmLedgerEntry = {
  id: string;
  entryDate: string;
  type: "INCOME" | "EXPENSE";
  scope: string;
  source: string;
  category: string;
  description?: string | null;
  amount: string | number;
  booking?: {
    bookingReference: string;
    user?:
      | { email: string; profile?: { fullName?: string | null } | null }
      | null;
  } | null;
};

function CrmFestivalLedger({ festivalId }: { festivalId: string }) {
  const ledgerQuery = useQuery({
    queryKey: ["crm-festival-ledger", festivalId],
    queryFn: async () =>
      (await apiClient.get("/ledgers", { params: { crmTripId: festivalId } }))
        .data as {
          entries: CrmLedgerEntry[];
          summary: {
            tripIncome: number;
            tripExpense: number;
            netBalance: number;
          };
        },
    enabled: Boolean(festivalId),
  });
  const data = ledgerQuery.data;
  const amount = (value: string | number) =>
    `₹${Number(value).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
  if (ledgerQuery.isLoading) {
    return (
      <div className="py-16 text-center text-sm text-gray-500">
        <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />Loading festival
        ledger…
      </div>
    );
  }
  return (
    <section className="space-y-5">
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#b59410]">
          Festival financials
        </p>
        <h2 className="mt-1 text-xl font-bold text-gray-900">
          CRM festival ledger
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Booking receipts and operation costs for this festival. Operation costs
          appear once a task has both a unit cost and acquired quantity.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <LedgerSummary
          label="Booking income"
          value={data?.summary.tripIncome || 0}
          tone="text-emerald-700"
        />
        <LedgerSummary
          label="Operation costs"
          value={data?.summary.tripExpense || 0}
          tone="text-red-700"
        />
        <LedgerSummary
          label="Net collected"
          value={data?.summary.netBalance || 0}
          tone={(data?.summary.netBalance || 0) < 0
            ? "text-red-700"
            : "text-gray-900"}
        />
      </div>
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="border-b px-5 py-4">
          <h3 className="font-bold text-gray-900">Entries</h3>
          <p className="mt-1 text-xs text-gray-500">
            Automatically linked to CRM bookings in this itinerary.
          </p>
        </div>
        {!data?.entries.length
          ? (
            <div className="p-10 text-center text-sm text-gray-500">
              No booking receipts or operation costs have been recorded yet.
            </div>
          )
          : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Date</th>
                    <th className="px-5 py-3 font-semibold">Entry</th>
                    <th className="px-5 py-3 font-semibold">Booking</th>
                    <th className="px-5 py-3 font-semibold">Source</th>
                    <th className="px-5 py-3 text-right font-semibold">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.entries.map((entry) => {
                    const customer = entry.booking?.user?.profile?.fullName ||
                      entry.booking?.user?.email || "CRM booking";
                    return (
                      <tr key={entry.id}>
                        <td className="whitespace-nowrap px-5 py-3 text-gray-600">
                          {new Date(entry.entryDate).toLocaleDateString(
                            "en-IN",
                            { day: "numeric", month: "short", year: "numeric" },
                          )}
                        </td>
                        <td className="px-5 py-3">
                          <p className="font-medium text-gray-900">
                            {entry.category}
                          </p>
                          {entry.description && (
                            <p className="mt-0.5 text-xs text-gray-500">
                              {entry.description}
                            </p>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          <p className="font-medium text-gray-800">
                            {entry.booking?.bookingReference || "—"}
                          </p>
                          <p className="text-xs text-gray-500">{customer}</p>
                        </td>
                        <td className="px-5 py-3">
                          <span
                            className={`rounded-full px-2 py-1 text-[11px] font-bold ${
                              entry.type === "INCOME"
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-red-50 text-red-700"
                            }`}
                          >
                            {entry.type === "INCOME" ? "Income" : "Expense"}
                          </span>
                          <p className="mt-1 text-[11px] text-gray-500">
                            {entry.source}
                          </p>
                        </td>
                        <td
                          className={`px-5 py-3 text-right font-bold ${
                            entry.type === "INCOME"
                              ? "text-emerald-700"
                              : "text-red-700"
                          }`}
                        >
                          {entry.type === "INCOME" ? "+" : "−"}
                          {amount(entry.amount)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
      </div>
    </section>
  );
}

function LedgerSummary(
  { label, value, tone }: { label: string; value: number; tone: string },
) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p className={`mt-2 text-2xl font-bold ${tone}`}>
        ₹{Number(value).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
      </p>
    </div>
  );
}

function BookingPanel({
  bookings,
  loading,
  onCreate,
  onInstallment,
  onOpen,
}: {
  bookings: Booking[];
  loading: boolean;
  onCreate: () => void;
  onInstallment: (booking: Booking) => void;
  onOpen: (booking: Booking) => void;
}) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b px-5 py-4">
        <div>
          <h2 className="font-bold text-gray-900">CRM bookings</h2>
          <p className="mt-1 text-xs text-gray-500">
            Payments and balances for this festival.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={onCreate}>
          <Plus className="mr-1 h-3.5 w-3.5" />New
        </Button>
      </div>
      <div className="divide-y divide-gray-100">
        {loading
          ? (
            <div className="p-5 text-center text-sm text-gray-500">
              <Loader2 className="mx-auto mb-2 h-4 w-4 animate-spin" />Loading
              bookings…
            </div>
          )
          : bookings.map((booking) => {
            const paid = Number(booking.amountPaid);
            const due = Number(booking.amountDue);
            const activeLink = booking.payments.find((payment) =>
              payment.status === "CREATED" || payment.status === "PENDING"
            );
            return (
              <div
                key={booking.id}
                role="button"
                tabIndex={0}
                onClick={() => onOpen(booking)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onOpen(booking);
                  }
                }}
                className="space-y-2 cursor-pointer p-4 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#781216]"
              >
                <div className="flex justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-900">
                      {booking.user.profile?.fullName || booking.user.email}
                    </p>
                    <p className="text-xs text-gray-500">
                      {booking.bookingReference} · {booking.numberOfTravelers}
                      {" "}
                      traveler{booking.numberOfTravelers === 1 ? "" : "s"}
                    </p>
                  </div>
                  <span
                    className={`h-fit rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      due === 0
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {due === 0 ? "PAID" : "BALANCE DUE"}
                  </span>
                </div>
                <p className="text-xs text-gray-600">
                  Paid <strong>₹{paid.toLocaleString("en-IN")}</strong> · Due
                  {" "}
                  <strong>₹{due.toLocaleString("en-IN")}</strong>
                </p>
                {activeLink && (
                  <p className="rounded bg-blue-50 px-2 py-1 text-xs text-blue-700">
                    Razorpay link for ₹{Number(activeLink.amount)
                      .toLocaleString("en-IN")} is awaiting payment.
                  </p>
                )}
                {due > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    disabled={Boolean(activeLink)}
                    onClick={(event) => {
                      event.stopPropagation();
                      onInstallment(booking);
                    }}
                  >
                    <CreditCard className="mr-1.5 h-3.5 w-3.5" />Record or
                    request installment
                  </Button>
                )}
              </div>
            );
          })}
        {!loading && !bookings.length && (
          <div className="p-6 text-center text-sm text-gray-500">
            No CRM bookings yet.
          </div>
        )}
      </div>
    </section>
  );
}

function CrmBookingDialog(
  { open, onOpenChange, festival, onCreated }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    festival: Festival;
    onCreated: () => void;
  },
) {
  const [form, setForm] = useState({
    email: "",
    fullName: "",
    phone: "",
    gender: "",
    dateOfBirth: "",
    govtIdAssetId: "",
    crmFestivalSlotId: "",
    numberOfTravelers: 1,
    additionalTravelers: [] as any[],
    specialRequests: "",
    paymentAmount: String(festival.tokenAmount),
    paymentAction: "MANUAL",
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const update = (field: string, value: any) =>
    setForm((current) => ({ ...current, [field]: value }));
  const setTravelers = (value: string) => {
    const count = Math.max(1, Number(value) || 1);
    const extras = [...form.additionalTravelers];
    while (extras.length < count - 1) {
      extras.push({
        fullName: "",
        email: "",
        phone: "",
        gender: "",
        dateOfBirth: "",
        aadhaar: "",
        aadhaarAssetId: "",
      });
    }
    extras.length = Math.max(0, count - 1);
    setForm((current) => ({
      ...current,
      numberOfTravelers: count,
      additionalTravelers: extras,
    }));
  };
  const updateTraveler = (index: number, field: string, value: string) => {
    const extras = [...form.additionalTravelers];
    extras[index] = { ...extras[index], [field]: value };
    update("additionalTravelers", extras);
  };
  const upload = async (
    file: File | undefined,
    key: string,
    index?: number,
  ) => {
    if (!file) return;
    setUploading(key);
    try {
      const body = new FormData();
      body.append("image", file);
      const result = await apiClient.post("/bookings/traveler/govt-id", body, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (index === undefined) update("govtIdAssetId", result.data.assetId);
      else updateTraveler(index, "aadhaarAssetId", result.data.assetId);
      toast.success("Government ID uploaded");
    } catch {
      toast.error("Could not upload government ID");
    } finally {
      setUploading(null);
    }
  };
  const submit = async () => {
    const amount = Number(form.paymentAmount);
    if (!form.email || !form.fullName || !amount) {
      return toast.error("Customer details and payment amount are required");
    }
    if (!form.crmFestivalSlotId) return toast.error("Choose a departure slot");
    if (amount > Number(festival.totalAmount)) {
      return toast.error("The first payment cannot exceed the festival total");
    }
    setSaving(true);
    try {
      await apiClient.post(`/crm-festivals/${festival.id}/bookings`, {
        ...form,
        paymentAmount: amount,
      });
      toast.success(
        form.paymentAction === "SEND_LINK"
          ? "Website payment link emailed"
          : "Booking and payment recorded",
      );
      onCreated();
      onOpenChange(false);
      setForm({
        email: "",
        fullName: "",
        phone: "",
        gender: "",
        dateOfBirth: "",
        govtIdAssetId: "",
        crmFestivalSlotId: "",
        numberOfTravelers: 1,
        additionalTravelers: [],
        specialRequests: "",
        paymentAmount: "",
        paymentAction: "MANUAL",
      });
    } catch (error: any) {
      toast.error(message(error, "Could not create CRM booking"));
    } finally {
      setSaving(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Create CRM booking</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <div className="rounded-lg bg-[#fcf4e7] p-4 text-sm text-[#6f4c08]">
            <strong>{festival.name}</strong>
            <br />Festival total ₹{Number(festival.totalAmount).toLocaleString("en-IN")}
            {" "}
            · Token reference ₹{Number(festival.tokenAmount).toLocaleString(
              "en-IN",
            )}
          </div>
          <div>
            <h3 className="mb-3 text-sm font-bold text-gray-900">
              Lead traveler
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Full name">
                <Input
                  value={form.fullName}
                  onChange={(e) => update("fullName", e.target.value)}
                />
              </Field>
              <Field label="Email">
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                />
              </Field>
              <Field label="Phone">
                <Input
                  value={form.phone}
                  onChange={(e) => update("phone", e.target.value)}
                />
              </Field>
              <Field label="Gender">
                <select
                  className="h-9 w-full rounded-md border border-input bg-white px-3 text-sm"
                  value={form.gender}
                  onChange={(e) => update("gender", e.target.value)}
                >
                  <option value="">Not specified</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                  <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
                </select>
              </Field>
              <Field label="Date of birth">
                <Input
                  type="date"
                  value={form.dateOfBirth}
                  onChange={(e) => update("dateOfBirth", e.target.value)}
                />
              </Field>
              <Field label="Government ID">
                <Input
                  type="file"
                  accept="image/*,.pdf"
                  disabled={uploading === "lead"}
                  onChange={(e) => upload(e.target.files?.[0], "lead")}
                />
                <p className="text-xs text-gray-500">
                  {uploading === "lead"
                    ? "Uploading…"
                    : form.govtIdAssetId
                    ? "Uploaded"
                    : "Optional"}
                </p>
              </Field>
            </div>
          </div>
          <div>
            <div className="mb-3 flex items-end justify-between">
              <h3 className="text-sm font-bold text-gray-900">Travelers</h3>
              <label className="text-sm text-gray-600">
                Total{" "}
                <Input
                  className="ml-2 inline-flex w-20"
                  min="1"
                  type="number"
                  value={form.numberOfTravelers}
                  onChange={(e) => setTravelers(e.target.value)}
                />
              </label>
            </div>
            <div className="space-y-3">
              {form.additionalTravelers.map((traveler, index) => (
                <div
                  key={index}
                  className="grid gap-2 rounded-lg border border-gray-200 p-3 sm:grid-cols-2"
                >
                  <Input
                    placeholder={`Traveler ${index + 2} name`}
                    value={traveler.fullName}
                    onChange={(e) =>
                      updateTraveler(index, "fullName", e.target.value)}
                  />
                  <Input
                    placeholder="Email"
                    value={traveler.email}
                    onChange={(e) =>
                      updateTraveler(index, "email", e.target.value)}
                  />
                  <Input
                    placeholder="Phone"
                    value={traveler.phone}
                    onChange={(e) =>
                      updateTraveler(index, "phone", e.target.value)}
                  />
                  <Input
                    type="date"
                    value={traveler.dateOfBirth}
                    onChange={(e) =>
                      updateTraveler(index, "dateOfBirth", e.target.value)}
                  />
                  <select
                    className="h-9 rounded-md border border-input bg-white px-3 text-sm"
                    value={traveler.gender}
                    onChange={(e) =>
                      updateTraveler(index, "gender", e.target.value)}
                  >
                    <option value="">Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                  <Input
                    type="file"
                    accept="image/*,.pdf"
                    disabled={uploading === `traveler-${index}`}
                    onChange={(e) =>
                      upload(e.target.files?.[0], `traveler-${index}`, index)}
                  />
                </div>
              ))}
            </div>
          </div>
          <Field label="Special requests">
            <Textarea
              value={form.specialRequests}
              onChange={(e) => update("specialRequests", e.target.value)}
              placeholder="Optional notes"
            />
          </Field>
          <div className="rounded-lg border border-gray-200 p-4">
            <h3 className="mb-1 text-sm font-bold text-gray-900">
              First payment
            </h3>
            <p className="mb-3 text-xs text-gray-500">
              Enter the amount first, then choose whether it was received
              manually or should be requested through Razorpay.
            </p>
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <Field label="Amount received / requested">
                <Input
                  min="0.01"
                  max={String(festival.totalAmount)}
                  step="0.01"
                  type="number"
                  value={form.paymentAmount}
                  onChange={(e) => update("paymentAmount", e.target.value)}
                />
              </Field>
              <Field label="Collection method">
                <select
                  className="h-9 w-full rounded-md border border-input bg-white px-3 text-sm"
                  value={form.paymentAction}
                  onChange={(e) => update("paymentAction", e.target.value)}
                >
                  <option value="MANUAL">Received manually</option>
                  <option value="SEND_LINK">Send website payment link</option>
                </select>
              </Field>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              disabled={saving}
              onClick={submit}
              className="bg-[#781216] text-white hover:bg-[#5f0e11]"
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {form.paymentAction === "SEND_LINK"
                ? "Create & send payment link"
                : "Create booking"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

type CrmAdditionalTraveler = {
  fullName: string;
  email: string;
  phone: string;
  gender: string;
  dateOfBirth: string;
  aadhaarAssetId: string;
};

function CrmBookingDetailsDialog(
  { open, onOpenChange, festival, onCreated }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    festival: Festival;
    onCreated: () => void;
  },
) {
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    gender: "",
    dateOfBirth: "",
    govtIdAssetId: "",
    crmFestivalSlotId: "",
    numberOfTravelers: "1",
    additionalTravelers: [] as CrmAdditionalTraveler[],
    paymentAmount: "",
    paymentAction: "MANUAL",
    specialRequests: "",
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [linkAmountChoice, setLinkAmountChoice] = useState("100");

  const packages = festival.packages || [];
  const addOns = festival.addOns || [];

  const [packageId, setPackageId] = useState("");
  const [selectedAddOns, setSelectedAddOns] = useState<Record<string, number>>({});

  useEffect(() => {
    if (packages.length > 0 && !packageId) {
      setPackageId(packages[0].id);
    }
  }, [packages, packageId]);

  const selectedPackage = packages.find((p: any) => p.id === packageId);
  const basePrice = selectedPackage ? Number(selectedPackage.price) : Number(festival.totalAmount || 0);
  const tokenPrice = selectedPackage ? Number(selectedPackage.tokenAmount) : Number(festival.tokenAmount || 0);
  const numTravelers = Math.max(1, Number(form.numberOfTravelers) || 1);

  let addOnsPrice = 0;
  Object.entries(selectedAddOns).forEach(([id, qty]) => {
    const addon = addOns.find((a: any) => a.id === id);
    if (addon) addOnsPrice += Number(addon.price) * qty;
  });

  const totalPrice = basePrice * numTravelers + addOnsPrice;
  const recommendedTokenPrice = tokenPrice * numTravelers;
  const totalWithGst = Math.round((totalPrice * 1.05 + Number.EPSILON) * 100) / 100;
  const paymentLinkOptions = [10, 25, 50, 75, 100].map((percentage) => ({
    value: String(percentage),
    amount: Math.round((totalWithGst * percentage / 100 + Number.EPSILON) * 100) / 100,
  })).filter((option, index, options) => option.amount > 0 &&
    options.findIndex((candidate) => candidate.amount === option.amount) === index
  );

  useEffect(() => {
    if (recommendedTokenPrice > 0 && form.paymentAction === "MANUAL") {
      setForm((current) => ({ ...current, paymentAmount: String(recommendedTokenPrice) }));
    }
  }, [recommendedTokenPrice, form.paymentAction]);

  useEffect(() => {
    if (form.paymentAction !== "SEND_LINK" || linkAmountChoice === "CUSTOM") return;
    const option = paymentLinkOptions.find((item) => item.value === linkAmountChoice);
    if (option) setForm((current) => ({ ...current, paymentAmount: String(option.amount) }));
  }, [totalWithGst, form.paymentAction, linkAmountChoice]);

  useEffect(() => {
    if (open) {
      reset();
    }
  }, [open]);

  const update = (key: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));
  const updateTraveler = (
    index: number,
    key: keyof CrmAdditionalTraveler,
    value: string,
  ) =>
    setForm((current) => ({
      ...current,
      additionalTravelers: current.additionalTravelers.map((
        traveler,
        travelerIndex,
      ) => travelerIndex === index ? { ...traveler, [key]: value } : traveler),
    }));
  const setTravelers = (value: string) =>
    setForm((current) => {
      const count = Math.max(1, Number(value) || 1);
      const additionalTravelers = [...current.additionalTravelers];
      while (additionalTravelers.length < count - 1) {
        additionalTravelers.push({
          fullName: "",
          email: "",
          phone: "",
          gender: "",
          dateOfBirth: "",
          aadhaarAssetId: "",
        });
      }
      additionalTravelers.length = Math.max(0, count - 1);
      return {
        ...current,
        numberOfTravelers: String(count),
        additionalTravelers,
      };
    });
  const uploadAadhaar = async (
    file: File | undefined,
    key: string,
    travelerIndex?: number,
  ) => {
    if (!file) return;
    setUploading(key);
    try {
      const body = new FormData();
      body.append("image", file, file.name);
      const result = await apiClient.post("/bookings/traveler/govt-id", body, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (travelerIndex === undefined) {
        update("govtIdAssetId", result.data.assetId);
      } else {updateTraveler(
          travelerIndex,
          "aadhaarAssetId",
          result.data.assetId,
        );}
      toast.success("Aadhaar card uploaded");
    } catch {
      toast.error("Could not upload Aadhaar card");
    } finally {
      setUploading(null);
    }
  };
  const reset = () => {
    setForm({
      fullName: "",
      email: "",
      phone: "",
      gender: "",
      dateOfBirth: "",
      govtIdAssetId: "",
      crmFestivalSlotId: "",
      numberOfTravelers: "1",
      additionalTravelers: [],
      paymentAmount: String(festival.tokenAmount || ""),
      paymentAction: "MANUAL",
      specialRequests: "",
    });
    setPackageId(packages[0]?.id || "");
    setSelectedAddOns({});
    setLinkAmountChoice("100");
  };
  const setPaymentAction = (paymentAction: string) => {
    update("paymentAction", paymentAction);
    if (paymentAction === "SEND_LINK") {
      setLinkAmountChoice("100");
      update("paymentAmount", String(totalWithGst));
    } else {
      setLinkAmountChoice("100");
      update("paymentAmount", String(recommendedTokenPrice));
    }
  };
  const setPaymentLinkAmount = (choice: string) => {
    setLinkAmountChoice(choice);
    if (choice !== "CUSTOM") {
      const option = paymentLinkOptions.find((item) => item.value === choice);
      if (option) update("paymentAmount", String(option.amount));
    }
  };
  const submit = async () => {
    const travelers = Math.max(1, Number(form.numberOfTravelers) || 1);
    const amount = Number(form.paymentAmount);
    const leadComplete = form.fullName.trim() && form.email.trim() &&
      form.phone.trim() && form.gender && form.dateOfBirth &&
      form.govtIdAssetId;
    const everyAdditionalTravelerComplete = form.additionalTravelers.every((
      traveler,
    ) =>
      traveler.fullName.trim() && traveler.gender && traveler.dateOfBirth &&
      traveler.aadhaarAssetId
    );
    if (!leadComplete) {
      return toast.error(
        "Enter all lead traveler details and upload their Aadhaar card",
      );
    }
    if (!everyAdditionalTravelerComplete) {
      return toast.error(
        "Enter full name, gender, date of birth, and upload an Aadhaar card for every additional traveler",
      );
    }
    if (!form.crmFestivalSlotId || !amount) {
      return toast.error("Departure and first payment are required");
    }
    const maximumPayment = form.paymentAction === "SEND_LINK" ? totalWithGst : totalPrice;
    if (amount > maximumPayment) {
      return toast.error("The first payment cannot exceed the total booking price");
    }
    const slot = festival.slots.find((item) => item.id === form.crmFestivalSlotId);
    if (!slot || slot.capacity - slot.filledSpots < travelers) {
      return toast.error("Choose a departure with enough remaining capacity");
    }
    setSaving(true);
    try {
      await apiClient.post(`/crm-festivals/${festival.id}/bookings`, {
        ...form,
        fullName: form.fullName.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        numberOfTravelers: travelers,
        paymentAmount: amount,
        packageId: packageId || null,
        addOns: Object.entries(selectedAddOns).map(([addOnId, quantity]) => ({ addOnId, quantity })),
      });
      toast.success(
        form.paymentAction === "SEND_LINK"
          ? "Website payment link emailed"
          : "Booking and payment recorded",
      );
      reset();
      onCreated();
      onOpenChange(false);
    } catch (error) {
      toast.error(message(error, "Could not create CRM booking"));
    } finally {
      setSaving(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Create CRM booking</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <div className="rounded-md bg-[#fcf4e7] p-3 text-sm text-[#6f4c08]">
            <strong>{festival.name}</strong>
            <br />Record complete traveler details before creating the booking.
          </div>
          <section>
            <h3 className="mb-3 text-sm font-bold text-gray-900">
              Lead traveler
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Full name *">
                <Input
                  value={form.fullName}
                  onChange={(e) => update("fullName", e.target.value)}
                />
              </Field>
              <Field label="Email *">
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                />
              </Field>
              <Field label="Phone *">
                <Input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => update("phone", e.target.value)}
                />
              </Field>
              <Field label="Gender *">
                <select
                  className="h-9 w-full rounded-md border border-input bg-white px-3 text-sm"
                  value={form.gender}
                  onChange={(e) => update("gender", e.target.value)}
                >
                  <option value="">Select gender</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                  <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
                </select>
              </Field>
              <Field label="Date of birth *">
                <Input
                  type="date"
                  value={form.dateOfBirth}
                  onChange={(e) => update("dateOfBirth", e.target.value)}
                />
              </Field>
              <Field label="Aadhaar card *">
                <Input
                  type="file"
                  accept="image/*,.pdf"
                  disabled={uploading === "lead"}
                  onChange={(e) => uploadAadhaar(e.target.files?.[0], "lead")}
                />
                <p className="text-xs text-gray-500">
                  {uploading === "lead"
                    ? "Uploading…"
                    : form.govtIdAssetId
                    ? "Uploaded"
                    : "Clear photo or PDF"}
                </p>
              </Field>
            </div>
          </section>
          <section>
            <div className="mb-3 flex items-end justify-between gap-3">
              <h3 className="text-sm font-bold text-gray-900">
                Additional travelers
              </h3>
              <label className="text-sm text-gray-600">
                Total travelers{" "}
                <Input
                  className="ml-2 inline-flex w-20"
                  min="1"
                  type="number"
                  value={form.numberOfTravelers}
                  onChange={(e) => setTravelers(e.target.value)}
                />
              </label>
            </div>
            <div className="space-y-3">
              {form.additionalTravelers.map((traveler, index) => (
                <div
                  key={index}
                  className="rounded-lg border border-gray-200 p-3"
                >
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">
                    Traveler {index + 2}
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input
                      placeholder="Full name *"
                      value={traveler.fullName}
                      onChange={(e) =>
                        updateTraveler(index, "fullName", e.target.value)}
                    />
                    <Input
                      type="email"
                      placeholder="Email *"
                      value={traveler.email}
                      onChange={(e) =>
                        updateTraveler(index, "email", e.target.value)}
                    />
                    <Input
                      type="tel"
                      placeholder="Phone *"
                      value={traveler.phone}
                      onChange={(e) =>
                        updateTraveler(index, "phone", e.target.value)}
                    />
                    <select
                      className="h-9 rounded-md border border-input bg-white px-3 text-sm"
                      value={traveler.gender}
                      onChange={(e) =>
                        updateTraveler(index, "gender", e.target.value)}
                    >
                      <option value="">Gender *</option>
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                      <option value="OTHER">Other</option>
                      <option value="PREFER_NOT_TO_SAY">
                        Prefer not to say
                      </option>
                    </select>
                    <Input
                      type="date"
                      value={traveler.dateOfBirth}
                      onChange={(e) =>
                        updateTraveler(index, "dateOfBirth", e.target.value)}
                    />
                    <div>
                      <Input
                        type="file"
                        accept="image/*,.pdf"
                        disabled={uploading === `traveler-${index}`}
                        onChange={(e) =>
                          uploadAadhaar(
                            e.target.files?.[0],
                            `traveler-${index}`,
                            index,
                          )}
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        {uploading === `traveler-${index}`
                          ? "Uploading…"
                          : traveler.aadhaarAssetId
                          ? "Aadhaar uploaded"
                          : "Aadhaar card *"}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
          <Field label="Departure slot *">
            <select
              className="h-9 w-full rounded-md border border-input bg-white px-3 text-sm"
              value={form.crmFestivalSlotId}
              onChange={(e) => update("crmFestivalSlotId", e.target.value)}
            >
              <option value="">Choose a departure</option>
              {festival.slots.map((slot) => {
                const remaining = slot.capacity - slot.filledSpots;
                return (
                  <option
                    key={slot.id}
                    value={slot.id}
                    disabled={remaining < Number(form.numberOfTravelers || 1)}
                  >
                    {new Date(slot.startDate).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })} – {new Date(slot.endDate).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })} ({remaining} seats left)
                  </option>
                );
              })}
            </select>
          </Field>

          {packages.length > 0 && (
            <Field label="Pricing Package *">
              <select
                required
                className="h-9 w-full rounded-md border border-input bg-white px-3 text-sm"
                value={packageId}
                onChange={(e) => setPackageId(e.target.value)}
              >
                {packages.map((pkg: any) => (
                  <option key={pkg.id} value={pkg.id}>
                    {pkg.title} - ₹{Number(pkg.price).toLocaleString("en-IN")} (Token: ₹{Number(pkg.tokenAmount).toLocaleString("en-IN")} / person)
                  </option>
                ))}
              </select>
            </Field>
          )}

          {addOns.length > 0 && (
            <div className="space-y-3 border-t pt-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700">Add-Ons</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {addOns.map((addon: any) => {
                  const qty = selectedAddOns[addon.id] || 0;
                  return (
                    <div key={addon.id} className="flex items-center justify-between p-2.5 border border-gray-100 rounded-lg bg-gray-50/50 text-xs">
                      <div>
                        <div className="font-semibold text-gray-900">{addon.title}</div>
                        {addon.description && <div className="text-gray-400 mt-0.5 line-clamp-1">{addon.description}</div>}
                        <div className="font-medium text-[#781216] mt-0.5">₹{Number(addon.price).toLocaleString("en-IN")}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const newQty = Math.max(0, qty - 1);
                            setSelectedAddOns(prev => {
                              const updated = { ...prev };
                              if (newQty === 0) delete updated[addon.id];
                              else updated[addon.id] = newQty;
                              return updated;
                            });
                          }}
                          className="w-6 h-6 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 text-gray-600 font-bold"
                        >
                          -
                        </button>
                        <span className="w-4 text-center font-medium">{qty}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const newQty = qty + 1;
                            if (addon.maxQuantityPerBooking && newQty > addon.maxQuantityPerBooking) {
                              toast.error(`Maximum limit of ${addon.maxQuantityPerBooking} reached for this add-on`);
                              return;
                            }
                            setSelectedAddOns(prev => ({ ...prev, [addon.id]: newQty }));
                          }}
                          className="w-6 h-6 rounded-full border border-[#c8a96e] bg-[#c8a96e]/10 flex items-center justify-center hover:bg-[#c8a96e]/20 text-[#781216] font-bold"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <Field label="Special requests">
            <Textarea
              value={form.specialRequests}
              onChange={(e) => update("specialRequests", e.target.value)}
              placeholder="Optional notes"
            />
          </Field>
          <div className="space-y-4 border-t pt-4">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
              Payment & Summary Setup
            </h3>

            {/* Collection Action Selector Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div 
                onClick={() => setPaymentAction("MANUAL")}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  form.paymentAction === "MANUAL"
                    ? "border-[#c8a96e] bg-[#c8a96e]/10 text-gray-900 font-medium ring-1 ring-[#c8a96e]"
                    : "border-gray-200 bg-white hover:border-gray-300 text-gray-600"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider">Collect Offline / Mark Paid</span>
                  <input type="radio" checked={form.paymentAction === "MANUAL"} readOnly className="accent-[#781216]" />
                </div>
                <p className="text-[11px] text-gray-500 mt-1">Record cash or manual bank transfer. 5% GST is added at collection.</p>
              </div>

              <div 
                onClick={() => setPaymentAction("SEND_LINK")}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  form.paymentAction === "SEND_LINK"
                    ? "border-[#c8a96e] bg-[#c8a96e]/10 text-gray-900 font-medium ring-1 ring-[#c8a96e]"
                    : "border-gray-200 bg-white hover:border-gray-300 text-gray-600"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider">Send Payment Link</span>
                  <input type="radio" checked={form.paymentAction === "SEND_LINK"} readOnly className="accent-[#781216]" />
                </div>
                <p className="text-[11px] text-gray-500 mt-1">Generate Razorpay link & email to customer (charges exact GST-inclusive amount).</p>
              </div>
            </div>

            {/* Payment Preset Selection */}
            <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                Initial Payment Amount {form.paymentAction === "MANUAL" ? "(before 5% GST)" : "(including 5% GST)"}
              </label>

              {form.paymentAction === "SEND_LINK" ? (
                <div className="space-y-2">
                  <select
                    className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#c8a96e]"
                    value={linkAmountChoice}
                    onChange={(e) => setPaymentLinkAmount(e.target.value)}
                  >
                    {paymentLinkOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.value === "100" ? "Full Payment" : `${option.value}% Payment`} — ₹{option.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })} (incl. GST)
                      </option>
                    ))}
                    <option value="CUSTOM">Custom Amount…</option>
                  </select>
                  {linkAmountChoice === "CUSTOM" && (
                    <Input
                      min="0.01"
                      max={String(totalWithGst)}
                      step="0.01"
                      type="number"
                      value={form.paymentAmount}
                      onChange={(e) => update("paymentAmount", e.target.value)}
                      placeholder="Enter GST-inclusive amount (₹)"
                    />
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {recommendedTokenPrice > 0 && (
                      <button
                        type="button"
                        onClick={() => update("paymentAmount", String(recommendedTokenPrice))}
                        className={`py-2 px-3 rounded-lg border text-xs font-medium text-left transition-all ${
                          Number(form.paymentAmount) === recommendedTokenPrice
                            ? "border-[#781216] bg-[#781216]/10 text-[#781216] font-bold"
                            : "border-gray-300 bg-white hover:bg-gray-50 text-gray-700"
                        }`}
                      >
                        <div>Token Payment</div>
                        <div className="text-[11px] opacity-80">₹{recommendedTokenPrice.toLocaleString("en-IN")}</div>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => update("paymentAmount", String(totalPrice))}
                      className={`py-2 px-3 rounded-lg border text-xs font-medium text-left transition-all ${
                        Number(form.paymentAmount) === totalPrice
                          ? "border-[#781216] bg-[#781216]/10 text-[#781216] font-bold"
                          : "border-gray-300 bg-white hover:bg-gray-50 text-gray-700"
                      }`}
                    >
                      <div>Full Payment</div>
                      <div className="text-[11px] opacity-80">₹{totalPrice.toLocaleString("en-IN")}</div>
                    </button>
                  </div>
                  <div className="pt-1">
                    <label className="text-[11px] text-gray-500 block mb-1">Custom Amount before GST (₹)</label>
                    <Input
                      min="0.01"
                      max={String(totalPrice)}
                      step="0.01"
                      type="number"
                      value={form.paymentAmount}
                      onChange={(e) => update("paymentAmount", e.target.value)}
                      placeholder="Enter pre-GST amount (₹)"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Financial Summary Breakdown */}
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-2 text-xs">
              <h4 className="font-bold text-gray-900 uppercase tracking-wider text-[11px] border-b border-gray-200 pb-2 mb-2">Price Breakdown & Tax Summary</h4>
              <div className="flex justify-between text-gray-600">
                <span>Base Package (x{numTravelers})</span>
                <span className="font-medium">₹{(basePrice * numTravelers).toLocaleString("en-IN")}</span>
              </div>
              {addOnsPrice > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>Add-ons Total</span>
                  <span className="font-medium">₹{addOnsPrice.toLocaleString("en-IN")}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-600 border-t border-gray-200 pt-2">
                <span>Subtotal (before GST)</span>
                <span className="font-medium text-gray-900">₹{totalPrice.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>GST (5%)</span>
                <span className="font-medium text-gray-900">₹{(totalPrice * 0.05).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-gray-900 border-t border-gray-200 pt-2">
                <span>Total Festival Cost (incl. GST)</span>
                <span className="text-[#781216]">₹{totalWithGst.toLocaleString("en-IN")}</span>
              </div>
              <div className="mt-2 pt-2 border-t border-gray-200/80 text-[11px] text-gray-500 font-medium">
                {form.paymentAction === "MANUAL" ? (
                  <span>
                    Initial collection: <strong className="text-gray-900">₹{Number(form.paymentAmount || 0).toLocaleString("en-IN")}</strong> + 5% GST = <strong className="text-green-700">₹{(Number(form.paymentAmount || 0) * 1.05).toFixed(2)}</strong> charged
                  </span>
                ) : (
                  <span>
                    Payment link amount: <strong className="text-green-700">₹{Number(form.paymentAmount || 0).toLocaleString("en-IN")}</strong> (incl. 5% GST)
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              disabled={saving || Boolean(uploading)}
              onClick={submit}
              className="bg-[#781216] text-white hover:bg-[#5f0e11]"
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {form.paymentAction === "SEND_LINK"
                ? "Create & send payment link"
                : "Create booking"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CrmBookingDialogWithSlot(
  { open, onOpenChange, festival, onCreated }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    festival: Festival;
    onCreated: () => void;
  },
) {
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    crmFestivalSlotId: "",
    numberOfTravelers: "1",
    paymentAmount: "",
    paymentAction: "MANUAL",
    specialRequests: "",
  });
  const [saving, setSaving] = useState(false);
  const update = (key: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));
  const submit = async () => {
    const travelers = Math.max(1, Number(form.numberOfTravelers) || 1);
    const amount = Number(form.paymentAmount);
    if (
      !form.fullName.trim() || !form.email.trim() || !form.crmFestivalSlotId ||
      !amount
    ) return toast.error("Customer, departure, and first payment are required");
    const slot = festival.slots.find((item) => item.id === form.crmFestivalSlotId);
    if (!slot || slot.capacity - slot.filledSpots < travelers) {
      return toast.error("Choose a departure with enough remaining capacity");
    }
    setSaving(true);
    try {
      await apiClient.post(`/crm-festivals/${festival.id}/bookings`, {
        ...form,
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        numberOfTravelers: travelers,
        paymentAmount: amount,
      });
      toast.success(
        form.paymentAction === "SEND_LINK"
          ? "Website payment link emailed"
          : "Booking and payment recorded",
      );
      setForm({
        fullName: "",
        email: "",
        phone: "",
        crmFestivalSlotId: "",
        numberOfTravelers: "1",
        paymentAmount: "",
        paymentAction: "MANUAL",
        specialRequests: "",
      });
      onCreated();
      onOpenChange(false);
    } catch (error) {
      toast.error(message(error, "Could not create CRM booking"));
    } finally {
      setSaving(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create CRM booking</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-md bg-[#fcf4e7] p-3 text-sm text-[#6f4c08]">
            <strong>{festival.name}</strong>
            <br />Choose a dated departure to create its operations checklist.
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Customer name">
              <Input
                value={form.fullName}
                onChange={(e) => update("fullName", e.target.value)}
              />
            </Field>
            <Field label="Email">
              <Input
                type="email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
              />
            </Field>
            <Field label="Phone">
              <Input
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
              />
            </Field>
            <Field label="Travelers">
              <Input
                min="1"
                type="number"
                value={form.numberOfTravelers}
                onChange={(e) => update("numberOfTravelers", e.target.value)}
              />
            </Field>
          </div>
          <Field label="Departure slot">
            <select
              className="h-9 w-full rounded-md border border-input bg-white px-3 text-sm"
              value={form.crmFestivalSlotId}
              onChange={(e) => update("crmFestivalSlotId", e.target.value)}
            >
              <option value="">Choose a departure</option>
              {festival.slots.map((slot) => {
                const remaining = slot.capacity - slot.filledSpots;
                return (
                  <option
                    key={slot.id}
                    value={slot.id}
                    disabled={remaining < Number(form.numberOfTravelers || 1)}
                  >
                    {new Date(slot.startDate).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })} – {new Date(slot.endDate).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                    {slot.title ? ` · ${slot.title}` : ""} ({remaining}{" "}
                    seats left)
                  </option>
                );
              })}
            </select>
          </Field>
          <Field label="Special requests">
            <Textarea
              value={form.specialRequests}
              onChange={(e) => update("specialRequests", e.target.value)}
            />
          </Field>
          <div className="rounded-lg border p-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="First payment">
                <Input
                  min="0.01"
                  max={String(festival.totalAmount)}
                  step="0.01"
                  type="number"
                  value={form.paymentAmount}
                  onChange={(e) => update("paymentAmount", e.target.value)}
                />
              </Field>
              <Field label="Collection">
                <select
                  className="h-9 w-full rounded-md border border-input bg-white px-3 text-sm"
                  value={form.paymentAction}
                  onChange={(e) => update("paymentAction", e.target.value)}
                >
                  <option value="MANUAL">Received manually</option>
                  <option value="SEND_LINK">Send website payment link</option>
                </select>
              </Field>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              disabled={saving}
              onClick={submit}
              className="bg-[#781216] text-white hover:bg-[#5f0e11]"
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {form.paymentAction === "SEND_LINK"
                ? "Create & send payment link"
                : "Create booking"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function InstallmentDialog(
  { festivalId, booking, onOpenChange, onCreated }: {
    festivalId: string;
    booking: Booking | null;
    onOpenChange: (open: boolean) => void;
    onCreated: () => void;
  },
) {
  const [amount, setAmount] = useState("");
  const [action, setAction] = useState("MANUAL");
  const [linkAmountChoice, setLinkAmountChoice] = useState("");
  const [saving, setSaving] = useState(false);
  const linkAmounts = booking
    ? [
        ...new Set(
          [0.1, 0.25, 0.5, 0.75, 1].map((fraction) =>
            (
              Math.round(Number(booking.amountDue) * fraction * 100) / 100
            ).toFixed(2),
          ),
        ),
      ]
    : [];
  useEffect(() => {
    if (!booking) return setAmount("");
    const defaultAmount = action === "SEND_LINK" ? String(booking.amountDue) : (Number(booking.amountDue) / 1.05).toFixed(2);
    setAmount(defaultAmount);
    if (action === "SEND_LINK") setLinkAmountChoice(defaultAmount);
  }, [action, booking?.id, booking?.amountDue]);
  const submit = async () => {
    const selectedAmount = Number(amount);
    if (!booking || !selectedAmount) {
      return toast.error("Enter an installment amount");
    }
    setSaving(true);
    try {
      await apiClient.post(
        `/crm-festivals/${festivalId}/bookings/${booking.id}/installments`,
        { paymentAmount: selectedAmount, paymentAction: action },
      );
      toast.success(
        action === "SEND_LINK"
          ? "Website payment link emailed"
          : "Installment recorded",
      );
      onCreated();
      onOpenChange(false);
      setAmount("");
    } catch (error: any) {
      toast.error(message(error, "Could not record installment"));
    } finally {
      setSaving(false);
    }
  };
  return (
    <Dialog open={Boolean(booking)} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record or request installment</DialogTitle>
        </DialogHeader>
        {booking && (
          <div className="space-y-4">
            <p className="rounded-md bg-gray-50 p-3 text-sm text-gray-700">
              {booking.bookingReference} · balance due{" "}
              <strong>
                ₹{Number(booking.amountDue).toLocaleString("en-IN")}
              </strong>
            </p>
            <Field label="Collection method">
              <select
                className="h-9 w-full rounded-md border border-input bg-white px-3 text-sm"
                value={action}
                onChange={(e) => setAction(e.target.value)}
              >
                <option value="MANUAL">Received manually</option>
                <option value="SEND_LINK">Send website payment link</option>
              </select>
            </Field>
            <Field label={action === "SEND_LINK" ? "Payment-link amount (including GST)" : "Manual installment before GST"}>
              {action === "SEND_LINK" ? (
                <>
                <select
                  className="h-9 w-full rounded-md border border-input bg-white px-3 text-sm"
                  value={linkAmountChoice}
                  onChange={(e) => {
                    setLinkAmountChoice(e.target.value);
                    if (e.target.value !== "CUSTOM") setAmount(e.target.value);
                  }}
                >
                  {linkAmounts.map((value) => <option key={value} value={value}>Pay ₹{Number(value).toLocaleString("en-IN")}</option>)}
                  <option value="CUSTOM">Custom amount…</option>
                </select>
                {linkAmountChoice === "CUSTOM" && <Input min="0.01" max={String(booking.amountDue)} step="0.01" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />}
                </>
              ) : (
                <Input
                  min="0.01"
                  max={String(Number(booking.amountDue) / 1.05)}
                  step="0.01"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              )}
              <p className="text-xs text-gray-500">{action === "SEND_LINK" ? "Choose a suggested GST-inclusive amount, or enter any amount up to the outstanding balance." : `5% GST will be added. Customer is charged ₹${(Number(amount || 0) * 1.05).toFixed(2)}.`}</p>
            </Field>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                disabled={saving}
                onClick={submit}
                className="bg-[#781216] text-white hover:bg-[#5f0e11]"
              >
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {action === "SEND_LINK" ? "Send payment link" : "Record payment"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function CommonInclusions(
  { commonInclusions, festivalId, request }: {
    commonInclusions: CommonInclusion[];
    festivalId: string;
    request: (call: () => Promise<unknown>, success?: string) => Promise<void>;
  },
) {
  const byKey = new Map(commonInclusions.map((item) => [item.key, item]));
  const patch = (payload: Record<string, unknown>) =>
    request(() =>
      apiClient.patch(`/crm-festivals/${festivalId}/common-inclusions`, payload)
    );
  const count = (key: "BREAKFAST" | "DINNER") =>
    byKey.get(key)?.numberOfDays || 0;
  return (
    <section className="rounded-xl border border-gray-200 bg-white">
      <div className="border-b px-5 py-4">
        <h2 className="font-bold text-gray-900">Festival-wide inclusions</h2>
        <p className="mt-1 text-xs text-gray-500">
          Meals and day extras are configured on each itinerary day.
        </p>
      </div>
      <div className="space-y-4 p-5">
        <div className="grid grid-cols-2 gap-2">
          <CountReadout label="Breakfast" value={count("BREAKFAST")} />
          <CountReadout label="Dinner" value={count("DINNER")} />
        </div>
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-gray-600">Travel days</span>
          <Input
            type="number"
            min="0"
            defaultValue={byKey.get("TRAVEL")?.numberOfDays ?? 0}
            onBlur={(event) =>
              patch({
                key: "TRAVEL",
                numberOfDays: Number(event.target.value) || 0,
              })}
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-gray-600">
            Vehicle type
          </span>
          <select
            className="h-9 w-full rounded-md border border-input bg-white px-3 text-sm"
            value={byKey.get("VEHICLE_TYPE")?.vehicleType || ""}
            onChange={(event) =>
              patch({
                key: "VEHICLE_TYPE",
                vehicleType: event.target.value || null,
              })}
          >
            <option value="">Not selected</option>
            <option value="SEDAN">Sedan</option>
            <option value="SUV">SUV</option>
            <option value="INNOVA">Innova</option>
            <option value="TRAVELLER">Traveller</option>
          </select>
        </label>
        <div className="flex items-center gap-2 border-t pt-3 text-sm text-gray-700">
          <Check className="h-4 w-4 text-emerald-600" />First-aid kit{" "}
          <span className="text-xs text-gray-400">Always included</span>
        </div>
      </div>
    </section>
  );
}

function CountReadout({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-gray-50 p-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 text-lg font-bold text-gray-900">
        {value} <span className="text-xs font-medium text-gray-500">days</span>
      </p>
    </div>
  );
}

function DayCard({
  day,
  places,
  stays,
  properties,
  transfers,
  request,
  canDelete,
  onDelete,
}: {
  day: Day;
  places: Master[];
  stays: Master[];
  properties: Master[];
  transfers: Master[];
  request: (call: () => Promise<unknown>, success?: string) => Promise<void>;
  canDelete: boolean;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [activity, setActivity] = useState("");
  const dayProperties = properties.filter((property) =>
    property.stayLocationId === day.stayLocationId
  );
  const dayPlaces = places.filter((place) =>
    place.stayLocationId === day.stayLocationId
  );
  const selectedPlaceIds = day.visitingPlaces.map((item) => item.place.id);
  const updateDay = (payload: Record<string, any>) =>
    request(() =>
      apiClient.patch(`/crm-festivals/itinerary-days/${day.id}`, payload)
    );
  const togglePlace = (placeId: string, selected: boolean) =>
    request(() =>
      apiClient.put(`/crm-festivals/itinerary-days/${day.id}/places`, {
        placeIds: selected
          ? [...selectedPlaceIds, placeId]
          : selectedPlaceIds.filter((id) => id !== placeId),
      })
    );
  const addActivity = async () => {
    if (!activity.trim()) return;
    await request(
      () =>
        apiClient.post(`/crm-festivals/itinerary-days/${day.id}/activities`, {
          name: activity.trim(),
        }),
      "Activity added",
    );
    setActivity("");
  };
  const movePlace = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= selectedPlaceIds.length) return;
    const next = [...selectedPlaceIds];
    [next[index], next[target]] = [next[target], next[index]];
    request(() =>
      apiClient.put(`/crm-festivals/itinerary-days/${day.id}/places`, {
        placeIds: next,
      })
    );
  };
  return (
    <article className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="flex items-center">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex flex-1 items-center justify-between gap-4 px-5 py-4 text-left hover:bg-gray-50"
        >
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#b59410]">
              Day {day.dayNumber}
            </p>
            <h3 className="mt-0.5 font-bold text-gray-900">
              {day.stayLocation?.name || "Plan this day"}
            </h3>
          </div>
          {expanded
            ? <ChevronUp className="h-5 w-5 text-gray-400" />
            : <ChevronDown className="h-5 w-5 text-gray-400" />}
        </button>
        {canDelete && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mr-3 text-red-600 hover:bg-red-50 hover:text-red-700"
            onClick={onDelete}
          >
            <Trash2 className="mr-1 h-3.5 w-3.5" />Remove
          </Button>
        )}
      </div>
      {expanded && (
        <div className="space-y-5 border-t px-5 py-5">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Stay location">
              <select
                className="h-9 w-full rounded-md border border-input bg-white px-3 text-sm"
                value={day.stayLocationId || ""}
                onChange={(e) =>
                  updateDay({
                    stayLocationId: e.target.value || null,
                    propertyId: null,
                  })}
              >
                <option value="">No stay selected</option>
                {stays.map((stay) => (
                  <option key={stay.id} value={stay.id}>{stay.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Property">
              <select
                disabled={!day.stayLocationId}
                className="h-9 w-full rounded-md border border-input bg-white px-3 text-sm disabled:bg-gray-50"
                value={day.propertyId || ""}
                onChange={(e) =>
                  updateDay({ propertyId: e.target.value || null })}
              >
                <option value="">No property selected</option>
                {dayProperties.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Visiting places">
            <div className="grid max-h-48 grid-cols-1 gap-1 overflow-y-auto rounded-md border border-input bg-white p-2 sm:grid-cols-2">
              {!day.stayLocationId && (
                <p className="p-2 text-sm text-gray-500">
                  Choose a stay location first.
                </p>
              )}
              {dayPlaces.map((place) => (
                <label
                  key={place.id}
                  className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    checked={selectedPlaceIds.includes(place.id)}
                    onChange={(event) =>
                      togglePlace(place.id, event.target.checked)}
                  />
                  {place.name}
                </label>
              ))}
              {day.stayLocationId && !dayPlaces.length && (
                <p className="p-2 text-sm text-gray-500">
                  No visiting places exist for this stay location yet.
                </p>
              )}
            </div>
            {day.visitingPlaces.length > 0 && (
              <div className="mt-2 space-y-1">
                {day.visitingPlaces.map((item, index) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-md bg-gray-50 px-3 py-1.5 text-sm"
                  >
                    <span>
                      <span className="mr-2 text-xs font-bold text-gray-400">
                        {index + 1}
                      </span>
                      {item.place.name}
                    </span>
                    <span className="flex gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        disabled={index === 0}
                        onClick={() => movePlace(index, -1)}
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        disabled={index === day.visitingPlaces.length - 1}
                        onClick={() => movePlace(index, 1)}
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </Button>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Field>
          <div className="rounded-lg bg-gray-50 p-4">
            <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-800">
              <Utensils className="h-4 w-4 text-[#b59410]" />Meals
            </p>
            <div className="flex flex-wrap gap-4">
              {(["breakfast", "lunch", "dinner"] as const).map((meal) => (
                <Toggle
                  key={meal}
                  label={`${meal[0].toUpperCase()}${meal.slice(1)}`}
                  checked={day[meal]}
                  onChange={(value) =>
                    request(() =>
                      apiClient.patch(
                        `/crm-festivals/itinerary-days/${day.id}/meals`,
                        { [meal]: value },
                      )
                    )}
                />
              ))}
            </div>
          </div>
          <div className="rounded-lg border border-amber-100 bg-amber-50/50 p-4">
            <p className="mb-3 text-sm font-semibold text-gray-800">
              Day inclusions
            </p>
            <div className="flex flex-wrap gap-4">
              {([["ILP_AND_PERMITS", "ILP and permits"], ["BBQ", "BBQ"], [
                "BONFIRE",
                "Bonfire",
              ], ["TRIP_GUIDE", "Festival guide"]] as const).map(([key, label]) => (
                <Toggle
                  key={key}
                  label={label}
                  checked={day.commonInclusions.some((item) =>
                    item.key === key
                  )}
                  onChange={(isIncluded) =>
                    request(() =>
                      apiClient.patch(
                        `/crm-festivals/itinerary-days/${day.id}/common-inclusions`,
                        { key, isIncluded },
                      )
                    )}
                />
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-gray-700">Activities</p>
            <div className="space-y-2">
              {day.activities.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-md border border-gray-100 px-3 py-2 text-sm"
                >
                  <span>{item.name}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-red-600 hover:bg-red-50"
                    onClick={() =>
                      request(() =>
                        apiClient.delete(
                          `/crm-festivals/itinerary-days/${day.id}/activities/${item.id}`,
                        )
                      )}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              <Input
                value={activity}
                onChange={(e) => setActivity(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addActivity();
                  }
                }}
                placeholder="Add an activity"
              />
              <Button type="button" onClick={addActivity} variant="outline">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Drop-off">
              <div className="space-y-2">
                <Toggle
                  label="This is the drop-off day"
                  checked={day.isDropOff}
                  onChange={(value) => {
                    if (!value) {
                      request(() =>
                        apiClient.patch(
                          `/crm-festivals/itinerary-days/${day.id}/drop-off`,
                          { isDropOff: false },
                        )
                      );
                    } else if (day.dropOffLocationId) {
                      request(() =>
                        apiClient.patch(
                          `/crm-festivals/itinerary-days/${day.id}/drop-off`,
                          {
                            isDropOff: true,
                            dropOffLocationId: day.dropOffLocationId,
                          },
                        )
                      );
                    } else toast.error("Choose a transfer location first");
                  }}
                />
                <select
                  className="h-9 w-full rounded-md border border-input bg-white px-3 text-sm"
                  value={day.dropOffLocationId || ""}
                  onChange={(e) =>
                    request(() =>
                      apiClient.patch(
                        `/crm-festivals/itinerary-days/${day.id}/drop-off`,
                        { isDropOff: true, dropOffLocationId: e.target.value },
                      )
                    )}
                >
                  <option value="">Select transfer location</option>
                  {transfers.map((transfer) => (
                    <option key={transfer.id} value={transfer.id}>
                      {transfer.name}
                    </option>
                  ))}
                </select>
              </div>
            </Field>
            <Field label="Notes">
              <Textarea
                rows={4}
                defaultValue={day.notes || ""}
                placeholder="Optional notes for this day"
                onBlur={(e) => {
                  if (e.target.value !== (day.notes || "")) {
                    updateDay({ notes: e.target.value || null });
                  }
                }}
              />
            </Field>
          </div>
        </div>
      )}
    </article>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      {children}
    </label>
  );
}
function Toggle(
  { label, checked, onChange }: {
    label: string;
    checked: boolean;
    onChange: (value: boolean) => void;
  },
) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}

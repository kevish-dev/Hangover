import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../../lib/axios";
import { CalendarCheck, IndianRupee, Loader2 } from "lucide-react";
import { format } from "date-fns";

function BookingStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    PENDING: "bg-yellow-100 text-yellow-700",
    RESERVED: "bg-blue-100 text-blue-700",
    CONFIRMED: "bg-green-100 text-green-700",
    CANCELLED: "bg-red-100 text-red-700",
    COMPLETED: "bg-purple-100 text-purple-700",
  };
  return (
    <span className={`px-2.5 py-1 rounded text-xs font-semibold tracking-wider ${map[status] ?? "bg-gray-100 text-gray-600"}`}>
      {status}
    </span>
  );
}

function PaymentStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    PAID: "bg-green-100 text-green-700",
    PARTIALLY_PAID: "bg-blue-100 text-blue-700",
    PENDING: "bg-yellow-100 text-yellow-700",
    REFUNDED: "bg-purple-100 text-purple-700",
    FAILED: "bg-red-100 text-red-700",
  };
  return (
    <span className={`px-2.5 py-1 rounded text-xs font-semibold tracking-wider ${map[status] ?? "bg-gray-100 text-gray-600"}`}>
      {status.replace("_", " ")}
    </span>
  );
}

export default function AdminBookingsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "bookings"],
    queryFn: async () => {
      const res = await apiClient.get("/bookings");
      return res.data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#c8a96e]" />
      </div>
    );
  }

  const bookings = data?.data || [];

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <CalendarCheck className="w-6 h-6 text-[#c8a96e]" />
            Bookings Dashboard
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Overview of all bookings across all trips.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-medium">
              <tr>
                <th className="px-6 py-4">Reference</th>
                <th className="px-6 py-4">Trip</th>
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4 text-center">Travelers</th>
                <th className="px-6 py-4">Booking Status</th>
                <th className="px-6 py-4">Payment Status</th>
                <th className="px-6 py-4">Total Amount</th>
                <th className="px-6 py-4">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {bookings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    No bookings found.
                  </td>
                </tr>
              ) : (
                bookings.map((b: any) => (
                  <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-mono font-medium text-gray-900">
                      {b.bookingReference}
                    </td>
                    <td className="px-6 py-4 text-gray-700 max-w-[200px] truncate">
                      {b.trip?.title}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-gray-900 font-medium">{b.user?.profile?.fullName || "N/A"}</div>
                      <div className="text-gray-500 text-xs">{b.user?.email}</div>
                    </td>
                    <td className="px-6 py-4 text-center text-gray-900">
                      {b.numberOfTravelers}
                    </td>
                    <td className="px-6 py-4">
                      <BookingStatusBadge status={b.status} />
                    </td>
                    <td className="px-6 py-4">
                      <PaymentStatusBadge status={b.paymentStatus} />
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900 flex items-center gap-1">
                      <IndianRupee className="w-3.5 h-3.5 text-gray-500" />
                      {Number(b.totalAmount).toLocaleString("en-IN")}
                    </td>
                    <td className="px-6 py-4 text-gray-500 text-xs whitespace-nowrap">
                      {format(new Date(b.createdAt), "MMM d, yyyy HH:mm")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

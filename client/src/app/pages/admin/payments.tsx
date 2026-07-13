import { useQuery } from "@tanstack/react-query";
import { paymentApi } from "../../../lib/paymentApi";
import { CreditCard, IndianRupee, Loader2 } from "lucide-react";
import { format } from "date-fns";

export default function AdminPaymentsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "payments"],
    queryFn: async () => {
      const res = await paymentApi.getAllPayments();
      return res;
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#c8a96e]" />
      </div>
    );
  }

  const payments = data?.data || [];

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6 md:mb-8">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-[#c8a96e]" />
            Payments Dashboard
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Track and manage all transactions and payments.
          </p>
        </div>
      </div>

      <div className="md:hidden space-y-3">
        {payments.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white px-4 py-10 text-center text-sm text-gray-500">
            No payments found.
          </div>
        ) : (
          payments.map((payment) => (
            <article key={payment.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-mono text-xs text-gray-500">{payment.id.split("-")[0]}...</p>
                  <h2 className="mt-1 truncate text-sm font-semibold text-gray-900">
                    {payment.booking.trip?.title || payment.booking.festival?.title}
                  </h2>
                  <p className="mt-0.5 text-xs font-medium text-[#781216]">{payment.booking.bookingReference}</p>
                </div>
                <span className={`shrink-0 rounded px-2 py-1 text-[11px] font-semibold tracking-wide ${
                  payment.status === "SUCCESS" ? "bg-green-100 text-green-700" :
                  payment.status === "FAILED" ? "bg-red-100 text-red-700" :
                  payment.status === "REFUNDED" ? "bg-purple-100 text-purple-700" :
                  "bg-yellow-100 text-yellow-700"
                }`}>
                  {payment.status}
                </span>
              </div>

              <div className="mt-3 rounded-lg bg-gray-50 p-3">
                <p className="break-words text-sm font-medium text-gray-900">{payment.booking.user.profile?.fullName || "N/A"}</p>
                <p className="break-all text-xs text-gray-500">{payment.booking.user.email}</p>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-gray-400">Type</p>
                  <p className="mt-0.5 font-semibold text-gray-700">{payment.type}</p>
                </div>
                <div>
                  <p className="text-gray-400">Amount</p>
                  <p className="mt-0.5 flex items-center font-semibold text-gray-900">
                    <IndianRupee className="h-3.5 w-3.5" />
                    {Number(payment.amount).toLocaleString("en-IN")}
                  </p>
                </div>
              </div>
              <p className="mt-3 border-t border-gray-100 pt-3 text-xs text-gray-500">
                {format(new Date(payment.createdAt), "MMM d, yyyy · h:mm a")}
              </p>
            </article>
          ))
        )}
      </div>

      <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-medium">
              <tr>
                <th className="px-6 py-4">Transaction ID</th>
                <th className="px-6 py-4">Booking Ref</th>
                <th className="px-6 py-4">Item</th>
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    No payments found.
                  </td>
                </tr>
              ) : (
                payments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-gray-500">
                      {payment.id.split("-")[0]}...
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {payment.booking.bookingReference}
                    </td>
                    <td className="px-6 py-4 text-gray-700 max-w-[200px] truncate">
                      {payment.booking.trip?.title || payment.booking.festival?.title}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-gray-900 font-medium">{payment.booking.user.profile?.fullName || "N/A"}</div>
                      <div className="text-gray-500 text-xs">{payment.booking.user.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded text-xs font-semibold tracking-wider">
                        {payment.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900 flex items-center gap-1">
                      <IndianRupee className="w-3.5 h-3.5 text-gray-500" />
                      {Number(payment.amount).toLocaleString("en-IN")}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded text-xs font-semibold tracking-wider ${
                        payment.status === "SUCCESS" ? "bg-green-100 text-green-700" :
                        payment.status === "FAILED" ? "bg-red-100 text-red-700" :
                        payment.status === "REFUNDED" ? "bg-purple-100 text-purple-700" :
                        "bg-yellow-100 text-yellow-700"
                      }`}>
                        {payment.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500 text-xs whitespace-nowrap">
                      {format(new Date(payment.createdAt), "MMM d, yyyy HH:mm")}
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

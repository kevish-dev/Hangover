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
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-[#c8a96e]" />
            Payments Dashboard
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Track and manage all transactions and payments.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-medium">
              <tr>
                <th className="px-6 py-4">Transaction ID</th>
                <th className="px-6 py-4">Booking Ref</th>
                <th className="px-6 py-4">Trip</th>
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
                      {payment.booking.trip.title}
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

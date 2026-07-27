import { PackagePlus } from "lucide-react";

const money = (value: unknown) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;

const statusClasses: Record<string, string> = {
  PAID: "bg-emerald-50 text-emerald-700 border-emerald-200",
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  CANCELLED: "bg-red-50 text-red-700 border-red-200",
  REFUNDED: "bg-purple-50 text-purple-700 border-purple-200",
};

export function BookingAddOnsTab({ booking }: { booking: any }) {
  const addOns = booking.addOns || [];
  const total = addOns.reduce(
    (sum: number, purchase: any) => sum + Number(purchase.totalPrice || 0),
    0,
  );

  if (addOns.length === 0) {
    return (
      <div className="bg-white rounded-b-xl border border-t-0 border-[#e8d9b7]/40 shadow-sm p-10 text-center">
        <PackagePlus className="w-9 h-9 text-gray-300 mx-auto mb-3" />
        <p className="font-semibold text-gray-700">No add-ons purchased</p>
        <p className="text-sm text-gray-500 mt-1">
          This customer did not select any optional add-ons.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-b-xl border border-t-0 border-[#e8d9b7]/40 shadow-sm p-4 md:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider flex items-center gap-2">
            <PackagePlus className="w-4 h-4 text-[#781216]" /> Purchased add-ons
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            Add-ons and quantities selected with this booking.
          </p>
        </div>
        <span className="text-sm font-bold text-[#781216]">Total: {money(total)}</span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full min-w-[620px] text-left text-sm border-collapse">
          <thead className="bg-gray-100 border-b border-gray-300">
            <tr>
              <th className="px-4 py-3 font-semibold text-gray-600">Add-on</th>
              <th className="px-4 py-3 font-semibold text-gray-600 text-right">Unit price</th>
              <th className="px-4 py-3 font-semibold text-gray-600 text-center">Quantity</th>
              <th className="px-4 py-3 font-semibold text-gray-600 text-right">Total</th>
              <th className="px-4 py-3 font-semibold text-gray-600 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {addOns.map((purchase: any) => (
              <tr key={purchase.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {purchase.addOn?.imageUrl ? (
                      <img
                        src={purchase.addOn.imageUrl}
                        alt=""
                        className="w-9 h-9 rounded-md object-cover"
                      />
                    ) : null}
                    <div>
                      <p className="font-semibold text-gray-900">{purchase.addOn?.title || "Deleted add-on"}</p>
                      {purchase.addOn?.description ? (
                        <p className="text-xs text-gray-500 mt-0.5">{purchase.addOn.description}</p>
                      ) : null}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-right text-gray-700">{money(purchase.unitPrice)}</td>
                <td className="px-4 py-3 text-center font-semibold text-gray-900">{purchase.quantity}</td>
                <td className="px-4 py-3 text-right font-semibold text-gray-900">{money(purchase.totalPrice)}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-flex px-2 py-1 rounded-full border text-[10px] font-bold tracking-wide ${statusClasses[purchase.status] || "bg-gray-100 text-gray-600 border-gray-200"}`}>
                    {purchase.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

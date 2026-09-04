import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  interestApi,
  InterestSubmissionRecord,
} from "../../../lib/interestApi";
import {
  HeartHandshake,
  Search,
  Trash2,
  MapPin,
  ChevronDown,
  ChevronUp,
  Mail,
  Phone,
  Instagram,
  User,
  Calendar,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router";

export default function AdminInterestPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "interests"],
    queryFn: () => interestApi.getOverview(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => interestApi.deleteSubmission(id),
    onSuccess: () => {
      toast.success("Interest submission deleted");
      queryClient.invalidateQueries({ queryKey: ["admin", "interests"] });
    },
    onError: (err: any) => {
      toast.error(
        err?.response?.data?.message || "Failed to delete submission",
      );
    },
  });

  const items = data?.items || [];

  // Filter items by search term across trip title, lead name, email, whatsapp, instagram
  const filteredItems = items.filter((item) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const matchesTitle = item.title.toLowerCase().includes(term);
    const matchesDestination = item.destinationName
      .toLowerCase()
      .includes(term);
    const matchesSubmissions = item.submissions.some(
      (sub) =>
        sub.name.toLowerCase().includes(term) ||
        (sub.email && sub.email.toLowerCase().includes(term)) ||
        (sub.whatsapp && sub.whatsapp.toLowerCase().includes(term)) ||
        (sub.instagram && sub.instagram.toLowerCase().includes(term)),
    );
    return matchesTitle || matchesDestination || matchesSubmissions;
  });

  const toggleExpand = (id: string) => {
    setExpandedItemId((prev) => (prev === id ? null : id));
  };

  const confirmDelete = (sub: InterestSubmissionRecord) => {
    toast(`Delete interest submission from ${sub.name}?`, {
      action: {
        label: "Delete",
        onClick: () => deleteMutation.mutate(sub.id),
      },
      cancel: {
        label: "Cancel",
        onClick: () => {},
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-lg bg-[#781216]/10 text-[#781216]">
              <HeartHandshake className="size-5" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">
              Interest Submissions
            </h1>
          </div>
          <p className="mt-1 text-xs text-gray-500 sm:text-sm">
            View and manage interest form inquiries from trips and festivals
            that have interest forms enabled.
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-xs font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
        >
          <RefreshCw className="size-3.5" />
          Refresh
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search by trip title, lead name, email, WhatsApp, or Instagram handle..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-xs shadow-sm transition-all focus:border-[#781216] focus:outline-none focus:ring-1 focus:ring-[#781216] sm:text-sm"
        />
      </div>

      {/* Content List */}
      {isLoading ? (
        <div className="flex min-h-[250px] items-center justify-center rounded-xl border border-gray-200 bg-white p-8">
          <div className="flex items-center gap-3 text-sm text-gray-500">
            <RefreshCw className="size-4 animate-spin text-[#781216]" />
            Loading interest form overview...
          </div>
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700">
          Failed to load interest submissions. Please refresh or try again.
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
          <HeartHandshake className="mx-auto size-10 text-gray-400" />
          <h3 className="mt-3 text-sm font-semibold text-gray-900">
            {searchTerm
              ? "No matching trips or interest submissions found"
              : "No Trips or Festivals with Interest Form Enabled"}
          </h3>
          <p className="mt-1 text-xs text-gray-500 max-w-md mx-auto">
            {searchTerm
              ? "Try adjusting your search terms."
              : "Enable the 'Enable Interest Form' toggle when creating or editing Itinerary Trips or Festivals in the CRM section."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredItems.map((item) => {
            const isExpanded =
              expandedItemId === item.id || Boolean(searchTerm.trim());
            const hasSubmissions = item.submissions.length > 0;
            const tripEditUrl =
              item.type === "CRM_TRIP"
                ? `/dashboard/crm-trips/${item.id}`
                : item.type === "CRM_FESTIVAL"
                  ? `/dashboard/crm-festivals/${item.id}`
                  : item.type === "FESTIVAL"
                    ? `/dashboard/festivals/${item.id}`
                    : `/dashboard/crm-trips`;

            return (
              <div
                key={item.id}
                className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all hover:border-gray-300"
              >
                {/* Item Header */}
                <div
                  onClick={() => toggleExpand(item.id)}
                  className="flex cursor-pointer flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#781216]/10 text-[#781216]">
                      <MapPin className="size-4" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-gray-900 text-sm sm:text-base">
                          {item.title}
                        </h3>
                        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-semibold text-amber-800">
                          {item.type.replace("_", " ")}
                        </span>
                        {item.isPublished && (
                          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-800">
                            Published
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-gray-500">
                        Destination:{" "}
                        <span className="font-medium text-gray-700">
                          {item.destinationName}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-4 border-t border-gray-100 pt-3 sm:border-t-0 sm:pt-0">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                        <HeartHandshake className="size-3.5" />
                        {item.submissions.length}{" "}
                        {item.submissions.length === 1
                          ? "Interest"
                          : "Interests"}
                      </span>

                      <Link
                        to={tripEditUrl}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                        title="View details"
                      >
                        <ExternalLink className="size-3" />
                        <span className="hidden sm:inline">Details</span>
                      </Link>
                    </div>

                    <button
                      type="button"
                      className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    >
                      {isExpanded ? (
                        <ChevronUp className="size-5" />
                      ) : (
                        <ChevronDown className="size-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Expanded Submissions Table */}
                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50/50 p-4 sm:p-5">
                    {!hasSubmissions ? (
                      <div className="rounded-lg border border-dashed border-gray-200 bg-white p-6 text-center text-xs text-gray-500">
                        No interest submissions received for this trip yet.
                      </div>
                    ) : (
                      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 uppercase tracking-wider font-semibold text-[10px]">
                            <tr>
                              <th className="px-4 py-3">Name</th>
                              <th className="px-4 py-3">Email ID</th>
                              <th className="px-4 py-3">WhatsApp No</th>
                              <th className="px-4 py-3">Instagram Handle</th>
                              <th className="px-4 py-3">Date Submitted</th>
                              <th className="px-4 py-3 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {item.submissions.map(
                              (sub: InterestSubmissionRecord) => (
                                <tr
                                  key={sub.id}
                                  className="hover:bg-amber-50/30 transition-colors"
                                >
                                  <td className="px-4 py-3 font-medium text-gray-900">
                                    <div className="flex items-center gap-1.5">
                                      <User className="size-3.5 text-gray-400 shrink-0" />
                                      <span>{sub.name}</span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-gray-600">
                                    {sub.email ? (
                                      <a
                                        href={`mailto:${sub.email}`}
                                        className="flex items-center gap-1 text-[#781216] hover:underline"
                                      >
                                        <Mail className="size-3 shrink-0" />
                                        {sub.email}
                                      </a>
                                    ) : (
                                      <span className="text-gray-400">—</span>
                                    )}
                                  </td>
                                  <td className="px-4 py-3 text-gray-600">
                                    {sub.whatsapp ? (
                                      <a
                                        href={`https://wa.me/${sub.whatsapp.replace(/[^0-9]/g, "")}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex items-center gap-1 text-emerald-700 hover:underline"
                                      >
                                        <Phone className="size-3 shrink-0" />
                                        {sub.whatsapp}
                                      </a>
                                    ) : (
                                      <span className="text-gray-400">—</span>
                                    )}
                                  </td>
                                  <td className="px-4 py-3 text-gray-600">
                                    {sub.instagram ? (
                                      <a
                                        href={`https://instagram.com/${sub.instagram.replace("@", "")}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex items-center gap-1 text-purple-700 hover:underline"
                                      >
                                        <Instagram className="size-3 shrink-0" />
                                        {sub.instagram.startsWith("@")
                                          ? sub.instagram
                                          : `@${sub.instagram}`}
                                      </a>
                                    ) : (
                                      <span className="text-gray-400">—</span>
                                    )}
                                  </td>
                                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                                    <div className="flex items-center gap-1">
                                      <Calendar className="size-3 text-gray-400 shrink-0" />
                                      {new Date(sub.createdAt).toLocaleString(
                                        "en-IN",
                                        {
                                          dateStyle: "medium",
                                          timeStyle: "short",
                                        },
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                    <button
                                      type="button"
                                      onClick={() => confirmDelete(sub)}
                                      disabled={deleteMutation.isPending}
                                      className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                                      title="Delete submission"
                                    >
                                      <Trash2 className="size-3.5" />
                                    </button>
                                  </td>
                                </tr>
                              ),
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

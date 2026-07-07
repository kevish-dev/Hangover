import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../../lib/axios";
import { Mail, MessageSquare, CheckCircle, X, Search, Clock } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { format } from "date-fns";
import { toast } from "sonner";
import { Badge } from "../../components/ui/badge";

export default function AdminInquiriesPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedInquiry, setSelectedInquiry] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "inquiries"],
    queryFn: async () => {
      const res = await apiClient.get("/inquiries?limit=500");
      return res.data;
    },
  });

  const handleResolve = async (id: string) => {
    try {
      await apiClient.patch(`/inquiries/${id}/resolve`, {});
      toast.success("Inquiry marked as resolved");
      setSelectedInquiry(null);
      queryClient.invalidateQueries({ queryKey: ["admin", "inquiries"] });
    } catch (error) {
      toast.error("Failed to resolve inquiry");
    }
  };

  const confirmAction = (title: string, description: string, actionLabel: string, actionFn: () => Promise<void>) => {
    toast(title, {
      description,
      position: "bottom-right",
      action: { label: actionLabel, onClick: actionFn },
      cancel: { label: "Cancel", onClick: () => {} },
    });
  };

  const handleDelete = (id: string) => {
    confirmAction(
      "Delete Inquiry?",
      "Are you sure you want to delete this inquiry?",
      "Delete",
      async () => {
        try {
          await apiClient.delete(`/inquiries/${id}`);
          toast.success("Inquiry deleted");
          setSelectedInquiry(null);
          queryClient.invalidateQueries({ queryKey: ["admin", "inquiries"] });
        } catch (error) {
          toast.error("Failed to delete inquiry");
        }
      }
    );
  };

  if (isLoading) {
    return <div className="p-8 text-gray-500">Loading inquiries...</div>;
  }

  const inquiries = data?.data || [];
  
  const filteredInquiries = inquiries.filter((inq: any) => 
    inq.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inq.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inq.tripType?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-[#c8a96e]" />
            Inquiries
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage and respond to customer inquiries from the website.
          </p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search inquiries..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200 uppercase tracking-wider text-xs">
              <tr>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Trip Type</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredInquiries.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    No inquiries found.
                  </td>
                </tr>
              ) : (
                filteredInquiries.map((inq: any) => (
                  <tr key={inq.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900">{inq.name}</div>
                      <div className="text-gray-500 text-xs flex items-center gap-1 mt-0.5">
                        <Mail className="w-3 h-3" />
                        {inq.email}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {inq.tripType ? (
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium uppercase">
                          {inq.tripType.replace(/_/g, " ")}
                        </span>
                      ) : (
                        <span className="text-gray-400 italic text-xs">Not specified</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {format(new Date(inq.createdAt), "MMM d, yyyy h:mm a")}
                    </td>
                    <td className="px-6 py-4">
                      {inq.isResolved ? (
                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200 font-medium">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Resolved
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200 font-medium">
                          <Clock className="w-3 h-3 mr-1" />
                          Pending
                        </Badge>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setSelectedInquiry(inq)}
                        className="text-xs"
                      >
                        View Details
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedInquiry && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedInquiry(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center shrink-0">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-[#c8a96e]" />
                Inquiry Details
              </h2>
              <button onClick={() => setSelectedInquiry(null)} className="p-1.5 hover:bg-gray-200 rounded-full text-gray-500 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Name</label>
                  <p className="font-medium text-gray-900">{selectedInquiry.name}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Date</label>
                  <p className="text-gray-900">{format(new Date(selectedInquiry.createdAt), "PPP p")}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Email</label>
                  <a href={`mailto:${selectedInquiry.email}`} className="text-blue-600 hover:underline">{selectedInquiry.email}</a>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Phone</label>
                  {selectedInquiry.phone ? (
                    <a href={`tel:${selectedInquiry.phone}`} className="text-blue-600 hover:underline">{selectedInquiry.phone}</a>
                  ) : (
                    <span className="text-gray-400 italic">Not provided</span>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Trip Interest</label>
                {selectedInquiry.tripType ? (
                  <span className="px-2.5 py-1 bg-gray-100 text-gray-800 rounded font-medium uppercase text-sm inline-block">
                    {selectedInquiry.tripType.replace(/_/g, " ")}
                  </span>
                ) : (
                  <span className="text-gray-400 italic">Not specified</span>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Message</label>
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 whitespace-pre-wrap text-gray-700 text-sm leading-relaxed">
                  {selectedInquiry.message}
                </div>
              </div>
            </div>

            <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-between shrink-0">
              <Button 
                variant="destructive" 
                size="sm"
                onClick={() => handleDelete(selectedInquiry.id)}
              >
                Delete
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setSelectedInquiry(null)}>
                  Close
                </Button>
                {!selectedInquiry.isResolved && (
                  <Button 
                    size="sm" 
                    className="bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => handleResolve(selectedInquiry.id)}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Mark as Resolved
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Plus, Loader2, Send, Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Badge } from "../../components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../components/ui/dialog";
import { apiClient } from "../../../lib/axios";

type InvoiceItem = { description: string; price: number };

type Invoice = {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  title: string;
  description?: string;
  items: InvoiceItem[];
  amount: string;
  currency: string;
  dueDate?: string;
  status: string;
  createdAt: string;
  source?: "CUSTOM" | "BOOKING_RECEIPT";
  bookingId?: string;
  paymentId?: string;
  sentAt?: string;
};

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [items, setItems] = useState<InvoiceItem[]>([]);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get("/invoices");
      if (res.data.status === "success") {
        setInvoices(res.data.data);
      }
    } catch (error) {
      toast.error("Failed to fetch invoices");
    } finally {
      setLoading(false);
    }
  };

  const addItem = () => {
    setItems([...items, { description: "", price: 0 }]);
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const calculateTotal = () => {
    if (items.length === 0) return 0;
    return items.reduce((acc, item) => acc + (Number(item.price) || 0), 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !customerEmail || !title) {
      toast.error("Please fill all required fields");
      return;
    }

    const totalAmount = items.length > 0 ? calculateTotal() : 0;

    setIsSubmitting(true);
    try {
      const res = await apiClient.post("/invoices", {
        customerName,
        customerEmail,
        customerPhone,
        title,
        description,
        dueDate,
        items,
        amount: totalAmount,
        currency: "INR",
      });
      
      if (res.data.status === "success") {
        toast.success("Receipt created and emailed successfully!");
        setIsDialogOpen(false);
        fetchInvoices();
        // Reset form
        setCustomerName("");
        setCustomerEmail("");
        setCustomerPhone("");
        setTitle("");
        setDescription("");
        setDueDate("");
        setItems([]);
      } else {
        toast.error(res.data.message || "Failed to create invoice");
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (amount: number | string) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(Number(amount));
  };

  const exportCsv = () => {
    if (!invoices.length) {
      toast.error("No receipt records to export");
      return;
    }

    const escapeCsv = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
    const headers = ["Sent at", "Source", "Customer", "Email", "Phone", "Title", "Booking ID", "Payment ID", "Amount", "Currency", "Status", "Line items", "Notes"];
    const rows = invoices.map((invoice) => [
      invoice.sentAt || invoice.createdAt,
      invoice.source === "BOOKING_RECEIPT" ? "Booking receipt" : "Custom receipt",
      invoice.customerName,
      invoice.customerEmail,
      invoice.customerPhone,
      invoice.title,
      invoice.bookingId,
      invoice.paymentId,
      invoice.amount,
      invoice.currency,
      invoice.status,
      invoice.items.map((item) => `${item.description}: ${item.price}`).join(" | "),
      invoice.description,
    ]);
    const csv = [headers, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\r\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `receipt-records-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Receipt records exported");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">Receipts</h2>
          <p className="text-sm text-gray-500">Every delivered booking and custom receipt is kept here.</p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={exportCsv} disabled={!invoices.length}>
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Raise Receipt
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Raise Custom Receipt</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-6 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Customer Name *</Label>
                  <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Email Address *</Label>
                  <Input type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Phone (Optional)</Label>
                  <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Payment Date (Optional)</Label>
                  <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Receipt Title *</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Flight Tickets & Consultation" required />
              </div>

              <div className="space-y-2">
                <Label>Description (Optional)</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Any notes for the customer..." />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Line Items</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addItem}>
                    <Plus className="h-4 w-4 mr-1" /> Add Item
                  </Button>
                </div>
                {items.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4 border rounded-md border-dashed">No items added. The total will be 0.</p>
                ) : (
                  <div className="space-y-3">
                    {items.map((item, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <Input
                          placeholder="Description"
                          value={item.description}
                          onChange={(e) => updateItem(index, "description", e.target.value)}
                          className="flex-1"
                          required
                        />
                        <Input
                          type="number"
                          placeholder="Amount"
                          value={item.price}
                          onChange={(e) => updateItem(index, "price", Number(e.target.value))}
                          className="w-32"
                          min="0"
                          step="0.01"
                          required
                        />
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(index)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                          Remove
                        </Button>
                      </div>
                    ))}
                    <div className="flex justify-end pt-2 text-sm font-medium">
                      Total: {formatCurrency(calculateTotal())}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  Send Receipt
                </Button>
              </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="bg-white rounded-md border shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading receipts...
          </div>
        ) : invoices.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No receipts found. Click "Raise Receipt" to create one.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 border-b text-gray-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Source</th>
                  <th className="px-4 py-3 font-medium">Title</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{inv.customerName}</div>
                      <div className="text-xs text-gray-500">{inv.customerEmail}</div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline">
                        {inv.source === "BOOKING_RECEIPT" ? "Booking" : "Custom"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">{inv.title}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{formatCurrency(inv.amount)}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {format(new Date(inv.sentAt || inv.createdAt), "MMM d, yyyy")}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={inv.status === "PAID" ? "default" : inv.status === "SENT" ? "secondary" : "outline"}>
                        {inv.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

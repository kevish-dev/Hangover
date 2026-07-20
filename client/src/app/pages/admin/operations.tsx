import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Loader2, Plus, Search, FileSpreadsheet, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "../../../lib/axios";
import { Input } from "../../components/ui/input";
import { getErrorMessage, showErrorToast } from "../../../lib/errors";

type Task = {
  id: string;
  title: string;
  description?: string | null;
  category: string;
  status: string;
  estimatedAmount: string | number;
  amountArranged: string | number;
  amountPaid: string | number;
  dueAt?: string | null;
  completedAt?: string | null;
  booking: {
    id: string;
    bookingReference: string;
    status: string;
    trip?: { id: string; title: string } | null;
    festival?: { id: string; title: string } | null;
  };
};

const CATEGORIES = ["HOTEL", "TRANSPORT", "PERMIT", "VENDOR", "ACTIVITY", "DOCUMENTATION", "PAYMENT_COLLECTION", "GENERAL"];
const STATUSES = ["PENDING", "IN_PROGRESS", "BLOCKED", "DONE", "CANCELLED"];

export default function AdminOperationsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");

  const query = useQuery({
    queryKey: ["admin", "operations"],
    queryFn: async () => {
      const res = await apiClient.get<{ tasks: Task[] }>("/operations");
      return res.data?.tasks || [];
    },
  });

  const bookingsQuery = useQuery({
    queryKey: ["admin", "bookings", "list"],
    queryFn: async () => (await apiClient.get("/bookings", { params: { limit: 100 } })).data?.data || [],
  });

  const bookings = bookingsQuery.data || [];

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Task> }) => {
      await apiClient.patch(`/operations/${id}`, data);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "operations"] }),
    onError: (err) => showErrorToast(err, "Failed to update task"),
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiClient.post(`/operations/bookings/${data.bookingId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "operations"] });
      setNewRow({
        bookingId: "",
        title: "",
        category: "GENERAL",
        status: "PENDING",
        estimatedAmount: 0,
        dueAt: format(new Date(), "yyyy-MM-dd"),
      });
    },
    onError: (err) => showErrorToast(err, "Failed to create task"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/operations/${id}`);
    },
    onSuccess: () => {
      toast.success("Task deleted");
      queryClient.invalidateQueries({ queryKey: ["admin", "operations"] });
    },
    onError: (err) => showErrorToast(err, "Failed to delete task"),
  });

  const [newRow, setNewRow] = useState<any>({
    bookingId: "",
    title: "",
    category: "GENERAL",
    status: "PENDING",
    estimatedAmount: 0,
    dueAt: format(new Date(), "yyyy-MM-dd"),
  });

  const handleCellChange = (task: Task, field: string, value: any) => {
    if (task[field as keyof Task] == value) return;
    
    // For date, format correctly or send null
    if (field === "dueAt") {
      value = value ? new Date(value).toISOString() : null;
    }
    
    updateMutation.mutate({ id: task.id, data: { [field]: value } });
  };

  const handleNewRowSubmit = () => {
    if (!newRow.bookingId) return toast.error("Booking reference is required");
    if (!newRow.title.trim()) return toast.error("Title is required");
    
    createMutation.mutate({
      bookingId: newRow.bookingId,
      title: newRow.title,
      category: newRow.category,
      status: newRow.status,
      estimatedAmount: Number(newRow.estimatedAmount) || 0,
      dueAt: newRow.dueAt ? new Date(newRow.dueAt).toISOString() : null,
    });
  };

  const allTasks = query.data || [];
  
  const filtered = useMemo(() => {
    return allTasks.filter((task) => {
      if (status && task.status !== status) return false;
      if (category && task.category !== category) return false;
      const needle = search.trim().toLowerCase();
      if (!needle) return true;
      return [
        task.title,
        task.booking?.bookingReference,
        task.booking?.trip?.title,
        task.booking?.festival?.title,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [allTasks, status, category, search]);

  if (query.isLoading) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#781216]" /></div>;
  if (query.isError) return <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800"><h1 className="font-bold">Tasks could not be loaded</h1><button type="button" onClick={() => query.refetch()} className="mt-3 text-sm font-semibold underline">Try again</button></div>;

  return (
    <div className="mx-auto max-w-[1500px] space-y-5 pb-12">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#781216]">
            Execution core
          </p>
          <h1 className="mt-1 text-2xl font-bold text-gray-950 sm:text-3xl flex items-center gap-2">
            <FileSpreadsheet className="w-8 h-8 text-indigo-600" /> Ground Operations
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
            Manage all operational tasks dynamically in an Excel-like grid.
          </p>
        </div>
      </header>

      <div className="grid gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:grid-cols-[1fr_180px_180px]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search title or booking..." className="pl-10" />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="flex h-10 rounded-md border border-input bg-background px-3 text-sm">
          <option value="">All statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="flex h-10 rounded-md border border-input bg-background px-3 text-sm">
          <option value="">All categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-gray-100 border-b border-gray-300">
              <tr>
                <th className="px-3 py-2 font-semibold text-gray-600 border-r border-gray-300 w-44">Booking Ref</th>
                <th className="px-3 py-2 font-semibold text-gray-600 border-r border-gray-300 w-32">Status</th>
                <th className="px-3 py-2 font-semibold text-gray-600 border-r border-gray-300 w-40">Category</th>
                <th className="px-3 py-2 font-semibold text-gray-600 border-r border-gray-300">Title</th>
                <th className="px-3 py-2 font-semibold text-gray-600 border-r border-gray-300 w-32">Due Date</th>
                <th className="px-3 py-2 font-semibold text-gray-600 border-r border-gray-300 w-32 text-right">Est. Cost</th>
                <th className="px-3 py-2 font-semibold text-gray-600 border-r border-gray-300 w-32 text-right">Arranged</th>
                <th className="px-3 py-2 font-semibold text-gray-600 border-r border-gray-300 w-32 text-right">Paid</th>
                <th className="px-2 py-2 font-semibold text-gray-600 w-10 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.map((task) => (
                <tr key={task.id} className="group hover:bg-blue-50/30">
                  <td className="border-r border-gray-200 p-0">
                    <div className="w-full h-full min-h-10 px-3 flex items-center text-xs font-mono font-medium text-gray-600 cursor-not-allowed">
                      {task.booking?.bookingReference}
                    </div>
                  </td>
                  <td className="border-r border-gray-200 p-0">
                    <select 
                      defaultValue={task.status}
                      onChange={(e) => handleCellChange(task, "status", e.target.value)}
                      className={`w-full h-full min-h-10 px-2 bg-transparent outline-none focus:bg-blue-50 focus:ring-1 focus:ring-blue-500 font-semibold text-[10px] tracking-wide ${task.status === 'DONE' ? 'text-emerald-700' : task.status === 'CANCELLED' ? 'text-red-700' : 'text-blue-700'}`}
                    >
                      {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="border-r border-gray-200 p-0">
                    <select 
                      defaultValue={task.category}
                      onChange={(e) => handleCellChange(task, "category", e.target.value)}
                      className="w-full h-full min-h-10 px-2 bg-transparent outline-none focus:bg-blue-50 focus:ring-1 focus:ring-blue-500 text-xs"
                    >
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </td>
                  <td className="border-r border-gray-200 p-0">
                    <input 
                      type="text"
                      defaultValue={task.title}
                      onBlur={(e) => handleCellChange(task, "title", e.target.value)}
                      className="w-full h-full min-h-10 px-3 bg-transparent outline-none focus:bg-blue-50 focus:ring-1 focus:ring-blue-500 font-medium"
                    />
                  </td>
                  <td className="border-r border-gray-200 p-0">
                    <input 
                      type="date"
                      defaultValue={task.dueAt ? format(new Date(task.dueAt), "yyyy-MM-dd") : ""}
                      onBlur={(e) => handleCellChange(task, "dueAt", e.target.value)}
                      className="w-full h-full min-h-10 px-3 bg-transparent outline-none focus:bg-blue-50 focus:ring-1 focus:ring-blue-500 text-xs"
                    />
                  </td>
                  <td className="border-r border-gray-200 p-0">
                    <input 
                      type="number"
                      step="0.01"
                      defaultValue={task.estimatedAmount}
                      onBlur={(e) => handleCellChange(task, "estimatedAmount", e.target.value)}
                      className="w-full h-full min-h-10 px-3 bg-transparent outline-none text-right font-mono text-gray-500 focus:bg-blue-50 focus:ring-1 focus:ring-blue-500"
                    />
                  </td>
                  <td className="border-r border-gray-200 p-0">
                    <input 
                      type="number"
                      step="0.01"
                      defaultValue={task.amountArranged}
                      onBlur={(e) => handleCellChange(task, "amountArranged", e.target.value)}
                      className="w-full h-full min-h-10 px-3 bg-transparent outline-none text-right font-mono text-blue-600 font-semibold focus:bg-blue-50 focus:ring-1 focus:ring-blue-500"
                    />
                  </td>
                  <td className="border-r border-gray-200 p-0">
                    <input 
                      type="number"
                      step="0.01"
                      defaultValue={task.amountPaid}
                      onBlur={(e) => handleCellChange(task, "amountPaid", e.target.value)}
                      className="w-full h-full min-h-10 px-3 bg-transparent outline-none text-right font-mono text-emerald-600 font-semibold focus:bg-blue-50 focus:ring-1 focus:ring-blue-500"
                    />
                  </td>
                  <td className="p-0 text-center align-middle">
                    <button 
                      onClick={() => deleteMutation.mutate(task.id)}
                      className="text-gray-400 hover:text-red-600 transition-colors mx-auto p-1.5 opacity-0 group-hover:opacity-100"
                      title="Delete task"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              
              {/* Add New Row */}
              <tr className="bg-indigo-50/30 border-t-2 border-indigo-200">
                <td className="border-r border-gray-200 p-0">
                  <select 
                    value={newRow.bookingId}
                    onChange={(e) => setNewRow({...newRow, bookingId: e.target.value})}
                    className="w-full h-full min-h-10 px-2 bg-transparent outline-none focus:bg-indigo-100 focus:ring-1 focus:ring-indigo-500 text-xs font-mono font-medium"
                  >
                    <option value="">Select Booking...</option>
                    {bookings.map((b: any) => <option key={b.id} value={b.id}>{b.bookingReference}</option>)}
                  </select>
                </td>
                <td className="border-r border-gray-200 p-0">
                  <select 
                    value={newRow.status}
                    onChange={(e) => setNewRow({...newRow, status: e.target.value})}
                    className="w-full h-full min-h-10 px-2 bg-transparent outline-none focus:bg-indigo-100 focus:ring-1 focus:ring-indigo-500 font-semibold text-[10px] tracking-wide text-gray-500"
                  >
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
                <td className="border-r border-gray-200 p-0">
                  <select 
                    value={newRow.category}
                    onChange={(e) => setNewRow({...newRow, category: e.target.value})}
                    className="w-full h-full min-h-10 px-2 bg-transparent outline-none focus:bg-indigo-100 focus:ring-1 focus:ring-indigo-500 text-xs"
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </td>
                <td className="border-r border-gray-200 p-0">
                  <input 
                    type="text"
                    value={newRow.title}
                    onChange={(e) => setNewRow({...newRow, title: e.target.value})}
                    onKeyDown={(e) => e.key === 'Enter' && handleNewRowSubmit()}
                    placeholder="New Task Title..."
                    className="w-full h-full min-h-10 px-3 bg-transparent outline-none focus:bg-indigo-100 focus:ring-1 focus:ring-indigo-500 font-medium"
                  />
                </td>
                <td className="border-r border-gray-200 p-0">
                  <input 
                    type="date"
                    value={newRow.dueAt}
                    onChange={(e) => setNewRow({...newRow, dueAt: e.target.value})}
                    className="w-full h-full min-h-10 px-3 bg-transparent outline-none focus:bg-indigo-100 focus:ring-1 focus:ring-indigo-500 text-xs"
                  />
                </td>
                <td className="border-r border-gray-200 p-0">
                  <input 
                    type="number"
                    step="0.01"
                    value={newRow.estimatedAmount}
                    onChange={(e) => setNewRow({...newRow, estimatedAmount: e.target.value})}
                    onKeyDown={(e) => e.key === 'Enter' && handleNewRowSubmit()}
                    className="w-full h-full min-h-10 px-3 bg-transparent outline-none text-right font-mono focus:bg-indigo-100 focus:ring-1 focus:ring-indigo-500"
                  />
                </td>
                <td className="border-r border-gray-200 p-0 bg-gray-50/50">
                  <div className="w-full h-full min-h-10 px-3 flex items-center justify-end text-gray-400 text-xs italic">Auto</div>
                </td>
                <td className="border-r border-gray-200 p-0 bg-gray-50/50">
                  <div className="w-full h-full min-h-10 px-3 flex items-center justify-end text-gray-400 text-xs italic">Auto</div>
                </td>
                <td className="p-0 text-center align-middle">
                  <button 
                    onClick={handleNewRowSubmit}
                    disabled={createMutation.isPending}
                    className="text-indigo-600 hover:text-indigo-800 transition-colors mx-auto p-1.5"
                    title="Add Task"
                  >
                    {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-5 h-5" />}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

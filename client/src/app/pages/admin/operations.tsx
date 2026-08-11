import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Loader2, Plus, Search, FileSpreadsheet, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "../../../lib/axios";
import { Input } from "../../components/ui/input";
import { getErrorMessage, showErrorToast } from "../../../lib/errors";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { SyncIndicator } from "../../components/ui/sync-indicator";
import { OperationsCalendar } from "../../components/admin/operations/OperationsCalendar";

type Task = {
  id: string;
  title: string;
  description?: string | null;
  category: string;
  status: string;
  unitPrice?: number | null;
  quantityNeeded?: number | null;
  quantityAcquired?: number | null;
  dueAt?: string | null;
  completedAt?: string | null;
  booking: {
    id: string;
    bookingReference: string;
    status: string;
    trip?: { id: string; title: string } | null;
    crmTrip?: { id: string; name: string } | null;
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
      const res = await apiClient.get<Task[]>("/operations");
      return res.data || [];
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
        unitPrice: "",
        quantityNeeded: "",
        quantityAcquired: "",
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
    unitPrice: "",
    quantityNeeded: "",
    quantityAcquired: "",
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
    
    const payload: any = {
      bookingId: newRow.bookingId,
      title: newRow.title,
      category: newRow.category,
      status: newRow.status,
      dueAt: newRow.dueAt ? new Date(newRow.dueAt).toISOString() : null,
    };

    if (newRow.unitPrice !== "") payload.unitPrice = Number(newRow.unitPrice);
    if (newRow.quantityNeeded !== "") payload.quantityNeeded = Number(newRow.quantityNeeded);
    if (newRow.quantityAcquired !== "") payload.quantityAcquired = Number(newRow.quantityAcquired);

    createMutation.mutate(payload);
  };

  const allTasks = query.data || [];
  
  const filtered = useMemo(() => {
    return allTasks.filter((task) => {
      if (status && status !== "all" && task.status !== status) return false;
      if (category && category !== "all" && task.category !== category) return false;
      const needle = search.trim().toLowerCase();
      if (!needle) return true;
      return [
        task.title,
        task.booking?.bookingReference,
        task.booking?.trip?.title,
        task.booking?.crmTrip?.name,
        task.booking?.festival?.title,
        task.booking?.user?.profile?.fullName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [allTasks, status, category, search]);

  if (query.isLoading) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#781216]" /></div>;
  if (query.isError) return <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800"><h1 className="font-bold">Tasks could not be loaded</h1><button type="button" onClick={() => query.refetch()} className="mt-3 text-sm font-semibold underline">Try again</button></div>;

  return <div className="mx-auto max-w-[1500px] space-y-5 pb-12"><header><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#781216]">Execution core</p><h1 className="mt-1 flex items-center gap-2 text-2xl font-bold text-gray-950 sm:text-3xl"><FileSpreadsheet className="h-8 w-8 text-indigo-600" />Ground Operations</h1><p className="mt-2 text-sm leading-6 text-gray-600">All operational tasks, organized by due date.</p></header><div className="grid gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:grid-cols-[1fr_180px_180px]"><div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" /><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search title or booking..." className="pl-10" /></div><Select value={status} onValueChange={setStatus}><SelectTrigger className="h-10 rounded-md border-input bg-background shadow-none"><SelectValue placeholder="All statuses" /></SelectTrigger><SelectContent><SelectItem value="all">All statuses</SelectItem>{STATUSES.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select><Select value={category} onValueChange={setCategory}><SelectTrigger className="h-10 rounded-md border-input bg-background shadow-none"><SelectValue placeholder="All categories" /></SelectTrigger><SelectContent><SelectItem value="all">All categories</SelectItem>{CATEGORIES.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div><div className="flex justify-end"><SyncIndicator isMutating={createMutation.isPending || updateMutation.isPending || deleteMutation.isPending} isError={createMutation.isError || updateMutation.isError || deleteMutation.isError} /></div><OperationsCalendar tasks={filtered} emptyMessage="No dated operations match the current filters." /></div>;

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
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="h-10 rounded-md border-input bg-background shadow-none">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="h-10 rounded-md border-input bg-background shadow-none">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end items-center mb-3">
        <SyncIndicator isMutating={createMutation.isPending || updateMutation.isPending || deleteMutation.isPending} isError={createMutation.isError || updateMutation.isError || deleteMutation.isError} />
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
                <th className="px-3 py-2 font-semibold text-gray-600 border-r border-gray-300 w-24 text-right">Unit Price</th>
                <th className="px-3 py-2 font-semibold text-gray-600 border-r border-gray-300 w-24 text-right">Qty Need</th>
                <th className="px-3 py-2 font-semibold text-gray-600 border-r border-gray-300 w-24 text-right">Qty Acq</th>
                <th className="px-2 py-2 font-semibold text-gray-600 w-10 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.map((task) => (
                <tr key={task.id} className={`group transition-colors ${task.status === "DONE" ? "bg-gray-50/80 text-gray-400 hover:bg-gray-100" : "hover:bg-blue-50/30"}`}>
                  <td className="border-r border-gray-200 p-0">
                    <div className="w-full h-full min-h-10 px-3 py-1.5 flex flex-col justify-center text-xs">
                      <span className="font-mono font-medium text-gray-700 leading-none">{task.booking?.bookingReference}</span>
                      {task.booking?.user?.profile?.fullName && (
                        <span className="text-[10px] text-gray-500 mt-1 truncate max-w-[150px]">
                          {task.booking.user.profile.fullName}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="border-r border-gray-200 p-0">
                    <Select 
                      defaultValue={task.status}
                      onValueChange={(val) => handleCellChange(task, "status", val)}
                    >
                      <SelectTrigger className={`h-full min-h-10 border-0 rounded-none bg-transparent shadow-none px-2 focus:bg-blue-50 focus:ring-1 focus:ring-blue-500 font-semibold text-[10px] tracking-wide ${task.status === 'DONE' ? 'text-emerald-700' : task.status === 'CANCELLED' ? 'text-red-700' : 'text-blue-700'}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="border-r border-gray-200 p-0">
                    <Select 
                      defaultValue={task.category}
                      onValueChange={(val) => handleCellChange(task, "category", val)}
                    >
                      <SelectTrigger className="h-full min-h-10 border-0 rounded-none bg-transparent shadow-none px-2 focus:bg-blue-50 focus:ring-1 focus:ring-blue-500 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="border-r border-gray-200 p-0">
                    <input 
                      type="text"
                      defaultValue={task.title}
                      onBlur={(e) => handleCellChange(task, "title", e.target.value)}
                      className={`w-full h-full min-h-10 px-3 bg-transparent outline-none focus:bg-blue-50 focus:ring-1 focus:ring-blue-500 font-medium ${task.status === "DONE" ? "text-gray-400 line-through" : "text-gray-900"}`}
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
                      defaultValue={task.unitPrice ?? ""}
                      onBlur={(e) => handleCellChange(task, "unitPrice", e.target.value)}
                      className="w-full h-full min-h-10 px-3 bg-transparent outline-none text-right font-mono text-gray-700 focus:bg-blue-50 focus:ring-1 focus:ring-blue-500"
                    />
                  </td>
                  <td className="border-r border-gray-200 p-0">
                    <input 
                      type="number"
                      defaultValue={task.quantityNeeded ?? ""}
                      onBlur={(e) => handleCellChange(task, "quantityNeeded", e.target.value)}
                      className="w-full h-full min-h-10 px-3 bg-transparent outline-none text-right font-mono text-gray-700 focus:bg-blue-50 focus:ring-1 focus:ring-blue-500"
                    />
                  </td>
                  <td className="border-r border-gray-200 p-0">
                    <input 
                      type="number"
                      defaultValue={task.quantityAcquired ?? ""}
                      onBlur={(e) => handleCellChange(task, "quantityAcquired", e.target.value)}
                      className="w-full h-full min-h-10 px-3 bg-transparent outline-none text-right font-mono text-blue-600 focus:bg-blue-50 focus:ring-1 focus:ring-blue-500"
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
                  <Select 
                    value={newRow.bookingId}
                    onValueChange={(val) => setNewRow({...newRow, bookingId: val})}
                  >
                    <SelectTrigger className="h-full min-h-10 border-0 rounded-none bg-transparent shadow-none px-2 focus:bg-indigo-100 focus:ring-1 focus:ring-indigo-500 text-xs font-mono font-medium">
                      <SelectValue placeholder="Select Booking..." />
                    </SelectTrigger>
                    <SelectContent>
                      {bookings.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.bookingReference} {b.user?.profile?.fullName ? `(${b.user.profile.fullName})` : ""}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </td>
                <td className="border-r border-gray-200 p-0">
                  <Select 
                    value={newRow.status}
                    onValueChange={(val) => setNewRow({...newRow, status: val})}
                  >
                    <SelectTrigger className="h-full min-h-10 border-0 rounded-none bg-transparent shadow-none px-2 focus:bg-indigo-100 focus:ring-1 focus:ring-indigo-500 font-semibold text-[10px] tracking-wide text-gray-500">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </td>
                <td className="border-r border-gray-200 p-0">
                  <Select 
                    value={newRow.category}
                    onValueChange={(val) => setNewRow({...newRow, category: val})}
                  >
                    <SelectTrigger className="h-full min-h-10 border-0 rounded-none bg-transparent shadow-none px-2 focus:bg-indigo-100 focus:ring-1 focus:ring-indigo-500 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
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
                    value={newRow.unitPrice}
                    onChange={(e) => setNewRow({...newRow, unitPrice: e.target.value})}
                    placeholder="₹"
                    className="w-full h-full min-h-10 px-3 bg-transparent outline-none text-right font-mono focus:bg-indigo-100 focus:ring-1 focus:ring-indigo-500"
                  />
                </td>
                <td className="border-r border-gray-200 p-0">
                  <input 
                    type="number"
                    value={newRow.quantityNeeded}
                    onChange={(e) => setNewRow({...newRow, quantityNeeded: e.target.value})}
                    placeholder="0"
                    className="w-full h-full min-h-10 px-3 bg-transparent outline-none text-right font-mono focus:bg-indigo-100 focus:ring-1 focus:ring-indigo-500"
                  />
                </td>
                <td className="border-r border-gray-200 p-0">
                  <input 
                    type="number"
                    value={newRow.quantityAcquired}
                    onChange={(e) => setNewRow({...newRow, quantityAcquired: e.target.value})}
                    placeholder="0"
                    className="w-full h-full min-h-10 px-3 bg-transparent outline-none text-right font-mono text-blue-600 focus:bg-indigo-100 focus:ring-1 focus:ring-indigo-500"
                  />
                </td>
                <td className="border-r border-gray-200 p-0 bg-gray-50/50">
                  <div className="w-full h-full min-h-10 px-3 flex items-center justify-end text-gray-500 font-mono text-sm">
                    {newRow.unitPrice && newRow.quantityNeeded
                      ? (Number(newRow.unitPrice) * Number(newRow.quantityNeeded)).toFixed(2)
                      : "—"}
                  </div>
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

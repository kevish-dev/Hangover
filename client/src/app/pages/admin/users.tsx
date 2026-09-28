import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Loader2, Search, Trash2, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { apiClient } from "../../../lib/axios";
import { useAuth } from "../../../contexts/AuthContext";
import { Input } from "../../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../components/ui/dialog";

type Account = {
  id: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string | null;
  profile?: { fullName?: string | null; phone?: string | null; city?: string | null; state?: string | null } | null;
};

type PendingAction =
  | { type: "role"; user: Account; nextRole: string }
  | { type: "delete"; user: Account };

type UsersResponse = { data: Account[]; meta: { total: number; totalPages: number } };
const formatDate = (value?: string | null) => value ? new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";
const csvValue = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const usersQuery = useQuery({
    queryKey: ["admin", "users", "all"],
    queryFn: async () => {
      const first = (await apiClient.get<UsersResponse>("/users", { params: { page: 1, limit: 500 } })).data;
      if (first.meta.totalPages <= 1) return first.data;
      const pages = await Promise.all(Array.from({ length: first.meta.totalPages - 1 }, (_, index) => apiClient.get<UsersResponse>("/users", { params: { page: index + 2, limit: 500 } })));
      return [...first.data, ...pages.flatMap((page) => page.data.data)];
    },
  });
  const users = usersQuery.data || [];

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) => apiClient.patch(`/users/${id}/role`, { role }),
    onSuccess: () => {
      toast.success("User role updated");
      queryClient.invalidateQueries({ queryKey: ["admin", "users", "all"] });
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || "Failed to update role"),
    onSettled: () => setPendingAction(null),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/users/${id}`),
    onSuccess: () => {
      toast.success("User deleted");
      queryClient.invalidateQueries({ queryKey: ["admin", "users", "all"] });
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || "Failed to delete user"),
    onSettled: () => setPendingAction(null),
  });

  const confirmPendingAction = () => {
    if (!pendingAction) return;
    if (pendingAction.type === "role") roleMutation.mutate({ id: pendingAction.user.id, role: pendingAction.nextRole });
    else deleteMutation.mutate(pendingAction.user.id);
  };
  const isActing = roleMutation.isPending || deleteMutation.isPending;
  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return users;
    return users.filter((user) => [user.email, user.profile?.fullName, user.profile?.phone, user.profile?.city, user.profile?.state, user.role].filter(Boolean).join(" ").toLowerCase().includes(term));
  }, [search, users]);
  const exportCsv = () => {
    const rows = [["Name", "Email", "Phone", "Role", "Account status", "City", "State", "Joined", "Last login"], ...filteredUsers.map((user) => [user.profile?.fullName || "", user.email, user.profile?.phone || "", user.role, user.isActive ? "Active" : "Inactive", user.profile?.city || "", user.profile?.state || "", formatDate(user.createdAt), formatDate(user.lastLoginAt)])];
    const csv = rows.map((row) => row.map(csvValue).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `hangover-trails-users-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (usersQuery.isLoading) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-[#781216]" /></div>;
  if (usersQuery.isError) return <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-800"><p className="font-bold">Accounts could not be loaded.</p><button type="button" className="mt-2 text-sm font-semibold underline" onClick={() => usersQuery.refetch()}>Try again</button></div>;

  return <div className="mx-auto max-w-[1500px] space-y-5 pb-12"><header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#781216]">Accounts</p><h1 className="mt-1 flex items-center gap-2 text-2xl font-bold text-gray-950 sm:text-3xl"><Users className="h-7 w-7 text-[#781216]" />Users</h1><p className="mt-2 text-sm text-gray-600">{users.length.toLocaleString("en-IN")} account{users.length === 1 ? "" : "s"} in total.</p></div><button type="button" onClick={exportCsv} disabled={!filteredUsers.length} className="inline-flex items-center justify-center gap-2 rounded-md bg-[#781216] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#5f0e11] disabled:cursor-not-allowed disabled:opacity-50"><Download className="h-4 w-4" />Export CSV</button></header><div className="rounded-xl border border-gray-200 bg-white p-4"><div className="relative max-w-lg"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, email, phone, or location" className="pl-10" /></div></div><div className="overflow-hidden rounded-xl border border-gray-200 bg-white"><div className="border-b px-5 py-4"><h2 className="font-bold text-gray-900">All accounts</h2><p className="mt-1 text-xs text-gray-500">Showing {filteredUsers.length.toLocaleString("en-IN")} of {users.length.toLocaleString("en-IN")} accounts.</p></div><div className="overflow-x-auto"><table className="min-w-[940px] w-full text-left text-sm"><thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500"><tr><th className="px-5 py-3 font-semibold">User</th><th className="px-5 py-3 font-semibold">Contact</th><th className="px-5 py-3 font-semibold">Role</th><th className="px-5 py-3 font-semibold">Status</th><th className="px-5 py-3 font-semibold">Joined</th><th className="px-5 py-3 font-semibold">Last login</th><th className="px-5 py-3 font-semibold text-right">Actions</th></tr></thead><tbody className="divide-y divide-gray-100">{filteredUsers.map((user) => { const isSelf = user.id === currentUser?.id; return <tr key={user.id}><td className="px-5 py-3"><p className="font-semibold text-gray-900">{user.profile?.fullName || "No name provided"}</p><p className="mt-0.5 text-xs text-gray-500">{user.profile?.city || user.profile?.state ? [user.profile?.city, user.profile?.state].filter(Boolean).join(", ") : "Location not provided"}</p></td><td className="px-5 py-3"><p className="text-gray-800">{user.email}</p><p className="mt-0.5 text-xs text-gray-500">{user.profile?.phone || "No phone provided"}</p></td><td className="px-5 py-3">
    <Select
      value={user.role}
      disabled={isSelf || isActing}
      onValueChange={(nextRole) => { if (nextRole !== user.role) setPendingAction({ type: "role", user, nextRole }); }}
    >
      <SelectTrigger className="h-8 w-[110px] text-xs font-bold" title={isSelf ? "You cannot change your own role" : undefined}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="USER">USER</SelectItem>
        <SelectItem value="ADMIN">ADMIN</SelectItem>
      </SelectContent>
    </Select>
  </td><td className="px-5 py-3"><span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${user.isActive ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>{user.isActive ? "ACTIVE" : "INACTIVE"}</span></td><td className="px-5 py-3 text-gray-600">{formatDate(user.createdAt)}</td><td className="px-5 py-3 text-gray-600">{formatDate(user.lastLoginAt)}</td><td className="px-5 py-3 text-right">
    <button
      type="button"
      disabled={isSelf || isActing}
      title={isSelf ? "You cannot delete your own account" : "Delete user"}
      onClick={() => setPendingAction({ type: "delete", user })}
      className="inline-flex items-center justify-center rounded-full p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-gray-400"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  </td></tr>; })}{!filteredUsers.length && <tr><td colSpan={7} className="p-10 text-center text-sm text-gray-500">No accounts match this search.</td></tr>}</tbody></table></div></div>

      <Dialog open={!!pendingAction} onOpenChange={(open) => { if (!open && !isActing) setPendingAction(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{pendingAction?.type === "delete" ? "Delete this user?" : "Change user role?"}</DialogTitle>
            <DialogDescription>
              {pendingAction?.type === "delete"
                ? <>This permanently deletes <strong>{pendingAction.user.profile?.fullName || pendingAction.user.email}</strong> and all of their bookings, reviews, and other data. This cannot be undone.</>
                : pendingAction
                  ? <>This changes <strong>{pendingAction.user.profile?.fullName || pendingAction.user.email}</strong>'s role from <strong>{pendingAction.user.role}</strong> to <strong>{pendingAction.nextRole}</strong>.</>
                  : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button type="button" onClick={() => setPendingAction(null)} disabled={isActing} className="inline-flex items-center justify-center rounded-md border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50">Cancel</button>
            <button
              type="button"
              onClick={confirmPendingAction}
              disabled={isActing}
              className={`inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 ${pendingAction?.type === "delete" ? "bg-red-600 hover:bg-red-700" : "bg-[#781216] hover:bg-[#5f0e11]"}`}
            >
              {isActing && <Loader2 className="h-4 w-4 animate-spin" />}
              {pendingAction?.type === "delete" ? "Delete user" : "Change role"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>;
}

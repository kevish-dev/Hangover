import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Mail } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { apiClient } from "../../../lib/axios";
import { Checkbox } from "../../components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";

type Admin = { id: string; email: string; fullName: string | null; isActive: boolean };
type Category = { key: string; label: string; description: string; defaultNote: string };
type SettingsResponse = { admins: Admin[]; categories: Category[]; recipients: Record<string, string[]> };

export default function AdminNotificationsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<string>("");
  const [selections, setSelections] = useState<Record<string, Set<string>>>({});

  const settingsQuery = useQuery({
    queryKey: ["admin", "notifications", "settings"],
    queryFn: async () => (await apiClient.get<SettingsResponse>("/notifications/settings")).data,
  });

  useEffect(() => {
    if (!settingsQuery.data) return;
    setSelections(Object.fromEntries(
      Object.entries(settingsQuery.data.recipients).map(([category, ids]) => [category, new Set(ids)]),
    ));
    setActiveTab((current) => current || settingsQuery.data.categories[0]?.key || "");
  }, [settingsQuery.data]);

  const saveMutation = useMutation({
    mutationFn: ({ category, userIds }: { category: string; userIds: string[] }) =>
      apiClient.put(`/notifications/settings/${category}`, { userIds }),
    onSuccess: () => {
      toast.success("Recipients updated");
      queryClient.invalidateQueries({ queryKey: ["admin", "notifications", "settings"] });
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || "Failed to update recipients"),
  });

  if (settingsQuery.isLoading) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-[#781216]" /></div>;
  if (settingsQuery.isError || !settingsQuery.data) return <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-800"><p className="font-bold">Notification settings could not be loaded.</p><button type="button" className="mt-2 text-sm font-semibold underline" onClick={() => settingsQuery.refetch()}>Try again</button></div>;

  const { admins, categories } = settingsQuery.data;
  const originalRecipients = settingsQuery.data.recipients;

  const toggleAdmin = (category: string, adminId: string) => {
    setSelections((prev) => {
      const next = new Set(prev[category] || []);
      if (next.has(adminId)) next.delete(adminId); else next.add(adminId);
      return { ...prev, [category]: next };
    });
  };

  const isDirty = (category: string) => {
    const current = [...(selections[category] || [])].sort();
    const original = [...(originalRecipients[category] || [])].sort();
    return JSON.stringify(current) !== JSON.stringify(original);
  };

  return (
    <div className="mx-auto max-w-[1100px] space-y-5 pb-12">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#781216]">Settings</p>
        <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold text-gray-950 sm:text-3xl"><Mail className="h-7 w-7 text-[#781216]" />Notifications</h1>
        <p className="mt-2 text-sm text-gray-600">Choose which admins receive each kind of system email.</p>
      </header>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          {categories.map((category) => (
            <TabsTrigger key={category.key} value={category.key}>{category.label}</TabsTrigger>
          ))}
        </TabsList>

        {categories.map((category) => (
          <TabsContent key={category.key} value={category.key}>
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
              <div className="border-b px-5 py-4">
                <h2 className="font-bold text-gray-900">{category.label}</h2>
                <p className="mt-1 text-xs text-gray-500">{category.description}</p>
                <p className="mt-1 text-xs text-gray-400">
                  {(selections[category.key]?.size || 0) === 0 ? category.defaultNote : `${selections[category.key]?.size} admin${selections[category.key]?.size === 1 ? "" : "s"} selected.`}
                </p>
              </div>
              <div className="divide-y divide-gray-100">
                {admins.map((admin) => (
                  <label key={admin.id} htmlFor={`${category.key}-${admin.id}`} className="flex cursor-pointer items-center gap-3 px-5 py-3 hover:bg-gray-50">
                    <Checkbox
                      id={`${category.key}-${admin.id}`}
                      checked={selections[category.key]?.has(admin.id) || false}
                      onCheckedChange={() => toggleAdmin(category.key, admin.id)}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-gray-900">{admin.fullName || "No name provided"}</p>
                      <p className="truncate text-xs text-gray-500">{admin.email}</p>
                    </div>
                    {!admin.isActive && <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-bold text-gray-500">INACTIVE</span>}
                  </label>
                ))}
                {!admins.length && <p className="p-10 text-center text-sm text-gray-500">No admin accounts found.</p>}
              </div>
              <div className="flex justify-end gap-2 border-t px-5 py-4">
                <button
                  type="button"
                  disabled={!isDirty(category.key) || saveMutation.isPending}
                  onClick={() => setSelections((prev) => ({ ...prev, [category.key]: new Set(originalRecipients[category.key] || []) }))}
                  className="inline-flex items-center justify-center rounded-md border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Reset
                </button>
                <button
                  type="button"
                  disabled={!isDirty(category.key) || saveMutation.isPending}
                  onClick={() => saveMutation.mutate({ category: category.key, userIds: [...(selections[category.key] || [])] })}
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-[#781216] px-4 py-2 text-sm font-semibold text-white hover:bg-[#5f0e11] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save changes
                </button>
              </div>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

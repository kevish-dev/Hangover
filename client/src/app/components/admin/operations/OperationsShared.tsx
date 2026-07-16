import type { ReactNode } from "react";
import { CheckCircle2, X } from "lucide-react";
import { format, isValid } from "date-fns";

export const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });

export const formatMoney = (value: string | number | null | undefined) => money.format(Number(value || 0));

export const formatDate = (value: string | Date | null | undefined, pattern = "dd MMM yyyy") => {
  if (!value) return "Not set";
  const date = new Date(value);
  return isValid(date) ? format(date, pattern) : "Invalid date";
};

export const toDateTimeLocal = (value: string | null | undefined) => {
  if (!value) return "";
  const date = new Date(value);
  if (!isValid(date)) return "";
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

export const fromDateTimeLocal = (value: string) => value ? new Date(value).toISOString() : null;

const statusColors: Record<string, string> = {
  READY: "border-emerald-200 bg-emerald-50 text-emerald-700",
  VERIFIED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  PAID: "border-emerald-200 bg-emerald-50 text-emerald-700",
  COMPLETED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  CONFIRMED: "border-blue-200 bg-blue-50 text-blue-700",
  CHECKED_IN: "border-blue-200 bg-blue-50 text-blue-700",
  CHECKED_OUT: "border-slate-200 bg-slate-50 text-slate-700",
  IN_PROGRESS: "border-amber-200 bg-amber-50 text-amber-800",
  PARTIALLY_PAID: "border-amber-200 bg-amber-50 text-amber-800",
  PENDING: "border-amber-200 bg-amber-50 text-amber-800",
  REQUESTED: "border-violet-200 bg-violet-50 text-violet-700",
  PLANNING: "border-slate-200 bg-slate-50 text-slate-700",
  PLANNED: "border-slate-200 bg-slate-50 text-slate-700",
  OPEN: "border-sky-200 bg-sky-50 text-sky-700",
  BLOCKED: "border-red-200 bg-red-50 text-red-700",
  REJECTED: "border-red-200 bg-red-50 text-red-700",
  OVERDUE: "border-red-200 bg-red-50 text-red-700",
  FAILED: "border-red-200 bg-red-50 text-red-700",
  CANCELLED: "border-slate-200 bg-slate-100 text-slate-600",
  UNVERIFIED: "border-slate-200 bg-slate-50 text-slate-600",
  UNPAID: "border-red-200 bg-red-50 text-red-700",
};

export function StatusBadge({ status, compact = false }: { status: string; compact?: boolean }) {
  return (
    <span className={`inline-flex items-center rounded-full border font-bold uppercase tracking-[0.08em] ${compact ? "px-2 py-0.5 text-[9px]" : "px-2.5 py-1 text-[10px]"} ${statusColors[status] || statusColors.PLANNING}`}>
      {status.replaceAll("_", " ")}
    </span>
  );
}

export function Panel({ title, eyebrow, action, children, className = "" }: { title: string; eyebrow?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-gray-200 bg-white shadow-sm ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 px-4 py-4 sm:px-5">
        <div>
          {eyebrow && <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#781216]">{eyebrow}</p>}
          <h2 className="text-base font-bold text-gray-950">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function DrawerShell({ title, subtitle, onClose, children, width = "max-w-6xl" }: { title: string; subtitle?: ReactNode; onClose: () => void; children: ReactNode; width?: string }) {
  return (
    <div role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-[70] flex justify-end bg-black/45 backdrop-blur-[2px]" onClick={onClose}>
      <div className={`flex h-full w-full ${width} flex-col bg-[#f7f7f8] shadow-2xl`} onClick={(event) => event.stopPropagation()}>
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-gray-200 bg-white px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-bold text-gray-950 sm:text-xl">{title}</h2>
            {subtitle && <div className="mt-1 text-sm text-gray-500">{subtitle}</div>}
          </div>
          <button type="button" aria-label="Close" onClick={onClose} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-900"><X className="h-5 w-5" /></button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-5">{children}</div>
      </div>
    </div>
  );
}

export function EmptyState({ title, detail }: { title: string; detail: string }) {
  return <div className="px-4 py-10 text-center"><CheckCircle2 className="mx-auto mb-3 h-7 w-7 text-gray-300" /><p className="font-semibold text-gray-700">{title}</p><p className="mt-1 text-sm text-gray-500">{detail}</p></div>;
}

export const inputClass = "min-h-10 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-[#781216] focus:ring-2 focus:ring-[#781216]/10";
export const labelClass = "mb-1.5 block text-xs font-semibold text-gray-700";
export const primaryButton = "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[#781216] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#5f0e11] disabled:cursor-not-allowed disabled:opacity-50";
export const secondaryButton = "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50";

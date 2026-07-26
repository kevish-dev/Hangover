import { Loader2, CheckCircle2, XCircle, Cloud } from "lucide-react";
import { useEffect, useState } from "react";

export function SyncIndicator({ isMutating, isError }: { isMutating: boolean; isError: boolean }) {
  const [showSaved, setShowSaved] = useState(false);

  useEffect(() => {
    if (!isMutating && !isError) {
      setShowSaved(true);
      const t = setTimeout(() => setShowSaved(false), 2000);
      return () => clearTimeout(t);
    }
  }, [isMutating, isError]);

  if (isError) {
    return (
      <div className="flex items-center gap-1.5 text-[11px] font-bold tracking-wider uppercase text-red-600 bg-red-50 px-2.5 py-1.5 rounded-full border border-red-200">
        <XCircle className="w-3.5 h-3.5" /> Sync Error
      </div>
    );
  }

  if (isMutating) {
    return (
      <div className="flex items-center gap-1.5 text-[11px] font-bold tracking-wider uppercase text-blue-600 bg-blue-50 px-2.5 py-1.5 rounded-full border border-blue-200 shadow-sm">
        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving
      </div>
    );
  }

  if (showSaved) {
    return (
      <div className="flex items-center gap-1.5 text-[11px] font-bold tracking-wider uppercase text-emerald-600 bg-emerald-50 px-2.5 py-1.5 rounded-full border border-emerald-200">
        <CheckCircle2 className="w-3.5 h-3.5" /> Saved
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 text-[11px] font-bold tracking-wider uppercase text-gray-400">
      <Cloud className="w-3.5 h-3.5" /> Synced
    </div>
  );
}

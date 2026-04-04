import { WifiOff, Wifi, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useOffline } from "@/lib/offline-context";

export default function OfflineBanner() {
  const { isOffline, isSyncing, wasSynced } = useOffline();

  if (!isOffline && !isSyncing && !wasSynced) return null;

  return (
    <div
      className={cn(
        "flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium transition-all duration-300",
        isOffline
          ? "bg-amber-500 text-white"
          : isSyncing
          ? "bg-blue-600 text-white"
          : "bg-green-500 text-white"
      )}
      data-testid="offline-banner"
      role="status"
      aria-live="polite"
    >
      {isOffline && (
        <>
          <WifiOff className="h-4 w-4 flex-shrink-0" />
          <span>You're offline — all data is saved locally</span>
        </>
      )}
      {!isOffline && isSyncing && (
        <>
          <RefreshCw className="h-4 w-4 flex-shrink-0 animate-spin" />
          <span>Syncing your data...</span>
        </>
      )}
      {!isOffline && !isSyncing && wasSynced && (
        <>
          <Wifi className="h-4 w-4 flex-shrink-0" />
          <span>Back online — all changes synced!</span>
        </>
      )}
    </div>
  );
}

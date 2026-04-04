import { useState, useEffect } from "react";
import { WifiOff, Wifi } from "lucide-react";
import { cn } from "@/lib/utils";

export default function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showRestored, setShowRestored] = useState(false);

  useEffect(() => {
    function handleOffline() {
      setIsOnline(false);
      setShowRestored(false);
    }
    function handleOnline() {
      setIsOnline(true);
      setShowRestored(true);
      const timer = setTimeout(() => setShowRestored(false), 3000);
      return () => clearTimeout(timer);
    }
    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  if (isOnline && !showRestored) return null;

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-4 py-2 text-sm font-medium text-center justify-center transition-all duration-300",
        !isOnline
          ? "bg-amber-500 text-white"
          : "bg-green-500 text-white"
      )}
      data-testid="offline-banner"
      role="status"
      aria-live="polite"
    >
      {!isOnline ? (
        <>
          <WifiOff className="h-4 w-4 flex-shrink-0" />
          <span>You're offline — all data is saved locally</span>
        </>
      ) : (
        <>
          <Wifi className="h-4 w-4 flex-shrink-0" />
          <span>Back online!</span>
        </>
      )}
    </div>
  );
}

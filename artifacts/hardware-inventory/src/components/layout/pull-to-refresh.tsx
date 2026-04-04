import { useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";

const THRESHOLD = 64;

export default function PullToRefresh() {
  const [pullY, setPullY] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef<number | null>(null);
  const isDragging = useRef(false);

  useEffect(() => {
    function onTouchStart(e: TouchEvent) {
      const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
      if (scrollTop > 0) return;
      startY.current = e.touches[0].clientY;
      isDragging.current = true;
    }

    function onTouchMove(e: TouchEvent) {
      if (!isDragging.current || startY.current === null) return;
      const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
      if (scrollTop > 0) { isDragging.current = false; return; }
      const dy = e.touches[0].clientY - startY.current;
      if (dy > 0) {
        setPullY(Math.min(dy * 0.5, THRESHOLD * 1.3));
      }
    }

    function onTouchEnd() {
      if (!isDragging.current) return;
      isDragging.current = false;
      if (pullY >= THRESHOLD) {
        setRefreshing(true);
        setTimeout(() => {
          setRefreshing(false);
          setPullY(0);
          window.location.reload();
        }, 1200);
      } else {
        setPullY(0);
      }
      startY.current = null;
    }

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [pullY]);

  if (pullY === 0 && !refreshing) return null;

  const progress = Math.min(pullY / THRESHOLD, 1);
  const triggered = pullY >= THRESHOLD || refreshing;

  return (
    <div
      className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-center pointer-events-none transition-all duration-200"
      style={{ height: `${refreshing ? 56 : pullY}px`, overflow: "hidden" }}
      data-testid="pull-to-refresh"
    >
      <div
        className="flex items-center gap-2 text-blue-600 font-medium text-sm bg-white rounded-full px-4 py-2 shadow-md border border-slate-100"
        style={{ opacity: Math.min(progress * 1.5, 1) }}
      >
        <RefreshCw
          className="h-4 w-4"
          style={{
            transform: `rotate(${refreshing ? 0 : progress * 270}deg)`,
            animation: refreshing ? "spin 0.8s linear infinite" : "none",
          }}
        />
        <span>{triggered ? "Refreshing..." : "Pull to refresh"}</span>
      </div>
    </div>
  );
}

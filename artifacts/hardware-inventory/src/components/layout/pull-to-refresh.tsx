import { useEffect, useRef, useState, useCallback } from "react";
import { RefreshCw } from "lucide-react";

const THRESHOLD = 60;

interface PullToRefreshProps {
  onRefresh: () => void;
}

export default function PullToRefresh({ onRefresh }: PullToRefreshProps) {
  const [pullY, setPullY] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef<number | null>(null);
  const isDragging = useRef(false);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      onRefresh();
      setRefreshing(false);
      setPullY(0);
    }, 1000);
  }, [onRefresh]);

  useEffect(() => {
    function onTouchStart(e: TouchEvent) {
      const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
      if (scrollTop > 0 || refreshing) return;
      startY.current = e.touches[0].clientY;
      isDragging.current = true;
    }

    function onTouchMove(e: TouchEvent) {
      if (!isDragging.current || startY.current === null || refreshing) return;
      const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
      if (scrollTop > 0) { isDragging.current = false; setPullY(0); return; }
      const dy = e.touches[0].clientY - startY.current;
      if (dy > 0) {
        setPullY(Math.min(dy * 0.45, THRESHOLD * 1.4));
      }
    }

    function onTouchEnd() {
      if (!isDragging.current) return;
      isDragging.current = false;
      if (pullY >= THRESHOLD && !refreshing) {
        handleRefresh();
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
  }, [pullY, refreshing, handleRefresh]);

  if (pullY === 0 && !refreshing) return null;

  const progress = Math.min(pullY / THRESHOLD, 1);
  const triggered = pullY >= THRESHOLD || refreshing;

  return (
    <div
      className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-center pointer-events-none"
      style={{ height: `${refreshing ? 52 : Math.max(pullY, 0)}px`, overflow: "hidden", transition: refreshing ? "height 0.2s ease" : "none" }}
      data-testid="pull-to-refresh"
    >
      <div
        className="flex items-center gap-2 text-blue-600 font-medium text-sm bg-white rounded-full px-4 py-2 shadow-md border border-slate-100"
        style={{ opacity: Math.min(progress * 2, 1), transform: `scale(${0.8 + progress * 0.2})` }}
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

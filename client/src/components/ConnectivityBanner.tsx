import { useLayoutEffect, useRef } from "react";
import { WifiOff } from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

export function ConnectivityBanner() {
  const isOnline = useOnlineStatus();
  const bannerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const root = document.documentElement;

    if (isOnline) {
      delete root.dataset.offlineBanner;
      root.style.removeProperty("--connectivity-banner-height");
      return;
    }

    const syncHeight = () => {
      const height = bannerRef.current?.offsetHeight ?? 40;
      root.dataset.offlineBanner = "true";
      root.style.setProperty("--connectivity-banner-height", `${height}px`);
    };

    syncHeight();

    const el = bannerRef.current;
    if (!el) return;

    const observer = new ResizeObserver(syncHeight);
    observer.observe(el);

    return () => {
      observer.disconnect();
      delete root.dataset.offlineBanner;
      root.style.removeProperty("--connectivity-banner-height");
    };
  }, [isOnline]);

  if (isOnline) {
    return null;
  }

  return (
    <div
      ref={bannerRef}
      role="status"
      aria-live="polite"
      className="fixed top-0 left-0 right-0 z-[100] w-full bg-amber-500 text-black text-xs sm:text-sm py-2 px-3 flex items-center justify-center"
    >
      <div className="flex items-center gap-2 max-w-5xl w-full justify-center">
        <WifiOff className="h-4 w-4 flex-shrink-0" />
        <span className="font-semibold">You are offline.</span>
        <span className="hidden sm:inline">
          Cached data and secure messaging are available. Changes sync when you reconnect.
        </span>
      </div>
    </div>
  );
}

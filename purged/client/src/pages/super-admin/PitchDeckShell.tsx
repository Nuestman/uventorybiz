import type { CSSProperties } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Maximize2, Minimize2, PanelLeftClose } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ensureSourceSans3Loaded } from "@/lib/ensureSourceSans3";
import { cn } from "@/lib/utils";
import type { PitchSlide } from "./pitchDeckTypes";
import { uventorybizLogoHeader, PitchSlideBody } from "./PitchSlideBody";

const headingPage: CSSProperties = {
  fontFamily: '"Odibee Sans", cursive',
  letterSpacing: "0.045em",
};
const fontSans: CSSProperties = { fontFamily: "'Source Sans 3', system-ui, sans-serif" };

export interface PitchDeckShellProps {
  slides: PitchSlide[];
  pageTitle: string;
  pageSubtitle: string;
}

export function PitchDeckShell({ slides, pageTitle, pageSubtitle }: PitchDeckShellProps) {
  const [index, setIndex] = useState(0);
  const [fs, setFs] = useState(false);
  const shellRef = useRef<HTMLDivElement>(null);
  const total = slides.length;
  const slide = slides[index];

  useEffect(() => {
    ensureSourceSans3Loaded();
  }, []);

  const go = useCallback(
    (dir: -1 | 1) => {
      setIndex((i) => Math.min(total - 1, Math.max(0, i + dir)));
    },
    [total],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") {
        e.preventDefault();
        go(1);
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        go(-1);
      } else if (e.key === "Home") {
        e.preventDefault();
        setIndex(0);
      } else if (e.key === "End") {
        e.preventDefault();
        setIndex(total - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, total]);

  useEffect(() => {
    const onFsChange = () => {
      const el = shellRef.current;
      setFs(!!document.fullscreenElement && document.fullscreenElement === el);
    };
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  const toggleFs = async () => {
    const el = shellRef.current;
    if (!el) return;
    try {
      if (!document.fullscreenElement) {
        await el.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      /* ignore */
    }
  };

  const progress = ((index + 1) / total) * 100;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 style={headingPage} className="text-xl md:text-2xl font-normal text-gray-900 leading-tight">
            {pageTitle}
          </h1>
          <p className="text-sm text-muted-foreground">{pageSubtitle}</p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/super-admin/dashboard">
            <PanelLeftClose className="h-4 w-4 mr-2" />
            Back to dashboard
          </Link>
        </Button>
      </div>

      <div
        ref={shellRef}
        className={cn(
          "relative overflow-hidden shadow-2xl ring-1 ring-black/10 bg-[#060a12]",
          fs ? "h-[100dvh] min-h-[100dvh] w-full rounded-none" : "rounded-2xl min-h-[min(720px,calc(100dvh-10rem))]",
        )}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-100"
          style={{
            background:
              "radial-gradient(ellipse 120% 80% at 10% -20%, rgba(246,98,30,0.18), transparent 50%), radial-gradient(ellipse 90% 70% at 100% 100%, rgba(20,47,92,0.45), transparent 55%), linear-gradient(168deg, #050810 0%, #0c1830 38%, #120805 100%)",
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          }}
        />

        <div
          className={cn(
            "relative z-10 flex flex-col min-h-0 w-full",
            fs ? "h-full min-h-0" : "h-[min(720px,calc(100dvh-10rem))] min-h-[420px]",
          )}
        >
          <div className="shrink-0 flex items-center justify-between gap-3 px-4 py-3 border-b border-white/[0.06] bg-[#060a12]/80">
            <div className="flex items-center gap-3 min-w-0">
              <uventorybizLogoHeader className="h-7 sm:h-8" />
              <span style={fontSans} className="text-slate-500 text-xs sm:text-sm whitespace-nowrap shrink-0">
                · confidential
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 text-slate-400 hover:text-white hover:bg-white/10"
                onClick={toggleFs}
              >
                {fs ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                <span style={fontSans} className="ml-2 hidden sm:inline text-xs">
                  {fs ? "Exit" : "Fullscreen"}
                </span>
              </Button>
            </div>
          </div>

          <div className="flex-1 min-h-0 relative">
            <div className="absolute inset-0 min-h-0 z-0">
              <AnimatePresence mode="wait">
                <motion.div
                  key={slide.id}
                  role="tabpanel"
                  aria-label={`Slide ${index + 1} of ${total}`}
                  initial={{ opacity: 0, x: 28 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute inset-0 overflow-y-auto"
                >
                  <PitchSlideBody slide={slide} />
                </motion.div>
              </AnimatePresence>
            </div>
            <button
              type="button"
              aria-label="Previous slide"
              className="absolute left-0 top-0 bottom-0 z-20 w-[12%] min-w-[3rem] cursor-w-resize bg-transparent hover:bg-white/[0.03] transition-colors border-0 rounded-none"
              onClick={() => go(-1)}
            />
            <button
              type="button"
              aria-label="Next slide"
              className="absolute right-0 top-0 bottom-0 z-20 w-[12%] min-w-[3rem] cursor-e-resize bg-transparent hover:bg-white/[0.03] transition-colors border-0 rounded-none"
              onClick={() => go(1)}
            />
          </div>

          <div className="shrink-0 border-t border-white/[0.06] px-4 py-3 flex flex-wrap items-center gap-3 bg-black/30">
            <div className="flex items-center gap-1">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-9 w-9 text-slate-300 hover:text-white hover:bg-white/10"
                disabled={index <= 0}
                onClick={() => go(-1)}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-9 w-9 text-slate-300 hover:text-white hover:bg-white/10"
                disabled={index >= total - 1}
                onClick={() => go(1)}
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
            <div className="flex-1 min-w-[120px]">
              <div className="h-1 rounded-full bg-white/[0.08] overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#F6621E] to-[#ff8f4d] transition-[width] duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
            <span style={fontSans} className="text-xs sm:text-sm text-slate-500 tabular-nums shrink-0">
              {index + 1} / {total} · {slide.label}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

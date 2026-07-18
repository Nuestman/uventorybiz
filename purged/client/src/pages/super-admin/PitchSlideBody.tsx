import type { CSSProperties } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { PitchSlide } from "./pitchDeckTypes";

const uventorybizLogoFull = "/public/logos/uventorybiz-logo-full.png";

const fontHeading: CSSProperties = { fontFamily: '"Odibee Sans", cursive' };
const headingH2: CSSProperties = { ...fontHeading, letterSpacing: "0.05em" };
const headingH3: CSSProperties = { ...fontHeading, letterSpacing: "0.042em" };
const fontSans: CSSProperties = { fontFamily: "'Source Sans 3', system-ui, sans-serif" };

export function PitchSlideBody({ slide }: { slide: PitchSlide }) {
  if (slide.kind === "hero") {
    return (
      <div className="flex flex-col justify-center h-full text-center px-6 md:px-16 py-8 md:py-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-4xl flex flex-col items-center"
        >
          <img
            src={uventorybizLogoFull}
            alt="MineAid Health Management System"
            className="h-[clamp(4.5rem,14vw,7.5rem)] w-auto max-w-[min(92vw,24rem)] object-contain drop-shadow-lg mb-2"
          />
          {slide.subtitle && (
            <p
              style={fontSans}
              className="mt-8 text-xl md:text-2xl lg:text-[1.65rem] text-slate-200/95 leading-relaxed max-w-3xl mx-auto font-medium"
            >
              {slide.subtitle}
            </p>
          )}
          {slide.footnote && (
            <p style={fontSans} className="mt-10 md:mt-12 text-sm md:text-base text-slate-500 uppercase tracking-[0.18em]">
              {slide.footnote}
            </p>
          )}
        </motion.div>
      </div>
    );
  }

  if (slide.kind === "statement") {
    return (
      <div className="flex flex-col justify-center h-full px-6 md:px-14 lg:px-20 py-8 md:py-12">
        <div className="max-w-4xl">
          <span
            style={fontSans}
            className="text-[#F6621E] text-sm font-semibold uppercase tracking-[0.22em] mb-4 block"
          >
            {slide.label}
          </span>
          <h2
            style={headingH2}
            className="text-[clamp(2.65rem,5.4vw,4.35rem)] font-normal text-white leading-[1.1]"
          >
            {slide.title}
          </h2>
          <div className="mt-8 md:mt-10 space-y-6">
            {slide.lines?.map((line, li) => (
              <p
                key={li}
                style={fontSans}
                className="text-lg md:text-xl text-slate-200 leading-relaxed border-l-[3px] border-[#F6621E]/70 pl-5 md:pl-6"
              >
                {line}
              </p>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (slide.kind === "pillars" && slide.blocks) {
    return (
      <div className="flex flex-col h-full min-h-0 px-6 md:px-12 lg:px-16 py-6 md:py-8 overflow-y-auto">
        <span
          style={fontSans}
          className="text-[#F6621E] text-sm font-semibold uppercase tracking-[0.22em] mb-2 shrink-0"
        >
          {slide.label}
        </span>
        <h2
          style={headingH2}
          className="text-[clamp(2.35rem,4.6vw,3.65rem)] font-normal text-white mb-6 md:mb-7 max-w-4xl leading-[1.1] shrink-0"
        >
          {slide.title}
        </h2>
        <div className="grid gap-4 md:gap-5 md:grid-cols-2 auto-rows-min content-start">
          {slide.blocks.map((b, idx) => (
            <motion.div
              key={b.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.06, duration: 0.35 }}
              className="rounded-xl border border-white/[0.08] bg-gradient-to-br from-white/[0.06] to-transparent p-5 md:p-6 backdrop-blur-sm"
            >
              <h3 style={headingH3} className="text-[#F6621E] text-2xl md:text-3xl font-normal mb-2.5">
                {b.title}
              </h3>
              <p style={fontSans} className="text-slate-200 text-base md:text-lg leading-relaxed">
                {b.body}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  if (slide.kind === "grid" && slide.blocks) {
    return (
      <div className="flex flex-col h-full min-h-0 px-6 md:px-12 lg:px-16 py-6 md:py-8 overflow-y-auto">
        <span style={fontSans} className="text-[#F6621E] text-sm font-semibold uppercase tracking-[0.22em] mb-2 shrink-0">
          {slide.label}
        </span>
        <h2
          style={headingH2}
          className="text-[clamp(2.35rem,4.6vw,3.65rem)] font-normal text-white mb-5 md:mb-6 max-w-4xl leading-[1.1] shrink-0"
        >
          {slide.title}
        </h2>
        {slide.subtitle && (
          <p style={fontSans} className="text-slate-300 text-base md:text-lg mb-5 max-w-4xl leading-relaxed shrink-0">
            {slide.subtitle}
          </p>
        )}
        <div className="grid md:grid-cols-3 gap-4 md:gap-5 auto-rows-min items-start content-start">
          {slide.blocks.map((b, idx) => (
            <motion.div
              key={b.title}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.07 }}
              className="rounded-xl bg-[#0a1628]/90 border border-[#F6621E]/20 p-5 md:p-6 flex flex-col"
            >
              <div className="h-1 w-12 rounded-full bg-[#F6621E] mb-4 shrink-0" />
              <h3 style={headingH3} className="text-2xl md:text-3xl lg:text-[2.125rem] text-white font-normal mb-3 leading-tight">
                {b.title}
              </h3>
              <p style={fontSans} className="text-slate-300 text-base md:text-lg leading-relaxed">
                {b.body}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  if (slide.kind === "split") {
    return (
      <div className="grid md:grid-cols-2 h-full min-h-0 md:items-stretch">
        <div className="flex flex-col justify-center px-6 md:px-10 lg:px-14 py-8 md:py-10 bg-gradient-to-br from-[#F6621E]/15 via-transparent to-transparent border-b md:border-b-0 md:border-r border-white/[0.06]">
          <span style={fontSans} className="text-[#F6621E] text-sm font-semibold uppercase tracking-[0.22em] mb-3">
            {slide.label}
          </span>
          <h2 style={headingH2} className="text-[clamp(2.5rem,4.8vw,3.95rem)] font-normal text-white leading-[1.1]">
            {slide.title}
          </h2>
        </div>
        <div className="flex flex-col justify-center px-6 md:px-10 lg:px-12 py-8 md:py-10 space-y-5">
          {slide.lines?.map((line, li) => (
            <p key={li} style={fontSans} className="text-slate-200 text-base md:text-lg leading-relaxed flex gap-3.5">
              <span className="text-[#F6621E] shrink-0 mt-2 inline-block h-2 w-2 rounded-full bg-[#F6621E]" />
              <span>{line}</span>
            </p>
          ))}
        </div>
      </div>
    );
  }

  if (slide.kind === "closing") {
    return (
      <div className="flex flex-col justify-center items-center h-full text-center px-6 py-8 md:py-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-3xl w-full flex flex-col items-center"
        >
          <img
            src={uventorybizLogoFull}
            alt="MineAid Health Management System"
            className="h-[clamp(4rem,12vw,6.5rem)] w-auto max-w-[min(90vw,22rem)] object-contain mx-auto"
          />
          {slide.subtitle && (
            <p
              style={fontSans}
              className="mt-8 md:mt-10 text-xl md:text-2xl lg:text-[1.7rem] text-slate-200 leading-relaxed font-medium px-2"
            >
              {slide.subtitle}
            </p>
          )}
          <div className="mt-10 md:mt-12 space-y-5 md:space-y-6 text-left w-full max-w-2xl mx-auto px-1">
            {slide.lines?.map((line, li) => (
              <p
                key={li}
                style={fontSans}
                className="text-base md:text-lg lg:text-xl text-slate-300 leading-relaxed border-l-[3px] border-[#F6621E]/60 pl-5 md:pl-6"
              >
                {line}
              </p>
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

  return null;
}

export function uventorybizLogoHeader({ className }: { className?: string }) {
  return (
    <img
      src={uventorybizLogoFull}
      alt="MineAid Health Management System"
      className={cn("h-8 w-auto object-contain object-left max-w-[min(100%,200px)]", className)}
    />
  );
}

import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useId, useLayoutEffect, useRef, useState } from "react";
import { Loader2, ScrollText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const COLLAPSED_MAX_PX = 280;

type ChangelogSection = {
  id: string;
  version: string;
  date: string;
  html: string;
};

type ChangelogResponse = {
  introHtml: string;
  sections: ChangelogSection[];
};

/** Bumped when API shape changes — global queryClient uses staleTime: Infinity. */
const CHANGELOG_QUERY_KEY = ["/api/changelog", "v2"] as const;

function normalizeChangelogPayload(raw: unknown): ChangelogResponse {
  if (
    raw &&
    typeof raw === "object" &&
    Array.isArray((raw as ChangelogResponse).sections) &&
    typeof (raw as ChangelogResponse).introHtml === "string"
  ) {
    return raw as ChangelogResponse;
  }
  if (raw && typeof raw === "object" && typeof (raw as { html?: unknown }).html === "string") {
    return {
      introHtml: "",
      sections: [
        {
          id: "legacy",
          version: "All releases",
          date: "",
          html: (raw as { html: string }).html,
        },
      ],
    };
  }
  return { introHtml: "", sections: [] };
}

const proseClass =
  "prose prose-slate prose-headings:text-[#142F5C] prose-a:text-[#142F5C] prose-a:font-medium max-w-none prose-pre:bg-slate-900 prose-pre:text-slate-100 prose-sm sm:prose-base";

/**
 * One release = one `<section>` with the same gradient header treatment as super-admin snapshot cards.
 * Expand/collapse state is local to this component only (per version).
 */
function ChangelogVersionSection({ section }: { section: ChangelogSection }) {
  const { version, date, html } = section;
  const uid = useId();
  const titleId = `${uid}-title`;
  const bodyId = `${uid}-body`;
  const [expanded, setExpanded] = useState(false);
  const innerRef = useRef<HTMLDivElement>(null);
  const [showToggle, setShowToggle] = useState(false);

  useLayoutEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    const measure = () => {
      if (expanded) {
        setShowToggle(true);
        return;
      }
      setShowToggle(el.scrollHeight > COLLAPSED_MAX_PX);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [html, expanded]);

  return (
    <section
      aria-labelledby={titleId}
      className="rounded-xl border border-[#142F5C]/15 shadow-md overflow-hidden mb-6 last:mb-0 bg-white"
    >
      <header className="flex flex-row flex-wrap items-center justify-between gap-2 gap-y-2 px-4 sm:px-5 py-3 pb-2 bg-gradient-to-br from-[#142F5C] to-[#1a3d6b] text-white">
        <h2 id={titleId} className="text-sm sm:text-base font-medium text-white/90">
          Version {version}
        </h2>
        <Badge variant="secondary" className="bg-white/15 text-white border-0 hover:bg-white/20 shrink-0">
          {date}
        </Badge>
      </header>
      <div className="px-4 sm:px-5 pt-4 pb-4">
        <div className="relative">
          <div
            id={bodyId}
            ref={innerRef}
            style={expanded ? undefined : { maxHeight: COLLAPSED_MAX_PX }}
            className={cn(proseClass, !expanded && "overflow-hidden")}
            dangerouslySetInnerHTML={{ __html: html }}
          />
          {!expanded && showToggle && (
            <div
              className="pointer-events-none absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white via-white/95 to-transparent"
              aria-hidden
            />
          )}
        </div>
        {showToggle && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-4 border-[#142F5C]/25 text-[#142F5C] hover:bg-[#142F5C]/5"
            aria-expanded={expanded}
            aria-controls={bodyId}
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? "Show less" : "View all"}
          </Button>
        )}
      </div>
    </section>
  );
}

export default function Changelog() {
  const { data, isLoading, error } = useQuery({
    queryKey: CHANGELOG_QUERY_KEY,
    queryFn: async () => {
      const res = await fetch("/api/changelog", { credentials: "include" });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }
      return normalizeChangelogPayload(await res.json());
    },
  });

  return (
    <div className="bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="flex items-start gap-3 mb-10">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#142F5C]/10">
            <ScrollText className="h-6 w-6 text-[#142F5C]" aria-hidden />
          </div>
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">Changelog</h1>
            <p className="mt-2 text-muted-foreground text-base leading-relaxed max-w-2xl">
              Full release history for uventorybiz, sourced from the repository{" "}
              <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">docs/CHANGELOG.md</code>.
            </p>
          </div>
        </div>

        {isLoading && (
          <div className="flex items-center gap-2 text-muted-foreground py-16 justify-center">
            <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
            <span>Loading changelog…</span>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error instanceof Error ? error.message : "Could not load changelog."}
          </div>
        )}

        {data?.introHtml && (
          <section aria-label="Introduction" className="mb-10">
            <div className={cn(proseClass)} dangerouslySetInnerHTML={{ __html: data.introHtml }} />
          </section>
        )}

        {data?.sections && data.sections.length > 0 && (
          <section aria-label="Release history" className="space-y-0">
            {data.sections.map((section, index) => (
              <ChangelogVersionSection key={`${section.id}-${index}`} section={section} />
            ))}
          </section>
        )}

        <p className="mt-12 text-sm text-muted-foreground border-t border-gray-200 pt-8">
          <Link href="/" className="text-[#142F5C] font-medium hover:underline">
            Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}

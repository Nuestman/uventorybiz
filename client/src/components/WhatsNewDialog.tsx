import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { Sparkles } from "lucide-react";
import type { CuratedReleaseNote } from "@shared/curatedReleaseNotes";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useWhatsNew } from "@/hooks/useWhatsNew";
import { cn } from "@/lib/utils";

type WhatsNewDialogProps = {
  audience: "staff" | "portal";
  enabled: boolean;
  primaryColor?: string;
};

function formatReleaseDate(isoDate: string): string {
  const parsed = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return isoDate;
  return parsed.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}

function ReleaseNoteBlock({ note }: { note: CuratedReleaseNote }) {
  return (
    <section className="space-y-2">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <h3 className="text-base font-semibold text-gray-900">{note.title}</h3>
        <span className="text-xs font-medium text-muted-foreground">
          v{note.version} · {formatReleaseDate(note.date)}
        </span>
      </div>
      <ul className="list-disc pl-5 space-y-1.5 text-sm text-muted-foreground">
        {note.highlights.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </section>
  );
}

export function WhatsNewDialog({ audience, enabled, primaryColor }: WhatsNewDialogProps) {
  const { pending, currentVersion, isLoading, acknowledge } = useWhatsNew(audience, enabled);
  const [open, setOpen] = useState(false);
  const autoOpenedRef = useRef(false);

  useEffect(() => {
    if (!enabled || isLoading || autoOpenedRef.current) return;
    if (pending.length > 0) {
      autoOpenedRef.current = true;
      setOpen(true);
    }
  }, [enabled, isLoading, pending.length]);

  const handleAcknowledge = () => {
    if (!currentVersion) {
      setOpen(false);
      return;
    }
    acknowledge.mutate(currentVersion, {
      onSettled: () => setOpen(false),
    });
  };

  if (!enabled || pending.length === 0) return null;

  const accentStyle = primaryColor ? ({ ["--whats-new-accent" as string]: primaryColor } as React.CSSProperties) : undefined;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className={cn(
          "w-[calc(100%-1.5rem)] max-w-lg max-h-[85vh] overflow-y-auto rounded-[var(--portal-radius-lg,1.25rem)] sm:max-w-xl sm:w-full",
          audience === "portal" && "portal-root portal-ui",
        )}
        style={accentStyle}
      >
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#142F5C]/10"
              style={
                primaryColor
                  ? { backgroundColor: `${primaryColor}1a`, color: primaryColor }
                  : undefined
              }
            >
              <Sparkles className="h-5 w-5 text-[#142F5C]" style={primaryColor ? { color: primaryColor } : undefined} />
            </div>
            <div>
              <DialogTitle className="normal-case tracking-tight">What&apos;s new</DialogTitle>
              <DialogDescription className="normal-case">
                {audience === "portal"
                  ? "Updates to your customer & supplier portal since your last visit."
                  : "Updates to uventorybiz since your last sign-in."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {pending.map((note) => (
            <ReleaseNoteBlock key={note.version} note={note} />
          ))}
        </div>

        <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-between sm:items-center">
          {audience === "staff" ? (
            <Button variant="ghost" className="w-full sm:w-auto" asChild>
              <Link href="/changelog">Full changelog</Link>
            </Button>
          ) : (
            <Button variant="ghost" className="w-full sm:w-auto" asChild>
              <a href="/changelog" target="_blank" rel="noopener noreferrer">
                Full changelog
              </a>
            </Button>
          )}
          <Button
            className="w-full sm:w-auto"
            style={
              primaryColor && audience === "portal"
                ? { backgroundColor: primaryColor }
                : undefined
            }
            disabled={acknowledge.isPending}
            onClick={handleAcknowledge}
          >
            {acknowledge.isPending ? "Saving…" : "Got it"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

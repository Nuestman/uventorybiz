import { useState } from "react";
import { format } from "date-fns";
import { Download, Loader2, MoreHorizontal, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { ConversationSummaryDto, MessageDto } from "@shared/messaging";
import { MESSAGING_EXPORT_SECURITY_NOTICE } from "@shared/messaging";

type Audience = "staff" | "portal";
type PendingExport = "csv" | "print" | null;

type Props = {
  audience: Audience;
  conversation: ConversationSummaryDto;
  messages: MessageDto[] | undefined;
};

function apiPrefix(audience: Audience) {
  return audience === "staff" ? "/api/messaging" : "/api/portal/messaging";
}

function printThreadDocument(
  conversation: ConversationSummaryDto,
  messages: MessageDto[],
) {
  const title = conversation.patientName ?? conversation.subject ?? "Secure messaging thread";
  const rows = messages
    .map(
      (m) => `
      <tr>
        <td>${format(new Date(m.createdAt), "yyyy-MM-dd HH:mm")}</td>
        <td>${escapeHtml(m.senderDisplayName)}</td>
        <td>${escapeHtml(m.bodyText).replace(/\n/g, "<br>")}</td>
        <td>${escapeHtml(
          (m.attachments ?? []).map((a) => a.originalName).join(", ") || "—",
        )}</td>
      </tr>`,
    )
    .join("");

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${escapeHtml(title)} — export</title>
<style>
  body { font-family: system-ui, sans-serif; font-size: 12px; margin: 24px; color: #111; }
  h1 { font-size: 18px; margin-bottom: 4px; }
  .meta { color: #555; margin-bottom: 16px; font-size: 11px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #ccc; padding: 6px 8px; vertical-align: top; text-align: left; }
  th { background: #f3f4f6; }
  @media print { body { margin: 12px; } }
</style></head><body>
  <h1>${escapeHtml(title)}</h1>
  <div class="meta">
    Thread ID: ${escapeHtml(conversation.id)} · Type: ${escapeHtml(conversation.type)} · Status: ${escapeHtml(conversation.status)}
    ${conversation.subject ? ` · Subject: ${escapeHtml(conversation.subject)}` : ""}
    <br>Exported: ${format(new Date(), "yyyy-MM-dd HH:mm")}
  </div>
  <table>
    <thead><tr><th>Sent</th><th>Sender</th><th>Message</th><th>Attachments</th></tr></thead>
    <tbody>${rows || "<tr><td colspan=\"4\">No messages</td></tr>"}</tbody>
  </table>
</body></html>`;

  const win = window.open("", "_blank", "noopener,noreferrer");
  if (!win) return false;
  win.document.write(html);
  win.document.close();
  win.focus();
  win.print();
  return true;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export default function MessagingThreadExportMenu({
  audience,
  conversation,
  messages,
}: Props) {
  const { toast } = useToast();
  const [downloading, setDownloading] = useState(false);
  const [pendingExport, setPendingExport] = useState<PendingExport>(null);
  const prefix = apiPrefix(audience);

  const downloadCsv = async () => {
    setDownloading(true);
    try {
      const res = await fetch(
        `${prefix}/conversations/${conversation.id}/export?format=csv`,
        { credentials: "include" },
      );
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Export failed");
      }
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="?([^";]+)"?/);
      const filename = match?.[1] ?? `messaging-thread-${conversation.id.slice(0, 8)}.csv`;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Thread exported", description: "CSV download started." });
    } catch (e) {
      toast({
        title: "Export failed",
        description: e instanceof Error ? e.message : "Could not export thread",
        variant: "destructive",
      });
    } finally {
      setDownloading(false);
    }
  };

  const printPdf = async () => {
    if (!messages?.length) {
      toast({
        title: "Nothing to print",
        description: "Load messages before printing this thread.",
        variant: "destructive",
      });
      return;
    }
    try {
      await apiRequest("POST", `${prefix}/conversations/${conversation.id}/export/ack`, {
        format: "print",
      });
    } catch {
      /* audit failure should not block print */
    }
    const ok = printThreadDocument(conversation, messages);
    if (!ok) {
      toast({
        title: "Pop-up blocked",
        description: "Allow pop-ups to print or save as PDF.",
        variant: "destructive",
      });
    }
  };

  const confirmExport = async () => {
    const action = pendingExport;
    setPendingExport(null);
    if (action === "csv") await downloadCsv();
    else if (action === "print") await printPdf();
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="outline" size="sm" disabled={downloading}>
            {downloading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MoreHorizontal className="h-4 w-4" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setPendingExport("csv")}>
            <Download className="h-4 w-4 mr-2" />
            Download CSV
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setPendingExport("print")}>
            <Printer className="h-4 w-4 mr-2" />
            Print / Save as PDF
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={pendingExport !== null} onOpenChange={(open) => !open && setPendingExport(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Export secure messaging thread?</AlertDialogTitle>
            <AlertDialogDescription>{MESSAGING_EXPORT_SECURITY_NOTICE}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmExport()}>
              {pendingExport === "print" ? "Print" : "Download"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

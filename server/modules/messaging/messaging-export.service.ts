import type { Conversation, Message } from "@shared/schema";
import type { MessageAttachmentDto } from "@shared/messaging";

function csvEscape(value: string | number | null | undefined): string {
  const s = value == null ? "" : String(value);
  return `"${s.replace(/"/g, '""')}"`;
}

export type ThreadExportRow = {
  message: Message;
  senderDisplayName: string;
  attachments: MessageAttachmentDto[];
};

export function buildThreadExportCsv(params: {
  conversation: Conversation;
  patientName: string | null;
  rows: ThreadExportRow[];
  exportedAt: Date;
  exportedByLabel: string;
}): string {
  const { conversation, patientName, rows, exportedAt, exportedByLabel } = params;
  const lines: string[] = [];

  lines.push("uventorybiz - Secure Messaging Thread Export");
  lines.push(`exported_at,${csvEscape(exportedAt.toISOString())}`);
  lines.push(`exported_by,${csvEscape(exportedByLabel)}`);
  lines.push("");

  lines.push("conversation_id,type,status,subject,patient_id,patient_name,appointment_id,created_at,retention_until");
  lines.push(
    [
      csvEscape(conversation.id),
      csvEscape(conversation.type),
      csvEscape(conversation.status),
      csvEscape(conversation.subject ?? ""),
      csvEscape(conversation.patientId ?? ""),
      csvEscape(patientName ?? ""),
      csvEscape(conversation.appointmentId ?? ""),
      csvEscape(conversation.createdAt.toISOString()),
      csvEscape(conversation.retentionUntil?.toISOString() ?? ""),
    ].join(","),
  );
  lines.push("");

  lines.push(
    "message_id,sent_at,sender_type,sender_name,body_text,attachment_count,attachment_names,attachment_urls",
  );
  for (const row of rows) {
    const names = row.attachments.map((a) => a.originalName).join("; ");
    const urls = row.attachments.map((a) => a.fileUrl).join("; ");
    lines.push(
      [
        csvEscape(row.message.id),
        csvEscape(row.message.createdAt.toISOString()),
        csvEscape(row.message.senderType),
        csvEscape(row.senderDisplayName),
        csvEscape(row.message.bodyText),
        csvEscape(row.attachments.length),
        csvEscape(names),
        csvEscape(urls),
      ].join(","),
    );
  }

  return lines.join("\n");
}

export function threadExportFilename(conversationId: string, exportedAt: Date): string {
  const date = exportedAt.toISOString().split("T")[0];
  const shortId = conversationId.slice(0, 8);
  return `messaging-thread-${shortId}-${date}.csv`;
}

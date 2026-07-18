import { useState, useRef, useEffect } from "react";
import { Link } from "wouter";
import { Loader2, Paperclip, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { MessageBodyFormat, MessagingClinicianDto } from "@shared/messaging";
import {
  isMessagingAttachmentMimeType,
  MESSAGING_MAX_ATTACHMENT_BYTES,
  MESSAGING_MAX_ATTACHMENTS_PER_MESSAGE,
  MESSAGING_MAX_BODY_LENGTH,
  stripHtmlToPlainText,
} from "@shared/messaging";
import { PORTAL_MESSAGING_CONSENT } from "@/content/portalMessagingTerms";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { MessageRichTextEditor } from "./MessageRichTextEditor";

const BODY_FORMAT_STORAGE_KEY = "uventorybiz.messaging.bodyFormat";

type Props = {
  onSend: (body: {
    bodyText?: string;
    bodyHtml?: string;
    clientMessageId: string;
    messagingConsentAccepted?: boolean;
    files?: File[];
    assignedStaffUserId?: string | null;
  }) => Promise<void>;
  disabled?: boolean;
  isPending?: boolean;
  requireConsent?: boolean;
  closed?: boolean;
  placeholder?: string;
  supportPhone?: string | null;
  compact?: boolean;
  clinicianOptions?: MessagingClinicianDto[];
  defaultClinicianId?: string | null;
  showClinicianPicker?: boolean;
  /** When set, hides picker and always routes to this clinician. */
  lockClinicianId?: string | null;
  /** Consent checkbox + explicit Accept before showing the message field (telecare in-call). */
  consentRequiresAccept?: boolean;
};

function readStoredBodyFormat(): MessageBodyFormat {
  try {
    const v = localStorage.getItem(BODY_FORMAT_STORAGE_KEY);
    return v === "rich" ? "rich" : "plain";
  } catch {
    return "plain";
  }
}

export default function MessagingComposer({
  onSend,
  disabled,
  isPending,
  requireConsent,
  closed,
  placeholder = "Write a message…",
  supportPhone,
  compact,
  clinicianOptions,
  defaultClinicianId,
  showClinicianPicker,
  lockClinicianId,
  consentRequiresAccept,
}: Props) {
  const [bodyFormat, setBodyFormat] = useState<MessageBodyFormat>(readStoredBodyFormat);
  const [text, setText] = useState("");
  const [richHtml, setRichHtml] = useState("");
  const [consent, setConsent] = useState(false);
  const [consentAccepted, setConsentAccepted] = useState(!consentRequiresAccept);
  const lockedClinicianId = lockClinicianId ?? defaultClinicianId ?? null;
  const [selectedClinicianId, setSelectedClinicianId] = useState<string>(
    lockedClinicianId ?? "__general__",
  );
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isOnline = useOnlineStatus();

  useEffect(() => {
    if (lockedClinicianId) setSelectedClinicianId(lockedClinicianId);
    else if (defaultClinicianId) setSelectedClinicianId(defaultClinicianId);
  }, [defaultClinicianId, lockedClinicianId]);

  useEffect(() => {
    if (!consentRequiresAccept) setConsentAccepted(true);
  }, [consentRequiresAccept]);

  const allowedAccept =
    "image/jpeg,image/png,image/webp,image/gif,application/pdf,.pdf,.jpg,.jpeg,.png,.webp,.gif";

  const resolvedClinicianId = lockedClinicianId ?? selectedClinicianId;
  const pickerVisible = showClinicianPicker && !lockedClinicianId && clinicianOptions?.length;

  const plainLength =
    bodyFormat === "plain" ? text.length : stripHtmlToPlainText(richHtml).length;

  if (closed) {
    return (
      <Alert>
        <AlertDescription>This conversation is closed. Contact your clinic if you need to continue.</AlertDescription>
      </Alert>
    );
  }

  const canSend =
    plainLength > 0 &&
    plainLength <= MESSAGING_MAX_BODY_LENGTH &&
    (!requireConsent || consent) &&
    !disabled &&
    !isPending;

  const addFiles = (picked: FileList | null) => {
    if (!picked?.length) return;
    if (!isOnline) {
      setError("File attachments require an internet connection.");
      return;
    }
    const next: File[] = [...files];
    for (const file of Array.from(picked)) {
      if (next.length >= MESSAGING_MAX_ATTACHMENTS_PER_MESSAGE) {
        setError(`Maximum ${MESSAGING_MAX_ATTACHMENTS_PER_MESSAGE} attachments per message`);
        break;
      }
      if (!isMessagingAttachmentMimeType(file.type)) {
        setError("Only PDF and image files are allowed");
        continue;
      }
      if (file.size > MESSAGING_MAX_ATTACHMENT_BYTES) {
        setError("Each file must be 10 MB or smaller");
        continue;
      }
      if (next.some((f) => f.name === file.name && f.size === file.size)) continue;
      next.push(file);
    }
    setError(null);
    setFiles(next);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleFormatChange = (value: MessageBodyFormat) => {
    setBodyFormat(value);
    try {
      localStorage.setItem(BODY_FORMAT_STORAGE_KEY, value);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="space-y-3 border-t pt-3">
      {requireConsent && !consentAccepted && (
        <div className="rounded-md border bg-muted/40 p-3 space-y-3 text-sm">
          <p className="font-medium">{PORTAL_MESSAGING_CONSENT.title}</p>
          <p className="text-muted-foreground">{PORTAL_MESSAGING_CONSENT.summary}</p>
          <ul className="list-disc pl-5 text-muted-foreground space-y-1">
            {PORTAL_MESSAGING_CONSENT.bullets.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
          <div className="flex items-start gap-2 pt-1">
            <Checkbox
              id="messaging-consent"
              checked={consent}
              onCheckedChange={(v) => setConsent(v === true)}
            />
            <Label htmlFor="messaging-consent" className="text-sm leading-snug font-normal cursor-pointer">
              {PORTAL_MESSAGING_CONSENT.acceptanceLabel}{" "}
              <Link href={PORTAL_MESSAGING_CONSENT.termsPath} className="text-primary underline">
                Terms
              </Link>
            </Label>
          </div>
          <Button
            type="button"
            size="sm"
            className="w-full sm:w-auto"
            disabled={!consent || isPending}
            onClick={() => setConsentAccepted(true)}
          >
            Accept and continue
          </Button>
          <p className="text-xs text-muted-foreground">
            {supportPhone?.trim()
              ? `For emergencies, call ${supportPhone.trim()} — not this messaging service.`
              : "For emergencies, contact your site clinic or emergency services — not this messaging service."}
          </p>
        </div>
      )}

      {requireConsent && consentAccepted && consentRequiresAccept ? (
        <p className="text-xs text-muted-foreground">
          Messaging terms accepted. Your messages go to your visit clinician.
        </p>
      ) : null}

      {(!requireConsent || consentAccepted) && (
        <>
      {requireConsent && !consentRequiresAccept && (
        <div className="rounded-md border bg-muted/40 p-3 space-y-2 text-sm">
          <p className="font-medium">{PORTAL_MESSAGING_CONSENT.title}</p>
          <p className="text-muted-foreground">{PORTAL_MESSAGING_CONSENT.summary}</p>
          <ul className="list-disc pl-5 text-muted-foreground space-y-1">
            {PORTAL_MESSAGING_CONSENT.bullets.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
          <div className="flex items-start gap-2 pt-1">
            <Checkbox
              id="messaging-consent"
              checked={consent}
              onCheckedChange={(v) => setConsent(v === true)}
            />
            <Label htmlFor="messaging-consent" className="text-sm leading-snug font-normal cursor-pointer">
              {PORTAL_MESSAGING_CONSENT.acceptanceLabel}{" "}
              <Link href={PORTAL_MESSAGING_CONSENT.termsPath} className="text-primary underline">
                Terms
              </Link>
            </Label>
          </div>
        </div>
      )}

      {pickerVisible ? (
        <div className="space-y-1">
          <Label htmlFor="messaging-clinician" className="text-xs">
            Send to
          </Label>
          <Select value={selectedClinicianId} onValueChange={setSelectedClinicianId}>
            <SelectTrigger id="messaging-clinician" className="h-9 text-sm">
              <SelectValue placeholder="Choose a clinician" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__general__">General clinic queue</SelectItem>
              {clinicianOptions.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.displayName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-2">
        <Label htmlFor="messaging-body-format" className="text-xs shrink-0">
          Format
        </Label>
        <Select value={bodyFormat} onValueChange={(v) => handleFormatChange(v as MessageBodyFormat)}>
          <SelectTrigger id="messaging-body-format" className="h-8 w-[140px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="plain">Plain text</SelectItem>
            <SelectItem value="rich">Rich text</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {bodyFormat === "plain" ? (
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          rows={compact ? 2 : 3}
          maxLength={MESSAGING_MAX_BODY_LENGTH}
          disabled={disabled || isPending}
        />
      ) : (
        <div className="rounded-md border bg-background overflow-hidden">
          <MessageRichTextEditor
            id={compact ? "message-rich-text-compact" : "message-rich-text"}
            value={richHtml}
            onChange={setRichHtml}
            disabled={disabled || isPending}
            compact={compact}
          />
        </div>
      )}
      {files.length > 0 ? (
        <ul className="space-y-1">
          {files.map((file, index) => (
            <li
              key={`${file.name}-${file.size}-${index}`}
              className="flex items-center gap-2 text-xs text-muted-foreground border rounded px-2 py-1.5"
            >
              <Paperclip className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate flex-1">{file.name}</span>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground"
                onClick={() => removeFile(index)}
                aria-label={`Remove ${file.name}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept={allowedAccept}
            multiple
            className="hidden"
            onChange={(e) => {
              addFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={
              disabled || isPending || !isOnline || files.length >= MESSAGING_MAX_ATTACHMENTS_PER_MESSAGE
            }
            onClick={() => fileInputRef.current?.click()}
            title={
              !isOnline
                ? "Attachments require an internet connection"
                : `Attach PDF or images (up to ${MESSAGING_MAX_ATTACHMENTS_PER_MESSAGE})`
            }
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          <span className="text-xs text-muted-foreground">
            {plainLength}/{MESSAGING_MAX_BODY_LENGTH}
            {files.length > 0
              ? ` · ${files.length}/${MESSAGING_MAX_ATTACHMENTS_PER_MESSAGE} files`
              : ""}
          </span>
        </div>
        <Button
          type="button"
          size="sm"
          disabled={!canSend}
          onClick={async () => {
            setError(null);
            try {
              const payload =
                bodyFormat === "plain"
                  ? { bodyText: text.trim() }
                  : { bodyHtml: richHtml.trim() };
              await onSend({
                ...payload,
                clientMessageId: crypto.randomUUID(),
                messagingConsentAccepted: requireConsent ? consent : undefined,
                files,
                assignedStaffUserId:
                  resolvedClinicianId === "__general__" ? null : resolvedClinicianId,
              });
              setText("");
              setRichHtml("");
            } catch (e) {
              setError(e instanceof Error ? e.message : "Failed to send message");
            }
          }}
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
          Send
        </Button>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {!requireConsent && !compact && (
        <p className="text-xs text-muted-foreground">
          Secure messaging is for non-urgent communication. Up to {MESSAGING_MAX_ATTACHMENTS_PER_MESSAGE}{" "}
          attachments per message (PDF and images, 10 MB each).
          {!isOnline ? " You are offline — messages will send when connection returns." : ""}
          {supportPhone?.trim()
            ? ` For emergencies, call ${supportPhone.trim()}.`
            : " For emergencies, use your site emergency procedures."}
        </p>
      )}
      {requireConsent && !consentRequiresAccept ? (
        <p className={`text-xs text-muted-foreground ${compact ? "mt-1" : ""}`}>
          {supportPhone?.trim()
            ? `For emergencies, call ${supportPhone.trim()} — not this messaging service.`
            : "For emergencies, contact your site clinic or emergency services — not this messaging service."}
        </p>
      ) : null}
        </>
      )}
    </div>
  );
}

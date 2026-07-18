import { MESSAGING_MAX_BODY_LENGTH } from "@shared/messaging";
import { htmlToPlainText, sanitizeMessagingHtml } from "../../shared/messagingHtml";

export type NormalizedMessageBody = {
  bodyText: string;
  bodyHtml: string | null;
};

export function normalizeMessageBody(input: {
  bodyText?: string;
  bodyHtml?: string | null;
}): { ok: true; data: NormalizedMessageBody } | { ok: false; error: string } {
  const rich = input.bodyHtml?.trim();
  if (rich) {
    const html = sanitizeMessagingHtml(rich);
    const text = htmlToPlainText(html);
    if (!text) {
      return { ok: false, error: "Message body is required" };
    }
    if (text.length > MESSAGING_MAX_BODY_LENGTH) {
      return {
        ok: false,
        error: `Message must be ${MESSAGING_MAX_BODY_LENGTH} characters or fewer`,
      };
    }
    return { ok: true, data: { bodyText: text, bodyHtml: html } };
  }

  const text = input.bodyText?.trim() ?? "";
  if (!text) {
    return { ok: false, error: "Message body is required" };
  }
  if (text.length > MESSAGING_MAX_BODY_LENGTH) {
    return {
      ok: false,
      error: `Message must be ${MESSAGING_MAX_BODY_LENGTH} characters or fewer`,
    };
  }
  return { ok: true, data: { bodyText: text, bodyHtml: null } };
}

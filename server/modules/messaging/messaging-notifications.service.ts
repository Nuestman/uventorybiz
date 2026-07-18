import type { IStorage } from "../../storage";
import { sendEmail, createAndSendNotifications } from "../../notificationService";
import { isPortalNotificationEnabledForUser } from "../portal/portal-notification-preferences.service";
import { logError } from "../../logger";

function appOrigin(): string {
  const appUrl = process.env.APP_URL?.replace(/\/$/, "");
  if (appUrl) return appUrl;
  const domain = process.env.RAILWAY_PUBLIC_DOMAIN;
  if (domain?.startsWith("http")) return domain.replace(/\/$/, "");
  if (domain) return `https://${domain}`;
  return "http://localhost:5000";
}

export async function notifyStaffOfNewMessage(
  storage: IStorage,
  params: {
    tenantId: string;
    conversationId: string;
    patientName: string;
    senderStaffUserId?: string;
    /** When set, only these staff users receive alerts (still respects notification preferences). */
    recipientStaffUserIds?: string[];
  },
): Promise<void> {
  const deepLink = `${appOrigin()}/messages?conversation=${params.conversationId}`;
  try {
    await createAndSendNotifications(storage, {
      tenantId: params.tenantId,
      notificationTypeKey: "message_received",
      title: "New secure message",
      message: `New message from ${params.patientName}. Open the secure inbox to read and reply.`,
      htmlEmail: `
        <p>You have a new secure message from <strong>${params.patientName}</strong>.</p>
        <p>For your privacy and compliance, message content is not included in this email.</p>
        <p><a href="${deepLink}">Open secure messaging</a></p>
      `,
      metadata: {
        conversationId: params.conversationId,
        deepLink,
      },
      senderId: params.senderStaffUserId,
      recipientUserIds: params.recipientStaffUserIds,
    });
  } catch (err) {
    logError("notifyStaffOfNewMessage failed", err);
  }
}

export async function notifyPortalUserOfNewMessage(params: {
  tenantId: string;
  portalUserId: string;
  portalEmail: string;
  tenantAppName: string;
  conversationId: string;
}): Promise<void> {
  const enabled = await isPortalNotificationEnabledForUser(
    params.tenantId,
    params.portalUserId,
    "secure_messages",
    "email",
  );
  if (!enabled) return;

  const deepLink = `${appOrigin()}/portal/messages/${params.conversationId}`;
  try {
    await sendEmail({
      to: params.portalEmail,
      subject: `New message from ${params.tenantAppName}`,
      html: `
        <p>Your care team sent you a new secure message in the patient portal.</p>
        <p>Message content is not included in this email for your privacy.</p>
        <p><a href="${deepLink}">Sign in to read your message</a></p>
        <p><small>Secure messaging is not for emergencies. If you need urgent care, contact your site clinic or emergency services.</small></p>
      `,
      text: `Your care team sent a new secure message. Sign in to read: ${deepLink}`,
    });
  } catch (err) {
    logError("notifyPortalUserOfNewMessage failed", err);
  }
}

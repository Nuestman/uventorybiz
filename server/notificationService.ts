import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import type { IStorage } from './storage';
import type { User, Notification, InsertNotification, InsertNotificationDeliveryLog } from '@shared/schema';
import { logDebug, logInfo, logError, sanitizeForLogging } from './logger';


// Use a fallback empty string or handle undefined to prevent the constructor error
// SAFE INITIALIZATION: Prevents the "Missing API key" error locally
const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

export async function sendEmail(params: {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    cid?: string;
    contentType?: string;
  }>;
}): Promise<boolean> {
  try {
    const hasResend = !!(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL);
    const hasGmail = !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);

    if (!hasResend && !hasGmail) {
      logInfo("📧 Email Service (Mock - no Resend or Gmail credentials configured)");
      logInfo(`To: ${params.to.substring(0, 3)}*** | Subject: ${params.subject}`);
      return false;
    }

    // 1. RAILWAY STRATEGY (Resend API)
    if (hasResend && resend) {
      logDebug("🚀 Sending via Resend API (Railway/Production Mode)");
      const { data, error } = await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
        to: [params.to],
        subject: params.subject,
        html: params.html || params.text || "",
        attachments: params.attachments?.map(a => ({
          filename: a.filename,
          content: a.content,
        }))
      });

      if (error) throw error;

      // Restored your requested logs
      logDebug(`📧 Email sent via Resend: ${params.subject} → ${params.to.substring(0, 3)}***`);
      logDebug(`   Message ID: ${data?.id}`);
      
      return true;
    }

    // 2. LOCAL STRATEGY (Gmail SMTP)
    if (hasGmail) {
      logDebug("🏠 Sending via Gmail SMTP (Local Mode)");
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_APP_PASSWORD,
        },
      });

      const info = await transporter.sendMail({
        from: `"uventorybiz" <${process.env.GMAIL_USER}>`,
        to: params.to,
        subject: params.subject,
        html: params.html,
        text: params.text,
        attachments: params.attachments,
      });

      logDebug(`📧 Email sent via Gmail: ${params.subject} → ${params.to.substring(0, 3)}***`);
      logDebug(`   Message ID: ${info.messageId}`);
      
      return true;
    }

    logError("No email provider configured. Check RESEND_* or GMAIL_* env variables.");
    return false;
  } catch (error) {
    logError('Email service error', error);
    return false;
  }
}


// Mock SMS service for development - Twilio when configured
export async function sendSMS(params: {
  to: string;
  message: string;
}): Promise<boolean> {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
    const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
    const fromNumber = process.env.TWILIO_PHONE_NUMBER?.trim();

    if (accountSid && authToken && fromNumber) {
      const credentials = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
      const body = new URLSearchParams({
        To: params.to,
        From: fromNumber,
        Body: params.message,
      });

      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${credentials}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: body.toString(),
        },
      );

      if (!response.ok) {
        const errText = await response.text();
        logError("Twilio SMS failed", { status: response.status, errText });
        return false;
      }

      logDebug(`📱 SMS sent via Twilio → ${params.to.substring(0, 3)}***`);
      return true;
    }

    logDebug("📱 SMS Service (Mock - no Twilio credentials configured)");
    logDebug(`Message length: ${params.message.length} chars`);
    return false;
  } catch (error) {
    logError('SMS service error', error);
    return false;
  }
}

export async function sendRegistrationApprovalRequest(userEmail: string, userName: string, tenantName: string): Promise<boolean> {
  return await sendEmail({
    to: userEmail,
    subject: `Registration Request for ${tenantName} - uventorybiz`,
    html: `
      <h2>New User Registration Request</h2>
      <p>A new user has requested access to ${tenantName} uventorybiz system:</p>
      <ul>
        <li><strong>Name:</strong> ${userName}</li>
        <li><strong>Email:</strong> ${userEmail}</li>
      </ul>
      <p>Please log in to the admin panel to approve or deny this request.</p>
      <p>Best regards,<br>uventorybiz</p>
    `
  });
}

export async function sendApprovalNotification(userEmail: string, userName: string): Promise<boolean> {
  return await sendEmail({
    to: userEmail,
    subject: 'Account Approved - uventorybiz',
    html: `
      <h2>Welcome to uventorybiz!</h2>
      <p>Dear ${userName},</p>
      <p>Your account has been approved and is now active. You can now access uventorybiz.</p>
      <p>Log in using your credentials to get started.</p>
      <p>Best regards,<br>uventorybiz</p>
    `
  });
}

export async function sendStatusChangeNotification(userEmail: string, userName: string, newStatus: string): Promise<boolean> {
  return await sendEmail({
    to: userEmail,
    subject: 'Account Status Update - uventorybiz',
    html: `
      <h2>Account Status Update</h2>
      <p>Dear ${userName},</p>
      <p>Your account status has been updated to: <strong>${newStatus}</strong></p>
      <p>If you have any questions, please contact your system administrator.</p>
      <p>Best regards,<br>uventorybiz</p>
    `
  });
}

// =====================================================
// Core Notification Functions
// =====================================================

/**
 * Get recipients for a notification type with severity filtering
 */
export async function getRecipientsForAlert(
  storage: IStorage,
  tenantId: string,
  notificationTypeKey: string,
  severity?: 'low' | 'medium' | 'high' | 'critical', // Ignored - we send all
  channels?: ('email' | 'in_app' | 'sms' | 'whatsapp')[]
): Promise<Array<{ user: User; channels: string[] }>> {
  const allTypes = await storage.getNotificationTypes();
  const targetType = allTypes.find((t) => t.key === notificationTypeKey);

  if (!targetType) {
    logError(`Notification type not found: ${notificationTypeKey}`);
    return [];
  }

  let candidateUsers = await storage.getUsersForNotificationType(tenantId, notificationTypeKey);

  // Incident category: include all active safety officers (HSE), and admins if no recipients yet.
  // Notification rows are per recipient; officers previously had no preference rows and received nothing.
  if (targetType.category === "incident") {
    const operationsUsers = await storage.getActiveTenantUsersByRoles(tenantId, ["operations"]);
    const byId = new Map(candidateUsers.map((u) => [u.id, u]));
    for (const u of operationsUsers) {
      byId.set(u.id, u);
    }
    if (byId.size === 0) {
      const admins = await storage.getActiveTenantUsersByRoles(tenantId, ["admin"]);
      for (const u of admins) {
        byId.set(u.id, u);
      }
    }
    candidateUsers = [...byId.values()];
  }

  if (targetType.category === "appointments" && candidateUsers.length === 0) {
    const byId = new Map<string, User>();
    for (const role of ["staff", "fleet_operator", "admin"] as const) {
      const users = await storage.getActiveTenantUsersByRoles(tenantId, [role]);
      for (const u of users) {
        byId.set(u.id, u);
      }
    }
    candidateUsers = [...byId.values()];
  }

  if (targetType.category === "messaging" && candidateUsers.length === 0) {
    const byId = new Map<string, User>();
    for (const role of ["staff", "admin"] as const) {
      const users = await storage.getActiveTenantUsersByRoles(tenantId, [role]);
      for (const u of users) {
        byId.set(u.id, u);
      }
    }
    candidateUsers = [...byId.values()];
  }

  if (candidateUsers.length === 0) {
    return [];
  }

  const systemLevelTypes = [
    'equipment_health_report',
    'maintenance_reminder_7days',
    'follow_up_due',
  ];
  const isSystemLevelType = systemLevelTypes.includes(notificationTypeKey);

  const results: Array<{ user: User; channels: string[] }> = [];

  for (const user of candidateUsers) {
    const preferences = await storage.getNotificationPreferences(user.id, tenantId);
    const typePrefs = preferences.filter((p) => p.notificationTypeId === targetType.id);
    const anyRowForType = typePrefs.length > 0;

    const relevantPreferences = preferences.filter(
      (p) =>
        p.notificationTypeId === targetType.id &&
        p.enabled &&
        (!channels || channels.includes(p.channel as any))
    );

    if (relevantPreferences.length > 0) {
      const userChannels = relevantPreferences.map((p) => p.channel);
      results.push({
        user,
        channels: userChannels,
      });
    } else if (isSystemLevelType) {
      const defaultChannels = channels && channels.includes('email') ? ['email'] : (channels || ['email']);
      results.push({
        user,
        channels: defaultChannels,
      });
    } else if (targetType.category === "incident" && !anyRowForType) {
      // No rows for this type: default email + in-app. Rows exist but all disabled => opt-out (no branch).
      const defaultChannels =
        channels && channels.length > 0 ? [...channels] : ['email', 'in_app'];
      results.push({
        user,
        channels: defaultChannels,
      });
    }
  }

  return results;
}

/**
 * Create and send notifications to all recipients
 */
export async function createAndSendNotifications(
  storage: IStorage,
  params: {
    tenantId: string;
    notificationTypeKey: string;
    title: string;
    message: string;
    htmlEmail?: string; // Optional HTML email content
    metadata?: Record<string, any>;
    severity?: string;
    senderId?: string;
    /** When set, restrict delivery to these user ids (intersection with preference-based recipients). */
    recipientUserIds?: string[];
  }
): Promise<{ notificationsCreated: number; emailsSent: number; smsSent: number; errors: number }> {
  const { tenantId, notificationTypeKey, title, message, metadata, severity, senderId, recipientUserIds } =
    params;
  
  // Get notification type
  const allTypes = await storage.getNotificationTypes();
  const notificationType = allTypes.find(t => t.key === notificationTypeKey);
  
  if (!notificationType) {
    logError(`Notification type not found: ${notificationTypeKey}`);
    return { notificationsCreated: 0, emailsSent: 0, smsSent: 0, errors: 1 };
  }

  // Get recipients (severity is ignored - we send all notifications)
  let recipients = await getRecipientsForAlert(
    storage,
    tenantId,
    notificationTypeKey,
    undefined // Don't pass severity - send all notifications
  );

  if (recipientUserIds?.length) {
    const allowed = new Set(recipientUserIds);
    recipients = recipients.filter((r) => allowed.has(r.user.id));
  }

  if (recipients.length === 0) {
    return { notificationsCreated: 0, emailsSent: 0, smsSent: 0, errors: 0 };
  }

  let notificationsCreated = 0;
  let emailsSent = 0;
  let smsSent = 0;
  let errors = 0;

  // Create notification records and send via appropriate channels
  for (const { user, channels: userChannels } of recipients) {
    for (const channel of userChannels) {
      try {
        // Create notification record
        const notification = await storage.createNotification({
          tenantId,
          recipientId: user.id,
          senderId: senderId ?? null,
          notificationTypeId: notificationType.id,
          channel,
          title,
          message,
          status: 'pending',
          metadata: metadata ?? null,
        });

        notificationsCreated++;

        // Send via appropriate channel
        let sent = false;
        if (channel === 'email' && user.email) {
          // Use HTML email if provided, otherwise use plain message
          const emailHtml = params.htmlEmail || `<p>${message}</p>`;
          sent = await sendEmailNotification(notification, user.email, title, emailHtml);
          
          const emailProvider = 'resend';

          if (sent) {
            emailsSent++;
            await storage.markNotificationSent(notification.id);
            
            // Log delivery with dynamic provider name
            await storage.createNotificationDeliveryLog({
              tenantId,
              notificationId: notification.id,
              channel: 'email',
              provider: emailProvider, // <--- Updated this
              status: 'sent',
              providerResponse: null,
            });
          } else {
            errors++;
            logError(`Failed to send email notification`);
            await storage.createNotificationDeliveryLog({
              tenantId,
              notificationId: notification.id,
              channel: 'email',
              provider: emailProvider, // <--- Updated this
              status: 'failed',
              errorMessage: 'Email sending failed',
              providerResponse: null,
            });
          }

        } else if (channel === 'in_app') {
          // In-app notifications are already created, just mark as sent
          sent = true;
          await storage.markNotificationSent(notification.id);
          
          await storage.createNotificationDeliveryLog({
            tenantId,
            notificationId: notification.id,
            channel: 'in_app',
            provider: 'system',
            status: 'sent',
            providerResponse: null,
          });
        } else if (channel === "sms") {
          const phone = user.phoneNumber?.trim();
          if (!phone) {
            errors++;
            await storage.createNotificationDeliveryLog({
              tenantId,
              notificationId: notification.id,
              channel: "sms",
              provider: "twilio",
              status: "failed",
              errorMessage: "No phone number on file",
              providerResponse: null,
            });
          } else {
            const smsBody = `${title}. Open uventorybiz secure messaging to read.`;
            sent = await sendSMS({ to: phone, message: smsBody });
            if (sent) {
              smsSent++;
              await storage.markNotificationSent(notification.id);
              await storage.createNotificationDeliveryLog({
                tenantId,
                notificationId: notification.id,
                channel: "sms",
                provider: "twilio",
                status: "sent",
                providerResponse: null,
              });
            } else {
              errors++;
              await storage.createNotificationDeliveryLog({
                tenantId,
                notificationId: notification.id,
                channel: "sms",
                provider: "twilio",
                status: "failed",
                errorMessage: "SMS sending failed",
                providerResponse: null,
              });
            }
          }
        } else if (channel === "whatsapp") {
          // Placeholder for future implementation
          sent = false;
          errors++;
        }
      } catch (error) {
        logError(`Error creating/sending notification via ${channel}`, error);
        errors++;
      }
    }
  }

  if (process.env.NODE_ENV === "development" && (notificationsCreated > 0 || errors > 0)) {
    logDebug(
      `Notification summary: ${notificationsCreated} created, ${emailsSent} emails, ${smsSent} SMS, ${errors} errors`,
    );
  }
  return { notificationsCreated, emailsSent, smsSent, errors };
}

/**
 * Send email notification
 */
async function sendEmailNotification(
  notification: Notification,
  userEmail: string,
  subject: string,
  htmlBody: string
): Promise<boolean> {
  // The email template renders a text-based logo inline; no attachments needed.
  return await sendEmail({
    to: userEmail,
    subject,
    html: htmlBody,
  });
}

/**
 * Create in-app notification (already handled by createNotification, this is a no-op)
 */
export async function createInAppNotification(notification: Notification): Promise<boolean> {
  // In-app notifications are already created as notification records
  // They just need to be marked as sent
  return true;
}

/**
 * Send SMS notification via Twilio when configured.
 */
export async function sendSMSNotification(
  notification: Notification,
  userPhone: string,
  smsBody?: string,
): Promise<boolean> {
  const message = smsBody ?? notification.message;
  return sendSMS({ to: userPhone, message });
}

/**
 * Placeholder for WhatsApp notification (future implementation)
 */
export async function sendWhatsAppNotification(notification: Notification): Promise<boolean> {
  // TODO: Implement Meta WhatsApp Business API integration
  return false;
}
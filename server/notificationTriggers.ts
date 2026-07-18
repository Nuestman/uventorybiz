import type { IStorage } from './storage';
import type { IncidentReport, InventoryAlert, MedicalInventory, ShiftReport } from '@shared/schema';
import { createAndSendNotifications } from './notificationService';
import { getIncidentAlertEmail, getInventoryAlertEmail, getFollowUpDueReminderEmail } from './emailTemplates';
import { logDebug, logError, logInfo } from './logger';

/**
 * Map incident severity values to notification severity values
 * Incident reports use: minor, major, catastrophic
 * Notification system uses: low, medium, high, critical
 */
function mapIncidentSeverityToNotificationSeverity(incidentSeverity: string): string {
  const severityMap: Record<string, string> = {
    'minor': 'low',
    'major': 'high',
    'catastrophic': 'critical',
    // Also support direct mapping
    'low': 'low',
    'medium': 'medium',
    'high': 'high',
    'critical': 'critical',
  };
  
  const normalized = (incidentSeverity || '').toLowerCase();
  return severityMap[normalized] || 'medium'; // Default to medium if unknown
}

/**
 * Trigger notification when incident is created
 */
export async function notifyIncidentCreated(
  storage: IStorage,
  report: IncidentReport,
  tenantId: string
): Promise<void> {
  try {
    // Get tenant for tenant name
    const tenant = await storage.getTenant(tenantId);
    if (!tenant) {
      logError(`Tenant not found`, { tenantId: tenantId.substring(0, 8) + '...' });
      return;
    }

    // Get reporter user
    const reporter = report.reportedById ? await storage.getUser(report.reportedById) : null;
    const reporterName = reporter ? `${reporter.firstName || ''} ${reporter.lastName || ''}`.trim() || reporter.email || 'Unknown' : 'Unknown';

    // Get employee details if available
    let patientName: string | undefined;
    if (report.employeeId) {
      const employee = await storage.getEmployee(report.employeeId, tenantId);
      if (employee) {
        const name = `${employee.firstName || ''} ${employee.lastName || ''}`.trim();
        patientName = name || undefined;
      }
    }

    // Build view link
    const baseUrl = process.env.REPLIT_DOMAINS?.split(',')[0] || process.env.VERCEL_URL || 'http://localhost:17009';
    const viewLink = `https://${baseUrl}/incidents/${report.id}`;

    // Create email content with full incident details
    const emailHtml = getIncidentAlertEmail({
      incidentId: report.id,
      incidentType: report.incidentType,
      severity: report.severity,
      location: report.incidentLocation,
      reportedBy: reporterName,
      incidentDate: report.incidentDate,
      description: report.description,
      patientName: patientName || undefined,
      jobTitle: report.jobTitle ?? undefined,
      status: report.status ?? undefined,
      viewLink,
      tenantName: tenant.name,
    });

    // Create and send notifications
    const result = await createAndSendNotifications(storage, {
      tenantId,
      notificationTypeKey: 'incident_created',
      title: `New ${report.severity} Incident Reported`,
      message: `Incident #${report.id.substring(0, 8)} - ${report.incidentType} at ${report.incidentLocation}`,
      htmlEmail: emailHtml,
      metadata: {
        incidentId: report.id,
        severity: report.severity,
        incidentType: report.incidentType,
        location: report.incidentLocation,
        viewLink,
      },
      severity: undefined, // Don't pass severity - send all notifications
      senderId: report.reportedById,
    });
    logDebug(`✅ Incident notification triggered`);
    logDebug(`   Result: ${result.notificationsCreated} notifications, ${result.emailsSent} emails, ${result.errors} errors`);
  } catch (error) {
    logError('Error triggering incident notification', error);
    // Don't throw - notification failures shouldn't break incident creation
  }
}

/**
 * Trigger notification when incident is updated
 */
export async function notifyIncidentUpdated(
  storage: IStorage,
  report: IncidentReport,
  tenantId: string,
  changes?: Record<string, any>
): Promise<void> {
  try {
    const tenant = await storage.getTenant(tenantId);
    if (!tenant) {
      logError(`Tenant not found`, { tenantId: tenantId.substring(0, 8) + '...' });
      return;
    }

    // Get full incident details for email - use the report passed in
    const fullReport = report;
    
    // Get reporter user
    const reporter = fullReport.reportedById ? await storage.getUser(fullReport.reportedById) : null;
    const reporterName = reporter ? `${reporter.firstName || ''} ${reporter.lastName || ''}`.trim() || reporter.email || 'Unknown' : 'Unknown';

    // Get employee details if available
    let patientName: string | undefined;
    if (fullReport.employeeId) {
      const employee = await storage.getEmployee(fullReport.employeeId, tenantId);
      if (employee) {
        const name = `${employee.firstName || ''} ${employee.lastName || ''}`.trim();
        patientName = name || undefined;
      }
    }

    const baseUrl = process.env.REPLIT_DOMAINS?.split(',')[0] || process.env.VERCEL_URL || 'http://localhost:17009';
    const viewLink = `https://${baseUrl}/incidents/${report.id}`;

    const changeSummary = changes ? Object.keys(changes).join(', ') : 'various fields';
    
    // Create email content with full incident details
    const emailHtml = getIncidentAlertEmail({
      incidentId: fullReport.id,
      incidentType: fullReport.incidentType,
      severity: fullReport.severity,
      location: fullReport.incidentLocation,
      reportedBy: reporterName,
      incidentDate: fullReport.incidentDate,
      description: fullReport.description,
      patientName,
      jobTitle: fullReport.jobTitle ?? undefined,
      status: fullReport.status ?? undefined,
      viewLink,
      tenantName: tenant.name,
    });

    const result = await createAndSendNotifications(storage, {
      tenantId,
      notificationTypeKey: 'incident_updated',
      title: `Incident Updated: ${fullReport.incidentType}`,
      message: `Incident #${fullReport.id.substring(0, 8)} has been updated (${changeSummary})`,
      htmlEmail: emailHtml,
      metadata: {
        incidentId: fullReport.id,
        severity: fullReport.severity,
        incidentType: fullReport.incidentType,
        changes: changeSummary,
        viewLink,
      },
      severity: undefined, // Don't pass severity - send all notifications
    });
    
    logDebug(`✅ Incident update notification triggered`);
    logDebug(`   Result: ${result.notificationsCreated} notifications, ${result.emailsSent} emails, ${result.errors} errors`);
  } catch (error) {
    logError('Error triggering incident update notification', error);
  }
}

/**
 * Trigger notification when inventory alert is created
 */
export async function notifyInventoryAlert(
  storage: IStorage,
  alert: InventoryAlert,
  tenantId: string
): Promise<{ notificationsCreated: number; emailsSent: number; errors: number }> {
  try {
    // Map inventory alert types to notification types
    const alertTypeMap: Record<string, string> = {
      'low_stock': 'inventory_low_stock',
      'expiry': 'inventory_expiry',
      'equipment_maintenance': 'equipment_maintenance',
      'equipment_failure': 'equipment_failure',
    };

    const notificationTypeKey = alertTypeMap[alert.alertType] || 'inventory_low_stock';

    // Get inventory item details
    const inventoryItem = await storage.getMedicalInventory(alert.itemId, tenantId);
    if (!inventoryItem) {
      logError(`Inventory item not found`, { itemId: alert.itemId.substring(0, 8) + '...' });
      return { notificationsCreated: 0, emailsSent: 0, errors: 1 };
    }

    // Get tenant
    const tenant = await storage.getTenant(tenantId);
    if (!tenant) {
      console.error(`Tenant not found: ${tenantId}`);
      return { notificationsCreated: 0, emailsSent: 0, errors: 1 };
    }

    // Build view link
    const baseUrl = process.env.REPLIT_DOMAINS?.split(',')[0] || process.env.VERCEL_URL || 'http://localhost:17009';
    const viewLink = `https://${baseUrl}/inventory/${inventoryItem.id}`;

    // Create email content
    const emailHtml = getInventoryAlertEmail({
      alertType: alert.alertType as any,
      itemName: inventoryItem.itemName,
      itemCode: inventoryItem.itemCode,
      severity: alert.severity || 'medium',
      message: alert.message,
      viewLink,
      tenantName: tenant.name,
      currentStock: alert.currentStock ?? undefined,
      minimumStock: alert.minimumStock ?? undefined,
      expiryDate: alert.expiryDate ? new Date(alert.expiryDate) : undefined,
      daysToExpiry: alert.daysToExpiry ?? undefined,
    });

    // Create and send notifications
    const result = await createAndSendNotifications(storage, {
      tenantId,
      notificationTypeKey,
      title: `${alert.alertType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}: ${inventoryItem.itemName}`,
      message: alert.message,
      htmlEmail: emailHtml,
      metadata: {
        alertId: alert.id,
        itemId: inventoryItem.id,
        itemName: inventoryItem.itemName,
        itemCode: inventoryItem.itemCode,
        alertType: alert.alertType,
        severity: alert.severity,
        viewLink,
        currentStock: alert.currentStock,
        minimumStock: alert.minimumStock,
        expiryDate: alert.expiryDate,
        daysToExpiry: alert.daysToExpiry,
      },
      severity: undefined, // Don't pass severity - send all notifications
    });

    logDebug(`✅ Inventory alert notification triggered`);
    logDebug(`   Result: ${result.notificationsCreated} notifications, ${result.emailsSent} emails, ${result.errors} errors`);
    
    return result;
  } catch (error) {
    logError('Error triggering inventory alert notification', error);
    return { notificationsCreated: 0, emailsSent: 0, errors: 1 };
  }
}

/**
 * Helper to map inventory alert type to notification type key
 */
export function mapInventoryAlertTypeToNotificationType(alertType: string): string {
  const map: Record<string, string> = {
    'low_stock': 'inventory_low_stock',
    'expiry': 'inventory_expiry',
    'equipment_maintenance': 'equipment_maintenance',
    'equipment_failure': 'equipment_failure',
  };
  return map[alertType] || 'inventory_low_stock';
}

/**
 * Process all tenants: find due/overdue follow-ups that have not yet had a reminder sent,
 * send one digest notification per tenant, then mark reminder_sent_at on each follow-up.
 */
export async function processAllTenantsFollowUpDueReminders(storage: IStorage): Promise<{
  tenantCount: number;
  tenantsNotified: number;
  totalFollowUpsNotified: number;
  errors: number;
}> {
  const todayIso = new Date().toISOString().slice(0, 10);
  const tenants = await storage.getAllTenants();
  let tenantsNotified = 0;
  let totalFollowUpsNotified = 0;
  let errors = 0;
  const baseUrl = process.env.REPLIT_DOMAINS?.split(',')[0]
    || process.env.VERCEL_URL
    || process.env.RAILWAY_PUBLIC_DOMAIN
    || process.env.FRONTEND_URL
    || 'http://localhost:17009';
  const viewUrl = baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`;

  for (const tenant of tenants) {
    try {
      const rows = await storage.listPatientFollowUps(tenant.id, { dueOnly: true });
      const pending = rows.filter((r) => !r.followUp.reminderSentAt);
      if (pending.length === 0) continue;

      const tenantObj = await storage.getTenant(tenant.id);
      const tenantName = tenantObj?.name || tenant.name || 'Tenant';

      const followUpList = pending.map((r) => {
        const name = r.employee
          ? `${r.employee.firstName ?? ''} ${r.employee.lastName ?? ''}`.trim() || r.employee.employeeNumber || 'Unknown'
          : 'Unknown';
        const scheduled = r.followUp.scheduledDate;
        const isOverdue = scheduled < todayIso;
        return {
          subjectName: name,
          scheduledDate: scheduled,
          reason: r.followUp.reason || '',
          careContext: r.followUp.careContext || 'onsite',
          followUpId: r.followUp.id,
          isOverdue,
        };
      });

      const emailHtml = getFollowUpDueReminderEmail({
        tenantName,
        followUpList,
        baseUrl: viewUrl,
      });

      const result = await createAndSendNotifications(storage, {
        tenantId: tenant.id,
        notificationTypeKey: 'follow_up_due',
        title: `${followUpList.length} follow-up(s) due or overdue`,
        message: `You have ${followUpList.length} wellbeing follow-up(s) due or overdue. Open Employee wellbeing to complete or reschedule.`,
        htmlEmail: emailHtml,
        metadata: {
          followUpIds: followUpList.map((f) => f.followUpId),
          count: followUpList.length,
          viewLink: `${viewUrl}/wellbeing/follow-ups`,
        },
        severity: undefined,
      });

      if (result.errors > 0) errors += result.errors;
      if (result.notificationsCreated > 0) {
        tenantsNotified++;
        totalFollowUpsNotified += pending.length;
      }

      for (const r of pending) {
        await storage.updatePatientFollowUp(r.followUp.id, tenant.id, {
          reminderSentAt: new Date(),
        });
      }

      logDebug(`Follow-up reminders: tenant ${tenant.id} – ${pending.length} notified`);
    } catch (err) {
      logError('Follow-up due reminder error for tenant ' + tenant.id, err);
      errors++;
    }
  }

  logInfo(`Follow-up due reminders: ${tenantsNotified} tenant(s) notified, ${totalFollowUpsNotified} follow-up(s), ${errors} error(s)`);
  return {
    tenantCount: tenants.length,
    tenantsNotified,
    totalFollowUpsNotified,
    errors,
  };
}

function shiftReportViewBaseUrl(): string {
  const raw =
    process.env.FRONTEND_URL ||
    process.env.REPLIT_DOMAINS?.split(",")[0] ||
    process.env.VERCEL_URL ||
    "http://localhost:17009";
  return raw.startsWith("http") ? raw : `https://${raw}`;
}

/**
 * Notify subscribers when a shift report (handover) is published.
 */
export async function notifyShiftReportPublished(
  storage: IStorage,
  report: ShiftReport,
  tenantId: string,
  locationName?: string
): Promise<void> {
  try {
    const viewLink = `${shiftReportViewBaseUrl()}/shiftover/shift-report?highlight=${report.id}`;
    await createAndSendNotifications(storage, {
      tenantId,
      notificationTypeKey: "shift_report_published",
      title: "New shift handover published",
      message: `A shift report was submitted for ${locationName || "a care site"} (${report.shift} shift, ${report.reportDate}).`,
      metadata: { shiftReportId: report.id, viewLink },
      senderId: report.reportedById,
    });
    logDebug("Shift report published notification triggered");
  } catch (error) {
    logError("Error triggering shift report published notification", error);
  }
}

/**
 * Notify the author when another user acknowledges their shift report.
 */
export async function notifyShiftReportAcknowledged(
  storage: IStorage,
  report: ShiftReport,
  tenantId: string,
  acknowledgedByUserId: string,
  acknowledgerName: string
): Promise<void> {
  if (acknowledgedByUserId === report.reportedById) return;
  try {
    const viewLink = `${shiftReportViewBaseUrl()}/shiftover/shift-report?highlight=${report.id}`;
    const types = await storage.getNotificationTypes();
    const ntype = types.find((t) => t.key === "shift_report_acknowledged");
    if (!ntype) {
      logError("Notification type shift_report_acknowledged not found");
      return;
    }
    await storage.createNotification({
      tenantId,
      recipientId: report.reportedById,
      senderId: acknowledgedByUserId,
      notificationTypeId: ntype.id,
      channel: "in_app",
      title: "Your shift report was acknowledged",
      message: `${acknowledgerName} acknowledged the shift handover for ${report.shift} shift on ${report.reportDate}.`,
      status: "pending",
      metadata: { shiftReportId: report.id, viewLink },
    });
    logDebug("Shift report acknowledgment in-app notification created for author");
  } catch (error) {
    logError("Error triggering shift report acknowledgment notification", error);
  }
}


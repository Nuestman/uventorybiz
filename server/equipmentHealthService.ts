/**
 * Equipment Health Check Service
 * Generates weekly equipment health reports and sends maintenance reminders
 */

import type { IStorage } from './storage';
import type { MedicalInventory, EquipmentMaintenance, Tenant } from '@shared/schema';
import { createAndSendNotifications } from './notificationService';
import { getEquipmentHealthReportEmail, getUpcomingMaintenanceReminderEmail, getOverdueMaintenanceReminderEmail, getBulkMaintenanceReminderEmail, getBulkOverdueMaintenanceReminderEmail } from './emailTemplates';
import { logDebug, logError, logInfo } from './logger';

interface EquipmentHealthSummary {
  totalEquipment: number;
  activeEquipment: number;
  faultyEquipment: number;
  maintenanceEquipment: number;
  overdueMaintenance: number;
  upcomingMaintenance30Days: number;
  upcomingMaintenance7Days: number;
  equipmentByStatus: Record<string, number>;
  criticalIssues: Array<{
    itemName: string;
    itemCode: string;
    status: string;
    issue: string;
  }>;
}

/**
 * Generate weekly equipment health report for a tenant
 */
export async function generateEquipmentHealthReport(
  storage: IStorage,
  tenantId: string
): Promise<void> {
  try {
    const tenant = await storage.getTenant(tenantId);
    if (!tenant) {
      logError(`Tenant not found for health report`, { tenantId: tenantId.substring(0, 8) + '...' });
      return;
    }

    // Get all equipment items
    const allEquipment = await storage.getMedicalInventoryList(tenantId, {
      category: 'equipment'
    });

    // Get all maintenance records
    const allMaintenance = await storage.getEquipmentMaintenanceList(tenantId);
    
    // Get overdue maintenance from maintenance records
    const overdueMaintenanceRecords = await storage.getEquipmentMaintenanceList(tenantId, {
      overdue: true
    });
    
    // Also check equipment with overdue nextMaintenanceDate
    const todayForOverdue = new Date();
    todayForOverdue.setHours(0, 0, 0, 0);
    const overdueEquipmentFromDate = allEquipment.filter(eq => {
      if (!eq.nextMaintenanceDate) return false;
      const maintenanceDate = new Date(eq.nextMaintenanceDate);
      maintenanceDate.setHours(0, 0, 0, 0);
      return maintenanceDate < todayForOverdue;
    });
    
    // Combine both sources - use Set to track unique equipment IDs
    const overdueEquipmentIds = new Set<string>();
    overdueMaintenanceRecords.forEach(m => {
      if (m.equipmentId) overdueEquipmentIds.add(m.equipmentId);
    });
    overdueEquipmentFromDate.forEach(eq => {
      overdueEquipmentIds.add(eq.id);
    });
    
    const overdueMaintenanceCount = overdueEquipmentIds.size;

    // Calculate health summary - use equipmentStatus for equipment-specific status
    const summary: EquipmentHealthSummary = {
      totalEquipment: allEquipment.length,
      activeEquipment: allEquipment.filter(e => e.equipmentStatus === 'functional' || (!e.equipmentStatus && e.status === 'active')).length,
      faultyEquipment: allEquipment.filter(e => e.equipmentStatus === 'faulty' || e.status === 'faulty').length,
      maintenanceEquipment: allEquipment.filter(e => e.equipmentStatus === 'maintenance' || e.status === 'maintenance').length,
      overdueMaintenance: overdueMaintenanceCount,
      upcomingMaintenance30Days: 0,
      upcomingMaintenance7Days: 0,
      equipmentByStatus: {},
      criticalIssues: [],
    };

    // Count equipment by status - prefer equipmentStatus, fallback to status
    allEquipment.forEach(eq => {
      const statusKey = eq.equipmentStatus || eq.status || 'unknown';
      summary.equipmentByStatus[statusKey] = 
        (summary.equipmentByStatus[statusKey] || 0) + 1;
    });

    // Calculate upcoming maintenance from both maintenance records and equipment nextMaintenanceDate
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const thirtyDaysFromNow = new Date(today);
    thirtyDaysFromNow.setDate(today.getDate() + 30);
    const sevenDaysFromNow = new Date(today);
    sevenDaysFromNow.setDate(today.getDate() + 7);

    // Track equipment IDs we've already counted to avoid duplicates
    const countedEquipmentIds = new Set<string>();

    // Check maintenance records
    allMaintenance.forEach(maint => {
      if (maint.status === 'scheduled' && maint.scheduledDate) {
        const scheduledDate = new Date(maint.scheduledDate);
        scheduledDate.setHours(0, 0, 0, 0);
        if (scheduledDate <= thirtyDaysFromNow && scheduledDate > today) {
          summary.upcomingMaintenance30Days++;
          if (maint.equipmentId) countedEquipmentIds.add(maint.equipmentId);
        }
        if (scheduledDate <= sevenDaysFromNow && scheduledDate > today) {
          summary.upcomingMaintenance7Days++;
          if (maint.equipmentId) countedEquipmentIds.add(maint.equipmentId);
        }
      }
    });

    // Check equipment nextMaintenanceDate (from medical_inventory table)
    allEquipment.forEach(eq => {
      if (eq.nextMaintenanceDate && !countedEquipmentIds.has(eq.id)) {
        const maintenanceDate = new Date(eq.nextMaintenanceDate);
        maintenanceDate.setHours(0, 0, 0, 0);
        
        if (maintenanceDate <= thirtyDaysFromNow && maintenanceDate > today) {
          summary.upcomingMaintenance30Days++;
          countedEquipmentIds.add(eq.id);
        }
        if (maintenanceDate <= sevenDaysFromNow && maintenanceDate > today) {
          summary.upcomingMaintenance7Days++;
          if (!countedEquipmentIds.has(eq.id)) {
            countedEquipmentIds.add(eq.id);
          }
        }
      }
    });

    // Identify critical issues - check both equipmentStatus and status
    allEquipment.forEach(eq => {
      const isFaulty = eq.equipmentStatus === 'faulty' || eq.status === 'faulty';
      const isMaintenance = eq.equipmentStatus === 'maintenance' || eq.status === 'maintenance';
      
      if (isFaulty) {
        summary.criticalIssues.push({
          itemName: eq.itemName,
          itemCode: eq.itemCode,
          status: eq.equipmentStatus || eq.status || 'unknown',
          issue: 'Equipment marked as faulty',
        });
      }
      
      if (isMaintenance) {
        summary.criticalIssues.push({
          itemName: eq.itemName,
          itemCode: eq.itemCode,
          status: eq.equipmentStatus || eq.status || 'unknown',
          issue: 'Equipment is currently under maintenance',
        });
      }
      
    });

    // Add overdue maintenance from maintenance records
    overdueMaintenanceRecords.forEach(maint => {
      const equipment = allEquipment.find(e => e.id === maint.equipmentId);
      if (equipment) {
        summary.criticalIssues.push({
          itemName: equipment.itemName,
          itemCode: equipment.itemCode,
          status: 'overdue',
          issue: `Maintenance overdue since ${maint.scheduledDate}`,
        });
      }
    });

    // Add overdue maintenance from equipment nextMaintenanceDate
    overdueEquipmentFromDate.forEach(eq => {
      if (!overdueMaintenanceRecords.find(m => m.equipmentId === eq.id)) {
        summary.criticalIssues.push({
          itemName: eq.itemName,
          itemCode: eq.itemCode,
          status: 'overdue',
          issue: `Maintenance overdue since ${eq.nextMaintenanceDate}`,
        });
      }
    });
    
    // Track expired warranties separately (not critical)
    const expiredWarranties: Array<{ itemName: string; itemCode: string; expiryDate: string }> = [];
    allEquipment.forEach(eq => {
      if (eq.warrantyExpiry) {
        const warrantyExpiryDate = new Date(eq.warrantyExpiry);
        warrantyExpiryDate.setHours(0, 0, 0, 0);
        
        if (warrantyExpiryDate < today) {
          expiredWarranties.push({
            itemName: eq.itemName,
            itemCode: eq.itemCode,
            expiryDate: warrantyExpiryDate.toLocaleDateString(),
          });
        }
      }
    });

    // Build view link
    const baseUrl = process.env.REPLIT_DOMAINS?.split(',')[0] || process.env.VERCEL_URL || 'http://localhost:17009';
    const viewLink = `https://${baseUrl}/inventory?category=equipment`;

    // Generate email content
    const emailHtml = getEquipmentHealthReportEmail({
      tenantName: tenant.name,
      summary,
      expiredWarranties,
      reportDate: new Date(),
      viewLink,
    });

    // Send notification to system admins
    const notificationResult = await createAndSendNotifications(storage, {
      tenantId,
      notificationTypeKey: 'equipment_health_report',
      title: `Weekly Equipment Health Report - ${tenant.name}`,
      message: `Equipment Health Summary: ${summary.activeEquipment}/${summary.totalEquipment} active, ${summary.faultyEquipment} faulty, ${summary.overdueMaintenance} overdue maintenance`,
      htmlEmail: emailHtml,
      metadata: {
        reportType: 'weekly_health_check',
        summary: {
          totalEquipment: summary.totalEquipment,
          activeEquipment: summary.activeEquipment,
          faultyEquipment: summary.faultyEquipment,
          overdueMaintenance: summary.overdueMaintenance,
        },
        viewLink,
      },
    });

    logInfo(`✅ Equipment health report generated for tenant ${tenant.name}`);
    logInfo(`📊 Notification summary: ${notificationResult.notificationsCreated} created, ${notificationResult.emailsSent} emails sent, ${notificationResult.errors} errors`);
  } catch (error) {
    logError('Error generating equipment health report', error);
  }
}

/**
 * Check and send maintenance reminders for equipment due within 7 days (including overdue) - BULK EMAIL
 */
export async function checkAndSendMaintenanceReminders(
  storage: IStorage,
  tenantId: string
): Promise<void> {
  try {
    const tenant = await storage.getTenant(tenantId);
    if (!tenant) {
      logError(`Tenant not found for maintenance reminders`, { tenantId: tenantId.substring(0, 8) + '...' });
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get all scheduled maintenance
    const scheduledMaintenance = await storage.getEquipmentMaintenanceList(tenantId, {
      status: 'scheduled'
    });

    // Get all equipment for details
    const allEquipment = await storage.getMedicalInventoryList(tenantId, {
      category: 'equipment'
    });

    // Build view link
    const baseUrl = process.env.FRONTEND_URL || process.env.REPLIT_DOMAINS?.split(',')[0] || process.env.VERCEL_URL || 'http://localhost:17009';
    const baseUrlStr = baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`;

    // Create equipment lookup map for O(1) access instead of O(n) find()
    const equipmentMap = new Map<string, typeof allEquipment[0]>();
    for (const equipment of allEquipment) {
      equipmentMap.set(equipment.id, equipment);
    }

    // Track which equipment we've already sent reminders for to avoid duplicates
    const sentReminders = new Set<string>();
    let totalNotificationsCreated = 0;
    let totalEmailsSent = 0;
    let totalErrors = 0;

    // Collect equipment for maintenance reminders (due within 7 days, including overdue)
    const equipmentDue: Array<{
      itemName: string;
      itemCode: string;
      maintenanceType: string;
      scheduledDate: Date;
      daysUntil: number;
      equipmentId: string;
    }> = [];

    // Check maintenance records for equipment due within 7 days (including overdue)
    for (const maint of scheduledMaintenance) {
      if (!maint.scheduledDate || !maint.equipmentId) continue;

      const scheduledDate = new Date(maint.scheduledDate);
      scheduledDate.setHours(0, 0, 0, 0);

      const daysUntil = Math.ceil((scheduledDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      const equipment = equipmentMap.get(maint.equipmentId);
      if (!equipment) continue;

      // Check for equipment due within 7 days (includes overdue with negative daysUntil)
      if (daysUntil <= 7 && !sentReminders.has(`7d-${maint.equipmentId}`)) {
        equipmentDue.push({
          itemName: equipment.itemName,
          itemCode: equipment.itemCode,
          maintenanceType: maint.maintenanceType,
          scheduledDate: scheduledDate,
          daysUntil: daysUntil,
          equipmentId: equipment.id,
        });
        sentReminders.add(`7d-${maint.equipmentId}`);
      }
    }

    // Also check nextMaintenanceDate from equipment (medical_inventory table)
    for (const equipment of allEquipment) {
      if (!equipment.nextMaintenanceDate) continue;

      const maintenanceDate = new Date(equipment.nextMaintenanceDate);
      maintenanceDate.setHours(0, 0, 0, 0);

      const daysUntil = Math.ceil((maintenanceDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      // Check for equipment due within 7 days (includes overdue with negative daysUntil)
      if (daysUntil <= 7 && !sentReminders.has(`7d-${equipment.id}`)) {
        equipmentDue.push({
          itemName: equipment.itemName,
          itemCode: equipment.itemCode,
          maintenanceType: 'preventive',
          scheduledDate: maintenanceDate,
          daysUntil: daysUntil,
          equipmentId: equipment.id,
        });
        sentReminders.add(`7d-${equipment.id}`);
      }
    }

    // Send bulk email for equipment due within 7 days (including overdue)
    if (equipmentDue.length > 0) {
      const emailHtml = getBulkMaintenanceReminderEmail({
        tenantName: tenant.name,
        equipmentList: equipmentDue,
        baseUrl: baseUrlStr,
      });

      const result = await createAndSendNotifications(storage, {
        tenantId,
        notificationTypeKey: 'maintenance_reminder_7days',
        title: `Maintenance Reminder: ${equipmentDue.length} Equipment`,
        message: `${equipmentDue.length} equipment item${equipmentDue.length !== 1 ? 's' : ''} ${equipmentDue.length === 1 ? 'is' : 'are'} due for maintenance within 7 days`,
        htmlEmail: emailHtml,
        metadata: {
          equipmentCount: equipmentDue.length,
          equipmentIds: equipmentDue.map(e => e.equipmentId),
        },
      });

      totalNotificationsCreated += result.notificationsCreated;
      totalEmailsSent += result.emailsSent;
      totalErrors += result.errors;
      logInfo(`✅ Sent bulk maintenance reminder for ${equipmentDue.length} equipment (${result.notificationsCreated} notifications, ${result.emailsSent} emails)`);
    } else {
      logInfo(`ℹ️ No equipment due for maintenance within 7 days for tenant ${tenant.name}`);
    }

    logInfo(`📊 Maintenance reminder summary: ${totalNotificationsCreated} notifications created, ${totalEmailsSent} emails sent, ${totalErrors} errors`);
  } catch (error) {
    logError('Error checking maintenance reminders', error);
  }
}

/**
 * Check and send overdue maintenance reminders - BULK EMAIL
 */
export async function checkAndSendOverdueMaintenanceReminders(
  storage: IStorage,
  tenantId: string
): Promise<void> {
  try {
    const tenant = await storage.getTenant(tenantId);
    if (!tenant) {
      logError(`Tenant not found for overdue maintenance reminders`, { tenantId: tenantId.substring(0, 8) + '...' });
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get overdue maintenance records
    const overdueMaintenanceRecords = await storage.getEquipmentMaintenanceList(tenantId, {
      overdue: true
    });

    // Get all equipment for details
    const allEquipment = await storage.getMedicalInventoryList(tenantId, {
      category: 'equipment'
    });

    // Build view link
    const baseUrl = process.env.FRONTEND_URL || process.env.REPLIT_DOMAINS?.split(',')[0] || process.env.VERCEL_URL || 'http://localhost:17009';
    const baseUrlStr = baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`;

    // Create equipment lookup map for O(1) access instead of O(n) find()
    const equipmentMap = new Map<string, typeof allEquipment[0]>();
    for (const equipment of allEquipment) {
      equipmentMap.set(equipment.id, equipment);
    }

    // Collect overdue equipment
    const overdueEquipment: Array<{
      itemName: string;
      itemCode: string;
      maintenanceType: string;
      scheduledDate: Date;
      daysOverdue: number;
      equipmentId: string;
    }> = [];

    // Track which equipment we've already included to avoid duplicates
    const processedEquipmentIds = new Set<string>();

    // Check overdue maintenance records
    for (const maint of overdueMaintenanceRecords) {
      if (!maint.equipmentId || !maint.scheduledDate) continue;
      
      const equipment = equipmentMap.get(maint.equipmentId);
      if (!equipment || processedEquipmentIds.has(equipment.id)) continue;

      const scheduledDate = new Date(maint.scheduledDate);
      scheduledDate.setHours(0, 0, 0, 0);
      const daysOverdue = Math.ceil((today.getTime() - scheduledDate.getTime()) / (1000 * 60 * 60 * 24));

      overdueEquipment.push({
        itemName: equipment.itemName,
        itemCode: equipment.itemCode,
        maintenanceType: maint.maintenanceType,
        scheduledDate: scheduledDate,
        daysOverdue: daysOverdue,
        equipmentId: equipment.id,
      });
      processedEquipmentIds.add(equipment.id);
    }

    // Check overdue maintenance from equipment nextMaintenanceDate
    for (const equipment of allEquipment) {
      if (!equipment.nextMaintenanceDate || processedEquipmentIds.has(equipment.id)) continue;

      const maintenanceDate = new Date(equipment.nextMaintenanceDate);
      maintenanceDate.setHours(0, 0, 0, 0);
      const daysUntil = Math.ceil((maintenanceDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      if (daysUntil < 0) {
        const daysOverdue = Math.abs(daysUntil);
        overdueEquipment.push({
          itemName: equipment.itemName,
          itemCode: equipment.itemCode,
          maintenanceType: 'preventive',
          scheduledDate: maintenanceDate,
          daysOverdue: daysOverdue,
          equipmentId: equipment.id,
        });
        processedEquipmentIds.add(equipment.id);
      }
    }

    // Send bulk email for overdue maintenance if any found
    if (overdueEquipment.length > 0) {
      const emailHtml = getBulkOverdueMaintenanceReminderEmail({
        tenantName: tenant.name,
        equipmentList: overdueEquipment,
        baseUrl: baseUrlStr,
      });

      const result = await createAndSendNotifications(storage, {
        tenantId,
        notificationTypeKey: 'maintenance_reminder_7days', // Use 7-day reminder type for overdue
        title: `Maintenance Overdue: ${overdueEquipment.length} Equipment`,
        message: `${overdueEquipment.length} equipment item${overdueEquipment.length !== 1 ? 's' : ''} ${overdueEquipment.length === 1 ? 'is' : 'are'} overdue for maintenance`,
        htmlEmail: emailHtml,
        metadata: {
          equipmentCount: overdueEquipment.length,
          equipmentIds: overdueEquipment.map(e => e.equipmentId),
        },
      });

      logInfo(`✅ Sent bulk overdue maintenance reminder for ${overdueEquipment.length} equipment (${result.notificationsCreated} notifications, ${result.emailsSent} emails)`);
      logInfo(`📊 Overdue maintenance reminder summary: ${result.notificationsCreated} notifications created, ${result.emailsSent} emails sent, ${result.errors} errors`);
    } else {
      logInfo(`ℹ️ No overdue maintenance found for tenant ${tenant.name}`);
    }
  } catch (error) {
    logError('Error checking overdue maintenance reminders', error);
    throw error;
  }
}

/**
 * Process health checks for all tenants
 */
export async function processAllTenantsHealthChecks(storage: IStorage): Promise<void> {
  try {
    // Get all tenants
    const tenants = await storage.getTenants();
    
    logInfo(`🔄 Processing equipment health checks for ${tenants.length} tenant(s)...`);

    for (const tenant of tenants) {
      await generateEquipmentHealthReport(storage, tenant.id);
    }

    logInfo(`✅ Completed equipment health checks for all tenants`);
  } catch (error) {
    logError('Error processing health checks for all tenants', error);
  }
}

/**
 * Process maintenance reminders for all tenants (equipment due within 7 days)
 */
export async function processAllTenantsMaintenanceReminders(storage: IStorage): Promise<void> {
  try {
    // Get all tenants
    const tenants = await storage.getTenants();
    
    logInfo(`🔄 Processing maintenance reminders for ${tenants.length} tenant(s)...`);

    for (const tenant of tenants) {
      await checkAndSendMaintenanceReminders(storage, tenant.id);
    }

    logInfo(`✅ Completed maintenance reminder checks for all tenants`);
  } catch (error) {
    logError('Error processing maintenance reminders for all tenants', error);
  }
}

/**
 * Process overdue maintenance reminders for all tenants
 */
export async function processAllTenantsOverdueMaintenanceReminders(storage: IStorage): Promise<void> {
  try {
    // Get all tenants
    const tenants = await storage.getTenants();
    
    logInfo(`🔄 Processing overdue maintenance reminders for ${tenants.length} tenant(s)...`);

    for (const tenant of tenants) {
      await checkAndSendOverdueMaintenanceReminders(storage, tenant.id);
    }

    logInfo(`✅ Completed overdue maintenance reminder checks for all tenants`);
  } catch (error) {
    logError('Error processing overdue maintenance reminders for all tenants', error);
  }
}

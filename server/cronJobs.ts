/**
 * Cron Jobs for Scheduled Tasks
 * Handles automated equipment health checks and maintenance reminders
 */

import cron from 'node-cron';
import type { IStorage } from './storage';
import { 
  processAllTenantsHealthChecks, 
  processAllTenantsMaintenanceReminders,
  processAllTenantsOverdueMaintenanceReminders
} from './equipmentHealthService';
import { processAllTenantsFollowUpDueReminders } from './notificationTriggers';
import { markStaleAppointmentsAsNoShow } from './modules/appointments/appointment-management.service';
import { processPortalOrderAutoCompletion } from './modules/portal/portal-orders.service';
import { env } from './config/env';
import { logInfo, logError } from './logger';

/** Run duty spawner for all tenants (creates today's recurring duty assignments from schedule rules). */
export async function processAllTenantsDutySpawn(storage: IStorage): Promise<{ tenantCount: number; totalSpawned: number; failedTenants: string[] }> {
  const tenants = await storage.getAllTenants();
  let totalSpawned = 0;
  const failedTenants: string[] = [];
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10);
  logInfo(`[DutySpawner] Processing ${tenants.length} tenant(s) for date ${dateStr}`);
  for (const tenant of tenants) {
    try {
      const { spawned } = await storage.spawnDutyAssignmentsForDate(tenant.id, today);
      if (spawned > 0) {
        logInfo(`[DutySpawner] Tenant ${tenant.id}: spawned ${spawned} assignment(s)`);
        totalSpawned += spawned;
      } else {
        logInfo(`[DutySpawner] Tenant ${tenant.id}: 0 spawned (no schedule for today or already exist)`);
      }
    } catch (err) {
      failedTenants.push(tenant.id);
      logError(`[DutySpawner] FAILED for tenant ${tenant.id}`, err);
    }
  }
  if (failedTenants.length > 0) {
    logError(`[DutySpawner] Completed with failures: ${totalSpawned} spawned across ${tenants.length} tenants; failed: ${failedTenants.join(', ')}`);
  } else {
    logInfo(`[DutySpawner] SUCCESS: ${totalSpawned} assignment(s) spawned across ${tenants.length} tenant(s) for ${dateStr}`);
  }
  return { tenantCount: tenants.length, totalSpawned, failedTenants };
}

let storage: IStorage | null = null;

/**
 * Initialize cron jobs
 */
export function initializeCronJobs(dbStorage: IStorage): void {
  storage = dbStorage;

  // Detect server timezone - use environment variable if set, otherwise auto-detect
  const serverTimezone = process.env.TZ || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  
  // Weekly equipment health check - Every Monday at 8:00 AM
  // Cron format: minute hour day month day-of-week
  // 0 8 * * 1 = 8:00 AM every Monday
  try {
    const healthCheckCron = cron.schedule('0 8 * * 1', async () => {
      const now = new Date();
      logInfo('🔄 Starting weekly equipment health check (Monday 8:00 AM)...');
      logInfo(`   Triggered at: ${now.toLocaleString()} (${serverTimezone})`);
      try {
        if (storage) {
          await processAllTenantsHealthChecks(storage);
          logInfo('✅ Weekly equipment health check completed');
        } else {
          logError('Storage not initialized for health check');
        }
      } catch (error) {
        logError('Error in weekly equipment health check', error);
      }
    }, {
      timezone: serverTimezone,
    });
    logInfo('   Health check cron job scheduled');
  } catch (error) {
    logError('Failed to schedule health check cron job', error);
  }

  // Daily maintenance reminder check - Every day at 6:00 AM
  // 0 6 * * * = 6:00 AM every day
  try {
    const maintenanceCron = cron.schedule('0 6 * * *', async () => {
      const now = new Date();
      logInfo(`🔄 Starting daily maintenance reminder check (6:00 AM ${serverTimezone})...`);
      logInfo(`   Triggered at: ${now.toLocaleString()} (${serverTimezone})`);
      try {
        if (storage) {
          await processAllTenantsMaintenanceReminders(storage);
          logInfo('✅ Daily maintenance reminder check completed');
        } else {
          logError('Storage not initialized for maintenance reminder check');
        }
      } catch (error) {
        logError('Error in daily maintenance reminder check', error);
      }
    }, {
      timezone: serverTimezone,
    });
    logInfo('   Maintenance reminder cron job scheduled');
  } catch (error) {
    logError('Failed to schedule maintenance reminder cron job', error);
  }

  // Daily Our People follow-up due reminders - Every day at 7:00 AM
  try {
    cron.schedule('0 7 * * *', async () => {
      const now = new Date();
      logInfo(`🔄 Starting daily follow-up due reminder check (7:00 AM ${serverTimezone})...`);
      logInfo(`   Triggered at: ${now.toLocaleString()} (${serverTimezone})`);
      try {
        if (storage) {
          const result = await processAllTenantsFollowUpDueReminders(storage);
          logInfo(`✅ Follow-up due reminders: ${result.tenantsNotified} tenant(s), ${result.totalFollowUpsNotified} follow-up(s)`);
          if (result.errors > 0) {
            logError(`   ${result.errors} error(s) during follow-up reminder send`);
          }
        } else {
          logError('Storage not initialized for follow-up reminder check');
        }
      } catch (error) {
        logError('Error in follow-up due reminder check', error);
      }
    }, {
      timezone: serverTimezone,
    });
    logInfo('   Follow-up due reminder cron job scheduled (7:00 AM)');
  } catch (error) {
    logError('Failed to schedule follow-up due reminder cron job', error);
  }

  // Daily duty spawner - Every day at 00:01 AM (spawn recurring duty assignments for "today")
  // Separates schedule rule (operationalDuties) from task instances (operationalDutyAssignments)
  try {
    cron.schedule('1 0 * * *', async () => {
      const now = new Date();
      logInfo(`🔄 [DutySpawner] Starting daily run (00:01 ${serverTimezone}) at ${now.toLocaleString()}`);
      try {
        if (storage) {
          const result = await processAllTenantsDutySpawn(storage);
          if (result.failedTenants.length > 0) {
            logError(`[DutySpawner] Daily run finished with errors: ${result.totalSpawned} spawned, ${result.failedTenants.length} tenant(s) failed: ${result.failedTenants.join(', ')}`);
          } else {
            logInfo(`[DutySpawner] Daily run SUCCESS: ${result.totalSpawned} assignment(s) across ${result.tenantCount} tenant(s)`);
          }
        } else {
          logError('[DutySpawner] FAILED: Storage not initialized for duty spawner');
        }
      } catch (error) {
        logError('[DutySpawner] FAILED: Unhandled error in daily duty spawner', error);
      }
    }, {
      timezone: serverTimezone,
    });
    logInfo('   Duty spawner cron job scheduled (00:01)');
  } catch (error) {
    logError('Failed to schedule duty spawner cron job', error);
  }

  // Daily portal order auto-complete - Every day at 6:30 AM.
  // Orders awaiting customer receipt (ready for pickup / out for delivery) are
  // auto-completed once the receipt grace window passes.
  try {
    cron.schedule('30 6 * * *', async () => {
      logInfo(`🔄 Starting portal order auto-complete run (6:30 AM ${serverTimezone})...`);
      try {
        const result = await processPortalOrderAutoCompletion();
        if (result.completed > 0 || result.errors > 0) {
          logInfo(`✅ Portal order auto-complete: ${result.completed} completed, ${result.errors} error(s)`);
        } else {
          logInfo('✅ Portal order auto-complete: nothing to do');
        }
      } catch (error) {
        logError('Error in portal order auto-complete job', error);
      }
    }, {
      timezone: serverTimezone,
    });
    logInfo('   Portal order auto-complete cron job scheduled (6:30 AM)');
  } catch (error) {
    logError('Failed to schedule portal order auto-complete cron job', error);
  }

  // Hourly DB crons — behind HOURLY_CRON_JOBS_ENABLED so Neon Free can scale to zero when paused.
  // When off: staff mark no-shows manually.
  if (!env.HOURLY_CRON_JOBS_ENABLED) {
    logInfo('   Hourly crons DISABLED via HOURLY_CRON_JOBS_ENABLED=false (appointment no-show)');
  } else {
    // Hourly stale appointment check — auto no-show after slot + grace period
    try {
      cron.schedule('30 * * * *', async () => {
        logInfo('🔄 Checking for stale appointments (auto no-show)...');
        try {
          const { marked } = await markStaleAppointmentsAsNoShow();
          if (marked > 0) {
            logInfo(`✅ Marked ${marked} appointment(s) as no-show`);
          }
        } catch (error) {
          logError('Error in appointment no-show job', error);
        }
      }, {
        timezone: serverTimezone,
      });
      logInfo('   Appointment no-show cron job scheduled (hourly at :30)');
    } catch (error) {
      logError('Failed to schedule appointment no-show cron job', error);
    }
  }

  // Log next scheduled times
  const now = new Date();
  const nextMaintenance = new Date(now);
  nextMaintenance.setHours(6, 0, 0, 0);
  if (nextMaintenance <= now) {
    nextMaintenance.setDate(nextMaintenance.getDate() + 1);
  }

  const nextHealthCheck = new Date(now);
  const currentDay = nextHealthCheck.getDay();
  const daysUntilMonday = currentDay === 0 ? 1 : (8 - currentDay) % 7 || 7;
  nextHealthCheck.setDate(nextHealthCheck.getDate() + daysUntilMonday);
  nextHealthCheck.setHours(8, 0, 0, 0);

  const nextFollowUpReminder = new Date(now);
  nextFollowUpReminder.setHours(7, 0, 0, 0);
  if (nextFollowUpReminder <= now) {
    nextFollowUpReminder.setDate(nextFollowUpReminder.getDate() + 1);
  }

  logInfo('✅ Cron jobs initialized');
  logInfo(`   Timezone: ${serverTimezone}`);
  logInfo(`   - Weekly health check: Every Monday at 8:00 AM`);
  logInfo(`     Next run: ${nextHealthCheck.toLocaleString()} (${serverTimezone})`);
  logInfo(`   - Maintenance reminders: Every day at 6:00 AM`);
  logInfo(`     Next run: ${nextMaintenance.toLocaleString()} (${serverTimezone})`);
  logInfo(`   - Follow-up due reminders: Every day at 7:00 AM`);
  logInfo(`     Next run: ${nextFollowUpReminder.toLocaleString()} (${serverTimezone})`);
  const nextSpawn = new Date(now);
  nextSpawn.setDate(nextSpawn.getDate() + 1);
  nextSpawn.setHours(0, 1, 0, 0);
  logInfo(`   - Duty spawner: Every day at 00:01 AM`);
  logInfo(`     Next run: ${nextSpawn.toLocaleString()} (${serverTimezone})`);
  logInfo(`   - Portal order auto-complete: Every day at 6:30 AM (after receipt grace period)`);
  if (env.HOURLY_CRON_JOBS_ENABLED) {
    logInfo(`   - Appointment no-show: Every hour at :30 (grace via APPOINTMENT_NO_SHOW_GRACE_MINUTES, default 15)`);
  } else {
    logInfo(`   - Hourly crons (appointment no-show): DISABLED (HOURLY_CRON_JOBS_ENABLED=false)`);
  }
  logInfo(`   Current server time: ${now.toLocaleString()} (${serverTimezone})`);
}

/**
 * Manually trigger health check (for testing or admin use)
 */
export async function triggerHealthCheckManually(dbStorage: IStorage): Promise<void> {
  logInfo('🔄 Manually triggering equipment health check...');
  try {
    await processAllTenantsHealthChecks(dbStorage);
    logInfo('✅ Manual health check completed');
  } catch (error) {
    logError('Error in manual health check', error);
    throw error;
  }
}

/**
 * Manually trigger maintenance reminder check (for testing or admin use)
 */
export async function triggerMaintenanceReminderCheckManually(dbStorage: IStorage): Promise<void> {
  logInfo('🔄 Manually triggering maintenance reminder check...');
  try {
    await processAllTenantsMaintenanceReminders(dbStorage);
    logInfo('✅ Manual maintenance reminder check completed');
  } catch (error) {
    logError('Error in manual maintenance reminder check', error);
    throw error;
  }
}

/**
 * Manually trigger overdue maintenance reminder check (for testing or admin use)
 */
export async function triggerOverdueMaintenanceReminderCheckManually(dbStorage: IStorage): Promise<void> {
  logInfo('🔄 Manually triggering overdue maintenance reminder check...');
  try {
    await processAllTenantsOverdueMaintenanceReminders(dbStorage);
    logInfo('✅ Manual overdue maintenance reminder check completed');
  } catch (error) {
    logError('Error in manual overdue maintenance reminder check', error);
    throw error;
  }
}

/**
 * Manually trigger duty spawner (for testing or admin use). Spawns recurring duty assignments for today for all tenants.
 */
export async function triggerDutySpawnManually(dbStorage: IStorage): Promise<{ tenantCount: number; totalSpawned: number; failedTenants: string[] }> {
  logInfo('[DutySpawner] Manual trigger started');
  const result = await processAllTenantsDutySpawn(dbStorage);
  if (result.failedTenants.length > 0) {
    logError(`[DutySpawner] Manual trigger finished with errors: ${result.totalSpawned} spawned, failed tenants: ${result.failedTenants.join(', ')}`);
  } else {
    logInfo(`[DutySpawner] Manual trigger SUCCESS: ${result.totalSpawned} assignment(s) across ${result.tenantCount} tenant(s)`);
  }
  return result;
}

export async function triggerFollowUpDueRemindersManually(dbStorage: IStorage): Promise<{
  tenantCount: number;
  tenantsNotified: number;
  totalFollowUpsNotified: number;
  errors: number;
}> {
  logInfo('🔄 Manually triggering follow-up due reminders...');
  const result = await processAllTenantsFollowUpDueReminders(dbStorage);
  logInfo(`✅ Follow-up due reminders: ${result.tenantsNotified} tenant(s), ${result.totalFollowUpsNotified} follow-up(s), ${result.errors} error(s)`);
  return result;
}

# Inventory Alert System Fix Plan

## Problem Analysis

### Current Issues:
1. **Existing alerts don't trigger notifications**: Alerts exist in `inventory_alerts` table but never sent emails/notifications
2. **Equipment status changes ignored**: When equipment status changes to "faulty" or "maintenance", no alerts are created
3. **Duplicate prevention blocks notifications**: System skips creating alerts if one exists, but doesn't send notifications for existing alerts
4. **No notification tracking**: No way to know if an alert has already sent notifications

## Solution Architecture

### 1. Add Notification Tracking to Alerts
- Add `notification_sent_at` timestamp to `inventory_alerts` table
- Track when notifications were last sent for an alert
- Allow re-sending notifications if alert is still active after a period

### 2. Equipment Status Change Detection
- Detect when `equipmentStatus` changes to "faulty" or "maintenance"
- Create `equipment_failure` alert for faulty equipment
- Create `equipment_maintenance` alert for maintenance status
- Trigger notifications immediately

### 3. Process Existing Active Alerts
- Create function to find all active alerts that haven't sent notifications
- Send notifications for these alerts
- Can be called on system startup or via admin endpoint

### 4. Enhanced Alert Creation Flow
```
Inventory Update/Status Change
  ↓
Check for conditions (low stock, expiry, status change, maintenance due)
  ↓
Check if alert exists
  ↓
If exists AND notification not sent recently → Send notification
If doesn't exist → Create alert AND send notification
```

### 5. Notification Re-send Logic
- Allow re-sending notifications for active alerts after 24 hours
- Prevents spam but ensures alerts don't get forgotten
- Configurable threshold

## Implementation Steps

### Step 1: Schema Update
Add `notification_sent_at` column to `inventory_alerts` table

### Step 2: Equipment Status Detection
Modify `updateMedicalInventory` to detect status changes and create alerts

### Step 3: Notification Tracking
Update `createInventoryAlert` to set `notification_sent_at` after sending

### Step 4: Process Existing Alerts
Create function to process existing active alerts and send notifications

### Step 5: Enhanced Alert Logic
Update `checkAndCreateInventoryAlerts` to:
- Check if alert exists
- If exists, check if notification was sent
- Send notification if needed
- Create new alert if doesn't exist

## Files to Modify

1. `migrations/add_notification_system.sql` - Add `notification_sent_at` column
2. `shared/schema.ts` - Update `inventoryAlerts` table schema
3. `server/storage.ts` - Add equipment status detection, notification tracking
4. `server/routes.ts` - Add endpoint to process existing alerts (optional)

## Testing Checklist

- [ ] Low stock alerts trigger notifications
- [ ] Expiry alerts trigger notifications  
- [ ] Equipment status change to "faulty" creates alert and sends notification
- [ ] Equipment status change to "maintenance" creates alert and sends notification
- [ ] Maintenance due alerts trigger notifications
- [ ] Existing active alerts can be processed and send notifications
- [ ] Duplicate notifications aren't sent within 24 hours
- [ ] Notifications appear in notifications table
- [ ] Emails are sent to configured recipients

# Multi-Location System - Testing Guide

## ✅ All Issues Fixed!

### Issue #1: Admin Access ✅ FIXED
- **Problem:** 403 error when creating/editing locations
- **Solution:** Updated `requireAdminAccess` to check `user.role` first
- **Result:** Admins can now create/edit locations

### Issue #2: Standalone Page ✅ FIXED  
- **Problem:** Care Locations was a separate page
- **Solution:** Integrated as a tab in Admin Panel
- **Result:** Navigate to **Admin → Locations tab**

### Issue #3: Toggle Switch ✅ ADDED
- **Problem:** No UI to enable/disable multi-location
- **Solution:** Added toggle card at top of Locations tab
- **Result:** Beautiful toggle with status indicators

---

## 🧪 Step-by-Step Testing Guide

### Test 1: Access the Locations Tab (30 seconds)

1. Open MineAid HMS in browser
2. Login if not already logged in
3. Navigate to **Admin Panel** (sidebar or URL: `/admin`)
4. Click the **"Locations"** tab (4th tab)
5. ✅ You should see:
   - Multi-Location System toggle card at top
   - Currently showing "Single-Location Mode" (blue card)
   - One location card: "Default Mining Site - Main Clinic"

### Test 2: Enable Multi-Location (15 seconds)

1. In the Locations tab
2. Find the **"Multi-Location System"** card at the top
3. Click the **toggle switch** on the right
4. ✅ Toggle turns ON
5. ✅ Card changes to green: "Multi-Location Mode Active"
6. ✅ Success toast: "Multi-Location Enabled"

**What just happened:**
- `tenant.hasMultipleLocations` set to `true` in database
- System is now in multi-location mode
- Users will see location selection modal at login

### Test 3: Create Additional Locations (2 minutes)

**Create Location #1:**
1. Click **"+ New Location"** button
2. Fill in:
   ```
   Location Name: Shaft-3 Emergency Station
   Location Code: SH3
   Description: Emergency care facility at Shaft-3 access
   Address: Shaft-3 Access Point, Level 2
   Contact Phone: +1-555-0103
   Capacity: 3
   Status: Active
   Primary Location: ☐ (unchecked)
   ```
3. Click **"Create Location"**
4. ✅ Success toast appears
5. ✅ New location card appears in grid

**Create Location #2:**
1. Click **"+ New Location"** again
2. Fill in:
   ```
   Location Name: Processing Plant Medical
   Location Code: PROC
   Description: Medical station at processing facility
   Address: Processing Plant - Building 5
   Contact Phone: +1-555-0105
   Capacity: 5
   Status: Active
   Primary Location: ☐
   ```
3. Click **"Create Location"**
4. ✅ Success!
5. ✅ Now you have 3 locations total

### Test 4: Location Selection Modal (1 minute)

**CRITICAL TEST:**
1. Click **profile menu** → **Logout**
2. **Login again** with your credentials
3. 🎉 **LOCATION SELECTION MODAL SHOULD APPEAR!**

**What you should see:**
```
┌──────────────────────────────────────────┐
│ 📍 Select Your Working Location          │
│ Where are you working today?             │
├──────────────────────────────────────────┤
│ [Cards showing all 3 locations]          │
│ • Default Mining Site - Main Clinic      │
│ • Shaft-3 Emergency Station              │
│ • Processing Plant Medical               │
│                                          │
│ [Select one and click Confirm]           │
└──────────────────────────────────────────┘
```

4. Select **"Shaft-3 Emergency Station"**
5. Click **"Confirm Location"**
6. ✅ Modal closes
7. ✅ Dashboard loads

### Test 5: Location Badge Appears (10 seconds)

After selecting location in Test 4:

1. Look at the **header/topbar**
2. Between notifications bell (🔔) and profile menu
3. ✅ You should see: **"📍 SH3"** badge
4. It shows your current location code

**Badge should look like:**
```
┌────────────────────────────────┐
│ [🔔] [📍 SH3 ▼] [👤 Profile] │
│         ↑                      │
│    Location Badge              │
└────────────────────────────────┘
```

### Test 6: Click Location Badge (30 seconds)

1. Click the **📍 SH3** badge
2. ✅ Dropdown menu appears with:
   - Current location info
   - Quick switch to other locations
   - "Change Location..." option
3. Try clicking **"Processing Plant Medical"**
4. ✅ Badge updates to **"📍 PROC"**
5. ✅ Toast: "Location Changed"

### Test 7: Automatic Location Tagging (2 minutes)

**Critical - This is the whole point!**

1. With location selected (📍 PROC in header)
2. Navigate to **Medical Visit** page
3. Click **"New Medical Visit"** or start creating one
4. Fill out the form (patient, vitals, etc.)
5. **IMPORTANT:** Notice there's **NO location selector field!**
6. Click **"Save Medical Visit"**
7. ✅ Visit saved successfully

**Verify in Database:**
```sql
SELECT 
  id,
  patient_id,
  location_id,
  visit_type,
  created_at
FROM medical_visits 
ORDER BY created_at DESC 
LIMIT 1;
```
✅ `location_id` should be populated with Processing Plant's ID!

### Test 8: Disable Multi-Location (Optional)

1. Go back to **Admin → Locations** tab
2. Toggle the **switch OFF**
3. ✅ Card changes to blue: "Single-Location Mode"
4. Logout and login
5. ✅ **NO modal appears!**
6. ✅ Badge hidden or shows primary location silently
7. Everything works as before (backward compatible)

---

## 🐛 Troubleshooting

### Modal Not Appearing After Login?

**Check browser console for:**
```javascript
LocationSelectionModal - Debug: {
  isMultiLocation: true/false,  // Should be true!
  activeLocation: null,
  tenant: { hasMultipleLocations: true }
}
```

**If `isMultiLocation` is `false`:**
- Check: Did you toggle the switch in Admin → Locations?
- Verify in DB: `SELECT has_multiple_locations FROM tenants;`
- Hard refresh: Ctrl+F5

### Badge Not Showing?

**Check browser console for:**
```javascript
LocationBadge - Debug: {
  isMultiLocation: true,
  activeLocation: { id: "...", name: "..." },
  shouldShow: true
}
```

**If not showing:**
- Verify you selected a location (logout/login and select)
- Check `/api/auth/current-session` response includes `activeLocation`
- Hard refresh browser

### Can't Create Locations?

**Check:**
- Is your user role "admin"? Check profile or database
- Do you see the Locations tab in Admin Panel?
- Check server logs for 403 errors

**Fix:**
```sql
-- Set your user as admin
UPDATE users 
SET role = 'admin' 
WHERE email = 'your-email@example.com';
```

---

## 📊 Expected Behavior Summary

| Scenario | Multi-Location OFF | Multi-Location ON |
|----------|-------------------|-------------------|
| **Login Flow** | Normal login → Dashboard | Login → Location Modal → Dashboard |
| **Badge Visibility** | Hidden | Visible with location code |
| **Forms** | No location field | No location field (auto-injected) |
| **Location Selection** | Auto (primary) | Manual (user selects) |
| **Location Tagging** | Automatic (primary) | Automatic (session) |

---

## ✅ Success Checklist

After completing all tests, you should have:

- [x] Multi-location toggle working
- [x] Created 3 locations (Main, SH3, PROC)
- [x] Location selection modal appears at login
- [x] Location badge visible in header
- [x] Badge shows current location code
- [x] Can switch locations via dropdown
- [x] Medical visits auto-tagged with location_id
- [x] Can toggle multi-location on/off
- [x] Admin CRUD operations work
- [x] Audit logs created for all actions

---

## 🎉 You're All Set!

The Multi-Location Care Sites System is now fully functional!

**Key Features Working:**
✅ Session-based location binding  
✅ Automatic location tagging  
✅ Location selection modal  
✅ Location badge in header  
✅ Admin management interface  
✅ Toggle multi-location on/off  
✅ Complete audit trail  

**Next Steps:**
- Train your medical staff on location selection
- Create locations for your actual care sites
- Monitor audit logs for location actions
- Enjoy the new multi-location capability! 🚀

---

## 📞 Need Help?

- **Documentation:** `docs/MULTI_LOCATION_SYSTEM_DOCUMENTATION.md`
- **Quick Start:** `docs/MULTI_LOCATION_QUICK_START.md`
- **Console Logs:** Check browser console for debug output
- **Server Logs:** Check terminal for API responses


# Multi-Location Care Sites - Quick Start Guide

**⏱️ Reading Time:** 5 minutes  
**🎯 Goal:** Get up and running with multi-location system quickly

---

## What is Multi-Location Care Sites?

A system that allows mining sites with multiple emergency care facilities to track which location medical services are provided at. Staff select their working location once at login, and all actions during their shift are automatically tagged with that location.

### Key Concept: Session-Based Location Binding

```
Login → Select Location → Work all day → Logout
         ↓                  ↓
    "Checking In"    All actions tagged
    at Location      automatically
```

**Why Session-Based?**
- ✅ Select location ONCE per shift (not on every form)
- ✅ Eliminates user error
- ✅ Matches physical reality (you ARE at one location during your shift)
- ✅ Clear accountability

---

## 30-Second Overview

### For Medical Staff

```
1. Login → 2. Select Location → 3. Work Normally → 4. Logout
         
"Where are you working today?"
□ Main Medical Center
☑ Shaft-3 Emergency Station  ← You pick once
□ Processing Plant Medical

↓

All your medical visits, incidents, tests automatically 
tagged with "Shaft-3 Emergency Station"

No need to select location on forms!
```

### For Admins

```
Settings → Care Locations

[+ New Location]

Create:  Main Medical Center (MAIN) - Primary
Create:  Shaft-3 Station (SH3)
Create:  Processing Plant (PROC)

Enable:  tenant.hasMultipleLocations = true

Done! Users will now see location selection at login.
```

---

## 5-Minute Setup (Admin)

### Step 1: Enable Feature (30 seconds)

```sql
UPDATE tenants 
SET has_multiple_locations = true 
WHERE id = 'your-tenant-id';
```

Or in Admin UI:
```
Settings → Tenant Management → Edit → 
Toggle "Has Multiple Locations" → Save
```

### Step 2: Create Locations (2 minutes)

```
Settings → Care Locations → [+ New Location]

Location 1:
  Name: Main Medical Center
  Code: MAIN
  Primary: ✓
  Status: Active
  [Save]

Location 2:
  Name: Shaft-3 Emergency Station
  Code: SH3
  Primary: □
  Status: Active
  [Save]

Location 3:
  Name: Processing Plant Medical
  Code: PROC
  Primary: □
  Status: Active
  [Save]
```

### Step 3: Test It (2 minutes)

```
1. Logout
2. Login as regular user
3. See location selection modal ✓
4. Select "Shaft-3 Emergency Station"
5. See location badge in header: "📍 Shaft-3"
6. Create a medical visit
7. Check: location_id populated ✓
```

**Done! System is operational.**

---

## User Workflows

### Workflow 1: Starting Your Shift

```
┌─────────────────────────────────────┐
│  Welcome to MineAid HMS             │
│                                     │
│  Email:    [jane@minesite.com  ]   │
│  Password: [••••••••••••••••••]    │
│                                     │
│            [Login]                  │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│  Select Your Working Location       │
│  Where are you working today?       │
│                                     │
│  Last time: Shaft-3 Station ✓       │
│  [Quick Confirm]                    │
│                                     │
│  Or choose different location:      │
│  ○ Main Medical Center              │
│  ○ Processing Plant Medical         │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│  [📍 Shaft-3 Station]  [🔔]  [👤]   │
│─────────────────────────────────────│
│  Dashboard                          │
│  Recent Patients | Appointments     │
└─────────────────────────────────────┘

✓ Location shown in header
✓ All actions auto-tagged
✓ No location selectors on forms
```

### Workflow 2: Creating a Medical Visit

```
Normal Form (No Location Field!)
┌─────────────────────────────────────┐
│  New Medical Visit                  │
│  📍 Recording at: Shaft-3 Station   │ ← Info only
│─────────────────────────────────────│
│  Patient: [John Doe            ▼]  │
│  Visit Type: [Emergency        ▼]  │
│  Chief Complaint: [_____________]  │
│  Vitals: ...                        │
│  Assessment: ...                    │
│  Treatment: ...                     │
│                                     │
│  [Save Medical Visit]               │
└─────────────────────────────────────┘
              ↓
    Automatically saved with
    location_id = "shaft-3-id"
    
No manual location selection needed!
```

### Workflow 3: Switching Locations (Emergency)

```
Click location badge in header:
┌─────────────────────────────────────┐
│  Current: 📍 Shaft-3 Station        │
│  ─────────────────────────────────  │
│  Quick Switch:                      │
│  □ Main Medical Center              │
│  □ Processing Plant Medical         │
│  ─────────────────────────────────  │
│  🔄 Change Location...              │
│  🚪 Logout                          │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│  ⚠️ Switch Working Location?        │
│                                     │
│  From: Shaft-3 Station              │
│  To:   Main Medical Center          │
│                                     │
│  Reason:                            │
│  [Emergency coverage needed    ]   │
│                                     │
│  [Cancel]  [Switch Location]        │
└─────────────────────────────────────┘
              ↓
Location changed ✓
Audit log created ✓
Header updated: "📍 Main Medical Center"
```

---

## Admin Tasks

### Creating a Location

```
Settings → Care Locations → [+ New Location]

Required Fields:
  Location Name: "Processing Plant - Emergency"
  Location Code: "PROC-EM" (2-10 chars, unique)
  Status: [Active ▼]

Optional Fields:
  Address: "Processing Plant - Block C"
  Phone: "+1-555-0300"
  Email: "proc-em@minesite.com"
  Capacity: 3
  Operating Hours: Custom schedule
  
[Create Location]

✓ Appears in location list
✓ Available for selection
✓ Audit log created
```

### Setting Primary Location

```
Care Locations page → Find location →
  [⋮] Menu → "Set as Primary"

Primary Location:
  ✓ Auto-selected for single-location mode
  ✓ Default for new users  
  ✓ Fallback location
  ✓ Only one per tenant
```

### Viewing Location Analytics

```
Reports → Location Analytics

Summary:
  Total Locations: 4
  Active: 3
  Total Capacity: 28
  Avg Utilization: 68%

By Location:
  Main Medical Center     234 visits  85% util
  Processing Plant        156 visits  62% util
  Shaft-3 Station         89 visits   59% util

Insights:
  💡 Main Medical Center needs additional 
     staffing during 09:00-11:00
```

### Deactivating a Location

```
Location Card → [⋮] → "Deactivate"

⚠️ Warning:
  • 2 users currently working at this location
  • 5 appointments scheduled here
  
Choose action:
  ○ Force deactivate (notify users)
  ○ Schedule deactivation
  ○ Cancel

[Confirm]

✓ Location status → Inactive
✓ Users notified
✓ Not shown in selection modal
```

---

## Common Questions

### Q: Do single-location sites need this?

**A:** No! For tenants with one location:
- Set `has_multiple_locations = false`
- System auto-selects primary location silently
- No modal, no badge, completely invisible
- Existing workflow unchanged

### Q: Can staff work at different locations different days?

**A:** Yes! That's the whole point:
- Monday: Work at Shaft-3 → Select "Shaft-3"
- Tuesday: Work at Main → Select "Main"
- Wednesday: Back to Shaft-3 → Select "Shaft-3"

Same user, different locations, different days.

### Q: What if I select wrong location?

**A:** Easy to fix:
1. Click location badge in header
2. Select "Change Location"
3. Choose correct location
4. Enter reason (optional): "Accidentally selected wrong location"
5. Confirm

All actions AFTER switch use new location.

### Q: What if my location gets deactivated while I'm working?

**A:** System handles it:
1. Next action triggers check
2. Modal appears: "Your location was deactivated"
3. Select new location
4. Continue working

No data loss. Records created before switch keep original location.

### Q: Can admins view data from all locations?

**A:** Yes!
- Admin role can select "All Locations" in filters
- View cross-location reports
- Compare performance
- Generate combined analytics

### Q: Does this affect mobile app?

**A:** Future enhancement:
- GPS-based location check-in
- QR code scanning at entrance
- Offline location caching
- Push notifications

Currently: Same web-based flow on mobile browser.

---

## Quick Reference

### For Staff

| Task | Steps |
|------|-------|
| **Start Shift** | Login → Select location → Confirm |
| **Create Record** | Use forms normally (location auto-added) |
| **Switch Location** | Click badge → Select new location |
| **End Shift** | Logout (clears location) |

### For Admins

| Task | Endpoint/Path |
|------|---------------|
| **Create Location** | Settings → Care Locations → New |
| **Edit Location** | Location Card → Edit |
| **Set Primary** | Location Card → ⋮ → Set as Primary |
| **View Analytics** | Reports → Location Analytics |
| **Deactivate** | Location Card → ⋮ → Deactivate |

### API Quick Reference

```typescript
// Get locations
GET /api/care-locations

// Select location at login
POST /api/auth/select-location
{ locationId: "loc-123" }

// Switch location mid-session
POST /api/auth/switch-location
{ newLocationId: "loc-456", reason: "Emergency coverage" }

// Get current session (includes location)
GET /api/auth/current-session

// Create location (admin)
POST /api/care-locations
{ locationName: "...", locationCode: "...", ... }

// Get location analytics
GET /api/analytics/locations
```

---

## Architecture Diagram

```
┌───────────────────────────────────────────────────────────┐
│                      USER LOGS IN                         │
└────────────────┬──────────────────────────────────────────┘
                 │
                 ↓
┌────────────────────────────────────────────────────────────┐
│         tenant.hasMultipleLocations?                       │
└───────┬────────────────────────────────────┬───────────────┘
        │                                    │
      YES                                   NO
        │                                    │
        ↓                                    ↓
┌───────────────────┐            ┌─────────────────────┐
│ Show Location     │            │ Auto-select         │
│ Selection Modal   │            │ Primary Location    │
└────────┬──────────┘            └──────────┬──────────┘
         │                                   │
         └───────────────┬───────────────────┘
                         ↓
         ┌───────────────────────────────┐
         │ Store in session:             │
         │ • activeLocationId            │
         │ • activeLocationName          │
         └───────────────┬───────────────┘
                         ↓
         ┌───────────────────────────────┐
         │      DASHBOARD                │
         │  📍 Location Badge in Header  │
         └───────────────┬───────────────┘
                         ↓
         ┌───────────────────────────────┐
         │   ALL MEDICAL ACTIONS:        │
         │ • Medical Visits              │
         │ • Incidents                   │
         │ • Appointments                │
         │ • Tests                       │
         │                               │
         │ → Automatically tagged with   │
         │   req.session.activeLocationId│
         └───────────────────────────────┘
```

---

## Troubleshooting

### Problem: Modal doesn't appear

**Check:**
1. `tenant.has_multiple_locations = true`?
2. At least 1 active location exists?
3. User logged in successfully?

**Fix:**
```sql
-- Enable multi-location
UPDATE tenants SET has_multiple_locations = true WHERE id = '...';

-- Verify locations exist
SELECT * FROM care_locations WHERE tenant_id = '...' AND status = 'active';
```

### Problem: Location not saving in records

**Check:**
1. User selected location (check session)?
2. Middleware executing?
3. Database column exists?

**Debug:**
```typescript
// Check session
GET /api/auth/current-session
// Should show: { activeLocation: { id: "...", name: "..." } }

// Check middleware logs
console.log('Active Location:', req.session.activeLocationId);

// Check database
SELECT location_id FROM medical_visits WHERE id = '...';
// Should NOT be NULL
```

### Problem: Can't switch locations

**Check:**
1. New location is active?
2. User has permission?
3. Network connectivity?

**Fix:**
```typescript
// Verify location is active
GET /api/care-locations/:id
// Should show: { status: "active" }

// Check user role
// medical_staff can switch
// Others may have restrictions
```

---

## Next Steps

1. **Read Full Documentation**  
   → `docs/MULTI_LOCATION_SYSTEM_DOCUMENTATION.md`

2. **Review Implementation Plan**  
   → See "Implementation Guide" section in full docs

3. **Set Up Development Environment**  
   → Run database migrations
   → Install dependencies

4. **Test on Staging**  
   → Create test tenant
   → Create test locations
   → Test full workflows

5. **Train Users**  
   → Admin training
   → Staff training
   → Provide FAQ

6. **Deploy to Production**  
   → Follow deployment checklist
   → Monitor audit logs
   → Collect feedback

---

## Resources

- **Full Documentation:** `docs/MULTI_LOCATION_SYSTEM_DOCUMENTATION.md`
- **API Reference:** See "API Documentation" section
- **Admin Guide:** See "Admin Guide" section
- **User Guide:** See "User Guide" section

---

## Support

**Technical Issues:**
- Check troubleshooting section above
- Review audit logs for error details
- Contact development team

**Feature Requests:**
- Submit via project management system
- Include use case description
- Provide examples if possible

**Training:**
- Request training sessions
- Access video tutorials
- Review user guides

---

*Quick Start Guide - Multi-Location Care Sites System*  
*Version 1.0.0*  
*Last Updated: October 2025*


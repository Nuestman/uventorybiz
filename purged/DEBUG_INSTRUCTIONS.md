# Multi-Location System - Debug Instructions

## 🔍 All Debug Logging Is Now Active!

You now have comprehensive logging on both backend and frontend to diagnose exactly what's happening.

---

## 📊 What to Check

### Step 1: Open Browser DevTools

```
Press F12
Go to Console tab
Clear console (trash icon)
```

### Step 2: Toggle Multi-Location

```
1. Go to Admin → Locations tab
2. Click the toggle switch ON
3. Watch the console output below
```

---

## 🖥️ Expected Console Output

### Browser Console Should Show:

```javascript
// When you toggle:
Toggling multi-location: { tenantId: "fcb74af3-...", enabled: true }

// After server responds:
Toggle response text: {"id":"fcb74af3-...","hasMultipleLocations":true,...}

// After parsing:
Toggle response parsed: { id: "...", hasMultipleLocations: true }

// After success:
Toggle success, invalidating queries and refetching...

// Page reloads after 1 second
```

### Server Console (Terminal) Should Show:

```
PUT /api/tenants/:id - Request: {
  id: 'fcb74af3-5b2a-4421-8984-1766cf4a826f',
  body: { hasMultipleLocations: true },
  userTenantId: 'fcb74af3-5b2a-4421-8984-1766cf4a826f'
}

Original tenant hasMultipleLocations: false

Updated tenant hasMultipleLocations: true  ← Should be true!

Returning updated tenant: {
  "id": "fcb74af3-...",
  "name": "Default Mining Site",
  "hasMultipleLocations": true,  ← Should be true!
  ...
}
```

---

## 🧪 After Toggle - Check Session

After page reloads, the session hook will fetch fresh data.

### Browser Console Should Show:

```javascript
useActiveLocation - Session data: {
  user: { ... },
  tenant: {
    id: "fcb74af3-...",
    name: "Default Mining Site",
    hasMultipleLocations: true  ← CRITICAL! Should be true!
  },
  activeLocation: null,
  sessionStart: "..."
}

useActiveLocation - isMultiLocation: true  ← Should be true!
```

### Server Console Should Show:

```
Current session - user.tenantId: fcb74af3-5b2a-4421-8984-1766cf4a826f

Current session - tenant: {
  id: 'fcb74af3-5b2a-4421-8984-1766cf4a826f',
  hasMultipleLocations: true  ← Should be true!
}

Current session response: {
  "user": { ... },
  "tenant": {
    "id": "fcb74af3-...",
    "name": "Default Mining Site",
    "hasMultipleLocations": true  ← CRITICAL!
  },
  ...
}
```

---

## 🎯 What Each Log Means

### If You See:

**❌ `hasMultipleLocations: false` in "Updated tenant"**
→ **Problem:** Database update failed
→ **Check:** Run `SELECT has_multiple_locations FROM tenants;` in DB
→ **Fix:** Database issue - check Drizzle ORM update

**❌ `hasMultipleLocations: false` in "Current session - tenant"**
→ **Problem:** Database query returning old value
→ **Check:** Database directly
→ **Fix:** Clear query cache or restart server

**❌ `isMultiLocation: false` in browser console**
→ **Problem:** Frontend not receiving updated value
→ **Check:** Network tab - see actual response from `/api/auth/current-session`
→ **Fix:** Hard refresh browser (Ctrl+Shift+R)

**✅ `hasMultipleLocations: true` everywhere**
→ **Success!** Everything is working!
→ **Next:** Logout and login to see modal

---

## 🧪 Testing Workflow with Logs

### Test 1: Toggle and Watch Logs

```
1. Admin → Locations tab
2. Open browser console
3. Open server terminal
4. Click toggle ON
5. READ THE LOGS (both places)
6. Page reloads
```

**What to Verify:**
- [ ] Browser shows "Toggle response parsed: { hasMultipleLocations: true }"
- [ ] Server shows "Updated tenant hasMultipleLocations: true"
- [ ] After reload, browser shows "isMultiLocation: true"
- [ ] Server shows tenant with hasMultipleLocations: true

### Test 2: Logout and Login

```
1. After toggle is ON
2. Logout
3. Login
4. Watch browser console
```

**Should See:**
```javascript
useActiveLocation - Session data: { tenant: { hasMultipleLocations: true }, ... }
useActiveLocation - isMultiLocation: true

LocationSelectionModal - Debug: {
  isMultiLocation: true,  ← YES!
  activeLocation: null,
  tenant: { hasMultipleLocations: true },
  shouldShowModal: true  ← YES!
}
```

**If Modal Appears:**
✅ Everything working!

**If Modal Doesn't Appear:**
❌ Check console - what does it say?
- If `isMultiLocation: false` → Session not updated, check server logs
- If `shouldShowModal: false` → activeLocation exists or not multi-location

### Test 3: Select Location and Watch Badge

```
1. Select a location in modal
2. Confirm
3. Watch console
```

**Should See:**
```javascript
// After confirming:
Location Set (toast)

// Hook refetches:
useActiveLocation - Session data: {
  tenant: { hasMultipleLocations: true },
  activeLocation: {
    id: "...",
    name: "Shaft-3 Emergency Station",
    code: "SH3"
  }
}

// Badge checks:
LocationBadge - Debug: {
  isMultiLocation: true,
  activeLocation: { id: "...", name: "...", code: "SH3" },
  tenant: { hasMultipleLocations: true },
  shouldShow: true  ← Should be true!
}
```

**If Badge Appears:**
✅ Success! You should see: 📍 SH3

**If Badge Doesn't Appear:**
❌ Check `shouldShow` value in console
- If `null` → Something wrong with logic
- If `false` → Check isMultiLocation and activeLocation values

---

## 🐛 Common Issues & Solutions

### Issue: `hasMultipleLocations` is `false` even after toggle

**Check in Database:**
```sql
SELECT id, name, has_multiple_locations 
FROM tenants 
WHERE id = 'fcb74af3-5b2a-4421-8984-1766cf4a826f';
```

**If Database Shows `false`:**
→ Update didn't work
→ Check server logs for errors
→ Try manual SQL: `UPDATE tenants SET has_multiple_locations = true WHERE id = '...';`

**If Database Shows `true`:**
→ Query is returning old data
→ Restart server
→ Hard refresh browser

### Issue: JSON Parse Error

**Check Network Tab:**
1. DevTools → Network tab
2. Find `PUT /api/tenants/...`
3. Click on it
4. Go to Response tab
5. See what's actually returned

**If Response is Empty:**
→ Server returned no body
→ Check server code - should call `res.json(updatedTenant)`

**If Response is Text (not JSON):**
→ Server returned plain text
→ Check server errors

### Issue: Modal Still Not Appearing

**Checklist:**
```javascript
// In browser console, look for:
useActiveLocation - isMultiLocation: ???

// Must be TRUE for modal to show
// If FALSE, check:
1. Did toggle actually update DB?
2. Did session endpoint return updated tenant?
3. Is browser cache cleared?
```

---

## 📝 Quick Diagnostic

**Copy and paste this in browser console:**

```javascript
// Check current state
fetch('/api/auth/current-session', { credentials: 'include' })
  .then(r => r.json())
  .then(data => {
    console.log('===== SESSION CHECK =====');
    console.log('Tenant:', data.tenant);
    console.log('hasMultipleLocations:', data.tenant?.hasMultipleLocations);
    console.log('Is Multi-Location:', data.tenant?.hasMultipleLocations === true);
    console.log('========================');
  });
```

This will show you EXACTLY what the session endpoint is returning!

---

## ✅ Success Criteria

**You'll know it's working when you see:**

### 1. Toggle Works:
```javascript
// Browser:
Toggle response parsed: { hasMultipleLocations: true }

// Server:
Updated tenant hasMultipleLocations: true
```

### 2. Session Updates:
```javascript
// Browser:
useActiveLocation - isMultiLocation: true

// Server:
Current session - tenant: { hasMultipleLocations: true }
```

### 3. Modal Appears:
```javascript
LocationSelectionModal - Debug: {
  isMultiLocation: true,
  shouldShowModal: true
}
// And actual modal visible on screen!
```

### 4. Badge Shows:
```javascript
LocationBadge - Debug: {
  isMultiLocation: true,
  activeLocation: { code: "SH3" },
  shouldShow: true
}
// And 📍 SH3 visible in header!
```

---

## 🚀 Next Steps

1. **Refresh browser** (Ctrl+Shift+R)
2. **Toggle the switch**
3. **Watch BOTH consoles** (browser + server)
4. **Copy the logs** and share if still having issues
5. The logs will tell us exactly what's wrong!

The comprehensive logging will help us pinpoint the exact issue. Try it now and check what the logs say! 🔍


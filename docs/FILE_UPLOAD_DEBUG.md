# File Upload Debugging Guide

## 🔍 Debug Logs Added

Comprehensive logging has been added to both frontend and backend to diagnose the upload failure.

---

## 🧪 Test and Check Logs

### Step 1: Try Uploading a File

1. Open **Incidents** page
2. Click **"Report Incident"**
3. Fill required fields (patient, incident location, etc.)
4. Click on file input → Select 1 small image file (< 1MB)
5. Watch both **Browser Console** and **Terminal**

---

## 📊 What to Check

### Frontend Console (Browser)

Should see:
```
=== FRONTEND FILE UPLOAD ===
Files to upload: 1
File details: [{ name: "photo.jpg", size: 123456, type: "image/jpeg" }]
Appending file: photo.jpg 123456 image/jpeg
Sending upload request to /api/incident-uploads
Upload response status: 200
Upload response ok: true
Upload response data: { files: [...] }
```

**If you see error:**
```
Upload response status: 404
// → Endpoint not found, server needs restart

Upload response status: 500
Upload failed response: [error message]
// → Check terminal for backend error
```

---

### Backend Terminal

Should see:
```
=== INCIDENT UPLOAD ENDPOINT HIT ===
User: a6157a28-d355-4e0e-b9b0-19574608f6c2
Request body keys: []
Request files: undefined

=== AFTER MULTER PROCESSING ===
req.files: [
  {
    fieldname: 'files',
    originalname: 'photo.jpg',
    filename: 'incident-1728567890-123-photo.jpg',
    path: 'public/incident-documents/incident-1728567890-123-photo.jpg',
    size: 123456
  }
]
Files count: 1

=== INCIDENT FILES UPLOADED SUCCESSFULLY ===
Files: ['/public/incident-documents/incident-1728567890-123-photo.jpg']
```

**If you see:**
```
No files received
// → Multer didn't process files correctly

Error uploading incident files: [error message]
// → Check error details in terminal
```

---

## 🚨 Common Issues

### Issue 1: 404 Not Found
**Symptom:** `Upload response status: 404`

**Cause:** Endpoint not registered (server needs restart)

**Fix:**
```bash
# Restart the server
npm run dev
```

### Issue 2: Directory Permission Error
**Symptom:** Terminal shows "EACCES: permission denied"

**Cause:** No write permission to `public/incident-documents/`

**Fix:**
```bash
# Check directory exists
ls public/incident-documents

# If not, create it
mkdir -p public/incident-documents
```

### Issue 3: Multer Not Processing Files
**Symptom:** `req.files: undefined` in terminal

**Cause:** Multer middleware not configured correctly

**Check:**
- Is `incidentUpload` defined?
- Is middleware applied to route?
- Is `files` fieldname correct in FormData?

### Issue 4: File Too Large
**Symptom:** "File too large" or 413 error

**Cause:** File exceeds 10MB limit

**Fix:** Either reduce file size or increase limit in backend

### Issue 5: Invalid File Type
**Symptom:** "Invalid file type" error

**Cause:** File type not in allowed list

**Allowed:**
- Images: JPEG, PNG, GIF, WebP
- Documents: PDF, DOC, DOCX

---

## 🔧 Quick Checks

### Check 1: Is Directory Created?
```powershell
Test-Path public\incident-documents
```

**Expected:** True

### Check 2: Can Write to Directory?
```powershell
echo "test" > public\incident-documents\test.txt
```

**Expected:** File created

### Check 3: Is Server Running?
Check terminal for:
```
> dev
> server
[timestamp] [express] server started on port 5000
```

**Expected:** Server active

### Check 4: Is Endpoint Registered?
Look for this in server startup logs:
```
POST /api/incident-uploads
```

Or search routes.ts for `app.post('/api/incident-uploads'`

---

## 📝 What to Share

### 1. Browser Console Output
Copy everything from:
```
=== FRONTEND FILE UPLOAD ===
```
through the error or success message.

### 2. Terminal Output
Copy everything from:
```
=== INCIDENT UPLOAD ENDPOINT HIT ===
```
through the success or error message.

### 3. Error Toast Message
What exact message appeared in the red error toast?

### 4. Network Tab
- Open DevTools → Network
- Try upload
- Check if `/api/incident-uploads` request appears
- What's the status code?
- What's the response?

---

## 🎯 Quick Test

### Minimal Test:
1. Select ONE small image file (< 1MB)
2. Watch console
3. Share what you see

---

## 🔍 Expected vs Actual

### Expected Flow:
```
1. User selects file ✓
2. Frontend: Creates FormData ✓
3. Frontend: Sends POST to /api/incident-uploads
4. Backend: Auth middleware validates user
5. Backend: Multer processes files
6. Backend: Files saved to public/incident-documents/
7. Backend: Returns file paths
8. Frontend: Receives paths
9. Frontend: Updates form field
10. Frontend: Shows success toast ✓
```

### Where is it Failing?
Check logs to identify which step fails!

---

**Date:** October 10, 2025  
**Status:** 🔍 DEBUGGING  
**Action:** Please try uploading and share console/terminal output


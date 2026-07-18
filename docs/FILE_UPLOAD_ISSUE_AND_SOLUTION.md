# File Upload Issue - Incident Reports

## 🚨 Current Issue

**Problem:** When uploading files in incident reports, only the filename is saved to the database, but the actual file is not stored anywhere in the project directory.

**Current Behavior:**
- Database: `incident_uploads` field stores "photo.jpg, document.pdf"
- File system: Files not actually saved anywhere
- Result: Cannot retrieve or view uploaded documents

---

## 🔍 Current Implementation

### Frontend (`IncidentModal.tsx` - Lines 627-631):
```typescript
onChange={(e) => {
  // For now, just store the file names
  const files = Array.from(e.target.files || []);
  field.onChange(files.map(f => f.name).join(', '));
}}
```

**Issue:** Only extracts filenames, doesn't upload files to server.

---

## ✅ SOLUTION OPTIONS

### Option 1: Implement Full File Upload (Recommended for Production)

**What's Needed:**
1. Create upload directory for incidents
2. Configure multer for incident documents
3. Create upload endpoint
4. Update form to upload files
5. Store file paths in database
6. Add file viewing/download functionality

**Pros:**
- Complete solution
- Files stored securely
- Can view/download later
- Audit trail of documents

**Cons:**
- More complex implementation
- Need file management
- Storage considerations

### Option 2: Make Field Optional (Quick Fix)

**What's Needed:**
1. Make `incidentUploads` optional in schema
2. Add note in UI that file upload is pending
3. Remove file input or disable it

**Pros:**
- Quick fix
- No broken functionality
- Clear to users

**Cons:**
- Missing feature
- May be required for compliance

### Option 3: External Storage Integration

Use cloud storage (S3, Cloudinary, etc.) instead of local storage.

**Pros:**
- Scalable
- Better for production
- CDN benefits

**Cons:**
- Requires external service
- Additional configuration
- Costs

---

## 🚀 Implementation Plan (Option 1)

### Step 1: Create Upload Directory
```bash
mkdir -p public/incident-uploads
```

### Step 2: Configure Multer for Incidents
```typescript
// server/routes.ts
const incidentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/incident-uploads');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `incident-${uniqueSuffix}-${file.originalname}`);
  }
});

const incidentUpload = multer({ 
  storage: incidentStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});
```

### Step 3: Create Upload Endpoint
```typescript
app.post('/api/incident-uploads', 
  hybridAuthMiddleware, 
  incidentUpload.array('files', 5),  // Max 5 files
  async (req: any, res) => {
    try {
      const files = req.files as Express.Multer.File[];
      const filePaths = files.map(f => `/public/incident-uploads/${f.filename}`);
      res.json({ files: filePaths });
    } catch (error) {
      console.error('Error uploading incident files:', error);
      res.status(500).json({ message: 'Failed to upload files' });
    }
  }
);
```

### Step 4: Update Frontend Form
```typescript
const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);

const handleFileUpload = async (files: FileList) => {
  const formData = new FormData();
  Array.from(files).forEach(file => {
    formData.append('files', file);
  });

  try {
    const response = await fetch('/api/incident-uploads', {
      method: 'POST',
      body: formData,
      credentials: 'include'
    });
    
    const data = await response.json();
    setUploadedFiles(data.files);
    form.setValue('incidentUploads', data.files.join(','));
  } catch (error) {
    toast({
      title: "Upload Failed",
      description: "Failed to upload files",
      variant: "destructive"
    });
  }
};
```

### Step 5: Display Uploaded Files
```typescript
{incident.incidentUploads && (
  <div>
    <h4>Uploaded Documents</h4>
    {incident.incidentUploads.split(',').map(file => (
      <a href={file} target="_blank" rel="noopener noreferrer">
        View {file.split('/').pop()}
      </a>
    ))}
  </div>
)}
```

---

## 📋 Immediate Action Items

### For Now (Temporary):
1. Make upload field optional
2. Add note: "File upload feature coming soon"
3. Or remove file input entirely

### For Production:
1. Implement full file upload as described above
2. Add file size limits
3. Add file type validation
4. Add file viewing interface
5. Consider security (virus scanning, etc.)

---

## 💡 Recommendation

**Short-term:** Make the field optional with a note that file upload is pending implementation.

**Medium-term:** Implement local file storage as outlined above.

**Long-term:** Migrate to cloud storage (S3/Cloudinary) for scalability.

---

## 🎯 Quick Fix (Make Optional)

### Update Schema:
```typescript
// shared/schema.ts
incidentUploads: text("incident_uploads"), // Already optional
```

### Update Form UI:
```tsx
<FormItem>
  <FormLabel>Incident Documentation (Optional - Coming Soon)</FormLabel>
  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center bg-gray-50">
    <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
    <p className="text-sm text-gray-600 mb-2">
      File upload feature under development
    </p>
    <p className="text-xs text-gray-500">
      For now, please email documents to your administrator
    </p>
  </div>
</FormItem>
```

---

## ✅ Status

**Current State:** File upload UI exists but doesn't actually upload files

**Immediate Fix Needed:** Make field optional or implement full upload

**Recommendation:** Implement full file upload system for production readiness

---

**Date:** October 10, 2025  
**Issue:** File uploads not actually storing files  
**Priority:** Medium (feature gap)  
**Complexity:** Medium (requires proper file handling)


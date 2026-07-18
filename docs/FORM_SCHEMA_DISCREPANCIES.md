# Form vs Database Schema - Comprehensive Analysis

## 🔍 Medical Visits

### Database Schema (`medical_visits` table):
```
Required Fields:
- patientId
- medicalStaffId
- visitDate
- visitType
- chiefComplaint
- disposition

Optional Fields:
- locationId ← NEW
- historyOfPresentIllness
- bloodPressureSystolic
- bloodPressureDiastolic
- heartRate
- temperature
- respiratoryRate
- oxygenSaturation
- glucoseLevel
- painScore
- weight
- height
- physicalExamination
- assessment
- treatment
- medications
- procedures
- workRestrictions
- followUpDate
- followUpInstructions
- notes
- status
```

### CREATE Form (`MedicalVisit.tsx`):
**HAS:**
- ✅ patientId
- ✅ visitDate
- ✅ visitType
- ✅ chiefComplaint
- ✅ historyOfPresentIllness
- ✅ bloodPressureSystolic
- ✅ bloodPressureDiastolic
- ✅ heartRate
- ✅ temperature
- ✅ respiratoryRate
- ✅ oxygenSaturation
- ✅ glucoseLevel
- ✅ painScore
- ✅ weight
- ✅ height
- ✅ physicalExamination
- ✅ assessment
- ✅ treatment
- ✅ medications
- ✅ procedures
- ✅ disposition
- ✅ workRestrictions
- ✅ followUpDate
- ✅ followUpInstructions

**MISSING:**
- ❌ locationId (auto-injected by middleware)
- ❌ notes
- ❌ status

### EDIT Form (`Records.tsx` & `PatientDetails.tsx`):
**HAS:**
- ✅ visitType
- ✅ visitDate
- ✅ locationId ← NEW (manually added)
- ❌ chiefComplaint ← Shows as "symptoms" label in edit
- ❌ symptoms ← NOT IN DB! Should be chiefComplaint
- ✅ bloodPressureSystolic
- ✅ bloodPressureDiastolic
- ✅ heartRate
- ✅ temperature
- ✅ respiratoryRate
- ✅ oxygenSaturation
- ✅ glucoseLevel
- ✅ painScore
- ✅ physicalExamination
- ✅ assessment
- ❌ treatmentPlan ← NOT IN DB! Should be "treatment"
- ✅ medications
- ❌ workDisposition ← NOT IN DB! Should be "disposition"
- ✅ workRestrictions
- ✅ followUpInstructions
- ✅ followUpDate
- ✅ status

**MISSING:**
- ❌ historyOfPresentIllness
- ❌ weight
- ❌ height
- ❌ procedures
- ❌ notes

### 🚨 CRITICAL DISCREPANCIES:

| Edit Form Field | Database Field | Issue |
|-----------------|----------------|-------|
| `symptoms` | `chiefComplaint` | WRONG FIELD NAME |
| `treatmentPlan` | `treatment` | WRONG FIELD NAME |
| `workDisposition` | `disposition` | WRONG FIELD NAME |

**These mismatches cause the edit form to:**
1. Save data to non-existent columns → silently ignored
2. Not load existing data properly
3. Create confusion between create/edit forms

---

## 🔍 Incident Reports

### Database Schema (`incident_reports` table):
```
Required Fields:
- patientId
- reportedById
- incidentDate
- incidentLocation (WHERE it happened)
- jobTitle
- incidentType
- description
- severity

Optional Fields:
- locationId ← NEW (care location)
- reportedToFapDate
- treatedOnSite
- detainedAtFap
- ambulanceUsed
- dispositionDateTime
- generalConditionAtDisposition
- reportedTo
- incidentUploads
- status
- actionsTaken
```

### Forms Status:
- Need to check incident report create/edit forms similarly

---

## 💥 Root Cause of Current Error

The edit form is sending:
```javascript
{
  symptoms: "headache",           // ❌ NOT IN DB
  treatmentPlan: "rest",          // ❌ NOT IN DB
  workDisposition: "return_to_work", // ❌ NOT IN DB
  visitDate: Date object,
  // ...
}
```

Database expects:
```javascript
{
  chiefComplaint: "headache",     // ✅ EXISTS
  treatment: "rest",              // ✅ EXISTS
  disposition: "return_to_work",  // ✅ EXISTS
  visitDate: Date object,
  // ...
}
```

**Result:** Database update fails because wrong field names!

---

## ✅ SOLUTION OPTIONS

### Option 1: Fix Field Names Only (Quick Fix)
Change edit form fields to match DB:
- `symptoms` → `chiefComplaint`
- `treatmentPlan` → `treatment`
- `workDisposition` → `disposition`

**Pros:** Quick, minimal changes
**Cons:** Edit/Create forms still don't match completely

### Option 2: Complete Form Overhaul (Recommended)
1. Make edit form match create form EXACTLY
2. Ensure both match database schema
3. Add missing fields to edit form:
   - historyOfPresentIllness
   - weight
   - height
   - procedures
   - notes

**Pros:** 
- Complete consistency
- All fields editable
- Future-proof

**Cons:** 
- More work
- Need to test thoroughly

### Option 3: Backend Mapping (Workaround)
Map field names in backend before saving:
```typescript
if (updateData.symptoms) {
  updateData.chiefComplaint = updateData.symptoms;
  delete updateData.symptoms;
}
```

**Pros:** No frontend changes
**Cons:** Technical debt, confusing

---

## 🎯 RECOMMENDATION

**Option 2 - Complete Form Overhaul**

Because:
1. Forms should match database schema exactly
2. Users expect edit to show everything from create
3. Current mismatch causes bugs
4. Better long-term maintainability

---

## 📋 Implementation Plan

### Step 1: Fix Critical Field Names (IMMEDIATE)
```typescript
// In edit forms, change:
- name="symptoms" → name="chiefComplaint"
- name="treatmentPlan" → name="treatment"  
- name="workDisposition" → name="disposition"
```

### Step 2: Add Missing Fields to Edit
- historyOfPresentIllness
- weight
- height
- procedures
- notes

### Step 3: Update Error Messages
Show actual error instead of generic "500"

### Step 4: Test Complete Flow
- Create medical visit
- Edit medical visit
- Verify all fields save/load correctly

### Step 5: Repeat for Incident Reports

---

## 🔥 IMMEDIATE ACTION NEEDED

**Fix these 3 field names in edit forms NOW:**
1. `symptoms` → `chiefComplaint`
2. `treatmentPlan` → `treatment`
3. `workDisposition` → `disposition`

This will fix the immediate 500 error!

---

**Date:** October 10, 2025  
**Status:** 🚨 CRITICAL - Field name mismatches causing save failures


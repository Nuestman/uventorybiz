# Patient Data Loading Debug Guide

## 🔍 Issue

Patient information section in view modal showing "Unknown" and "N/A" for:
- Name: Unknown Patient
- Employee Number: N/A
- Department: N/A
- Position: N/A
- Company: N/A

Only Visit Date is showing correctly.

---

## 🛠️ Debug Steps Added

### 1. Added Console Logging

Added comprehensive logging to `MedicalVisitDetailsModal.tsx`:

```typescript
console.log('=== MEDICAL VISIT DETAILS MODAL ===');
console.log('medicalVisit:', medicalVisit);
console.log('patientData:', patientData);
console.log('medicalVisit.patient:', medicalVisit.patient);
console.log('Final patient:', patient);
console.log('Final employee:', employee);
console.log('Final company:', company);
```

### 2. Fixed Query Key

**Before:**
```typescript
queryKey: ["/api/patients", medicalVisit.patientId]  // ❌ Wrong format
```

**After:**
```typescript
queryKey: [`/api/patients/${medicalVisit.patientId}`]  // ✅ Correct
```

### 3. Improved Data Structure Handling

```typescript
let patient, employee, company;

if (patientData) {
  // Data from /api/patients/:id endpoint
  patient = patientData.patient || patientData;
  employee = patientData.employee || patient?.employee;
  company = patientData.company || patient?.company;
} else if (medicalVisit.patient) {
  // Data already in medicalVisit from /api/medical-visits
  patient = medicalVisit.patient;
  employee = patient.employee;
  company = patient.company;
}
```

---

## 🧪 Testing Steps

### Step 1: Open Browser Console

1. Open DevTools (F12)
2. Go to Console tab
3. Clear console
4. Go to Records page
5. Click **View** on any medical visit

### Step 2: Check Console Output

Look for the debug output:

```javascript
=== MEDICAL VISIT DETAILS MODAL ===
medicalVisit: { ... }
patientData: { ... }
medicalVisit.patient: { ... }
Final patient: { ... }
Final employee: { ... }
Final company: { ... }
```

### Step 3: Analyze the Structure

**Check these specific properties:**

```javascript
// Should see something like:
medicalVisit: {
  id: "...",
  patientId: "...",
  patient: {
    id: "...",
    firstName: "...",  // ← Should have patient data
    employee: {
      employeeNumber: "...",  // ← Should have employee data
      department: "...",
      position: "...",
      firstName: "...",
      lastName: "..."
    },
    company: {
      name: "..."  // ← Should have company data
    }
  }
}
```

---

## 🔍 Expected Data Structures

### From `/api/medical-visits` (getAllMedicalVisitsWithPatients):

```typescript
{
  id: "visit-id",
  patientId: "patient-id",
  chiefComplaint: "...",
  // ... visit fields ...
  patient: {
    id: "patient-id",
    firstName: "John",
    lastName: "Doe",
    // ... patient fields ...
    employee: {
      id: "employee-id",
      employeeNumber: "EMP0001",
      department: "Mining",
      position: "Drill Operator",
      firstName: "John",
      lastName: "Doe"
    },
    company: {
      id: "company-id",
      name: "ABC Mining Co."
    }
  }
}
```

### From `/api/patients/:id`:

```typescript
{
  patient: {
    id: "patient-id",
    firstName: "John",
    lastName: "Doe",
    employeeId: "employee-id"
  },
  employee: {
    id: "employee-id",
    employeeNumber: "EMP0001",
    department: "Mining",
    position: "Drill Operator"
  },
  company: {
    id: "company-id",
    name: "ABC Mining Co."
  }
}
```

---

## 🚨 Possible Issues

### Issue 1: medicalVisit.patient is undefined

**Symptom:** Console shows `medicalVisit.patient: undefined`

**Cause:** The `/api/medical-visits` endpoint isn't including patient data

**Fix:** Check `server/storage.ts` - `getAllMedicalVisitsWithPatients` method

### Issue 2: Patient structure is flat

**Symptom:** Console shows patient but no nested employee/company

```javascript
patient: {
  id: "...",
  employeeId: "..." // ← Has employeeId but no employee object
}
```

**Cause:** Backend isn't joining employee/company tables

**Fix:** Check the SQL joins in `getAllMedicalVisitsWithPatients`

### Issue 3: Query not running

**Symptom:** Console shows `patientData: undefined` and `medicalVisit.patient: undefined`

**Cause:** Query might be disabled or failing

**Fix:** Check React Query DevTools or network tab

---

## 📊 What to Share

After opening the view modal and checking console, share these:

### 1. Console Output
```
Copy the entire console output from:
=== MEDICAL VISIT DETAILS MODAL ===
through
Final company: { ... }
```

### 2. Network Tab
- Check if `/api/patients/:id` request is being made
- Check what response it returns

### 3. medicalVisit Object
- Does it have a `patient` property?
- Does `patient` have `employee` and `company` nested?

---

## 🎯 Quick Checks

### Check 1: Is patient data in medicalVisit?
```javascript
console.log(medicalVisit.patient);
// Should show patient object with employee/company nested
```

### Check 2: Is employee data nested?
```javascript
console.log(medicalVisit.patient?.employee);
// Should show employee with employeeNumber, department, etc.
```

### Check 3: Is company data nested?
```javascript
console.log(medicalVisit.patient?.employee?.company || medicalVisit.patient?.company);
// Should show company with name
```

---

## 🔧 Temporary Fix (If Data is There)

If console shows data exists but isn't displaying, try:

```typescript
const employee = medicalVisit.patient?.employee || medicalVisit.employee || {};
const company = medicalVisit.patient?.company || medicalVisit.employee?.company || {};
```

---

## 📝 Next Steps

1. **Open view modal**
2. **Check browser console**
3. **Share the console output** (especially the data structures)
4. **Check if API request is made** (Network tab)
5. I'll fix based on actual data structure

---

**Date:** October 10, 2025  
**Status:** 🔍 DEBUGGING - Need console output to determine data structure


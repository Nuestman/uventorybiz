# Medical Visit Creation & Edit Fixes - Complete

## 🔧 Issues Fixed

### 1. Medical Visit Creation Failed (patient_id empty)
**Problem:** When creating a medical visit, `patient_id` was empty/null, causing foreign key constraint violation.

**Fix Applied:**
- Added validation in `onSubmit` to check if `patientId` exists before submission
- Added comprehensive debug logging to trace form data
- Added user-friendly error message if patient not selected

**File:** `client/src/pages/MedicalVisit.tsx`

```typescript
const onSubmit = (data: any) => {
  console.log('=== FORM SUBMISSION DATA ===');
  console.log('Raw form data:', data);
  console.log('patientId:', data.patientId);
  
  // Validate patientId
  if (!data.patientId) {
    toast({
      title: "Patient Required",
      description: "Please select a patient before submitting the form.",
      variant: "destructive",
    });
    return;
  }
  
  // ... rest of processing ...
}
```

### 2. Edit Modal Missing Most Fields
**Problem:** Edit modal only had 5 fields (chiefComplaint, physicalExamination, assessment, treatmentPlan, workDisposition). Missing:
- Visit type, date, status
- Vital signs (all 8 vital parameters)
- Symptoms
- Medications
- Work restrictions
- Follow-up instructions
- Follow-up date

**Fix Applied:** Complete rebuild of edit modal with ALL medical visit fields.

**File:** `client/src/pages/PatientDetails.tsx`

### 3. Location Injection Working Perfectly
**Status:** ✅ **CONFIRMED WORKING**

From terminal logs:
```
=== LOCATION INJECTION MIDDLEWARE ===
Session found: yes
Session activeLocationId: 1b23ae03-5f05-4ed8-96ef-9113147184a2
✅ INJECTING LOCATION: 1b23ae03-5f05-4ed8-96ef-9113147184a2
=== MEDICAL VISIT CREATION ===
req.body.locationId: 1b23ae03-5f05-4ed8-96ef-9113147184a2
```

Location is being injected correctly. The creation failure was due to missing `patient_id`, not location.

---

## 📋 New Edit Modal Fields

### Visit Information Section
- **Visit Type** (dropdown): routine, emergency, follow_up, injury, illness
- **Visit Date** (datetime-local): Full date and time picker
- **Chief Complaint** (textarea)
- **Symptoms** (textarea)

### Vital Signs Section
All fields with appropriate placeholders and units:
- **BP Systolic** (number) - mmHg
- **BP Diastolic** (number) - mmHg
- **Heart Rate** (number) - bpm
- **Temperature** (text) - °F
- **Respiratory Rate** (number) - breaths/min
- **SpO2** (number) - %
- **Glucose Level** (number) - mmol/L
- **Pain Score** (number, 0-10)

### Clinical Assessment Section
- **Physical Examination** (textarea, 3 rows)
- **Assessment** (textarea, 3 rows)
- **Treatment Plan** (textarea, 3 rows)
- **Medications Prescribed** (textarea, 2 rows)

### Work disposition & follow-up (current product)

Primary **new visit** flow (`MedicalVisit.tsx`) and **edit** flows (`Records.tsx`, `PatientDetails.tsx`) align on:

- **Disposition time** (`datetime-local`)
- **Disposition** (select): `return_to_work`, `transferred_to_hospital`, `transferred_to_hospital_other`
- **Transfer facility** (when *Transferred to Hospital*): dropdown from configured referral facilities
- **Other facility name** (when *Transferred to Hospital (Other)*): free text
- **Ambulance used** (switch / checkbox): shown **only** for the two hospital-transfer dispositions — records whether the patient was transported by ambulance for that transfer. Cleared when disposition is not a transfer. Persisted as `medical_visits.ambulance_used` (boolean).
- **Status** (e.g. `in_progress`, `completed` — values depend on form)
- **Work restrictions**, **follow-up required**, **follow-up instructions**, **follow-up date**

**Details modal** (`MedicalVisitDetailsModal.tsx`): shows ambulance line for transfer dispositions when `ambulance_used` is present.

> **Note:** Older documentation listed dispositions such as `light_duty`, `off_duty`, `emergency` on edits; the **transfer** path is the supported disposition set for hospital outcomes tied to transfer facility + ambulance. Legacy DB strings may still exist for historical rows.

---

## 🚑 Hospital transfer & ambulance capture (4.22.0+)

| Area | Behavior |
|------|----------|
| **New visit** | After choosing a hospital transfer disposition, set **Ambulance used** before submit. Payload sends `ambulanceUsed: false` when disposition is not a transfer. |
| **Edit (Records / Patient Details)** | Same visibility rules; save sends ambulance flag for transfers and `false` when not a transfer (replaces obsolete `emergency`-only branch). |
| **Reporting** | Clinical reports (`/reports/clinical`) count visit-side ambulance **only** for hospital-transfer dispositions; see `docs/REPORTS_CLINICAL_MODULE_PLAN.md` §4.5. |

**Files:** `client/src/pages/MedicalVisit.tsx`, `client/src/pages/Records.tsx`, `client/src/pages/PatientDetails.tsx`, `client/src/components/modals/MedicalVisitDetailsModal.tsx`.

---

## 🧪 Testing Steps

### Test 1: Create Medical Visit

1. Go to **Medical Visit** page
2. Search for and select a patient (e.g., "EMP0001")
3. Wait for confirmation toast
4. Fill in required fields
5. Click **Submit**

**Expected:** 
- Console shows patient ID
- If no patient selected, shows error toast
- If patient selected, creates visit with location

**Check Console For:**
```
=== FORM SUBMISSION DATA ===
Raw form data: { patientId: "...", ... }
patientId: [some-uuid]
Processed patientId: [same-uuid]
```

### Test 2: Edit Medical Visit

1. Go to **Patient Details** page
2. Click **Edit** on a medical visit
3. **Verify all fields are prepopulated:**
   - Visit type matches
   - Visit date shows correctly
   - All vital signs display
   - Medications, assessment, etc. are there
4. Change some values
5. Click **Update Visit**

**Expected:**
- Modal shows ~20+ fields (not just 5)
- All existing data is prepopulated
- Changes are saved successfully

### Test 3: Verify Location Display

1. After creating visit, go to **Records** page
2. Find the new visit
3. Should show:
   - 📍 **ODDFAP** (or your location code)
   - Badge: **ODD First Aid Post** (or your location name)

### Test 4: Hospital transfer + ambulance

1. Create or edit a visit with disposition **Transferred to Hospital** (pick a facility) or **Transferred to Hospital (Other)**.
2. Toggle **Ambulance used** and save.
3. Open visit details — ambulance should show for transfer dispositions.
4. Confirm **`/reports/clinical`** visit-side ambulance counts treat ambulance as **transfer-linked** only (see clinical plan §4.5).

---

## 🚨 Troubleshooting

### If creation still fails with "patient_id is empty":

**Check Console Logs:**
```
=== FORM SUBMISSION DATA ===
patientId: undefined  // ❌ Problem!
```

**Possible Causes:**
1. Patient not selected before submission
2. Form field not binding correctly
3. Patient selection not triggering `setValue`

**Solution:**
- Make sure to click on a patient from search results
- Wait for the green confirmation toast
- Check that patient name/details show above the form
- Try selecting patient again if unsure

### If edit modal still missing fields:

**Refresh the page** - The modal code has been completely rebuilt.

### If location not showing on visits:

Location injection is working! If it's not showing:
- Check you selected a location after login
- Verify the location badge shows in header (📍 ODDFAP)
- Location is automatically injected, no field in form

---

## 📊 What Changed

| File | Lines Changed | Change Type |
|------|--------------|-------------|
| `client/src/pages/MedicalVisit.tsx` | 239-272 | Added validation & logging |
| `client/src/pages/PatientDetails.tsx` | 440-730 | Complete edit modal rebuild |
| `server/locationMiddleware.ts` | All | Debug logging added |
| `server/routes.ts` | Medical visit endpoints | Location middleware applied |

---

## ✅ Status Summary

| Issue | Status | Notes |
|-------|--------|-------|
| Location injection | ✅ **WORKING** | Logs confirm injection successful |
| Patient ID validation | ✅ **FIXED** | Added check + user feedback |
| Edit modal fields | ✅ **FIXED** | Complete rebuild with all fields |
| Location display | ✅ **WORKING** | Shows on Records page |
| Ambulance on transfer (visits) | ✅ **SHIPPED (4.22.0)** | New/edit + details modal; clinical reports KPIs |

---

## 🎯 Next Steps

1. **Try creating a new medical visit**
   - Make sure to select a patient first
   - Check console logs for patientId
   - Verify location auto-injects

2. **Try editing an existing visit**
   - All fields should be prepopulated
   - Modal should be full-screen scrollable
   - Can update any field

3. **Verify in database**
   ```sql
   SELECT 
     id, 
     patient_id, 
     location_id, 
     chief_complaint 
   FROM medical_visits 
   ORDER BY created_at DESC 
   LIMIT 1;
   ```
   Both `patient_id` and `location_id` should have values!

---

**Original date:** October 10, 2025 (patient ID + edit modal)  
**Last updated:** April 20, 2026 — disposition/transfer/ambulance aligned with **4.22.0**; release tracking **4.22.1** in **`CHANGELOG.md`** / **`VERSION.md`**  
**Status:** Fixes verified; ambulance-on-transfer documented for clinical reporting parity


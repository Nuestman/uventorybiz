# Pharmacy Module - Ghana Adaptations Summary

**Version:** 1.0.0  
**Date:** October 11, 2025  
**Purpose:** Document changes made to adapt pharmacy module for Ghana regulatory context

---

## Overview

The pharmacy module planning documents have been comprehensively adapted from the US regulatory framework to align with Ghana's healthcare and pharmaceutical regulatory environment.

---

## Key Changes Made

### 1. Regulatory Bodies

| US Context | Ghana Context |
|------------|---------------|
| DEA (Drug Enforcement Administration) | NACOB (Narcotics Control Board of Ghana) |
| State Pharmacy Boards | Pharmacy Council of Ghana |
| FDA (US) | FDA Ghana (Food and Drugs Authority) |
| HIPAA | Ghana Data Protection Act (2012) |
| MSHA (Mining Safety) | Minerals Commission of Ghana |
| Medicare/Medicaid | NHIS (National Health Insurance Scheme) |

### 2. Controlled Substances Classification

| US | Ghana |
|----|-------|
| DEA Schedules (I, II, III, IV, V) | NACOB Schedules (1, 2, 3) |
| DEA Form 222 (Schedule II orders) | NACOB permit (Schedule 1) |
| DEA Form 106 (theft/loss) | NACOB 24-hour notification |
| Biennial inventory | Monthly reconciliation + Quarterly reporting |

### 3. Drug Registration & Approval

| US | Ghana |
|----|-------|
| NDC (National Drug Code) | FDA Ghana registration number |
| FDA approval process | FDA Ghana registration + batch approval |
| Orange Book (approved drugs) | Ghana Essential Medicines List (EML) |
| Generic substitution rules | Ghana EML therapeutic equivalents |

### 4. Prescription Format

**US Format:**
- DEA number required (controlled substances)
- State medical license
- NPI (National Provider Identifier)
- Refills per federal/state law

**Ghana Format:**
- Pharmacy Council license number
- Ghana Medical & Dental Council license
- NACOB permit (Schedule 1 substances)
- NHIS patient number (if applicable)
- Prescriber qualification (MB ChB, MD, etc.)

### 5. Data Protection & Privacy

| US (HIPAA) | Ghana (Data Protection Act 2012) |
|------------|----------------------------------|
| Covered entities | Data controllers |
| Business associates | Data processors |
| PHI (Protected Health Information) | Personal data |
| 60-day breach notification | 72-hour breach notification |
| 6-year retention | 5-year minimum retention (prescriptions) |

---

## Ghana-Specific Features Added

### 1. NHIS (National Health Insurance Scheme) Integration
- Patient eligibility verification
- NHIS medicines list filtering
- Automatic pricing per NHIS rates
- Claims generation and submission
- Prior authorization workflow
- Co-payment calculation
- Authorization tracking

### 2. Ghana Essential Medicines List (EML)
- 598 medicines categorization
- EML priority in formulary
- Substitution with EML equivalents
- Availability monitoring
- Stock alerts for essential medicines
- Reporting on EML compliance

### 3. Tropical Climate Adaptations
- Temperature monitoring (tropical conditions)
- Humidity-sensitive medication flagging
- Air-conditioning requirements
- Heat stability tracking
- Rainy season storage protocols
- Refrigeration alerts optimized for frequent power outages

### 4. Multi-Language Support
- Prescription labels: English, Twi, Ga, Ewe, Hausa
- Patient counseling in local languages
- Visual aids for low-literacy patients
- Audio instructions
- Cultural considerations in medication use
- Community health worker support

### 5. Local Supply Chain Management
- Ghana-based supplier tracking
- Import permit management
- Port clearance documentation
- Customs clearance tracking
- FDA Ghana supplier licensing verification
- Local manufacturer partnerships
- Buffer stock for supply delays

### 6. Mobile Money Integration (Future)
- MTN Mobile Money
- Vodafone Cash
- AirtelTigo Money
- Payment verification
- Receipt generation
- NHIS co-payment collection

### 7. Ghana-Specific ID Verification
- Ghana Card (new national ID)
- Voter ID card
- Passport
- Driver's license
- NHIS card
- ID verification for proxy pickup

---

## Database Schema Changes

### New Fields Added

#### `pharmacy_formulary` table:
```sql
-- Ghana-specific fields
fda_registration_number VARCHAR  -- FDA Ghana registration
fda_approval_date DATE
nacob_schedule VARCHAR(10)  -- Schedule 1, 2, 3
in_ghana_eml BOOLEAN  -- In Essential Medicines List
eml_category VARCHAR  -- EML categorization
unit_cost_ghs DECIMAL(10,2)  -- Ghana Cedis
nhis_reimbursable BOOLEAN  -- NHIS coverage
nhis_price_ghs DECIMAL(10,2)  -- NHIS price
heat_stress_consideration TEXT  -- Climate notes
```

#### `pharmacy_inventory` table:
```sql
-- Ghana-specific fields
fda_batch_number VARCHAR  -- FDA batch approval
import_permit_number VARCHAR  -- Import permit
requires_air_conditioning BOOLEAN  -- Tropical climate
humidity_sensitive BOOLEAN
supplier_license VARCHAR  -- Pharmacy Council/FDA license
fda_recall_alert BOOLEAN
unit_cost_ghs DECIMAL(10,2)  -- Ghana Cedis
total_value_ghs DECIMAL(12,2)
```

#### `prescriptions` table:
```sql
-- Ghana-specific fields
pharmacy_council_number VARCHAR  -- Prescriber's PC license
prescriber_qualification VARCHAR  -- MB ChB, MD, etc.
nacob_permit_number VARCHAR  -- For Schedule 1
nhis_covered BOOLEAN
nhis_patient_number VARCHAR
nhis_claim_number VARCHAR
nhis_authorization VARCHAR
language_counseled VARCHAR  -- Twi, Ga, Ewe, etc.
requires_air_conditioning BOOLEAN
heat_exposure_warning BOOLEAN
total_cost_ghs DECIMAL(10,2)
nhis_contribution_ghs DECIMAL(10,2)
patient_copay_ghs DECIMAL(10,2)
```

#### `controlled_medicines_register` table:
```sql
-- Renamed from controlled_substances_register
nacob_schedule VARCHAR(10)  -- Schedule 1, 2, 3
nacob_permit_number VARCHAR
fda_import_permit VARCHAR
environmental_disposal_certificate VARCHAR  -- EPA Ghana
nacob_notification_sent BOOLEAN
performed_by_license VARCHAR  -- Pharmacy Council license
verified_by_license VARCHAR
```

---

## Compliance Requirements Changed

### Pharmacy Operations

**US Requirements:**
- Licensed pharmacist (state board)
- Pharmacy license (state)
- DEA registration
- State regulations compliance

**Ghana Requirements:**
- Licensed pharmacist (Pharmacy Council of Ghana)
- Pharmacy premises license (per location)
- NACOB permit (if dispensing Schedule 1)
- Good Pharmacy Practice (GPP) compliance
- Continuing Professional Development (CPD)
- FDA Ghana notification
- NHIS provider accreditation (optional)

### Controlled Medicines

**US (DEA):**
- Schedule I-V classification
- DEA Form 222 (Schedule II orders)
- DEA Form 106 (theft/loss)
- Biennial inventory
- 2-year record retention
- Secure storage

**Ghana (NACOB):**
- Schedule 1-3 classification
- NACOB permit (Schedule 1)
- Physical register (mandatory backup)
- Monthly reconciliation
- Quarterly reporting to NACOB
- 24-hour loss/theft notification
- Witnessed destruction
- Environmental disposal certificates (EPA Ghana)
- 5-year record retention

### Adverse Event Reporting

**US:**
- FDA MedWatch
- Voluntary reporting (most cases)
- Serious events mandatory

**Ghana:**
- FDA Ghana pharmacovigilance program
- Mandatory reporting (all adverse events)
- Pharmacy Council notification
- WHO VigiBase submission

---

## Implementation Considerations for Ghana

### 1. Infrastructure Challenges

**Power Supply:**
- Frequent outages common
- Solution: Offline mode, UPS, generator backup
- Physical register backup (NACOB requirement)
- Data synchronization when power restored

**Internet Connectivity:**
- Unreliable in some areas
- Solution: Local caching, batch sync, SMS alerts
- Offline prescription creation
- Store-and-forward architecture

### 2. Regulatory Timeline

**Licenses & Permits (Before Implementation):**
- Pharmacy Council premises inspection: 2-4 weeks
- NACOB permit (Schedule 1): 4-8 weeks
- NHIS provider accreditation: 4-12 weeks
- FDA notification: 2-3 weeks
- Import permits (if needed): Variable

**Ongoing Compliance:**
- NACOB quarterly reports
- Pharmacy Council annual renewal
- FDA pharmacovigilance (ongoing)
- NHIS claims (7-day submission)

### 3. Supply Chain Considerations

**Procurement:**
- Longer lead times (international shipping)
- Port clearance delays (Tema, Takoradi)
- Import permit requirements
- FDA batch approval process
- Higher stock buffers recommended

**Local Sources:**
- Partner with FDA-licensed suppliers
- Support local manufacturers
- Generic substitution with Ghana-produced alternatives
- Community pharmacy networks

### 4. Human Resources

**Required Personnel:**
- Licensed Pharmacist (Pharmacy Council registered)
- Pharmacy Technicians (trained)
- Regulatory affairs consultant (FDA/NACOB liaison)
- NHIS claims specialist (if accepting NHIS)

**Training Needs:**
- Ghana regulatory framework
- NACOB reporting
- FDA pharmacovigilance
- NHIS claims process
- Multi-language counseling
- Climate-appropriate storage

### 5. Cost Considerations

**Additional Costs (vs US implementation):**
- Regulatory consultants (FDA, NACOB, Pharmacy Council)
- License fees and permits
- Climate control equipment (AC, dehumidifiers)
- Backup power systems (UPS, generators)
- Physical NACOB register (printing, binding)
- Multi-language materials
- Training on Ghana regulations

---

## Testing & Validation (Ghana Context)

### Regulatory Compliance Testing

1. **Pharmacy Council Compliance:**
   - Licensed pharmacist verification
   - GPP checklist validation
   - Patient counseling documentation
   - CPD tracking

2. **FDA Ghana Compliance:**
   - Registration number validation
   - Batch approval tracking
   - Pharmacovigilance reporting
   - Recall management

3. **NACOB Compliance:**
   - Schedule classification accuracy
   - Dual verification workflow
   - Reconciliation calculations
   - Quarterly report generation
   - Loss/theft notification timing

4. **NHIS Integration:**
   - Patient eligibility API
   - Medicines list filtering
   - Pricing accuracy
   - Claims formatting
   - Authorization workflow

5. **Data Protection Act:**
   - Consent capture
   - Access logging
   - Breach notification (72-hour)
   - Data retention (5 years)
   - Patient rights (access, erasure)

---

## Migration from US to Ghana Version

### Files Changed

1. **PHARMACY_MODULE_PLAN.md** - Complete rewrite for Ghana
2. **PHARMACY_MODULE_SUMMARY.md** - Adapted for Ghana
3. **PHARMACY_MODULE_DIAGRAMS.md** - Updated terminology (DEA→NACOB)
4. **PHARMACY_MODULE_INDEX.md** - Ghana context added
5. **CHANGELOG.md** - Updated with Ghana adaptations

### Files Created

- **PHARMACY_GHANA_ADAPTATIONS.md** (this document)

### Original Files Backed Up

- **PHARMACY_MODULE_PLAN_US_BACKUP.md**
- **PHARMACY_MODULE_SUMMARY_US_BACKUP.md**

---

## Success Criteria (Ghana-Specific)

### Operational
- [ ] 100% FDA Ghana registered medicines in formulary
- [ ] > 95% Ghana EML availability
- [ ] < 45 minute prescription turnaround
- [ ] Zero counterfeit medicines dispensed
- [ ] < 1% expiry waste (accounting for supply delays)

### Clinical
- [ ] 100% patient counseling documentation
- [ ] Multi-language counseling available
- [ ] Heat stress warnings for appropriate medications
- [ ] Zero serious harm events
- [ ] > 75% medication adherence

### Compliance
- [ ] 100% NACOB quarterly reporting
- [ ] Zero NACOB discrepancies unresolved
- [ ] 100% FDA pharmacovigilance reporting
- [ ] Pharmacy Council annual inspection passed
- [ ] Ghana Data Protection Act compliant

### NHIS
- [ ] > 95% patient eligibility accuracy
- [ ] Claims submitted within 7 days
- [ ] < 24-hour authorization turnaround
- [ ] 100% NHIS pricing accuracy
- [ ] < 10% claims rejection rate

---

## Key Stakeholders (Ghana)

### Regulatory Bodies
1. **Pharmacy Council of Ghana**
   - Contact for license inquiries
   - GPP compliance verification
   - CPD requirements

2. **FDA Ghana (Food and Drugs Authority)**
   - Drug registration verification
   - Pharmacovigilance reporting
   - Recall notifications
   - Import permit applications

3. **NACOB (Narcotics Control Board)**
   - Schedule 1 permit applications
   - Quarterly report submissions
   - Loss/theft notifications
   - Destruction witnessing

4. **Ghana Health Service**
   - Healthcare standards
   - District health integration
   - Emergency protocols

5. **National Health Insurance Authority (NHIA)**
   - NHIS provider accreditation
   - Claims submission portal
   - Medicines list updates
   - Pricing guidelines

6. **Minerals Commission**
   - Mining health standards
   - Fitness for duty protocols
   - Incident reporting

7. **Data Protection Commission**
   - Privacy compliance
   - Breach notifications
   - Data processing registrations

---

## Resources & References (Ghana)

### Official Websites
- Pharmacy Council: https://www.pcghana.org
- FDA Ghana: https://www.fdaghana.gov.gh
- NACOB: https://nacobghana.org
- NHIA: https://www.nhis.gov.gh
- Minerals Commission: https://www.mincom.gov.gh

### Key Legislation
- Narcotics Control Commission Act, 2020 (Act 1019)
- Data Protection Act, 2012 (Act 843)
- Food and Drugs Authority Act, 2012 (Act 851)
- Pharmacy Act, 1994 (Act 489)
- Minerals and Mining Act, 2006 (Act 703)
- National Health Insurance Act, 2012 (Act 852)

### Ghana Essential Medicines List
- 598 medicines across categories
- Updated periodically by Ghana Health Service
- Available from GHS website

---

## Conclusion

The pharmacy module has been comprehensively adapted for the Ghanaian regulatory environment, incorporating:

✅ Pharmacy Council of Ghana standards  
✅ FDA Ghana registration requirements  
✅ NACOB controlled medicines framework  
✅ Ghana Data Protection Act compliance  
✅ NHIS integration  
✅ Ghana EML prioritization  
✅ Tropical climate considerations  
✅ Multi-language support  
✅ Local supply chain realities  
✅ Infrastructure challenges (power, internet)  

The system is ready for regulatory review and pilot implementation at a Ghana mining site.

---

**Document Version:** 1.0.0  
**Last Updated:** October 11, 2025  
**Regulatory Framework:** Ghana  
**Next Steps:** Regulatory consultation and licensing


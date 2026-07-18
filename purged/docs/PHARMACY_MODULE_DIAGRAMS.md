# Pharmacy Module - Visual Reference & Diagrams (Ghana Edition)

**Version:** 1.0.0 (Ghana)  
**Purpose:** Visual representation of workflows, architecture, and data flows  
**Regulatory Context:** Ghana

---

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        MineAid HMS Platform                         │
│                   (Multi-Tenant Architecture)                       │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  │
        ┌─────────────────────────┴─────────────────────────┐
        │                                                     │
┌───────▼────────┐                                  ┌────────▼────────┐
│  Tenant 1      │                                  │  Tenant 2       │
│  Mining Site A │                                  │  Mining Site B  │
└───────┬────────┘                                  └────────┬────────┘
        │                                                     │
        │                                                     │
   ┌────┴────────────────────┐                          ┌───┴────┐
   │                         │                          │        │
┌──▼──────────┐   ┌─────────▼────────┐        ┌───────▼─────┐  │
│ Location 1  │   │   Location 2     │        │ Location 1  │  │
│ Main Clinic │   │ Shaft 3 Station  │        │ Main Clinic │  │
└──┬──────────┘   └─────────┬────────┘        └───────┬─────┘  │
   │                        │                         │         │
   │                        │                         │         │
┌──▼──────────────────┐  ┌──▼──────────────────┐  ┌──▼─────────────┐
│ Pharmacy Inventory  │  │ Pharmacy Inventory  │  │ Pharmacy Inv.  │
│                     │  │                     │  │                │
│ - Formulary Items   │  │ - Formulary Items   │  │ - Formulary... │
│ - Stock Levels      │  │ - Stock Levels      │  │ - Stock...     │
│ - CS Register       │  │ - CS Register       │  │ - CS Reg...    │
│ - Prescriptions     │  │ - Prescriptions     │  │ - Prescr...    │
└─────────────────────┘  └─────────────────────┘  └────────────────┘

         │                        │                         │
         │                        │                         │
         └────────────┬───────────┴─────────────────────────┘
                      │
                      │ Complete Isolation
                      │ No Cross-Tenant/Location Access
                      │
              ┌───────▼────────┐
              │  Shared Tables │
              │  (Lookup Only) │
              │                │
              │ - Drug         │
              │   Interactions │
              └────────────────┘
```

---

## Data Isolation Model

```
┌─────────────────────────────────────────────────────────────────┐
│                   PostgreSQL Database                            │
└─────────────────────────────────────────────────────────────────┘
                                │
                                │
        ┌───────────────────────┴────────────────────────┐
        │                                                 │
┌───────▼────────────────────────┐       ┌──────────────▼─────────┐
│  Tenant-Isolated Tables         │       │ Location-Isolated      │
│                                 │       │ Tables                 │
│  pharmacy_formulary             │       │                        │
│  ├─ tenant_id (FK)              │       │ pharmacy_inventory     │
│  └─ medication details          │       │ ├─ tenant_id (FK)      │
│                                 │       │ ├─ location_id (FK)    │
│  prescriptions                  │       │ └─ stock data          │
│  ├─ tenant_id (FK)              │       │                        │
│  ├─ location_id (FK)            │       │ medication_admin...    │
│  └─ prescription data           │       │ ├─ tenant_id (FK)      │
│                                 │       │ ├─ location_id (FK)    │
│  controlled_substances_register │       │ └─ admin records       │
│  ├─ tenant_id (FK)              │       │                        │
│  ├─ location_id (FK)            │       │ stock_transfers        │
│  └─ CS transactions             │       │ ├─ tenant_id (FK)      │
└─────────────────────────────────┘       │ ├─ from_location_id    │
                                          │ ├─ to_location_id      │
                                          │ └─ transfer data       │
                                          └────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  Row-Level Security (RLS) Policies                              │
│                                                                  │
│  WHERE tenant_id = current_setting('app.current_tenant')::UUID  │
│  AND location_id = current_setting('app.active_location')::UUID │
└─────────────────────────────────────────────────────────────────┘
```

---

## Prescription Lifecycle State Machine

```
                    ┌──────────────┐
                    │   PENDING    │ ← Newly created prescription
                    └──────┬───────┘
                           │
                           │ Pharmacist reviews
                           ▼
                    ┌──────────────┐
             ┌─────▶│   VERIFIED   │ ← Safety checks passed
             │      └──────┬───────┘
             │             │
             │             │ Technician prepares
             │             ▼
             │      ┌──────────────┐
             │      │    READY     │ ← Prepared, awaiting patient
             │      └──────┬───────┘
             │             │
             │             │ Patient arrives, pharmacist counsels
             │             ▼
             │      ┌──────────────┐
             │      │  DISPENSED   │ ← Medication given to patient
             │      └──────┬───────┘
             │             │
             │             │ Refill due
             │             ▼
             │      ┌──────────────┐
             │      │ REFILL READY │ ← Ready for next refill
             │      └──────┬───────┘
             │             │
             │             │ refills_remaining > 0
             │             └─────────────────┐
             │                               │
             │                               ▼
             └───────────────────────── (Repeat)
             
                    ┌──────────────┐
                    │  CANCELLED   │ ← Prescription cancelled
                    └──────────────┘
                           ▲
                           │ Can be cancelled from any state
                           │ (before dispensing)
                           
                    ┌──────────────┐
                    │   EXPIRED    │ ← effective_until date passed
                    └──────────────┘
```

---

## Prescription Creation & Dispensing Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ STEP 1: MEDICAL OFFICER - CREATE PRESCRIPTION                   │
└─────────────────────────────────────────────────────────────────┘

  Medical Visit
       │
       ├─ Patient: John Doe
       ├─ Diagnosis: Bacterial infection
       ├─ Vitals: Temp 38.5°C
       └─ Prescribe
              │
              ▼
  ┌──────────────────────────┐
  │  E-Prescribing Interface │
  └──────────────────────────┘
              │
              ├─ Search: "Amoxicillin"
              │     │
              │     ▼
              │  [Formulary Results]
              │   ✓ Amoxicillin 500mg capsule
              │
              ├─ Select: Amoxicillin 500mg
              ├─ Enter: "1 capsule TID x 7 days"
              ├─ Quantity: 21 capsules
              └─ Refills: 0
                    │
                    ▼
  ┌──────────────────────────────────┐
  │  AUTOMATIC SAFETY CHECKS         │
  │                                  │
  │  ✓ Allergy Check: PASS           │
  │  ✓ Drug Interactions: PASS       │
  │  ✓ Duplicate Therapy: PASS       │
  │  ✓ Max Dose: PASS                │
  │  ✓ Fitness Impact: No restriction│
  └──────────────────────────────────┘
                    │
                    ├─ Digital Signature
                    │
                    ▼
              [SUBMIT]
                    │
                    ▼
  ┌──────────────────────────────────┐
  │ Prescription Created             │
  │ Status: PENDING                  │
  │ Rx#: RX-2025-001234              │
  └──────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────┐
│ STEP 2: PHARMACIST - VERIFY PRESCRIPTION                        │
└─────────────────────────────────────────────────────────────────┘

  Pharmacist Queue
       │
       ├─ [3] Pending Prescriptions
       │
       ├─ Select: RX-2025-001234
              │
              ▼
  ┌──────────────────────────────────┐
  │  Prescription Review             │
  │                                  │
  │  Patient: John Doe (ID: 12345)   │
  │  Medication: Amoxicillin 500mg   │
  │  Sig: 1 cap TID x 7 days         │
  │  Qty: 21                         │
  │                                  │
  │  Prescriber: Dr. Smith           │
  │  Diagnosis: Bacterial infection  │
  │                                  │
  │  [Safety Checks - All Pass]      │
  │  ✓ No alerts                     │
  └──────────────────────────────────┘
              │
              ├─ Re-verify patient identity
              ├─ Review clinical info
              ├─ Confirm appropriateness
              │
              ▼
         [APPROVE]
              │
              ▼
  ┌──────────────────────────────────┐
  │ Status: VERIFIED                 │
  │ Verified by: Pharmacist Jane     │
  └──────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────┐
│ STEP 3: PHARMACY TECH - PREPARE MEDICATION                      │
└─────────────────────────────────────────────────────────────────┘

  Ready to Prepare Queue
       │
       ├─ Select: RX-2025-001234
              │
              ▼
  ┌──────────────────────────────────┐
  │  Scan Medication Barcode         │
  │                                  │
  │  [Beep!] ✓ Verified              │
  │  Amoxicillin 500mg capsule       │
  │  Lot: 2025-ABC-123               │
  │  Expiry: 2026-12-31              │
  └──────────────────────────────────┘
              │
              ├─ Count: 21 capsules
              ├─ Print label
              │     │
              │     ▼
              │  ┌─────────────────────┐
              │  │ LABEL:              │
              │  │ John Doe            │
              │  │ Amoxicillin 500mg   │
              │  │ Take 1 capsule      │
              │  │ 3 times daily       │
              │  │ for 7 days          │
              │  │ Qty: 21             │
              │  │ Rx#: RX-2025-001234 │
              │  └─────────────────────┘
              │
              ├─ Attach to bottle
              └─ Place in pickup area
                    │
                    ▼
  ┌──────────────────────────────────┐
  │ Status: READY                    │
  │ Ready for pickup                 │
  └──────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────┐
│ STEP 4: PHARMACIST - COUNSEL & DISPENSE                         │
└─────────────────────────────────────────────────────────────────┘

  Pickup Queue
       │
       ├─ Call: "John Doe"
       │
       ├─ Verify ID
              │
              ▼
  ┌──────────────────────────────────┐
  │  Patient Counseling              │
  │                                  │
  │  ✓ How to take medication        │
  │  ✓ Expected effects              │
  │  ✓ Possible side effects         │
  │  ✓ Food/drink interactions       │
  │  ✓ Complete full course          │
  │  ✓ No work restrictions          │
  │  ✓ Questions answered            │
  └──────────────────────────────────┘
              │
              ├─ Document counseling
              ├─ Capture patient signature
              │     │
              │     ▼
              │  [Signature Pad]
              │  John Doe (signed)
              │
              └─ Hand over medication
                    │
                    ▼
  ┌──────────────────────────────────┐
  │ Status: DISPENSED                │
  │ Dispensed by: Pharmacist Jane    │
  │ Dispensed at: 2025-10-11 14:30   │
  │                                  │
  │ Inventory Updated:               │
  │ Amoxicillin 500mg: 1200 → 1179  │
  └──────────────────────────────────┘
```

---

## Controlled Substance Dispensing Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ CONTROLLED MEDICINE PRESCRIPTION (NACOB Schedule 1 Example)     │
└─────────────────────────────────────────────────────────────────┘

  Standard Prescription Flow
       │
       ▼
  ┌──────────────────────────────────┐
  │  ENHANCED VERIFICATION           │
  │                                  │
  │  1. Check NACOB Requirements     │
  │     ✓ Prescriber has Pharmacy    │
  │       Council license            │
  │     ✓ NACOB permit (if Sched 1)  │
  │     ✓ Prescription < 30 days old │
  │     ✓ Limited refills            │
  │                                  │
  │  2. Verify Patient ID            │
  │     ✓ Photo ID required          │
  │     ✓ ID matches prescription    │
  └──────────────────────────────────┘
       │
       ▼
  ┌──────────────────────────────────┐
  │  DUAL COUNT PROCEDURE            │
  │                                  │
  │  Person 1: Pharmacist Jane       │
  │  ├─ Access secure storage        │
  │  ├─ Remove medication            │
  │  ├─ Count: 30 tablets            │
  │  └─ Initial: ___JD___            │
  │                                  │
  │  Person 2: Pharmacy Tech Mike    │
  │  ├─ Independently count          │
  │  ├─ Verify: 30 tablets ✓         │
  │  └─ Initial: ___MT___            │
  └──────────────────────────────────┘
       │
       ▼
  ┌──────────────────────────────────┐
  │  UPDATE NACOB REGISTER           │
  │                                  │
  │  Date: 2025-10-11                │
  │  Time: 14:30                     │
  │  Medication: Morphine 15mg       │
  │  NACOB Schedule: Schedule 1      │
  │  Transaction: Dispensed          │
  │  Quantity: 30 tablets            │
  │  Previous Balance: 500 tablets   │
  │  New Balance: 470 tablets        │
  │  Prescription#: RX-2025-001235   │
  │  Patient: Jane Smith             │
  │  Dispensed by: Pharmacist Jane   │
  │  (Pharmacy Council: PC/12345)    │
  │  Verified by: Tech Mike          │
  │  Signature 1: ___JD___           │
  │  Signature 2: ___MT___           │
  └──────────────────────────────────┘
       │
       ▼
  ┌──────────────────────────────────┐
  │  SECURE STORAGE LOGGING          │
  │                                  │
  │  [Audit Entry]                   │
  │  Action: Secure cabinet opened   │
  │  Time: 14:28                     │
  │  User: Pharmacist Jane           │
  │  Witness: Tech Mike              │
  │                                  │
  │  [Audit Entry]                   │
  │  Action: Secure cabinet closed   │
  │  Time: 14:32                     │
  │  User: Pharmacist Jane           │
  └──────────────────────────────────┘
       │
       ▼
  [DISPENSE TO PATIENT]
       │
       ▼
  Patient signature + Photo ID copy retained
```

---

## Stock Receiving Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│ RECEIVE NEW STOCK                                               │
└─────────────────────────────────────────────────────────────────┘

  Delivery Arrives
       │
       ├─ Check packaging integrity
       ├─ Verify sender/courier
       │
       ▼
  ┌──────────────────────────────────┐
  │  UNPACK & VERIFY                 │
  │                                  │
  │  1. Open package                 │
  │  2. Match packing slip to PO     │
  │  3. Check for damage             │
  │  4. Verify cold chain (if req'd) │
  └──────────────────────────────────┘
       │
       ▼
  ┌──────────────────────────────────┐
  │  FOR EACH ITEM:                  │
  │                                  │
  │  1. Scan barcode                 │
  │     [Beep!]                      │
  │     Amoxicillin 500mg capsule    │
  │                                  │
  │  2. Verify:                      │
  │     ✓ Medication name            │
  │     ✓ Strength                   │
  │     ✓ Lot number: 2025-XYZ-456   │
  │     ✓ Expiry: 2027-06-30         │
  │                                  │
  │  3. Count quantity:              │
  │     Ordered: 500 capsules        │
  │     Received: 500 capsules ✓     │
  │                                  │
  │  4. Inspect condition:           │
  │     ✓ Packaging intact           │
  │     ✓ No discoloration           │
  │     ✓ No moisture damage         │
  └──────────────────────────────────┘
       │
       ├─ [Repeat for all items]
       │
       ▼
  ┌──────────────────────────────────┐
  │  CONTROLLED SUBSTANCE RECEIVING  │
  │  (If applicable)                 │
  │                                  │
  │  1. Verify DEA Form 222          │
  │     ✓ Form matches shipment      │
  │     ✓ Quantities correct         │
  │                                  │
  │  2. DUAL COUNT                   │
  │     Person 1: _____              │
  │     Person 2: _____              │
  │     Both sign: _____ _____       │
  │                                  │
  │  3. Update CS Register           │
  │     Transaction: Received        │
  │     Qty: 100 tablets             │
  │     Previous: 470                │
  │     New Balance: 570             │
  │                                  │
  │  4. Store in secure cabinet      │
  │  5. Return copy to supplier      │
  └──────────────────────────────────┘
       │
       ▼
  ┌──────────────────────────────────┐
  │  ENTER INTO SYSTEM               │
  │                                  │
  │  Location: Main Clinic           │
  │  Item: Amoxicillin 500mg         │
  │  Lot: 2025-XYZ-456               │
  │  Expiry: 2027-06-30              │
  │  Quantity: 500                   │
  │  Storage: Shelf A-3              │
  │  Received by: Tech Mike          │
  │                                  │
  │  [SAVE]                          │
  └──────────────────────────────────┘
       │
       ▼
  ┌──────────────────────────────────┐
  │  INVENTORY UPDATED               │
  │                                  │
  │  Previous Stock: 1179            │
  │  Received: +500                  │
  │  New Stock: 1679                 │
  │                                  │
  │  PO Status: Partially Received   │
  └──────────────────────────────────┘
       │
       ▼
  Print labels, place in storage
```

---

## Stock Transfer Between Locations

```
┌─────────────────────────────────────────────────────────────────┐
│ TRANSFER: Main Clinic → Shaft 3 Station                        │
└─────────────────────────────────────────────────────────────────┘

  ┌──────────────────────────────────┐
  │  INITIATE TRANSFER               │
  │  (Main Clinic Pharmacy)          │
  │                                  │
  │  From: Main Clinic               │
  │  To: Shaft 3 Station             │
  │  Medication: Paracetamol 500mg   │
  │  Quantity: 200 tablets           │
  │  Lot: 2025-ABC-789               │
  │  Expiry: 2026-09-30              │
  │  Reason: Low stock at Shaft 3    │
  │  Initiated by: Pharmacist Jane   │
  └──────────────────────────────────┘
       │
       ▼
  ┌──────────────────────────────────┐
  │  APPROVAL WORKFLOW               │
  │  Status: PENDING APPROVAL        │
  │                                  │
  │  Notify: Pharmacy Manager        │
  │  Review: Transfer request        │
  │  Decision: [APPROVE]             │
  │  Approved by: Manager Sarah      │
  │  Approved at: 2025-10-11 10:00   │
  └──────────────────────────────────┘
       │
       ▼
  ┌──────────────────────────────────┐
  │  PREPARE SHIPMENT                │
  │  Status: APPROVED                │
  │                                  │
  │  1. Count medication: 200 ✓      │
  │  2. Package securely             │
  │  3. Attach transfer document     │
  │  4. Update inventory             │
  │     Main Clinic: 2000 → 1800     │
  │  5. Mark as IN_TRANSIT           │
  │  Shipped by: Tech Mike           │
  │  Shipped at: 2025-10-11 11:00    │
  └──────────────────────────────────┘
       │
       ▼
       [PHYSICAL TRANSPORT]
       │
       ▼
  ┌──────────────────────────────────┐
  │  RECEIVE AT DESTINATION          │
  │  (Shaft 3 Station)               │
  │                                  │
  │  1. Verify package integrity ✓   │
  │  2. Match transfer document ✓    │
  │  3. Count received: 200 ✓        │
  │  4. Inspect medication ✓         │
  │  5. Update inventory             │
  │     Shaft 3: 50 → 250            │
  │  6. Mark as RECEIVED             │
  │  Received by: Pharmacist Tom     │
  │  Received at: 2025-10-11 13:00   │
  │  Signature: ___TJ___             │
  └──────────────────────────────────┘
       │
       ▼
  ┌──────────────────────────────────┐
  │  TRANSFER COMPLETE               │
  │                                  │
  │  Notification sent to:           │
  │  - Main Clinic (sender)          │
  │  - Pharmacy Manager              │
  │                                  │
  │  Audit trail updated             │
  └──────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────┐
│ CONTROLLED SUBSTANCE TRANSFER (Enhanced Procedure)              │
└─────────────────────────────────────────────────────────────────┘

  Additional Requirements:
       │
       ├─ DEA Form 222 (if Schedule II)
       ├─ Dual count at source
       ├─ Dual count at destination
       ├─ Update CS Register at both locations
       ├─ Running balance verification
       └─ Signatures at each step
```

---

## Daily Controlled Substance Reconciliation

```
┌─────────────────────────────────────────────────────────────────┐
│ DAILY CONTROLLED MEDICINES COUNT - MORNING SHIFT (NACOB)        │
└─────────────────────────────────────────────────────────────────┘

  07:00 - Start of Shift
       │
       ├─ Two staff required
       │     • Pharmacist Jane
       │     • Tech Mike
       │
       ▼
  ┌──────────────────────────────────┐
  │  ACCESS SECURE STORAGE           │
  │                                  │
  │  1. Both staff sign access log   │
  │  2. Unlock secure cabinet        │
  │  3. Video recording active       │
  └──────────────────────────────────┘
       │
       ▼
  ┌──────────────────────────────────┐
  │  PHYSICAL COUNT                  │
  │  (Each Controlled Substance)     │
  │                                  │
  │  Morphine 15mg Tablets           │
  │  ├─ Person 1 counts: 470         │
  │  ├─ Person 2 counts: 470         │
  │  ├─ Counts match ✓               │
  │  └─ Expected balance: 470 ✓      │
  │                                  │
  │  Oxycodone 5mg Tablets           │
  │  ├─ Person 1 counts: 285         │
  │  ├─ Person 2 counts: 285         │
  │  ├─ Counts match ✓               │
  │  └─ Expected balance: 285 ✓      │
  │                                  │
  │  [Repeat for all CS items]       │
  └──────────────────────────────────┘
       │
       ▼
  ┌──────────────────────────────────┐
  │  RECORD COUNT                    │
  │                                  │
  │  Date: 2025-10-11                │
  │  Time: 07:15                     │
  │  Shift: Morning                  │
  │                                  │
  │  All items counted: ✓            │
  │  All balances correct: ✓         │
  │  Discrepancies: None             │
  │                                  │
  │  Counted by: Pharmacist Jane     │
  │  Signature: ___JD___             │
  │                                  │
  │  Verified by: Tech Mike          │
  │  Signature: ___MT___             │
  └──────────────────────────────────┘
       │
       ▼
  ┌──────────────────────────────────┐
  │  SECURE & DOCUMENT               │
  │                                  │
  │  1. Lock secure cabinet          │
  │  2. Both sign closure log        │
  │  3. File count sheet             │
  │  4. Update system                │
  └──────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────┐
│ IF DISCREPANCY FOUND                                            │
└─────────────────────────────────────────────────────────────────┘

  Discrepancy Detected
       │
       ▼
  ┌──────────────────────────────────┐
  │  IMMEDIATE RE-COUNT              │
  │                                  │
  │  1. Stop current process         │
  │  2. Re-count immediately         │
  │  3. Use third person if needed   │
  └──────────────────────────────────┘
       │
       ├─ Still discrepancy?
       │     │
       │     ▼ YES
       │  ┌──────────────────────────┐
       │  │  INVESTIGATION           │
       │  │                          │
       │  │  1. Review transactions  │
       │  │     Last 24 hours        │
       │  │                          │
       │  │  2. Check video footage  │
       │  │     (if available)       │
       │  │                          │
       │  │  3. Interview staff      │
       │  │     Who had access?      │
       │  │                          │
       │  │  4. Document findings    │
       │  └──────────────────────────┘
       │            │
       │            ▼
       │  ┌──────────────────────────┐
       │  │  REPORT TO MANAGEMENT    │
       │  │                          │
       │  │  • Pharmacy Manager      │
       │  │  • Safety Officer        │
       │  │  • Admin                 │
       │  └──────────────────────────┘
       │            │
       │            │ Large discrepancy?
       │            │ Suspected theft?
       │            ▼
       │  ┌──────────────────────────┐
       │  │  DEA NOTIFICATION        │
       │  │                          │
       │  │  File DEA Form 106       │
       │  │  (Theft/Loss Report)     │
       │  └──────────────────────────┘
       │
       ▼ NO (counts match)
  ┌──────────────────────────────────┐
  │  NORMAL OPERATIONS               │
  └──────────────────────────────────┘
```

---

## Safety Check Decision Tree

```
┌─────────────────────────────────────────────────────────────────┐
│ DRUG INTERACTION CHECK                                          │
└─────────────────────────────────────────────────────────────────┘

  New Prescription: Drug A
       │
       ▼
  Check against current medications
       │
       ├─ Patient currently taking:
       │     • Drug B
       │     • Drug C
       │     • Drug D
       │
       ▼
  ┌──────────────────────────────────┐
  │  INTERACTION DETECTION           │
  └──────────────────────────────────┘
       │
       ├─────────────────┬─────────────────┬─────────────────┐
       │                 │                 │                 │
       ▼                 ▼                 ▼                 ▼
  ┌─────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
  │  NONE   │    │  MINOR   │    │MODERATE  │    │  MAJOR   │
  └─────────┘    └──────────┘    └──────────┘    └──────────┘
       │              │                │                │
       │              │                │                │
       ▼              ▼                ▼                ▼
  ┌─────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
  │         │    │ Warning  │    │  Alert   │    │ BLOCK    │
  │ Proceed │    │ Display  │    │  Req'd   │    │ Rx       │
  │         │    │ Continue │    │ Review   │    │          │
  └─────────┘    └──────────┘    └──────────┘    └──────────┘
       │              │                │                │
       │              │                │                │
       │              │                ▼                ▼
       │              │         ┌──────────────────────────┐
       │              │         │  CLINICAL REVIEW         │
       │              │         │                          │
       │              │         │  Pharmacist reviews:     │
       │              │         │  • Clinical significance │
       │              │         │  • Patient factors       │
       │              │         │  • Risk vs benefit       │
       │              │         │                          │
       │              │         │  Options:                │
       │              │         │  1. Continue with        │
       │              │         │     monitoring           │
       │              │         │  2. Adjust dose          │
       │              │         │  3. Alternative drug     │
       │              │         │  4. Cancel Rx            │
       │              │         │                          │
       │              │         │  Decision documented     │
       │              │         │  Override with reason    │
       │              │         └──────────────────────────┘
       │              │                │                │
       └──────────────┴────────────────┴────────────────┘
                      │
                      ▼
  ┌──────────────────────────────────┐
  │  PRESCRIBER NOTIFICATION         │
  │  (If significant interaction)    │
  │                                  │
  │  Alert sent to prescriber        │
  │  Recommend alternative if avail  │
  └──────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────┐
│ FITNESS FOR DUTY ASSESSMENT                                     │
└─────────────────────────────────────────────────────────────────┘

  Prescription: Drug X
       │
       ▼
  ┌──────────────────────────────────┐
  │  CHECK MINING-SPECIFIC IMPACTS   │
  └──────────────────────────────────┘
       │
       ├─ Underground work approved? ───┬─── YES → Proceed
       │                                └─── NO ──┐
       │                                          │
       ├─ Heavy machinery approved? ────┬─── YES → Proceed
       │                                └─── NO ──┤
       │                                          │
       ├─ Alertness/cognitive impact? ──┬─── NONE → Proceed
       │                                └─── YES ──┤
       │                                          │
       └─────────────────────────────────────────┘
                      │
                      ▼
  ┌──────────────────────────────────┐
  │  WORK RESTRICTION REQUIRED       │
  │                                  │
  │  1. Generate restriction notice  │
  │  2. Specify duration             │
  │  3. Define limitations:          │
  │     • No underground work        │
  │     • No machinery operation     │
  │     • Light duty only            │
  │  4. Notify:                      │
  │     • Patient                    │
  │     • Supervisor                 │
  │     • Safety Officer             │
  │  5. Document in system           │
  └──────────────────────────────────┘
       │
       ▼
  Link to Medical Visit / Incident
```

---

## Database Query Flow (Tenant & Location Isolation)

```
┌─────────────────────────────────────────────────────────────────┐
│ USER AUTHENTICATION                                             │
└─────────────────────────────────────────────────────────────────┘

  User logs in
       │
       ├─ Email: pharmacist@mine-a.com
       ├─ Password: ********
       │
       ▼
  ┌──────────────────────────────────┐
  │  AUTHENTICATION MIDDLEWARE       │
  │                                  │
  │  Verify credentials              │
  │  Retrieve user record            │
  │  Extract:                        │
  │  ├─ user_id: uuid-123            │
  │  ├─ tenant_id: mine-a-uuid       │
  │  └─ role: pharmacist             │
  └──────────────────────────────────┘
       │
       ▼
  ┌──────────────────────────────────┐
  │  SESSION MANAGEMENT              │
  │                                  │
  │  Retrieve session:               │
  │  ├─ session_token: abc123        │
  │  ├─ active_location_id: loc-1    │
  │  └─ active_location_name: "Main" │
  └──────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────┐
│ DATA QUERY WITH ISOLATION                                       │
└─────────────────────────────────────────────────────────────────┘

  API Request: GET /api/pharmacy/prescriptions
       │
       ▼
  ┌──────────────────────────────────────────────────────┐
  │  BACKEND QUERY CONSTRUCTION                          │
  │                                                      │
  │  SELECT * FROM prescriptions                         │
  │  WHERE tenant_id = 'mine-a-uuid'                     │
  │    AND (                                             │
  │      location_id = 'loc-1'                           │
  │      OR dispensing_location_id = 'loc-1'             │
  │    )                                                 │
  │  ORDER BY created_at DESC;                           │
  │                                                      │
  │  ↓                                                   │
  │  Automatic filtering by user's tenant and location   │
  │  Impossible to access other tenant's data            │
  │  Impossible to access other location's data          │
  └──────────────────────────────────────────────────────┘
       │
       ▼
  ┌──────────────────────────────────┐
  │  RESULTS                         │
  │                                  │
  │  Only prescriptions for:         │
  │  ✓ Current tenant (Mine A)       │
  │  ✓ Current location (Main)       │
  │                                  │
  │  Excluded:                       │
  │  ✗ Mine B prescriptions          │
  │  ✗ Shaft 3 prescriptions         │
  └──────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────┐
│ CROSS-LOCATION QUERY (Stock Transfers)                         │
└─────────────────────────────────────────────────────────────────┘

  API Request: GET /api/pharmacy/inventory (all locations)
       │
       ├─ Permission check: admin or pharmacy_manager role
       │
       ▼
  ┌──────────────────────────────────────────────────────┐
  │  QUERY WITH TENANT FILTER ONLY                       │
  │                                                      │
  │  SELECT                                              │
  │    i.*,                                              │
  │    cl.location_name                                  │
  │  FROM pharmacy_inventory i                           │
  │  JOIN care_locations cl ON i.location_id = cl.id    │
  │  WHERE i.tenant_id = 'mine-a-uuid'                   │
  │  ORDER BY cl.location_name, i.medication_name;       │
  │                                                      │
  │  ↓                                                   │
  │  Returns inventory for all locations within tenant   │
  │  Still tenant-isolated (no Mine B data)              │
  └──────────────────────────────────────────────────────┘
       │
       ▼
  ┌──────────────────────────────────┐
  │  RESULTS (Multi-Location)        │
  │                                  │
  │  Main Clinic:                    │
  │  ├─ Amoxicillin: 1679            │
  │  ├─ Paracetamol: 1800            │
  │  └─ ...                          │
  │                                  │
  │  Shaft 3 Station:                │
  │  ├─ Amoxicillin: 200             │
  │  ├─ Paracetamol: 250             │
  │  └─ ...                          │
  └──────────────────────────────────┘
```

---

## Audit Trail Structure

```
┌─────────────────────────────────────────────────────────────────┐
│ EVERY PHARMACY ACTION GENERATES AUDIT LOG                       │
└─────────────────────────────────────────────────────────────────┘

  Action: Dispense Prescription
       │
       ▼
  ┌──────────────────────────────────────────────────────────────┐
  │  AUDIT LOG ENTRY                                             │
  │                                                              │
  │  id: audit-uuid-789                                          │
  │  tenant_id: mine-a-uuid                                      │
  │  location_id: loc-1                                          │
  │                                                              │
  │  action_type: "prescription_dispensed"                       │
  │  entity_type: "prescription"                                 │
  │  entity_id: rx-uuid-456                                      │
  │                                                              │
  │  user_id: user-uuid-123                                      │
  │  user_name: "Pharmacist Jane"                                │
  │  user_role: "pharmacist"                                     │
  │                                                              │
  │  before_data: {                                              │
  │    "status": "ready",                                        │
  │    "dispensed_by": null,                                     │
  │    "dispensed_date": null                                    │
  │  }                                                           │
  │                                                              │
  │  after_data: {                                               │
  │    "status": "dispensed",                                    │
  │    "dispensed_by": "user-uuid-123",                          │
  │    "dispensed_date": "2025-10-11T14:30:00Z",                 │
  │    "patient_signature": "[base64_signature]"                 │
  │  }                                                           │
  │                                                              │
  │  changes_summary: "Prescription dispensed to patient"        │
  │                                                              │
  │  ip_address: "192.168.1.50"                                  │
  │  user_agent: "Mozilla/5.0..."                                │
  │  session_id: "session-abc123"                                │
  │                                                              │
  │  timestamp: "2025-10-11T14:30:15Z"                           │
  └──────────────────────────────────────────────────────────────┘

  ↓ Stored in pharmacy_audit_log table
  ↓ Immutable (no updates/deletes allowed)
  ↓ Retained for 7+ years
  ↓ Available for regulatory audits
```

---

## Reporting Dashboard Layout

```
┌─────────────────────────────────────────────────────────────────┐
│ PHARMACY OPERATIONS DASHBOARD                                   │
└─────────────────────────────────────────────────────────────────┘

  ┌──────────────────────┬──────────────────────┬─────────────────┐
  │  Today's Metrics     │  Prescription Queue  │  Critical       │
  │                      │                      │  Alerts         │
  │  📋 Prescriptions    │  ⏳ Pending: 3       │                 │
  │     Dispensed: 47    │  ✓ Verified: 5       │  🔴 CS          │
  │                      │  📦 Ready: 2         │     Discrepancy │
  │  💰 Revenue          │  ✅ Complete: 47     │                 │
  │     $3,240           │                      │  🟡 Low Stock   │
  │                      │  Avg Time: 28 min    │     (3 items)   │
  │  ⚠️ Interactions     │                      │                 │
  │     Flagged: 5       │                      │  🟡 Expiring    │
  │     Resolved: 5      │                      │     (7 items)   │
  └──────────────────────┴──────────────────────┴─────────────────┘

  ┌──────────────────────────────────────────────────────────────┐
  │  Dispensing Volume (Last 7 Days)                             │
  │                                                              │
  │    60 ┤                                            ●         │
  │    50 ┤                       ●          ●    ●              │
  │    40 ┤          ●       ●                                   │
  │    30 ┤     ●                                                │
  │    20 ┤                                                      │
  │    10 ┤                                                      │
  │     0 └─────┬────┬────┬────┬────┬────┬────┬────             │
  │          Mon  Tue  Wed  Thu  Fri  Sat  Sun  Today           │
  └──────────────────────────────────────────────────────────────┘

  ┌───────────────────────────────┬──────────────────────────────┐
  │  Top 10 Prescribed            │  Inventory Status            │
  │                               │                              │
  │  1. Paracetamol 500mg   47    │  Total Value: $125,450       │
  │  2. Amoxicillin 500mg   34    │  Items: 450                  │
  │  3. Ibuprofen 400mg     28    │  Low Stock: 3                │
  │  4. Omeprazole 20mg     22    │  Expiring 30d: 7             │
  │  5. Metformin 500mg     19    │  Expired: 0                  │
  │  6. Atorvastatin 10mg   16    │                              │
  │  7. Losartan 50mg       14    │  By Location:                │
  │  8. Amlodipine 5mg      12    │  • Main Clinic: $98,200      │
  │  9. Salbutamol inhaler  11    │  • Shaft 3: $27,250          │
  │ 10. Prednisolone 5mg    10    │                              │
  └───────────────────────────────┴──────────────────────────────┘

  ┌──────────────────────────────────────────────────────────────┐
  │  Controlled Substances Status                                │
  │                                                              │
  │  ✓ Last Count: 2025-10-11 07:15 (This Morning)              │
  │  ✓ All Balances Correct                                     │
  │  ✓ No Discrepancies                                         │
  │                                                              │
  │  Schedule II Items:                                         │
  │  • Morphine 15mg: 470 tablets                               │
  │  • Oxycodone 5mg: 285 tablets                               │
  │  • Hydromorphone 2mg: 120 tablets                           │
  │                                                              │
  │  [View Full CS Register →]                                  │
  └──────────────────────────────────────────────────────────────┘
```

---

*End of Visual Reference Document*

---

## Ghana-Specific Notes

This document has been adapted for the Ghana regulatory context:

- **DEA** references replaced with **NACOB** (Narcotics Control Board)
- **Pharmacy Council** license verification instead of state pharmacy boards
- **FDA Ghana** registration requirements
- **NHIS** (National Health Insurance Scheme) integration
- **Ghana EML** (Essential Medicines List) prioritization
- **Tropical climate** storage considerations
- **Multi-language** patient counseling (English, Twi, Ga, Ewe)
- **Ghana Data Protection Act** compliance instead of HIPAA
- **Minerals Commission** mining regulations instead of US MSHA

### Key Regulatory Bodies (Ghana):
1. **Pharmacy Council of Ghana** - Pharmacy practice regulation
2. **FDA Ghana** - Drug registration and safety
3. **NACOB** - Controlled medicines regulation
4. **Ghana Health Service** - Healthcare standards
5. **Minerals Commission** - Mining health & safety
6. **Data Protection Commission** - Privacy regulation

---

**Document Version:** 1.0.0 (Ghana Edition)  
**Last Updated:** October 11, 2025  
**Regulatory Framework:** Ghana  
**Related Documents:**  
- `PHARMACY_MODULE_PLAN.md` - Comprehensive plan (Ghana)  
- `PHARMACY_MODULE_SUMMARY.md` - Executive summary (Ghana)


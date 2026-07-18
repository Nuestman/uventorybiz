-- 2026-04-03 — Idempotent sample SOPs for every tenant: two published procedures and one draft template.
-- Uses deterministic codes (MAID-SEED-*) so re-runs skip existing rows.

DO $$
DECLARE
  r RECORD;
  doc_id VARCHAR;
  heat_html TEXT := $h$
<h2>Purpose</h2>
<p>This procedure defines how site health staff prevent, recognize, and respond to heat-related illness in surface and underground mining environments. It aligns with occupational health surveillance and emergency escalation requirements.</p>
<h2>Scope</h2>
<p>Applies to all employees and contractors during hot-season operations, high-exertion tasks, and confined or poorly ventilated work areas.</p>
<h2>Prevention</h2>
<ul>
<li>Schedule strenuous work during cooler periods where practicable.</li>
<li>Ensure ready access to cool drinking water and electrolyte replacement where indicated.</li>
<li>Acclimatize new or returning workers gradually over several shifts.</li>
<li>Train crews on early signs of heat exhaustion and heat stroke.</li>
</ul>
<h2>Field Response</h2>
<ol>
<li>Stop work safely; move the person to shade or a cooled area.</li>
<li>Cool actively (loosen clothing, fan, cool packs to neck/armpits/groin as appropriate).</li>
<li>Give small sips of water if conscious and not vomiting.</li>
<li>Escalate immediately if altered mental status, collapse, or core temperature concern—activate emergency medical response per site protocol.</li>
</ol>
<h2>Documentation</h2>
<p>Record incident details, interventions, and disposition in the occupational health record and incident system when criteria for reportable events are met.</p>
$h$;

  incident_html TEXT := $i$
<h2>Purpose</h2>
<p>Standardize immediate reporting, scene safety, and handoff of workplace incidents so investigations are timely, consistent, and legally defensible.</p>
<h2>Immediate Actions</h2>
<ol>
<li>Secure the scene and eliminate ongoing hazards without putting responders at risk.</li>
<li>Provide first aid or summon emergency services as required.</li>
<li>Preserve evidence: do not alter equipment or environment beyond what is necessary for safety unless approved by investigation lead.</li>
</ol>
<h2>Notification Ladder</h2>
<ul>
<li>Notify on-duty supervisor and health/safety within the timeframe defined by site rules.</li>
<li>Record a preliminary incident report in MineAid HMS with time, location, persons involved, and known injuries.</li>
<li>Escalate to statutory authorities when thresholds for notifiable events are met.</li>
</ul>
<h2>Investigation and Closure</h2>
<p>Assign an investigator, collect statements and photographs, identify root causes, define corrective actions with owners and due dates, and close the record only after verification of effectiveness.</p>
$i$;

  sats_triage_draft_html TEXT := $sats_triage$
<h2>Purpose</h2>
<p>This standard operating procedure defines clinical triage for all patients presenting to the mine site medical facility (clinic, surface aid post, or underground medical station), using the <strong>South African Triage Scale (SATS)</strong> methodology: a structured combination of an early warning score (vitals + AVPU), <strong>discriminators</strong> (high-risk presentations), and <strong>re-triage</strong> when the patient’s condition changes.</p>
<p><em>Align numerical thresholds, paediatric rules, and local escalation paths with your occupational health physician / medical director and statutory requirements.</em></p>

<h2>Scope</h2>
<ul>
<li>All presentations for acute illness or injury, including walk-ins, stretcher cases, and referrals from surface or underground emergency teams.</li>
<li>All qualified nurses and paramedics authorised to perform triage at this site.</li>
<li>Excludes mass-casualty incident command (use the site MCI plan); SATS principles still apply at the treatment unit level.</li>
</ul>

<h2>Definitions (SATS Priority Levels)</h2>
<p>SATS assigns one of five priority levels. Use the site colour coding and signage consistently.</p>
<table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse;width:100%;max-width:720px;">
<thead>
<tr><th>Priority</th><th>Colour</th><th>Clinical intent</th><th>Target time to clinician review (indicative)</th></tr>
</thead>
<tbody>
<tr><td>Emergency</td><td>Red</td><td>Immediate threat to life; resuscitation and immediate intervention.</td><td>Immediate</td></tr>
<tr><td>Very urgent</td><td>Orange</td><td>Potential threat to life, limb, or organ; rapid assessment and treatment.</td><td>≤ 10 minutes</td></tr>
<tr><td>Urgent</td><td>Yellow</td><td>Serious illness or injury; needs timely care but not immediate resuscitation.</td><td>≤ 60 minutes</td></tr>
<tr><td>Standard</td><td>Green</td><td>Minor illness or injury; routine care pathway.</td><td>≤ 120 minutes</td></tr>
<tr><td>Non-urgent</td><td>Blue</td><td>Very minor conditions suitable for advice, self-care, or scheduled review.</td><td>≤ 240 minutes or redirect</td></tr>
</tbody>
</table>
<p><em>Time targets are operational goals; always pull forward any patient whose condition worsens.</em></p>

<h2>Step 1 — First Look (Seconds)</h2>
<ol>
<li><strong>Scene safety</strong> for staff (hazardous chemicals, unstable structure, violence). Defer non-urgent care until safe.</li>
<li><strong>Catastrophic external haemorrhage</strong>: apply direct pressure / tourniquet per site trauma protocol; assign at least <strong>Very urgent (Orange)</strong> until controlled and re-triaged.</li>
<li><strong>Airway / breathing / circulation failure</strong> (obstructed airway, agonal breathing, absent pulse, unresponsive with abnormal breathing): treat as <strong>Emergency (Red)</strong> and activate emergency response.</li>
<li><strong>Walk-in able to speak in full sentences</strong> with no obvious distress: proceed to Step 2; do not assign Non-urgent until vitals and discriminators are complete.</li>
</ol>

<h2>Step 2 — Triage Early Warning Score (TEWS)</h2>
<p>Record <strong>respiratory rate (RR)</strong>, <strong>heart rate (HR)</strong>, <strong>temperature</strong> (tympanic or oral per protocol), <strong>SpO₂</strong> on room air (note if on supplemental oxygen), and <strong>AVPU</strong> (Alert / responds to Voice / responds to Pain / Unresponsive).</p>
<p>Use your approved SATS TEWS chart (adult). In summary, each parameter is scored; the <strong>total TEWS score</strong> maps to a triage band before discriminators are applied:</p>
<ul>
<li><strong>TEWS 0–4</strong> — usually <strong>Standard (Green)</strong> if no discriminator applies.</li>
<li><strong>TEWS 5–6</strong> — usually <strong>Urgent (Yellow)</strong> if no discriminator applies.</li>
<li><strong>TEWS ≥ 7</strong> — usually <strong>Very urgent (Orange)</strong> if no discriminator applies.</li>
</ul>
<p><strong>AVPU:</strong> Anything other than <strong>Alert</strong> is abnormal; <strong>Unresponsive</strong> or <strong>Pain only</strong> with abnormal vitals requires escalation to at least <strong>Very urgent</strong> pending full assessment.</p>
<p><strong>SpO₂:</strong> Values below your site threshold for oxygen therapy (commonly &lt; 92% on room air in adults at sea level—adjust for altitude and local policy) require oxygen and up-triage unless corrected and stable.</p>

<h2>Step 3 — Discriminators (Override or Up-Triage)</h2>
<p>Even with a low TEWS, certain presentations require <strong>Very urgent (Orange)</strong> or <strong>Emergency (Red)</strong>. Non-exhaustive list—use your site discriminator card:</p>
<ul>
<li><strong>Emergency (Red)</strong> examples: cardiac arrest, obstructed airway, severe respiratory distress with cyanosis, shock, major uncontrolled bleeding, altered consciousness with threatened airway, anaphylaxis with airway compromise.</li>
<li><strong>Very urgent (Orange)</strong> examples: chest pain suspicious for ACS, stroke symptoms (FAST), severe shortness of breath, moderate–severe bleeding, poisoning with symptoms, high-risk pregnancy complications, crush injury to limb, high-voltage electrical injury, immersion/submersion with respiratory symptoms, temperature &gt; 40 °C or &lt; 35 °C with symptoms.</li>
<li><strong>Mine-specific</strong>: suspected heat stroke; blast injury; fall from height; confined-space exposure with altered consciousness; chemical splash to eyes or airway; any underground evacuation with abnormal vitals.</li>
</ul>
<p><strong>Rule:</strong> If a discriminator applies, assign at least the listed priority even if TEWS is low. If both TEWS and discriminators conflict, choose the <strong>higher</strong> acuity.</p>

<h2>Step 4 — Assign Final SATS Priority</h2>
<ol>
<li>Compute TEWS band from vitals + AVPU.</li>
<li>Apply highest applicable discriminator.</li>
<li>Take the <strong>more urgent</strong> of the two.</li>
<li>Document priority, score, and discriminator codes on the triage sheet / electronic record.</li>
<li>Apply <strong>pain score</strong> where used at your facility; severe uncontrolled pain may up-triage per local rule.</li>
</ol>

<h2>Paediatrics and Special Populations</h2>
<p>Use <strong>paediatric SATS charts</strong> (age-specific RR/HR bands) for children. Pregnant patients: use obstetric discriminators (e.g. antepartum bleeding, severe abdominal pain). Frail or immunocompromised patients may warrant up-triage at the nurse’s discretion.</p>

<h2>Re-Triage</h2>
<ul>
<li>Reassess vitals and priority if the patient waits longer than the target time, develops new symptoms, or reports worsening pain or shortness of breath.</li>
<li>After any intervention (fluids, oxygen, analgesia), repeat AVPU and key vitals and adjust priority if indicated.</li>
</ul>

<h2>Handover and Documentation</h2>
<p>At transfer to the treating clinician or referral facility, communicate: <strong>SATS priority</strong>, <strong>TEWS score</strong>, <strong>discriminators</strong>, allergies, medications given, oxygen and monitoring, mechanism (for trauma), and GCS/AVPU trend. Record the same in the patient record and, where applicable, MineAid HMS.</p>

<h2>Quality and Training</h2>
<p>Annual competency assessment on SATS for all triage staff; audit agreement between triage priority and final diagnosis quarterly; update this SOP when national SATS guidance or site medical director policy changes.</p>
$sats_triage$;

BEGIN
  FOR r IN SELECT id FROM tenants
  LOOP
    -- Published: heat stress
    IF NOT EXISTS (
      SELECT 1 FROM tenant_sop_documents d
      WHERE d.tenant_id = r.id AND d.code = 'MAID-SEED-HSE-HEAT'
    ) THEN
      INSERT INTO tenant_sop_documents (
        tenant_id, title, code, department, is_archived, created_at, updated_at, created_by_user_id
      ) VALUES (
        r.id,
        'Heat stress prevention and emergency response',
        'MAID-SEED-HSE-HEAT',
        'Safety',
        false,
        NOW(),
        NOW(),
        NULL
      ) RETURNING id INTO doc_id;

      INSERT INTO tenant_sop_versions (
        document_id, version_number, status, content_html,
        change_notes, created_at, created_by_user_id,
        submitted_at, approved_at, approved_by_user_id
      ) VALUES (
        doc_id, 1, 'published', heat_html,
        'MineAid HMS seed content — replace with site-specific wording.',
        NOW(), NULL, NOW(), NOW(), NULL
      );
    END IF;

    -- Published: incident reporting
    IF NOT EXISTS (
      SELECT 1 FROM tenant_sop_documents d
      WHERE d.tenant_id = r.id AND d.code = 'MAID-SEED-HSE-INCIDENT'
    ) THEN
      INSERT INTO tenant_sop_documents (
        tenant_id, title, code, department, is_archived, created_at, updated_at, created_by_user_id
      ) VALUES (
        r.id,
        'Workplace incident reporting and investigation',
        'MAID-SEED-HSE-INCIDENT',
        'Safety',
        false,
        NOW(),
        NOW(),
        NULL
      ) RETURNING id INTO doc_id;

      INSERT INTO tenant_sop_versions (
        document_id, version_number, status, content_html,
        change_notes, created_at, created_by_user_id,
        submitted_at, approved_at, approved_by_user_id
      ) VALUES (
        doc_id, 1, 'published', incident_html,
        'MineAid HMS seed content — align with your jurisdiction and company policy.',
        NOW(), NULL, NOW(), NOW(), NULL
      );
    END IF;

    -- Draft: clinical triage template
    IF NOT EXISTS (
      SELECT 1 FROM tenant_sop_documents d
      WHERE d.tenant_id = r.id AND d.code = 'MAID-SEED-CLN-SATS-TRIAGE'
    ) THEN
      INSERT INTO tenant_sop_documents (
        tenant_id, title, code, department, is_archived, created_at, updated_at, created_by_user_id
      ) VALUES (
        r.id,
        'Clinical triage at the mine medical facility',
        'MAID-SEED-CLN-SATS-TRIAGE',
        'Medical',
        false,
        NOW(),
        NOW(),
        NULL
      ) RETURNING id INTO doc_id;

      INSERT INTO tenant_sop_versions (
        document_id, version_number, status, content_html,
        change_notes, created_at, created_by_user_id
      ) VALUES (
        doc_id, 1, 'draft', sats_triage_draft_html,
        'Draft template — complete and submit for approval when ready.',
        NOW(), NULL
      );
    END IF;
  END LOOP;
END $$;

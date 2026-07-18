import type { GlucoseContext } from "@shared/glucose";

/** Fields stored on each vital-sign row (chart data keys). */
export type VitalStorageKey =
  | "heartRate"
  | "temperature"
  | "respiratoryRate"
  | "bloodPressureSystolic"
  | "bloodPressureDiastolic"
  | "oxygenSaturation"
  | "glucoseLevel"
  | "painScore"
  | "weight"
  | "height";

/** Detail-page and trend-toggle keys (includes derived metrics). */
export type VitalMetricKey = VitalStorageKey | "bloodPressure" | "bmi";

export type VitalChartDataKey = VitalStorageKey | "glucoseFbs" | "glucoseRbs" | "bmi";

export type VitalChartSeriesLine = {
  key: VitalChartDataKey;
  label: string;
  color: string;
};

export type VitalSignRow = {
  id: string;
  recordedAt: string;
  source?: "clinic" | "patient_self" | string;
  heartRate: number | null;
  temperature: string | null;
  respiratoryRate: number | null;
  bloodPressureSystolic: number | null;
  bloodPressureDiastolic: number | null;
  oxygenSaturation: number | null;
  glucoseLevel: number | null;
  glucoseContext?: GlucoseContext | null;
  painScore: number | null;
  weight: string | null;
  height: string | null;
};

export type VitalEducationLink = {
  label: string;
  url: string;
};

export type VitalMetricDef = {
  key: VitalMetricKey;
  label: string;
  shortLabel: string;
  unit: string;
  color: string;
  axisGroup: string;
  defaultOn: boolean;
  /** Compact reference for trend tiles and headers, e.g. "95-100% (RA)". */
  referenceRangeShort?: string;
  /** When set, the trends chart draws multiple lines (e.g. systolic + diastolic for BP). */
  chartSeries?: VitalChartSeriesLine[];
  education: {
    summary: string;
    normalRange?: string;
    whyItMatters: string;
    howItsMeasured?: string;
    whenToSeekCare?: string;
    unitNote?: string;
    tips: string[];
    links: VitalEducationLink[];
  };
};

export const VITAL_METRICS: VitalMetricDef[] = [
  {
    key: "heartRate",
    label: "Heart rate",
    shortLabel: "HR",
    unit: "bpm",
    color: "#dc2626",
    axisGroup: "bpm",
    defaultOn: true,
    referenceRangeShort: "60-100 bpm",
    education: {
      summary:
        "Heart rate (pulse) is the number of times your heart beats each minute. It is one of the most basic vital signs and reflects how hard your cardiovascular system is working to deliver oxygen-rich blood to your brain, muscles, and organs.",
      normalRange:
        "For most healthy adults at rest, 60–100 beats per minute (bpm) is typical. Well-trained athletes may have resting rates in the 40s–50s. Rates can legitimately rise with activity, heat, pain, anxiety, caffeine, or illness.",
      whyItMatters:
        "A heart that beats too fast (tachycardia), too slow (bradycardia), or irregularly may indicate dehydration, infection, blood loss, thyroid problems, heart rhythm disorders, or medication effects. In mining and industrial settings, abnormal heart rate together with dizziness or chest symptoms can affect safety on heavy equipment or at height.",
      howItsMeasured:
        "Clinic staff usually count beats at the wrist or neck, or use a pulse oximeter / monitor. You should be seated and resting for at least one minute when a resting rate is recorded.",
      whenToSeekCare:
        "Seek urgent care for chest pain, fainting, severe shortness of breath, or a very fast pulse at rest (often above 120–130 bpm) with feeling unwell. Contact your occupational health team for persistent palpitations or repeated abnormal readings.",
      tips: [
        "Avoid strenuous activity, smoking, and large amounts of caffeine for 30 minutes before comparing readings.",
        "Fever, pain, and stress commonly raise heart rate temporarily — note how you felt when the reading was taken.",
        "If you wear a fitness tracker, compare trends rather than single numbers; clinical monitors are the reference at visits.",
        "Tell staff about heart medicines, stimulants, and any history of arrhythmia.",
      ],
      links: [
        { label: "CDC — Heart disease basics", url: "https://www.cdc.gov/heart-disease/about/" },
        { label: "NIH — How the heart works", url: "https://www.nhlbi.nih.gov/health/heart" },
        { label: "American Heart Association — Target heart rates", url: "https://www.heart.org/en/healthy-living/fitness/fitness-basics/target-heart-rates" },
      ],
    },
  },
  {
    key: "temperature",
    label: "Temperature",
    shortLabel: "Temp",
    unit: "°C",
    color: "#ea580c",
    axisGroup: "celsius",
    defaultOn: true,
    referenceRangeShort: "36.1-37.2 °C",
    education: {
      summary:
        "Body temperature reflects your core heat balance — the result of heat produced by metabolism and heat lost to the environment. uventorybiz records temperature in degrees Celsius (°C), which is the standard in most countries.",
      normalRange:
        "Typical adult range is about 36.1–37.2 °C (97–99 °F) depending on site (oral, tympanic, axillary) and time of day. A reading of 38 °C (100.4 °F) or higher is generally considered a fever in adults.",
      whyItMatters:
        "Fever often signals infection or inflammation and may affect fitness for duty until the cause is known. Low body temperature (hypothermia) can occur with severe illness, shock, or cold exposure — both extremes matter in remote or outdoor worksites.",
      howItsMeasured:
        "Common methods include tympanic (ear), oral, temporal (forehead), or axillary (underarm) thermometers. Site and technique affect results slightly; your clinic uses a consistent method when possible.",
      whenToSeekCare:
        "Seek urgent care for fever with confusion, stiff neck, rash, difficulty breathing, or persistent vomiting. Very high fever (above 39.5 °C / 103 °F), fever lasting more than three days, or fever after international travel should be assessed promptly.",
      tips: [
        "Wait 15–20 minutes after hot or cold drinks before oral measurements.",
        "Note recent heat exposure, night shifts, or heavy PPE — these can influence readings at work.",
        "Track the trend: a single mild elevation may resolve; repeated elevations warrant follow-up.",
      ],
      links: [
        { label: "Mayo Clinic — Fever", url: "https://www.mayoclinic.org/diseases-conditions/fever/symptoms-causes/syc-20352759" },
        { label: "NHS — High temperature in adults", url: "https://www.nhs.uk/conditions/fever-in-adults/" },
        { label: "WHO — Heat and health", url: "https://www.who.int/news-room/fact-sheets/detail/climate-change-heat-and-health" },
      ],
    },
  },
  {
    key: "respiratoryRate",
    label: "Respiratory rate",
    shortLabel: "RR",
    unit: "/min",
    color: "#0891b2",
    axisGroup: "bpm",
    defaultOn: false,
    referenceRangeShort: "12-20 /min",
    education: {
      summary:
        "Respiratory rate is the number of breaths you take per minute. It is sometimes overlooked but is among the earliest signs of respiratory or metabolic distress — alongside oxygen saturation and how you feel.",
      normalRange: "Healthy adults at rest usually breathe about 12–20 times per minute. Children and infants have higher normal rates.",
      whyItMatters:
        "Fast breathing (tachypnea) may reflect lung infection, asthma, heart failure, pain, anxiety, acidosis, or low oxygen. Slow or labored breathing can indicate sedation, neurological injury, or fatigue from severe illness — all relevant before returning to physically demanding work.",
      howItsMeasured:
        "Staff count chest rises for one full minute while you sit quietly, or use automated monitors in acute settings. Talking or exertion during measurement will raise the count.",
      whenToSeekCare:
        "Call emergency services for severe breathlessness, blue lips or fingernails, inability to speak full sentences, or breathing rate persistently above 24–28 at rest with distress.",
      tips: [
        "Sit upright, breathe normally, and avoid speaking during the count.",
        "If you have known lung disease, compare to your usual baseline and action plan.",
        "Report cough, wheeze, or chest tightness together with rate changes.",
      ],
      links: [
        { label: "NIH — Lung health & diseases", url: "https://www.nhlbi.nih.gov/health/lungs" },
        { label: "WHO — Chronic respiratory diseases", url: "https://www.who.int/health-topics/chronic-respiratory-diseases" },
        { label: "CDC — COPD basics", url: "https://www.cdc.gov/copd/about/index.html" },
      ],
    },
  },
  {
    key: "bloodPressure",
    label: "Blood pressure",
    shortLabel: "BP",
    unit: "mmHg",
    color: "#7c3aed",
    axisGroup: "mmHg",
    defaultOn: true,
    chartSeries: [
      { key: "bloodPressureSystolic", label: "Systolic", color: "#7c3aed" },
      { key: "bloodPressureDiastolic", label: "Diastolic", color: "#a855f7" },
    ],
    referenceRangeShort: "<120/80 mmHg",
    education: {
      summary:
        "Blood pressure measures the force of blood against artery walls. It is recorded as two numbers: systolic (top) when the heart contracts, and diastolic (bottom) when it relaxes — for example 120/80 mmHg. Mean arterial pressure (MAP) is a calculated average that reflects overall perfusion pressure.",
      normalRange:
        "General adult guidance (subject to local guidelines): systolic below 120 mmHg and diastolic below 80 mmHg is often cited as normal. MAP is typically about 70–100 mmHg. Elevated or hypertensive ranges should be interpreted by a clinician over repeated readings.",
      whyItMatters:
        "Long-term high blood pressure (hypertension) damages arteries and increases risk of stroke, heart attack, kidney disease, and vision loss. MAP helps clinicians assess organ perfusion, especially in acute care. Trend data helps occupational health teams manage fitness for duty and treatment plans.",
      howItsMeasured:
        "Usually with an upper-arm cuff (manual or automated). You should be seated, feet flat, back supported, arm at heart level, and rested for several minutes. Cuff size and technique matter. MAP is not measured directly — it is calculated from systolic and diastolic when both are recorded.",
      whenToSeekCare:
        "Seek emergency care for systolic above 180 mmHg or diastolic above 120 mmHg with chest pain, headache, vision changes, or confusion. Discuss repeated readings above your clinician's target at routine follow-up.",
      unitNote:
        "MAP (mean arterial pressure) = diastolic + (systolic − diastolic) ÷ 3, equivalent to (2 × diastolic + systolic) ÷ 3. It estimates average arterial pressure during one heartbeat. Values are shown in the reading history when both systolic and diastolic are available.",
      tips: [
        "Avoid caffeine, smoking, and exercise for 30 minutes before measurement when possible.",
        "One high reading does not diagnose hypertension — patterns over time matter.",
        "Take prescribed blood pressure medicines as directed; do not skip doses before clinic visits unless advised.",
        "Home monitors can help; bring a log to appointments.",
      ],
      links: [
        { label: "CDC — High blood pressure", url: "https://www.cdc.gov/high-blood-pressure/about/" },
        { label: "American Heart Association", url: "https://www.heart.org/en/health-topics/high-blood-pressure" },
        { label: "NIH — DASH eating plan", url: "https://www.nhlbi.nih.gov/education/dash-eating-plan" },
      ],
    },
  },
  {
    key: "oxygenSaturation",
    label: "Oxygen saturation (SpO₂)",
    shortLabel: "SpO₂",
    unit: "%",
    color: "#2563eb",
    axisGroup: "percent",
    defaultOn: true,
    referenceRangeShort: "95-100% (RA)",
    education: {
      summary:
        "SpO₂ estimates what percentage of hemoglobin in your blood is carrying oxygen. It is measured non-invasively with a pulse oximeter — usually clipped to a fingertip — and is a key marker of lung and circulatory function.",
      normalRange:
        "For healthy adults at sea level, 95–100% is typical. People with chronic lung disease may have a lower personal baseline set by their specialist. Altitude and poor perfusion can affect readings.",
      whyItMatters:
        "Low oxygen saturation means organs may not receive enough oxygen. At worksites with dust, fumes, or strenuous exertion, falling SpO₂ with symptoms can indicate serious lung problems, altitude illness, or heart strain.",
      howItsMeasured:
        "A sensor passes light through the nail bed; nail polish, cold hands, shivering, or dark skin pigmentation can occasionally affect accuracy. Staff may use alternate sites (earlobe) if needed.",
      whenToSeekCare:
        "Seek urgent care if SpO₂ is below 92% persistently, or any reading below 90%, especially with breathlessness, chest pain, or confusion. Sudden drops from your normal baseline warrant immediate assessment.",
      tips: [
        "Warm your hands and sit still during measurement.",
        "If you have COPD or sleep apnea, know your target range from your clinician — not everyone should aim for 99%.",
        "Report exposure to smoke, chemicals, or high altitude when discussing results.",
      ],
      links: [
        { label: "FDA — Pulse oximeter accuracy & limits", url: "https://www.fda.gov/medical-devices/home-health-and-consumer-devices/pulse-oximeters" },
        { label: "NIH — Pulse oximetry", url: "https://www.nhlbi.nih.gov/health/pulse-oximeter" },
        { label: "American Lung Association", url: "https://www.lung.org/lung-health-diseases" },
      ],
    },
  },
  {
    key: "glucoseLevel",
    label: "Blood glucose",
    shortLabel: "Glucose",
    unit: "mmol/L",
    color: "#ca8a04",
    axisGroup: "glucose",
    defaultOn: false,
    chartSeries: [
      { key: "glucoseFbs", label: "FBS (fasting)", color: "#ca8a04" },
      { key: "glucoseRbs", label: "RBS (random)", color: "#d97706" },
    ],
    referenceRangeShort: "FBS 3.9-5.5 mmol/L",
    education: {
      summary:
        "Blood glucose is the concentration of sugar (glucose) in your blood at the time of testing. Glucose is the body's main energy source; levels are regulated by insulin and other hormones. uventorybiz stores glucose in millimoles per litre (mmol/L), the standard unit in the UK, Ghana, and many other countries.",
      normalRange:
        "Typical fasting (FBS) reference for adults without diabetes: about 3.9–5.5 mmol/L (70–99 mg/dL). Random (RBS) results depend on when you last ate — always interpret with test type (FBS vs RBS) and clinical context. Diabetes targets are individualized.",
      whyItMatters:
        "High glucose over time damages blood vessels, nerves, kidneys, and eyes. Very low glucose (hypoglycaemia) can cause confusion, collapse, or seizures — critical for safety-sensitive roles. Recording FBS vs RBS helps clinicians judge whether a result is expected or concerning.",
      howItsMeasured:
        "Usually a finger-prick capillary test or laboratory blood draw. Staff may record whether the sample was fasting (FBS — typically no food for ~8 hours) or random (RBS — taken without fasting rules).",
      whenToSeekCare:
        "Seek urgent help for glucose below 3.0 mmol/L with shakiness, sweating, or confusion, or above 20 mmol/L with vomiting and dehydration. Report repeated fasting values above 7.0 mmol/L or random values above 11.1 mmol/L to your care team for formal evaluation.",
      unitNote:
        "To convert mmol/L to mg/dL (used in some countries and home meters), multiply by 18. Example: 5.5 mmol/L ≈ 99 mg/dL. To convert mg/dL to mmol/L, divide by 18.",
      tips: [
        "Always note whether you were fasting — comparing a random lunch-time reading to a fasting target is misleading.",
        "Illness, stress, steroids, and poor sleep can temporarily raise glucose.",
        "If you have diabetes, follow your personal targets and bring your home log to clinic visits.",
        "Do not skip meals before heavy physical work if you are prone to low sugar.",
      ],
      links: [
        { label: "CDC — Diabetes overview", url: "https://www.cdc.gov/diabetes/about/" },
        { label: "NIH — Diabetes & blood glucose", url: "https://www.niddk.nih.gov/health-information/diabetes" },
        { label: "Diabetes UK — Blood sugar units", url: "https://www.diabetes.org.uk/guide-to-diabetes/managing-your-diabetes/testing/blood-sugar-units" },
      ],
    },
  },
  {
    key: "painScore",
    label: "Pain score",
    shortLabel: "Pain",
    unit: "/10",
    color: "#db2777",
    axisGroup: "score",
    defaultOn: false,
    education: {
      summary:
        "The numeric pain score (often 0–10) is a standardized way to describe pain intensity. Zero means no pain; ten means the worst pain imaginable. It helps track change over time when words like 'moderate' can mean different things to different people.",
      normalRange:
        "There is no single 'normal' — the goal is the lowest comfortable level for your situation. Post-injury or post-surgery pain may be higher initially and should improve with treatment.",
      whyItMatters:
        "Pain affects sleep, mood, concentration, and safe operation of equipment. Trends show whether treatment, rest, physiotherapy, or duty modification is working. Sudden increases may signal complications.",
      howItsMeasured:
        "You rate your current pain when asked, usually at rest and sometimes with movement. Be consistent: compare to your own prior scores using the same scale.",
      whenToSeekCare:
        "Seek urgent care for sudden severe pain (8–10/10), chest or abdominal pain, pain with limb weakness or numbness, or pain after trauma that is worsening despite rest.",
      tips: [
        "Describe location, character (sharp, dull, burning), and triggers (movement, cough, heat/cold).",
        "Note what relieves pain — rest, medication, splinting — so staff can adjust care.",
        "Do not ignore increasing pain while waiting for a scheduled follow-up.",
      ],
      links: [
        { label: "NIH — Pain", url: "https://www.niams.nih.gov/health-topics/pain" },
        { label: "CDC — Pain management options", url: "https://www.cdc.gov/opioids/patients/index.html" },
        { label: "WHO — Rehabilitation & pain", url: "https://www.who.int/health-topics/rehabilitation" },
      ],
    },
  },
  {
    key: "weight",
    label: "Weight",
    shortLabel: "Weight",
    unit: "kg",
    color: "#059669",
    axisGroup: "mass",
    defaultOn: false,
    education: {
      summary:
        "Body weight in kilograms (kg) is tracked to monitor nutrition, hydration status, medication dosing (where weight-based), and occupational fitness. Single readings matter less than trends over weeks and months.",
      normalRange:
        "Healthy weight ranges depend on height, age, sex, muscle mass, and ethnicity. Body Mass Index (BMI) uses height and weight together — discuss what is appropriate for you with a clinician rather than relying on a single number.",
      whyItMatters:
        "Unintentional weight loss can signal malnutrition, chronic illness, or mental health problems. Rapid gain may reflect fluid retention or metabolic change. In industrial health programmes, weight trends support wellness, heat stress planning, and PPE fit.",
      howItsMeasured:
        "Calibrated clinic scales, ideally same time of day, similar clothing, after voiding when comparing serial weights.",
      whenToSeekCare:
        "Discuss unintentional loss of more than 5% of body weight over 6–12 months, or rapid gain with ankle swelling or breathlessness.",
      tips: [
        "Weigh under consistent conditions — morning, before breakfast, similar clothing.",
        "Muscle gain from training can increase weight without excess fat.",
        "Combine weight with how you feel, appetite, and activity level when reviewing trends.",
      ],
      links: [
        { label: "CDC — Healthy weight", url: "https://www.cdc.gov/healthy-weight-growth/" },
        { label: "NIH — Weight management", url: "https://www.nhlbi.nih.gov/health/educational/lose_wt/index.htm" },
        { label: "WHO — Obesity & overweight", url: "https://www.who.int/health-topics/obesity" },
      ],
    },
  },
  {
    key: "height",
    label: "Height",
    shortLabel: "Height",
    unit: "cm",
    color: "#0d9488",
    axisGroup: "length",
    defaultOn: false,
    education: {
      summary:
        "Height in centimetres (cm) is measured standing straight without shoes. In adults it is relatively stable; in adolescents it tracks growth. Combined with weight it supports BMI and some medication dosing calculations.",
      normalRange:
        "Adult height should be stable year to year. Apparent small changes are usually measurement variation or posture, not true growth.",
      whyItMatters:
        "Accurate height ensures correct BMI interpretation and appropriate dosing where weight and size matter. Occupational medical assessments may use height for PPE sizing and ergonomic evaluation.",
      howItsMeasured:
        "Stadiometer or wall-mounted tape with patient standing, heels together, looking straight ahead. Two readings may be averaged.",
      whenToSeekCare:
        "Height loss in older adults associated with back pain may suggest spinal compression — discuss with a clinician if noticed over time.",
      tips: [
        "Remove heavy headgear and stand fully upright for measurement.",
        "For children and adolescents, serial height plots growth velocity — adults should see stable values.",
      ],
      links: [
        { label: "CDC — About BMI", url: "https://www.cdc.gov/bmi/about/index.html" },
        { label: "WHO — Growth charts", url: "https://www.who.int/tools/child-growth-standards" },
      ],
    },
  },
  {
    key: "bmi",
    label: "Body mass index (BMI)",
    shortLabel: "BMI",
    unit: "kg/m²",
    color: "#047857",
    axisGroup: "bmi",
    defaultOn: false,
    referenceRangeShort: "18.5-24.9 kg/m²",
    education: {
      summary:
        "BMI is a derived measure from weight and height on the same reading: weight in kilograms divided by height in metres squared (kg/m²). It is a screening tool for weight category, not a direct measure of body fat or fitness.",
      normalRange:
        "For most adults, 18.5–24.9 kg/m² is often cited as the healthy range. Under 18.5 may indicate underweight; 25–29.9 overweight; 30 and above obesity — thresholds vary by ethnicity and muscle mass. Discuss your target with a clinician.",
      whyItMatters:
        "BMI trends alongside weight help occupational health teams monitor nutrition, metabolic risk, and wellness programmes. Athletes and very muscular workers may have a higher BMI without excess fat.",
      howItsMeasured:
        "Calculated automatically when both weight (kg) and height (cm) are recorded on the same vital-sign entry. No separate measurement is needed.",
      whenToSeekCare:
        "Discuss rapid unintentional BMI change, or BMI in underweight or obese ranges with associated symptoms, at occupational or primary care visits.",
      tips: [
        "Use consistent conditions for weight and height when comparing serial BMI.",
        "Combine BMI with waist circumference and how you feel when reviewing health risk.",
        "Muscle gain from training can raise BMI without increasing fat.",
      ],
      links: [
        { label: "CDC — About BMI", url: "https://www.cdc.gov/bmi/about/index.html" },
        { label: "WHO — Obesity & overweight", url: "https://www.who.int/health-topics/obesity" },
        { label: "NIH — BMI calculator", url: "https://www.nhlbi.nih.gov/health/educational/lose_wt/BMI/bmicalc.htm" },
      ],
    },
  },
];

export const VITAL_STORAGE_KEYS: VitalStorageKey[] = [
  "heartRate",
  "temperature",
  "respiratoryRate",
  "bloodPressureSystolic",
  "bloodPressureDiastolic",
  "oxygenSaturation",
  "glucoseLevel",
  "painScore",
  "weight",
  "height",
];

export const VITAL_METRIC_MAP = Object.fromEntries(
  VITAL_METRICS.map((m) => [m.key, m]),
) as Record<VitalMetricKey, VitalMetricDef>;

const LEGACY_BP_DETAIL_ALIASES: Record<string, VitalMetricKey> = {
  bloodPressureSystolic: "bloodPressure",
  bloodPressureDiastolic: "bloodPressure",
};

/** Resolve URL param to a detail-page metric (includes legacy BP sys/dia aliases). */
export function resolveVitalMetricKey(value: string): VitalMetricKey | null {
  if (value in LEGACY_BP_DETAIL_ALIASES) {
    return LEGACY_BP_DETAIL_ALIASES[value];
  }
  if (value in VITAL_METRIC_MAP) {
    return value as VitalMetricKey;
  }
  return null;
}

export function isVitalMetricKey(value: string): value is VitalMetricKey {
  return resolveVitalMetricKey(value) != null;
}

export const DEFAULT_VISIBLE_VITALS: VitalMetricKey[] = VITAL_METRICS.filter((m) => m.defaultOn).map(
  (m) => m.key,
);

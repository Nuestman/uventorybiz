import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { MedicationImageUpload } from "@/components/medications/MedicationImageUpload";
import {
  WORK_FITNESS_CASE_TYPES,
  WORK_FITNESS_CONTEXT_REASONS,
  workFitnessCaseTypeLabel,
} from "@shared/workFitness";
import {
  emptyWorkFitnessMedication,
  computeExpectedEndDate,
  type ReferralFacilityOption,
  type WorkFitnessCaseFormValues,
  type WorkFitnessMedicationFormValues,
} from "@/lib/workFitnessForm";

function MedicationBlock({
  med,
  index,
  onChange,
  onRemove,
  canRemove,
  referralFacilities,
  prescriberFacilitySelectValue,
  onPrescriberFacilitySelectChange,
  showSideEffects,
  imageUploadTarget = "staff",
}: {
  med: WorkFitnessMedicationFormValues;
  index: number;
  onChange: (patch: Partial<WorkFitnessMedicationFormValues>) => void;
  onRemove: () => void;
  canRemove: boolean;
  referralFacilities: ReferralFacilityOption[];
  prescriberFacilitySelectValue: string;
  onPrescriberFacilitySelectChange: (selectValue: string, facilityName: string) => void;
  showSideEffects: boolean;
  imageUploadTarget?: "staff" | "portal";
}) {
  const ongoingId = `wf-med-ongoing-${index}`;
  const noSeId = `wf-med-no-se-${index}`;

  return (
    <div className="rounded-lg border border-gray-200 p-3 space-y-3 bg-white">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-gray-900">Medication {index + 1}</p>
        {canRemove ? (
          <Button type="button" variant="ghost" size="sm" onClick={onRemove} className="text-red-600 h-8">
            <Trash2 className="h-3.5 w-3.5 mr-1" />
            Remove
          </Button>
        ) : null}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-700">
            Medication name<span className="text-red-500">*</span>
          </label>
          <Input
            value={med.medicationName}
            onChange={(e) => onChange({ medicationName: e.target.value })}
            placeholder="e.g. Co-codamol"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-700">Generic name</label>
          <Input
            value={med.genericName}
            onChange={(e) => onChange({ genericName: e.target.value })}
            placeholder="e.g. Paracetamol + Codeine"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-700">Strength</label>
          <Input value={med.strength} onChange={(e) => onChange({ strength: e.target.value })} placeholder="e.g. 500/8 mg" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-700">Frequency</label>
          <Input value={med.frequency} onChange={(e) => onChange({ frequency: e.target.value })} placeholder="e.g. Twice daily" />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-700">Prescribed for</label>
        <Textarea
          value={med.prescribedFor}
          onChange={(e) => onChange({ prescribedFor: e.target.value })}
          placeholder="Condition or reason for this medication"
          rows={2}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-700">Prescriber</label>
          <Input value={med.prescriberName} onChange={(e) => onChange({ prescriberName: e.target.value })} />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-700">Prescriber facility</label>
          <Select
            value={prescriberFacilitySelectValue}
            onValueChange={(val) => {
              if (val === "__manual") {
                onPrescriberFacilitySelectChange(val, "");
              } else {
                const facility = referralFacilities.find((f) => f.id === val);
                onPrescriberFacilitySelectChange(val, facility?.name ?? "");
              }
            }}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Select facility" />
            </SelectTrigger>
            <SelectContent>
              {referralFacilities.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.name}
                </SelectItem>
              ))}
              <SelectItem value="__manual">Other / manual entry</SelectItem>
            </SelectContent>
          </Select>
          {prescriberFacilitySelectValue === "__manual" ? (
            <Input
              value={med.prescriberFacility}
              onChange={(e) => onChange({ prescriberFacility: e.target.value })}
              className="mt-1"
              placeholder="Clinic or hospital"
            />
          ) : null}
        </div>
      </div>

      <MedicationImageUpload
        value={med.medicationImageUrl}
        onChange={(url) => onChange({ medicationImageUrl: url })}
        onClear={() => onChange({ medicationImageUrl: "" })}
        uploadTarget={imageUploadTarget}
      />

      {showSideEffects ? (
        <div className="space-y-2 rounded-md bg-amber-50/60 border border-amber-100 p-3">
          <p className="text-xs font-medium text-amber-900">Side effects you are experiencing</p>
          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
            <input
              id={noSeId}
              type="checkbox"
              checked={med.employeeNoSideEffects}
              onChange={(e) => onChange({ employeeNoSideEffects: e.target.checked, employeeSideEffects: "" })}
              className="h-4 w-4 rounded border-gray-300"
            />
            I am not experiencing any side effects from this medication
          </label>
          {!med.employeeNoSideEffects ? (
            <Textarea
              value={med.employeeSideEffects}
              onChange={(e) => onChange({ employeeSideEffects: e.target.value })}
              placeholder="e.g. drowsiness, dizziness, nausea — describe how you feel"
              rows={2}
            />
          ) : null}
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-700">Start date</label>
          <Input type="date" value={med.startDate} onChange={(e) => onChange({ startDate: e.target.value })} />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-700">How many days?</label>
          <Input
            type="number"
            min={1}
            value={med.durationDays}
            onChange={(e) => onChange({ durationDays: e.target.value, isOngoing: false })}
            disabled={med.isOngoing}
            placeholder="e.g. 7"
          />
          {!med.isOngoing && med.startDate && med.durationDays ? (
            <p className="text-[11px] text-muted-foreground">
              Last day:{" "}
              {computeExpectedEndDate(med.startDate, med.durationDays, false) ?? "—"}
            </p>
          ) : null}
        </div>
        <div className="flex items-start gap-2 pt-5">
          <input
            id={ongoingId}
            type="checkbox"
            checked={med.isOngoing}
            onChange={(e) =>
              onChange({
                isOngoing: e.target.checked,
                durationDays: e.target.checked ? "" : med.durationDays,
              })
            }
            className="h-4 w-4 rounded border-gray-300 mt-0.5"
          />
          <label htmlFor={ongoingId} className="text-sm text-gray-700 leading-snug">
            Long-term / chronic (refilled regularly, no fixed end date)
          </label>
        </div>
      </div>
    </div>
  );
}

export function WorkFitnessCaseFormFields({
  values,
  onChange,
  referralFacilities,
  prescriberFacilitySelectValues,
  onPrescriberFacilitySelectChange,
  showEmployeeContext = true,
  showSideEffects = true,
  imageUploadTarget = "staff",
}: {
  values: WorkFitnessCaseFormValues;
  onChange: (patch: Partial<WorkFitnessCaseFormValues>) => void;
  referralFacilities: ReferralFacilityOption[];
  prescriberFacilitySelectValues: string[];
  onPrescriberFacilitySelectChange: (index: number, selectValue: string, facilityName: string) => void;
  showEmployeeContext?: boolean;
  showSideEffects?: boolean;
  imageUploadTarget?: "staff" | "portal";
}) {
  const updateMedication = (index: number, patch: Partial<WorkFitnessMedicationFormValues>) => {
    const next = values.medications.map((m, i) => (i === index ? { ...m, ...patch } : m));
    onChange({ medications: next });
  };

  return (
    <div className="space-y-4 py-2">
      {showEmployeeContext ? (
        <>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-700">Reason for this declaration</label>
            <Select
              value={values.caseType}
              onValueChange={(val) => onChange({ caseType: val as WorkFitnessCaseFormValues["caseType"] })}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WORK_FITNESS_CASE_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {workFitnessCaseTypeLabel(t)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-700">What happened / why are you reporting?</label>
            <Select
              value={values.contextReasonPreset || "unset"}
              onValueChange={(val) =>
                onChange({
                  contextReasonPreset: val === "unset" ? "" : val,
                  ...(val !== "__other__" ? { contextNotes: "" } : {}),
                })
              }
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unset">Select a reason…</SelectItem>
                {WORK_FITNESS_CONTEXT_REASONS.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {values.contextReasonPreset === "__other__" ? (
              <Textarea
                value={values.contextNotes}
                onChange={(e) => onChange({ contextNotes: e.target.value })}
                placeholder="Briefly describe what happened"
                rows={2}
                className="mt-2"
              />
            ) : null}
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-700">How are you feeling overall?</label>
            <Textarea
              value={values.employeeFeelingNotes}
              onChange={(e) => onChange({ employeeFeelingNotes: e.target.value })}
              placeholder="Describe your general wellbeing and any concerns about returning to work"
              rows={2}
            />
          </div>
        </>
      ) : null}

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-gray-900">Medications</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              onChange({ medications: [...values.medications, { ...emptyWorkFitnessMedication() }] })
            }
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add medication
          </Button>
        </div>
        {values.medications.map((med, index) => (
          <MedicationBlock
            key={index}
            med={med}
            index={index}
            onChange={(patch) => updateMedication(index, patch)}
            onRemove={() => onChange({ medications: values.medications.filter((_, i) => i !== index) })}
            canRemove={values.medications.length > 1}
            referralFacilities={referralFacilities}
            prescriberFacilitySelectValue={prescriberFacilitySelectValues[index] ?? ""}
            onPrescriberFacilitySelectChange={(selectValue, facilityName) =>
              onPrescriberFacilitySelectChange(index, selectValue, facilityName)
            }
            showSideEffects={showSideEffects}
            imageUploadTarget={imageUploadTarget}
          />
        ))}
      </div>
    </div>
  );
}

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PortalModalShell } from "@/portal/components/PortalModalShell";
import { PortalSymptomTypeMultiSelect } from "@/portal/components/PortalSymptomTypeMultiSelect";
import { useToast } from "@/hooks/use-toast";
import {
  SYMPTOM_DURATION_PRESETS,
  SYMPTOM_QUALITY_PRESETS,
  SYMPTOM_SEVERITY_LABELS,
  type SymptomLogRow,
  type SymptomTypeRow,
} from "@/lib/symptoms/symptomCatalog";
import { isOtherSymptomCode } from "@shared/symptomCatalog";
import type { PortalSymptomLogPayload } from "@/types/offlineSymptoms";
import {
  createPortalSymptomLogsBatchOfflineFirst,
  fetchPortalSymptomTypesOfflineFirst,
  isBrowserOffline,
  PORTAL_SYMPTOM_LOGS_QUERY_KEY,
  PORTAL_SYMPTOM_TYPES_QUERY_KEY,
  updatePortalSymptomLogOfflineFirst,
} from "@/lib/offlineSymptoms";
import { usePortalSession } from "@/portal/usePortalSession";

export type SymptomLogFormValues = {
  symptomTypeIds: string[];
  recordedAtLocal: string;
  severity: number;
  bodyLocation: string;
  radiation: string;
  durationMinutes: number | null;
  symptomQuality: string;
  provocation: string;
  palliation: string;
  notes: string;
  customSymptomName: string;
};

export function emptySymptomLogForm(): SymptomLogFormValues {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const local = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
  return {
    symptomTypeIds: [],
    recordedAtLocal: local,
    severity: 3,
    bodyLocation: "",
    radiation: "",
    durationMinutes: null,
    symptomQuality: "",
    provocation: "",
    palliation: "",
    notes: "",
    customSymptomName: "",
  };
}

function formFromRow(row: SymptomLogRow): SymptomLogFormValues {
  const d = new Date(row.recordedAt);
  const pad = (n: number) => String(n).padStart(2, "0");
  const isOther = isOtherSymptomCode(row.symptomCode);
  return {
    symptomTypeIds: [row.symptomTypeId],
    recordedAtLocal: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`,
    severity: row.severity,
    bodyLocation: row.bodyLocation ?? "",
    radiation: row.radiation ?? "",
    durationMinutes: row.durationMinutes,
    symptomQuality: row.symptomQuality ?? "",
    provocation: row.provocation ?? "",
    palliation: row.palliation ?? "",
    notes: isOther ? "" : (row.notes ?? ""),
    customSymptomName: isOther ? (row.notes ?? row.symptomLabel ?? "") : "",
  };
}

function sharedPayloadFromForm(form: SymptomLogFormValues): Omit<PortalSymptomLogPayload, "symptomTypeId" | "notes"> {
  return {
    recordedAt: new Date(form.recordedAtLocal).toISOString(),
    severity: form.severity,
    bodyLocation: form.bodyLocation.trim() || null,
    radiation: form.radiation.trim() || null,
    durationMinutes: form.durationMinutes,
    symptomQuality: form.symptomQuality.trim() || null,
    provocation: form.provocation.trim() || null,
    palliation: form.palliation.trim() || null,
  };
}

type PortalLogSymptomModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editRow?: SymptomLogRow | null;
};

function OpqrstSection({
  letter,
  title,
  children,
}: {
  letter: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50/60 p-3 space-y-2">
      <p className="text-xs font-semibold text-gray-900 flex items-center gap-2">
        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-teal-100 text-[10px] text-teal-900">
          {letter}
        </span>
        {title}
      </p>
      {children}
    </div>
  );
}

export function PortalLogSymptomModal({ open, onOpenChange, editRow }: PortalLogSymptomModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { session } = usePortalSession();
  const patientId = session?.user.patientId ?? "";
  const [form, setForm] = useState<SymptomLogFormValues>(emptySymptomLogForm);
  const isEdit = !!editRow;

  const { data: types = [] } = useQuery<SymptomTypeRow[]>({
    queryKey: PORTAL_SYMPTOM_TYPES_QUERY_KEY,
    queryFn: fetchPortalSymptomTypesOfflineFirst,
    enabled: open && !!patientId,
  });

  useEffect(() => {
    if (open) {
      setForm(editRow ? formFromRow(editRow) : emptySymptomLogForm());
    }
  }, [open, editRow]);

  const selectedTypes = useMemo(
    () => types.filter((t) => form.symptomTypeIds.includes(t.id)),
    [types, form.symptomTypeIds],
  );

  const includesOther = selectedTypes.some((t) => isOtherSymptomCode(t.code));

  const saveMutation = useMutation({
    mutationFn: async () => {
      const shared = sharedPayloadFromForm(form);
      if (isEdit && editRow) {
        const type = types.find((t) => t.id === form.symptomTypeIds[0]);
        const isOther = type && isOtherSymptomCode(type.code);
        const payload: PortalSymptomLogPayload = {
          ...shared,
          symptomTypeId: form.symptomTypeIds[0],
          notes: isOther ? form.customSymptomName.trim() || null : form.notes.trim() || null,
        };
        return updatePortalSymptomLogOfflineFirst(patientId, editRow.id, payload, types);
      }

      const payloads: PortalSymptomLogPayload[] = form.symptomTypeIds.map((symptomTypeId) => {
        const type = types.find((t) => t.id === symptomTypeId);
        const isOther = type && isOtherSymptomCode(type.code);
        return {
          ...shared,
          symptomTypeId,
          notes: isOther ? form.customSymptomName.trim() || null : form.notes.trim() || null,
        };
      });
      return createPortalSymptomLogsBatchOfflineFirst(patientId, payloads, types);
    },
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: PORTAL_SYMPTOM_LOGS_QUERY_KEY });
      const rows = Array.isArray(result) ? result : [result];
      const offline = rows.some((row) => row.pendingSync) || isBrowserOffline();
      const count = rows.length;
      toast({
        title: isEdit ? "Symptom updated" : count > 1 ? `${count} symptoms logged` : "Symptom logged",
        description: offline
          ? "Saved on this device — will sync when you're back online."
          : "Shared with your care team.",
      });
      onOpenChange(false);
      setForm(emptySymptomLogForm());
    },
    onError: (e: Error) => {
      toast({ title: "Could not save", description: e.message.replace(/^\d+:\s*/, ""), variant: "destructive" });
    },
  });

  const canSubmit =
    form.symptomTypeIds.length > 0 &&
    form.severity >= 1 &&
    form.severity <= 5 &&
    (!includesOther || form.customSymptomName.trim().length > 0);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setForm(emptySymptomLogForm());
      }}
    >
      <DialogContent className="portal-root portal-ui max-w-lg border-0 bg-transparent p-0 shadow-none sm:max-w-lg [&>button]:hidden">
        <PortalModalShell
          title={isEdit ? "Edit symptom log" : "Log symptoms (OPQRST)"}
          subtitle="Structured self-reported symptoms are shared with your care team."
          onClose={() => onOpenChange(false)}
          footer={
            <button
              type="button"
              className="portal-btn-primary w-full py-3"
              disabled={!canSubmit || saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
            >
              {saveMutation.isPending ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving…
                </span>
              ) : isEdit ? (
                "Save changes"
              ) : form.symptomTypeIds.length > 1 ? (
                `Save ${form.symptomTypeIds.length} symptom logs`
              ) : (
                "Save symptom log"
              )}
            </button>
          }
        >
          <div className="space-y-4 max-h-[min(70vh,640px)] overflow-y-auto pr-1">
            <div className="space-y-2">
              <Label>{isEdit ? "Symptom" : "Symptoms"}</Label>
              <PortalSymptomTypeMultiSelect
                types={types}
                selectedIds={form.symptomTypeIds}
                onChange={(ids) => setForm((f) => ({ ...f, symptomTypeIds: ids }))}
                disabled={isEdit}
              />
              {isEdit ? (
                <p className="text-xs text-mineaid-gray">Symptom type cannot be changed when editing.</p>
              ) : null}
            </div>

            {includesOther ? (
              <div className="space-y-2">
                <Label htmlFor="symptom-custom-name">Other symptom name (required)</Label>
                <Input
                  id="symptom-custom-name"
                  value={form.customSymptomName}
                  onChange={(e) => setForm((f) => ({ ...f, customSymptomName: e.target.value }))}
                  placeholder="e.g. ear pain, toothache, numbness"
                  maxLength={120}
                />
              </div>
            ) : null}

            <OpqrstSection letter="O" title="Onset — when did it start?">
              <Input
                id="symptom-when"
                type="datetime-local"
                value={form.recordedAtLocal}
                onChange={(e) => setForm((f) => ({ ...f, recordedAtLocal: e.target.value }))}
              />
            </OpqrstSection>

            <OpqrstSection letter="P" title="Provocation & palliation">
              <div className="space-y-2">
                <Label htmlFor="symptom-provocation" className="text-xs text-mineaid-gray">
                  What makes it worse? (optional)
                </Label>
                <Input
                  id="symptom-provocation"
                  value={form.provocation}
                  onChange={(e) => setForm((f) => ({ ...f, provocation: e.target.value }))}
                  placeholder="e.g. movement, deep breath, after eating"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="symptom-palliation" className="text-xs text-mineaid-gray">
                  What makes it better? (optional)
                </Label>
                <Input
                  id="symptom-palliation"
                  value={form.palliation}
                  onChange={(e) => setForm((f) => ({ ...f, palliation: e.target.value }))}
                  placeholder="e.g. rest, medication, ice"
                />
              </div>
            </OpqrstSection>

            <OpqrstSection letter="Q" title="Quality — what does it feel like?">
              <div className="flex flex-wrap gap-1.5">
                {SYMPTOM_QUALITY_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    className={`rounded-full border px-2.5 py-1 text-[11px] ${
                      form.symptomQuality === preset
                        ? "border-[var(--portal-primary,#0d9488)] bg-teal-50 text-teal-900 font-medium"
                        : "border-gray-200 bg-white text-gray-600"
                    }`}
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        symptomQuality: f.symptomQuality === preset ? "" : preset,
                      }))
                    }
                  >
                    {preset}
                  </button>
                ))}
              </div>
              <Input
                id="symptom-quality"
                value={form.symptomQuality}
                onChange={(e) => setForm((f) => ({ ...f, symptomQuality: e.target.value }))}
                placeholder="Or describe in your own words"
                maxLength={120}
              />
            </OpqrstSection>

            <OpqrstSection letter="R" title="Region & radiation">
              <div className="space-y-2">
                <Label htmlFor="symptom-location" className="text-xs text-mineaid-gray">
                  Body region (optional)
                </Label>
                <Input
                  id="symptom-location"
                  value={form.bodyLocation}
                  onChange={(e) => setForm((f) => ({ ...f, bodyLocation: e.target.value }))}
                  placeholder="e.g. chest, left knee"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="symptom-radiation" className="text-xs text-mineaid-gray">
                  Radiation — does it spread? (optional)
                </Label>
                <Input
                  id="symptom-radiation"
                  value={form.radiation}
                  onChange={(e) => setForm((f) => ({ ...f, radiation: e.target.value }))}
                  placeholder="e.g. into left arm, up to jaw"
                />
              </div>
            </OpqrstSection>

            <OpqrstSection letter="S" title="Severity">
              <div className="grid grid-cols-5 gap-2">
                {[1, 2, 3, 4, 5].map((level) => (
                  <button
                    key={level}
                    type="button"
                    className={`rounded-md border px-1 py-2 text-[10px] leading-tight sm:text-xs ${
                      form.severity === level
                        ? "border-[var(--portal-primary,#0d9488)] bg-teal-50 text-teal-900 font-medium"
                        : "border-gray-200 bg-white text-gray-600"
                    }`}
                    onClick={() => setForm((f) => ({ ...f, severity: level }))}
                  >
                    {level}
                    <span className="block mt-0.5 opacity-80">{SYMPTOM_SEVERITY_LABELS[level]}</span>
                  </button>
                ))}
              </div>
            </OpqrstSection>

            <OpqrstSection letter="T" title="Time — how long has it lasted?">
              <Select
                value={form.durationMinutes != null ? String(form.durationMinutes) : "none"}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, durationMinutes: v === "none" ? null : parseInt(v, 10) }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not specified</SelectItem>
                  {SYMPTOM_DURATION_PRESETS.map((p) => (
                    <SelectItem key={p.value} value={String(p.value)}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </OpqrstSection>

            {!includesOther ? (
              <div className="space-y-2">
                <Label htmlFor="symptom-notes">Additional notes (optional)</Label>
                <Textarea
                  id="symptom-notes"
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  placeholder="Anything else your care team should know"
                />
              </div>
            ) : null}
          </div>
        </PortalModalShell>
      </DialogContent>
    </Dialog>
  );
}

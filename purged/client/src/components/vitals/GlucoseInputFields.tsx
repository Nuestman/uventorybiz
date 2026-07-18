import {
  GLUCOSE_CONTEXT_OPTIONS,
  type GlucoseContext,
  parseGlucoseLevelInput,
} from "@shared/glucose";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type GlucoseInputFieldsProps = {
  levelId?: string;
  contextId?: string;
  levelName?: string;
  contextName?: string;
  levelValue?: number | string;
  contextValue?: GlucoseContext | "" | null;
  onLevelChange?: (value: number | undefined) => void;
  onContextChange?: (value: GlucoseContext | "") => void;
  levelDefaultValue?: string | number;
  contextDefaultValue?: string;
  /** When true, render native inputs for uncontrolled form submit. */
  nativeForm?: boolean;
  compact?: boolean;
};

export function GlucoseInputFields({
  levelId = "glucoseLevel",
  contextId = "glucoseContext",
  levelName = "glucoseLevel",
  contextName = "glucoseContext",
  levelValue,
  contextValue,
  onLevelChange,
  onContextChange,
  levelDefaultValue,
  contextDefaultValue,
  nativeForm = false,
  compact = false,
}: GlucoseInputFieldsProps) {
  const gridClass = compact ? "grid grid-cols-2 gap-2" : "grid grid-cols-1 sm:grid-cols-2 gap-2";

  return (
    <div className={gridClass}>
      <div>
        <Label htmlFor={levelId} className="text-xs font-medium text-gray-600">
          Glucose (mmol/L)
        </Label>
        {nativeForm ? (
          <Input
            id={levelId}
            name={levelName}
            type="number"
            step="0.1"
            min={0}
            defaultValue={levelDefaultValue ?? ""}
            placeholder="e.g. 5.5"
            className="mt-1 h-9"
          />
        ) : (
          <Input
            id={levelId}
            type="number"
            step="0.1"
            min={0}
            placeholder="e.g. 5.5"
            className="mt-1 h-9"
            value={levelValue === undefined || levelValue === "" ? "" : levelValue}
            onChange={(e) => onLevelChange?.(parseGlucoseLevelInput(e.target.value))}
          />
        )}
      </div>
      <div>
        <Label htmlFor={contextId} className="text-xs font-medium text-gray-600">
          Test type
        </Label>
        {nativeForm ? (
          <select
            id={contextId}
            name={contextName}
            defaultValue={contextDefaultValue ?? ""}
            className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
          >
            <option value="">Not specified</option>
            {GLUCOSE_CONTEXT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        ) : (
          <Select
            value={contextValue || "none"}
            onValueChange={(v) => onContextChange?.(v === "none" ? "" : (v as GlucoseContext))}
          >
            <SelectTrigger id={contextId} className="mt-1 h-9">
              <SelectValue placeholder="Not specified" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Not specified</SelectItem>
              {GLUCOSE_CONTEXT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  );
}

import { Checkbox } from "@/components/ui/checkbox";
import {
  formatSymptomCategoryLabel,
  groupSymptomTypesByCategory,
  type SymptomTypeRow,
} from "@/lib/symptoms/symptomCatalog";
import { isOtherSymptomCode } from "@shared/symptomCatalog";

type PortalSymptomTypeMultiSelectProps = {
  types: SymptomTypeRow[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
};

export function PortalSymptomTypeMultiSelect({
  types,
  selectedIds,
  onChange,
  disabled = false,
}: PortalSymptomTypeMultiSelectProps) {
  const grouped = groupSymptomTypesByCategory(types);
  const categories = [...grouped.keys()].sort((a, b) => a.localeCompare(b));

  const toggle = (id: string, checked: boolean) => {
    if (disabled) return;
    if (checked) {
      onChange([...selectedIds, id]);
      return;
    }
    onChange(selectedIds.filter((value) => value !== id));
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-mineaid-gray">
        Select one or more symptoms you are experiencing now.
        {selectedIds.length > 0 ? (
          <span className="font-medium text-gray-700"> {selectedIds.length} selected</span>
        ) : null}
      </p>
      {categories.map((category) => {
        const items = grouped.get(category) ?? [];
        return (
          <div key={category} className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              {formatSymptomCategoryLabel(category)}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {items.map((type) => {
                const checked = selectedIds.includes(type.id);
                return (
                  <label
                    key={type.id}
                    className={`flex items-start gap-2.5 rounded-md border px-3 py-2.5 text-sm cursor-pointer transition-colors ${
                      checked
                        ? "border-[var(--portal-primary,#0d9488)] bg-teal-50/60"
                        : "border-gray-200 bg-white hover:border-gray-300"
                    } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
                  >
                    <Checkbox
                      checked={checked}
                      disabled={disabled}
                      onCheckedChange={(value) => toggle(type.id, value === true)}
                      className="mt-0.5"
                    />
                    <span className="leading-snug text-gray-900">
                      {type.label}
                      {isOtherSymptomCode(type.code) ? (
                        <span className="block text-[10px] text-mineaid-gray font-normal">
                          Not listed above
                        </span>
                      ) : null}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

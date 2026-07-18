import type { Control, FieldValues, Path } from "react-hook-form";
import { HelpCircle } from "lucide-react";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export type HealthProfileFieldKey = "allergies" | "medicalHistory" | "medications" | "disability" | "notes";

/**
 * Allergies, medical history, home medications, disability, and general notes — shared by
 * registration forms and patient detail editor.
 *
 * Optional `hints` show a help tooltip next to each label (e.g. patient portal guidance).
 * Use inside a `TooltipProvider` (e.g. wrap the portal profile page).
 */
export function PatientHealthProfileFields<T extends FieldValues>({
  control,
  hints,
}: {
  control: Control<T>;
  hints?: Partial<Record<HealthProfileFieldKey, string>>;
}) {
  const field = (name: Path<T>, key: HealthProfileFieldKey, label: string, placeholder: string) => {
    const tip = hints?.[key];
    return (
      <FormField
        key={String(name)}
        control={control}
        name={name}
        render={({ field: f }) => (
          <FormItem>
            <FormLabel className="flex items-center gap-1.5">
              {label}
              {tip ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex rounded-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label={`About ${label}`}
                    >
                      <HelpCircle className="h-4 w-4 shrink-0" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-sm text-left">
                    {tip}
                  </TooltipContent>
                </Tooltip>
              ) : null}
            </FormLabel>
            <FormControl>
              <Textarea
                placeholder={placeholder}
                {...f}
                value={typeof f.value === "string" ? f.value : f.value == null ? "" : String(f.value)}
                rows={3}
                className="resize-y min-h-[4.5rem]"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    );
  };

  const inner = (
    <div className="space-y-4">
      {field("allergies" as Path<T>, "allergies", "Allergies", "e.g. Penicillin, peanuts, latex — or None known")}
      {field("medicalHistory" as Path<T>, "medicalHistory", "Medical history", "e.g. Hypertension, diabetes, asthma — chronic conditions")}
      {field("medications" as Path<T>, "medications", "Current medications", "Ongoing or home medications (not visit-specific)")}
      {field("disability" as Path<T>, "disability", "Disability / accessibility", "Relevant disability or accommodation needs")}
      {field("notes" as Path<T>, "notes", "Additional notes", "Other patient record notes")}
    </div>
  );

  return inner;
}

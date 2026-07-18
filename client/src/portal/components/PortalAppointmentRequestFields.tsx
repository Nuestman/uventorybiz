import type { UseFormReturn } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { PortalAppointmentRequestForm } from "../portalAppointmentRequestForm";

type CareLocationOption = { id: string; locationName: string; isPrimary?: boolean };

type PortalAppointmentRequestFieldsProps = {
  form: UseFormReturn<PortalAppointmentRequestForm>;
  idPrefix: string;
  careLocations: CareLocationOption[];
  /** Use portal modal field styling */
  variant?: "default" | "portal";
  /** Step 2: date + time slots instead of datetime-local */
  dateValue?: string;
  onDateChange?: (date: string) => void;
  selectedTime?: string | null;
  onTimeSelect?: (slot: string) => void;
  timeSlots?: string[];
  showDateTime?: boolean;
  showReason?: boolean;
};

function fieldClass(variant: "default" | "portal") {
  return variant === "portal" ? "portal-input-field" : undefined;
}

export function PortalAppointmentRequestFields({
  form,
  idPrefix,
  careLocations,
  variant = "default",
  dateValue,
  onDateChange,
  selectedTime,
  onTimeSelect,
  timeSlots,
  showDateTime = true,
  showReason = true,
}: PortalAppointmentRequestFieldsProps) {
  const modality = form.watch("preferredModality");
  const inputClass = fieldClass(variant);
  const fields = (
    <>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-modality`}>Visit type</Label>
        <Select
          value={modality}
          onValueChange={(v) => {
            form.setValue("preferredModality", v as "in_person" | "telehealth");
            if (v === "telehealth") form.setValue("preferredLocationId", "");
          }}
        >
          <SelectTrigger id={`${idPrefix}-modality`} className={inputClass}>
            <SelectValue placeholder="Choose in-person or telehealth" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="in_person">In person on site</SelectItem>
            <SelectItem value="telehealth">Telehealth (video visit)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {modality === "in_person" && careLocations.length > 0 ? (
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-location`}>Preferred care location</Label>
          <Select
            value={form.watch("preferredLocationId") || undefined}
            onValueChange={(v) => form.setValue("preferredLocationId", v)}
          >
            <SelectTrigger id={`${idPrefix}-location`} className={inputClass}>
              <SelectValue placeholder="Select location" />
            </SelectTrigger>
            <SelectContent>
              {careLocations.map((loc) => (
                <SelectItem key={loc.id} value={loc.id}>
                  {loc.locationName}
                  {loc.isPrimary ? " (primary)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      {showDateTime ? (
        onDateChange && timeSlots && onTimeSelect ? (
          <>
            <div className="space-y-2">
              <Label htmlFor={`${idPrefix}-date`}>Preferred date</Label>
              <Input
                id={`${idPrefix}-date`}
                type="date"
                className={inputClass}
                value={dateValue ?? ""}
                onChange={(e) => onDateChange(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Available times</Label>
              <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                {timeSlots.map((slot) => {
                  const [h, m] = slot.split(":").map(Number);
                  const label = new Date(2000, 0, 1, h, m).toLocaleTimeString([], {
                    hour: "numeric",
                    minute: "2-digit",
                  });
                  return (
                    <button
                      key={slot}
                      type="button"
                      className="portal-time-slot"
                      data-selected={selectedTime === slot ? "true" : "false"}
                      onClick={() => onTimeSelect(slot)}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-datetime`}>Preferred date & time</Label>
            <Input
              id={`${idPrefix}-datetime`}
              type="datetime-local"
              className={inputClass}
              {...form.register("preferredDateTime")}
            />
          </div>
        )
      ) : null}

      {showReason ? (
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-reason`}>Reason / notes</Label>
          <Textarea
            id={`${idPrefix}-reason`}
            rows={3}
            className={inputClass}
            placeholder="Briefly describe why you need this visit"
            {...form.register("reason")}
          />
        </div>
      ) : null}
    </>
  );

  if (variant === "portal") {
    return <div className="portal-form-fields space-y-4">{fields}</div>;
  }

  return fields;
}

import type { ReactNode } from "react";

export function formatDashboardDate(date = new Date()): string {
  return date
    .toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    })
    .toUpperCase();
}

export function timeOfDayGreeting(firstName: string, date = new Date()): string {
  const hour = date.getHours();
  const salutation = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const name = firstName.trim() || "there";
  return `${salutation}, ${name}`;
}

export function DashboardGreeting({
  firstName,
  action,
}: {
  firstName: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase mb-1.5">
          {formatDashboardDate()}
        </p>
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
          {timeOfDayGreeting(firstName)}
        </h1>
      </div>
      {action ? <div className="shrink-0 w-full sm:w-auto">{action}</div> : null}
    </div>
  );
}

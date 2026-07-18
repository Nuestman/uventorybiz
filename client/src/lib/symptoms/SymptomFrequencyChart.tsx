import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { format, parseISO } from "date-fns";
import { groupSymptomCountsByDay, type SymptomLogRow } from "@/lib/symptoms/symptomCatalog";

type SymptomFrequencyChartProps = {
  rows: SymptomLogRow[];
  className?: string;
};

export function SymptomFrequencyChart({ rows, className }: SymptomFrequencyChartProps) {
  const data = groupSymptomCountsByDay(rows).map((point) => ({
    ...point,
    label: format(parseISO(point.date), "MMM d"),
  }));

  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground py-6 text-center">No entries in this period.</p>;
  }

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={28} />
          <Tooltip
            formatter={(value: number) => [`${value} log${value === 1 ? "" : "s"}`, "Entries"]}
            labelFormatter={(label) => String(label)}
          />
          <Bar dataKey="count" fill="var(--portal-primary, #0d9488)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

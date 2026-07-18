import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  formatSymptomSeverity,
  getSymptomOpqrstDetails,
  severityBadgeClass,
  type SymptomLogRow,
} from "@/lib/symptoms/symptomCatalog";
import { isOtherSymptomCode } from "@shared/symptomCatalog";
import { formatDateTime } from "@/portal/portalUi";
import { Pencil, Trash2 } from "lucide-react";

type PortalSymptomLogCardProps = {
  row: SymptomLogRow;
  onEdit?: (row: SymptomLogRow) => void;
  onDelete?: (row: SymptomLogRow) => void;
};

export function PortalSymptomLogCard({ row, onEdit, onDelete }: PortalSymptomLogCardProps) {
  const opqrstDetails = getSymptomOpqrstDetails(row);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-semibold text-gray-900">{row.symptomLabel}</p>
          <p className="text-xs text-mineaid-gray">
            Onset: {formatDateTime(row.recordedAt)}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="outline" className={`text-[10px] border ${severityBadgeClass(row.severity)}`}>
            {formatSymptomSeverity(row.severity)}
          </Badge>
          {row.pendingSync ? (
            <Badge variant="secondary" className="text-[10px] text-amber-800 bg-amber-50 border-amber-200">
              Pending sync
            </Badge>
          ) : null}
          <Badge variant="secondary" className="text-[10px]">
            Self-reported
          </Badge>
        </div>
      </div>

      {opqrstDetails.length > 0 ? (
        <dl className="grid gap-1.5 sm:grid-cols-2 text-xs">
          {opqrstDetails.map((item) => (
            <div key={item.label} className="min-w-0">
              <dt className="text-mineaid-gray">{item.label}</dt>
              <dd className="text-gray-800">{item.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {row.notes && !isOtherSymptomCode(row.symptomCode) ? (
        <p className="text-sm text-gray-700 whitespace-pre-wrap">
          <span className="text-xs font-medium text-mineaid-gray">Notes: </span>
          {row.notes}
        </p>
      ) : null}

      {row.canEdit && (onEdit || onDelete) ? (
        <div className="flex gap-2 pt-1">
          {onEdit ? (
            <Button type="button" variant="outline" size="sm" className="h-8 gap-1" onClick={() => onEdit(row)}>
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Button>
          ) : null}
          {onDelete ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 gap-1 text-red-600 hover:text-red-700"
              onClick={() => onDelete(row)}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

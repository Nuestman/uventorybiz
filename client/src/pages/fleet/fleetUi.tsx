import { Badge } from "@/components/ui/badge";

export const OPS_LABELS: Record<string, string> = {
  available: "Available",
  deployed: "Deployed",
  standby: "Standby",
  out_of_service: "Out of service",
};

const TX_LABELS: Record<string, string> = {
  receipt_external: "Receipt (external)",
  receipt_transfer: "Receipt (transfer)",
  issue_to_client: "Issue to client",
  issue_internal: "Issue (internal)",
  adjustment_increase: "Adjustment +",
  adjustment_decrease: "Adjustment −",
  transfer_out: "Transfer out",
  transfer_in: "Transfer in",
  return_from_client: "Return from client",
  return_to_supplier: "Return to supplier",
  disposal: "Disposal",
  requisition: "Requisition",
  receipt: "Receipt",
};

export function formatInventoryTransactionType(t: string): string {
  return TX_LABELS[t] ?? t.replace(/_/g, " ");
}

export function OpsBadge({ status }: { status?: string | null }) {
  if (!status) return <span className="text-muted-foreground">—</span>;
  const variant =
    status === "available"
      ? "default"
      : status === "deployed"
        ? "secondary"
        : status === "standby"
          ? "outline"
          : "destructive";
  return (
    <Badge variant={variant as "default" | "secondary" | "outline" | "destructive"}>
      {OPS_LABELS[status] ?? status}
    </Badge>
  );
}

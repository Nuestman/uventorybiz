import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Video, MapPin } from "lucide-react";

type CareLocation = { id: string; locationName: string; locationCode: string; isPrimary?: boolean };

type PortalRequestRow = {
  id: string;
  status: string;
  preferredDate: string | null;
  preferredTimeWindow: string | null;
  preferredModality: string | null;
  preferredLocationId?: string | null;
  reason: string | null;
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    employeeNumber: string;
  };
};

function modalityBadge(modality?: string | null) {
  if (modality === "telehealth") {
    return (
      <Badge variant="secondary" className="gap-1">
        <Video className="h-3 w-3" /> Telehealth
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-1">
      <MapPin className="h-3 w-3" /> In person
    </Badge>
  );
}

export default function PortalAppointmentRequestsPanel() {
  const { toast } = useToast();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [declineId, setDeclineId] = useState<string | null>(null);
  const [appointmentDate, setAppointmentDate] = useState("");
  const [locationId, setLocationId] = useState("");
  const [staffNotes, setStaffNotes] = useState("");

  const { data: requestsData, isLoading } = useQuery<PortalRequestRow[]>({
    queryKey: ["/api/portal-appointment-requests", "list"],
    queryFn: async () => {
      const res = await fetch("/api/portal-appointment-requests?status=pending", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load portal requests");
      const data = (await res.json()) as unknown;
      return Array.isArray(data) ? data : [];
    },
  });
  const requests = Array.isArray(requestsData) ? requestsData : [];

  const { data: careLocations = [] } = useQuery<CareLocation[]>({
    queryKey: ["/api/care-locations", { locationKind: "fixed_site" }],
    queryFn: async () => {
      const res = await fetch("/api/care-locations?locationKind=fixed_site", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load care locations");
      return res.json();
    },
  });

  const confirmMutation = useMutation({
    mutationFn: async (requestId: string) => {
      if (!appointmentDate) throw new Error("Set appointment date and time");
      const active = requests.find((r) => r.id === requestId);
      const isInPerson = active?.preferredModality !== "telehealth";
      if (isInPerson && !locationId) throw new Error("Select a care location for in-person visits");
      await apiRequest("POST", `/api/portal-appointment-requests/${requestId}/confirm`, {
        appointmentDate: new Date(appointmentDate).toISOString(),
        medicalStaffId: user?.id,
        staffNotes: staffNotes.trim() || null,
        locationId: isInPerson ? locationId : null,
      });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["/api/portal-appointment-requests"] });
      void qc.invalidateQueries({ queryKey: ["/api/appointments"] });
      toast({
        title: "Request confirmed",
        description: "Appointment is confirmed for the requester — no second portal confirmation needed.",
      });
      setConfirmId(null);
      setAppointmentDate("");
      setLocationId("");
      setStaffNotes("");
    },
    onError: (e: Error) => {
      toast({ title: "Could not confirm", description: e.message.replace(/^\d+:\s*/, ""), variant: "destructive" });
    },
  });

  const declineMutation = useMutation({
    mutationFn: async (requestId: string) => {
      await apiRequest("POST", `/api/portal-appointment-requests/${requestId}/decline`, {
        staffNotes: staffNotes.trim() || null,
      });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["/api/portal-appointment-requests"] });
      toast({ title: "Request declined" });
      setDeclineId(null);
      setStaffNotes("");
    },
    onError: (e: Error) => {
      toast({ title: "Could not decline", description: e.message.replace(/^\d+:\s*/, ""), variant: "destructive" });
    },
  });

  const activeConfirm = requests.find((r) => r.id === confirmId);
  const isInPersonConfirm = activeConfirm?.preferredModality !== "telehealth";

  const openConfirm = (r: PortalRequestRow) => {
    setConfirmId(r.id);
    setStaffNotes("");
    if (r.preferredTimeWindow && /^\d{4}-\d{2}-\d{2}T/.test(r.preferredTimeWindow)) {
      const d = new Date(r.preferredTimeWindow);
      if (!Number.isNaN(d.getTime())) setAppointmentDate(d.toISOString().slice(0, 16));
      else setAppointmentDate("");
    } else if (r.preferredDate) {
      setAppointmentDate(`${r.preferredDate}T09:00`);
    } else {
      setAppointmentDate("");
    }
    const preferred = r.preferredLocationId ?? careLocations.find((l) => l.isPrimary)?.id ?? "";
    setLocationId(preferred);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Portal appointment requests</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Loading…</p>
          ) : requests.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No pending requests.</p>
          ) : (
            <div className="space-y-3">
              {requests.map((r) => (
                <div key={r.id} className="border rounded-lg p-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">
                        {r.patient.firstName} {r.patient.lastName}
                      </span>
                      <span className="text-muted-foreground text-sm">#{r.patient.employeeNumber}</span>
                      {modalityBadge(r.preferredModality)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {r.preferredDate
                        ? `Preferred: ${format(new Date(r.preferredDate), "MMM d, yyyy")}`
                        : "Flexible date"}
                      {r.preferredTimeWindow ? ` · ${r.preferredTimeWindow}` : ""}
                    </p>
                    {r.reason && <p className="text-sm mt-2">{r.reason}</p>}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" onClick={() => openConfirm(r)}>
                      Confirm
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setDeclineId(r.id)}>
                      Decline
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!confirmId} onOpenChange={(o) => !o && setConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm portal request</DialogTitle>
            <DialogDescription>
              {activeConfirm && (
                <>
                  Approve {activeConfirm.patient.firstName} {activeConfirm.patient.lastName}&apos;s request for a{" "}
                  {activeConfirm.preferredModality === "telehealth" ? "telehealth" : "in-person"} visit. The appointment
                  will be confirmed immediately — the requester does not need to confirm again.
                  {activeConfirm.preferredModality === "telehealth" && " A telecare session will be created automatically."}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="confirm-datetime">Appointment date & time</Label>
              <Input
                id="confirm-datetime"
                type="datetime-local"
                value={appointmentDate}
                onChange={(e) => setAppointmentDate(e.target.value)}
              />
            </div>
            {isInPersonConfirm && (
              <div className="space-y-2">
                <Label htmlFor="confirm-location">Care location *</Label>
                <Select value={locationId} onValueChange={setLocationId}>
                  <SelectTrigger id="confirm-location">
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
            )}
            <div className="space-y-2">
              <Label htmlFor="confirm-notes">Staff notes (optional)</Label>
              <Textarea id="confirm-notes" rows={2} value={staffNotes} onChange={(e) => setStaffNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmId(null)}>
              Cancel
            </Button>
            <Button
              disabled={confirmMutation.isPending || !appointmentDate || (isInPersonConfirm && !locationId)}
              onClick={() => confirmId && confirmMutation.mutate(confirmId)}
            >
              {confirmMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirm appointment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!declineId} onOpenChange={(o) => !o && setDeclineId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decline request</DialogTitle>
            <DialogDescription>Optional note will be stored for staff records.</DialogDescription>
          </DialogHeader>
          <Textarea rows={3} value={staffNotes} onChange={(e) => setStaffNotes(e.target.value)} placeholder="Reason for decline (optional)" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeclineId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={declineMutation.isPending}
              onClick={() => declineId && declineMutation.mutate(declineId)}
            >
              Decline
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

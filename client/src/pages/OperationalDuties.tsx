import { useState } from "react";
import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarIcon, CalendarDays, CheckCircle, Clock, Plus, Users, AlertTriangle, MoreVertical, Edit, Trash2, XCircle, History, UserPlus, LayoutGrid, List, Filter, ChevronDown } from "lucide-react";
import { Calendar as BigCalendar, dateFnsLocalizer } from "react-big-calendar";
import { format as dateFnsFormat, parse, startOfWeek, getDay } from "date-fns";
import { enUS } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { formatDistanceToNow, format } from "date-fns";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useActiveLocation } from "@/hooks/useActiveLocation";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import DutyCompletionModal from "@/components/modals/DutyCompletionModal";
import CongratsModal from "@/components/modals/CongratsModal";
import MobileNav from "@/components/MobileNav";

const WEEKDAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
const WEEKDAY_LABELS: Record<string, string> = { monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu', friday: 'Fri', saturday: 'Sat', sunday: 'Sun' };

export type ScheduleEntry = { day: typeof WEEKDAYS[number]; time: string };

/** Parse scheduled_days: supports legacy ["monday","tuesday"] or new [{ day, time }, ...] */
function parseSchedule(scheduledDays: string | null | undefined, scheduledTime?: string | null): ScheduleEntry[] {
  const defaultTime = scheduledTime && scheduledTime.trim() ? scheduledTime.trim() : "08:00";
  if (!scheduledDays || !scheduledDays.trim()) return [];
  try {
    const arr = JSON.parse(scheduledDays);
    if (!Array.isArray(arr) || arr.length === 0) return [];
    const first = arr[0];
    if (typeof first === "object" && first !== null && "day" in first && "time" in first) {
      return arr
        .filter((x: unknown) => x && typeof x === "object" && "day" in x && "time" in x && WEEKDAYS.includes((x as ScheduleEntry).day))
        .map((x: ScheduleEntry) => ({ day: x.day, time: String(x.time || defaultTime).trim() || defaultTime }));
    }
    return arr
      .filter((d: unknown) => typeof d === "string" && WEEKDAYS.includes(d as typeof WEEKDAYS[number]))
      .map((d: string) => ({ day: d as typeof WEEKDAYS[number], time: defaultTime }));
  } catch {
    return [];
  }
}

/** Format schedule for display: "Mon 08:00, Wed 14:00" or "Daily at 08:00" when frequency is daily and no days set */
function formatSchedule(scheduledDays: string | null | undefined, scheduledTime?: string | null): string {
  const entries = parseSchedule(scheduledDays, scheduledTime);
  if (entries.length === 0) return "—";
  return entries.map((e) => `${WEEKDAY_LABELS[e.day] || e.day} ${e.time}`).join(", ");
}
function formatScheduleForDuty(duty: { frequency?: string | null; scheduledDays?: string | null; scheduledTime?: string | null }): string {
  if (duty.frequency === "daily") {
    const time = (duty.scheduledTime && String(duty.scheduledTime).trim()) || "08:00";
    return `Daily at ${time}`;
  }
  return formatSchedule(duty.scheduledDays, duty.scheduledTime);
}

const GETDAY_TO_WEEKDAY: Record<number, typeof WEEKDAYS[number]> = {
  0: "sunday", 1: "monday", 2: "tuesday", 3: "wednesday", 4: "thursday", 5: "friday", 6: "saturday",
};

/** Get the set of weekdays this duty is scheduled (from schedule entries). Empty = no restriction (e.g. daily). */
function getScheduledWeekdays(duty: { scheduledDays?: string | null; scheduledTime?: string | null }): Set<typeof WEEKDAYS[number]> {
  const entries = parseSchedule(duty.scheduledDays, duty.scheduledTime);
  if (entries.length === 0) return new Set();
  return new Set(entries.map((e) => e.day));
}

/** Next date on or after fromDate that falls on a scheduled weekday for this duty. If no schedule, return fromDate. */
function getNextScheduledDate(
  duty: { scheduledDays?: string | null; scheduledTime?: string | null; frequency?: string | null },
  fromDate: Date
): string {
  const weekdays = getScheduledWeekdays(duty);
  if (weekdays.size === 0) {
    return format(fromDate, "yyyy-MM-dd");
  }
  let d = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());
  for (let i = 0; i < 8; i++) {
    const dayName = GETDAY_TO_WEEKDAY[d.getDay()];
    if (dayName && weekdays.has(dayName)) return format(d, "yyyy-MM-dd");
    d.setDate(d.getDate() + 1);
  }
  return format(fromDate, "yyyy-MM-dd");
}

// Schema for creating/editing operational duties — schedule = list of (day, time) for different times per day
const scheduleEntrySchema = z.object({ day: z.enum(WEEKDAYS), time: z.string().min(1, "Time required") });
const operationalDutySchema = z.object({
  title: z.string().min(1, "Duty name is required"),
  description: z.string().optional(),
  category: z.string().min(1, "Category is required"),
  frequency: z.string().min(1, "Frequency is required"),
  priority: z.enum(["low", "normal", "high", "critical"]),
  schedule: z.array(scheduleEntrySchema).optional(),
  isActive: z.boolean().optional(),
  estimatedDuration: z.number().min(1, "Duration must be at least 1 minute"),
}).refine(
  (data) => data.frequency === "daily" || (Array.isArray(data.schedule) && data.schedule.length > 0 && data.schedule.some((e) => e.time?.trim())),
  { message: "For Scheduled (or Weekly/Monthly), add at least one day and time.", path: ["schedule"] }
);

type OperationalDutyForm = z.infer<typeof operationalDutySchema>;

const SHIFTS = ["day", "night"] as const;

// Schema for duty assignments: posts (checkboxes) + date + shift(s). Assignee optional = anyone on duty can complete.
const dutyAssignmentSchema = z.object({
  dutyId: z.string().min(1, "Duty is required"),
  locationIds: z.array(z.string()).min(1, "Select at least one post"),
  assignedToId: z.string().optional(),
  assignmentDate: z.string().min(1, "Assignment date is required"),
  shifts: z.array(z.enum(SHIFTS)).min(1, "Select at least one shift"),
  notes: z.string().optional(),
});
// Edit form: locationId optional; single shift (existing assignment)
const dutyAssignmentEditSchema = z.object({
  dutyId: z.string().min(1, "Duty is required"),
  locationId: z.string().optional(),
  assignedToId: z.string().optional(),
  assignmentDate: z.string().min(1, "Assignment date is required"),
  shift: z.enum(SHIFTS),
  notes: z.string().optional(),
});

type DutyAssignmentForm = z.infer<typeof dutyAssignmentSchema>;
type DutyAssignmentEditForm = z.infer<typeof dutyAssignmentEditSchema>;

const priorityColors = {
  low: "bg-blue-100 text-blue-800",
  normal: "bg-green-100 text-green-800", 
  high: "bg-orange-100 text-orange-800",
  critical: "bg-red-100 text-red-800",
};

const bigCalendarLocalizer = dateFnsLocalizer({
  format: dateFnsFormat,
  parse,
  startOfWeek: (d: Date) => startOfWeek(d, { weekStartsOn: 1 }),
  getDay,
  locales: { "en-US": enUS },
});

// Day: 06:00–17:59, Night: 18:00–05:59
const SHIFT_HOURS: Record<string, number> = { day: 6, night: 18 };
const SHIFT_LABELS: Record<string, string> = { day: "Day", night: "Night" };
function assignmentToEvent(assignment: any): { id: string; title: string; start: Date; end: Date; resource: any } {
  const d = new Date(assignment.assignmentDate);
  const hour = SHIFT_HOURS[assignment.shift] ?? 8;
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), hour, 0, 0);
  const duration = assignment.duty?.estimatedDuration ?? 30;
  const end = new Date(start.getTime() + duration * 60 * 1000);
  const title = assignment.duty?.title ?? "Duty";
  const assignee = assignment.assignedTo ? `${assignment.assignedTo.firstName} ${assignment.assignedTo.lastName}` : "Unassigned";
  return {
    id: assignment.id,
    title: `${title} (${assignment.shift}) – ${assignee}`,
    start,
    end,
    resource: assignment,
  };
}

export default function OperationalDuties() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [createDutyOpen, setCreateDutyOpen] = useState(false);
  const [editDutyOpen, setEditDutyOpen] = useState(false);
  const [deleteDutyConfirmOpen, setDeleteDutyConfirmOpen] = useState(false);
  const [assignDutyOpen, setAssignDutyOpen] = useState(false);
  const [editAssignmentOpen, setEditAssignmentOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
  const [selectedDuty, setSelectedDuty] = useState<any>(null);
  const [todayViewMode, setTodayViewMode] = useState<'table' | 'cards' | 'calendar'>('table');
  const [calendarRange, setCalendarRange] = useState<{ start: Date; end: Date }>(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { start, end };
  });

  // Enhanced completion/cancellation modal state
  const [completionModal, setCompletionModal] = useState<{
    isOpen: boolean;
    assignment: any;
    type: "complete" | "cancel";
  }>({
    isOpen: false,
    assignment: null,
    type: "complete",
  });
  const [showDutyCongratsModal, setShowDutyCongratsModal] = useState(false);

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const { activeLocation } = useActiveLocation();
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";
  const [dateFilter, setDateFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [userFilter, setUserFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [searchFilter, setSearchFilter] = useState("");
  const locationDefaultSet = React.useRef(false);

  // Default location filter to current user's location (once), like Assignment History
  React.useEffect(() => {
    if (locationDefaultSet.current || !activeLocation?.id) return;
    setLocationFilter(activeLocation.id);
    locationDefaultSet.current = true;
  }, [activeLocation?.id]);

  // Fetch care locations for assignment location field and filter dropdown
  const { data: careLocations = [] } = useQuery({
    queryKey: ['/api/care-locations'],
    queryFn: async () => {
      const res = await fetch('/api/care-locations');
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Fetch operational duties
  const { data: duties = [], isLoading: dutiesLoading } = useQuery({
    queryKey: ['/api/operational-duties'],
  });

  const locationIdParam = locationFilter && locationFilter !== "all" ? locationFilter : undefined;
  const statusParam = statusFilter && statusFilter !== "all" ? statusFilter : undefined;
  const userIdParam = userFilter && userFilter !== "all" ? userFilter : undefined;
  const effectiveDate = dateFilter || selectedDate;

  // Fetch duty assignments for selected date (with full filters)
  const { data: assignments = [], isLoading: assignmentsLoading } = useQuery({
    queryKey: ['/api/duty-assignments', effectiveDate, locationIdParam, statusParam, userIdParam],
    queryFn: () => {
      const params = new URLSearchParams({ date: effectiveDate });
      if (locationIdParam) params.set('locationId', locationIdParam);
      if (statusParam) params.set('status', statusParam);
      if (userIdParam) params.set('userId', userIdParam);
      return fetch(`/api/duty-assignments?${params}`).then(res => res.json());
    },
  });

  // Fetch today's assignments (with full filters)
  const { data: todayAssignments = [], isLoading: todayLoading } = useQuery({
    queryKey: ['/api/duty-assignments', 'today', locationIdParam, statusParam, userIdParam],
    queryFn: () => {
      const params = new URLSearchParams();
      if (locationIdParam) params.set('locationId', locationIdParam);
      if (statusParam) params.set('status', statusParam);
      if (userIdParam) params.set('userId', userIdParam);
      const qs = params.toString();
      return fetch(`/api/duty-assignments/today${qs ? `?${qs}` : ''}`).then(res => res.json());
    },
  });

  // Fetch assignments for calendar view (date range, with full filters)
  const fromStr = calendarRange.start.toISOString().slice(0, 10);
  const toStr = calendarRange.end.toISOString().slice(0, 10);
  const { data: calendarAssignments = [] } = useQuery({
    queryKey: ['/api/duty-assignments', 'range', fromStr, toStr, locationIdParam, statusParam, userIdParam],
    queryFn: () => {
      const params = new URLSearchParams({ from: fromStr, to: toStr });
      if (locationIdParam) params.set('locationId', locationIdParam);
      if (statusParam) params.set('status', statusParam);
      if (userIdParam) params.set('userId', userIdParam);
      return fetch(`/api/duty-assignments?${params}`).then(res => res.json());
    },
    enabled: todayViewMode === 'calendar',
  });

  // Client-side search filter (duty title, category, assignee name)
  const filterBySearch = (list: any[]) => {
    if (!searchFilter.trim()) return list;
    const searchLower = searchFilter.toLowerCase();
    return list.filter((a: any) => {
      const duty = a.duty || {};
      const title = (duty.title || "").toLowerCase();
      const category = (duty.category || "").toLowerCase();
      const assignee = a.assignedTo
        ? `${(a.assignedTo.firstName || "")} ${(a.assignedTo.lastName || "")}`.toLowerCase()
        : "";
      return title.includes(searchLower) || category.includes(searchLower) || assignee.includes(searchLower);
    });
  };
  const filteredAssignments = filterBySearch(Array.isArray(assignments) ? assignments : []);
  const filteredTodayAssignments = filterBySearch(Array.isArray(todayAssignments) ? todayAssignments : []);
  const filteredCalendarAssignments = filterBySearch(Array.isArray(calendarAssignments) ? calendarAssignments : []);

  // Current shift by time: day 06:00–17:59, night 18:00–05:59 — today view shows only this shift
  const currentShift = React.useMemo((): "day" | "night" => {
    const hour = new Date().getHours();
    return hour >= 6 && hour < 18 ? "day" : "night";
  }, []);
  const todayListForShift = React.useMemo(
    () => filteredTodayAssignments.filter((a: any) => a.shift === currentShift),
    [filteredTodayAssignments, currentShift]
  );
  const calendarEventsForShift = React.useMemo(
    () => filteredCalendarAssignments.filter((a: any) => a.shift === currentShift).map(assignmentToEvent),
    [filteredCalendarAssignments, currentShift]
  );
  const calendarEvents = calendarEventsForShift;

  // Get users for assignment dropdown
  const { data: users = [], isLoading: usersLoading, error: usersError } = useQuery({
    queryKey: ['/api/users'],
    queryFn: () => fetch('/api/users').then(res => {
      if (!res.ok) throw new Error('Failed to fetch users');
      return res.json();
    }),
  });



  // Create duty mutation: daily = scheduledTime only (no scheduledDays); scheduled = day+time list
  const createDutyMutation = useMutation({
    mutationFn: async (data: OperationalDutyForm) => {
      const schedule = Array.isArray(data.schedule) ? data.schedule.filter((e) => e.time?.trim()) : [];
      const isDaily = data.frequency === 'daily';
      const body = {
        ...data,
        schedule: undefined,
        scheduledDays: isDaily ? undefined : (schedule.length > 0 ? JSON.stringify(schedule) : undefined),
        scheduledTime: (schedule.length > 0 ? schedule[0].time : undefined) || '08:00',
        isActive: data.isActive ?? true,
      };
      const res = await fetch('/api/operational-duties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || `Failed to create duty: ${res.status}`);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/operational-duties'] });
      setCreateDutyOpen(false);
      toast({ title: "Success", description: "Duty definition created successfully." });
    },
    onError: (error) => {
      toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to create duty definition", variant: "destructive" });
    },
  });

  // Create assignment mutation (single assignment payload; multi-shift is handled in onSubmitAssignment)
  const createAssignmentMutation = useMutation({
    mutationFn: async (payload: { dutyId: string; locationId: string; assignmentDate: string; shift: string; assignedToId?: string; notes?: string }) => {
      const res = await fetch('/api/duty-assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || `Failed to assign duty: ${res.status}`);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/duty-assignments'] });
    },
    onError: (error) => {
      toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to assign duty", variant: "destructive" });
    },
  });

  // Enhanced completion mutation
  const completeAssignmentMutation = useMutation({
    mutationFn: ({ assignmentId, data }: { assignmentId: string; data: any }) =>
      fetch(`/api/duty-assignments/${assignmentId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then(res => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      }),
    onSuccess: async (_, variables: { assignmentId: string; data: any; assignment?: { shift?: string; locationId?: string | null } }) => {
      queryClient.invalidateQueries({ queryKey: ['/api/duty-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/duty-assignments/today'] });
      setCompletionModal({ isOpen: false, assignment: null, type: "complete" });
      toast({ title: "Success", description: "Assignment completed successfully!" });
      // Check if all duties for this shift (and location) are now complete
      const assignment = variables.assignment;
      if (assignment?.shift) {
        const params = new URLSearchParams();
        if (locationIdParam) params.set('locationId', locationIdParam);
        if (statusParam) params.set('status', statusParam);
        if (userIdParam) params.set('userId', userIdParam);
        try {
          const list = await fetch(`/api/duty-assignments/today${params.toString() ? `?${params}` : ''}`).then(res => res.json());
          const sameShift = (Array.isArray(list) ? list : []).filter(
            (a: any) => a.shift === assignment.shift && (assignment.locationId == null || a.locationId === assignment.locationId)
          );
          const pending = sameShift.filter((a: any) => a.status === 'pending' || a.displayStatus === 'overdue');
          if (pending.length === 0) setShowDutyCongratsModal(true);
        } catch {
          // ignore refetch errors
        }
      }
    },
    onError: (error) => {
      console.error("Error completing assignment:", error);
      toast({ title: "Error", description: "Failed to complete assignment", variant: "destructive" });
    }
  });

  // Enhanced cancellation mutation
  const cancelAssignmentMutation = useMutation({
    mutationFn: ({ assignmentId, data }: { assignmentId: string; data: any }) =>
      fetch(`/api/duty-assignments/${assignmentId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then(res => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/duty-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/duty-assignments/today'] });
      setCompletionModal({ isOpen: false, assignment: null, type: "cancel" });
      toast({ title: "Success", description: "Assignment cancelled successfully!" });
    },
    onError: (error) => {
      console.error("Error cancelling assignment:", error);
      toast({ title: "Error", description: "Failed to cancel assignment", variant: "destructive" });
    }
  });

  // Update assignment mutation
  const updateAssignmentMutation = useMutation({
    mutationFn: ({ assignmentId, data }: { assignmentId: string; data: any }) =>
      fetch(`/api/duty-assignments/${assignmentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/duty-assignments'] });
      setEditAssignmentOpen(false);
      setSelectedAssignment(null);
      toast({ title: "Success", description: "Assignment updated successfully!" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update assignment", variant: "destructive" });
    }
  });

  // Delete assignment mutation
  const deleteAssignmentMutation = useMutation({
    mutationFn: (assignmentId: string) =>
      fetch(`/api/duty-assignments/${assignmentId}`, {
        method: 'DELETE',
      }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/duty-assignments'] });
      setDeleteConfirmOpen(false);
      setSelectedAssignment(null);
      toast({ title: "Success", description: "Assignment deleted successfully!" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete assignment", variant: "destructive" });
    }
  });

  // Old complete mutation - keeping for compatibility but not used
  const oldCompleteAssignmentMutation = useMutation({
    mutationFn: ({ assignmentId, notes }: { assignmentId: string; notes?: string }) =>
      fetch(`/api/duty-assignments/${assignmentId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/duty-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/duty-assignments', 'today'] });
    },
  });

  // Update duty mutation: daily = scheduledTime only; scheduled = day+time list
  const updateDutyMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: OperationalDutyForm }) => {
      const schedule = Array.isArray(data.schedule) ? data.schedule.filter((e) => e.time?.trim()) : [];
      const isDaily = data.frequency === 'daily';
      const body = {
        ...data,
        schedule: undefined,
        scheduledDays: isDaily ? undefined : (schedule.length > 0 ? JSON.stringify(schedule) : undefined),
        scheduledTime: (schedule.length > 0 ? schedule[0].time : undefined) || '08:00',
        isActive: data.isActive ?? true,
      };
      return fetch(`/api/operational-duties/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).then(res => res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/operational-duties'] });
      setEditDutyOpen(false);
      setSelectedDuty(null);
      toast({ title: "Success", description: "Duty definition updated." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update duty definition", variant: "destructive" });
    },
  });

  // Delete duty definition
  const deleteDutyMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/operational-duties/${id}`, { method: 'DELETE' }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/operational-duties'] });
      setDeleteDutyConfirmOpen(false);
      setSelectedDuty(null);
      toast({ title: "Success", description: "Duty definition removed." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete duty definition", variant: "destructive" });
    },
  });

  const dutyForm = useForm<OperationalDutyForm>({
    resolver: zodResolver(operationalDutySchema),
    defaultValues: {
      title: "",
      description: "",
      category: "medical",
      frequency: "daily",
      priority: "normal",
      schedule: [{ day: "monday", time: "08:00" }],
      isActive: true,
      estimatedDuration: 30,
    },
  });

  const assignmentForm = useForm<DutyAssignmentForm>({
    resolver: zodResolver(dutyAssignmentSchema),
    defaultValues: {
      dutyId: "",
      locationIds: [],
      assignedToId: "__any__",
      assignmentDate: new Date().toISOString().split('T')[0],
      shifts: ["day"],
    },
  });

  // Pre-select active location when opening assign dialog (one post checked by default)
  React.useEffect(() => {
    if (assignDutyOpen && activeLocation?.id) {
      assignmentForm.setValue("locationIds", [activeLocation.id]);
    }
  }, [assignDutyOpen, activeLocation?.id, assignmentForm]);

  // When duty is selected, default assignment date to next scheduled occurrence (aligns with duty schedule/frequency)
  const selectedDutyForAssignment = assignmentForm.watch("dutyId");
  React.useEffect(() => {
    if (!assignDutyOpen || !selectedDutyForAssignment || !Array.isArray(duties)) return;
    const duty = duties.find((d: any) => d.id === selectedDutyForAssignment);
    if (duty) {
      const nextDate = getNextScheduledDate(duty, new Date());
      assignmentForm.setValue("assignmentDate", nextDate);
    }
  }, [assignDutyOpen, selectedDutyForAssignment, duties, assignmentForm]);

  const onSubmitDuty = (data: OperationalDutyForm) => {
    createDutyMutation.mutate(data);
  };

  const editDutyForm = useForm<OperationalDutyForm>({
    resolver: zodResolver(operationalDutySchema),
    defaultValues: {
      title: "",
      description: "",
      category: "medical",
      frequency: "daily",
      priority: "normal",
      schedule: [{ day: "monday", time: "08:00" }],
      isActive: true,
      estimatedDuration: 30,
    },
  });

  React.useEffect(() => {
    if (selectedDuty && editDutyOpen) {
      const schedule = parseSchedule(selectedDuty.scheduledDays, selectedDuty.scheduledTime);
      editDutyForm.reset({
        title: selectedDuty.title ?? "",
        description: selectedDuty.description ?? "",
        category: selectedDuty.category ?? "medical",
        frequency: selectedDuty.frequency ?? "daily",
        priority: selectedDuty.priority ?? "normal",
        schedule: schedule.length > 0 ? schedule : [{ day: "monday", time: selectedDuty.scheduledTime || "08:00" }],
        isActive: selectedDuty.isActive ?? true,
        estimatedDuration: selectedDuty.estimatedDuration ?? 30,
      });
    }
  }, [selectedDuty, editDutyOpen, editDutyForm]);

  const onSubmitEditDuty = (data: OperationalDutyForm) => {
    if (selectedDuty) updateDutyMutation.mutate({ id: selectedDuty.id, data });
  };

  const onSubmitAssignment = async (data: DutyAssignmentForm) => {
    const locationIds = Array.isArray(data.locationIds) ? data.locationIds.filter((id) => id?.trim()) : [];
    if (locationIds.length === 0) {
      toast({ title: "Error", description: "Please select at least one post.", variant: "destructive" });
      return;
    }
    const assignedToId = data.assignedToId && data.assignedToId !== "__any__" ? data.assignedToId : undefined;
    const shifts = Array.isArray(data.shifts) && data.shifts.length > 0 ? data.shifts : ["day"];

    try {
      for (const locId of locationIds) {
        for (const shift of shifts) {
          await createAssignmentMutation.mutateAsync({
            dutyId: data.dutyId,
            locationId: locId,
            assignmentDate: data.assignmentDate,
            shift,
            assignedToId,
            notes: data.notes,
          });
        }
      }
      queryClient.invalidateQueries({ queryKey: ["/api/duty-assignments"] });
      setAssignDutyOpen(false);
      const total = locationIds.length * shifts.length;
      toast({
        title: "Success",
        description:
          total > 1
            ? `${total} assignments created across ${locationIds.length} post(s), ${shifts.length} shift(s).`
            : "Duty assigned to post.",
      });
    } catch (e) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Failed to create assignment(s).",
        variant: "destructive",
      });
    }
  };

  // Edit assignment form (locationId optional; single shift)
  const editAssignmentForm = useForm<DutyAssignmentEditForm & { locationId?: string }>({
    resolver: zodResolver(dutyAssignmentEditSchema),
    defaultValues: {
      dutyId: "",
      assignedToId: "__any__",
      assignmentDate: "",
      shift: "day",
      locationId: "__none__",
    },
  });

  // Initialize edit form when selectedAssignment changes (fetch location into form)
  React.useEffect(() => {
    if (selectedAssignment && editAssignmentOpen) {
      editAssignmentForm.reset({
        dutyId: selectedAssignment.dutyId,
        assignedToId: selectedAssignment.assignedToId ?? "__any__",
        assignmentDate: selectedAssignment.assignmentDate?.split?.('T')[0] ?? new Date().toISOString().split('T')[0],
        shift: (selectedAssignment.shift === "evening" ? "night" : selectedAssignment.shift === "morning" ? "day" : selectedAssignment.shift) ?? "day",
        locationId: selectedAssignment.locationId ?? activeLocation?.id ?? "__none__",
        notes: selectedAssignment.notes || "",
      });
    }
  }, [selectedAssignment, editAssignmentOpen, activeLocation?.id, editAssignmentForm]);

  const onSubmitEditAssignment = (data: DutyAssignmentEditForm & { locationId?: string }) => {
    if (!selectedAssignment) return;
    const assignedToId = data.assignedToId && data.assignedToId !== "__any__" ? data.assignedToId : null;
    const payload = {
      dutyId: data.dutyId,
      assignmentDate: data.assignmentDate,
      shift: data.shift,
      assignedToId,
      notes: data.notes,
      locationId: data.locationId && data.locationId.trim() && data.locationId !== "__none__" ? data.locationId : undefined,
    };
    updateAssignmentMutation.mutate({ assignmentId: selectedAssignment.id, data: payload });
  };

  const pendingAssignments = todayListForShift.filter((a: any) => a.status === 'pending' || a.displayStatus === 'overdue');
  const completedAssignments = todayListForShift.filter((a: any) => a.status === 'completed');

  if (dutiesLoading || assignmentsLoading || todayLoading) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Clock className="h-8 w-8 text-uventorybiz-navy shrink-0" />
            Loading…
          </h2>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 pb-20 md:pb-8 bg-uventorybiz-light-gray">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-2">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Clock className="h-8 w-8 text-uventorybiz-navy shrink-0" />
            Daily Operational Duties
          </h2>
          <p className="text-uventorybiz-gray mt-1">
            Define recurring duties, assign them to posts by shift, and track today&apos;s completion.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4 sm:shrink-0">
          <Dialog open={createDutyOpen} onOpenChange={setCreateDutyOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create duty definition
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-hidden flex flex-col">
              <DialogHeader>
                <DialogTitle>Create duty definition</DialogTitle>
                <DialogDescription>
                  Add a new duty type to the master list. It can then be assigned at any post (location).
                </DialogDescription>
              </DialogHeader>
              <Form {...dutyForm}>
                <form onSubmit={dutyForm.handleSubmit(onSubmitDuty)} className="flex flex-col flex-1 min-h-0 overflow-hidden">
                  <div className="overflow-y-auto flex-1 min-h-0 space-y-4 pr-1">
                  <FormField
                    control={dutyForm.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Duty name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Equipment Check, Vehicle Inspection" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={dutyForm.control}
                    name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="medical">Site services</SelectItem>
                              <SelectItem value="safety">Safety</SelectItem>
                              <SelectItem value="equipment">Equipment</SelectItem>
                              <SelectItem value="inspection">Inspection</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={dutyForm.control}
                      name="frequency"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Frequency</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select frequency" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="daily">Daily</SelectItem>
                              <SelectItem value="weekly">Weekly</SelectItem>
                              <SelectItem value="monthly">Monthly</SelectItem>
                              <SelectItem value="scheduled">Scheduled</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={dutyForm.control}
                      name="priority"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Priority</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select priority" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="normal">Normal</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                              <SelectItem value="critical">Critical</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={dutyForm.control}
                    name="schedule"
                    render={({ field }) => {
                      const frequency = dutyForm.watch("frequency");
                      const isDaily = frequency === "daily";
                      const list = Array.isArray(field.value) && field.value.length > 0 ? field.value : [{ day: "monday" as const, time: "08:00" }];
                      const singleTime = list[0]?.time || "08:00";
                      return (
                        <FormItem>
                          <FormLabel>{isDaily ? "Time (runs every day)" : "Schedule (day & time per recurrence)"}</FormLabel>
                          {isDaily ? (
                            <>
                              <p className="text-xs text-muted-foreground mb-2">Runs every day at this time. The spawner will create today&apos;s task automatically.</p>
                              <div className="border rounded-md p-3">
                                <Input
                                  type="time"
                                  value={singleTime}
                                  onChange={(e) => field.onChange([{ day: "monday" as const, time: e.target.value || "08:00" }])}
                                  className="w-[120px]"
                                />
                              </div>
                            </>
                          ) : (
                            <>
                              <p className="text-xs text-muted-foreground mb-2">Add each day and time when this duty runs (e.g. Mon 08:00, Wed 14:00). Required for Scheduled / Weekly / Monthly.</p>
                              <div className="space-y-2 border rounded-md p-3">
                                {list.map((entry, index) => (
                                  <div key={index} className="flex flex-wrap items-center gap-2">
                                    <Select
                                      value={entry.day}
                                      onValueChange={(v) => {
                                        const next = [...list];
                                        next[index] = { ...entry, day: v as typeof WEEKDAYS[number] };
                                        field.onChange(next);
                                      }}
                                    >
                                      <SelectTrigger className="w-[130px]">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {WEEKDAYS.map((d) => (
                                          <SelectItem key={d} value={d}>{WEEKDAY_LABELS[d] || d}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <Input
                                      type="time"
                                      value={entry.time || "08:00"}
                                      onChange={(e) => {
                                        const next = [...list];
                                        next[index] = { ...entry, time: e.target.value || "08:00" };
                                        field.onChange(next);
                                      }}
                                      className="w-[120px]"
                                    />
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        const next = list.filter((_, i) => i !== index);
                                        field.onChange(next.length > 0 ? next : [{ day: "monday", time: "08:00" }]);
                                      }}
                                      className="text-muted-foreground hover:text-destructive"
                                    >
                                      Remove
                                    </Button>
                                  </div>
                                ))}
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => field.onChange([...list, { day: "monday", time: "08:00" }])}
                                >
                                  Add day & time
                                </Button>
                              </div>
                            </>
                          )}
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />
                  <FormField
                    control={dutyForm.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center gap-2 space-y-0">
                        <FormControl>
                          <input
                            type="checkbox"
                            checked={field.value ?? true}
                            onChange={(e) => field.onChange(e.target.checked)}
                            className="rounded border-gray-300"
                          />
                        </FormControl>
                        <FormLabel className="font-normal">Active (show in list and available to assign)</FormLabel>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={dutyForm.control}
                    name="estimatedDuration"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Duration (minutes)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="30"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={dutyForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Enter duty description"
                            rows={3}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  </div>
                  <div className="flex justify-end space-x-2 pt-4 border-t shrink-0 mt-4">
                    <Button type="button" variant="outline" onClick={() => setCreateDutyOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createDutyMutation.isPending}>
                      {createDutyMutation.isPending ? "Creating..." : "Create Duty"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          <Dialog open={assignDutyOpen} onOpenChange={setAssignDutyOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Users className="h-4 w-4 mr-2" />
                Assign duty to a post
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-hidden flex flex-col">
              <DialogHeader>
                <DialogTitle>Assign duty to a post</DialogTitle>
                <DialogDescription>
                  Select one or more posts (checkboxes) and shifts; one assignment is created per post and per shift. Leave assignee as &quot;Any staff on duty&quot; so anyone at that post can complete it.
                </DialogDescription>
              </DialogHeader>
              <Form {...assignmentForm}>
                <form onSubmit={assignmentForm.handleSubmit(onSubmitAssignment)} className="flex flex-col flex-1 min-h-0 overflow-hidden">
                  <div className="overflow-y-auto flex-1 min-h-0 space-y-4 pr-1">
                  <FormField
                    control={assignmentForm.control}
                    name="dutyId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Duty (from master list)</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select duty" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Array.isArray(duties) && duties.map((duty: any) => (
                              <SelectItem key={duty.id} value={duty.id}>
                                {duty.title} — {duty.category}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={assignmentForm.control}
                    name="locationIds"
                    render={({ field }) => {
                      const selected = Array.isArray(field.value) ? field.value : [];
                      const locations = Array.isArray(careLocations) ? careLocations : [];
                      const toggle = (locId: string) => {
                        if (selected.includes(locId)) field.onChange(selected.filter((id) => id !== locId));
                        else field.onChange([...selected, locId]);
                      };
                      const selectAll = () => field.onChange(locations.map((loc: any) => loc.id));
                      const clearAll = () => field.onChange([]);
                      return (
                        <FormItem>
                          <FormLabel>Posts (locations)</FormLabel>
                          <p className="text-xs text-muted-foreground mb-2">Select the post(s) to assign this duty to. One assignment will be created per post and per shift.</p>
                          <div className="border rounded-md p-3 space-y-2 max-h-[200px] overflow-y-auto">
                            {locations.length === 0 ? (
                              <p className="text-sm text-muted-foreground">No posts configured.</p>
                            ) : (
                              <>
                                {isAdmin && (
                                  <div className="flex gap-2 pb-2 border-b">
                                    <Button type="button" variant="outline" size="sm" onClick={selectAll}>
                                      Select all
                                    </Button>
                                    <Button type="button" variant="ghost" size="sm" onClick={clearAll}>
                                      Clear
                                    </Button>
                                  </div>
                                )}
                                {locations.map((loc: any) => (
                                  <label key={loc.id} className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 rounded p-1.5">
                                    <input
                                      type="checkbox"
                                      checked={selected.includes(loc.id)}
                                      onChange={() => toggle(loc.id)}
                                      className="rounded border-gray-300"
                                    />
                                    <span className="text-sm">
                                      {loc.locationCode ? `${loc.locationCode} – ${loc.locationName}` : loc.locationName}
                                    </span>
                                  </label>
                                ))}
                              </>
                            )}
                          </div>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />
                  <FormField
                    control={assignmentForm.control}
                    name="shifts"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Shift(s)</FormLabel>
                        <p className="text-xs text-muted-foreground mb-1">Select one or more shifts; one assignment will be created per shift.</p>
                        <div className="flex flex-wrap gap-3 border rounded-md p-3">
                          {SHIFTS.map((s) => (
                            <label key={s} className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={Array.isArray(field.value) && field.value.includes(s)}
                                onChange={(e) => {
                                  const current = Array.isArray(field.value) ? field.value : [];
                                  if (e.target.checked) field.onChange([...current, s]);
                                  else field.onChange(current.filter((x) => x !== s));
                                }}
                                className="rounded border-gray-300"
                              />
                              <span className="text-sm capitalize">{s}</span>
                            </label>
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={assignmentForm.control}
                    name="assignedToId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assigned to (optional)</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || "__any__"}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Any staff on duty" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="__any__">Any staff on duty (anyone at post can complete)</SelectItem>
                            {usersLoading ? (
                              <SelectItem value="loading" disabled>Loading users...</SelectItem>
                            ) : usersError ? (
                              <SelectItem value="error" disabled>Error loading users</SelectItem>
                            ) : Array.isArray(users) && users.length > 0 ? (
                              users.map((user: any) => (
                                <SelectItem key={user.id} value={user.id}>
                                  {user.firstName} {user.lastName} — {user.role}
                                </SelectItem>
                              ))
                            ) : null}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={assignmentForm.control}
                    name="assignmentDate"
                    render={({ field }) => {
                      const dutyId = assignmentForm.watch("dutyId");
                      const duty = Array.isArray(duties) ? duties.find((d: any) => d.id === dutyId) : null;
                      const scheduledWeekdays = duty ? getScheduledWeekdays(duty) : new Set<typeof WEEKDAYS[number]>();
                      const scheduleHint =
                        scheduledWeekdays.size > 0
                          ? `Scheduled on ${WEEKDAYS.filter((d) => scheduledWeekdays.has(d)).map((d) => WEEKDAY_LABELS[d]).join(", ")} — date defaults to next occurrence.`
                          : "No specific days set; any date is valid.";
                      return (
                        <FormItem>
                          <FormLabel>Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <p className="text-xs text-muted-foreground mt-1">{scheduleHint}</p>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />
                  <FormField
                    control={assignmentForm.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes (Optional)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Additional notes..."
                            rows={2}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  </div>
                  <div className="flex justify-end space-x-2 pt-4 border-t shrink-0 mt-4">
                    <Button type="button" variant="outline" onClick={() => setAssignDutyOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createAssignmentMutation.isPending}>
                      {createAssignmentMutation.isPending ? "Assigning..." : "Assign Duty"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters - same as Assignment History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Filters</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Date</label>
              <Input
                type="date"
                value={dateFilter || selectedDate}
                onChange={(e) => { setDateFilter(e.target.value); setSelectedDate(e.target.value); }}
                data-testid="filter-date"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger data-testid="filter-status">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">User</label>
              <Select value={userFilter} onValueChange={setUserFilter}>
                <SelectTrigger data-testid="filter-user">
                  <SelectValue placeholder="All users" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  {Array.isArray(users) && users.map((u: any) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.firstName} {u.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Location</label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    className="h-10 w-full justify-between font-normal"
                    data-testid="filter-location"
                  >
                    <span className="truncate">
                      {locationFilter === "all"
                        ? "All locations"
                        : (() => {
                            const loc = Array.isArray(careLocations) ? careLocations.find((l: any) => l.id === locationFilter) : null;
                            return loc ? `${loc.locationCode || loc.code || ""} – ${loc.locationName || loc.name || ""}`.trim() || "Location" : "Location";
                          })()}
                    </span>
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="max-h-[var(--radix-dropdown-menu-content-available-height)] min-w-[var(--radix-popper-anchor-width)] overflow-y-auto">
                  <DropdownMenuItem onClick={() => setLocationFilter("all")}>All locations</DropdownMenuItem>
                  {Array.isArray(careLocations) && careLocations.map((loc: any) => (
                    <DropdownMenuItem key={loc.id} onClick={() => setLocationFilter(loc.id)}>
                      {loc.locationCode != null && loc.locationName != null ? `${loc.locationCode} – ${loc.locationName}` : (loc.code != null && loc.name != null ? `${loc.code} – ${loc.name}` : loc.locationName || loc.name || loc.id)}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Search</label>
              <Input
                placeholder="Search duties or users..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                data-testid="filter-search"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Today's Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Duties</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayListForShift.length}</div>
            <p className="text-xs text-muted-foreground">
              {SHIFT_LABELS[currentShift]} shift · {pendingAssignments.length} pending, {completedAssignments.length} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Tasks</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{pendingAssignments.length}</div>
            <p className="text-xs text-muted-foreground">
              Require immediate attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {todayListForShift.length > 0 
                ? Math.round((completedAssignments.length / todayListForShift.length) * 100)
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Tasks completed today
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Today's Assignments */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <CalendarIcon className="h-5 w-5" />
              <span>Today's Assignments ({SHIFT_LABELS[currentShift]} shift)</span>
            </CardTitle>
            <CardDescription>
              Showing {SHIFT_LABELS[currentShift].toLowerCase()} shift only (06:00–17:59 = Day, 18:00–05:59 = Night)
            </CardDescription>
          </div>
          <div className="flex items-center border rounded-md">
            <Button
              type="button"
              variant={todayViewMode === 'cards' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setTodayViewMode('cards')}
              className="rounded-r-none rounded-l-md"
              title="Card view"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant={todayViewMode === 'table' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setTodayViewMode('table')}
              className="rounded-none"
              title="Table view"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant={todayViewMode === 'calendar' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setTodayViewMode('calendar')}
              className="rounded-l-none rounded-r-md"
              title="Calendar view"
            >
              <CalendarDays className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {todayViewMode === 'calendar' ? (
            <div className="h-[500px]">
              <BigCalendar
                localizer={bigCalendarLocalizer}
                events={calendarEvents}
                startAccessor="start"
                endAccessor="end"
                titleAccessor="title"
                onRangeChange={(range: Date[] | { start: Date; end: Date }) => {
                  if (Array.isArray(range) && range.length >= 2) {
                    setCalendarRange({ start: range[0], end: range[range.length - 1] });
                  } else if (range && typeof range === 'object' && 'start' in range && 'end' in range) {
                    setCalendarRange({ start: range.start, end: range.end });
                  }
                }}
                views={['month', 'week', 'day', 'agenda']}
                defaultView="month"
              />
            </div>
          ) : todayListForShift.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No duties assigned for {SHIFT_LABELS[currentShift].toLowerCase()} shift today
            </div>
          ) : todayViewMode === 'table' ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Duty</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Post</TableHead>
                  <TableHead>Assigned to</TableHead>
                  <TableHead>Shift</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {todayListForShift.map((assignment: any) => (
                  <TableRow key={assignment.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{assignment.duty?.title}</p>
                        <p className="text-xs text-muted-foreground">{assignment.duty?.priority}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{assignment.duty?.category}</TableCell>
                    <TableCell className="text-sm">
                      {assignment.locationId
                        ? (() => {
                            const loc = Array.isArray(careLocations) ? careLocations.find((l: any) => l.id === assignment.locationId) : null;
                            return loc ? (loc.locationCode ? `${loc.locationCode} – ${loc.locationName}` : loc.locationName) : assignment.locationId;
                          })()
                        : '—'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {assignment.assignedToId && assignment.assignedTo
                        ? `${assignment.assignedTo.firstName} ${assignment.assignedTo.lastName}`
                        : 'Any staff on duty'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{SHIFT_LABELS[assignment.shift] ?? assignment.shift}</Badge>
                    </TableCell>
                    <TableCell>
                      {assignment.status === 'completed' ? (
                        <Badge className="bg-green-100 text-green-800 text-xs"><CheckCircle className="h-3 w-3 mr-1 inline" />Completed</Badge>
                      ) : assignment.status === 'cancelled' ? (
                        <Badge variant="destructive" className="text-xs"><XCircle className="h-3 w-3 mr-1 inline" />Cancelled</Badge>
                      ) : assignment.status === 'overdue' ? (
                        <Badge className="bg-orange-100 text-orange-800 text-xs"><AlertTriangle className="h-3 w-3 mr-1 inline" />Overdue</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs"><Clock className="h-3 w-3 mr-1 inline" />Pending</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" data-testid={`dropdown-assignment-${assignment.id}`}>
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {(assignment.status === 'pending' || assignment.status === 'overdue') && (
                            <>
                              <DropdownMenuItem onClick={() => setCompletionModal({ isOpen: true, assignment, type: "complete" })} data-testid={`complete-assignment-${assignment.id}`}>
                                <CheckCircle className="h-4 w-4 mr-2" /> Complete Assignment
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setCompletionModal({ isOpen: true, assignment, type: "cancel" })} data-testid={`cancel-assignment-${assignment.id}`}>
                                <XCircle className="h-4 w-4 mr-2" /> Cancel Assignment
                              </DropdownMenuItem>
                            </>
                          )}
                          {(assignment.status === 'completed' || assignment.status === 'cancelled') && (
                            <DropdownMenuItem onClick={() => updateAssignmentMutation.mutate({ assignmentId: assignment.id, data: { status: 'pending', completedAt: null, completedById: null, cancelledAt: null, cancelledById: null, cancellationReason: null, startedAt: null, notes: null } })} data-testid={`reassign-assignment-${assignment.id}`}>
                              <UserPlus className="h-4 w-4 mr-2" /> Reassign (Reset to Pending)
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => { setSelectedAssignment(assignment); setEditAssignmentOpen(true); }} data-testid={`edit-assignment-${assignment.id}`}>
                            <Edit className="h-4 w-4 mr-2" /> Edit Assignment
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { setSelectedAssignment(assignment); setDeleteConfirmOpen(true); }} className="text-red-600" data-testid={`delete-assignment-${assignment.id}`}>
                            <Trash2 className="h-4 w-4 mr-2" /> Delete Assignment
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="space-y-3">
              {todayListForShift.map((assignment: any) => (
                <div key={assignment.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h3 className="font-medium">{assignment.duty?.title}</h3>
                      <Badge className={`${priorityColors[assignment.duty?.priority as keyof typeof priorityColors]} text-xs`}>
                        {assignment.duty?.priority}
                      </Badge>
                      <Badge variant="outline" className="text-xs">{SHIFT_LABELS[assignment.shift] ?? assignment.shift}</Badge>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{assignment.duty?.category}</p>
                    {assignment.locationId && (
                      <p className="text-xs text-gray-500 mt-1">
                        Post: {(() => {
                          const loc = Array.isArray(careLocations) ? careLocations.find((l: any) => l.id === assignment.locationId) : null;
                          return loc ? (loc.locationCode ? `${loc.locationCode} – ${loc.locationName}` : loc.locationName) : assignment.locationId;
                        })()}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      Assigned to: {assignment.assignedToId && assignment.assignedTo
                        ? `${assignment.assignedTo.firstName} ${assignment.assignedTo.lastName}`
                        : 'Any staff on duty'}
                    </p>
                    {assignment.completedAt && (
                      <p className="text-xs text-green-600 mt-1">
                        Completed {formatDistanceToNow(new Date(assignment.completedAt))} ago
                        {assignment.completedBy && ` by ${assignment.completedBy.firstName} ${assignment.completedBy.lastName}`}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    {assignment.status === 'completed' ? (
                      <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>
                    ) : assignment.status === 'cancelled' ? (
                      <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Cancelled</Badge>
                    ) : assignment.status === 'overdue' ? (
                      <Badge className="bg-orange-100 text-orange-800"><AlertTriangle className="h-3 w-3 mr-1" />Overdue</Badge>
                    ) : (
                      <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Pending</Badge>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" data-testid={`dropdown-assignment-${assignment.id}`}>
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {(assignment.status === 'pending' || assignment.status === 'overdue') && (
                          <>
                            <DropdownMenuItem onClick={() => setCompletionModal({ isOpen: true, assignment, type: "complete" })} data-testid={`complete-assignment-${assignment.id}`}>
                              <CheckCircle className="h-4 w-4 mr-2" /> Complete Assignment
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setCompletionModal({ isOpen: true, assignment, type: "cancel" })} data-testid={`cancel-assignment-${assignment.id}`}>
                              <XCircle className="h-4 w-4 mr-2" /> Cancel Assignment
                            </DropdownMenuItem>
                          </>
                        )}
                        {(assignment.status === 'completed' || assignment.status === 'cancelled') && (
                          <DropdownMenuItem onClick={() => updateAssignmentMutation.mutate({ assignmentId: assignment.id, data: { status: 'pending', completedAt: null, completedById: null, cancelledAt: null, cancelledById: null, cancellationReason: null, startedAt: null, notes: null } })} data-testid={`reassign-assignment-${assignment.id}`}>
                            <UserPlus className="h-4 w-4 mr-2" /> Reassign (Reset to Pending)
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => { setSelectedAssignment(assignment); setEditAssignmentOpen(true); }} data-testid={`edit-assignment-${assignment.id}`}>
                          <Edit className="h-4 w-4 mr-2" /> Edit Assignment
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { setSelectedAssignment(assignment); setDeleteConfirmOpen(true); }} className="text-red-600" data-testid={`delete-assignment-${assignment.id}`}>
                          <Trash2 className="h-4 w-4 mr-2" /> Delete Assignment
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Duty definitions (master list) — like inventory_items: reusable definitions */}
      <Card>
        <CardHeader>
          <CardTitle>Duty definitions - Modify/Add More</CardTitle>
          <CardDescription>
            Reusable duty types. Assign any of these to a post (care location) for a date and shift.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {Array.isArray(duties) && duties.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No duty definitions yet. Create one to assign at any post.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Duty name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(Array.isArray(duties) ? duties : []).map((duty: any) => (
                  <TableRow key={duty.id}>
                    <TableCell className="font-medium">{duty.title}</TableCell>
                    <TableCell className="text-sm">{duty.category}</TableCell>
                    <TableCell>
                      <Badge className={`${priorityColors[duty.priority as keyof typeof priorityColors]} text-xs`}>
                        {duty.priority}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm capitalize">{duty.frequency}</TableCell>
                    <TableCell className="text-sm">{duty.estimatedDuration != null ? `${duty.estimatedDuration} min` : '—'}</TableCell>
                    <TableCell className="text-sm max-w-[220px]" title={formatScheduleForDuty(duty)}>
                      {formatScheduleForDuty(duty)}
                    </TableCell>
                    <TableCell>
                      {duty.isActive !== false ? (
                        <Badge variant="secondary" className="text-xs">Yes</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs text-muted-foreground">No</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate" title={duty.description || undefined}>
                      {duty.description || '—'}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setSelectedDuty(duty); setEditDutyOpen(true); }}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit definition
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { setSelectedDuty(duty); setDeleteDutyConfirmOpen(true); }} className="text-red-600">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete definition
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit duty definition dialog */}
      <Dialog open={editDutyOpen} onOpenChange={setEditDutyOpen}>
        <DialogContent className="max-w-md max-h-[90vh] flex flex-col p-4 sm:p-6">
          <DialogHeader className="shrink-0">
            <DialogTitle>Edit duty definition</DialogTitle>
            <DialogDescription>
              Update this duty type in the master list. Changes apply wherever it is used.
            </DialogDescription>
          </DialogHeader>
          <Form {...editDutyForm}>
            <form onSubmit={editDutyForm.handleSubmit(onSubmitEditDuty)} className="flex flex-col flex-1 min-h-0 flex overflow-hidden">
              <div className="overflow-y-auto flex-1 min-h-0 pr-1 -mr-1 space-y-4">
              <FormField
                control={editDutyForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duty name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Equipment Check" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editDutyForm.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="medical">Site services</SelectItem>
                        <SelectItem value="safety">Safety</SelectItem>
                        <SelectItem value="equipment">Equipment</SelectItem>
                        <SelectItem value="inspection">Inspection</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editDutyForm.control}
                  name="frequency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Frequency</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Frequency" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="scheduled">Scheduled</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editDutyForm.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Priority" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="critical">Critical</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={editDutyForm.control}
                name="schedule"
                render={({ field }) => {
                  const frequency = editDutyForm.watch("frequency");
                  const isDaily = frequency === "daily";
                  const list = Array.isArray(field.value) && field.value.length > 0 ? field.value : [{ day: "monday" as const, time: "08:00" }];
                  const singleTime = list[0]?.time || "08:00";
                  return (
                    <FormItem>
                      <FormLabel>{isDaily ? "Time (runs every day)" : "Schedule (day & time per recurrence)"}</FormLabel>
                      {isDaily ? (
                        <>
                          <p className="text-xs text-muted-foreground mb-2">Runs every day at this time.</p>
                          <div className="border rounded-md p-3">
                            <Input
                              type="time"
                              value={singleTime}
                              onChange={(e) => field.onChange([{ day: "monday" as const, time: e.target.value || "08:00" }])}
                              className="w-[120px]"
                            />
                          </div>
                        </>
                      ) : (
                        <>
                          <p className="text-xs text-muted-foreground mb-2">Add each day and time when this duty runs. Required for Scheduled / Weekly / Monthly.</p>
                          <div className="space-y-2 border rounded-md p-3">
                            {list.map((entry, index) => (
                              <div key={index} className="flex flex-wrap items-center gap-2">
                                <Select
                                  value={entry.day}
                                  onValueChange={(v) => {
                                    const next = [...list];
                                    next[index] = { ...entry, day: v as typeof WEEKDAYS[number] };
                                    field.onChange(next);
                                  }}
                                >
                                  <SelectTrigger className="w-[130px]">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {WEEKDAYS.map((d) => (
                                      <SelectItem key={d} value={d}>{WEEKDAY_LABELS[d] || d}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Input
                                  type="time"
                                  value={entry.time || "08:00"}
                                  onChange={(e) => {
                                    const next = [...list];
                                    next[index] = { ...entry, time: e.target.value || "08:00" };
                                    field.onChange(next);
                                  }}
                                  className="w-[120px]"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    const next = list.filter((_, i) => i !== index);
                                    field.onChange(next.length > 0 ? next : [{ day: "monday", time: "08:00" }]);
                                  }}
                                  className="text-muted-foreground hover:text-destructive"
                                >
                                  Remove
                                </Button>
                              </div>
                            ))}
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => field.onChange([...list, { day: "monday", time: "08:00" }])}
                            >
                              Add day & time
                            </Button>
                          </div>
                        </>
                      )}
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
              <FormField
                control={editDutyForm.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center gap-2 space-y-0">
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value ?? true}
                        onChange={(e) => field.onChange(e.target.checked)}
                        className="rounded border-gray-300"
                      />
                    </FormControl>
                    <FormLabel className="font-normal">Active</FormLabel>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editDutyForm.control}
                name="estimatedDuration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration (minutes)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="30"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editDutyForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Description" rows={2} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              </div>
              <div className="shrink-0 flex justify-end gap-2 pt-4 border-t mt-4">
                <Button type="button" variant="outline" onClick={() => setEditDutyOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateDutyMutation.isPending}>
                  {updateDutyMutation.isPending ? "Saving..." : "Save changes"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete duty definition confirmation */}
      <AlertDialog open={deleteDutyConfirmOpen} onOpenChange={setDeleteDutyConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete duty definition?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes &quot;{selectedDuty?.title}&quot; from the master list. Existing assignments for this duty are not changed.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => selectedDuty && deleteDutyMutation.mutate(selectedDuty.id)}
              disabled={deleteDutyMutation.isPending}
            >
              {deleteDutyMutation.isPending ? "Deleting..." : "Delete definition"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Enhanced Completion/Cancellation Modal */}
      <DutyCompletionModal
        isOpen={completionModal.isOpen}
        onClose={() => setCompletionModal({ isOpen: false, assignment: null, type: "complete" })}
        assignment={completionModal.assignment}
        type={completionModal.type}
        onComplete={(assignmentId, data) => {
          completeAssignmentMutation.mutate({
            assignmentId,
            data,
            assignment: completionModal.assignment ? { shift: completionModal.assignment.shift, locationId: completionModal.assignment.locationId } : undefined,
          });
        }}
        onCancel={(assignmentId, data) => {
          cancelAssignmentMutation.mutate({ assignmentId, data });
        }}
        isLoading={completeAssignmentMutation.isPending || cancelAssignmentMutation.isPending}
      />

      <CongratsModal
        open={showDutyCongratsModal}
        onClose={() => setShowDutyCongratsModal(false)}
        title="All duties complete!"
        message="You've completed all duties for this shift. Great work!"
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent data-testid="delete-assignment-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Assignment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this assignment? This action cannot be undone.
              {selectedAssignment && (
                <div className="mt-2 p-3 bg-muted rounded-md">
                  <p className="font-medium">{selectedAssignment.duty?.title}</p>
                  <p className="text-sm text-muted-foreground">
                    Assigned to: {selectedAssignment.assignedToId && selectedAssignment.assignedTo
                      ? `${selectedAssignment.assignedTo.firstName} ${selectedAssignment.assignedTo.lastName}`
                      : 'Any staff on duty'}
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="cancel-delete-assignment">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedAssignment) {
                  deleteAssignmentMutation.mutate(selectedAssignment.id);
                }
              }}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteAssignmentMutation.isPending}
              data-testid="confirm-delete-assignment"
            >
              {deleteAssignmentMutation.isPending ? "Deleting..." : "Delete Assignment"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Assignment Modal */}
      <Dialog open={editAssignmentOpen} onOpenChange={setEditAssignmentOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Assignment</DialogTitle>
            <DialogDescription>
              Update assignment details and reassign as needed.
            </DialogDescription>
          </DialogHeader>
          <Form {...editAssignmentForm}>
            <form onSubmit={editAssignmentForm.handleSubmit(onSubmitEditAssignment)} className="space-y-4">
              <FormField
                control={editAssignmentForm.control}
                name="dutyId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duty</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select duty" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Array.isArray(duties) && duties.map((duty: any) => (
                          <SelectItem key={duty.id} value={duty.id}>
                            {duty.title} - {duty.category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editAssignmentForm.control}
                name="assignedToId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assigned to (optional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || "__any__"}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Any staff on duty" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__any__">Any staff on duty (anyone at post can complete)</SelectItem>
                        {Array.isArray(users) && users.map((user: any) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.firstName} {user.lastName} — {user.role}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editAssignmentForm.control}
                name="locationId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value && field.value !== "__none__" ? field.value : "__none__"}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select location (optional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">No specific location</SelectItem>
                        {Array.isArray(careLocations) && careLocations.map((loc: any) => (
                          <SelectItem key={loc.id} value={loc.id}>
                            {loc.locationCode ? `${loc.locationCode} – ${loc.locationName}` : loc.locationName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editAssignmentForm.control}
                  name="assignmentDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editAssignmentForm.control}
                  name="shift"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Shift</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select shift" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="day">Day</SelectItem>
                          <SelectItem value="night">Night</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={editAssignmentForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Additional notes..."
                        rows={2}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setEditAssignmentOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateAssignmentMutation.isPending}>
                  {updateAssignmentMutation.isPending ? "Updating..." : "Update Assignment"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Add History Link */}
      <div className="fixed bottom-6 right-6">
        <Link href="/assignment-history">
          <Button variant="outline" size="lg" className="shadow-lg" data-testid="link-assignment-history">
            <History className="h-4 w-4 mr-2" />
            View History
          </Button>
        </Link>
      </div>
      <MobileNav />
    </div>
  );
}
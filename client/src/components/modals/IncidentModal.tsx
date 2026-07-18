import { useState, useEffect, useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { insertIncidentReportSchema, type InsertIncidentReport } from "@shared/schema";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useAuth } from "@/hooks/useAuth";
import { useActiveLocation } from "@/hooks/useActiveLocation";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Calendar, Search, User, Upload, AlertTriangle, Hospital, MapPin, Package, Pencil, Trash2, Plus } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { incidentPersonCardSubtitle } from "@/lib/incidentSafetyDisplay";

interface IncidentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingIncident?: any;
  onOpenDispensedItems?: (incident: any) => void;
}

export default function IncidentModal({ open, onOpenChange, editingIncident, onOpenDispensedItems }: IncidentModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isOperationsRole = user?.role === "operations";
  const { activeLocation, locationId, isMultiLocation } = useActiveLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [itemsUsed, setItemsUsed] = useState<{ itemId: string; quantity: number; search: string }[]>([]);
  const [itemsUsedSearchFocusedIdx, setItemsUsedSearchFocusedIdx] = useState<number | null>(null);

  const form = useForm({
    resolver: zodResolver(insertIncidentReportSchema),
    defaultValues: {
      employeeId: "",
      reportedById: user?.id || "",
      locationId: locationId || "",
      incidentDate: undefined,
      reportedToFapDate: new Date(), // Auto-fill with current date/time for new incidents
      incidentLocation: "",
      jobTitle: "",
      incidentType: "injury",
      severity: "minor",
      description: "",
      treatedOnSite: false,
      detainedAtFap: false,
      ambulanceUsed: false,
      emergencyMedicalMgt: "",
      dispositionDateTime: undefined,
      generalConditionAtDisposition: "",
      reportedTo: "",
      incidentUploads: "",
      status: "open",
      actionsTaken: "",
      lastMenstrualPeriod: undefined,
    },
  });

  // Handle file uploads
  const handleFileUpload = async (files: FileList) => {
    if (!files || files.length === 0) return;

    console.log('=== FRONTEND FILE UPLOAD ===');
    console.log('Files to upload:', files.length);
    console.log('File details:', Array.from(files).map(f => ({ name: f.name, size: f.size, type: f.type })));

    setIsUploading(true);
    const formData = new FormData();
    
    Array.from(files).forEach(file => {
      formData.append('files', file);
      console.log('Appending file:', file.name, file.size, file.type);
    });

    try {
      console.log('Sending upload request to /api/incident-uploads');
      
      const response = await fetch('/api/incident-uploads', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      console.log('Upload response status:', response.status);
      console.log('Upload response ok:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Upload failed response:', errorText);
        throw new Error(errorText || `Upload failed with status ${response.status}`);
      }

      const data = await response.json();
      console.log('Upload response data:', data);
      
      const filePaths = data.files;
      
      setUploadedFiles(prev => [...prev, ...filePaths]);
      form.setValue('incidentUploads', [...uploadedFiles, ...filePaths].join(','));
      
      toast({
        title: "Files Uploaded",
        description: `${filePaths.length} file(s) uploaded successfully`,
      });
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload files. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Reset form when editingIncident or open state changes
  useEffect(() => {
    if (!open) {
      return;
    }
    
    if (editingIncident) {
      try {
        // Helper function to safely convert date strings to Date objects
        const parseDate = (dateValue: any): Date | undefined => {
          if (!dateValue) return undefined;
          if (dateValue instanceof Date) return dateValue;
          if (typeof dateValue === 'string') {
            const parsed = new Date(dateValue);
            return isNaN(parsed.getTime()) ? undefined : parsed;
          }
          return undefined;
        };

        // Safely extract values with defaults
        // Note: jobTitle is auto-populated from employee data, but we preserve existing value for edit
        const resetData: any = {
          employeeId: editingIncident?.employeeId || editingIncident?.employee?.id || "",
          reportedById: editingIncident?.reportedById || user?.id || "",
          locationId: editingIncident?.locationId || editingIncident?.location?.id || "",
          incidentDate: parseDate(editingIncident?.incidentDate),
          incidentLocation: editingIncident?.incidentLocation || "",
          jobTitle: editingIncident?.jobTitle || editingIncident?.employee?.jobTitle || editingIncident?.employee?.position || "",
          incidentType: editingIncident?.incidentType || "injury",
          severity: editingIncident?.severity || "minor",
          description: editingIncident?.description || "",
          treatedOnSite: Boolean(editingIncident?.treatedOnSite),
          detainedAtFap: Boolean(editingIncident?.detainedAtFap),
          ambulanceUsed: Boolean(editingIncident?.ambulanceUsed),
          emergencyMedicalMgt: editingIncident?.emergencyMedicalMgt || "",
          generalConditionAtDisposition: editingIncident?.generalConditionAtDisposition || "",
          reportedTo: editingIncident?.reportedTo || "",
          incidentUploads: editingIncident?.incidentUploads || "",
          status: editingIncident?.status || "open",
          actionsTaken: editingIncident?.actionsTaken || "",
          lastMenstrualPeriod: parseDate(editingIncident?.lastMenstrualPeriod),
        };
        
        // Only set optional date fields if they exist
        const reportedToFapDate = parseDate(editingIncident?.reportedToFapDate);
        if (reportedToFapDate !== undefined) {
          resetData.reportedToFapDate = reportedToFapDate;
        }
        
        const dispositionDateTime = parseDate(editingIncident?.dispositionDateTime);
        if (dispositionDateTime !== undefined) {
          resetData.dispositionDateTime = dispositionDateTime;
        }
        
        // Use setTimeout to ensure form is ready
        setTimeout(() => {
          if (form) {
            try {
              form.reset(resetData);
            } catch (resetError) {
              throw resetError;
            }
          }
        }, 0);
        
        // Load existing uploads
        if (editingIncident?.incidentUploads && typeof editingIncident.incidentUploads === 'string') {
          setUploadedFiles(editingIncident.incidentUploads.split(',').filter((f: string) => f.trim()));
        } else {
          setUploadedFiles([]);
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to load incident data. Please try again.",
          variant: "destructive",
        });
      }
    } else {
      setUploadedFiles([]);
      form.reset({
        employeeId: "",
        reportedById: user?.id || "",
        locationId: locationId || "",
        incidentDate: undefined,
        reportedToFapDate: new Date(), // Auto-fill with current date/time for new incidents
        incidentLocation: "",
        jobTitle: "",
        incidentType: "injury",
        severity: "minor",
        description: "",
        treatedOnSite: false,
        detainedAtFap: false,
        ambulanceUsed: false,
        emergencyMedicalMgt: "",
        dispositionDateTime: undefined,
        generalConditionAtDisposition: "",
        reportedTo: "",
        incidentUploads: "",
        status: "open",
        actionsTaken: "",
      });
    }
  }, [editingIncident, open, form, user?.id, locationId, toast]);

  useEffect(() => {
    if (open && !editingIncident) setItemsUsed([]);
  }, [open, editingIncident]);

  useEffect(() => {
    if (editingIncident) setSearchQuery("");
  }, [editingIncident?.id]);

  type EmployeeRow = {
    id: string;
    firstName?: string;
    lastName?: string;
    employeeNumber?: string;
    jobTitle?: string;
    position?: string;
    gender?: string;
    status?: string;
    company?: { name?: string } | null;
  };

  type EmployeeData = {
    employee: EmployeeRow;
    company?: { name?: string } | null;
  };

  const employeeIdFromEdit = editingIncident?.employeeId ?? editingIncident?.employee?.id ?? "";

  const { data: editEmployeeFetched, isLoading: editEmployeeLoading } = useQuery<EmployeeData>({
    queryKey: [`/api/employees/${employeeIdFromEdit}`],
    queryFn: getQueryFn<EmployeeData>({ on401: "throw" }),
    enabled:
      Boolean(open && editingIncident && employeeIdFromEdit && !isOperationsRole && !editingIncident?.employee),
    retry: false,
  });

  const employeeRowFromIncidentEmbedded = (embedded: unknown): EmployeeData | undefined => {
    if (!embedded || typeof embedded !== "object" || !("id" in embedded)) return undefined;
    const o = embedded as Record<string, unknown>;
    const co = o.company as EmployeeData["company"];
    const { company: _c, ...employeeRest } = o;
    return {
      employee: employeeRest as EmployeeData["employee"],
      company: co,
    };
  };

  const involvedEmployeeRow: EmployeeData | undefined = useMemo(() => {
    if (!editingIncident) {
      return undefined;
    }
    const fromList = employeeRowFromIncidentEmbedded(editingIncident.employee);
    if (fromList?.employee?.id) {
      return fromList;
    }
    if (editEmployeeFetched?.employee?.id) {
      return editEmployeeFetched;
    }
    if (editEmployeeFetched && "id" in (editEmployeeFetched as object)) {
      const row = editEmployeeFetched as unknown as EmployeeRow;
      return { employee: row, company: row.company };
    }
    return undefined;
  }, [editingIncident, editEmployeeFetched]);
  
  const { data: employees = [] as EmployeeRow[], isLoading: employeesLoading } = useQuery<EmployeeRow[]>({
    queryKey: searchQuery ? ["/api/employees", { search: searchQuery }] : ["/api/employees"],
    retry: false,
    enabled: open && !isOperationsRole && !editingIncident,
  });

  // Fetch care locations for edit mode
  const { data: careLocations = [] } = useQuery({
    queryKey: ['/api/care-locations'],
    queryFn: async () => {
      const response = await fetch('/api/care-locations');
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!editingIncident || isMultiLocation, // Fetch when editing or if multi-location
  });

  const formLocationId = useWatch({ control: form.control, name: "locationId" }) as string | undefined;
  const effectiveLocationId = formLocationId || locationId;

  const { data: inventoryItems = [] } = useQuery<{ id: string; itemCode: string; itemName: string; currentStock: number; unitOfMeasure: string }[]>({
    queryKey: ["/api/inventory", effectiveLocationId ? { locationId: effectiveLocationId } : ""],
    queryFn: async () => {
      const url = effectiveLocationId ? `/api/inventory?locationId=${encodeURIComponent(effectiveLocationId)}` : "/api/inventory";
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch inventory");
      return res.json();
    },
    enabled: open,
  });

  const { data: editIncidentDispensedTransactions = [] } = useQuery({
    queryKey: ["/api/inventory-transactions", { documentType: "incident", documentId: editingIncident?.id }],
    queryFn: async () => {
      if (!editingIncident?.id) return [];
      const params = new URLSearchParams({ documentType: "incident", documentId: editingIncident.id });
      const res = await fetch(`/api/inventory-transactions?${params}`, { credentials: "include" });
      if (!res.ok) return [];
      const list = await res.json();
      return Array.isArray(list) ? list.filter((t: any) => t.transactionType === "issue_to_client") : [];
    },
    enabled: open && !!editingIncident?.id,
  });

  // Update locationId when activeLocation changes (for new incidents)
  useEffect(() => {
    if (!editingIncident && locationId) {
      form.setValue('locationId', locationId);
    }
  }, [locationId, editingIncident, form]);

  const filteredEmployees = employees.filter((employee: EmployeeRow) => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    return (
      employee.firstName?.toLowerCase().includes(searchLower) ||
      employee.lastName?.toLowerCase().includes(searchLower) ||
      employee.employeeNumber?.toLowerCase().includes(searchLower) ||
      employee.id?.toLowerCase().includes(searchLower)
    );
  });

  const selectedEmployeeId = useWatch({ control: form.control, name: "employeeId" }) as string | undefined;
  const resolvedEmployeeContext: EmployeeData | undefined = useMemo(() => {
    if (editingIncident && involvedEmployeeRow?.employee?.id) {
      return involvedEmployeeRow;
    }
    if (selectedEmployeeId && Array.isArray(employees)) {
      const match = employees.find((e) => e.id === selectedEmployeeId);
      return match ? { employee: match, company: match.company } : undefined;
    }
    return undefined;
  }, [editingIncident, involvedEmployeeRow, selectedEmployeeId, employees]);

  const createIncidentMutation = useMutation({
    mutationFn: async (payload: { data: InsertIncidentReport; itemsUsed?: { itemId: string; quantity: number }[] }) => {
      const { data, itemsUsed: dispensedItems } = payload;
      const url = editingIncident 
        ? `/api/incident-reports/${editingIncident.id}`
        : "/api/incident-reports";
      const method = editingIncident ? "PUT" : "POST";
      const response = await apiRequest(method, url, data);
      const incident = await response.json();
      if (!editingIncident && dispensedItems?.length && incident?.id) {
        const locId = data.locationId || locationId;
        for (const line of dispensedItems) {
          if (!line.itemId || !line.quantity || line.quantity <= 0) continue;
          const txRes = await fetch("/api/inventory-transactions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              itemId: line.itemId,
              quantity: line.quantity,
              transactionType: "issue_to_client",
              ...(incident.employeeId ? { employeeId: incident.employeeId } : {}),
              documentType: "incident",
              documentId: incident.id,
              ...(locId ? { locationId: locId } : {}),
            }),
          });
          if (!txRes.ok) console.warn("Failed to record dispensed item", line, await txRes.text());
        }
      }
      return incident;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: editingIncident ? "Incident report updated successfully." : "Incident report created successfully.",
      });
      form.reset();
      setItemsUsed([]);
      queryClient.invalidateQueries({ queryKey: ["/api/incident-reports"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      onOpenChange(false);
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/auth";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to create incident report. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: any) => {
    const itemsUsedPayload = itemsUsed.filter((l) => l.itemId && l.quantity > 0).map(({ itemId, quantity }) => ({ itemId, quantity }));
    createIncidentMutation.mutate({
      data: data as InsertIncidentReport,
      ...(editingIncident ? {} : { itemsUsed: itemsUsedPayload }),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <span>{editingIncident ? 'Edit Incident Report' : 'New Incident Report'}</span>
          </DialogTitle>
          <DialogDescription>
            {editingIncident 
              ? 'Update the incident report details below.'
              : 'Create a comprehensive incident report with all required details for proper documentation and follow-up.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {isOperationsRole && !editingIncident && (
              <Alert>
                <AlertTitle>Employee directory not available</AlertTitle>
                <AlertDescription>
                  New incident reports that link an affected employee require Staff or Admin access to the employee
                  directory. Please ask a colleague with the appropriate role to log the incident, or use a
                  staff account with directory access.
                </AlertDescription>
              </Alert>
            )}

            {/* Care Location */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {editingIncident ? (
                <FormField
                  control={form.control}
                  name="locationId"
                  render={({ field }) => {
                    // Radix Select does not allow an empty-string value, so we map
                    // an empty/undefined locationId to a sentinel value "none".
                    const selectValue = field.value && field.value !== "" ? field.value : "none";

                    return (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Hospital className="h-4 w-4 text-primary" />
                          Care Location (Treatment Facility)
                        </FormLabel>
                        <FormControl>
                          <Select
                            value={selectValue}
                            onValueChange={(val) => {
                              const next = val === "none" ? "" : val;
                              field.onChange(next);
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select care location" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">No location</SelectItem>
                              {careLocations.map((location: any) => (
                                <SelectItem key={location.id} value={location.id}>
                                  {location.locationCode} - {location.locationName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <p className="text-xs text-gray-500">
                          Update location if incident was recorded under wrong location
                        </p>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
              ) : activeLocation ? (
                <FormField
                  control={form.control}
                  name="locationId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Hospital className="h-4 w-4 text-primary" />
                        Care Location (Treatment Facility)
                      </FormLabel>
                      <FormControl>
                        <Input
                          value={activeLocation.name || `${activeLocation.code} - ${activeLocation.name}`}
                          disabled
                          className="bg-gray-50 cursor-not-allowed"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : null}
            </div>

            {/* Patient: new report = searchable directory; edit = involved patient is fixed (from incident or GET /patients/:id) */}
            <div className="grid grid-cols-1 gap-4">
              {isOperationsRole && editingIncident ? (
                <div className="rounded-lg border border-blue-100 bg-blue-50/80 p-4 space-y-2">
                  <p className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                    <User className="h-4 w-4 text-blue-600" />
                    Involved person (redacted)
                  </p>
                  <p className="text-sm text-gray-800">
                    {incidentPersonCardSubtitle(editingIncident, true)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Employee name and identifiers are not shown for operations roles. You can still update incident
                    details, status, and narrative fields.
                  </p>
                  <input type="hidden" {...form.register("employeeId")} />
                </div>
              ) : isOperationsRole ? null : editingIncident ? (
                <div className="space-y-2">
                  <FormLabel className="text-base">Employee involved</FormLabel>
                  {editEmployeeLoading && !involvedEmployeeRow ? (
                    <div className="flex items-center gap-2 rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-uventorybiz-navy border-t-transparent" />
                      Loading employee details…
                    </div>
                  ) : involvedEmployeeRow ? (
                    <div className="rounded-lg border border-gray-200 bg-gray-50/90 p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-uventorybiz-navy text-xs font-semibold text-white">
                          {involvedEmployeeRow.employee?.firstName?.charAt(0) || "?"}
                          {involvedEmployeeRow.employee?.lastName?.charAt(0) || ""}
                        </div>
                        <div className="min-w-0 flex-1 space-y-1">
                          <p className="font-medium text-gray-900">
                            {involvedEmployeeRow.employee?.firstName ?? "—"}{" "}
                            {involvedEmployeeRow.employee?.lastName ?? ""}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {involvedEmployeeRow.employee?.employeeNumber ?? "—"} •{" "}
                            {involvedEmployeeRow.employee?.jobTitle ||
                              involvedEmployeeRow.employee?.position ||
                              "—"}
                          </p>
                          {involvedEmployeeRow.company?.name ? (
                            <p className="text-xs text-muted-foreground">{involvedEmployeeRow.company.name}</p>
                          ) : null}
                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            <Badge variant="outline" className="text-xs font-mono">
                              ID {involvedEmployeeRow.employee.id.slice(0, 8)}…
                            </Badge>
                            {involvedEmployeeRow.employee.status ? (
                              <Badge variant="secondary" className="text-xs capitalize">
                                {involvedEmployeeRow.employee.status}
                              </Badge>
                            ) : null}
                          </div>
                          <p className="text-xs text-muted-foreground pt-2">
                            The involved employee cannot be changed when editing an existing report.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : employeeIdFromEdit ? (
                    <Alert variant="destructive">
                      <AlertTitle>Employee record unavailable</AlertTitle>
                      <AlertDescription>
                        This incident references an employee that could not be loaded. You can still edit other fields.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Alert>
                      <AlertTitle>No employee linked</AlertTitle>
                      <AlertDescription>This incident does not reference a registered employee.</AlertDescription>
                    </Alert>
                  )}
                  <input type="hidden" {...form.register("employeeId")} />
                </div>
              ) : (
                <FormField
                  control={form.control}
                  name="employeeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Employee Involved *</FormLabel>
                      <div className="flex gap-2">
                        <div className="relative ">
                          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Input
                            placeholder="Search employees by name or employee ID..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                        <FormControl className="">
                          <Select
                            value={field.value || ""}
                            onValueChange={(value) => {
                              field.onChange(value);
                              if (value && Array.isArray(employees)) {
                                const selectedEmployee = employees.find((e) => e.id === value);
                                if (selectedEmployee) {
                                  const jobTitle =
                                    selectedEmployee.jobTitle || selectedEmployee.position || "";
                                  if (jobTitle) {
                                    form.setValue("jobTitle", jobTitle);
                                  }
                                }
                              } else {
                                form.setValue("jobTitle", "");
                              }
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select the employee involved in the incident...">
                                {field.value && Array.isArray(employees) && (() => {
                                  const selectedEmployee = employees.find((e) => e.id === field.value);
                                  return selectedEmployee ? (
                                    <div className="flex items-center space-x-2">
                                      <User className="h-4 w-4" />
                                      <span>
                                        {selectedEmployee.firstName || ""}{" "}
                                        {selectedEmployee.lastName || ""}
                                        {selectedEmployee.employeeNumber &&
                                          ` (${selectedEmployee.employeeNumber})`}
                                      </span>
                                    </div>
                                  ) : null;
                                })()}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent className="max-h-60">
                              {employeesLoading ? (
                                <div className="p-4 text-center text-uventorybiz-gray">
                                  <div className="animate-spin h-4 w-4 border-2 border-uventorybiz-navy border-t-transparent rounded-full mx-auto mb-2"></div>
                                  Loading employees...
                                </div>
                              ) : Array.isArray(filteredEmployees) && filteredEmployees.length > 0 ? (
                                filteredEmployees.map((employee) => (
                                  <SelectItem key={employee.id} value={employee.id}>
                                    <div className="flex items-center justify-between w-full">
                                      <div className="flex items-center space-x-3">
                                        <div className="w-8 h-8 bg-uventorybiz-navy rounded-full flex items-center justify-center text-white text-xs font-semibold">
                                          {employee.firstName?.charAt(0) || "U"}
                                          {employee.lastName?.charAt(0) || "N"}
                                        </div>
                                        <div>
                                          <p className="font-medium text-gray-900">
                                            {employee.firstName || "Unknown"} {employee.lastName || "Employee"}
                                          </p>
                                          <p className="text-xs text-uventorybiz-gray">
                                            {employee.employeeNumber || "N/A"} •{" "}
                                            {employee.jobTitle || employee.position || "N/A"}
                                          </p>
                                          {employee.company?.name && (
                                            <p className="text-xs text-uventorybiz-gray">{employee.company.name}</p>
                                          )}
                                        </div>
                                      </div>
                                      <Badge variant="outline" className="text-xs capitalize">
                                        {employee.status || "active"}
                                      </Badge>
                                    </div>
                                  </SelectItem>
                                ))
                              ) : (
                                <div className="p-4 text-center text-uventorybiz-gray">
                                  {searchQuery ? "No employees match your search" : "No employees found"}
                                </div>
                              )}
                            </SelectContent>
                          </Select>
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {/* Incident Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="reportedToFapDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date reported to site office</FormLabel>
                    <FormControl>
                      <Input
                        type="datetime-local"
                        value={field.value && typeof field.value === 'object' && 'getTime' in field.value ? new Date((field.value as Date).getTime() - (field.value as Date).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ""}
                        onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                      />
                    </FormControl>
                      <p className="text-xs text-gray-500">
                        Date when incident was reported to the site office
                      </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="incidentDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Incident Date & Time *</FormLabel>
                    <FormControl>
                      <Input
                        type="datetime-local"
                        value={field.value && typeof field.value === 'object' && 'getTime' in field.value ? new Date((field.value as Date).getTime() - (field.value as Date).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ""}
                        onChange={(e) => field.onChange(new Date(e.target.value))}
                      />
                    </FormControl>
                    <p className="text-xs text-gray-500">
                      Actual Date and Time when incident occurred
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
              <FormField
                control={form.control}
                name="incidentLocation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-red-500" />
                      Incident Location *
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Warehouse Bay A, Store Floor 2, Loading Dock..."
                        {...field}
                      />
                    </FormControl>
                    <p className="text-xs text-gray-500">Where the incident occurred</p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Hidden field - jobTitle is auto-populated from employee data */}
              <FormField
                control={form.control}
                name="jobTitle"
                render={({ field }) => (
                  <input type="hidden" {...field} />
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="incidentType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Incident Type *</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select incident type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="injury">Personal Injury</SelectItem>
                          <SelectItem value="near_miss">Near Miss</SelectItem>
                          <SelectItem value="equipment_damage">Equipment Damage</SelectItem>
                          <SelectItem value="environmental">Environmental Incident</SelectItem>
                          <SelectItem value="security">Security Incident</SelectItem>
                          <SelectItem value="fire">Fire/Explosion</SelectItem>
                          <SelectItem value="chemical_spill">Chemical Spill</SelectItem>
                          <SelectItem value="vehicle_accident">Vehicle Accident</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="severity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Severity Level *</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select severity" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="minor">Minor</SelectItem>
                          <SelectItem value="moderate">Moderate</SelectItem>
                          <SelectItem value="major">Major</SelectItem>
                          <SelectItem value="critical">Critical</SelectItem>
                          <SelectItem value="catastrophic">Catastrophic</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Incident Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Incident Description *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Provide a detailed description of what happened, including sequence of events, conditions, and contributing factors..."
                      className="min-h-[120px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Treatment Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-uventorybiz-navy">Treatment Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="treatedOnSite"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Treated on Site</FormLabel>
                        <p className="text-sm text-muted-foreground">
                          Was treatment provided at the incident location?
                        </p>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="detainedAtFap"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Held at site</FormLabel>
                        <p className="text-sm text-muted-foreground">
                          Was the affected employee held at the site for observation or care?
                        </p>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="ambulanceUsed"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Fleet vehicle used</FormLabel>
                        <p className="text-sm text-muted-foreground">
                          Was emergency transport required?
                        </p>
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              {/* Emergency Medical Management */}
              <FormField
                control={form.control}
                name="emergencyMedicalMgt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Immediate response</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe immediate response actions, first-aid provided, interventions, and care given on site..."
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <p className="text-xs text-gray-500">
                      Document immediate response actions, first-aid, and care provided during the incident
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Disposition Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-uventorybiz-navy">Disposition Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="dispositionDateTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Disposition Date & Time</FormLabel>
                      <FormControl>
                      <Input
                        type="datetime-local"
                        value={field.value && typeof field.value === 'object' && 'getTime' in field.value ? new Date((field.value as Date).getTime() - (field.value as Date).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ""}
                        onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                      />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="generalConditionAtDisposition"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>General Condition at Disposition</FormLabel>
                      <FormControl>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select condition" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="stable">Stable</SelectItem>
                            <SelectItem value="improving">Improving</SelectItem>
                            <SelectItem value="discharged_home">Discharged Home</SelectItem>
                            <SelectItem value="transferred_hospital">Transferred to Hospital</SelectItem>
                            <SelectItem value="return_to_work">Return to Work</SelectItem>
                            <SelectItem value="light_duty">Light Duty</SelectItem>
                            <SelectItem value="off_work">Off Work</SelectItem>
                            <SelectItem value="referred_specialist">Referred to Specialist</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Reporting and Documentation */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-uventorybiz-navy">Reporting & Documentation</h3>
              
              <FormField
                control={form.control}
                name="reportedTo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reported To</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="List who has been notified (e.g., Site Manager, Safety Officer, Government Agencies, Insurance, etc.)..."
                        className="min-h-[80px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {resolvedEmployeeContext?.employee?.gender === 'female' && (
                <FormField
                  control={form.control}
                  name="lastMenstrualPeriod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Menstrual Period (LMP)</FormLabel>
                      <FormControl>
                        <Input 
                          type="date" 
                          {...field}
                          value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''}
                          onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="actionsTaken"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Actions Taken</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe immediate actions taken, corrective measures, and follow-up plans..."
                        className="min-h-[80px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="incidentUploads"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Incident Documentation (Optional)</FormLabel>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg overflow-hidden hover:border-gray-400 transition-colors">
                      <label 
                        htmlFor="incident-file-upload" 
                        className="block p-6 text-center cursor-pointer hover:bg-gray-50 transition-colors"
                      >
                        <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                        <p className="text-sm text-gray-600 mb-2 font-medium">
                          Click to upload or drag and drop
                        </p>
                        <p className="text-sm text-gray-600 mb-2">
                          Photos, witness statements, or other relevant documents
                        </p>
                        <p className="text-xs text-gray-500">
                          Max 5 files, 10MB each • Images, PDF, Word
                        </p>
                        <Input
                          id="incident-file-upload"
                          type="file"
                          multiple
                          accept="image/*,.pdf,.doc,.docx"
                          className="hidden"
                          disabled={isUploading}
                          onChange={(e) => {
                            if (e.target.files && e.target.files.length > 0) {
                              handleFileUpload(e.target.files);
                            }
                          }}
                        />
                      </label>
                      {isUploading && (
                        <div className="px-6 pb-4">
                          <div className="flex items-center justify-center space-x-2">
                            <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                            <p className="text-sm text-blue-600 font-medium">Uploading files...</p>
                          </div>
                        </div>
                      )}
                      {uploadedFiles.length > 0 && (
                        <div className="px-6 pb-4 bg-gray-50 border-t">
                          <p className="text-xs font-medium text-gray-700 mb-2 pt-3">Uploaded Files:</p>
                          <ul className="space-y-2">
                            {uploadedFiles.map((file, idx) => (
                              <li key={idx} className="flex items-center justify-between p-2 bg-white rounded border hover:border-gray-400 transition-colors">
                                <span className="text-xs text-gray-700 truncate flex-1">{file.split('/').pop()}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newFiles = uploadedFiles.filter((_, i) => i !== idx);
                                    setUploadedFiles(newFiles);
                                    form.setValue('incidentUploads', newFiles.join(','));
                                  }}
                                  className="ml-2 text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50"
                                  title="Remove file"
                                >
                                  ✕
                                </button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Items used / dispensed */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Package className="h-4 w-4" />
                Items used / dispensed
              </h4>
              <p className="text-xs text-muted-foreground">Record supplies or medications given for this incident (optional).</p>
              {editingIncident ? (
                <div className="space-y-2">
                  {editIncidentDispensedTransactions.length > 0 && (
                    <p className="text-sm text-muted-foreground">{editIncidentDispensedTransactions.length} item transaction(s) recorded for this incident.</p>
                  )}
                  {onOpenDispensedItems && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onOpenDispensedItems(editingIncident)}
                    >
                      <Package className="h-4 w-4 mr-2" />
                      {editIncidentDispensedTransactions.length > 0 ? "Add or view items used / dispensed" : "Record items used / dispensed"}
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground">Type to search by name or code; pick from the list below.</p>
                  {itemsUsed.map((line, idx) => {
                    const usedItemIds = itemsUsed.filter((_, i) => i !== idx).map((l) => l.itemId).filter(Boolean);
                    const term = (line.search || "").trim().toLowerCase();
                    const matches = term.length > 0
                      ? inventoryItems.filter(
                          (item) =>
                            !usedItemIds.includes(item.id) &&
                            (item.itemName?.toLowerCase().includes(term) || item.itemCode?.toLowerCase().includes(term))
                        ).slice(0, 12)
                      : [];
                    return (
                      <div key={idx} className="flex flex-wrap items-center gap-2">
                        <div className="relative flex-1 min-w-[200px]">
                          {line.itemId ? (
                            <div className="flex items-center gap-2 h-9 px-3 rounded-md border bg-muted/50 text-sm">
                              <span className="truncate">
                                {inventoryItems.find((i) => i.id === line.itemId)?.itemName ?? inventoryItems.find((i) => i.id === line.itemId)?.itemCode ?? line.itemId}
                              </span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 shrink-0"
                                onClick={() => setItemsUsed((prev) => prev.map((r, i) => (i === idx ? { ...r, itemId: "", search: "" } : r)))}
                                aria-label="Change item"
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <>
                              <Input
                                placeholder="Search by name or code..."
                                className="pr-8"
                                value={line.search}
                                onChange={(e) => setItemsUsed((prev) => prev.map((r, i) => (i === idx ? { ...r, search: e.target.value } : r)))}
                                onFocus={() => setItemsUsedSearchFocusedIdx(idx)}
                                onBlur={() => setTimeout(() => setItemsUsedSearchFocusedIdx(null), 150)}
                                aria-label="Search item"
                                aria-autocomplete="list"
                                aria-expanded={itemsUsedSearchFocusedIdx === idx && (line.search?.length ?? 0) > 0}
                              />
                              {itemsUsedSearchFocusedIdx === idx && (line.search?.trim().length ?? 0) > 0 && (
                                <ul
                                  className="absolute z-10 mt-1 w-full max-h-48 overflow-auto rounded-md border bg-popover py-1 shadow-md"
                                  role="listbox"
                                  aria-label="Matching items"
                                >
                                  {matches.length === 0 ? (
                                    <li className="px-3 py-2 text-sm text-muted-foreground" role="option">No matching items</li>
                                  ) : (
                                    matches.map((item) => (
                                      <li
                                        key={item.id}
                                        role="option"
                                        className="cursor-pointer px-3 py-2 text-sm hover:bg-muted focus:bg-muted outline-none"
                                        onMouseDown={(e) => {
                                          e.preventDefault();
                                          setItemsUsed((prev) => prev.map((r, i) => (i === idx ? { ...r, itemId: item.id, search: "" } : r)));
                                          setItemsUsedSearchFocusedIdx(null);
                                        }}
                                      >
                                        {item.itemName} ({item.itemCode}) — {item.currentStock} {item.unitOfMeasure}
                                      </li>
                                    ))
                                  )}
                                </ul>
                              )}
                            </>
                          )}
                        </div>
                        <Input
                          type="number"
                          min={1}
                          placeholder="Qty"
                          className="w-24"
                          value={line.quantity || ""}
                          onChange={(e) =>
                            setItemsUsed((prev) =>
                              prev.map((r, i) => (i === idx ? { ...r, quantity: parseInt(e.target.value, 10) || 0 } : r))
                            )
                          }
                          aria-label="Quantity"
                          title="Quantity"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => setItemsUsed((prev) => prev.filter((_, i) => i !== idx))}
                          aria-label="Remove item"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setItemsUsed((prev) => [...prev, { itemId: "", quantity: 1, search: "" }])}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add item
                  </Button>
                </>
              )}
            </div>

            <div className="flex justify-end space-x-4 pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createIncidentMutation.isPending || (isOperationsRole && !editingIncident)}
                className="bg-red-600 hover:bg-red-700"
              >
                {createIncidentMutation.isPending ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                    <span>{editingIncident ? 'Updating Report...' : 'Creating Report...'}</span>
                  </div>
                ) : (
                  editingIncident ? "Update Incident Report" : "Create Incident Report"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
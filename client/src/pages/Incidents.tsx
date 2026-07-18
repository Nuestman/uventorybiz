import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  AlertTriangle, 
  Plus, 
  Search, 
  Calendar, 
  MapPin, 
  User, 
  Clock,
  FileText,
  TrendingUp,
  Shield,
  Ambulance,
  Hospital,
  Edit,
  Trash2,
  Eye,
  MoreVertical,
  CheckCircle,
  XCircle,
  Building2,
  LayoutGrid,
  List,
  Package
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import MobileNav from "@/components/MobileNav";
import { IncidentStatusMenuItems } from "@/components/incidents/IncidentStatusMenuItems";
import { CloseIncidentDialog } from "@/components/incidents/CloseIncidentDialog";
import { useAuth } from "@/hooks/useAuth";
import {
  CASUALTY_IP_LABEL,
  incidentPersonCardSubtitle,
  incidentPersonPrimaryLine,
  incidentPersonSecondaryLine,
} from "@/lib/incidentSafetyDisplay";
import IncidentModal from "@/components/modals/IncidentModal";
import IncidentDispensedItemsModal from "@/components/modals/IncidentDispensedItemsModal";
import { useActiveLocation } from "@/hooks/useActiveLocation";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function Incidents() {
  const [isIncidentModalOpen, setIsIncidentModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIncident, setSelectedIncident] = useState<any>(null);
  const [incidentDetailsOpen, setIncidentDetailsOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [incidentToDelete, setIncidentToDelete] = useState<any>(null);
  const [editingIncident, setEditingIncident] = useState<any>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [dispensedItemsIncident, setDispensedItemsIncident] = useState<any>(null);
  const [closeIncidentId, setCloseIncidentId] = useState<string | null>(null);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table');
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isMultiLocation } = useActiveLocation();
  const { user } = useAuth();
  const isOperationsRole = user?.role === "operations";

  const { data: incidents = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/incident-reports"],
    retry: false,
  });

  // Fetch care locations for filtering
  const { data: careLocations = [] } = useQuery({
    queryKey: ['/api/care-locations'],
    queryFn: async () => {
      const response = await fetch('/api/care-locations');
      if (!response.ok) return [];
      return response.json();
    },
    enabled: isMultiLocation,
  });

  // Delete incident mutation
  const deleteIncidentMutation = useMutation({
    mutationFn: async (incidentId: string) => {
      const response = await apiRequest("DELETE", `/api/incident-reports/${incidentId}`);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/incident-reports"] });
      setDeleteConfirmOpen(false);
      setIncidentToDelete(null);
      toast({
        title: "Success",
        description: "Incident report deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to delete incident: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Update incident status mutation
  const updateIncidentMutation = useMutation({
    mutationFn: async ({
      incidentId,
      status,
      isDrillOrSimulation,
    }: {
      incidentId: string;
      status: string;
      isDrillOrSimulation?: boolean;
    }) => {
      const body: Record<string, unknown> = { status };
      if (isDrillOrSimulation !== undefined) {
        body.isDrillOrSimulation = isDrillOrSimulation;
      }
      const response = await apiRequest("PUT", `/api/incident-reports/${incidentId}`, body);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/incident-reports"] });
      setCloseDialogOpen(false);
      setCloseIncidentId(null);
      toast({
        title: "Success",
        description: "Incident status updated successfully",
      });
    },
    onError: (error: any) => {
      // Only show error toast if it's a real error (not a successful response)
      if (!error.status || error.status >= 400) {
        toast({
          title: "Error", 
          description: error.message || "Failed to update incident status",
          variant: "destructive",
        });
      }
    },
  });

  // Handle actions for incidents
  const handleAction = (incident: any, action: string) => {
    switch (action) {
      case "edit":
        setEditingIncident(incident);
        setIsEditModalOpen(true);
        break;
      case "delete":
        setIncidentToDelete(incident);
        setDeleteConfirmOpen(true);
        break;
      default:
        break;
    }
  };

  const filteredIncidents = incidents.filter((incident: any) => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery || (
      incident.incidentType?.toLowerCase().includes(searchLower) ||
      incident.description?.toLowerCase().includes(searchLower) ||
      incident.severity?.toLowerCase().includes(searchLower) ||
      incident.incidentLocation?.toLowerCase().includes(searchLower) ||
      incident.jobTitle?.toLowerCase().includes(searchLower) ||
      (!isOperationsRole && (
        incident.patient?.employee?.firstName?.toLowerCase().includes(searchLower) ||
        incident.patient?.employee?.lastName?.toLowerCase().includes(searchLower) ||
        incident.patient?.employee?.employeeNumber?.toLowerCase().includes(searchLower)
      )) ||
      (isOperationsRole && (
        incident.patient?.company?.name?.toLowerCase().includes(searchLower) ||
        CASUALTY_IP_LABEL.toLowerCase().includes(searchLower)
      ))
    );
    
    const matchesStatus = statusFilter === 'all' || incident.status === statusFilter;
    const matchesSeverity = severityFilter === 'all' || incident.severity === severityFilter;
    const matchesType = typeFilter === 'all' || incident.incidentType === typeFilter;
    const matchesLocation = locationFilter === 'all' || incident.location?.id === locationFilter;
    
    return matchesSearch && matchesStatus && matchesSeverity && matchesType && matchesLocation;
  });

  const getSeverityColor = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'minor': return 'bg-green-100 text-green-800 border-green-200';
      case 'moderate': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'major': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'catastrophic': return 'bg-red-200 text-red-900 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'open': return 'bg-red-100 text-red-800 border-red-200';
      case 'investigating': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'resolved': return 'bg-green-100 text-green-800 border-green-200';
      case 'closed': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  // Calculate statistics
  const stats = {
    total: incidents.length,
    open: incidents.filter((i: any) => i.status === 'open').length,
    major: incidents.filter((i: any) => ['major', 'critical', 'catastrophic'].includes(i.severity)).length,
    thisMonth: incidents.filter((i: any) => {
      const incidentDate = new Date(i.incidentDate);
      const now = new Date();
      return incidentDate.getMonth() === now.getMonth() && incidentDate.getFullYear() === now.getFullYear();
    }).length,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin h-8 w-8 border-2 border-uventorybiz-navy border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-full space-y-6 p-4 sm:p-6 pb-20 md:pb-8 bg-uventorybiz-light-gray overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-uventorybiz-navy flex items-center space-x-2 sm:space-x-3">
            <AlertTriangle className="h-6 w-6 sm:h-8 sm:w-8 text-red-500 flex-shrink-0" />
            <span className="truncate">Incident Management</span>
          </h1>
          <p className="text-uventorybiz-gray mt-2 text-sm sm:text-base">
            Comprehensive incident reporting and tracking for workplace safety.
          </p>
        </div>
        <Button 
          onClick={() => setIsIncidentModalOpen(true)}
          className="bg-red-600 hover:bg-red-700 text-white w-full sm:w-auto flex-shrink-0"
        >
          <Plus className="h-4 w-4 mr-2" />
          Report Incident
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 gap-6 w-full">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-uventorybiz-gray">Total Incidents</p>
                <p className="text-2xl font-bold text-uventorybiz-navy">{stats.total}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-uventorybiz-gray">Open Cases</p>
                <p className="text-2xl font-bold text-red-600">{stats.open}</p>
              </div>
              <Shield className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-uventorybiz-gray">Major+ Incidents</p>
                <p className="text-2xl font-bold text-orange-600">{stats.major}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-uventorybiz-gray">This Month</p>
                <p className="text-2xl font-bold text-uventorybiz-navy">{stats.thisMonth}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {/* Search Bar and Location */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder={
                    isOperationsRole
                      ? "Search by type, location, company, description..."
                      : "Search incidents by type, location, person, or description..."
                  }
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-full"
                />
              </div>
              {isMultiLocation && (
                <Select value={locationFilter || "all"} onValueChange={setLocationFilter}>
                  <SelectTrigger className="w-full sm:w-auto sm:min-w-[200px]">
                    <SelectValue placeholder="All Locations" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Locations</SelectItem>
                    {careLocations.map((location: any) => (
                      <SelectItem key={location.id} value={location.id}>
                        {location.locationCode} - {location.locationName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Filters Row */}
            <div className="flex flex-wrap gap-3 w-full">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[140px] md:w-[160px]">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="investigating">Investigating</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>

              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger className="w-full sm:w-[140px] md:w-[160px]">
                  <SelectValue placeholder="All Severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severity</SelectItem>
                  <SelectItem value="minor">Minor</SelectItem>
                  <SelectItem value="moderate">Moderate</SelectItem>
                  <SelectItem value="major">Major</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="catastrophic">Catastrophic</SelectItem>
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full sm:w-[160px] md:w-[180px]">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
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

              {isMultiLocation && careLocations.length > 0 && (
                <Select value={locationFilter} onValueChange={setLocationFilter}>
                  <SelectTrigger className="w-full sm:w-[160px] md:w-[180px]">
                    <SelectValue placeholder="All Locations" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Locations</SelectItem>
                    {careLocations.map((loc: any) => (
                      <SelectItem key={loc.id} value={loc.id}>
                        <div className="flex items-center gap-2">
                          <Hospital className="h-3 w-3" />
                          <span>{loc.locationCode}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <div className="flex items-center gap-2 w-full sm:w-auto sm:ml-auto flex-shrink-0">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchQuery("");
                    setStatusFilter("all");
                    setSeverityFilter("all");
                    setTypeFilter("all");
                    setLocationFilter("all");
                  }}
                >
                  Clear Filters
                </Button>
                
                {/* View Toggle */}
                <div className="flex items-center border rounded-md">
                  <Button
                    variant={viewMode === 'cards' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('cards')}
                    className="rounded-r-none"
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'table' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('table')}
                    className="rounded-l-none"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Incidents List */}
      {filteredIncidents.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">
              {searchQuery || statusFilter !== 'all' || severityFilter !== 'all' || typeFilter !== 'all' || locationFilter !== 'all'
                ? 'No incidents match your filters' 
                : 'No incidents reported'}
            </h3>
            <p className="text-gray-500">
              {searchQuery || statusFilter !== 'all' || severityFilter !== 'all' || typeFilter !== 'all' || locationFilter !== 'all'
                ? 'Try adjusting your filter criteria' 
                : 'Click "Report Incident" to create the first incident report'}
            </p>
          </CardContent>
        </Card>
      ) : viewMode === 'cards' ? (
        <div className="space-y-4 w-full">
          {
          filteredIncidents.map((incident: any) => (
            <Card key={incident.id} className="hover:shadow-md transition-shadow w-full">
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row sm:justify-between gap-4 w-full">
                  {/* Left Section - Main Info */}
                  <div className="flex-1 space-y-3 min-w-0">
                    {/* Header Row */}
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg text-uventorybiz-navy capitalize truncate">
                          {incident.incidentType?.replace('_', ' ') || 'Unknown Type'}
                        </h3>
                        <p className="text-sm text-gray-600 truncate">
                          {incidentPersonCardSubtitle(incident, isOperationsRole)}
                        </p>
                      </div>
                    </div>

                    {/* Key Details Row */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                      <div className="flex items-center gap-1.5 text-gray-600">
                        <Calendar className="h-4 w-4 flex-shrink-0" />
                        <span className="whitespace-nowrap">
                          {(() => {
                            if (!incident.incidentDate) return 'Unknown date';
                            const date = new Date(incident.incidentDate);
                            if (isNaN(date.getTime())) return 'Unknown date';
                            try {
                              return format(date, 'MMM dd, yyyy');
                            } catch {
                              return 'Unknown date';
                            }
                          })()}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-gray-600 min-w-0" title="Incident Location">
                        <MapPin className="h-4 w-4 text-red-500 flex-shrink-0" />
                        <span className="truncate max-w-[150px] sm:max-w-[200px]">{incident.incidentLocation}</span>
                      </div>
                      {incident.location && (
                        <div className="flex items-center gap-1.5 text-primary flex-shrink-0" title="Care Location">
                          <Hospital className="h-4 w-4" />
                          <span className="font-medium whitespace-nowrap">{incident.location.locationCode}</span>
                        </div>
                      )}
                    </div>

                    {/* Description Preview */}
                    <p className="text-sm text-gray-700 line-clamp-2">
                      {incident.description}
                    </p>

                    {/* Treatment Indicators */}
                    <div className="flex flex-wrap gap-2">
                      {incident.treatedOnSite && (
                        <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                          Treated On-Site
                        </Badge>
                      )}
                      {incident.detainedAtFap && (
                        <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200">
                          Held at site
                        </Badge>
                      )}
                      {incident.ambulanceUsed && (
                        <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
                          <Ambulance className="h-3 w-3 mr-1" />
                          Fleet unit
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Right Section - Status & Actions */}
                  <div className="flex sm:flex-col items-center sm:items-end gap-3 sm:gap-2 flex-shrink-0 w-full sm:w-auto">
                    {/* Badges */}
                    <div className="flex sm:flex-col gap-2">
                      <Badge className={`${getSeverityColor(incident.severity)} text-xs`}>
                        {incident.severity}
                      </Badge>
                      <Badge className={`${getStatusColor(incident.status)} text-xs`}>
                        {incident.status}
                      </Badge>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          setSelectedIncident(incident);
                          setIncidentDetailsOpen(true);
                        }}
                        className="text-blue-600 hover:text-blue-700"
                        title="View details"
                        data-testid={`view-incident-${incident.id}`}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" data-testid={`dropdown-incident-${incident.id}`}>
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleAction(incident, 'edit')}
                            data-testid={`edit-incident-${incident.id}`}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Incident
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setDispensedItemsIncident(incident)}
                            data-testid={`dispensed-items-incident-${incident.id}`}
                          >
                            <Package className="h-4 w-4 mr-2" />
                            Items used / dispensed
                          </DropdownMenuItem>
                          <IncidentStatusMenuItems
                            incidentId={incident.id}
                            status={incident.status}
                            onUpdate={(id, status) =>
                              updateIncidentMutation.mutate({ incidentId: id, status })
                            }
                            onRequestClose={(id) => {
                              setCloseIncidentId(id);
                              setCloseDialogOpen(true);
                            }}
                          />
                          <DropdownMenuItem
                            onClick={() => {
                              setIncidentToDelete(incident);
                              setDeleteConfirmOpen(true);
                            }}
                            className="text-red-600"
                            data-testid={`delete-incident-${incident.id}`}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Incident
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        // Table View
        <Card className="w-full">
          <CardContent className="p-0 overflow-x-auto w-full">
            <div className="min-w-full w-full">
              <Table className="w-full">
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>{isOperationsRole ? "Affected employee / employer" : "Affected employee"}</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Incident Location</TableHead>
                  {isMultiLocation && <TableHead>Care Location</TableHead>}
                  <TableHead>Severity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredIncidents.map((incident: any, index: number) => (
                  <TableRow key={incident.id}>
                    <TableCell className="font-medium text-gray-500">{index + 1}</TableCell>
                    <TableCell className="capitalize">{incident.incidentType?.replace('_', ' ')}</TableCell>
                    <TableCell>
                      <div className="min-w-[150px]">
                        <p className="font-medium text-sm">
                          {incidentPersonPrimaryLine(incident, isOperationsRole)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {incidentPersonSecondaryLine(incident, isOperationsRole) || "—"}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {format(new Date(incident.incidentDate), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate" title={incident.incidentLocation}>
                      {incident.incidentLocation}
                    </TableCell>
                    {isMultiLocation && (
                      <TableCell>
                        {incident.location ? (
                          <div className="flex items-center gap-1">
                            <Hospital className="h-3 w-3 text-primary" />
                            <span className="text-xs">{incident.location.locationCode}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </TableCell>
                    )}
                    <TableCell>
                      <Badge className={`${getSeverityColor(incident.severity)} text-xs`}>
                        {incident.severity}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${getStatusColor(incident.status)} text-xs`}>
                        {incident.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => {
                            setSelectedIncident(incident);
                            setIncidentDetailsOpen(true);
                          }}
                          title="View details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleAction(incident, 'edit')}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setDispensedItemsIncident(incident)}>
                              <Package className="h-4 w-4 mr-2" />
                              Items used / dispensed
                            </DropdownMenuItem>
                            <IncidentStatusMenuItems
                              incidentId={incident.id}
                              status={incident.status}
                              onUpdate={(id, status) =>
                                updateIncidentMutation.mutate({ incidentId: id, status })
                              }
                              onRequestClose={(id) => {
                                setCloseIncidentId(id);
                                setCloseDialogOpen(true);
                              }}
                            />
                            <DropdownMenuItem
                              onClick={() => {
                                setIncidentToDelete(incident);
                                setDeleteConfirmOpen(true);
                              }}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          </CardContent>
        </Card>
      )}

        {/* Incident Details Modal */}
        <Dialog open={incidentDetailsOpen} onOpenChange={setIncidentDetailsOpen}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader className="pb-4 border-b">
              <DialogTitle className="flex items-center text-xl">
                <AlertTriangle className="h-6 w-6 mr-2 text-red-600" />
                Incident Details
              </DialogTitle>
              <DialogDescription className="sr-only">
                View full details of this incident report
              </DialogDescription>
            </DialogHeader>
            {selectedIncident && (
              <div className="space-y-5 py-4">
                {/* Hero Section - Key Info at a Glance */}
                <div className="bg-gradient-to-br from-red-50 to-orange-50 border border-red-100 rounded-xl p-6">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    {/* Left - Main Info */}
                    <div className="flex-1 space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <AlertTriangle className="h-6 w-6 text-red-600" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-gray-900 capitalize mb-1">
                            {selectedIncident.incidentType?.replace('_', ' ')}
                          </h3>
                          <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {format(new Date(selectedIncident.incidentDate), 'MMM dd, yyyy • HH:mm')}
                            </span>
                            <span className="text-gray-400">•</span>
                            <span className="flex items-center gap-1">
                              <MapPin className="h-4 w-4 text-red-500" />
                              {selectedIncident.incidentLocation}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Right - Status Badges */}
                    <div className="flex flex-row md:flex-col gap-2 items-start">
                      <Badge className={`${getSeverityColor(selectedIncident.severity)} px-3 py-1 text-sm font-semibold`}>
                        {selectedIncident.severity}
                      </Badge>
                      <Badge className={`${getStatusColor(selectedIncident.status)} px-3 py-1 text-sm font-semibold`}>
                        {selectedIncident.status}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Two Column Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                  {/* Left Column - Main Information */}
                  <div className="lg:col-span-2 space-y-5">
                    {/* Affected employee card */}
                    <Card className="border-2">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <User className="h-4 w-4 text-blue-600" />
                          {isOperationsRole ? "Involved person (redacted)" : "Affected Employee"}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
                          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <User className="h-6 w-6 text-blue-600" />
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-gray-900 text-lg">
                              {incidentPersonPrimaryLine(selectedIncident, isOperationsRole)}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600 mt-1">
                              {isOperationsRole ? (
                                <>
                                  {selectedIncident.patient?.company?.name && (
                                    <span>
                                      a worker of{" "}
                                      <span className="font-medium text-gray-800">
                                        {selectedIncident.patient.company.name}
                                      </span>
                                    </span>
                                  )}
                                  {!selectedIncident.patient?.company?.name && (
                                    <span className="text-muted-foreground">{CASUALTY_IP_LABEL}</span>
                                  )}
                                  {selectedIncident.jobTitle && (
                                    <>
                                      <span className="text-gray-400">•</span>
                                      <span>{selectedIncident.jobTitle}</span>
                                    </>
                                  )}
                                </>
                              ) : (
                                <>
                                  <span className="font-medium">
                                    {selectedIncident.patient?.employee?.employeeNumber}
                                  </span>
                                  <span className="text-gray-400">•</span>
                                  <span>{selectedIncident.jobTitle}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        {isOperationsRole && (
                          <p className="text-xs text-muted-foreground px-1">
                            Name and employee identifiers are hidden for confidentiality. Employer name is shown for
                            context only.
                          </p>
                        )}
                      </CardContent>
                    </Card>

                    {/* Description Card */}
                    <Card className="border-2">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <FileText className="h-4 w-4 text-gray-600" />
                          Incident Description
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-gray-700 leading-relaxed">{selectedIncident.description}</p>
                      </CardContent>
                    </Card>

                    {/* Treatment & Response Card */}
                    <Card className="border-2">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Hospital className="h-4 w-4 text-green-600" />
                          Treatment & Response
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className={`p-4 rounded-lg border-2 text-center ${
                            selectedIncident.treatedOnSite 
                              ? 'bg-green-50 border-green-200' 
                              : 'bg-gray-50 border-gray-200'
                          }`}>
                            <div className={`w-8 h-8 rounded-full mx-auto mb-2 flex items-center justify-center ${
                              selectedIncident.treatedOnSite ? 'bg-green-500' : 'bg-gray-300'
                            }`}>
                              <CheckCircle className="h-5 w-5 text-white" />
                            </div>
                            <p className={`text-xs font-semibold ${
                              selectedIncident.treatedOnSite ? 'text-green-800' : 'text-gray-500'
                            }`}>
                              Treated On-Site
                            </p>
                          </div>
                          
                          <div className={`p-4 rounded-lg border-2 text-center ${
                            selectedIncident.detainedAtFap 
                              ? 'bg-orange-50 border-orange-200' 
                              : 'bg-gray-50 border-gray-200'
                          }`}>
                            <div className="mb-2">
                              <Hospital className={`h-8 w-8 mx-auto ${
                                selectedIncident.detainedAtFap ? 'text-orange-500' : 'text-gray-400'
                              }`} />
                            </div>
                            <p className={`text-xs font-semibold ${
                              selectedIncident.detainedAtFap ? 'text-orange-800' : 'text-gray-500'
                            }`}>
                              Held at site
                            </p>
                          </div>
                          
                          <div className={`p-4 rounded-lg border-2 text-center ${
                            selectedIncident.ambulanceUsed 
                              ? 'bg-red-50 border-red-200' 
                              : 'bg-gray-50 border-gray-200'
                          }`}>
                            <div className="mb-2">
                              <Ambulance className={`h-8 w-8 mx-auto ${
                                selectedIncident.ambulanceUsed ? 'text-red-500' : 'text-gray-400'
                              }`} />
                            </div>
                            <p className={`text-xs font-semibold ${
                              selectedIncident.ambulanceUsed ? 'text-red-800' : 'text-gray-500'
                            }`}>
                              Fleet vehicle used
                            </p>
                          </div>
                        </div>

                        {/* Emergency Medical Management */}
                        {selectedIncident.emergencyMedicalMgt && (
                          <div className="pt-4 border-t">
                            <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                              <Ambulance className="h-4 w-4 text-red-600" />
                              Immediate response
                            </h4>
                            <p className="text-sm text-gray-700 bg-red-50 p-3 rounded-lg leading-relaxed border border-red-100">
                              {selectedIncident.emergencyMedicalMgt}
                            </p>
                          </div>
                        )}

                        {/* Additional Actions */}
                        {selectedIncident.actionsTaken && (
                          <div className="pt-4 border-t">
                            <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                              <Shield className="h-4 w-4" />
                              Actions Taken
                            </h4>
                            <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg leading-relaxed">
                              {selectedIncident.actionsTaken}
                            </p>
                          </div>
                        )}

                        {/* Disposition Information */}
                        {(selectedIncident.dispositionDateTime || selectedIncident.generalConditionAtDisposition) && (
                          <div className="pt-4 border-t">
                            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-blue-600" />
                              Disposition
                            </h4>
                            <div className="space-y-3">
                              {selectedIncident.dispositionDateTime && (
                                <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                                  <Clock className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                                  <div className="flex-1">
                                    <p className="text-xs font-medium text-blue-800 uppercase tracking-wide mb-1">
                                      Disposition Date & Time
                                    </p>
                                    <p className="text-sm font-semibold text-gray-900">
                                      {format(new Date(selectedIncident.dispositionDateTime), 'MMM dd, yyyy • h:mm a')}
                                    </p>
                                  </div>
                                </div>
                              )}
                              {selectedIncident.generalConditionAtDisposition && (
                                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                                  <User className="h-4 w-4 text-gray-600 mt-0.5 flex-shrink-0" />
                                  <div className="flex-1">
                                    <p className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">
                                      General Condition at Disposition
                                    </p>
                                    <p className="text-sm text-gray-900 font-medium capitalize">
                                      {selectedIncident.generalConditionAtDisposition.replace(/_/g, ' ')}
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Uploaded Documents */}
                    {selectedIncident.incidentUploads && (
                      <Card className="border-2">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base flex items-center gap-2">
                            <FileText className="h-4 w-4 text-purple-600" />
                            Uploaded Documents
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {selectedIncident.incidentUploads.split(',').filter((f: string) => f.trim()).map((file: string, idx: number) => (
                              <div key={idx} className="flex items-center justify-between p-3 bg-purple-50 border border-purple-100 rounded-lg hover:bg-purple-100 transition-colors">
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                  <div className="w-8 h-8 bg-purple-200 rounded flex items-center justify-center flex-shrink-0">
                                    <FileText className="h-4 w-4 text-purple-700" />
                                  </div>
                                  <span className="text-sm text-gray-700 truncate">{file.split('/').pop()}</span>
                                </div>
                                <a 
                                  href={file} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="ml-3 px-3 py-1 bg-purple-600 text-white text-xs font-medium rounded hover:bg-purple-700 transition-colors flex-shrink-0"
                                >
                                  View
                                </a>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  {/* Right Column - Sidebar Information */}
                  <div className="space-y-5">
                    {/* Locations Card */}
                    <Card className="border-2 bg-gradient-to-br from-slate-50 to-gray-50">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold">Locations</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <MapPin className="h-4 w-4 text-red-500" />
                            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Incident Site</p>
                          </div>
                          <p className="text-sm font-medium text-gray-900 pl-6">
                            {selectedIncident.incidentLocation}
                          </p>
                          <p className="text-xs text-gray-500 pl-6 mt-0.5">Where it occurred</p>
                        </div>
                        
                        {selectedIncident.location && (
                          <div className="pt-3 border-t border-gray-200">
                            <div className="flex items-center gap-2 mb-2">
                              <Hospital className="h-4 w-4 text-primary" />
                              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Care Location</p>
                            </div>
                            <Badge variant="outline" className="ml-6 flex items-center gap-1 w-fit px-2 py-1">
                              <Hospital className="h-3 w-3" />
                              <span className="text-xs">{selectedIncident.location.locationCode}</span>
                            </Badge>
                            <p className="text-xs text-gray-700 pl-6 mt-1">
                              {selectedIncident.location.locationName}
                            </p>
                            <p className="text-xs text-gray-500 pl-6 mt-0.5">Treatment facility</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Timeline Card */}
                    <Card className="border-2 bg-gradient-to-br from-blue-50 to-indigo-50">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          Timeline
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="relative pl-6 pb-4 border-l-2 border-blue-200">
                          <div className="absolute left-0 top-0 w-4 h-4 bg-red-500 rounded-full -translate-x-[9px] border-2 border-white"></div>
                          <p className="text-xs font-semibold text-gray-600 mb-1">Incident Occurred</p>
                          <p className="text-sm font-bold text-gray-900">
                            {format(new Date(selectedIncident.incidentDate), 'MMM dd, yyyy')}
                          </p>
                          <p className="text-xs text-gray-600">
                            {format(new Date(selectedIncident.incidentDate), 'h:mm a')}
                          </p>
                        </div>
                        
                        {selectedIncident.reportedToFapDate && (
                          <div className="relative pl-6 border-l-2 border-blue-200">
                            <div className="absolute left-0 top-0 w-4 h-4 bg-blue-500 rounded-full -translate-x-[9px] border-2 border-white"></div>
                            <p className="text-xs font-semibold text-gray-600 mb-1">Reported to site office</p>
                            <p className="text-sm font-bold text-gray-900">
                              {format(new Date(selectedIncident.reportedToFapDate), 'MMM dd, yyyy')}
                            </p>
                            <p className="text-xs text-gray-600">
                              {format(new Date(selectedIncident.reportedToFapDate), 'h:mm a')}
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Reported To Card */}
                    {selectedIncident.reportedTo && (
                      <Card className="border-2 bg-gradient-to-br from-amber-50 to-yellow-50">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm font-semibold flex items-center gap-2">
                            <User className="h-4 w-4" />
                            Reported To
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-gray-700 leading-relaxed">
                            {selectedIncident.reportedTo}
                          </p>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Incident Report</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this incident report? This action cannot be undone.
                {incidentToDelete && (
                  <div className="mt-2 p-2 bg-gray-50 rounded">
                    <strong>{incidentToDelete.incidentType?.replace('_', ' ')}</strong>
                    <br />
                    {isOperationsRole
                      ? incidentPersonCardSubtitle(incidentToDelete, true)
                      : `${incidentToDelete.patient?.employee?.firstName ?? ""} ${incidentToDelete.patient?.employee?.lastName ?? ""}`.trim()}
                  </div>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (incidentToDelete) {
                    deleteIncidentMutation.mutate(incidentToDelete.id);
                  }
                }}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <IncidentDispensedItemsModal
          open={!!dispensedItemsIncident}
          onOpenChange={(open) => { if (!open) setDispensedItemsIncident(null); }}
          incident={dispensedItemsIncident}
        />

        {/* Edit Incident Modal */}
        {editingIncident && (
          <IncidentModal
            key={editingIncident.id}
            open={isEditModalOpen}
            onOpenChange={(open) => {
              setIsEditModalOpen(open);
              if (!open) {
                setEditingIncident(null);
              }
            }}
            editingIncident={editingIncident}
            onOpenDispensedItems={setDispensedItemsIncident}
          />
        )}

        {/* New Incident Modal */}
        <IncidentModal
          open={isIncidentModalOpen}
          onOpenChange={setIsIncidentModalOpen}
        />

        <CloseIncidentDialog
          open={closeDialogOpen}
          onOpenChange={(open) => {
            setCloseDialogOpen(open);
            if (!open) setCloseIncidentId(null);
          }}
          pending={updateIncidentMutation.isPending}
          onConfirm={(isDrillOrSimulation) => {
            if (closeIncidentId) {
              updateIncidentMutation.mutate({
                incidentId: closeIncidentId,
                status: "closed",
                isDrillOrSimulation,
              });
            }
          }}
        />
      
      <MobileNav />
    </div>
  );
}
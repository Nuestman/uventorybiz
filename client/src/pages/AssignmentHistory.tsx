import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useActiveLocation } from "@/hooks/useActiveLocation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Calendar, Clock, CheckCircle, XCircle, AlertTriangle, Filter, History, TrendingUp, LayoutGrid, List, ChevronDown } from "lucide-react";
import { formatDistanceToNow, format, parseISO, startOfDay, endOfDay } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import MobileNav from "@/components/MobileNav";
import { buildAssignmentHistoryQuery, parseAssignmentHistoryResponse } from "@/lib/duty/assignmentHistoryList";

const ASSIGNMENT_PAGE_SIZE = 25;

type Assignment = {
  id: string;
  locationId?: string;
  status: string;
  assignmentDate: string;
  shift: string;
  completedAt?: string;
  cancelledAt?: string;
  startedAt?: string;
  notes?: string;
  cancellationReason?: string;
  duty: {
    id: string;
    title: string;
    category: string;
    priority: string;
  };
  assignedTo?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  completedBy?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  cancelledBy?: {
    id: string;
    firstName: string;
    lastName: string;
  };
};

type Analytics = {
  totalAssignments: number;
  completedCount: number;
  cancelledCount: number;
  pendingCount: number;
  completionRate: number;
  avgCompletionTime: number;
};

const statusColors = {
  pending: "bg-yellow-100 text-yellow-800",
  in_progress: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
  overdue: "bg-orange-100 text-orange-800",
};

const priorityColors = {
  low: "bg-gray-100 text-gray-800",
  normal: "bg-blue-100 text-blue-800",
  high: "bg-orange-100 text-orange-800",
  urgent: "bg-red-100 text-red-800",
};

export default function AssignmentHistory() {
  const [dateFilter, setDateFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [userFilter, setUserFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [searchFilter, setSearchFilter] = useState("");
  const [assignmentPage, setAssignmentPage] = useState(1);
  const [assignmentsViewMode, setAssignmentsViewMode] = useState<'cards' | 'table'>('table');
  const [activeTab, setActiveTab] = useState("history");
  const locationDefaultSet = useRef(false);
  const { activeLocation } = useActiveLocation();

  // Listen for sidebar tab navigation
  useEffect(() => {
    const handleTabNavigate = (e: CustomEvent) => {
      setActiveTab(e.detail.tabValue);
    };
    window.addEventListener('sidebar-tab-navigate', handleTabNavigate as EventListener);
    
    // Check URL hash on mount
    const hash = window.location.hash.replace('#', '');
    if (hash && ['history', 'analytics'].includes(hash)) {
      setActiveTab(hash);
    }

    return () => {
      window.removeEventListener('sidebar-tab-navigate', handleTabNavigate as EventListener);
    };
  }, []);

  const { toast } = useToast();

  // Fetch care locations for assignment location filter
  const { data: careLocations = [] } = useQuery({
    queryKey: ['/api/care-locations'],
    queryFn: async () => {
      const res = await fetch('/api/care-locations');
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Default location filter to logged-in user's location (once)
  useEffect(() => {
    if (locationDefaultSet.current || !activeLocation?.id) return;
    setLocationFilter(activeLocation.id);
    locationDefaultSet.current = true;
  }, [activeLocation?.id]);

  // Fetch assignment history (server-paginated)
  const assignmentListQueryKey = {
    page: assignmentPage,
    pageSize: ASSIGNMENT_PAGE_SIZE,
    date: dateFilter,
    status: statusFilter,
    userId: userFilter,
    locationId: locationFilter,
    search: searchFilter,
  };

  const { data: assignmentsListData, isLoading, isError: assignmentsError, error: assignmentsErrorObj } = useQuery({
    queryKey: ['/api/duty-assignments/history', assignmentListQueryKey],
    queryFn: async () => {
      try {
        const qs = buildAssignmentHistoryQuery(assignmentListQueryKey);
        const res = await fetch(`/api/duty-assignments/history${qs}`);
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ message: 'Failed to fetch assignment history' }));
          throw new Error(errorData.message || `Failed to fetch assignment history: ${res.status}`);
        }
        return parseAssignmentHistoryResponse(await res.json());
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch assignment history';
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
        throw error;
      }
    },
    retry: false,
  });

  useEffect(() => {
    setAssignmentPage(1);
  }, [dateFilter, statusFilter, userFilter, locationFilter, searchFilter]);

  // Fetch analytics
  const { data: analytics, isError: analyticsError, error: analyticsErrorObj } = useQuery({
    queryKey: ['/api/duty-assignments/analytics', dateFilter, locationFilter],
    queryFn: async () => {
      try {
        const params = new URLSearchParams();
        if (dateFilter) params.append('date', dateFilter);
        if (locationFilter && locationFilter !== 'all') params.append('locationId', locationFilter);
        
        const res = await fetch(`/api/duty-assignments/analytics?${params.toString()}`);
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ message: 'Failed to fetch analytics' }));
          throw new Error(errorData.message || `Failed to fetch analytics: ${res.status}`);
        }
        return await res.json();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch analytics';
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
        return null;
      }
    },
    retry: false,
  });

  // Fetch users for filter dropdown
  const { data: users = [], isError: usersError, error: usersErrorObj } = useQuery({
    queryKey: ['/api/users'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/users');
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ message: 'Failed to fetch users' }));
          throw new Error(errorData.message || `Failed to fetch users: ${res.status}`);
        }
        const data = await res.json();
        return Array.isArray(data) ? data : [];
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch users';
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
        return [];
      }
    },
    retry: false,
  });

  // Show error toasts
  useEffect(() => {
    if (assignmentsError && assignmentsErrorObj) {
      const errorMessage = assignmentsErrorObj instanceof Error ? assignmentsErrorObj.message : 'Failed to fetch assignment history';
      toast({
        title: "Error Loading Assignment History",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }, [assignmentsError, assignmentsErrorObj, toast]);

  useEffect(() => {
    if (usersError && usersErrorObj) {
      const errorMessage = usersErrorObj instanceof Error ? usersErrorObj.message : 'Failed to fetch users';
      toast({
        title: "Error Loading Users",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }, [usersError, usersErrorObj, toast]);

  useEffect(() => {
    if (analyticsError && analyticsErrorObj) {
      const errorMessage = analyticsErrorObj instanceof Error ? analyticsErrorObj.message : 'Failed to fetch analytics';
      toast({
        title: "Error Loading Analytics",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }, [analyticsError, analyticsErrorObj, toast]);

  const filteredAssignments = assignmentsListData?.rows ?? [];
  const assignmentTotalCount = assignmentsListData?.totalCount ?? 0;
  const assignmentTotalPages = Math.max(1, Math.ceil(assignmentTotalCount / ASSIGNMENT_PAGE_SIZE));

  // Group assignments by date (current page)
  const groupedAssignments = filteredAssignments.reduce((acc: Record<string, Assignment[]>, assignment: Assignment) => {
    const date = format(parseISO(assignment.assignmentDate), 'yyyy-MM-dd');
    if (!acc[date]) acc[date] = [];
    acc[date].push(assignment);
    return acc;
  }, {} as Record<string, Assignment[]>);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'overdue':
        return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      default:
        return <Clock className="h-4 w-4 text-blue-600" />;
    }
  };

  // Show error messages if any queries failed
  const hasErrors = assignmentsError || usersError || analyticsError;
  const errorMessages: string[] = [];
  if (assignmentsErrorObj) errorMessages.push(`Assignment History: ${assignmentsErrorObj instanceof Error ? assignmentsErrorObj.message : 'Failed to load'}`);
  if (usersErrorObj) errorMessages.push(`Users: ${usersErrorObj instanceof Error ? usersErrorObj.message : 'Failed to load'}`);
  if (analyticsErrorObj) errorMessages.push(`Analytics: ${analyticsErrorObj instanceof Error ? analyticsErrorObj.message : 'Failed to load'}`);

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <History className="h-8 w-8 text-uventorybiz-navy shrink-0" />
            Loading assignment history…
          </h2>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 pb-20 md:pb-8 bg-uventorybiz-light-gray" data-testid="assignment-history-page">
      <div className="mb-2">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <History className="h-8 w-8 text-uventorybiz-navy shrink-0" />
          Assignment History & Analytics
        </h2>
        <p className="text-uventorybiz-gray mt-1">
          Review operational duty assignments, outcomes, and summary metrics across your sites.
        </p>
      </div>

      {/* Error Messages */}
      {hasErrors && errorMessages.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Error Loading Data
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-1 text-sm text-red-700">
              {errorMessages.map((msg, idx) => (
                <li key={idx}>{msg}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="tabs-list-custom mb-6">
          <TabsList className="grid w-full grid-cols-2 bg-transparent h-auto p-1 gap-1 lg:gap-2">
            <TabsTrigger value="history" className="tab-trigger-custom text-xs sm:text-sm">Assignment History</TabsTrigger>
            <TabsTrigger value="analytics" className="tab-trigger-custom text-xs sm:text-sm">Analytics & Reports</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="analytics" className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Assignment History & Analytics</h3>
          </div>

          {/* Analytics Cards */}
          {analytics && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics.totalAssignments}</div>
                  <p className="text-xs text-muted-foreground">All assignments</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Rate</CardTitle>
                  <TrendingUp className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {analytics.completionRate.toFixed(1)}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {analytics.completedCount} completed
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Cancelled</CardTitle>
                  <XCircle className="h-4 w-4 text-red-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{analytics.cancelledCount}</div>
                  <p className="text-xs text-muted-foreground">
                    {analytics.totalAssignments > 0 ? ((analytics.cancelledCount / analytics.totalAssignments) * 100).toFixed(1) : 0}%
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending</CardTitle>
                  <Clock className="h-4 w-4 text-yellow-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600">{analytics.pendingCount}</div>
                  <p className="text-xs text-muted-foreground">Outstanding</p>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          {/* Filters */}
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
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
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
                      {Array.isArray(users) && users.map((user: any) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.firstName} {user.lastName}
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
                                const loc = Array.isArray(careLocations)
                                  ? careLocations.find((l: any) => l.id === locationFilter)
                                  : null;
                                return loc
                                  ? `${loc.locationCode || loc.code || ""} – ${loc.locationName || loc.name || ""}`.trim() || "Location"
                                  : "Location";
                              })()}
                        </span>
                        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="max-h-[var(--radix-dropdown-menu-content-available-height)] min-w-[var(--radix-popper-anchor-width)] overflow-y-auto">
                      <DropdownMenuItem onClick={() => setLocationFilter("all")}>
                        All locations
                      </DropdownMenuItem>
                      {Array.isArray(careLocations) &&
                        careLocations.map((loc: any) => (
                          <DropdownMenuItem
                            key={loc.id}
                            onClick={() => setLocationFilter(loc.id)}
                          >
                            {loc.locationCode != null && loc.locationName != null
                              ? `${loc.locationCode} – ${loc.locationName}`
                              : (loc.code != null && loc.name != null ? `${loc.code} – ${loc.name}` : loc.locationName || loc.name || loc.id)}
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

              {/* View Toggle */}
              <div className="flex justify-end mt-4">
                <div className="flex items-center border rounded-md">
                  <Button
                    type="button"
                    variant={assignmentsViewMode === 'cards' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setAssignmentsViewMode('cards')}
                    className="rounded-r-none"
                    title="Card view"
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant={assignmentsViewMode === 'table' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setAssignmentsViewMode('table')}
                    className="rounded-l-none"
                    title="Table view"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Assignment History */}
          {Object.keys(groupedAssignments).length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <div className="text-gray-500">No assignments found for the selected filters</div>
              </CardContent>
            </Card>
          ) : assignmentsViewMode === 'cards' ? (
            <div className="space-y-6">
              {(Object.entries(groupedAssignments) as [string, Assignment[]][])
                .sort(([dateA], [dateB]) => dateB.localeCompare(dateA))
                .map(([date, dayAssignments]) => (
                  <Card key={date}>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Calendar className="h-5 w-5" />
                        <span>{format(parseISO(date), 'EEEE, MMMM do, yyyy')}</span>
                        <Badge variant="outline" className="ml-auto">
                          {dayAssignments.length} assignments
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {dayAssignments.map((assignment) => (
                          <div
                            key={assignment.id}
                            className="flex items-start justify-between p-4 border rounded-lg"
                            data-testid={`assignment-${assignment.id}`}
                          >
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                {getStatusIcon(assignment.status)}
                                <h3 className="font-medium">{assignment.duty?.title || 'Unknown Duty'}</h3>
                                <Badge className={priorityColors[assignment.duty?.priority as keyof typeof priorityColors] || priorityColors.normal}>
                                  {assignment.duty?.priority || 'normal'}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {assignment.shift}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-600 mb-2">
                                {assignment.duty?.category || 'Unknown'} — {assignment.duty?.title || 'Unknown duty'}
                              </p>
                              {assignment.locationId && (
                                <div className="text-xs text-gray-500">
                                  Post: {(() => {
                                    const loc = Array.isArray(careLocations)
                                      ? careLocations.find((l: any) => l.id === assignment.locationId)
                                      : null;
                                    return loc
                                      ? (loc.locationCode ? `${loc.locationCode} – ${loc.locationName}` : loc.locationName)
                                      : assignment.locationId;
                                  })()}
                                </div>
                              )}
                              <div className="text-xs text-gray-500 space-y-1">
                                <div>
                                  Assigned to: {assignment.assignedTo ?
                                    `${assignment.assignedTo.firstName} ${assignment.assignedTo.lastName}` :
                                    'Unassigned'}
                                </div>
                                {assignment.status === 'completed' && assignment.completedAt && (
                                  <div className="text-green-600">
                                    ✓ Completed {formatDistanceToNow(parseISO(assignment.completedAt))} ago
                                    {assignment.completedBy && ` by ${assignment.completedBy.firstName} ${assignment.completedBy.lastName}`}
                                  </div>
                                )}
                                {assignment.status === 'cancelled' && assignment.cancelledAt && (
                                  <div className="text-red-600">
                                    ✗ Cancelled {formatDistanceToNow(parseISO(assignment.cancelledAt))} ago
                                    {assignment.cancelledBy && ` by ${assignment.cancelledBy.firstName} ${assignment.cancelledBy.lastName}`}
                                  </div>
                                )}
                                {assignment.notes && (
                                  <div className="bg-gray-50 p-2 rounded text-xs mt-2">
                                    <strong>Notes:</strong> {assignment.notes}
                                  </div>
                                )}
                                {assignment.cancellationReason && (
                                  <div className="bg-red-50 p-2 rounded text-xs mt-2">
                                    <strong>Cancellation reason:</strong> {assignment.cancellationReason}
                                  </div>
                                )}
                              </div>
                            </div>
                            <Badge className={statusColors[assignment.status as keyof typeof statusColors] || statusColors.pending}>
                              {assignment.status?.replace('_', ' ') || 'unknown'}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Duty</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Post (location)</TableHead>
                      <TableHead>Assigned To</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Shift</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(Object.entries(groupedAssignments) as [string, Assignment[]][])
                      .sort(([dateA], [dateB]) => dateB.localeCompare(dateA))
                      .flatMap(([date, dayAssignments]) =>
                        dayAssignments.map((assignment, idx) => ({
                          ...assignment,
                          date,
                          _index: idx,
                        }))
                      )
                      .map((assignment: Assignment & { date: string }, index: number) => (
                        <TableRow key={assignment.id}>
                          <TableCell className="font-medium text-gray-500">{(assignmentPage - 1) * ASSIGNMENT_PAGE_SIZE + index + 1}</TableCell>
                          <TableCell>
                            <div className="min-w-[150px]">
                              <p className="font-medium text-sm">{assignment.duty?.title || 'Unknown Duty'}</p>
                              <p className="text-xs text-gray-500">{assignment.duty?.title}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">{assignment.duty?.category || 'Unknown'}</TableCell>
                          <TableCell className="text-sm">
                            {assignment.locationId
                              ? (() => {
                                  const loc = Array.isArray(careLocations)
                                    ? careLocations.find((l: any) => l.id === assignment.locationId)
                                    : null;
                                  return loc
                                    ? (loc.locationCode ? `${loc.locationCode} – ${loc.locationName}` : loc.locationName)
                                    : assignment.locationId;
                                })()
                              : '—'}
                          </TableCell>
                          <TableCell className="text-sm">
                            {assignment.assignedTo ?
                              `${assignment.assignedTo.firstName} ${assignment.assignedTo.lastName}` :
                              'Unassigned'}
                          </TableCell>
                          <TableCell className="text-sm">
                            {format(parseISO(assignment.date), 'MMM dd, yyyy')}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {assignment.shift}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={`${priorityColors[assignment.duty?.priority as keyof typeof priorityColors] || priorityColors.normal} text-xs`}>
                              {assignment.duty?.priority || 'normal'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={`${statusColors[assignment.status as keyof typeof statusColors] || statusColors.pending} text-xs`}>
                              {assignment.status?.replace('_', ' ') || 'unknown'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {!isLoading && assignmentTotalCount > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                Page {assignmentPage} of {assignmentTotalPages} · {assignmentTotalCount.toLocaleString()} assignments
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={assignmentPage <= 1}
                  onClick={() => setAssignmentPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={assignmentPage >= assignmentTotalPages}
                  onClick={() => setAssignmentPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
      <MobileNav />
    </div>
  );
}
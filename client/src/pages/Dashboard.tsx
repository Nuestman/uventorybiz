import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useActiveLocation } from "@/hooks/useActiveLocation";
import AppointmentCard from "@/components/AppointmentCard";
import NewAppointmentModal from "@/components/modals/NewAppointmentModal";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Users, AlertTriangle, ShoppingCart, Package, Plus, Clock, CheckCircle, AlertCircle, Shield, XCircle, LayoutGrid, List } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import MobileNav from "@/components/MobileNav";
import { DashboardGreeting } from "@/components/DashboardGreeting";
import { APP_VERSION } from "@/lib/appVersion";

export default function Dashboard() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();
  const { activeLocation } = useActiveLocation();
  const [newAppointmentModalOpen, setNewAppointmentModalOpen] = useState(false);
  const [assignmentsViewMode, setAssignmentsViewMode] = useState<'cards' | 'table'>('table');
  const [appointmentsViewMode, setAppointmentsViewMode] = useState<'cards' | 'table'>('table');

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
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
  }, [isAuthenticated, isLoading, toast]);

  type DashboardMetrics = {
    activeCustomers: number;
    totalCustomers: number;
    todaySales: number;
    todayAppointments: number;
    completedAppointments: number;
  };

  const { data: metrics, isLoading: metricsLoading, isError: metricsError } = useQuery<DashboardMetrics>({
    queryKey: ["/api/dashboard/metrics"],
    retry: false,
  });

  const { data: recentEmployees = [], isLoading: employeesLoading } = useQuery<any[]>({
    queryKey: ["/api/employees"],
    retry: false,
  });

  const { data: todayAppointments = [], isLoading: appointmentsLoading, isError: appointmentsError } = useQuery<any[]>({
    queryKey: ["/api/appointments", { today: "true" }],
    retry: false,
  });

  // Fetch today's duty assignments for the Today's Assignments widget (by current location when set)
  const { data: todayDutyAssignments = [], isLoading: dutyAssignmentsLoading } = useQuery<any[]>({
    queryKey: ['/api/duty-assignments', 'today', activeLocation?.id ?? 'all'],
    queryFn: () => {
      const url = activeLocation?.id
        ? `/api/duty-assignments/today?locationId=${encodeURIComponent(activeLocation.id)}`
        : '/api/duty-assignments/today';
      return fetch(url).then(res => res.json());
    },
    retry: false,
  });

  if (isLoading || metricsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-uventorybiz-navy mx-auto mb-4"></div>
          <p className="text-uventorybiz-gray">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Ensure metrics is always defined
  const safeMetrics = metrics || {
    activeCustomers: 0,
    totalCustomers: 0,
    todaySales: 0,
    todayAppointments: 0,
    completedAppointments: 0,
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 pb-20 md:pb-8 bg-uventorybiz-light-gray">
      {/* Dashboard Header */}
      <DashboardGreeting
        firstName={user?.firstName ?? "there"}
        action={
          <div className="flex flex-wrap gap-2">
            <Link href="/admin">
              <Button variant="outline">
                <Shield className="h-4 w-4 mr-2" />
                Admin Panel
              </Button>
            </Link>
            <Link href="/pos">
              <Button className="bg-uventorybiz-navy text-white hover:bg-uventorybiz-navy/90">
                <ShoppingCart className="h-4 w-4 mr-2" />
                New Sale
              </Button>
            </Link>
          </div>
        }
      />

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="card-hover-accent cursor-pointer">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-uventorybiz-gray">Active Customers</p>
                <p className="text-3xl font-bold text-gray-900">
                  {safeMetrics.activeCustomers || 0}
                </p>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <Users className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <div className="flex items-center mt-4">
              <span className="text-green-600 text-sm font-medium">Active</span>
              <span className="text-uventorybiz-gray text-sm ml-2">in system</span>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover-accent cursor-pointer">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-uventorybiz-gray">Today's Appointments</p>
                <p className="text-3xl font-bold text-gray-900">
                  {safeMetrics.todayAppointments || 0}
                </p>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div className="flex items-center mt-4">
              <span className="text-blue-600 text-sm font-medium">
                {(safeMetrics.completedAppointments || 0)} completed
              </span>
              <span className="text-uventorybiz-gray text-sm ml-2">
                {Math.max(0, (safeMetrics.todayAppointments || 0) - (safeMetrics.completedAppointments || 0))} pending
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover-accent cursor-pointer">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-uventorybiz-gray">Incident Reports</p>
                <p className="text-3xl font-bold text-gray-900">
                  {(metrics as any)?.totalIncidents || 0}
                </p>
              </div>
              <div className="bg-orange-100 p-3 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-orange-600" />
              </div>
            </div>
            <div className="flex items-center mt-4">
              <span className="text-orange-600 text-sm font-medium">
                {(metrics as any)?.openIncidents || 0} open
              </span>
              <span className="text-uventorybiz-gray text-sm ml-2">
                {Math.max(0, ((metrics as any)?.totalIncidents || 0) - ((metrics as any)?.openIncidents || 0))} resolved
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover-accent cursor-pointer">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-uventorybiz-gray">Sales Today</p>
                <p className="text-3xl font-bold text-gray-900">
                  {safeMetrics.todaySales || 0}
                </p>
              </div>
              <div className="bg-purple-100 p-3 rounded-lg">
                <ShoppingCart className="h-6 w-6 text-purple-600" />
              </div>
            </div>
            <div className="flex items-center mt-4">
              <span className="text-purple-600 text-sm font-medium">Completed sales</span>
              <span className="text-uventorybiz-gray text-sm ml-2">at the till today</span>
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Today's Assignments & Recent Patients */}
          <div className="lg:col-span-2 space-y-8">
            {/* Today's Assignments Section */}
            <Card>
              <CardHeader className="border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center space-x-2">
                      <Calendar className="h-5 w-5" />
                      <span>Today's Assignments</span>
                    </CardTitle>
                    <CardDescription>
                      Track and complete operational duties for today
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center border rounded-md">
                      <Button
                        variant={assignmentsViewMode === 'cards' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setAssignmentsViewMode('cards')}
                        className="rounded-r-none"
                      >
                        <LayoutGrid className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={assignmentsViewMode === 'table' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setAssignmentsViewMode('table')}
                        className="rounded-l-none"
                      >
                        <List className="h-4 w-4" />
                      </Button>
                    </div>
                    <Link href="/operational-duties">
                      <Button variant="link" className="text-uventorybiz-navy hover:text-uventorybiz-navy/80">
                        View All
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {dutyAssignmentsLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="animate-pulse">
                        <div className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex-1 space-y-2">
                            <div className="h-4 bg-gray-300 rounded w-2/3"></div>
                            <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                            <div className="h-3 bg-gray-300 rounded w-1/3"></div>
                          </div>
                          <div className="flex space-x-2">
                            <div className="h-6 w-16 bg-gray-300 rounded"></div>
                            <div className="h-8 w-8 bg-gray-300 rounded"></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : Array.isArray(todayDutyAssignments) && todayDutyAssignments.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-uventorybiz-gray">No duties assigned for today</p>
                  </div>
                ) : assignmentsViewMode === 'table' ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">#</TableHead>
                          <TableHead>Duty</TableHead>
                          <TableHead>Priority</TableHead>
                          <TableHead>Shift</TableHead>
                          <TableHead>Assigned To</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {todayDutyAssignments.map((assignment: any, index) => (
                          <TableRow key={assignment.id}>
                            <TableCell className="font-medium text-muted-foreground tabular-nums">{index + 1}</TableCell>
                            <TableCell className="font-medium">{assignment.duty?.title}</TableCell>
                            <TableCell>
                              <Badge className={`${
                                assignment.duty?.priority === 'low' ? 'bg-blue-100 text-blue-800' :
                                assignment.duty?.priority === 'normal' ? 'bg-green-100 text-green-800' :
                                assignment.duty?.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                                'bg-red-100 text-red-800'
                              } text-xs`}>
                                {assignment.duty?.priority || '—'}
                              </Badge>
                            </TableCell>
                            <TableCell>{assignment.shift || '—'}</TableCell>
                            <TableCell>
                              {assignment.assignedToId && assignment.assignedTo
                                ? `${assignment.assignedTo.firstName} ${assignment.assignedTo.lastName}`
                                : 'Any staff on duty'}
                            </TableCell>
                            <TableCell>
                              {assignment.status === 'completed' ? (
                                <Badge className="bg-green-100 text-green-800">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Completed
                                </Badge>
                              ) : assignment.status === 'cancelled' ? (
                                <Badge variant="destructive">
                                  <XCircle className="h-3 w-3 mr-1" />
                                  Cancelled
                                </Badge>
                              ) : (
                                <Badge variant="outline">
                                  <Clock className="h-3 w-3 mr-1" />
                                  Pending
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {todayDutyAssignments.map((assignment: any) => (
                      <div
                        key={assignment.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <h3 className="font-medium">{assignment.duty?.title}</h3>
                            <Badge className={`${
                              assignment.duty?.priority === 'low' ? 'bg-blue-100 text-blue-800' :
                              assignment.duty?.priority === 'normal' ? 'bg-green-100 text-green-800' :
                              assignment.duty?.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                              'bg-red-100 text-red-800'
                            } text-xs`}>
                              {assignment.duty?.priority}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {assignment.shift}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            {assignment.duty?.category} — {assignment.duty?.title}
                          </p>
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
                            <Badge className="bg-green-100 text-green-800">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Completed
                            </Badge>
                          ) : assignment.status === 'cancelled' ? (
                            <Badge variant="destructive">
                              <XCircle className="h-3 w-3 mr-1" />
                              Cancelled
                            </Badge>
                          ) : (
                            <Badge variant="outline">
                              <Clock className="h-3 w-3 mr-1" />
                              Pending
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                    {todayDutyAssignments.length > 3 && (
                      <div className="text-center pt-4 border-t">
                        <Link href="/operational-duties">
                          <Button variant="link" className="text-uventorybiz-navy hover:text-uventorybiz-navy/80">
                            View All Assignments ({todayDutyAssignments.length - 3} more)
                          </Button>
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Employees Section */}
            <Card className="">
              <CardHeader className="border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <CardTitle className="font-semibold">Recent Employees</CardTitle>
                  <Link href="/admin">
                    <Button variant="link" className="text-uventorybiz-navy hover:text-uventorybiz-navy/80">
                      View All
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {employeesLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="animate-pulse">
                        <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                          <div className="w-12 h-12 bg-gray-300 rounded-full"></div>
                          <div className="flex-1 space-y-2">
                            <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                            <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : Array.isArray(recentEmployees) && recentEmployees.length > 0 ? (
                  <div className="space-y-4">
                    {recentEmployees.slice(0, 3).map((employee: any) => {
                      if (!employee || !employee.id) return null;
                      return (
                        <div key={employee.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors space-y-3 sm:space-y-0 card-hover-accent">
                          <div className="flex items-center space-x-4 min-w-0 flex-1">
                            <div className="w-12 h-12 bg-uventorybiz-navy rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
                              {employee.firstName?.charAt(0) || 'U'}{employee.lastName?.charAt(0) || 'N'}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-gray-900 truncate">
                                {employee.firstName || 'Unknown'} {employee.lastName || 'Employee'}
                              </p>
                              <p className="text-sm text-uventorybiz-gray truncate">Employee: {employee.employeeNumber || 'N/A'}</p>
                              <p className="text-sm text-uventorybiz-gray truncate">
                                Department: {employee.department || 'N/A'}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 flex-shrink-0">
                            <Badge 
                              variant={employee.status === 'active' ? 'default' : 'secondary'}
                              className="w-fit"
                            >
                              {employee.status || 'unknown'}
                            </Badge>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => setNewAppointmentModalOpen(true)}
                              className="w-full sm:w-auto"
                            >
                              Schedule
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-uventorybiz-gray">No employees registered yet</p>
                  </div>
                )}
              </CardContent>
            </Card>


          </div>

          {/* Right Column: Appointments & Quick Actions */}
          <div className="space-y-8">
            {/* Today's Appointments */}
            <Card>
              <CardHeader className="border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <CardTitle className="font-semibold">Today's Appointments</CardTitle>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center border rounded-md">
                      <Button
                        variant={appointmentsViewMode === 'cards' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setAppointmentsViewMode('cards')}
                        className="rounded-r-none"
                      >
                        <LayoutGrid className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={appointmentsViewMode === 'table' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setAppointmentsViewMode('table')}
                        className="rounded-l-none"
                      >
                        <List className="h-4 w-4" />
                      </Button>
                    </div>
                    <Button 
                      variant="link" 
                      className="text-uventorybiz-navy hover:text-uventorybiz-navy/80"
                      onClick={() => setNewAppointmentModalOpen(true)}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      New
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {appointmentsLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="animate-pulse">
                        <div className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg">
                          <div className="w-8 h-8 bg-gray-300 rounded-lg"></div>
                          <div className="flex-1 space-y-2">
                            <div className="h-4 bg-gray-300 rounded w-2/3"></div>
                            <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : Array.isArray(todayAppointments) && todayAppointments.length > 0 ? (
                  appointmentsViewMode === 'table' ? (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12">#</TableHead>
                            <TableHead>Time</TableHead>
                            <TableHead>Employee</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {todayAppointments.map((appointment: any, index) => {
                            if (!appointment || !appointment.id) return null;
                            const data = appointment.appointment || appointment;
                            const timeStr = data.appointmentDate
                              ? new Date(data.appointmentDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
                              : '—';
                            const name = appointment.employee
                              ? `${appointment.employee.firstName || ''} ${appointment.employee.lastName || ''}`.trim() || '—'
                              : '—';
                            return (
                              <TableRow key={appointment.id}>
                                <TableCell className="font-medium text-muted-foreground tabular-nums">{index + 1}</TableCell>
                                <TableCell className="font-medium">{timeStr}</TableCell>
                                <TableCell>{name}</TableCell>
                                <TableCell className="capitalize">{data.appointmentType || '—'}</TableCell>
                                <TableCell>
                                  <Badge variant={data.status === 'completed' ? 'secondary' : data.status === 'cancelled' ? 'destructive' : 'default'}>
                                    {data.status || 'scheduled'}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {todayAppointments.map((appointment: any) => {
                        if (!appointment || !appointment.id) return null;
                        return <AppointmentCard key={appointment.id} appointment={appointment} />;
                      })}
                    </div>
                  )
                ) : (
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-uventorybiz-gray">No appointments scheduled for today</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader className="border-b border-gray-200">
                <CardTitle className="font-semibold">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex flex-col gap-3">
                  <Link href="/pos">
                    <Button className="w-full justify-between bg-uventorybiz-navy hover:bg-uventorybiz-navy/90 text-white">
                      <div className="flex items-center space-x-3">
                        <ShoppingCart className="h-4 w-4" />
                        <span className="font-medium">Point of Sale</span>
                      </div>
                    </Button>
                  </Link>

                  <Button 
                    variant="outline" 
                    className="w-full justify-between"
                    onClick={() => setNewAppointmentModalOpen(true)}
                  >
                    <div className="flex items-center space-x-3">
                      <Calendar className="h-4 w-4 text-uventorybiz-navy" />
                      <span className="font-medium text-gray-900">Schedule Appointment</span>
                    </div>
                  </Button>

                  <Link href="/incidents">
                    <Button variant="outline" className="w-full justify-between">
                      <div className="flex items-center space-x-3">
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                        <span className="font-medium text-gray-900">Incident Management</span>
                      </div>
                    </Button>
                  </Link>

                  <Link href="/inventory">
                    <Button variant="outline" className="w-full justify-between">
                      <div className="flex items-center space-x-3">
                        <Package className="h-4 w-4 text-green-600" />
                        <span className="font-medium text-gray-900">Inventory</span>
                      </div>
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* System Status */}
            <Card>
              <CardHeader className="border-b border-gray-200">
                <CardTitle className="font-semibold">System Status</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-uventorybiz-coral rounded-full"></div>
                      <span className="text-sm font-medium text-gray-900">Version</span>
                    </div>
                    <Badge variant="outline" className="text-xs bg-uventorybiz-coral/10 text-uventorybiz-coral border-uventorybiz-coral/20">
                      v{APP_VERSION}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-sm font-medium text-gray-900">Database</span>
                    </div>
                    <span className="text-sm text-green-600">Operational</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-sm font-medium text-gray-900">API Services</span>
                    </div>
                    <span className="text-sm text-green-600">Operational</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-sm font-medium text-gray-900">File Storage</span>
                    </div>
                    <span className="text-sm text-green-600">Object Storage</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-sm font-medium text-gray-900">Security</span>
                    </div>
                    <span className="text-sm text-green-600">Secure</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

      {/* Modals */}
      <NewAppointmentModal 
        open={newAppointmentModalOpen} 
        onOpenChange={setNewAppointmentModalOpen} 
      />
      <MobileNav />
    </div>
  );
}
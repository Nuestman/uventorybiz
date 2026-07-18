import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, UserCheck, UserX, Building, Shield, Bell, UserPlus, Search, Filter, Eye, FileText, Mail, Loader2, MapPin, Building2, Plus, Pencil, Trash2, MoreVertical, Star, Phone, Power, AlertCircle, Activity, Calendar, AlertTriangle, Briefcase, Upload, X, LayoutGrid, List } from 'lucide-react';
import { Link } from 'wouter';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { formatRole, formatDepartment, formatCompanyType, formatStatus } from '@/lib/formatters';
import MobileNav from '@/components/MobileNav';
import NotificationPreferencesManager from '@/components/admin/NotificationPreferencesManager';
import { APP_VERSION } from "@/lib/appVersion";
import AccessDenied from '@/pages/access-denied';
import Unauthorized from '@/pages/unauthorized';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  status: 'pending' | 'active' | 'blocked' | 'decommissioned';
  createdAt: string;
  tenantId?: string;
  employeeId?: string;
}

interface Company {
  id: string;
  name: string;
  companyType: string;
  contactEmail: string;
  contactPhone?: string;
  licenseNumber?: string;
  status: string;
  createdAt: string;
}

interface Employee {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  department: string;
  position: string;
  jobTitle?: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  hireDate?: string;
  gender?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  medicalClearance?: boolean;
  status: string;
  companyId: string;
  company?: Company;
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    active: 'bg-green-100 text-green-800 border-green-200',
    blocked: 'bg-red-100 text-red-800 border-red-200',
    decommissioned: 'bg-gray-100 text-gray-800 border-gray-200'
  };
  
  return (
    <Badge variant="outline" className={variants[status] || 'bg-gray-100 text-gray-800 border-gray-200'}>
      {formatStatus(status)}
    </Badge>
  );
}

function RoleBadge({ role }: { role: string }) {
  const variants: Record<string, string> = {
    fleet_operator: 'bg-teal-100 text-teal-800 border-teal-200',
    staff: 'bg-blue-100 text-blue-800 border-blue-200',
    operations: 'bg-orange-100 text-orange-800 border-orange-200',
    admin: 'bg-purple-100 text-purple-800 border-purple-200',
    super_admin: 'bg-indigo-100 text-indigo-800 border-indigo-200'
  };
  
  return (
    <Badge variant="outline" className={variants[role] || 'bg-gray-100 text-gray-800 border-gray-200'}>
      {formatRole(role)}
    </Badge>
  );
}

function DepartmentBadge({ department }: { department: string }) {
  const variants: Record<string, string> = {
    sales: 'bg-sky-100 text-sky-800 border-sky-200',
    warehouse: 'bg-amber-100 text-amber-800 border-amber-200',
    operations: 'bg-blue-100 text-blue-800 border-blue-200',
    maintenance: 'bg-green-100 text-green-800 border-green-200',
    administration: 'bg-purple-100 text-purple-800 border-purple-200'
  };
  
  return (
    <Badge variant="outline" className={variants[department] || 'bg-gray-100 text-gray-800 border-gray-200'}>
      {formatDepartment(department)}
    </Badge>
  );
}

function UserManagement({ makeAdminRequest }: { makeAdminRequest: (method: string, url: string, body?: any) => Promise<any> }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [isInviting, setIsInviting] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    employeeIds: [] as string[],
    role: 'staff'
  });
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState('');
  const [deleteUserDialogOpen, setDeleteUserDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  
  const { data: allUsers = [], isLoading } = useQuery({
    queryKey: ['/api/admin/all-users'],
    queryFn: async () => {
      const data = await makeAdminRequest('GET', '/api/admin/all-users');
      // Ensure we always return an array
      return Array.isArray(data) ? data : [];
    },
  });

  // Fetch employees for invitation
  const { data: employees = [], isLoading: employeesLoading } = useQuery({
    queryKey: ['/api/employees'],
  });

  const employeesArray = Array.isArray(employees) ? employees : [];
  
  // Filter employees that don't have a user account yet
  const employeesWithoutUsers = employeesArray.filter((employee: Employee) => {
    // Check if employee email already has a user account
    const hasUserAccount = allUsers.some((user: User) => user.email === employee.email);
    return !hasUserAccount;
  });

  // Filter employees based on search term
  const filteredEmployees = employeesWithoutUsers.filter((employee: Employee) => {
    if (!employeeSearchTerm) return true;
    const searchLower = employeeSearchTerm.toLowerCase();
    return (
      employee.firstName?.toLowerCase().includes(searchLower) ||
      employee.lastName?.toLowerCase().includes(searchLower) ||
      employee.employeeNumber?.toLowerCase().includes(searchLower) ||
      employee.email?.toLowerCase().includes(searchLower)
    );
  });

  // Get selected employees details
  const selectedEmployees = employeesArray.filter((emp: Employee) => inviteForm.employeeIds.includes(emp.id));
  const toggleEmployeeSelection = (empId: string) => {
    setInviteForm(prev => ({
      ...prev,
      employeeIds: prev.employeeIds.includes(empId)
        ? prev.employeeIds.filter(id => id !== empId)
        : [...prev.employeeIds, empId]
    }));
  };

  // Filter users based on status and search term
  const filteredUsers = allUsers.filter((user: User) => {
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    const matchesSearch = !searchTerm || 
      user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const inviteUserMutation = useMutation({
    mutationFn: async (invitations: { email: string; role: string; employeeId?: string }[]) => {
      return makeAdminRequest('POST', '/api/admin/invite-users-bulk', { invitations });
    },
    onSuccess: (_: any, invitations: { email: string; role: string; employeeId?: string }[]) => {
      const count = Array.isArray(invitations) ? invitations.length : 0;
      queryClient.invalidateQueries({ queryKey: ['/api/admin/all-users'] });
      setIsInviting(false);
      setInviteForm({ employeeIds: [], role: 'staff' });
      setEmployeeSearchTerm('');
      toast({
        title: "Invitations Sent",
        description: count === 1
          ? "User will receive an email with activation link and organization code."
          : `${count} users will receive an email with activation link and organization code.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send invitation",
        variant: "destructive",
      });
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (userId: string) => {
      return makeAdminRequest('POST', `/api/admin/approve-user/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/all-users'] });
      toast({
        title: "User Approved",
        description: "User has been approved and notified.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to approve user",
        variant: "destructive",
      });
    },
  });

  const resendVerificationMutation = useMutation({
    mutationFn: async (userId: string) => {
      return makeAdminRequest('POST', `/api/admin/resend-verification/${userId}`, {});
    },
    onSuccess: () => {
      toast({
        title: "Verification Email Resent",
        description: "A new verification email has been sent to the user.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to resend verification email",
        variant: "destructive",
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ userId, status }: { userId: string; status: string }) => {
      return makeAdminRequest('POST', `/api/admin/update-user-status/${userId}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/all-users'] });
      toast({
        title: "Status Updated",
        description: "User status has been updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update user status",
        variant: "destructive",
      });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const response = await makeAdminRequest('POST', `/api/admin/update-user-role/${userId}`, { role });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/all-users'] });
      toast({
        title: "Role Updated",
        description: "User role has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update user role",
        variant: "destructive",
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      return makeAdminRequest('DELETE', `/api/admin/users/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/all-users'] });
      setDeleteUserDialogOpen(false);
      setUserToDelete(null);
      toast({
        title: "User Deleted",
        description: "User has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete user",
        variant: "destructive",
      });
    },
  });

  const handleExport = async () => {
    try {
      const response = await fetch('/api/users/export', {
        method: 'GET',
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to export users');
      }
      
      // Extract filename from Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition') || response.headers.get('content-disposition');
      let filename = `users_${new Date().toISOString().split('T')[0]}.csv`; // fallback
      if (contentDisposition) {
        // Try multiple patterns to extract filename
        let filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (filenameMatch) {
          filename = filenameMatch[1].replace(/['"]/g, '');
        } else {
          filenameMatch = contentDisposition.match(/filename="(.+)"/);
          if (filenameMatch) {
            filename = filenameMatch[1];
          } else {
            filenameMatch = contentDisposition.match(/filename=([^;]+)/);
            if (filenameMatch) {
              filename = filenameMatch[1].trim();
            }
          }
        }
      }
      
      console.log('Export filename:', filename);
      console.log('Content-Disposition header:', contentDisposition);
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Export Successful",
        description: "Users exported successfully",
      });
    } catch (error: any) {
      toast({
        title: "Export Error",
        description: error.message || "Failed to export users",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center p-8">Loading users...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:gap-4">
        <div className="flex items-center gap-2 min-w-0">
          <Users className="h-5 w-5 flex-shrink-0" />
          <h2 className="text-lg sm:text-xl font-semibold truncate">User Management</h2>
          <Badge variant="secondary" className="text-xs whitespace-nowrap flex-shrink-0">{allUsers.length} total users</Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button 
            variant="outline"
            onClick={handleExport}
            className="flex-1 sm:flex-initial"
          >
            <FileText className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Export CSV</span>
            <span className="sm:hidden">Export</span>
          </Button>
          <Dialog open={isInviting} onOpenChange={setIsInviting}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Invite User</span>
              <span className="sm:hidden">Invite</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Invite New User</DialogTitle>
            </DialogHeader>
              <div className="bg-[#EAF6FF] border border-[#142F5C]/20 rounded-lg p-3">
                <p className="text-xs text-[#142F5C]/70">
                  Select one or more employees to invite. Only employees without user accounts are shown. Each will receive an email with activation link to complete profile & set password.
                </p>
              </div>
            <div className="space-y-4">
              <div>
                <Label htmlFor="employee-search" className="text-[#142F5C] font-semibold">Search Employee *</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="employee-search"
                    type="text"
                    value={employeeSearchTerm}
                    onChange={(e) => setEmployeeSearchTerm(e.target.value)}
                    placeholder="Search by name, employee number, or email..."
                    className="border-gray-300 focus:border-[#FF4D4D] pl-10"
                  />
                </div>
                <p className="text-xs text-[#142F5C]/60 mt-1">
                  Search and select one or more employees to invite
                </p>
              </div>

              <div>
                <Label htmlFor="employee-select" className="text-[#142F5C] font-semibold">Select Employees *</Label>
                {employeesLoading ? (
                  <div className="flex items-center justify-center p-4">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    <span className="text-sm text-gray-500">Loading employees...</span>
                  </div>
                ) : filteredEmployees.length === 0 ? (
                  <div className="border border-gray-300 rounded-md p-4 text-center text-sm text-gray-500">
                    {employeeSearchTerm 
                      ? `No employees found matching "${employeeSearchTerm}" without user accounts`
                      : employeesWithoutUsers.length === 0
                      ? "All employees already have user accounts"
                      : "No employees found without user accounts"}
                  </div>
                ) : (
                  <div className="border border-gray-300 rounded-md max-h-40 overflow-y-auto divide-y divide-gray-100">
                    {filteredEmployees.map((employee: Employee) => (
                      <div
                        key={employee.id}
                        onClick={() => toggleEmployeeSelection(employee.id)}
                        className={`px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors ${
                          inviteForm.employeeIds.includes(employee.id) ? 'bg-[#EAF6FF]' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm truncate">
                                {employee.firstName} {employee.lastName}
                              </span>
                              <span className="text-xs text-gray-500">#{employee.employeeNumber}</span>
                            </div>
                            <div className="text-xs text-gray-500 truncate">
                              {employee.email}
                            </div>
                          </div>
                          {employee.department && (
                            <DepartmentBadge department={employee.department} />
                          )}
                          {inviteForm.employeeIds.includes(employee.id) && (
                            <div className="w-4 h-4 rounded-full bg-[#142F5C] flex items-center justify-center flex-shrink-0">
                              <span className="text-white text-xs leading-none">✓</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {selectedEmployees.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-sm font-medium text-green-800 mb-1">
                    Selected ({selectedEmployees.length}): {selectedEmployees.map((e: Employee) => `${e.firstName} ${e.lastName}`).join(', ')}
                  </p>
                  <p className="text-xs text-green-700">
                    {selectedEmployees.map((e: Employee) => e.email).join(', ')}
                  </p>
                </div>
              )}
              
              <div>
                <Label htmlFor="role" className="text-[#142F5C] font-semibold">Assigned Role *</Label>
                <Select value={inviteForm.role} onValueChange={(value) => setInviteForm(prev => ({ ...prev, role: value }))}>
                  <SelectTrigger className="border-gray-300 focus:border-[#FF4D4D]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fleet_operator">Fleet operator</SelectItem>
                    <SelectItem value="staff">Staff</SelectItem>
                    <SelectItem value="operations">Operations</SelectItem>
                    <SelectItem value="admin">Administrator</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-[#142F5C]/60 mt-1">
                  User will have this role after activation
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  onClick={() => {
                    if (selectedEmployees.length === 0) {
                      toast({
                        title: "Error",
                        description: "Please select at least one employee",
                        variant: "destructive",
                      });
                      return;
                    }
                    const invitations = selectedEmployees.map((emp: Employee) => ({
                      email: emp.email,
                      role: inviteForm.role,
                      employeeId: emp.id
                    }));
                    inviteUserMutation.mutate(invitations);
                  }}
                  disabled={inviteUserMutation.isPending || inviteForm.employeeIds.length === 0}
                  className="flex-1 bg-[#FF4D4D] hover:bg-[#FF4D4D]/90 font-bold"
                >
                  {inviteUserMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4 mr-2" />
                      Send {selectedEmployees.length > 0 ? `${selectedEmployees.length} ` : ''}Invitation{selectedEmployees.length !== 1 ? 's' : ''}
                    </>
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setIsInviting(false);
                    setInviteForm({ employeeIds: [], role: 'staff' });
                    setEmployeeSearchTerm('');
                  }} 
                  disabled={inviteUserMutation.isPending}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center flex-1">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Search className="h-4 w-4 text-gray-500 flex-shrink-0" />
            <Input
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 min-w-0"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="blocked">Blocked</SelectItem>
                <SelectItem value="decommissioned">Decommissioned</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Badge variant="outline" className="px-3 py-1 whitespace-nowrap flex-shrink-0">
            {filteredUsers.length} of {allUsers.length} users
          </Badge>
        </div>
        {/* View Toggle */}
        <div className="flex items-center border rounded-md">
          <Button
            variant={viewMode === 'table' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('table')}
            className="rounded-r-none"
            title="Table view"
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'cards' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('cards')}
            className="rounded-l-none"
            title="Card view"
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {filteredUsers.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-gray-500">
            {statusFilter === 'all' && !searchTerm ? 
              'No users found.' : 
              'No users match your current filters.'
            }
          </CardContent>
        </Card>
      ) : viewMode === 'table' ? (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Registered</TableHead>
                  <TableHead className="w-32">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user: User, index: number) => (
                  <TableRow key={user.id} className={index % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell className="font-medium">{user.firstName} {user.lastName}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell><RoleBadge role={user.role} /></TableCell>
                    <TableCell><StatusBadge status={user.status} /></TableCell>
                    <TableCell className="text-sm text-gray-500">{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          asChild
                          className="h-7 px-2"
                          title="View Profile"
                        >
                          <Link href={`/profile/${user.id}`}>
                            <Eye className="h-3 w-3" />
                          </Link>
                        </Button>
                        {user.status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => approveMutation.mutate(user.id)}
                              disabled={approveMutation.isPending}
                              className="h-7 px-2"
                              title="Approve"
                            >
                              <UserCheck className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => resendVerificationMutation.mutate(user.id)}
                              disabled={resendVerificationMutation.isPending}
                              className="h-7 px-2"
                              title="Resend Email"
                            >
                              <Mail className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ userId: user.id, status: 'active' })}>
                              <UserCheck className="mr-2 h-4 w-4" />
                              Set Status: Active
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ userId: user.id, status: 'blocked' })}>
                              <UserX className="mr-2 h-4 w-4" />
                              Set Status: Blocked
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ userId: user.id, status: 'decommissioned' })}>
                              <Power className="mr-2 h-4 w-4" />
                              Set Status: Decommissioned
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => updateRoleMutation.mutate({ userId: user.id, role: 'fleet_operator' })}>
                              <Shield className="mr-2 h-4 w-4" />
                              Set Role: Fleet operator
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateRoleMutation.mutate({ userId: user.id, role: 'staff' })}>
                              <Shield className="mr-2 h-4 w-4" />
                              Set Role: Staff
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateRoleMutation.mutate({ userId: user.id, role: 'operations' })}>
                              <Shield className="mr-2 h-4 w-4" />
                              Set Role: Operations
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateRoleMutation.mutate({ userId: user.id, role: 'admin' })}>
                              <Shield className="mr-2 h-4 w-4" />
                              Set Role: Administrator
                            </DropdownMenuItem>
                            {user.status === 'pending' && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => resendVerificationMutation.mutate(user.id)}>
                                  <Mail className="mr-2 h-4 w-4" />
                                  Resend Verification Email
                                </DropdownMenuItem>
                              </>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => {
                                setUserToDelete(user);
                                setDeleteUserDialogOpen(true);
                              }}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete User
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
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredUsers.map((user: User) => (
            <Card key={user.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">
                        {user.firstName} {user.lastName}
                      </h3>
                      <StatusBadge status={user.status} />
                    </div>
                    <p className="text-sm text-gray-600">{user.email}</p>
                    <div className="flex items-center gap-2">
                      <RoleBadge role={user.role} />
                      <span className="text-sm text-gray-500">
                        Registered: {new Date(user.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      asChild
                      className="h-8 px-2"
                      title="View Profile"
                    >
                      <Link href={`/profile/${user.id}`}>
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Link>
                    </Button>
                    {user.status === 'pending' && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => approveMutation.mutate(user.id)}
                          disabled={approveMutation.isPending}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <UserCheck className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => resendVerificationMutation.mutate(user.id)}
                          disabled={resendVerificationMutation.isPending}
                          className="border-uventorybiz-coral text-uventorybiz-coral hover:bg-uventorybiz-coral/10"
                        >
                          <Mail className="h-4 w-4 mr-1" />
                          Resend Email
                        </Button>
                      </>
                    )}
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ userId: user.id, status: 'active' })}>
                          <UserCheck className="mr-2 h-4 w-4" />
                          Set Status: Active
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ userId: user.id, status: 'blocked' })}>
                          <UserX className="mr-2 h-4 w-4" />
                          Set Status: Blocked
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ userId: user.id, status: 'decommissioned' })}>
                          <Power className="mr-2 h-4 w-4" />
                          Set Status: Decommissioned
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => updateRoleMutation.mutate({ userId: user.id, role: 'fleet_operator' })}>
                          <Shield className="mr-2 h-4 w-4" />
                          Set Role: Fleet operator
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => updateRoleMutation.mutate({ userId: user.id, role: 'staff' })}>
                          <Shield className="mr-2 h-4 w-4" />
                          Set Role: Staff
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => updateRoleMutation.mutate({ userId: user.id, role: 'operations' })}>
                          <Shield className="mr-2 h-4 w-4" />
                          Set Role: Operations
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => updateRoleMutation.mutate({ userId: user.id, role: 'admin' })}>
                          <Shield className="mr-2 h-4 w-4" />
                          Set Role: Administrator
                        </DropdownMenuItem>
                        {user.status === 'pending' && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => resendVerificationMutation.mutate(user.id)}>
                              <Mail className="mr-2 h-4 w-4" />
                              Resend Verification Email
                            </DropdownMenuItem>
                          </>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => {
                            setUserToDelete(user);
                            setDeleteUserDialogOpen(true);
                          }}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete User
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete User Confirmation Dialog */}
      <AlertDialog open={deleteUserDialogOpen} onOpenChange={setDeleteUserDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {userToDelete?.firstName} {userToDelete?.lastName} ({userToDelete?.email}). This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setDeleteUserDialogOpen(false);
              setUserToDelete(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (userToDelete) {
                  deleteUserMutation.mutate(userToDelete.id);
                }
              }}
              disabled={deleteUserMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteUserMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function CompanyManagement({ onViewEmployees }: { onViewEmployees: (companyId: string) => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [isBulkImporting, setIsBulkImporting] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [newCompany, setNewCompany] = useState({
    name: '',
    companyType: 'contractor',
    contactEmail: '',
    contactPhone: '',
    licenseNumber: ''
  });
  const [csvData, setCsvData] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ['/api/companies'],
  });

  const companiesArray = Array.isArray(companies) ? companies : [];

  const [isEditingCompany, setIsEditingCompany] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [editCompanyForm, setEditCompanyForm] = useState({
    name: '',
    companyType: 'contractor',
    contactEmail: '',
    contactPhone: '',
    licenseNumber: ''
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState<Company | null>(null);

  const createMutation = useMutation({
    mutationFn: async (companyData: any) => {
      return await apiRequest('POST', '/api/companies', companyData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/companies'] });
      setIsCreating(false);
      setNewCompany({
        name: '',
        companyType: 'contractor',
        contactEmail: '',
        contactPhone: '',
        licenseNumber: ''
      });
      toast({
        title: "Company Created",
        description: "New company has been added successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create company",
        variant: "destructive",
      });
    },
  });

  const updateCompanyMutation = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const response = await apiRequest('PUT', `/api/companies/${id}`, data);
      
      // Get response as text first to handle non-JSON responses
      const responseText = await response.text();
      
      if (!responseText) {
        throw new Error('Company update failed - empty response from server');
      }
      
      // Try to parse as JSON with proper error handling
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Failed to parse company update response as JSON:', responseText);
        throw new Error('Invalid server response');
      }
      
      if (!result || !result.id) {
        throw new Error(result?.message || 'Company update failed - no data returned');
      }
      
      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/companies'] });
      setIsEditingCompany(false);
      setEditingCompany(null);
      toast({
        title: "Company Updated",
        description: "Company information has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update company",
        variant: "destructive",
      });
    },
  });

  const deleteCompanyMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('DELETE', `/api/companies/${id}`);
      
      // Get response as text first to handle non-JSON responses
      const responseText = await response.text();
      
      if (!responseText) {
        throw new Error('Company deletion failed - empty response from server');
      }
      
      // Try to parse as JSON with proper error handling
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Failed to parse company delete response as JSON:', responseText);
        throw new Error('Invalid server response');
      }
      
      if (!result || !result.success) {
        throw new Error(result?.message || 'Company deletion failed');
      }
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/companies'] });
      setDeleteDialogOpen(false);
      setCompanyToDelete(null);
      toast({
        title: "Company Deleted",
        description: "Company has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete company",
        variant: "destructive",
      });
    },
  });

  const bulkImportMutation = useMutation({
    mutationFn: async ({ file, csvDataText }: { file: File | null; csvDataText: string }) => {
      if (file) {
        // Use file upload with FormData
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch('/api/companies/bulk-import', {
          method: 'POST',
          body: formData,
          credentials: 'include'
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: 'Failed to import companies' }));
          throw new Error(errorData.message || 'Failed to import companies');
        }
        
        return await response.json();
      } else {
        // Fallback to textarea data
        return await apiRequest('POST', '/api/companies/bulk-import', { csvData: csvDataText });
      }
    },
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/companies'] });
      setIsBulkImporting(false);
      setCsvData('');
      setSelectedFile(null);
      
      const errorCount = result.errors?.length || 0;
      const errorMessage = errorCount > 0 ? ` ${errorCount} error(s) occurred.` : '';
      
      toast({
        title: "Bulk Import Completed",
        description: `Successfully imported ${result.imported} of ${result.total || result.imported + result.skipped} companies. ${result.skipped || 0} skipped.${errorMessage}`,
      });
      
      // Show errors if any
      if (result.errors && result.errors.length > 0) {
        console.error('Import errors:', result.errors);
        setTimeout(() => {
          toast({
            title: "Import Errors",
            description: result.errors.slice(0, 5).join('; '),
            variant: "destructive",
          });
        }, 1000);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Import Error",
        description: error.message || "Failed to import companies",
        variant: "destructive",
      });
    },
  });

  const handleExport = async () => {
    try {
      const response = await fetch('/api/companies/export', {
        method: 'GET',
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to export companies');
      }
      
      // Extract filename from Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition') || response.headers.get('content-disposition');
      let filename = `companies_${new Date().toISOString().split('T')[0]}.csv`; // fallback
      if (contentDisposition) {
        // Try multiple patterns to extract filename
        let filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (filenameMatch) {
          filename = filenameMatch[1].replace(/['"]/g, '');
        } else {
          filenameMatch = contentDisposition.match(/filename="(.+)"/);
          if (filenameMatch) {
            filename = filenameMatch[1];
          } else {
            filenameMatch = contentDisposition.match(/filename=([^;]+)/);
            if (filenameMatch) {
              filename = filenameMatch[1].trim();
            }
          }
        }
      }
      
      console.log('Export filename:', filename);
      console.log('Content-Disposition header:', contentDisposition);
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Export Successful",
        description: "Companies exported successfully",
      });
    } catch (error: any) {
      toast({
        title: "Export Error",
        description: error.message || "Failed to export companies",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center p-8">Loading companies...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:gap-4">
        <div className="flex items-center gap-2 min-w-0">
          <Building className="h-5 w-5 flex-shrink-0" />
          <h2 className="text-lg sm:text-xl font-semibold truncate">Company Management</h2>
          <Badge variant="secondary" className="text-xs whitespace-nowrap flex-shrink-0">{companiesArray.length} companies</Badge>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex flex-wrap gap-2">
            <Button 
              variant="outline"
              onClick={() => onViewEmployees("all")}
              className="flex-1 sm:flex-initial"
            >
              <Eye className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">View All Employees</span>
              <span className="sm:hidden">All Employees</span>
            </Button>
            <Button 
              variant="outline"
              onClick={handleExport}
              className="flex-1 sm:flex-initial"
            >
              <FileText className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Export CSV</span>
              <span className="sm:hidden">Export</span>
            </Button>
            <Dialog open={isBulkImporting} onOpenChange={setIsBulkImporting}>
              <DialogTrigger asChild>
                <Button variant="outline" className="flex-1 sm:flex-initial">
                  <FileText className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Bulk Import</span>
                  <span className="sm:hidden">Import</span>
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Bulk Import Companies</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Upload CSV File</Label>
                  <div className="text-sm text-gray-600 mb-2">
                    Format: name,companyType,contactEmail,contactPhone,licenseNumber,address
                  </div>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-gray-400 transition-colors">
                    <input
                      type="file"
                      accept=".csv,.txt,text/csv"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setSelectedFile(file);
                          setCsvData('');
                        }
                      }}
                      className="hidden"
                      id="company-csv-file-input"
                    />
                    <label
                      htmlFor="company-csv-file-input"
                      className="cursor-pointer flex flex-col items-center justify-center space-y-2"
                    >
                      {selectedFile ? (
                        <div className="flex items-center gap-2 text-sm text-gray-700">
                          <FileText className="h-5 w-5 text-green-600" />
                          <span className="font-medium">{selectedFile.name}</span>
                          <span className="text-gray-500">({(selectedFile.size / 1024).toFixed(2)} KB)</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedFile(null);
                              const input = document.getElementById('company-csv-file-input') as HTMLInputElement;
                              if (input) input.value = '';
                            }}
                            className="h-6 w-6 p-0 ml-2"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <Upload className="h-8 w-8 text-gray-400" />
                          <div className="text-sm text-gray-600 text-center">
                            <span className="font-medium text-blue-600">Click to upload</span> or drag and drop
                            <br />
                            <span className="text-xs">CSV file (max 5MB)</span>
                          </div>
                        </>
                      )}
                    </label>
                  </div>
                </div>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">Or paste CSV data</span>
                  </div>
                </div>
                <div>
                  <Label htmlFor="company-csv-textarea">CSV Data (Alternative)</Label>
                  <Textarea
                    id="company-csv-textarea"
                    value={csvData}
                    onChange={(e) => {
                      setCsvData(e.target.value);
                      if (e.target.value.trim()) {
                        setSelectedFile(null);
                        const input = document.getElementById('company-csv-file-input') as HTMLInputElement;
                        if (input) input.value = '';
                      }
                    }}
                    placeholder="Company Name,contractor,contact@company.com,+1234567890,LIC123,123 Main St"
                    className="w-full h-32 p-3 font-mono text-sm"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => bulkImportMutation.mutate({ file: selectedFile, csvDataText: csvData })}
                    disabled={bulkImportMutation.isPending || (!selectedFile && !csvData.trim())}
                  >
                    {bulkImportMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      "Import Companies"
                    )}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setIsBulkImporting(false);
                      setSelectedFile(null);
                      setCsvData('');
                      const input = document.getElementById('company-csv-file-input') as HTMLInputElement;
                      if (input) input.value = '';
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
            <Button onClick={() => setIsCreating(true)} className="flex-1 sm:flex-initial">
              <Plus className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Add Company</span>
              <span className="sm:hidden">Add</span>
            </Button>
          </div>
          {/* View Toggle */}
          <div className="flex items-center border rounded-md">
            <Button
              variant={viewMode === 'table' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('table')}
              className="rounded-r-none"
              title="Table view"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'cards' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('cards')}
              className="rounded-l-none"
              title="Card view"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {isCreating && (
        <Card>
          <CardHeader>
            <CardTitle>Add New Company</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Company Name</Label>
                <Input
                  id="name"
                  value={newCompany.name}
                  onChange={(e) => setNewCompany(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Company name"
                />
              </div>
              <div>
                <Label htmlFor="type">Company Type</Label>
                <Select
                  value={newCompany.companyType}
                  onValueChange={(value) => setNewCompany(prev => ({ ...prev, companyType: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mother_company">Mother Company</SelectItem>
                    <SelectItem value="contractor">Contractor</SelectItem>
                    <SelectItem value="subcontractor">Subcontractor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="email">Contact Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newCompany.contactEmail}
                  onChange={(e) => setNewCompany(prev => ({ ...prev, contactEmail: e.target.value }))}
                  placeholder="contact@company.com"
                />
              </div>
              <div>
                <Label htmlFor="phone">Contact Phone</Label>
                <Input
                  id="phone"
                  value={newCompany.contactPhone}
                  onChange={(e) => setNewCompany(prev => ({ ...prev, contactPhone: e.target.value }))}
                  placeholder="+1 (555) 123-4567"
                />
              </div>
              <div>
                <Label htmlFor="license">License Number</Label>
                <Input
                  id="license"
                  value={newCompany.licenseNumber}
                  onChange={(e) => setNewCompany(prev => ({ ...prev, licenseNumber: e.target.value }))}
                  placeholder="License number"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => createMutation.mutate(newCompany)}
                disabled={createMutation.isPending || !newCompany.name || !newCompany.contactEmail}
              >
                Create Company
              </Button>
              <Button variant="outline" onClick={() => setIsCreating(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {companiesArray.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-gray-500">
            No companies found. Create your first company to get started.
          </CardContent>
        </Card>
      ) : viewMode === 'table' ? (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">ID</TableHead>
                  <TableHead>Company Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Contact Email</TableHead>
                  <TableHead>Contact Phone</TableHead>
                  <TableHead>License Number</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-40">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companiesArray.map((company: Company, index: number) => (
                  <TableRow key={company.id} className={index % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell className="font-medium">{company.name}</TableCell>
                    <TableCell><Badge variant="outline">{formatCompanyType(company.companyType)}</Badge></TableCell>
                    <TableCell>{company.contactEmail}</TableCell>
                    <TableCell>{company.contactPhone || '-'}</TableCell>
                    <TableCell>{company.licenseNumber || '-'}</TableCell>
                    <TableCell><StatusBadge status={company.status} /></TableCell>
                    <TableCell className="text-sm text-gray-500">{new Date(company.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => onViewEmployees(company.id)}
                          className="h-7 px-2"
                          title="View Employees"
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => {
                              setEditingCompany(company);
                              setEditCompanyForm({
                                name: company.name,
                                companyType: company.companyType,
                                contactEmail: company.contactEmail,
                                contactPhone: company.contactPhone || '',
                                licenseNumber: company.licenseNumber || ''
                              });
                              setIsEditingCompany(true);
                            }}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                const newStatus = company.status === 'active' ? 'suspended' : 'active';
                                updateCompanyMutation.mutate({
                                  id: company.id,
                                  status: newStatus
                                });
                              }}
                              disabled={updateCompanyMutation.isPending}
                            >
                              <Power className="mr-2 h-4 w-4" />
                              {company.status === 'active' ? 'Suspend' : 'Activate'}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => {
                                setCompanyToDelete(company);
                                setDeleteDialogOpen(true);
                              }}
                              disabled={deleteCompanyMutation.isPending}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
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
        </Card>
      ) : (
        <div className="grid gap-4">
          {companiesArray.map((company: Company) => (
            <Card key={company.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{company.name}</h3>
                      <Badge variant="outline">{formatCompanyType(company.companyType)}</Badge>
                    </div>
                    <p className="text-sm text-gray-600">{company.contactEmail}</p>
                    <p className="text-sm text-gray-500">
                      Status: {formatStatus(company.status)} • Created: {new Date(company.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="ml-4 flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => onViewEmployees(company.id)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Employees
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => {
                          setEditingCompany(company);
                          setEditCompanyForm({
                            name: company.name,
                            companyType: company.companyType,
                            contactEmail: company.contactEmail,
                            contactPhone: company.contactPhone || '',
                            licenseNumber: company.licenseNumber || ''
                          });
                          setIsEditingCompany(true);
                        }}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            const newStatus = company.status === 'active' ? 'suspended' : 'active';
                            updateCompanyMutation.mutate({
                              id: company.id,
                              status: newStatus
                            });
                          }}
                          disabled={updateCompanyMutation.isPending}
                        >
                          <Power className="mr-2 h-4 w-4" />
                          {company.status === 'active' ? 'Suspend' : 'Activate'}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => {
                            setCompanyToDelete(company);
                            setDeleteDialogOpen(true);
                          }}
                          disabled={deleteCompanyMutation.isPending}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Company Dialog */}
      {isEditingCompany && editingCompany && (
        <Dialog open={isEditingCompany} onOpenChange={(open) => {
          if (!open) {
            setIsEditingCompany(false);
            setEditingCompany(null);
            setNewCompany({
              name: '',
              companyType: 'contractor',
              contactEmail: '',
              contactPhone: '',
              licenseNumber: ''
            });
          }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Company</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-name">Company Name</Label>
                  <Input
                    id="edit-name"
                    value={editCompanyForm.name}
                    onChange={(e) => setEditCompanyForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Company name"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-type">Company Type</Label>
                  <Select
                    value={editCompanyForm.companyType}
                    onValueChange={(value) => setEditCompanyForm(prev => ({ ...prev, companyType: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mother_company">Mother Company</SelectItem>
                      <SelectItem value="contractor">Contractor</SelectItem>
                      <SelectItem value="subcontractor">Subcontractor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edit-email">Contact Email</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={editCompanyForm.contactEmail}
                    onChange={(e) => setEditCompanyForm(prev => ({ ...prev, contactEmail: e.target.value }))}
                    placeholder="contact@company.com"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-phone">Contact Phone</Label>
                  <Input
                    id="edit-phone"
                    value={editCompanyForm.contactPhone}
                    onChange={(e) => setEditCompanyForm(prev => ({ ...prev, contactPhone: e.target.value }))}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-license">License Number</Label>
                  <Input
                    id="edit-license"
                    value={editCompanyForm.licenseNumber}
                    onChange={(e) => setEditCompanyForm(prev => ({ ...prev, licenseNumber: e.target.value }))}
                    placeholder="License number"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    if (editingCompany) {
                      updateCompanyMutation.mutate({
                        id: editingCompany.id,
                        ...editCompanyForm
                      });
                    }
                  }}
                  disabled={updateCompanyMutation.isPending || !editCompanyForm.name || !editCompanyForm.contactEmail}
                >
                  {updateCompanyMutation.isPending ? "Updating..." : "Update Company"}
                </Button>
                <Button variant="outline" onClick={() => {
                  setIsEditingCompany(false);
                  setEditingCompany(null);
                  setEditCompanyForm({
                    name: '',
                    companyType: 'contractor',
                    contactEmail: '',
                    contactPhone: '',
                    licenseNumber: ''
                  });
                }}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {companyToDelete?.name} and all associated employees. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setDeleteDialogOpen(false);
              setCompanyToDelete(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (companyToDelete) {
                  deleteCompanyMutation.mutate(companyToDelete.id);
                }
              }}
              disabled={deleteCompanyMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteCompanyMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function NewEmployeeManagement({ initialCompanyFilter }: { initialCompanyFilter?: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [companyFilter, setCompanyFilter] = useState<string>(initialCompanyFilter || 'all');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  
  // Sync with initialCompanyFilter when it changes
  useEffect(() => {
    if (initialCompanyFilter) {
      setCompanyFilter(initialCompanyFilter);
    }
  }, [initialCompanyFilter]);
  const [isAddingEmployee, setIsAddingEmployee] = useState(false);
  const [isBulkImporting, setIsBulkImporting] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [newEmployee, setNewEmployee] = useState({
    employeeNumber: '',
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    department: 'warehouse',
    jobTitle: '',
    companyId: '',
    dateOfBirth: '',
    hireDate: '',
    gender: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    medicalClearance: true
  });
  const [csvData, setCsvData] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['/api/employees'],
  });

  const { data: companies = [] } = useQuery({
    queryKey: ['/api/companies'],
  });

  const employeesArray = Array.isArray(employees) ? employees : [];
  const companiesArray = Array.isArray(companies) ? companies : [];

  // Filter employees
  const filteredEmployees = employeesArray.filter((employee: Employee) => {
    const matchesSearch = !searchTerm || 
      employee.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.employeeNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment = departmentFilter === 'all' || employee.department === departmentFilter;
    const matchesStatus = statusFilter === 'all' || employee.status === statusFilter;
    const matchesCompany = companyFilter === 'all' || employee.companyId === companyFilter;
    return matchesSearch && matchesDepartment && matchesStatus && matchesCompany;
  });

  const createEmployeeMutation = useMutation({
    mutationFn: async (employeeData: any) => {
      return await apiRequest('POST', '/api/employees', employeeData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/employees'] });
      setIsAddingEmployee(false);
      setNewEmployee({
        employeeNumber: '',
        firstName: '',
        lastName: '',
        email: '',
        phoneNumber: '',
        department: 'warehouse',
        jobTitle: '',
        companyId: '',
        dateOfBirth: '',
        hireDate: '',
        gender: '',
        emergencyContactName: '',
        emergencyContactPhone: '',
        medicalClearance: true
      });
      toast({
        title: "Employee Added",
        description: "Employee has been added successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add employee",
        variant: "destructive",
      });
    },
  });

  const [deleteEmployeeDialogOpen, setDeleteEmployeeDialogOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);

  const updateEmployeeMutation = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      return await apiRequest('PUT', `/api/employees/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/employees'] });
      setEditingEmployee(null);
      toast({
        title: "Employee Updated",
        description: "Employee information has been updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update employee",
        variant: "destructive",
      });
    },
  });

  const deleteEmployeeMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('DELETE', `/api/employees/${id}`);
      
      // Get response as text first to handle non-JSON responses
      const responseText = await response.text();
      
      if (!responseText) {
        throw new Error('Employee deletion failed - empty response from server');
      }
      
      // Try to parse as JSON with proper error handling
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Failed to parse employee delete response as JSON:', responseText);
        throw new Error('Invalid server response');
      }
      
      if (!result || !result.success) {
        throw new Error(result?.message || 'Employee deletion failed');
      }
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/employees'] });
      setDeleteEmployeeDialogOpen(false);
      setEmployeeToDelete(null);
      toast({
        title: "Employee Deleted",
        description: "Employee has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete employee",
        variant: "destructive",
      });
    },
  });

  const bulkImportMutation = useMutation({
    mutationFn: async ({ file, csvDataText }: { file: File | null; csvDataText: string }) => {
      if (file) {
        // Use file upload with FormData
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch('/api/employees/bulk-import', {
          method: 'POST',
          body: formData,
          credentials: 'include'
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: 'Failed to import employees' }));
          throw new Error(errorData.message || 'Failed to import employees');
        }
        
        return await response.json();
      } else {
        // Fallback to textarea data
        return await apiRequest('POST', '/api/employees/bulk-import', { csvData: csvDataText });
      }
    },
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/employees'] });
      setIsBulkImporting(false);
      setCsvData('');
      setSelectedFile(null);
      
      const errorCount = result.errors?.length || 0;
      const errorMessage = errorCount > 0 ? ` ${errorCount} error(s) occurred.` : '';
      
      toast({
        title: "Bulk Import Completed",
        description: `Successfully imported ${result.imported} of ${result.total || result.imported + result.skipped} employees. ${result.skipped || 0} skipped.${errorMessage}`,
      });
      
      // Show errors if any
      if (result.errors && result.errors.length > 0) {
        console.error('Import errors:', result.errors);
        setTimeout(() => {
          toast({
            title: "Import Errors",
            description: result.errors.slice(0, 5).join('; '),
            variant: "destructive",
          });
        }, 1000);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Import Error",
        description: error.message || "Failed to import employees",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return <div className="flex items-center justify-center p-8">Loading employees...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:gap-4">
        <div className="flex items-center gap-2 min-w-0">
          <Users className="h-5 w-5 flex-shrink-0" />
          <h2 className="text-lg sm:text-xl font-semibold truncate">Employee Management</h2>
          <Badge variant="secondary" className="text-xs whitespace-nowrap flex-shrink-0">{employeesArray.length} total</Badge>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Button 
            variant="outline"
            onClick={async () => {
              try {
                const response = await fetch('/api/employees/export', {
                  method: 'GET',
                  credentials: 'include'
                });
                
                if (!response.ok) {
                  throw new Error('Failed to export employees');
                }
                
                // Extract filename from Content-Disposition header
                const contentDisposition = response.headers.get('Content-Disposition') || response.headers.get('content-disposition');
                let filename = `employees_${new Date().toISOString().split('T')[0]}.csv`; // fallback
                if (contentDisposition) {
                  // Try multiple patterns to extract filename
                  let filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
                  if (filenameMatch) {
                    filename = filenameMatch[1].replace(/['"]/g, '');
                  } else {
                    filenameMatch = contentDisposition.match(/filename="(.+)"/);
                    if (filenameMatch) {
                      filename = filenameMatch[1];
                    } else {
                      filenameMatch = contentDisposition.match(/filename=([^;]+)/);
                      if (filenameMatch) {
                        filename = filenameMatch[1].trim();
                      }
                    }
                  }
                }
                
                console.log('Export filename:', filename);
                console.log('Content-Disposition header:', contentDisposition);
                
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                
                toast({
                  title: "Export Successful",
                  description: "Employees exported successfully",
                });
              } catch (error: any) {
                toast({
                  title: "Export Error",
                  description: error.message || "Failed to export employees",
                  variant: "destructive",
                });
              }
            }}
            className="flex-1 sm:flex-initial"
          >
            <FileText className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Export CSV</span>
            <span className="sm:hidden">Export</span>
          </Button>
          <Dialog open={isBulkImporting} onOpenChange={setIsBulkImporting}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex-1 sm:flex-initial">
                <FileText className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Bulk Import</span>
                <span className="sm:hidden">Import</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Bulk Import Employees</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Upload CSV File</Label>
                  <div className="text-sm text-gray-600 mb-2">
                    Format: employeeNumber,firstName,lastName,email,department,position,companyId
                  </div>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-gray-400 transition-colors">
                    <input
                      type="file"
                      accept=".csv,.txt,text/csv"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setSelectedFile(file);
                          setCsvData(''); // Clear textarea when file is selected
                        }
                      }}
                      className="hidden"
                      id="csv-file-input"
                    />
                    <label
                      htmlFor="csv-file-input"
                      className="cursor-pointer flex flex-col items-center justify-center space-y-2"
                    >
                      {selectedFile ? (
                        <div className="flex items-center gap-2 text-sm text-gray-700">
                          <FileText className="h-5 w-5 text-green-600" />
                          <span className="font-medium">{selectedFile.name}</span>
                          <span className="text-gray-500">({(selectedFile.size / 1024).toFixed(2)} KB)</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedFile(null);
                              const input = document.getElementById('csv-file-input') as HTMLInputElement;
                              if (input) input.value = '';
                            }}
                            className="h-6 w-6 p-0 ml-2"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <Upload className="h-8 w-8 text-gray-400" />
                          <div className="text-sm text-gray-600 text-center">
                            <span className="font-medium text-blue-600">Click to upload</span> or drag and drop
                            <br />
                            <span className="text-xs">CSV file (max 5MB)</span>
                          </div>
                        </>
                      )}
                    </label>
                  </div>
                </div>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">Or paste CSV data</span>
                  </div>
                </div>
                <div>
                  <Label htmlFor="csv-textarea">CSV Data (Alternative)</Label>
                  <Textarea
                    id="csv-textarea"
                    value={csvData}
                    onChange={(e) => {
                      setCsvData(e.target.value);
                      if (e.target.value.trim()) {
                        setSelectedFile(null); // Clear file when textarea is used
                        const input = document.getElementById('csv-file-input') as HTMLInputElement;
                        if (input) input.value = '';
                      }
                    }}
                    placeholder="EMP001,John,Doe,john@company.com,warehouse,Operator,company-id&#10;EMP002,Jane,Smith,jane@company.com,operations,Inspector,company-id"
                    className="w-full h-32 p-3 font-mono text-sm"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => bulkImportMutation.mutate({ file: selectedFile, csvDataText: csvData })}
                    disabled={bulkImportMutation.isPending || (!selectedFile && !csvData.trim())}
                  >
                    {bulkImportMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      "Import Employees"
                    )}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setIsBulkImporting(false);
                      setSelectedFile(null);
                      setCsvData('');
                      const input = document.getElementById('csv-file-input') as HTMLInputElement;
                      if (input) input.value = '';
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          
          <Dialog open={isAddingEmployee} onOpenChange={setIsAddingEmployee}>
            <DialogTrigger asChild>
              <Button className="flex-1 sm:flex-initial">
                <UserPlus className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Add Employee</span>
                <span className="sm:hidden">Add</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Employee</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Employee Number</Label>
                    <Input
                      value={newEmployee.employeeNumber}
                      onChange={(e) => setNewEmployee(prev => ({ ...prev, employeeNumber: e.target.value }))}
                      placeholder="EMP001"
                    />
                  </div>
                  <div>
                    <Label>Company</Label>
                    <Select value={newEmployee.companyId} onValueChange={(value) => setNewEmployee(prev => ({ ...prev, companyId: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select company" />
                      </SelectTrigger>
                      <SelectContent>
                        {companiesArray.map((company: Company) => (
                          <SelectItem key={company.id} value={company.id}>
                            {company.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>First Name</Label>
                    <Input
                      value={newEmployee.firstName}
                      onChange={(e) => setNewEmployee(prev => ({ ...prev, firstName: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Last Name</Label>
                    <Input
                      value={newEmployee.lastName}
                      onChange={(e) => setNewEmployee(prev => ({ ...prev, lastName: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={newEmployee.email}
                      onChange={(e) => setNewEmployee(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="employee@company.com"
                    />
                  </div>
                  <div>
                    <Label>Phone Number</Label>
                    <Input
                      type="tel"
                      value={newEmployee.phoneNumber}
                      onChange={(e) => setNewEmployee(prev => ({ ...prev, phoneNumber: e.target.value }))}
                      placeholder="+1234567890"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Department</Label>
                    <Select value={newEmployee.department} onValueChange={(value) => setNewEmployee(prev => ({ ...prev, department: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sales">Sales</SelectItem>
                        <SelectItem value="warehouse">Warehouse</SelectItem>
                        <SelectItem value="operations">Operations</SelectItem>
                        <SelectItem value="maintenance">Maintenance</SelectItem>
                        <SelectItem value="administration">Administration</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Job Title</Label>
                    <Input
                      value={newEmployee.jobTitle}
                      onChange={(e) => setNewEmployee(prev => ({ ...prev, jobTitle: e.target.value }))}
                      placeholder="Operator, Inspector, etc."
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Date of Birth</Label>
                    <Input
                      type="date"
                      value={newEmployee.dateOfBirth}
                      onChange={(e) => setNewEmployee(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Hire Date</Label>
                    <Input
                      type="date"
                      value={newEmployee.hireDate}
                      onChange={(e) => setNewEmployee(prev => ({ ...prev, hireDate: e.target.value }))}
                    />
                  </div>
                </div>
                <div>
                  <Label>Gender</Label>
                  <Select value={newEmployee.gender} onValueChange={(value) => setNewEmployee(prev => ({ ...prev, gender: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Emergency Contact Name</Label>
                    <Input
                      value={newEmployee.emergencyContactName}
                      onChange={(e) => setNewEmployee(prev => ({ ...prev, emergencyContactName: e.target.value }))}
                      placeholder="Contact Name"
                    />
                  </div>
                  <div>
                    <Label>Emergency Contact Phone</Label>
                    <Input
                      type="tel"
                      value={newEmployee.emergencyContactPhone}
                      onChange={(e) => setNewEmployee(prev => ({ ...prev, emergencyContactPhone: e.target.value }))}
                      placeholder="+1234567890"
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="medicalClearance"
                    checked={newEmployee.medicalClearance}
                    onChange={(e) => setNewEmployee(prev => ({ ...prev, medicalClearance: e.target.checked }))}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="medicalClearance">Medical Clearance</Label>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      const employeeData = {
                        ...newEmployee,
                        position: newEmployee.jobTitle, // Map jobTitle to position for backend
                        dateOfBirth: newEmployee.dateOfBirth ? new Date(newEmployee.dateOfBirth) : new Date('1990-01-01'),
                        hireDate: newEmployee.hireDate ? new Date(newEmployee.hireDate) : new Date()
                      };
                      createEmployeeMutation.mutate(employeeData);
                    }}
                    disabled={createEmployeeMutation.isPending || !newEmployee.firstName || !newEmployee.lastName || !newEmployee.companyId}
                  >
                    {createEmployeeMutation.isPending ? "Adding..." : "Add Employee"}
                  </Button>
                  <Button variant="outline" onClick={() => setIsAddingEmployee(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center flex-1">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Search className="h-4 w-4 text-gray-500 flex-shrink-0" />
            <Input
              placeholder="Search employees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="min-w-0"
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-2 flex-wrap">
            <Select value={companyFilter} onValueChange={setCompanyFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="All Companies" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Companies</SelectItem>
                {companiesArray.map((company: Company) => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                <SelectItem value="sales">Sales</SelectItem>
                <SelectItem value="warehouse">Warehouse</SelectItem>
                <SelectItem value="operations">Operations</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="administration">Administration</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Badge variant="outline" className="px-3 py-1 whitespace-nowrap">
              {filteredEmployees.length} of {employeesArray.length}
            </Badge>
          </div>
        </div>
        {/* View Toggle */}
        <div className="flex items-center border rounded-md">
          <Button
            variant={viewMode === 'table' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('table')}
            className="rounded-r-none"
            title="Table view"
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'cards' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('cards')}
            className="rounded-l-none"
            title="Card view"
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Employee List */}
      {filteredEmployees.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-gray-500">
            No employees match your current filters.
          </CardContent>
        </Card>
      ) : viewMode === 'table' ? (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">ID</TableHead>
                  <TableHead>Employee #</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-32">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.map((employee: Employee, index: number) => (
                  <TableRow key={employee.id} className={index % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell className="font-medium">{employee.employeeNumber}</TableCell>
                    <TableCell className="font-medium">{employee.firstName} {employee.lastName}</TableCell>
                    <TableCell>{employee.email}</TableCell>
                    <TableCell><DepartmentBadge department={employee.department} /></TableCell>
                    <TableCell>{employee.position || employee.jobTitle || '-'}</TableCell>
                    <TableCell>{employee.company?.name || '-'}</TableCell>
                    <TableCell><StatusBadge status={employee.status} /></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingEmployee(employee)}
                          className="h-7 px-2"
                          title="View"
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setEditingEmployee(employee)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                const newStatus = employee.status === 'active' ? 'inactive' : 'active';
                                updateEmployeeMutation.mutate({
                                  id: employee.id,
                                  status: newStatus
                                });
                              }}
                              disabled={updateEmployeeMutation.isPending}
                            >
                              <Power className="mr-2 h-4 w-4" />
                              {employee.status === 'active' ? 'Deactivate' : 'Activate'}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => {
                                setEmployeeToDelete(employee);
                                setDeleteEmployeeDialogOpen(true);
                              }}
                              disabled={deleteEmployeeMutation.isPending}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
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
        </Card>
      ) : (
        <div className="grid gap-4 sm:gap-6">
          {filteredEmployees.map((employee: Employee) => (
            <Card key={employee.id}>
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <h3 className="font-medium text-sm sm:text-base">
                        {employee.firstName} {employee.lastName}
                      </h3>
                      <StatusBadge status={employee.status} />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">
                        #{employee.employeeNumber}
                      </span>
                      <DepartmentBadge department={employee.department} />
                    </div>
                    <div className="text-xs sm:text-sm text-gray-500 space-y-1">
                      <div className="flex flex-wrap gap-1">
                        <span>{employee.position || employee.jobTitle || '-'}</span>
                        {employee.company?.name && (
                          <>
                            <span>•</span>
                            <span>{employee.company.name}</span>
                          </>
                        )}
                      </div>
                      <div className="break-all">{employee.email}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingEmployee(employee)}
                      className="w-full sm:w-auto"
                    >
                      <Eye className="h-4 w-4 mr-1 sm:mr-2" />
                      <span className="hidden sm:inline">View</span>
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditingEmployee(employee)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            const newStatus = employee.status === 'active' ? 'inactive' : 'active';
                            updateEmployeeMutation.mutate({
                              id: employee.id,
                              status: newStatus
                            });
                          }}
                          disabled={updateEmployeeMutation.isPending}
                        >
                          <Power className="mr-2 h-4 w-4" />
                          {employee.status === 'active' ? 'Deactivate' : 'Activate'}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => {
                            setEmployeeToDelete(employee);
                            setDeleteEmployeeDialogOpen(true);
                          }}
                          disabled={deleteEmployeeMutation.isPending}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Employee Modal */}
      {editingEmployee && (
        <Dialog open={!!editingEmployee} onOpenChange={() => setEditingEmployee(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Employee</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Employee Number</Label>
                  <Input
                    defaultValue={editingEmployee.employeeNumber}
                    onChange={(e) => setEditingEmployee(prev => prev ? { ...prev, employeeNumber: e.target.value } : null)}
                  />
                </div>
                <div>
                  <Label>Company</Label>
                  <Select
                    defaultValue={editingEmployee.companyId}
                    onValueChange={(value) => setEditingEmployee(prev => prev ? { ...prev, companyId: value } : null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select company" />
                    </SelectTrigger>
                    <SelectContent>
                      {companiesArray.map((company: Company) => (
                        <SelectItem key={company.id} value={company.id}>
                          {company.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>First Name</Label>
                  <Input
                    defaultValue={editingEmployee.firstName}
                    onChange={(e) => setEditingEmployee(prev => prev ? { ...prev, firstName: e.target.value } : null)}
                  />
                </div>
                <div>
                  <Label>Last Name</Label>
                  <Input
                    defaultValue={editingEmployee.lastName}
                    onChange={(e) => setEditingEmployee(prev => prev ? { ...prev, lastName: e.target.value } : null)}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    defaultValue={editingEmployee.email || ''}
                    onChange={(e) => setEditingEmployee(prev => prev ? { ...prev, email: e.target.value } : null)}
                  />
                </div>
                <div>
                  <Label>Phone Number</Label>
                  <Input
                    type="tel"
                    defaultValue={editingEmployee.phoneNumber || ''}
                    onChange={(e) => setEditingEmployee(prev => prev ? { ...prev, phoneNumber: e.target.value } : null)}
                    placeholder="+1234567890"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Department</Label>
                  <Select
                    defaultValue={editingEmployee.department}
                    onValueChange={(value) => setEditingEmployee(prev => prev ? { ...prev, department: value } : null)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sales">Sales</SelectItem>
                      <SelectItem value="warehouse">Warehouse</SelectItem>
                      <SelectItem value="operations">Operations</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                      <SelectItem value="administration">Administration</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Job Title</Label>
                  <Input
                    defaultValue={editingEmployee.jobTitle}
                    onChange={(e) => setEditingEmployee(prev => prev ? { ...prev, jobTitle: e.target.value } : null)}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Date of Birth</Label>
                  <Input
                    type="date"
                    defaultValue={editingEmployee.dateOfBirth ? new Date(editingEmployee.dateOfBirth).toISOString().split('T')[0] : ''}
                    onChange={(e) => setEditingEmployee(prev => prev ? { ...prev, dateOfBirth: e.target.value } : null)}
                  />
                </div>
                <div>
                  <Label>Hire Date</Label>
                  <Input
                    type="date"
                    defaultValue={editingEmployee.hireDate ? new Date(editingEmployee.hireDate).toISOString().split('T')[0] : ''}
                    onChange={(e) => setEditingEmployee(prev => prev ? { ...prev, hireDate: e.target.value } : null)}
                  />
                </div>
              </div>
              
              <div>
                <Label>Gender</Label>
                <Select
                  defaultValue={editingEmployee.gender || ''}
                  onValueChange={(value) => setEditingEmployee(prev => prev ? { ...prev, gender: value } : null)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Emergency Contact Name</Label>
                  <Input
                    defaultValue={editingEmployee.emergencyContactName || ''}
                    onChange={(e) => setEditingEmployee(prev => prev ? { ...prev, emergencyContactName: e.target.value } : null)}
                    placeholder="Emergency contact name"
                  />
                </div>
                <div>
                  <Label>Emergency Contact Phone</Label>
                  <Input
                    type="tel"
                    defaultValue={editingEmployee.emergencyContactPhone || ''}
                    onChange={(e) => setEditingEmployee(prev => prev ? { ...prev, emergencyContactPhone: e.target.value } : null)}
                    placeholder="+1234567890"
                  />
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="edit-medical-clearance"
                  defaultChecked={editingEmployee.medicalClearance || false}
                  onChange={(e) => setEditingEmployee(prev => prev ? { ...prev, medicalClearance: e.target.checked } : null)}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="edit-medical-clearance">Medical Clearance</Label>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    if (editingEmployee) {
                      const { id, ...updateData } = editingEmployee;
                      updateEmployeeMutation.mutate({ id, ...updateData });
                    }
                  }}
                  disabled={updateEmployeeMutation.isPending}
                >
                  {updateEmployeeMutation.isPending ? "Updating..." : "Update Employee"}
                </Button>
                <Button variant="outline" onClick={() => setEditingEmployee(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Employee Confirmation Dialog */}
      <AlertDialog open={deleteEmployeeDialogOpen} onOpenChange={setDeleteEmployeeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {employeeToDelete?.firstName} {employeeToDelete?.lastName} (Employee #{employeeToDelete?.employeeNumber}). This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setDeleteEmployeeDialogOpen(false);
              setEmployeeToDelete(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (employeeToDelete) {
                  deleteEmployeeMutation.mutate(employeeToDelete.id);
                }
              }}
              disabled={deleteEmployeeMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteEmployeeMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function NotificationCenter() {
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [activeSubTab, setActiveSubTab] = useState<'notifications' | 'config'>('notifications');
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['/api/notifications'],
  });

  const notificationsArray = Array.isArray(notifications) ? notifications : [];

  if (isLoading) {
    return <div className="flex items-center justify-center p-8">Loading notifications...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          <h2 className="text-xl font-semibold">Notification Center</h2>
          {activeSubTab === 'notifications' && (
            <Badge variant="secondary">{notificationsArray.length} notifications</Badge>
          )}
        </div>
        {/* View Toggle */}
        <div className="flex items-center border rounded-md">
          <Button
            variant={viewMode === 'table' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('table')}
            className="rounded-r-none"
            title="Table view"
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'cards' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('cards')}
            className="rounded-l-none"
            title="Card view"
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Tabs value={activeSubTab} onValueChange={(v) => setActiveSubTab(v as any)} className="space-y-4">
        <div className="tabs-list-custom mb-6">
          <TabsList className="grid w-full grid-cols-2 bg-transparent h-auto p-1 gap-1 lg:gap-2">
            <TabsTrigger value="notifications" className="tab-trigger-custom text-xs sm:text-sm">Notifications</TabsTrigger>
            <TabsTrigger value="config" className="tab-trigger-custom text-xs sm:text-sm">Alert Configuration</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="notifications" className="space-y-4">
          {notificationsArray.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-gray-500">
                No notifications at this time.
              </CardContent>
            </Card>
          ) : viewMode === 'table' ? (
            <Card>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">ID</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead>Channel</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {notificationsArray.map((notification: any, index: number) => (
                      <TableRow key={notification.id} className={index % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                        <TableCell className="font-medium">{index + 1}</TableCell>
                        <TableCell className="font-medium">{notification.title}</TableCell>
                        <TableCell>{notification.message}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{notification.channel || 'email'}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={notification.readAt ? "secondary" : notification.status === 'sent' ? "default" : "destructive"}>
                            {notification.readAt ? "Read" : notification.status === 'sent' ? "Sent" : notification.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {new Date(notification.createdAt).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          ) : (
            <div className="grid gap-4">
              {notificationsArray.map((notification: any) => (
                <Card key={notification.id}>
                  <CardContent className="p-6">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium">{notification.title}</h3>
                        <div className="flex gap-2">
                          <Badge variant="outline">{notification.channel || 'email'}</Badge>
                          <Badge variant={notification.readAt ? "secondary" : "default"}>
                            {notification.readAt ? "Read" : "Unread"}
                          </Badge>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600">{notification.message}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(notification.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="config">
          <NotificationPreferencesManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AuditTrailView({ makeAdminRequest }: { makeAdminRequest: (method: string, url: string, body?: any) => Promise<any> }) {
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const { data: auditLogs = [], isLoading } = useQuery({
    queryKey: ['/api/admin/audit-logs'],
    queryFn: async () => {
      const data = await makeAdminRequest('GET', '/api/admin/audit-logs');
      // Ensure we always return an array
      return Array.isArray(data) ? data : [];
    }
  });

  if (isLoading) {
    return <div className="flex items-center justify-center p-8">Loading audit logs...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          <h2 className="text-xl font-semibold">Audit Trail</h2>
          <Badge variant="secondary">{auditLogs.length} events</Badge>
        </div>
        {/* View Toggle */}
        <div className="flex items-center border rounded-md">
          <Button
            variant={viewMode === 'table' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('table')}
            className="rounded-r-none"
            title="Table view"
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'cards' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('cards')}
            className="rounded-l-none"
            title="Card view"
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {auditLogs.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No audit logs found</h3>
            <p className="text-gray-500">Audit logs will appear here as users perform actions in the system.</p>
          </CardContent>
        </Card>
      ) : viewMode === 'table' ? (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">ID</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Resource Type</TableHead>
                  <TableHead>Resource ID</TableHead>
                  <TableHead>User ID</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditLogs.map((log: any, index: number) => (
                  <TableRow key={log.id} className={index % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell><Badge variant="outline">{log.action}</Badge></TableCell>
                    <TableCell className="font-medium">{log.resourceType}</TableCell>
                    <TableCell className="font-mono text-xs">{log.resourceId?.slice(-8) || '-'}</TableCell>
                    <TableCell className="font-mono text-xs">{log.userId || '-'}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {log.details ? JSON.stringify(log.details) : '-'}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {format(new Date(log.createdAt), "MMM dd, yyyy 'at' HH:mm")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {auditLogs.map((log: any) => (
            <Card key={log.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{log.action}</Badge>
                      <span className="font-medium">{log.resourceType}</span>
                      <span className="text-sm text-gray-500">#{log.resourceId?.slice(-8)}</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      User: {log.userId} • {format(new Date(log.createdAt), "MMM dd, yyyy 'at' HH:mm")}
                    </p>
                    {log.details && (
                      <p className="text-xs text-gray-500 mt-2">
                        Details: {JSON.stringify(log.details, null, 2)}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function ReferralFacilitiesManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [form, setForm] = useState({ name: "", address: "", contactPhone: "", contactEmail: "", status: "active" });

  const { data: facilities = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/referral-facilities", { includeInactive: true }],
    queryFn: async () => {
      const res = await fetch("/api/referral-facilities?includeInactive=true", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/referral-facilities", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/referral-facilities"] });
      toast({ title: "Facility added", description: "Referral facility has been created." });
      setCreateOpen(false);
      setForm({ name: "", address: "", contactPhone: "", contactEmail: "", status: "active" });
    },
    onError: (e: any) => toast({ title: "Error", description: e?.message || "Failed to create facility.", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest("PUT", `/api/referral-facilities/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/referral-facilities"] });
      toast({ title: "Facility updated", description: "Referral facility has been updated." });
      setEditOpen(false);
      setSelected(null);
    },
    onError: (e: any) => toast({ title: "Error", description: e?.message || "Failed to update facility.", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/referral-facilities/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/referral-facilities"] });
      toast({ title: "Facility deleted", description: "Referral facility has been removed." });
      setDeleteOpen(false);
      setSelected(null);
    },
    onError: (e: any) => toast({ title: "Error", description: e?.message || "Failed to delete facility.", variant: "destructive" }),
  });

  const handleEditReferralFacility = (f: any) => {
    setSelected(f);
    setForm({ name: f.name, address: f.address || "", contactPhone: f.contactPhone || "", contactEmail: f.contactEmail || "", status: f.status || "active" });
    setEditOpen(true);
  };

  const handleDeleteReferralFacility = (f: any) => {
    setSelected(f);
    setDeleteOpen(true);
  };

  return (
    <div className="space-y-4 mt-8">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Referral / transfer facilities
              </CardTitle>
              <CardDescription className="mt-1">
                Hospitals and facilities for &quot;Transferred to hospital&quot; disposition. These appear in the medical visit form.
              </CardDescription>
            </div>
            <Button onClick={() => { setForm({ name: "", address: "", contactPhone: "", contactEmail: "", status: "active" }); setCreateOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" />
              Add facility
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : facilities.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No referral facilities yet. Add one to show in the medical visit disposition dropdown.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {facilities.map((f: any) => (
                    <TableRow key={f.id}>
                      <TableCell className="font-medium">{f.name}</TableCell>
                      <TableCell className="text-muted-foreground max-w-[200px] truncate">{f.address || "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{f.contactPhone || "—"}</TableCell>
                      <TableCell className="text-muted-foreground max-w-[180px] truncate">{f.contactEmail || "—"}</TableCell>
                      <TableCell><Badge variant={f.status === "active" ? "default" : "secondary"}>{f.status}</Badge></TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditReferralFacility(f)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDeleteReferralFacility(f)}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add referral facility</DialogTitle>
            <DialogDescription>Hospital or facility name used when disposition is &quot;Transferred to hospital&quot;.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input placeholder="e.g. Regional Hospital" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input placeholder="Optional" value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Contact phone</Label>
              <Input placeholder="Optional" value={form.contactPhone} onChange={(e) => setForm((p) => ({ ...p, contactPhone: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Email address</Label>
              <Input type="email" placeholder="Optional" value={form.contactEmail} onChange={(e) => setForm((p) => ({ ...p, contactEmail: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={() => form.name.trim() && createMutation.mutate({ name: form.name.trim(), address: form.address.trim() || undefined, contactPhone: form.contactPhone.trim() || undefined, contactEmail: form.contactEmail.trim() || undefined, status: form.status })} disabled={!form.name.trim() || createMutation.isPending}>
              {createMutation.isPending ? "Saving..." : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit referral facility</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input placeholder="e.g. Regional Hospital" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Contact phone</Label>
              <Input value={form.contactPhone} onChange={(e) => setForm((p) => ({ ...p, contactPhone: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Email address</Label>
              <Input type="email" value={form.contactEmail} onChange={(e) => setForm((p) => ({ ...p, contactEmail: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm((p) => ({ ...p, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={() => selected && form.name.trim() && updateMutation.mutate({ id: selected.id, data: { name: form.name.trim(), address: form.address.trim() || undefined, contactPhone: form.contactPhone.trim() || undefined, contactEmail: form.contactEmail.trim() || undefined, status: form.status } })} disabled={!form.name.trim() || updateMutation.isPending}>
              {updateMutation.isPending ? "Saving..." : "Update"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete referral facility?</AlertDialogTitle>
            <AlertDialogDescription>This will remove &quot;{selected?.name}&quot; from the list. Existing visits that used this facility will keep the reference.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => selected && deleteMutation.mutate(selected.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function CareLocationsManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<any | null>(null);
  const [formData, setFormData] = useState({
    locationName: "",
    locationCode: "",
    description: "",
    address: "",
    contactPhone: "",
    contactEmail: "",
    capacity: "",
    isPrimary: false,
    status: "active",
  });

  // Fetch tenant info
  const { data: tenantInfo } = useQuery<any>({
    queryKey: ["/api/auth/current-session"],
  });

  // Fetch locations
  const { data: locations, isLoading } = useQuery<any[]>({
    queryKey: ["/api/care-locations", { includeInactive: true, locationKind: "fixed_site" }],
  });

  // Toggle multi-location feature mutation
  const toggleMultiLocationMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const tenantId = tenantInfo?.tenant?.id;
      if (!tenantId) throw new Error("No tenant ID");
      
      console.log('=== TOGGLE MULTI-LOCATION ===');
      console.log('Tenant ID:', tenantId);
      console.log('Enabled:', enabled);
      console.log('URL:', `/api/tenants/${tenantId}`);
      console.log('Body:', { hasMultipleLocations: enabled });
      
      const response = await apiRequest("PUT", `/api/tenants/${tenantId}`, {
        hasMultipleLocations: enabled,
      });
      
      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);
      
      // Get response text first
      const text = await response.text();
      console.log('Toggle response text:', text);
      
      // Try to parse as JSON
      try {
        const result = text ? JSON.parse(text) : { success: true };
        console.log('Toggle response parsed:', result);
        return result;
      } catch (e) {
        console.error('Failed to parse response:', e, 'Text:', text);
        // If parse fails but status is 200, consider it success
        if (response.ok) {
          return { success: true };
        }
        throw new Error('Invalid response from server');
      }
    },
    onSuccess: async (data, enabled) => {
      console.log('Toggle success, invalidating queries and refetching...');
      
      // Invalidate and refetch session to get updated tenant info
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/current-session"] });
      await queryClient.refetchQueries({ queryKey: ["/api/auth/current-session"] });
      
      // Force a hard refresh of the page after a short delay to ensure state updates
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
      toast({
        title: enabled ? "Multi-Location Enabled" : "Multi-Location Disabled",
        description: enabled 
          ? "Users will select their working location at login. Page will refresh..." 
          : "System will auto-select the primary location. Page will refresh...",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update multi-location setting.",
        variant: "destructive",
      });
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/care-locations", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/care-locations"] });
      toast({
        title: "Location Created",
        description: "Care location has been created successfully.",
      });
      setCreateDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create location.",
        variant: "destructive",
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await apiRequest("PUT", `/api/care-locations/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/care-locations"] });
      toast({
        title: "Location Updated",
        description: "Care location has been updated successfully.",
      });
      setEditDialogOpen(false);
      setSelectedLocation(null);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update location.",
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/care-locations/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/care-locations"] });
      toast({
        title: "Location Deleted",
        description: "Care location has been deleted successfully.",
      });
      setDeleteDialogOpen(false);
      setSelectedLocation(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete location.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      locationName: "",
      locationCode: "",
      description: "",
      address: "",
      contactPhone: "",
      contactEmail: "",
      capacity: "",
      isPrimary: false,
      status: "active",
    });
  };

  const handleCreate = () => {
    const payload = {
      ...formData,
      capacity: formData.capacity ? parseInt(formData.capacity) : undefined,
    };
    createMutation.mutate(payload);
  };

  const handleEdit = (location: any) => {
    setSelectedLocation(location);
    setFormData({
      locationName: location.locationName,
      locationCode: location.locationCode,
      description: location.description || "",
      address: location.address || "",
      contactPhone: location.contactPhone || "",
      contactEmail: location.contactEmail || "",
      capacity: location.capacity?.toString() || "",
      isPrimary: location.isPrimary,
      status: location.status,
    });
    setEditDialogOpen(true);
  };

  const handleUpdate = () => {
    if (!selectedLocation) return;
    
    const payload = {
      ...formData,
      capacity: formData.capacity ? parseInt(formData.capacity) : undefined,
    };
    updateMutation.mutate({ id: selectedLocation.id, data: payload });
  };

  const handleDelete = (location: any) => {
    setSelectedLocation(location);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (selectedLocation) {
      deleteMutation.mutate(selectedLocation.id);
    }
  };

  const handleSetPrimary = (location: any) => {
    updateMutation.mutate({
      id: location.id,
      data: { isPrimary: true },
    });
  };

  const handleToggleStatus = (location: any) => {
    const newStatus = location.status === "active" ? "inactive" : "active";
    updateMutation.mutate({
      id: location.id,
      data: { status: newStatus },
    });
  };

  // Filter locations
  const filteredLocations = locations?.filter((location) => {
    const matchesSearch = 
      location.locationName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      location.locationCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      location.address?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = 
      statusFilter === "all" || location.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-4">
      {/* Multi-Location Feature Toggle */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Multi-Location System
              </CardTitle>
              <CardDescription className="mt-1">
                Enable support for multiple emergency care sites and mini-clinics
              </CardDescription>
            </div>
            <Switch
              checked={tenantInfo?.tenant?.hasMultipleLocations || false}
              onCheckedChange={(checked) => toggleMultiLocationMutation.mutate(checked)}
              disabled={toggleMultiLocationMutation.isPending}
            />
          </div>
        </CardHeader>
        <CardContent>
          {tenantInfo?.tenant?.hasMultipleLocations ? (
            <div className="text-sm space-y-2">
              <div className="flex items-start gap-2 text-green-700 bg-green-50 p-3 rounded-md">
                <Shield className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Multi-Location Mode Active</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Users will select their working location at login. All operations will be automatically tagged with their session location.
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                💡 <strong>Tip:</strong> Create additional locations below. Users will see a location selection modal after login.
              </p>
            </div>
          ) : (
            <div className="text-sm space-y-2">
              <div className="flex items-start gap-2 text-blue-700 bg-blue-50 p-3 rounded-md">
                <Building2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Single-Location Mode</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    The primary location will be automatically selected for all users. No location selection required at login.
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                💡 <strong>Enable multi-location</strong> if you operate sites in different areas (e.g., Main Warehouse, Site Office, Processing Plant).
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filters and Create Button */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search locations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active Only</SelectItem>
              <SelectItem value="inactive">Inactive Only</SelectItem>
              <SelectItem value="maintenance">Maintenance</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex items-center border rounded-md">
            <Button
              variant={viewMode === 'table' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('table')}
              className="rounded-r-none"
              title="Table view"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'cards' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('cards')}
              className="rounded-l-none"
              title="Card view"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
        </div>
        {/* Only allow creating additional locations when multi-location is enabled */}
        {tenantInfo?.tenant?.hasMultipleLocations && (
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Location
          </Button>
        )}
        </div>
      </div>

      {/* Locations List */}
      {isLoading ? (
        <div className="text-center py-12">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredLocations && filteredLocations.length > 0 ? (
        viewMode === 'table' ? (
          <Card>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">ID</TableHead>
                    <TableHead>Location Name</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Capacity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Primary</TableHead>
                    <TableHead className="w-32">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLocations.map((location: any, index: number) => (
                    <TableRow key={location.id} className={index % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell className="font-medium">{location.locationName}</TableCell>
                      <TableCell><Badge variant="outline">{location.locationCode}</Badge></TableCell>
                      <TableCell>{location.address || '-'}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {location.contactPhone && <div className="text-sm">{location.contactPhone}</div>}
                          {location.contactEmail && <div className="text-sm text-gray-500">{location.contactEmail}</div>}
                        </div>
                      </TableCell>
                      <TableCell>{location.capacity || '-'}</TableCell>
                      <TableCell>
                        <Badge
                          variant={location.status === "active" ? "default" : "secondary"}
                          className={
                            location.status === "active"
                              ? "bg-green-500"
                              : location.status === "maintenance"
                              ? "bg-amber-500"
                              : ""
                          }
                        >
                          {location.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {location.isPrimary && (
                          <Badge variant="default" className="bg-amber-500">
                            <Star className="h-3 w-3 mr-1" />
                            Primary
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(location)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            {!location.isPrimary && (
                              <DropdownMenuItem onClick={() => handleSetPrimary(location)}>
                                <Star className="mr-2 h-4 w-4" />
                                Set as Primary
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => handleToggleStatus(location)}>
                              <Power className="mr-2 h-4 w-4" />
                              {location.status === "active" ? "Deactivate" : "Activate"}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDelete(location)}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredLocations.map((location: any) => (
            <Card key={location.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Building2 className="h-4 w-4" />
                      {location.locationName}
                    </CardTitle>
                    <CardDescription className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{location.locationCode}</Badge>
                      {location.isPrimary && (
                        <Badge variant="default" className="bg-amber-500">
                          <Star className="h-3 w-3 mr-1" />
                          Primary
                        </Badge>
                      )}
                      <Badge
                        variant={location.status === "active" ? "default" : "secondary"}
                        className={
                          location.status === "active"
                            ? "bg-green-500"
                            : location.status === "maintenance"
                            ? "bg-amber-500"
                            : ""
                        }
                      >
                        {location.status}
                      </Badge>
                    </CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(location)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      {!location.isPrimary && (
                        <DropdownMenuItem onClick={() => handleSetPrimary(location)}>
                          <Star className="mr-2 h-4 w-4" />
                          Set as Primary
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => handleToggleStatus(location)}>
                        <Power className="mr-2 h-4 w-4" />
                        {location.status === "active" ? "Deactivate" : "Activate"}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleDelete(location)}
                        className="text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                {location.description && (
                  <p className="text-sm text-muted-foreground">{location.description}</p>
                )}

                <div className="space-y-2">
                  {location.address && (
                    <div className="flex items-start gap-2 text-sm">
                      <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                      <span className="text-muted-foreground">{location.address}</span>
                    </div>
                  )}
                  {location.contactPhone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">{location.contactPhone}</span>
                    </div>
                  )}
                  {location.contactEmail && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground truncate">{location.contactEmail}</span>
                    </div>
                  )}
                </div>

                <Separator />

                <div className="flex items-center justify-between text-sm">
                  {location.capacity && (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>Capacity: {location.capacity}</span>
                    </div>
                  )}
                  {location.staffCount !== undefined && location.staffCount > 0 && (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>{location.staffCount} staff</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        )
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Building2 className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No locations found</h3>
              <p className="text-sm text-muted-foreground mt-2">
                {searchQuery || statusFilter !== "all"
                  ? "Try adjusting your filters"
                  : "Get started by creating your first care location"}
              </p>
              {!searchQuery && statusFilter === "all" && (
                <Button className="mt-4" onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Location
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={createDialogOpen || editDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setCreateDialogOpen(false);
          setEditDialogOpen(false);
          setSelectedLocation(null);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editDialogOpen ? "Edit Care Location" : "Create Care Location"}
            </DialogTitle>
            <DialogDescription>
              {editDialogOpen
                ? "Update the details of this care location"
                : "Add a new emergency care site or mini-clinic"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="locationName">
                  Location Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="locationName"
                  placeholder="e.g., Main Distribution Center"
                  value={formData.locationName}
                  onChange={(e) => setFormData({ ...formData, locationName: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="locationCode">
                  Location Code <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="locationCode"
                  placeholder="e.g., MAIN"
                  value={formData.locationCode}
                  onChange={(e) =>
                    setFormData({ ...formData, locationCode: e.target.value.toUpperCase() })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Brief description of this location"
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                placeholder="Physical address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contactPhone">Contact Phone</Label>
                <Input
                  id="contactPhone"
                  placeholder="+1-555-0100"
                  value={formData.contactPhone}
                  onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactEmail">Contact Email</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  placeholder="clinic@example.com"
                  value={formData.contactEmail}
                  onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="capacity">Capacity (beds/stations)</Label>
                <Input
                  id="capacity"
                  type="number"
                  min="0"
                  placeholder="10"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="isPrimary"
                checked={formData.isPrimary}
                onCheckedChange={(checked) => setFormData({ ...formData, isPrimary: checked })}
              />
              <Label htmlFor="isPrimary" className="cursor-pointer">
                Set as primary location
              </Label>
            </div>
            {formData.isPrimary && (
              <p className="text-xs text-muted-foreground">
                The primary location will be auto-selected for single-location mode and used as the default.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCreateDialogOpen(false);
                setEditDialogOpen(false);
                setSelectedLocation(null);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={editDialogOpen ? handleUpdate : handleCreate}
              disabled={
                !formData.locationName ||
                !formData.locationCode ||
                createMutation.isPending ||
                updateMutation.isPending
              }
            >
              {(createMutation.isPending || updateMutation.isPending)
                ? "Saving..."
                : editDialogOpen
                ? "Update Location"
                : "Create Location"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Delete Care Location?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{selectedLocation?.locationName}</strong>?
              This action cannot be undone.
              {selectedLocation?.isPrimary && (
                <div className="mt-2 p-2 bg-destructive/10 rounded-md">
                  <p className="text-destructive font-medium">
                    Warning: This is the primary location. You must set another location as primary first.
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete Location"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

const VALID_ADMIN_TABS = [
  "users",
  "employees",
  "companies",
  "locations",
  "notifications",
  "audit",
] as const;

export default function Admin() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("users");
  const [employeeCompanyFilter, setEmployeeCompanyFilter] = useState("all");

  // Listen for sidebar tab navigation + deep links (#users, etc.)
  useEffect(() => {
    const handleTabNavigate = (e: CustomEvent) => {
      setActiveTab(e.detail.tabValue);
    };
    const applyHash = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash && (VALID_ADMIN_TABS as readonly string[]).includes(hash)) {
        setActiveTab(hash);
      }
    };
    window.addEventListener('sidebar-tab-navigate', handleTabNavigate as EventListener);
    window.addEventListener('hashchange', applyHash);
    applyHash();

    return () => {
      window.removeEventListener('sidebar-tab-navigate', handleTabNavigate as EventListener);
      window.removeEventListener('hashchange', applyHash);
    };
  }, []);

  // Helper to make admin requests (uses session-based auth via apiRequest)
  const makeAdminRequest = async (method: string, url: string, body?: any) => {
    const response = await apiRequest(method, url, body);
    // Parse JSON response if it's a Response object
    if (response instanceof Response) {
      return await response.json();
    }
    return response;
  };

  // Fetch dashboard metrics for statistics cards
  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['/api/dashboard/metrics'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/dashboard/metrics');
      if (response instanceof Response) {
        return await response.json();
      }
      return response;
    },
  });

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  // Show unauthorized page if not authenticated
  if (!isAuthenticated || !user) {
    return <Unauthorized />;
  }

  // Check if user is tenant admin (role='admin' with tenantId)
  // Only check after user is confirmed to exist
  const isTenantAdmin = user.role === 'admin' && user.tenantId;

  // Show access denied page if not tenant admin
  if (!isTenantAdmin) {
    return (
      <AccessDenied
        title="Admin Access Required"
        message="You must have the 'admin' role within a tenant to access this page."
        requiredRole="Tenant Admin"
        currentRole={user.role || undefined}
      />
    );
  }

  return (
    <div className="w-full p-4 sm:p-6 pb-20 md:pb-8 bg-uventorybiz-light-gray">
      <div className="mb-8 relative z-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <Shield className="h-6 w-6 text-[#142F5C] flex-shrink-0" />
            <h1 className="text-xl sm:text-2xl font-bold truncate">Tenant Administration</h1>
          </div>
          <Badge variant="outline" className="text-xs flex-shrink-0 self-start sm:self-auto">
            v{APP_VERSION}
          </Badge>
        </div>
        <p className="text-sm sm:text-base text-gray-600">
          Manage user registrations, company settings, and system notifications.
        </p>
      </div>

      {/* Statistics Cards */}
      {metricsLoading ? (
        <div className="grid grid-cols-2 max-[480px]:grid-cols-1 lg:grid-cols-4 gap-6 mb-8 relative z-0">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="bg-white dark:bg-gray-800 animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-gray-200 rounded w-24"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-32"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : metrics ? (
        <div className="grid grid-cols-2 max-[480px]:grid-cols-1 lg:grid-cols-4 gap-6 mb-8 relative z-0">
          {/* Total Users Card */}
          <Card className="bg-gradient-to-br from-[#142F5C] to-[#1a3d6b] border-0 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-0">
              <CardTitle className="text-sm font-medium text-white/90">Total Users</CardTitle>
              <div className="bg-white/20 p-2 rounded-lg">
                <Users className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent className="relative z-0">
              <div className="text-3xl font-bold text-white mb-1">{metrics.totalUsers || 0}</div>
              <p className="text-xs text-white/70">
                {metrics.activeUsers || 0} active, {metrics.pendingUsers || 0} pending
              </p>
            </CardContent>
          </Card>

          {/* Total Employees Card */}
          <Card className="bg-gradient-to-br from-[#EAF6FF] to-white border-2 border-[#142F5C]/20 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#142F5C]/5 rounded-full -mr-16 -mt-16"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-0">
              <CardTitle className="text-sm font-medium text-[#142F5C]">Total Employees</CardTitle>
              <div className="bg-[#142F5C]/10 p-2 rounded-lg">
                <Briefcase className="h-5 w-5 text-[#142F5C]" />
              </div>
            </CardHeader>
            <CardContent className="relative z-0">
              <div className="text-3xl font-bold text-[#142F5C] mb-1">{metrics.totalEmployees || 0}</div>
              <p className="text-xs text-[#142F5C]/70">
                {metrics.activeEmployees || 0} active
              </p>
            </CardContent>
          </Card>

          {/* Total Companies Card */}
          <Card className="bg-gradient-to-br from-[#142F5C] to-[#1a3d6b] border-0 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-0">
              <CardTitle className="text-sm font-medium text-white/90">Companies</CardTitle>
              <div className="bg-white/20 p-2 rounded-lg">
                <Building2 className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent className="relative z-0">
              <div className="text-3xl font-bold text-white mb-1">{metrics.totalCompanies || 0}</div>
              <p className="text-xs text-white/70">
                {metrics.activeCompanies || 0} active
              </p>
            </CardContent>
          </Card>

          {/* Active Customers Card */}
          <Card className="bg-gradient-to-br from-[#EAF6FF] to-white border-2 border-[#142F5C]/20 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#142F5C]/5 rounded-full -mr-16 -mt-16"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-0">
              <CardTitle className="text-sm font-medium text-[#142F5C]">Active Customers</CardTitle>
              <div className="bg-[#142F5C]/10 p-2 rounded-lg">
                <Activity className="h-5 w-5 text-[#142F5C]" />
              </div>
            </CardHeader>
            <CardContent className="relative z-0">
              <div className="text-3xl font-bold text-[#142F5C] mb-1">{metrics.activeCustomers || 0}</div>
              <p className="text-xs text-[#142F5C]">
                {metrics.totalCustomers || 0} total customers
              </p>
            </CardContent>
          </Card>

          {/* Today's Appointments Card */}
          <Card className="bg-gradient-to-br from-[#EAF6FF] to-white border-2 border-[#142F5C]/20 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#142F5C]/5 rounded-full -mr-16 -mt-16"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
              <CardTitle className="text-sm font-medium text-[#142F5C]">Today's Appointments</CardTitle>
              <div className="bg-[#142F5C]/10 p-2 rounded-lg">
                <Calendar className="h-5 w-5 text-[#142F5C]" />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-3xl font-bold text-[#142F5C] mb-1">{metrics.todayAppointments || 0}</div>
              <p className="text-xs text-[#142F5C]/70">
                {metrics.completedAppointments || 0} completed
              </p>
            </CardContent>
          </Card>

          {/* Open Incidents Card */}
          <Card className="bg-gradient-to-br from-[#142F5C] to-[#1a3d6b] border-0 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
              <CardTitle className="text-sm font-medium text-white/90">Open Incidents</CardTitle>
              <div className="bg-white/20 p-2 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-3xl font-bold text-white mb-1">{metrics.openIncidents || 0}</div>
              <p className="text-xs text-white/70">
                {metrics.totalIncidents || 0} total incidents
              </p>
            </CardContent>
          </Card>

          {/* Pending Users Card */}
          <Card className="bg-gradient-to-br from-[#EAF6FF] to-white border-2 border-[#FF4D4D]/20 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#FF4D4D]/5 rounded-full -mr-16 -mt-16"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
              <CardTitle className="text-sm font-medium text-[#142F5C]">Pending Approvals</CardTitle>
              <div className="bg-[#FF4D4D]/10 p-2 rounded-lg">
                <UserCheck className="h-5 w-5 text-[#FF4D4D]" />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-3xl font-bold text-[#FF4D4D] mb-1">{metrics.pendingUsers || 0}</div>
              <p className="text-xs text-[#142F5C]/70">
                Users awaiting approval
              </p>
            </CardContent>
          </Card>

          {/* System Health Card */}
          <Card className="bg-gradient-to-br from-[#142F5C] to-[#1a3d6b] border-0 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
              <CardTitle className="text-sm font-medium text-white/90">System Status</CardTitle>
              <div className="bg-white/20 p-2 rounded-lg">
                <Activity className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-3xl font-bold mb-1 flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-white">Healthy</span>
              </div>
              <p className="text-xs text-white/70">
                All systems operational
              </p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <Tabs
        value={activeTab}
        onValueChange={(v) => {
          setActiveTab(v);
          window.location.hash = v;
        }}
        className="space-y-6"
      >
        <div className="tabs-list-custom mb-6 overflow-x-auto">
          <TabsList className="grid w-full grid-cols-6 min-w-[600px] sm:min-w-0 bg-transparent h-auto p-1 gap-1 lg:gap-2">
            <TabsTrigger value="users" className="tab-trigger-custom text-xs sm:text-sm">Users</TabsTrigger>
            <TabsTrigger value="employees" className="tab-trigger-custom text-xs sm:text-sm">Employees</TabsTrigger>
            <TabsTrigger value="companies" className="tab-trigger-custom text-xs sm:text-sm">Companies</TabsTrigger>
            <TabsTrigger value="locations" className="tab-trigger-custom text-xs sm:text-sm">Locations</TabsTrigger>
            <TabsTrigger value="notifications" className="tab-trigger-custom text-xs sm:text-sm">Notifications</TabsTrigger>
            <TabsTrigger value="audit" className="tab-trigger-custom text-xs sm:text-sm">Audit Trail</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="users">
          <UserManagement makeAdminRequest={makeAdminRequest} />
        </TabsContent>

        <TabsContent value="employees">
          <NewEmployeeManagement initialCompanyFilter={employeeCompanyFilter !== "all" ? employeeCompanyFilter : undefined} />
        </TabsContent>

        <TabsContent value="companies">
          <CompanyManagement 
            onViewEmployees={(companyId: string) => {
              setEmployeeCompanyFilter(companyId);
              setActiveTab("employees");
            }}
          />
        </TabsContent>

        <TabsContent value="locations">
          <CareLocationsManagement />
          <ReferralFacilitiesManagement />
        </TabsContent>

        <TabsContent value="notifications">
          <NotificationCenter />
        </TabsContent>

        <TabsContent value="audit">
          <AuditTrailView makeAdminRequest={makeAdminRequest} />
        </TabsContent>
      </Tabs>
      <MobileNav />
    </div>
  );
}
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Link } from "wouter";
import { ArrowLeft, Search, Calendar, User, Activity, Filter, FileText, Eye, Clock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import MobileNav from "@/components/MobileNav";
import type { AuditLog } from "@shared/schema";
import type { AuthUser } from "@/types/auth";

type AuditLogWithUser = AuditLog & {
  user?: {
    firstName?: string | null;
    lastName?: string | null;
    role?: string | null;
  };
  changes?: unknown;
};

export default function AuditTrail() {
  const [resourceTypeFilter, setResourceTypeFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [userFilter, setUserFilter] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch audit logs for admin
  const { data: auditLogs = [], isLoading } = useQuery<AuditLogWithUser[]>({
    queryKey: ["/api/admin/audit-logs", resourceTypeFilter, actionFilter, userFilter],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/admin/audit-logs?${new URLSearchParams({
        ...(resourceTypeFilter && { resourceType: resourceTypeFilter }),
        ...(actionFilter && { action: actionFilter }),
        ...(userFilter && { userId: userFilter }),
        limit: "100"
      }).toString()}`);
      return res.json() as Promise<AuditLogWithUser[]>;
    },
    retry: false,
  });

  // Fetch users for filter dropdown
  const { data: users = [] } = useQuery<AuthUser[]>({
    queryKey: ["/api/users"],
    retry: false,
  });

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'create': return <Activity className="h-4 w-4 text-green-600" />;
      case 'update': return <FileText className="h-4 w-4 text-blue-600" />;
      case 'delete': return <Activity className="h-4 w-4 text-red-600" />;
      default: return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'create': return 'bg-green-100 text-green-800';
      case 'update': return 'bg-blue-100 text-blue-800';
      case 'delete': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatResourceType = (type: string) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const clearFilters = () => {
    setResourceTypeFilter("");
    setActionFilter("");
    setUserFilter("");
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 pb-20 md:pb-8 bg-uventorybiz-light-gray">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4 mb-6">
          <Button variant="outline" size="sm" className="w-fit" onClick={() => window.history.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">Audit Trail</h2>
            <p className="text-uventorybiz-gray mt-1 text-sm sm:text-base">Track all system activities and changes</p>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Filter className="h-5 w-5 mr-2" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Resource Type</label>
                <Select value={resourceTypeFilter} onValueChange={setResourceTypeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All types</SelectItem>
                    <SelectItem value="duty_assignment">Duty Assignment</SelectItem>
                    <SelectItem value="incident_report">Incident Report</SelectItem>
                    <SelectItem value="medical_visit">Medical Visit</SelectItem>
                    <SelectItem value="patient">Patient</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Action</label>
                <Select value={actionFilter} onValueChange={setActionFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All actions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All actions</SelectItem>
                    <SelectItem value="create">Create</SelectItem>
                    <SelectItem value="update">Update</SelectItem>
                    <SelectItem value="delete">Delete</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">User</label>
                <Select value={userFilter} onValueChange={setUserFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All users" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All users</SelectItem>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id || ''}>
                        {user.firstName || ''} {user.lastName || ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button variant="outline" onClick={clearFilters} className="w-full">
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Audit Logs Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="h-5 w-5 mr-2" />
              Activity Log
            </CardTitle>
            <CardDescription>
              Recent system activities and changes ({auditLogs.length} entries)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin h-8 w-8 border-2 border-uventorybiz-navy border-t-transparent rounded-full"></div>
              </div>
            ) : auditLogs.length === 0 ? (
              <div className="text-center py-8">
                <Activity className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No audit logs found</h3>
                <p className="text-uventorybiz-gray">
                  {resourceTypeFilter || actionFilter || userFilter 
                    ? "No activities match your current filters" 
                    : "No system activities have been logged yet"
                  }
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Action</TableHead>
                      <TableHead>Resource</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Changes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditLogs.map((log) => (
                      <TableRow key={log.id} className="hover:bg-gray-50">
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {getActionIcon(log.action)}
                            <Badge className={getActionColor(log.action)}>
                              {log.action}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{formatResourceType(log.resourceType)}</div>
                            <div className="text-sm text-gray-500">ID: {log.resourceId}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {log.user?.firstName} {log.user?.lastName}
                            </div>
                            <div className="text-sm text-gray-500">{log.user?.role}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{log.createdAt ? format(new Date(log.createdAt), 'MMM dd, yyyy') : 'N/A'}</div>
                            <div className="text-gray-500">{log.createdAt ? format(new Date(log.createdAt), 'HH:mm:ss') : ''}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {log.changes ? (
                            <div className="max-w-xs">
                              <details className="text-sm">
                                <summary className="cursor-pointer text-blue-600 hover:text-blue-800">
                                  View changes
                                </summary>
                                <pre className="mt-2 text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                                  {JSON.stringify(log.changes, null, 2)}
                                </pre>
                              </details>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm">No details</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      <MobileNav />
    </div>
  );
}
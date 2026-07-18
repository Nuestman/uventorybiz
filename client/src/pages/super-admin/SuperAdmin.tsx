import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Building2, Users, UserPlus, Search, Plus, Settings, BarChart3, Activity, Shield, Globe, Lock, UserCheck, Pencil, Trash2, UserX, PlayCircle, CheckCircle, XCircle, Loader2, Clock, AlertTriangle, MessageCircle, UserRound } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { APP_VERSION } from "@/lib/appVersion";
import { useAuth } from "@/hooks/useAuth";
import AccessDenied from '@/pages/access-denied';
import Unauthorized from '@/pages/unauthorized';
interface Tenant {
  id: string;
  name: string;
  description: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  planType: string;
  status: string;
  userCount: number;
  createdAt: string;
  updatedAt: string;
}

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
  lastLoginAt?: string;
  tenantId: string;
}

interface TenantAdmin {
  id: string;
  email: string;
  phoneNumber?: string;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
  lastLoginAt: string;
  tenantId: string;
  tenantName: string;
}

interface FeedbackItem {
  id: string;
  userId?: string | null;
  tenantId?: string | null;
  path: string;
  context?: string | null;
  kind: string;
  uxRating?: number | null;
  uiRating?: number | null;
  navigationRating?: number | null;
  speedRating?: number | null;
  reliabilityRating?: number | null;
  npsScore?: number | null;
  areasUsed?: string[] | null;
  comment?: string | null;
  contactEmail?: string | null;
  status: string;
  adminNote?: string | null;
  createdAt: string;
  updatedAt: string;
  userEmail?: string | null;
  tenantName?: string | null;
}

interface CreateTenantForm {
  name: string;
  description: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  planType: string;
  adminEmail: string;
  adminFirstName: string;
  adminLastName: string;
}

const SUPER_ADMIN_HASH_TABS = new Set([
  "tenants",
  "admins",
  "users",
  "api-testing",
  "feedback",
]);

function getInitialSuperAdminTab(): string {
  if (typeof window === "undefined") return "tenants";
  const hash = window.location.hash.replace(/^#/, "");
  if (hash && SUPER_ADMIN_HASH_TABS.has(hash)) return hash;
  return "tenants";
}

function replaceSuperAdminHash(tab: string) {
  const path = window.location.pathname;
  const search = window.location.search;
  window.history.replaceState(null, "", `${path}${search}#${tab}`);
}

/** `replaceState` does not fire `hashchange`; sidebar reads this to stay in sync. */
function syncSuperAdminSidebarHash(tab: string) {
  window.dispatchEvent(
    new CustomEvent("super-admin-hash-sync", { detail: { hash: `#${tab}` } }),
  );
}

export default function SuperAdmin() {
  const [pathname] = useLocation();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeTab, setActiveTab] = useState(getInitialSuperAdminTab);
  const [isCreateTenantOpen, setIsCreateTenantOpen] = useState(false);

  useEffect(() => {
    const syncFromHash = () => {
      const hash = window.location.hash.replace(/^#/, "");
      if (hash && SUPER_ADMIN_HASH_TABS.has(hash)) setActiveTab(hash);
      else setActiveTab("tenants");
    };

    const handleTabNavigate = (e: CustomEvent<{ tabValue: string }>) => {
      const tab = e.detail.tabValue;
      if (SUPER_ADMIN_HASH_TABS.has(tab)) {
        setActiveTab(tab);
        replaceSuperAdminHash(tab);
        syncSuperAdminSidebarHash(tab);
      }
    };

    window.addEventListener("sidebar-tab-navigate", handleTabNavigate as EventListener);
    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => {
      window.removeEventListener("sidebar-tab-navigate", handleTabNavigate as EventListener);
      window.removeEventListener("hashchange", syncFromHash);
    };
  }, []);

  /** When navigating to the console from another route (e.g. /super-admin/dashboard), wouter may not fire hashchange. */
  useEffect(() => {
    if (pathname !== "/super-admin") return;
    const hash = window.location.hash.replace(/^#/, "");
    if (hash && SUPER_ADMIN_HASH_TABS.has(hash)) setActiveTab(hash);
    else setActiveTab("tenants");
  }, [pathname]);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingTenantAdmin, setEditingTenantAdmin] = useState<TenantAdmin | null>(null);
  const [showEditUserDialog, setShowEditUserDialog] = useState(false);
  const [isHealthCheckLoading, setIsHealthCheckLoading] = useState(false);
  const [isMaintenanceRemindersLoading, setIsMaintenanceRemindersLoading] = useState(false);
  const [isOverdueRemindersLoading, setIsOverdueRemindersLoading] = useState(false);
  const [newTenant, setNewTenant] = useState<CreateTenantForm>({
    name: "",
    description: "",
    contactEmail: "",
    contactPhone: "",
    address: "",
    planType: "basic",
    adminEmail: "",
    adminFirstName: "",
    adminLastName: ""
  });

  // Feedback management state
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackItem | null>(null);
  const [feedbackFilterStatus, setFeedbackFilterStatus] = useState<string>("all");

  // Check if user is super admin
  const isSuperAdmin = user?.role === 'super_admin' && !user?.tenantId;

  // Redirect to unauthorized if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      window.location.href = "/unauthorized";
      return;
    }
  }, [authLoading, isAuthenticated]);

  // Fetch all tenants
  const { data: tenants = [], isLoading: tenantsLoading, error: tenantsError } = useQuery<Tenant[]>({
    queryKey: ["/api/super-admin/tenants"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/super-admin/tenants");
      return response.json();
    },
    enabled: isSuperAdmin && !authLoading,
  });

  // Fetch all tenant admins
  const { data: tenantAdmins = [], isLoading: adminsLoading, error: adminsError } = useQuery<TenantAdmin[]>({
    queryKey: ["/api/super-admin/tenant-admins"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/super-admin/tenant-admins");
      return response.json();
    },
    enabled: isSuperAdmin && !authLoading,
  });

  // Fetch all users grouped by tenant
  const { data: usersGroupedByTenant = [], isLoading: usersLoading } = useQuery<Array<{ tenant: Tenant; users: User[] }>>({
    queryKey: ["/api/super-admin/users"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/super-admin/users");
      return response.json();
    },
    enabled: isSuperAdmin && !authLoading,
  });

  // Fetch all system feedback (global)
  const { data: feedbackItems = [], isLoading: feedbackLoading, error: feedbackError, refetch: refetchFeedback } = useQuery<FeedbackItem[]>({
    queryKey: ["/api/super-admin/feedback"],
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", "/api/super-admin/feedback");
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error("[SuperAdmin] Error fetching feedback:", error);
        return [];
      }
    },
    enabled: isSuperAdmin && !authLoading,
  });

  const updateFeedbackMutation = useMutation({
    mutationFn: async (payload: { id: string; status?: string; adminNote?: string }) => {
      const response = await apiRequest("PATCH", `/api/super-admin/feedback/${payload.id}`, {
        status: payload.status,
        adminNote: payload.adminNote,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/feedback"] });
      toast({
        title: "Feedback updated",
        description: "Feedback status and notes have been saved.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to update feedback",
        variant: "destructive",
      });
    },
  });

  // Create tenant mutation
  const createTenantMutation = useMutation({
    mutationFn: async (tenantData: CreateTenantForm) => {
      const response = await apiRequest("POST", "/api/super-admin/create-tenant", tenantData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/tenants"] });
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/tenant-admins"] });
      setIsCreateTenantOpen(false);
      setNewTenant({
        name: "",
        description: "",
        contactEmail: "",
        contactPhone: "",
        address: "",
        planType: "basic",
        adminEmail: "",
        adminFirstName: "",
        adminLastName: ""
      });
      toast({
        title: "Success",
        description: "Tenant and admin created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create tenant",
        variant: "destructive",
      });
    },
  });

  // Update tenant status mutation
  const updateTenantStatusMutation = useMutation({
    mutationFn: async ({ tenantId, status }: { tenantId: string; status: string }) => {
      const response = await apiRequest("POST", `/api/super-admin/tenants/${tenantId}/status`, { status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/tenants"] });
      toast({
        title: "Success",
        description: "Tenant status updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update tenant status",
        variant: "destructive",
      });
    },
  });

  // Update tenant plan mutation
  const updateTenantPlanMutation = useMutation({
    mutationFn: async ({ tenantId, planType }: { tenantId: string; planType: string }) => {
      const response = await apiRequest("POST", `/api/super-admin/tenants/${tenantId}/plan`, { planType });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/tenants"] });
      toast({
        title: "Success",
        description: "Tenant plan updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update tenant plan",
        variant: "destructive",
      });
    },
  });

  // Approve tenant admin mutation
  const approveTenantAdminMutation = useMutation({
    mutationFn: async (adminId: string) => {
      const response = await apiRequest("POST", `/api/super-admin/approve-admin/${adminId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/tenant-admins"] });
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/users"] });
      toast({
        title: "Success",
        description: "Admin approved successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to approve admin",
        variant: "destructive",
      });
    },
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, updates }: { userId: string; updates: Partial<User> }) => {
      const response = await apiRequest("PATCH", `/api/super-admin/users/${userId}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/tenant-admins"] });
      setShowEditUserDialog(false);
      setEditingUser(null);
      toast({
        title: "Success",
        description: "User updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update user",
        variant: "destructive",
      });
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await apiRequest("DELETE", `/api/super-admin/users/${userId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/tenant-admins"] });
      toast({
        title: "Success",
        description: "User deleted successfully",
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

  const startImpersonationMutation = useMutation({
    mutationFn: async (targetUserId: string) => {
      const response = await apiRequest("POST", "/api/super-admin/impersonation/start", { targetUserId });
      return response.json() as Promise<{ redirectTo?: string }>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Impersonation started",
        description: "Opening the tenant app in support mode…",
      });
      window.location.href = data.redirectTo || "/dashboard";
    },
    onError: (error: Error) => {
      toast({
        title: "Could not start impersonation",
        description: error.message || "Request failed",
        variant: "destructive",
      });
    },
  });

  // Update tenant admin mutation
  const updateTenantAdminMutation = useMutation({
    mutationFn: async ({ adminId, updates }: { adminId: string; updates: Partial<TenantAdmin> }) => {
      const response = await apiRequest("PATCH", `/api/super-admin/tenant-admins/${adminId}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/tenant-admins"] });
      setEditingTenantAdmin(null);
      toast({
        title: "Success",
        description: "Tenant administrator updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update admin",
        variant: "destructive",
      });
    },
  });

  // Delete tenant admin mutation
  const deleteTenantAdminMutation = useMutation({
    mutationFn: async (adminId: string) => {
      const response = await apiRequest("DELETE", `/api/super-admin/tenant-admins/${adminId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/tenant-admins"] });
      toast({
        title: "Success",
        description: "Tenant administrator deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete admin",
        variant: "destructive",
      });
    },
  });

  // Filter tenants based on search and status
  const filteredTenants = tenants.filter(tenant => {
    const matchesSearch = tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tenant.contactEmail.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || tenant.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Filter tenant admins based on search
  const filteredAdmins = tenantAdmins.filter(admin => 
    admin.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    admin.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    admin.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    admin.tenantName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateTenant = () => {
    createTenantMutation.mutate(newTenant);
  };

  const handleUpdateTenantStatus = (tenantId: string, status: string) => {
    updateTenantStatusMutation.mutate({ tenantId, status });
  };

  const handleUpdateTenantPlan = (tenantId: string, planType: string) => {
    updateTenantPlanMutation.mutate({ tenantId, planType });
  };

  const handleApproveAdmin = (adminId: string) => {
    approveTenantAdminMutation.mutate(adminId);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setShowEditUserDialog(true);
  };

  const handleUpdateUser = () => {
    if (!editingUser) return;
    updateUserMutation.mutate({
      userId: editingUser.id,
      updates: {
        firstName: editingUser.firstName,
        lastName: editingUser.lastName,
        email: editingUser.email,
        role: editingUser.role,
        status: editingUser.status
      }
    });
  };

  const handleDeleteUser = (userId: string) => {
    if (confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      deleteUserMutation.mutate(userId);
    }
  };

  const handleDeleteTenantAdmin = (adminId: string) => {
    if (confirm('Are you sure you want to delete this tenant administrator? This action cannot be undone.')) {
      deleteTenantAdminMutation.mutate(adminId);
    }
  };

  const handleUpdateTenantAdmin = () => {
    if (!editingTenantAdmin) return;
    updateTenantAdminMutation.mutate({
      adminId: editingTenantAdmin.id,
      updates: {
        firstName: editingTenantAdmin.firstName,
        lastName: editingTenantAdmin.lastName,
        email: editingTenantAdmin.email,
        status: editingTenantAdmin.status
      }
    });
  };

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <div className="space-y-6 p-4 sm:p-6 pb-20 md:pb-8 bg-uventorybiz-light-gray min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-uventorybiz-navy mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  // Show unauthorized page if not authenticated
  if (!isAuthenticated) {
    return <Unauthorized />;
  }

  // Show access denied page if not super admin
  if (!isSuperAdmin) {
    return (
      <AccessDenied
        title="Super Admin Access Required"
        message="This page is restricted to platform administrators. Only users with the 'super_admin' role and no tenant association can access this page."
        requiredRole="Super Admin"
        currentRole={user?.role || undefined}
      />
    );
  }

  const totalTenants = tenants.length;
  const activeTenants = tenants.filter((t) => t.status === "active").length;
  const totalUsers = tenants.reduce((sum, tenant) => sum + tenant.userCount, 0);
  const totalAdmins = tenantAdmins.filter((admin) => admin.role === "admin").length;

  return (
    <div className="space-y-6 p-4 sm:p-6 pb-20 md:pb-8 bg-uventorybiz-light-gray">
      <div className="mb-2 flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2 md:text-2xl">
              <Shield className="h-7 w-7 text-blue-600 shrink-0" />
              Super admin console
            </h1>
            <Badge variant="outline" className="text-xs bg-blue-100 text-blue-600 border-blue-200">
              v{APP_VERSION}
            </Badge>
          </div>
          {activeTab === "tenants" && (
            <Button
              className="bg-uventorybiz-navy hover:bg-uventorybiz-navy-100 text-white shrink-0"
              onClick={() => setIsCreateTenantOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create New Tenant
            </Button>
          )}
        </div>

      <Dialog open={isCreateTenantOpen} onOpenChange={setIsCreateTenantOpen}>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create New Tenant</DialogTitle>
                  <DialogDescription>
                    Create a new tenant organization with an admin user
                  </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                  <div className="space-y-4 col-span-2">
                    <h3 className="font-semibold text-lg">Organization Details</h3>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name">Organization Name</Label>
                    <Input
                      id="name"
                      value={newTenant.name}
                      onChange={(e) => setNewTenant({ ...newTenant, name: e.target.value })}
                      placeholder="Business Site Alpha"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="planType">Plan Type</Label>
                    <Select value={newTenant.planType} onValueChange={(value) => setNewTenant({ ...newTenant, planType: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="basic">Basic</SelectItem>
                        <SelectItem value="premium">Premium</SelectItem>
                        <SelectItem value="enterprise">Enterprise</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      value={newTenant.description}
                      onChange={(e) => setNewTenant({ ...newTenant, description: e.target.value })}
                      placeholder="Multi-location retail business"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contactEmail">Contact Email</Label>
                    <Input
                      id="contactEmail"
                      type="email"
                      value={newTenant.contactEmail}
                      onChange={(e) => setNewTenant({ ...newTenant, contactEmail: e.target.value })}
                      placeholder="contact@company.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contactPhone">Contact Phone</Label>
                    <Input
                      id="contactPhone"
                      value={newTenant.contactPhone}
                      onChange={(e) => setNewTenant({ ...newTenant, contactPhone: e.target.value })}
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      value={newTenant.address}
                      onChange={(e) => setNewTenant({ ...newTenant, address: e.target.value })}
                      placeholder="123 Commerce Road, Accra, Ghana"
                    />
                  </div>
                  <div className="space-y-4 col-span-2 mt-6">
                    <h3 className="font-semibold text-lg">Admin User Details</h3>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="adminFirstName">Admin First Name</Label>
                    <Input
                      id="adminFirstName"
                      value={newTenant.adminFirstName}
                      onChange={(e) => setNewTenant({ ...newTenant, adminFirstName: e.target.value })}
                      placeholder="John"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="adminLastName">Admin Last Name</Label>
                    <Input
                      id="adminLastName"
                      value={newTenant.adminLastName}
                      onChange={(e) => setNewTenant({ ...newTenant, adminLastName: e.target.value })}
                      placeholder="Smith"
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="adminEmail">Admin Email</Label>
                    <Input
                      id="adminEmail"
                      type="email"
                      value={newTenant.adminEmail}
                      onChange={(e) => setNewTenant({ ...newTenant, adminEmail: e.target.value })}
                      placeholder="admin@company.com"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button 
                    type="submit" 
                    onClick={handleCreateTenant}
                    disabled={createTenantMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {createTenantMutation.isPending ? "Creating..." : "Create Tenant & Admin"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-[#142F5C] to-[#1a3d6b] border-0 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
              <CardTitle className="text-sm font-medium text-white/90">Total Tenants</CardTitle>
              <div className="bg-white/20 p-2 rounded-lg">
                <Building2 className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-3xl font-bold text-white mb-1">
                {tenantsLoading ? "—" : totalTenants}
              </div>
              <p className="text-xs text-white/70">{activeTenants} active</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-[#EAF6FF] to-white border-2 border-[#142F5C]/20 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#142F5C]/5 rounded-full -mr-16 -mt-16"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <div className="bg-[#142F5C]/10 p-2 rounded-lg">
                <Users className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-3xl font-bold mb-1">{tenantsLoading ? "—" : totalUsers}</div>
              <p className="text-xs">Across all tenants</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-[#142F5C] to-[#1a3d6b] border-0 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
              <CardTitle className="text-sm font-medium text-white/90">Tenant Admins</CardTitle>
              <div className="bg-white/20 p-2 rounded-lg">
                <Shield className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-3xl font-bold text-white mb-1">
                {adminsLoading ? "—" : totalAdmins}
              </div>
              <p className="text-xs text-white/70">Administrative users</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-[#EAF6FF] to-white border-2 border-[#142F5C]/20 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#142F5C]/5 rounded-full -mr-16 -mt-16"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
              <CardTitle className="text-sm font-medium text-[#142F5C]">System Status</CardTitle>
              <div className="bg-[#142F5C]/10 p-2 rounded-lg">
                <Activity className="h-5 w-5 text-[#142F5C]" />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-3xl font-bold mb-1 flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                Healthy
              </div>
              <p className="text-xs text-[#142F5C]/70">All systems operational</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={(value) => {
            setActiveTab(value);
            replaceSuperAdminHash(value);
            syncSuperAdminSidebarHash(value);
          }}
          className="space-y-6"
        >
          <div className="tabs-list-custom mb-6">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 bg-transparent h-auto p-1 gap-1 lg:gap-2">
              <TabsTrigger value="tenants" className="tab-trigger-custom flex items-center justify-center gap-2 text-xs sm:text-sm">
                <Building2 className="h-4 w-4" />
                <span className="hidden sm:inline">Tenant Organizations</span>
                <span className="sm:hidden">Tenants</span>
              </TabsTrigger>
              <TabsTrigger value="admins" className="tab-trigger-custom flex items-center justify-center gap-2 text-xs sm:text-sm">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Tenant Administrators</span>
                <span className="sm:hidden">Admins</span>
              </TabsTrigger>
              <TabsTrigger value="users" className="tab-trigger-custom flex items-center justify-center gap-2 text-xs sm:text-sm">
                <UserPlus className="h-4 w-4" />
                <span className="hidden sm:inline">All Users</span>
                <span className="sm:hidden">Users</span>
              </TabsTrigger>
              <TabsTrigger value="api-testing" className="tab-trigger-custom flex items-center justify-center gap-2 text-xs sm:text-sm">
                <PlayCircle className="h-4 w-4" />
                <span className="hidden sm:inline">API Testing</span>
                <span className="sm:hidden">API</span>
              </TabsTrigger>
              <TabsTrigger value="feedback" className="tab-trigger-custom flex items-center justify-center gap-2 text-xs sm:text-sm">
                <MessageCircle className="h-4 w-4" />
                <span className="hidden sm:inline">Feedback</span>
                <span className="sm:hidden">FB</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {(activeTab === "tenants" || activeTab === "admins") && (
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search tenants or admins..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              {activeTab === "tenants" && (
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {/* Tenants Tab */}
          <TabsContent value="tenants" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Tenant Organizations</CardTitle>
                <CardDescription>
                  Manage all tenant organizations and their configurations
                </CardDescription>
              </CardHeader>
              <CardContent>
                {tenantsLoading ? (
                  <div className="text-center py-8">Loading tenants...</div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Organization</TableHead>
                          <TableHead className="hidden md:table-cell">Contact</TableHead>
                          <TableHead className="hidden lg:table-cell">Plan</TableHead>
                          <TableHead>Users</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredTenants.map((tenant) => (
                          <TableRow key={tenant.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{tenant.name}</div>
                                <div className="text-sm text-gray-500 truncate max-w-40">
                                  {tenant.description}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              <div className="text-sm">
                                <div>{tenant.contactEmail}</div>
                                <div className="text-gray-500">{tenant.contactPhone}</div>
                              </div>
                            </TableCell>
                            <TableCell className="hidden lg:table-cell">
                              <Badge variant={tenant.planType === "enterprise" ? "default" : "secondary"}>
                                {tenant.planType}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Users className="h-4 w-4 text-gray-400" />
                                {tenant.userCount}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant={
                                  tenant.status === "active" ? "default" :
                                  tenant.status === "suspended" ? "destructive" : "secondary"
                                }
                              >
                                {tenant.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Select
                                  value={tenant.status}
                                  onValueChange={(status) => handleUpdateTenantStatus(tenant.id, status)}
                                >
                                  <SelectTrigger className="w-auto h-8 text-xs" data-testid={`select-status-${tenant.id}`}>
                                    <Settings className="h-3 w-3" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="suspended">Suspended</SelectItem>
                                    <SelectItem value="inactive">Inactive</SelectItem>
                                  </SelectContent>
                                </Select>
                                <Select
                                  value={tenant.planType}
                                  onValueChange={(planType) => handleUpdateTenantPlan(tenant.id, planType)}
                                >
                                  <SelectTrigger className="w-auto h-8 text-xs" data-testid={`select-plan-${tenant.id}`}>
                                    <BarChart3 className="h-3 w-3" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="basic">Basic</SelectItem>
                                    <SelectItem value="premium">Premium</SelectItem>
                                    <SelectItem value="enterprise">Enterprise</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Admins Tab */}
          <TabsContent value="admins" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Tenant Administrators</CardTitle>
                <CardDescription>
                  View and manage administrators across all tenant organizations
                </CardDescription>
              </CardHeader>
              <CardContent>
                {adminsLoading ? (
                  <div className="text-center py-8">Loading administrators...</div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Administrator</TableHead>
                          <TableHead className="hidden md:table-cell">Email</TableHead>
                          <TableHead className="hidden md:table-cell">Phone</TableHead>
                          <TableHead className="hidden lg:table-cell">Organization</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead className="hidden lg:table-cell">Last Login</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredAdmins.map((admin) => (
                          <TableRow key={admin.id}>
                            <TableCell>
                              <div className="font-medium">
                                {admin.firstName} {admin.lastName}
                              </div>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              {admin.email}
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              {admin.phoneNumber || "Not provided"}
                            </TableCell>
                            <TableCell className="hidden lg:table-cell">
                              <div className="flex items-center gap-1">
                                <Building2 className="h-4 w-4 text-gray-400" />
                                {admin.tenantName}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="default">
                                {admin.role}
                              </Badge>
                            </TableCell>
                            <TableCell className="hidden lg:table-cell">
                              <div className="text-sm text-gray-500">
                                {admin.lastLoginAt ? 
                                  new Date(admin.lastLoginAt).toLocaleDateString() : 
                                  "Never"
                                }
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Badge 
                                  variant={
                                    admin.status === "active" ? "default" :
                                    admin.status === "pending" ? "secondary" :
                                    admin.status === "suspended" ? "destructive" : "secondary"
                                  }
                                >
                                  {admin.status}
                                </Badge>
                                {admin.status === "pending" && (
                                  <Button
                                    size="sm"
                                    onClick={() => handleApproveAdmin(admin.id)}
                                    disabled={approveTenantAdminMutation.isPending}
                                    className="bg-green-600 hover:bg-green-700 text-white"
                                  >
                                    Approve
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setEditingTenantAdmin(admin)}
                                  data-testid={`button-edit-admin-${admin.id}`}
                                >
                                  <Pencil className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleDeleteTenantAdmin(admin.id)}
                                  data-testid={`button-delete-admin-${admin.id}`}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>All Users by Tenant</CardTitle>
                <CardDescription>
                  View all users in the system grouped by their tenant organization
                </CardDescription>
              </CardHeader>
              <CardContent>
                {usersLoading ? (
                  <div className="text-center py-8">Loading users...</div>
                ) : usersGroupedByTenant.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">No users found</div>
                ) : (
                  <div className="space-y-6">
                    {usersGroupedByTenant.map(({ tenant, users }) => (
                      <div key={tenant.id} className="border rounded-lg p-4 space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-lg font-semibold">{tenant.name}</h3>
                            <p className="text-sm text-gray-600">{users.length} users</p>
                          </div>
                          <Badge variant={tenant.status === "active" ? "default" : "secondary"}>
                            {tenant.status}
                          </Badge>
                        </div>
                        
                        {users.length > 0 ? (
                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>User</TableHead>
                                  <TableHead>Role</TableHead>
                                  <TableHead>Status</TableHead>
                                  <TableHead>Last Login</TableHead>
                                  <TableHead>Actions</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {users.map((user) => (
                                  <TableRow key={user.id}>
                                    <TableCell>
                                      <div className="flex items-center space-x-3">
                                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                          <span className="text-sm font-medium text-blue-600">
                                            {user.firstName?.[0]}{user.lastName?.[0]}
                                          </span>
                                        </div>
                                        <div>
                                          <div className="font-medium">
                                            {user.firstName} {user.lastName}
                                          </div>
                                          <div className="text-sm text-gray-500">
                                            {user.email}
                                          </div>
                                        </div>
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <Badge variant="outline">
                                        {user.role}
                                      </Badge>
                                    </TableCell>
                                    <TableCell>
                                      <Badge 
                                        variant={
                                          user.status === "active" ? "default" :
                                          user.status === "pending" ? "secondary" : "destructive"
                                        }
                                      >
                                        {user.status}
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="text-sm text-gray-500">
                                      {user.lastLoginAt 
                                        ? new Date(user.lastLoginAt).toLocaleDateString()
                                        : "Never"
                                      }
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex items-center space-x-2">
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => startImpersonationMutation.mutate(user.id)}
                                          disabled={user.status !== "active" || startImpersonationMutation.isPending}
                                          title="View the app as this user (fully audited)"
                                          className="h-8 w-8 p-0"
                                          data-testid={`button-impersonate-${user.id}`}
                                        >
                                          <UserRound className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => handleEditUser(user)}
                                          className="h-8 w-8 p-0"
                                        >
                                          <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => handleDeleteUser(user.id)}
                                          disabled={deleteUserMutation.isPending}
                                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        ) : (
                          <p className="text-gray-500 text-center py-4">No users in this tenant</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* API Testing Tab */}
          <TabsContent value="api-testing" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>API Endpoint Testing</CardTitle>
                <CardDescription>
                  Test API endpoints by clicking buttons. Useful for testing cron jobs and other automated tasks.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Equipment Health Check */}
                <div className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Activity className="h-5 w-5 text-blue-600" />
                        Equipment Health Check
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Trigger a manual equipment health check for all tenants. This generates weekly health reports.
                      </p>
                    </div>
                    <Button
                      onClick={async () => {
                        setIsHealthCheckLoading(true);
                        try {
                          const response = await apiRequest("GET", "/api/admin/equipment/trigger-health-check");
                          // apiRequest throws if response is not OK, so we can safely parse JSON
                          const result = await response.json();
                          toast({
                            title: "Success",
                            description: result.message || "Health check triggered successfully",
                          });
                        } catch (error: any) {
                          // Extract error message from apiRequest error format (status: message)
                          let errorMessage = error.message || "Failed to trigger health check";
                          if (errorMessage.includes(":")) {
                            const parts = errorMessage.split(":");
                            if (parts.length > 1) {
                              errorMessage = parts.slice(1).join(":").trim();
                            }
                          }
                          toast({
                            title: "Error",
                            description: errorMessage,
                            variant: "destructive",
                          });
                        } finally {
                          setIsHealthCheckLoading(false);
                        }
                      }}
                      disabled={isHealthCheckLoading}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {isHealthCheckLoading ? (
                        <>
                          <Clock className="h-4 w-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <PlayCircle className="h-4 w-4 mr-2" />
                          Trigger Health Check
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Upcoming Maintenance Reminders */}
                <div className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Settings className="h-5 w-5 text-orange-600" />
                        Upcoming Maintenance Reminders
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Trigger a manual check for upcoming maintenance. This sends bulk notifications for equipment maintenance due in 30 or 7 days.
                      </p>
                    </div>
                    <Button
                      onClick={async () => {
                        setIsMaintenanceRemindersLoading(true);
                        try {
                          const response = await apiRequest("GET", "/api/admin/equipment/trigger-maintenance-reminders");
                          // apiRequest throws if response is not OK, so we can safely parse JSON
                          const result = await response.json();
                          toast({
                            title: "Success",
                            description: result.message || "Upcoming maintenance reminder check triggered successfully",
                          });
                        } catch (error: any) {
                          // Extract error message from apiRequest error format (status: message)
                          let errorMessage = error.message || "Failed to trigger maintenance reminders";
                          if (errorMessage.includes(":")) {
                            const parts = errorMessage.split(":");
                            if (parts.length > 1) {
                              errorMessage = parts.slice(1).join(":").trim();
                            }
                          }
                          toast({
                            title: "Error",
                            description: errorMessage,
                            variant: "destructive",
                          });
                        } finally {
                          setIsMaintenanceRemindersLoading(false);
                        }
                      }}
                      disabled={isMaintenanceRemindersLoading}
                      className="bg-orange-600 hover:bg-orange-700"
                    >
                      {isMaintenanceRemindersLoading ? (
                        <>
                          <Clock className="h-4 w-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <PlayCircle className="h-4 w-4 mr-2" />
                          Trigger Upcoming Reminders
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Overdue Maintenance Reminders */}
                <div className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                        Overdue Maintenance Reminders
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Trigger a manual check for overdue maintenance. This sends bulk notifications for equipment with maintenance that is past due.
                      </p>
                    </div>
                    <Button
                      onClick={async () => {
                        setIsOverdueRemindersLoading(true);
                        try {
                          const response = await apiRequest("GET", "/api/admin/equipment/trigger-overdue-maintenance-reminders");
                          // apiRequest throws if response is not OK, so we can safely parse JSON
                          const result = await response.json();
                          toast({
                            title: "Success",
                            description: result.message || "Overdue maintenance reminder check triggered successfully",
                          });
                        } catch (error: any) {
                          // Extract error message from apiRequest error format (status: message)
                          let errorMessage = error.message || "Failed to trigger overdue maintenance reminders";
                          if (errorMessage.includes(":")) {
                            const parts = errorMessage.split(":");
                            if (parts.length > 1) {
                              errorMessage = parts.slice(1).join(":").trim();
                            }
                          }
                          toast({
                            title: "Error",
                            description: errorMessage,
                            variant: "destructive",
                          });
                        } finally {
                          setIsOverdueRemindersLoading(false);
                        }
                      }}
                      disabled={isOverdueRemindersLoading}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      {isOverdueRemindersLoading ? (
                        <>
                          <Clock className="h-4 w-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <PlayCircle className="h-4 w-4 mr-2" />
                          Trigger Overdue Reminders
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Info Box */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">About Cron Jobs</h4>
                      <p className="text-sm text-blue-800 dark:text-blue-200 mb-2">
                        Automated cron jobs are scheduled to run:
                      </p>
                      <ul className="list-disc list-inside mt-2 space-y-1 text-sm text-blue-800 dark:text-blue-200 mb-2">
                        <li>Weekly health check: Every Monday at 8:00 AM (server local timezone)</li>
                        <li>Maintenance reminders: Every day at 6:00 AM (server local timezone)</li>
                      </ul>
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                        Use the buttons above to trigger these tasks manually for testing purposes.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Feedback Tab */}
          <TabsContent value="feedback" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>System Feedback</CardTitle>
                <CardDescription>
                  View and manage user feedback about uventorybiz across all tenants.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {feedbackLoading && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading feedback...
                  </div>
                )}
                {feedbackError && (
                  <div className="text-sm text-red-600">
                    Failed to load feedback. Please try again later.
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
                  <div className="space-y-1">
                    <p className="text-sm text-gray-700">
                      Total feedback: <span className="font-semibold">{feedbackItems.length}</span>
                    </p>
                    <p className="text-xs text-gray-500">
                      New: {feedbackItems.filter(f => f.status === "new").length} • In review: {feedbackItems.filter(f => f.status === "in_review").length} • Resolved: {feedbackItems.filter(f => f.status === "resolved").length}
                    </p>
                  </div>
                  <Select value={feedbackFilterStatus} onValueChange={setFeedbackFilterStatus}>
                    <SelectTrigger className="w-full sm:w-48">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="in_review">In Review</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="dismissed">Dismissed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[140px]">Created</TableHead>
                        <TableHead>Path / Context</TableHead>
                        <TableHead className="w-[140px]">Scores</TableHead>
                        <TableHead className="w-[140px]">User / Tenant</TableHead>
                        <TableHead className="w-[140px]">Status</TableHead>
                        <TableHead className="w-[80px]" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {feedbackItems
                        .filter((item) => feedbackFilterStatus === "all" || item.status === feedbackFilterStatus)
                        .map((item) => (
                          <TableRow
                            key={item.id}
                            className={selectedFeedback?.id === item.id ? "bg-muted/40" : ""}
                          >
                            <TableCell className="align-top text-xs text-gray-600">
                              {new Date(item.createdAt).toLocaleString()}
                            </TableCell>
                            <TableCell className="align-top text-xs">
                              <div className="font-medium text-gray-800">{item.path}</div>
                              {item.context && (
                                <div className="text-gray-500 truncate max-w-[260px]">
                                  {item.context}
                                </div>
                              )}
                              {item.areasUsed && Array.isArray(item.areasUsed) && item.areasUsed.length > 0 && (
                                <div className="mt-1 flex flex-wrap gap-1">
                                  {item.areasUsed.map((area) => (
                                    <Badge key={area} variant="outline" className="text-[10px] py-0 px-1.5">
                                      {area}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="align-top text-[11px] text-gray-700">
                              <div>UX: {item.uxRating ?? "-"}</div>
                              <div>UI: {item.uiRating ?? "-"}</div>
                              <div>Nav: {item.navigationRating ?? "-"}</div>
                              <div>Speed: {item.speedRating ?? "-"}</div>
                              <div>Stability: {item.reliabilityRating ?? "-"}</div>
                              <div className="mt-1 text-[10px] text-gray-500">
                                NPS: {item.npsScore ?? "-"}
                              </div>
                            </TableCell>
                            <TableCell className="align-top text-xs text-gray-700">
                              <div>{item.userEmail || "Anonymous"}</div>
                              {item.tenantName && (
                                <div className="text-[11px] text-gray-500">
                                  {item.tenantName}
                                </div>
                              )}
                              {item.contactEmail && (
                                <div className="mt-1 text-[11px] text-blue-600 truncate max-w-[160px]">
                                  {item.contactEmail}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="align-top text-xs">
                              <Badge
                                className={
                                  item.status === "new"
                                    ? "bg-blue-50 text-blue-700 border-blue-200"
                                    : item.status === "in_review"
                                    ? "bg-amber-50 text-amber-700 border-amber-200"
                                    : item.status === "resolved"
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : "bg-gray-100 text-gray-700 border-gray-200"
                                }
                              >
                                {item.status.replace(/_/g, " ")}
                              </Badge>
                            </TableCell>
                            <TableCell className="align-top text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedFeedback(item)}
                                className="h-7 px-2 text-xs"
                              >
                                View
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      {!feedbackLoading && feedbackItems.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-sm text-gray-500">
                            No feedback has been submitted yet.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                {selectedFeedback && (
                  <div className="mt-6 border-t pt-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MessageCircle className="h-4 w-4 text-gray-600" />
                        <h3 className="text-sm font-semibold text-gray-800">
                          Feedback details
                        </h3>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-gray-500"
                        onClick={() => setSelectedFeedback(null)}
                      >
                        Close
                      </Button>
                    </div>

                    {selectedFeedback.comment && (
                      <div className="text-sm text-gray-800 bg-gray-50 border border-gray-200 rounded-md p-3 whitespace-pre-wrap">
                        {selectedFeedback.comment}
                      </div>
                    )}

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Status</Label>
                        <Select
                          value={selectedFeedback.status}
                          onValueChange={(value) => {
                            setSelectedFeedback((prev) =>
                              prev ? { ...prev, status: value } : prev
                            );
                          }}
                        >
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="new">New</SelectItem>
                            <SelectItem value="in_review">In Review</SelectItem>
                            <SelectItem value="resolved">Resolved</SelectItem>
                            <SelectItem value="dismissed">Dismissed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Contact email (user provided)</Label>
                        <Input
                          value={selectedFeedback.contactEmail || ""}
                          readOnly
                          className="h-9 text-xs bg-gray-50"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Admin notes</Label>
                      <Textarea
                        className="min-h-[80px] text-xs"
                        value={selectedFeedback.adminNote || ""}
                        onChange={(e) =>
                          setSelectedFeedback((prev) =>
                            prev ? { ...prev, adminNote: e.target.value } : prev
                          )
                        }
                        placeholder="Summarize key issues, decisions, or follow-up actions."
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-3 text-xs"
                        onClick={() => setSelectedFeedback(null)}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        className="h-8 px-3 text-xs"
                        disabled={updateFeedbackMutation.isPending}
                        onClick={() => {
                          if (!selectedFeedback) return;
                          updateFeedbackMutation.mutate({
                            id: selectedFeedback.id,
                            status: selectedFeedback.status,
                            adminNote: selectedFeedback.adminNote || "",
                          });
                        }}
                      >
                        {updateFeedbackMutation.isPending ? "Saving..." : "Save changes"}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Edit User Dialog */}
        <Dialog open={showEditUserDialog} onOpenChange={setShowEditUserDialog}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
              <DialogDescription>
                Update user information and permissions
              </DialogDescription>
            </DialogHeader>
            {editingUser && (
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="firstName" className="text-right">
                    First Name
                  </Label>
                  <Input
                    id="firstName"
                    value={editingUser.firstName}
                    onChange={(e) => setEditingUser({...editingUser, firstName: e.target.value})}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="lastName" className="text-right">
                    Last Name
                  </Label>
                  <Input
                    id="lastName"
                    value={editingUser.lastName}
                    onChange={(e) => setEditingUser({...editingUser, lastName: e.target.value})}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="email" className="text-right">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={editingUser.email}
                    onChange={(e) => setEditingUser({...editingUser, email: e.target.value})}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="role" className="text-right">
                    Role
                  </Label>
                  <Select
                    value={editingUser.role}
                    onValueChange={(value) => setEditingUser({...editingUser, role: value})}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="fleet_operator">Fleet operator</SelectItem>
                      <SelectItem value="staff">Staff</SelectItem>
                      <SelectItem value="operations">Operations</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="status" className="text-right">
                    Status
                  </Label>
                  <Select
                    value={editingUser.status}
                    onValueChange={(value) => setEditingUser({...editingUser, status: value})}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button type="submit" onClick={handleUpdateUser} disabled={updateUserMutation.isPending}>
                {updateUserMutation.isPending ? "Updating..." : "Update User"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Tenant Admin Dialog */}
        <Dialog open={!!editingTenantAdmin} onOpenChange={(open) => !open && setEditingTenantAdmin(null)}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Edit Tenant Administrator</DialogTitle>
              <DialogDescription>
                Update the tenant administrator's information and permissions.
              </DialogDescription>
            </DialogHeader>
            {editingTenantAdmin && (
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="adminFirstName" className="text-right">
                    First Name
                  </Label>
                  <Input
                    id="adminFirstName"
                    value={editingTenantAdmin.firstName}
                    onChange={(e) => setEditingTenantAdmin({ ...editingTenantAdmin, firstName: e.target.value })}
                    className="col-span-3"
                    data-testid="input-admin-first-name"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="adminLastName" className="text-right">
                    Last Name
                  </Label>
                  <Input
                    id="adminLastName"
                    value={editingTenantAdmin.lastName}
                    onChange={(e) => setEditingTenantAdmin({ ...editingTenantAdmin, lastName: e.target.value })}
                    className="col-span-3"
                    data-testid="input-admin-last-name"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="adminEmail" className="text-right">
                    Email
                  </Label>
                  <Input
                    id="adminEmail"
                    type="email"
                    value={editingTenantAdmin.email}
                    onChange={(e) => setEditingTenantAdmin({ ...editingTenantAdmin, email: e.target.value })}
                    className="col-span-3"
                    data-testid="input-admin-email"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="adminStatus" className="text-right">
                    Status
                  </Label>
                  <Select 
                    value={editingTenantAdmin.status} 
                    onValueChange={(status) => setEditingTenantAdmin({ ...editingTenantAdmin, status })}
                  >
                    <SelectTrigger className="col-span-3" data-testid="select-admin-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                      <SelectItem value="blocked">Blocked</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button 
                type="submit" 
                onClick={handleUpdateTenantAdmin}
                disabled={updateTenantAdminMutation.isPending}
                data-testid="button-save-admin"
              >
                {updateTenantAdminMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
    </div>
  );
}
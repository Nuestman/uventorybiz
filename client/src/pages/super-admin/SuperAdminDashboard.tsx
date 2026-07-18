import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { APP_VERSION } from "@/lib/appVersion";
import { useAuth } from "@/hooks/useAuth";
import AccessDenied from "@/pages/access-denied";
import Unauthorized from "@/pages/unauthorized";
import SuperAdminSystemDashboard from "./SuperAdminSystemDashboard";

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

interface TenantAdmin {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
  tenantId: string;
  tenantName: string;
}

interface FeedbackItem {
  id: string;
  status: string;
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

export default function SuperAdminDashboard() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateTenantOpen, setIsCreateTenantOpen] = useState(false);
  const [newTenant, setNewTenant] = useState<CreateTenantForm>({
    name: "",
    description: "",
    contactEmail: "",
    contactPhone: "",
    address: "",
    planType: "basic",
    adminEmail: "",
    adminFirstName: "",
    adminLastName: "",
  });

  const isSuperAdmin = user?.role === "super_admin" && !user?.tenantId;

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      window.location.href = "/unauthorized";
    }
  }, [authLoading, isAuthenticated]);

  const { data: tenants = [], isLoading: tenantsLoading } = useQuery<Tenant[]>({
    queryKey: ["/api/super-admin/tenants"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/super-admin/tenants");
      return response.json();
    },
    enabled: isSuperAdmin && !authLoading,
  });

  const { data: tenantAdmins = [] } = useQuery<TenantAdmin[]>({
    queryKey: ["/api/super-admin/tenant-admins"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/super-admin/tenant-admins");
      return response.json();
    },
    enabled: isSuperAdmin && !authLoading,
  });

  const { data: feedbackItems = [] } = useQuery<FeedbackItem[]>({
    queryKey: ["/api/super-admin/feedback"],
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", "/api/super-admin/feedback");
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      } catch {
        return [];
      }
    },
    enabled: isSuperAdmin && !authLoading,
  });

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
        adminLastName: "",
      });
      toast({
        title: "Success",
        description: "Tenant and admin created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create tenant",
        variant: "destructive",
      });
    },
  });

  const handleCreateTenant = () => {
    createTenantMutation.mutate(newTenant);
  };

  const totalTenants = tenants.length;
  const activeTenants = tenants.filter((t) => t.status === "active").length;
  const totalUsers = tenants.reduce((sum, tenant) => sum + tenant.userCount, 0);
  const totalAdmins = tenantAdmins.filter((admin) => admin.role === "admin").length;

  const suspendedTenants = useMemo(
    () => tenants.filter((t) => t.status === "suspended").length,
    [tenants],
  );
  const recentTenantsForDashboard = useMemo(() => {
    return [...tenants]
      .sort((a, b) => {
        const ta = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const tb = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return tb - ta;
      })
      .slice(0, 5);
  }, [tenants]);
  const feedbackNewCount = useMemo(
    () => feedbackItems.filter((f) => f.status === "new").length,
    [feedbackItems],
  );

  const goToTab = useCallback((tab: string) => {
    window.location.assign(`/super-admin#${tab}`);
  }, []);

  if (authLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-6">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-uventorybiz-navy" />
          <p className="text-gray-600 dark:text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Unauthorized />;
  }

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

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      <SuperAdminSystemDashboard
        appVersion={APP_VERSION}
        userFirstName={user?.firstName}
        totalTenants={totalTenants}
        activeTenants={activeTenants}
        suspendedTenants={suspendedTenants}
        totalUsers={totalUsers}
        totalTenantAdmins={totalAdmins}
        feedbackTotal={feedbackItems.length}
        feedbackNew={feedbackNewCount}
        tenantsLoading={tenantsLoading}
        recentTenants={recentTenantsForDashboard}
        onGoToTab={goToTab}
        onCreateTenant={() => setIsCreateTenantOpen(true)}
      />

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
              <Label htmlFor="sa-dash-name">Organization Name</Label>
              <Input
                id="sa-dash-name"
                value={newTenant.name}
                onChange={(e) => setNewTenant({ ...newTenant, name: e.target.value })}
                placeholder="Business Site Alpha"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sa-dash-planType">Plan Type</Label>
              <Select
                value={newTenant.planType}
                onValueChange={(value) => setNewTenant({ ...newTenant, planType: value })}
              >
                <SelectTrigger id="sa-dash-planType">
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
              <Label htmlFor="sa-dash-description">Description</Label>
              <Input
                id="sa-dash-description"
                value={newTenant.description}
                onChange={(e) => setNewTenant({ ...newTenant, description: e.target.value })}
                placeholder="Multi-location retail business"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sa-dash-contactEmail">Contact Email</Label>
              <Input
                id="sa-dash-contactEmail"
                type="email"
                value={newTenant.contactEmail}
                onChange={(e) => setNewTenant({ ...newTenant, contactEmail: e.target.value })}
                placeholder="contact@company.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sa-dash-contactPhone">Contact Phone</Label>
              <Input
                id="sa-dash-contactPhone"
                value={newTenant.contactPhone}
                onChange={(e) => setNewTenant({ ...newTenant, contactPhone: e.target.value })}
                placeholder="+1 (555) 123-4567"
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label htmlFor="sa-dash-address">Address</Label>
              <Input
                id="sa-dash-address"
                value={newTenant.address}
                onChange={(e) => setNewTenant({ ...newTenant, address: e.target.value })}
                placeholder="123 Commerce Road, Accra, Ghana"
              />
            </div>
            <div className="space-y-4 col-span-2 mt-6">
              <h3 className="font-semibold text-lg">Admin User Details</h3>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sa-dash-adminFirstName">Admin First Name</Label>
              <Input
                id="sa-dash-adminFirstName"
                value={newTenant.adminFirstName}
                onChange={(e) => setNewTenant({ ...newTenant, adminFirstName: e.target.value })}
                placeholder="John"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sa-dash-adminLastName">Admin Last Name</Label>
              <Input
                id="sa-dash-adminLastName"
                value={newTenant.adminLastName}
                onChange={(e) => setNewTenant({ ...newTenant, adminLastName: e.target.value })}
                placeholder="Smith"
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label htmlFor="sa-dash-adminEmail">Admin Email</Label>
              <Input
                id="sa-dash-adminEmail"
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
    </div>
  );
}

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isPocEligibleCategory } from "@shared/poc";
import { Loader2, ArrowLeft, Building2, Mail, Phone, MapPin } from "lucide-react";

import { BrandLogo } from "@/components/BrandLogo";

interface BusinessCategory {
  key: string;
  label: string;
  description?: string | null;
}

const tenantSchema = z.object({
  name: z.string().min(2, "Organization name must be at least 2 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  contactEmail: z.string().email("Valid email address is required"),
  contactPhone: z.string().min(10, "Valid phone number is required"),
  address: z.string().min(5, "Address must be at least 5 characters"),
  businessCategory: z.string().min(1, "Please select a business category"),
  pocTestingEnabled: z.boolean().default(false),
  planType: z.enum(["basic", "standard", "premium"], {
    required_error: "Please select a plan type",
  }),
});

type TenantFormData = z.infer<typeof tenantSchema>;

interface TenantRegistrationProps {
  onComplete: (tenantData: any) => void;
  onBack: () => void;
}

export default function TenantRegistration({ onComplete, onBack }: TenantRegistrationProps) {
  const { toast } = useToast();

  const tenantForm = useForm<TenantFormData>({
    resolver: zodResolver(tenantSchema),
    defaultValues: {
      name: "",
      description: "",
      contactEmail: "",
      contactPhone: "",
      address: "",
      businessCategory: "",
      pocTestingEnabled: false,
      planType: "basic",
    },
  });

  const { data: categories = [] } = useQuery<BusinessCategory[]>({
    queryKey: ["/api/business-categories"],
    queryFn: async () => {
      const res = await fetch("/api/business-categories");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const createTenantMutation = useMutation({
    mutationFn: async (data: TenantFormData) => {
      const response = await apiRequest("POST", "/api/tenants", data);
      return response.json();
    },
    onSuccess: (data) => {
      // Extract tenant from response - API returns { tenant: {...} }
      const tenant = data.tenant || data;
      toast({
        title: "Organization Created!",
        description: `${tenant.name} has been successfully created. You can now create your user account.`,
      });
      // Pass the tenant object (with id) to the parent
      onComplete(tenant);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Create Organization",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: TenantFormData) => {
    createTenantMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-uventorybiz-light via-white to-blue-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center min-h-screen">
            
            {/* Left Column - Form */}
            <div className="space-y-8">
              <div className="text-center lg:text-left">
                <BrandLogo
                  variant="full"
                  alt="uventorybiz"
                  className="h-12 w-auto mx-auto lg:mx-0 mb-6"
                />
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  Create Your Organization
                </h1>
                <p className="text-uventorybiz-gray">
                  Set up your company in uventorybiz. This will be the central hub for your inventory, sales, and operations management.
                </p>
              </div>

              <Card className="max-w-lg mx-auto lg:mx-0">
                <CardHeader>
                  <CardTitle className="text-xl text-center">Organization Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={tenantForm.handleSubmit(onSubmit)} className="space-y-6">
                    
                    {/* Organization Name */}
                    <div className="space-y-2">
                      <Label htmlFor="name">Organization Name</Label>
                      <div className="relative">
                        <Input
                          {...tenantForm.register("name")}
                          id="name"
                          placeholder="e.g., Sunrise Trading Ltd"
                          className="pl-10"
                        />
                        <Building2 className="absolute left-3 top-3 h-4 w-4 text-uventorybiz-gray" />
                      </div>
                      {tenantForm.formState.errors.name && (
                        <p className="text-sm text-red-600">{tenantForm.formState.errors.name.message}</p>
                      )}
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        {...tenantForm.register("description")}
                        id="description"
                        placeholder="Describe your business, locations, and main activities..."
                        className="min-h-[80px]"
                      />
                      {tenantForm.formState.errors.description && (
                        <p className="text-sm text-red-600">{tenantForm.formState.errors.description.message}</p>
                      )}
                    </div>

                    {/* Contact Information */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="contactEmail">Contact Email</Label>
                        <div className="relative">
                          <Input
                            {...tenantForm.register("contactEmail")}
                            id="contactEmail"
                            type="email"
                            placeholder="admin@yourbusiness.com"
                            className="pl-10"
                          />
                          <Mail className="absolute left-3 top-3 h-4 w-4 text-uventorybiz-gray" />
                        </div>
                        {tenantForm.formState.errors.contactEmail && (
                          <p className="text-sm text-red-600">{tenantForm.formState.errors.contactEmail.message}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="contactPhone">Contact Phone</Label>
                        <div className="relative">
                          <Input
                            {...tenantForm.register("contactPhone")}
                            id="contactPhone"
                            placeholder="+1 (555) 123-4567"
                            className="pl-10"
                          />
                          <Phone className="absolute left-3 top-3 h-4 w-4 text-uventorybiz-gray" />
                        </div>
                        {tenantForm.formState.errors.contactPhone && (
                          <p className="text-sm text-red-600">{tenantForm.formState.errors.contactPhone.message}</p>
                        )}
                      </div>
                    </div>

                    {/* Address */}
                    <div className="space-y-2">
                      <Label htmlFor="address">Primary Location</Label>
                      <div className="relative">
                        <Input
                          {...tenantForm.register("address")}
                          id="address"
                          placeholder="123 Market Street, Accra"
                          className="pl-10"
                        />
                        <MapPin className="absolute left-3 top-3 h-4 w-4 text-uventorybiz-gray" />
                      </div>
                      {tenantForm.formState.errors.address && (
                        <p className="text-sm text-red-600">{tenantForm.formState.errors.address.message}</p>
                      )}
                    </div>

                    {/* Business Category */}
                    <div className="space-y-2">
                      <Label htmlFor="businessCategory">Business Category</Label>
                      <Select
                        onValueChange={(value) => {
                          tenantForm.setValue("businessCategory", value, { shouldValidate: true });
                          if (value !== "pharmacy" && value !== "laboratory") {
                            tenantForm.setValue("pocTestingEnabled", false);
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select your industry" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((c) => (
                            <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {tenantForm.formState.errors.businessCategory && (
                        <p className="text-sm text-red-600">{tenantForm.formState.errors.businessCategory.message}</p>
                      )}
                    </div>

                    {/* POC lab testing (pharmacies & laboratories only) */}
                    {isPocEligibleCategory(tenantForm.watch("businessCategory")) && (
                      <div className="flex items-start justify-between gap-4 rounded-lg border p-4">
                        <div className="space-y-1">
                          <Label htmlFor="pocTestingEnabled">Point-of-care lab testing</Label>
                          <p className="text-sm text-uventorybiz-gray">
                            Do you offer instant tests (hemoglobin, pregnancy, malaria, typhoid)?
                            You can change this later in Settings.
                          </p>
                        </div>
                        <Switch
                          id="pocTestingEnabled"
                          checked={tenantForm.watch("pocTestingEnabled")}
                          onCheckedChange={(checked) =>
                            tenantForm.setValue("pocTestingEnabled", checked)
                          }
                        />
                      </div>
                    )}

                    {/* Plan Type */}
                    <div className="space-y-2">
                      <Label htmlFor="planType">Plan Type</Label>
                      <Select onValueChange={(value) => tenantForm.setValue("planType", value as any)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a plan" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="basic">Basic - Up to 50 employees</SelectItem>
                          <SelectItem value="standard">Standard - Up to 200 employees</SelectItem>
                          <SelectItem value="premium">Premium - Unlimited employees</SelectItem>
                        </SelectContent>
                      </Select>
                      {tenantForm.formState.errors.planType && (
                        <p className="text-sm text-red-600">{tenantForm.formState.errors.planType.message}</p>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={onBack}
                        className="flex-1"
                      >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back
                      </Button>
                      <Button 
                        type="submit" 
                        className="flex-1 bg-uventorybiz-navy hover:bg-uventorybiz-navy/90"
                        disabled={createTenantMutation.isPending}
                      >
                        {createTenantMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Create Organization
                      </Button>
                    </div>

                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Benefits */}
            <div className="hidden lg:block space-y-8">
              <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  What You Get
                </h2>
                <p className="text-uventorybiz-gray mb-6">
                  Setting up your organization gives you access to comprehensive inventory, POS, and operations management tools.
                </p>
                
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="bg-blue-100 p-2 rounded-lg">
                      <Building2 className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Complete Organization Setup</h3>
                      <p className="text-sm text-uventorybiz-gray">Manage multiple companies, contractors, and employees under one organization</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="bg-green-100 p-2 rounded-lg">
                      <Mail className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Automated Notifications</h3>
                      <p className="text-sm text-uventorybiz-gray">Email alerts for low stock, appointments, incidents, and compliance deadlines</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="bg-purple-100 p-2 rounded-lg">
                      <Phone className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">24/7 Support</h3>
                      <p className="text-sm text-uventorybiz-gray">Dedicated support for your organization's business management needs</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-center text-sm text-uventorybiz-gray">
                <p>Secure & Compliant</p>
                <p className="mt-2 font-semibold text-uventorybiz-navy">Multi-Tenant Isolation • Data Encryption • Regular Backups</p>
              </div>
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
}
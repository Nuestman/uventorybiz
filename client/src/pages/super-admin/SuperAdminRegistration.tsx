import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Shield, ArrowLeft, AlertTriangle } from "lucide-react";
import { Link, useLocation } from "wouter";

import { BrandLogo } from "@/components/BrandLogo";

// Schema for super admin registration
const superAdminRegisterSchema = z.object({
  email: z.string().email("Valid email is required"),
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type SuperAdminRegisterFormData = z.infer<typeof superAdminRegisterSchema>;

export default function SuperAdminRegistration() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const form = useForm<SuperAdminRegisterFormData>({
    resolver: zodResolver(superAdminRegisterSchema),
    defaultValues: {
      email: "",
      firstName: "",
      lastName: "",
      password: "",
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: SuperAdminRegisterFormData) => {
      const response = await apiRequest("POST", "/api/auth/register", {
        ...data,
        role: "super_admin",
        acceptTermsAndPrivacy: true,
        // Explicitly no tenantId - super admins are platform-wide
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Super Admin Registration Successful",
        description: "Your super admin account has been created. You can now log in.",
        variant: "default",
      });
      // Redirect to login page
      setLocation("/auth");
    },
    onError: (error: Error) => {
      toast({
        title: "Registration Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: SuperAdminRegisterFormData) => {
    registerMutation.mutate(data);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto">
            <BrandLogo variant="full" alt="uventorybiz logo" className="h-16 w-auto mx-auto" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2">
              <Shield className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              <CardTitle className="text-2xl font-bold">Super Admin Registration</CardTitle>
            </div>
            <CardDescription>
              Create a new platform administrator account
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-amber-800 dark:text-amber-300">
                <p className="font-semibold mb-1">Platform Administrator Access</p>
                <p>Super admins have full platform-wide access and are not bound to any tenant. This account will have access to all tenants and system-wide administration features.</p>
              </div>
            </div>
          </div>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                placeholder="superadmin@uventorybiz.com"
                {...form.register("email")}
                disabled={registerMutation.isPending}
              />
              {form.formState.errors.email && (
                <p className="text-sm text-red-500">{form.formState.errors.email.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  placeholder="Super"
                  {...form.register("firstName")}
                  disabled={registerMutation.isPending}
                />
                {form.formState.errors.firstName && (
                  <p className="text-sm text-red-500">{form.formState.errors.firstName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  placeholder="Admin"
                  {...form.register("lastName")}
                  disabled={registerMutation.isPending}
                />
                {form.formState.errors.lastName && (
                  <p className="text-sm text-red-500">{form.formState.errors.lastName.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="password"
                placeholder="Minimum 8 characters"
                {...form.register("password")}
                disabled={registerMutation.isPending}
              />
              {form.formState.errors.password && (
                <p className="text-sm text-red-500">{form.formState.errors.password.message}</p>
              )}
              <p className="text-xs text-gray-500">Password must be at least 8 characters long</p>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={registerMutation.isPending}
            >
              {registerMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                <>
                  <Shield className="mr-2 h-4 w-4" />
                  Create Super Admin Account
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t">
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => setLocation("/auth")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Login
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


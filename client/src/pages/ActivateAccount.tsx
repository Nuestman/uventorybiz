import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";

const activationSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  phoneNumber: z.string().min(10, "Phone number must be at least 10 characters").optional(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(8, "Please confirm your password"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ActivationFormData = z.infer<typeof activationSchema>;

export default function ActivateAccount() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [token, setToken] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");
  const [userRole, setUserRole] = useState<string>("");
  const [tenantName, setTenantName] = useState<string>("");
  const [tenantActive, setTenantActive] = useState<boolean>(true);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ActivationFormData>({
    resolver: zodResolver(activationSchema),
  });

  useEffect(() => {
    // Get token from URL
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get("token");
    
    if (!urlToken) {
      toast({
        title: "Invalid Link",
        description: "No activation token found in URL",
        variant: "destructive",
      });
      setTimeout(() => navigate("/auth"), 2000);
      return;
    }

    setToken(urlToken);

    // Fetch user details from token
    fetch(`/api/auth/activation-details?token=${urlToken}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setUserEmail(data.email);
          setUserRole(data.role);
          setTenantName(data.tenantName);
          setTenantActive(data.tenantActive !== false);
        } else {
          toast({
            title: "Invalid Token",
            description: data.message || "Activation token is invalid or expired",
            variant: "destructive",
          });
          setTimeout(() => navigate("/auth"), 2000);
        }
      })
      .catch(() => {
        toast({
          title: "Error",
          description: "Failed to load activation details",
          variant: "destructive",
        });
      })
      .finally(() => setLoading(false));
  }, []);

  const onSubmit = async (data: ActivationFormData) => {
    setActivating(true);
    try {
      const response = await fetch("/api/auth/complete-activation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          firstName: data.firstName,
          lastName: data.lastName,
          phoneNumber: data.phoneNumber,
          password: data.password,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast({
          title: "Account Activated!",
          description: "Your account has been activated successfully. Redirecting to login...",
        });
        
        // Redirect to login with email pre-filled
        setTimeout(() => navigate(`/auth?email=${encodeURIComponent(userEmail)}`), 2000);
      } else {
        toast({
          title: "Activation Failed",
          description: result.message || "Failed to activate account",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred during activation",
        variant: "destructive",
      });
    } finally {
      setActivating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#EAF6FF] to-white">
        <Loader2 className="h-8 w-8 animate-spin text-[#142F5C]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#EAF6FF] to-white p-4">
      <Card className="w-full max-w-2xl shadow-2xl border-2 border-gray-100">
        <CardHeader className="text-center pb-6 bg-gradient-to-r from-[#142F5C] to-blue-900 text-white rounded-t-lg">
          <BrandLogo variant="full" alt="uventorybiz" className="h-12 w-auto mx-auto mb-4 brightness-0 invert" />
          <CardTitle className="text-3xl font-black">Complete Your Activation</CardTitle>
          <CardDescription className="text-white/80 text-lg mt-2">
            You've been invited to join {tenantName}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-8 pb-8">
          {/* Tenant not active warning */}
          {!tenantActive && (
            <div className="bg-amber-50 border border-amber-300 rounded-lg p-6 mb-8 flex gap-3">
              <AlertCircle className="h-6 w-6 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-lg font-bold text-amber-800">Organization not activated</h3>
                <p className="text-amber-800 mt-1">
                  Your organization ({tenantName}) has not been activated yet. You cannot activate your account until an administrator activates your organization. Please contact your administrator or support.
                </p>
              </div>
            </div>
          )}

          {/* Invitation Info */}
          <div className="bg-[#EAF6FF] rounded-lg p-6 mb-8 border border-[#142F5C]/20">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle2 className="h-6 w-6 text-[#FF4D4D]" />
              <h3 className="text-lg font-bold text-[#142F5C]">Invitation Details</h3>
            </div>
            <div className="space-y-2 text-[#142F5C]">
              <p><strong>Email:</strong> {userEmail}</p>
              <p><strong>Role:</strong> {userRole.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>
              <p><strong>Organization:</strong> {tenantName}</p>
            </div>
          </div>

          {/* Activation Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName" className="text-[#142F5C] font-semibold">First Name *</Label>
                <Input
                  id="firstName"
                  {...register("firstName")}
                  placeholder="Enter your first name"
                  className="border-gray-300 focus:border-[#FF4D4D]"
                />
                {errors.firstName && (
                  <p className="text-sm text-red-600 mt-1">{errors.firstName.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="lastName" className="text-[#142F5C] font-semibold">Last Name *</Label>
                <Input
                  id="lastName"
                  {...register("lastName")}
                  placeholder="Enter your last name"
                  className="border-gray-300 focus:border-[#FF4D4D]"
                />
                {errors.lastName && (
                  <p className="text-sm text-red-600 mt-1">{errors.lastName.message}</p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="phoneNumber" className="text-[#142F5C] font-semibold">Phone Number (Optional)</Label>
              <Input
                id="phoneNumber"
                {...register("phoneNumber")}
                placeholder="+1234567890"
                className="border-gray-300 focus:border-[#FF4D4D]"
              />
              {errors.phoneNumber && (
                <p className="text-sm text-red-600 mt-1">{errors.phoneNumber.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="password" className="text-[#142F5C] font-semibold">Password *</Label>
              <Input
                id="password"
                type="password"
                {...register("password")}
                placeholder="Minimum 8 characters"
                className="border-gray-300 focus:border-[#FF4D4D]"
              />
              {errors.password && (
                <p className="text-sm text-red-600 mt-1">{errors.password.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="confirmPassword" className="text-[#142F5C] font-semibold">Confirm Password *</Label>
              <Input
                id="confirmPassword"
                type="password"
                {...register("confirmPassword")}
                placeholder="Re-enter your password"
                className="border-gray-300 focus:border-[#FF4D4D]"
              />
              {errors.confirmPassword && (
                <p className="text-sm text-red-600 mt-1">{errors.confirmPassword.message}</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={activating || !tenantActive}
              className="w-full bg-[#FF4D4D] hover:bg-[#FF4D4D]/90 text-white font-bold py-6 text-lg disabled:opacity-60 disabled:pointer-events-none"
            >
              {activating ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Activating Account...
                </>
              ) : (
                "Activate Account"
              )}
            </Button>
          </form>

          <p className="text-center text-sm text-[#142F5C]/60 mt-6">
            By activating your account, you agree to the uventorybiz Terms of Service and Privacy Policy
          </p>
        </CardContent>
      </Card>
    </div>
  );
}


import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Home, ArrowLeft, AlertTriangle } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";

interface AccessDeniedProps {
  title?: string;
  message?: string;
  requiredRole?: string;
  currentRole?: string;
}

export default function AccessDenied({ 
  title = "Access Denied", 
  message,
  requiredRole,
  currentRole 
}: AccessDeniedProps) {
  const { user } = useAuth();
  
  const defaultMessage = requiredRole 
    ? `This page requires ${requiredRole} access. ${currentRole ? `Your current role is ${currentRole}.` : ''}`
    : "You do not have permission to access this page.";

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 bg-red-100 dark:bg-red-900/20 p-4 rounded-full w-fit">
            <Shield className="h-12 w-12 text-red-600 dark:text-red-400" />
          </div>
          <CardTitle className="text-3xl font-bold dark:text-white">
            {title}
          </CardTitle>
          <CardDescription className="text-base mt-2">
            {message || defaultMessage}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {user && (
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                <span className="font-semibold text-sm text-gray-700 dark:text-gray-300">Your Account Info</span>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <p><strong>Role:</strong> {user.role || 'Not assigned'}</p>
                {user.tenantId && <p><strong>Tenant:</strong> {user.tenantId}</p>}
                {!user.tenantId && user.role === 'super_admin' && (
                  <p className="text-green-600 dark:text-green-400">✓ Super Admin (Global Access)</p>
                )}
              </div>
            </div>
          )}
          
          <div className="flex flex-col sm:flex-row gap-3">
            <Button asChild className="flex-1" variant="default">
              <Link href="/dashboard">
                <Home className="h-4 w-4 mr-2" />
                Go to Dashboard
              </Link>
            </Button>
            <Button asChild className="flex-1" variant="outline">
              <Link href="/auth">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Login
              </Link>
            </Button>
          </div>
          
          <div className="text-center text-sm text-gray-500 dark:text-gray-400 pt-4 border-t">
            <p>If you believe this is an error, please contact your system administrator.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


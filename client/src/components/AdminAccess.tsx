import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Shield, Key } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AdminAccessProps {
  onAccessGranted: () => void;
}

export default function AdminAccess({ onAccessGranted }: AdminAccessProps) {
  const [adminSecret, setAdminSecret] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Test admin access by making a request with the secret
      const response = await fetch('/api/admin/pending-users', {
        headers: {
          'x-admin-secret': adminSecret,
        },
      });

      if (response.ok) {
        // Store admin secret in session storage for this session
        sessionStorage.setItem('adminSecret', adminSecret);
        toast({
          title: "Admin Access Granted",
          description: "Welcome to the admin panel.",
        });
        onAccessGranted();
      } else {
        toast({
          title: "Access Denied",
          description: "Invalid admin credentials.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to verify admin access.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-uventorybiz-light flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto bg-blue-100 p-3 rounded-full w-fit mb-4">
            <Shield className="h-8 w-8 text-blue-600" />
          </div>
          <CardTitle className="text-2xl">Admin Access Required</CardTitle>
          <p className="text-gray-600 mt-2">
            Enter the admin secret to access the administration panel.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="adminSecret">Admin Secret</Label>
              <div className="relative">
                <Key className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="adminSecret"
                  type="password"
                  value={adminSecret}
                  onChange={(e) => setAdminSecret(e.target.value)}
                  placeholder="Enter admin secret"
                  className="pl-10"
                  required
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Default for development: <code>admin123</code>
              </p>
            </div>
            <Button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-700" 
              disabled={isLoading || !adminSecret}
            >
              {isLoading ? "Verifying..." : "Access Admin Panel"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
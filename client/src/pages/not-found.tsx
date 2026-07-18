import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileQuestion, Home, ArrowLeft, Search } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";

export default function NotFound() {
  const { isAuthenticated } = useAuth();
  
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 bg-gray-100 dark:bg-gray-800 p-4 rounded-full w-fit">
            <FileQuestion className="h-12 w-12 text-gray-600 dark:text-gray-400" />
          </div>
          <CardTitle className="text-3xl font-bold dark:text-white">
            404 - Page Not Found
          </CardTitle>
          <CardDescription className="text-base mt-2">
            The page you're looking for doesn't exist or has been moved.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              This could happen if:
            </p>
            <ul className="text-sm text-gray-600 dark:text-gray-400 mt-2 space-y-1 list-disc list-inside">
              <li>The URL was typed incorrectly</li>
              <li>The page has been moved or deleted</li>
              <li>You don't have access to this resource</li>
            </ul>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            {isAuthenticated ? (
              <>
                <Button asChild className="flex-1" variant="default">
                  <Link href="/dashboard">
                    <Home className="h-4 w-4 mr-2" />
                    Go to Dashboard
                  </Link>
                </Button>
                <Button asChild className="flex-1" variant="outline" onClick={() => window.history.back()}>
                  <span>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Go Back
                  </span>
                </Button>
              </>
            ) : (
              <>
                <Button asChild className="flex-1" variant="default">
                  <Link href="/">
                    <Home className="h-4 w-4 mr-2" />
                    Go to Home
                  </Link>
                </Button>
                <Button asChild className="flex-1" variant="outline">
                  <Link href="/auth">
                    <Search className="h-4 w-4 mr-2" />
                    Sign In
                  </Link>
                </Button>
              </>
            )}
          </div>
          
          <div className="text-center text-sm text-gray-500 dark:text-gray-400 pt-4 border-t">
            <p>Need help? Contact your system administrator or check the documentation.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

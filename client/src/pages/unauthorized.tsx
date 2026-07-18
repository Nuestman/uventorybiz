import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, Home, ArrowLeft, LogIn } from "lucide-react";
import { Link } from "wouter";

export default function Unauthorized() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 bg-blue-100 dark:bg-blue-900/20 p-4 rounded-full w-fit">
            <Lock className="h-12 w-12 text-blue-600 dark:text-blue-400" />
          </div>
          <CardTitle className="text-3xl font-bold dark:text-white">
            Authentication Required
          </CardTitle>
          <CardDescription className="text-base mt-2">
            Please log in to access this page.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-gray-600 dark:text-gray-400">
            You need to be authenticated to view this content. Please sign in with your credentials.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <Button asChild className="flex-1" variant="default">
              <Link href="/auth">
                <LogIn className="h-4 w-4 mr-2" />
                Sign In
              </Link>
            </Button>
            <Button asChild className="flex-1" variant="outline">
              <Link href="/">
                <Home className="h-4 w-4 mr-2" />
                Go to Home
              </Link>
            </Button>
          </div>
          
          <div className="text-center text-sm text-gray-500 dark:text-gray-400 pt-4 border-t">
            <p>Don't have an account? <Link href="/auth" className="text-blue-600 dark:text-blue-400 hover:underline">Register here</Link></p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


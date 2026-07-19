import { ReactNode } from "react";
import { Link } from "wouter";
import { Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";

interface RequireFeatureProps {
  /** Platform feature flag key (e.g. "appointments") */
  flag: string;
  children: ReactNode;
  /** Where the fallback's back button navigates (default /dashboard) */
  fallbackHref?: string;
}

/**
 * Renders children only when the platform feature flag is enabled.
 * Shows a "feature disabled" notice for direct URL access when disabled.
 */
export function RequireFeature({ flag, children, fallbackHref = "/dashboard" }: RequireFeatureProps) {
  const { flags, isLoading } = useFeatureFlags();

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (flags[flag] ?? (flag === "messaging" ? false : true)) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <Card className="max-w-md w-full">
        <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Ban className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Feature unavailable</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              This feature has been turned off by the platform administrator.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href={fallbackHref}>Back to dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

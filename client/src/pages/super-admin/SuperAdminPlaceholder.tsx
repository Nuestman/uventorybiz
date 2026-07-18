import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SuperAdminPlaceholder({
  title,
  description = "This system administration area is not implemented yet. It will be added in a future release.",
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" asChild>
            <Link href="/super-admin/dashboard">Back to console</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

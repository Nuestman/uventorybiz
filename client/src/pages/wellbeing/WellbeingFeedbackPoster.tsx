import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useTenantSettings } from "@/hooks/useTenantSettings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { QRCodeSVG } from "qrcode.react";
import { MessageSquare, Users, Search, Mail, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { BrandLogo } from "@/components/BrandLogo";

export default function WellbeingFeedbackPoster() {
  const { user } = useAuth();
  const { settings } = useTenantSettings();
  const { toast } = useToast();
  const canWrite = user?.role !== "operations";
  const [origin, setOrigin] = useState("");
  const [search, setSearch] = useState("");
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  const tenantId = user?.tenantId || settings?.tenantId || "";
  const publicFeedbackUrl = tenantId
    ? `/feedback?tenantId=${encodeURIComponent(tenantId)}`
    : "/feedback";
  const qrValue = origin ? origin + publicFeedbackUrl : publicFeedbackUrl;

  const brandName = settings?.appName || settings?.tenantName || "Care feedback";
  const logoUrl = settings?.logoUrl || null;

  interface Employee {
    id: string;
    employeeNumber?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    department?: string;
    position?: string;
  }

  const { data: employeesData = [], isLoading: employeesLoading } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  const employees: Employee[] = Array.isArray(employeesData) ? employeesData : [];

  const filteredEmployees = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return employees;
    return employees.filter((e) => {
      const name = `${e.firstName || ""} ${e.lastName || ""}`.toLowerCase();
      const email = (e.email || "").toLowerCase();
      const empNum = (e.employeeNumber || "").toLowerCase();
      return (
        name.includes(term) ||
        email.includes(term) ||
        empNum.includes(term)
      );
    });
  }, [employees, search]);

  const allVisibleSelected =
    filteredEmployees.length > 0 &&
    filteredEmployees.every((e) => selectedEmployeeIds.has(e.id));

  const toggleEmployee = (id: string) => {
    setSelectedEmployeeIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAllVisible = () => {
    setSelectedEmployeeIds((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        filteredEmployees.forEach((e) => next.delete(e.id));
      } else {
        filteredEmployees.forEach((e) => next.add(e.id));
      }
      return next;
    });
  };

  const shareMutation = useMutation({
    mutationFn: async (employeeIds: string[]) => {
      const res = await apiRequest("POST", "/api/wellbeing/feedback/share-poster", {
        employeeIds,
      });
      return res.json() as Promise<{ success: boolean; requested: number; emailed: number }>;
    },
    onSuccess: (data) => {
      toast({
        title: "Feedback link shared",
        description:
          data.emailed > 0
            ? `Sent to ${data.emailed} employee${data.emailed === 1 ? "" : "s"}.`
            : "No emails were sent. Check that selected employees have email addresses.",
      });
      setSelectedEmployeeIds(new Set());
    },
    onError: (error: any) => {
      toast({
        title: "Could not share feedback link",
        description: error?.message || "Something went wrong while sending emails.",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6 print:p-0">
      <div className="w-full max-w-2xl border border-slate-300 rounded-2xl shadow-md p-8 flex flex-col items-center gap-6 print:shadow-none print:border-none print:rounded-none">
        <div className="flex flex-col items-center gap-3">
          <BrandLogo
            variant="full"
            src={logoUrl}
            alt={brandName}
            className="h-20 w-auto object-contain max-w-[260px]"
          />
          <div className="text-center">
            <h1 className="text-2xl font-semibold text-uventorybiz-navy">
              Employee care feedback
            </h1>
            <p className="text-slate-600">
              Help us improve services at our Care Locations
              .
            </p>
          </div>
        </div>

        {/* Digital sharing tools - visible on screen only, hidden when printing; write-only */}
        {canWrite && (
          <div className="w-full mt-4 space-y-3 print:hidden">
            <Card className="w-full">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="h-4 w-4 text-uventorybiz-navy" />
                  Share digitally with employees
                </CardTitle>
                <CardDescription>
                  Select employees and send them the feedback link and poster.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Search employees by name, email, or ID..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <div className="text-xs text-slate-500">
                    {employeesLoading
                      ? "Loading employees..."
                      : `${employees.length} employees`}
                  </div>
                </div>

                <div className="border rounded-md max-h-64 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead className="w-10">
                          <input
                            type="checkbox"
                            checked={allVisibleSelected && filteredEmployees.length > 0}
                            onChange={toggleSelectAllVisible}
                          />
                        </TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead className="hidden sm:table-cell">Employee #</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEmployees.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-xs text-slate-500">
                            {employeesLoading ? "Loading employees..." : "No employees match your search."}
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredEmployees.map((emp, index) => (
                          <TableRow key={emp.id}>
                            <TableCell className="font-medium text-muted-foreground tabular-nums">{index + 1}</TableCell>
                            <TableCell>
                              <input
                                type="checkbox"
                                checked={selectedEmployeeIds.has(emp.id)}
                                onChange={() => toggleEmployee(emp.id)}
                              />
                            </TableCell>
                            <TableCell className="text-xs">
                              <div className="font-medium">
                                {(emp.firstName || emp.lastName)
                                  ? `${emp.firstName || ""} ${emp.lastName || ""}`.trim()
                                  : "Unnamed"}
                              </div>
                            </TableCell>
                            <TableCell className="text-xs">
                              {emp.email || <span className="text-slate-400">No email</span>}
                            </TableCell>
                            <TableCell className="hidden sm:table-cell text-xs text-slate-500">
                              {emp.employeeNumber || "—"}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs text-slate-500">
                    {selectedEmployeeIds.size > 0
                      ? `${selectedEmployeeIds.size} selected`
                      : "Select one or more employees."}
                  </div>
                  <Button
                    size="sm"
                    disabled={
                      selectedEmployeeIds.size === 0 ||
                      shareMutation.isPending ||
                      employeesLoading
                    }
                    onClick={() =>
                      shareMutation.mutate(Array.from(selectedEmployeeIds))
                    }
                    className="inline-flex items-center gap-1"
                  >
                    {shareMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail className="h-4 w-4" />
                        Send link & poster
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <Card className="w-full border-dashed border-slate-300">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-center gap-2 text-base">
              <MessageSquare className="h-5 w-5 text-uventorybiz-navy" />
              Scan to share your experience
            </CardTitle>
            <CardDescription className="text-center">
              Open your camera or QR scanner and point it at the code below.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-3 pt-2 pb-6">
            {qrValue && (
              <QRCodeSVG value={qrValue} size={224} />
            )}
            <p className="text-xs text-slate-500 text-center max-w-xs">
              You can also visit:
              <br />
              <span className="font-mono text-[11px] break-all">
                {qrValue}
              </span>
            </p>
          </CardContent>
        </Card>

        <div className="hidden w-full text-xs text-slate-500 text-center mt-2">
          <p>
            This poster is designed to be printed on A4 or US Letter. Use your browser&apos;s{" "}
            <span className="font-medium">Print</span> option to save as PDF or print directly.
          </p>
        </div>
      </div>
    </div>
  );
}


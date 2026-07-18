import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  TestTube,
  FlaskConical,
  Activity,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Edit,
  Trash2,
  Droplets,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface InstantTest {
  id: string;
  testNumber: string;
  customerId?: string | null;
  customerName?: string | null;
  customerNumber?: string | null;
  employeeId?: string | null;
  employeeName?: string;
  employeeNumber?: string;
  locationId?: string;
  locationName?: string;
  locationCode?: string;
  testType: "hb" | "pregnancy" | "malaria" | "typhoid";
  testDate: string;
  testTime?: string;
  testResult?: "positive" | "negative" | "invalid";
  hbLevel?: string;
  notes?: string;
  testedBy: string;
  testerName?: string;
  createdAt: string;
}

const INSTANT_TEST_TYPE_OPTIONS = [
  { value: "hb", label: "Hemoglobin (HB)" },
  { value: "pregnancy", label: "Pregnancy" },
  { value: "malaria", label: "Malaria" },
  { value: "typhoid", label: "Typhoid" },
] as const;

const ALL_INSTANT_TEST_TYPES = INSTANT_TEST_TYPE_OPTIONS.map((option) => option.value);

const TEST_TYPE_LABELS: Record<InstantTest["testType"], string> = {
  hb: "Hemoglobin",
  pregnancy: "Pregnancy",
  malaria: "Malaria",
  typhoid: "Typhoid",
};

export default function InstantTestsPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [typeFilter, setTypeFilter] = useState<string[]>(ALL_INSTANT_TEST_TYPES);
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [editingTest, setEditingTest] = useState<InstantTest | null>(null);
  const [editForm, setEditForm] = useState<{
    testDate: string;
    testTime: string;
    hbLevel: string;
    testResult: string;
    notes: string;
  }>({ testDate: "", testTime: "", hbLevel: "", testResult: "", notes: "" });

  const { data: tests = [], isLoading } = useQuery<InstantTest[]>({
    queryKey: ["/api/instant-tests"],
  });

  const { data: locations = [] } = useQuery<any[]>({
    queryKey: ["/api/care-locations"],
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      apiRequest("PATCH", `/api/instant-tests/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/instant-tests"] });
      toast({ title: "Test Updated", description: "Instant test has been successfully updated." });
      setEditingTest(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update instant test",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/instant-tests/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/instant-tests"] });
      toast({ title: "Test Deleted", description: "Instant test has been successfully deleted." });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete instant test",
        variant: "destructive",
      });
    },
  });

  const handleDelete = (test: InstantTest) => {
    if (confirm(`Are you sure you want to delete test "${test.testNumber}"? This action cannot be undone.`)) {
      deleteMutation.mutate(test.id);
    }
  };

  const openEdit = (test: InstantTest) => {
    setEditingTest(test);
    setEditForm({
      testDate: test.testDate ? test.testDate.slice(0, 10) : "",
      testTime: test.testTime ?? "",
      hbLevel: test.hbLevel ?? "",
      testResult: test.testResult ?? "negative",
      notes: test.notes ?? "",
    });
  };

  const submitEdit = () => {
    if (!editingTest) return;
    const payload: Record<string, unknown> = {
      testDate: editForm.testDate,
      testTime: editForm.testTime,
      notes: editForm.notes,
    };
    if (editingTest.testType === "hb") {
      payload.hbLevel = editForm.hbLevel;
    } else {
      payload.testResult = editForm.testResult;
    }
    updateMutation.mutate({ id: editingTest.id, data: payload });
  };

  // Location filter options (known store locations + any legacy ids on tests)
  const locationOptionMap = new Map<string, string>();
  locations.forEach((location: any) => {
    const label = `${location.locationName}${location.locationCode ? ` (${location.locationCode})` : ""}`;
    locationOptionMap.set(location.id, label);
  });
  tests.forEach((test) => {
    if (test.locationId && !locationOptionMap.has(test.locationId)) {
      locationOptionMap.set(test.locationId, test.locationName || "Store Location");
    }
  });
  const locationOptions = Array.from(locationOptionMap.entries()).map(([value, label]) => ({ value, label }));
  const hasUnassigned = tests.some((test) => !test.locationId);

  const filteredTests = tests.filter((test) => {
    if (!typeFilter.includes(test.testType)) return false;
    if (locationFilter === "all") return true;
    if (locationFilter === "unassigned") return !test.locationId;
    return String(test.locationId ?? "").trim() === locationFilter;
  });

  // Summary stats
  const today = new Date().toDateString();
  const testsToday = tests.filter((t) => t.testDate && new Date(t.testDate).toDateString() === today).length;
  const lowHbCount = tests.filter(
    (t) => t.testType === "hb" && t.hbLevel && parseFloat(t.hbLevel) < 12,
  ).length;
  const positiveCount = tests.filter((t) => t.testType !== "hb" && t.testResult === "positive").length;

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <TestTube className="h-6 w-6" />
            Point-of-Care Laboratory
          </h1>
          <p className="text-muted-foreground">
            Instant tests: Hemoglobin, Pregnancy, Malaria, Typhoid
          </p>
        </div>
        <Button onClick={() => navigate("/testing/new")} data-testid="button-record-instant-test">
          <FlaskConical className="h-4 w-4 mr-2" />
          Record Instant Test
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Tests</p>
                <p className="text-2xl font-bold">{tests.length}</p>
              </div>
              <Activity className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tests Today</p>
                <p className="text-2xl font-bold">{testsToday}</p>
              </div>
              <TestTube className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Low HB (&lt;12 g/dL)</p>
                <p className="text-2xl font-bold">{lowHbCount}</p>
              </div>
              <Droplets className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Positive Results</p>
                <p className="text-2xl font-bold">{positiveCount}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tests table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col lg:flex-row justify-between items-start gap-4">
            <div>
              <CardTitle>Instant Tests</CardTitle>
              <CardDescription>All recorded point-of-care instant test results</CardDescription>
            </div>
            <div className="flex flex-col gap-4 lg:flex-row">
              <div className="min-w-[220px]">
                <Select value={locationFilter} onValueChange={setLocationFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Locations</SelectItem>
                    {locationOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                    {hasUnassigned && <SelectItem value="unassigned">No Location Recorded</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant={typeFilter.length === ALL_INSTANT_TEST_TYPES.length ? "default" : "outline"}
                  onClick={() => setTypeFilter([...ALL_INSTANT_TEST_TYPES])}
                >
                  All Types
                </Button>
                {INSTANT_TEST_TYPE_OPTIONS.map((option) => (
                  <Button
                    key={option.value}
                    size="sm"
                    variant={typeFilter.includes(option.value) ? "default" : "outline"}
                    onClick={() =>
                      setTypeFilter((prev) =>
                        prev.includes(option.value)
                          ? prev.filter((type) => type !== option.value)
                          : [...prev, option.value],
                      )
                    }
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
              ))}
            </div>
          ) : tests.length === 0 ? (
            <div className="text-center py-8">
              <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No instant tests recorded yet</p>
              <Button className="mt-4" onClick={() => navigate("/testing/new")}>
                Record First Instant Test
              </Button>
            </div>
          ) : filteredTests.length === 0 ? (
            <div className="text-center py-10 border rounded-md bg-gray-50 dark:bg-gray-900/40">
              <p className="text-gray-500 dark:text-gray-400">No instant tests match the selected filters.</p>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <table className="w-full text-sm min-w-[900px]">
                <thead className="bg-[var(--uventorybiz-navy)] text-white">
                  <tr className="border-b">
                    <th className="px-4 py-3 text-left font-medium whitespace-nowrap">#</th>
                    <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Test ID</th>
                    <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Subject</th>
                    <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Test Type</th>
                    <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Date</th>
                    <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Location</th>
                    <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Result / HB Level</th>
                    <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Tester</th>
                    <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTests.map((test, index) => {
                    const isHbTest = test.testType === "hb";
                    const hbValue = isHbTest && test.hbLevel ? parseFloat(test.hbLevel) : null;
                    const isLowHb = hbValue !== null && hbValue < 12;
                    const isHighHb = hbValue !== null && hbValue > 16;

                    return (
                      <tr
                        key={test.id}
                        className="border-b hover:bg-gray-50 dark:hover:bg-gray-800"
                        data-testid={`row-instant-test-${test.id}`}
                      >
                        <td className="px-4 py-3 text-gray-500">{index + 1}</td>
                        <td className="px-4 py-3 font-mono text-xs">{test.testNumber}</td>
                        <td className="px-4 py-3 font-medium">
                          {test.customerId ? (
                            <div>
                              <p>{test.customerName || test.customerNumber || test.customerId}</p>
                              <p className="text-xs text-muted-foreground font-normal">Customer</p>
                            </div>
                          ) : (
                            <div>
                              <p>{test.employeeName || test.employeeNumber || test.employeeId || "-"}</p>
                              <p className="text-xs text-muted-foreground font-normal">Employee</p>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline">{TEST_TYPE_LABELS[test.testType]}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          {test.testDate
                            ? new Date(test.testDate).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })
                            : "N/A"}
                          {test.testTime && <span className="text-gray-500 text-xs ml-1">{test.testTime}</span>}
                        </td>
                        <td className="px-4 py-3">
                          {test.locationName ? (
                            <div>
                              <p className="font-medium text-sm">{test.locationName}</p>
                              {test.locationCode && (
                                <p className="text-xs text-muted-foreground">Code: {test.locationCode}</p>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-500 text-xs">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {isHbTest ? (
                            <div>
                              <span
                                className={cn(
                                  "font-bold text-base",
                                  isLowHb ? "text-red-600" : isHighHb ? "text-orange-600" : "text-green-600",
                                )}
                              >
                                {test.hbLevel || "-"} g/dL
                              </span>
                              <p className="text-xs text-gray-500">Normal: M 13.5-17.5, F 12.0-15.5</p>
                            </div>
                          ) : (
                            <Badge
                              variant={
                                test.testResult === "negative"
                                  ? "outline"
                                  : test.testResult === "positive"
                                    ? "destructive"
                                    : "secondary"
                              }
                              className="flex items-center w-fit"
                            >
                              {test.testResult === "negative" && <CheckCircle className="h-3 w-3 mr-1" />}
                              {test.testResult === "positive" && <XCircle className="h-3 w-3 mr-1" />}
                              {test.testResult === "invalid" && <AlertTriangle className="h-3 w-3 mr-1" />}
                              {test.testResult
                                ? test.testResult.charAt(0).toUpperCase() + test.testResult.slice(1)
                                : "Pending"}
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs">{test.testerName || "-"}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEdit(test)}
                              title="Edit Test"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(test)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              title="Delete Test"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit dialog */}
      <Dialog open={!!editingTest} onOpenChange={(open) => !open && setEditingTest(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Instant Test</DialogTitle>
            <DialogDescription>
              {editingTest &&
                `${TEST_TYPE_LABELS[editingTest.testType]} test ${editingTest.testNumber}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-test-date">Test Date</Label>
                <Input
                  id="edit-test-date"
                  type="date"
                  value={editForm.testDate}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, testDate: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-test-time">Test Time</Label>
                <Input
                  id="edit-test-time"
                  type="time"
                  value={editForm.testTime}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, testTime: e.target.value }))}
                />
              </div>
            </div>
            {editingTest?.testType === "hb" ? (
              <div className="space-y-2">
                <Label htmlFor="edit-hb-level">Hemoglobin Level (g/dL)</Label>
                <Input
                  id="edit-hb-level"
                  type="number"
                  step="0.1"
                  min="0"
                  max="25"
                  value={editForm.hbLevel}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, hbLevel: e.target.value }))}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Test Result</Label>
                <Select
                  value={editForm.testResult}
                  onValueChange={(value) => setEditForm((prev) => ({ ...prev, testResult: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="negative">Negative</SelectItem>
                    <SelectItem value="positive">Positive</SelectItem>
                    <SelectItem value="invalid">Invalid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="edit-notes">Notes</Label>
              <Textarea
                id="edit-notes"
                value={editForm.notes}
                onChange={(e) => setEditForm((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Any additional observations..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTest(null)}>
              Cancel
            </Button>
            <Button onClick={submitEdit} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

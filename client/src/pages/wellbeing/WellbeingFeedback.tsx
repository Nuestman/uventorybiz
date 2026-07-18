import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  MessageSquare,
  Eye,
  ExternalLink,
  BarChart3,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Bar,
  BarChart as ReBarChart,
  CartesianGrid,
  Line,
  LineChart as ReLineChart,
  Pie,
  PieChart as RePieChart,
  XAxis,
  YAxis,
  Cell,
} from "recharts";

type FeedbackRow = {
  id: string;
  locationId: string;
  anonymous: boolean | null;
  feedbackDate: string | null;
  overallExperienceRating: number | null;
  staffCourtesyRating: number | null;
  waitTimeRating: number | null;
  environmentCleanlinessRating: number | null;
  explanationClarityRating: number | null;
  perceivedSafetyRating: number | null;
  wouldRecommend: boolean | null;
  wouldReturn: boolean | null;
  freeTextFeedback: string | null;
  status: string | null;
  responseToFeedback: string | null;
  createdAt: string;
  location?: { id: string; locationName: string; tenantId: string } | null;
};

const STATUS_OPTIONS = [
  { value: "new", label: "New" },
  { value: "in_review", label: "In review" },
  { value: "acknowledged", label: "Acknowledged" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

function statusBadge(status: string | null) {
  const s = status || "new";
  const variant =
    s === "resolved" || s === "closed"
      ? "default"
      : s === "in_review" || s === "acknowledged"
        ? "secondary"
        : "outline";
  const label = STATUS_OPTIONS.find((o) => o.value === s)?.label ?? s;
  return <Badge variant={variant}>{label}</Badge>;
}

export default function WellbeingFeedback() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const canWrite = user?.role !== "operations";
  const publicFeedbackUrl = user?.tenantId ? `/feedback?tenantId=${encodeURIComponent(user.tenantId)}` : "/feedback";
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackRow | null>(null);
  const [detailStatus, setDetailStatus] = useState("");
  const [detailResponse, setDetailResponse] = useState("");
  const [activeTab, setActiveTab] = useState<"results" | "analytics">("results");

  const { data: careLocations = [] } = useQuery({
    queryKey: ["/api/care-locations"],
    queryFn: async () => {
      const res = await fetch("/api/care-locations", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load locations");
      return res.json();
    },
  });

  const queryKey = [
    "/api/wellbeing/feedback",
    locationFilter,
    statusFilter,
    fromDate,
    toDate,
  ] as const;
  const { data: feedbackList = [], isLoading } = useQuery<FeedbackRow[]>({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (locationFilter && locationFilter !== "all") params.set("locationId", locationFilter);
      if (statusFilter && statusFilter !== "all") params.set("status", statusFilter);
      if (fromDate) params.set("fromDate", fromDate);
      if (toDate) params.set("toDate", toDate);
      const res = await fetch(`/api/wellbeing/feedback?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load feedback");
      return res.json();
    },
  });

  const { data: analyticsList = [], isLoading: analyticsLoading } = useQuery<FeedbackRow[]>({
    queryKey: ["/api/wellbeing/feedback", "analytics"],
    queryFn: async () => {
      const res = await fetch("/api/wellbeing/feedback", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load feedback");
      return res.json();
    },
    enabled: activeTab === "analytics",
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      status,
      responseToFeedback,
    }: {
      id: string;
      status?: string;
      responseToFeedback?: string;
    }) => {
      const res = await fetch(`/api/wellbeing/feedback/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status, responseToFeedback }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Update failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wellbeing/feedback"] });
      toast({ title: "Feedback updated" });
      setDetailOpen(false);
      setSelectedFeedback(null);
    },
    onError: (err: Error) => {
      toast({ title: err.message, variant: "destructive" });
    },
  });

  const openDetail = (row: FeedbackRow) => {
    setSelectedFeedback(row);
    setDetailStatus(row.status || "new");
    setDetailResponse(row.responseToFeedback || "");
    setDetailOpen(true);
  };

  const handleSaveDetail = () => {
    if (!selectedFeedback) return;
    updateMutation.mutate({
      id: selectedFeedback.id,
      status: detailStatus,
      responseToFeedback: detailResponse.trim() || undefined,
    });
  };

  const locationName = (row: FeedbackRow) =>
    row.location?.locationName ?? row.locationId ?? "—";

  return (
    <div className="p-4 sm:p-6 pb-20 md:pb-8 bg-uventorybiz-light-gray">
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2">
            <Link href="/wellbeing">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-semibold text-uventorybiz-navy flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Employee feedback
              </h1>
              <p className="text-sm text-uventorybiz-gray">
                Review anonymous and identified feedback from care locations.
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end ">
            <a
              href={publicFeedbackUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm uventorybiz-coral hover:underline"
            >
              <ExternalLink className="h-4 w-4" />
              Open public feedback form
            </a>
            <Link href="/wellbeing/feedback-poster">
              <Button
                variant="link"
                size="sm"
                className="h-7 px-0 text-[11px] uventorybiz-coral"
              >
                Open print poster page
              </Button>
            </Link>
          </div>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "results" | "analytics")}
          className="w-full"
        >
          <div className="tabs-list-custom mb-6">
            <TabsList className="grid w-full grid-cols-2 bg-transparent h-auto p-1 gap-1 lg:gap-2">
              <TabsTrigger
                value="results"
                className="tab-trigger-custom text-xs sm:text-sm"
              >
                <MessageSquare className="h-4 w-4 mr-1 sm:mr-2" />
                Results
              </TabsTrigger>
              <TabsTrigger
                value="analytics"
                className="tab-trigger-custom text-xs sm:text-sm"
              >
                <BarChart3 className="h-4 w-4 mr-1 sm:mr-2" />
                Analytics
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="results" className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Filters</CardTitle>
                <CardDescription>Filter by location, status, and date range.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-3">
                <Select value={locationFilter} onValueChange={setLocationFilter}>
                  <SelectTrigger className="w-[180px] h-9">
                    <SelectValue placeholder="Location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All locations</SelectItem>
                    {Array.isArray(careLocations) &&
                      careLocations.map((loc: { id: string; locationName: string }) => (
                        <SelectItem key={loc.id} value={loc.id}>
                          {loc.locationName}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px] h-9">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    {STATUS_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-[140px] h-9"
                  placeholder="From"
                />
                <Input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-[140px] h-9"
                  placeholder="To"
                />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12 text-uventorybiz-gray">
                    Loading…
                  </div>
                ) : feedbackList.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-uventorybiz-gray">
                    <MessageSquare className="h-10 w-10 mb-2 opacity-50" />
                    <p>No feedback yet.</p>
                    <p className="text-sm mt-1">Share the public form link to collect feedback.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Location</TableHead>
                          <TableHead>Anonymous</TableHead>
                          <TableHead>Overall (1–5)</TableHead>
                          <TableHead>Would recommend</TableHead>
                          <TableHead>Comments</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="w-[80px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {feedbackList.map((row) => (
                          <TableRow key={row.id}>
                            <TableCell className="whitespace-nowrap">
                              {row.feedbackDate || row.createdAt?.slice(0, 10) || "—"}
                            </TableCell>
                            <TableCell>{locationName(row)}</TableCell>
                            <TableCell>{row.anonymous ? "Yes" : "No"}</TableCell>
                            <TableCell>
                              {row.overallExperienceRating != null
                                ? row.overallExperienceRating
                                : "—"}
                            </TableCell>
                            <TableCell>
                              {row.wouldRecommend === true
                                ? "Yes"
                                : row.wouldRecommend === false
                                  ? "No"
                                  : "—"}
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate">
                              {row.freeTextFeedback || "—"}
                            </TableCell>
                            <TableCell>{statusBadge(row.status)}</TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openDetail(row)}
                                className="gap-1"
                              >
                                <Eye className="h-3 w-3" />
                                View
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="mt-4">
            <FeedbackAnalytics list={analyticsList} loading={analyticsLoading} locationName={locationName} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Detail modal */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Feedback details</DialogTitle>
            <DialogDescription>
              {selectedFeedback?.anonymous ? "Anonymous submission" : "Identified"} ·{" "}
              {selectedFeedback && locationName(selectedFeedback)}
            </DialogDescription>
          </DialogHeader>
          {selectedFeedback && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-xs text-gray-500">Date</span>
                  <p>
                    {selectedFeedback.feedbackDate ||
                      selectedFeedback.createdAt?.slice(0, 10) ||
                      "—"}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Location</span>
                  <p>{locationName(selectedFeedback)}</p>
                </div>
              </div>
              <div>
                <span className="text-xs font-medium text-gray-500">Ratings (1–5)</span>
                <div className="flex flex-wrap gap-2 mt-1">
                  {[
                    ["Overall", selectedFeedback.overallExperienceRating],
                    ["Staff courtesy", selectedFeedback.staffCourtesyRating],
                    ["Wait time", selectedFeedback.waitTimeRating],
                    ["Cleanliness", selectedFeedback.environmentCleanlinessRating],
                    ["Explanation", selectedFeedback.explanationClarityRating],
                    ["Safety", selectedFeedback.perceivedSafetyRating],
                  ].map(
                    ([label, val]) =>
                      val != null && (
                        <span key={label} className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                          {label}: {val}
                        </span>
                      )
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-xs text-gray-500">Would recommend</span>
                  <p>
                    {selectedFeedback.wouldRecommend === true
                      ? "Yes"
                      : selectedFeedback.wouldRecommend === false
                        ? "No"
                        : "—"}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Would return</span>
                  <p>
                    {selectedFeedback.wouldReturn === true
                      ? "Yes"
                      : selectedFeedback.wouldReturn === false
                        ? "No"
                        : "—"}
                  </p>
                </div>
              </div>
              {selectedFeedback.freeTextFeedback && (
                <div>
                  <span className="text-xs font-medium text-gray-500">Comments</span>
                  <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">
                    {selectedFeedback.freeTextFeedback}
                  </p>
                </div>
              )}
              <div className="space-y-2 pt-2 border-t">
                <Label className="text-xs">Status</Label>
                {canWrite ? (
                  <Select value={detailStatus} onValueChange={setDetailStatus}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-sm text-gray-700">
                    {STATUS_OPTIONS.find((o) => o.value === detailStatus)?.label ?? detailStatus}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Response to feedback (internal or to share)</Label>
                {canWrite ? (
                  <Textarea
                    value={detailResponse}
                    onChange={(e) => setDetailResponse(e.target.value)}
                    placeholder="Optional response or follow-up note"
                    rows={3}
                    className="resize-none"
                  />
                ) : (
                  <p className="text-sm text-gray-700 whitespace-pre-wrap min-h-[4rem]">
                    {detailResponse || "—"}
                  </p>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailOpen(false)}>
              Close
            </Button>
            {canWrite && (
              <Button
                onClick={handleSaveDetail}
                disabled={updateMutation.isPending || !selectedFeedback}
              >
                {updateMutation.isPending ? "Saving…" : "Save changes"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={`text-xs font-medium text-gray-700 ${className ?? ""}`}
      {...props}
    />
  );
}

const RATING_LABELS: Record<string, string> = {
  overallExperienceRating: "Overall experience",
  staffCourtesyRating: "Staff courtesy",
  waitTimeRating: "Timeliness of care",
  environmentCleanlinessRating: "Environment & cleanliness",
  explanationClarityRating: "Explanation clarity",
  perceivedSafetyRating: "Perceived safety",
};

// Basic Recharts-like color palette for multi-series bars
const CHART_COLORS = [
  "#8884d8",
  "#82ca9d",
  "#ffc658",
  "#ff8042",
  "#8dd1e1",
  "#a4de6c",
  "#d0ed57",
];

function FeedbackAnalytics({
  list,
  loading,
  locationName,
}: {
  list: FeedbackRow[];
  loading: boolean;
  locationName: (row: FeedbackRow) => string;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-uventorybiz-gray">
        <span>Loading analytics…</span>
      </div>
    );
  }

  const total = list.length;
  const byStatus: Record<string, number> = {};
  list.forEach((r) => {
    const s = r.status || "new";
    byStatus[s] = (byStatus[s] || 0) + 1;
  });

  const ratingKeys = Object.keys(RATING_LABELS) as (keyof FeedbackRow)[];
  const avgRatings: Record<string, { sum: number; count: number }> = {};
  ratingKeys.forEach((k) => (avgRatings[k] = { sum: 0, count: 0 }));
  list.forEach((r) => {
    ratingKeys.forEach((key) => {
      const val = r[key];
      if (typeof val === "number" && val >= 1 && val <= 5) {
        avgRatings[key].sum += val;
        avgRatings[key].count += 1;
      }
    });
  });

  const ratingChartData = ratingKeys.map((key) => {
    const { sum, count } = avgRatings[key];
    const avg = count > 0 ? sum / count : 0;
    return {
      key,
      label: RATING_LABELS[key],
      value: Number(avg.toFixed(2)),
    };
  });

  const ratingChartConfig = {
    value: {
      label: "Average rating",
      color: "#8884d8",
    },
  };

  const recommendYes = list.filter((r) => r.wouldRecommend === true).length;
  const recommendTotal = list.filter((r) => r.wouldRecommend !== null && r.wouldRecommend !== undefined).length;
  const returnYes = list.filter((r) => r.wouldReturn === true).length;
  const returnTotal = list.filter((r) => r.wouldReturn !== null && r.wouldReturn !== undefined).length;

  const byLocation: Record<string, number> = {};
  list.forEach((r) => {
    const name = locationName(r);
    byLocation[name] = (byLocation[name] || 0) + 1;
  });
  const locationEntries = Object.entries(byLocation).sort((a, b) => b[1] - a[1]);

  const locationChartData = locationEntries.map(([name, count]) => ({
    name: name || "—",
    count,
  }));

  const locationChartConfig = {
    count: {
      label: "Submissions",
      color: "#82ca9d",
    },
  };

  const byMonth: Record<string, number> = {};
  list.forEach((r) => {
    const date = r.feedbackDate || r.createdAt?.slice(0, 7);
    if (date) {
      const month = date.length >= 7 ? date.slice(0, 7) : date;
      byMonth[month] = (byMonth[month] || 0) + 1;
    }
  });
  const monthEntries = Object.entries(byMonth).sort();

  const monthChartData = monthEntries.map(([month, count]) => ({
    month,
    count,
  }));

  const monthChartConfig = {
    count: {
      label: "Submissions",
      color: "#ffc658",
    },
  };

  if (total === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-uventorybiz-gray">
          <TrendingUp className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>No feedback data yet.</p>
          <p className="text-sm mt-1">Analytics will appear once feedback is submitted.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardDescription>Total submissions</CardDescription>
            <BarChart3 className="h-4 w-4 text-uventorybiz-navy" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-uventorybiz-navy">{total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardDescription>New</CardDescription>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-amber-600">
              {byStatus["new"] ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardDescription>In progress</CardDescription>
            <MessageSquare className="h-4 w-4 text-sky-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-sky-600">
              {(byStatus["in_review"] ?? 0) + (byStatus["acknowledged"] ?? 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardDescription>Resolved / closed</CardDescription>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-emerald-600">
              {(byStatus["resolved"] ?? 0) + (byStatus["closed"] ?? 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Average ratings (1–5)
          </CardTitle>
          <CardDescription>From submissions that included each rating.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ChartContainer
            config={ratingChartConfig}
            className="w-full max-h-64"
          >
            <ReBarChart data={ratingChartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 10 }}
              />
              <YAxis
                domain={[0, 5]}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 10 }}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelKey="label"
                    nameKey="value"
                  />
                }
              />
              <Bar dataKey="value" radius={4}>
                {ratingChartData.map((entry, index) => (
                  <Cell
                    key={entry.key}
                    fill={CHART_COLORS[index % CHART_COLORS.length]}
                  />
                ))}
              </Bar>
            </ReBarChart>
          </ChartContainer>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {ratingKeys.map((key) => {
              const { sum, count } = avgRatings[key];
              const avg = count > 0 ? Math.round((sum / count) * 10) / 10 : null;
              return (
                <div key={key} className="space-y-1">
                  <p className="text-xs font-medium text-slate-600">
                    {RATING_LABELS[key]}
                  </p>
                  <p className="text-lg font-semibold">
                    {avg != null ? `${avg} / 5` : "—"}
                    {count > 0 && (
                      <span className="text-xs font-normal text-slate-500 ml-1">
                        (n={count})
                      </span>
                    )}
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Would recommend</CardTitle>
            <CardDescription>% who would recommend others to seek care here.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-emerald-600">
              {recommendTotal > 0 ? Math.round((recommendYes / recommendTotal) * 100) : 0}%
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {recommendYes} of {recommendTotal} responded Yes
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Would return</CardTitle>
            <CardDescription>% who would return if needed.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-emerald-600">
              {returnTotal > 0 ? Math.round((returnYes / returnTotal) * 100) : 0}%
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {returnYes} of {returnTotal} responded Yes
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">By location</CardTitle>
          <CardDescription>Submission count per care location.</CardDescription>
        </CardHeader>
        <CardContent>
          {locationEntries.length === 0 ? (
            <p className="text-sm text-slate-500">No location data.</p>
          ) : (
            <div className="space-y-4">
              <ChartContainer
                config={locationChartConfig}
                className="w-full max-h-64"
              >
                <RePieChart>
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        labelKey="name"
                        nameKey="count"
                      />
                    }
                  />
                  <Pie
                    data={locationChartData}
                    dataKey="count"
                    nameKey="name"
                    outerRadius="80%"
                    innerRadius="40%"
                    paddingAngle={2}
                  >
                    {locationChartData.map((entry, index) => (
                      <Cell
                        key={entry.name}
                        fill={CHART_COLORS[index % CHART_COLORS.length]}
                      />
                    ))}
                  </Pie>
                </RePieChart>
              </ChartContainer>

              <div className="space-y-2">
                {locationEntries.map(([name, count]) => (
                  <div
                    key={name}
                    className="flex items-center justify-between gap-4 py-1 border-b border-slate-100 last:border-0"
                  >
                    <span className="text-sm font-medium truncate">
                      {name || "—"}
                    </span>
                    <span className="text-sm text-slate-600 shrink-0">
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {monthEntries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Submissions over time</CardTitle>
            <CardDescription>Count by month.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <ChartContainer
                config={monthChartConfig}
                className="w-full max-h-64"
              >
                <ReLineChart data={monthChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 10 }}
                  />
                  <YAxis
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 10 }}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        labelKey="month"
                        nameKey="count"
                      />
                    }
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="hsl(var(--chart-4))"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </ReLineChart>
              </ChartContainer>

              <div className="space-y-2">
                {monthEntries.map(([month, count]) => (
                  <div
                    key={month}
                    className="flex items-center justify-between gap-4 py-1 border-b border-slate-100 last:border-0"
                  >
                    <span className="text-sm font-medium">{month}</span>
                    <span className="text-sm text-slate-600">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Insights & Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-uventorybiz-navy" />
            Key insights & recommendations
          </CardTitle>
          <CardDescription>
            Quick takeaways from recent feedback to guide follow-up actions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="list-disc pl-4 space-y-1 text-sm text-slate-700">
            {(() => {
              const insights: string[] = [];
              const overall = avgRatings["overallExperienceRating"];
              const overallAvg =
                overall && overall.count > 0
                  ? overall.sum / overall.count
                  : null;
              const recRate =
                recommendTotal > 0
                  ? Math.round((recommendYes / recommendTotal) * 100)
                  : 0;
              const retRate =
                returnTotal > 0
                  ? Math.round((returnYes / returnTotal) * 100)
                  : 0;

              if (overallAvg != null) {
                if (overallAvg >= 4.5) {
                  insights.push(
                    "Overall experience scores are very strong. Keep reinforcing what’s working well in your care processes."
                  );
                } else if (overallAvg >= 3.5) {
                  insights.push(
                    "Overall experience is generally positive, but there is room to further improve the employee journey."
                  );
                } else {
                  insights.push(
                    "Overall experience scores are moderate/low. Consider a focused review of employee flow and communication."
                  );
                }
              }

              if (recRate || retRate) {
                insights.push(
                  `About ${recRate}% would recommend this facility and ${retRate}% would return if needed—monitor these over time as top-line satisfaction indicators.`
                );
              }

              const wait = avgRatings["waitTimeRating"];
              if (wait && wait.count > 0) {
                const waitAvg = wait.sum / wait.count;
                if (waitAvg < 3.5) {
                  insights.push(
                    "Timeliness of care is a concern. Review staffing, triage, and appointment flow to reduce perceived wait times."
                  );
                } else if (waitAvg >= 4.2) {
                  insights.push(
                    "Timeliness of care is rated highly. Maintain current scheduling and triage approaches."
                  );
                }
              }

              const env = avgRatings["environmentCleanlinessRating"];
              if (env && env.count > 0) {
                const envAvg = env.sum / env.count;
                if (envAvg < 4) {
                  insights.push(
                    "Environment & cleanliness scores suggest an opportunity to strengthen housekeeping and visible cleanliness standards."
                  );
                }
              }

              if (!insights.length) {
                insights.push(
                  "Feedback volume is still low. Encourage staff to share the public feedback link more widely to build a stronger signal."
                );
              }

              return insights.map((text, idx) => <li key={idx}>{text}</li>);
            })()}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

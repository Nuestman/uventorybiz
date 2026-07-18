import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Download, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Activity,
  Users,
  CalendarIcon,
  BarChart3,
  Filter,
  Droplets
} from "lucide-react";
import { format, subDays, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { cn } from "@/lib/utils";

interface TestAnalytics {
  drugTests: {
    total: number;
    positive: number;
    negative: number;
    pending: number;
    byType: Record<string, number>;
    byReason: Record<string, number>;
  };
  alcoholTests: {
    total: number;
    positive: number;
    negative: number;
    pending: number;
    byType: Record<string, number>;
    byReason: Record<string, number>;
  };
  hydrationTests: {
    total: number;
    adequate: number;
    dehydrated: number;
    pending: number;
  };
  compliance: {
    scheduledTests: number;
    completedTests: number;
    missedTests: number;
    complianceRate: number;
  };
  trends: {
    monthlyTests: Array<{ month: string; drug: number; alcohol: number; hydration: number }>;
    positiveRateTrend: Array<{ month: string; rate: number }>;
  };
}

export default function TestingReports() {
  const [location, navigate] = useLocation();
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: subMonths(new Date(), 3),
    to: new Date(),
  });
  const [reportType, setReportType] = useState<"summary" | "detailed" | "compliance">("summary");
  const [testTypeFilter, setTestTypeFilter] = useState<"all" | "drug" | "alcohol" | "hydration">("all");
  const [activeTab, setActiveTab] = useState("overview");

  // Listen for sidebar tab navigation
  useEffect(() => {
    const handleTabNavigate = (e: CustomEvent) => {
      setActiveTab(e.detail.tabValue);
    };
    window.addEventListener('sidebar-tab-navigate', handleTabNavigate as EventListener);
    
    // Check URL hash on mount
    const hash = window.location.hash.replace('#', '');
    if (hash && ['overview', 'drug-tests', 'alcohol-tests', 'hydration-tests', 'compliance'].includes(hash)) {
      setActiveTab(hash);
    }

    return () => {
      window.removeEventListener('sidebar-tab-navigate', handleTabNavigate as EventListener);
    };
  }, []);

  // Fetch analytics data
  const { data: analytics, isLoading: analyticsLoading } = useQuery<TestAnalytics>({
    queryKey: ["/api/testing/analytics"],
  });

  const { data: drugTests = [] } = useQuery<any[]>({
    queryKey: ["/api/drug-tests"],
  });

  const { data: alcoholTests = [] } = useQuery<any[]>({
    queryKey: ["/api/alcohol-tests"],
  });

  const { data: hydrationTests = [] } = useQuery<any[]>({
    queryKey: ["/api/hydration-tests"],
  });

  const { data: programs = [] } = useQuery<any[]>({
    queryKey: ["/api/testing-programs"],
  });

  // Calculate key metrics
  const totalTests = (analytics?.drugTests?.total || 0) + (analytics?.alcoholTests?.total || 0) + (analytics?.hydrationTests?.total || 0);
  const positiveTests = (analytics?.drugTests?.positive || 0) + (analytics?.alcoholTests?.positive || 0);
  const positiveRate = totalTests > 0 ? ((positiveTests / totalTests) * 100).toFixed(1) : "0.0";
  const complianceRate = analytics?.compliance?.complianceRate || 0;

  // Filter tests by date range
  const filterByDateRange = (tests: any[]) => {
    return tests.filter(test => {
      const dateStr = test.scheduledDate || test.testDate || test.collectionDate;
      if (!dateStr) return false;
      const testDate = new Date(dateStr);
      if (isNaN(testDate.getTime())) return false;
      return testDate >= dateRange.from && testDate <= dateRange.to;
    });
  };

  const filteredDrugTests = filterByDateRange(drugTests);
  const filteredAlcoholTests = filterByDateRange(alcoholTests);
  const filteredHydrationTests = filterByDateRange(hydrationTests);

  // Calculate filtered statistics
  const filteredStats = {
    drug: {
      total: filteredDrugTests.length,
      positive: filteredDrugTests.filter(t => t.testResult === "positive" || t.testResult === "non-negative").length,
      negative: filteredDrugTests.filter(t => t.testResult === "negative").length,
      pending: filteredDrugTests.filter(t => !t.testResult || t.testResult === "pending").length,
    },
    alcohol: {
      total: filteredAlcoholTests.length,
      positive: filteredAlcoholTests.filter(t => t.testResult === "positive" || t.testResult === "non-negative").length,
      negative: filteredAlcoholTests.filter(t => t.testResult === "negative").length,
      pending: filteredAlcoholTests.filter(t => !t.testResult || t.testResult === "pending").length,
    },
    hydration: {
      total: filteredHydrationTests.length,
      adequate: filteredHydrationTests.filter(t => t.hydrationLevel === "adequate").length,
      dehydrated: filteredHydrationTests.filter(t => t.hydrationLevel && t.hydrationLevel !== "adequate").length,
      pending: filteredHydrationTests.filter(t => !t.hydrationLevel).length,
    },
  };

  // Export to CSV
  const exportToCSV = () => {
    const csvData = [];
    
    // Headers
    csvData.push(["Test Type", "Test Number", "Employee", "Date", "Result", "Reason", "Status"].join(","));
    
    // Drug tests
    filteredDrugTests.forEach(test => {
      csvData.push([
        "Drug",
        test.testNumber,
        test.employeeName || test.employeeNumber || test.employeeId,
        test.collectionDate || test.scheduledDate,
        test.testResult || "Pending",
        test.testReason,
        test.status
      ].join(","));
    });
    
    // Alcohol tests
    filteredAlcoholTests.forEach(test => {
      csvData.push([
        "Alcohol",
        test.testNumber,
        test.employeeName || test.employeeNumber || test.employeeId,
        test.testDate || test.scheduledDate,
        test.testResult || "Pending",
        test.testReason,
        test.status
      ].join(","));
    });
    
    // Hydration tests
    filteredHydrationTests.forEach(test => {
      csvData.push([
        "Hydration",
        test.testNumber,
        test.employeeName || test.employeeNumber || test.employeeId,
        test.testDate || test.scheduledDate,
        test.hydrationLevel || "Pending",
        test.testReason,
        test.status
      ].join(","));
    });

    const blob = new Blob([csvData.join("\n")], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `testing-report-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 pb-20 md:pb-8 bg-uventorybiz-light-gray">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Testing Reports & Analytics
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Comprehensive insights and compliance reporting for drug, alcohol & hydration testing
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportToCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={() => window.print()}>
            <FileText className="h-4 w-4 mr-2" />
            Print Report
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Report Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Date Range */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Date Range</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(dateRange.from, "PPP")} - {format(dateRange.to, "PPP")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <div className="p-3 space-y-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => setDateRange({ from: subDays(new Date(), 7), to: new Date() })}
                    >
                      Last 7 Days
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => setDateRange({ from: subDays(new Date(), 30), to: new Date() })}
                    >
                      Last 30 Days
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => setDateRange({ from: subMonths(new Date(), 3), to: new Date() })}
                    >
                      Last 3 Months
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => setDateRange({ 
                        from: startOfMonth(new Date()), 
                        to: endOfMonth(new Date()) 
                      })}
                    >
                      This Month
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Test Type Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Test Type</label>
              <Select value={testTypeFilter} onValueChange={(value: any) => setTestTypeFilter(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All Tests" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tests</SelectItem>
                  <SelectItem value="drug">Drug Tests Only</SelectItem>
                  <SelectItem value="alcohol">Alcohol Tests Only</SelectItem>
                  <SelectItem value="hydration">Hydration Tests Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Report Type */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Report Type</label>
              <Select value={reportType} onValueChange={(value: any) => setReportType(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Summary" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="summary">Summary Report</SelectItem>
                  <SelectItem value="detailed">Detailed Report</SelectItem>
                  <SelectItem value="compliance">Compliance Report</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tests</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredStats.drug.total + filteredStats.alcohol.total + filteredStats.hydration.total}</div>
            <p className="text-xs text-muted-foreground">
              Drug: {filteredStats.drug.total} | Alcohol: {filteredStats.alcohol.total} | Hydration: {filteredStats.hydration.total}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Positive Rate</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {((filteredStats.drug.positive + filteredStats.alcohol.positive) / 
                (filteredStats.drug.total + filteredStats.alcohol.total || 1) * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {filteredStats.drug.positive + filteredStats.alcohol.positive} positive results
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Compliance Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{complianceRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {analytics?.compliance?.completedTests || 0} of {analytics?.compliance?.scheduledTests || 0} scheduled
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Programs</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{programs.filter(p => p.active).length}</div>
            <p className="text-xs text-muted-foreground">
              {programs.length} total programs
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="tabs-list-custom mb-6">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5 bg-transparent h-auto p-1 gap-1 lg:gap-2">
            <TabsTrigger value="overview" className="tab-trigger-custom flex items-center justify-center gap-2 text-xs sm:text-sm">
              <BarChart3 className="h-4 w-4 mr-1 sm:mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="drug-tests" className="tab-trigger-custom text-xs sm:text-sm">Drug Tests</TabsTrigger>
            <TabsTrigger value="alcohol-tests" className="tab-trigger-custom text-xs sm:text-sm">Alcohol Tests</TabsTrigger>
            <TabsTrigger value="hydration-tests" className="tab-trigger-custom text-xs sm:text-sm">Hydration Tests</TabsTrigger>
            <TabsTrigger value="compliance" className="tab-trigger-custom text-xs sm:text-sm">Compliance</TabsTrigger>
          </TabsList>
        </div>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Test Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Test Distribution by Type</CardTitle>
                <CardDescription>Breakdown of all testing activities</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center">
                    <div className="w-full">
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium">Drug Tests</span>
                        <span className="text-sm text-gray-500">{filteredStats.drug.total}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                        <div 
                          className="bg-blue-600 h-2.5 rounded-full" 
                          style={{ 
                            width: `${(filteredStats.drug.total / (filteredStats.drug.total + filteredStats.alcohol.total + filteredStats.hydration.total || 1)) * 100}%` 
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <div className="w-full">
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium">Alcohol Tests</span>
                        <span className="text-sm text-gray-500">{filteredStats.alcohol.total}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                        <div 
                          className="bg-purple-600 h-2.5 rounded-full" 
                          style={{ 
                            width: `${(filteredStats.alcohol.total / (filteredStats.drug.total + filteredStats.alcohol.total + filteredStats.hydration.total || 1)) * 100}%` 
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <div className="w-full">
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium">Hydration Tests</span>
                        <span className="text-sm text-gray-500">{filteredStats.hydration.total}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                        <div 
                          className="bg-cyan-600 h-2.5 rounded-full" 
                          style={{ 
                            width: `${(filteredStats.hydration.total / (filteredStats.drug.total + filteredStats.alcohol.total + filteredStats.hydration.total || 1)) * 100}%` 
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Test Results Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Test Results Summary</CardTitle>
                <CardDescription>Outcomes across all testing</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="font-medium">Negative Results</span>
                    </div>
                    <span className="text-xl font-bold text-green-600">
                      {filteredStats.drug.negative + filteredStats.alcohol.negative}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                      <span className="font-medium">Positive Results</span>
                    </div>
                    <span className="text-xl font-bold text-red-600">
                      {filteredStats.drug.positive + filteredStats.alcohol.positive}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Activity className="h-5 w-5 text-yellow-600" />
                      <span className="font-medium">Pending Results</span>
                    </div>
                    <span className="text-xl font-bold text-yellow-600">
                      {filteredStats.drug.pending + filteredStats.alcohol.pending + filteredStats.hydration.pending}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Test Reason Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Tests by Reason</CardTitle>
              <CardDescription>Understanding why tests are conducted</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(
                  [...filteredDrugTests, ...filteredAlcoholTests, ...filteredHydrationTests]
                    .reduce((acc: Record<string, number>, test) => {
                      const reason = test.testReason || "unknown";
                      acc[reason] = (acc[reason] || 0) + 1;
                      return acc;
                    }, {})
                )
                  .sort(([, a], [, b]) => b - a)
                  .map(([reason, count]) => (
                    <div key={reason} className="flex items-center justify-between">
                      <span className="text-sm capitalize">
                        {reason.replace(/_/g, " ")}
                      </span>
                      <div className="flex items-center gap-3">
                        <div className="w-32 bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{
                              width: `${(count / (filteredStats.drug.total + filteredStats.alcohol.total + filteredStats.hydration.total || 1)) * 100}%`,
                            }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium w-12 text-right">{count}</span>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Drug Tests Tab */}
        <TabsContent value="drug-tests">
          <Card>
            <CardHeader>
              <CardTitle>Drug Testing Analytics</CardTitle>
              <CardDescription>Detailed insights on drug screening results</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 border rounded-lg">
                    <div className="text-sm text-gray-500">Total Drug Tests</div>
                    <div className="text-3xl font-bold mt-1">{filteredStats.drug.total}</div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="text-sm text-gray-500">Positive Results</div>
                    <div className="text-3xl font-bold mt-1 text-red-600">{filteredStats.drug.positive}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {((filteredStats.drug.positive / (filteredStats.drug.total || 1)) * 100).toFixed(1)}% positive rate
                    </div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="text-sm text-gray-500">Negative Results</div>
                    <div className="text-3xl font-bold mt-1 text-green-600">{filteredStats.drug.negative}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {((filteredStats.drug.negative / (filteredStats.drug.total || 1)) * 100).toFixed(1)}% negative rate
                    </div>
                  </div>
                </div>

                {/* Drug Test Types */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Specimen Types Used</h3>
                  <div className="space-y-2">
                    {Object.entries(
                      filteredDrugTests.reduce((acc: Record<string, number>, test) => {
                        const type = test.specimenType || "unknown";
                        acc[type] = (acc[type] || 0) + 1;
                        return acc;
                      }, {})
                    ).map(([type, count]) => (
                      <div key={type} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                        <span className="capitalize">{type}</span>
                        <Badge variant="secondary">{count} tests</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Alcohol Tests Tab */}
        <TabsContent value="alcohol-tests">
          <Card>
            <CardHeader>
              <CardTitle>Alcohol Testing Analytics</CardTitle>
              <CardDescription>Detailed insights on alcohol screening results</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 border rounded-lg">
                    <div className="text-sm text-gray-500">Total Alcohol Tests</div>
                    <div className="text-3xl font-bold mt-1">{filteredStats.alcohol.total}</div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="text-sm text-gray-500">Positive Results</div>
                    <div className="text-3xl font-bold mt-1 text-red-600">{filteredStats.alcohol.positive}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {((filteredStats.alcohol.positive / (filteredStats.alcohol.total || 1)) * 100).toFixed(1)}% positive rate
                    </div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="text-sm text-gray-500">Negative Results</div>
                    <div className="text-3xl font-bold mt-1 text-green-600">{filteredStats.alcohol.negative}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {((filteredStats.alcohol.negative / (filteredStats.alcohol.total || 1)) * 100).toFixed(1)}% negative rate
                    </div>
                  </div>
                </div>

                {/* Testing Methods */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Testing Methods Used</h3>
                  <div className="space-y-2">
                    {Object.entries(
                      filteredAlcoholTests.reduce((acc: Record<string, number>, test) => {
                        const device = test.testingDevice || "unknown";
                        acc[device] = (acc[device] || 0) + 1;
                        return acc;
                      }, {})
                    ).map(([device, count]) => (
                      <div key={device} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                        <span className="capitalize">{device.replace(/_/g, " ")}</span>
                        <Badge variant="secondary">{count} tests</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Hydration Tests Tab */}
        <TabsContent value="hydration-tests">
          <Card>
            <CardHeader>
              <CardTitle>Hydration Testing Analytics</CardTitle>
              <CardDescription>Personnel hydration monitoring insights</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 border rounded-lg">
                    <div className="text-sm text-gray-500">Total Hydration Tests</div>
                    <div className="text-3xl font-bold mt-1">{filteredStats.hydration.total}</div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="text-sm text-gray-500">Adequate Hydration</div>
                    <div className="text-3xl font-bold mt-1 text-green-600">{filteredStats.hydration.adequate}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {((filteredStats.hydration.adequate / (filteredStats.hydration.total || 1)) * 100).toFixed(1)}% adequate
                    </div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="text-sm text-gray-500">Dehydrated</div>
                    <div className="text-3xl font-bold mt-1 text-orange-600">{filteredStats.hydration.dehydrated}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {((filteredStats.hydration.dehydrated / (filteredStats.hydration.total || 1)) * 100).toFixed(1)}% dehydrated
                    </div>
                  </div>
                </div>

                {/* Test Locations */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Test Locations</h3>
                  <div className="space-y-2">
                    {Object.entries(
                      filteredHydrationTests.reduce((acc: Record<string, number>, test) => {
                        const location = test.testLocation || "unknown";
                        acc[location] = (acc[location] || 0) + 1;
                        return acc;
                      }, {})
                    ).map(([location, count]) => (
                      <div key={location} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                        <span className="capitalize">{location.replace(/_/g, " ")}</span>
                        <Badge variant="secondary">{count} tests</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Compliance Tab */}
        <TabsContent value="compliance">
          <Card>
            <CardHeader>
              <CardTitle>Compliance Metrics</CardTitle>
              <CardDescription>Program adherence and completion rates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Overall Compliance</span>
                      <Badge variant={complianceRate >= 90 ? "default" : "destructive"}>
                        {complianceRate.toFixed(1)}%
                      </Badge>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3 dark:bg-gray-700">
                      <div
                        className={cn(
                          "h-3 rounded-full",
                          complianceRate >= 90 ? "bg-green-600" : "bg-red-600"
                        )}
                        style={{ width: `${complianceRate}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      {analytics?.compliance?.completedTests || 0} completed / {analytics?.compliance?.scheduledTests || 0} scheduled
                    </p>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Missed Tests</span>
                      <Badge variant="destructive">{analytics?.compliance?.missedTests || 0}</Badge>
                    </div>
                    <p className="text-sm text-gray-600">
                      {analytics?.compliance?.missedTests || 0} scheduled tests were not completed on time
                    </p>
                  </div>
                </div>

                {/* Program Compliance */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Active Testing Programs</h3>
                  <div className="space-y-3">
                    {programs.filter(p => p.active).map((program: any) => (
                      <div key={program.id} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">{program.programName}</h4>
                            <p className="text-sm text-gray-500 capitalize">
                              {program.programType?.replace(/_/g, " ")} • {program.testingFrequency}
                            </p>
                          </div>
                          <Badge variant={program.active ? "default" : "secondary"}>
                            {program.active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Key Insights & Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Key Insights & Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* High Positive Rate Warning */}
            {((filteredStats.drug.positive + filteredStats.alcohol.positive) / (filteredStats.drug.total + filteredStats.alcohol.total || 1)) > 0.05 && (
              <div className="flex gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-red-900 dark:text-red-100">Elevated Positive Test Rate</h4>
                  <p className="text-sm text-red-800 dark:text-red-200">
                    The positive test rate ({((filteredStats.drug.positive + filteredStats.alcohol.positive) / (filteredStats.drug.total + filteredStats.alcohol.total || 1) * 100).toFixed(1)}%) 
                    is above the 5% threshold. Consider increasing random testing frequency and reviewing substance abuse policies.
                  </p>
                </div>
              </div>
            )}

            {/* Good Compliance */}
            {complianceRate >= 90 && (
              <div className="flex gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-green-900 dark:text-green-100">Excellent Compliance</h4>
                  <p className="text-sm text-green-800 dark:text-green-200">
                    Your testing program has a {complianceRate.toFixed(1)}% compliance rate, which exceeds industry standards. 
                    Continue monitoring and maintain current protocols.
                  </p>
                </div>
              </div>
            )}

            {/* Low Testing Volume */}
            {(filteredStats.drug.total + filteredStats.alcohol.total + filteredStats.hydration.total) < 10 && (
              <div className="flex gap-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <Activity className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-yellow-900 dark:text-yellow-100">Low Testing Volume</h4>
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    Only {filteredStats.drug.total + filteredStats.alcohol.total + filteredStats.hydration.total} tests conducted in the selected period. 
                    Consider increasing testing frequency to maintain safety standards and regulatory compliance.
                  </p>
                </div>
              </div>
            )}

            {/* Hydration Concerns */}
            {filteredStats.hydration.dehydrated > (filteredStats.hydration.total * 0.3) && filteredStats.hydration.total > 0 && (
              <div className="flex gap-3 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                <Droplets className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-orange-900 dark:text-orange-100">Hydration Concerns</h4>
                  <p className="text-sm text-orange-800 dark:text-orange-200">
                    {((filteredStats.hydration.dehydrated / filteredStats.hydration.total) * 100).toFixed(0)}% of hydration tests 
                    showed dehydration. Review work conditions, water availability, and break schedules, especially for underground personnel.
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

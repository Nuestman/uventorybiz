import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  BookOpen,
  Search,
  FileText,
  TestTube2,
  Zap,
  Shield,
  BarChart3,
  Settings,
  Users,
  Database,
  Code,
  CheckCircle2,
  Info,
  AlertTriangle,
  Rocket,
  BookMarked,
  PlayCircle,
  FileSpreadsheet,
  ArrowLeft,
  Home,
  ExternalLink,
  Menu,
} from "lucide-react";
import { APP_VERSION } from "@/lib/appVersion";

import { BrandLogo } from "@/components/BrandLogo";

export default function Docs() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSection, setActiveSection] = useState("overview");
  // Sidebar is hidden by default on mobile, always visible on desktop
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const sections = [
    { id: "overview", label: "Overview", icon: BookOpen, category: "Getting Started" },
    { id: "getting-started", label: "Quick Start", icon: Rocket, category: "Getting Started" },
    { id: "testing-module", label: "Testing Module", icon: TestTube2, category: "Core Modules" },
    { id: "testing-quick-start", label: "Testing Quick Start", icon: PlayCircle, category: "Core Modules" },
    { id: "api-reference", label: "API Reference", icon: Code, category: "Developer" },
    { id: "user-management", label: "User Management", icon: Users, category: "Administration" },
    { id: "reports-analytics", label: "Reports & Analytics", icon: BarChart3, category: "Analytics" },
    { id: "security", label: "Security", icon: Shield, category: "Administration" },
    { id: "database", label: "Database", icon: Database, category: "Developer" },
    { id: "troubleshooting", label: "Troubleshooting", icon: Settings, category: "Support" }
  ];

  const renderContent = () => {
    switch (activeSection) {
      case "overview":
        return <OverviewSection />;
      case "getting-started":
        return <GettingStartedSection />;
      case "testing-module":
        return <TestingModuleSection />;
      case "testing-quick-start":
        return <TestingQuickStartSection />;
      case "api-reference":
        return <APIReferenceSection />;
      case "user-management":
        return <UserManagementSection />;
      case "reports-analytics":
        return <ReportsAnalyticsSection />;
      case "security":
        return <SecuritySection />;
      case "database":
        return <DatabaseSection />;
      case "troubleshooting":
        return <TroubleshootingSection />;
      default:
        return <OverviewSection />;
    }
  };

  const filteredSections = sections.filter(section =>
    section.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedSections = filteredSections.reduce((acc, section) => {
    if (!acc[section.category]) {
      acc[section.category] = [];
    }
    acc[section.category].push(section);
    return acc;
  }, {} as Record<string, typeof sections>);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Common sticky header with sidebar toggle */}
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white/95 backdrop-blur">
        <div className="px-4 lg:px-8 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {/* Sidebar toggler on mobile/tablet only */}
            <Button
              variant="outline"
              size="icon"
              className="shrink-0 lg:hidden"
              onClick={() => setSidebarOpen((open) => !open)}
              aria-label={sidebarOpen ? "Hide documentation navigation" : "Show documentation navigation"}
            >
              <Menu className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-3 min-w-0">
              <BrandLogo variant="full" alt="uventorybiz" className="h-7 w-auto shrink-0" />
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm lg:text-base font-semibold text-gray-900 truncate">
                  Docs
                </span>
                <span className="hidden sm:inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                  v{APP_VERSION}
                </span>
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 shrink-0"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden xs:inline">Back</span>
          </Button>
        </div>
      </header>

      {/* Body: sidebar + main content */}
      <div className="flex-1 flex flex-col lg:flex-row gap-6 px-4 lg:px-8 py-4 lg:py-6 relative">
        {/* Mobile overlay for click-outside-to-close (below header) */}
        {sidebarOpen && (
          <div
            className="fixed inset-x-0 bottom-0 top-[3.25rem] z-20 bg-black/30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar: slides over content on mobile (below header), sticky column on desktop */}
        <aside
          className={`
            border border-gray-200 bg-gray-50/95 flex flex-col rounded-lg shadow-sm
            transform transition-transform duration-200
            ${
              sidebarOpen
                ? "fixed left-0 right-auto z-30 w-72 max-w-full translate-x-0 pointer-events-auto top-[3.25rem] bottom-0"
                : "fixed left-0 right-auto z-30 w-72 max-w-full -translate-x-full pointer-events-none top-[3.25rem] bottom-0"
            }
            lg:sticky lg:top-[3.25rem] lg:self-start lg:w-72 lg:z-auto lg:translate-x-0 lg:pointer-events-auto
          `}
        >
          {/* Scrollable body: search + nav share space and flex against footer */}
          <div className="flex-1 flex flex-col min-h-0">
            {/* Search */}
            <div className="p-4 border-b border-gray-200 bg-white rounded-t-lg">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search docs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-white border-gray-300 focus:border-uventorybiz-coral focus:ring-uventorybiz-coral"
                />
              </div>
            </div>

            {/* Navigation */}
            <ScrollArea className="flex-1 p-4">
              <nav className="space-y-6">
                {Object.entries(groupedSections).map(([category, items]) => (
                  <div key={category}>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-2">
                      {category}
                    </h3>
                    <div className="space-y-0.5">
                      {items.map((section) => {
                        const Icon = section.icon;
                        return (
                          <button
                            key={section.id}
                            onClick={() => {
                              setActiveSection(section.id);
                              // On mobile, close the sidebar after selecting a section
                              setSidebarOpen(false);
                            }}
                            className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                              activeSection === section.id
                                ? "bg-uventorybiz-coral text-white font-medium"
                                : "text-gray-700 hover:bg-gray-100"
                            }`}
                          >
                            <Icon className="h-4 w-4 flex-shrink-0" />
                            <span className="truncate">{section.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </nav>
            </ScrollArea>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 bg-white rounded-b-lg">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              onClick={() => window.history.back()}
            >
              <Home className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1">
          <div className="max-w-4xl pb-8">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
}

// Overview Section
function OverviewSection() {
  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <BookOpen className="h-8 w-8 text-uventorybiz-coral" />
          <h2 className="text-3xl font-bold text-gray-900">Welcome to uventorybiz</h2>
        </div>
        <p className="text-lg text-gray-600">Your comprehensive business management system for multi-site operations</p>
      </div>

      <Separator />

      <div>
        <h3 className="text-xl font-semibold mb-3 text-gray-900">What is uventorybiz?</h3>
        <p className="text-gray-700 leading-relaxed">
          uventorybiz is a comprehensive business management system designed for companies with multiple sites.
          It provides a complete suite of tools for managing inventory, point of sale, employees, incidents,
          fleet, drug & alcohol testing, and compliance tracking.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-uventorybiz-coral" />
              Core Features
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2.5 text-sm text-gray-700">
              <li>• Inventory &amp; Point of Sale</li>
              <li>• Employee &amp; Customer Records</li>
              <li>• Incident Reporting &amp; Follow-up</li>
              <li>• Drug, Alcohol & Hydration Testing</li>
              <li>• Operational Duty Management</li>
              <li>• Reports & Analytics Dashboard</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="h-5 w-5 text-uventorybiz-navy" />
              Enterprise Ready
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2.5 text-sm text-gray-700">
              <li>• Multi-tenant Architecture</li>
              <li>• Role-based Access Control</li>
              <li>• Comprehensive Audit Logging</li>
              <li>• GDPR & Regulatory Compliance</li>
              <li>• Super Admin Management</li>
              <li>• Professional Email Integration</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Zap className="h-5 w-5 text-uventorybiz-coral" />
          Quick Navigation
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Button variant="outline" className="justify-start h-auto py-3">
            <div className="flex items-start gap-3">
              <Rocket className="h-5 w-5 text-uventorybiz-coral mt-0.5" />
              <div className="text-left">
                <div className="font-medium">Getting Started</div>
                <div className="text-xs text-gray-600">Quick setup guide</div>
              </div>
            </div>
          </Button>
          <Button variant="outline" className="justify-start h-auto py-3">
            <div className="flex items-start gap-3">
              <TestTube2 className="h-5 w-5 text-uventorybiz-coral mt-0.5" />
              <div className="text-left">
                <div className="font-medium">Testing Module</div>
                <div className="text-xs text-gray-600">D&A&H testing docs</div>
              </div>
            </div>
          </Button>
          <Button variant="outline" className="justify-start h-auto py-3">
            <div className="flex items-start gap-3">
              <Code className="h-5 w-5 text-uventorybiz-coral mt-0.5" />
              <div className="text-left">
                <div className="font-medium">API Reference</div>
                <div className="text-xs text-gray-600">REST API docs</div>
              </div>
            </div>
          </Button>
          <Button variant="outline" className="justify-start h-auto py-3">
            <div className="flex items-start gap-3">
              <BarChart3 className="h-5 w-5 text-uventorybiz-coral mt-0.5" />
              <div className="text-left">
                <div className="font-medium">Analytics</div>
                <div className="text-xs text-gray-600">Reports & insights</div>
              </div>
            </div>
          </Button>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-3">System Status</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
            <CheckCircle2 className="h-6 w-6 text-green-600" />
            <div>
              <div className="font-medium text-green-900">Production Ready</div>
              <div className="text-sm text-green-700">99% Complete</div>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <FileText className="h-6 w-6 text-blue-600" />
            <div>
              <div className="font-medium text-blue-900">Documentation</div>
              <div className="text-sm text-blue-700">Comprehensive</div>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-lg border border-purple-200">
            <Users className="h-6 w-6 text-purple-600" />
            <div>
              <div className="font-medium text-purple-900">Multi-Tenant</div>
              <div className="text-sm text-purple-700">Fully Isolated</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Getting Started Section
function GettingStartedSection() {
  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <Rocket className="h-8 w-8 text-uventorybiz-coral" />
          <h2 className="text-3xl font-bold text-gray-900">Getting Started</h2>
        </div>
        <p className="text-lg text-gray-600">Quick setup guide to get you up and running</p>
      </div>

      <Separator />

      <div className="space-y-6">
        <div className="flex gap-4 p-6 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex-shrink-0 w-10 h-10 bg-uventorybiz-coral text-white rounded-full flex items-center justify-center font-bold text-lg">
            1
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg mb-2">Access the System</h3>
            <p className="text-gray-700 mb-3">
              Log in to uventorybiz using your email and password. If you don't have an account, 
              contact your system administrator for registration.
            </p>
            <div className="bg-white p-3 rounded border border-gray-300 font-mono text-sm text-gray-800">
              https://uventorybiz.com/login
            </div>
          </div>
        </div>

        <div className="flex gap-4 p-6 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex-shrink-0 w-10 h-10 bg-uventorybiz-coral text-white rounded-full flex items-center justify-center font-bold text-lg">
            2
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg mb-2">Configure Your Profile</h3>
            <p className="text-gray-700 mb-3">
              Set up your profile by adding your photo, contact information, and preferences.
            </p>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Upload profile photo
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Update contact information
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Set notification preferences
              </li>
            </ul>
          </div>
        </div>

        <div className="flex gap-4 p-6 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex-shrink-0 w-10 h-10 bg-uventorybiz-coral text-white rounded-full flex items-center justify-center font-bold text-lg">
            3
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg mb-2">Explore the Dashboard</h3>
            <p className="text-gray-700 mb-3">
              Familiarize yourself with the main dashboard and navigation menu.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              <div className="p-3 bg-white rounded border border-gray-300 font-medium">📊 Dashboard</div>
              <div className="p-3 bg-white rounded border border-gray-300 font-medium">👥 Employees</div>
              <div className="p-3 bg-white rounded border border-gray-300 font-medium">📅 Appointments</div>
              <div className="p-3 bg-white rounded border border-gray-300 font-medium">🧪 Testing</div>
            </div>
          </div>
        </div>

        <div className="flex gap-4 p-6 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex-shrink-0 w-10 h-10 bg-uventorybiz-coral text-white rounded-full flex items-center justify-center font-bold text-lg">
            4
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg mb-2">Start Using Key Features</h3>
            <p className="text-gray-700 mb-3">Begin with the most common tasks:</p>
            <ul className="space-y-2 text-sm text-gray-700">
              <li><strong>Add an Employee:</strong> Go to Employees → New Employee</li>
              <li><strong>Schedule Appointment:</strong> Go to Appointments → New Appointment</li>
              <li><strong>Record Test Result:</strong> Go to Testing → Record Test Results</li>
              <li><strong>Report Incident:</strong> Go to Incidents → New Incident</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-5">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="font-semibold text-blue-900 mb-1">Need Help?</h4>
            <p className="text-sm text-blue-800">
              For additional assistance, refer to the specific module documentation or contact support at 
              <strong className="ml-1">support@uventorybiz.com</strong>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Testing Module Section
function TestingModuleSection() {
  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <TestTube2 className="h-8 w-8 text-uventorybiz-coral" />
          <h2 className="text-3xl font-bold text-gray-900">Drug, Alcohol & Hydration Testing</h2>
        </div>
        <p className="text-lg text-gray-600">Comprehensive testing system documentation</p>
      </div>

      <Separator />

      <div>
        <h3 className="text-xl font-semibold mb-3 text-gray-900">Overview</h3>
        <p className="text-gray-700 leading-relaxed">
          The Drug, Alcohol & Hydration Testing Module is a comprehensive solution for managing substance 
          testing and hydration monitoring in business operations. It ensures regulatory compliance, personnel 
          safety, and operational efficiency through systematic testing protocols.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Drug Testing</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1.5 text-gray-700">
              <li>• 6-panel screening</li>
              <li>• DrugCheck 3000</li>
              <li>• Chain of custody</li>
              <li>• MRO review</li>
            </ul>
          </CardContent>
        </Card>
        
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Alcohol Testing</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1.5 text-gray-700">
              <li>• Breathalyzer testing</li>
              <li>• BAC level tracking</li>
              <li>• Confirmation tests</li>
              <li>• Observation period</li>
            </ul>
          </CardContent>
        </Card>
        
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Hydration Testing</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1.5 text-gray-700">
              <li>• Specific gravity</li>
              <li>• Hydration levels</li>
              <li>• Heat illness prevention</li>
              <li>• Underground monitoring</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <div>
        <h3 className="text-xl font-semibold mb-4 text-gray-900">Key Features</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-5 bg-gray-50 rounded-lg border border-gray-200">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-uventorybiz-coral" />
              Complete CRUD Operations
            </h4>
            <ul className="text-sm space-y-1 text-gray-700">
              <li>• Create, Read, Update, Delete tests</li>
              <li>• Edit modals with prepopulated data</li>
              <li>• Dynamic form fields</li>
              <li>• Validation and error handling</li>
            </ul>
          </div>

          <div className="p-5 bg-gray-50 rounded-lg border border-gray-200">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-uventorybiz-coral" />
              Audit Logging
            </h4>
            <ul className="text-sm space-y-1 text-gray-700">
              <li>• Complete edit history</li>
              <li>• Original data snapshots</li>
              <li>• User tracking</li>
              <li>• Regulatory compliance</li>
            </ul>
          </div>

          <div className="p-5 bg-gray-50 rounded-lg border border-gray-200">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-uventorybiz-coral" />
              Testing Programs
            </h4>
            <ul className="text-sm space-y-1 text-gray-700">
              <li>• Random selection</li>
              <li>• Pre-employment screening</li>
              <li>• Post-incident testing</li>
              <li>• Department targeting</li>
            </ul>
          </div>

          <div className="p-5 bg-gray-50 rounded-lg border border-gray-200">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-uventorybiz-coral" />
              Reports & Analytics
            </h4>
            <ul className="text-sm space-y-1 text-gray-700">
              <li>• Comprehensive insights</li>
              <li>• Compliance tracking</li>
              <li>• Smart recommendations</li>
              <li>• CSV export</li>
            </ul>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-xl font-semibold mb-4 text-gray-900">Test Protocols</h3>
        
        <div className="space-y-4">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TestTube2 className="h-5 w-5 text-uventorybiz-coral" />
                Drug Testing Protocol
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">6-Panel Screening</h4>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">COC (Cocaine)</Badge>
                  <Badge variant="outline">OPI (Opiates)</Badge>
                  <Badge variant="outline">THC (Cannabis)</Badge>
                  <Badge variant="outline">AMP (Amphetamines)</Badge>
                  <Badge variant="outline">MET (Methamphetamines)</Badge>
                  <Badge variant="outline">BZO (Benzodiazepines)</Badge>
                </div>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Test Results</h4>
                <div className="flex flex-wrap gap-2">
                  <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Negative</Badge>
                  <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Positive</Badge>
                  <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">Non-Negative</Badge>
                  <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Dilute</Badge>
                  <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">Invalid</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TestTube2 className="h-5 w-5 text-uventorybiz-coral" />
                Alcohol Testing Protocol
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-sm space-y-2 text-gray-700">
                <li><strong>Breathalyzer:</strong> Immediate BAC reading</li>
                <li><strong>Confirmation Test:</strong> Secondary verification if positive</li>
                <li><strong>Observation Period:</strong> 15-minute pre-test waiting period</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TestTube2 className="h-5 w-5 text-uventorybiz-coral" />
                Hydration Testing Protocol
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-700 mb-3">
                Urine specific gravity is measured to assess hydration status (normal range: 1.005-1.030)
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-3">
                  <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Well Hydrated</Badge>
                  <span className="text-gray-600">1.005-1.015</span>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Moderate</Badge>
                  <span className="text-gray-600">1.016-1.025</span>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">Dehydrated</Badge>
                  <span className="text-gray-600">1.026-1.030</span>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Severe</Badge>
                  <span className="text-gray-600">&gt;1.030</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div>
        <h3 className="text-xl font-semibold mb-3 text-gray-900">Test Status Workflow</h3>
        <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
          <div className="flex flex-wrap items-center gap-3 justify-center">
            <Badge className="bg-blue-600 text-white hover:bg-blue-600 px-4 py-2">Scheduled</Badge>
            <span className="text-gray-400 text-xl">→</span>
            <Badge className="bg-yellow-600 text-white hover:bg-yellow-600 px-4 py-2">Collected</Badge>
            <span className="text-gray-400 text-xl">→</span>
            <Badge className="bg-orange-600 text-white hover:bg-orange-600 px-4 py-2">In Lab</Badge>
            <span className="text-gray-400 text-xl">→</span>
            <Badge className="bg-purple-600 text-white hover:bg-purple-600 px-4 py-2">Results Pending</Badge>
            <span className="text-gray-400 text-xl">→</span>
            <Badge className="bg-green-600 text-white hover:bg-green-600 px-4 py-2">Completed</Badge>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-xl font-semibold mb-4 text-gray-900">Regulatory Compliance</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Standards</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  Workplace Safety Regulations
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  Occupational Safety & Health
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  Company D&A Policies
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Audit & Documentation</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  Complete audit trail
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  Chain of custody tracking
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  Exportable reports (CSV)
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Testing Quick Start Section
function TestingQuickStartSection() {
  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <PlayCircle className="h-8 w-8 text-uventorybiz-coral" />
          <h2 className="text-3xl font-bold text-gray-900">Testing Quick Start</h2>
        </div>
        <p className="text-lg text-gray-600">Get up and running in 5 minutes</p>
      </div>

      <Separator />

      <div>
        <h3 className="text-xl font-semibold mb-4 text-gray-900">Step 1: Access the Testing Module</h3>
        <ol className="space-y-3 text-gray-700">
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 w-7 h-7 bg-uventorybiz-coral text-white rounded-full flex items-center justify-center text-sm font-bold">1</span>
            <span>Log into uventorybiz</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 w-7 h-7 bg-uventorybiz-coral text-white rounded-full flex items-center justify-center text-sm font-bold">2</span>
            <span>Click <strong>"Testing"</strong> in the sidebar navigation</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 w-7 h-7 bg-uventorybiz-coral text-white rounded-full flex items-center justify-center text-sm font-bold">3</span>
            <span>You'll see the Testing Dashboard with tabs: Overview, Performed Tests, Scheduled Tests, Programs</span>
          </li>
        </ol>
      </div>

      <div>
        <h3 className="text-xl font-semibold mb-4 text-gray-900">Common Tasks</h3>

        <div className="space-y-4">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                Record a Test Result (2 minutes)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-2 text-sm text-gray-700">
                <li>1. Click <strong>"Record Test Results"</strong> button</li>
                <li>2. Select test type: Drug / Alcohol / Hydration</li>
                <li>3. Fill in: employee, date & time, location, tester, results</li>
                <li>4. Add notes (optional)</li>
                <li>5. Click <strong>"Submit Test Result"</strong></li>
              </ol>
              <div className="mt-3 p-3 bg-green-50 rounded border border-green-200">
                <p className="text-sm text-green-800">
                  <strong>Result:</strong> Test immediately appears in "Performed Tests" tab ✅
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-blue-600" />
                Schedule a Test (3 minutes)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-2 text-sm text-gray-700">
                <li>1. Click <strong>"Schedule Tests"</strong> button</li>
                <li>2. Select test type tab</li>
                <li>3. Fill in: employee, program, reason, date & time, site, collector</li>
                <li>4. Click <strong>"Schedule Test"</strong></li>
              </ol>
              <div className="mt-3 p-3 bg-blue-50 rounded border border-blue-200">
                <p className="text-sm text-blue-800">
                  <strong>Result:</strong> Test appears in "Scheduled Tests" tab 📅
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-orange-600" />
                Edit a Test (1 minute)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-2 text-sm text-gray-700">
                <li>1. Find the test in either tab</li>
                <li>2. Click the <strong>"Edit"</strong> button</li>
                <li>3. Update the fields</li>
                <li>4. Click <strong>"Save Changes"</strong></li>
              </ol>
              <div className="mt-3 p-3 bg-orange-50 rounded border border-orange-200">
                <p className="text-sm text-orange-800">
                  <strong>Note:</strong> All edits are logged for compliance 📋
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-purple-600" />
                View Reports & Analytics (2 minutes)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-2 text-sm text-gray-700">
                <li>1. Click <strong>"Reports & Analytics"</strong> in Testing sidebar</li>
                <li>2. Select date range (Last 7/30/90 days, or Custom)</li>
                <li>3. Filter by test type if needed</li>
                <li>4. Review metrics and compliance data</li>
                <li>5. Export to CSV or Print if needed</li>
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>

      <div>
        <h3 className="text-xl font-semibold mb-4 text-gray-900">Pro Tips</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              Status Changes
            </h4>
            <p className="text-sm text-gray-700">
              When changing status to "Completed", result fields automatically appear. Fill them before saving.
            </p>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <Info className="h-5 w-5 text-blue-600" />
              Filters
            </h4>
            <p className="text-sm text-gray-700">
              Use status filters to quickly find tests by status (All, Completed, Collected, In Lab).
            </p>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Programs
            </h4>
            <p className="text-sm text-gray-700">
              Set up testing programs once, then reuse them when scheduling tests.
            </p>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-purple-600" />
              Exports
            </h4>
            <p className="text-sm text-gray-700">
              Export data to CSV for external analysis or monthly compliance reports.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Placeholder sections
function APIReferenceSection() {
  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <Code className="h-8 w-8 text-uventorybiz-coral" />
          <h2 className="text-3xl font-bold text-gray-900">API Reference</h2>
        </div>
        <p className="text-lg text-gray-600">Complete REST API documentation</p>
      </div>
      <Separator />
      <p className="text-gray-700">Comprehensive API documentation coming soon...</p>
    </div>
  );
}

function UserManagementSection() {
  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <Users className="h-8 w-8 text-uventorybiz-coral" />
          <h2 className="text-3xl font-bold text-gray-900">User Management</h2>
        </div>
        <p className="text-lg text-gray-600">Managing users, roles, and permissions</p>
      </div>
      <Separator />
      <p className="text-gray-700">User management documentation coming soon...</p>
    </div>
  );
}

function ReportsAnalyticsSection() {
  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <BarChart3 className="h-8 w-8 text-uventorybiz-coral" />
          <h2 className="text-3xl font-bold text-gray-900">Reports & Analytics</h2>
        </div>
        <p className="text-lg text-gray-600">Data insights and reporting tools</p>
      </div>
      <Separator />
      <p className="text-gray-700">Reports & analytics documentation coming soon...</p>
    </div>
  );
}

function SecuritySection() {
  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <Shield className="h-8 w-8 text-uventorybiz-coral" />
          <h2 className="text-3xl font-bold text-gray-900">Security & Compliance</h2>
        </div>
        <p className="text-lg text-gray-600">Security features and compliance standards</p>
      </div>
      <Separator />
      <p className="text-gray-700">Security documentation coming soon...</p>
    </div>
  );
}

function DatabaseSection() {
  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <Database className="h-8 w-8 text-uventorybiz-coral" />
          <h2 className="text-3xl font-bold text-gray-900">Database Schema</h2>
        </div>
        <p className="text-lg text-gray-600">Database structure and relationships</p>
      </div>
      <Separator />
      <p className="text-gray-700">Database schema documentation coming soon...</p>
    </div>
  );
}

function TroubleshootingSection() {
  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <Settings className="h-8 w-8 text-uventorybiz-coral" />
          <h2 className="text-3xl font-bold text-gray-900">Troubleshooting</h2>
        </div>
        <p className="text-lg text-gray-600">Common issues and solutions</p>
      </div>
      <Separator />
      <p className="text-gray-700">Troubleshooting guide coming soon...</p>
    </div>
  );
}
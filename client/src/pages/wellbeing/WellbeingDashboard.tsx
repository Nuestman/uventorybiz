import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertTriangle,
  ArrowRight,
  ClipboardList,
  HeartHandshake,
  MessageSquare,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { caseHasWorkImpact, workFitnessCaseTypeLabel, formatMedicationNamesList, workFitnessAssessmentOutcomeDisplay, isWorkFitnessCaseReviewed } from "@shared/workFitness";

type FollowUpDashboardRow = {
  followUp: {
    id: string;
    reason: string;
    scheduledDate: string;
    status: string;
  };
  employee?: {
    firstName?: string | null;
    lastName?: string | null;
    employeeNumber?: string | null;
  } | null;
  company?: { name?: string | null } | null;
};

type WorkFitnessDashboardRow = {
  id: string;
  caseType: string;
  employeeId: string;
  status: string | null;
  fitnessOutcome?: string | null;
  fitnessImpact?: string | null;
  mayAffectDrugTest?: boolean | null;
  medications?: { medicationName: string }[];
  submittedAt?: string;
  createdAt?: string;
};

type FeedbackDashboardRow = {
  id: string;
  locationId: string;
  status: string | null;
  feedbackDate: string | null;
  freeTextFeedback: string | null;
  overallExperienceRating: number | null;
  createdAt: string;
};

export default function WellbeingDashboard() {
  const { user } = useAuth();
  const isReadOnly = user?.role === "operations";
  const { data: dueFollowUps = [], isLoading: loadingDue } = useQuery<FollowUpDashboardRow[]>({
    queryKey: ["/api/wellbeing/follow-ups", "dueOnly"],
    queryFn: async () => {
      const res = await fetch("/api/wellbeing/follow-ups?dueOnly=true");
      if (!res.ok) throw new Error("Failed to load follow-ups");
      return res.json();
    },
  });

  const { data: workFitnessCases = [], isLoading: loadingMeds } = useQuery<WorkFitnessDashboardRow[]>({
    queryKey: ["/api/wellbeing/work-fitness", "dashboard"],
    queryFn: async () => {
      const res = await fetch("/api/wellbeing/work-fitness");
      if (!res.ok) throw new Error("Failed to load work fitness cases");
      return res.json();
    },
  });

  const { data: feedback = [], isLoading: loadingFeedback } = useQuery<FeedbackDashboardRow[]>({
    queryKey: ["/api/wellbeing/feedback", "dashboard"],
    queryFn: async () => {
      const res = await fetch("/api/wellbeing/feedback");
      if (!res.ok) throw new Error("Failed to load feedback");
      return res.json();
    },
  });

  const dueCount = dueFollowUps.length;
  const medsUnderReview = workFitnessCases.filter((m) => !isWorkFitnessCaseReviewed(m.status)).length;
  const medsWithImpact = workFitnessCases.filter((m) => caseHasWorkImpact(m)).length;

  const feedbackTotal = feedback.length;
  const feedbackNew = feedback.filter((f) => f.status === "new").length;

  const recentDue = [...dueFollowUps]
    .sort((a, b) => a.followUp.scheduledDate.localeCompare(b.followUp.scheduledDate))
    .slice(0, 5);

  const recentFeedback = [...feedback]
    .sort(
      (a, b) =>
        (b.feedbackDate || b.createdAt || "").localeCompare(
          a.feedbackDate || a.createdAt || ""
        )
    )
    .slice(0, 4);

  const recentMeds = [...workFitnessCases]
    .sort((a, b) => (b.submittedAt || b.createdAt || "").localeCompare(a.submittedAt || a.createdAt || ""))
    .slice(0, 4);

  const loadingAny = loadingDue || loadingMeds || loadingFeedback;

  return (
    <div className="p-4 sm:p-6 pb-20 md:pb-8 bg-uventorybiz-light-gray">
      <div className="max-w-6xl mx-auto space-y-6">
        {isReadOnly && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
            You have read-only access to employee wellbeing data. To add or edit follow-ups, medications, or feedback responses, contact a staff or admin user.
          </div>
        )}
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-semibold text-uventorybiz-navy flex items-center gap-2">
              <HeartHandshake className="h-7 w-7 text-uventorybiz-navy" />
              Employee wellbeing hub
            </h1>
            <p className="text-sm text-uventorybiz-gray">
              Snapshot of follow-ups, work fitness reviews, and feedback for your workforce.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/wellbeing/follow-ups">
              <Button variant="outline" size="sm" className="gap-1">
                <ClipboardList className="h-4 w-4" />
                Follow-ups
              </Button>
            </Link>
            <Link href="/wellbeing/work-fitness">
              <Button variant="outline" size="sm" className="gap-1">
                <ShieldCheck className="h-4 w-4" />
                Work fitness
              </Button>
            </Link>
            <Link href="/wellbeing/feedback">
              <Button variant="outline" size="sm" className="gap-1">
                <MessageSquare className="h-4 w-4" />
                Feedback
              </Button>
            </Link>
          </div>
        </div>

        {/* Key metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Follow-ups due</CardTitle>
              <AlertTriangle className="h-5 w-5 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold text-amber-600">
                {loadingDue ? "…" : dueCount}
              </div>
              <p className="text-xs text-uventorybiz-gray mt-1">
                Overdue and due today.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Fitness reviews pending</CardTitle>
              <Stethoscope className="h-5 w-5 text-sky-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold text-sky-600">
                {loadingMeds ? "…" : medsUnderReview}
              </div>
              <p className="text-xs text-uventorybiz-gray mt-1">
                Cases awaiting wellbeing assessment.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Feedback (new)</CardTitle>
              <MessageSquare className="h-5 w-5 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold text-emerald-600">
                {loadingFeedback ? "…" : feedbackNew}
              </div>
              <p className="text-xs text-uventorybiz-gray mt-1">
                {loadingFeedback
                  ? ""
                  : `${feedbackTotal} total submissions so far.`}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Two-column detail: follow-ups and insights */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <ClipboardList className="h-4 w-4" />
                  Due follow-ups
                </CardTitle>
                <CardDescription>
                  Next actions for employees needing check-ins.
                </CardDescription>
              </div>
              <Link href="/wellbeing/follow-ups">
                <Button variant="ghost" size="sm" className="gap-1 text-uventorybiz-navy">
                  View all
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              {loadingDue ? (
                <div className="py-6 text-center text-uventorybiz-gray text-sm">Loading…</div>
              ) : recentDue.length === 0 ? (
                <div className="py-6 text-center text-uventorybiz-gray text-sm">
                  No follow-ups are currently due.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40%]">Employee</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead className="w-[20%]">Scheduled</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentDue.map((row) => {
                      const emp = row.employee;
                      const name =
                        emp && (emp.firstName || emp.lastName)
                          ? `${emp.firstName ?? ""} ${emp.lastName ?? ""}`.trim()
                          : emp?.employeeNumber || "Employee";
                      return (
                        <TableRow key={row.followUp.id}>
                          <TableCell className="text-sm">
                            <div className="font-medium">{name}</div>
                            {row.company?.name && (
                              <div className="text-xs text-uventorybiz-gray">
                                {row.company.name}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">
                            <span className="line-clamp-2">
                              {row.followUp.reason || "Follow-up"}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs text-uventorybiz-gray whitespace-nowrap">
                            {row.followUp.scheduledDate || "—"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" />
                  Work fitness impact
                </CardTitle>
                <CardDescription>
                  Cases where medications or side effects affect fitness for duty.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {loadingMeds ? (
                  <div className="py-4 text-sm text-uventorybiz-gray">Loading…</div>
                ) : (
                  <>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-semibold text-uventorybiz-navy">
                        {medsWithImpact}
                      </span>
                      <span className="text-xs text-uventorybiz-gray">
                        of {workFitnessCases.length} total cases
                      </span>
                    </div>
                    <div className="space-y-1">
                      {recentMeds.length === 0 ? (
                        <p className="text-xs text-uventorybiz-gray">
                          No recent work fitness cases.
                        </p>
                      ) : (
                        recentMeds.map((m) => (
                          <div
                            key={m.id}
                            className="flex items-center justify-between gap-3 border-b border-gray-100 pb-1 last:border-0"
                          >
                            <div>
                              <p className="text-sm font-medium">
                                {formatMedicationNamesList(m.medications ?? [])}
                              </p>
                              <p className="text-xs text-uventorybiz-gray">
                                {workFitnessCaseTypeLabel(m.caseType)} ·{" "}
                                {workFitnessAssessmentOutcomeDisplay(
                                  m.fitnessOutcome,
                                  m.status === "assessed" || m.status === "closed",
                                )}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    <Link href="/wellbeing/work-fitness">
                      <Button variant="link" size="sm" className="px-0 text-uventorybiz-navy">
                        Go to work fitness
                      </Button>
                    </Link>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Recent feedback
                </CardTitle>
                <CardDescription>
                  Latest comments from employees about their care experience.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {loadingFeedback ? (
                  <div className="py-4 text-sm text-uventorybiz-gray">Loading…</div>
                ) : recentFeedback.length === 0 ? (
                  <p className="text-xs text-uventorybiz-gray">
                    No feedback has been submitted yet.
                  </p>
                ) : (
                  recentFeedback.map((f) => (
                    <div
                      key={f.id}
                      className="border-b border-gray-100 pb-2 last:border-0"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <Badge
                          variant={f.status === "new" ? "destructive" : "secondary"}
                          className="text-[10px] px-1.5 py-0"
                        >
                          {f.status || "new"}
                        </Badge>
                        <span className="text-[11px] text-uventorybiz-gray">
                          {f.feedbackDate || f.createdAt?.slice(0, 10) || "—"}
                        </span>
                      </div>
                      <p className="text-xs text-gray-800 line-clamp-3">
                        {f.freeTextFeedback || "No comment text provided."}
                      </p>
                    </div>
                  ))
                )}
                <Link href="/wellbeing/feedback">
                  <Button variant="link" size="sm" className="px-0 text-uventorybiz-navy">
                    Go to feedback
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Wellbeing message / quick tip */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <HeartHandshake className="h-4 w-4 text-uventorybiz-navy" />
              Wellbeing message
            </CardTitle>
            <CardDescription>
              Use this space as a simple reminder for the team—no complex content
              management needed in Phase 1.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-800">
              “Every follow-up is an opportunity to prevent someone from falling
              through the cracks. Take a moment each day to review who is due,
              and reach out.” <a href="https://www.nusman.dev" target="_blank" rel="noopener noreferrer" className="text-uventorybiz-gray italic">- N. Usman, uventorybiz Developer</a>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

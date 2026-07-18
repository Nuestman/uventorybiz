import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MessageSquare, CheckCircle2, Loader2 } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";

/** Hardcoded fallback when public-context API fails or returns no locations. */
const LOCATION_OPTIONS = [
  { value: "Main store", label: "Main store" },
  { value: "Branch location", label: "Branch location" },
  { value: "Other", label: "Other" },
] as const;

/** Rating questions as full sentences (1 = poor, 5 = excellent). */
const RATING_QUESTIONS = [
  { key: "overallExperienceRating", question: "How would you rate your overall experience with the service you received?" },
  { key: "staffCourtesyRating", question: "How would you rate the courtesy and professionalism of the staff?" },
  { key: "waitTimeRating", question: "How would you rate the timeliness of service (e.g. waiting time, being seen on time)?" },
  { key: "environmentCleanlinessRating", question: "How would you rate the cleanliness of the environment and facilities?" },
  { key: "explanationClarityRating", question: "How clearly were your questions and next steps explained to you?" },
  { key: "perceivedSafetyRating", question: "How would you rate your feeling of safety during your visit?" },
  { key: "suppliesAndMedicationsRating", question: "Did the location have the necessary supplies and products for your needs?" },
] as const;

type PublicContext = {
  tenantId: string;
  tenantName: string;
  logoUrl: string | null;
  appName: string | null;
  locations: Array<{ id: string; name: string }>;
};

export default function PublicFeedbackForm() {
  const [context, setContext] = useState<PublicContext | null>(null);
  const [loadingContext, setLoadingContext] = useState(true);
  const [tenantIdFromUrl] = useState(() =>
    typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("tenantId") ?? "" : ""
  );
  const hasTenantInUrl = Boolean(tenantIdFromUrl?.trim());

  const [locationValue, setLocationValue] = useState("");
  const [locationOther, setLocationOther] = useState("");
  const [careMonthYear, setCareMonthYear] = useState("");
  const [wantContact, setWantContact] = useState(false);
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [overallExperienceRating, setOverallExperienceRating] = useState<number | "">("");
  const [staffCourtesyRating, setStaffCourtesyRating] = useState<number | "">("");
  const [waitTimeRating, setWaitTimeRating] = useState<number | "">("");
  const [environmentCleanlinessRating, setEnvironmentCleanlinessRating] = useState<number | "">("");
  const [explanationClarityRating, setExplanationClarityRating] = useState<number | "">("");
  const [perceivedSafetyRating, setPerceivedSafetyRating] = useState<number | "">("");
  const [suppliesAndMedicationsRating, setSuppliesAndMedicationsRating] = useState<number | "">("");
  const [wouldRecommend, setWouldRecommend] = useState<boolean | null>(null);
  const [wouldReturn, setWouldReturn] = useState<boolean | null>(null);
  const [freeTextFeedback, setFreeTextFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!hasTenantInUrl) {
      setLoadingContext(false);
      return;
    }
    const params = `?tenantId=${encodeURIComponent(tenantIdFromUrl.trim())}`;
    fetch(`/api/wellbeing/feedback/public-context${params}`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: PublicContext | null) => {
        setContext(data ?? null);
      })
      .catch(() => setContext(null))
      .finally(() => setLoadingContext(false));
  }, [hasTenantInUrl, tenantIdFromUrl]);

  const useFetchedLocations = Boolean(context?.locations?.length);
  const locationOptions = useFetchedLocations
    ? context!.locations.map((l) => ({ value: l.id, label: l.name }))
    : [...LOCATION_OPTIONS];

  const hasValidLocation = useFetchedLocations
    ? locationValue.length > 0
    : locationValue === "Other"
      ? locationOther.trim().length > 0
      : locationValue.length > 0;

  const submitLocationId = useFetchedLocations && locationValue ? locationValue : undefined;
  const submitLocationName = useFetchedLocations ? undefined : (locationValue === "Other" ? locationOther.trim() : locationValue);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasValidLocation) {
      setError(
        locationValue === "Other"
          ? "Please enter the location or store name."
          : "Please select a location."
      );
      return;
    }
    if (wantContact && !contactEmail.trim() && !contactPhone.trim()) {
      setError("Please provide at least an email or phone number if you would like to be contacted.");
      return;
    }
    setError("");
    setSubmitting(true);
    const body: Record<string, unknown> = {
      tenantId: context?.tenantId ?? undefined,
      wantContact,
      contactEmail: wantContact ? contactEmail.trim() || null : null,
      contactPhone: wantContact ? contactPhone.trim() || null : null,
      overallExperienceRating: overallExperienceRating === "" ? null : overallExperienceRating,
      staffCourtesyRating: staffCourtesyRating === "" ? null : staffCourtesyRating,
      waitTimeRating: waitTimeRating === "" ? null : waitTimeRating,
      environmentCleanlinessRating: environmentCleanlinessRating === "" ? null : environmentCleanlinessRating,
      explanationClarityRating: explanationClarityRating === "" ? null : explanationClarityRating,
      perceivedSafetyRating: perceivedSafetyRating === "" ? null : perceivedSafetyRating,
      suppliesAndMedicationsRating: suppliesAndMedicationsRating === "" ? null : suppliesAndMedicationsRating,
      wouldRecommend: wouldRecommend === null ? null : wouldRecommend,
      wouldReturn: wouldReturn === null ? null : wouldReturn,
      freeTextFeedback: freeTextFeedback.trim() || null,
    };
    if (submitLocationId) body.locationId = submitLocationId;
    if (submitLocationName) body.locationName = submitLocationName;
    if (careMonthYear.trim()) body.careMonthYear = careMonthYear.trim();

    fetch("/api/wellbeing/feedback/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
      .then((res) => {
        if (!res.ok)
          return res
            .json()
            .then((d) => Promise.reject(new Error(d.message || d.error || "Submit failed")));
        return res.json();
      })
      .then(() => setSubmitted(true))
      .catch((err) => setError(err.message || "Failed to submit feedback."))
      .finally(() => setSubmitting(false));
  };

  const brandName = context?.appName || context?.tenantName || "Care feedback";
  const logoUrl = context?.logoUrl || null;

  if (!hasTenantInUrl) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95">
          <div className="max-w-3xl mx-auto px-4 py-4">
            <BrandLogo variant="full" alt="uventorybiz" className="h-9 w-auto object-contain" />
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg">Feedback form</CardTitle>
              <CardDescription>
                This form must be opened from the link provided by your site or workplace. Ask your health team or HR for the correct feedback link—it will include your company or site name and take you to the right form.
              </CardDescription>
            </CardHeader>
          </Card>
        </main>
        <footer className="border-t border-slate-200 bg-white py-3 text-center text-xs text-slate-500">
          Powered by uventorybiz
        </footer>
      </div>
    );
  }

  if (hasTenantInUrl && loadingContext) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3 text-slate-600">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="text-sm">Loading…</span>
        </div>
      </div>
    );
  }

  if (hasTenantInUrl && !context) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95">
          <div className="max-w-3xl mx-auto px-4 py-4">
            <BrandLogo variant="full" alt="uventorybiz" className="h-9 w-auto object-contain" />
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg">Link invalid or site not set up</CardTitle>
              <CardDescription>
                This feedback link could not be loaded. It may be incorrect or the site may not be configured yet. Please use the link provided by your site or contact your site administrator.
              </CardDescription>
            </CardHeader>
          </Card>
        </main>
        <footer className="border-t border-slate-200 bg-white py-3 text-center text-xs text-slate-500">
          Powered by uventorybiz
        </footer>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95">
          <div className="max-w-3xl mx-auto px-4 py-6 flex flex-col items-center gap-2">
            <BrandLogo
              variant="full"
              src={logoUrl}
              alt={brandName}
              className="h-16 w-auto object-contain max-w-[220px]"
            />
            <span className="text-sm font-medium text-slate-600 truncate">
              {context?.tenantName || "Feedback"}
            </span>
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-lg">
            <CardHeader>
              <div className="flex items-center gap-2 text-emerald-600">
                <CheckCircle2 className="h-8 w-8 shrink-0" />
                <CardTitle>Thank you</CardTitle>
              </div>
              <CardDescription>
                {wantContact
                  ? "Your feedback has been submitted. We may contact you using the details you provided."
                  : "Your feedback has been submitted anonymously. We use it to improve our services."}
              </CardDescription>
            </CardHeader>
          </Card>
        </main>
        <footer className="border-t border-slate-200 bg-white py-3 text-center text-xs text-slate-500">
          Powered by uventorybiz
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95">
        <div className="max-w-3xl mx-auto px-4 py-6 flex flex-col items-center gap-2">
          <BrandLogo
            variant="full"
            src={logoUrl}
            alt={brandName}
            className="h-16 w-auto object-contain max-w-[220px]"
          />
          <span className="text-sm font-medium text-slate-600 truncate">
            {context?.tenantName || "Feedback"}
          </span>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg shadow-lg border-slate-200">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-2 text-slate-800">
            <MessageSquare className="h-6 w-6 text-uventorybiz-navy shrink-0" />
            <CardTitle className="text-xl">Employee Care Experience Feedback</CardTitle>
          </div>
          <CardDescription className="text-slate-600">
            {/* Share your experience at {context?.tenantName || "our facility"}. <br/> Your feedback helps us improve. You can submit anonymously or leave your contact details if you would like to be contacted. */}
            Share your experience at {context?.tenantName || "our facility"}. <br/> Your feedback helps us improve. <br/> You can submit anonymously or leave your contact details if you would like to be contacted.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label>Where did you receive care?</Label>
              <Select
                value={locationValue}
                onValueChange={(v) => {
                  setLocationValue(v);
                  if (v !== "Other") setLocationOther("");
                }}
                disabled={loadingContext && !context}
              >
                <SelectTrigger className="h-10">
                  <SelectValue
                    placeholder={
                      loadingContext && !context
                        ? "Loading…"
                        : useFetchedLocations
                          ? "Select location"
                          : "Select location"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {locationOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!useFetchedLocations && locationValue === "Other" && (
                <Input
                  value={locationOther}
                  onChange={(e) => setLocationOther(e.target.value)}
                  placeholder="Enter location or store name"
                  className="mt-1 h-10"
                />
              )}
            </div>

            <div className="space-y-1">
              <Label className="text-slate-700">
                When did you receive care at this facility? <span className="text-xs text-slate-500">(month and year)</span>
              </Label>
              <Input
                type="month"
                value={careMonthYear}
                onChange={(e) => setCareMonthYear(e.target.value)}
                className="h-10"
              />
              <p className="text-[11px] text-slate-500">
                If you are completing this later, choose the month and year when you received care.
              </p>
            </div>

            <div className="space-y-3">
              <Label className="text-slate-700">Ratings (1 = poor, 2 = fair, 3 = average, 4 = good, 5 = excellent)</Label>
              <div className="grid grid-cols-1 gap-4">
                {RATING_QUESTIONS.map(({ key, question }) => {
                  const value =
                    key === "overallExperienceRating" ? overallExperienceRating
                    : key === "staffCourtesyRating" ? staffCourtesyRating
                    : key === "waitTimeRating" ? waitTimeRating
                    : key === "environmentCleanlinessRating" ? environmentCleanlinessRating
                    : key === "explanationClarityRating" ? explanationClarityRating
                    : key === "perceivedSafetyRating" ? perceivedSafetyRating
                    : suppliesAndMedicationsRating;
                  const setter =
                    key === "overallExperienceRating" ? setOverallExperienceRating
                    : key === "staffCourtesyRating" ? setStaffCourtesyRating
                    : key === "waitTimeRating" ? setWaitTimeRating
                    : key === "environmentCleanlinessRating" ? setEnvironmentCleanlinessRating
                    : key === "explanationClarityRating" ? setExplanationClarityRating
                    : key === "perceivedSafetyRating" ? setPerceivedSafetyRating
                    : setSuppliesAndMedicationsRating;
                  return (
                    <div key={key} className="space-y-1">
                      <span className="text-sm text-slate-700">{question}</span>
                      <Select
                        value={value === "" ? "" : String(value)}
                        onValueChange={(v) => setter(v === "" ? "" : Number(v))}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="—" />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4, 5].map((n) => (
                            <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-sm text-slate-700">Would you recommend others to seek care here?</Label>
                <Select value={wouldRecommend === null ? "" : wouldRecommend ? "yes" : "no"} onValueChange={(v) => setWouldRecommend(v === "yes")}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-sm text-slate-700">Would you return if needed?</Label>
                <Select value={wouldReturn === null ? "" : wouldReturn ? "yes" : "no"} onValueChange={(v) => setWouldReturn(v === "yes")}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-slate-700">Do you have any suggestions for improving the services at this facility?</Label>
              <Textarea
                value={freeTextFeedback}
                onChange={(e) => setFreeTextFeedback(e.target.value)}
                placeholder="Share any specific frustrations, ideas, or suggestions."
                rows={3}
                className="resize-none"
              />
            </div>

            <div className="space-y-3 border-t border-slate-200 pt-4">
              <Label className="text-sm font-medium text-slate-700">Would you like to be contacted about your feedback?</Label>
              <Select value={wantContact ? "yes" : "no"} onValueChange={(v) => setWantContact(v === "yes")}>
                <SelectTrigger className="h-9 w-full max-w-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no">No — submit anonymously</SelectItem>
                  <SelectItem value="yes">Yes — I can provide my contact details</SelectItem>
                </SelectContent>
              </Select>
              {wantContact && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Email</Label>
                    <Input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="your@email.com" className="h-9" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Phone</Label>
                    <Input type="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="Phone number" className="h-9" />
                  </div>
                  <p className="text-xs text-slate-500 sm:col-span-2">Provide at least one so we can reach you if needed.</p>
                </div>
              )}
            </div>

            <Button type="submit" className="w-full h-10" disabled={submitting || !hasValidLocation}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Submitting…
                </>
              ) : (
                "Submit feedback"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
      </main>
      <footer className="border-t border-slate-200 bg-white py-3 text-center text-xs text-slate-500">
        Powered by uventorybiz
      </footer>
    </div>
  );
}

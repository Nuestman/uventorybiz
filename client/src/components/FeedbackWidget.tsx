import { useState } from "react";
import { Loader2, MessageCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export function FeedbackWidget() {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [email, setEmail] = useState("");
  const [context, setContext] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.location.pathname;
    }
    return '/';
  });
  const [uxRating, setUxRating] = useState<string>("");
  const [uiRating, setUiRating] = useState<string>("");
  const [navigationRating, setNavigationRating] = useState<string>("");
  const [performanceRating, setPerformanceRating] = useState<string>("");
  const [reliabilityRating, setReliabilityRating] = useState<string>("");
  const [areasUsed, setAreasUsed] = useState<string[]>([]);
  const [recommendation, setRecommendation] = useState<string>("");
  const { toast } = useToast();

  const likertOptions = [
    { value: "1", label: "1" },
    { value: "2", label: "2" },
    { value: "3", label: "3" },
    { value: "4", label: "4" },
    { value: "5", label: "5" },
  ];

  const toggleArea = (value: string) => {
    setAreasUsed((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const hasRatings =
      !!uxRating || !!uiRating || !!navigationRating || !!performanceRating || !!reliabilityRating;
    const hasNps = !!recommendation;
    const hasComment = feedback.trim().length > 0;

    if (!hasRatings && !hasNps && !hasComment) {
      console.warn("[FeedbackWidget] Submission blocked: no content provided");
      toast({
        title: "Nothing to send",
        description: "Please add at least a rating or a short comment before submitting.",
        variant: "destructive",
      });
      return;
    }

    const payload = {
      feedback,
      email,
      context,
      path: typeof window !== 'undefined' ? window.location.pathname : '/',
      uxRating: uxRating ? Number(uxRating) : null,
      uiRating: uiRating ? Number(uiRating) : null,
      navigationRating: navigationRating ? Number(navigationRating) : null,
      speedRating: performanceRating ? Number(performanceRating) : null,
      reliabilityRating: reliabilityRating ? Number(reliabilityRating) : null,
      npsScore: recommendation ? Number(recommendation) : null,
      areasUsed,
    };

    console.log("[FeedbackWidget] Submitting feedback", payload);

    setIsSubmitting(true);

    try {
      const res = await apiRequest("POST", "/api/feedback", payload);
      const body = await res.json().catch(() => null);
      console.log("[FeedbackWidget] Feedback submitted successfully", { status: res.status, body });

      toast({
        title: "Thank you!",
        description: "Your feedback has been submitted.",
      });
    } catch (error: any) {
      console.error("[FeedbackWidget] Failed to submit feedback", error);
      toast({
        title: "Could not submit feedback",
        description: error?.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
      setOpen(false);
      setFeedback("");
      setEmail("");
      setUxRating("");
      setUiRating("");
      setNavigationRating("");
      setPerformanceRating("");
      setReliabilityRating("");
      setAreasUsed([]);
      setRecommendation("");
      setContext(typeof window !== 'undefined' ? window.location.pathname : '/');
    }
  };

  return (
    <>
      {/* Vertical feedback tab — fixed to right edge */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="
          fixed right-0 top-1/2 z-[60] -translate-y-1/2
          flex flex-col items-center justify-center gap-2
          px-2 py-4 rounded-l-lg shadow-lg
          bg-[#142F5C] text-white
          hover:bg-[#1a3d75] transition-colors
          border border-r-0 border-white/10
        "
        aria-label="Send feedback about uventorybiz"
      >
        <MessageCircle className="h-4 w-4 shrink-0" aria-hidden />
        <span
          className="text-[11px] font-semibold uppercase tracking-[0.14em] [writing-mode:vertical-rl] rotate-180 select-none"
        >
          Feedback
        </span>
      </button>

      {/* Feedback dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Share your feedback</DialogTitle>
            <DialogDescription>
              Tell us what’s working well and what we can improve across uventorybiz, from registration to logout.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={handleSubmit}
            className="space-y-6 mt-2 overflow-y-auto pr-1"
          >
            {/* Quick UX/UI questionnaire */}
            <div className="space-y-3">
              <p className="text-sm font-semibold text-gray-800">
                How would you rate the following aspects of uventorybiz?
              </p>
              <div className="grid gap-3">
                {[
                  { label: "Overall ease of use (UX)", value: uxRating, setter: setUxRating },
                  { label: "Visual design & readability (UI)", value: uiRating, setter: setUiRating },
                  { label: "Navigation & information layout", value: navigationRating, setter: setNavigationRating },
                  { label: "Speed & responsiveness", value: performanceRating, setter: setPerformanceRating },
                  { label: "Stability (errors, crashes, glitches)", value: reliabilityRating, setter: setReliabilityRating },
                ].map((q) => (
                  <div key={q.label} className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-gray-700">
                      {q.label}
                    </label>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[11px] text-gray-500 min-w-[70px]">
                        Poor
                      </span>
                      <RadioGroup
                        className="flex justify-center gap-4"
                        value={q.value}
                        onValueChange={q.setter}
                      >
                        {likertOptions.map((opt) => (
                          <label
                            key={opt.value}
                            className="flex flex-col items-center gap-1 text-[11px] text-gray-600 cursor-pointer"
                          >
                            <RadioGroupItem value={opt.value} />
                            <span>{opt.label}</span>
                          </label>
                        ))}
                      </RadioGroup>
                      <span className="text-[11px] text-gray-500 min-w-[70px] text-right">
                        Excellent
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Areas used */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Which parts of the system did you interact with today?
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-700">
                {[
                  "Registration / Login",
                  "Dashboard",
                  "Customers / Suppliers",
                  "Appointments",
                  "Testing / D&A",
                  "Inventory & Equipment",
                  "Duty assignments / Operations",
                  "Admin / Super Admin",
                ].map((label) => (
                  <label key={label} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={areasUsed.includes(label)}
                      onCheckedChange={() => toggleArea(label)}
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Recommendation */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                How likely are you to recommend uventorybiz to a colleague?
              </label>
              <RadioGroup
                value={recommendation}
                onValueChange={setRecommendation}
                className="grid gap-2 sm:grid-cols-2 text-sm text-gray-700"
              >
                {[
                  { value: "1", label: "1–2: Not at all likely" },
                  { value: "3", label: "3–4: Somewhat likely" },
                  { value: "5", label: "5–6: Likely" },
                  { value: "7", label: "7–8: Very likely" },
                  { value: "9", label: "9–10: Extremely likely" },
                ].map((opt) => (
                  <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                    <RadioGroupItem value={opt.value} />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </RadioGroup>
            </div>

            {/* Open-ended experience */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Anything else you’d like to share?
              </label>
              <Textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Share any specific frustrations, ideas, or suggestions for improving UX/UI, workflows, or performance."
                className="min-h-[120px]"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Contact (optional)
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address if you’d like us to follow up"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Where were you in the system?
              </label>
              <Input
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="e.g. /records, /testing, registration page"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending...
                  </span>
                ) : (
                  "Submit feedback"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}


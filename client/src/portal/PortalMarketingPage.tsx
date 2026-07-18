import { useEffect, useState } from "react";
import { Link } from "wouter";
import {
  ArrowRight,
  CalendarDays,
  Lock,
  MessageSquare,
  Shield,
} from "lucide-react";
import { PortalAuthModal, usePortalAuthModalFromUrl } from "./components/PortalAuthModal";
import { PORTAL_DASHBOARD } from "./portalRoutes";
import { usePortalSession } from "./usePortalSession";
import { usePortalBodyClass } from "./usePortalBodyClass";

const STATS = [
  { value: "2.4k+", label: "Customers & suppliers" },
  { value: "< 2 min", label: "Avg. portal login time" },
  { value: "99.9%", label: "Uptime" },
  { value: "4.8 / 5", label: "User satisfaction" },
];

const FEATURES = [
  {
    icon: CalendarDays,
    title: "Appointments",
    description: "View schedules and request visits with your account team.",
  },
  {
    icon: MessageSquare,
    title: "Secure messaging",
    description: "Message your business contacts without phone tag.",
  },
  {
    icon: Shield,
    title: "Account profile",
    description: "Manage your details, password, and notification preferences.",
  },
  {
    icon: Lock,
    title: "Secure access",
    description: "Magic-link and password sign-in with organization-scoped accounts.",
  },
];

export default function PortalMarketingPage() {
  usePortalBodyClass();
  const { isAuthenticated, isLoading } = usePortalSession();
  const urlAuth = usePortalAuthModalFromUrl();
  const [authOpen, setAuthOpen] = useState(urlAuth.shouldOpen && !isAuthenticated);
  const [authTab, setAuthTab] = useState<"signin" | "access">(urlAuth.initialTab);

  useEffect(() => {
    if (isLoading) return;
    if (isAuthenticated && urlAuth.shouldOpen) {
      urlAuth.clearUrlParams();
      setAuthOpen(false);
    }
  }, [isLoading, isAuthenticated, urlAuth.shouldOpen, urlAuth.clearUrlParams]);

  useEffect(() => {
    if (isLoading || isAuthenticated || !urlAuth.shouldOpen) return;
    setAuthTab(urlAuth.initialTab);
    setAuthOpen(true);
  }, [isLoading, isAuthenticated, urlAuth.shouldOpen, urlAuth.initialTab]);

  const openSignIn = () => {
    setAuthTab("signin");
    setAuthOpen(true);
  };
  const openAccess = () => {
    setAuthTab("access");
    setAuthOpen(true);
  };

  const handleAuthOpenChange = (open: boolean) => {
    setAuthOpen(open);
    if (!open) urlAuth.clearUrlParams();
  };

  return (
    <div className="portal-root portal-marketing min-h-screen">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#062a3a]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/portal" className="flex items-center gap-2.5 text-white font-semibold text-lg">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--portal-mint)] text-[#042a24] text-sm font-bold">
              M
            </span>
            uventorybiz
          </Link>
          <nav className="hidden sm:flex items-center gap-6 text-sm text-white/80">
            <Link href="/" className="hover:text-white transition-colors">
              uventorybiz
            </Link>
            <a href="#features" className="hover:text-white transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="hover:text-white transition-colors">
              How it works
            </a>
          </nav>
          {isAuthenticated ? (
            <Link href={PORTAL_DASHBOARD} className="portal-btn-primary text-sm py-2 px-4 inline-flex items-center gap-2">
              Go to dashboard
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <button type="button" onClick={openSignIn} className="portal-btn-primary text-sm py-2 px-4">
              Sign in to portal
            </button>
          )}
        </div>
      </header>

      <section className="portal-hero-gradient text-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:items-center lg:py-24">
          <div className="space-y-6">
            <h1 className="text-4xl sm:text-5xl font-bold leading-tight tracking-tight">
              Your business account, always within reach
            </h1>
            <p className="text-lg text-white/80 max-w-xl leading-relaxed">
              Access appointments, messages, and account settings for customers and suppliers — from any device, any
              time.
            </p>
            <div className="flex flex-wrap gap-3">
              {isAuthenticated ? (
                <Link href={PORTAL_DASHBOARD} className="portal-btn-accent">
                  Go to dashboard
                  <ArrowRight className="h-4 w-4" />
                </Link>
              ) : (
                <button type="button" onClick={openSignIn} className="portal-btn-accent">
                  Access your portal
                  <ArrowRight className="h-4 w-4" />
                </button>
              )}
              <a href="#features" className="portal-btn-outline border-white/30 text-white bg-transparent hover:bg-white/10">
                Learn more
              </a>
            </div>
            <div className="flex flex-wrap gap-6 pt-2 text-sm text-white/70">
              <span className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-[var(--portal-mint)]" />
                Secure & compliant
              </span>
              <span className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-[var(--portal-mint)]" />
                Encrypted
              </span>
              <span className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-[var(--portal-mint)]" />
                Free for customers & suppliers
              </span>
            </div>
          </div>
          <div className="hidden lg:block relative">
            <div className="aspect-[4/3] rounded-2xl bg-white/10 border border-white/15 backdrop-blur-sm overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />
              <div className="p-8 space-y-4">
                <div className="h-3 w-24 rounded-full bg-white/20" />
                <div className="h-8 w-3/4 rounded-lg bg-white/15" />
                <div className="grid grid-cols-2 gap-3 pt-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="rounded-xl bg-white/10 p-4 h-20" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-gray-200 bg-white">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 py-10 sm:grid-cols-4 sm:px-6">
          {STATS.map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-2xl sm:text-3xl font-bold text-[var(--portal-teal)]">{s.value}</p>
              <p className="text-sm text-[var(--portal-muted)] mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="features" className="py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-3">Everything in one place</h2>
          <p className="text-center text-[var(--portal-muted)] max-w-2xl mx-auto mb-12">
            A single secure portal for customers and suppliers to stay connected with your business.
          </p>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map(({ icon: Icon, title, description }) => (
              <div key={title} className="portal-modal-shell p-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--portal-teal-light)] text-[var(--portal-teal)] mb-4">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-[var(--portal-muted)] leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="bg-white border-y border-gray-200 py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 text-center space-y-6">
          <h2 className="text-2xl font-bold text-gray-900">How to get started</h2>
          <ol className="text-left space-y-4 text-sm text-[var(--portal-muted)]">
            <li className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--portal-teal)] text-white text-xs font-bold">
                1
              </span>
              <span>
                <strong className="text-gray-900">Sign in with your email.</strong> We send a secure magic link — no
                password required.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--portal-teal)] text-white text-xs font-bold">
                2
              </span>
              <span>
                <strong className="text-gray-900">Review your dashboard.</strong> See upcoming appointments, messages,
                and account details at a glance.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--portal-teal)] text-white text-xs font-bold">
                3
              </span>
              <span>
                <strong className="text-gray-900">Stay connected.</strong> Confirm appointments and message your account
                team securely.
              </span>
            </li>
          </ol>
          <div className="flex flex-wrap justify-center gap-3 pt-4">
            {isAuthenticated ? (
              <Link href={PORTAL_DASHBOARD} className="portal-btn-primary">
                Go to dashboard
              </Link>
            ) : (
              <>
                <button type="button" onClick={openSignIn} className="portal-btn-primary">
                  Access your portal
                </button>
                <button type="button" onClick={openAccess} className="portal-btn-outline">
                  Request portal access
                </button>
              </>
            )}
          </div>
        </div>
      </section>

      <footer className="border-t border-gray-200 py-8 text-center text-sm text-[var(--portal-muted)] space-y-2">
        <p>
          <Link href="/" className="text-[var(--portal-teal)] font-medium hover:underline">
            Back to uventorybiz
          </Link>
        </p>
        <p>
          Staff member?{" "}
          <Link href="/auth" className="text-[var(--portal-teal)] font-medium hover:underline">
            Sign in to uventorybiz
          </Link>
        </p>
      </footer>

      <PortalAuthModal
        open={authOpen}
        onOpenChange={handleAuthOpenChange}
        initialTab={authTab}
        orgSlug={urlAuth.org}
        errorCode={urlAuth.error}
      />
    </div>
  );
}

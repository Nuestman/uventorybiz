import { Switch, Route, useLocation, Redirect } from "wouter";
import { useEffect, useLayoutEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import MainLayout from "@/components/MainLayout";
import SuperAdminLayout from "@/components/SuperAdminLayout";
import PublicLayout from "@/components/PublicLayout";
import { RequireRole } from "@/components/RequireRole";
import { RequireStaffAccess } from "@/components/RequireStaffAccess";
import { RequireFeature } from "@/components/RequireFeature";
import { RequireIncidentReportsAccess } from "@/components/RequireIncidentReportsAccess";
import { RequireOperationsReportsAccess } from "@/components/RequireOperationsReportsAccess";
import { RequireComplianceReportsAccess } from "@/components/RequireComplianceReportsAccess";
import { RequireReportsHubAccess } from "@/components/RequireReportsHubAccess";
import { getProtectedPaths, getPublicPaths } from "@/routes";
import { FeedbackWidget } from "@/components/FeedbackWidget";
import NotFound from "@/pages/not-found";
import AccessDenied from "@/pages/access-denied";
import Unauthorized from "@/pages/unauthorized";
import Landing from "@/pages/Landing";
import About from "@/pages/About";
import Contact from "@/pages/Contact";
import Features from "@/pages/Features";
import Privacy from "@/pages/Privacy";
import Terms from "@/pages/Terms";
import Security from "@/pages/Security";
import Changelog from "@/pages/Changelog";
import LegalHub from "@/pages/LegalHub";
import LegalDocument from "@/pages/LegalDocument";
import Dashboard from "@/pages/Dashboard";
import Appointments from "@/pages/Appointments";
import Incidents from "@/pages/Incidents";
import OperationalDuties from "@/pages/OperationalDuties";
import AmbulancesLegacyRedirect from "@/pages/Ambulances";
import AmbulanceDetailLegacyRedirect from "@/pages/AmbulanceDetail";
import AmbulanceUnitLegacyRedirect from "@/pages/AmbulanceUnitLegacyRedirect";
import FleetLegacyRedirect from "@/pages/fleet/FleetLegacyRedirect";
import FleetModule from "@/pages/fleet/FleetModule";
import FleetUnitDetail from "@/pages/fleet/FleetUnitDetail";
import FleetUnitPathRedirect from "@/pages/fleet/FleetUnitPathRedirect";
import BusinessAssetsPage from "@/pages/assets/BusinessAssetsPage";
import EquipmentTracking from "@/pages/EquipmentTracking";
import { RequireFleetAccess } from "@/components/RequireFleetAccess";
import AssignmentHistory from "@/pages/AssignmentHistory";
import ShiftReports from "@/pages/Reports";
import ShiftoverHome from "@/pages/shiftover/ShiftoverHome";
import OpenItemsPage from "@/pages/shiftover/OpenItemsPage";
import AuditTrail from "@/pages/AuditTrail";
import AuthPage from "@/pages/AuthPage";
import SuperAdminRegistration from "@/pages/super-admin/SuperAdminRegistration";
import Admin from "@/pages/Admin";
import SuperAdmin from "@/pages/super-admin/SuperAdmin";
import SuperAdminDashboard from "@/pages/super-admin/SuperAdminDashboard";
import SuperAdminSignedLegal from "@/pages/super-admin/SuperAdminSignedLegal";
import SuperAdminImpersonationLog from "@/pages/super-admin/SuperAdminImpersonationLog";
import SuperAdminSystemStatus from "@/pages/super-admin/SuperAdminSystemStatus";
import SuperAdminSecurity from "@/pages/super-admin/SuperAdminSecurity";
import SuperAdminGlobalAudit from "@/pages/super-admin/SuperAdminGlobalAudit";
import SuperAdminIntegrations from "@/pages/super-admin/SuperAdminIntegrations";
import SuperAdminBilling from "@/pages/super-admin/SuperAdminBilling";
import SuperAdminFeatureFlags from "@/pages/super-admin/SuperAdminFeatureFlags";
import Profile from "@/pages/Profile";
import Inventory from "@/pages/Inventory";
import InventoryCatalog from "@/pages/InventoryCatalog";
import StockTransfers from "@/pages/StockTransfers";
import PurchaseOrders from "@/pages/PurchaseOrders";
import Suppliers from "@/pages/Suppliers";
import Customers from "@/pages/Customers";
import PosPage from "@/pages/pos/PosPage";
import SalesHistoryPage from "@/pages/pos/SalesHistoryPage";
import OrdersPage from "@/pages/OrdersPage";
import InventoryTransactions from "@/pages/InventoryTransactions";
import TransactionHistory from "@/pages/TransactionHistory";
import InstantTestsPage from "@/pages/testing/InstantTestsPage";
import InstantTestForm from "@/pages/testing/InstantTestForm";
import ReportsHome from "@/pages/reports/ReportsHome";
import OverviewReportsPage from "@/pages/reports/OverviewReportsPage";
import IncidentReportsPage from "@/pages/reports/IncidentReportsPage";
import OperationsReportsPage from "@/pages/reports/OperationsReportsPage";
import ComplianceReportsPage from "@/pages/reports/ComplianceReportsPage";
import ActivateAccount from "@/pages/ActivateAccount";
import Docs from "@/pages/Docs";
import SopAdministration from "@/pages/SopAdministration";
import AdminLegalAgreements from "@/pages/AdminLegalAgreements";
import SOPLibrary from "@/pages/SOPLibrary";
import Settings from "@/pages/Settings";
import NotificationsPage from "@/pages/NotificationsPage";
import { TenantBranding } from "@/components/TenantBranding";
import { ConnectivityBanner } from "@/components/ConnectivityBanner";
import { runSyncOnce } from "@/lib/syncClient";
import { syncMessagingOutbox } from "@/lib/offlineMessaging";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import WellbeingDashboard from "@/pages/wellbeing/WellbeingDashboard";
import WellbeingFollowUps from "@/pages/wellbeing/WellbeingFollowUps";
import WellbeingWorkFitness from "@/pages/wellbeing/WellbeingWorkFitness";
import WellbeingFeedback from "@/pages/wellbeing/WellbeingFeedback";
import WellbeingFeedbackPoster from "@/pages/wellbeing/WellbeingFeedbackPoster";
import PublicFeedbackForm from "@/pages/PublicFeedbackForm";
import TicketsListPage from "@/pages/tickets/TicketsListPage";
import TicketNewPage from "@/pages/tickets/TicketNewPage";
import TicketDetailPage from "@/pages/tickets/TicketDetailPage";
import PortalLoginPage from "@/portal/PortalLoginPage";
import PortalMarketingPage from "@/portal/PortalMarketingPage";
import PortalProtected from "@/portal/PortalProtected";
import PortalLayout from "@/portal/PortalLayout";
import PortalHomePage from "@/portal/PortalHomePage";
import PortalProfilePage from "@/portal/PortalProfilePage";
import PortalAppointmentsPage from "@/portal/PortalAppointmentsPage";
import PortalShopPage from "@/portal/PortalShopPage";
import PortalOrdersPage from "@/portal/PortalOrdersPage";
import PortalSupportPage from "@/portal/PortalSupportPage";
import PortalSupplierOrdersPage from "@/portal/PortalSupplierOrdersPage";
import MessagesPage from "@/pages/MessagesPage";
import PortalMessagesPage from "@/portal/PortalMessagesPage";

function ProtectedRouteGuard() {
  const [location] = useLocation();
  const { isAuthenticated, isLoading, user } = useAuth();
  const queryClient = useQueryClient();
  const protectedPaths = getProtectedPaths();
  const publicPaths = getPublicPaths();

  useEffect(() => {
    if (isLoading) return;

    const isProtectedRoute = protectedPaths.some((route) =>
      location.startsWith(route),
    );

    const isPublicRoute = publicPaths.some(
      (route) => location === route || location.startsWith(route + "/"),
    );

    if (isProtectedRoute && !isAuthenticated && user === null) {
      queryClient.cancelQueries({ queryKey: ["/api/auth/user"] });
      queryClient.cancelQueries({ queryKey: ["/api/auth/current-session"] });
    }

    if (isPublicRoute && !isAuthenticated) {
      return;
    }
  }, [location, isAuthenticated, isLoading, user, queryClient]);

  return null;
}

/** Reset window + known layout scroll roots + every <main> (app has nested mains). */
function scrollAllRouteContainers() {
  if (typeof window === "undefined") return;

  window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  document.scrollingElement?.scrollTo({ top: 0, left: 0, behavior: "auto" });
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;

  document.getElementById("public-scroll-region")?.scrollTo({
    top: 0,
    left: 0,
    behavior: "auto",
  });
  document.getElementById("app-scroll-region")?.scrollTo({
    top: 0,
    left: 0,
    behavior: "auto",
  });

  document.querySelectorAll("main").forEach((el) => {
    el.scrollTo({ top: 0, left: 0, behavior: "auto" });
  });
}

// Scroll to top on every route change (public + protected). useLayoutEffect runs before paint
// so users don't see the previous scroll position flash.
function ScrollToTop() {
  const [location] = useLocation();

  useLayoutEffect(() => {
    scrollAllRouteContainers();
  }, [location]);

  useEffect(() => {
    scrollAllRouteContainers();
    const raf = requestAnimationFrame(() => {
      scrollAllRouteContainers();
      requestAnimationFrame(scrollAllRouteContainers);
    });
    const t0 = window.setTimeout(scrollAllRouteContainers, 0);
    const t1 = window.setTimeout(scrollAllRouteContainers, 150);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(t0);
      window.clearTimeout(t1);
    };
  }, [location]);

  return null;
}

function Router() {
  const [location] = useLocation();
  const { isAuthenticated, isLoading, user } = useAuth();
  const isPortalRoute = location.startsWith("/portal");

  if (!isPortalRoute && isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <>
      <ProtectedRouteGuard />
      <Switch>
        {/* Public-facing routes: always outside MainLayout, but header shows user badge when logged in */}
        <Route path="/feedback">
          {() => (
            <PublicLayout>
              <PublicFeedbackForm />
            </PublicLayout>
          )}
        </Route>
        <Route path="/auth/super-admin">
          {() => (
            <PublicLayout>
              <SuperAdminRegistration />
            </PublicLayout>
          )}
        </Route>
        <Route path="/auth">
          {() => (
            <PublicLayout>
              <AuthPage />
            </PublicLayout>
          )}
        </Route>
        <Route path="/activate">
          {() => (
            <PublicLayout>
              <ActivateAccount />
            </PublicLayout>
          )}
        </Route>
        <Route path="/unauthorized">
          {() => (
            <PublicLayout>
              <Unauthorized />
            </PublicLayout>
          )}
        </Route>
        <Route path="/access-denied">
          {() => (
            <PublicLayout>
              <AccessDenied />
            </PublicLayout>
          )}
        </Route>
        <Route path="/features">
          {() => (
            <PublicLayout>
              <Features />
            </PublicLayout>
          )}
        </Route>
        <Route path="/about">
          {() => (
            <PublicLayout>
              <About />
            </PublicLayout>
          )}
        </Route>
        <Route path="/contacts">
          {() => (
            <PublicLayout>
              <Contact />
            </PublicLayout>
          )}
        </Route>
        <Route path="/privacy">
          {() => (
            <PublicLayout>
              <Privacy />
            </PublicLayout>
          )}
        </Route>
        <Route path="/terms">
          {() => (
            <PublicLayout>
              <Terms />
            </PublicLayout>
          )}
        </Route>
        <Route path="/security">
          {() => (
            <PublicLayout>
              <Security />
            </PublicLayout>
          )}
        </Route>
        <Route path="/changelog">
          {() => (
            <PublicLayout>
              <Changelog />
            </PublicLayout>
          )}
        </Route>
        <Route path="/legal">
          {() => (
            <PublicLayout>
              <LegalHub />
            </PublicLayout>
          )}
        </Route>
        <Route path="/legal/:docId">
          {() => (
            <PublicLayout>
              <LegalDocument />
            </PublicLayout>
          )}
        </Route>
        <Route path="/">
          {() => (
            <PublicLayout>
              <Landing />
            </PublicLayout>
          )}
        </Route>

        {/* Standalone protected docs page (outside MainLayout) */}
        <Route path="/docs" component={Docs} />
        <Route path="/admin/sops" component={SopAdministration} />

        {/* Customer/supplier portal (separate cookie; not staff session) */}
        <Route path="/portal/login">
          {() => <PortalLoginPage />}
        </Route>
        <Route path="/portal/dashboard">
          {() => (
            <PortalProtected>
              <PortalLayout>
                <PortalHomePage />
              </PortalLayout>
            </PortalProtected>
          )}
        </Route>
        <Route path="/portal/profile">
          {() => (
            <PortalProtected>
              <PortalLayout>
                <PortalProfilePage />
              </PortalLayout>
            </PortalProtected>
          )}
        </Route>
        <Route path="/portal/shop">
          {() => (
            <PortalProtected>
              <PortalLayout>
                <PortalShopPage />
              </PortalLayout>
            </PortalProtected>
          )}
        </Route>
        <Route path="/portal/orders">
          {() => (
            <PortalProtected>
              <PortalLayout>
                <PortalOrdersPage />
              </PortalLayout>
            </PortalProtected>
          )}
        </Route>
        <Route path="/portal/support/new">
          {() => (
            <PortalProtected>
              <PortalLayout>
                <PortalSupportPage />
              </PortalLayout>
            </PortalProtected>
          )}
        </Route>
        <Route path="/portal/support/:id">
          {() => (
            <PortalProtected>
              <PortalLayout>
                <PortalSupportPage />
              </PortalLayout>
            </PortalProtected>
          )}
        </Route>
        <Route path="/portal/support">
          {() => (
            <PortalProtected>
              <PortalLayout>
                <PortalSupportPage />
              </PortalLayout>
            </PortalProtected>
          )}
        </Route>
        <Route path="/portal/purchase-orders">
          {() => (
            <PortalProtected>
              <PortalLayout>
                <PortalSupplierOrdersPage />
              </PortalLayout>
            </PortalProtected>
          )}
        </Route>
        <Route path="/portal/appointments">
          {() => (
            <PortalProtected>
              <PortalLayout>
                <RequireFeature flag="appointments" fallbackHref="/portal">
                  <PortalAppointmentsPage />
                </RequireFeature>
              </PortalLayout>
            </PortalProtected>
          )}
        </Route>

        <Route path="/portal/messages/:conversationId?">
          {() => (
            <PortalProtected>
              <PortalLayout>
                <RequireFeature flag="messaging" fallbackHref="/portal">
                  <PortalMessagesPage />
                </RequireFeature>
              </PortalLayout>
            </PortalProtected>
          )}
        </Route>
        <Route path="/portal">
          {() => <PortalMarketingPage />}
        </Route>

        {/* All remaining routes are considered part of the authenticated app */}
        <Route>
          {() =>
            !isAuthenticated ? (
              <Unauthorized />
            ) : user?.role === "super_admin" && !user?.tenantId ? (
              <SuperAdminLayout>
                <Switch>
                  <Route path="/super-admin/system-status">
                    {() => (
                      <RequireRole role="super_admin">
                        <SuperAdminSystemStatus />
                      </RequireRole>
                    )}
                  </Route>
                  <Route path="/super-admin/security">
                    {() => (
                      <RequireRole role="super_admin">
                        <SuperAdminSecurity />
                      </RequireRole>
                    )}
                  </Route>
                  <Route path="/super-admin/audit">
                    {() => (
                      <RequireRole role="super_admin">
                        <SuperAdminGlobalAudit />
                      </RequireRole>
                    )}
                  </Route>
                  <Route path="/super-admin/impersonation-log">
                    {() => (
                      <RequireRole role="super_admin">
                        <SuperAdminImpersonationLog />
                      </RequireRole>
                    )}
                  </Route>
                  <Route path="/super-admin/integrations">
                    {() => (
                      <RequireRole role="super_admin">
                        <SuperAdminIntegrations />
                      </RequireRole>
                    )}
                  </Route>
                  <Route path="/super-admin/billing">
                    {() => (
                      <RequireRole role="super_admin">
                        <SuperAdminBilling />
                      </RequireRole>
                    )}
                  </Route>
                  <Route path="/super-admin/feature-flags">
                    {() => (
                      <RequireRole role="super_admin">
                        <SuperAdminFeatureFlags />
                      </RequireRole>
                    )}
                  </Route>
                  <Route path="/super-admin/signed-legal-documents">
                    {() => (
                      <RequireRole role="super_admin">
                        <SuperAdminSignedLegal />
                      </RequireRole>
                    )}
                  </Route>
                  <Route path="/super-admin/dashboard">
                    {() => (
                      <RequireRole role="super_admin">
                        <SuperAdminDashboard />
                      </RequireRole>
                    )}
                  </Route>
                  <Route path="/super-admin">
                    {() => (
                      <RequireRole role="super_admin">
                        <SuperAdmin />
                      </RequireRole>
                    )}
                  </Route>
                  <Route path="/profile/:userId" component={Profile} />
                  <Route path="/profile" component={Profile} />
                  <Route>
                    <Redirect to="/super-admin/dashboard" />
                  </Route>
                </Switch>
              </SuperAdminLayout>
            ) : (
              <MainLayout>
                <Switch>
                  <Route path="/dashboard" component={Dashboard} />
                  <Route path="/notifications" component={NotificationsPage} />
                  <Route path="/appointments">
                    {() => (
                      <RequireFeature flag="appointments">
                        <RequireStaffAccess>
                          <Appointments />
                        </RequireStaffAccess>
                      </RequireFeature>
                    )}
                  </Route>
                  <Route path="/messages">
                    {() => (
                      <RequireFeature flag="messaging">
                        <RequireStaffAccess>
                          <MessagesPage />
                        </RequireStaffAccess>
                      </RequireFeature>
                    )}
                  </Route>
                  <Route path="/reports/overview">
                    {() => (
                      <RequireReportsHubAccess>
                        <OverviewReportsPage />
                      </RequireReportsHubAccess>
                    )}
                  </Route>
                  <Route path="/reports/incidents">
                    {() => (
                      <RequireIncidentReportsAccess>
                        <IncidentReportsPage />
                      </RequireIncidentReportsAccess>
                    )}
                  </Route>
                  <Route path="/reports/operations">
                    {() => (
                      <RequireOperationsReportsAccess>
                        <OperationsReportsPage />
                      </RequireOperationsReportsAccess>
                    )}
                  </Route>
                  <Route path="/reports/compliance">
                    {() => (
                      <RequireComplianceReportsAccess>
                        <ComplianceReportsPage />
                      </RequireComplianceReportsAccess>
                    )}
                  </Route>
                  <Route path="/reports">
                    {() => (
                      <RequireReportsHubAccess>
                        <ReportsHome />
                      </RequireReportsHubAccess>
                    )}
                  </Route>
                  <Route path="/incidents">
                    {() => (
                      <RequireFeature flag="incidents">
                        <Incidents />
                      </RequireFeature>
                    )}
                  </Route>
                  <Route path="/assets/fleet/units/:id">
                    {() => (
                      <RequireFeature flag="fleet">
                        <RequireFleetAccess>
                          <FleetUnitDetail />
                        </RequireFleetAccess>
                      </RequireFeature>
                    )}
                  </Route>
                  <Route path="/assets/fleet/pre-start">
                    {() => (
                      <RequireFeature flag="fleet">
                        <RequireFleetAccess>
                          <FleetModule />
                        </RequireFleetAccess>
                      </RequireFeature>
                    )}
                  </Route>
                  <Route path="/assets/fleet/inventory">
                    {() => (
                      <RequireFeature flag="fleet">
                        <RequireFleetAccess>
                          <FleetModule />
                        </RequireFleetAccess>
                      </RequireFeature>
                    )}
                  </Route>
                  <Route path="/assets/fleet">
                    {() => (
                      <RequireFeature flag="fleet">
                        <RequireFleetAccess>
                          <FleetModule />
                        </RequireFleetAccess>
                      </RequireFeature>
                    )}
                  </Route>
                  <Route path="/assets">
                    {() => (
                      <RequireFeature flag="fleet">
                        <RequireFleetAccess>
                          <BusinessAssetsPage />
                        </RequireFleetAccess>
                      </RequireFeature>
                    )}
                  </Route>
                  <Route path="/fleets/units/:id" component={FleetUnitPathRedirect} />
                  <Route path="/fleets/pre-start">
                    {() => <Redirect to="/assets/fleet/pre-start" />}
                  </Route>
                  <Route path="/fleets/inventory">
                    {() => <Redirect to="/assets/fleet/inventory" />}
                  </Route>
                  <Route path="/fleets">
                    {() => <Redirect to="/assets/fleet" />}
                  </Route>
                  <Route path="/fleet/units/:id" component={FleetUnitPathRedirect} />
                  <Route path="/fleet">
                    {() => <FleetLegacyRedirect />}
                  </Route>
                  <Route path="/equipment-tracking">
                    {() => <EquipmentTracking />}
                  </Route>
                  <Route path="/assets/equipment-checks">
                    {() => <Redirect to="/equipment-tracking" />}
                  </Route>
                  <Route path="/ambulance/units/:id" component={AmbulanceUnitLegacyRedirect} />
                  <Route path="/ambulance" component={AmbulancesLegacyRedirect} />
                  <Route path="/operations/ambulances/:id" component={AmbulanceDetailLegacyRedirect} />
                  <Route path="/operations/ambulances" component={AmbulancesLegacyRedirect} />
                  <Route path="/operational-duties" component={OperationalDuties} />
                  <Route path="/tickets/new">
                    {() => (
                      <RequireFeature flag="tickets">
                        <TicketNewPage />
                      </RequireFeature>
                    )}
                  </Route>
                  <Route path="/tickets/:id">
                    {() => (
                      <RequireFeature flag="tickets">
                        <TicketDetailPage />
                      </RequireFeature>
                    )}
                  </Route>
                  <Route path="/tickets">
                    {() => (
                      <RequireFeature flag="tickets">
                        <TicketsListPage />
                      </RequireFeature>
                    )}
                  </Route>
                  <Route path="/assignment-history" component={AssignmentHistory} />
                  <Route path="/shiftover/shift-report">
                    {() => (
                      <RequireFeature flag="shiftover">
                        <ShiftReports />
                      </RequireFeature>
                    )}
                  </Route>
                  <Route path="/shiftover/open-items">
                    {() => (
                      <RequireFeature flag="shiftover">
                        <OpenItemsPage />
                      </RequireFeature>
                    )}
                  </Route>
                  <Route path="/shiftover">
                    {() => (
                      <RequireFeature flag="shiftover">
                        <ShiftoverHome />
                      </RequireFeature>
                    )}
                  </Route>
                  <Route path="/audit-trail" component={AuditTrail} />
                  <Route path="/inventory" component={Inventory} />
                  <Route path="/inventory-catalog" component={InventoryCatalog} />
                  <Route path="/pos">
                    {() => (
                      <RequireStaffAccess>
                        <PosPage />
                      </RequireStaffAccess>
                    )}
                  </Route>
                  <Route path="/sales">
                    {() => (
                      <RequireStaffAccess>
                        <SalesHistoryPage />
                      </RequireStaffAccess>
                    )}
                  </Route>
                  <Route path="/orders">
                    {() => (
                      <RequireFeature flag="portal">
                        <OrdersPage />
                      </RequireFeature>
                    )}
                  </Route>
                  <Route path="/stock-transfers" component={StockTransfers} />
                  <Route path="/purchase-orders" component={PurchaseOrders} />
                  <Route path="/suppliers" component={Suppliers} />
                  <Route path="/customers" component={Customers} />
                  <Route
                    path="/inventory-transactions"
                    component={InventoryTransactions}
                  />
                  <Route
                    path="/transaction-history"
                    component={TransactionHistory}
                  />
                  <Route path="/testing">
                    {() => (
                      <RequireFeature flag="poc_testing">
                        <InstantTestsPage />
                      </RequireFeature>
                    )}
                  </Route>
                  <Route path="/testing/new">
                    {() => (
                      <RequireFeature flag="poc_testing">
                        <InstantTestForm />
                      </RequireFeature>
                    )}
                  </Route>
                  <Route path="/wellbeing">
                    {() => (
                      <RequireFeature flag="wellbeing">
                        <WellbeingDashboard />
                      </RequireFeature>
                    )}
                  </Route>
                  <Route path="/wellbeing/follow-ups">
                    {() => (
                      <RequireFeature flag="wellbeing">
                        <WellbeingFollowUps />
                      </RequireFeature>
                    )}
                  </Route>
                  <Route path="/wellbeing/work-fitness">
                    {() => (
                      <RequireFeature flag="wellbeing">
                        <WellbeingWorkFitness />
                      </RequireFeature>
                    )}
                  </Route>
                  <Route path="/wellbeing/medications">
                    {() => (
                      <RequireFeature flag="wellbeing">
                        <WellbeingWorkFitness />
                      </RequireFeature>
                    )}
                  </Route>
                  <Route path="/wellbeing/feedback">
                    {() => (
                      <RequireFeature flag="wellbeing">
                        <WellbeingFeedback />
                      </RequireFeature>
                    )}
                  </Route>
                  <Route path="/wellbeing/feedback-poster">
                    {() => (
                      <RequireFeature flag="wellbeing">
                        <WellbeingFeedbackPoster />
                      </RequireFeature>
                    )}
                  </Route>
                  <Route path="/our-people">{() => <Redirect to="/wellbeing" />}</Route>
                  <Route path="/our-people/follow-ups">{() => <Redirect to="/wellbeing/follow-ups" />}</Route>
                  <Route path="/our-people/work-fitness">{() => <Redirect to="/wellbeing/work-fitness" />}</Route>
                  <Route path="/our-people/medications">{() => <Redirect to="/wellbeing/work-fitness" />}</Route>
                  <Route path="/our-people/feedback">{() => <Redirect to="/wellbeing/feedback" />}</Route>
                  <Route path="/our-people/feedback-poster">{() => <Redirect to="/wellbeing/feedback-poster" />}</Route>
                  <Route path="/sop" component={SOPLibrary} />
                  <Route path="/admin/legal-agreements">
                    {() => (
                      <RequireRole role="admin">
                        <AdminLegalAgreements />
                      </RequireRole>
                    )}
                  </Route>
                  <Route path="/admin">
                    {() => (
                      <RequireRole role="admin">
                        <Admin />
                      </RequireRole>
                    )}
                  </Route>
                  <Route path="/super-admin/dashboard">
                    {() => (
                      <RequireRole role="super_admin">
                        <SuperAdminDashboard />
                      </RequireRole>
                    )}
                  </Route>
                  <Route path="/super-admin">
                    {() => (
                      <RequireRole role="super_admin">
                        <SuperAdmin />
                      </RequireRole>
                    )}
                  </Route>
                  <Route path="/settings" component={Settings} />
                  <Route path="/profile/:userId" component={Profile} />
                  <Route path="/profile" component={Profile} />
                  <Route component={NotFound} />
                </Switch>
              </MainLayout>
            )
          }
        </Route>
      </Switch>
    </>
  );
}

function App() {
  const isOnline = useOnlineStatus();

  useEffect(() => {
    if (!isOnline) return;
    void runSyncOnce();
    void syncMessagingOutbox(queryClient);
  }, [isOnline]);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <TenantBranding />
        <ConnectivityBanner />
        <ScrollToTop />
        <Router />
        <FeedbackWidget />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

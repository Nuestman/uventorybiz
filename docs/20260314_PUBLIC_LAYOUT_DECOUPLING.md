## Public vs App Layout Decoupling

This document describes how public-facing pages (landing, auth, marketing, feedback, etc.) are now **fully decoupled** from the authenticated app layout, while still showing a user badge for logged-in users on public pages.

---

## Goals

- **Public pages never use `MainLayout`**  
  No sidebar, app navigation, or app header appears on landing/auth/marketing routes.

- **Public pages are always reachable**  
  Routes like `/` and `/auth` work whether the user is logged in or not.

- **Logged-in users see a small header on public pages**  
  When authenticated, public pages show a lightweight header with branding and a user badge, but still no sidebar.

---

## Key Components

### `PublicLayout`

- **File**: `client/src/components/PublicLayout.tsx`
- **Purpose**: Minimal shell for all public-facing pages.
- **Structure**:
  - Top header with:
    - MineAid logo linking to `/`.
    - If `useAuth().user` exists, a user dropdown with:
      - Avatar/initials, name, role.
      - Links to `/dashboard`, `/profile`, `/settings`.
      - Logout action.
  - `children` rendered below the header in a simple `main` area.
- **Important**: There is **no sidebar** and no app-specific navigation here. Anything rendered via `PublicLayout` is considered public context.

### `MainLayout`

- **File**: `client/src/components/MainLayout.tsx`
- **Purpose**: Full authenticated app layout.
- **Structure**:
  - `Sidebar` with app navigation.
  - Top bar (`TopBar` + `HeaderContent`) with:
    - Sidebar trigger.
    - Logo (responsive).
    - Navigation links (Dashboard, Patients, etc.).
    - Location badge.
    - User dropdown with profile, settings, logout.
  - Scrollable `main` area for app content.
- **Usage**: Only used for **protected app routes** (dashboard, patients, etc.).

---

## Routing Overview

### File: `client/src/App.tsx`

Routing is now **path-first**, not split by `isAuthenticated` branches.

#### 1. Public routes (always outside `MainLayout`)

At the top-level `Switch` in `Router`, the following routes are always rendered via `PublicLayout`:

- `/` → landing page:
  - `PublicLayout` + `Landing`.
- `/about` → marketing variant:
  - `PublicLayout` + `Landing` (same component, different route).
- `/contacts` → marketing/contact:
  - `PublicLayout` + `Landing`.
- `/auth` → primary auth page:
  - `PublicLayout` + `AuthPage`.
- `/auth/super-admin` → super admin registration:
  - `PublicLayout` + `SuperAdminRegistration`.
- `/activate` → account activation:
  - `PublicLayout` + `ActivateAccount`.
- `/unauthorized` → public unauthorized message:
  - `PublicLayout` + `Unauthorized`.
- `/access-denied` → public access denied message:
  - `PublicLayout` + `AccessDenied`.
- `/feedback` → public feedback form:
  - `PublicLayout` + `PublicFeedbackForm`.

**Behavior:**

- These routes are **always accessible** regardless of auth state.
- When a user is logged out, they see just the branding header.
- When logged in, they see the same public content but with the user badge/dropdown in the header from `PublicLayout`.

#### 2. Docs route

- `/docs` is treated as a **standalone protected page**:
  - `Route path="/docs" component={Docs}`.
  - It does **not** use `MainLayout` or `PublicLayout`; this is a special-case decision for internal docs.

#### 3. Auth-gated app routes (inside `MainLayout`)

Below the explicit public and docs routes, there is a catch-all `Route` with **no `path`**:

- If the user is **not authenticated**:
  - Returns `<Unauthorized />` (no layout).
- If the user **is authenticated**:
  - Renders:
    - `<MainLayout>` wrapping an inner `Switch` with all app routes:
      - `/dashboard`
      - `/patients`, `/patient/:id`, `/patients/:id`
      - `/appointments`
      - `/records`
      - `/incidents`
      - `/operational-duties`
      - `/assignment-history`
      - `/reports`
      - `/audit-trail`
      - `/medical-visit`
      - `/inventory`
      - `/stock-transfers`
      - `/equipment-tracking`
      - `/purchase-orders`
      - `/suppliers`
      - `/inventory-transactions`
      - `/transaction-history`
      - `/testing`, `/testing/new`, `/testing/schedule`, `/testing/reports`
      - `/wellbeing` and nested routes
      - `/admin` (wrapped in `RequireRole role="admin"`)
      - `/super-admin` (wrapped in `RequireRole role="super_admin"`)
      - `/settings`
      - `/profile`, `/profile/:userId`
      - trailing `NotFound` for unknown app routes.

**Behavior:**

- All **app pages** use the full `MainLayout` (sidebar + app header).
- Unknown **app-like** paths fall through to the `NotFound` component inside `MainLayout`.

---

## Route Metadata and Guards

### `client/src/routes.ts`

Two arrays classify paths:

- `PUBLIC_PATHS`:
  - `/`, `/about`, `/contacts`, `/auth`, `/auth/super-admin`, `/activate`, `/unauthorized`, `/access-denied`, `/feedback`.
- `PROTECTED_PATHS`:
  - `/dashboard`, `/patients`, `/patient`, `/appointments`, `/records`, `/incidents`,
    `/operational-duties`, `/assignment-history`, `/reports`, `/audit-trail`,
    `/medical-visit`, `/inventory`, `/stock-transfers`, `/equipment-tracking`,
    `/purchase-orders`, `/suppliers`, `/inventory-transactions`, `/transaction-history`,
    `/testing`, `/wellbeing`, `/admin`, `/super-admin`, `/profile`, `/settings`, `/docs`.

Helper functions:

- `getPublicPaths()` / `getProtectedPaths()` – used by `ProtectedRouteGuard`.
- `isPublicPath(pathname)` / `isProtectedPath(pathname)` – convenience checks.
- `getRequiredRoleForPath(pathname)` – resolves role requirements for admin/super-admin routes.

### `ProtectedRouteGuard`

- **File**: `client/src/App.tsx`
- **Behavior**:
  - Watches location changes and uses `PUBLIC_PATHS` / `PROTECTED_PATHS` to:
    - Cancel user/session queries when on a protected route and unauthenticated.
    - Allow public routes to be visited without forcing auth.
  - It **does not decide** which layout is used; layout is purely determined by routing now.

---

## Landing Page Changes

### File: `client/src/pages/Landing.tsx`

- Previously, `Landing` rendered its own sticky header (logo + user badge / auth buttons).
- Now that `PublicLayout` provides the public header, the **duplicate landing header has been removed**:
  - The component no longer imports or uses `useAuth` or `formatRole`.
  - The top-level structure starts directly with the hero section.
- Padding at the top of the hero section has been tweaked to sit nicely under the `PublicLayout` header.

Result:

- On `/`, only the `PublicLayout` header is visible.
- When logged in, you see the `PublicLayout` user badge; when logged out, you see auth CTA buttons only in `PublicLayout`-managed contexts.

---

## How to Add New Pages

### Add a new public page

1. Create a page component under `client/src/pages/`, e.g. `NewMarketingPage.tsx`.
2. In `client/src/App.tsx`, add a new route **above** the catch-all:
   - Wrap it in `PublicLayout`:
     - Example: `/new-marketing` → `PublicLayout` + `NewMarketingPage`.
3. Add the path to `PUBLIC_PATHS` in `client/src/routes.ts` if you want guards/logic to treat it as public.

### Add a new app (protected) page

1. Create the page component under `client/src/pages/`.
2. In the inner `Switch` inside `MainLayout` (in `client/src/App.tsx`), add a `Route` for the new path.
3. Add the base path to `PROTECTED_PATHS` in `client/src/routes.ts`.
4. If the route requires a specific role, update `ROLE_ROUTES` in `routes.ts` and/or wrap it in `RequireRole` in `App.tsx`.

---

## Summary of Behavior

- Public routes (landing, auth, feedback, etc.) are:
  - Always reachable.
  - Rendered via `PublicLayout` (no sidebar).
  - Showing a user badge/header when a user is logged in.

- App routes (dashboard, patients, etc.) are:
  - Only reachable when authenticated.
  - Always rendered inside `MainLayout` with sidebar and app header.

This separation makes it easy to evolve the marketing/auth experience independently of the core app layout, while still giving logged-in users a consistent identity indicator on public-facing pages.


# Patient portal — style system

**Last updated:** June 20, 2026  
**Related:** [PATIENT_PORTAL_PLAN.md](./PATIENT_PORTAL_PLAN.md), [TELEHEALTH_UI.md](./TELEHEALTH_UI.md)

---

## Overview

Portal UI uses a **self-contained CSS bundle** that does not depend on overriding main HMS globals (`Odibee Sans`, coral headings, navy table headers). Styles load once at app bootstrap and apply only under explicit portal shells.

---

## Import path

| File | Role |
|------|------|
| `client/src/portal/bootstrap.ts` | Single entry — imported from `client/src/main.tsx` |
| `client/src/portal/styles/index.css` | Aggregates portal CSS modules |

**Do not** import portal styles from individual pages. Add `portal-root` (or an alias below) on the top-level shell for each surface.

---

## CSS modules

| File | Purpose |
|------|---------|
| `shell.css` | `.portal-root` boundary; design tokens (`--portal-teal`, `--portal-radius`, shadcn `--primary` bridge) |
| `base.css` | Typography — **Plus Jakarta Sans** (body/UI), **Outfit** (headings); resets HMS heading/button rules inside portal |
| `components.css` | Portal buttons, modals, time slots, summary cards, auth tabs |
| `shadcn.css` | Card/input/button radius for shadcn primitives inside portal |
| `tables.css` | Light table headers; subtle row hover (`--portal-table-head-bg`) |
| `tabs.css` | `tabs-list-custom` / `tab-trigger-custom` sizing and active state |
| `telecare.css` | Fullscreen telecare z-index; portal telecare token aliases |
| `fonts.css` | Plus Jakarta Sans + Outfit |

---

## Shell classes

| Class | Use |
|-------|-----|
| `portal-root` | **Required** on any surface that should use portal tokens (layout, marketing, modals) |
| `portal-page` | Authenticated portal app shell (`PortalLayout`) |
| `portal-marketing` | Public `/portal` landing |
| `portal-modal-shell` | In-modal content wrapper |
| `portal-ui` | Portaled `DialogContent` wrapper |
| `telecare-session--portal` | Patient in-call telecare (teal tabs, table hover) |

`body.portal-route` is set by `usePortalBodyClass()` so portaled Radix dialogs inherit portal tokens.

---

## Design tokens (on `.portal-root`)

| Token | Default | Use |
|-------|---------|-----|
| `--portal-teal` | `#0a4f6e` | Primary actions, active tabs (portal) |
| `--portal-radius` | `1rem` | Buttons, inputs, chips |
| `--portal-radius-lg` | `1.25rem` | Cards, modals |
| `--portal-table-head-bg` | `#f9fafb` | Table header + row hover |
| `--radius` | `1.25rem` | shadcn `rounded-lg` bridge |

Staff telecare (`telecare-session--staff`) does **not** use `portal-root`; it keeps main-app navy tokens.

---

## Typography

| Token / rule | Font | Use |
|--------------|------|-----|
| `--font-sans` | Plus Jakarta Sans | Body text, labels, buttons, nav labels |
| `--font-display` | Outfit | All `h1–h6`, card titles, dialog titles, `PortalPageHeader` |
| `PortalPageHeader` | Outfit | `text-3xl sm:text-4xl` page titles |

Headings inside `.portal-root`, `.telecare-session--portal`, and portaled dialogs inherit Outfit via `base.css`. Tailwind size utilities (`text-2xl`, `text-3xl`, etc.) apply normally — do not use `font-size: unset` on portal headings.

---

## Component classes

Prefer portal utility classes over raw Tailwind for branded controls:

- `portal-btn-primary` / `portal-btn-outline` / `portal-btn-accent`
- `portal-input-field`
- `portal-time-slot` (`data-selected="true"` for selected slot)
- `portal-modal-progress-segment` (`data-active="true"` for completed/current steps)
- `portal-summary-card`, `portal-info-box`

Appointment request modal uses `portal-form-fields` wrapper for consistent field styling.

---

## Telecare (portal)

Patient video visits use the same tab pattern as portal pages (`TelecareSessionTabs`). In-call layout:

- Fullscreen shell (`useTelecareFullscreen`)
- Light grey background; white cards (no single-side border splits)
- Visit metadata in context panel **Appt** tab (`TelecareVisitMeta`)
- Session-end warnings as **inline banners** (not blocking dialogs behind z-index)
- Messaging tab: scrollable thread + pinned consent/composer (`fillHeight` on `MessagingThreadView`)

See [TELEHEALTH_UI.md](./TELEHEALTH_UI.md) for flows.

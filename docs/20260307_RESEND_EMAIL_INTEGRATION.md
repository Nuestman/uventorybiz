# 📧 Technical Documentation: Resend & SMTP Hybrid Email Service

## 1. Overview
This document outlines the technical implementation of the dual-strategy email service for **MineAid HMS**. The system is engineered to bypass cloud network restrictions (specifically on **Railway.app**) while maintaining a simple SMTP setup for local development.
The system implements a dual-strategy email service designed to work seamlessly in both local development and restricted cloud environments (Railway). It automatically switches between Resend (HTTPS API) and Nodemailer (Gmail SMTP) based on the available environment variables.

---

## 2. Problem Statement
Cloud providers like Railway block outbound SMTP ports (25, 465, 587) on trial/hobby plans to prevent spam. This caused Connection Timeout errors and SIGTERM crashes during bulk user invitations.
- **Symptom:** `Connection timeout` errors followed by `SIGTERM` (container crashes) during email dispatch.
- **Root Cause:** Standard `nodemailer` attempts to connect via blocked TCP ports.
- **Solution:** Integrated **Resend SDK**, which communicates via **HTTPS (Port 443)**—a port that is never blocked.

---

## 3. Environment Configuration
The service dynamically switches providers based on the presence of specific environment variables.


| Variable | Source | Purpose |
| :--- | :--- | :--- |
| `RESEND_API_KEY` | Resend.com | Enables Production API sending (Railway) |
| `RESEND_FROM_EMAIL` | Resend.com | Verified sender address (e.g., `MineAid <no-reply@domain.com>`) |
| `GMAIL_USER` | Google | Fallback Gmail address for local testing |
| `GMAIL_APP_PASSWORD` | Google | 16-character App Password for local testing |
| `FRONTEND_URL` | Dashboard | Base URL used for Call-to-Action (CTA) buttons |

---

## 4. Architecture & Implementation

### 🛠️ Safe Initialization Pattern
To prevent the application from crashing locally when Resend keys are missing, we use a conditional constructor:

```typescript
const resendApiKey = process.env.RESEND_API_KEY;
// Prevents "Missing API Key" error if variable is undefined
const resend = resendApiKey ? new Resend(resendApiKey) : null;

### 🚦 Execution Logic
The `sendEmail` function follows a strict priority ladder:

1.  **Priority 1: Resend (Cloud/Railway)**
    *   Triggered if `RESEND_API_KEY` exists.
    *   Uses **HTTPS protocol (Port 443)**.
    *   Logs provider as `resend_api` in delivery tables.
2.  **Priority 2: Gmail SMTP (Local Dev)**
    *   Triggered if Resend is missing but Gmail credentials exist.
    *   Uses standard **Nodemailer transport**.
    *   Logs provider as `gmail_smtp`.
3.  **Priority 3: Mock/Log Only**
    *   Triggered if no keys exist. Prevents the app from crashing by logging the email content to the console.

## 5. Maintenance & Troubleshooting

### Resend Onboarding
If using the free tier without a custom domain:
*   You **must** set `RESEND_FROM_EMAIL` to `onboarding@resend.dev`.
*   You can only send to the email address associated with your Resend account.

### Verifying a Custom Domain (Recommended)
To send from `admin@yourdomain.com`:
1.  Log into the **Resend Dashboard**.
2.  Add your domain and update your **DNS records** (SPF/DKIM).
3.  Update the `RESEND_FROM_EMAIL` variable in Railway.

### Local Development
To test with Gmail locally:
*   Ensure `RESEND_API_KEY` is **not** in your local `.env`.
*   Ensure `GMAIL_USER` and `GMAIL_APP_PASSWORD` are present.
*   Check the terminal for `🏠 Sending via Gmail SMTP` logs.


# MineAid HMS — Subprocessors & infrastructure (transparency)

**Last updated:** April 2026  

This page lists **typical** infrastructure and service providers (“**sub-processors**”) that may process **Customer Data** when MineAid HMS is operated in a standard cloud deployment. **Update this list** to match your **actual** production stack, regions, and contracts before sending to enterprise customers.

| Sub-processor (example) | Role | Typical data | Region / notes |
|-------------------------|------|--------------|----------------|
| **Neon** (or your PostgreSQL host) | Database hosting | Application and health operational data | Set per project (e.g. EU / US) |
| **Railway** / **Vercel** / **hosting provider** | Application hosting, networking | Request metadata, application payloads | Set per deployment |
| **Vercel Blob** / **S3-compatible** / **local disk** | File / object storage | Uploaded files (e.g. profiles, attachments) | Configure `PUBLIC_OBJECT_SEARCH_PATHS` / blob region |
| **Gmail SMTP** / **Resend** / other | Transactional email | Email addresses, message content | Configure provider DPA |
| **SendGrid** (if used) | Email delivery | As above | If enabled |

---

## How to keep this accurate

1. Export your **environment configuration** (without secrets) and map each external URL or SDK to a row above.  
2. Link customers to the **published** Subprocessors page URL (e.g. `/legal/subprocessors`) from your **DPA** and **Privacy Policy**.  
3. For **material changes**, follow the notice process in your **Commercial Agreement** or **DPA**.

---

## No sale of data

MineAid does **not** sell Customer Data. Sub-processors are used **only** to **operate** the Service, not for advertising resale.

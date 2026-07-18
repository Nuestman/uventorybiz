// Professional email templates for uventorybiz
import { env } from './config/env';

// Text-based wordmark rendered with inline styles — displays consistently in all
// email clients (no image attachments or external assets required).
const EMAIL_LOGO_HTML = `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 32px; font-weight: 800; letter-spacing: -0.5px; line-height: 1.2;"><span style="color: #142F5C;">Uventory</span><span style="color: #F6621E;">Biz</span></div>`;

// Helper function to get the base URL for email images (for other images if needed)
function getEmailBaseUrl(): string {
  // Try multiple environment variables in order of preference (same as notification triggers)
  const baseUrl = process.env.REPLIT_DOMAINS?.split(',')[0] 
    || process.env.VERCEL_URL 
    || process.env.RAILWAY_PUBLIC_DOMAIN
    || process.env.FRONTEND_URL
    || 'http://localhost:17009';
  
  // Ensure protocol is included
  if (baseUrl.startsWith('http://') || baseUrl.startsWith('https://')) {
    return baseUrl;
  }
  return `https://${baseUrl}`;
}

export type EmailButtonVariant = "navy" | "primary" | "danger" | "orange";

/** Inline-styled CTA — many clients strip class CSS, causing white-on-white buttons. */
export function emailButtonHtml(
  href: string,
  label: string,
  variant: EmailButtonVariant = "navy",
): string {
  const palette: Record<EmailButtonVariant, { bg: string; bgDark: string }> = {
    navy: { bg: "#1e3a5f", bgDark: "#152a45" },
    primary: { bg: "#3b4ca8", bgDark: "#2d3a7c" },
    danger: { bg: "#dc2626", bgDark: "#b91c1c" },
    orange: { bg: "#F6621E", bgDark: "#d95418" },
  };
  const { bg, bgDark } = palette[variant];
  return `<a href="${href}" style="display:inline-block;background-color:${bg};background:linear-gradient(135deg, ${bg} 0%, ${bgDark} 100%);color:#ffffff !important;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:600;font-size:16px;line-height:1.25;">${label}</a>`;
}

export function getEmailTemplate(content: string): string {
  const htmlTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>uventorybiz</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #334155;
            background-color: #f8fafc;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        .header {
            background: #ffffff;
            padding: 40px 30px;
            text-align: center;
            border-bottom: 2px solid #e5e7eb;
        }
        .logo {
            max-width: 300px;
            height: auto;
            margin: 0 auto;
        }
        .content {
            padding: 40px 30px;
        }
        .content h1 {
            color: #1e293b;
            font-size: 28px;
            font-weight: 700;
            margin: 0 0 24px 0;
            line-height: 1.3;
        }
        .content h2 {
            color: #334155;
            font-size: 20px;
            font-weight: 600;
            margin: 32px 0 16px 0;
        }
        .content p {
            margin: 0 0 16px 0;
            font-size: 16px;
            line-height: 1.6;
        }
        .highlight {
            background-color: #f1f5f9;
            border-left: 4px solid #3b4ca8;
            padding: 16px 20px;
            margin: 24px 0;
            border-radius: 0 8px 8px 0;
        }
        .button {
            display: inline-block;
            background-color: #1e3a5f;
            background: linear-gradient(135deg, #1e3a5f 0%, #152a45 100%);
            color: #ffffff !important;
            text-decoration: none;
            padding: 16px 32px;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            margin: 24px 0;
        }
        .tenant-info {
            background-color: #f8fafc;
            border: 2px solid #e2e8f0;
            border-radius: 8px;
            padding: 20px;
            margin: 24px 0;
            text-align: center;
        }
        .tenant-name {
            font-size: 18px;
            font-weight: 600;
            color: #1e293b;
            margin-bottom: 8px;
        }
        .tenant-subtitle {
            color: #64748b;
            font-size: 14px;
        }
        .footer {
            background-color: #f8fafc;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e2e8f0;
        }
        .footer p {
            margin: 0;
            color: #64748b;
            font-size: 14px;
        }
        .footer-links {
            margin-top: 16px;
        }
        .footer-links a {
            color: #3b4ca8;
            text-decoration: none;
            margin: 0 12px;
            font-size: 14px;
        }
        @media (max-width: 600px) {
            .container {
                margin: 0;
                border-radius: 0;
            }
            .header, .content, .footer {
                padding: 20px;
            }
            .logo {
                max-width: 250px;
            }
            .content h1 {
                font-size: 24px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            ${EMAIL_LOGO_HTML}
        </div>
        <div class="content">
            ${content}
        </div>
        <div class="footer">
            <p>© 2025 uventorybiz. All rights reserved.</p>
            <div class="footer-links">
                <a href="#">Privacy Policy</a>
                <a href="#">Terms of Service</a>
                <a href="#">Support</a>
            </div>
        </div>
    </div>
</body>
</html>
  `.trim();
  
  return htmlTemplate;
}

export function getInvitationEmail(params: {
  firstName: string;
  lastName: string;
  role: string;
  activationLink: string;
  tenantName: string;
  tenantId?: string;
  inviterName?: string;
  /** When set, email includes links to the public legal hub and tenant admin upload page. */
  frontendBaseUrl?: string;
}): string {
  const roleDisplayNames: Record<string, string> = {
    'staff': 'Staff',
    'operations': 'Operations',
    'fleet_operator': 'Fleet operator',
    'admin': 'Admin',
  };

  const content = `
    <h1>Welcome to uventorybiz!</h1>
    
    <p>Dear ${params.firstName} ${params.lastName},</p>
    
    <p>You have been invited to join uventorybiz${params.inviterName ? ` by ${params.inviterName}` : ''} as part of <strong>${params.tenantName}</strong>.</p>
    
    <div class="tenant-info">
        <div class="tenant-name">${params.tenantName}</div>
        <div class="tenant-subtitle">Business operations platform</div>
    </div>
    
    <div class="highlight">
        <p><strong>Your Role:</strong> ${roleDisplayNames[params.role] || params.role}</p>
        <p><strong>Organization:</strong> ${params.tenantName}</p>
        ${params.tenantId ? `<p><strong>Organization Code:</strong> <code style="background: #142F5C; color: white; padding: 8px 16px; border-radius: 6px; font-size: 18px; font-weight: bold; letter-spacing: 1px;">${params.tenantId}</code></p>` : ''}
    </div>
    
    <h2>🎯 Complete Your Account Activation</h2>
    
    <p>Click the button below to activate your account and complete your profile:</p>
    
    <div style="text-align: center; margin: 24px 0;">
        ${emailButtonHtml(params.activationLink, "✓ Activate Account & Set Password", "orange")}
    </div>
    
    <p><strong>What happens next:</strong></p>
    <ol style="line-height: 1.8;">
        <li>Click the activation button above</li>
        <li>Complete your profile (name, phone, etc.)</li>
        <li>Set a secure password</li>
        <li>Start using uventorybiz immediately!</li>
    </ol>
    
    <p><strong>⚠ Important:</strong> This invitation link will expire in <strong>24 hours</strong> for security purposes. If you don't activate your account within this time, please contact your administrator for a new invitation.</p>
    
    <h2>About uventorybiz</h2>
    <p>uventorybiz is a comprehensive business management system for multi-site companies. You'll have access to:</p>
    <ul style="line-height: 1.8;">
        <li>✓ Employee and customer records</li>
        <li>✓ Appointment scheduling</li>
        <li>✓ Incident reporting and tracking</li>
        <li>✓ Health and safety compliance tools</li>
        <li>✓ Drug & alcohol testing programs</li>
        <li>✓ Product inventory management</li>
    </ul>
    
    <p>If you have any questions or need assistance, please don't hesitate to contact your administrator or our support team.</p>
    
    ${
      params.frontendBaseUrl
        ? `
    <h2>Commercial &amp; legal templates</h2>
    <p style="line-height: 1.7;">
      Printable agreement templates are available at
      <a href="${params.frontendBaseUrl}/legal" style="color: #F6621E; font-weight: 600;">${params.frontendBaseUrl}/legal</a>.
    </p>
    <p style="line-height: 1.7;">
      If you are an organisation <strong>administrator</strong>, after you activate your account you can upload signed
      PDF or Word copies under <strong>Administration → Legal agreements</strong>:
      <a href="${params.frontendBaseUrl}/admin/legal-agreements" style="color: #F6621E; font-weight: 600; word-break: break-all;">${params.frontendBaseUrl}/admin/legal-agreements</a>
    </p>
    `
        : ""
    }
    
    <p>Welcome aboard!</p>
    <p><strong>The uventorybiz Team</strong></p>
  `;

  return getEmailTemplate(content);
}

export function getPortalAccessEmail(params: {
  firstName: string;
  lastName: string;
  tenantName: string;
  magicLink: string;
  loginUrl: string;
  email: string;
  temporaryPassword: string;
  supportEmail?: string | null;
  privacyPolicyUrl?: string | null;
  expiresMinutes?: number;
}): string {
  const expiresMinutes = params.expiresMinutes ?? 15;
  const content = `
    <h1>Your customer & supplier portal is ready</h1>

    <p>Dear ${params.firstName} ${params.lastName},</p>

    <p>Your account team at <strong>${params.tenantName}</strong> has activated your customer & supplier portal account. You can sign in to view appointments, messages, and update your profile.</p>

    <div class="tenant-info">
        <div class="tenant-name">${params.tenantName}</div>
        <div class="tenant-subtitle">Customer & supplier portal access</div>
    </div>

    <div style="text-align: center; margin: 24px 0;">
        ${emailButtonHtml(params.magicLink, "Sign in to portal", "navy")}
    </div>

    <p><strong>What to do next:</strong></p>
    <ol style="line-height: 1.8;">
        <li>Click the button above to sign in instantly — no organization code needed.</li>
        <li>This link expires in <strong>${expiresMinutes} minutes</strong> and works once.</li>
        <li>Next time, visit the portal and enter your email to receive a new sign-in link.</li>
    </ol>

    <div class="highlight">
        <p><strong>Backup sign-in (password):</strong></p>
        <p><strong>Email:</strong> ${params.email}</p>
        <p><strong>Temporary password:</strong> <code style="background: #142F5C; color: white; padding: 8px 16px; border-radius: 6px; font-size: 16px; font-weight: bold; letter-spacing: 0.5px;">${params.temporaryPassword}</code></p>
        <p style="margin-top: 12px;"><a href="${params.loginUrl}" style="color: #F6621E; font-weight: 600;">Open portal sign-in page</a> if the button above expires.</p>
    </div>

    <p>Change your password under <strong>Profile</strong> after your first sign-in if you use password backup.</p>

    <p><strong>Important:</strong> This portal is for customers and suppliers. If you are staff, use the main uventorybiz sign-in page instead.</p>

    ${
      params.supportEmail
        ? `<p>Need help? Contact <a href="mailto:${params.supportEmail}" style="color: #F6621E; font-weight: 600;">${params.supportEmail}</a>.</p>`
        : ""
    }

    ${
      params.privacyPolicyUrl
        ? `<p>Read the privacy notice: <a href="${params.privacyPolicyUrl}" style="color: #F6621E; font-weight: 600; word-break: break-all;">${params.privacyPolicyUrl}</a></p>`
        : ""
    }

    <p><strong>${params.tenantName}</strong></p>
  `;

  return getEmailTemplate(content);
}

export function getPortalMagicLinkEmail(params: {
  firstName: string;
  lastName: string;
  tenantName: string;
  magicLink: string;
  supportEmail?: string | null;
  expiresMinutes: number;
}): string {
  const content = `
    <h1>Your portal sign-in link</h1>

    <p>Dear ${params.firstName} ${params.lastName},</p>

    <p>Use the button below to sign in to the <strong>${params.tenantName}</strong> customer & supplier portal. No password or organization code is required.</p>

    <div style="text-align: center; margin: 24px 0;">
        ${emailButtonHtml(params.magicLink, "Sign in to portal", "navy")}
    </div>

    <p>This link expires in <strong>${params.expiresMinutes} minutes</strong> and can only be used once. If it expires, return to the portal sign-in page and request a new link with your email.</p>

    ${
      params.supportEmail
        ? `<p>Need help? Contact <a href="mailto:${params.supportEmail}" style="color: #F6621E; font-weight: 600;">${params.supportEmail}</a>.</p>`
        : ""
    }

    <p>If you did not request this link, you can ignore this email.</p>

    <p><strong>${params.tenantName}</strong></p>
  `;

  return getEmailTemplate(content);
}

/**
 * Email template for sharing the employee wellbeing feedback form and poster.
 */
export function getFeedbackPosterShareEmail(params: {
  tenantName: string;
  employeeName: string;
  feedbackUrl: string;
  posterUrl: string;
  inviterName?: string;
}): string {
  const content = `
    <h1 style="color: #142F5C;">Share your workplace care feedback</h1>
    
    <div class="tenant-info">
      <div class="tenant-name">${params.tenantName}</div>
      <div class="tenant-subtitle">Employee wellbeing feedback</div>
    </div>
    
    <p>Dear ${params.employeeName},</p>
    
    <p>Your organization would like to invite you to share feedback about your workplace care experience.</p>
    
      <h2>Feedback form link:</h2>
      <p style="color: #64748b; word-break: break-all;">
        <code style="background: #f1f5f9; color: #142F5C; padding: 6px 8px; border-radius: 4px; display: inline-block; margin-top: 4px;">
          ${params.feedbackUrl}
        </code>
      </p>
    
    <h2>QR code poster</h2>
    
    <p>
      You can also open a printable poster with the QR code and feedback link:
    </p>
    <p style="font-size: 14px; color: #142F5C; word-break: break-all;">
      Poster link: <br/>
      <code style="background: #f1f5f9; color: #142F5C; padding: 6px 8px; border-radius: 4px; display: inline-block; margin-top: 4px;">
        ${params.posterUrl}
      </code>
    </p>
    
    <p style="margin-top: 24px;">
      Thank you for helping us improve safety, care, and wellbeing at work.
    </p>
    
    <p>
      Best regards,<br/>
      ${params.inviterName || 'Your care team'}
    </p>
  `;

  return getEmailTemplate(content);
}

export function getEquipmentHealthReportEmail(params: {
  tenantName: string;
  summary: {
    totalEquipment: number;
    activeEquipment: number;
    faultyEquipment: number;
    maintenanceEquipment: number;
    overdueMaintenance: number;
    upcomingMaintenance30Days: number;
    upcomingMaintenance7Days: number;
    equipmentByStatus: Record<string, number>;
    criticalIssues: Array<{
      itemName: string;
      itemCode: string;
      status: string;
      issue: string;
    }>;
  };
  expiredWarranties?: Array<{ itemName: string; itemCode: string; expiryDate: string }>;
  reportDate: Date;
  viewLink: string;
}): string {
  const { tenantName, summary, expiredWarranties = [], reportDate, viewLink } = params;
  
  const formattedDate = reportDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const healthScore = summary.totalEquipment > 0
    ? Math.round((summary.activeEquipment / summary.totalEquipment) * 100)
    : 100;

  const healthColor = healthScore >= 80 ? '#059669' : healthScore >= 60 ? '#f59e0b' : '#ef4444';
  const healthStatus = healthScore >= 80 ? 'Good' : healthScore >= 60 ? 'Fair' : 'Needs Attention';

  const content = `
    <h1>📊 Weekly Equipment Health Report</h1>
    
    <div class="tenant-info">
        <div class="tenant-name">${tenantName}</div>
        <div class="tenant-subtitle">Report Date: ${formattedDate}</div>
    </div>
    
    <div class="highlight" style="border-left-color: ${healthColor};">
        <h2 style="margin: 0 0 16px 0; color: #1e293b;">Overall Health Score: ${healthScore}%</h2>
        <p style="margin: 0; font-size: 18px; font-weight: 600; color: ${healthColor};">
          Status: ${healthStatus}
        </p>
    </div>
    
    <h2>Equipment Summary</h2>
    
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background: #f8fafc; border-radius: 8px; overflow: hidden;">
        <tr style="background: #e2e8f0;">
            <td style="padding: 12px; font-weight: 600; color: #1e293b;">Total Equipment</td>
            <td style="padding: 12px; text-align: right; font-weight: 700; font-size: 18px;">${summary.totalEquipment}</td>
        </tr>
        <tr>
            <td style="padding: 12px; font-weight: 600; color: #64748b;">Active</td>
            <td style="padding: 12px; text-align: right; color: #059669; font-weight: 600;">${summary.activeEquipment}</td>
        </tr>
        <tr>
            <td style="padding: 12px; font-weight: 600; color: #64748b;">Faulty</td>
            <td style="padding: 12px; text-align: right; color: #ef4444; font-weight: 600;">${summary.faultyEquipment}</td>
        </tr>
        <tr>
            <td style="padding: 12px; font-weight: 600; color: #64748b;">Under Maintenance</td>
            <td style="padding: 12px; text-align: right; color: #3b82f6; font-weight: 600;">${summary.maintenanceEquipment}</td>
        </tr>
        <tr style="background: #fef2f2;">
            <td style="padding: 12px; font-weight: 600; color: #dc2626;">Overdue Maintenance</td>
            <td style="padding: 12px; text-align: right; color: #dc2626; font-weight: 700;">${summary.overdueMaintenance}</td>
        </tr>
    </table>
    
    <h2>Upcoming Maintenance</h2>
    
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr>
            <td style="padding: 8px 0; font-weight: 600; color: #64748b; width: 200px;">Within 30 Days:</td>
            <td style="padding: 8px 0;"><strong style="color: #f59e0b;">${summary.upcomingMaintenance30Days}</strong> scheduled</td>
        </tr>
        <tr>
            <td style="padding: 8px 0; font-weight: 600; color: #64748b;">Within 7 Days:</td>
            <td style="padding: 8px 0;"><strong style="color: #ef4444;">${summary.upcomingMaintenance7Days}</strong> scheduled</td>
        </tr>
    </table>
    
    ${summary.criticalIssues.length > 0 ? `
    <h2 style="color: #dc2626;">⚠️ Critical Issues Requiring Attention</h2>
    
    <div style="background: #fef2f2; border: 2px solid #fecaca; border-radius: 8px; padding: 20px; margin: 20px 0;">
        ${summary.criticalIssues.map(issue => `
        <div style="padding: 12px; margin-bottom: 12px; background: white; border-radius: 6px; border-left: 4px solid #dc2626;">
            <p style="margin: 0 0 4px 0; font-weight: 600; color: #1e293b;">${issue.itemName} (${issue.itemCode})</p>
            <p style="margin: 0; color: #64748b; font-size: 14px;">${issue.issue}</p>
        </div>
        `).join('')}
    </div>
    ` : `
    <div style="background: #f0fdf4; border: 2px solid #86efac; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
        <p style="margin: 0; color: #059669; font-weight: 600;">✅ No critical issues detected</p>
    </div>
    `}
    
    ${expiredWarranties.length > 0 ? `
    <h2 style="color: #64748b;">📋 Expired Warranties</h2>
    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
        <p style="margin: 0 0 12px 0; color: #64748b; font-size: 14px;">Equipment with expired warranty coverage (${expiredWarranties.length} item${expiredWarranties.length !== 1 ? 's' : ''}):</p>
        ${expiredWarranties.map(w => `
        <div style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
            <p style="margin: 0; color: #1e293b; font-size: 14px;">${w.itemName} (${w.itemCode}) - Expired: ${w.expiryDate}</p>
        </div>
        `).join('')}
    </div>
    ` : ''}
    
    <div style="text-align: center; margin: 32px 0;">
        ${emailButtonHtml(viewLink, "View Equipment Inventory", "primary")}
    </div>
    
    <p style="color: #64748b; font-size: 14px; margin-top: 24px;">
        <strong>Note:</strong> This is an automated weekly equipment health report from uventorybiz. 
        Please review and take appropriate action on any critical issues identified.
    </p>
  `;

  return getEmailTemplate(content);
}

/**
 * Email template for upcoming maintenance reminders (30 days and 7 days before)
 */
export function getUpcomingMaintenanceReminderEmail(params: {
  tenantName: string;
  equipmentName: string;
  equipmentCode: string;
  maintenanceType: string;
  scheduledDate: Date;
  daysUntil: number;
  viewLink: string;
}): string {
  const { tenantName, equipmentName, equipmentCode, maintenanceType, scheduledDate, daysUntil, viewLink } = params;
  
  const formattedDate = scheduledDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const urgencyColor = daysUntil <= 7 ? '#ef4444' : '#f59e0b';
  const urgencyText = daysUntil <= 7 ? 'URGENT' : 'Upcoming';

  const content = `
    <h1>🔧 Equipment Maintenance Reminder</h1>
    
    <div class="tenant-info">
        <div class="tenant-name">${tenantName}</div>
    </div>
    
    <div class="highlight" style="border-left-color: ${urgencyColor};">
        <p style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600; color: ${urgencyColor};">
          ${urgencyText}: Maintenance in ${daysUntil} Day${daysUntil !== 1 ? 's' : ''}
        </p>
    </div>
    
    <h2>Equipment Details</h2>
    
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr>
            <td style="padding: 8px 0; font-weight: 600; color: #64748b; width: 180px;">Equipment Name:</td>
            <td style="padding: 8px 0;"><strong>${equipmentName}</strong></td>
        </tr>
        <tr>
            <td style="padding: 8px 0; font-weight: 600; color: #64748b;">Equipment Code:</td>
            <td style="padding: 8px 0;"><code style="background: #f1f5f9; padding: 4px 8px; border-radius: 4px;">${equipmentCode}</code></td>
        </tr>
        <tr>
            <td style="padding: 8px 0; font-weight: 600; color: #64748b;">Maintenance Type:</td>
            <td style="padding: 8px 0;">${maintenanceType.charAt(0).toUpperCase() + maintenanceType.slice(1).replace('_', ' ')}</td>
        </tr>
        <tr>
            <td style="padding: 8px 0; font-weight: 600; color: #64748b;">Scheduled Date:</td>
            <td style="padding: 8px 0;"><strong style="color: ${urgencyColor};">${formattedDate}</strong></td>
        </tr>
    </table>
    
    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <p style="margin: 0; font-size: 16px; line-height: 1.6;">
          This equipment is scheduled for maintenance in <strong>${daysUntil} day${daysUntil !== 1 ? 's' : ''}</strong>. 
          Please ensure all necessary preparations are made and the equipment is available for service.
        </p>
    </div>
    
    <div style="text-align: center; margin: 32px 0;">
        ${emailButtonHtml(viewLink, "View Equipment Details", "danger")}
    </div>
    
    <p style="color: #64748b; font-size: 14px; margin-top: 24px;">
        <strong>Note:</strong> This is an automated maintenance reminder from uventorybiz. 
        Please coordinate with your maintenance team to ensure timely service.
    </p>
  `;

  return getEmailTemplate(content);
}

/**
 * Email template for overdue maintenance reminders
 */
export function getOverdueMaintenanceReminderEmail(params: {
  tenantName: string;
  equipmentName: string;
  equipmentCode: string;
  maintenanceType: string;
  scheduledDate: Date;
  daysOverdue: number;
  viewLink: string;
}): string {
  const { tenantName, equipmentName, equipmentCode, maintenanceType, scheduledDate, daysOverdue, viewLink } = params;
  
  const formattedDate = scheduledDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const content = `
    <h1>⚠️ Equipment Maintenance Overdue</h1>
    
    <div class="tenant-info">
        <div class="tenant-name">${tenantName}</div>
    </div>
    
    <div class="highlight" style="border-left-color: #dc2626;">
        <p style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600; color: #dc2626;">
          OVERDUE: ${daysOverdue} Day${daysOverdue !== 1 ? 's' : ''} Past Due Date
        </p>
    </div>
    
    <h2>Equipment Details</h2>
    
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr>
            <td style="padding: 8px 0; font-weight: 600; color: #64748b; width: 180px;">Equipment Name:</td>
            <td style="padding: 8px 0;"><strong>${equipmentName}</strong></td>
        </tr>
        <tr>
            <td style="padding: 8px 0; font-weight: 600; color: #64748b;">Equipment Code:</td>
            <td style="padding: 8px 0;"><code style="background: #f1f5f9; padding: 4px 8px; border-radius: 4px;">${equipmentCode}</code></td>
        </tr>
        <tr>
            <td style="padding: 8px 0; font-weight: 600; color: #64748b;">Maintenance Type:</td>
            <td style="padding: 8px 0;">${maintenanceType.charAt(0).toUpperCase() + maintenanceType.slice(1).replace('_', ' ')}</td>
        </tr>
        <tr>
            <td style="padding: 8px 0; font-weight: 600; color: #64748b;">Original Scheduled Date:</td>
            <td style="padding: 8px 0;"><strong style="color: #dc2626;">${formattedDate}</strong></td>
        </tr>
        <tr>
            <td style="padding: 8px 0; font-weight: 600; color: #64748b;">Days Overdue:</td>
            <td style="padding: 8px 0;"><strong style="color: #dc2626; font-size: 16px;">${daysOverdue} day${daysOverdue !== 1 ? 's' : ''}</strong></td>
        </tr>
    </table>
    
    <div style="background: #fef2f2; border: 2px solid #fecaca; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <p style="margin: 0 0 12px 0; font-size: 16px; line-height: 1.6; color: #991b1b; font-weight: 600;">
          ⚠️ URGENT: This equipment maintenance is overdue by ${daysOverdue} day${daysOverdue !== 1 ? 's' : ''}.
        </p>
        <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #7f1d1d;">
          Immediate action is required. Please schedule maintenance as soon as possible to prevent equipment failure or compliance issues.
        </p>
    </div>
    
    <div style="text-align: center; margin: 32px 0;">
        ${emailButtonHtml(viewLink, "View Equipment Details", "danger")}
    </div>
    
    <p style="color: #64748b; font-size: 14px; margin-top: 24px;">
        <strong>Note:</strong> This is an automated overdue maintenance alert from uventorybiz. 
        Please prioritize this equipment for immediate maintenance service.
    </p>
  `;

  return getEmailTemplate(content);
}

/**
 * Bulk email template for maintenance reminders (equipment due within 7 days, including overdue)
 */
export function getBulkMaintenanceReminderEmail(params: {
  tenantName: string;
  equipmentList: Array<{
    itemName: string;
    itemCode: string;
    maintenanceType: string;
    scheduledDate: Date;
    daysUntil: number; // Can be negative for overdue
    equipmentId: string;
  }>;
  baseUrl: string;
}): string {
  const { tenantName, equipmentList, baseUrl } = params;
  
  const urgencyColor = '#ef4444'; // Red for urgency since we're checking 7 days

  const content = `
    <h1>🔧 Equipment Maintenance Reminder</h1>
    
    <div class="tenant-info">
        <div class="tenant-name">${tenantName}</div>
    </div>
    
    <div class="highlight" style="border-left-color: ${urgencyColor};">
        <p style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600; color: ${urgencyColor};">
          ${equipmentList.length} Equipment Item${equipmentList.length !== 1 ? 's' : ''} Due for Maintenance Within 7 Days
        </p>
    </div>
    
    <h2>Equipment Requiring Maintenance</h2>
    
    <div style="overflow-x: auto; margin: 20px 0;">
      <table style="width: 100%; min-width: 700px; border-collapse: collapse; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
        <thead>
          <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0;">
            <th style="padding: 12px; text-align: left; font-weight: 600; color: #1e293b; width: 50px;">#</th>
            <th style="padding: 12px; text-align: left; font-weight: 600; color: #1e293b;">Equipment Name</th>
            <th style="padding: 12px; text-align: left; font-weight: 600; color: #1e293b;">Equipment Code</th>
            <th style="padding: 12px; text-align: left; font-weight: 600; color: #1e293b;">Maintenance Type</th>
            <th style="padding: 12px; text-align: left; font-weight: 600; color: #1e293b;">Scheduled Date</th>
            <th style="padding: 12px; text-align: center; font-weight: 600; color: #1e293b;">Status</th>
            <th style="padding: 12px; text-align: center; font-weight: 600; color: #1e293b;">Action</th>
          </tr>
        </thead>
        <tbody>
          ${equipmentList.map((equipment, index) => {
            const formattedDate = equipment.scheduledDate.toLocaleDateString('en-US', {
              weekday: 'short',
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            });
            const viewLink = `${baseUrl}/inventory/${equipment.equipmentId}`;
            const rowBg = index % 2 === 0 ? '#ffffff' : '#f8fafc';
            
            // Determine status text and color based on daysUntil
            let statusText: string;
            let statusColor: string;
            if (equipment.daysUntil < 0) {
              const daysOverdue = Math.abs(equipment.daysUntil);
              statusText = `OVERDUE: ${daysOverdue} day${daysOverdue !== 1 ? 's' : ''}`;
              statusColor = '#dc2626'; // Red for overdue
            } else if (equipment.daysUntil === 0) {
              statusText = 'Due Today';
              statusColor = '#dc2626'; // Red for due today
            } else {
              statusText = `In ${equipment.daysUntil} day${equipment.daysUntil !== 1 ? 's' : ''}`;
              statusColor = '#ef4444'; // Orange-red for upcoming
            }
            
            return `
              <tr style="background: ${rowBg}; border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 12px; color: #64748b; font-weight: 500;">${index + 1}</td>
                <td style="padding: 12px; font-weight: 600; color: #1e293b;">${equipment.itemName}</td>
                <td style="padding: 12px; font-family: monospace; color: #475569; font-size: 13px;">${equipment.itemCode}</td>
                <td style="padding: 12px; color: #64748b;">${equipment.maintenanceType.charAt(0).toUpperCase() + equipment.maintenanceType.slice(1).replace('_', ' ')}</td>
                <td style="padding: 12px; color: ${equipment.daysUntil < 0 ? '#dc2626' : '#64748b'}; font-weight: ${equipment.daysUntil < 0 ? '600' : '400'};">${formattedDate}</td>
                <td style="padding: 12px; text-align: center; color: ${statusColor}; font-weight: 700; font-size: 14px;">${statusText}</td>
                <td style="padding: 12px; text-align: center;">
                  <a href="${viewLink}" style="color: ${urgencyColor}; text-decoration: none; font-weight: 600; font-size: 13px;">View →</a>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
    
    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <p style="margin: 0; font-size: 16px; line-height: 1.6;">
          <strong>Total Equipment:</strong> ${equipmentList.length} item${equipmentList.length !== 1 ? 's' : ''} ${equipmentList.length === 1 ? 'is' : 'are'} due for maintenance within 7 days. 
          Please ensure all necessary preparations are made and the equipment is available for service.
        </p>
    </div>
    
    <div style="text-align: center; margin: 32px 0;">
        ${emailButtonHtml(`${baseUrl}/inventory?category=equipment`, "View All Equipment", "primary")}
    </div>
    
    <p style="color: #64748b; font-size: 14px; margin-top: 24px;">
        <strong>Note:</strong> This is an automated maintenance reminder from uventorybiz. 
        Please coordinate with your maintenance team to ensure timely service.
    </p>
  `;

  return getEmailTemplate(content);
}

/**
 * Email template for employee wellbeing follow-up due/overdue digest
 */
export function getFollowUpDueReminderEmail(params: {
  tenantName: string;
  followUpList: Array<{
    subjectName: string;
    scheduledDate: string;
    reason: string;
    careContext: string;
    followUpId: string;
    isOverdue: boolean;
  }>;
  baseUrl: string;
}): string {
  const { tenantName, followUpList, baseUrl } = params;
  const viewLink = `${baseUrl}/wellbeing/follow-ups`;
  const overdueCount = followUpList.filter((f) => f.isOverdue).length;

  const content = `
    <h1>📋 Follow-up reminder</h1>
    
    <div class="tenant-info">
        <div class="tenant-name">${tenantName}</div>
        <div class="tenant-subtitle">Employee wellbeing – due / overdue follow-ups</div>
    </div>
    
    <div class="highlight" style="border-left-color: #f59e0b;">
        <p style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600; color: #b45309;">
          ${followUpList.length} follow-up${followUpList.length !== 1 ? 's' : ''} due or overdue
          ${overdueCount > 0 ? `(${overdueCount} overdue)` : ''}
        </p>
    </div>
    
    <h2>Follow-ups requiring action</h2>
    
    <div style="overflow-x: auto; margin: 20px 0;">
      <table style="width: 100%; min-width: 600px; border-collapse: collapse; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
        <thead>
          <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0;">
            <th style="padding: 12px; text-align: left; font-weight: 600; color: #1e293b;">Employee</th>
            <th style="padding: 12px; text-align: left; font-weight: 600; color: #1e293b;">Scheduled</th>
            <th style="padding: 12px; text-align: left; font-weight: 600; color: #1e293b;">Reason</th>
            <th style="padding: 12px; text-align: left; font-weight: 600; color: #1e293b;">Context</th>
            <th style="padding: 12px; text-align: center; font-weight: 600; color: #1e293b;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${followUpList.map((row, index) => {
            const rowBg = index % 2 === 0 ? '#ffffff' : '#f8fafc';
            const statusText = row.isOverdue ? 'Overdue' : 'Due';
            const statusColor = row.isOverdue ? '#dc2626' : '#f59e0b';
            return `
              <tr style="background: ${rowBg}; border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 12px; font-weight: 600; color: #1e293b;">${row.subjectName || '—'}</td>
                <td style="padding: 12px; color: #64748b;">${row.scheduledDate}</td>
                <td style="padding: 12px; color: #475569; font-size: 14px;">${(row.reason || '—').slice(0, 60)}${(row.reason?.length || 0) > 60 ? '…' : ''}</td>
                <td style="padding: 12px; color: #64748b;">${row.careContext === 'external' ? 'External' : 'Onsite'}</td>
                <td style="padding: 12px; text-align: center; color: ${statusColor}; font-weight: 600;">${statusText}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
    
    <div style="text-align: center; margin: 32px 0;">
        ${emailButtonHtml(viewLink, "View follow-ups", "primary")}
    </div>
    
    <p style="color: #64748b; font-size: 14px; margin-top: 24px;">
        This is an automated reminder from uventorybiz. Complete or reschedule these follow-ups in Employee wellbeing.
    </p>
  `;

  return getEmailTemplate(content);
}

/**
 * Bulk email template for overdue maintenance reminders
 */
export function getBulkOverdueMaintenanceReminderEmail(params: {
  tenantName: string;
  equipmentList: Array<{
    itemName: string;
    itemCode: string;
    maintenanceType: string;
    scheduledDate: Date;
    daysOverdue: number;
    equipmentId: string;
  }>;
  baseUrl: string;
}): string {
  const { tenantName, equipmentList, baseUrl } = params;

  const content = `
    <h1>⚠️ Equipment Maintenance Overdue</h1>
    
    <div class="tenant-info">
        <div class="tenant-name">${tenantName}</div>
    </div>
    
    <div class="highlight" style="border-left-color: #dc2626;">
        <p style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600; color: #dc2626;">
          URGENT: ${equipmentList.length} Equipment Item${equipmentList.length !== 1 ? 's' : ''} Require Immediate Maintenance
        </p>
    </div>
    
    <h2>Overdue Equipment</h2>
    
    <div style="overflow-x: auto; margin: 20px 0;">
      <table style="width: 100%; min-width: 700px; border-collapse: collapse; background: #ffffff; border: 1px solid #fecaca; border-radius: 8px; overflow: hidden;">
        <thead>
          <tr style="background: #fef2f2; border-bottom: 2px solid #fecaca;">
            <th style="padding: 12px; text-align: left; font-weight: 600; color: #991b1b; width: 50px;">#</th>
            <th style="padding: 12px; text-align: left; font-weight: 600; color: #991b1b;">Equipment Name</th>
            <th style="padding: 12px; text-align: left; font-weight: 600; color: #991b1b;">Equipment Code</th>
            <th style="padding: 12px; text-align: left; font-weight: 600; color: #991b1b;">Maintenance Type</th>
            <th style="padding: 12px; text-align: left; font-weight: 600; color: #991b1b;">Original Date</th>
            <th style="padding: 12px; text-align: center; font-weight: 600; color: #991b1b;">Days Overdue</th>
            <th style="padding: 12px; text-align: center; font-weight: 600; color: #991b1b;">Action</th>
          </tr>
        </thead>
        <tbody>
          ${equipmentList.map((equipment, index) => {
            const formattedDate = equipment.scheduledDate.toLocaleDateString('en-US', {
              weekday: 'short',
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            });
            const viewLink = `${baseUrl}/inventory/${equipment.equipmentId}`;
            const rowBg = index % 2 === 0 ? '#ffffff' : '#fef2f2';
            return `
              <tr style="background: ${rowBg}; border-bottom: 1px solid #fecaca;">
                <td style="padding: 12px; color: #64748b; font-weight: 500;">${index + 1}</td>
                <td style="padding: 12px; font-weight: 600; color: #1e293b;">${equipment.itemName}</td>
                <td style="padding: 12px; font-family: monospace; color: #475569; font-size: 13px;">${equipment.itemCode}</td>
                <td style="padding: 12px; color: #64748b;">${equipment.maintenanceType.charAt(0).toUpperCase() + equipment.maintenanceType.slice(1).replace('_', ' ')}</td>
                <td style="padding: 12px; color: #7f1d1d;">${formattedDate}</td>
                <td style="padding: 12px; text-align: center; color: #dc2626; font-weight: 700; font-size: 15px;">${equipment.daysOverdue} days</td>
                <td style="padding: 12px; text-align: center;">
                  <a href="${viewLink}" style="color: #dc2626; text-decoration: none; font-weight: 600; font-size: 13px;">View →</a>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
    
    <div style="background: #fef2f2; border: 2px solid #fecaca; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <p style="margin: 0 0 12px 0; font-size: 16px; line-height: 1.6; color: #991b1b; font-weight: 600;">
          ⚠️ URGENT: ${equipmentList.length} equipment item${equipmentList.length !== 1 ? 's' : ''} ${equipmentList.length === 1 ? 'is' : 'are'} overdue for maintenance.
        </p>
        <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #7f1d1d;">
          Immediate action is required. Please schedule maintenance as soon as possible to prevent equipment failure or compliance issues.
        </p>
    </div>
    
    <div style="text-align: center; margin: 32px 0;">
        ${emailButtonHtml(`${baseUrl}/inventory?category=equipment`, "View All Equipment", "danger")}
    </div>
    
    <p style="color: #64748b; font-size: 14px; margin-top: 24px;">
        <strong>Note:</strong> This is an automated overdue maintenance alert from uventorybiz. 
        Please prioritize these equipment items for immediate maintenance service.
    </p>
  `;

  return getEmailTemplate(content);
}

/**
 * Legacy function name for backward compatibility - redirects to upcoming reminder
 */
export function getMaintenanceReminderEmail(params: {
  tenantName: string;
  equipmentName: string;
  equipmentCode: string;
  maintenanceType: string;
  scheduledDate: Date;
  daysUntil: number;
  viewLink: string;
}): string {
  // If daysUntil is negative, it's overdue - use overdue template
  if (params.daysUntil < 0) {
    return getOverdueMaintenanceReminderEmail({
      tenantName: params.tenantName,
      equipmentName: params.equipmentName,
      equipmentCode: params.equipmentCode,
      maintenanceType: params.maintenanceType,
      scheduledDate: params.scheduledDate,
      daysOverdue: Math.abs(params.daysUntil),
      viewLink: params.viewLink,
    });
  }
  return getUpcomingMaintenanceReminderEmail(params);
}

export function getRoleUpdateEmail(params: {
  firstName: string;
  lastName: string;
  newRole: string;
  tenantName: string;
  updatedBy?: string;
}): string {
  const roleDisplayNames: Record<string, string> = {
    'staff': 'Staff',
    'operations': 'Operations',
    'fleet_operator': 'Fleet operator',
    'admin': 'Admin',
  };

  const content = `
    <h1>Role Update Notification</h1>
    
    <p>Dear ${params.firstName} ${params.lastName},</p>
    
    <p>Your role in uventorybiz has been updated${params.updatedBy ? ` by ${params.updatedBy}` : ''}.</p>
    
    <div class="highlight">
        <p><strong>Organization:</strong> ${params.tenantName}</p>
        <p><strong>New Role:</strong> ${roleDisplayNames[params.newRole] || params.newRole}</p>
        <p><strong>Effective:</strong> Immediately</p>
    </div>
    
    <p>Your new permissions and access levels will take effect on your next login to the system.</p>
    
    <h2>What This Means</h2>
    <p>With your new role as ${roleDisplayNames[params.newRole] || params.newRole}, you now have access to additional features and responsibilities within the uventorybiz platform.</p>
    
    <p>If you have any questions about your new role or need assistance with the updated features, please contact your system administrator.</p>
    
    <p>Thank you for your continued service.</p>
    <p><strong>The uventorybiz Team</strong></p>
  `;

  return getEmailTemplate(content);
}

export function getApprovalEmail(params: {
  firstName: string;
  lastName: string;
  tenantName: string;
  approvedBy?: string;
}): string {
  const content = `
    <h1>Account Approved!</h1>
    
    <p>Dear ${params.firstName} ${params.lastName},</p>
    
    <p>Great news! Your uventorybiz account has been approved${params.approvedBy ? ` by ${params.approvedBy}` : ''} and is now active.</p>
    
    <div class="tenant-info">
        <div class="tenant-name">${params.tenantName}</div>
        <div class="tenant-subtitle">Business operations platform</div>
    </div>
    
    <div class="highlight">
        <p><strong>Status:</strong> Account Active</p>
        <p><strong>Organization:</strong> ${params.tenantName}</p>
        <p><strong>Access:</strong> Full system access granted</p>
    </div>
    
    <p>You can now access all features of uventorybiz with your approved account.</p>
    
    <div style="text-align: center;">
        ${emailButtonHtml(process.env.REPLIT_DOMAINS ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}/auth` : 'http://localhost:17009/auth', "Access uventorybiz", "navy")}
    </div>
    
    <h2>Next Steps</h2>
    <p>Now that your account is active, you can:</p>
    <ul>
        <li>Log in to your dashboard</li>
        <li>Complete your profile setup</li>
        <li>Begin managing inventory and operations</li>
        <li>Schedule appointments and manage healthcare operations</li>
    </ul>
    
    <p>Welcome to the uventorybiz family!</p>
    <p><strong>The uventorybiz Team</strong></p>
  `;

  return getEmailTemplate(content);
}

export function getIncidentAlertEmail(params: {
  incidentId: string;
  incidentType: string;
  severity: string;
  location: string;
  reportedBy: string;
  incidentDate: Date;
  description?: string;
  patientName?: string;
  jobTitle?: string;
  status?: string;
  viewLink: string;
  tenantName: string;
}): string {
  const severityColors: Record<string, string> = {
    'low': '#3b82f6',
    'medium': '#f59e0b',
    'high': '#ef4444',
    'critical': '#dc2626',
  };

  const severityBadges: Record<string, string> = {
    'low': 'Low',
    'medium': 'Medium',
    'high': 'High',
    'critical': 'Critical',
  };

  const severityColor = severityColors[params.severity.toLowerCase()] || '#6b7280';
  const severityBadge = severityBadges[params.severity.toLowerCase()] || params.severity;

  const formattedDate = new Date(params.incidentDate).toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const content = `
    <h1>🚨 New Incident Reported</h1>
    
    <div class="tenant-info">
        <div class="tenant-name">${params.tenantName}</div>
    </div>
    
    <div class="highlight" style="border-left-color: ${severityColor};">
        <p style="margin: 0 0 8px 0;"><strong>Severity:</strong> 
        <span style="background: ${severityColor}; color: white; padding: 4px 12px; border-radius: 4px; font-weight: 600; display: inline-block;">
          ${severityBadge}
        </span></p>
        <p style="margin: 8px 0 0 0;"><strong>Incident Type:</strong> ${params.incidentType}</p>
    </div>
    
    <h2>Incident Details</h2>
    
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr>
            <td style="padding: 8px 0; font-weight: 600; color: #64748b; width: 140px;">Incident ID:</td>
            <td style="padding: 8px 0;"><code style="background: #f1f5f9; padding: 4px 8px; border-radius: 4px; font-family: monospace;">#${params.incidentId.substring(0, 8)}</code></td>
        </tr>
        ${params.patientName ? `
        <tr>
            <td style="padding: 8px 0; font-weight: 600; color: #64748b;">Customer:</td>
            <td style="padding: 8px 0;">${params.patientName}</td>
        </tr>
        ` : ''}
        ${params.jobTitle ? `
        <tr>
            <td style="padding: 8px 0; font-weight: 600; color: #64748b;">Job Title:</td>
            <td style="padding: 8px 0;">${params.jobTitle}</td>
        </tr>
        ` : ''}
        <tr>
            <td style="padding: 8px 0; font-weight: 600; color: #64748b;">Location:</td>
            <td style="padding: 8px 0;">${params.location}</td>
        </tr>
        <tr>
            <td style="padding: 8px 0; font-weight: 600; color: #64748b;">Reported By:</td>
            <td style="padding: 8px 0;">${params.reportedBy}</td>
        </tr>
        <tr>
            <td style="padding: 8px 0; font-weight: 600; color: #64748b;">Date & Time:</td>
            <td style="padding: 8px 0;">${formattedDate}</td>
        </tr>
        ${params.status ? `
        <tr>
            <td style="padding: 8px 0; font-weight: 600; color: #64748b;">Status:</td>
            <td style="padding: 8px 0;">${params.status}</td>
        </tr>
        ` : ''}
    </table>
    
    ${params.description ? `
    <div class="highlight" style="margin-top: 24px;">
        <h3 style="margin: 0 0 12px 0; color: #1e293b; font-size: 18px;">Description</h3>
        <p style="margin: 0; white-space: pre-wrap;">${params.description}</p>
    </div>
    ` : ''}
    
    <div style="text-align: center; margin: 32px 0;">
        ${emailButtonHtml(params.viewLink, "View Incident Details", "danger")}
    </div>
    
    <p style="color: #64748b; font-size: 14px; margin-top: 24px;">
        <strong>Note:</strong> This is an automated notification from uventorybiz. 
        Please review the incident details and take appropriate action as required.
    </p>
  `;

  return getEmailTemplate(content);
}

export function getInventoryAlertEmail(params: {
  alertType: 'low_stock' | 'expiry' | 'equipment_maintenance' | 'equipment_failure';
  itemName: string;
  itemCode: string;
  severity: string;
  message: string;
  viewLink: string;
  tenantName: string;
  currentStock?: number;
  minimumStock?: number;
  expiryDate?: Date;
  daysToExpiry?: number;
}): string {
  const alertTypeLabels: Record<string, { label: string; icon: string; color: string }> = {
    'low_stock': { label: 'Low Stock Alert', icon: '📦', color: '#f59e0b' },
    'expiry': { label: 'Expiry Alert', icon: '⏰', color: '#ef4444' },
    'equipment_maintenance': { label: 'Maintenance Due', icon: '🔧', color: '#3b82f6' },
    'equipment_failure': { label: 'Equipment Failure', icon: '⚠️', color: '#dc2626' },
  };

  const alertInfo = alertTypeLabels[params.alertType] || { label: 'Inventory Alert', icon: '📋', color: '#6b7280' };
  const severityColors: Record<string, string> = {
    'low': '#3b82f6',
    'medium': '#f59e0b',
    'high': '#ef4444',
    'critical': '#dc2626',
  };

  const severityColor = severityColors[params.severity.toLowerCase()] || '#6b7280';

  const formattedExpiryDate = params.expiryDate 
    ? new Date(params.expiryDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  const content = `
    <h1>${alertInfo.icon} ${alertInfo.label}</h1>
    
    <div class="tenant-info">
        <div class="tenant-name">${params.tenantName}</div>
    </div>
    
    <div class="highlight" style="border-left-color: ${alertInfo.color};">
        <p style="margin: 0 0 8px 0;"><strong>Item:</strong> ${params.itemName}</p>
        <p style="margin: 8px 0;"><strong>Item Code:</strong> <code style="background: #f1f5f9; padding: 2px 6px; border-radius: 3px;">${params.itemCode}</code></p>
        <p style="margin: 8px 0 0 0;"><strong>Severity:</strong> 
        <span style="background: ${severityColor}; color: white; padding: 4px 12px; border-radius: 4px; font-weight: 600; display: inline-block; margin-top: 4px;">
          ${params.severity.charAt(0).toUpperCase() + params.severity.slice(1)}
        </span></p>
    </div>
    
    <h2>Alert Details</h2>
    
    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <p style="margin: 0 0 12px 0; font-size: 16px; line-height: 1.6;">${params.message}</p>
    </div>
    
    ${params.currentStock !== undefined && params.minimumStock !== undefined ? `
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr>
            <td style="padding: 8px 0; font-weight: 600; color: #64748b; width: 140px;">Current Stock:</td>
            <td style="padding: 8px 0;"><strong style="color: ${params.currentStock <= params.minimumStock ? '#ef4444' : '#059669'};">
              ${params.currentStock} units
            </strong></td>
        </tr>
        <tr>
            <td style="padding: 8px 0; font-weight: 600; color: #64748b;">Minimum Stock:</td>
            <td style="padding: 8px 0;">${params.minimumStock} units</td>
        </tr>
    </table>
    ` : ''}
    
    ${formattedExpiryDate ? `
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr>
            <td style="padding: 8px 0; font-weight: 600; color: #64748b; width: 140px;">Expiry Date:</td>
            <td style="padding: 8px 0;"><strong style="color: ${params.daysToExpiry && params.daysToExpiry <= 7 ? '#ef4444' : '#f59e0b'};">
              ${formattedExpiryDate}
            </strong></td>
        </tr>
        ${params.daysToExpiry !== undefined ? `
        <tr>
            <td style="padding: 8px 0; font-weight: 600; color: #64748b;">Days Remaining:</td>
            <td style="padding: 8px 0;">${params.daysToExpiry} day${params.daysToExpiry !== 1 ? 's' : ''}</td>
        </tr>
        ` : ''}
    </table>
    ` : ''}
    
    <div style="text-align: center; margin: 32px 0;">
        ${emailButtonHtml(params.viewLink, "View Inventory Item", "primary")}
    </div>
    
    <p style="color: #64748b; font-size: 14px; margin-top: 24px;">
        <strong>Note:</strong> This is an automated notification from uventorybiz. 
        Please review the inventory item and take appropriate action as required.
    </p>
  `;

  return getEmailTemplate(content);
}
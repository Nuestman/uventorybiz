import { Mail, Phone } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { PortalSessionPayload } from "../usePortalSession";
import { getPortalTenantContact, PORTAL_PRIMARY_TEXT_CLASS } from "../portalUi";

type PortalCareContactCardProps = {
  session: PortalSessionPayload;
  tenantLabel: string;
};

export function PortalCareContactCard({ session, tenantLabel }: PortalCareContactCardProps) {
  const contact = getPortalTenantContact(session);
  if (!contact.email && !contact.phone) return null;

  return (
    <Card className="border-gray-200 bg-white/80">
      <CardContent className="py-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-start gap-2 text-uventorybiz-gray min-w-0">
          <Mail className="h-4 w-4 shrink-0 mt-0.5" />
          <p className="text-sm">
            Questions about your care? Contact {tenantLabel}
            {contact.email ? (
              <>
                {" "}
                at{" "}
                <a
                  href={`mailto:${contact.email}`}
                  className={`font-medium underline ${PORTAL_PRIMARY_TEXT_CLASS}`}
                >
                  {contact.email}
                </a>
              </>
            ) : null}
            {contact.phone ? (
              <>
                {contact.email ? " or " : " at "}
                <a
                  href={`tel:${contact.phone.replace(/\s/g, "")}`}
                  className={`font-medium underline inline-flex items-center gap-1 ${PORTAL_PRIMARY_TEXT_CLASS}`}
                >
                  <Phone className="h-3.5 w-3.5" />
                  {contact.phone}
                </a>
              </>
            ) : null}
            .
          </p>
        </div>
        {session.privacyPolicyUrl ? (
          <a
            href={session.privacyPolicyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-uventorybiz-gray underline sm:ml-auto shrink-0"
          >
            Privacy policy
          </a>
        ) : null}
      </CardContent>
    </Card>
  );
}

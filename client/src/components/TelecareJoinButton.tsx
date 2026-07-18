/** Stub — full telecare UI archived under /purged. */

type TelecareJoinEligibility = { ok: boolean; reason?: string };

type TelecareJoinButtonProps = {
  sessionId?: string;
  apiPrefix?: "staff" | "portal";
  videoProvider?: string | null;
  disabled?: boolean;
  disabledReason?: string;
  size?: "sm" | "default";
  label?: string;
  className?: string;
};

export default function TelecareJoinButton(_props: TelecareJoinButtonProps) {
  return null;
}

export function canStaffJoinTelecare(_appointment: Record<string, unknown>): TelecareJoinEligibility {
  return { ok: false };
}

export function canPatientJoinTelecare(_input: Record<string, unknown>): TelecareJoinEligibility {
  return { ok: false };
}

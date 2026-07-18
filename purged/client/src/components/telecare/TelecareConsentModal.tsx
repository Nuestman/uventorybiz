import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { TELEHEALTH_CONSENT_TEXT } from "@shared/telecare";
import { useState } from "react";

type TelecareConsentModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAccept: () => void;
  accepting?: boolean;
  primaryColor?: string;
};

export default function TelecareConsentModal({
  open,
  onOpenChange,
  onAccept,
  accepting,
  primaryColor = "#142F5C",
}: TelecareConsentModalProps) {
  const [checked, setChecked] = useState(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <div className="h-1.5 -mt-6 -mx-6 mb-4 rounded-t-lg" style={{ backgroundColor: primaryColor }} />
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-mineaid-navy" />
            Telehealth consent required
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-3 text-sm text-mineaid-gray pt-2">
              <p>{TELEHEALTH_CONSENT_TEXT}</p>
            </div>
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
          <Checkbox
            id="telehealth-consent"
            checked={checked}
            onCheckedChange={(v) => setChecked(v === true)}
          />
          <Label htmlFor="telehealth-consent" className="text-sm leading-snug cursor-pointer">
            I have read and accept the telehealth consent statement above.
          </Label>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!checked || accepting}
            className="bg-mineaid-navy text-white hover:bg-mineaid-navy/90"
            onClick={onAccept}
          >
            {accepting ? "Saving…" : "Accept and continue"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

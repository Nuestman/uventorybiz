import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PartyPopper } from "lucide-react";

interface CongratsModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  message: string;
}

export default function CongratsModal({ open, onClose, title, message }: CongratsModalProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-sm text-center sm:max-w-md" data-testid="congrats-modal">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600">
            <PartyPopper className="h-6 w-6" />
          </div>
          <DialogTitle className="text-xl">{title}</DialogTitle>
        </DialogHeader>
        <p className="text-muted-foreground">{message}</p>
        <div className="flex justify-center pt-2">
          <Button onClick={onClose} className="min-w-[120px]">
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

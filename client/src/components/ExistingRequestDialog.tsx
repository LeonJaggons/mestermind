import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ExistingRequestDialogProps {
  open: boolean;
  onContinue: () => void;
  onStartNew: () => void;
}

export default function ExistingRequestDialog({
  open,
  onContinue,
  onStartNew,
}: ExistingRequestDialogProps) {
  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Existing Request Found</DialogTitle>
          <DialogDescription>
            You already have a request for this service in this location. Would
            you like to continue with your existing request or start a new one?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex gap-2 sm:gap-2">
          <Button
            size={"lg"}
            variant="outline"
            onClick={onStartNew}
            className="flex-1"
          >
            Start New Request
          </Button>
          <Button size={"lg"} onClick={onContinue} className={"flex-1"}>
            Continue Existing Request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

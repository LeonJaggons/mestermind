import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { HiSparkles } from "react-icons/hi";

interface PaywallModalProps {
  open: boolean;
  onClose: () => void;
  onUpgrade: () => void;
  audience: "mester" | "customer";
  titleOverride?: string;
  bodyOverride?: string;
  ctaOverride?: string;
}

export default function PaywallModal({ open, onClose, onUpgrade, audience, titleOverride, bodyOverride, ctaOverride }: PaywallModalProps) {
  const defaultTitle = audience === "mester" ? "Unlock this lead to keep chatting" : "Book to continue the conversation";
  const defaultBody = audience === "mester"
    ? "You've reached the free message limit. Unlock this conversation to send your next reply, share details, and win more jobs."
    : "You've reached the free message limit. Book now to continue chatting, secure priority support, and fast-track your project.";

  const bullets = audience === "mester" ? [
    "Respond instantly and stand out",
    "Send quotes and attachments",
    "Build trust with verified profile",
  ] : [
    "Priority responses from top pros",
    "Clear pricing and availability",
    "Protected payments and support",
  ];

  const cta = ctaOverride || (audience === "mester" ? "Unlock lead" : "Book now");

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HiSparkles className="h-5 w-5 text-yellow-500" /> {titleOverride || defaultTitle}
          </DialogTitle>
          <DialogDescription>{bodyOverride || defaultBody}</DialogDescription>
        </DialogHeader>
        <ul className="mt-2 space-y-2 text-sm text-gray-700">
          {bullets.map((b) => (
            <li key={b} className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span>{b}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex gap-2 justify-end">
          <Button variant="ghost" onClick={onClose}>Not now</Button>
          <Button onClick={onUpgrade}>{cta}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}



import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createOffer, type CustomerRequest } from "@/lib/api";
import { DollarSign, Clock, FileText, Send } from "lucide-react";

interface SendOfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  requestId: string;
  mesterId: string;
  customerBudget?: number;
  serviceName?: string;
  onSuccess?: () => void;
}

export default function SendOfferModal({
  isOpen,
  onClose,
  requestId,
  mesterId,
  customerBudget,
  serviceName,
  onSuccess,
}: SendOfferModalProps) {
  const [price, setPrice] = useState<string>("");
  const [estimatedDuration, setEstimatedDuration] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [timeline, setTimeline] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!price || isNaN(Number(price)) || Number(price) <= 0) {
      setError("Please enter a valid price");
      return;
    }

    setIsSubmitting(true);

    try {
      await createOffer({
        request_id: requestId,
        mester_id: mesterId,
        price: Number(price),
        estimated_duration: estimatedDuration || undefined,
        description: description || undefined,
        timeline: timeline || undefined,
      });

      // Reset form
      setPrice("");
      setEstimatedDuration("");
      setDescription("");
      setTimeline("");

      if (onSuccess) {
        onSuccess();
      }

      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send offer");
    } finally {
      setIsSubmitting(false);
    }
  };

  const suggestedPrice = customerBudget
    ? Math.round(customerBudget * 0.95)
    : undefined;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Send Your Quote</DialogTitle>
          <DialogDescription>
            {serviceName && (
              <>
                Submit your quote for <strong>{serviceName}</strong>
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-6 py-4">
            {/* Price */}
            <div className="space-y-2">
              <Label htmlFor="price" className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Your Quote Price *
              </Label>
              <div className="relative">
                <Input
                  id="price"
                  type="number"
                  placeholder="Enter your price"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  required
                  className="pr-12"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                  Ft
                </span>
              </div>
              {suggestedPrice && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Customer budget:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">
                      {new Intl.NumberFormat("hu-HU").format(customerBudget!)} Ft
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setPrice(suggestedPrice.toString())}
                    >
                      Use {new Intl.NumberFormat("hu-HU").format(suggestedPrice)} Ft
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Estimated Duration */}
            <div className="space-y-2">
              <Label htmlFor="duration" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Estimated Duration
              </Label>
              <Input
                id="duration"
                type="text"
                placeholder="e.g., 2-3 days, 1 week, 3 hours"
                value={estimatedDuration}
                onChange={(e) => setEstimatedDuration(e.target.value)}
              />
              <p className="text-xs text-gray-500">
                How long will the job take?
              </p>
            </div>

            {/* Timeline */}
            <div className="space-y-2">
              <Label htmlFor="timeline" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                When can you start?
              </Label>
              <Input
                id="timeline"
                type="text"
                placeholder="e.g., Next week, This weekend, Within 2 days"
                value={timeline}
                onChange={(e) => setTimeline(e.target.value)}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Details & Scope
              </Label>
              <textarea
                id="description"
                className="w-full min-h-[120px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Describe what's included in your quote, your approach, materials, etc."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <p className="text-xs text-gray-500">
                Help the customer understand what they're getting
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Tips */}
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <h4 className="text-sm font-semibold text-blue-900 mb-2">
                💡 Tips for a strong quote
              </h4>
              <ul className="text-xs text-blue-800 space-y-1">
                <li>• Be competitive but fair with your pricing</li>
                <li>• Clearly explain what's included</li>
                <li>• Mention any relevant experience or certifications</li>
                <li>• Be specific about timing and availability</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !price}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSubmitting ? (
                "Sending..."
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Quote
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


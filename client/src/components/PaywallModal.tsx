import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  HiSparkles,
  HiTrendingUp,
  HiClock,
  HiUsers,
  HiCash,
  HiCreditCard,
  HiTrash,
  HiCheck,
} from "react-icons/hi";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import {
  getThreadLeadPrice,
  LeadPrice,
  createPaymentIntent,
  createPaymentIntentWithMethod,
  listSavedPaymentMethods,
  deleteSavedPaymentMethod,
  SavedPaymentMethod,
} from "@/lib/api";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";

// Initialize Stripe - you'll need to add your publishable key
const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "",
);

interface PaywallModalProps {
  open: boolean;
  onClose: () => void;
  onUpgrade: () => void;
  audience: "mester" | "customer";
  threadId?: string;
  mesterId?: string;
  requestId?: string;
  titleOverride?: string;
  bodyOverride?: string;
  ctaOverride?: string;
}

// Payment Form Component that uses Stripe Elements
function PaymentForm({
  onSuccess,
  onError,
  saveCard,
  onSaveCardChange,
  showSaveOption,
}: {
  onSuccess: () => void;
  onError: (error: string) => void;
  saveCard: boolean;
  onSaveCardChange: (save: boolean) => void;
  showSaveOption: boolean;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/pro/messages`,
        },
        redirect: "if_required",
      });

      if (error) {
        onError(error.message || "Payment failed");
      } else if (paymentIntent && paymentIntent.status === "succeeded") {
        // Payment succeeded - confirm on backend to create lead purchase
        try {
          const { confirmPayment } = await import("@/lib/api");
          // Use the Stripe payment intent ID from the confirmed payment
          await confirmPayment(paymentIntent.id);
          onSuccess();
        } catch (confirmError) {
          console.error("Failed to confirm payment on backend:", confirmError);
          onError(
            "Payment succeeded but failed to unlock lead. Please contact support.",
          );
        }
      } else {
        onError("Payment status: " + (paymentIntent?.status || "unknown"));
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      
      {/* Save card checkbox - shown only when entering new card */}
      {showSaveOption && (
        <label className="flex items-center gap-2 cursor-pointer p-3 bg-gray-50 rounded-lg">
          <input
            type="checkbox"
            checked={saveCard}
            onChange={(e) => onSaveCardChange(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700">
            Save this card for future purchases
          </span>
        </label>
      )}
      
      <Button
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full"
      >
        {isProcessing ? "Processing..." : "Pay now"}
      </Button>
    </form>
  );
}

export default function PaywallModal({
  open,
  onClose,
  onUpgrade,
  audience,
  threadId,
  mesterId,
  requestId,
  titleOverride,
  bodyOverride,
  ctaOverride,
}: PaywallModalProps) {
  const router = useRouter();
  const [pricing, setPricing] = useState<LeadPrice | null>(null);
  const [loadingPrice, setLoadingPrice] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [savedPaymentMethods, setSavedPaymentMethods] = useState<
    SavedPaymentMethod[]
  >([]);
  const [loadingMethods, setLoadingMethods] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<
    string | null
  >(null);
  const [showNewCardForm, setShowNewCardForm] = useState(false);
  const [saveNewCard, setSaveNewCard] = useState(false);

  // Fetch dynamic pricing when modal opens and threadId is provided
  useEffect(() => {
    if (open && threadId && audience === "mester") {
      setLoadingPrice(true);
      getThreadLeadPrice(threadId)
        .then(setPricing)
        .catch((err) => {
          console.error("Failed to fetch lead price:", err);
          setPricing(null);
        })
        .finally(() => setLoadingPrice(false));
    } else {
      setPricing(null);
    }
  }, [open, threadId, audience]);

  // Load saved payment methods when modal opens for mesters
  useEffect(() => {
    if (open && mesterId && audience === "mester") {
      setLoadingMethods(true);
      listSavedPaymentMethods(mesterId)
        .then((result) => {
          setSavedPaymentMethods(result.payment_methods);
          // Auto-select default payment method
          const defaultMethod = result.payment_methods.find(
            (pm) => pm.is_default,
          );
          if (defaultMethod) {
            setSelectedPaymentMethod(defaultMethod.stripe_payment_method_id);
          }
        })
        .catch((err) => {
          console.error("Failed to fetch saved payment methods:", err);
          setSavedPaymentMethods([]);
        })
        .finally(() => setLoadingMethods(false));
    } else {
      setSavedPaymentMethods([]);
      setSelectedPaymentMethod(null);
    }
  }, [open, mesterId, audience]);

  // Reset payment form when modal closes
  useEffect(() => {
    if (!open) {
      setShowPaymentForm(false);
      setClientSecret(null);
    }
  }, [open]);

  const defaultTitle =
    audience === "mester"
      ? "Unlock this lead to keep chatting"
      : "Book to continue the conversation";
  const defaultBody =
    audience === "mester"
      ? "You've reached the free message limit. Unlock this conversation to send your next reply, share details, and win more jobs."
      : "You've reached the free message limit. Book now to continue chatting, secure priority support, and fast-track your project.";

  const bullets =
    audience === "mester"
      ? [
          "Respond instantly and stand out",
          "Send quotes and attachments",
          "Build trust with verified profile",
        ]
      : [
          "Priority responses from top pros",
          "Clear pricing and availability",
          "Protected payments and support",
        ];

  const cta =
    ctaOverride || (audience === "mester" ? "Unlock lead" : "Book now");

  const handleStartPayment = async () => {
    if (!mesterId || !requestId) {
      console.error("Missing mesterId or requestId");
      return;
    }

    setProcessingPayment(true);

    try {
      // If using a saved payment method, create intent with that method
      if (selectedPaymentMethod && !showNewCardForm) {
        const paymentIntent = await createPaymentIntentWithMethod(
          requestId,
          mesterId,
          threadId,
          selectedPaymentMethod,
          false, // Don't save again
        );

        // If payment succeeded immediately (with saved method), handle success
        if (paymentIntent.status === "succeeded") {
          handlePaymentSuccess();
          return;
        }

        // Otherwise show form if needed
        setClientSecret(paymentIntent.client_secret);
        setShowPaymentForm(true);
      } else {
        // Create payment intent for new card
        const paymentIntent = await createPaymentIntentWithMethod(
          requestId,
          mesterId,
          threadId,
          undefined,
          saveNewCard, // Save if checkbox is checked
        );

        setClientSecret(paymentIntent.client_secret);
        setShowPaymentForm(true);
      }
    } catch (error) {
      console.error("Payment error:", error);
      alert(
        `Payment error: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleDeletePaymentMethod = async (paymentMethodId: string) => {
    if (!mesterId) return;

    try {
      await deleteSavedPaymentMethod(mesterId, paymentMethodId);
      // Refresh the list
      setSavedPaymentMethods((prev) =>
        prev.filter((pm) => pm.id !== paymentMethodId),
      );
      if (selectedPaymentMethod === paymentMethodId) {
        setSelectedPaymentMethod(null);
      }
    } catch (error) {
      console.error("Failed to delete payment method:", error);
      alert("Failed to delete payment method");
    }
  };

  const handlePaymentSuccess = () => {
    // Force page reload to refresh message states
    window.location.href = window.location.href;
  };

  const handlePaymentError = (error: string) => {
    console.error("Payment failed:", error);
    alert(`Payment failed: ${error}`);
  };

  // Format price in HUF with thousands separator
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("hu-HU", {
      style: "currency",
      currency: "HUF",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const formatCompact = (price: number) => {
    if (price >= 1000000) {
      return `${(price / 1000000).toFixed(1)}M`;
    }
    if (price >= 1000) {
      return `${Math.round(price / 1000)}K`;
    }
    return price.toString();
  };

  const stripeOptions = clientSecret
    ? {
        clientSecret,
        appearance: {
          theme: "stripe" as const,
        },
      }
    : null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0">
        <div className="flex-shrink-0 px-6 pt-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HiSparkles className="h-5 w-5 text-yellow-500" />{" "}
              {titleOverride || defaultTitle}
            </DialogTitle>
            <DialogDescription>{bodyOverride || defaultBody}</DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* Saved Payment Methods Selection */}
          {!showPaymentForm &&
            audience === "mester" &&
            !loadingMethods &&
            savedPaymentMethods.length > 0 &&
            !showNewCardForm && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">
                  Select Payment Method
                </h3>
                <div className="space-y-2">
                  {savedPaymentMethods.map((pm) => (
                    <div
                      key={pm.id}
                      className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedPaymentMethod === pm.stripe_payment_method_id
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                      onClick={() =>
                        setSelectedPaymentMethod(pm.stripe_payment_method_id)
                      }
                    >
                      <div className="flex items-center gap-3">
                        <HiCreditCard className="h-5 w-5 text-gray-600" />
                        <div>
                          <div className="font-medium">
                            {pm.card_brand?.toUpperCase()} •••• {pm.card_last4}
                          </div>
                          <div className="text-sm text-gray-500">
                            Expires {pm.card_exp_month}/{pm.card_exp_year}
                            {pm.is_default && (
                              <span className="ml-2 text-blue-600 font-medium">
                                Default
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {selectedPaymentMethod ===
                          pm.stripe_payment_method_id && (
                          <HiCheck className="h-5 w-5 text-blue-600" />
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeletePaymentMethod(pm.id);
                          }}
                          className="p-1 text-gray-400 hover:text-red-600"
                        >
                          <HiTrash className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => {
                    setShowNewCardForm(true);
                    setSelectedPaymentMethod(null);
                  }}
                  className="mt-3 text-sm text-blue-600 hover:text-blue-700"
                >
                  + Use a different card
                </button>
              </div>
            )}

          {/* Back to saved cards option when showing new card form */}
          {!showPaymentForm &&
            audience === "mester" &&
            showNewCardForm &&
            savedPaymentMethods.length > 0 && (
              <div className="mb-4">
                <button
                  onClick={() => {
                    setShowNewCardForm(false);
                    const defaultMethod = savedPaymentMethods.find(
                      (pm) => pm.is_default,
                    );
                    if (defaultMethod) {
                      setSelectedPaymentMethod(
                        defaultMethod.stripe_payment_method_id,
                      );
                    }
                  }}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  ← Back to saved cards
                </button>
              </div>
            )}

          {/* Show Payment Form if payment started */}
          {showPaymentForm && clientSecret && stripeOptions && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-4">Payment Details</h3>
              <Elements stripe={stripePromise} options={stripeOptions}>
                <PaymentForm
                  onSuccess={handlePaymentSuccess}
                  onError={handlePaymentError}
                  saveCard={saveNewCard}
                  onSaveCardChange={setSaveNewCard}
                  showSaveOption={!selectedPaymentMethod || showNewCardForm}
                />
              </Elements>
            </div>
          )}

          {/* Enhanced Dynamic Pricing Display */}
          {!showPaymentForm &&
            audience === "mester" &&
            pricing &&
            !loadingPrice && (
              <div className="space-y-4">
                {/* Main Price Card */}
                <div className="rounded-lg border border-gray-200 bg-white p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="text-sm text-gray-600 font-medium">
                        Lead Price
                      </div>
                      <div className="text-3xl font-bold text-gray-900 mt-1">
                        {formatPrice(pricing.price)}
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        Band {pricing.band_code} • {pricing.band_label}
                      </div>
                    </div>
                    <div className="text-right border border-gray-200 rounded-lg px-3 py-2 bg-gray-50">
                      <div className="text-2xl font-bold text-gray-900">
                        {Math.round(pricing.job_metrics.expected_roi)}x
                      </div>
                      <div className="text-xs text-gray-600">ROI</div>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-gray-200">
                    <div className="text-sm text-gray-700">
                      {pricing.value_proposition}
                    </div>
                  </div>
                </div>

                {/* Job Opportunity Metrics */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Expected Job Value */}
                  <div className="rounded-lg border border-gray-200 p-4 bg-white">
                    <div className="flex items-center gap-2 text-gray-600 mb-2">
                      <HiCash className="h-4 w-4" />
                      <div className="text-xs font-medium">Job Value</div>
                    </div>
                    <div className="text-lg font-bold text-gray-900">
                      {formatCompact(
                        pricing.job_metrics.estimated_job_value_min,
                      )}
                      -
                      {formatCompact(
                        pricing.job_metrics.estimated_job_value_max,
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {formatPrice(
                        pricing.job_metrics.estimated_job_value_midpoint,
                      )}
                    </div>
                    {pricing.job_metrics.has_customer_budget && (
                      <div className="text-xs text-green-600 mt-1 font-medium">
                        ✓ Budget:{" "}
                        {formatPrice(pricing.job_metrics.customer_budget || 0)}
                      </div>
                    )}
                  </div>

                  {/* Expected Profit */}
                  <div className="rounded-lg border border-gray-200 p-4 bg-white">
                    <div className="flex items-center gap-2 text-gray-600 mb-2">
                      <HiTrendingUp className="h-4 w-4" />
                      <div className="text-xs font-medium">Est. Profit</div>
                    </div>
                    <div className="text-lg font-bold text-gray-900">
                      {formatCompact(pricing.job_metrics.expected_profit_min)}-
                      {formatCompact(pricing.job_metrics.expected_profit_max)}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      After lead cost
                    </div>
                  </div>

                  {/* Win Rate */}
                  <div className="rounded-lg border border-gray-200 p-4 bg-white">
                    <div className="flex items-center gap-2 text-gray-600 mb-2">
                      <HiTrendingUp className="h-4 w-4" />
                      <div className="text-xs font-medium">Win Rate</div>
                    </div>
                    <div className="text-lg font-bold text-gray-900">
                      {Math.round(pricing.job_metrics.win_rate_avg * 100)}%
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Typical range
                    </div>
                  </div>

                  {/* Competition Level */}
                  <div className="rounded-lg border border-gray-200 p-4 bg-white">
                    <div className="flex items-center gap-2 text-gray-600 mb-2">
                      <HiUsers className="h-4 w-4" />
                      <div className="text-xs font-medium">Competition</div>
                    </div>
                    <div className="text-lg font-bold text-gray-900 capitalize">
                      {pricing.job_metrics.competition_level}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {pricing.seats_available} seats
                    </div>
                  </div>
                </div>

                {/* Urgency Indicator */}
                {pricing.job_metrics.urgency_score >= 7 && (
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <div className="flex items-start gap-3">
                      <HiClock className="h-5 w-5 text-gray-600 mt-0.5" />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">
                          {pricing.job_metrics.urgency_score >= 9
                            ? "Just Posted"
                            : "Recently Posted"}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          {pricing.job_metrics.urgency_score >= 9
                            ? "Posted within the last hour. Be one of the first to respond."
                            : "Quick response increases your chances."}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Key Benefits */}
                <div className="rounded-lg border border-gray-200 p-4 bg-white">
                  <div className="text-sm font-semibold text-gray-900 mb-3">
                    What's included
                  </div>
                  <ul className="space-y-2">
                    {bullets.map((b) => (
                      <li
                        key={b}
                        className="flex items-start gap-2 text-sm text-gray-700"
                      >
                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-green-500 flex-shrink-0" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

          {!showPaymentForm && audience === "mester" && loadingPrice && (
            <div className="space-y-4">
              <div className="rounded-lg border border-gray-200 bg-white p-6 animate-pulse">
                <div className="h-20 bg-gray-100 rounded"></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-gray-200 bg-white p-4 animate-pulse"
                  >
                    <div className="h-16 bg-gray-100 rounded"></div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Customer View (unchanged) */}
          {!showPaymentForm && audience === "customer" && (
            <ul className="mt-2 space-y-2 text-sm text-gray-700">
              {bullets.map((b) => (
                <li key={b} className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Fixed Action Buttons Footer */}
        {!showPaymentForm && (
          <div className="flex-shrink-0 border-t bg-white px-6 py-4">
            <div className="flex items-center justify-between gap-4">
              {/* Price Display - Left Side */}
              {audience === "mester" && pricing && !loadingPrice && (
                <div>
                  <div className="text-sm text-gray-600">Total</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {formatPrice(pricing.price)}
                  </div>
                </div>
              )}
              {audience === "mester" && loadingPrice && (
                <div className="animate-pulse">
                  <div className="h-4 w-16 bg-gray-200 rounded mb-1"></div>
                  <div className="h-8 w-32 bg-gray-200 rounded"></div>
                </div>
              )}

              {/* Action Buttons - Right Side */}
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  onClick={onClose}
                  disabled={processingPayment}
                >
                  Not now
                </Button>
                <Button
                  onClick={
                    audience === "mester" && mesterId && requestId
                      ? handleStartPayment
                      : onUpgrade
                  }
                  disabled={loadingPrice || processingPayment}
                >
                  {processingPayment
                    ? "Processing..."
                    : loadingPrice
                      ? "Loading..."
                      : cta}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

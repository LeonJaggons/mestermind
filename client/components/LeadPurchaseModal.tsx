"use client";

import { useState, useEffect } from "react";
import { X, CreditCard, CheckCircle, Loader2, Wallet, ArrowLeft, Plus } from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { API_BASE_URL } from "@/lib/api/config";

// Initialize Stripe - fetch publishable key from backend
let stripePromise: Promise<any> | null = null;

const getStripe = async () => {
  if (!stripePromise) {
    stripePromise = fetch(`${API_BASE_URL}/api/v1/stripe/config`)
      .then(res => res.json())
      .then(data => loadStripe(data.publishable_key));
  }
  return stripePromise;
};

interface LeadPriceBreakdown {
  baseBandId: string;
  baseBandLeadPriceHuf: number;
  appliedUrgencyMultiplier: number;
  appliedCityTierMultiplier: number;
  effectiveMultiplier: number;
  finalLeadPriceHuf: number;
  effectiveEstimatedJobValueHuf: number | null;
}

interface LeadPriceResponse {
  currency: string;
  serviceCategory: string;
  jobSize: string;
  urgency: string;
  cityTier: string;
  leadPriceHuf: number;
  breakdown: LeadPriceBreakdown;
}

interface PaymentMethod {
  id: string;
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
  is_default: boolean;
}

interface LeadPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobId: number;
  proProfileId: number;
  serviceCategory?: string;
  onPurchaseComplete?: () => void;
}

// Payment Form Component (inside Elements provider)
function PaymentFormStep({ 
  onSuccess, 
  onError, 
  onBack
}: { 
  onSuccess: () => void; 
  onError: (error: string) => void;
  onBack: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setProcessing(true);

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.href,
        },
        redirect: "if_required",
      });

      if (error) {
        onError(error.message || "Payment failed");
        setProcessing(false);
      } else {
        // Payment succeeded
        onSuccess();
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : "Payment failed");
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Payment Information
        </h3>
        <div className="border border-gray-300 rounded-lg p-4">
          <PaymentElement />
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition"
        >
          <ArrowLeft className="w-4 h-4 inline mr-2" />
          Back
        </button>
        <button
          type="submit"
          disabled={!stripe || processing}
          className="flex-1 px-8 py-3 bg-[hsl(var(--primary))] text-white rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
        >
          {processing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <CreditCard className="w-5 h-5" />
              Complete Purchase
            </>
          )}
        </button>
      </div>
    </form>
  );
}

export default function LeadPurchaseModal({
  isOpen,
  onClose,
  jobId,
  proProfileId,
  serviceCategory = "Plumbing",
  onPurchaseComplete,
}: LeadPurchaseModalProps) {
  const [pricing, setPricing] = useState<LeadPriceResponse | null>(null);
  const [balance, setBalance] = useState(0);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [step, setStep] = useState<"pricing" | "payment-method" | "payment-form">("pricing");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
  const [useNewCard, setUseNewCard] = useState(false);
  const [useBalance, setUseBalance] = useState(false);
  const [loading, setLoading] = useState(true);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [purchaseId, setPurchaseId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchPricingAndData();
      setStep("pricing");
      setError(null);
      setPaymentSuccess(false);
      setSelectedPaymentMethod(null);
      setUseNewCard(false);
      setUseBalance(false);
    }
  }, [isOpen, serviceCategory, proProfileId]);

  const fetchPricingAndData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch lead pricing
      const pricingResponse = await fetch(`${API_BASE_URL}/api/v1/lead-pricing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceCategory: serviceCategory,
          jobSize: "standard",
          urgency: "soon",
          cityTier: "budapest_central",
        }),
      });

      if (!pricingResponse.ok) {
        throw new Error("Failed to fetch pricing");
      }

      const pricingData = await pricingResponse.json();
      setPricing(pricingData);

      // Fetch balance
      const balanceResponse = await fetch(`${API_BASE_URL}/api/v1/stripe/balance/${proProfileId}`);
      if (balanceResponse.ok) {
        const balanceData = await balanceResponse.json();
        setBalance(balanceData.balance_huf || 0);
      }

      // Fetch payment methods
      const paymentMethodsResponse = await fetch(`${API_BASE_URL}/api/v1/stripe/payment-methods/${proProfileId}`);
      if (paymentMethodsResponse.ok) {
        const methodsData = await paymentMethodsResponse.json();
        setPaymentMethods(methodsData.payment_methods || []);
      }
    } catch (error) {
      console.error("Error:", error);
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = async () => {
    if (!pricing) return;

    setProcessing(true);
    setError(null);

    try {
      // Create payment intent
      const paymentIntentResponse = await fetch(
        `${API_BASE_URL}/api/v1/stripe/create-payment-intent`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pro_profile_id: proProfileId,
            job_id: jobId,
            service_category: pricing.serviceCategory,
            job_size: pricing.jobSize,
            urgency: pricing.urgency,
            city_tier: pricing.cityTier,
            base_price_huf: pricing.breakdown.baseBandLeadPriceHuf,
            urgency_multiplier: pricing.breakdown.appliedUrgencyMultiplier,
            city_tier_multiplier: pricing.breakdown.appliedCityTierMultiplier,
            final_price_huf: pricing.leadPriceHuf,
          }),
        }
      );

      if (!paymentIntentResponse.ok) {
        const errorData = await paymentIntentResponse.json();
        throw new Error(errorData.detail || "Failed to create payment intent");
      }

      const paymentData = await paymentIntentResponse.json();
      setPurchaseId(paymentData.purchase_id);

      // If paid from balance, complete immediately
      if (paymentData.paid_from_balance && paymentData.amount_charged === 0) {
        handlePaymentSuccess();
        return;
      }

      // If partial balance, need to pay remainder
      if (paymentData.paid_from_balance && paymentData.amount_charged > 0) {
        // Show payment method selection for remaining amount
        setStep("payment-method");
        setProcessing(false);
        return;
      }

      // If no balance used, show payment method selection
      if (paymentData.amount_charged > 0) {
        setStep("payment-method");
        setProcessing(false);
        return;
      }
    } catch (error) {
      console.error("Error:", error);
      setError(error instanceof Error ? error.message : "An error occurred");
      setProcessing(false);
    }
  };

  const handlePaymentMethodSelect = async () => {
    if (!pricing || !purchaseId) return;

    setProcessing(true);
    setError(null);

    try {
      // If using saved payment method, create payment intent with it
      if (selectedPaymentMethod && !useNewCard) {
        // Create payment intent with saved payment method
        const paymentIntentResponse = await fetch(
          `${API_BASE_URL}/api/v1/stripe/create-payment-intent`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              pro_profile_id: proProfileId,
              job_id: jobId,
              service_category: pricing.serviceCategory,
              job_size: pricing.jobSize,
              urgency: pricing.urgency,
              city_tier: pricing.cityTier,
              base_price_huf: pricing.breakdown.baseBandLeadPriceHuf,
              urgency_multiplier: pricing.breakdown.appliedUrgencyMultiplier,
              city_tier_multiplier: pricing.breakdown.appliedCityTierMultiplier,
              final_price_huf: pricing.leadPriceHuf,
              payment_method_id: selectedPaymentMethod.id,
            }),
          }
        );

        if (!paymentIntentResponse.ok) {
          const errorData = await paymentIntentResponse.json();
          throw new Error(errorData.detail || "Failed to process payment");
        }

        const paymentData = await paymentIntentResponse.json();

        // If payment succeeded immediately
        if (paymentData.paid_from_balance || paymentData.status === "succeeded") {
          handlePaymentSuccess();
          return;
        }

        // If requires action, show payment form
        if (paymentData.client_secret) {
          setClientSecret(paymentData.client_secret);
          setStep("payment-form");
          setProcessing(false);
          return;
        }
      } else if (useNewCard) {
        // Create payment intent for new card
        const paymentIntentResponse = await fetch(
          `${API_BASE_URL}/api/v1/stripe/create-payment-intent`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              pro_profile_id: proProfileId,
              job_id: jobId,
              service_category: pricing.serviceCategory,
              job_size: pricing.jobSize,
              urgency: pricing.urgency,
              city_tier: pricing.cityTier,
              base_price_huf: pricing.breakdown.baseBandLeadPriceHuf,
              urgency_multiplier: pricing.breakdown.appliedUrgencyMultiplier,
              city_tier_multiplier: pricing.breakdown.appliedCityTierMultiplier,
              final_price_huf: pricing.leadPriceHuf,
            }),
          }
        );

        if (!paymentIntentResponse.ok) {
          const errorData = await paymentIntentResponse.json();
          throw new Error(errorData.detail || "Failed to create payment intent");
        }

        const paymentData = await paymentIntentResponse.json();
        setClientSecret(paymentData.client_secret);
        setStep("payment-form");
        setProcessing(false);
      }
    } catch (error) {
      console.error("Error:", error);
      setError(error instanceof Error ? error.message : "An error occurred");
      setProcessing(false);
    }
  };

  const handlePaymentSuccess = () => {
    setPaymentSuccess(true);
    setTimeout(() => {
      if (onPurchaseComplete) {
        onPurchaseComplete();
      }
      onClose();
    }, 2000);
  };

  const handlePaymentError = (errorMessage: string) => {
    setError(errorMessage);
    setProcessing(false);
  };

  const handleBack = () => {
    if (step === "payment-method") {
      setStep("pricing");
      setSelectedPaymentMethod(null);
      setUseNewCard(false);
    } else if (step === "payment-form") {
      setStep("payment-method");
      setClientSecret(null);
    }
    setError(null);
  };

  if (!isOpen) return null;

  const canUseBalance = balance >= (pricing?.leadPriceHuf || 0);
  const hasPaymentMethods = paymentMethods.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Purchase Lead Access</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
            disabled={paymentSuccess || processing}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          {loading ? (
            <div className="flex flex-col justify-center items-center py-12">
              <Loader2 className="w-12 h-12 text-[hsl(var(--primary))] animate-spin mb-4" />
              <p className="text-gray-600">Loading payment details...</p>
            </div>
          ) : error ? (
            <div className="py-12 text-center">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <p className="text-red-800">{error}</p>
              </div>
              <button
                onClick={fetchPricingAndData}
                className="px-6 py-2 bg-[hsl(var(--primary))] text-white rounded-lg hover:opacity-90"
              >
                Try Again
              </button>
            </div>
          ) : paymentSuccess ? (
            <div className="py-12 text-center">
              <div className="flex justify-center mb-4">
                <div className="rounded-full bg-green-100 p-3">
                  <CheckCircle className="w-12 h-12 text-green-600" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h3>
              <p className="text-gray-600">You can now send unlimited messages to this customer.</p>
            </div>
          ) : pricing ? (
            <>
              {step === "pricing" && (
                <>
                  {/* Explanation */}
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">
                      Why purchase this lead?
                    </h3>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
                      <div className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-blue-900">
                          <strong>Continue the conversation</strong> - Unlock unlimited messaging with this customer
                        </p>
                      </div>
                      <div className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-blue-900">
                          <strong>Direct contact access</strong> - Exchange contact information freely after purchase
                        </p>
                      </div>
                      <div className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-blue-900">
                          <strong>Exclusive opportunity</strong> - This lead is only shown to qualified professionals like you
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Pricing Display */}
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">
                      Lead Price
                    </h3>
                    <div className="bg-gradient-to-br from-[hsl(var(--primary)/0.1)] to-[hsl(var(--primary)/0.05)] border-2 border-[hsl(var(--primary))] rounded-lg p-6 text-center">
                      <div className="text-5xl font-bold text-[hsl(var(--primary))] mb-2">
                        {pricing.leadPriceHuf.toLocaleString()} {pricing.currency}
                      </div>
                      <p className="text-sm text-gray-600">
                        One-time payment for unlimited messaging
                      </p>
                    </div>
                  </div>

                  {/* Price Breakdown */}
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">
                      Price Breakdown
                    </h3>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Base Price</span>
                        <span className="text-sm font-semibold text-gray-900">
                          {pricing.breakdown.baseBandLeadPriceHuf.toLocaleString()} {pricing.currency}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">
                          Urgency Multiplier ({pricing.urgency})
                        </span>
                        <span className="text-sm font-semibold text-gray-900">
                          ×{pricing.breakdown.appliedUrgencyMultiplier}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">
                          Location Multiplier ({pricing.cityTier.replace(/_/g, ' ')})
                        </span>
                        <span className="text-sm font-semibold text-gray-900">
                          ×{pricing.breakdown.appliedCityTierMultiplier}
                        </span>
                      </div>
                      
                      <div className="border-t border-gray-300 pt-3 flex justify-between items-center">
                        <span className="text-sm font-semibold text-gray-900">
                          Total Lead Price
                        </span>
                        <span className="text-lg font-bold text-[hsl(var(--primary))]">
                          {pricing.leadPriceHuf.toLocaleString()} {pricing.currency}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Balance Display */}
                  {balance > 0 && (
                    <div className="mb-6">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-semibold text-gray-700">Available Balance</span>
                          <span className="text-lg font-bold text-gray-900">
                            {balance.toLocaleString()} {pricing.currency}
                          </span>
                        </div>
                        {canUseBalance && (
                          <p className="text-xs text-green-600 mt-1">
                            ✓ You have sufficient balance to cover this purchase
                          </p>
                        )}
                        {!canUseBalance && (
                          <p className="text-xs text-amber-600 mt-1">
                            You can use {balance.toLocaleString()} {pricing.currency} from your balance
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Continue Button */}
                  <button
                    onClick={handleContinue}
                    disabled={processing}
                    className="w-full px-8 py-3 bg-[hsl(var(--primary))] text-white rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
                  >
                    {processing ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-5 h-5" />
                        Continue to Payment
                      </>
                    )}
                  </button>

                  {/* Money Back Guarantee */}
                  <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-green-900 mb-2">
                      💰 Money-Back Guarantee
                    </h4>
                    <p className="text-sm text-green-800">
                      If the customer doesn't respond within 48 hours after purchase, you'll receive a full refund automatically.
                    </p>
                  </div>
                </>
              )}

              {step === "payment-method" && (
                <div className="space-y-6">
                  <div>
                    <button
                      onClick={handleBack}
                      className="text-gray-600 hover:text-gray-900 mb-4 flex items-center gap-2"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Back
                    </button>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Select Payment Method
                    </h3>
                  </div>

                  {/* Saved Payment Methods */}
                  {hasPaymentMethods && (
                    <div className="space-y-3">
                      {paymentMethods.map((method) => (
                        <button
                          key={method.id}
                          onClick={() => {
                            setSelectedPaymentMethod(method);
                            setUseNewCard(false);
                          }}
                          className={`w-full p-4 border-2 rounded-lg text-left transition ${
                            selectedPaymentMethod?.id === method.id && !useNewCard
                              ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.05)]"
                              : "border-gray-300 hover:border-gray-400"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <CreditCard className="w-5 h-5 text-gray-600" />
                              <div>
                                <div className="font-semibold text-gray-900">
                                  •••• •••• •••• {method.last4}
                                </div>
                                <div className="text-sm text-gray-600">
                                  {method.brand.toUpperCase()} • Expires {method.exp_month}/{method.exp_year}
                                  {method.is_default && (
                                    <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded">
                                      Default
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            {selectedPaymentMethod?.id === method.id && !useNewCard && (
                              <CheckCircle className="w-5 h-5 text-[hsl(var(--primary))]" />
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Add New Card Option */}
                  <button
                    onClick={() => {
                      setUseNewCard(true);
                      setSelectedPaymentMethod(null);
                    }}
                    className={`w-full p-4 border-2 rounded-lg text-left transition ${
                      useNewCard
                        ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.05)]"
                        : "border-gray-300 hover:border-gray-400"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Plus className="w-5 h-5 text-gray-600" />
                        <div className="font-semibold text-gray-900">Add new card</div>
                      </div>
                      {useNewCard && (
                        <CheckCircle className="w-5 h-5 text-[hsl(var(--primary))]" />
                      )}
                    </div>
                  </button>

                  {/* Continue Button */}
                  <button
                    onClick={handlePaymentMethodSelect}
                    disabled={processing || (!selectedPaymentMethod && !useNewCard)}
                    className="w-full px-8 py-3 bg-[hsl(var(--primary))] text-white rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
                  >
                    {processing ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-5 h-5" />
                        Continue
                      </>
                    )}
                  </button>
                </div>
              )}

              {step === "payment-form" && clientSecret && (
                <div>
                  <Elements stripe={getStripe()} options={{ clientSecret }}>
                    <PaymentFormStep 
                      onSuccess={handlePaymentSuccess} 
                      onError={handlePaymentError}
                      onBack={handleBack}
                    />
                  </Elements>
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

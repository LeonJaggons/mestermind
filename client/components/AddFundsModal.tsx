"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/contexts/AuthContext";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Wallet, ChevronLeft, CreditCard, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { API_BASE_URL } from "@/lib/api/config";

const stripePromise = loadStripe("pk_test_51SBNvKRPSjKnsDN9ODHK59X8mroIr87XxN3dIONbdNHOSSNV3HbDsfy46P6fy6MPKRUQD2CvBLzWobZKA1bWCrCZ00PWCDVKKh");

interface PaymentMethod {
  id: string;
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
  is_default: boolean;
}

interface AddFundsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proProfileId: number | null;
  onSuccess?: () => void;
}

function PaymentFormStep({ 
  proProfileId, 
  amountHuf, 
  onSuccess, 
  onError 
}: { 
  proProfileId: number; 
  amountHuf: number;
  onSuccess: () => void;
  onError: (error: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const { error: submitError } = await elements.submit();
      if (submitError) {
        setError(submitError.message || "An error occurred");
        setIsProcessing(false);
        return;
      }

      // Confirm the payment
      const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.href,
        },
        redirect: "if_required",
      });

      if (confirmError) {
        setError(confirmError.message || "Failed to add funds");
        setIsProcessing(false);
      } else if (paymentIntent) {
        // Only proceed if payment actually succeeded
        if (paymentIntent.status === "succeeded") {
          // Confirm funds were added on backend
          try {
            const confirmResponse = await fetch(
              `${API_BASE_URL}/api/v1/stripe/add-funds-confirm/${paymentIntent.id}`,
              {
                method: "POST",
              }
            );

            if (confirmResponse.ok) {
              onSuccess();
            } else {
              const errorData = await confirmResponse.json().catch(() => ({ detail: "Failed to update balance" }));
              setError(errorData.detail || "Payment succeeded but failed to update balance. Please contact support.");
              setIsProcessing(false);
            }
          } catch (err) {
            console.error("Error confirming funds:", err);
            setError("Payment succeeded but failed to update balance. Please contact support.");
            setIsProcessing(false);
          }
        } else {
          // Payment not succeeded - show appropriate error
          setError(`Payment status: ${paymentIntent.status}. Payment must be completed before funds can be added.`);
          setIsProcessing(false);
        }
      }
    } catch (err) {
      console.error("Error adding funds:", err);
      setError("An unexpected error occurred");
      setIsProcessing(false);
    }
  };

  const formatCurrency = (amountHuf: number) => {
    return new Intl.NumberFormat('hu-HU', {
      style: 'currency',
      currency: 'HUF',
      maximumFractionDigits: 0,
    }).format(amountHuf);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Amount to add:</span>
          <span className="text-xl font-bold text-gray-900">{formatCurrency(amountHuf)}</span>
        </div>
      </div>

      <div className="border border-gray-300 rounded-lg p-4">
        <PaymentElement />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <DialogFooter>
        <button
          type="submit"
          disabled={!stripe || isProcessing}
          className="w-full px-6 py-3 bg-[hsl(var(--primary))] text-white rounded-lg hover:opacity-90 font-semibold transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isProcessing ? (
            <>
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Processing...
            </>
          ) : (
            <>
              <Wallet className="w-5 h-5" />
              Add Funds
            </>
          )}
        </button>
      </DialogFooter>
    </form>
  );
}

export function AddFundsModal({ open, onOpenChange, proProfileId, onSuccess }: AddFundsModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [amountHuf, setAmountHuf] = useState<number>(10000);
  const [customAmount, setCustomAmount] = useState<string>("");
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);
  const [useNewCard, setUseNewCard] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch payment methods when modal opens
  useEffect(() => {
    if (open && proProfileId) {
      fetch(`${API_BASE_URL}/api/v1/stripe/payment-methods/${proProfileId}`)
        .then(res => res.json())
        .then(data => setPaymentMethods(data.payment_methods || []))
        .catch(err => console.error("Error fetching payment methods:", err));
    }
  }, [open, proProfileId]);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setStep(1);
      setAmountHuf(10000);
      setCustomAmount("");
      setSelectedPaymentMethod(null);
      setUseNewCard(false);
      setClientSecret(null);
      setError(null);
    }
  }, [open]);

  const formatCurrency = (amountHuf: number) => {
    return new Intl.NumberFormat('hu-HU', {
      style: 'currency',
      currency: 'HUF',
      maximumFractionDigits: 0,
    }).format(amountHuf);
  };

  const handleAmountSelect = (amount: number) => {
    setAmountHuf(amount);
    setCustomAmount("");
  };

  const handleCustomAmountChange = (value: string) => {
    setCustomAmount(value);
    const numValue = parseInt(value.replace(/\D/g, ""), 10);
    if (!isNaN(numValue) && numValue > 0) {
      setAmountHuf(numValue);
    }
  };

  const handleContinue = async () => {
    if (!proProfileId || amountHuf <= 0) {
      setError("Please select or enter a valid amount");
      return;
    }

    // Move to payment method selection step
    if (step === 1) {
      setStep(2);
      return;
    }

    // Step 2: Process payment
    if (step === 2) {
      if (!selectedPaymentMethod && !useNewCard) {
        setError("Please select a payment method");
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const requestBody: any = {
          pro_profile_id: proProfileId,
          amount_huf: amountHuf,
        };

        // If using saved payment method, include it
        if (selectedPaymentMethod && !useNewCard) {
          requestBody.payment_method_id = selectedPaymentMethod;
        }

        const response = await fetch(`${API_BASE_URL}/api/v1/stripe/add-funds`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ detail: "Failed to create payment intent" }));
          throw new Error(errorData.detail || "Failed to create payment intent");
        }

        const data = await response.json();

        // If using saved payment method and payment succeeded, complete immediately
        if (selectedPaymentMethod && !useNewCard) {
          if (data.status === "succeeded") {
            // Confirm funds were added (backend should have already updated, but verify)
            const confirmResponse = await fetch(
              `${API_BASE_URL}/api/v1/stripe/add-funds-confirm/${data.payment_intent_id}`,
              { method: "POST" }
            );
            if (confirmResponse.ok) {
              handlePaymentSuccess();
              return;
            } else {
              const errorData = await confirmResponse.json().catch(() => ({ detail: "Failed to confirm funds" }));
              setError(errorData.detail || "Payment succeeded but failed to update balance.");
              return;
            }
          } else {
            // Payment not succeeded - show error
            setError(`Payment status: ${data.status}. Payment must be completed before funds can be added.`);
            return;
          }
        }

        // If new card or requires action, show payment form
        if (useNewCard || data.requires_action) {
          setClientSecret(data.client_secret);
          setStep(3);
        } else if (data.status === "succeeded") {
          handlePaymentSuccess();
        }
      } catch (err) {
        console.error("Error processing payment:", err);
        setError(err instanceof Error ? err.message : "Failed to process payment");
      } finally {
        setLoading(false);
      }
    }
  };

  const handlePaymentSuccess = () => {
    onSuccess?.();
    onOpenChange(false);
  };

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
      setSelectedPaymentMethod(null);
      setUseNewCard(false);
    } else if (step === 3) {
      setStep(2);
      setClientSecret(null);
    }
    setError(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white">
        <DialogHeader>
          <DialogTitle>Add funds to balance</DialogTitle>
          <DialogDescription>
            {step === 1 
              ? "Select the amount you want to add to your balance"
              : step === 2
              ? "Choose how you want to pay"
              : "Complete your payment to add funds"}
          </DialogDescription>
        </DialogHeader>

        {/* Progress indicator */}
        <div className="flex items-center gap-2 mb-6">
          <div className="flex-1 bg-gray-200 rounded-full h-2">
            <div
              className="bg-[hsl(var(--primary))] h-2 rounded-full transition-all duration-300"
              style={{ width: step === 1 ? "33%" : step === 2 ? "66%" : "100%" }}
            />
          </div>
          <span className="text-sm text-gray-600">Step {step} of 3</span>
        </div>

        {step === 1 ? (
          <div className="space-y-6">
            {/* Amount Selection */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-4">
                Select amount
              </label>
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[5000, 10000, 25000, 50000, 100000, 250000].map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => handleAmountSelect(amount)}
                    className={`px-4 py-3 border rounded-lg font-semibold transition-colors ${
                      amountHuf === amount && !customAmount
                        ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]"
                        : "border-gray-300 hover:border-gray-400 text-gray-700"
                    }`}
                  >
                    {formatCurrency(amount)}
                  </button>
                ))}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Or enter custom amount
                </label>
                <input
                  type="text"
                  value={customAmount}
                  onChange={(e) => handleCustomAmountChange(e.target.value)}
                  placeholder="Enter amount in HUF"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] focus:border-transparent"
                />
              </div>
              {amountHuf > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total amount:</span>
                    <span className="text-xl font-bold text-gray-900">{formatCurrency(amountHuf)}</span>
                  </div>
                </div>
              )}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <DialogFooter>
              <button
                onClick={() => onOpenChange(false)}
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleContinue}
                disabled={amountHuf <= 0 || loading}
                className="px-6 py-2 bg-[hsl(var(--primary))] text-white rounded-lg hover:opacity-90 font-semibold transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Processing...
                  </>
                ) : (
                  <>
                    Continue to Payment
                    <ChevronLeft className="w-4 h-4 rotate-180" />
                  </>
                )}
              </button>
            </DialogFooter>
          </div>
        ) : step === 2 ? (
          <div className="space-y-6">
            {/* Payment Method Selection */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-4">
                Select payment method
              </label>
              
              {paymentMethods.length > 0 && (
                <div className="space-y-2 mb-4">
                  {paymentMethods.map((method) => (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => {
                        setSelectedPaymentMethod(method.id);
                        setUseNewCard(false);
                      }}
                      className={`w-full p-4 border rounded-lg text-left transition-colors ${
                        selectedPaymentMethod === method.id && !useNewCard
                          ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.1)]"
                          : "border-gray-300 hover:border-gray-400"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <CreditCard className="w-5 h-5 text-gray-600" />
                          <div>
                            <div className="font-semibold text-gray-900">
                              {method.brand.charAt(0).toUpperCase() + method.brand.slice(1)} •••• {method.last4}
                            </div>
                            <div className="text-sm text-gray-600">
                              Expires {String(method.exp_month).padStart(2, '0')}/{String(method.exp_year).slice(-2)}
                              {method.is_default && (
                                <span className="ml-2 text-xs bg-gray-200 px-2 py-0.5 rounded">Default</span>
                              )}
                            </div>
                          </div>
                        </div>
                        {selectedPaymentMethod === method.id && !useNewCard && (
                          <div className="w-5 h-5 rounded-full bg-[hsl(var(--primary))] flex items-center justify-center">
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  setUseNewCard(true);
                  setSelectedPaymentMethod(null);
                }}
                className={`w-full p-4 border rounded-lg text-left transition-colors ${
                  useNewCard
                    ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.1)]"
                    : "border-gray-300 hover:border-gray-400"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Plus className="w-5 h-5 text-gray-600" />
                  <div className="font-semibold text-gray-900">Add new card</div>
                </div>
              </button>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <DialogFooter>
              <button
                onClick={handleBack}
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-semibold transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleContinue}
                disabled={(!selectedPaymentMethod && !useNewCard) || loading}
                className="px-6 py-2 bg-[hsl(var(--primary))] text-white rounded-lg hover:opacity-90 font-semibold transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Processing...
                  </>
                ) : (
                  <>
                    Continue
                    <ChevronLeft className="w-4 h-4 rotate-180" />
                  </>
                )}
              </button>
            </DialogFooter>
          </div>
        ) : (
          <div>
            {clientSecret && proProfileId ? (
              <Elements
                stripe={stripePromise}
                options={{
                  clientSecret,
                  appearance: {
                    theme: 'stripe',
                    variables: {
                      colorPrimary: '#009fd9',
                    },
                  },
                }}
              >
                <PaymentFormStep
                  proProfileId={proProfileId}
                  amountHuf={amountHuf}
                  onSuccess={handlePaymentSuccess}
                  onError={(err) => setError(err)}
                />
              </Elements>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">Loading payment form...</p>
              </div>
            )}

            <div className="mt-4">
              <button
                onClick={handleBack}
                className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                Back to amount selection
              </button>
            </div>
          </div>
        )}

        {/* Info Section */}
        {step === 1 && (
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2 text-sm">About your balance</h3>
            <ul className="text-xs text-blue-800 space-y-1">
              <li>• Funds are added instantly to your balance</li>
              <li>• Your balance will be used automatically when purchasing leads</li>
              <li>• Your payment information is encrypted and secure</li>
            </ul>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}


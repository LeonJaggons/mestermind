"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { ArrowLeft, Wallet } from "lucide-react";
import Link from "next/link";
import { API_BASE_URL } from "@/lib/api/config";

const stripePromise = loadStripe("pk_test_51SBNvKRPSjKnsDN9ODHK59X8mroIr87XxN3dIONbdNHOSSNV3HbDsfy46P6fy6MPKRUQD2CvBLzWobZKA1bWCrCZ00PWCDVKKh");

function AddFundsForm({ proProfileId, amountHuf }: { proProfileId: number; amountHuf: number }) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
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
          return_url: `${window.location.origin}/pro/payments?funds=success`,
        },
        redirect: "if_required",
      });

      if (confirmError) {
        setError(confirmError.message || "Failed to add funds");
        setIsProcessing(false);
      } else if (paymentIntent && paymentIntent.status === "succeeded") {
        // Confirm funds were added on backend
        try {
          const confirmResponse = await fetch(
            `${API_BASE_URL}/api/v1/stripe/add-funds-confirm/${paymentIntent.id}`,
            {
              method: "POST",
            }
          );

          if (confirmResponse.ok) {
            router.push("/pro/payments?funds=success");
          } else {
            setError("Payment succeeded but failed to update balance. Please contact support.");
            setIsProcessing(false);
          }
        } catch (err) {
          console.error("Error confirming funds:", err);
          setError("Payment succeeded but failed to update balance. Please contact support.");
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
      <div className="bg-white border border-gray-300 rounded-lg p-6">
        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Amount to add
          </label>
          <div className="text-2xl font-bold text-gray-900">
            {formatCurrency(amountHuf)}
          </div>
        </div>
        <div className="border-t border-gray-200 pt-4">
          <PaymentElement />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div className="flex gap-3">
        <Link
          href="/pro/payments"
          className="flex-1 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-semibold text-center transition-colors"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={!stripe || isProcessing}
          className="flex-1 px-6 py-3 bg-[hsl(var(--primary))] text-white rounded-lg hover:opacity-90 font-semibold transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
      </div>
    </form>
  );
}

export default function AddBalancePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [proProfileId, setProProfileId] = useState<number | null>(null);
  const [amountHuf, setAmountHuf] = useState<number>(10000); // Default 10,000 HUF
  const [customAmount, setCustomAmount] = useState<string>("");

  useEffect(() => {
    const initializePayment = async () => {
      if (!user) {
        router.push("/login");
        return;
      }

      try {
        setLoading(true);

        // Get user ID from Firebase UID
        const userResponse = await fetch(`${API_BASE_URL}/api/v1/users/firebase/${user.uid}`);
        if (!userResponse.ok) {
          throw new Error("Failed to fetch user");
        }
        const userData = await userResponse.json();

        // Get pro profile
        const proProfileResponse = await fetch(`${API_BASE_URL}/api/v1/pro-profiles?user_id=${userData.id}`);
        if (!proProfileResponse.ok) {
          throw new Error("Failed to fetch pro profile");
        }
        const proProfileData = await proProfileResponse.json();
        
        if (proProfileData.length === 0) {
          throw new Error("No pro profile found");
        }

        setProProfileId(proProfileData[0].id);
      } catch (err) {
        console.error("Error initializing:", err);
        setError(err instanceof Error ? err.message : "Failed to initialize");
      } finally {
        setLoading(false);
      }
    };

    initializePayment();
  }, [user, router]);

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

  const handleCreatePaymentIntent = async () => {
    if (!proProfileId || amountHuf <= 0) {
      setError("Please select or enter a valid amount");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE_URL}/api/v1/stripe/add-funds`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pro_profile_id: proProfileId,
          amount_huf: amountHuf,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: "Failed to create payment intent" }));
        throw new Error(errorData.detail || "Failed to create payment intent");
      }

      const data = await response.json();
      setClientSecret(data.client_secret);
    } catch (err) {
      console.error("Error creating payment intent:", err);
      setError(err instanceof Error ? err.message : "Failed to create payment intent");
    } finally {
      setLoading(false);
    }
  };

  if (loading && !clientSecret) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-2xl mx-auto px-5 py-8">
          <div className="flex justify-center items-center py-12">
            <p className="text-gray-500">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !clientSecret) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-2xl mx-auto px-5 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <p className="text-red-800">{error}</p>
            <Link
              href="/pro/payments"
              className="mt-4 inline-flex items-center text-sm text-[hsl(var(--primary))] hover:underline"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Payments
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const formatCurrency = (amountHuf: number) => {
    return new Intl.NumberFormat('hu-HU', {
      style: 'currency',
      currency: 'HUF',
      maximumFractionDigits: 0,
    }).format(amountHuf);
  };

  if (!clientSecret) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-2xl mx-auto px-5 py-8">
          {/* Header */}
          <div className="mb-8">
            <Link
              href="/pro/payments"
              className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Payments
            </Link>
            <h1 className="text-3xl font-bold">Add funds to balance</h1>
            <p className="text-gray-600 mt-2">
              Add money to your balance to pay for leads quickly
            </p>
          </div>

          {/* Amount Selection */}
          <div className="bg-white border border-gray-300 rounded-lg p-6 mb-6">
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

          {/* Continue Button */}
          <div className="flex gap-3">
            <Link
              href="/pro/payments"
              className="flex-1 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-semibold text-center transition-colors"
            >
              Cancel
            </Link>
            <button
              onClick={handleCreatePaymentIntent}
              disabled={amountHuf <= 0 || loading}
              className="flex-1 px-6 py-3 bg-[hsl(var(--primary))] text-white rounded-lg hover:opacity-90 font-semibold transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
                  <Wallet className="w-5 h-5" />
                  Continue to Payment
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-5 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/pro/payments"
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Payments
          </Link>
          <h1 className="text-3xl font-bold">Add funds to balance</h1>
          <p className="text-gray-600 mt-2">
            Complete your payment to add {formatCurrency(amountHuf)} to your balance
          </p>
        </div>

        {/* Payment Form */}
        {clientSecret && proProfileId && (
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
            <AddFundsForm proProfileId={proProfileId} amountHuf={amountHuf} />
          </Elements>
        )}

        {/* Info Section */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-2">About your balance</h3>
          <ul className="text-sm text-blue-800 space-y-2">
            <li className="flex items-start">
              <svg className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Funds are added instantly to your balance
            </li>
            <li className="flex items-start">
              <svg className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Your balance will be used automatically when purchasing leads
            </li>
            <li className="flex items-start">
              <svg className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Your payment information is encrypted and secure
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}


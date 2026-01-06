"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { ArrowLeft, CreditCard } from "lucide-react";
import Link from "next/link";
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

function AddCardForm() {
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

      // Confirm the setup
      const { error: confirmError, setupIntent } = await stripe.confirmSetup({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/pro/payments?setup=success`,
        },
        redirect: "if_required",
      });

      if (confirmError) {
        setError(confirmError.message || "Failed to add payment method");
        setIsProcessing(false);
      } else if (setupIntent && setupIntent.status === "succeeded") {
        // Successfully added payment method
        router.push("/pro/payments?setup=success");
      }
    } catch (err) {
      console.error("Error adding payment method:", err);
      setError("An unexpected error occurred");
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white border border-gray-300 rounded-lg p-6">
        <PaymentElement />
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
              <CreditCard className="w-5 h-5" />
              Add Card
            </>
          )}
        </button>
      </div>
    </form>
  );
}

export default function AddCardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeSetup = async () => {
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

        // Create SetupIntent for adding payment method
        const setupResponse = await fetch(`${API_BASE_URL}/api/v1/stripe/create-setup-intent`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pro_profile_id: proProfileData[0].id,
          }),
        });

        if (!setupResponse.ok) {
          throw new Error("Failed to create setup intent");
        }

        const setupData = await setupResponse.json();
        setClientSecret(setupData.client_secret);
      } catch (err) {
        console.error("Error initializing setup:", err);
        setError(err instanceof Error ? err.message : "Failed to initialize payment setup");
      } finally {
        setLoading(false);
      }
    };

    initializeSetup();
  }, [user, router]);

  if (loading) {
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

  if (error) {
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
          <h1 className="text-3xl font-bold">Add a payment method</h1>
          <p className="text-gray-600 mt-2">
            Add a credit or debit card to pay for leads
          </p>
        </div>

        {/* Form */}
        {clientSecret && (
          <Elements
            stripe={getStripe()}
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
            <AddCardForm />
          </Elements>
        )}

        {/* Info Section */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-2">Payment security</h3>
          <ul className="text-sm text-blue-800 space-y-2">
            <li className="flex items-start">
              <svg className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Your payment information is encrypted and secure
            </li>
            <li className="flex items-start">
              <svg className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              We use industry-standard security protocols
            </li>
            <li className="flex items-start">
              <svg className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              You'll only be charged when you purchase a lead
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

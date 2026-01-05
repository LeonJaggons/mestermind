"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/contexts/AuthContext";
import { API_BASE_URL } from "@/lib/api/config";

function SubscribeButton({ proProfileId }: { proProfileId: number }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubscribe = async () => {
    setLoading(true);
    setError(null);

    try {
      // Create checkout session
      const response = await fetch(`${API_BASE_URL}/api/v1/subscriptions/pro-profile/${proProfileId}/create-checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to create checkout session");
      }

      const { checkout_url } = await response.json();
      
      // Redirect to Stripe checkout
      window.location.href = checkout_url;
    } catch (err: any) {
      setError(err.message || "An error occurred");
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Mestermind Pro Subscription</h3>
        <div className="space-y-2 text-sm text-gray-700">
          <div className="flex justify-between">
            <span>Monthly subscription</span>
            <span className="font-semibold">5,000 HUF/month</span>
          </div>
          <ul className="list-disc list-inside space-y-1 mt-4">
            <li>Access to all open opportunities</li>
            <li>Browse jobs that match your services</li>
            <li>Contact customers who haven't invited you</li>
            <li>Cancel anytime</li>
          </ul>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      <button
        onClick={handleSubscribe}
        disabled={loading}
        className="w-full px-6 py-3 bg-[hsl(var(--primary))] text-white rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Processing..." : "Subscribe for 5,000 HUF/month"}
      </button>
    </div>
  );
}

export default function SubscribePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [proProfileId, setProProfileId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscriptionStatus, setSubscriptionStatus] = useState<any>(null);

  useEffect(() => {
    const checkSubscription = async () => {
      if (!user || authLoading) {
        setLoading(false);
        return;
      }

      try {
        // Get user data
        const userResponse = await fetch(`${API_BASE_URL}/api/v1/users/firebase/${user.uid}`);
        if (!userResponse.ok) return;
        const userData = await userResponse.json();

        // Get pro profile
        const proProfileResponse = await fetch(`${API_BASE_URL}/api/v1/pro-profiles/user/${userData.id}`);
        if (!proProfileResponse.ok) return;
        const proProfile = await proProfileResponse.json();
        setProProfileId(proProfile.id);

        // Check subscription status
        const statusResponse = await fetch(`${API_BASE_URL}/api/v1/subscriptions/pro-profile/${proProfile.id}/status`);
        if (statusResponse.ok) {
          const status = await statusResponse.json();
          setSubscriptionStatus(status);
          
          // If already subscribed and active, redirect to opportunities
          if (status.is_active) {
            router.push("/pro/opportunities");
            return;
          }
        }
      } catch (error) {
        console.error("Error checking subscription:", error);
      } finally {
        setLoading(false);
      }
    };

    checkSubscription();
  }, [user, authLoading, router]);

  // Handle Stripe redirect and verify checkout
  useEffect(() => {
    const subscription = searchParams.get("subscription");
    const sessionId = searchParams.get("session_id");
    
    if (subscription === "success" && sessionId && proProfileId) {
      // Verify the checkout session and create subscription if needed
      const verifyCheckout = async () => {
        try {
          const response = await fetch(
            `${API_BASE_URL}/api/v1/subscriptions/verify-checkout/${sessionId}`,
            { method: "POST" }
          );
          
          if (response.ok) {
            const result = await response.json();
            console.log("Checkout verified:", result);
            
            // Refresh subscription status
            const statusResponse = await fetch(
              `${API_BASE_URL}/api/v1/subscriptions/pro-profile/${proProfileId}/status`
            );
            if (statusResponse.ok) {
              const status = await statusResponse.json();
              setSubscriptionStatus(status);
            }
          } else {
            console.error("Failed to verify checkout:", await response.text());
          }
        } catch (error) {
          console.error("Error verifying checkout:", error);
        }
      };
      
      verifyCheckout();
      
      // Redirect to opportunities after successful subscription
      setTimeout(() => {
        router.push("/pro/opportunities");
      }, 2000);
    }
  }, [searchParams, router, proProfileId]);

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!user) {
    router.push("/login");
    return null;
  }

  if (!proProfileId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Pro profile not found</p>
          <button
            onClick={() => router.push("/become-a-pro/onboarding")}
            className="text-[hsl(var(--primary))] hover:underline"
          >
            Complete onboarding first
          </button>
        </div>
      </div>
    );
  }

  const subscriptionSuccess = searchParams.get("subscription") === "success";

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="bg-white rounded-lg shadow-sm p-8">
          {subscriptionSuccess ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Subscription Successful!</h1>
              <p className="text-gray-600 mb-6">You now have access to all open opportunities.</p>
              <p className="text-sm text-gray-500">Redirecting to opportunities...</p>
            </div>
          ) : (
            <>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Subscribe to Mestermind Pro</h1>
              <p className="text-gray-600 mb-8">
                Get access to all open opportunities and connect with customers who haven't invited you directly.
              </p>

              <SubscribeButton proProfileId={proProfileId} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}


"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/contexts/AuthContext";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CreditCard, Plus, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AddFundsModal } from "@/components/AddFundsModal";
import { API_BASE_URL } from "@/lib/api/config";

interface PaymentMethod {
  id: string;
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
  is_default: boolean;
}

interface LeadPurchase {
  id: number;
  pro_profile_id: number;
  job_id: number;
  base_price_huf: number;
  urgency_multiplier: number;
  city_tier_multiplier: number;
  final_price_huf: number;
  payment_status: string;
  purchased_at: string;
  payment_completed_at: string | null;
  stripe_transaction_id: string | null;
  job?: {
    id: number;
    description: string;
    category: string;
  };
}

export default function ProPaymentsPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<"activity" | "receipts">("activity");
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [balance, setBalance] = useState(0);
  const [leadPurchases, setLeadPurchases] = useState<LeadPurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [proProfileId, setProProfileId] = useState<number | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [paymentMethodToDelete, setPaymentMethodToDelete] = useState<PaymentMethod | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [addFundsModalOpen, setAddFundsModalOpen] = useState(false);

  const fetchPaymentMethods = async (profileId: number) => {
    try {
      const paymentMethodsResponse = await fetch(`${API_BASE_URL}/api/v1/stripe/payment-methods/${profileId}`);
      if (paymentMethodsResponse.ok) {
        const methodsData = await paymentMethodsResponse.json();
        setPaymentMethods(methodsData.payment_methods || []);
      }
    } catch (error) {
      console.error("Error fetching payment methods:", error);
    }
  };

  useEffect(() => {
    const fetchPaymentData = async () => {
      if (!user) return;

      try {
        setLoading(true);

        // Get user ID from Firebase UID
        const userResponse = await fetch(`${API_BASE_URL}/api/v1/users/firebase/${user.uid}`);
        if (!userResponse.ok) {
          console.error("Failed to fetch user:", userResponse.status);
          return;
        }
        const userData = await userResponse.json();

        if (!userData?.id) {
          console.error("User data missing ID");
          return;
        }

        // Get pro profile
        const proProfileResponse = await fetch(
          `${API_BASE_URL}/api/v1/pro-profiles?user_id=${userData.id}`
        );
        if (proProfileResponse.ok) {
          const proProfileData = await proProfileResponse.json();
          if (proProfileData.length > 0) {
            const proProfile = proProfileData[0];
            setProProfileId(proProfile.id);

            // Fetch lead purchases for this pro
            const purchasesResponse = await fetch(`${API_BASE_URL}/api/v1/lead-purchases?pro_profile_id=${proProfile.id}`);
            if (purchasesResponse.ok) {
              const purchases = await purchasesResponse.json();

              // Fetch job details for each purchase
              const purchasesWithJobs = await Promise.all(
                purchases.map(async (purchase: LeadPurchase) => {
                  try {
                    const jobResponse = await fetch(`${API_BASE_URL}/api/v1/jobs/${purchase.job_id}`);
                    if (jobResponse.ok) {
                      const job = await jobResponse.json();
                      return { ...purchase, job };
                    }
                  } catch (error) {
                    console.error(`Error fetching job ${purchase.job_id}:`, error);
                  }
                  return purchase;
                })
              );

              setLeadPurchases(purchasesWithJobs);
            }

            // Fetch balance
            const balanceResponse = await fetch(`${API_BASE_URL}/api/v1/stripe/balance/${proProfile.id}`);
            if (balanceResponse.ok) {
              const balanceData = await balanceResponse.json();
              setBalance(balanceData.balance_huf || 0);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching payment data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPaymentData();
  }, [user]);

  // Refresh balance when returning from add funds
  useEffect(() => {
    const fundsSuccess = searchParams.get("funds");
    if (fundsSuccess === "success" && proProfileId) {
      // Refresh balance
      fetch(`${API_BASE_URL}/api/v1/stripe/balance/${proProfileId}`)
        .then(res => res.json())
        .then(data => setBalance(data.balance_huf || 0))
        .catch(err => console.error("Error fetching balance:", err));
    }
  }, [searchParams, proProfileId]);

  useEffect(() => {
    if (proProfileId) {
      fetchPaymentMethods(proProfileId);
    }
  }, [proProfileId]);

  const formatCurrency = (amountHuf: number) => {
    return new Intl.NumberFormat('hu-HU', {
      style: 'currency',
      currency: 'HUF',
      maximumFractionDigits: 0,
    }).format(amountHuf);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleDeleteClick = (method: PaymentMethod) => {
    setPaymentMethodToDelete(method);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!paymentMethodToDelete || !proProfileId) return;

    setIsDeleting(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/v1/stripe/payment-methods/${proProfileId}/${paymentMethodToDelete.id}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: "Failed to delete payment method" }));
        throw new Error(errorData.detail || "Failed to delete payment method");
      }

      // Refresh payment methods list
      if (proProfileId) {
        await fetchPaymentMethods(proProfileId);
      }
      setDeleteDialogOpen(false);
      setPaymentMethodToDelete(null);
    } catch (error) {
      console.error("Error deleting payment method:", error);
      alert(error instanceof Error ? error.message : "Failed to delete payment method");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="p-12 pb-18">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Payments</h1>
          <p className="text-sm text-gray-600 mt-1">
            Manage your payment methods, account balance, and lead purchases.
          </p>
        </div>

        {/* Payment Methods Section */}
        <div className="flex items-center justify-between mb-6 px-1">
          <div className="text-lg font-semibold">Payment methods</div>
          <Link
            href="/pro/payments/add-card"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-[hsl(var(--primary))] hover:underline"
          >
            Add a new card
          </Link>
        </div>

        {/* Payment Methods List */}
        <div className="mb-8">
          {paymentMethods.length === 0 ? (
            <div className="text-red-600 pl-3">No card on file</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {paymentMethods.map((method) => (
                <div
                  key={method.id}
                  className="relative h-60 max-w-sm rounded-xl p-6 shadow-lg transition-transform hover:scale-105 overflow-hidden group"
                  style={{
                    background:
                      "linear-gradient(135deg, hsl(210 15% 35%) 0%, hsl(210 10% 40%) 30%, hsl(210 5% 35%) 70%, hsl(210 10% 20%) 100%)",
                  }}
                >
                  {/* Delete button */}
                  <button
                    onClick={() => handleDeleteClick(method)}
                    className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 transition-colors opacity-0 group-hover:opacity-100"
                    aria-label="Delete payment method"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  {/* Card brand logo area */}
                  <div className="flex justify-between items-start mb-8">
                    <div className="text-white/80 text-xs font-medium uppercase tracking-wider">
                      {method.brand}
                    </div>
                    {method.is_default && (
                      <span className="text-xs font-semibold text-white bg-white/20 backdrop-blur-sm px-2 py-1 rounded">
                        Default
                      </span>
                    )}
                  </div>

                  {/* Chip simulation */}
                  <div className="mb-6">
                    <div className="w-12 h-10 bg-gradient-to-br from-yellow-200 to-yellow-400 rounded-md opacity-80"></div>
                  </div>

                  {/* Card number */}
                  <div className="mb-4">
                    <div className="flex items-center gap-3 text-white text-lg tracking-wider font-mono">
                      <span>••••</span>
                      <span>••••</span>
                      <span>••••</span>
                      <span className="font-semibold">{method.last4}</span>
                    </div>
                  </div>

                  {/* Cardholder and expiry */}
                  <div className="flex justify-between items-end">
                    <div>
                      <div className="text-white/60 text-xs uppercase mb-1">
                        Expires
                      </div>
                      <div className="text-white font-medium">
                        {String(method.exp_month).padStart(2, "0")}/
                        {String(method.exp_year).slice(-2)}
                      </div>
                    </div>
                    <div className="text-white/80">
                      <CreditCard className="w-8 h-8" />
                    </div>
                  </div>

                  {/* Glossy overlay effect */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent rounded-xl pointer-events-none"></div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Billing Settings Section */}
        <section className="mb-8 mt-6">
          <div className="flex justify-between items-center px-3 mb-3">
            <div className="text-lg font-semibold">Billing settings</div>
            <button
              onClick={() => setAddFundsModalOpen(true)}
              className="text-sm font-semibold text-[hsl(var(--primary))] hover:underline"
            >
              Add funds
            </button>
          </div>

          <div className="bg-white border border-gray-300 rounded-lg">
            {/* Current Balance */}
            <div className="p-6 flex justify-between items-center">
              <div className="flex flex-col">
                <p className="text-xs font-semibold text-gray-500 mb-2">
                  CURRENT BALANCE
                </p>
                <p className="text-2xl font-bold">
                  {formatCurrency(balance)}
                </p>
              </div>
            </div>

            {/* Billing Method */}
            <div className="p-6 border-t border-gray-300 flex justify-between items-center">
              <div className="text-sm text-gray-700">
                You're being charged per lead.
              </div>
              <Link
                href="/pro/payments/billing-settings"
                className="text-sm text-[hsl(var(--primary))] hover:underline"
              >
                Edit
              </Link>
            </div>
          </div>
        </section>

        {/* Tabs */}
        <div className="flex justify-between items-center px-3 mb-4">
          <nav>
            <ul className="flex gap-6 border-b border-gray-300">
              <li>
                <button
                  onClick={() => setActiveTab("activity")}
                  className={`pb-3 px-2 text-base font-semibold transition-colors ${
                    activeTab === "activity"
                      ? "text-gray-900 border-b-2 border-[hsl(var(--primary))]"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Activity
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveTab("receipts")}
                  className={`pb-3 px-2 text-base font-semibold transition-colors ${
                    activeTab === "receipts"
                      ? "text-gray-900 border-b-2 border-[hsl(var(--primary))]"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Receipts
                </button>
              </li>
            </ul>
          </nav>
        </div>

        {/* Content Area */}
        <div className="bg-white border border-gray-300 rounded-lg p-6">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <p className="text-gray-500">Loading...</p>
            </div>
          ) : leadPurchases.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="mb-6">
                <svg
                  className="w-36 h-36 text-gray-300"
                  viewBox="0 0 146 146"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle
                    cx="73"
                    cy="73"
                    r="73"
                    fill="currentColor"
                    opacity="0.1"
                  />
                  <path
                    d="M73 45V101M45 73H101"
                    stroke="currentColor"
                    strokeWidth="8"
                    strokeLinecap="round"
                    opacity="0.3"
                  />
                </svg>
              </div>
              <p className="text-lg font-semibold text-gray-900">
                No {activeTab === "activity" ? "activity" : "receipts"} to
                show
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeTab === "activity" &&
                leadPurchases.map((purchase) => (
                  <div
                    key={purchase.id}
                    className="flex items-center justify-between py-3 border-b border-gray-200 last:border-0"
                  >
                    <div>
                      <div className="font-medium text-gray-900">
                        Lead Purchase - {purchase.job?.category || "Job"} #
                        {purchase.job_id}
                      </div>
                      <div className="text-sm text-gray-600 mt-1 max-w-md truncate">
                        {purchase.job?.description || "No description"}
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        {formatDate(
                          purchase.payment_completed_at ||
                            purchase.purchased_at
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-gray-900">
                        -{formatCurrency(purchase.final_price_huf)}
                      </div>
                      <div
                        className={`text-xs mt-1 capitalize ${
                          purchase.payment_status === "completed"
                            ? "text-green-600"
                            : purchase.payment_status === "pending"
                            ? "text-yellow-600"
                            : purchase.payment_status === "failed"
                            ? "text-red-600"
                            : "text-gray-500"
                        }`}
                      >
                        {purchase.payment_status}
                      </div>
                    </div>
                  </div>
                ))}

              {activeTab === "receipts" &&
                leadPurchases
                  .filter((p) => p.payment_status === "completed")
                  .map((purchase) => (
                    <div
                      key={purchase.id}
                      className="flex items-center justify-between py-3 border-b border-gray-200 last:border-0"
                    >
                      <div>
                        <div className="font-medium text-gray-900">
                          Lead Purchase - {purchase.job?.category || "Job"} #
                          {purchase.job_id}
                        </div>
                        <div className="text-sm text-gray-600 mt-1 max-w-md truncate">
                          {purchase.job?.description || "No description"}
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                          {formatDate(
                            purchase.payment_completed_at ||
                              purchase.purchased_at
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="font-semibold text-gray-900">
                            {formatCurrency(purchase.final_price_huf)}
                          </div>
                        </div>
                        <Link
                          href={`/pro/payments/receipt/${purchase.id}`}
                          className="text-sm text-[hsl(var(--primary))] hover:underline"
                        >
                          View
                        </Link>
                      </div>
                    </div>
                  ))}
            </div>
          )}
        </div>
      </div>

      <Dialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
      >
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle>Delete Payment Method</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this{" "}
              {paymentMethodToDelete?.brand} card ending in{" "}
              {paymentMethodToDelete?.last4}?
              {paymentMethodToDelete?.is_default && (
                <span className="block mt-2 text-amber-600 font-semibold">
                  This is your default payment method. You'll need to set a
                  new default after deletion.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              onClick={() => {
                setDeleteDialogOpen(false);
                setPaymentMethodToDelete(null);
              }}
              disabled={isDeleting}
              className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isDeleting ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AddFundsModal
        open={addFundsModalOpen}
        onOpenChange={setAddFundsModalOpen}
        proProfileId={proProfileId}
        onSuccess={() => {
          // Refresh balance after successful fund addition
          if (proProfileId) {
            fetch(`${API_BASE_URL}/api/v1/stripe/balance/${proProfileId}`)
              .then((res) => res.json())
              .then((data) => setBalance(data.balance_huf || 0))
              .catch((err) =>
                console.error("Error fetching balance:", err)
              );
          }
        }}
      />
    </>
  );
}

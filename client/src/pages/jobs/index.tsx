import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { subscribeToAuthChanges } from "@/lib/auth";
import { getCurrentUser } from "@/lib/api";
import CustomerJobDashboard from "@/components/CustomerJobDashboard";
import { Briefcase, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CustomerJobsPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribeToAuthChanges(async (user) => {
      if (!user?.email) {
        router.replace("/login");
        return;
      }
      // Fetch user ID from the API
      try {
        const userData = await getCurrentUser();
        if (userData?.id) {
          setUserId(userData.id);
        }
      } catch (e) {
        console.error("Failed to fetch user ID:", e);
      }
      setChecking(false);
    });
    return () => { if (unsub) unsub(); };
  }, [router]);

  if (checking || !userId) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto p-6">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        <Button
          variant="ghost"
          onClick={() => router.push("/")}
          className="mb-4"
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Button>

        <div className="flex items-center gap-3 mb-6">
          <Briefcase className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-semibold text-gray-900">
              My Jobs
            </h1>
            <p className="text-gray-600 mt-1">
              Track your service projects and ongoing work
            </p>
          </div>
        </div>

        <CustomerJobDashboard customerId={userId} />
      </div>
    </main>
  );
}


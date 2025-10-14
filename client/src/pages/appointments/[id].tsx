import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { subscribeToAuthChanges } from "@/lib/auth";
import { getCurrentUser } from "@/lib/api";
import AppointmentDetail from "@/components/AppointmentDetail";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CustomerAppointmentDetailPage() {
  const router = useRouter();
  const { id } = router.query;
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

  if (checking || !id || !userId) {
    return (
      <main className="min-h-screen bg-white">
        <div className="max-w-4xl mx-auto p-6">Loading...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto p-6">
        <Button
          variant="ghost"
          onClick={() => router.push("/appointments")}
          className="mb-4"
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back to My Appointments
        </Button>

        <h1 className="text-3xl font-semibold text-gray-900 mb-6">
          Appointment Details
        </h1>

        <AppointmentDetail
          appointmentId={id as string}
          userId={userId}
          userType="customer"
        />
      </div>
    </main>
  );
}


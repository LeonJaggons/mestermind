import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { subscribeToAuthChanges } from "@/lib/auth";
import { getCurrentUser } from "@/lib/api";
import AppointmentList from "@/components/AppointmentList";
import { Calendar, ChevronLeft, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function CustomerAppointmentsPage() {
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
      <main className="min-h-screen bg-white">
        <div className="max-w-7xl mx-auto p-6">Loading...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto p-6">
        <Button
          variant="ghost"
          onClick={() => router.push("/")}
          className="mb-4"
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Button>

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Calendar className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-3xl font-semibold text-gray-900">
                My Appointments
              </h1>
              <p className="text-gray-600 mt-1">
                View and manage your scheduled services
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => window.open(`${API_BASE_URL}/appointments/export/customer/${userId}/ical`, '_blank')}
          >
            <Download className="h-4 w-4 mr-2" />
            Export to Calendar
          </Button>
        </div>

        <AppointmentList userId={userId} userType="customer" />
      </div>
    </main>
  );
}


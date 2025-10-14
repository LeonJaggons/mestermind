import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { subscribeToAuthChanges } from "@/lib/auth";
import { fetchProStatus } from "@/lib/api";
import AppointmentDetail from "@/components/AppointmentDetail";
import ProLayout from "@/components/pro/ProLayout";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ProAppointmentDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const [checking, setChecking] = useState(true);
  const [mesterId, setMesterId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribeToAuthChanges(async (user) => {
      if (!user?.email) {
        router.replace("/login");
        return;
      }
      const status = await fetchProStatus(user.email);
      if (!status.is_pro || !status.mester_id) {
        router.replace("/pro/onboarding");
        return;
      }
      setMesterId(status.mester_id);
      setUserId(status.user_id || null);
      setChecking(false);
    });
    return () => { if (unsub) unsub(); };
  }, [router]);

  if (checking || !id || !mesterId) {
    return (
      <ProLayout>
        <div>Loading...</div>
      </ProLayout>
    );
  }

  return (
    <ProLayout>
      <div>
        <Button
          variant="ghost"
          onClick={() => router.push("/pro/calendar")}
          className="mb-4"
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back to Calendar
        </Button>

        <h1 className="text-3xl font-semibold text-gray-900 mb-6">
          Appointment Details
        </h1>

        <AppointmentDetail
          appointmentId={id as string}
          userId={mesterId}
          userType="mester"
        />
      </div>
    </ProLayout>
  );
}


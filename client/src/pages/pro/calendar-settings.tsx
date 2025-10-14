import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { subscribeToAuthChanges } from "@/lib/auth";
import { fetchProStatus } from "@/lib/api";
import CalendarSettings from "@/components/CalendarSettings";
import ProLayout from "@/components/pro/ProLayout";
import { Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ProCalendarSettingsPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [mesterId, setMesterId] = useState<string | null>(null);

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
      setChecking(false);
    });
    return () => { if (unsub) unsub(); };
  }, [router]);

  if (checking || !mesterId) {
    return (
      <ProLayout>
        <div>Loading...</div>
      </ProLayout>
    );
  }

  return (
    <ProLayout>
      <div>
        <div className="flex items-center gap-3 mb-6">
          <Calendar className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-semibold text-gray-900">
            Calendar Settings
          </h1>
        </div>
        
        <p className="text-gray-600 mb-6">
          Configure your working hours and availability preferences
        </p>

        <CalendarSettings mesterId={mesterId} />
      </div>
    </ProLayout>
  );
}


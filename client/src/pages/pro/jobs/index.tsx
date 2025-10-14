import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { subscribeToAuthChanges } from "@/lib/auth";
import { fetchProStatus } from "@/lib/api";
import ProJobDashboard from "@/components/ProJobDashboard";
import ProLayout from "@/components/pro/ProLayout";
import { Briefcase } from "lucide-react";

export default function ProJobsPage() {
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
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </ProLayout>
    );
  }

  return (
    <ProLayout>
      <div>
        <div className="flex items-center gap-3 mb-6">
          <Briefcase className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-semibold text-gray-900">
              Job Management
            </h1>
            <p className="text-gray-600 mt-1">
              Track projects, manage milestones, and grow your business
            </p>
          </div>
        </div>

        <ProJobDashboard mesterId={mesterId} />
      </div>
    </ProLayout>
  );
}


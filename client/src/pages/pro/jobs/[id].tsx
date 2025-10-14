import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { subscribeToAuthChanges } from "@/lib/auth";
import { fetchProStatus } from "@/lib/api";
import JobDetailView from "@/components/JobDetailView";
import ProLayout from "@/components/pro/ProLayout";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ProJobDetailPage() {
  const router = useRouter();
  const { id } = router.query;
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

  if (checking || !id || !mesterId) {
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
        <Button
          variant="ghost"
          onClick={() => router.push("/pro/jobs")}
          className="mb-4"
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back to Jobs
        </Button>

        <JobDetailView jobId={id as string} userType="mester" />
      </div>
    </ProLayout>
  );
}


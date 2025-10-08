import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { subscribeToAuthChanges } from "@/lib/auth";
import { fetchIsProByEmail, fetchProProfileByEmail, fetchProStatus, type ProProfile } from "@/lib/api";
import { AlertTriangle } from "lucide-react";

export default function ProDashboardPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [profile, setProfile] = useState<ProProfile | null>(null);
  const [proStatus, setProStatus] = useState<{ mester_id: string | null; logo_url: string | null; display_name: string | null } | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges(async (user) => {
      try {
        if (!user?.email) {
          router.replace("/login");
          return;
        }
        const { is_pro } = await fetchIsProByEmail(user.email);
        if (!is_pro) {
          router.replace("/pro/onboarding");
          return;
        }
        
        // Fetch pro status to check if profile exists
        const status = await fetchProStatus(user.email);
        setProStatus({
          mester_id: status.mester_id ?? null,
          logo_url: status.logo_url ?? null,
          display_name: status.display_name ?? null
        });
        
        const prof = await fetchProProfileByEmail(user.email).catch(() => null);
        setProfile(prof || null);
      } finally {
        setChecking(false);
      }
    });
    return () => { if (unsubscribe) unsubscribe(); };
  }, [router]);

  if (checking) {
    return (
      <main className="min-h-screen bg-white">
        <div className="max-w-5xl mx-auto p-6">
          <div className="text-gray-700">Loading your dashboard…</div>
        </div>
      </main>
    );
  }

  // Check if profile is incomplete
  console.log('proStatus', proStatus);
  const isProfileIncomplete = !proStatus?.logo_url;

  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-5xl mx-auto p-6">
        <h1 className="text-2xl font-semibold text-gray-900">Pro Dashboard</h1>
        <p className="text-gray-700 mt-1">Welcome back{profile?.display_name ? ", " + profile.display_name : ""}.</p>

        {/* Profile completion alert */}
        {isProfileIncomplete && (
          <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 mr-3 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-sm font-medium text-amber-800">Complete Your Profile</h3>
                <p className="text-sm text-amber-700 mt-1">
                  Your profile is incomplete. Complete your business details to start receiving leads and appear in search results.
                </p>
                <div className="mt-3">
                  <Link href="/pro/onboarding">
                    <button className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors">
                      Complete Profile
                    </button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <DashboardCard
            title="Leads"
            description="View and manage new customer requests."
            href="/pro/leads"
          />
          <DashboardCard
            title="Profile"
            description="Update your business details and service areas."
            href="/pro/onboarding"
          />
          <DashboardCard
            title="Settings"
            description="Account and notifications."
            href="#"
          />
        </div>
      </div>
    </main>
  );
}

function DashboardCard(props: { title: string; description: string; href: string }) {
  const { title, description, href } = props;
  return (
    <Link
      href={href}
      className="block rounded-lg border border-gray-200 hover:border-gray-300 shadow-sm hover:shadow-md transition p-4"
    >
      <div className="text-lg font-medium text-gray-900">{title}</div>
      <div className="text-sm text-gray-600 mt-1">{description}</div>
    </Link>
  );
}



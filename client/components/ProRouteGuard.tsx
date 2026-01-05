"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/contexts/AuthContext";
import { API_BASE_URL } from "@/lib/api/config";

export default function ProRouteGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [hasProProfile, setHasProProfile] = useState<boolean>(false);
  const [roleLoading, setRoleLoading] = useState(true);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkUserRole = async () => {
      // Allow access to onboarding pages and the main /become-a-pro landing page - no checks needed
      const isOnboardingPage = pathname?.startsWith("/become-a-pro/onboarding");
      const isProLandingPage = pathname === "/become-a-pro";
      const isProPage = pathname?.startsWith("/pro");
      
      if (isOnboardingPage || isProLandingPage) {
        setIsChecking(false);
        setRoleLoading(false);
        setUserRole(null); // Don't need to check role for landing/onboarding
        return;
      }

      // Only check authentication/role for /pro/* pages
      if (!isProPage) {
        setIsChecking(false);
        setRoleLoading(false);
        return;
      }

      // For /pro/* pages, check authentication and role
      if (authLoading) {
        return;
      }

      if (!user) {
        // Not authenticated - redirect to login
        router.push("/login?redirect=" + encodeURIComponent(pathname || "/pro"));
        return;
      }

      try {
        setRoleLoading(true);
        const response = await fetch(`${API_BASE_URL}/api/v1/users/firebase/${user.uid}`);
        if (response.ok) {
          const userData = await response.json();
          setUserRole(userData.role);
          
          // Check if user has a pro profile (even if role is customer)
          let userHasProProfile = false;
          try {
            const proProfileResponse = await fetch(`${API_BASE_URL}/api/v1/pro-profiles/user/${userData.id}`);
            if (proProfileResponse.ok) {
              userHasProProfile = true;
              setHasProProfile(true);
            } else {
              setHasProProfile(false);
            }
          } catch (error) {
            setHasProProfile(false);
          }
          
          // Check if user is a pro (mester role OR has pro profile)
          const isPro = userData.role === "mester" || userHasProProfile;
          if (!isPro) {
            // Not a pro - redirect to home
            router.push("/");
            return;
          }
        } else {
          // Failed to fetch user - redirect to home
          router.push("/");
          return;
        }
      } catch (error) {
        console.error("Failed to fetch user role:", error);
        router.push("/");
        return;
      } finally {
        setRoleLoading(false);
        setIsChecking(false);
      }
    };

    checkUserRole();
  }, [user, authLoading, pathname, router]);

  // Allow onboarding and landing page - check this first before showing loading
  const isOnboardingPage = pathname?.startsWith("/become-a-pro/onboarding");
  const isProLandingPage = pathname === "/become-a-pro";
  
  // If it's the landing page or onboarding, allow access immediately
  if (isOnboardingPage || isProLandingPage) {
    return <>{children}</>;
  }

  // Show loading state while checking (only for protected pages)
  if (isChecking || roleLoading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(var(--primary))] mx-auto mb-2"></div>
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  // For other pages, ensure user is a pro (has mester role OR has pro profile)
  const isPro = userRole === "mester" || hasProProfile;
  if (!isPro) {
    return null; // Will redirect in useEffect
  }

  return <>{children}</>;
}

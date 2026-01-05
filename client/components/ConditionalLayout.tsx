"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Header from "./Header";
import ProHeader from "./ProHeader";
import Footer from "./Footer";
import ProFooter from "./ProFooter";
import { useAuth } from "@/lib/contexts/AuthContext";
import { API_BASE_URL } from "@/lib/api/config";

export default function ConditionalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [hasProProfile, setHasProProfile] = useState<boolean>(false);
  const [roleLoading, setRoleLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) {
        setUserRole(null);
        setHasProProfile(false);
        setRoleLoading(false);
        return;
      }

      setRoleLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/users/firebase/${user.uid}`);
        if (response.ok) {
          const userData = await response.json();
          setUserRole(userData.role);
          
          // Check if user has a pro profile (even if role is customer)
          try {
            const proProfileResponse = await fetch(`${API_BASE_URL}/api/v1/pro-profiles/user/${userData.id}`);
            if (proProfileResponse.ok) {
              setHasProProfile(true);
            } else {
              setHasProProfile(false);
            }
          } catch (error) {
            setHasProProfile(false);
          }
        }
      } catch (error) {
        console.error("Failed to fetch user data:", error);
      } finally {
        setRoleLoading(false);
      }
    };

    fetchUserData();
  }, [user]);

  // Hide header and footer on onboarding pages and request detail pages
  const isOnboardingFlow = pathname?.startsWith("/become-a-pro/onboarding");
  const isRequestDetailPage = pathname?.startsWith("/pro/request/");
  const isCustomerMessagesPage = pathname?.startsWith("/customer/messages");

  // Check if user is a pro (has mester role OR has a pro profile)
  const isPro = userRole === "mester" || hasProProfile;

  // Use ProHeader if user is a pro (except onboarding)
  const showProHeader = !isOnboardingFlow && !loading && !roleLoading && user && isPro;

  // Use ProFooter only on /pro/... pages (except request detail)
  const showProFooter = pathname?.startsWith("/pro") && !isRequestDetailPage && !loading && !roleLoading && user && isPro;

  // Show skeleton/placeholder while loading role for authenticated users
  if ((loading || roleLoading) && !isOnboardingFlow) {
    return (
      <>
        <div className="h-16 bg-white border-b border-gray-200"></div>
        {children}
      </>
    );
  }

  return (
    <>
      {!isOnboardingFlow && (showProHeader ? <ProHeader /> : <Header />)}
      {children}
      {!isOnboardingFlow && !isRequestDetailPage && !isCustomerMessagesPage && (showProFooter ? <ProFooter /> : <Footer />)}
    </>
  );
}

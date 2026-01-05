"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/contexts/AuthContext";
import { API_BASE_URL } from "@/lib/api/config";
import ProHero from '@/components/ProHero';
import DifferenceSection from '@/components/DifferenceSection';
import TestimonialsSection from '@/components/TestimonialsSection';

export default function ProPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [checkingRole, setCheckingRole] = useState(false);

  useEffect(() => {
    // Only redirect if user is authenticated AND is a pro
    const checkAndRedirect = async () => {
      if (loading || !user) {
        return;
      }

      setCheckingRole(true);
      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/users/firebase/${user.uid}`);
        if (response.ok) {
          const userData = await response.json();
          // Only redirect if user is a pro (mester role)
          if (userData.role === "mester") {
            router.push("/pro/jobs");
          }
        }
      } catch (error) {
        console.error("Failed to fetch user role:", error);
        // On error, don't redirect - show landing page
      } finally {
        setCheckingRole(false);
      }
    };

    checkAndRedirect();
  }, [user, loading, router]);

  // Show loading state while checking auth or role
  if (loading || checkingRole) {
    return null;
  }

  // Show pro landing page for everyone (non-authenticated users and non-pro users)
  return (
    <main className="min-h-screen">
      <ProHero />
      <DifferenceSection />
      <TestimonialsSection />
    </main>
  );
}

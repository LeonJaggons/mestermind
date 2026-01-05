"use client";

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { API_BASE_URL } from "@/lib/api/config";

interface HealthResponse {
  status: string;
  version?: string;
}

export default function SiteDownBanner() {
  const [isApiDown, setIsApiDown] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkApiHealth = async () => {
      try {
        // Create an AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

        const response = await fetch(`${API_BASE_URL}/health`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const data: HealthResponse = await response.json();
          if (data.status === "healthy") {
            setIsApiDown(false);
          } else {
            setIsApiDown(true);
          }
        } else {
          setIsApiDown(true);
        }
      } catch (error) {
        // API is down or unreachable (network error, timeout, etc.)
        setIsApiDown(true);
      } finally {
        setIsChecking(false);
      }
    };

    // Initial check
    checkApiHealth();

    // Poll every 30 seconds
    const interval = setInterval(checkApiHealth, 30000);

    return () => clearInterval(interval);
  }, []);

  // Don't show banner while doing initial check (to avoid flash)
  if (isChecking || !isApiDown) {
    return null;
  }

  return (
    <div className="bg-red-600 text-white py-3 px-4 w-full z-50 relative">
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-2">
        <AlertTriangle className="h-5 w-5 flex-shrink-0" />
        <p className="text-sm font-medium text-center">
          The site is temporarily down for maintenance. Please try again later.
        </p>
      </div>
    </div>
  );
}







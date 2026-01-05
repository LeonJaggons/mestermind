"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { categoriesApi } from "@/lib/api/categories";
import { Checkbox } from "@/components/ui/checkbox";
import { AuthModal } from "@/components/AuthModal";
import { useAuth } from "@/lib/contexts/AuthContext";
import { useI18n } from "@/lib/contexts/I18nContext";
import { syncUserToDatabase } from "@/lib/hooks/useUserSync";
import { API_BASE_URL } from "@/lib/api/config";

interface Service {
  id: string;
  name: string;
  slug: string;
}

const ProOnboardingPageContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { language } = useI18n();
  const [services, setServices] = useState<Service[]>([]);
  const [selectedServices, setSelectedServices] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [selectAll, setSelectAll] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const selectedServiceSlug = searchParams.get("service");
  const categorySlug = searchParams.get("category");
  const serviceName = searchParams.get("serviceName");
  const location = searchParams.get("location");

  useEffect(() => {
    const fetchCategoryServices = async () => {
      if (!categorySlug) {
        setLoading(false);
        return;
      }

      try {
        const categories = await categoriesApi.getAllWithServices(0, 100, language);
        const category = categories.find((cat) => cat.slug === categorySlug);
        
        if (category) {
          setServices(category.services);
          
          // Pre-select the initially chosen service
          if (selectedServiceSlug) {
            setSelectedServices(new Set([selectedServiceSlug]));
          }
        }
      } catch (error) {
        console.error("Failed to fetch services:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCategoryServices();
  }, [categorySlug, selectedServiceSlug, language]);

  const handleToggleService = (serviceSlug: string) => {
    // Don't allow unchecking the initially selected service
    if (serviceSlug === selectedServiceSlug) {
      return;
    }

    setSelectedServices((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(serviceSlug)) {
        newSet.delete(serviceSlug);
      } else {
        newSet.add(serviceSlug);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectAll) {
      // Deselect all except the initially selected service
      setSelectedServices(new Set([selectedServiceSlug!]));
      setSelectAll(false);
    } else {
      // Select all services
      setSelectedServices(new Set(services.map((s) => s.slug)));
      setSelectAll(true);
    }
  };

  const handleNext = async () => {
    if (!user && !authLoading) {
      setShowAuthModal(true);
      return;
    }
    
    // Sync user to database and create pro_profile if user is already signed in
    if (user && user.email) {
      // First, ensure user exists in database
      await syncUserToDatabase({
        email: user.email,
        role: 'mester',
        firebaseUid: user.uid,
      });

      // Then create/update pro_profile
      try {
        await fetch(`${API_BASE_URL}/api/v1/pro-profiles/user/${user.uid}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}),
        });
      } catch (err) {
        console.error('Failed to create pro profile:', err);
      }

      // Save selected services
      try {
        const serviceIds = services
          .filter(service => selectedServices.has(service.slug))
          .map(service => parseInt(service.id));
        
        await fetch(`${API_BASE_URL}/api/v1/pro-services/user/${user.uid}/bulk`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(serviceIds),
        });
      } catch (err) {
        console.error('Failed to save services:', err);
        alert('Failed to save services. Please try again.');
        return;
      }
      
      router.push(`/become-a-pro/onboarding/${user.uid}/business-name`);
    }
  };

  const handleAuthSuccess = () => {
    // After successful auth, the user will be available and we can proceed
    // The auth context will update and trigger a re-render
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="flex justify-between bg-white h-16 border-b border-gray-300">
        <div className="flex flex-grow">
          <div className="flex h-full">
            <Link className="flex items-center px-6" href="/" aria-label="Mestermind Home">
              <p className="tracking-tight text-xl font-bold">Mestermind</p>
            </Link>
          </div>
          <div className="hidden md:flex items-center px-6 border-l border-gray-300 text-gray-500">
            Setup
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1">
        <div className="max-w-4xl mx-auto my-6 md:my-12 px-4">
          <div className="flex justify-between mb-8">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-4">
                Select any other services you do.
              </h1>
              <p className="text-base text-gray-700">
                You'll show up in search results and get jobs for all services you select.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="bg-white rounded-lg p-8 text-center">
              <p className="text-gray-500">Loading services...</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg p-8 shadow-sm">
              <div className="mb-4">
                <button
                  onClick={handleSelectAll}
                  className="text-[hsl(var(--primary))] hover:underline font-medium"
                  type="button"
                >
                  {selectAll ? "Deselect all" : "Select all"}
                </button>
              </div>

              <ul className="mt-4">
                {services.map((service, index) => {
                  const isSelected = selectedServices.has(service.slug);
                  const isInitialService = service.slug === selectedServiceSlug;
                  const isDisabled = isInitialService;

                  return (
                    <li
                      key={service.id}
                      className={`border-b border-gray-300 ${index === services.length - 1 ? "border-b-0" : ""}`}
                    >
                      <label
                        className="flex items-center py-4 cursor-pointer"
                        style={{
                          cursor: isDisabled ? "default" : "pointer",
                        }}
                      >
                        <div className="flex items-center">
                          <div
                            className="w-6 h-6 rounded border-2 flex items-center justify-center mr-3"
                            style={{
                              backgroundColor: isSelected
                                ? isDisabled
                                  ? "#fafafa"
                                  : "hsl(var(--primary))"
                                : "#ffffff",
                              borderColor: isSelected
                                ? isDisabled
                                  ? "#e9eced"
                                  : "hsl(var(--primary))"
                                : "#d3d4d5",
                              color: isDisabled ? "#d3d4d5" : "#ffffff",
                            }}
                          >
                            {isSelected && (
                              <svg
                                width="18"
                                height="18"
                                viewBox="0 0 18 18"
                                fill="currentColor"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <rect
                                  x="15.232"
                                  y="4.003"
                                  width="11.701"
                                  height="1.879"
                                  rx=".939"
                                  transform="rotate(123 15.232 4.003)"
                                ></rect>
                                <rect
                                  x="8.83"
                                  y="13.822"
                                  width="7.337"
                                  height="1.879"
                                  rx=".939"
                                  transform="rotate(-146 8.83 13.822)"
                                ></rect>
                                <path d="M8.072 13.306l1.03-1.586.787.512-1.03 1.586z"></path>
                              </svg>
                            )}
                          </div>
                          <input
                            type="checkbox"
                            className="sr-only"
                            checked={isSelected}
                            disabled={isDisabled}
                            onChange={() => handleToggleService(service.slug)}
                            aria-checked={isSelected}
                          />
                          <span
                            className="text-base"
                            style={{
                              color: isDisabled ? "#d3d4d5" : "inherit",
                            }}
                          >
                            {service.name}
                          </span>
                        </div>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Footer Action Bar */}
      <div className="w-full bg-white z-10 fixed left-0 bottom-0 border-t border-gray-300">
        <div className="flex flex-wrap justify-center max-w-[1200px] mx-auto py-2 px-3">
          <div className="w-full min-h-[60px]">
            <div className="flex justify-between items-center relative w-full">
              <div>
                <div className="hidden md:flex font-bold">
                  <button
                    className="text-[hsl(var(--primary))] hover:underline flex items-center"
                    type="button"
                    onClick={() => router.back()}
                  >
                    <svg
                      className="mr-1"
                      height="28"
                      width="28"
                      fill="currentColor"
                      viewBox="0 0 28 28"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path d="M11.236 21.646L3 14l8.275-7.689a1 1 0 011.482 1.342L7.25 13h16.748A1 1 0 1124 15H7.25l5.449 5.285c.187.2.301.435.301.715a1 1 0 01-1 1c-.306 0-.537-.151-.764-.354z"></path>
                    </svg>
                    Back
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-center md:justify-end px-3 py-2 w-full md:w-auto">
                <div className="w-full md:w-auto">
                  <button
                    className="w-full md:w-auto px-8 py-3 rounded-lg font-semibold text-white transition-colors"
                    style={{
                      backgroundColor: "hsl(var(--primary))",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                    type="button"
                    onClick={handleNext}
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Auth Modal */}
      <AuthModal
        open={showAuthModal}
        onOpenChange={setShowAuthModal}
        onSuccess={handleAuthSuccess}
      />
    </div>
  );
};

export default function ProOnboardingPage() {
  return (
    <Suspense fallback={null}>
      <ProOnboardingPageContent />
    </Suspense>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/contexts/AuthContext";
import Link from "next/link";
import { AddServiceModal } from "@/components/AddServiceModal";
import { useI18n } from "@/lib/contexts/I18nContext";
import { API_BASE_URL } from "@/lib/api/config";

interface Category {
  id: string;
  name: string;
}

interface ServiceDetail {
  id: string;
  name: string;
  category_id: string;
  category: Category;
}

interface Service {
  id: number;
  pro_profile_id: number;
  service_id: number;
  created_at: string;
  service: ServiceDetail;
}

interface ProProfile {
  business_name: string;
  city: string;
  state: string;
}

interface Metrics {
  totalSpent: number;
  totalLeads: number;
  weekSpent: number;
  weekLeads: number;
}

interface ViewCounts {
  total_views: number;
  views_by_service: Record<string, number>;
  views_this_week: number;
  views_this_month: number;
}

export default function ServicesPage() {
  const { user } = useAuth();
  const { t, language } = useI18n();
  const [services, setServices] = useState<Service[]>([]);
  const [proProfile, setProProfile] = useState<ProProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [metrics, setMetrics] = useState<Metrics>({
    totalSpent: 0,
    totalLeads: 0,
    weekSpent: 0,
    weekLeads: 0,
  });
  const [viewCounts, setViewCounts] = useState<ViewCounts | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      try {
        // Fetch pro profile
        const profileResponse = await fetch(`${API_BASE_URL}/api/v1/pro-profiles/user/${user.uid}`);
        console.log('Profile response status:', profileResponse.status);
        if (profileResponse.ok) {
          const profileData = await profileResponse.json();
          console.log('Profile data:', profileData);
          setProProfile(profileData);

          // Fetch services using the pro_profile_id from the profile
          const servicesResponse = await fetch(`${API_BASE_URL}/api/v1/pro-services/pro-profile/${profileData.id}?language=${language}`);
          if (servicesResponse.ok) {
            const servicesData = await servicesResponse.json();
            setServices(servicesData);
          }

          // Fetch lead purchases for metrics
          const purchasesResponse = await fetch(`${API_BASE_URL}/api/v1/lead-purchases?pro_profile_id=${profileData.id}`);
          if (purchasesResponse.ok) {
            const purchases = await purchasesResponse.json();
            
            // Filter completed purchases
            const completedPurchases = purchases.filter((p: any) => p.payment_status === "completed");
            
            // Calculate total metrics
            const totalSpent = completedPurchases.reduce((sum: number, p: any) => sum + (p.final_price_huf || 0), 0);
            const totalLeads = completedPurchases.length;
            
            // Calculate this week's metrics
            const now = new Date();
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            
            const weekPurchases = completedPurchases.filter((p: any) => {
              if (!p.payment_completed_at) return false;
              const completedDate = new Date(p.payment_completed_at);
              return completedDate >= weekAgo;
            });
            
            const weekSpent = weekPurchases.reduce((sum: number, p: any) => sum + (p.final_price_huf || 0), 0);
            const weekLeads = weekPurchases.length;
            
            setMetrics({
              totalSpent,
              totalLeads,
              weekSpent,
              weekLeads,
            });
          }

          // Fetch view counts
          const viewsResponse = await fetch(`${API_BASE_URL}/api/v1/profile-views/pro-profile/${profileData.id}/counts`);
          if (viewsResponse.ok) {
            const viewsData = await viewsResponse.json();
            setViewCounts(viewsData);
          }
        } else {
          const errorText = await profileResponse.text();
          console.error('Profile fetch error:', errorText);
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const handleServiceAdded = async () => {
    // Refetch services after adding new ones
    if (user) {
      try {
        // First get the pro profile to get the pro_profile_id
        const profileResponse = await fetch(`${API_BASE_URL}/api/v1/pro-profiles/user/${user.uid}`);
        if (profileResponse.ok) {
          const profileData = await profileResponse.json();

          // Then fetch services using the pro_profile_id
          const servicesResponse = await fetch(`${API_BASE_URL}/api/v1/pro-services/pro-profile/${profileData.id}?language=${language}`);
          if (servicesResponse.ok) {
            const servicesData = await servicesResponse.json();
            setServices(servicesData);
          }
        }
      } catch (error) {
        console.error("Failed to refetch services:", error);
      }
    }
  };

  return (
    <div className="grow mb-4 lg:mb-5 px-8 pt-8 pb-12 bg-white">
      <div className="max-w-6xl mx-auto ">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Content */}
          <main className="lg:col-span-8 order-2 lg:order-1">
            {/* Header */}
            <header className="mb-6">
              <div className="flex justify-between items-start">
                <div className="relative">
                  <div className="flex items-center">
                    <h1 className="text-3xl font-bold">
                      {proProfile?.business_name || user?.displayName || user?.email?.split('@')[0]}
                    </h1>
                    <svg className="ml-2 mt-2 lg:mt-3 shrink-0" height="18" width="18" fill="currentColor" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                      <path d="M14.646 6.764L9 13 3.311 6.725a1 1 0 011.342-1.482L9 10l4.285-4.699c.2-.187.435-.301.715-.301a1 1 0 011 1c0 .306-.151.537-.354.764z"></path>
                    </svg>
                  </div>
                </div>
                <div className="flex items-end">
                  <button className="text-[hsl(var(--primary))]" aria-label="Options menu" type="button">
                    <svg className="ml-3 mr-1" height="18" width="18" fill="currentColor" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                      <path d="M15 7c-1.103 0-2 .896-2 2s.897 2 2 2a2 2 0 000-4zM9 7c-1.103 0-2 .896-2 2s.897 2 2 2a2 2 0 000-4zM3 7c-1.103 0-2 .896-2 2s.897 2 2 2a2 2 0 000-4z"></path>
                    </svg>
                  </button>
                </div>
              </div>
              <div className="flex items-center mt-2">
                <svg className="mr-2" aria-label="Location" height="18" width="18" fill="currentColor" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3.002 7.25c0 3.248 4.342 7.756 5.23 8.825l.769.925.769-.926c.888-1.068 5.234-5.553 5.234-8.824C15.004 4.145 13 1 9.001 1c-3.999 0-6 3.145-6 6.25zm1.994 0C4.995 5.135 6.175 3 9 3s4.002 2.135 4.002 4.25c0 1.777-2.177 4.248-4.002 6.59C7.1 11.4 4.996 9.021 4.996 7.25zM8.909 5.5c-.827 0-1.5.673-1.5 1.5s.673 1.5 1.5 1.5 1.5-.673 1.5-1.5-.673-1.5-1.5-1.5z"></path>
                </svg>
                <p className="text-sm">
                  {proProfile?.city && proProfile?.state
                    ? `${proProfile.city}, ${proProfile.state}`
                    : 'New York'}
                </p>
              </div>
            </header>

            {/* Services Section */}
            <div className="mt-8">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">{t("pro.services.yourServices")}</h2>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="text-[hsl(var(--primary))] hover:underline"
                >
                  <div className="flex items-center px-3">
                    <svg className="shrink-0" height="18" width="18" fill="currentColor" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                      <path d="M14.656 3.343a7.999 7.999 0 010 11.314 7.999 7.999 0 01-11.312 0 7.999 7.999 0 010-11.313 7.999 7.999 0 0111.312 0zM4.758 4.758a5.999 5.999 0 000 8.485 5.999 5.999 0 008.484 0 5.999 5.999 0 000-8.485 5.999 5.999 0 00-8.484 0zM9 5.75a1 1 0 011 1l-.001 1.249h1.25a1 1 0 01.994.884L12.25 9a1 1 0 01-1 1l-1.251-.001v1.25a1 1 0 01-.883.994L9 12.25a1 1 0 01-1-1l-.001-1.251h-1.25a1 1 0 01-.992-.883L5.75 9a1 1 0 011-1l1.249-.001v-1.25a1 1 0 01.884-.992L9 5.75z"></path>
                    </svg>
                    <span className="text-sm font-semibold ml-2 whitespace-nowrap">{t("pro.services.addService")}</span>
                  </div>
                </button>
              </div>

              <p className="text-sm mt-2 mb-6">
                {t("pro.services.description")}{" "}
                <a href="https://help.thumbtack.com/article/preferences-guide" target="_blank" rel="noopener noreferrer" className="text-primary underline font-semibold">
                  {t("pro.services.viewGuide")}
                </a>
              </p>

              {/* Services List */}
              {loading ? (
                <div className="mt-6 space-y-6 animate-pulse">
                  {Array.from({ length: 3 }).map((_, idx) => (
                    <div key={idx} className="space-y-3">
                      <div className="h-3 bg-gray-200 rounded w-32" />
                      <div className="space-y-2">
                        <div className="h-4 bg-gray-100 rounded w-1/2" />
                        <div className="h-3 bg-gray-100 rounded w-3/4" />
                        <div className="h-3 bg-gray-100 rounded w-2/3" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : services.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">{t("pro.services.noServices")}</p>
                </div>
              ) : (
                <ol className="mt-10">
                  {Object.entries(
                    services.reduce((acc, proService) => {
                      const categoryName = proService.service.category.name;
                      if (!acc[categoryName]) {
                        acc[categoryName] = [];
                      }
                      acc[categoryName].push(proService);
                      return acc;
                    }, {} as Record<string, Service[]>)
                  ).map(([categoryName, categoryServices]) => (
                    <li key={categoryName} className="mb-8">
                      <div className="text-xs font-semibold mb-3 pb-3 border-b border-gray-300 text-gray-500 uppercase">
                        {categoryName}
                      </div>
                      {categoryServices.map((proService) => {
                        const serviceViewCount = viewCounts?.views_by_service[proService.service_id] || 0;
                        return (
                          <div key={proService.id} className="mb-4 pb-3 border-b border-gray-300">
                            <button type="button" className="w-full flex items-center justify-between hover:bg-gray-50 py-2 rounded">
                              <div className="flex-1 mr-3 text-left">
                                <h3 className="text-sm font-semibold" style={{ color: 'rgb(47, 48, 51)' }}>{proService.service.name}</h3>
                                <p className="text-sm text-gray-600 mt-1">
                                  {t("pro.services.serviceOfferedIn")} {proProfile?.city && proProfile?.state
                                    ? `${proProfile.city}, ${proProfile.state}`
                                    : t("pro.services.yourArea")}
                                  {serviceViewCount > 0 && (
                                    <span className="ml-2 text-xs text-gray-500">
                                      • {serviceViewCount} {serviceViewCount === 1 ? t("pro.services.view") : t("pro.services.views")}
                                    </span>
                                  )}
                                </p>
                              </div>
                              <svg className="text-gray-500 shrink-0" height="18" width="18" fill="currentColor" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                                <path d="M6.764 14.646L13 9 6.725 3.311a1 1 0 00-1.482 1.342L10 9l-4.699 4.285c-.187.2-.301.435-.301.715a1 1 0 001 1c.306 0 .537-.151.764-.354z"></path>
                              </svg>
                            </button>
                          </div>
                        );
                      })}
                    </li>
                  ))}
                </ol>
              )}

              {/* Add Service CTA */}
              <div className="flex flex-col items-stretch border-2 border-dashed border-gray-300 rounded mt-6">
                <button
                  onClick={() => setShowAddModal(true)}
                  className="text-[hsl(var(--primary))] hover:bg-gray-50 w-full"
                >
                  <div className="flex items-center justify-center py-4 px-3">
                    <svg className="shrink-0" height="18" width="18" fill="currentColor" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                      <path d="M14.656 3.343a7.999 7.999 0 010 11.314 7.999 7.999 0 01-11.312 0 7.999 7.999 0 010-11.313 7.999 7.999 0 0111.312 0zM4.758 4.758a5.999 5.999 0 000 8.485 5.999 5.999 0 008.484 0 5.999 5.999 0 000-8.485 5.999 5.999 0 00-8.484 0zM9 5.75a1 1 0 011 1l-.001 1.249h1.25a1 1 0 01.994.884L12.25 9a1 1 0 01-1 1l-1.251-.001v1.25a1 1 0 01-.883.994L9 12.25a1 1 0 01-1-1l-.001-1.251h-1.25a1 1 0 01-.992-.883L5.75 9a1 1 0 011-1l1.249-.001v-1.25a1 1 0 01.884-.992L9 5.75z"></path>
                    </svg>
                    <span className="text-sm font-semibold ml-2 whitespace-nowrap">{t("pro.services.addServiceButton")}</span>
                  </div>
                </button>
              </div>
            </div>
          </main>

          {/* Add Service Modal */}
          {user && (
            <AddServiceModal
              open={showAddModal}
              onOpenChange={setShowAddModal}
              onServiceAdded={handleServiceAdded}
              userId={user.uid}
              existingServiceIds={services.map(s => s.service_id)}
            />
          )}

          {/* Sidebar */}
          <aside className="lg:col-span-4 order-1 lg:order-2 ml-4">
            {/* Activity Card */}
            <div className="bg-white border border-gray-300 rounded-lg shadow-sm mb-4 p-3">
              <div className="flex flex-col">
                <h3 className="text-sm font-semibold mb-3" style={{ color: 'rgb(47, 48, 51)' }}>{t("pro.services.activityThisWeek")}</h3>
                <Link href="/pro/performance" className="text-[hsl(var(--primary))] hover:underline">
                  <div className="flex items-center justify-between">
                    <div className="grow">
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <div className="text-2xl font-bold">
                            {new Intl.NumberFormat('hu-HU', {
                              style: 'currency',
                              currency: 'HUF',
                              maximumFractionDigits: 0,
                            }).format(metrics.weekSpent)}
                          </div>
                          <p className="text-xs text-gray-500">{t("pro.services.spent")}</p>
                        </div>
                        <div>
                          <div className="text-2xl font-bold">{metrics.weekLeads}</div>
                          <p className="text-xs text-gray-500">{t("pro.services.leads")}</p>
                        </div>
                        <div>
                          <div className="text-2xl font-bold">{viewCounts?.views_this_week || 0}</div>
                          <p className="text-xs text-gray-500">{t("pro.services.viewsLabel")}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
                <div className="mt-3 w-full">
                  <div className="border-t border-gray-300 pt-3"></div>
                  <Link href="/pro/performance" className="text-[hsl(var(--primary))] flex items-center justify-between hover:underline">
                    <span className="text-sm font-semibold">{t("pro.services.businessInsights")}</span>
                    <svg className="text-gray-500" height="18" width="18" fill="currentColor" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                      <path d="M6.764 14.646L13 9 6.725 3.311a1 1 0 00-1.482 1.342L10 9l-4.699 4.285c-.187.2-.301.435-.301.715a1 1 0 001 1c.306 0 .537-.151.764-.354z"></path>
                    </svg>
                  </Link>
                </div>
              </div>
            </div>

            {/* Spending Card */}
            <div className="bg-white border border-gray-300 rounded-lg shadow-sm mb-4 p-3">
              <h3 className="text-sm font-semibold">{t("pro.services.spendingThisWeek")}</h3>
              <div className="flex items-center justify-start text-gray-500 my-3">
                <div className="grow mr-3">
                  <div className="mb-2">
                    <span className="text-sm font-semibold">
                      {new Intl.NumberFormat('hu-HU', {
                        style: 'currency',
                        currency: 'HUF',
                        maximumFractionDigits: 0,
                      }).format(metrics.weekSpent)}
                    </span>
                    <p className="text-xs">{t("pro.services.spentThisWeek")}</p>
                  </div>
                  <div>
                    <span className="text-sm font-semibold">
                      {new Intl.NumberFormat('hu-HU', {
                        style: 'currency',
                        currency: 'HUF',
                        maximumFractionDigits: 0,
                      }).format(metrics.totalSpent)}
                    </span>
                    <p className="text-xs">{t("pro.services.totalSpent")} ({metrics.totalLeads} {t("pro.services.leads")})</p>
                  </div>
                </div>
              </div>
              <hr className="my-3 border-gray-300" />
            </div>

            {/* Pro Rewards Card */}
            <div className="bg-white border border-gray-300 rounded-lg shadow-sm px-3">
              <div className="w-full mt-3">
                <Link href="/pro/rewards" className="text-[hsl(var(--primary))] flex items-center justify-between hover:underline">
                  <span className="text-sm font-semibold">{t("pro.services.proRewards")}</span>
                  <svg className="text-gray-500" height="18" width="18" fill="currentColor" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6.764 14.646L13 9 6.725 3.311a1 1 0 00-1.482 1.342L10 9l-4.699 4.285c-.187.2-.301.435-.301.715a1 1 0 001 1c.306 0 .537-.151.764-.354z"></path>
                  </svg>
                </Link>
              </div>
              <div className="my-3"></div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

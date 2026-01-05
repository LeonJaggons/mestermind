"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/contexts/I18nContext";
import { API_BASE_URL } from "@/lib/api/config";

interface Job {
  id: number;
  description: string;
  city: string;
  district: string;
  timing: string;
  budget: string;
  category: string;
  service_id: string;
  photos?: string[];
  created_at: string;
}

export default function OpportunitiesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { t } = useI18n();
  const [selectedService, setSelectedService] = useState("-1");
  const [selectedCategory, setSelectedCategory] = useState("-1");
  const [selectedDistance, setSelectedDistance] = useState("0");
  const [selectedSort, setSelectedSort] = useState("0");
  const [hasSubscription, setHasSubscription] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [checkingSubscription, setCheckingSubscription] = useState(true);
  const [proProfileId, setProProfileId] = useState<number | null>(null);
  const [opportunities, setOpportunities] = useState<Job[]>([]);
  const [loadingOpportunities, setLoadingOpportunities] = useState(false);

  // Check subscription status
  useEffect(() => {
    const checkSubscription = async () => {
      if (!user || authLoading) {
        setCheckingSubscription(false);
        return;
      }

      try {
        // Get user data
        const userResponse = await fetch(`${API_BASE_URL}/api/v1/users/firebase/${user.uid}`);
        if (!userResponse.ok) {
          setCheckingSubscription(false);
          return;
        }
        const userData = await userResponse.json();

        // Get pro profile
        const proProfileResponse = await fetch(`${API_BASE_URL}/api/v1/pro-profiles/user/${userData.id}`);
        if (!proProfileResponse.ok) {
          setCheckingSubscription(false);
          return;
        }
        const proProfile = await proProfileResponse.json();
        setProProfileId(proProfile.id);

        // Check subscription status
        const statusResponse = await fetch(`${API_BASE_URL}/api/v1/subscriptions/pro-profile/${proProfile.id}/status`);
        if (statusResponse.ok) {
          const status = await statusResponse.json();
          setHasSubscription(status.has_subscription);
          setIsActive(status.is_active);
          
          // If active, fetch opportunities
          if (status.is_active) {
            fetchOpportunities(proProfile.id);
          }
        }
      } catch (error) {
        console.error("Error checking subscription:", error);
      } finally {
        setCheckingSubscription(false);
      }
    };

    checkSubscription();
  }, [user, authLoading]);

  const fetchOpportunities = async (profileId: number) => {
    try {
      setLoadingOpportunities(true);
      const response = await fetch(`${API_BASE_URL}/api/v1/opportunities/pro-profile/${profileId}`);
      if (response.ok) {
        const data = await response.json();
        setOpportunities(data);
      } else if (response.status === 403) {
        // Subscription required
        const error = await response.json();
        setHasSubscription(false);
        setIsActive(false);
      }
    } catch (error) {
      console.error("Error fetching opportunities:", error);
    } finally {
      setLoadingOpportunities(false);
    }
  };

  const handleRequestQuote = (jobId: number) => {
    router.push(`/mester/${proProfileId}?service_id=${opportunities.find(j => j.id === jobId)?.service_id}`);
  };

  return (
    <div className="flex w-full bg-white relative">
      {/* Sidebar Navigation */}
      <nav className="ml-4 pt-2 bg-transparent w-60 border-gray-300 hidden lg:block fixed left-0">
        <div className="py-4">
          <Link
            href="/pro/jobs"
            className="flex items-center p-2 rounded hover:bg-gray-50"
          >
            <div className="w-8 flex items-center justify-center pr-2">
              <svg
                height="18"
                width="18"
                fill="currentColor"
                viewBox="0 0 18 18"
                className="text-gray-700"
              >
                <path d="M3.498 14.32c.796-1.464 2.997-2.41 5.502-2.41s4.706.946 5.502 2.41c.31-.352.498-.814.498-1.32V5a2 2 0 00-2-2H5a2 2 0 00-2 2v8c0 .506.188.968.498 1.32zM9 11.183a3.273 3.273 0 110-6.547 3.273 3.273 0 010 6.547zM13.364 17H4.636A3.637 3.637 0 011 13.364V4.636A3.636 3.636 0 014.636 1h8.728A3.637 3.637 0 0117 4.636v8.728A3.637 3.637 0 0113.364 17z"></path>
              </svg>
            </div>
            <div className="flex flex-1 justify-between items-center">
              <div className="truncate text-sm">{t("pro.opportunities.sidebar.leads")}</div>
            </div>
          </Link>

          <Link
            href="/pro/opportunities"
            className="flex items-center p-2 rounded hover:bg-gray-50 bg-blue-50 border-l-4 border-[hsl(var(--primary))] mt-2"
          >
            <div className="w-8 flex items-center justify-center pr-2">
              <svg
                height="18"
                width="18"
                fill="currentColor"
                viewBox="0 0 18 18"
                className="text-[hsl(var(--primary))]"
              >
                <path d="M14.728 1h-4.46c-.601 0-1.167.233-1.596.655L1.668 8.556c-.43.428-.667.999-.668 1.606 0 .608.236 1.179.666 1.609l4.563 4.563a2.276 2.276 0 003.219-.006l6.897-6.999c.424-.428.655-.995.655-1.597V3.273A2.276 2.276 0 0014.728 1zM15 7.732a.275.275 0 01-.08.193L8.03 14.919a.271.271 0 01-.385 0L3.08 10.357a.269.269 0 01-.08-.193c0-.052.015-.126.076-.188l7-6.897A.27.27 0 0110.27 3h4.459c.15 0 .272.123.272.273v4.459zM13.04 5.57a1.144 1.144 0 00-.42-.51 1.102 1.102 0 00-.4-.16c-.151-.03-.3-.03-.44 0-.07.01-.14.03-.211.06-.07.03-.13.06-.2.1-.058.05-.11.09-.17.14-.05.06-.098.11-.138.18a1.074 1.074 0 00-.162.4.875.875 0 000 .44 1.074 1.074 0 00.162.4c.04.07.088.12.139.18l.17.14c.069.04.13.07.199.1.07.03.14.05.21.06a.839.839 0 00.44 0 1.102 1.102 0 00.719-.48c.04-.06.072-.12.102-.19.029-.07.05-.14.06-.21.02-.07.02-.15.02-.22s0-.15-.02-.22a.925.925 0 00-.06-.21z"></path>
              </svg>
            </div>
            <div className="flex flex-1 justify-between items-center">
              <div className="truncate font-semibold text-sm">{t("pro.opportunities.sidebar.opportunities")}</div>
            </div>
          </Link>
        </div>

        <hr className="my-4 border-gray-300" />

        <div className="space-y-4">
          <div className="p-2">
            <Link
              href="/pro/calendar"
              className="text-gray-700 hover:text-[hsl(var(--primary))]"
            >
              <svg
                className="inline mr-2"
                height="18"
                width="18"
                fill="currentColor"
                viewBox="0 0 18 18"
              >
                <path d="M12 1a1 1 0 011 1v1h2c1.104 0 2 .897 2 2v10c0 1.103-.896 2-2 2H3c-1.103 0-2-.897-2-2V5c0-1.103.897-2 2-2h2V2a1 1 0 112 0v1h4V2a1 1 0 011-1zm3 8H3v6h12.001L15 9zm0-4H3v2h12V5z"></path>
              </svg>
            </Link>
            <p className="text-sm text-gray-600 mt-2">
              {t("pro.opportunities.sidebar.reviewAvailability")}{" "}
              <Link
                href="/pro/calendar"
                className="text-[hsl(var(--primary))] hover:underline"
              >
                {t("pro.opportunities.sidebar.tellUsBusy")}
              </Link>
            </p>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex-1 lg:ml-72">
        <main className="bg-white px-4 sm:px-8">
          <div className="flex-grow flex items-stretch flex-col">
            {/* Subscribe CTA - Only show if not subscribed */}
            {checkingSubscription ? (
              <div className="mt-8 lg:mt-10">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
                  <p className="text-gray-500">{t("pro.opportunities.checkingSubscription")}</p>
                </div>
              </div>
            ) : !isActive ? (
              <div className="mt-8 lg:mt-10">
                <ul>
                  <li>
                    <div className="rounded overflow-hidden">
                      <div className="bg-blue-50 border-l-4 border-[hsl(var(--primary))]">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-6 sm:py-8 sm:px-10">
                          <div className="sm:flex-auto mb-4 sm:mb-0 pr-0 sm:pr-8">
                            <div className="text-lg font-bold mb-2" style={{ color: 'rgb(47, 48, 51)' }}>
                              {t("pro.opportunities.subscribe.title")}
                            </div>
                            <p className="text-sm text-gray-700">
                              {t("pro.opportunities.subscribe.description")}
                            </p>
                          </div>
                          <Link
                            href="/pro/subscribe"
                            className="inline-flex items-center justify-center px-6 py-3 rounded bg-[hsl(var(--primary))] text-white font-semibold hover:opacity-90 whitespace-nowrap"
                          >
                            {t("pro.opportunities.subscribe.button")}
                          </Link>
                        </div>
                      </div>
                    </div>
                  </li>
                </ul>
              </div>
            ) : (
              <div className="mt-8 lg:mt-10">
                <div className="bg-green-50 border-l-4 border-green-600 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-green-900">{t("pro.opportunities.activeSubscription.title")}</p>
                      <p className="text-sm text-green-700">{t("pro.opportunities.activeSubscription.description")}</p>
                    </div>
                    <Link
                      href="/pro/payments"
                      className="text-sm text-green-700 hover:text-green-900 underline"
                    >
                      {t("pro.opportunities.activeSubscription.manage")}
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* Filters Header */}
            <header className="mx-0 mt-6">
              <div className="flex mt-6 flex-grow flex-wrap md:flex-nowrap gap-4">
                {/* Service/Business Select */}
                <div className="relative">
                  <label htmlFor="serviceOptions" className="sr-only">
                    {t("pro.opportunities.filters.serviceOptions")}
                  </label>
                  <div className="relative">
                    <select
                      className="appearance-none bg-white border border-gray-300 rounded px-4 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] focus:border-transparent"
                      id="serviceOptions"
                      value={selectedService}
                      onChange={(e) => setSelectedService(e.target.value)}
                    >
                      <option value="-1">{t("pro.opportunities.filters.allBusinesses")}</option>
                      <option value="559681057054736411">Leon Jaggon</option>
                      <option value="566387865889587204">My Business</option>
                    </select>
                    <svg
                      viewBox="0 0 24 24"
                      width="18"
                      height="18"
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none"
                      stroke="#2f3033"
                      strokeWidth="3"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </div>
                </div>

                {/* Category Select */}
                <div className="relative">
                  <label htmlFor="categoryOptions" className="sr-only">
                    {t("pro.opportunities.filters.categoryOptions")}
                  </label>
                  <div className="relative">
                    <select
                      className="appearance-none bg-white border border-gray-300 rounded px-4 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] focus:border-transparent"
                      id="categoryOptions"
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                    >
                      <option value="-1">{t("pro.opportunities.filters.allCategories")}</option>
                      <option value="122435952865247528">Carpet Cleaning</option>
                      <option value="124317070955717033">Gutter Cleaning and Maintenance</option>
                      <option value="234038077374488979">Home Organizing</option>
                      <option value="122768741116944737">Local Moving (under 50 miles)</option>
                      <option value="124317505632420266">Pressure Washing</option>
                      <option value="135648022325256563">Roof Cleaning</option>
                    </select>
                    <svg
                      viewBox="0 0 24 24"
                      width="18"
                      height="18"
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none"
                      stroke="#2f3033"
                      strokeWidth="3"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </div>
                </div>

                {/* Distance Select */}
                <div className="relative">
                  <label htmlFor="distanceOptions" className="sr-only">
                    {t("pro.opportunities.filters.distanceOptions")}
                  </label>
                  <div className="relative">
                    <select
                      className="appearance-none bg-white border border-gray-300 rounded px-4 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] focus:border-transparent"
                      id="distanceOptions"
                      value={selectedDistance}
                      onChange={(e) => setSelectedDistance(e.target.value)}
                    >
                      <option value="0">{t("pro.opportunities.filters.within5Miles")}</option>
                      <option value="1">{t("pro.opportunities.filters.within25Miles")}</option>
                      <option value="2">{t("pro.opportunities.filters.within50Miles")}</option>
                      <option value="3">{t("pro.opportunities.filters.within100Miles")}</option>
                      <option value="4">{t("pro.opportunities.filters.within150Miles")}</option>
                    </select>
                    <svg
                      viewBox="0 0 24 24"
                      width="18"
                      height="18"
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none"
                      stroke="#2f3033"
                      strokeWidth="3"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </div>
                </div>

                {/* Sort Select */}
                <div className="relative">
                  <label htmlFor="sortOptions" className="sr-only">
                    {t("pro.opportunities.filters.sortOptions")}
                  </label>
                  <div className="relative">
                    <select
                      className="appearance-none bg-white border border-gray-300 rounded px-4 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] focus:border-transparent"
                      id="sortOptions"
                      value={selectedSort}
                      onChange={(e) => setSelectedSort(e.target.value)}
                    >
                      <option value="0">{t("pro.opportunities.filters.mostRelevant")}</option>
                      <option value="1">{t("pro.opportunities.filters.mostRecent")}</option>
                      <option value="2">{t("pro.opportunities.filters.closestToExpiry")}</option>
                    </select>
                    <svg
                      viewBox="0 0 24 24"
                      width="18"
                      height="18"
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none"
                      stroke="#2f3033"
                      strokeWidth="3"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </div>
                </div>
              </div>
            </header>

            {/* Content Header */}
            <div className="text-lg font-bold mt-8" style={{ color: 'rgb(47, 48, 51)' }}>
              <span>{t("pro.opportunities.title")}</span>
            </div>

            {/* Description */}
            <div className="mt-4">
              <p className="text-base text-gray-700">
                <span className="text-gray-600">
                  {t("pro.opportunities.description")}{" "}
                </span>
                <button
                  className="text-[hsl(var(--primary))] font-semibold hover:underline bg-transparent border-none cursor-pointer p-0"
                  type="button"
                  aria-label="Learn more"
                >
                  {t("pro.opportunities.learnMore")}
                </button>
              </p>
            </div>

            {/* Info Banner */}
            <div className="my-6 flex items-center p-6 border border-green-600 bg-green-50 rounded-lg">
              <div className="flex items-center mr-6">
                <svg
                  role="presentation"
                  className="text-green-600"
                  height="18"
                  width="18"
                  fill="currentColor"
                  viewBox="0 0 18 18"
                  xmlns="http://www.w3.org/2000/svg"
                  style={{ width: "18px", height: "18px" }}
                >
                  <path d="M14.728 1h-4.46c-.601 0-1.167.233-1.596.655L1.668 8.556c-.43.428-.667.999-.668 1.606 0 .608.236 1.179.666 1.609l4.563 4.563a2.276 2.276 0 003.219-.006l6.897-6.999c.424-.428.655-.995.655-1.597V3.273A2.276 2.276 0 0014.728 1zM15 7.732a.275.275 0 01-.08.193L8.03 14.919a.271.271 0 01-.385 0L3.08 10.357a.269.269 0 01-.08-.193c0-.052.015-.126.076-.188l7-6.897A.27.27 0 0110.27 3h4.459c.15 0 .272.123.272.273v4.459zM13.04 5.57a1.144 1.144 0 00-.42-.51 1.102 1.102 0 00-.4-.16c-.151-.03-.3-.03-.44 0-.07.01-.14.03-.211.06-.07.03-.13.06-.2.1-.058.05-.11.09-.17.14-.05.06-.098.11-.138.18a1.074 1.074 0 00-.162.4.875.875 0 000 .44 1.074 1.074 0 00.162.4c.04.07.088.12.139.18l.17.14c.069.04.13.07.199.1.07.03.14.05.21.06a.839.839 0 00.44 0 1.102 1.102 0 00.719-.48c.04-.06.072-.12.102-.19.029-.07.05-.14.06-.21.02-.07.02-.15.02-.22s0-.15-.02-.22a.925.925 0 00-.06-.21z"></path>
                </svg>
              </div>
              <div>
                <p className="text-sm" style={{ color: 'rgb(47, 48, 51)' }}>
                  {t("pro.opportunities.infoBanner")}
                </p>
              </div>
            </div>

            {/* Opportunities List */}
            {isActive && (
              <div className="mt-8">
                {loadingOpportunities ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500">{t("pro.opportunities.loading")}</p>
                  </div>
                ) : opportunities.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500 mb-4">{t("pro.opportunities.noOpportunities")}</p>
                    <p className="text-sm text-gray-400">{t("pro.opportunities.noOpportunitiesDescription")}</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {opportunities.map((job) => (
                      <div
                        key={job.id}
                        className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                              {job.category || t("pro.opportunities.serviceRequest")}
                            </h3>
                            {job.description && (
                              <p className="text-sm text-gray-600 mb-3 line-clamp-2">{job.description}</p>
                            )}
                            <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                              {job.city && (
                                <div className="flex items-center">
                                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                                  </svg>
                                  {job.city}{job.district && `, ${job.district}`}
                                </div>
                              )}
                              {job.timing && (
                                <div className="flex items-center">
                                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                                  </svg>
                                  {job.timing}
                                </div>
                              )}
                              {job.budget && (
                                <div className="flex items-center">
                                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                                  </svg>
                                  {t("pro.opportunities.budget")} {job.budget}
                                </div>
                              )}
                            </div>
                            {/* Job Photos */}
                            {job.photos && job.photos.length > 0 && (
                              <div className="mt-3 flex gap-2">
                                {job.photos.slice(0, 3).map((photoUrl, index) => (
                                  <div key={index} className="relative w-20 h-20 rounded overflow-hidden border border-gray-200">
                                    <img
                                      src={photoUrl}
                                      alt={`Photo ${index + 1}`}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                ))}
                                {job.photos.length > 3 && (
                                  <div className="w-20 h-20 rounded bg-gray-100 border border-gray-200 flex items-center justify-center text-xs text-gray-500">
                                    +{job.photos.length - 3}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => handleRequestQuote(job.id)}
                            className="ml-4 px-6 py-2 bg-[hsl(var(--primary))] text-white rounded-lg font-semibold hover:opacity-90 whitespace-nowrap"
                          >
                            {t("pro.opportunities.requestQuote")}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

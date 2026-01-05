"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import JobRequestModal from "@/components/JobRequestModal";
import { API_BASE_URL } from "@/lib/api/config";
import { useI18n } from "@/lib/contexts/I18nContext";

interface Mester {
  id: number;
  user_id: number;
  business_name: string;
  business_intro: string | null;
  profile_image_url: string | null;
  city: string | null;
  zip_code: string | null;
  year_founded: number | null;
  number_of_employees: number | null;
  service_distance: number | null;
}

export default function ResultsPage() {
  const { t } = useI18n();
  const [searchQuery, setSearchQuery] = useState("Cleaning Maids");
  const [zipCode, setZipCode] = useState("10118");
  const [showModal, setShowModal] = useState(false);
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [cityFromUrl, setCityFromUrl] = useState<string | null>(null);
  const [checkingExistingJob, setCheckingExistingJob] = useState(true);
  const [mesters, setMesters] = useState<Mester[]>([]);
  const [loadingMesters, setLoadingMesters] = useState(true);

  useEffect(() => {
    const checkForExistingJob = async () => {
      // Get params from URL
      const params = new URLSearchParams(window.location.search);
      const service = params.get("service_id");
      const serviceName = params.get("service_name");
      const city = params.get("city");
      
      if (service) {
        setServiceId(service);
      }
      if (serviceName) {
        setSearchQuery(serviceName);
      }
      if (city) {
        setCityFromUrl(city);
        setZipCode(city);
      }
      
      // Check if there's already an open job for this user and service
      try {
        // Get user from Firebase - wait for auth to be ready
        const { getAuth, onAuthStateChanged } = await import('firebase/auth');
        const auth = getAuth();
        
        // Wait for auth state to be determined
        const currentUser = await new Promise<any>((resolve) => {
          const unsubscribe = onAuthStateChanged(auth, (user) => {
            unsubscribe();
            resolve(user);
          });
        });
        
        console.log('Current user:', currentUser);
        console.log('Service from URL:', service);
        
        if (currentUser && service) {
          console.log('Fetching user data for:', currentUser.uid);
          const userResponse = await fetch(`${API_BASE_URL}/api/v1/users/firebase/${currentUser.uid}`);
          console.log('User response status:', userResponse.status);
          if (userResponse.ok) {
            const userData = await userResponse.json();
            
            // Check for existing job (draft or open) with this service
            const jobsResponse = await fetch(
              `${API_BASE_URL}/api/v1/jobs?user_id=${userData.id}`
            );
            if (jobsResponse.ok) {
              const jobs = await jobsResponse.json();
              console.log('All jobs for user:', jobs);
              console.log('Looking for service_id:', service);
              const existingJob = jobs.find(
                (job: any) => job.service_id === service && (job.status === 'draft' || job.status === 'open')
              );
              console.log('Existing job found:', existingJob);
              
              // Only show modal if no draft or open job exists for this service
              if (!existingJob) {
                console.log('No existing job found, showing modal');
                setShowModal(true);
              } else {
                console.log('Existing job found, suppressing modal');
              }
            } else {
              // If can't fetch jobs, show modal anyway
              setShowModal(true);
            }
          } else {
            // If can't fetch user, show modal anyway
            setShowModal(true);
          }
        } else {
          // No user or no service, show modal
          setShowModal(true);
        }
      } catch (error) {
        console.error("Error checking for existing job:", error);
        // On error, show modal anyway
        setShowModal(true);
      } finally {
        setCheckingExistingJob(false);
      }
    };
    
    checkForExistingJob();
  }, []);

  // Fetch mesters based on search criteria
  useEffect(() => {
    const fetchMesters = async () => {
      if (!serviceId) {
        setLoadingMesters(false);
        return;
      }

      try {
        setLoadingMesters(true);
        const params = new URLSearchParams();
        params.append("service_id", serviceId);
        if (cityFromUrl) {
          params.append("city", cityFromUrl);
        }

        const response = await fetch(`${API_BASE_URL}/api/v1/search/mesters?${params.toString()}`);
        if (response.ok) {
          const data = await response.json();
          setMesters(data);
        } else {
          console.error("Failed to fetch mesters");
          setMesters([]);
        }
      } catch (error) {
        console.error("Error fetching mesters:", error);
        setMesters([]);
      } finally {
        setLoadingMesters(false);
      }
    };

    fetchMesters();
  }, [serviceId, cityFromUrl]);

  const handleModalComplete = (data: any) => {
    console.log("Job request submitted:", data);
    setShowModal(false);
    // TODO: Send data to backend
  };

  return (
    <div className="min-h-screen bg-white">
      <JobRequestModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onComplete={handleModalComplete}
        serviceId={serviceId}
        initialCity={cityFromUrl}
      />
      
      {/* Main Content */}
      <div className="flex">
        {/* Left Sidebar - Filters */}
        <aside className="hidden lg:block w-80 bg-white border-r border-gray-200 sticky top-0 self-start overflow-y-auto max-h-[calc(100vh)]">
          <div className="p-6">
            {/* Calculate Estimate Box */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6 border border-gray-200">
              <div className="text-lg font-bold mb-3">{t("results.calculateEstimate")}</div>
              <div className="text-2xl font-bold inline">$165</div>
              <p className="text-sm text-gray-600 mt-1 mb-3">{t("results.avgStartingPrice")}</p>
              <hr className="border-gray-300 my-3" />
              <p className="text-sm">{t("results.addFiltersToRefine")}</p>
            </div>

            {/* Filters */}
            <div className="space-y-6 px-4">
              {/* When to start */}
              <div>
                <div className="font-semibold mb-3 text-sm">{t("results.whenToStart")}</div>
                <div className="space-y-2">
                  {[
                    t("results.within48Hours"),
                    t("results.withinAWeek"),
                    t("results.flexibleTimeline"),
                    t("results.specificDates")
                  ].map((option) => (
                    <label key={option} className="flex items-center cursor-pointer">
                      <input type="radio" name="timing" className="mr-3" />
                      <span className="text-sm">{option}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Frequency */}
              <div>
                <div className="font-semibold mb-3 text-sm">{t("results.frequency")}</div>
                <div className="space-y-2">
                  {[
                    t("results.justOnce"),
                    t("results.everyWeek"),
                    t("results.every2Weeks"),
                    t("results.onceAMonth")
                  ].map((option) => (
                    <label key={option} className="flex items-center cursor-pointer">
                      <input type="radio" name="frequency" className="mr-3" />
                      <span className="text-sm">{option}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Number of bedrooms */}
              <div>
                <div className="font-semibold mb-3 text-sm">{t("results.numberOfBedrooms")}</div>
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map((num) => (
                    <label key={num} className="flex items-center cursor-pointer">
                      <input type="radio" name="bedrooms" className="mr-3" />
                      <span className="text-sm">
                        {num} {num === 1 ? t("results.bedroom") : t("results.bedrooms")}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Number of bathrooms */}
              <div>
                <div className="font-semibold mb-3 text-sm">{t("results.numberOfBathrooms")}</div>
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map((num) => (
                    <label key={num} className="flex items-center cursor-pointer">
                      <input type="radio" name="bathrooms" className="mr-3" />
                      <span className="text-sm">
                        {num} {num === 1 ? t("results.bathroom") : t("results.bathrooms")}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <button className="text-[hsl(var(--primary))] text-sm font-semibold hover:underline">
                {t("results.resetFilters")}
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1">
          <div className="max-w-4xl mx-auto px-4 py-12">
            {/* Top Section */}
            <div className="mb-6">
              <div className="mb-4">
                <h1 className="text-2xl lg:text-3xl font-bold mb-2">
                  {t("results.getPricingFrom3Best")}
                </h1>
              </div>

              {/* Rated Badge */}
              <div className="bg-gray-50 p-4 flex items-center rounded mb-6">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="mr-3">
                  <path d="M12.65 1.077l2.441 7.378 7.63.09c.656.008.928.861.401 1.261l-6.12 4.65 2.273 7.433c.195.64-.516 1.167-1.051.78L12 18.162l-6.224 4.504c-.535.388-1.247-.14-1.052-.779l2.274-7.433-6.12-4.65c-.527-.4-.256-1.253.4-1.261l7.63-.09 2.442-7.378a.682.682 0 0 1 1.3 0z" fill="#FEBE14"></path>
                </svg>
                <p className="text-sm">
                  <span className="font-semibold">{t("results.ratedAndRespondsFast")}</span>
                </p>
              </div>

              {/* Best Matches Grid */}
              {loadingMesters ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">{t("results.loadingMesters")}</p>
                </div>
              ) : mesters.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">{t("results.noMestersFound")}</p>
                </div>
              ) : (
                <>
              <div className="hidden lg:grid lg:grid-cols-3 gap-4 mb-6">
                {mesters.slice(0, 3).map((mester, idx) => (
                  <Link key={mester.id} href={`/mester/${mester.id}${serviceId ? `?service_id=${serviceId}` : ''}`}>
                    <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
                      <div className="bg-[hsl(var(--primary)/0.1)] py-2 px-4 text-center border-b border-[hsl(var(--primary)/0.2)]">
                        <div className="text-sm font-semibold text-[hsl(var(--primary))]">
                          {idx === 0 ? t("results.topMatch") : idx === 1 ? t("results.highlyRated") : t("results.greatChoice")}
                        </div>
                      </div>
                      <div className="p-4">
                        <div className="flex mb-3">
                          {mester.profile_image_url ? (
                            <img 
                              src={mester.profile_image_url} 
                              alt={mester.business_name}
                              className="w-12 h-12 rounded-full mr-3 flex-shrink-0 object-cover"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-gray-300 mr-3 flex-shrink-0"></div>
                          )}
                          <div className="flex-1">
                            <div className="font-bold text-base mb-1">{mester.business_name}</div>
                            <div className="text-sm text-gray-600">
                              {mester.city && mester.city}
                            </div>
                          </div>
                        </div>
                        {mester.business_intro && (
                          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                            {mester.business_intro}
                          </p>
                        )}
                        <ul className="text-sm text-gray-600 space-y-1 mb-3">
                          {mester.year_founded && (
                            <li className="flex items-center">
                              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                              </svg>
                              {t("results.inBusinessSince")} {mester.year_founded}
                            </li>
                          )}
                          {mester.number_of_employees && (
                            <li className="flex items-center">
                              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                              </svg>
                              {mester.number_of_employees} {t("results.employees")}
                            </li>
                          )}
                        </ul>
                        <button className="w-full mt-3 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 text-sm font-semibold">
                          {t("results.viewProfile")}
                        </button>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {/* CTA Section */}
              <div className="flex justify-between items-center border-t border-gray-200 pt-4 mb-6">
                <p className="text-sm text-gray-600 hidden lg:block">
                  {t("results.sendProjectDetails")}
                </p>
                <button className="w-full lg:w-auto px-8 py-3 bg-[hsl(var(--primary))] text-white rounded-lg hover:opacity-90 font-semibold">
                  {t("results.getPricingFrom3Pros")}
                </button>
              </div>

              <hr className="border-gray-200 my-6" />

            {/* All Pros Section */}
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-2">{t("results.allPros")}</h2>
              <div className="flex items-center gap-2 mb-4">
                <p className="text-sm text-gray-600">{t("results.ourCriteria")}</p>
                <button className="text-gray-600">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Pro Listings */}
            <div className="space-y-4">
              {mesters.map((mester) => (
                <Link key={mester.id} href={`/mester/${mester.id}${serviceId ? `?service_id=${serviceId}` : ''}`}>
                  <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 lg:p-6 hover:shadow-md transition-shadow cursor-pointer">
                    <div className="flex">
                      {mester.profile_image_url ? (
                        <img 
                          src={mester.profile_image_url} 
                          alt={mester.business_name}
                          className="w-16 h-16 lg:w-32 lg:h-32 rounded-lg mr-4 flex-shrink-0 object-cover"
                        />
                      ) : (
                        <div className="w-16 h-16 lg:w-32 lg:h-32 rounded-lg bg-gray-300 mr-4 flex-shrink-0"></div>
                      )}
                      <div className="flex-1">
                        <div className="flex justify-between">
                          <div className="flex-1">
                            <h3 className="text-lg lg:text-xl font-bold mb-2">{mester.business_name}</h3>
                            {mester.business_intro && (
                              <p className="text-sm text-gray-600 mb-3">{mester.business_intro}</p>
                            )}
                            <ul className="text-sm text-gray-600 space-y-1">
                              {mester.city && (
                                <li className="flex items-center">
                                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                                  </svg>
                                  {t("results.serves")} {mester.city}
                                </li>
                              )}
                              {mester.year_founded && (
                                <li className="flex items-center">
                                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                                  </svg>
                                  In business since {mester.year_founded}
                                </li>
                              )}
                              {mester.number_of_employees && (
                                <li className="flex items-center">
                                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                                  </svg>
                                  {mester.number_of_employees} employees
                                </li>
                              )}
                            </ul>
                          </div>
                          <div className="text-right ml-4">
                            <button className="mt-4 px-6 py-2 bg-[hsl(var(--primary))] text-white rounded hover:opacity-90 text-sm font-semibold hidden lg:block">
                              {t("results.contact")}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

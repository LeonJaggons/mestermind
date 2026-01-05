"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/contexts/AuthContext";
import Link from "next/link";
import { useI18n } from "@/lib/contexts/I18nContext";
import { API_BASE_URL } from "@/lib/api/config";

interface Invitation {
  id: number;
  job_id: number;
  pro_profile_id: number;
  status: string;
  pro_viewed: boolean;
  created_at: string;
  job?: {
    id: number;
    description: string;
    city: string;
    district: string;
    timing: string;
    budget: string;
    service_id?: string;
    service?: {
      name: string;
      category?: {
        name: string;
      };
    };
    user: {
      name: string;
    };
    photos?: string[];
  };
}

type FilterStatus = "all" | "pending" | "accepted" | "declined";
type SortOption = "newest" | "oldest" | "unread";

interface LeadImageCarouselProps {
  photos: string[];
}

function LeadImageCarousel({ photos }: LeadImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!photos || photos.length === 0) return null;

  const total = photos.length;

  const goPrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev === 0 ? total - 1 : prev - 1));
  };

  const goNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev === total - 1 ? 0 : prev + 1));
  };

  return (
    <div className="relative bg-black">
      <div className="relative h-52 sm:h-60">
        <img
          src={photos[currentIndex]}
          alt={`Job photo ${currentIndex + 1}`}
          className="w-full h-full object-cover"
        />

        {total > 1 && (
          <>
            {/* Left arrow */}
            <button
              type="button"
              onClick={goPrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 hover:bg-black/60 text-white w-8 h-8 flex items-center justify-center"
            >
              <span className="sr-only">Previous photo</span>
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>

            {/* Right arrow */}
            <button
              type="button"
              onClick={goNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 hover:bg-black/60 text-white w-8 h-8 flex items-center justify-center"
            >
              <span className="sr-only">Next photo</span>
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </>
        )}
      </div>

      {total > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1">
          {photos.map((_, index) => (
            <span
              key={index}
              className={`h-1.5 w-1.5 rounded-full ${
                index === currentIndex ? "bg-white" : "bg-white/50"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ProJobsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { t, language } = useI18n();

  const formatRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return t("pro.leads.time.justNow");
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}${t("pro.leads.time.minutes")} ${t("pro.leads.time.ago")}`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}${t("pro.leads.time.hours")} ${t("pro.leads.time.ago")}`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}${t("pro.leads.time.days")} ${t("pro.leads.time.ago")}`;

    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined });
  };
  const [setupProgress, setSetupProgress] = useState(0);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loadingInvitations, setLoadingInvitations] = useState(true);
  const [proProfileId, setProProfileId] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [sortOption, setSortOption] = useState<SortOption>("newest");

  useEffect(() => {
    // Calculate setup progress based on completed tasks
    // For now, assume 1 out of 4 tasks complete (business profile)
    setSetupProgress(25);
  }, []);

  useEffect(() => {
    const fetchInvitations = async () => {
      if (!user) {
        setLoadingInvitations(false);
        return;
      }

      try {
        // Get user data to find pro_profile_id
        const userResponse = await fetch(`${API_BASE_URL}/api/v1/users/firebase/${user.uid}`);
        if (!userResponse.ok) {
          console.error("Failed to fetch user");
          return;
        }
        const userData = await userResponse.json();

        // Get pro profile for this user
        const proProfileResponse = await fetch(`${API_BASE_URL}/api/v1/pro-profiles/user/${userData.id}`);
        if (!proProfileResponse.ok) {
          console.error("Failed to fetch pro profile");
          setLoadingInvitations(false);
          return;
        }
        const proProfile = await proProfileResponse.json();
        setProProfileId(proProfile.id);

        // Fetch invitations for this pro
        const invitationsResponse = await fetch(`${API_BASE_URL}/api/v1/invitations?pro_profile_id=${proProfile.id}`);
        if (invitationsResponse.ok) {
          const invitationsData = await invitationsResponse.json();

          // Fetch job details for each invitation
          const invitationsWithJobs = await Promise.all(
            invitationsData.map(async (invitation: Invitation) => {
              const jobResponse = await fetch(`${API_BASE_URL}/api/v1/jobs/${invitation.job_id}`);
              if (jobResponse.ok) {
                const jobData = await jobResponse.json();

                // Fetch service info if service_id exists
                let serviceInfo = null;
                if (jobData.service_id) {
                  try {
                    const serviceResponse = await fetch(`${API_BASE_URL}/api/v1/services/${jobData.service_id}?language=${language}`);
                    if (serviceResponse.ok) {
                      serviceInfo = await serviceResponse.json();
                    }
                  } catch (error) {
                    console.error("Error fetching service:", error);
                  }
                }

                return {
                  ...invitation,
                  job: {
                    ...jobData,
                    service: serviceInfo
                  }
                };
              }
              return invitation;
            })
          );

          setInvitations(invitationsWithJobs);
        }
      } catch (error) {
        console.error("Error fetching invitations:", error);
      } finally {
        setLoadingInvitations(false);
      }
    };

    fetchInvitations();
  }, [user]);

  const setupTasks = [
    {
      title: "Fill out your business profile.",
      completed: true,
      link: "/become-a-pro/onboarding",
    },
    {
      title: "Set your job preferences.",
      completed: false,
      link: "/become-a-pro/preferences",
    },
    {
      title: "Set your budget.",
      completed: false,
      link: "/become-a-pro/budget",
    },
    {
      title: "Get a background check.",
      completed: false,
      link: "/become-a-pro/background-check",
    },
  ];

  const completedTasks = setupTasks.filter((task) => task.completed).length;
  const remainingTasks = setupTasks.length - completedTasks;

  // Filter and sort invitations
  const filteredAndSortedInvitations = useMemo(() => {
    let filtered = invitations;

    // Apply status filter
    if (filterStatus !== "all") {
      filtered = filtered.filter(inv => inv.status === filterStatus);
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      if (sortOption === "newest") {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      } else if (sortOption === "oldest") {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      } else if (sortOption === "unread") {
        // Unread first, then by date
        if (a.pro_viewed !== b.pro_viewed) {
          return a.pro_viewed ? 1 : -1;
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      return 0;
    });

    return sorted;
  }, [invitations, filterStatus, sortOption]);

  const pendingCount = invitations.filter(inv => inv.status === "pending").length;
  const unreadCount = invitations.filter(inv => !inv.pro_viewed && inv.status === "pending").length;

  return (
    <div className="flex w-full relative bg-white border border-gray-300 rounded-lg">
      {/* Sidebar Navigation */}
      <nav className="mr-6 ml-4 pt-2 bg-transparent w-60 border-gray-300 hidden lg:block">
        <div className="py-4">
          <Link
            href="/pro/jobs"
            className="flex items-center p-2 rounded hover:bg-gray-50 bg-blue-50 border-l-4 border-[hsl(var(--primary))]"
          >
            <div className="w-8 flex items-center justify-center pr-2">
              <svg
                height="18"
                width="18"
                fill="currentColor"
                viewBox="0 0 18 18"
                className="text-[hsl(var(--primary))]"
              >
                <path d="M3.498 14.32c.796-1.464 2.997-2.41 5.502-2.41s4.706.946 5.502 2.41c.31-.352.498-.814.498-1.32V5a2 2 0 00-2-2H5a2 2 0 00-2 2v8c0 .506.188.968.498 1.32zM9 11.183a3.273 3.273 0 110-6.547 3.273 3.273 0 010 6.547zM13.364 17H4.636A3.637 3.637 0 011 13.364V4.636A3.636 3.636 0 014.636 1h8.728A3.637 3.637 0 0117 4.636v8.728A3.637 3.637 0 0113.364 17z"></path>
              </svg>
            </div>
            <div className="flex flex-1 justify-between items-center">
              <div className="truncate font-semibold text-sm">{t("pro.leads.sidebar.leads")}</div>
            </div>
          </Link>

          <Link
            href="/pro/opportunities"
            className="flex items-center p-2 rounded hover:bg-gray-50 mt-2"
          >
            <div className="w-8 flex items-center justify-center pr-2">
              <svg
                height="18"
                width="18"
                fill="currentColor"
                viewBox="0 0 18 18"
              >
                <path d="M14.728 1h-4.46c-.601 0-1.167.233-1.596.655L1.668 8.556c-.43.428-.667.999-.668 1.606 0 .608.236 1.179.666 1.609l4.563 4.563a2.276 2.276 0 003.219-.006l6.897-6.999c.424-.428.655-.995.655-1.597V3.273A2.276 2.276 0 0014.728 1z"></path>
              </svg>
            </div>
            <div className="flex flex-1 justify-between items-center">
              <div className="truncate text-sm">{t("pro.leads.sidebar.opportunities")}</div>
            </div>
          </Link>
        </div>

        <hr className="my-4  border-gray-300" />

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
              {t("pro.leads.sidebar.reviewAvailability")}{" "}
              <Link
                href="/pro/calendar"
                className="text-[hsl(var(--primary))] hover:underline"
              >
                {t("pro.leads.sidebar.tellUsBusy")}
              </Link>
            </p>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex-1">
        <main className=" bg-white">
          <div className="max-w-3xl mx-auto px-4 py-8">
            {/* Invitations or Empty State */}
            {loadingInvitations ? (
              <div className="py-8">
                <div className="animate-pulse space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-gray-100 rounded-lg p-6 h-48"></div>
                  ))}
                </div>
              </div>
            ) : invitations.length > 0 ? (
              <div className="py-8">
                {/* Header with Stats and Filters */}
                <div className="mb-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                    <div>
                      <h1 className="text-2xl font-bold text-gray-900 mb-2">{t("pro.leads.title")}</h1>

                      <p className="text-gray-600">
                        {filteredAndSortedInvitations.length} {filteredAndSortedInvitations.length === 1 ? t("pro.leads.lead") : t("pro.leads.leads")}
                        {unreadCount > 0 && (
                          <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {unreadCount} {t("pro.leads.new")}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Filter and Sort Controls */}
                  <div className="flex flex-col sm:flex-row gap-3 mb-6">
                    <div className="flex gap-2 flex-wrap">
                      {(["all", "pending", "accepted", "declined"] as FilterStatus[]).map((status) => (
                        <button
                          key={status}
                          onClick={() => setFilterStatus(status)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            filterStatus === status
                              ? "bg-[hsl(var(--primary))] text-white"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          }`}
                        >
                          {status === "all" && t("pro.leads.filter.all")}
                          {status === "pending" && t("pro.leads.filter.pending")}
                          {status === "accepted" && t("pro.leads.filter.accepted")}
                          {status === "declined" && t("pro.leads.filter.declined")}
                          {status === "pending" && pendingCount > 0 && (
                            <span className="ml-2 px-1.5 py-0.5 rounded-full bg-white/20 text-xs">
                              {pendingCount}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-gray-600">{t("pro.leads.sort")}</label>
                      <select
                        value={sortOption}
                        onChange={(e) => setSortOption(e.target.value as SortOption)}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] focus:border-transparent"
                      >
                        <option value="newest">{t("pro.leads.sort.newest")}</option>
                        <option value="oldest">{t("pro.leads.sort.oldest")}</option>
                        <option value="unread">{t("pro.leads.sort.unread")}</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Invitations List */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredAndSortedInvitations.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-gray-500">{t("pro.leads.noLeadsFiltered")}</p>
                    </div>
                  ) : (
                    filteredAndSortedInvitations.map((invitation) => (
                      <div
                        key={invitation.id}
                        onClick={() => router.push(`/pro/request/${invitation.id}`)}
                        className={`bg-white border rounded-lg overflow-hidden shadow-sm hover:shadow-lg transition-all cursor-pointer ${
                          !invitation.pro_viewed && invitation.status === "pending"
                            ? "border-[hsl(var(--primary))] border-2 bg-blue-50/30"
                            : "border-gray-300"
                        }`}
                      >
                        {/* Image carousel on top */}
                        {invitation.job?.photos && invitation.job.photos.length > 0 && (
                          <LeadImageCarousel photos={invitation.job.photos} />
                        )}

                        {/* Card body with details below carousel */}
                        <div className="p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-start flex-1 min-w-0">
                              <div
                                className={`rounded-full w-12 h-12 flex items-center justify-center font-bold text-lg shrink-0 ${
                                  !invitation.pro_viewed && invitation.status === "pending"
                                    ? "bg-[hsl(var(--primary))] text-white"
                                    : "bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]"
                                }`}
                              >
                                {invitation.job?.user?.name?.charAt(0)?.toUpperCase() || "C"}
                              </div>
                              <div className="ml-4 flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="font-semibold text-gray-900 text-lg">
                                    {invitation.job?.user?.name || t("pro.leads.customer")}
                                  </p>
                                  {!invitation.pro_viewed && invitation.status === "pending" && (
                                    <span className="inline-flex items-center justify-center w-2 h-2 bg-[hsl(var(--primary))] rounded-full"></span>
                                  )}
                                </div>
                                <p className="text-sm text-gray-500 mb-2">
                                  {formatRelativeTime(invitation.created_at)}
                                </p>
                                {invitation.job?.service?.name && (
                                  <div className="inline-flex items-center px-2 py-1 rounded-md bg-gray-100 text-xs font-medium text-gray-700">
                                    {invitation.job.service.name}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div
                              className={`px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wide shrink-0 ml-4 ${
                                invitation.status === "pending"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : invitation.status === "accepted"
                                  ? "bg-green-100 text-green-800"
                                  : invitation.status === "declined"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {invitation.status === "pending" && t("pro.leads.filter.pending")}
                              {invitation.status === "accepted" && t("pro.leads.filter.accepted")}
                              {invitation.status === "declined" && t("pro.leads.filter.declined")}
                              {!["pending", "accepted", "declined"].includes(invitation.status) &&
                                invitation.status}
                            </div>
                          </div>

                          {invitation.job && (
                            <div className="space-y-3 mb-4">
                              {/* Description */}
                              {invitation.job.description && (
                                <p className="text-gray-700 line-clamp-3 leading-relaxed">
                                  {invitation.job.description}
                                </p>
                              )}

                              {/* Job Details Grid */}
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-gray-200">
                                {invitation.job.city && (
                                  <div className="flex items-center text-sm text-gray-600">
                                    <svg
                                      height="18"
                                      width="18"
                                      fill="currentColor"
                                      viewBox="0 0 18 18"
                                      className="mr-2 text-gray-400 shrink-0"
                                    >
                                      <path d="M3.002 7.25c0 3.248 4.342 7.756 5.23 8.825l.769.925.769-.926c.888-1.068 5.234-5.553 5.234-8.824C15.004 4.145 13 1 9.001 1c-3.999 0-6 3.145-6 6.25z"></path>
                                    </svg>
                                    <span className="truncate">
                                      {invitation.job.city}
                                      {invitation.job.district && `, ${invitation.job.district}`}
                                    </span>
                                  </div>
                                )}
                                {invitation.job.timing && (
                                  <div className="flex items-center text-sm text-gray-600">
                                    <svg
                                      height="18"
                                      width="18"
                                      fill="currentColor"
                                      viewBox="0 0 18 18"
                                      className="mr-2 text-gray-400 shrink-0"
                                    >
                                      <path d="M12 1a1 1 0 011 1v1h2c1.104 0 2 .897 2 2v10c0 1.103-.896 2-2 2H3c-1.103 0-2-.897-2-2V5c0-1.103.897-2 2-2h2V2a1 1 0 112 0v1h4V2a1 1 0 011-1z"></path>
                                    </svg>
                                    <span className="truncate">{invitation.job.timing}</span>
                                  </div>
                                )}
                                {invitation.job.budget && (
                                  <div className="flex items-center text-sm font-semibold text-gray-900">
                                    <svg
                                      height="18"
                                      width="18"
                                      fill="currentColor"
                                      viewBox="0 0 18 18"
                                      className="mr-2 text-gray-400 shrink-0"
                                    >
                                      <path d="M9 1C4.589 1 1 4.589 1 9s3.589 8 8 8 8-3.589 8-8-3.589-8-8-8z"></path>
                                    </svg>
                                    <span className="truncate">{invitation.job.budget}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        {invitation.status === 'pending' && (
                          <div className="flex gap-3 pt-4 border-t border-gray-200">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/pro/request/${invitation.id}`);
                              }}
                              className="flex-1 bg-[hsl(var(--primary))] text-white py-2.5 px-4 rounded-lg font-semibold hover:opacity-90 transition-opacity shadow-sm"
                            >
                              {t("pro.leads.viewRespond")}
                            </button>
                          </div>
                        )}

                        {invitation.status === 'accepted' && (
                          <div className="p-4 border-t border-gray-200">
                            <Link
                              href={`/pro/messages?job_id=${invitation.job_id}`}
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center text-sm font-medium text-[hsl(var(--primary))] hover:underline"
                            >
                              {t("pro.leads.openConversation")}
                              <svg className="ml-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </Link>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="max-w-md mx-auto">
                  <div className="mb-6">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-100 mb-4">
                      <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">{t("pro.leads.noLeadsYet")}</h2>
                    <p className="text-gray-600 mb-8">
                      {t("pro.leads.noLeadsDescription")}
                    </p>
                  </div>

                  {/* Example Card */}
                  <div className="bg-white border-2 border-dashed border-gray-300 rounded-lg p-6 max-w-md mx-auto mb-8 text-left">
                    <div className="flex items-start mb-4">
                      <div className="bg-[hsl(var(--primary)/0.1)] rounded-full w-12 h-12 flex items-center justify-center font-bold text-[hsl(var(--primary))] shrink-0">
                        EX
                      </div>
                      <div className="ml-4 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-gray-900">{t("pro.leads.exampleCustomer")}</p>
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            {t("pro.leads.filter.pending")}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 mb-2">2 {t("pro.leads.time.hours")} {t("pro.leads.time.ago")}</p>
                        <p className="text-sm text-gray-700 mb-3">{t("pro.leads.exampleDescription")}</p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <div className="flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 18 18">
                              <path d="M3.002 7.25c0 3.248 4.342 7.756 5.23 8.825l.769.925.769-.926c.888-1.068 5.234-5.553 5.234-8.824C15.004 4.145 13 1 9.001 1c-3.999 0-6 3.145-6 6.25z"></path>
                            </svg>
                            {t("pro.leads.location")}
                          </div>
                          <div className="flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 18 18">
                              <path d="M12 1a1 1 0 011 1v1h2c1.104 0 2 .897 2 2v10c0 1.103-.896 2-2 2H3c-1.103 0-2-.897-2-2V5c0-1.103.897-2 2-2h2V2a1 1 0 112 0v1h4V2a1 1 0 011-1z"></path>
                            </svg>
                            {t("pro.leads.timing")}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <p className="text-sm text-gray-600 mb-6">
                      {t("pro.leads.completeProfile")}
                    </p>
                    <Link
                      href="/pro/profile"
                      className="inline-block bg-[hsl(var(--primary))] hover:opacity-90 text-white font-semibold px-8 py-3 rounded-lg transition-opacity shadow-sm"
                    >
                      {t("pro.leads.completeYourProfile")}
                    </Link>
                    <div className="pt-4">
                      <Link
                        href="/pro/opportunities"
                        className="text-sm text-[hsl(var(--primary))] hover:underline font-medium"
                      >
                        {t("pro.leads.browseOpportunities")} →
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>

        {/* Fixed Bottom Bar */}
        {/*<div className="fixed bottom-0 left-0 lg:left-60 right-0 bg-white border-t border-gray-300 p-4">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div></div>
            <button
              disabled
              className="bg-gray-300 text-gray-500 font-semibold px-8 py-3 rounded-lg cursor-not-allowed"
            >
              Activate profile
            </button>
          </div>
        </div>*/}
      </div>
    </div>
  );
}

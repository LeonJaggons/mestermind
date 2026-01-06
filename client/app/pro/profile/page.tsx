"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/contexts/AuthContext";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/contexts/I18nContext";
import { API_BASE_URL } from "@/lib/api/config";

interface ProProfile {
  id: number;
  user_id: number;
  business_name: string;
  phone: string;
  website: string | null;
  street_address: string | null;
  city: string;
  state: string;
  zip_code: string;
  year_founded: number | null;
  number_of_employees: number | null;
  business_intro: string | null;
  profile_image_url: string | null;
}

interface ProjectMedia {
  id: number;
  media_url: string;
  media_type: string;
  caption: string | null;
  display_order: number;
}

interface Project {
  id: number;
  pro_profile_id: number;
  title: string;
  description: string | null;
  created_at: string;
  media: ProjectMedia[];
}

interface Review {
  id: number;
  rating: number;
  comment: string;
  customer_name: string;
  customer_avatar_url: string | null;
  service_details: string | null;
  mester_reply: string | null;
  mester_replied_at: string | null;
  hired_on_platform: boolean;
  verified_hire: boolean;
  created_at: string;
}

interface FAQ {
  id: number;
  pro_profile_id: number;
  question: string;
  answer: string | null;
  display_order: number;
  created_at: string;
  updated_at: string | null;
}

export default function ProfilePage() {
  const { user } = useAuth();
  const { t, language } = useI18n();
  const router = useRouter();
  const [proProfile, setProProfile] = useState<ProProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loadingFaqs, setLoadingFaqs] = useState(true);
  const [viewCounts, setViewCounts] = useState<{
    total_views: number;
    views_this_week: number;
    views_this_month: number;
  } | null>(null);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [projectTitle, setProjectTitle] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [projectMediaUrls, setProjectMediaUrls] = useState<Array<{ url: string; type: string; caption: string }>>([]);
  const [savingProject, setSavingProject] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;

      try {
        console.log("[PROFILE] Fetching profile for user.uid:", user.uid);
        const response = await fetch(
          `${API_BASE_URL}/api/v1/pro-profiles/user/${user.uid}`
        );
        if (response.ok) {
          const data: ProProfile = await response.json();
          console.log("[PROFILE] Fetched pro profile:", data);
          console.log("[PROFILE] Pro profile ID:", data.id);
          setProProfile(data);
        } else {
          const errorText = await response.text();
          console.error(
            "[PROFILE] Failed to fetch profile:",
            response.status,
            errorText
          );
        }
      } catch (error) {
        console.error("[PROFILE] Error fetching profile:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  useEffect(() => {
    const fetchProjects = async () => {
      if (!proProfile) return;

      try {
        setLoadingProjects(true);
        const response = await fetch(`${API_BASE_URL}/api/v1/projects?pro_profile_id=${proProfile.id}`);
        if (response.ok) {
          const data = await response.json();
          setProjects(data);
        }
      } catch (error) {
        console.error("Failed to fetch projects:", error);
      } finally {
        setLoadingProjects(false);
      }
    };

    if (proProfile) {
      fetchProjects();
    }
  }, [proProfile]);

  const handleEditBusinessInfo = () => {
    router.push("/pro/profile/edit");
  };

  const handleEditIntro = () => {
    router.push("/pro/profile/edit");
  };

  const handleAddWebsite = () => {
    router.push("/pro/profile/edit");
  };

  const handleStartBackgroundCheck = () => {
    router.push("/pro/profile/edit");
  };

  const handleAddLicense = () => {
    router.push("/pro/profile/edit");
  };

  const handleAddInsurance = () => {
    router.push("/pro/profile/edit");
  };

  const handleAddAcceptedPaymentMethod = () => {
    router.push("/pro/profile/edit-payment");
  };

  const handleSetupDirectDeposit = () => {
    router.push("/pro/payments");
  };

  const handleEditPhotos = () => {
    router.push("/pro/profile/edit");
  };

  const handleComingSoon = () => {
    alert(t("pro.profile.comingSoon") || "Coming soon");
  };

  const handleCopyShareableLink = async () => {
    if (!proProfile) return;
    try {
      const url = `${window.location.origin}/mester/${proProfile.id}`;
      await navigator.clipboard.writeText(url);
      alert(t("pro.profile.linkCopied") || "Profile link copied to clipboard");
    } catch (error) {
      console.error("Failed to copy shareable link:", error);
      alert(
        t("pro.profile.copyFailed") ||
          "Failed to copy link. Please copy it from your browser address bar."
      );
    }
  };

  const handleAskForReviews = () => {
    handleCopyShareableLink();
  };

  useEffect(() => {
    const fetchReviews = async () => {
      if (!proProfile) return;

      try {
        setLoadingReviews(true);
        console.log("[REVIEWS] Fetching reviews for pro_profile_id:", proProfile.id);
        const response = await fetch(`${API_BASE_URL}/api/v1/reviews?pro_profile_id=${proProfile.id}`);
        console.log("[REVIEWS] Response status:", response.status);
        if (response.ok) {
          const data = await response.json();
          console.log("[REVIEWS] Fetched reviews:", data);
          console.log("[REVIEWS] Number of reviews:", data.length);
          setReviews(data);
        } else {
          const errorText = await response.text();
          console.error("[REVIEWS] Failed to fetch reviews:", response.status, errorText);
        }
      } catch (error) {
        console.error("[REVIEWS] Error fetching reviews:", error);
      } finally {
        setLoadingReviews(false);
      }
    };

    if (proProfile) {
      fetchReviews();
    }
  }, [proProfile]);

  useEffect(() => {
    const fetchFaqs = async () => {
      if (!proProfile) return;

      try {
        setLoadingFaqs(true);
        const response = await fetch(`${API_BASE_URL}/api/v1/faqs/pro-profile/${proProfile.id}`);
        if (response.ok) {
          const data = await response.json();
          setFaqs(data);
        }
      } catch (error) {
        console.error("Failed to fetch FAQs:", error);
      } finally {
        setLoadingFaqs(false);
      }
    };

    if (proProfile) {
      fetchFaqs();
    }
  }, [proProfile]);

  useEffect(() => {
    const fetchViewCounts = async () => {
      if (!proProfile) return;

      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/profile-views/pro-profile/${proProfile.id}/counts`);
        if (response.ok) {
          const data = await response.json();
          setViewCounts({
            total_views: data.total_views,
            views_this_week: data.views_this_week,
            views_this_month: data.views_this_month,
          });
        }
      } catch (error) {
        console.error("Failed to fetch view counts:", error);
      }
    };

    if (proProfile) {
      fetchViewCounts();
    }
  }, [proProfile]);

  const handleAddProject = () => {
    setEditingProject(null);
    setProjectTitle("");
    setProjectDescription("");
    setProjectMediaUrls([]);
    setShowProjectModal(true);
  };

  const handleEditProject = (project: Project) => {
    setEditingProject(project);
    setProjectTitle(project.title);
    setProjectDescription(project.description || "");
    setProjectMediaUrls(project.media.map(m => ({ url: m.media_url, type: m.media_type, caption: m.caption || "" })));
    setShowProjectModal(true);
  };

  const handleAddMediaUrl = () => {
    setProjectMediaUrls([...projectMediaUrls, { url: "", type: "image", caption: "" }]);
  };

  const handleRemoveMediaUrl = (index: number) => {
    setProjectMediaUrls(projectMediaUrls.filter((_, i) => i !== index));
  };

  const handleMediaUrlChange = (index: number, field: 'url' | 'type' | 'caption', value: string) => {
    const updated = [...projectMediaUrls];
    updated[index][field] = value;
    setProjectMediaUrls(updated);
  };

  const handleSaveProject = async () => {
    if (!proProfile || !projectTitle.trim()) return;

    try {
      setSavingProject(true);

      const projectData = {
        title: projectTitle,
        description: projectDescription || null,
        media: projectMediaUrls
          .filter(m => m.url.trim())
          .map((m, index) => ({
            media_url: m.url,
            media_type: m.type,
            caption: m.caption || null,
            display_order: index
          }))
      };

      if (editingProject) {
        // Update existing project
        const response = await fetch(`${API_BASE_URL}/api/v1/projects/${editingProject.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: projectData.title, description: projectData.description })
        });

        if (!response.ok) throw new Error("Failed to update project");

        // Refresh projects list
        const projectsResponse = await fetch(`${API_BASE_URL}/api/v1/projects?pro_profile_id=${proProfile.id}`);
        if (projectsResponse.ok) {
          const data = await projectsResponse.json();
          setProjects(data);
        }
      } else {
        // Create new project
        const response = await fetch(`${API_BASE_URL}/api/v1/projects?pro_profile_id=${proProfile.id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(projectData)
        });

        if (!response.ok) throw new Error("Failed to create project");

        const newProject = await response.json();
        setProjects([newProject, ...projects]);
      }

      setShowProjectModal(false);
      setProjectTitle("");
      setProjectDescription("");
      setProjectMediaUrls([]);
    } catch (error) {
      console.error("Error saving project:", error);
        alert(t("pro.profile.failedToSave"));
    } finally {
      setSavingProject(false);
    }
  };

  const handleDeleteProject = async (projectId: number) => {
    if (!confirm(t("pro.profile.confirmDelete"))) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/projects/${projectId}`, {
        method: "DELETE"
      });

      if (!response.ok) throw new Error("Failed to delete project");

      setProjects(projects.filter(p => p.id !== projectId));
    } catch (error) {
      console.error("Error deleting project:", error);
      alert(t("pro.profile.failedToDelete"));
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24">
        <p className="text-gray-500">{t("pro.profile.loading")}</p>
      </div>
    );
  }

  return (
    <div className="flex justify-center mb-16 pb-12 ">
      <div className="w-full max-w-2xl">
        {/* Project Modal */}
        {showProjectModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-2xl font-bold">{editingProject ? t("pro.profile.editProject") : t("pro.profile.addNewProject")}</h2>
              </div>
              
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">{t("pro.profile.projectTitle")} *</label>
                  <input
                    type="text"
                    value={projectTitle}
                    onChange={(e) => setProjectTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
                    placeholder={t("pro.profile.projectTitlePlaceholder")}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">{t("pro.profile.description")}</label>
                  <textarea
                    value={projectDescription}
                    onChange={(e) => setProjectDescription(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] h-24 resize-none"
                    placeholder={t("pro.profile.descriptionPlaceholder")}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-semibold">{t("pro.profile.media")}</label>
                    <button
                      onClick={handleAddMediaUrl}
                      className="text-sm text-[hsl(var(--primary))] hover:underline"
                    >
                      + {t("pro.profile.addMedia")}
                    </button>
                  </div>
                  
                  {projectMediaUrls.length === 0 && (
                    <p className="text-sm text-gray-500 italic">{t("pro.profile.noMediaAdded")}</p>
                  )}

                  {projectMediaUrls.map((media, index) => (
                    <div key={index} className="border border-gray-200 rounded p-3 mb-2">
                      <div className="flex items-start gap-2 mb-2">
                        <input
                          type="text"
                          value={media.url}
                          onChange={(e) => handleMediaUrlChange(index, 'url', e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
                          placeholder={t("pro.profile.imageVideoUrl")}
                        />
                        <select
                          value={media.type}
                          onChange={(e) => handleMediaUrlChange(index, 'type', e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
                        >
                          <option value="image">{t("pro.profile.image")}</option>
                          <option value="video">{t("pro.profile.video")}</option>
                        </select>
                        <button
                          onClick={() => handleRemoveMediaUrl(index)}
                          className="px-3 py-2 text-red-600 hover:bg-red-50 rounded"
                        >
                          {t("pro.profile.remove")}
                        </button>
                      </div>
                      <input
                        type="text"
                        value={media.caption}
                        onChange={(e) => handleMediaUrlChange(index, 'caption', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
                        placeholder={t("pro.profile.caption")}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                <button
                  onClick={() => setShowProjectModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                  disabled={savingProject}
                >
                  {t("pro.profile.cancel")}
                </button>
                <button
                  onClick={handleSaveProject}
                  disabled={savingProject || !projectTitle.trim()}
                  className="px-4 py-2 bg-[hsl(var(--primary))] text-white rounded hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {savingProject ? t("pro.profile.saving") : t("pro.profile.saveProject")}
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Business Info Section */}
        <section className=" rounded-lg  mt-8 pb-8">
          <header className="px-6 py-4 flex justify-between items-center">
            <button
              type="button"
              onClick={handleEditBusinessInfo}
              className="text-[hsl(var(--primary))] font-semibold hover:underline"
            >
              {t("pro.profile.edit")}
            </button>
          </header>

          <div className="px-6 pt-8">
            {/* Profile Header with Image and Name */}
            <div className="border bg-white border-gray-200 -mx-6 px-8 -mt-8 py-8 rounded-lg">
              <div className="mb-8">
                <div className="flex flex-col sm:flex-row items-center sm:items-start">
                  <div className="shrink-0 mb-4 sm:mb-0 sm:mr-6">
                    <div className="w-18 h-18 rounded-full overflow-hidden bg-gray-200">
                      {proProfile?.profile_image_url ? (
                        <img
                          src={proProfile.profile_image_url}
                          alt={proProfile.business_name || user?.displayName || "Profile"}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <svg height="36" width="36" fill="currentColor" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                            <path d="M9 1a4 4 0 110 8 4 4 0 010-8zm0 10c3.315 0 6 1.346 6 3v2H3v-2c0-1.654 2.685-3 6-3z"></path>
                          </svg>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 text-center sm:text-left overflow-hidden">
                    <h1 className="text-3xl font-bold mb-2">{proProfile?.business_name || user?.displayName || t("pro.profile.businessName")}</h1>
                    <div className="flex flex-wrap items-baseline justify-center sm:justify-start mb-2">
                      <div className="mr-4">
                        <div className="flex text-gray-400">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <svg key={star} height="18" width="18" fill="currentColor" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                              <path d="M9 1l2.472 5.007 5.528.803-4 3.899.944 5.508L9 13.686l-4.944 2.531.944-5.508-4-3.9 5.528-.802L9 1z"></path>
                            </svg>
                          ))}
                        </div>
                      </div>
                      <p className="text-sm font-semibold ml-4">
                        <button
                          type="button"
                          onClick={handleAskForReviews}
                          className="text-[hsl(var(--primary))] hover:underline"
                        >
                          {t("pro.profile.askForReviews")}
                        </button>
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 mb-6">
                <Link
                  href="/become-a-pro/ranking"
                  className="inline-flex items-center justify-center px-4 py-2 border border-gray-200 rounded hover:bg-gray-50"
                >
                  <span className="text-sm">{t("pro.profile.seeHowYouRank")}</span>
                </Link>
                <Link
                  href="/become-a-pro/preview"
                  className="inline-flex items-center justify-center px-4 py-2 border border-gray-200 rounded hover:bg-gray-50"
                >
                  <span className="text-sm">{t("pro.profile.viewAsCustomer")}</span>
                </Link>
              </div>

              {/* Profile View Stats */}
              {viewCounts && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h3 className="text-sm font-semibold mb-3">{t("pro.profile.profileViews")}</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <div className="text-2xl font-bold">{viewCounts.total_views}</div>
                      <p className="text-xs text-gray-500">{t("pro.profile.totalViews")}</p>
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{viewCounts.views_this_week}</div>
                      <p className="text-xs text-gray-500">{t("pro.profile.thisWeek")}</p>
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{viewCounts.views_this_month}</div>
                      <p className="text-xs text-gray-500">{t("pro.profile.thisMonth")}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Top Pro Progress */}
            <div className="border bg-white border-gray-200 -mx-6 px-8 py-6 mt-8 rounded-lg">
              <div className="text-xl font-bold mb-4">{t("pro.profile.pathToTopPro")}</div>
              <div className="flex flex-row mt-4">
                <div className="w-full h-20 bg-gray-200 rounded flex items-center justify-center text-gray-400">
                  {t("pro.profile.progressBarPlaceholder")}
                </div>
              </div>
              <div className="flex flex-row justify-between items-start mt-4">
                <div className="flex-1">
                  <span>{t("pro.profile.silverStatus")}</span>
                  <Link href="/pro/rewards/progress" className="text-[hsl(var(--primary))] font-semibold hover:underline"> {t("pro.profile.viewDetails")}</Link>
                </div>
              </div>
            </div>

            {/* Business Details List */}
            <div className="border bg-white border-gray-200 -mx-6 px-8 py-4 mt-8">
              <ul>
                <li className="border-b border-gray-200 py-6">
                  <div className="flex items-center">
                    <div className="flex-auto items-start overflow-hidden flex">
                      <div className="mr-4 mt-1">
                        <svg height="18" width="18" fill="currentColor" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                          <path d="M14.48 9.616a2.287 2.287 0 00-3.231 0l-1.038 1.038a7.043 7.043 0 01-2.865-2.866L8.384 6.75a2.288 2.288 0 000-3.229L6.53 1.668a2.284 2.284 0 00-3.23 0l-.88.881a4.875 4.875 0 00-1.327 4.396c.972 4.985 4.975 8.99 9.96 9.962.318.062.637.092.953.092a4.862 4.862 0 003.444-1.42l.88-.88a2.284 2.284 0 000-3.23l-1.85-1.853zm-.444 4.55a2.883 2.883 0 01-2.598.778c-4.196-.819-7.564-4.187-8.382-8.382a2.88 2.88 0 01.778-2.599l.88-.88a.286.286 0 01.402 0l1.853 1.851a.285.285 0 010 .402L4.96 7.347l.258.62a9.04 9.04 0 004.817 4.815l.618.258 2.01-2.01a.283.283 0 01.402 0l1.853 1.853c.11.11.11.29 0 .401l-.881.881z"></path>
                        </svg>
                      </div>
                      <div className="flex-auto overflow-hidden">
                        <div className="font-semibold mb-1">{t("pro.profile.phone")}</div>
                        <div className="text-gray-700">{proProfile?.phone || t("pro.profile.notProvided")}</div>
                      </div>
                    </div>
                  </div>
                </li>

                <li className="border-b border-gray-200 py-6">
                  <div className="flex items-center">
                    <div className="flex-auto items-start overflow-hidden flex">
                      <div className="mr-4 mt-1">
                        <svg height="18" width="18" fill="currentColor" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                          <path d="M15 1c1.103 0 2 .897 2 2v12c0 1.103-.897 2-2 2H3c-1.102 0-2-.897-2-2V3c0-1.103.898-2 2-2h12zm0 2H3v4.25h12.001L15 3zM7.8 4.02c-.06.01-.12.03-.18.06-.06.02-.12.05-.18.09l-.15.12C7.111 4.48 7 4.74 7 5c0 .26.111.52.29.71.19.18.44.29.71.29a1.009 1.009 0 001-1c0-.26-.11-.52-.3-.71-.23-.23-.57-.33-.9-.27zm-2.24.15a.757.757 0 00-.18-.09 1.006 1.006 0 00-1.09.21C4.111 4.48 4 4.74 4 5c0 .26.111.52.29.71.19.18.45.29.71.29.06 0 .13-.01.19-.02.07-.01.131-.03.19-.06.06-.02.12-.05.18-.09.051-.03.1-.08.15-.12.18-.19.29-.45.29-.71 0-.26-.11-.52-.29-.71-.05-.04-.099-.09-.15-.12zM3 15h12.001V8.75H3V15z"></path>
                        </svg>
                      </div>
                      <div className="flex-auto overflow-hidden">
                        <div className="font-semibold mb-1">{t("pro.profile.website")}</div>
                        <div className="text-gray-500">{proProfile?.website || t("pro.profile.notProvided")}</div>
                      </div>
                    </div>
                    {!proProfile?.website && (
                      <div className="ml-4">
                        <button
                          type="button"
                          onClick={handleAddWebsite}
                          className="px-4 py-2 border border-gray-200 rounded hover:bg-gray-50 text-sm"
                        >
                          {t("pro.profile.add")}
                        </button>
                      </div>
                    )}
                  </div>
                </li>

                <li className="border-b border-gray-200 py-6">
                  <div className="flex items-center">
                    <div className="flex-auto items-start overflow-hidden flex">
                      <div className="mr-4 mt-1">
                        <svg height="18" width="18" fill="currentColor" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                          <path d="M3.002 7.25c0 3.248 4.342 7.756 5.23 8.825l.769.925.769-.926c.888-1.068 5.234-5.553 5.234-8.824C15.004 4.145 13 1 9.001 1c-3.999 0-6 3.145-6 6.25zm1.994 0C4.995 5.135 6.175 3 9 3s4.002 2.135 4.002 4.25c0 1.777-2.177 4.248-4.002 6.59C7.1 11.4 4.996 9.021 4.996 7.25zM8.909 5.5c-.827 0-1.5.673-1.5 1.5s.673 1.5 1.5 1.5 1.5-.673 1.5-1.5-.673-1.5-1.5-1.5z"></path>
                        </svg>
                      </div>
                      <div className="flex-auto overflow-hidden">
                        <div className="font-semibold mb-1">{t("pro.profile.address")}</div>
                        <div className="text-gray-700">
                          {proProfile?.street_address && <div>{proProfile.street_address}</div>}
                          <div>{proProfile?.city}, {proProfile?.state} {proProfile?.zip_code}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>

                <li className="border-b border-gray-200 py-6">
                  <div className="flex items-center">
                    <div className="flex-auto items-start overflow-hidden flex">
                      <div className="mr-4 mt-1">
                        <svg height="18" width="18" fill="currentColor" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                          <path d="M15.5 6.75a2.248 2.248 0 01-1.59 2.14c.053-.29.09-.585.09-.89V3.004h1.25a.25.25 0 01.25.25V6.75zM12 8c0 1.654-1.346 3-3 3S6 9.654 6 8V3h6v5zM2.5 6.75V3.246a.25.25 0 01.25-.25H4V8c0 .305.037.6.09.89A2.248 2.248 0 012.5 6.75zM15.25 1H2.75C1.785 1 1 1.785 1 2.75v4a3.75 3.75 0 003.692 3.744c.706 1.214 1.89 2.115 3.308 2.403V15H6a1 1 0 100 2h6a1 1 0 100-2h-2v-2.103c1.418-.288 2.603-1.189 3.308-2.403A3.75 3.75 0 0017 6.75v-4C17 1.785 16.215 1 15.25 1z"></path>
                        </svg>
                      </div>
                      <div className="flex-auto overflow-hidden">
                        <div className="font-semibold mb-1">{t("pro.profile.yearFounded")}</div>
                        <div className="text-gray-700">{proProfile?.year_founded || t("pro.profile.notProvided")}</div>
                      </div>
                    </div>
                  </div>
                </li>

                <li className="py-6">
                  <div className="flex items-center">
                    <div className="flex-auto items-start overflow-hidden flex">
                      <div className="mr-4 mt-1">
                        <svg height="18" width="18" fill="currentColor" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                          <path d="M13 12a1 1 0 100 2c1.104 0 2 .757 2 1.688V16a1 1 0 102 0v-.312C17 13.654 15.206 12 13 12zm4-5a4.004 4.004 0 00-5.336-3.771 1 1 0 00.672 1.885 2 2 0 110 3.772 1 1 0 00-.672 1.885A4.004 4.004 0 0017 7zM5.863 4c1.103 0 2 .896 2 2 0 1.103-.897 2-2 2-1.102 0-2-.897-2-2 0-1.104.898-2 2-2zm0 6c2.206 0 4-1.794 4-4s-1.794-4-4-4-4 1.794-4 4 1.794 4 4 4zM6 11c-2.757 0-5 1.826-5 4.071V16a1 1 0 102 0v-.929C3 13.948 4.374 13 6 13s3 .948 3 2.071V16a1 1 0 102 0v-.929C11 12.826 8.757 11 6 11z"></path>
                        </svg>
                      </div>
                      <div className="flex-auto overflow-hidden">
                        <div className="font-semibold mb-1">{t("pro.profile.numberOfEmployees")}</div>
                        <div className="text-gray-700">{proProfile?.number_of_employees || t("pro.profile.notProvided")}</div>
                      </div>
                    </div>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Your Introduction Section */}
        <section className="bg-white rounded-lg border border-gray-200 mt-8 pb-8">
          <header className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h1 className="text-xl font-bold">{t("pro.profile.yourIntroduction")}</h1>
          </header>
          <div className="px-8 py-6">
            <p className="text-gray-700">{proProfile?.business_intro || t("pro.profile.tellCustomersAboutBusiness")}</p>
          </div>
          <div className="flex flex-col sm:flex-row px-8 pt-6 w-full">
            <div className="flex-1 mr-4">
              <button
                type="button"
                onClick={handleEditIntro}
                className="w-full px-4 py-2 border border-gray-200 rounded hover:bg-gray-50 flex items-center justify-center"
              >
                <svg className="mr-2" height="18" width="18" fill="currentColor" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                  <path d="M14.615 5.242l-1.233 1.233-1.86-1.858 1.234-1.234a1.315 1.315 0 011.86 1.86zm-8.652 8.652l-2.589.73.73-2.589 6.004-6.004L11.97 7.89l-6.006 6.005zM16.03 1.97a3.316 3.316 0 00-4.686 0L2.321 10.99l-1.278 4.53a1.166 1.166 0 001.121 1.478c.105 0 .212-.014.315-.044l4.53-1.277 9.02-9.02a3.318 3.318 0 000-4.688z"></path>
                </svg>
                {t("pro.profile.edit")}
              </button>
            </div>
          </div>
        </section>

        {/* Reviews Section */}
        <section className="bg-white rounded-lg border border-gray-200 mt-8 pb-8">
          <header className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-xl font-bold">{t("pro.profile.reviews")}</h1>
          </header>
          <div className="px-8 py-6">
            {loadingReviews ? (
              <p className="text-gray-500">{t("pro.profile.loadingReviews")}</p>
            ) : (
              <>
                <div className="flex items-center mb-4 pb-4">
                  <div className="pr-6 border-r border-gray-200">
                    <div className="flex items-start flex-col justify-center">
                      {(() => {
                        const reviewCount = reviews.length;
                        const averageRating = reviewCount > 0
                          ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount
                          : 0;
                        const filledStars = Math.round(averageRating);
                        
                        return (
                          <>
                            <div className="text-3xl font-bold mb-2 text-green-600">
                              {averageRating > 0 ? averageRating.toFixed(1) : "0.0"}
                            </div>
                            <div className="flex mb-2">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <svg 
                                  key={star} 
                                  height="18" 
                                  width="18" 
                                  fill={star <= filledStars ? "currentColor" : "none"}
                                  className={star <= filledStars ? "text-green-500" : "text-gray-300"}
                                  viewBox="0 0 18 18" 
                                  xmlns="http://www.w3.org/2000/svg"
                                >
                                  <path d="M9 1l2.472 5.007 5.528.803-4 3.899.944 5.508L9 13.686l-4.944 2.531.944-5.508-4-3.9 5.528-.802L9 1z"></path>
                                </svg>
                              ))}
                            </div>
                            <p className="text-sm text-gray-500 mt-2 ml-2">
                              {reviewCount} {reviewCount === 1 ? t("pro.profile.review") : t("pro.profile.reviewsPlural")}
                            </p>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                  <div className="flex-1 pl-6">
                    {(() => {
                      const ratingCounts: { [key: number]: number } = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
                      reviews.forEach(review => {
                        ratingCounts[review.rating as keyof typeof ratingCounts]++;
                      });
                      const totalReviews = reviews.length;
                      
                      return [5, 4, 3, 2, 1].map((stars) => {
                        const count = ratingCounts[stars];
                        const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
                        
                        return (
                          <div key={stars} className="flex items-center mb-2">
                            <p className="text-sm mr-2 w-3">{stars}</p>
                            <div className="mr-2">
                              <svg width="8" height="8" viewBox="0 0 8 8">
                                <path d="M4 0a.324.324 0 0 0-.31.247l-.787 2.536H.32c-.178 0-.32.162-.32.35 0 .114.055.217.138.277.052.037 2.087 1.588 2.087 1.588s-.782 2.505-.797 2.545a.39.39 0 0 0-.02.118c0 .188.145.339.324.339a.316.316 0 0 0 .185-.06L4 6.355 6.083 7.94c.053.038.117.061.185.061a.332.332 0 0 0 .324-.34.387.387 0 0 0-.02-.117c-.015-.04-.797-2.545-.797-2.545S7.81 3.447 7.862 3.41A.346.346 0 0 0 8 3.13c0-.185-.138-.347-.317-.347H5.1L4.31.247A.324.324 0 0 0 4 0" fillRule="evenodd"></path>
                              </svg>
                            </div>
                            <div className="flex-1 bg-gray-200 h-2 rounded-full overflow-hidden">
                              <div className="bg-green-500 h-full" style={{ width: `${percentage}%` }}></div>
                            </div>
                            <p className="text-sm ml-3 text-gray-700 w-12">{Math.round(percentage)}%</p>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>

                {/* Reviews List */}
                {reviews.length > 0 && (
                  <div className="mt-8 space-y-6 border-t border-gray-200 pt-6">
                    {reviews.map((review) => (
                      <div key={review.id} className="border-b border-gray-200 pb-6 last:border-b-0 last:pb-0">
                        <div className="flex gap-3">
                          {/* Avatar */}
                          <div className="shrink-0">
                            {review.customer_avatar_url ? (
                              <img
                                src={review.customer_avatar_url}
                                alt={review.customer_name}
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                                <span className="text-sm font-semibold text-gray-600">
                                  {review.customer_name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Review Content */}
                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <p className="font-medium text-gray-900">
                                  {review.customer_name}
                                </p>
                              </div>
                              <p className="text-sm text-gray-500">
                                {new Date(review.created_at).toLocaleDateString(language === "hu" ? "hu-HU" : "en-US", { 
                                  month: 'short', 
                                  day: 'numeric', 
                                  year: 'numeric' 
                                })}
                              </p>
                            </div>

                            {/* Rating */}
                            <div className="flex items-center gap-2 mb-2">
                              <div className="flex items-center">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <svg
                                    key={star}
                                    height="18"
                                    width="18"
                                    fill={star <= review.rating ? "currentColor" : "none"}
                                    className={star <= review.rating ? "text-green-500" : "text-gray-300"}
                                    viewBox="0 0 18 18"
                                    xmlns="http://www.w3.org/2000/svg"
                                  >
                                    <path d="M9 1l2.472 5.007 5.528.803-4 3.899.944 5.508L9 13.686l-4.944 2.531.944-5.508-4-3.9 5.528-.802L9 1z"></path>
                                  </svg>
                                ))}
                              </div>
                              {review.hired_on_platform && (
                                <>
                                  <span className="text-gray-400">•</span>
                                  <span className="text-sm text-gray-600">{t("pro.profile.hiredOnMestermind")}</span>
                                </>
                              )}
                            </div>

                            {/* Review Text */}
                            <div className="text-sm text-gray-700 mt-2">
                              <p className="whitespace-pre-line">{review.comment}</p>
                            </div>

                            {/* Service Details */}
                            {review.service_details && (
                              <p className="text-sm text-gray-500 mt-2">
                                {t("pro.profile.details")} {review.service_details}
                              </p>
                            )}

                            {/* Mester Reply */}
                            {review.mester_reply && (
                              <div className="mt-3 p-3 bg-gray-100 rounded text-sm">
                                <div className="font-semibold mb-1">{t("pro.profile.yourReply")}</div>
                                <div className="whitespace-pre-line text-gray-700">
                                  {review.mester_reply}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Review Import Options */}
            <div className="mt-8 space-y-2">
              <div
                className="p-6 flex flex-col md:flex-row items-center bg-gray-200 rounded-lg cursor-pointer hover:bg-gray-300"
                onClick={handleComingSoon}
              >
                <svg className="mr-6 shrink-0" height="28" width="28" fill="none" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg">
                  <path d="M25.52 14.272c0-.85-.076-1.669-.218-2.454H14v4.641h6.458a5.52 5.52 0 01-2.394 3.622v3.011h3.878c2.269-2.089 3.578-5.165 3.578-8.82z" fill="#4285F4" fillRule="evenodd"></path>
                  <path d="M14 26.001c3.24 0 5.956-1.074 7.942-2.907l-3.879-3.01c-1.074.72-2.449 1.145-4.063 1.145-3.126 0-5.771-2.111-6.715-4.948H3.276v3.11A11.995 11.995 0 0014 26z" fill="#34A853" fillRule="evenodd"></path>
                  <path d="M7.285 16.281a7.213 7.213 0 01-.376-2.28c0-.79.136-1.56.376-2.28V8.612H3.276A11.996 11.996 0 002 14.002c0 1.935.464 3.768 1.276 5.388l4.01-3.109z" fill="#FBBC05" fillRule="evenodd"></path>
                  <path d="M14 6.773c1.761 0 3.343.605 4.587 1.794l3.442-3.442C19.95 3.19 17.234 2 13.999 2 9.31 2 5.252 4.69 3.277 8.61l4.01 3.11C8.228 8.884 10.873 6.773 14 6.773z" fill="#EA4335" fillRule="evenodd"></path>
                </svg>
                <div className="flex-1 mr-6 mt-4 md:mt-0">
                  <div className="text-lg font-semibold mb-1">{t("pro.profile.importFromGoogle")}</div>
                  <p className="text-sm text-gray-600">{t("pro.profile.importFromGoogleDescription")}</p>
                </div>
                <svg height="18" width="18" fill="currentColor" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9.764 14.646L16 9 9.725 3.311a1 1 0 00-1.482 1.342L11.75 8H3.002A1 1 0 103 10h8.75l-3.449 3.285c-.187.2-.301.435-.301.715a1 1 0 001 1c.306 0 .537-.151.764-.354z"></path>
                </svg>
              </div>

              <div
                className="p-6 flex items-center bg-gray-200 rounded-lg cursor-pointer hover:bg-gray-300"
                onClick={handleComingSoon}
              >
                <svg className="mr-6 shrink-0" height="28" width="28" fill="currentColor" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg">
                  <path d="M5.002 23a1 1 0 01-1-1V6a1 1 0 011-1h6.999a.999.999 0 100-2H5.002c-1.652 0-3 1.346-3 3v16c0 1.654 1.348 3 3 3h7.999a.999.999 0 100-2H5.002z"></path>
                  <path d="M18.69 18.683L23 14l-4.31-4.683a.968.968 0 00-1.389-.045 1.01 1.01 0 00-.044 1.413L19.388 13H9c-.542 0-1 .448-1 1 0 .555.458 1 1 1h10.388l-2.13 2.316a1.01 1.01 0 00.044 1.414.97.97 0 001.387-.046z"></path>
                </svg>
                <div className="flex-1 mr-6">
                  <div className="text-lg font-semibold mb-1">{t("pro.profile.importFromOtherSites")}</div>
                  <p className="text-sm text-gray-600">{t("pro.profile.importFromOtherSitesDescription")}</p>
                </div>
                <svg height="18" width="18" fill="currentColor" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9.764 14.646L16 9 9.725 3.311a1 1 0 00-1.482 1.342L11.75 8H3.002A1 1 0 103 10h8.75l-3.449 3.285c-.187.2-.301.435-.301.715a1 1 0 001 1c.306 0 .537-.151.764-.354z"></path>
                </svg>
              </div>

              <div
                className="p-6 flex items-center bg-gray-200 rounded-lg cursor-pointer hover:bg-gray-300"
                onClick={handleComingSoon}
              >
                <svg className="mr-6 shrink-0" height="28" width="28" fill="currentColor" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg">
                  <path d="M24 9.283l-8.743 4.035a2.997 2.997 0 01-2.514.001L4 9.283V7c0-.551.449-1 1-1h18c.551 0 1 .449 1 1v2.283zM24 21c0 .551-.449 1-1 1H5c-.551 0-1-.449-1-1v-9.515l7.905 3.65a4.996 4.996 0 004.19-.001L24 11.485V21zM23 4H5C3.346 4 2 5.345 2 7v14c0 1.654 1.346 3 3 3h18c1.654 0 3-1.346 3-3V7c0-1.655-1.346-3-3-3z"></path>
                </svg>
                <div className="flex-1 mr-6">
                  <div className="text-lg font-semibold mb-1">{t("pro.profile.emailPastCustomers")}</div>
                  <p className="text-sm text-gray-600">{t("pro.profile.emailPastCustomersDescription")}</p>
                </div>
                <svg height="18" width="18" fill="currentColor" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9.764 14.646L16 9 9.725 3.311a1 1 0 00-1.482 1.342L11.75 8H3.002A1 1 0 103 10h8.75l-3.449 3.285c-.187.2-.301.435-.301.715a1 1 0 001 1c.306 0 .537-.151.764-.354z"></path>
                </svg>
              </div>

              <div
                className="p-6 flex items-center bg-gray-200 rounded-lg cursor-pointer hover:bg-gray-300"
                onClick={handleCopyShareableLink}
              >
                <svg className="mr-6 shrink-0" height="28" width="28" fill="currentColor" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg">
                  <path d="M23 3a2 2 0 012 2v14a2 2 0 01-2 2h-4v2a2 2 0 01-2 2H5a2 2 0 01-2-2V9a2 2 0 012-2h4V5a2 2 0 012-2h12zM9 9H5v14h12v-2h-6a2 2 0 01-2-2H7a1 1 0 110-2h2v-3H7a1 1 0 110-2h2V9zm14-4H11v14h12V5zm-2 9a1 1 0 110 2h-8a1 1 0 110-2h8zm0-6a1 1 0 110 2h-8a1 1 0 110-2h8z"></path>
                </svg>
                <div className="text-lg font-semibold">{t("pro.profile.copyShareableLink")}</div>
              </div>
            </div>
          </div>
        </section>

        {/* Credentials Section */}
        <section className="bg-white rounded-lg border border-gray-200 mt-8 pb-8">
          <header className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-xl font-bold">{t("pro.profile.credentials")}</h1>
          </header>
          <div className="px-6 py-6 space-y-6">
            <section>
              <div className="flex items-center mb-4">
                <svg className="mr-4" height="18" width="18" fill="currentColor" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10 10a3 3 0 013 3v3a1 1 0 11-2 0v-3a1 1 0 00-1-1H4a1 1 0 00-.993.883L3 13v3a1 1 0 11-2 0v-3l.005-.176A3 3 0 014 10h6zm6.78-3.78a.75.75 0 010 1.06l-3 3a.75.75 0 01-1.06 0l-1.5-1.5a.75.75 0 011.06-1.06l.97.97 2.47-2.47a.75.75 0 011.06 0zM7 1a4 4 0 110 8 4 4 0 010-8zm0 2a2 2 0 100 4 2 2 0 000-4z"></path>
                </svg>
                <div className="text-lg font-semibold">{t("pro.profile.backgroundCheck")}</div>
              </div>
              <div className="p-6 flex items-center border-2 border-dashed border-gray-200 rounded">
                <p className="flex-auto text-sm text-gray-500 mr-6">{t("pro.profile.backgroundCheckDescription")}</p>
                <div>
                  <button className="px-4 py-2 border border-gray-200 rounded hover:bg-gray-50 text-sm">{t("pro.profile.start")}</button>
                </div>
              </div>
            </section>

            <section>
              <div className="flex items-center mb-4">
                <svg className="mr-4" height="18" width="18" fill="currentColor" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                  <path d="M14 9.015c-.062 2.264-.722 4.46-5 5.888-4.278-1.428-4.937-3.623-5-5.861V5.826l5-2.562 5 2.562v3.189zM9 1L2 4.622v4.449c.077 2.74.908 6.028 6.702 7.837L9 17l.298-.092c5.794-1.809 6.625-5.097 6.702-7.866v-4.42L9 1zM7.188 9.055a.749.749 0 10-.832 1.248l2.534 1.689 2.963-4.443a.753.753 0 00-.208-1.04.752.752 0 00-1.041.208l-2.13 3.194-1.286-.856z"></path>
                </svg>
                <div className="text-lg font-semibold">{t("pro.profile.professionalLicenses")}</div>
              </div>
              <div className="p-6 flex items-center border-2 border-dashed border-gray-200 rounded">
                <p className="flex-auto text-sm text-gray-500 mr-6">{t("pro.profile.professionalLicensesDescription")}</p>
                <div>
                  <button className="px-4 py-2 border border-gray-200 rounded hover:bg-gray-50 text-sm">{t("pro.profile.add")}</button>
                </div>
              </div>
            </section>

            <section>
              <div className="flex items-center mb-4">
                <svg className="mr-4" height="18" width="18" fill="currentColor" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                  <path d="M14 9.015c-.062 2.264-.722 4.46-5 5.888-4.278-1.428-4.937-3.623-5-5.861V5.826l5-2.562 5 2.562v3.189zM9 1L2 4.622v4.449c.077 2.74.908 6.028 6.702 7.837L9 17l.298-.092c5.794-1.809 6.625-5.097 6.702-7.866v-4.42L9 1zM7.188 9.055a.749.749 0 10-.832 1.248l2.534 1.689 2.963-4.443a.753.753 0 00-.208-1.04.752.752 0 00-1.041.208l-2.13 3.194-1.286-.856z"></path>
                </svg>
                <div className="text-lg font-semibold">{t("pro.profile.businessInsurance")}</div>
              </div>
              <div className="p-6 flex items-center border-2 border-dashed border-gray-200 rounded">
                <p className="flex-auto text-sm text-gray-500 mr-6">{t("pro.profile.businessInsuranceDescription")}</p>
                <div>
                  <button className="px-4 py-2 border border-gray-200 rounded hover:bg-gray-50 text-sm">{t("pro.profile.add")}</button>
                </div>
              </div>
            </section>
          </div>
        </section>

        {/* Payment Methods Section */}
        <section className="bg-white rounded-lg border border-gray-200 mt-8 pb-8">
          <header className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h1 className="text-xl font-bold">{t("pro.profile.paymentMethodsAccepted")}</h1>
            <Link href="/pro/profile/edit-payment" className="text-[hsl(var(--primary))] font-semibold hover:underline">
              {t("pro.profile.edit")}
            </Link>
          </header>
          <div className="px-8 py-6">
            <div className="p-6 flex items-center border-2 border-dashed border-gray-200 rounded">
              <p className="flex-auto text-sm text-gray-500 mr-6">{t("pro.profile.paymentMethodsDescription")}</p>
              <div>
                  <button
                    type="button"
                    onClick={handleAddAcceptedPaymentMethod}
                    className="px-4 py-2 border border-gray-200 rounded hover:bg-gray-50 text-sm"
                  >
                    {t("pro.profile.add")}
                  </button>
              </div>
            </div>
            <div className="p-6 flex flex-col sm:flex-row items-start border border-gray-200 rounded mt-6">
              <div className="mr-6 flex-1">
                <div className="text-lg font-semibold text-green-600 mb-2">{t("pro.profile.getPaidThroughThumbtack")}</div>
                <p className="text-sm text-gray-600">
                  {t("pro.profile.getPaidDescription")}{" "}
                  <a href="https://help.thumbtack.com/article/how-to-set-up-direct-deposit" target="_blank" rel="noopener" className="text-[hsl(var(--primary))] hover:underline">
                    {t("pro.profile.learnMore")}
                  </a>
                </p>
              </div>
              <div className="mt-6 sm:mt-0">
                <button
                  type="button"
                  onClick={handleSetupDirectDeposit}
                  className="px-6 py-3 bg-[hsl(var(--primary))] text-white rounded hover:opacity-90"
                >
                  {t("pro.profile.setupDirectDeposit")}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Photos and Videos Section */}
        <section className="bg-white rounded-lg border border-gray-200 mt-8 pb-8">
          <header className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h1 className="text-xl font-bold">{t("pro.profile.photosAndVideos")}</h1>
            <button
              type="button"
              onClick={handleEditPhotos}
              className="text-[hsl(var(--primary))] font-semibold hover:underline"
            >
              {t("pro.profile.edit")}
            </button>
          </header>
          <div className="px-8 py-6">
            <div className="pt-6 pb-8">
              <div className="flex gap-4 overflow-x-auto">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="shrink-0 w-32 h-24 bg-gray-200 rounded flex items-center justify-center">
                    <svg className="text-gray-400" width="40" height="28" viewBox="0 0 40 28">
                      <path d="M0 28L11.7 6.44l10.34 15.4 7.348-10.64L40 28H0zM24.218 8.4c-2.255 0-4.082-1.88-4.082-4.2 0-2.32 1.827-4.2 4.082-4.2 2.254 0 4.081 1.88 4.081 4.2 0 2.32-1.827 4.2-4.081 4.2z" fillRule="evenodd" fill="currentColor"></path>
                    </svg>
                  </div>
                ))}
              </div>
            </div>
            <div className="border border-gray-200 rounded p-6 flex flex-col sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="font-semibold flex mb-2">
                  <p className="text-lg">{t("pro.profile.showOffBusiness")}</p>
                </div>
                <p className="text-sm text-gray-600">{t("pro.profile.showOffBusinessDescription")}</p>
              </div>
              <div className="mt-6 sm:mt-0 sm:ml-6">
                <button
                  type="button"
                  onClick={handleEditPhotos}
                  className="px-4 py-2 border border-gray-200 rounded hover:bg-gray-50 text-sm"
                >
                  {t("pro.profile.addPhotos")}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Projects Section */}
        <section className="bg-white rounded-lg border border-gray-200 mt-8 pb-8">
          <header className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h1 className="text-xl font-bold">{t("pro.profile.projectsPortfolio")}</h1>
            <button 
              onClick={handleAddProject}
              className="text-[hsl(var(--primary))] font-semibold hover:underline"
            >
              {t("pro.profile.addProject")}
            </button>
          </header>
          <div className="px-8 py-6">
            {loadingProjects ? (
              <p className="text-gray-500">{t("pro.profile.loadingProjects")}</p>
            ) : projects.length > 0 ? (
              <div className="space-y-4">
                {projects.map((project) => (
                  <div key={project.id} className="border border-gray-200 rounded-lg overflow-hidden">
                    {/* Project Media */}
                    {project.media && project.media.length > 0 && (
                      <div className={`grid gap-2 p-2 bg-gray-50 ${
                        project.media.length === 1 ? 'grid-cols-1' :
                        project.media.length === 2 ? 'grid-cols-2' :
                        'grid-cols-3'
                      }`}>
                        {project.media
                          .sort((a, b) => a.display_order - b.display_order)
                          .slice(0, 6)
                          .map((media) => (
                            <div key={media.id} className="relative aspect-square bg-gray-200 rounded overflow-hidden">
                              {media.media_type === 'image' ? (
                                <img
                                  src={media.media_url}
                                  alt={media.caption || project.title}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <video
                                  src={media.media_url}
                                  className="w-full h-full object-cover"
                                  controls
                                />
                              )}
                            </div>
                          ))}
                      </div>
                    )}
                    
                    {/* Project Info */}
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg text-gray-900">{project.title}</h3>
                          {project.description && (
                            <p className="text-sm text-gray-600 mt-1 whitespace-pre-line">{project.description}</p>
                          )}
                          <p className="text-xs text-gray-500 mt-2">
                            {project.media.length} {project.media.length === 1 ? t("pro.profile.item") : t("pro.profile.items")}
                          </p>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={() => handleEditProject(project)}
                            className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
                          >
                            {t("pro.profile.edit")}
                          </button>
                          <button
                            onClick={() => handleDeleteProject(project.id)}
                            className="px-3 py-1 text-sm text-red-600 border border-red-300 rounded hover:bg-red-50"
                          >
                            {t("pro.profile.delete")}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="border border-gray-200 rounded p-6 flex flex-col sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="font-semibold flex mb-2">
                    <p className="text-lg">{t("pro.profile.showcaseYourWork")}</p>
                  </div>
                  <p className="text-sm text-gray-600">{t("pro.profile.showcaseYourWorkDescription")}</p>
                </div>
                <div className="mt-6 sm:mt-0 sm:ml-6">
                  <button 
                    onClick={handleAddProject}
                    className="px-4 py-2 border border-gray-200 rounded hover:bg-gray-50 text-sm"
                  >
                    {t("pro.profile.addProject")}
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* FAQ Section */}
        <section className="bg-white rounded-lg border border-gray-200 mt-8 pb-8">
          <header className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h1 className="text-xl font-bold">{t("pro.profile.frequentlyAskedQuestions")}</h1>
            <Link href="/pro/profile/edit-faq" className="text-[hsl(var(--primary))] font-semibold hover:underline">
              {t("pro.profile.edit")}
            </Link>
          </header>
          <div className="px-8 py-6">
            {loadingFaqs ? (
              <p className="text-gray-500">{t("pro.profile.loadingFaqs")}</p>
            ) : faqs.length > 0 ? (
              faqs.map((faq, index) => (
                <div key={faq.id}>
                  <div className="text-lg font-semibold mt-6">{faq.question}</div>
                  <p className="text-sm text-gray-600 whitespace-pre-line mt-2">
                    {faq.answer || t("pro.profile.notAnswered")}
                  </p>
                  {index < faqs.length - 1 && (
                    <div className="mt-6">
                      <hr className="border-gray-200" />
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-gray-500 italic">{t("pro.profile.noFaqsYet")}</div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

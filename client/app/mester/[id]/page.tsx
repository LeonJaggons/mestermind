"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Star, MapPin, Calendar, Users, Shield, Clock } from "lucide-react";
import JobRequestModal from "@/components/JobRequestModal";
import { useAuth } from "@/lib/contexts/AuthContext";
import { useI18n } from "@/lib/contexts/I18nContext";
import { API_BASE_URL } from "@/lib/api/config";

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

interface MesterDetail {
  id: number;
  user_id: number;
  business_name: string;
  business_intro: string | null;
  profile_image_url: string | null;
  city: string;
  zip_code: string;
  street_address: string;
  suite: string | null;
  year_founded: number | null;
  number_of_employees: number | null;
  service_distance: number | null;
  about_business: string | null;
  why_choose: string | null;
  services?: Array<{
    id: string;
    name: string;
    description: string | null;
  }>;
}

export default function MesterDetailPage() {
  const params = useParams();
  const router = useRouter();
  const mesterId = params.id as string;
  const { user } = useAuth();
  const { language } = useI18n();

  const [mester, setMester] = useState<MesterDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [sendingInvitation, setSendingInvitation] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [serviceIdForModal, setServiceIdForModal] = useState<string | null>(null);
  const [pendingInvitation, setPendingInvitation] = useState(false);
  const [serviceIdFromUrl, setServiceIdFromUrl] = useState<string | null>(null);
  const [showServiceSelection, setShowServiceSelection] = useState(false);
  const [existingInvitation, setExistingInvitation] = useState<any>(null);
  const [checkingInvitation, setCheckingInvitation] = useState(true);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [faqs, setFaqs] = useState<Array<{ id: number; question: string; answer: string | null }>>([]);
  const [loadingFaqs, setLoadingFaqs] = useState(true);
  const [services, setServices] = useState<Array<{ id: string; name: string; category: { name: string } }>>([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);

  // Get service_id from URL on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const serviceId = urlParams.get("service_id");
    if (serviceId) {
      setServiceIdFromUrl(serviceId);
      setServiceIdForModal(serviceId);
    } else {
      setServiceIdFromUrl(null);
    }
    // Reset invitation state when service_id changes
    setExistingInvitation(null);
  }, []);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      const offset = 100; // Account for sticky header
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth"
      });
    }
  };

  const handleRequestEstimate = async () => {
    try {
      console.log('[REQUEST ESTIMATE] Starting...', {
        mesterId,
        serviceIdFromUrl,
        serviceIdForModal
      });
      
      // Check if user is signed in first
      const { getAuth } = await import('firebase/auth');
      const auth = getAuth();
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        console.log('[REQUEST ESTIMATE] No user, redirecting to login');
        // Not signed in - redirect to login
        router.push("/login");
        return;
      }

      // Check if we have a service_id
      if (!serviceIdFromUrl && !serviceIdForModal) {
        console.log('[REQUEST ESTIMATE] No service_id, showing service selection');
        // No service selected - show service selection
        setShowServiceSelection(true);
        return;
      }

      setSendingInvitation(true);

      // Get user ID from Firebase UID
      const userResponse = await fetch(`${API_BASE_URL}/api/v1/users/firebase/${currentUser.uid}`);
      if (!userResponse.ok) {
        console.log('[REQUEST ESTIMATE] Failed to fetch user');
        alert("Error fetching user information");
        return;
      }
      const userData = await userResponse.json();
      console.log('[REQUEST ESTIMATE] User data:', { userId: userData.id });

      // Check for open jobs for this user with the same service
      const jobsResponse = await fetch(`${API_BASE_URL}/api/v1/jobs?user_id=${userData.id}`);
      if (!jobsResponse.ok) {
        console.log('[REQUEST ESTIMATE] Failed to fetch jobs');
        alert("Error fetching jobs");
        return;
      }
      const jobs = await jobsResponse.json();
      
      // Find open job with matching service_id
      const targetServiceId = serviceIdFromUrl || serviceIdForModal;
      console.log('[REQUEST ESTIMATE] Looking for open job with service_id:', targetServiceId);
      console.log('[REQUEST ESTIMATE] All jobs:', jobs.map((j: any) => ({
        id: j.id,
        service_id: j.service_id,
        status: j.status
      })));
      
      const openJob = targetServiceId
        ? jobs.find((job: any) => job.status === 'open' && job.service_id === targetServiceId)
        : jobs.find((job: any) => job.status === 'open');

      console.log('[REQUEST ESTIMATE] Found open job:', openJob ? {
        id: openJob.id,
        service_id: openJob.service_id,
        status: openJob.status
      } : null);

      if (!openJob) {
        // No open job - need to open modal to create/complete task
        console.log('[REQUEST ESTIMATE] No matching open job found, opening modal');
        // Use service_id from URL, or fallback to mester's first service
        if (!serviceIdFromUrl && mester?.services && mester.services.length > 0) {
          setServiceIdForModal(mester.services[0].id);
        }
        setPendingInvitation(true);
        setShowModal(true);
        setSendingInvitation(false);
        return;
      }

      // Check if invitation already exists for this job and pro
      console.log('[REQUEST ESTIMATE] Checking for existing invitations for job', openJob.id);
      const existingInvitationsResponse = await fetch(`${API_BASE_URL}/api/v1/invitations?job_id=${openJob.id}`);
      if (existingInvitationsResponse.ok) {
        const existingInvitations = await existingInvitationsResponse.json();
        console.log('[REQUEST ESTIMATE] Existing invitations:', existingInvitations.map((inv: any) => ({
          id: inv.id,
          pro_profile_id: inv.pro_profile_id,
          status: inv.status
        })));
        
        const alreadyInvited = existingInvitations.find(
          (inv: any) => inv.pro_profile_id === parseInt(mesterId)
        );
        
        if (alreadyInvited) {
          console.log('[REQUEST ESTIMATE] ✓ Invitation already exists, setting state:', {
            invitationId: alreadyInvited.id,
            status: alreadyInvited.status
          });
          // Invitation already exists - update state and don't create duplicate
          setExistingInvitation(alreadyInvited);
          setSendingInvitation(false);
          return;
        }
      }

      // Create invitation
      console.log('[REQUEST ESTIMATE] Creating new invitation...', {
        job_id: openJob.id,
        pro_profile_id: parseInt(mesterId)
      });
      const invitationResponse = await fetch(`${API_BASE_URL}/api/v1/invitations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_id: openJob.id,
          pro_profile_id: parseInt(mesterId)
        })
      });

      if (invitationResponse.ok) {
        const newInvitation = await invitationResponse.json();
        console.log('[REQUEST ESTIMATE] ✓ Invitation created successfully:', {
          invitationId: newInvitation.id,
          status: newInvitation.status
        });
        setExistingInvitation(newInvitation);
        alert("Estimate request sent successfully!");
      } else {
        const error = await invitationResponse.json();
        console.log('[REQUEST ESTIMATE] ✗ Failed to create invitation:', error);
        alert(error.detail || "Failed to send estimate request");
      }
    } catch (error) {
      console.error("[REQUEST ESTIMATE] Error sending invitation:", error);
      alert("An error occurred while sending the request");
    } finally {
      setSendingInvitation(false);
    }
  };

  const handleServiceSelected = (serviceId: string) => {
    setServiceIdForModal(serviceId);
    setShowServiceSelection(false);
    // Now that service is selected, trigger the request estimate flow again
    setTimeout(() => handleRequestEstimate(), 100);
  };

  const handleModalComplete = async (data: any) => {
    setShowModal(false);
    
    // If we were waiting to send an invitation, send it now
    if (pendingInvitation) {
      setPendingInvitation(false);
      
      try {
        setSendingInvitation(true);
        
        // Get current user
        const { getAuth } = await import('firebase/auth');
        const auth = getAuth();
        const currentUser = auth.currentUser;
        
        if (!currentUser) return;

        // Get user ID from Firebase UID
        const userResponse = await fetch(`${API_BASE_URL}/api/v1/users/firebase/${currentUser.uid}`);
        if (!userResponse.ok) return;
        const userData = await userResponse.json();

        // Get the newly created/updated job
        const jobsResponse = await fetch(`${API_BASE_URL}/api/v1/jobs?user_id=${userData.id}`);
        if (!jobsResponse.ok) return;
        const jobs = await jobsResponse.json();
        const openJob = jobs.find((job: any) => job.status === 'open');

        if (!openJob) {
          alert("Please complete the task details to send the request");
          return;
        }

        // Check if invitation already exists for this job and pro
        const existingInvitationsResponse = await fetch(`${API_BASE_URL}/api/v1/invitations?job_id=${openJob.id}`);
        if (existingInvitationsResponse.ok) {
          const existingInvitations = await existingInvitationsResponse.json();
          const alreadyInvited = existingInvitations.find(
            (inv: any) => inv.pro_profile_id === parseInt(mesterId)
          );
          
          if (alreadyInvited) {
            // Invitation already exists - update state and don't create duplicate
            setExistingInvitation(alreadyInvited);
            setSendingInvitation(false);
            return;
          }
        }

        // Create invitation
        const invitationResponse = await fetch(`${API_BASE_URL}/api/v1/invitations`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            job_id: openJob.id,
            pro_profile_id: parseInt(mesterId)
          })
        });

        if (invitationResponse.ok) {
          const newInvitation = await invitationResponse.json();
          setExistingInvitation(newInvitation);
          alert("Estimate request sent successfully!");
        } else {
          const error = await invitationResponse.json();
          alert(error.detail || "Failed to send estimate request");
        }
      } catch (error) {
        console.error("Error sending invitation:", error);
        alert("An error occurred while sending the request");
      } finally {
        setSendingInvitation(false);
      }
    }
  };

  useEffect(() => {
    const fetchMesterDetail = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_BASE_URL}/api/v1/pro-profiles/${mesterId}`);
        if (response.ok) {
          const data = await response.json();
          setMester(data);
          
          // Track profile view
          try {
            const viewerUserId = user ? (await fetch(`${API_BASE_URL}/api/v1/users/firebase/${user.uid}`).then(r => r.ok ? r.json() : null))?.id : null;
            
            // Build request body - only include service_id if it has a valid value
            const requestBody: {
              pro_profile_id: number;
              service_id?: string;
              viewer_user_id?: number;
            } = {
              pro_profile_id: parseInt(mesterId),
            };
            
            // Only include service_id if it's a non-empty string
            if (serviceIdFromUrl && serviceIdFromUrl.trim() !== "") {
              requestBody.service_id = serviceIdFromUrl;
            }
            
            // Only include viewer_user_id if it exists
            if (viewerUserId) {
              requestBody.viewer_user_id = viewerUserId;
            }
            
            await fetch(`${API_BASE_URL}/api/v1/profile-views/`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(requestBody),
            });
          } catch (error) {
            // Silently fail view tracking
            console.error("Failed to track profile view:", error);
          }
        } else {
          console.error("Failed to fetch mester details");
        }
      } catch (error) {
        console.error("Error fetching mester:", error);
      } finally {
        setLoading(false);
      }
    };

    if (mesterId) {
      fetchMesterDetail();
    }
  }, [mesterId, serviceIdFromUrl, user]);

  // Fetch reviews
  useEffect(() => {
    const fetchReviews = async () => {
      try {
        setLoadingReviews(true);
        const response = await fetch(`${API_BASE_URL}/api/v1/reviews?pro_profile_id=${mesterId}`);
        if (response.ok) {
          const data = await response.json();
          setReviews(data);
        } else {
          console.error("Failed to fetch reviews");
        }
      } catch (error) {
        console.error("Error fetching reviews:", error);
      } finally {
        setLoadingReviews(false);
      }
    };

    if (mesterId) {
      fetchReviews();
    }
  }, [mesterId]);

  // Fetch FAQs
  useEffect(() => {
    const fetchFaqs = async () => {
      try {
        setLoadingFaqs(true);
        const response = await fetch(`${API_BASE_URL}/api/v1/faqs/pro-profile/${mesterId}`);
        if (response.ok) {
          const data = await response.json();
          setFaqs(data);
        } else {
          console.error("Failed to fetch FAQs");
        }
      } catch (error) {
        console.error("Error fetching FAQs:", error);
      } finally {
        setLoadingFaqs(false);
      }
    };

    if (mesterId) {
      fetchFaqs();
    }
  }, [mesterId]);

  // Fetch services
  useEffect(() => {
    const fetchServices = async () => {
      try {
        setLoadingServices(true);
        const response = await fetch(`${API_BASE_URL}/api/v1/pro-services/pro-profile/${mesterId}?language=${language}`);
        if (response.ok) {
          const data = await response.json();
          // Transform the data to match our state structure
          const transformedServices = data.map((item: any) => ({
            id: item.service.id,
            name: item.service.name,  // Already translated by API
            category: {
              ...item.service.category,
              name: item.service.category.name  // Already translated by API
            }
          }));
          setServices(transformedServices);
        } else {
          console.error("Failed to fetch services");
        }
      } catch (error) {
        console.error("Error fetching services:", error);
      } finally {
        setLoadingServices(false);
      }
    };

    if (mesterId) {
      fetchServices();
    }
  }, [mesterId, language]);

  // Fetch projects
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoadingProjects(true);
        const response = await fetch(`${API_BASE_URL}/api/v1/projects?pro_profile_id=${mesterId}`);
        if (response.ok) {
          const data = await response.json();
          setProjects(data);
        } else {
          console.error("Failed to fetch projects");
        }
      } catch (error) {
        console.error("Error fetching projects:", error);
      } finally {
        setLoadingProjects(false);
      }
    };

    if (mesterId) {
      fetchProjects();
    }
  }, [mesterId]);

  // Check for existing invitation - query invitations directly by pro_profile_id
  useEffect(() => {
    const checkExistingInvitation = async () => {
      try {
        setCheckingInvitation(true);
        
        console.log('[INVITATION CHECK] Starting check...', {
          mesterId,
          serviceIdFromUrl,
          hasUser: !!user
        });
        
        if (!user) {
          console.log('[INVITATION CHECK] No user, skipping check');
          setCheckingInvitation(false);
          return;
        }

        // Get user ID from Firebase UID
        const userResponse = await fetch(`${API_BASE_URL}/api/v1/users/firebase/${user.uid}`);
        if (!userResponse.ok) {
          console.log('[INVITATION CHECK] Failed to fetch user');
          setCheckingInvitation(false);
          return;
        }
        const userData = await userResponse.json();
        console.log('[INVITATION CHECK] User data:', { userId: userData.id, email: userData.email });

        // Query invitations directly by pro_profile_id (much simpler!)
        console.log(`[INVITATION CHECK] Querying invitations for pro_profile_id: ${mesterId}`);
        const invitationsResponse = await fetch(`${API_BASE_URL}/api/v1/invitations?pro_profile_id=${mesterId}`);
        if (!invitationsResponse.ok) {
          console.log('[INVITATION CHECK] Failed to fetch invitations');
          setCheckingInvitation(false);
          return;
        }
        const allInvitations = await invitationsResponse.json();
        console.log(`[INVITATION CHECK] Found ${allInvitations.length} invitation(s) for pro ${mesterId}:`, 
          allInvitations.map((inv: any) => ({
            id: inv.id,
            job_id: inv.job_id,
            status: inv.status
          }))
        );

        // Now filter invitations to only include ones where:
        // 1. The job is open
        // 2. If serviceIdFromUrl is provided, the job's service_id matches it
        let foundInvitation = null;
        
        for (const invitation of allInvitations) {
          // Fetch the job to check its status and service_id
          const jobResponse = await fetch(`${API_BASE_URL}/api/v1/jobs/${invitation.job_id}`);
          if (!jobResponse.ok) {
            console.log(`[INVITATION CHECK] Failed to fetch job ${invitation.job_id}, skipping`);
            continue;
          }
          const job = await jobResponse.json();
          
          console.log(`[INVITATION CHECK] Checking invitation ${invitation.id} for job ${job.id}:`, {
            jobId: job.id,
            jobStatus: job.status,
            jobServiceId: job.service_id,
            urlServiceId: serviceIdFromUrl,
            isOpen: job.status === 'open',
            serviceMatches: serviceIdFromUrl ? job.service_id === serviceIdFromUrl : 'N/A (no service filter)'
          });

          // Only consider invitations for open jobs
          if (job.status !== 'open') {
            console.log(`[INVITATION CHECK] ✗ Job ${job.id} is not open (status: ${job.status}), skipping`);
            continue;
          }

          // If serviceIdFromUrl is provided, job must match it
          if (serviceIdFromUrl && job.service_id !== serviceIdFromUrl) {
            console.log(`[INVITATION CHECK] ✗ Job ${job.id} service_id (${job.service_id}) doesn't match URL service_id (${serviceIdFromUrl}), skipping`);
            continue;
          }

          // This invitation matches all criteria!
          console.log(`[INVITATION CHECK] ✓ FOUND MATCHING INVITATION:`, {
            invitationId: invitation.id,
            jobId: job.id,
            jobServiceId: job.service_id,
            jobStatus: job.status,
            invitationStatus: invitation.status,
            urlServiceId: serviceIdFromUrl
          });
          foundInvitation = invitation;
          break;
        }
        
        // Only set if we found a matching invitation
        if (foundInvitation) {
          console.log('[INVITATION CHECK] ✓ SETTING existingInvitation - REQUEST SENT will show');
          setExistingInvitation(foundInvitation);
        } else {
          console.log('[INVITATION CHECK] ✗ NO matching invitation found - REQUEST SENT will NOT show');
          setExistingInvitation(null);
        }
      } catch (error) {
        console.error("[INVITATION CHECK] Error checking for existing invitation:", error);
      } finally {
        setCheckingInvitation(false);
      }
    };

    if (mesterId && user) {
      checkExistingInvitation();
    } else if (!user) {
      console.log('[INVITATION CHECK] No user or mesterId, skipping check');
      setCheckingInvitation(false);
    }
  }, [mesterId, user, serviceIdFromUrl]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!mester) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Mester not found</p>
          <button
            onClick={() => router.back()}
            className="text-purple-600 hover:underline"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  // Calculate average rating from reviews
  const reviewCount = reviews.length;
  const averageRating = reviewCount > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount
    : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Service Selection Modal */}
      {showServiceSelection && mester?.services && mester.services.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold mb-4">Select a Service</h2>
            <p className="text-gray-600 mb-4">
              Which service do you need from {mester.business_name}?
            </p>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {mester.services.map((service) => (
                <button
                  key={service.id}
                  onClick={() => handleServiceSelected(service.id)}
                  className="w-full text-left p-4 border border-gray-300 rounded-lg hover:border-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.05)] transition"
                >
                  <h3 className="font-semibold text-gray-900">{service.name}</h3>
                  {service.description && (
                    <p className="text-sm text-gray-600 mt-1">{service.description}</p>
                  )}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowServiceSelection(false)}
              className="mt-4 w-full py-2 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Job Request Modal */}
      <JobRequestModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setPendingInvitation(false);
        }}
        onComplete={handleModalComplete}
        serviceId={serviceIdForModal}
        initialCity={mester?.city || undefined}
      />

      {/* Breadcrumb */}
      <div className="bg-white border-b border-b-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <nav className="flex items-center space-x-2 text-sm">
            <Link href="/" className="text-gray-500 hover:text-gray-700">
              Mestermind
            </Link>
            <span className="text-gray-400">/</span>
            <Link href="/results" className="text-gray-500 hover:text-gray-700">
              Search Results
            </Link>
            <span className="text-gray-400">/</span>
            <span className="text-gray-900">{mester.business_name}</span>
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header Section */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-start gap-6">
                {/* Profile Image */}
                <div className="flex-shrink-0">
                  {mester.profile_image_url ? (
                    <img
                      src={mester.profile_image_url}
                      alt={mester.business_name}
                      className="w-32 h-32 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-32 h-32 rounded-lg bg-gray-200 flex items-center justify-center">
                      <span className="text-4xl font-bold text-gray-600">
                        {mester.business_name.charAt(0)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Business Info */}
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        {mester.business_name}
                      </h1>
                      <div className="flex items-center gap-4 mb-3">
                        <div className="flex items-center gap-1">
                          <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                          <span className="font-semibold text-gray-900">
                            {averageRating.toFixed(1)}
                          </span>
                          <span className="text-gray-500">
                            ({reviewCount} reviews)
                          </span>
                        </div>
                        <div className="px-3 py-1 bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] rounded-full text-sm font-medium">
                          Top Pro
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Quick Info */}
                  <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      <span>{mester.city}</span>
                    </div>
                    {mester.year_founded && (
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>Since {mester.year_founded}</span>
                      </div>
                    )}
                    {mester.number_of_employees && (
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        <span>{mester.number_of_employees} employees</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="bg-white rounded-lg shadow-sm sticky top-0 z-10">
              <nav className="flex

                border-b border-b-gray-200 overflow-x-auto">
                {["about", "services", "projects", "reviews", "credentials"].map((section) => (
                  <button
                    key={section}
                    onClick={() => scrollToSection(section)}
                    className="px-6 py-4 text-sm font-medium border-b-2 border-b-gray-200 whitespace-nowrap border-transparent text-gray-500 hover:text-gray-700"
                  >
                    {section.charAt(0).toUpperCase() + section.slice(1)}
                  </button>
                ))}
              </nav>
            </div>

            {/* About Section */}
            <div id="about" className="bg-white rounded-lg shadow-sm p-6">
              <div className="mb-4">
                <h5 className="text-xl font-semibold text-gray-900 mb-3">About</h5>
                <div className="pr-3">
                  {mester.business_intro ? (
                    <div className="whitespace-pre-line text-gray-700 text-sm leading-relaxed">
                      {mester.business_intro}
                    </div>
                  ) : (
                    <p className="text-gray-500 italic text-sm">
                      No description available
                    </p>
                  )}
                </div>
              </div>

              {/* Overview Section */}
              <div className="mb-4 w-full">
                <div className="text-lg font-semibold text-gray-900 mb-2">Overview</div>
                <div>
                  {/* Top Pro Badge */}
                  <div className="flex items-center mb-2">
                    <div className="flex items-center mr-2">
                      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                        <path d="M12.885 5.08H5.42v8.484h7.465V5.08z" fill="#FFCB42"></path>
                        <path fillRule="evenodd" clipRule="evenodd" d="M9.466.295a.87.87 0 0 0-.932 0l-1.366.866a.87.87 0 0 1-.502.134l-1.615-.067a.87.87 0 0 0-.807.467l-.75 1.432a.87.87 0 0 1-.367.367l-1.432.75a.87.87 0 0 0-.467.807l.067 1.615a.87.87 0 0 1-.135.502L.295 8.534a.87.87 0 0 0 0 .932l.865 1.366c.095.15.142.324.135.502l-.067 1.615a.871.871 0 0 0 .467.807l1.432.75a.87.87 0 0 1 .367.367l.75 1.432a.87.87 0 0 0 .807.467l1.615-.067a.871.871 0 0 1 .502.135l1.366.865a.87.87 0 0 0 .932 0l1.366-.865a.871.871 0 0 1 .502-.135l1.615.067a.871.871 0 0 0 .807-.467l.75-1.432a.87.87 0 0 1 .367-.367l1.432-.75a.871.871 0 0 0 .467-.807l-.067-1.615a.871.871 0 0 1 .135-.502l.865-1.366a.87.87 0 0 0 0-.932l-.865-1.366a.871.871 0 0 1-.135-.502l.067-1.615a.87.87 0 0 0-.467-.807l-1.432-.75a.87.87 0 0 1-.367-.367l-.75-1.432a.871.871 0 0 0-.807-.467l-1.615.067a.871.871 0 0 1-.502-.134L9.466.295z" fill="#009FD9"></path>
                      </svg>
                    </div>
                    <p className="text-sm text-gray-700">Current Top Pro</p>
                  </div>

                  {/* Location */}
                  <div className="flex items-center mb-2">
                    <div className="flex items-center mr-2">
                      <MapPin className="w-[18px] h-[18px] text-gray-700" />
                    </div>
                    <p className="text-sm text-gray-700">Serves {mester.city}</p>
                  </div>

                  {/* Background Check */}
                  <div className="flex items-center mb-2">
                    <div className="flex items-center mr-2">
                      <Shield className="w-[18px] h-[18px] text-gray-700" />
                    </div>
                    <p className="text-sm text-gray-700">Background checked</p>
                  </div>

                  {/* Employees */}
                  {mester.number_of_employees && (
                    <div className="flex items-center mb-2">
                      <div className="flex items-center mr-2">
                        <Users className="w-[18px] h-[18px] text-gray-700" />
                      </div>
                      <p className="text-sm text-gray-700">{mester.number_of_employees} employees</p>
                    </div>
                  )}

                  {/* Years in Business */}
                  {mester.year_founded && (
                    <div className="flex items-center mb-2">
                      <div className="flex items-center mr-2">
                        <Clock className="w-[18px] h-[18px] text-gray-700" />
                      </div>
                      <p className="text-sm text-gray-700">
                        {new Date().getFullYear() - mester.year_founded} years in business
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Services Section */}
            <div id="services" className="bg-white rounded-lg shadow-sm p-6 space-y-4">
              <h2 className="text-2xl font-bold text-gray-900">Services Offered</h2>
              {loadingServices ? (
                <p className="text-gray-500">Loading services...</p>
              ) : services.length > 0 ? (
                <div className="grid gap-4">
                  {services.map((service) => (
                    <div
                      key={service.id}
                      className="border border-gray-200 rounded-lg p-4 hover:border-[hsl(var(--primary)/0.5)] transition"
                    >
                      <h3 className="font-semibold text-gray-900 mb-1">
                        {service.name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {service.category.name}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 italic">No services listed</p>
              )}
            </div>

            {/* Projects Section */}
            <div id="projects" className="bg-white rounded-lg shadow-sm p-6 space-y-4">
              <h2 className="text-2xl font-bold text-gray-900">Projects & Media</h2>
              {loadingProjects ? (
                <p className="text-gray-500">Loading projects...</p>
              ) : projects.length > 0 ? (
                <div className="grid gap-6">
                  {projects.map((project) => (
                    <div key={project.id} className="border border-gray-200 rounded-lg overflow-hidden">
                      {/* Project Media Grid */}
                      {project.media && project.media.length > 0 && (
                        <div className={`grid gap-2 p-2 ${
                          project.media.length === 1 ? 'grid-cols-1' :
                          project.media.length === 2 ? 'grid-cols-2' :
                          project.media.length === 3 ? 'grid-cols-3' :
                          'grid-cols-2 md:grid-cols-3'
                        }`}>
                          {project.media
                            .sort((a, b) => a.display_order - b.display_order)
                            .map((media) => (
                              <div key={media.id} className="relative aspect-square bg-gray-100 rounded overflow-hidden">
                                {media.media_type === 'image' ? (
                                  <img
                                    src={media.media_url}
                                    alt={media.caption || project.title}
                                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-200 cursor-pointer"
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
                      
                      {/* Project Details */}
                      <div className="p-4">
                        <h3 className="font-semibold text-gray-900 text-lg mb-2">
                          {project.title}
                        </h3>
                        {project.description && (
                          <p className="text-gray-600 text-sm whitespace-pre-line">
                            {project.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 italic">No projects to display</p>
              )}
            </div>

            {/* Reviews Section */}
            <div id="reviews" className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Reviews</h2>
                <div className="text-sm text-gray-600">
                  {reviewCount} {reviewCount === 1 ? "review" : "reviews"}
                </div>
              </div>
              
              {loadingReviews ? (
                <p className="text-gray-500">Loading reviews...</p>
              ) : reviews.length > 0 ? (
                <div className="space-y-0">
                  {reviews.map((review) => (
                    <div key={review.id} className="py-6 border-b border-gray-200 last:border-b-0">
                      <div className="flex gap-3">
                        {/* Avatar */}
                        <div className="flex-shrink-0">
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
                              <p className="font-medium text-gray-900 truncate">
                                {review.customer_name}
                              </p>
                            </div>
                            <p className="text-sm text-gray-500">
                              {new Date(review.created_at).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric', 
                                year: 'numeric' 
                              })}
                            </p>
                          </div>

                          {/* Rating and Hired Badge */}
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            {/* Star Rating */}
                            <div className="flex items-center">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-[18px] h-[18px] ${
                                    i < review.rating
                                      ? "fill-green-500 text-green-500"
                                      : "fill-gray-300 text-gray-300"
                                  }`}
                                />
                              ))}
                            </div>
                            
                            <span className="text-gray-400">•</span>
                            
                            {/* Hired Badge */}
                            {review.hired_on_platform && (
                              <div className="flex items-center text-sm text-gray-600">
                                <svg className="w-[18px] h-[18px] text-[hsl(var(--primary))] mr-1" fill="currentColor" viewBox="0 0 18 18">
                                  <path d="M14 9.015c-.062 2.264-.722 4.46-5 5.888-4.278-1.428-4.937-3.623-5-5.861V5.826l5-2.562 5 2.562v3.189zM9 1L2 4.622v4.449c.077 2.74.908 6.028 6.702 7.837L9 17l.298-.092c5.794-1.809 6.625-5.097 6.702-7.866v-4.42L9 1zM7.188 9.055a.749.749 0 10-.832 1.248l2.534 1.689 2.963-4.443a.753.753 0 00-.208-1.04.752.752 0 00-1.041.208l-2.13 3.194-1.286-.856z"></path>
                                </svg>
                                <p className="text-sm text-gray-600">Hired on Mestermind</p>
                              </div>
                            )}
                          </div>

                          {/* Review Text */}
                          <div className="text-sm text-gray-700 mt-2">
                            <p className="whitespace-pre-line">{review.comment}</p>
                          </div>

                          {/* Service Details */}
                          {review.service_details && (
                            <p className="text-sm text-gray-500 mt-2">
                              Details: {review.service_details}
                            </p>
                          )}

                          {/* Mester Reply */}
                          {review.mester_reply && (
                            <div className="mt-3 p-3 bg-gray-100 rounded text-sm">
                              <div className="font-semibold mb-1">{mester.business_name}'s reply</div>
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
              ) : (
                <p className="text-gray-500 italic">No reviews yet</p>
              )}
            </div>

            {/* FAQ Section */}
            {faqs.length > 0 && (
              <div id="faqs" className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Frequently Asked Questions</h2>
                <div className="space-y-6">
                  {faqs.map((faq) => (
                    <div key={faq.id} className="border-b border-gray-200 pb-6 last:border-b-0 last:pb-0">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">{faq.question}</h3>
                      {faq.answer ? (
                        <p className="text-gray-700 whitespace-pre-line">{faq.answer}</p>
                      ) : (
                        <p className="text-gray-500 italic">Not answered</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Credentials Section */}
            <div id="credentials" className="bg-white rounded-lg shadow-sm p-6 space-y-4">
              <h2 className="text-2xl font-bold text-gray-900">Credentials</h2>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                  <Shield className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="font-medium text-gray-900">Background checked</p>
                    <p className="text-sm text-gray-600">
                      Verified professional credentials
                    </p>
                  </div>
                </div>
                {mester.year_founded && (
                  <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                    <Calendar className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="font-medium text-gray-900">
                        {new Date().getFullYear() - mester.year_founded} years in business
                      </p>
                      <p className="text-sm text-gray-600">
                        Established in {mester.year_founded}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-4 bg-white rounded-lg shadow-sm p-6 space-y-4">
              <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
                <Clock className="w-4 h-4" />
                <span>Online now</span>
              </div>

              {checkingInvitation ? (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-500">Checking...</p>
                </div>
              ) : existingInvitation ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <p className="font-semibold text-green-900">Request sent!</p>
                      <p className="text-sm text-green-700 mt-1">
                        Your estimate request has been sent to {mester.business_name}.
                        {existingInvitation.status === 'pending' && " They'll respond soon."}
                        {existingInvitation.status === 'accepted' && " They've accepted your request!"}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <p className="text-3xl font-bold text-gray-900">Request estimate</p>
                    <p className="text-sm text-gray-600 mt-1">Get a personalized quote</p>
                  </div>

                  <button 
                    onClick={handleRequestEstimate}
                    disabled={sendingInvitation}
                    className="w-full bg-[hsl(var(--primary))] text-white py-3 px-4 rounded-lg font-semibold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sendingInvitation ? "Sending..." : "Request estimate"}
                  </button>
                </>
              )}

              <div className="pt-4 border-t border-t-gray-200 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Response time</span>
                  <span className="font-medium text-gray-900">Within hours</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Service area</span>
                  <span className="font-medium text-gray-900">
                    {mester.service_distance ? `${mester.service_distance} km` : mester.city}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/contexts/AuthContext";
import dynamic from "next/dynamic";
import { MapPin, Users, MessageCircle, Clock, Check, X } from "lucide-react";

// Dynamically import the entire Map component to avoid SSR issues
const Map = dynamic(() => import("@/components/RequestMap"), { ssr: false });
import { API_BASE_URL } from "@/lib/api/config";

interface Job {
  id: number;
  user_id: number;
  service_id: string;
  description: string;
  city: string;
  district: string;
  zip_code: string;
  timing: string;
  budget: string;
  status: string;
  category: string;
  photos?: string[];
  created_at: string;
  display_latitude?: number;
  display_longitude?: number;
  has_confirmed_appointment?: boolean;
  user?: {
    id: number;
    name: string;
    email: string;
  };
  service?: {
    name: string;
    category: {
      name: string;
    };
  };
}

interface Invitation {
  id: number;
  job_id: number;
  pro_profile_id: number;
  status: string;
  pro_viewed: boolean;
  created_at: string;
}

export default function RequestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const invitationId = params.id as string;

  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [customerName, setCustomerName] = useState<string>("Customer");
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState(false);
  const [messageContent, setMessageContent] = useState("");
  const [sendError, setSendError] = useState("");

  useEffect(() => {
    const fetchInvitationDetails = async () => {
      if (!invitationId) return;

      try {
        setLoading(true);

        // Fetch invitation
        const invitationResponse = await fetch(`${API_BASE_URL}/api/v1/invitations/${invitationId}`);
        if (!invitationResponse.ok) {
          console.error("Failed to fetch invitation");
          return;
        }
        const invitationData = await invitationResponse.json();
        setInvitation(invitationData);

        // Fetch job details
        const jobResponse = await fetch(`${API_BASE_URL}/api/v1/jobs/${invitationData.job_id}`);
        if (jobResponse.ok) {
          const jobData = await jobResponse.json();
          setJob(jobData);

          // Fetch user details
          const userResponse = await fetch(`${API_BASE_URL}/api/v1/users/${jobData.user_id}`);
          if (userResponse.ok) {
            const userData = await userResponse.json();
            setCustomerName(userData.name || "Customer");
          }
        }

        // Mark as viewed if not already
        if (!invitationData.pro_viewed) {
          await fetch(`${API_BASE_URL}/api/v1/invitations/${invitationId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pro_viewed: true })
          });
        }
      } catch (error) {
        console.error("Error fetching invitation details:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchInvitationDetails();
  }, [invitationId]);

  const handleRespond = async () => {
    if (!messageContent.trim()) {
      setSendError("Please enter a message");
      return;
    }

    if (!user || !job) return;

    try {
      setResponding(true);
      setSendError("");

      // Get sender user ID
      const userResponse = await fetch(`${API_BASE_URL}/api/v1/users/firebase/${user.uid}`);
      if (!userResponse.ok) {
        throw new Error("Failed to get user info");
      }
      const userData = await userResponse.json();

      // Send message
      const messageResponse = await fetch(`${API_BASE_URL}/api/v1/messages?sender_id=${userData.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_id: job.id,
          receiver_id: job.user_id,
          content: messageContent
        })
      });

      if (!messageResponse.ok) {
        const error = await messageResponse.json();
        throw new Error(error.detail || "Failed to send message");
      }

      const messageData = await messageResponse.json();

      // Check if message contained contact info
      if (messageData.contains_contact_info) {
        alert("Note: Contact information in your message has been removed. Please use Mestermind's messaging system to communicate.");
      }

      // Update invitation status to accepted
      await fetch(`${API_BASE_URL}/api/v1/invitations/${invitationId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "accepted" })
      });

      // Refresh invitation data
      const invitationResponse = await fetch(`${API_BASE_URL}/api/v1/invitations/${invitationId}`);
      if (invitationResponse.ok) {
        const invitationData = await invitationResponse.json();
        setInvitation(invitationData);
      }

      setMessageContent("");
      alert("Your response has been sent successfully!");
    } catch (error: any) {
      console.error("Error sending response:", error);
      setSendError(error.message || "Failed to send response");
    } finally {
      setResponding(false);
    }
  };

  const handleDecline = async () => {
    if (!confirm("Are you sure you want to decline this request?")) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/invitations/${invitationId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "declined" })
      });

      if (response.ok) {
        router.push("/pro/jobs");
      } else {
        alert("Failed to decline invitation");
      }
    } catch (error) {
      console.error("Error declining invitation:", error);
      alert("An error occurred");
    }
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffHours < 1) return "< 1 hr ago";
    if (diffHours < 24) return `${diffHours} hr ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!invitation || !job) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Request not found</p>
          <button
            onClick={() => router.push("/pro/jobs")}
            className="text-[hsl(var(--primary))] hover:underline"
          >
            Back to Leads
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white overflow-hidden" style={{ height: "calc(100vh - 64px)" }}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 h-full">
        {/* Left Panel - Request Details */}
        <div className="lg:col-span-1 border-r border-gray-100 overflow-y-auto h-full">
          <div className="w-full h-48 mb-4 rounded overflow-hidden bg-gray-200">
            <Map 
              latitude={job.display_latitude}
              longitude={job.display_longitude}
              hasConfirmedAppointment={job.has_confirmed_appointment}
              city={job.city}
            />
          </div>
          <div className="flex flex-col p-6 pt-0">

            {/* Customer Info */}
            <div className="mb-6">
              <div className="flex items-center mb-2">
                <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-700 font-bold text-xl">
                  {customerName.charAt(0)}
                </div>
                <div className="ml-3">
                  <div className="font-semibold text-gray-900">
                    {customerName} - Direct Lead
                  </div>
                  <div className="text-sm text-gray-500">
                    {job.category || "Service Request"}
                  </div>
                </div>
              </div>
              <div className="text-sm text-gray-500">
                • {getTimeAgo(invitation.created_at)}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 mb-6">
              <div className="border border-gray-300 rounded p-3 text-center">
                <div className="flex items-center justify-center mb-1">
                  <Users className="w-4 h-4 mr-1" />
                  <span className="font-bold">1</span>
                </div>
                <div className="text-xs text-gray-600">Pros contacted</div>
              </div>
              <div className="border border-gray-300 rounded p-3 text-center">
                <div className="flex items-center justify-center mb-1">
                  <MessageCircle className="w-4 h-4 mr-1" />
                  <span className="font-bold">0</span>
                </div>
                <div className="text-xs text-gray-600">Pros responded</div>
              </div>
              <div className="border border-gray-300 rounded p-3 text-center">
                <div className="flex items-center justify-center mb-1">
                  <Clock className="w-4 h-4 mr-1" />
                  <span className="font-bold">2d</span>
                </div>
                <div className="text-xs text-gray-600">Til expires</div>
              </div>
            </div>

            {/* Lead Fee Info */}
            <div className="bg-green-50 border border-green-200 rounded p-4 mb-6">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-green-700 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 18 18">
                  <path d="M14.728 1h-4.46c-.601 0-1.167.233-1.596.655L1.668 8.556c-.43.428-.667.999-.668 1.606 0 .608.236 1.179.666 1.609l4.563 4.563a2.276 2.276 0 003.219-.006l6.897-6.999c.424-.428.655-.995.655-1.597V3.273A2.276 2.276 0 0014.728 1z"></path>
                </svg>
                <div>
                  <div className="text-sm font-semibold text-gray-900 mb-1">
                    <span className="text-green-600">Free</span> direct lead
                  </div>
                  <div className="text-xs text-gray-700">
                    This customer requested you specifically. Respond at no cost.
                  </div>
                </div>
              </div>
            </div>

            {/* Job Photos */}
            {job.photos && job.photos.length > 0 && (
              <div className="mb-6">
                <dt className="text-sm font-medium text-gray-500 mb-2">Photos</dt>
                <div className="grid grid-cols-2 gap-2">
                  {job.photos.map((photoUrl, index) => (
                    <div key={index} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200">
                      <img
                        src={photoUrl}
                        alt={`Job photo ${index + 1}`}
                        className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => window.open(photoUrl, '_blank')}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Job Details */}
            <div className="space-y-4">
              {job.description && (
                <div className="border-b border-gray-200 pb-4">
                  <dt className="text-sm font-medium text-gray-500 mb-2">Description</dt>
                  <dd className="text-sm text-gray-900">{job.description}</dd>
                </div>
              )}

              {job.city && (
                <div className="border-b border-gray-200 pb-4">
                  <dt className="text-sm font-medium text-gray-500 mb-2">Location</dt>
                  <dd className="text-sm text-gray-900">
                    {job.city}{job.district && `, ${job.district}`}
                  </dd>
                </div>
              )}

              {job.timing && (
                <div className="border-b border-gray-200 pb-4">
                  <dt className="text-sm font-medium text-gray-500 mb-2">Scheduling preferences</dt>
                  <dd className="text-sm text-gray-900">{job.timing}</dd>
                </div>
              )}

              {job.budget && (
                <div className="border-b border-gray-200 pb-4">
                  <dt className="text-sm font-medium text-gray-500 mb-2">Budget</dt>
                  <dd className="text-sm text-gray-900">{job.budget}</dd>
                </div>
              )}

              {job.zip_code && (
                <div className="border-b border-gray-200 pb-4">
                  <dt className="text-sm font-medium text-gray-500 mb-2">Zip code</dt>
                  <dd className="text-sm text-gray-900">{job.zip_code}</dd>
                </div>
              )}

              <div className="pb-4">
                <dt className="text-sm font-medium text-gray-500 mb-2">Job expires</dt>
                <dd className="text-sm text-gray-900">
                  {new Date(new Date(job.created_at).getTime() + 3 * 24 * 60 * 60 * 1000).toLocaleString()}
                </dd>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Response Area */}
        <div className="border-l border-gray-200 lg:col-span-2 flex flex-col overflow-hidden bg-gray-50">
          <div className="flex-1 p-8 overflow-y-auto">
            {invitation.status === "pending" ? (
              <div className="max-w-2xl mx-auto">
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MessageCircle className="w-8 h-8 text-gray-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Respond to {customerName}'s request
                  </h2>
                  <p className="text-gray-600">
                    Send a message to start the conversation and win this job.
                  </p>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Quick response</h3>
                  <textarea
                    value={messageContent}
                    onChange={(e) => {
                      setMessageContent(e.target.value);
                      setSendError("");
                    }}
                    maxLength={500}
                    className="w-full h-32 px-4 py-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] focus:border-transparent"
                    placeholder="Hi! I'd love to help with your project. I have experience with..."
                  />
                  <div className="flex justify-between items-center mt-4">
                    <span className="text-sm text-gray-500">{messageContent.length}/500 characters</span>
                    {sendError && (
                      <span className="text-sm text-red-600">{sendError}</span>
                    )}
                  </div>
                  <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                    <p className="text-xs text-gray-700">
                      <strong>Note:</strong> For your safety, contact information (emails, phone numbers, URLs) will be automatically removed from messages. Use Mestermind's messaging system to communicate.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={handleDecline}
                    className="flex-1 py-3 px-6 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition"
                  >
                    Pass
                  </button>
                  <button
                    onClick={handleRespond}
                    disabled={responding}
                    className="flex-1 py-3 px-6 bg-[hsl(var(--primary))] text-white rounded-lg font-semibold hover:opacity-90 transition disabled:opacity-50"
                  >
                    {responding ? "Sending..." : "Send Response"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="max-w-2xl mx-auto text-center py-12">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                  invitation.status === "accepted" ? "bg-green-100" : "bg-gray-100"
                }`}>
                  {invitation.status === "accepted" ? (
                    <Check className="w-8 h-8 text-green-600" />
                  ) : (
                    <X className="w-8 h-8 text-gray-600" />
                  )}
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {invitation.status === "accepted" ? "Request Accepted" : "Request Declined"}
                </h2>
                <p className="text-gray-600 mb-6">
                  {invitation.status === "accepted"
                    ? "You've accepted this request. The customer has been notified."
                    : "You've declined this request."}
                </p>
                <button
                  onClick={() => router.push("/pro/jobs")}
                  className="text-[hsl(var(--primary))] hover:underline font-semibold"
                >
                  Back to Leads
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

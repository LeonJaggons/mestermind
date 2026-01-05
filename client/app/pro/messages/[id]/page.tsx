"use client";

import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/lib/contexts/AuthContext";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Send, Calendar, X, CheckCircle2, FileText, Clock, MapPin, User, ChevronDown, ChevronUp, DollarSign, Tag, Calendar as CalendarIcon, Star, Archive } from "lucide-react";
import LeadPurchaseModal from "@/components/LeadPurchaseModal";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CityAutocomplete } from "@/components/CityAutocomplete";
import dynamic from "next/dynamic";
import { useI18n } from "@/lib/contexts/I18nContext";

// Dynamically import Map to avoid SSR issues
const JobLocationMap = dynamic(() => import("@/components/JobLocationMap"), { ssr: false });
import { formatDistanceToNow, format, isToday, isYesterday } from "date-fns";
import { API_BASE_URL } from "@/lib/api/config";

interface Message {
  id: number;
  job_id: number;
  sender_id: number;
  receiver_id: number;
  obfuscated_content: string;
  is_read: boolean;
  is_from_pro: boolean;
  created_at: string;
  contains_contact_info: boolean;
}

interface Job {
  id: number;
  user_id: number;
  description: string;
  service_id: number;
  photos?: string[];
  created_at: string;
  city?: string;
  district?: string;
  street?: string;
  timing?: string;
  budget?: string;
  category?: string;
}

interface User {
  id: number;
  email: string;
}

interface CustomerProfile {
  id: number;
  user_id: number;
  first_name: string;
  last_name: string;
  phone: string;
  city: string;
  district: string;
  street_address?: string;
}

interface Service {
  id: string;
  name: string;
  category_id?: string;
  category?: {
    name: string;
  };
}

export default function ProConversationPage() {
  const { user } = useAuth();
  const params = useParams();
  const searchParams = useSearchParams();
  const { t, language } = useI18n();
  const jobId = params?.id as string;
  const paymentStatus = searchParams.get("payment");
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [job, setJob] = useState<Job | null>(null);
  const [customer, setCustomer] = useState<User | null>(null);
  const [customerProfile, setCustomerProfile] = useState<CustomerProfile | null>(null);
  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);
  const [messageContent, setMessageContent] = useState("");
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [proProfileId, setProProfileId] = useState<number | null>(null);
  const [proMessageCount, setProMessageCount] = useState(0);
  const [leadPurchased, setLeadPurchased] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showScheduleSidebar, setShowScheduleSidebar] = useState(false);
  const [scheduleStep, setScheduleStep] = useState(1);
  const [appointmentDate, setAppointmentDate] = useState("");
  const [appointmentStartTime, setAppointmentStartTime] = useState("");
  const [estimatedDurationMinutes, setEstimatedDurationMinutes] = useState("90");
  const [timeFlexibility, setTimeFlexibility] = useState("±30min");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [accessNote, setAccessNote] = useState("");
  const [pricingType, setPricingType] = useState<"fixed_price" | "hourly_rate">("fixed_price");
  const [quotedAmountHuf, setQuotedAmountHuf] = useState("");
  const [hourlyRateHuf, setHourlyRateHuf] = useState("");
  const [minHours, setMinHours] = useState("");
  const [priceNote, setPriceNote] = useState("");
  const [notifyCustomerBySms, setNotifyCustomerBySms] = useState(true);
  const [notifyCustomerByEmail, setNotifyCustomerByEmail] = useState(true);
  const [reminderMinutesBefore, setReminderMinutesBefore] = useState("60");
  const [proInternalNote, setProInternalNote] = useState("");
  const [savingAppointment, setSavingAppointment] = useState(false);
  const MAX_PRO_MESSAGES = 3;
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const [isArchived, setIsArchived] = useState(false);
  const [isStarred, setIsStarred] = useState(false);
  const [archivingJobId, setArchivingJobId] = useState<number | null>(null);
  const [starringJobId, setStarringJobId] = useState<number | null>(null);

  useEffect(() => {
    // Handle payment status from Stripe redirect
    if (paymentStatus === "success") {
      alert(t("pro.messages.detail.paymentSuccess"));
      // Remove payment parameter from URL
      window.history.replaceState({}, "", `/pro/messages/${jobId}`);
    } else if (paymentStatus === "cancelled") {
      alert(t("pro.messages.detail.paymentCancelled"));
      window.history.replaceState({}, "", `/pro/messages/${jobId}`);
    }
  }, [paymentStatus, jobId, t]);

  useEffect(() => {
    const fetchConversation = async () => {
      if (!user || !jobId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // Get current user data
        const userResponse = await fetch(`${API_BASE_URL}/api/v1/users/firebase/${user.uid}`);
        if (!userResponse.ok) return;
        const userData = await userResponse.json();
        setCurrentUserId(userData.id);

        // Get pro profile
        const proProfileResponse = await fetch(`${API_BASE_URL}/api/v1/pro-profiles?user_id=${userData.id}`);
        if (proProfileResponse.ok) {
          const proProfileData = await proProfileResponse.json();
          if (proProfileData.length > 0) {
            setProProfileId(proProfileData[0].id);

            // Check if lead has been purchased
            const checkResponse = await fetch(
              `${API_BASE_URL}/api/v1/lead-purchases/check?pro_profile_id=${proProfileData[0].id}&job_id=${jobId}`
            );
            if (checkResponse.ok) {
              const checkData = await checkResponse.json();
              setLeadPurchased(checkData.purchased);
            }

            // Check if conversation is archived
            const archivedCheckResponse = await fetch(
              `${API_BASE_URL}/api/v1/archived-conversations/pro-profile/${proProfileData[0].id}/check/${jobId}`
            );
            if (archivedCheckResponse.ok) {
              const archivedCheckData = await archivedCheckResponse.json();
              setIsArchived(archivedCheckData.archived || false);
            }

            // Check if conversation is starred
            const starredCheckResponse = await fetch(
              `${API_BASE_URL}/api/v1/starred-conversations/pro-profile/${proProfileData[0].id}/check/${jobId}`
            );
            if (starredCheckResponse.ok) {
              const starredCheckData = await starredCheckResponse.json();
              setIsStarred(starredCheckData.starred || false);
            }
          } else {
            console.warn("No pro profile found for user:", userData.id, "- Payment will not be available");
          }
        } else {
          console.error("Failed to fetch pro profile:", proProfileResponse.status);
        }

        // Get job details
        const jobResponse = await fetch(`${API_BASE_URL}/api/v1/jobs/${jobId}`);
        if (jobResponse.ok) {
          const jobData = await jobResponse.json();
          setJob(jobData);

          // Get service details
          if (jobData.service_id) {
            try {
              const serviceResponse = await fetch(`${API_BASE_URL}/api/v1/services/${jobData.service_id}?language=${language}`);
              if (serviceResponse.ok) {
                const serviceData = await serviceResponse.json();
                setService(serviceData);
              } else {
                console.error("Failed to fetch service:", serviceResponse.status, serviceResponse.statusText);
              }
            } catch (error) {
              console.error("Error fetching service:", error);
            }
          }

          // Get customer details
          const customerResponse = await fetch(`${API_BASE_URL}/api/v1/users/${jobData.user_id}`);
          if (customerResponse.ok) {
            const customerData = await customerResponse.json();
            setCustomer(customerData);
          } else {
            console.error("Failed to fetch customer:", customerResponse.status, customerResponse.statusText);
          }

          // Get customer profile
          const customerProfileResponse = await fetch(`${API_BASE_URL}/api/v1/customer-profiles?user_id=${jobData.user_id}`);
          if (customerProfileResponse.ok) {
            const customerProfileData = await customerProfileResponse.json();
            if (customerProfileData.length > 0) {
              setCustomerProfile(customerProfileData[0]);
            }
          } else if (customerProfileResponse.status !== 404) {
            // Only log errors that aren't "profile not found" (404 is expected for new customers)
            console.error("Failed to fetch customer profile:", customerProfileResponse.status, customerProfileResponse.statusText);
          }
        } else {
          console.error("Failed to fetch job:", jobResponse.status, jobResponse.statusText);
        }

        // Get messages for this job
        const messagesResponse = await fetch(`${API_BASE_URL}/api/v1/messages?job_id=${jobId}`);
        if (messagesResponse.ok) {
          const messagesData = await messagesResponse.json();
          setMessages(messagesData);

          // Count pro messages
          const proMsgCount = messagesData.filter((m: Message) => m.is_from_pro && m.sender_id === userData.id).length;
          setProMessageCount(proMsgCount);

          // Mark messages as read
          for (const msg of messagesData) {
            if (!msg.is_from_pro && !msg.is_read && msg.receiver_id === userData.id) {
              await fetch(`${API_BASE_URL}/api/v1/messages/${msg.id}/read`, {
                method: "PATCH",
              });
            }
          }
        }
      } catch (error) {
        console.error("Error fetching conversation:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchConversation();
  }, [user, jobId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!messageContent.trim() || !currentUserId || !job) return;

    // Check if pro has reached message limit (unless lead is purchased)
    if (proMessageCount >= MAX_PRO_MESSAGES && !leadPurchased) {
      alert(t("pro.messages.detail.maxMessagesReached"));
      return;
    }

    setSending(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/messages?sender_id=${currentUserId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_id: parseInt(jobId),
          receiver_id: job.user_id,
          content: messageContent,
        }),
      });

      if (response.ok) {
        const newMessage = await response.json();
        
        if (newMessage.contains_contact_info) {
          alert(t("pro.messages.detail.contactInfoRemovedAlert"));
        }

        setMessages([...messages, newMessage]);
        setProMessageCount(proMessageCount + 1);
        setMessageContent("");
      }
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setSending(false);
    }
  };

  const handleArchive = async () => {
    if (!proProfileId || !jobId || archivingJobId) return;

    try {
      setArchivingJobId(parseInt(jobId));
      const response = await fetch(`${API_BASE_URL}/api/v1/archived-conversations/`, {
        method: isArchived ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pro_profile_id: proProfileId,
          job_id: parseInt(jobId)
        }),
      });

      if (response.ok || response.status === 204) {
        setIsArchived(!isArchived);
      }
    } catch (error) {
      console.error("Error toggling archive:", error);
    } finally {
      setArchivingJobId(null);
    }
  };

  const handleStar = async () => {
    if (!proProfileId || !jobId || starringJobId) return;

    try {
      setStarringJobId(parseInt(jobId));
      const response = await fetch(`${API_BASE_URL}/api/v1/starred-conversations/`, {
        method: isStarred ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pro_profile_id: proProfileId,
          job_id: parseInt(jobId)
        }),
      });

      if (response.ok || response.status === 204) {
        setIsStarred(!isStarred);
      }
    } catch (error) {
      console.error("Error toggling star:", error);
    } finally {
      setStarringJobId(null);
    }
  };

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [messages.length]);

  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isToday(date)) {
        return format(date, "h:mm a");
      } else if (isYesterday(date)) {
        return t("pro.messages.detail.yesterday");
      } else {
        return format(date, "MMM d, h:mm a");
      }
    } catch {
      return dateString;
    }
  };

  const formatDateHeader = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isToday(date)) {
        return t("pro.messages.detail.today");
      } else if (isYesterday(date)) {
        return t("pro.messages.detail.yesterday");
      } else {
        return format(date, "EEEE, MMMM d");
      }
    } catch {
      return "";
    }
  };

  // Group messages by date
  const groupedMessages = messages.reduce((groups, message) => {
    const date = new Date(message.created_at).toDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {} as Record<string, Message[]>);

  const handleScheduleAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!appointmentDate || !appointmentStartTime || !jobId || !currentUserId || !proProfileId) {
      alert(t("pro.messages.detail.fillRequiredFields"));
      return;
    }

    setSavingAppointment(true);
    try {
      // Build appointment data
      const appointmentData = {
        jobId: parseInt(jobId),
        customerId: job?.user_id,
        proId: proProfileId,
        serviceCategory: "Plumbing", // TODO: Get from job
        appointmentDate,
        appointmentStartTime,
        estimatedDurationMinutes: parseInt(estimatedDurationMinutes),
        timeFlexibility,
        address: {
          addressLine1,
          addressLine2,
          city: city || customerProfile?.city || "",
          postalCode: postalCode || "",
        },
        accessNote,
        pricing: {
          pricingType,
          quotedAmountHuf: pricingType === "fixed_price" ? parseInt(quotedAmountHuf) : null,
          hourlyRateHuf: pricingType === "hourly_rate" ? parseInt(hourlyRateHuf) : null,
          minHours: pricingType === "hourly_rate" && minHours ? parseInt(minHours) : null,
          priceNote,
        },
        status: "pending_customer_confirmation",
        notifyCustomerBySms,
        notifyCustomerByEmail,
        reminderMinutesBefore: parseInt(reminderMinutesBefore),
        proInternalNote,
      };

      // Save appointment to backend API
      const appointmentResponse = await fetch(`${API_BASE_URL}/api/v1/appointments/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_id: appointmentData.jobId,
          customer_id: appointmentData.customerId,
          pro_id: appointmentData.proId,
          service_category: appointmentData.serviceCategory,
          appointment_date: appointmentData.appointmentDate,
          appointment_start_time: appointmentData.appointmentStartTime,
          estimated_duration_minutes: appointmentData.estimatedDurationMinutes,
          time_flexibility: appointmentData.timeFlexibility,
          address_line1: appointmentData.address.addressLine1,
          address_line2: appointmentData.address.addressLine2,
          city: appointmentData.address.city,
          postal_code: appointmentData.address.postalCode,
          access_note: appointmentData.accessNote,
          pricing_type: appointmentData.pricing.pricingType,
          quoted_amount_huf: appointmentData.pricing.quotedAmountHuf,
          hourly_rate_huf: appointmentData.pricing.hourlyRateHuf,
          min_hours: appointmentData.pricing.minHours,
          price_note: appointmentData.pricing.priceNote,
          notify_customer_by_sms: appointmentData.notifyCustomerBySms,
          notify_customer_by_email: appointmentData.notifyCustomerByEmail,
          reminder_minutes_before: appointmentData.reminderMinutesBefore,
          pro_internal_note: appointmentData.proInternalNote,
        }),
      });

      if (!appointmentResponse.ok) {
        const errorData = await appointmentResponse.json().catch(() => ({ detail: "Failed to save appointment" }));
        throw new Error(errorData.detail || "Failed to save appointment");
      }

      const savedAppointment = await appointmentResponse.json();

      // Send formatted message to customer
      const messageContent = `📅 ${t("pro.messages.detail.appointmentScheduledLabel")}\n\n` +
        `${t("pro.messages.detail.appointmentDateLabel")} ${appointmentDate}\n` +
        `${t("pro.messages.detail.appointmentTimeLabel")} ${appointmentStartTime}\n` +
        `${t("pro.messages.detail.appointmentDurationLabel")} ${estimatedDurationMinutes} ${t("pro.messages.time.minutes")}\n` +
        (timeFlexibility ? `${t("pro.messages.detail.appointmentFlexibilityLabel")} ${timeFlexibility}\n` : '') +
        (addressLine1 ? `${t("pro.messages.detail.appointmentAddressLabel")} ${addressLine1}${addressLine2 ? ', ' + addressLine2 : ''}, ${city} ${postalCode}\n` : '') +
        (accessNote ? `${t("pro.messages.detail.appointmentAccessLabel")} ${accessNote}\n` : '') +
        (pricingType === "fixed_price" && quotedAmountHuf ? `${t("pro.messages.detail.appointmentPriceLabel")} ${parseInt(quotedAmountHuf).toLocaleString()} HUF\n` : '') +
        (pricingType === "hourly_rate" && hourlyRateHuf ? `${t("pro.messages.detail.appointmentRateLabel")} ${parseInt(hourlyRateHuf).toLocaleString()} HUF/${t("pro.messages.time.hours")}${minHours ? ` (${t("pro.messages.detail.appointmentMinHours")} ${minHours} ${t("pro.messages.detail.appointmentHours")})` : ''}\n` : '') +
        (priceNote ? `${t("pro.messages.detail.appointmentPricingNoteLabel")} ${priceNote}\n` : '');

      const response = await fetch(`${API_BASE_URL}/api/v1/messages?sender_id=${currentUserId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_id: parseInt(jobId),
          receiver_id: job?.user_id,
          content: messageContent,
        }),
      });

      if (response.ok) {
        const newMessage = await response.json();
        setMessages([...messages, newMessage]);
        setProMessageCount(proMessageCount + 1);
        
        // Reset form
        setScheduleStep(1);
        setAppointmentDate("");
        setAppointmentStartTime("");
        setEstimatedDurationMinutes("90");
        setTimeFlexibility("±30min");
        setAddressLine1("");
        setAddressLine2("");
        setCity("");
        setPostalCode("");
        setAccessNote("");
        setPricingType("fixed_price");
        setQuotedAmountHuf("");
        setHourlyRateHuf("");
        setMinHours("");
        setPriceNote("");
        setNotifyCustomerBySms(true);
        setNotifyCustomerByEmail(true);
        setReminderMinutesBefore("60");
        setProInternalNote("");
        setShowScheduleSidebar(false);
        setScheduleStep(1);
        
        alert(t("pro.messages.detail.appointmentScheduled"));
      } else {
        alert(t("pro.messages.detail.appointmentFailed"));
      }
    } catch (error) {
      console.error("Error scheduling appointment:", error);
      alert(t("pro.messages.detail.appointmentFailed"));
    } finally {
      setSavingAppointment(false);
    }
  };

  const handleScheduleNext = () => {
    if (scheduleStep < 5) {
      setScheduleStep(scheduleStep + 1);
    }
  };

  const handleScheduleBack = () => {
    if (scheduleStep > 1) {
      setScheduleStep(scheduleStep - 1);
    }
  };

  return (
    <div className="flex h-[calc(100vh-120px)] relative">
      {/* Main Content Area */}
      <div className={`flex flex-1 overflow-hidden h-full ${showScheduleSidebar ? 'gap-4' : ''}`}>
        <div className={`relative bg-gray-50 flex-1 flex min-w-0 min-h-0`}>
        {loading ? (
          <div className="flex justify-center items-center h-full w-full">
            <p className="text-gray-500">{t("pro.messages.detail.loading")}</p>
          </div>
        ) : (
          <>
            {/* Main Conversation Area */}
            <div className="flex-1 flex flex-col bg-white border-r border-gray-200 min-h-0 min-w-0">
              {/* Enhanced Header */}
              <div className="border-b border-gray-200 bg-white px-6 py-4 flex items-center justify-between sticky top-0 z-10 flex-shrink-0">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <Link href="/pro/messages" className="text-gray-600 hover:text-gray-900 flex-shrink-0">
                  <ArrowLeft className="w-5 h-5" />
                </Link>
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-[hsl(var(--primary)/0.1)] flex items-center justify-center text-[hsl(var(--primary))] font-bold flex-shrink-0">
                    {customerProfile ? `${customerProfile.first_name?.charAt(0) || ""}${customerProfile.last_name?.charAt(0) || ""}`.toUpperCase() || "C" : "C"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="font-semibold text-lg truncate">
                      {service?.name || job?.category || t("pro.messages.detail.customer")}
                    </h2>
                    <p className="text-sm text-gray-600 truncate">{job?.description || t("pro.messages.detail.jobRequest")}</p>
                    {leadPurchased && (customer || customerProfile) && (
                      <div className="mt-2 flex flex-wrap gap-3 text-xs">
                        {customer?.email && (
                          <a href={`mailto:${customer.email}`} className="flex items-center gap-1.5 text-[hsl(var(--primary))] hover:underline">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            {t("pro.messages.detail.email")}
                          </a>
                        )}
                        {customerProfile?.phone && (
                          <a href={`tel:${customerProfile.phone}`} className="flex items-center gap-1.5 text-[hsl(var(--primary))] hover:underline">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            {t("pro.messages.detail.call")}
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={handleStar}
                  disabled={starringJobId === parseInt(jobId || "0")}
                  className={`p-2 rounded transition-colors ${
                    isStarred
                      ? "text-yellow-500 hover:text-yellow-600"
                      : "text-gray-400 hover:text-gray-600"
                  } hover:bg-gray-100`}
                  title={isStarred ? t("pro.messages.unstar") : t("pro.messages.star")}
                >
                  <Star className={`w-5 h-5 ${isStarred ? "fill-current" : ""}`} />
                </button>
                <button
                  onClick={handleArchive}
                  disabled={archivingJobId === parseInt(jobId || "0")}
                  className={`p-2 rounded transition-colors ${
                    isArchived
                      ? "text-gray-600 hover:text-gray-700"
                      : "text-gray-400 hover:text-gray-600"
                  } hover:bg-gray-100`}
                  title={isArchived ? t("pro.messages.unarchive") : t("pro.messages.archive")}
                >
                  <Archive className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div 
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto px-6 py-6 bg-gray-50 min-h-0"
            >
              {messages.length === 0 ? (
                <div className="flex flex-col justify-center items-center h-full text-center">
                  <div className="rounded-full bg-gray-200 w-16 h-16 mb-4 flex items-center justify-center">
                    <svg height="32" width="32" fill="currentColor" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg">
                      <path d="M24 22c0 .551-.449 1-1 1H5c-.551 0-1-.449-1-1v-5h6.126A4.01 4.01 0 0014 20a4.01 4.01 0 003.874-3H24v5zM5.847 5h16.306l1.666 10H16v1c0 1.103-.897 2-2 2s-2-.897-2-2v-1H4.181L5.847 5zm18-2H4.153L2.014 15.835v.099C2.012 15.957 2 15.977 2 16c0 .023.012.042.013.065L2 22c0 1.654 1.346 3 3 3h18c1.654 0 3-1.346 3-3v-6L23.847 3z"></path>
                    </svg>
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{t("pro.messages.detail.noMessagesYet")}</h3>
                  <p className="text-gray-600 text-sm max-w-sm">
                    {t("pro.messages.detail.startConversation")}
                  </p>
                </div>
              ) : (
                <div className="space-y-6 max-w-4xl mx-auto">
                  {Object.entries(groupedMessages).map(([dateKey, dateMessages]) => (
                    <div key={dateKey}>
                      {/* Date Header */}
                      <div className="flex items-center justify-center my-6">
                        <div className="bg-white px-3 py-1 rounded-full border border-gray-200 text-xs font-medium text-gray-600">
                          {formatDateHeader(dateMessages[0].created_at)}
                        </div>
                      </div>
                      
                      {/* Messages for this date */}
                      <div className="space-y-4">
                        {dateMessages.map((message, idx) => {
                          const isOwn = message.is_from_pro;
                          const prevMessage = idx > 0 ? dateMessages[idx - 1] : null;
                          const showAvatar = !prevMessage || prevMessage.is_from_pro !== message.is_from_pro || 
                            new Date(message.created_at).getTime() - new Date(prevMessage.created_at).getTime() > 300000; // 5 minutes
                          
                          // Count how many pro messages have been sent before this message
                          const messageIndex = messages.findIndex(m => m.id === message.id);
                          const proMessagesBeforeThis = messages.slice(0, messageIndex).filter(m => m.is_from_pro).length;
                          const shouldBlur = !isOwn && proMessagesBeforeThis >= MAX_PRO_MESSAGES && !leadPurchased;
                          
                          return (
                            <div
                              key={message.id}
                              className={`flex gap-3 ${isOwn ? "justify-end" : "justify-start"} items-end`}
                            >
                              {!isOwn && (
                                <div className="flex-shrink-0">
                                  {showAvatar ? (
                                    <div className="w-8 h-8 rounded-full bg-[hsl(var(--primary)/0.1)] flex items-center justify-center text-[hsl(var(--primary))] font-semibold text-sm">
                                      {customerProfile ? `${customerProfile.first_name?.charAt(0) || ""}`.toUpperCase() || "C" : "C"}
                                    </div>
                                  ) : (
                                    <div className="w-8 h-8"></div>
                                  )}
                                </div>
                              )}
                              <div className={`flex flex-col ${isOwn ? "items-end" : "items-start"} max-w-[70%]`}>
                                <div
                                  className={`rounded-2xl px-4 py-2.5 shadow-sm relative ${
                                    isOwn
                                      ? "bg-[hsl(var(--primary))] text-white rounded-br-sm"
                                      : "bg-white text-gray-900 border border-gray-200 rounded-bl-sm"
                                  } ${shouldBlur ? "overflow-hidden" : ""}`}
                                >
                                  {shouldBlur ? (
                                    <>
                                      <p className="text-sm whitespace-pre-wrap blur-sm select-none">
                                        This is a hidden message from the customer that you can view after purchasing this lead.
                                      </p>
                                      <div className="absolute inset-0 flex items-center justify-center bg-white/90 rounded-2xl">
                                        <div className="text-center px-4">
                                          <svg className="w-8 h-8 mx-auto mb-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                          </svg>
                                          <p className="text-xs font-semibold text-gray-700">{t("pro.messages.detail.purchaseLeadToView")}</p>
                                        </div>
                                      </div>
                                    </>
                                  ) : (
                                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.obfuscated_content}</p>
                                  )}
                                </div>
                                <p
                                  className={`text-xs mt-1 px-1 ${
                                    isOwn ? "text-gray-500" : shouldBlur ? "text-gray-400 blur-sm" : "text-gray-400"
                                  }`}
                                >
                                  {formatTime(message.created_at)}
                                  {isOwn && message.is_read && (
                                    <CheckCircle2 className="inline-block w-3 h-3 ml-1 text-gray-400" />
                                  )}
                                </p>
                              </div>
                              {isOwn && (
                                <div className="flex-shrink-0">
                                  {showAvatar ? (
                                    <div className="w-8 h-8 rounded-full bg-[hsl(var(--primary)/0.1)] flex items-center justify-center text-[hsl(var(--primary))] font-semibold text-sm">
                                      {t("pro.messages.detail.you")}
                                    </div>
                                  ) : (
                                    <div className="w-8 h-8"></div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}

              {/* Message Limit Alert - moved outside messages list */}
              {proMessageCount >= MAX_PRO_MESSAGES && !leadPurchased && (
                <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg max-w-4xl mx-auto">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      <svg className="w-5 h-5 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-amber-900 mb-1">
                        {t("pro.messages.detail.messageLimitReached")}
                      </h3>
                      <p className="text-sm text-amber-800 mb-3">
                        {t("pro.messages.detail.messageLimitDescription")}
                      </p>
                      <button
                        onClick={() => {
                          if (!proProfileId) {
                            alert(t("pro.messages.detail.createProProfileFirst"));
                            return;
                          }
                          setShowPurchaseModal(true);
                        }}
                        className="inline-flex items-center px-4 py-2 bg-[hsl(var(--primary))] text-white text-sm font-semibold rounded-lg hover:opacity-90 transition"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                        </svg>
                        {t("pro.messages.detail.payForLeadAccess")}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Enhanced Message Input */}
            <div className="border-t border-gray-200 bg-white px-6 py-4 flex-shrink-0">
              {/* Message Counter */}
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs text-gray-500">
                  {t("pro.messages.detail.contactInfoRemoved")}
                </p>
                <div className="flex items-center gap-2">
                  {leadPurchased ? (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      {t("pro.messages.detail.leadPurchased")}
                    </span>
                  ) : (
                    <>
                      <span className={`text-xs font-semibold ${proMessageCount >= MAX_PRO_MESSAGES ? 'text-red-600' : 'text-gray-600'}`}>
                        {proMessageCount}/{MAX_PRO_MESSAGES} {t("pro.messages.detail.messages")}
                      </span>
                      {proMessageCount >= MAX_PRO_MESSAGES && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          {t("pro.messages.detail.limitReached")}
                        </span>
                      )}
                    </>
                  )}
                </div>
              </div>

              <form onSubmit={handleSendMessage} className="flex gap-3 items-end">
                <div className="flex-1 relative">
                  <textarea
                    value={messageContent}
                    onChange={(e) => setMessageContent(e.target.value)}
                    placeholder={proMessageCount >= MAX_PRO_MESSAGES && !leadPurchased ? t("pro.messages.detail.purchaseLeadToContinue") : t("pro.messages.detail.typeMessage")}
                    rows={1}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] focus:border-transparent resize-none max-h-32 overflow-y-auto disabled:bg-gray-50 disabled:cursor-not-allowed"
                    disabled={sending || (proMessageCount >= MAX_PRO_MESSAGES && !leadPurchased)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        if (!(proMessageCount >= MAX_PRO_MESSAGES && !leadPurchased)) {
                          handleSendMessage(e);
                        }
                      }
                    }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={!messageContent.trim() || sending || (proMessageCount >= MAX_PRO_MESSAGES && !leadPurchased)}
                  className="px-6 py-3 bg-[hsl(var(--primary))] text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium transition-all flex-shrink-0"
                >
                  {sending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      {t("pro.messages.detail.sending")}
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      {t("pro.messages.detail.send")}
                    </>
                  )}
                </button>
              </form>
            </div>
            </div>

            {/* Job Context Panel */}
            {job && (
              <div className="w-90 bg-white border-l border-gray-200 overflow-y-auto flex-shrink-0 h-full flex flex-col">
                <div className="flex-1">
                  
                  {/* Collapsible Map */}
                  {(job.city || job.district || customerProfile?.city || customerProfile?.district) && (
                     
                        <div className="h-64 w-full">
                          <JobLocationMap 
                            city={job.city || customerProfile?.city}
                            district={job.district || customerProfile?.district}
                            street={job.street || customerProfile?.street_address}
                          />
                        </div>
                  )}
                  <div className="p-6">


                  {/* Full Address */}
                  {(job.street || job.district || job.city || customerProfile?.street_address || customerProfile?.city || customerProfile?.district) && (
                    <div className="mb-6">
                      <div className="flex items-start gap-3">
                        <MapPin className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900 mb-1">{t("pro.messages.detail.address")}</p>
                          <p className="text-sm text-gray-600 leading-relaxed">
                            {[
                              job.street || customerProfile?.street_address,
                              job.district || customerProfile?.district,
                              job.city || customerProfile?.city
                            ].filter(Boolean).join(", ") || t("pro.messages.detail.addressNotProvided")}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Job Description */}
                  <div className="mb-6">
                    <div className="flex items-start gap-3">
                      <FileText className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 mb-1">{t("pro.messages.detail.description")}</p>
                        <p className="text-sm text-gray-600 leading-relaxed">{job.description || t("pro.messages.detail.noDescription")}</p>
                      </div>
                    </div>
                  </div>

                  {/* Category */}
                  {job.category && (
                    <div className="mb-6">
                      <div className="flex items-center gap-3">
                        <Tag className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900 mb-1">{t("pro.messages.detail.category")}</p>
                          <p className="text-sm text-gray-600">{job.category}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Timing */}
                  {job.timing && (
                    <div className="mb-6">
                      <div className="flex items-center gap-3">
                        <CalendarIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900 mb-1">{t("pro.messages.detail.timing")}</p>
                          <p className="text-sm text-gray-600">{job.timing}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Budget */}
                  {job.budget && (
                    <div className="mb-6">
                      <div className="flex items-center gap-3">
                        <DollarSign className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900 mb-1">{t("pro.messages.detail.budget")}</p>
                          <p className="text-sm text-gray-600">{job.budget}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Job Photos */}
                  {job.photos && job.photos.length > 0 && (
                    <div className="mb-6">
                      <p className="text-sm font-medium text-gray-900 mb-2">{t("pro.messages.detail.photos")} ({job.photos.length})</p>
                      <div className="grid grid-cols-2 gap-2">
                        {job.photos.slice(0, 4).map((photoUrl, index) => (
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
                      {job.photos.length > 4 && (
                        <p className="text-xs text-gray-500 mt-2">+{job.photos.length - 4} {t("pro.messages.detail.morePhotos")}</p>
                      )}
                    </div>
                  )}

                  {/* Job Created Date */}
                  <div className="mb-6">
                    <div className="flex items-center gap-3">
                      <Clock className="w-5 h-5 text-gray-400 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 mb-1">{t("pro.messages.detail.posted")}</p>
                        <p className="text-sm text-gray-600">
                          {job.created_at ? formatDistanceToNow(new Date(job.created_at), { addSuffix: true }) : t("pro.messages.detail.recently")}
                        </p>
                        {job.created_at && (
                          <p className="text-xs text-gray-500 mt-0.5">
                            {format(new Date(job.created_at), "MMM d, yyyy 'at' h:mm a")}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  </div>
                </div>

                {/* Quick Actions - Fixed at bottom */}
                <div className="p-6 pt-0 border-t border-gray-200 bg-white">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3 mt-4">{t("pro.messages.detail.quickActions")}</h4>
                  <div className="space-y-2">
                    {!leadPurchased && proProfileId && (
                      <button
                        onClick={() => setShowPurchaseModal(true)}
                        className="block w-full px-4 py-2 text-sm text-center bg-[hsl(var(--primary))] text-white rounded-lg hover:opacity-90 transition"
                      >
                        {t("pro.messages.detail.purchaseLead")}
                      </button>
                    )}
                    {leadPurchased && (
                      <button
                        onClick={() => setShowScheduleSidebar(true)}
                        className="block w-full px-4 py-2 text-sm text-center bg-[hsl(var(--primary))] text-white rounded-lg hover:opacity-90 transition"
                      >
                        {t("pro.messages.detail.scheduleAppointment")}
                      </button>
                    )}
                    <Link
                      href={`/pro/appointments`}
                      className="block w-full px-4 py-2 text-sm text-center border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                    >
                      {t("pro.messages.detail.viewAppointments")}
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        </div>

        {/* Schedule Appointment Dialog */}
        <Dialog open={showScheduleSidebar} onOpenChange={(open) => {
          setShowScheduleSidebar(open);
          if (!open) {
            setScheduleStep(1);
          }
        }}>
          <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0">
            {/* Header */}
            <DialogHeader className="px-6 py-4 border-b border-gray-300 flex-shrink-0">
              <DialogTitle className="text-lg font-semibold text-gray-900">
                {t("pro.messages.detail.scheduleAppointment")}
              </DialogTitle>
              <p className="text-xs text-gray-500 mt-1">{t("pro.messages.detail.scheduleStep")} {scheduleStep} {t("pro.messages.detail.scheduleOf")} 5</p>
            </DialogHeader>

            {/* Progress Indicator */}
            <div className="px-6 py-3 border-b border-gray-200 bg-gray-50 flex-shrink-0">
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((step) => (
                  <div
                    key={step}
                    className={`flex-1 h-1 rounded ${
                      step <= scheduleStep
                        ? "bg-[hsl(var(--primary))]"
                        : "bg-gray-300"
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Form */}
            <form onSubmit={scheduleStep === 5 ? handleScheduleAppointment : (e) => { e.preventDefault(); handleScheduleNext(); }} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto px-6 py-6">
              {/* Step 1: Date & Time */}
              {scheduleStep === 1 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-md font-semibold text-gray-900 mb-4">{t("pro.messages.detail.dateTime")}</h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          {t("pro.messages.detail.date")} <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          value={appointmentDate}
                          onChange={(e) => setAppointmentDate(e.target.value)}
                          min={new Date().toISOString().split('T')[0]}
                          required
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[hsl(var(--primary))]"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          {t("pro.messages.detail.startTime")} <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="time"
                          value={appointmentStartTime}
                          onChange={(e) => setAppointmentStartTime(e.target.value)}
                          required
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[hsl(var(--primary))]"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          {t("pro.messages.detail.estimatedDuration")}
                        </label>
                        <select
                          value={estimatedDurationMinutes}
                          onChange={(e) => setEstimatedDurationMinutes(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[hsl(var(--primary))]"
                        >
                          <option value="30">30 {t("pro.messages.time.minutes")}</option>
                          <option value="60">1 {t("pro.messages.time.hours")}</option>
                          <option value="90">1.5 {t("pro.messages.time.hours")}</option>
                          <option value="120">2 {t("pro.messages.time.hours")}</option>
                          <option value="180">3 {t("pro.messages.time.hours")}</option>
                          <option value="240">4 {t("pro.messages.time.hours")}</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          {t("pro.messages.detail.timeFlexibility")}
                        </label>
                        <select
                          value={timeFlexibility}
                          onChange={(e) => setTimeFlexibility(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[hsl(var(--primary))]"
                        >
                          <option value="exact">{t("pro.messages.detail.exactTime")}</option>
                          <option value="±15min">±15 {t("pro.messages.time.minutes")}</option>
                          <option value="±30min">±30 {t("pro.messages.time.minutes")}</option>
                          <option value="±1hour">±1 {t("pro.messages.time.hours")}</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Location */}
              {scheduleStep === 2 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-md font-semibold text-gray-900 mb-4">{t("pro.messages.detail.location")}</h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          {t("pro.messages.detail.addressLine1")} <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={addressLine1}
                          onChange={(e) => setAddressLine1(e.target.value)}
                          placeholder={customerProfile?.street_address || t("pro.messages.detail.streetAddress")}
                          required
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[hsl(var(--primary))]"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          {t("pro.messages.detail.addressLine2")}
                        </label>
                        <input
                          type="text"
                          value={addressLine2}
                          onChange={(e) => setAddressLine2(e.target.value)}
                          placeholder={t("pro.messages.detail.apartmentSuite")}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[hsl(var(--primary))]"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            {t("pro.messages.detail.city")} <span className="text-red-500">*</span>
                          </label>
                          <CityAutocomplete
                            value={city}
                            onChange={setCity}
                            placeholder={customerProfile?.city || t("pro.messages.detail.city")}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[hsl(var(--primary))]"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            {t("pro.messages.detail.postalCode")}
                          </label>
                          <input
                            type="text"
                            value={postalCode}
                            onChange={(e) => setPostalCode(e.target.value)}
                            placeholder={t("pro.messages.detail.postalCodePlaceholder")}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[hsl(var(--primary))]"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          {t("pro.messages.detail.accessNotes")}
                        </label>
                        <textarea
                          value={accessNote}
                          onChange={(e) => setAccessNote(e.target.value)}
                          placeholder={t("pro.messages.detail.accessNotesPlaceholder")}
                          rows={3}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[hsl(var(--primary))] resize-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Pricing */}
              {scheduleStep === 3 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-md font-semibold text-gray-900 mb-4">{t("pro.messages.detail.pricing")}</h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          {t("pro.messages.detail.pricingType")} <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={pricingType}
                          onChange={(e) => setPricingType(e.target.value as "fixed_price" | "hourly_rate")}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[hsl(var(--primary))]"
                        >
                          <option value="fixed_price">{t("pro.messages.detail.fixedPrice")}</option>
                          <option value="hourly_rate">{t("pro.messages.detail.hourlyRate")}</option>
                        </select>
                      </div>

                      {pricingType === "fixed_price" ? (
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            {t("pro.messages.detail.quotedAmount")} <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="number"
                            value={quotedAmountHuf}
                            onChange={(e) => setQuotedAmountHuf(e.target.value)}
                            placeholder="25000"
                            required
                            min="0"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[hsl(var(--primary))]"
                          />
                        </div>
                      ) : (
                        <>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              {t("pro.messages.detail.hourlyRateHuf")} <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="number"
                              value={hourlyRateHuf}
                              onChange={(e) => setHourlyRateHuf(e.target.value)}
                              placeholder="5000"
                              required
                              min="0"
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[hsl(var(--primary))]"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              {t("pro.messages.detail.minimumHours")}
                            </label>
                            <input
                              type="number"
                              value={minHours}
                              onChange={(e) => setMinHours(e.target.value)}
                              placeholder="2"
                              min="0"
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[hsl(var(--primary))]"
                            />
                          </div>
                        </>
                      )}

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          {t("pro.messages.detail.priceNote")}
                        </label>
                        <textarea
                          value={priceNote}
                          onChange={(e) => setPriceNote(e.target.value)}
                          placeholder={t("pro.messages.detail.priceNotePlaceholder")}
                          rows={3}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[hsl(var(--primary))] resize-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4: Notifications */}
              {scheduleStep === 4 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-md font-semibold text-gray-900 mb-4">{t("pro.messages.detail.notificationsReminders")}</h3>
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 border border-gray-300 rounded-lg">
                        <div>
                          <label className="text-sm font-semibold text-gray-700">{t("pro.messages.detail.notifyBySms")}</label>
                          <p className="text-xs text-gray-500">{t("pro.messages.detail.notifyBySmsDescription")}</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={notifyCustomerBySms}
                          onChange={(e) => setNotifyCustomerBySms(e.target.checked)}
                          className="w-5 h-5 text-[hsl(var(--primary))] rounded focus:ring-[hsl(var(--primary))]"
                        />
                      </div>

                      <div className="flex items-center justify-between p-4 border border-gray-300 rounded-lg">
                        <div>
                          <label className="text-sm font-semibold text-gray-700">{t("pro.messages.detail.notifyByEmail")}</label>
                          <p className="text-xs text-gray-500">{t("pro.messages.detail.notifyByEmailDescription")}</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={notifyCustomerByEmail}
                          onChange={(e) => setNotifyCustomerByEmail(e.target.checked)}
                          className="w-5 h-5 text-[hsl(var(--primary))] rounded focus:ring-[hsl(var(--primary))]"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          {t("pro.messages.detail.reminderMinutesBefore")}
                        </label>
                        <select
                          value={reminderMinutesBefore}
                          onChange={(e) => setReminderMinutesBefore(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[hsl(var(--primary))]"
                        >
                          <option value="15">15 {t("pro.messages.time.minutes")}</option>
                          <option value="30">30 {t("pro.messages.time.minutes")}</option>
                          <option value="60">1 {t("pro.messages.time.hours")}</option>
                          <option value="120">2 {t("pro.messages.time.hours")}</option>
                          <option value="1440">1 {t("pro.messages.time.days")}</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 5: Internal Notes & Review */}
              {scheduleStep === 5 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-md font-semibold text-gray-900 mb-4">{t("pro.messages.detail.internalNotesReview")}</h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          {t("pro.messages.detail.internalNote")}
                        </label>
                        <textarea
                          value={proInternalNote}
                          onChange={(e) => setProInternalNote(e.target.value)}
                          placeholder={t("pro.messages.detail.internalNotePlaceholder")}
                          rows={4}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[hsl(var(--primary))] resize-none"
                        />
                        <p className="mt-1 text-xs text-gray-500">{t("pro.messages.detail.internalNoteDescription")}</p>
                      </div>

                      {/* Review Summary */}
                      <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                        <h4 className="text-sm font-semibold text-gray-900">{t("pro.messages.detail.appointmentSummary")}</h4>
                        <div className="space-y-2 text-sm text-gray-600">
                          <p><strong>{t("pro.messages.detail.summaryDate")}</strong> {appointmentDate || t("pro.messages.detail.notSet")}</p>
                          <p><strong>{t("pro.messages.detail.summaryTime")}</strong> {appointmentStartTime || t("pro.messages.detail.notSet")}</p>
                          <p><strong>{t("pro.messages.detail.summaryDuration")}</strong> {estimatedDurationMinutes} {t("pro.messages.time.minutes")}</p>
                          {addressLine1 && (
                            <p><strong>{t("pro.messages.detail.summaryLocation")}</strong> {addressLine1}{addressLine2 ? `, ${addressLine2}` : ''}, {city} {postalCode}</p>
                          )}
                          {pricingType === "fixed_price" && quotedAmountHuf && (
                            <p><strong>{t("pro.messages.detail.summaryPrice")}</strong> {parseInt(quotedAmountHuf).toLocaleString()} HUF</p>
                          )}
                          {pricingType === "hourly_rate" && hourlyRateHuf && (
                            <p><strong>{t("pro.messages.detail.summaryRate")}</strong> {parseInt(hourlyRateHuf).toLocaleString()} HUF/{t("pro.messages.time.hours")}{minHours ? ` (min ${minHours}${t("pro.messages.time.hours")})` : ''}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              </div>

              {/* Navigation Buttons - Fixed to Bottom */}
              <div className="px-6 py-4 border-t border-gray-300 bg-white flex gap-3 flex-shrink-0">
                {scheduleStep > 1 && (
                  <button
                    type="button"
                    onClick={handleScheduleBack}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition flex items-center gap-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    {t("pro.messages.detail.back")}
                  </button>
                )}
                <button
                  type="submit"
                  disabled={savingAppointment || (scheduleStep === 1 && (!appointmentDate || !appointmentStartTime)) || (scheduleStep === 2 && !addressLine1) || (scheduleStep === 3 && ((pricingType === "fixed_price" && !quotedAmountHuf) || (pricingType === "hourly_rate" && !hourlyRateHuf)))}
                  className="flex-1 px-6 py-2 bg-[hsl(var(--primary))] text-white rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
                >
                  {savingAppointment ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      {t("pro.messages.detail.scheduling")}
                    </>
                  ) : scheduleStep === 5 ? (
                    <>
                      <Calendar className="w-4 h-4" />
                      {t("pro.messages.detail.confirmSchedule")}
                    </>
                  ) : (
                    t("pro.messages.detail.continue")
                  )}
                </button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Lead Purchase Modal */}
      {proProfileId ? (
        <LeadPurchaseModal
          isOpen={showPurchaseModal}
          onClose={() => setShowPurchaseModal(false)}
          jobId={parseInt(jobId)}
          proProfileId={proProfileId}
          serviceCategory="Plumbing" // TODO: Map job service to actual category from: Plumbing, Electrical, Cleaning, Moving, Renovation, Painting, HVAC, Landscaping
          onPurchaseComplete={() => {
            // Mark lead as purchased
            setLeadPurchased(true);
          }}
        />
      ) : (
        <>
          {showPurchaseModal && console.log("Modal should open but proProfileId is null")}
        </>
      )}
    </div>
  );
}

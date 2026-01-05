"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/contexts/I18nContext";
import MessagesSidebar from "@/components/MessagesSidebar";
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
  status: string;
  user_id: number;
  service_id?: number | null;
  description?: string;
  category?: string;
}

interface Invitation {
  id: number;
  job_id: number;
  pro_profile_id: number;
  status: string;
}

interface Conversation {
  job_id: number;
  job_description: string;
  customer_name: string;
  service_name?: string;
  last_message: Message;
  unread_count: number;
  is_archived: boolean;
  is_starred: boolean;
  job_status: string;
}

export default function StatusLostMessagesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { t, language } = useI18n();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [proProfileId, setProProfileId] = useState<number | null>(null);
  const [archivingJobId, setArchivingJobId] = useState<number | null>(null);
  const [starringJobId, setStarringJobId] = useState<number | null>(null);

  useEffect(() => {
    const fetchConversations = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // Get user data
        const userResponse = await fetch(`${API_BASE_URL}/api/v1/users/firebase/${user.uid}`);
        if (!userResponse.ok) {
          console.error("Failed to fetch user");
          return;
        }
        const userData = await userResponse.json();

        // Get pro profile
        const proProfileResponse = await fetch(`${API_BASE_URL}/api/v1/pro-profiles/user/${userData.id}`);
        if (!proProfileResponse.ok) {
          console.error("Failed to fetch pro profile");
          return;
        }
        const proProfile = await proProfileResponse.json();
        setProProfileId(proProfile.id);

        // Get archived job IDs
        const archivedResponse = await fetch(`${API_BASE_URL}/api/v1/archived-conversations/pro-profile/${proProfile.id}`);
        const archivedJobIds = archivedResponse.ok ? await archivedResponse.json() : [];
        const archivedSet = new Set(archivedJobIds);

        // Get starred job IDs
        const starredResponse = await fetch(`${API_BASE_URL}/api/v1/starred-conversations/pro-profile/${proProfile.id}`);
        const starredJobIds = starredResponse.ok ? await starredResponse.json() : [];
        const starredSet = new Set(starredJobIds);

        // Get declined invitations (lost jobs)
        const invitationsResponse = await fetch(`${API_BASE_URL}/api/v1/invitations?pro_profile_id=${proProfile.id}&status=declined`);
        const declinedInvitations: Invitation[] = invitationsResponse.ok ? await invitationsResponse.json() : [];
        const lostJobIds = new Set(declinedInvitations.map(inv => inv.job_id));

        // Get all messages for this user
        const messagesResponse = await fetch(`${API_BASE_URL}/api/v1/messages?user_id=${userData.id}`);
        if (!messagesResponse.ok) {
          console.error("Failed to fetch messages");
          return;
        }
        const messages: Message[] = await messagesResponse.json();

        // Group messages by job_id
        const conversationMap = new Map<number, Conversation>();

        for (const message of messages) {
          if (!conversationMap.has(message.job_id)) {
            // Fetch job details
            const jobResponse = await fetch(`${API_BASE_URL}/api/v1/jobs/${message.job_id}`);
            if (jobResponse.ok) {
              const job: Job = await jobResponse.json();
              
              // Filter: show jobs that are cancelled OR have declined invitation
              const isLost = job.status === "cancelled" || lostJobIds.has(message.job_id);
              if (!isLost) {
                continue;
              }
              
              // Fetch customer details
              const customerResponse = await fetch(`${API_BASE_URL}/api/v1/users/${job.user_id}`);
              const customer = customerResponse.ok ? await customerResponse.json() : { name: t("pro.messages.customerFallback") };

              // Fetch service details
              let serviceName: string | undefined;
              if (job.service_id) {
                try {
                  const serviceResponse = await fetch(`${API_BASE_URL}/api/v1/services/${job.service_id}?language=${language}`);
                  if (serviceResponse.ok) {
                    const serviceData = await serviceResponse.json();
                    serviceName = serviceData.name;
                  }
                } catch (error) {
                  console.error("Error fetching service:", error);
                }
              }

              conversationMap.set(message.job_id, {
                job_id: message.job_id,
                job_description: job.description || t("pro.messages.jobRequest"),
                customer_name: customer.name,
                service_name: serviceName || job.category,
                last_message: message,
                unread_count: 0,
                is_archived: archivedSet.has(message.job_id),
                is_starred: starredSet.has(message.job_id),
                job_status: job.status
              });
            }
          }

          const conversation = conversationMap.get(message.job_id);
          if (!conversation) continue;
          
          // Update last message if this one is newer
          if (new Date(message.created_at) > new Date(conversation.last_message.created_at)) {
            conversation.last_message = message;
          }

          // Count unread messages from customer (not from pro)
          if (!message.is_from_pro && !message.is_read && message.receiver_id === userData.id) {
            conversation.unread_count++;
          }
        }

        const conversationsArray = Array.from(conversationMap.values())
          .filter(conv => !conv.is_archived)
          .sort((a, b) => new Date(b.last_message.created_at).getTime() - new Date(a.last_message.created_at).getTime());

        setConversations(conversationsArray);
      } catch (error) {
        console.error("Error fetching conversations:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
  }, [user, t]);

  const filteredConversations = conversations.filter(conv =>
    !conv.is_archived && (
      conv.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.job_description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.service_name?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  const handleArchive = async (jobId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!proProfileId || archivingJobId) return;

    try {
      setArchivingJobId(jobId);
      const response = await fetch(`${API_BASE_URL}/api/v1/archived-conversations/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pro_profile_id: proProfileId,
          job_id: jobId
        }),
      });

      if (response.ok) {
        setConversations(prev => prev.filter(conv => conv.job_id !== jobId));
      }
    } catch (error) {
      console.error("Error archiving conversation:", error);
    } finally {
      setArchivingJobId(null);
    }
  };

  const handleStar = async (jobId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!proProfileId || starringJobId) return;

    const conversation = conversations.find(c => c.job_id === jobId);
    const isStarred = conversation?.is_starred;

    try {
      setStarringJobId(jobId);
      const response = await fetch(`${API_BASE_URL}/api/v1/starred-conversations/`, {
        method: isStarred ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pro_profile_id: proProfileId,
          job_id: jobId
        }),
      });

      if (response.ok || response.status === 204) {
        setConversations(prev => 
          prev.map(conv => 
            conv.job_id === jobId ? { ...conv, is_starred: !isStarred } : conv
          )
        );
      }
    } catch (error) {
      console.error("Error toggling star:", error);
    } finally {
      setStarringJobId(null);
    }
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return t("pro.messages.time.justNow");
    if (diffMins < 60) return `${diffMins}${t("pro.messages.time.minutes")} ${t("pro.messages.time.ago")}`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}${t("pro.messages.time.hours")} ${t("pro.messages.time.ago")}`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}${t("pro.messages.time.days")} ${t("pro.messages.time.ago")}`;
    
    return date.toLocaleDateString();
  };

  return (
    <div className="flex h-[calc(100vh-200px)] relative">
      <MessagesSidebar />

      <div className="relative bg-gray-50 flex-auto ml-8 mr-8">
        <main className="absolute inset-0 overflow-y-auto">
          <div className="flex flex-col h-full overflow-x-hidden overflow-y-auto bg-white">
            <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4">
              <h1 className="text-2xl font-bold text-gray-900 mb-1">{t("pro.messages.statusFilters.noHire")}</h1>
              <p className="text-sm text-gray-600">{t("pro.messages.statusFilters.noHireDescription")}</p>
            </div>

            <div className="border-b border-gray-200 bg-white px-6 py-4">
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg height="18" width="18" fill="currentColor" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                    <path d="M7.5 2C10.532 2 13 4.467 13 7.5c0 1.156-.36 2.229-.972 3.114l3.679 3.679a.999.999 0 11-1.414 1.414l-3.68-3.679A5.46 5.46 0 017.5 13 5.506 5.506 0 012 7.5C2 4.467 4.468 2 7.5 2zm0 2C5.57 4 4 5.57 4 7.5S5.57 11 7.5 11 11 9.43 11 7.5 9.43 4 7.5 4z"></path>
                  </svg>
                </div>
                <input
                  type="text"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] focus:border-transparent text-sm"
                  placeholder={t("pro.messages.searchPlaceholder")}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck="false"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center items-center flex-grow">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(var(--primary))] mx-auto mb-2"></div>
                  <p className="text-gray-500">{t("pro.messages.loading")}</p>
                </div>
              </div>
            ) : filteredConversations.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {filteredConversations.map((conversation) => (
                  <div
                    key={conversation.job_id}
                    className="block px-6 py-5 hover:bg-gray-50 transition-colors border-l-4 border-transparent hover:border-[hsl(var(--primary))]"
                  >
                    <div className="flex items-start gap-4">
                      <div 
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() => router.push(`/pro/messages/${conversation.job_id}`)}
                      >
                        <div className="flex items-start justify-between gap-3 mb-1">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="flex-shrink-0">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${
                                  conversation.unread_count > 0 
                                    ? "bg-[hsl(var(--primary))] text-white" 
                                    : "bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]"
                                }`}>
                                  {conversation.customer_name?.charAt(0) || "C"}
                                </div>
                              </div>
                              <h3 className={`font-semibold truncate ${
                                conversation.unread_count > 0 ? 'text-gray-900' : 'text-gray-700'
                              }`}>
                                {conversation.service_name || conversation.customer_name || t("pro.messages.customerFallback")}
                              </h3>
                              {conversation.unread_count > 0 && (
                                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[hsl(var(--primary))] text-white text-xs font-bold flex-shrink-0">
                                  {conversation.unread_count > 9 ? "9+" : conversation.unread_count}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 truncate mb-2">
                              {conversation.job_description || t("pro.messages.jobRequest")}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-xs text-gray-500 whitespace-nowrap">
                              {getTimeAgo(conversation.last_message.created_at)}
                            </span>
                            <button
                              onClick={(e) => handleStar(conversation.job_id, e)}
                              disabled={starringJobId === conversation.job_id}
                              className={`p-1.5 rounded transition-colors ${
                                conversation.is_starred
                                  ? "text-yellow-500 hover:text-yellow-600"
                                  : "text-gray-400 hover:text-gray-600"
                              } hover:bg-gray-100`}
                              title={conversation.is_starred ? t("pro.messages.unstar") : t("pro.messages.star")}
                            >
                              <svg className="w-4 h-4" fill={conversation.is_starred ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                              </svg>
                            </button>
                            <button
                              onClick={(e) => handleArchive(conversation.job_id, e)}
                              disabled={archivingJobId === conversation.job_id}
                              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                              title={t("pro.messages.archive")}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                              </svg>
                            </button>
                          </div>
                        </div>
                        <p className={`text-sm truncate ${
                          conversation.unread_count > 0 
                            ? 'font-semibold text-gray-900' 
                            : 'text-gray-600'
                        }`}>
                          {conversation.last_message.is_from_pro ? (
                            <span className="text-gray-500">{t("pro.messages.you")} </span>
                          ) : (
                            <span className="text-gray-500">{conversation.customer_name || t("pro.messages.customerFallback")}: </span>
                          )}
                          {conversation.last_message.obfuscated_content}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex justify-center items-center text-center flex-grow py-12">
                <div className="max-w-md">
                  <div className="rounded-full bg-gray-100 w-20 h-20 mb-4 mx-auto flex justify-center items-center">
                    <svg height="40" width="40" fill="currentColor" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg">
                      <path d="M24 22c0 .551-.449 1-1 1H5c-.551 0-1-.449-1-1v-5h6.126A4.01 4.01 0 0014 20a4.01 4.01 0 003.874-3H24v5zM5.847 5h16.306l1.666 10H16v1c0 1.103-.897 2-2 2s-2-.897-2-2v-1H4.181L5.847 5zm18-2H4.153L2.014 15.835v.099C2.012 15.957 2 15.977 2 16c0 .023.012.042.013.065L2 22c0 1.654 1.346 3 3 3h18c1.654 0 3-1.346 3-3v-6L23.847 3z"></path>
                    </svg>
                  </div>
                  <h3 className="font-bold text-lg mb-2">{t("pro.messages.statusFilters.noConversations")}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {t("pro.messages.statusFilters.noConversationsDescription")}
                  </p>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

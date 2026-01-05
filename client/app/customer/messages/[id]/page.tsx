"use client";

import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/lib/contexts/AuthContext";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Send, MessageCircle, Clock, MapPin, Calendar, User, FileText, CheckCircle2 } from "lucide-react";
import { formatDistanceToNow, format, isToday, isYesterday, isSameDay } from "date-fns";
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
  created_at: string;
}

interface User {
  id: number;
  name: string;
  email: string;
}

export default function CustomerConversationPage() {
  const { user } = useAuth();
  const params = useParams();
  const jobId = params?.id as string;
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [job, setJob] = useState<Job | null>(null);
  const [pro, setPro] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [messageContent, setMessageContent] = useState("");
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [proProfileId, setProProfileId] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

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

        // Get job details
        const jobResponse = await fetch(`${API_BASE_URL}/api/v1/jobs/${jobId}`);
        if (jobResponse.ok) {
          const jobData = await jobResponse.json();
          setJob(jobData);
        }

        // Get messages for this job
        const messagesResponse = await fetch(`${API_BASE_URL}/api/v1/messages?job_id=${jobId}`);
        if (messagesResponse.ok) {
          const messagesData = await messagesResponse.json();
          setMessages(messagesData);

          // Get pro user from first message
          const proMessage = messagesData.find((m: Message) => m.is_from_pro);
          if (proMessage) {
            // Try to get pro profile business name first
            try {
              const proProfileResponse = await fetch(`${API_BASE_URL}/api/v1/pro-profiles/user/${proMessage.sender_id}`);
              if (proProfileResponse.ok) {
                const proProfile = await proProfileResponse.json();
                // Use business_name from pro profile
                setPro({ 
                  id: proMessage.sender_id, 
                  name: proProfile.business_name || "Mester",
                  email: "" 
                });
                setProProfileId(proProfile.id);
              } else {
                // Fallback to user if no pro profile
                const proResponse = await fetch(`${API_BASE_URL}/api/v1/users/${proMessage.sender_id}`);
                if (proResponse.ok) {
                  const proData = await proResponse.json();
                  setPro({ 
                    id: proData.id, 
                    name: proData.email?.split('@')[0] || "Mester",
                    email: proData.email 
                  });
                }
              }
            } catch (error) {
              console.error("Error fetching pro name:", error);
              setPro({ id: proMessage.sender_id, name: "Mester", email: "" });
            }
          }

          // Mark messages as read
          for (const msg of messagesData) {
            if (msg.is_from_pro && !msg.is_read && msg.receiver_id === userData.id) {
              try {
                await fetch(`${API_BASE_URL}/api/v1/messages/${msg.id}/read`, {
                  method: "PATCH",
                });
              } catch (error) {
                console.error(`Failed to mark message ${msg.id} as read:`, error);
                // Continue processing other messages even if one fails
              }
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
    
    if (!messageContent.trim() || !currentUserId || !job || !messages.length) return;

    setSending(true);
    try {
      // Get the pro user ID from messages
      const proMessage = messages.find(m => m.is_from_pro);
      if (!proMessage) return;

      const response = await fetch(`${API_BASE_URL}/api/v1/messages?sender_id=${currentUserId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_id: parseInt(jobId),
          receiver_id: proMessage.sender_id,
          content: messageContent,
        }),
      });

      if (response.ok) {
        const newMessage = await response.json();
        
        if (newMessage.contains_contact_info) {
          alert("Note: Contact information in your message has been removed for security.");
        }

        setMessages([...messages, newMessage]);
        setMessageContent("");
        // Scroll to bottom after sending
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
      }
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setSending(false);
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
        return "Yesterday";
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
        return "Today";
      } else if (isYesterday(date)) {
        return "Yesterday";
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

  return (
    <div className="flex h-[calc(100vh-64px)] relative">
      {/* Sidebar Navigation */}
      <nav className="bg-white w-60 h-full p-4 lg:p-5 ml-8 overflow-y-auto">
        <div>
          {/* Folders Section */}
          <div className="text-xs font-semibold text-gray-700 mb-2">Folders</div>
          <div className="space-y-1">
            <Link
              href="/customer/messages"
              className="flex items-center rounded px-2 py-2 text-sm font-semibold bg-gray-100 border-l-4 border-[hsl(var(--primary))]"
            >
              <div className="w-12 flex items-center justify-center pr-2">
                <MessageCircle className="w-[18px] h-[18px]" />
              </div>
              <div className="flex flex-1 justify-between items-center">
                <div className="truncate">All Messages</div>
              </div>
            </Link>

            <Link
              href="/customer/messages/unread"
              className="flex items-center rounded px-2 py-2 text-sm hover:bg-gray-50"
            >
              <div className="w-12 flex items-center justify-center pr-2">
                <svg height="18" width="18" fill="currentColor" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                  <path d="M15 15H3v-4h2.571A3.578 3.578 0 009 13.571 3.578 3.578 0 0012.429 11H15v4zm-.883-12l.75 6h-4.296v1c0 .866-.705 1.571-1.571 1.571A1.573 1.573 0 017.429 10V9H3.133l.75-6h10.234zm1.766-2H2.117L1.008 9.876 1 15c0 1.103.897 2 2 2h12c1.104 0 2-.897 2-2v-5l-1.117-9z"></path>
                </svg>
              </div>
              <div className="flex flex-1 justify-between items-center">
                <div className="truncate">Unread</div>
              </div>
            </Link>

            <Link
              href="/customer/messages/archived"
              className="flex items-center rounded px-2 py-2 text-sm hover:bg-gray-50"
            >
              <div className="w-12 flex items-center justify-center pr-2">
                <svg height="18" width="18" fill="currentColor" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                  <path d="M15 5H3V4c0-.551.449-1 1-1h10c.551 0 1 .449 1 1v1zm0 9c0 .551-.449 1-1 1H4c-.551 0-1-.449-1-1V7h12v7zM14 1H4C2.346 1 1 2.346 1 4v10c0 1.654 1.346 3 3 3h10c1.654 0 3-1.346 3-3V4c0-1.654-1.346-3-3-3zm-7 9.75h4a.75.75 0 000-1.5H7a.75.75 0 000 1.5z"></path>
                </svg>
              </div>
              <div className="flex flex-1 justify-between items-center">
                <div className="truncate">Archived</div>
              </div>
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <div className="relative bg-gray-50 flex-auto ml-8 mr-8 flex">
        {loading ? (
          <div className="flex justify-center items-center h-full w-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(var(--primary))] mx-auto mb-2"></div>
              <p className="text-gray-500">Loading conversation...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Main Conversation Area */}
            <div className="flex-1 flex flex-col bg-white border-r border-gray-200">
              {/* Enhanced Header */}
              <div className="border-b border-gray-200 bg-white px-6 py-4 flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <Link href="/customer/messages" className="text-gray-600 hover:text-gray-900 flex-shrink-0">
                    <ArrowLeft className="w-5 h-5" />
                  </Link>
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-[hsl(var(--primary)/0.1)] flex items-center justify-center text-[hsl(var(--primary))] font-bold flex-shrink-0">
                      {pro?.name?.charAt(0) || "M"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 className="font-semibold text-lg truncate">{pro?.name || "Mester"}</h2>
                        {proProfileId && (
                          <Link 
                            href={`/mester/${proProfileId}`}
                            className="text-xs text-[hsl(var(--primary))] hover:underline flex-shrink-0"
                          >
                            View profile
                          </Link>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 truncate">{job?.description || "Job request"}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Messages Area with Date Grouping */}
              <div 
                ref={messagesContainerRef}
                className="flex-1 overflow-y-auto px-6 py-6 bg-gray-50"
              >
                {messages.length === 0 ? (
                  <div className="flex flex-col justify-center items-center h-full text-center">
                    <div className="rounded-full bg-gray-200 w-16 h-16 mb-4 flex items-center justify-center">
                      <MessageCircle className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">No messages yet</h3>
                    <p className="text-gray-600 text-sm max-w-sm">
                      Start the conversation by sending a message to {pro?.name || "the professional"}.
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
                            const isOwn = !message.is_from_pro;
                            const prevMessage = idx > 0 ? dateMessages[idx - 1] : null;
                            const showAvatar = !prevMessage || prevMessage.is_from_pro !== message.is_from_pro || 
                              new Date(message.created_at).getTime() - new Date(prevMessage.created_at).getTime() > 300000; // 5 minutes
                            
                            return (
                              <div
                                key={message.id}
                                className={`flex gap-3 ${isOwn ? "justify-end" : "justify-start"} items-end`}
                              >
                                {!isOwn && (
                                  <div className="flex-shrink-0">
                                    {showAvatar ? (
                                      <div className="w-8 h-8 rounded-full bg-[hsl(var(--primary)/0.1)] flex items-center justify-center text-[hsl(var(--primary))] font-semibold text-sm">
                                        {pro?.name?.charAt(0) || "M"}
                                      </div>
                                    ) : (
                                      <div className="w-8 h-8"></div>
                                    )}
                                  </div>
                                )}
                                <div className={`flex flex-col ${isOwn ? "items-end" : "items-start"} max-w-[70%]`}>
                                  <div
                                    className={`rounded-2xl px-4 py-2.5 shadow-sm ${
                                      isOwn
                                        ? "bg-[hsl(var(--primary))] text-white rounded-br-sm"
                                        : "bg-white text-gray-900 border border-gray-200 rounded-bl-sm"
                                    }`}
                                  >
                                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.obfuscated_content}</p>
                                  </div>
                                  <p
                                    className={`text-xs mt-1 px-1 ${
                                      isOwn ? "text-gray-500" : "text-gray-400"
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
                                        You
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
              </div>

              {/* Enhanced Message Input */}
              <div className="border-t border-gray-200 bg-white px-6 py-4">
                <form onSubmit={handleSendMessage} className="flex gap-3 items-end">
                  <div className="flex-1 relative">
                    <textarea
                      value={messageContent}
                      onChange={(e) => setMessageContent(e.target.value)}
                      placeholder="Type your message..."
                      rows={1}
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] focus:border-transparent resize-none max-h-32 overflow-y-auto"
                      disabled={sending}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage(e);
                        }
                      }}
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      Contact information will be automatically removed for your security.
                    </p>
                  </div>
                  <button
                    type="submit"
                    disabled={!messageContent.trim() || sending}
                    className="px-6 py-3 bg-[hsl(var(--primary))] text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium transition-all flex-shrink-0"
                  >
                    {sending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Send
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>

            {/* Job Context Panel */}
            {job && (
              <div className="w-80 bg-white border-l border-gray-200 overflow-y-auto">
                <div className="p-6">
                  <h3 className="font-semibold text-lg mb-4">Job Details</h3>
                  
                  {/* Job Description */}
                  <div className="mb-6">
                    <div className="flex items-start gap-3 mb-2">
                      <FileText className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 mb-1">Description</p>
                        <p className="text-sm text-gray-600 leading-relaxed">{job.description || "No description provided"}</p>
                      </div>
                    </div>
                  </div>

                  {/* Job Created Date */}
                  <div className="mb-6">
                    <div className="flex items-center gap-3">
                      <Clock className="w-5 h-5 text-gray-400 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 mb-1">Posted</p>
                        <p className="text-sm text-gray-600">
                          {job.created_at ? formatDistanceToNow(new Date(job.created_at), { addSuffix: true }) : "Recently"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  {proProfileId && (
                    <div className="pt-6 border-t border-gray-200">
                      <h4 className="text-sm font-semibold text-gray-900 mb-3">Quick Actions</h4>
                      <div className="space-y-2">
                        <Link
                          href={`/mester/${proProfileId}`}
                          className="block w-full px-4 py-2 text-sm text-center bg-[hsl(var(--primary))] text-white rounded-lg hover:opacity-90 transition"
                        >
                          View Professional Profile
                        </Link>
                        <Link
                          href={`/customer/appointments`}
                          className="block w-full px-4 py-2 text-sm text-center border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                        >
                          View Appointments
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/contexts/AuthContext";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { API_BASE_URL } from "@/lib/api/config";
import { syncUserToDatabase } from "@/lib/hooks/useUserSync";

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

interface Conversation {
  job_id: number;
  job_description: string;
  other_user_name: string;
  last_message: Message;
  unread_count: number;
}

export default function CustomerMessagesPage() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchConversations = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // Get user data
        let userResponse = await fetch(`${API_BASE_URL}/api/v1/users/firebase/${user.uid}`);
        if (!userResponse.ok) {
          // User doesn't exist in database, try to sync them
          console.log("User not found in database, syncing...");
          try {
            await syncUserToDatabase({
              email: user.email!,
              role: 'customer',
              firebaseUid: user.uid,
            });
            // Retry fetching the user
            userResponse = await fetch(`${API_BASE_URL}/api/v1/users/firebase/${user.uid}`);
            if (!userResponse.ok) {
              console.error("Failed to fetch user after sync");
              return;
            }
          } catch (syncError) {
            console.error("Failed to sync user to database:", syncError);
            return;
          }
        }
        const userData = await userResponse.json();

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
              const job = await jobResponse.json();
              
              // Fetch other user details (the pro)
              const otherUserId = message.is_from_pro ? message.sender_id : message.receiver_id;
              let proName = "Mester"; // Default fallback
              
              // Try to get pro profile business name
              try {
                const proProfileResponse = await fetch(`${API_BASE_URL}/api/v1/pro-profiles/user/${otherUserId}`);
                if (proProfileResponse.ok) {
                  const proProfile = await proProfileResponse.json();
                  proName = proProfile.business_name || proName;
                } else {
                  // Fallback to user name if no pro profile
                  const otherUserResponse = await fetch(`${API_BASE_URL}/api/v1/users/${otherUserId}`);
                  if (otherUserResponse.ok) {
                    const otherUser = await otherUserResponse.json();
                    // User model doesn't have name, so we'll use email or keep default
                    proName = otherUser.email?.split('@')[0] || proName;
                  }
                }
              } catch (error) {
                console.error("Error fetching pro name:", error);
              }

              conversationMap.set(message.job_id, {
                job_id: message.job_id,
                job_description: job.description || "Job request",
                other_user_name: proName,
                last_message: message,
                unread_count: 0
              });
            }
          }

          const conversation = conversationMap.get(message.job_id)!;
          
          // Update last message if this one is newer
          if (new Date(message.created_at) > new Date(conversation.last_message.created_at)) {
            conversation.last_message = message;
          }

          // Count unread messages from pro
          if (message.is_from_pro && !message.is_read && message.receiver_id === userData.id) {
            conversation.unread_count++;
          }
        }

        const conversationsArray = Array.from(conversationMap.values())
          .sort((a, b) => new Date(b.last_message.created_at).getTime() - new Date(a.last_message.created_at).getTime());

        setConversations(conversationsArray);
      } catch (error) {
        console.error("Error fetching conversations:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
  }, [user]);

  const filteredConversations = conversations.filter(conv =>
    conv.other_user_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.job_description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  };

  return (
    <div className="flex h-[calc(100vh-64px)] relative">
      {/* Sidebar Navigation */}
      <nav className="bg-white w-60 h-full p-4 lg:p-5 ml-8">
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
      <div className="relative bg-gray-50 flex-auto ml-8 mr-8">
        <main className="absolute inset-0 overflow-y-auto">
          <div className="flex flex-col h-full overflow-x-hidden overflow-y-auto bg-white">
            {/* Enhanced Header */}
            <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4">
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Messages</h1>
              <p className="text-sm text-gray-600">Communicate with professionals about your projects</p>
            </div>

            {/* Enhanced Search Bar */}
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
                  placeholder="Search by professional name or job description..."
                  autoComplete="off"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Enhanced Messages List */}
            {loading ? (
              <div className="flex justify-center items-center flex-grow">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(var(--primary))] mx-auto mb-2"></div>
                  <p className="text-gray-500">Loading messages...</p>
                </div>
              </div>
            ) : filteredConversations.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {filteredConversations.map((conversation) => (
                  <Link
                    key={conversation.job_id}
                    href={`/customer/messages/${conversation.job_id}`}
                    className="block px-6 py-5 hover:bg-gray-50 transition-colors border-l-4 border-transparent hover:border-[hsl(var(--primary))]"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${
                          conversation.unread_count > 0 
                            ? "bg-[hsl(var(--primary))] text-white" 
                            : "bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]"
                        }`}>
                          {conversation.other_user_name?.charAt(0) || "M"}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3 mb-1">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className={`font-semibold truncate ${
                                conversation.unread_count > 0 ? 'text-gray-900' : 'text-gray-700'
                              }`}>
                                {conversation.other_user_name || "Mester"}
                              </h3>
                              {conversation.unread_count > 0 && (
                                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[hsl(var(--primary))] text-white text-xs font-bold flex-shrink-0">
                                  {conversation.unread_count > 9 ? "9+" : conversation.unread_count}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 truncate mb-2">
                              {conversation.job_description || "Job request"}
                            </p>
                          </div>
                          <span className="text-xs text-gray-500 whitespace-nowrap flex-shrink-0">
                            {getTimeAgo(conversation.last_message.created_at)}
                          </span>
                        </div>
                        <p className={`text-sm truncate ${
                          conversation.unread_count > 0 
                            ? 'font-semibold text-gray-900' 
                            : 'text-gray-600'
                        }`}>
                          {conversation.last_message.is_from_pro ? (
                            <span className="text-gray-500">{conversation.other_user_name || "Mester"}: </span>
                          ) : (
                            <span className="text-gray-500">You: </span>
                          )}
                          {conversation.last_message.obfuscated_content}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex justify-center items-center text-center flex-grow py-12">
                <div className="max-w-md">
                  <div className="rounded-full bg-gray-100 w-20 h-20 mb-4 mx-auto flex justify-center items-center">
                    <MessageCircle className="w-10 h-10 text-gray-400" />
                  </div>
                  <h3 className="font-bold text-lg mb-2">No messages yet</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    When professionals respond to your job requests,<br />
                    you&apos;ll see their messages here.
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

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { subscribeToAuthChanges } from "@/lib/auth";
import { useWebSocket, useWebSocketEvent } from "@/lib/useWebSocket";
import {
  fetchProStatus,
  listThreads,
  listMessages,
  markThreadRead,
  sendMessage,
  fetchServiceById,
  checkLeadAccess,
  type MessageThread,
  type Message,
  type Service,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import MessageThreadList from "@/components/MessageThreadList";
import MessageConversation from "@/components/MessageConversation";
import ProLayout from "@/components/pro/ProLayout";
import { AppointmentProposalModal } from "@/components/AppointmentProposalModal";
import { ExternalLink, Lock } from "lucide-react";

export default function ProMessagesPage() {
  const router = useRouter();
  const { threadId } = router.query as { threadId?: string };
  const [checking, setChecking] = useState(true);
  const [mesterId, setMesterId] = useState<string | null>(null);

  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [search, setSearch] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [hasLeadAccess, setHasLeadAccess] = useState(false);
  const [showAccessWarning, setShowAccessWarning] = useState(false);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);

  // WebSocket connection
  useWebSocket({ mesterId: mesterId || undefined });

  // Auth check
  useEffect(() => {
    const unsub = subscribeToAuthChanges(async (user) => {
      if (!user?.email) {
        router.replace("/login");
        return;
      }
      const status = await fetchProStatus(user.email);
      if (!status.is_pro || !status.mester_id) {
        router.replace("/pro/onboarding");
        return;
      }
      setMesterId(status.mester_id);
      setChecking(false);
    });
    return () => {
      if (unsub) unsub();
    };
  }, [router]);

  // Real-time message updates
  useWebSocketEvent(
    "new_message",
    (message) => {
      if (message.data && message.data.thread_id === threadId) {
        const newMsg: Message = {
          id: message.data.id as string,
          thread_id: message.data.thread_id as string,
          body: message.data.body as string,
          sender_type: message.data.sender_type as "customer" | "mester",
          sender_user_id: message.data.sender_user_id as string | null,
          sender_mester_id: message.data.sender_mester_id as string | null,
          is_read_by_customer: message.data.sender_type === "customer",
          is_read_by_mester: true,
          is_blurred: (message.data as { is_blurred?: boolean })?.is_blurred || false,
          created_at: message.data.created_at as string,
        };
        setMessages((prev) => [...prev, newMsg]);
      }
    },
    !!mesterId
  );

  // Load threads
  useEffect(() => {
    if (checking || !mesterId) return;
    setLoading(true);
    listThreads({ mester_id: mesterId, viewer_type: "mester" })
      .then((ts) => setThreads(ts))
      .finally(() => setLoading(false));
  }, [checking, mesterId]);

  // Load messages for selected thread
  useEffect(() => {
    if (!threadId || !mesterId) {
      setMessages([]);
      setSelectedService(null);
      setHasLeadAccess(false);
      return;
    }

    const selectedThread = threads.find((t) => t.id === threadId);

    // Load messages
    listMessages(threadId, { viewer_type: "mester", mester_id: mesterId }).then(
      (ms) => setMessages(ms)
    );
    void markThreadRead(threadId, "mester");

    // Load thread metadata
    if (selectedThread) {
      // Check lead access
      checkLeadAccess(selectedThread.request_id, mesterId)
        .then(setHasLeadAccess)
        .catch(() => setHasLeadAccess(false));

      // Load service info from request if available
      setSelectedService(null);
    }
  }, [threadId, mesterId, threads]);

  const onSend = async () => {
    if (!threadId || !newMessage.trim() || !mesterId) return;

    // Check if lead is purchased before sending
    if (!hasLeadAccess) {
      setShowAccessWarning(true);
      return;
    }

    try {
      const msg = await sendMessage(threadId, {
        body: newMessage.trim(),
        sender_type: "mester",
        sender_mester_id: mesterId,
      });
      setMessages((prev) => [...prev, msg]);
      setNewMessage("");
    } catch (e: unknown) {
      if ((e as { code?: string })?.code === "PAYMENT_REQUIRED") {
        setShowAccessWarning(true);
        return;
      }
      throw e;
    }
  };

  // Render header content
  const renderHeader = () => {
    const selectedThread = threads.find((t) => t.id === threadId);
    if (!selectedThread) return null;

    const customerName = "Customer";
    const initials = "C";

    return (
      <>
        <div className="h-10 w-10 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-semibold">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-gray-900 truncate">
            {customerName}
          </div>
          <div className="text-xs text-gray-500 truncate">
            {selectedService?.name || "Service request"}
          </div>
        </div>
        {selectedThread && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/pro/requests/${selectedThread.request_id}`)}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            View Job
          </Button>
        )}
      </>
    );
  };

  return (
    <ProLayout>
      <div className="flex flex-col lg:flex-row h-[calc(100vh-12rem)] bg-white overflow-hidden -mx-4 sm:-mx-6 lg:-mx-8 -mb-8">
        {/* Thread List */}
        <div
          className={`${
            threadId ? "hidden lg:flex" : "flex"
          } flex-col w-full lg:w-auto min-h-0`}
        >
          <MessageThreadList
            threads={threads}
            selectedThreadId={threadId || null}
            loading={loading}
            searchValue={search}
            onSearchChange={setSearch}
            basePath="/pro/messages"
            emptyMessage="No conversations yet. Purchase a lead to start messaging."
          />
        </div>

        {/* Conversation */}
        <div
          className={`${
            !threadId ? "hidden lg:flex" : "flex"
          } flex-1 min-h-0 relative`}
        >
          {showAccessWarning && threadId && (
            <div className="absolute inset-0 bg-white z-30 flex items-center justify-center p-6">
              <div className="max-w-md text-center">
                <div className="h-16 w-16 rounded-full bg-blue-100 mx-auto mb-4 flex items-center justify-center">
                  <Lock className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Purchase Lead to Continue
                </h3>
                <p className="text-gray-600 mb-6">
                  You need to purchase this lead to send messages and view customer
                  details.
                </p>
                <div className="flex gap-3 justify-center">
                  <Button
                    variant="outline"
                    onClick={() => setShowAccessWarning(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => {
                      const thread = threads.find((t) => t.id === threadId);
                      if (thread) {
                        router.push(`/pro/requests/${thread.request_id}`);
                      }
                    }}
                  >
                    Purchase Lead
                  </Button>
                </div>
              </div>
            </div>
          )}

          <MessageConversation
            threadId={threadId || null}
            messages={messages}
            proposals={[]}
            newMessage={newMessage}
            onNewMessageChange={setNewMessage}
            onSendMessage={onSend}
            viewerType="mester"
            viewerId={mesterId || ""}
            header={renderHeader()}
            showBackButton={true}
            basePath="/pro/messages"
            onCreateAppointment={() => setShowAppointmentModal(true)}
            emptyState={
              <div className="text-center text-gray-500 text-sm">
                <p className="mb-4">Select a conversation to start messaging</p>
                <Button
                  variant="outline"
                  onClick={() => router.push("/pro/leads")}
                >
                  Browse Leads
                </Button>
              </div>
            }
          />
          
          {/* Appointment Proposal Modal */}
          {threadId && mesterId && (
            <AppointmentProposalModal
              isOpen={showAppointmentModal}
              onClose={() => setShowAppointmentModal(false)}
              threadId={threadId}
              mesterId={mesterId}
              onProposalCreated={() => {
                setShowAppointmentModal(false);
                // Refresh messages/proposals
                listMessages(threadId, { viewer_type: "mester", mester_id: mesterId }).then(
                  (ms) => setMessages(ms)
                );
              }}
            />
          )}
        </div>
      </div>
    </ProLayout>
  );
}

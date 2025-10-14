import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { subscribeToAuthChanges } from "@/lib/auth";
import {
  listThreads,
  listMessages,
  sendMessage,
  markThreadRead,
  fetchServiceById,
  fetchMesterById,
  getRequestById,
  getCurrentUser,
  type MessageThread,
  type Message,
  type Service,
  type MesterDetailResponse,
} from "@/lib/api";
import MessageThreadList from "@/components/MessageThreadList";
import MessageConversation from "@/components/MessageConversation";
import { useWebSocket, useWebSocketEvent } from "@/lib/useWebSocket";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

export default function CustomerMessagesPage() {
  const router = useRouter();
  const { threadId } = router.query as { threadId?: string };
  const [checking, setChecking] = useState(true);

  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [search, setSearch] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedMesterName, setSelectedMesterName] = useState<string | null>(null);
  const [customerUserId, setCustomerUserId] = useState<string | null>(null);

  // WebSocket connection
  useWebSocket({ userId: customerUserId || undefined });

  // Auth check
  useEffect(() => {
    const unsub = subscribeToAuthChanges(async (u) => {
      if (!u) {
        router.replace("/login");
        return;
      }

      const currentUser = await getCurrentUser();
      if (currentUser?.id) {
        setCustomerUserId(currentUser.id);
      }

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
          is_read_by_customer: true,
          is_read_by_mester: message.data.sender_type === "mester",
          is_blurred: false,
          created_at: message.data.created_at as string,
        };
        setMessages((prev) => [...prev, newMsg]);
      }
    },
    !!customerUserId
  );

  // Load threads
  useEffect(() => {
    if (checking) return;
    setLoading(true);
    listThreads()
      .then((ts) => setThreads(ts))
      .finally(() => setLoading(false));
  }, [checking]);

  // Load messages and metadata for selected thread
  useEffect(() => {
    if (!threadId) {
      setMessages([]);
      setSelectedService(null);
      setSelectedMesterName(null);
      return;
    }

    const selectedThread = threads.find((t) => t.id === threadId);

    // Load messages
    listMessages(threadId).then((ms) => setMessages(ms));
    void markThreadRead(threadId, "customer");

    // Load thread metadata
    if (selectedThread) {
      (async () => {
        try {
          const request = await getRequestById(selectedThread.request_id);
          const svc = await fetchServiceById(request.service_id);
          setSelectedService(svc);
        } catch {
          setSelectedService(null);
        }

        try {
          const md: MesterDetailResponse = await fetchMesterById(
            selectedThread.mester_id
          );
          setSelectedMesterName(md?.mester?.full_name || "Pro");
        } catch {
          setSelectedMesterName("Pro");
        }
      })();
    }
  }, [threadId, threads]);

  const onSend = async () => {
    if (!threadId || !newMessage.trim()) return;
    const msg = await sendMessage(threadId, {
      body: newMessage.trim(),
      sender_type: "customer",
    });
    setMessages((prev) => [...prev, msg]);
    setNewMessage("");
  };

  // Render header content
  const renderHeader = () => {
    const selectedThread = threads.find((t) => t.id === threadId);
    const n = (selectedMesterName || "").trim();
    const parts = n.split(" ").filter(Boolean);
    const initials = (parts[0]?.[0] || "") + (parts[1]?.[0] || "");
    const displayInitials = (initials || (n[0] || "P")).toUpperCase();

    return (
      <>
        <div className="h-10 w-10 rounded-full bg-gray-900 text-white flex items-center justify-center text-sm font-semibold">
          {displayInitials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-gray-900 truncate">
            {selectedMesterName || "Pro"}
          </div>
          <div className="text-xs text-gray-500 truncate">
            {selectedService?.name || "Service"}
          </div>
        </div>
        {selectedThread && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/tasks#${selectedThread.request_id}`)}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            View Request
          </Button>
        )}
      </>
    );
  };

  return (
    <main className="h-[calc(100vh-4rem)] bg-white overflow-hidden">
      <div className="flex flex-col lg:flex-row h-full">
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
            basePath="/messages"
            emptyMessage="No conversations yet."
          />
        </div>

        {/* Conversation */}
        <div
          className={`${
            !threadId ? "hidden lg:flex" : "flex"
          } flex-1 min-h-0`}
        >
          <MessageConversation
            threadId={threadId || null}
            messages={messages}
            proposals={[]}
            newMessage={newMessage}
            onNewMessageChange={setNewMessage}
            onSendMessage={onSend}
            viewerType="customer"
            viewerId={customerUserId || ""}
            header={renderHeader()}
            showBackButton={true}
            basePath="/messages"
            emptyState={
              <div className="text-center text-gray-500 text-sm">
                <p className="mb-4">Select a conversation to view messages</p>
                <Button
                  variant="outline"
                  onClick={() => router.push("/tasks")}
                >
                  View My Requests
                </Button>
              </div>
            }
          />
        </div>
      </div>
    </main>
  );
}

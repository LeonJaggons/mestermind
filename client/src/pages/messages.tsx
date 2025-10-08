import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { subscribeToAuthChanges } from "@/lib/auth";
import {
  listThreads,
  listMessages,
  sendMessage,
  markThreadRead,
  getRequestById,
  fetchServiceById,
  fetchMesterById,
  type MessageThread,
  type Message,
  type CustomerRequest,
  type Service,
  type MesterDetailResponse,
} from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

export default function CustomerMessagesPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [selectedThread, setSelectedThread] = useState<MessageThread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [search, setSearch] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<CustomerRequest | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedMesterName, setSelectedMesterName] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribeToAuthChanges(async (u) => {
      if (!u) {
        router.replace("/login");
        return;
      }
      setUserId(u.uid);
      setChecking(false);
    });
    return () => {
      if (unsub) unsub();
    };
  }, [router]);

  useEffect(() => {
    if (checking) return;
    setLoading(true);
    listThreads()
      .then((ts) => setThreads(ts))
      .finally(() => setLoading(false));
  }, [checking]);

  useEffect(() => {
    if (!selectedThreadId) return;
    const thread = threads.find((t) => t.id === selectedThreadId) || null;
    setSelectedThread(thread);
    listMessages(selectedThreadId).then((ms) => setMessages(ms));
    // mark as read for customer
    void markThreadRead(selectedThreadId, "customer");
  }, [selectedThreadId]);

  useEffect(() => {
    (async () => {
      if (!selectedThread) {
        setSelectedRequest(null);
        setSelectedService(null);
        setSelectedMesterName(null);
        return;
      }
      try {
        const req = await getRequestById(selectedThread.request_id);
        setSelectedRequest(req);
        try {
          const svc = await fetchServiceById(req.service_id);
          setSelectedService(svc);
        } catch {}
        try {
          const md: MesterDetailResponse = await fetchMesterById(selectedThread.mester_id);
          const name = md?.mester?.full_name || "Pro";
          setSelectedMesterName(name);
        } catch {
          setSelectedMesterName("Pro");
        }
      } catch {
        setSelectedRequest(null);
        setSelectedService(null);
        setSelectedMesterName(null);
      }
    })();
  }, [selectedThread]);

  const filteredThreads = useMemo(() => {
    if (!search.trim()) return threads;
    const q = search.toLowerCase();
    return threads.filter((t) => (t.last_message_preview || "").toLowerCase().includes(q));
  }, [threads, search]);

  const onSend = async () => {
    if (!selectedThreadId || !newMessage.trim() || !userId) return;
    const msg = await sendMessage(selectedThreadId, {
      body: newMessage.trim(),
      sender_type: "customer",
    });
    setMessages((prev) => [...prev, msg]);
    setNewMessage("");
  };

  return (
    <main className="min-h-screen bg-white">
      <div className="flex h-screen">
        {/* Left pane: search + thread list */}
        <div className="w-96 border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search conversations"
                className="pl-9"
              />
            </div>
          </div>
          <div className="flex-1 overflow-auto">
            {loading && <div className="p-4 text-sm text-gray-500">Loading…</div>}
            {!loading && filteredThreads.length === 0 && (
              <div className="p-6 text-sm text-gray-500">No conversations yet.</div>
            )}
            {!loading && filteredThreads.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedThreadId(t.id)}
                className={`w-full text-left p-4 border-b border-gray-100 hover:bg-gray-50 ${selectedThreadId === t.id ? 'bg-gray-50' : ''}`}
              >
                <div className="text-sm text-gray-900 truncate">{t.last_message_preview || 'New conversation'}</div>
                <div className="text-xs text-gray-500 mt-1">{t.last_message_at ? new Date(t.last_message_at).toLocaleString() : ''}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Right pane: conversation */}
        <div className="flex-1 flex flex-col">
          {!selectedThreadId ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-gray-500 text-sm">Select a conversation to view messages.</div>
            </div>
          ) : (
            <>
              <div className="border-b border-gray-200 px-6 py-3 flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-gray-900 text-white flex items-center justify-center text-xs font-semibold">
                  {(() => {
                    const n = (selectedMesterName || '').trim();
                    const parts = n.split(" ").filter(Boolean);
                    const initials = (parts[0]?.[0] || '') + (parts[1]?.[0] || '');
                    return (initials || (n[0] || 'P')).toUpperCase();
                  })()}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">{selectedMesterName || 'Pro'}</div>
                  <div className="text-xs text-gray-500 truncate max-w-md">{selectedService?.name || 'Service'}</div>
                </div>
              </div>
              <div className="flex-1 overflow-auto p-6 space-y-4">
                {messages.map((m) => (
                  <div key={m.id} className={`max-w-md ${m.sender_type === 'customer' ? 'ml-auto text-right' : ''}`}>
                    <div className={`inline-block px-3 py-2 rounded-lg ${m.sender_type === 'customer' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'}`}>
                      <div className="text-sm">{m.body}</div>
                    </div>
                    <div className="text-[11px] text-gray-400 mt-1">{new Date(m.created_at).toLocaleString()}</div>
                  </div>
                ))}
              </div>
              <div className="border-t border-gray-200 p-4 flex items-center space-x-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message"
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void onSend(); } }}
                />
                <Button onClick={() => void onSend()}>Send</Button>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}



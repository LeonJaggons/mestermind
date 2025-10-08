import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { subscribeToAuthChanges } from "@/lib/auth";
import {
  fetchProStatus,
  listThreads,
  listMessages,
  markThreadRead,
  sendMessage,
  getCustomerRequest,
  fetchServiceById,
  listOffers,
    getCoordinatesByPostalCode,
  type MessageThread,
  type Message,
  type CustomerRequest,
  type Service,
  type Offer,
} from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import RequestOfferSidebar from "@/components/RequestOfferSidebar";
import { Inbox, Mail, Archive, Star, Send, Search, Lock } from "lucide-react";
import PaywallModal from "@/components/PaywallModal";

export default function ProMessagesPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [mesterId, setMesterId] = useState<string | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallContext, setPaywallContext] = useState<{ title?: string; body?: string; cta?: string } | null>(null);

  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [search, setSearch] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedThread, setSelectedThread] = useState<MessageThread | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<CustomerRequest | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number | null; lon: number | null; name: string; city_name: string } | null>(null);

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
    return () => { if (unsub) unsub(); };
  }, [router]);

  useEffect(() => {
    if (checking || !mesterId) return;
    setLoading(true);
    listThreads({ mester_id: mesterId, viewer_type: "mester" })
      .then((ts) => setThreads(ts))
      .finally(() => setLoading(false));
  }, [checking, mesterId]);

  useEffect(() => {
    if (!selectedThreadId) return;
    const thread = threads.find((t) => t.id === selectedThreadId) || null;
    setSelectedThread(thread);
    listMessages(selectedThreadId, { viewer_type: "mester" }).then((ms) => setMessages(ms));
    // mark read as mester
    void markThreadRead(selectedThreadId, "mester");
  }, [selectedThreadId]);

  useEffect(() => {
    // Load request, service, and offer for the selected thread
    (async () => {
      if (!selectedThread) {
        setSelectedRequest(null);
        setSelectedService(null);
        setSelectedOffer(null);
        setSelectedLocation(null);
        return;
      }
      try {
        const req = await getCustomerRequest(selectedThread.request_id);
        setSelectedRequest(req);
        try {
          const svc = await fetchServiceById(req.service_id);
          setSelectedService(svc);
        } catch {}
        try {
          const offers = await listOffers({ request_id: selectedThread.request_id, mester_id: selectedThread.mester_id });
          setSelectedOffer(offers && offers.length > 0 ? offers[0] : null);
        } catch {}
        if (req.postal_code) {
          try {
            const coords = await getCoordinatesByPostalCode(req.postal_code);
            setSelectedLocation({ lat: coords.lat, lon: coords.lon, name: coords.name, city_name: coords.city_name });
          } catch {
            setSelectedLocation(null);
          }
        } else {
          setSelectedLocation(null);
        }
      } catch {
        setSelectedRequest(null);
        setSelectedService(null);
        setSelectedOffer(null);
        setSelectedLocation(null);
      }
    })();
  }, [selectedThread]);

  const formatWeeklyAvailability = (av: unknown): string => {
    if (!av || typeof av !== 'object' || !('type' in av) || av.type !== "weekly") return "Not specified";
    const avObj = av as { type: string; days?: unknown[]; start?: string; end?: string };
    const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const dayNames = (avObj.days || [])
      .filter((d: unknown) => Number.isInteger(d) && typeof d === 'number' && d >= 0 && d <= 6)
      .map((d: unknown) => labels[d as number]);
    if (dayNames.length === 0) return "Not specified";
    return `${dayNames.join(", ")} • ${avObj.start || ''}–${avObj.end || ''}`;
  };

  const getAvailability = (): unknown | null => {
    const req = selectedRequest as CustomerRequest & { availability?: unknown; answers?: Record<string, unknown> };
    if (!req) return null;
    if (req.availability && typeof req.availability === 'object' && req.availability !== null && 'type' in req.availability && (req.availability as { type: string }).type === "weekly") return req.availability;
    const a = req.answers?.availability;
    if (!a) return null;
    if (a && typeof a === "object" && "value" in a) return (a as { value: unknown }).value;
    return a;
  };

  const filteredThreads = useMemo(() => {
    if (!search.trim()) return threads;
    const q = search.toLowerCase();
    return threads.filter((t) => (t.last_message_preview || "").toLowerCase().includes(q));
  }, [threads, search]);

  const onSend = async () => {
    if (!selectedThreadId || !newMessage.trim() || !mesterId) return;
    try {
      const msg = await sendMessage(selectedThreadId, { body: newMessage.trim(), sender_type: "mester", sender_mester_id: mesterId });
      setMessages((prev) => [...prev, msg]);
      setNewMessage("");
    } catch (e: unknown) {
      if ((e as { code?: string })?.code === "PAYMENT_REQUIRED") {
        setPaywallContext({
          title: "Send your reply",
          body: "Unlock this conversation to send your next message, share details, and move the job forward.",
          cta: "Unlock to send",
        });
        setShowPaywall(true);
        return;
      }
      throw e;
    }
  };

  // Locked once mester has replied at least once AND there exist customer messages after that reply
  const { firstMesterIndex, isLocked } = useMemo(() => {
    if (!messages || messages.length === 0) return { firstMesterIndex: -1, isLocked: false };
    const idx = messages.findIndex((m) => m.sender_type === "mester");
    if (idx === -1) return { firstMesterIndex: -1, isLocked: false };
    const hasCustomerAfter = messages.slice(idx + 1).some((m) => m.sender_type === "customer");
    return { firstMesterIndex: idx, isLocked: hasCustomerAfter };
  }, [messages]);

  return (
    <main className=" bg-white"  style={{maxHeight: "calc(100vh - 64px)"}}
  >
      <PaywallModal
        open={showPaywall}
        onClose={() => setShowPaywall(false)}
        onUpgrade={() => {
          setShowPaywall(false);
          router.push("/pro/subscribe");
        }}
        audience="mester"
        titleOverride={paywallContext?.title}
        bodyOverride={paywallContext?.body}
        ctaOverride={paywallContext?.cta}
      />
      <div className="flex" style={{maxHeight: "calc(100vh - 64px)", overflow: "hidden"}}>
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-gray-200 p-4">
          <nav className="space-y-2">
            <div className="flex items-center space-x-3 p-2 rounded-lg bg-blue-50">
              <Inbox className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium text-gray-900">Messages</span>
            </div>
            <div className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50">
              <Mail className="h-5 w-5 text-gray-500" />
              <span className="text-sm font-medium text-gray-600">Unread</span>
            </div>
            <div className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50">
              <Archive className="h-5 w-5 text-gray-500" />
              <span className="text-sm font-medium text-gray-600">Archived</span>
            </div>
            <div className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50">
              <Send className="h-5 w-5 text-gray-500" />
              <span className="text-sm font-medium text-gray-600">Sent quotes</span>
            </div>
            <div className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50">
              <Star className="h-5 w-5 text-gray-500" />
              <span className="text-sm font-medium text-gray-600">Starred</span>
            </div>
          </nav>
        </aside>

        {/* Thread list + Conversation + Details */}
        <section className="flex-1 flex">
          {/* Left pane: search + thread list */}
          <div className="w-96 border-r border-gray-200 flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by customer name"
                  className="pl-9"
                />
              </div>
            </div>
            <div className="flex-1 overflow-auto">
              {loading && (
                <div className="p-4 text-sm text-gray-500">Loading…</div>
              )}
              {!loading && filteredThreads.length === 0 && (
                <div className="p-6 text-sm text-gray-500">After you respond to a lead, you can follow up with it here.</div>
              )}
              {!loading && filteredThreads.map((t) => {
                const isSelected = selectedThreadId === t.id;
                const showLocked = isSelected && isLocked;
                return (
                  <button
                    key={t.id}
                    onClick={() => setSelectedThreadId(t.id)}
                    className={`w-full text-left p-4 border-b border-gray-100 hover:bg-gray-50 ${isSelected ? 'bg-gray-50' : ''}`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Customer avatar */}
                      <div className="h-8 w-8 flex-shrink-0 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-semibold">
                        {(() => {
                          if (isSelected && selectedRequest) {
                            const f = (selectedRequest.first_name || '').trim();
                            const l = (selectedRequest.last_name || '').trim();
                            const fi = f ? f[0] : '';
                            const li = l ? l[0] : '';
                            const initials = (fi + li || (f[0] || '')).toUpperCase() || 'C';
                            return initials;
                          }
                          return 'C';
                        })()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className={`text-sm ${showLocked ? 'text-gray-500' : 'text-gray-900'} truncate`}>
                          {t.last_message_preview || 'New conversation'}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">{t.last_message_at ? new Date(t.last_message_at).toLocaleString() : ''}</div>
                      </div>
                      {/* {showLocked && (
                        <span className="uppercase inline-flex h-6 w-32 items-center justify-center gap-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                          Continue chat
                        </span>
                      )} */}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Middle pane: conversation */}
          <div className="flex-1 flex flex-col">
            {!selectedThreadId ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center text-gray-500 text-sm">After you respond to a lead, you can follow up with it here.</div>
              </div>
            ) : (
              <>
              {/* Conversation header: Customer initials + Service name */}
              <div className="border-b border-gray-200 px-6 py-3 flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-semibold">
                  {(() => {
                    const f = (selectedRequest?.first_name || '').trim();
                    const l = (selectedRequest?.last_name || '').trim();
                    const fi = f ? f[0] : '';
                    const li = l ? l[0] : '';
                    const initials = (fi + li || (f[0] || '')).toUpperCase() || 'C';
                    return initials;
                  })()}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">{selectedService?.name || 'Service request'}</div>
                  {selectedRequest?.message_to_pro && (
                    <div className="text-xs text-gray-500 truncate max-w-md">{selectedRequest.message_to_pro}</div>
                  )}
                </div>
              </div>
            <div className="flex-1 overflow-auto p-6 space-y-4">
              {messages.map((m, idx) => {
                const shouldBlur = firstMesterIndex !== -1 && idx > firstMesterIndex && m.sender_type === "customer";
                return (
                  <div key={m.id} className={`max-w-md ${m.sender_type === 'mester' ? 'ml-auto text-right' : ''}`}>
                    <div className={`relative inline-block px-3 py-2 rounded-lg ${m.sender_type === 'mester' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'}`}>
                      <div className={`text-sm ${shouldBlur ? 'blur-sm select-none' : ''}`}>{m.body}</div>
                      {shouldBlur && (
                        <button
                          type="button"
                          className="absolute inset-0 flex items-center justify-center"
                          onClick={() => {
                            setPaywallContext({
                              title: "See the customer's message",
                              body: "Unlock this conversation to view the customer’s full message and keep the momentum going.",
                              cta: "Unlock to view",
                            });
                            setShowPaywall(true);
                          }}
                        >
                          <span className="inline-flex h-6 w-32 items-center justify-center gap-1 text-xs font-medium bg-white/80 rounded shadow">
                            <Lock className="h-3.5 w-3.5" />
                            Continue to view
                          </span>
                        </button>
                      )}
                    </div>
                    <div className="text-[11px] text-gray-400 mt-1">{new Date(m.created_at).toLocaleString()}</div>
                  </div>
                );
              })}
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

          <RequestOfferSidebar
            request={selectedRequest as CustomerRequest}
            service={selectedService}
            offer={selectedOffer}
            mapLocation={selectedLocation || undefined}
            onProposeTime={(msg) => setNewMessage((prev) => (prev ? prev + '\n' : '') + msg)}
          />
        </section>
      </div>
    </main>
  );
}




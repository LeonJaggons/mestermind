import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import { subscribeToAuthChanges } from "@/lib/auth";
import { listMessages, getRequestById, fetchServiceById, fetchMesterById, sendMessage, markThreadRead, type Message, type MessageThread, type CustomerRequest, type Service, type MesterDetailResponse } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function CustomerThreadPage() {
  const router = useRouter();
  const { threadId } = router.query as { threadId?: string };
  const [checking, setChecking] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedMesterName, setSelectedMesterName] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribeToAuthChanges(async (u) => {
      if (!u) {
        router.replace("/login");
        return;
      }
      setChecking(false);
    });
    return () => { if (unsub) unsub(); };
  }, [router]);

  useEffect(() => {
    if (!threadId || checking) return;
    listMessages(threadId).then((ms) => setMessages(ms));
    void markThreadRead(threadId, "customer");
  }, [threadId, checking]);

  const onSend = async () => {
    if (!threadId || !newMessage.trim()) return;
    const msg = await sendMessage(threadId, { body: newMessage.trim(), sender_type: "customer" });
    setMessages((prev) => [...prev, msg]);
    setNewMessage("");
  };

  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto">
        <div className="sticky top-0 z-10 border-b border-gray-200 px-4 py-3 bg-white flex items-center gap-3">
          <button className="text-sm text-blue-600" onClick={() => router.push("/messages")}>Back</button>
          <div className="text-sm font-medium text-gray-900 truncate">Conversation</div>
        </div>
        <div className="p-4 space-y-4">
          {messages.map((m) => (
            <div key={m.id} className={`max-w-[85%] ${m.sender_type === 'customer' ? 'ml-auto text-right' : ''}`}>
              <div className={`inline-block px-3 py-2 rounded-lg ${m.sender_type === 'customer' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'}`}>
                <div className="text-sm">{m.body}</div>
              </div>
              <div className="text-[11px] text-gray-400 mt-1">{new Date(m.created_at).toLocaleString()}</div>
            </div>
          ))}
        </div>
        <div className="sticky bottom-0 border-t border-gray-200 p-4 bg-white flex items-center gap-2">
          <Input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Type a message" onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void onSend(); } }} />
          <Button onClick={() => void onSend()}>Send</Button>
        </div>
      </div>
    </main>
  );
}

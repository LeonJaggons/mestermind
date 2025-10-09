import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { subscribeToAuthChanges } from "@/lib/auth";
import { listMessages, sendMessage, markThreadRead, fetchProStatus, type Message } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function ProThreadPage() {
  const router = useRouter();
  const { threadId } = router.query as { threadId?: string };
  const [checking, setChecking] = useState(true);
  const [mesterId, setMesterId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");

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
    if (!threadId || checking) return;
    listMessages(threadId, { viewer_type: "mester" }).then((ms) => setMessages(ms));
    void markThreadRead(threadId, "mester");
  }, [threadId, checking]);

  const onSend = async () => {
    if (!threadId || !newMessage.trim() || !mesterId) return;
    const msg = await sendMessage(threadId, { body: newMessage.trim(), sender_type: "mester", sender_mester_id: mesterId });
    setMessages((prev) => [...prev, msg]);
    setNewMessage("");
  };

  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto">
        <div className="sticky top-0 z-10 border-b border-gray-200 px-4 py-3 bg-white flex items-center gap-3">
          <button className="text-sm text-blue-600" onClick={() => router.push("/pro/messages")}>Back</button>
          <div className="text-sm font-medium text-gray-900 truncate">Conversation</div>
        </div>
        <div className="p-4 space-y-4">
          {messages.map((m) => (
            <div key={m.id} className={`max-w-[85%] ${m.sender_type === 'mester' ? 'ml-auto text-right' : ''}`}>
              <div className={`inline-block px-3 py-2 rounded-lg ${m.sender_type === 'mester' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'}`}>
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

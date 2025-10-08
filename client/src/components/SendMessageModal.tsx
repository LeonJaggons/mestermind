import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LuSend, LuCheck } from "react-icons/lu";
import {
  createOrGetThread,
  sendMessage,
  type MessageThread,
} from "@/lib/api";

interface SendMessageModalProps {
  open: boolean;
  onClose: () => void;
  requestId: string;
  mesterId: string;
  serviceName: string;
  onMessageSent?: () => void;
}

export default function SendMessageModal({
  open,
  onClose,
  requestId,
  mesterId,
  serviceName,
  onMessageSent,
}: SendMessageModalProps) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    if (!message.trim()) return;

    setSending(true);
    try {
      // Create or get the thread
      const thread: MessageThread = await createOrGetThread({
        request_id: requestId,
        mester_id: mesterId,
      });

      // Send the message
      await sendMessage(thread.id, {
        body: message,
        sender_type: "customer",
      });

      setSent(true);
      setMessage("");

      // Wait a moment to show success, then close
      setTimeout(() => {
        if (onMessageSent) onMessageSent();
        handleClose();
      }, 1500);
    } catch (error) {
      console.error("Error sending message:", error);
      alert("Failed to send message. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    if (!sending) {
      setMessage("");
      setSent(false);
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {sent ? (
              <>
                <LuCheck className="w-5 h-5 text-green-600" />
                Message Sent!
              </>
            ) : (
              <>
                <LuSend className="w-5 h-5" />
                Send Message to Pro
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {sent
              ? "Your message has been sent. The pro will be notified."
              : `Introduce yourself and confirm next steps for your ${serviceName} request.`}
          </DialogDescription>
        </DialogHeader>

        {!sent && (
          <div className="space-y-4 py-4">
            <div>
              <label
                htmlFor="message"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Your Message
              </label>
              <textarea
                id="message"
                rows={6}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Hi! I'd like to move forward with your quote. When would you be available to start?"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 resize-none"
                disabled={sending}
              />
              <p className="mt-1 text-sm text-gray-500">
                Tip: Include your availability and any specific requirements.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={sending}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSend}
                disabled={sending || !message.trim()}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {sending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Sending...
                  </>
                ) : (
                  <>
                    <LuSend className="w-4 h-4 mr-2" />
                    Send Message
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {sent && (
          <div className="py-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <LuCheck className="w-8 h-8 text-green-600" />
            </div>
            <p className="text-gray-600">
              The pro will receive your message and can respond through the
              messaging system.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

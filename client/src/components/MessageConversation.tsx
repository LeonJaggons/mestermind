import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Message, AppointmentProposal } from "@/lib/api";
import { AppointmentProposalCard } from "@/components/AppointmentProposalCard";
import { AppointmentReminder } from "@/components/AppointmentReminder";

interface MessageConversationProps {
  threadId: string | null;
  messages: Message[];
  proposals: AppointmentProposal[];
  newMessage: string;
  onNewMessageChange: (value: string) => void;
  onSendMessage: () => Promise<void>;
  onProposalUpdated?: () => void;
  onCreateAppointment?: () => void;
  viewerType: "customer" | "mester";
  viewerId: string;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  showBackButton?: boolean;
  basePath?: string;
  emptyState?: React.ReactNode;
  renderMessageExtra?: (message: Message) => React.ReactNode;
}

export default function MessageConversation({
  threadId,
  messages,
  proposals,
  newMessage,
  onNewMessageChange,
  onSendMessage,
  onProposalUpdated,
  onCreateAppointment,
  viewerType,
  viewerId,
  header,
  footer,
  showBackButton = false,
  basePath,
  emptyState,
  renderMessageExtra,
}: MessageConversationProps) {
  const router = useRouter();
  const [isSending, setIsSending] = useState(false);
  const [showAppointmentReminder, setShowAppointmentReminder] = useState(false);

  // Determine if appointment reminder should be shown
  useEffect(() => {
    if (!threadId || viewerType !== "mester") {
      setShowAppointmentReminder(false);
      return;
    }

    // Check if already dismissed for this thread
    const isDismissed = localStorage.getItem(
      `appointment_reminder_dismissed_${threadId}`
    );
    if (isDismissed === "true") {
      setShowAppointmentReminder(false);
      return;
    }

    // Show reminder if:
    // 1. Mester has sent 3+ messages OR total conversation has 6+ messages
    // 2. No appointment proposals exist yet
    const mesterMessages = messages.filter(
      (m) => m.sender_type === "mester"
    ).length;
    const totalMessages = messages.length;

    const shouldShow =
      (mesterMessages >= 3 || totalMessages >= 6) && proposals.length === 0;

    setShowAppointmentReminder(shouldShow);
  }, [threadId, messages, proposals, viewerType]);

  const handleSend = async () => {
    if (isSending || !newMessage.trim()) return;
    setIsSending(true);
    try {
      await onSendMessage();
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  if (!threadId) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        {emptyState || (
          <div className="text-center text-gray-500 text-sm">
            Select a conversation to view messages.
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white min-h-0 border-l border-gray-200">
      {/* Header */}
      {header && (
        <div className="flex-shrink-0 border-b border-gray-200 px-4 sm:px-6 py-3 flex items-center gap-3">
          {showBackButton && basePath && (
            <button
              onClick={() => router.push(basePath)}
              className="lg:hidden text-gray-600 hover:text-gray-900 -ml-2"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          {header}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 min-h-0 bg-gray-50">
        {/* Appointment Proposals */}
        {proposals.length > 0 && (
          <div className="space-y-3 mb-4">
            {proposals.map((proposal) => (
              <AppointmentProposalCard
                key={proposal.id}
                proposal={proposal}
                viewerType={viewerType}
                viewerId={viewerId}
                onProposalUpdated={onProposalUpdated}
              />
            ))}
          </div>
        )}

        {/* Appointment Reminder for Mesters */}
        {showAppointmentReminder && threadId && onCreateAppointment && (
          <AppointmentReminder
            threadId={threadId}
            onCreateAppointment={onCreateAppointment}
            onDismiss={() => setShowAppointmentReminder(false)}
          />
        )}

        {/* Messages */}
        {messages.map((message) => {
          const isSender = message.sender_type === viewerType;
          return (
            <div
              key={message.id}
              className={`max-w-[85%] sm:max-w-md ${
                isSender ? "ml-auto text-right" : ""
              }`}
            >
              <div
                className={`inline-block px-3 py-2 rounded-lg ${
                  isSender
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-900 border border-gray-200"
                } ${message.is_blurred ? "relative" : ""}`}
              >
                <div
                  className={`text-sm ${
                    message.is_blurred ? "blur-sm select-none" : ""
                  }`}
                >
                  {message.body}
                </div>
                {renderMessageExtra && renderMessageExtra(message)}
              </div>
              <div className="text-[11px] text-gray-400 mt-1">
                {new Date(message.created_at).toLocaleString()}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 border-t border-gray-200 bg-white">
        {footer}
        <div className="p-4 flex items-center space-x-2">
          <Input
            value={newMessage}
            onChange={(e) => onNewMessageChange(e.target.value)}
            placeholder="Type a message"
            onKeyDown={handleKeyDown}
            disabled={isSending}
          />
          <Button onClick={handleSend} disabled={isSending || !newMessage.trim()}>
            {isSending ? "Sending..." : "Send"}
          </Button>
        </div>
      </div>
    </div>
  );
}


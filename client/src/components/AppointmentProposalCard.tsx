import { useState } from "react";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import {
  AppointmentProposal,
  acceptAppointmentProposal,
  rejectAppointmentProposal,
  cancelAppointmentProposal,
} from "@/lib/api";

interface AppointmentProposalCardProps {
  proposal: AppointmentProposal;
  viewerType: "customer" | "mester";
  viewerId: string; // customer user ID or mester ID
  onProposalUpdated: () => void;
}

export function AppointmentProposalCard({
  proposal,
  viewerType,
  viewerId,
  onProposalUpdated,
}: AppointmentProposalCardProps) {
  const router = useRouter();
  const [responseMessage, setResponseMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showResponseInput, setShowResponseInput] = useState(false);
  const [actionType, setActionType] = useState<"accept" | "reject" | null>(
    null,
  );

  const proposedDate = new Date(proposal.proposed_date);
  const now = new Date();
  const isPast = proposedDate < now;

  const handleAccept = async () => {
    if (viewerType !== "customer") return;

    setError(null);
    setIsSubmitting(true);

    try {
      await acceptAppointmentProposal(proposal.id, viewerId, {
        response_message: responseMessage || undefined,
      });
      onProposalUpdated();
    } catch (err) {
      console.error("Error accepting proposal:", err);
      setError(
        err instanceof Error ? err.message : "Failed to accept proposal",
      );
    } finally {
      setIsSubmitting(false);
      setShowResponseInput(false);
      setResponseMessage("");
    }
  };

  const handleReject = async () => {
    if (viewerType !== "customer") return;

    setError(null);
    setIsSubmitting(true);

    try {
      await rejectAppointmentProposal(proposal.id, viewerId, {
        response_message: responseMessage || undefined,
      });
      onProposalUpdated();
    } catch (err) {
      console.error("Error rejecting proposal:", err);
      setError(
        err instanceof Error ? err.message : "Failed to reject proposal",
      );
    } finally {
      setIsSubmitting(false);
      setShowResponseInput(false);
      setResponseMessage("");
    }
  };

  const handleCancel = async () => {
    if (viewerType !== "mester") return;

    setError(null);
    setIsSubmitting(true);

    try {
      await cancelAppointmentProposal(proposal.id, viewerId);
      onProposalUpdated();
    } catch (err) {
      console.error("Error canceling proposal:", err);
      setError(
        err instanceof Error ? err.message : "Failed to cancel proposal",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const openResponseInput = (action: "accept" | "reject") => {
    setActionType(action);
    setShowResponseInput(true);
  };

  const submitResponse = () => {
    if (actionType === "accept") {
      void handleAccept();
    } else if (actionType === "reject") {
      void handleReject();
    }
  };

  const getStatusColor = () => {
    switch (proposal.status) {
      case "accepted":
        return "bg-green-50 border-green-200 text-green-800";
      case "rejected":
        return "bg-red-50 border-red-200 text-red-800";
      case "cancelled":
        return "bg-gray-50 border-gray-200 text-gray-800";
      case "expired":
        return "bg-orange-50 border-orange-200 text-orange-800";
      default:
        return "bg-blue-50 border-blue-200 text-blue-800";
    }
  };

  const getStatusLabel = () => {
    switch (proposal.status) {
      case "accepted":
        return (
          <span className="inline-flex items-center gap-1">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Accepted
          </span>
        );
      case "rejected":
        return (
          <span className="inline-flex items-center gap-1">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            Declined
          </span>
        );
      case "cancelled":
        return "Cancelled";
      case "expired":
        return "Expired";
      default:
        return "Pending";
    }
  };

  return (
    <div
      className={`border rounded-lg p-4 ${getStatusColor()} transition-colors`}
    >
      {/* Status Badge */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-white/50">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Appointment Proposal
        </div>
        <span className="text-xs font-semibold">{getStatusLabel()}</span>
      </div>

      {/* Appointment Details */}
      <div className="space-y-2.5 mb-3">
        <div className="flex items-start gap-2.5">
          <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <div className="flex-1">
            <span className="text-sm font-medium">Date:</span>
            <span className="text-sm ml-2">
              {proposedDate.toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          </div>
        </div>

        <div className="flex items-start gap-2.5">
          <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="flex-1">
            <span className="text-sm font-medium">Time:</span>
            <span className="text-sm ml-2">
              {proposedDate.toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            {isPast && proposal.status === "proposed" && (
              <span className="text-xs text-red-600 ml-2">(Past)</span>
            )}
          </div>
        </div>

        {proposal.duration_minutes && (
          <div className="flex items-start gap-2.5">
            <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <span className="text-sm font-medium">Duration:</span>
              <span className="text-sm ml-2">{proposal.duration_minutes} minutes</span>
            </div>
          </div>
        )}

        {proposal.price && (
          <div className="flex items-start gap-2.5">
            <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <span className="text-sm font-medium">Price:</span>
              <span className="text-sm ml-2 font-semibold">
                {parseInt(proposal.price.toString()).toLocaleString()} {proposal.currency || "HUF"}
              </span>
            </div>
          </div>
        )}

        {proposal.offer_message && (
          <div className="flex items-start gap-2.5">
            <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <span className="text-sm font-medium">Price Details:</span>
              <p className="text-sm mt-1">{proposal.offer_message}</p>
            </div>
          </div>
        )}

        {proposal.location && (
          <div className="flex items-start gap-2.5">
            <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <div className="flex-1">
              <span className="text-sm font-medium">Location:</span>
              <span className="text-sm ml-2">{proposal.location}</span>
            </div>
          </div>
        )}

        {proposal.notes && (
          <div className="mt-2 pt-3 border-t border-current/20">
            <div className="flex items-start gap-2.5">
              <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
              <div className="flex-1">
                <span className="text-sm font-medium">Notes:</span>
                <p className="text-sm mt-1">{proposal.notes}</p>
              </div>
            </div>
          </div>
        )}

        {proposal.response_message && (
          <div className="mt-2 pt-2 border-t border-current/20">
            <span className="text-sm font-medium">
              {viewerType === "customer" ? "Your response:" : "Customer's response:"}
            </span>
            <p className="text-sm mt-1 italic">{proposal.response_message}</p>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded text-sm mb-3">
          {error}
        </div>
      )}

      {/* Response Input (Customer Only) */}
      {showResponseInput && viewerType === "customer" && (
        <div className="mb-3 space-y-2">
          <textarea
            value={responseMessage}
            onChange={(e) => setResponseMessage(e.target.value)}
            placeholder={`Add a message (optional)...`}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            rows={2}
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setShowResponseInput(false);
                setResponseMessage("");
                setActionType(null);
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={submitResponse}
              disabled={isSubmitting}
              className={
                actionType === "accept"
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-red-600 hover:bg-red-700"
              }
            >
              {isSubmitting
                ? "..."
                : actionType === "accept"
                  ? "Confirm Accept"
                  : "Confirm Decline"}
            </Button>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {proposal.status === "proposed" && !isPast && (
        <div className="flex gap-2 mt-3">
          {viewerType === "customer" && !showResponseInput && (
            <>
              <Button
                size="sm"
                className="flex-1 bg-green-600 hover:bg-green-700 inline-flex items-center justify-center gap-1.5"
                onClick={() => openResponseInput("accept")}
                disabled={isSubmitting}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Accept
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 border-red-300 text-red-600 hover:bg-red-50 inline-flex items-center justify-center gap-1.5"
                onClick={() => openResponseInput("reject")}
                disabled={isSubmitting}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                Decline
              </Button>
            </>
          )}

          {viewerType === "mester" && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleCancel}
              disabled={isSubmitting}
              className="text-gray-600"
            >
              {isSubmitting ? "Canceling..." : "Cancel Proposal"}
            </Button>
          )}
        </div>
      )}

      {isPast && proposal.status === "proposed" && (
        <div className="text-xs text-gray-500 mt-2 italic">
          This proposal has passed and can no longer be accepted.
        </div>
      )}

      {/* View Appointment Button */}
      {proposal.status === "accepted" && proposal.appointment_id && (
        <div className="mt-3">
          <Button
            size="sm"
            className="w-full bg-blue-600 hover:bg-blue-700"
            onClick={() => {
              const path = viewerType === "mester" 
                ? `/pro/appointments/${proposal.appointment_id}`
                : `/appointments/${proposal.appointment_id}`;
              router.push(path);
            }}
          >
            View Confirmed Appointment →
          </Button>
        </div>
      )}
    </div>
  );
}


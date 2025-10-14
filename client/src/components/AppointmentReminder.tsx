import { Button } from "@/components/ui/button";
import { Calendar, TrendingUp, X } from "lucide-react";
import { useState } from "react";

interface AppointmentReminderProps {
  threadId: string;
  onCreateAppointment: () => void;
  onDismiss?: () => void;
}

export function AppointmentReminder({
  threadId,
  onCreateAppointment,
  onDismiss,
}: AppointmentReminderProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  const handleDismiss = () => {
    setIsDismissed(true);
    if (onDismiss) {
      onDismiss();
    }
    // Store dismissal in localStorage to prevent showing again for this thread
    localStorage.setItem(`appointment_reminder_dismissed_${threadId}`, "true");
  };

  if (isDismissed) {
    return null;
  }

  return (
    <div className="mx-4 mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4 shadow-sm relative">
      {/* Dismiss button */}
      {onDismiss && (
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 text-blue-400 hover:text-blue-600 transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      )}

      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
            <Calendar className="h-5 w-5 text-blue-600" />
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-blue-900 mb-1">
            Ready to schedule an appointment?
          </h3>
          <p className="text-sm text-blue-700 mb-3">
            You've been chatting for a while. Move this conversation forward by
            proposing an appointment time and sending a price quote.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              onClick={onCreateAppointment}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Calendar className="h-4 w-4 mr-2" />
              Create Appointment Proposal
            </Button>
            
            <div className="flex items-center gap-2 text-xs text-blue-600">
              <TrendingUp className="h-3 w-3" />
              <span>Increase your booking rate</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { createAppointmentProposal } from "@/lib/api";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { DateCalendar } from "@mui/x-date-pickers/DateCalendar";
import { TimePicker } from "@mui/x-date-pickers/TimePicker";

interface AppointmentProposalModalProps {
  isOpen: boolean;
  onClose: () => void;
  threadId: string;
  mesterId: string;
  onProposalCreated: () => void;
}

export function AppointmentProposalModal({
  isOpen,
  onClose,
  threadId,
  mesterId,
  onProposalCreated,
}: AppointmentProposalModalProps) {
  // Step management
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;

  // Step 1: Offer Details
  const [price, setPrice] = useState("");
  const [offerMessage, setOfferMessage] = useState("");

  // Step 2: Appointment Scheduling
  const [proposedDate, setProposedDate] = useState<Date | null>(null);
  const [proposedTime, setProposedTime] = useState<Date | null>(null);
  const [duration, setDuration] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateStep1 = () => {
    if (!price || parseFloat(price) <= 0) {
      setError("Please enter a valid price");
      return false;
    }
    setError(null);
    return true;
  };

  const validateStep2 = () => {
    if (!proposedDate || !proposedTime) {
      setError("Please select both date and time");
      return false;
    }
    if (isNaN(proposedDate.getTime()) || isNaN(proposedTime.getTime())) {
      setError("Invalid date or time selected");
      return false;
    }
    setError(null);
    return true;
  };

  const handleNext = () => {
    if (currentStep === 1 && !validateStep1()) return;
    if (currentStep === 2 && !validateStep2()) return;
    // Step 3 (location/notes) has no required fields, so no validation needed
    setCurrentStep(currentStep + 1);
  };

  const handleBack = () => {
    setError(null);
    setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async () => {
    setError(null);
    setIsSubmitting(true);

    try {
      if (!proposedDate || !proposedTime) {
        setError("Please select both date and time");
        return;
      }

      // Combine date and time into a single DateTime
      const combinedDateTime = new Date(
        proposedDate.getFullYear(),
        proposedDate.getMonth(),
        proposedDate.getDate(),
        proposedTime.getHours(),
        proposedTime.getMinutes(),
        0,
        0
      );

      await createAppointmentProposal(threadId, mesterId, {
        proposed_date: combinedDateTime.toISOString(),
        duration_minutes: duration ? parseInt(duration) : undefined,
        location: location || undefined,
        notes: notes || undefined,
        price: parseFloat(price),
        currency: "HUF",
        offer_message: offerMessage || undefined,
      });

      // Reset form
      resetForm();
      onProposalCreated();
      onClose();
    } catch (err) {
      console.error("Error creating appointment proposal:", err);
      setError(
        err instanceof Error ? err.message : "Failed to create proposal",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setCurrentStep(1);
    setProposedDate(null);
    setProposedTime(null);
    setDuration("");
    setLocation("");
    setNotes("");
    setPrice("");
    setOfferMessage("");
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Get min date (today) and max date (1 year from now)
  const today = new Date().toISOString().split("T")[0];
  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() + 1);
  const maxDateStr = maxDate.toISOString().split("T")[0];

  const getStepTitle = () => {
    switch (currentStep) {
      case 1:
        return "Step 1: Offer Details";
      case 2:
        return "Step 2: Schedule Date & Time";
      case 3:
        return "Step 3: Location & Notes";
      case 4:
        return "Step 4: Review & Confirm";
      default:
        return "Propose Appointment";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{getStepTitle()}</DialogTitle>
          {/* Step Indicator */}
          <div className="flex items-center justify-center gap-1 mt-4">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                    step === currentStep
                      ? "bg-blue-600 text-white"
                      : step < currentStep
                      ? "bg-green-600 text-white"
                      : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {step < currentStep ? "✓" : step}
                </div>
                {step < totalSteps && (
                  <div
                    className={`w-8 h-1 ${
                      step < currentStep ? "bg-green-600" : "bg-gray-200"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Step 1: Offer Details */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="price">
                  Price (HUF) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="price"
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  min="0"
                  step="100"
                  placeholder="e.g., 50000"
                  required
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter the total price for this service
                </p>
              </div>

              <div>
                <Label htmlFor="offer-message">
                  Price Details / Offer Message
                </Label>
                <textarea
                  id="offer-message"
                  value={offerMessage}
                  onChange={(e) => setOfferMessage(e.target.value)}
                  placeholder="e.g., Includes all materials and labor, 1-year warranty..."
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Explain what&apos;s included in the price
                </p>
              </div>
            </div>
          )}

          {/* Step 2: Date & Time Selection */}
          {currentStep === 2 && (
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <div className="space-y-6">
                <div>
                  <Label className="text-base font-semibold mb-3 block">
                    Select Date <span className="text-red-500">*</span>
                  </Label>
                  <div className="flex justify-center">
                  <DateCalendar
                    value={proposedDate}
                    onChange={(newValue) => setProposedDate(newValue as Date | null)}
                    minDate={new Date()}
                    maxDate={maxDate}
                    sx={{
                      width: '100%',
                      maxWidth: '400px',
                    }}
                  />
                  </div>
                </div>

                <div>
                  <Label className="text-base font-semibold mb-2 block">
                    Select Time <span className="text-red-500">*</span>
                  </Label>
                  <TimePicker
                    value={proposedTime}
                    onChange={(newValue) => setProposedTime(newValue as Date | null)}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        required: true,
                        placeholder: "Select time",
                      },
                    }}
                  />
                </div>

                <div>
                  <Label htmlFor="duration">Duration (minutes)</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    min="15"
                    step="15"
                    placeholder="e.g., 60"
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Optional - Estimated duration of the appointment
                  </p>
                </div>
              </div>
            </LocalizationProvider>
          )}

          {/* Step 3: Location & Notes */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g., Customer's address"
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Optional - Where will the appointment take place?
                </p>
              </div>

              <div>
                <Label htmlFor="notes">Additional Notes</Label>
                <textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any special instructions or information..."
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[120px]"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Optional - Any additional details for the customer
                </p>
              </div>
            </div>
          )}

          {/* Step 4: Review & Confirm */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <h3 className="font-semibold text-gray-900 mb-3">
                  Offer Details
                </h3>
                <div className="flex justify-between">
                  <span className="text-gray-600">Price:</span>
                  <span className="font-semibold">
                    {parseInt(price).toLocaleString()} HUF
                  </span>
                </div>
                {offerMessage && (
                  <div>
                    <span className="text-gray-600">Details:</span>
                    <p className="text-sm mt-1 text-gray-900">{offerMessage}</p>
                  </div>
                )}
              </div>

              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <h3 className="font-semibold text-gray-900 mb-3">
                  Appointment Details
                </h3>
                <div className="flex justify-between">
                  <span className="text-gray-600">Date:</span>
                  <span className="font-semibold">
                    {proposedDate && new Date(proposedDate).toLocaleDateString("en-US", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Time:</span>
                  <span className="font-semibold">
                    {proposedTime && new Date(proposedTime).toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                {duration && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Duration:</span>
                    <span className="font-semibold">{duration} minutes</span>
                  </div>
                )}
                {location && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Location:</span>
                    <span className="font-semibold">{location}</span>
                  </div>
                )}
                {notes && (
                  <div>
                    <span className="text-gray-600">Notes:</span>
                    <p className="text-sm mt-1 text-gray-900">{notes}</p>
                  </div>
                )}
              </div>

              <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg text-sm">
                <strong>Note:</strong> The customer will see your offer price
                before accepting the appointment.
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-3 sm:gap-2">
          {currentStep > 1 && (
            <Button
              type="button"
              variant="outline"
              onClick={handleBack}
              disabled={isSubmitting}
            >
              Back
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          {currentStep < totalSteps ? (
            <Button
              type="button"
              onClick={handleNext}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Next
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleSubmit}
              className="bg-green-600 hover:bg-green-700"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Sending..." : "Send Proposal"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


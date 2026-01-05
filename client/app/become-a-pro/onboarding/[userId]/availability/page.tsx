"use client";

import { useRouter } from "next/navigation";
import { useState, use } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { API_BASE_URL } from "@/lib/api/config";

export default function AvailabilityPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const router = useRouter();
  const { userId } = use(params);
  const [availabilityType, setAvailabilityType] = useState<"flexible" | "specific">("specific");
  
  const [schedule, setSchedule] = useState({
    Sunday: { checked: false, start: "9:00 AM", end: "5:00 PM" },
    Monday: { checked: true, start: "9:00 AM", end: "5:00 PM" },
    Tuesday: { checked: true, start: "9:00 AM", end: "5:00 PM" },
    Wednesday: { checked: true, start: "9:00 AM", end: "5:00 PM" },
    Thursday: { checked: true, start: "9:00 AM", end: "5:00 PM" },
    Friday: { checked: true, start: "9:00 AM", end: "5:00 PM" },
    Saturday: { checked: false, start: "9:00 AM", end: "5:00 PM" },
  });

  const [leadTimeAmount, setLeadTimeAmount] = useState("2");
  const [leadTimeUnit, setLeadTimeUnit] = useState("hours");
  const [advanceAmount, setAdvanceAmount] = useState("3");
  const [advanceUnit, setAdvanceUnit] = useState("months");
  const [timeZone, setTimeZone] = useState("America/Los_Angeles");
  const [travelTime, setTravelTime] = useState("30");

  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  const handleDayToggle = (day: string) => {
    setSchedule((prev) => ({
      ...prev,
      [day]: { ...prev[day as keyof typeof prev], checked: !prev[day as keyof typeof prev].checked },
    }));
  };

  const handleTimeChange = (day: string, field: "start" | "end", value: string) => {
    setSchedule((prev) => ({
      ...prev,
      [day]: { ...prev[day as keyof typeof prev], [field]: value },
    }));
  };

  const applyToSelectedDays = () => {
    const selectedDays = Object.entries(schedule).filter(([_, data]) => data.checked);
    if (selectedDays.length === 0) return;

    const firstSelected = selectedDays[0][1];
    const newSchedule = { ...schedule };

    selectedDays.forEach(([day]) => {
      newSchedule[day as keyof typeof schedule] = {
        ...newSchedule[day as keyof typeof schedule],
        start: firstSelected.start,
        end: firstSelected.end,
      };
    });

    setSchedule(newSchedule);
  };

  const handleNext = async () => {
    // Save availability preferences to pro_profile
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/pro-profiles/user/${userId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          availability_type: availabilityType,
          schedule: schedule,
          lead_time_amount: parseInt(leadTimeAmount),
          lead_time_unit: leadTimeUnit,
          advance_booking_amount: parseInt(advanceAmount),
          advance_booking_unit: advanceUnit,
          time_zone: timeZone,
          travel_time: parseInt(travelTime),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save availability preferences");
      }

      router.push(`/become-a-pro/onboarding/${userId}/geo-preferences`);
    } catch (error) {
      console.error("Error saving availability preferences:", error);
      alert("Failed to save availability preferences. Please try again.");
    }
  };

  const handleBack = () => {
    router.back();
  };

  const timeOptions = [
    "12:00 AM", "12:30 AM", "1:00 AM", "1:30 AM", "2:00 AM", "2:30 AM",
    "3:00 AM", "3:30 AM", "4:00 AM", "4:30 AM", "5:00 AM", "5:30 AM",
    "6:00 AM", "6:30 AM", "7:00 AM", "7:30 AM", "8:00 AM", "8:30 AM",
    "9:00 AM", "9:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
    "12:00 PM", "12:30 PM", "1:00 PM", "1:30 PM", "2:00 PM", "2:30 PM",
    "3:00 PM", "3:30 PM", "4:00 PM", "4:30 PM", "5:00 PM", "5:30 PM",
    "6:00 PM", "6:30 PM", "7:00 PM", "7:30 PM", "8:00 PM", "8:30 PM",
    "9:00 PM", "9:30 PM", "10:00 PM", "10:30 PM", "11:00 PM", "11:30 PM",
  ];

  const timeZones = [
    { value: "America/New_York", label: "(GMT-05:00) Eastern Time" },
    { value: "America/Chicago", label: "(GMT-06:00) Central Time" },
    { value: "America/Denver", label: "(GMT-07:00) Mountain Time" },
    { value: "America/Los_Angeles", label: "(GMT-08:00) Pacific Time" },
    { value: "America/Anchorage", label: "(GMT-09:00) Alaska Time" },
    { value: "Pacific/Honolulu", label: "(GMT-10:00) Hawaii Time" },
  ];

  return (
    <>
      {/* Progress Bar */}
      <div className="w-full bg-gray-200 h-1">
        <div className="bg-[hsl(var(--primary))] h-1" style={{ width: "75%" }}></div>
      </div>

      {/* Main Content */}
      <div className="bg-white flex-1 pb-24">
        <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">When can you do the work?</h1>
          <p className="text-gray-600">Target the right customers</p>
        </div>

        {/* Availability Type Radio Buttons */}
        <div className="mb-8 space-y-3">
          <div
            className={`border rounded-lg p-4 cursor-pointer transition-all ${
              availabilityType === "flexible"
                ? "border-[hsl(var(--primary))] bg-blue-50"
                : "border-gray-300"
            }`}
            onClick={() => setAvailabilityType("flexible")}
          >
            <div className="flex items-start">
              <div className="flex items-center h-5 mt-0.5">
                <input
                  type="radio"
                  checked={availabilityType === "flexible"}
                  onChange={() => setAvailabilityType("flexible")}
                  className="w-4 h-4 text-[hsl(var(--primary))] border-gray-300 focus:ring-[hsl(var(--primary))]"
                />
              </div>
              <div className="ml-3">
                <label className="font-semibold text-gray-900 cursor-pointer">
                  Use any open day or time
                </label>
                <p className="text-sm text-gray-600 mt-1">
                  Get requests for all days and times. You choose which requests to respond to.
                </p>
              </div>
            </div>
          </div>

          <div
            className={`border rounded-lg p-4 cursor-pointer transition-all ${
              availabilityType === "specific"
                ? "border-[hsl(var(--primary))] bg-blue-50"
                : "border-gray-300"
            }`}
            onClick={() => setAvailabilityType("specific")}
          >
            <div className="flex items-start">
              <div className="flex items-center h-5 mt-0.5">
                <input
                  type="radio"
                  checked={availabilityType === "specific"}
                  onChange={() => setAvailabilityType("specific")}
                  className="w-4 h-4 text-[hsl(var(--primary))] border-gray-300 focus:ring-[hsl(var(--primary))]"
                />
              </div>
              <div className="ml-3">
                <label className="font-semibold text-gray-900 cursor-pointer">
                  Use specific hours
                </label>
                <p className="text-sm text-gray-600 mt-1">
                  Only get requests that match your schedule.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Weekly Schedule - Only show if specific hours selected */}
        {availabilityType === "specific" && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Set your weekly schedule</h2>
            <div className="space-y-3">
              {days.map((day) => (
                <div key={day} className="flex items-center gap-4">
                  <div className="flex items-center gap-2 w-28">
                    <input
                      type="checkbox"
                      id={day}
                      checked={schedule[day as keyof typeof schedule].checked}
                      onChange={() => handleDayToggle(day)}
                      className="h-5 w-5 shrink-0 rounded border border-gray-300 cursor-pointer checked:bg-[hsl(var(--primary))] checked:border-[hsl(var(--primary))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] focus:ring-offset-2"
                    />
                    <Label htmlFor={day} className="font-medium cursor-pointer">
                      {day}
                    </Label>
                  </div>
                  <div className="flex items-center gap-2 flex-1">
                    <select
                      value={schedule[day as keyof typeof schedule].start}
                      onChange={(e) => handleTimeChange(day, "start", e.target.value)}
                      disabled={!schedule[day as keyof typeof schedule].checked}
                      className="border border-gray-300 rounded px-3 py-2 text-sm disabled:bg-gray-100 disabled:text-gray-400"
                    >
                      {timeOptions.map((time) => (
                        <option key={time} value={time}>
                          {time}
                        </option>
                      ))}
                    </select>
                    <span className="text-gray-500">to</span>
                    <select
                      value={schedule[day as keyof typeof schedule].end}
                      onChange={(e) => handleTimeChange(day, "end", e.target.value)}
                      disabled={!schedule[day as keyof typeof schedule].checked}
                      className="border border-gray-300 rounded px-3 py-2 text-sm disabled:bg-gray-100 disabled:text-gray-400"
                    >
                      {timeOptions.map((time) => (
                        <option key={time} value={time}>
                          {time}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
            <Button
              onClick={applyToSelectedDays}
              variant="outline"
              className="mt-4"
            >
              Apply to selected days
            </Button>
          </div>
        )}

        {/* Lead Time */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-2">How much notice do you need?</h2>
          <p className="text-sm text-gray-600 mb-4">
            Choose the minimum amount of time you need between when a customer books and when you can start the job.
          </p>
          <div className="flex gap-3">
            <select
              value={leadTimeAmount}
              onChange={(e) => setLeadTimeAmount(e.target.value)}
              className="border border-gray-300 rounded px-4 py-2 flex-1"
            >
              {Array.from({ length: 24 }, (_, i) => i + 1).map((num) => (
                <option key={num} value={num}>
                  {num}
                </option>
              ))}
            </select>
            <select
              value={leadTimeUnit}
              onChange={(e) => setLeadTimeUnit(e.target.value)}
              className="border border-gray-300 rounded px-4 py-2 flex-1"
            >
              <option value="hours">Hours</option>
              <option value="days">Days</option>
              <option value="weeks">Weeks</option>
            </select>
          </div>
        </div>

        {/* Advance Booking */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-2">How far in advance can customers book?</h2>
          <p className="text-sm text-gray-600 mb-4">
            Choose how far into the future customers can request to book your services.
          </p>
          <div className="flex gap-3">
            <select
              value={advanceAmount}
              onChange={(e) => setAdvanceAmount(e.target.value)}
              className="border border-gray-300 rounded px-4 py-2 flex-1"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((num) => (
                <option key={num} value={num}>
                  {num}
                </option>
              ))}
            </select>
            <select
              value={advanceUnit}
              onChange={(e) => setAdvanceUnit(e.target.value)}
              className="border border-gray-300 rounded px-4 py-2 flex-1"
            >
              <option value="weeks">Weeks</option>
              <option value="months">Months</option>
              <option value="years">Years</option>
            </select>
          </div>
        </div>

        {/* Time Zone */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-2">What's your time zone?</h2>
          <select
            value={timeZone}
            onChange={(e) => setTimeZone(e.target.value)}
            className="border border-gray-300 rounded px-4 py-2 w-full"
          >
            {timeZones.map((tz) => (
              <option key={tz.value} value={tz.value}>
                {tz.label}
              </option>
            ))}
          </select>
        </div>

        {/* Travel Time */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-2">How much time do you need between jobs?</h2>
          <p className="text-sm text-gray-600 mb-4">
            This helps you account for travel time or breaks between appointments.
          </p>
          <select
            value={travelTime}
            onChange={(e) => setTravelTime(e.target.value)}
            className="border border-gray-300 rounded px-4 py-2 w-full"
          >
            <option value="0">No buffer time</option>
            <option value="15">15 minutes</option>
            <option value="30">30 minutes</option>
            <option value="45">45 minutes</option>
            <option value="60">1 hour</option>
            <option value="90">1 hour 30 minutes</option>
            <option value="120">2 hours</option>
          </select>
        </div>

        </div>
      </div>

      {/* Footer Action Bar */}
      <div className="w-full bg-white z-10 fixed left-0 bottom-0 border-t border-gray-300">
        <div className="flex flex-wrap justify-center max-w-[1200px] mx-auto py-2 px-3">
          <div className="w-full min-h-[60px]">
            <div className="flex justify-between items-center relative w-full px-3 py-2">
              <button
                className="px-8 py-3 rounded-lg font-semibold border border-gray-300 hover:bg-gray-50 transition-colors"
                onClick={handleBack}
              >
                Back
              </button>
              <button
                className="px-8 py-3 rounded-lg font-semibold text-white transition-colors"
                style={{
                  backgroundColor: "hsl(var(--primary))",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                onClick={handleNext}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

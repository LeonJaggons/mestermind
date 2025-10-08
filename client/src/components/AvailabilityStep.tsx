"use client";

import { useEffect, useMemo, useState } from "react";
import dayjs, { Dayjs } from "dayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { TimePicker } from "@mui/x-date-pickers/TimePicker";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";

export type WeeklyAvailability = {
  type: "weekly";
  days: number[]; // 0-6 (Sun-Sat)
  start: string; // HH:mm
  end: string; // HH:mm
};

type AvailabilityValue = WeeklyAvailability | undefined;

interface AvailabilityStepProps {
  value: AvailabilityValue;
  onChange: (value: AvailabilityValue) => void;
}

export default function AvailabilityStep({ value, onChange }: AvailabilityStepProps) {
  const initialWeekly = useMemo<WeeklyAvailability | null>(() => {
    if (value && (value as any).type === "weekly") return value as WeeklyAvailability;
    return null;
  }, [value]);

  const [weeklyDays, setWeeklyDays] = useState<Record<number, boolean>>(() => {
    const base: Record<number, boolean> = { 0: false, 1: true, 2: true, 3: true, 4: true, 5: true, 6: false };
    if (initialWeekly) {
      const map: Record<number, boolean> = { 0: false, 1: false, 2: false, 3: false, 4: false, 5: false, 6: false };
      initialWeekly.days.forEach((d) => { map[d] = true; });
      return map;
    }
    return base;
  });
  const [weeklyStart, setWeeklyStart] = useState<Dayjs | null>(() => {
    if (initialWeekly) {
      const [h, m] = initialWeekly.start.split(":").map((s) => parseInt(s, 10));
      return dayjs().hour(h || 9).minute(m || 0);
    }
    return dayjs().hour(9).minute(0);
  });
  const [weeklyEnd, setWeeklyEnd] = useState<Dayjs | null>(() => {
    if (initialWeekly) {
      const [h, m] = initialWeekly.end.split(":").map((s) => parseInt(s, 10));
      return dayjs().hour(h || 17).minute(m || 0);
    }
    return dayjs().hour(17).minute(0);
  });

  useEffect(() => {
    if (!weeklyStart || !weeklyEnd) return;
    const days = Object.entries(weeklyDays)
      .filter(([, v]) => v)
      .map(([k]) => Number(k));
    const payload: WeeklyAvailability = {
      type: "weekly",
      days,
      start: `${String(weeklyStart.hour()).padStart(2, "0")}:${String(weeklyStart.minute()).padStart(2, "0")}`,
      end: `${String(weeklyEnd.hour()).padStart(2, "0")}:${String(weeklyEnd.minute()).padStart(2, "0")}`,
    };
    onChange(payload);
  }, [weeklyDays, weeklyStart, weeklyEnd]);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">When are you available?</h2>
        <p className="text-gray-600">Set your weekly availability so pros can schedule quickly.</p>
      </div>

      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <div className="space-y-6">
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-900 mb-2">Days of week</p>
              <div className="grid grid-cols-7 gap-2">
                {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((label, idx) => (
                  <label key={label} className={`px-2 py-2 text-center rounded border cursor-pointer select-none ${weeklyDays[idx] ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-800 border-gray-200"}`}
                    onClick={() => setWeeklyDays((prev) => ({ ...prev, [idx]: !prev[idx] }))}
                  >
                    {label}
                  </label>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-900">Daily start</label>
                <TimePicker
                  value={weeklyStart}
                  onChange={(t) => setWeeklyStart(t)}
                  ampm={false}
                  views={["hours", "minutes"]}
                  minutesStep={5}
                  slotProps={{
                    textField: { size: "small" },
                    popper: { disablePortal: true, placement: "bottom-start", sx: { zIndex: 60 } },
                  }}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-900">Daily end</label>
                <TimePicker
                  value={weeklyEnd}
                  onChange={(t) => setWeeklyEnd(t)}
                  ampm={false}
                  views={["hours", "minutes"]}
                  minutesStep={5}
                  minTime={weeklyStart ?? undefined}
                  slotProps={{
                    textField: { size: "small" },
                    popper: { disablePortal: true, placement: "bottom-start", sx: { zIndex: 60 } },
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </LocalizationProvider>
    </div>
  );
}



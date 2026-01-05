"use client";

import { useMemo } from "react";
import { addDays, format, isSameDay } from "date-fns";
import clsx from "clsx";

export interface WeeklyEvent {
  id: number;
  start: Date;
  end: Date;
  status: string;
  serviceCategory: string;
  location: string;
  jobDescription?: string;
}

interface WeeklyCalendarProps {
  weekStart: Date;
  events: WeeklyEvent[];
  onEventClick?: (id: number) => void;
}

const HOURS_START = 0;
const HOURS_END = 24; // exclusive

export function WeeklyCalendar({ weekStart, events, onEventClick }: WeeklyCalendarProps) {
  const hours = useMemo(
    () => Array.from({ length: HOURS_END - HOURS_START }, (_, i) => HOURS_START + i),
    []
  );

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  const { eventsByDayHour, eventsCountByDay, earliestHourByDay } = useMemo(() => {
    const byDayHour: Record<string, WeeklyEvent[]> = {};
    const byDayCount: Record<string, number> = {};
    const byDayEarliestHour: Record<string, number> = {};

    for (const event of events) {
      const dayKey = format(event.start, "yyyy-MM-dd");
      const hourKey = event.start.getHours().toString();
      const key = `${dayKey}-${hourKey}`;
      if (!byDayHour[key]) {
        byDayHour[key] = [];
      }
      byDayHour[key].push(event);

      if (!byDayCount[dayKey]) {
        byDayCount[dayKey] = 0;
      }
      byDayCount[dayKey] += 1;

       const hour = event.start.getHours();
       if (
         byDayEarliestHour[dayKey] === undefined ||
         hour < byDayEarliestHour[dayKey]
       ) {
         byDayEarliestHour[dayKey] = hour;
       }
    }

    return {
      eventsByDayHour: byDayHour,
      eventsCountByDay: byDayCount,
      earliestHourByDay: byDayEarliestHour,
    };
  }, [events]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "pending_customer_confirmation":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "cancelled":
        return "bg-rose-100 text-rose-800 border-rose-200 line-through";
      case "completed":
        return "bg-slate-100 text-slate-800 border-slate-200";
      default:
        return "bg-slate-100 text-slate-800 border-slate-200";
    }
  };

  const scrollToDayFirstEvent = (day: Date) => {
    const dayKey = format(day, "yyyy-MM-dd");
    const hour = earliestHourByDay[dayKey];
    if (hour === undefined) return;

    const rowElement = document.getElementById(`weekly-hour-${hour}`);
    if (rowElement) {
      rowElement.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  return (
    <div className="w-full overflow-x-auto">
      <div className="min-w-[1000px]">
        {/* Header row: empty time cell + 7 day columns */}
        <div className="sticky top-10 z-20 bg-white grid grid-cols-8 text-xs border-b border-gray-200">
          <div className="border-r border-gray-200 bg-gray-50" />
          {days.map((day, index) => {
            const isToday = isSameDay(day, new Date());
            const dayKey = format(day, "yyyy-MM-dd");
            const count = eventsCountByDay[dayKey] ?? 0;
            return (
              <div
                key={index}
                className={clsx(
                  "px-3 py-2 border-r border-gray-200 text-center",
                  isToday && "bg-[hsl(var(--primary))]/5"
                )}
              >
                <div className="font-medium text-gray-900">
                  {format(day, "EEE")}
                </div>
                <div
                  className="mt-0.5 flex items-center justify-center gap-1"
                >
                  <span
                    className={clsx(
                      "inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[11px] font-semibold",
                      isToday
                        ? "bg-[hsl(var(--primary))] text-white"
                        : "bg-gray-100 text-gray-700"
                    )}
                  >
                    {format(day, "MMM d")}
                  </span>
                  {count > 0 && (
                    <button
                      type="button"
                      onClick={() => scrollToDayFirstEvent(day)}
                      className="inline-flex items-center justify-center rounded-full bg-[hsl(var(--primary))]/10 text-[10px] font-medium text-[hsl(var(--primary))] px-1.5 py-0.5 hover:bg-[hsl(var(--primary))]/20 transition"
                    >
                      {count}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Time rows; each row is an 8-column grid: time + 7 days */}
        <div className="text-xs">
          {hours.map((hour) => (
            <div
              key={hour}
              id={`weekly-hour-${hour}`}
              className="grid grid-cols-8"
            >
              {/* Time column */}
              <div className="border-r border-b border-gray-200 px-2 py-3 text-right text-[11px] text-gray-500 bg-gray-50">
                {`${hour.toString().padStart(2, "0")}:00`}
              </div>

              {days.map((day, dayIndex) => {
                const key = `${format(day, "yyyy-MM-dd")}-${hour}`;
                const slotEvents = eventsByDayHour[key] || [];
                return (
                  <div
                    key={dayIndex}
                    className="border-r border-b border-gray-100 min-h-[56px] relative px-1 py-1 align-top"
                  >
                    <div className="absolute inset-x-0 top-1 border-t border-dashed border-gray-200" />
                    <div className="relative space-y-1">
                      {slotEvents.map((event) => (
                        <button
                          key={event.id}
                          type="button"
                          onClick={() => onEventClick?.(event.id)}
                          className={clsx(
                            "relative w-full rounded-md border px-1.5 py-1 text-left shadow-sm hover:shadow transition-shadow cursor-pointer",
                            "backdrop-blur-sm",
                            getStatusColor(event.status)
                          )}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[11px] font-semibold truncate">
                              {format(event.start, "HH:mm")}–{format(event.end, "HH:mm")}
                            </span>
                          </div>
                          <div className="mt-0.5 text-[11px] font-medium truncate">
                            {event.serviceCategory}
                          </div>
                          {event.location && (
                            <div className="mt-0.5 text-[10px] text-gray-700 truncate">
                              {event.location}
                            </div>
                          )}
                          {event.jobDescription && (
                            <div className="mt-0.5 text-[10px] text-gray-600 line-clamp-2">
                              {event.jobDescription}
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}



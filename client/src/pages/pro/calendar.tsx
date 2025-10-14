import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DateCalendar } from "@mui/x-date-pickers/DateCalendar";
import { PickersDay, PickersDayProps } from "@mui/x-date-pickers/PickersDay";
import { Badge } from "@mui/material";
import dayjs, { Dayjs } from "dayjs";
import { subscribeToAuthChanges } from "@/lib/auth";
import { fetchProStatus } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import ProLayout from "@/components/pro/ProLayout";
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  User,
  Settings,
  Download,
} from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Appointment {
  id: string;
  scheduled_start: string;
  scheduled_end: string;
  duration_minutes: number;
  location: string;
  location_address?: string;
  status: string;
  mester_notes?: string;
  customer_notes?: string;
}

export default function ProCalendarPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [mesterId, setMesterId] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribeToAuthChanges(async (user) => {
      try {
        if (!user?.email) {
          router.replace("/login");
          return;
        }
        const status = await fetchProStatus(user.email);
        if (!status.is_pro) {
          router.replace("/pro/onboarding");
          return;
        }
        setMesterId(status.mester_id || null);
      } catch (e) {
        setError("Failed to verify account");
      } finally {
        setChecking(false);
      }
    });
    return () => {
      if (unsub) unsub();
    };
  }, [router]);

  useEffect(() => {
    if (!mesterId) return;
    
    setLoading(true);
    setError(null);
    
    // Fetch appointments from the new API endpoint
    fetch(`${API_BASE_URL}/appointments/list?mester_id=${mesterId}&status=confirmed`)
      .then(res => res.ok ? res.json() : Promise.reject('Failed to load'))
      .then(setAppointments)
      .catch(() => setError("Failed to load appointments"))
      .finally(() => setLoading(false));
  }, [mesterId]);

  // Get appointments for a specific date
  const getAppointmentsForDate = (date: Dayjs) => {
    return appointments.filter((apt) => {
      const aptDate = dayjs(apt.scheduled_start);
      return aptDate.isSame(date, "day");
    });
  };

  // Get all dates that have appointments
  const datesWithAppointments = appointments.map((apt) =>
    dayjs(apt.scheduled_start).format("YYYY-MM-DD")
  );

  // Custom day component to show badges on days with appointments
  function ServerDay(
    props: PickersDayProps & { datesWithAppointments?: string[] }
  ) {
    const { datesWithAppointments = [], day, outsideCurrentMonth, ...other } = props;

    const dateString = dayjs(day as unknown as Date).format("YYYY-MM-DD");
    const hasAppointment = datesWithAppointments.includes(dateString);

    return (
      <Badge
        key={dateString}
        overlap="circular"
        badgeContent={hasAppointment ? "•" : undefined}
        color="success"
      >
        <PickersDay
          {...other}
          outsideCurrentMonth={outsideCurrentMonth}
          day={day}
        />
      </Badge>
    );
  }

  const selectedDateAppointments = getAppointmentsForDate(selectedDate);

  if (checking) {
    return (
      <ProLayout>
        <div>Loading…</div>
      </ProLayout>
    );
  }

  return (
    <ProLayout>
      <div>
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <CalendarIcon className="h-8 w-8 text-blue-600" />
              <h1 className="text-3xl font-semibold text-gray-900">
                My Calendar
              </h1>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => window.open(`${API_BASE_URL}/appointments/export/mester/${mesterId}/ical`, '_blank')}
                disabled={!mesterId}
              >
                <Download className="h-4 w-4 mr-2" />
                Export iCal
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push("/pro/calendar-settings")}
              >
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>
          <p className="text-gray-600">
            View and manage your confirmed appointments
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Calendar */}
          <Card>
            <CardHeader>
              <CardTitle>Select a Date</CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center p-2">
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DateCalendar
                  value={selectedDate}
                  onChange={(newDate) => newDate && setSelectedDate(dayjs(newDate as unknown as Date))}
                  loading={loading}
                  slots={{
                    day: ServerDay,
                  }}
                  slotProps={{
                    day: {
                      datesWithAppointments,
                    } as Record<string, unknown>,
                  }}
                  sx={{
                    width: "100%",
                    maxWidth: "100%",
                    "& .MuiPickersCalendarHeader-root": {
                      paddingLeft: 2,
                      paddingRight: 2,
                      marginTop: 1,
                      marginBottom: 1,
                    },
                    "& .MuiDayCalendar-header": {
                      justifyContent: "space-around",
                    },
                    "& .MuiDayCalendar-weekContainer": {
                      justifyContent: "space-around",
                      margin: 0,
                    },
                    "& .MuiPickersDay-root": {
                      fontSize: "1rem",
                      width: "42px",
                      height: "42px",
                      margin: "2px",
                      "&.Mui-selected": {
                        backgroundColor: "#2cb34f",
                        "&:hover": {
                          backgroundColor: "#25a043",
                        },
                      },
                    },
                  }}
                />
              </LocalizationProvider>
            </CardContent>
          </Card>

          {/* Appointments for Selected Date */}
          <Card>
            <CardHeader>
              <CardTitle>
                {selectedDate.format("MMMM D, YYYY")}
                {selectedDateAppointments.length > 0 && (
                  <span className="ml-2 text-sm font-normal text-gray-500">
                    ({selectedDateAppointments.length}{" "}
                    {selectedDateAppointments.length === 1
                      ? "appointment"
                      : "appointments"}
                    )
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedDateAppointments.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <CalendarIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>No appointments on this date</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {selectedDateAppointments.map((appointment) => (
                    <AppointmentCard
                      key={appointment.id}
                      appointment={appointment}
                      onClick={() =>
                        router.push(`/pro/appointments/${appointment.id}`)
                      }
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* All Upcoming Appointments */}
        {appointments.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>All Upcoming Appointments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {appointments
                  .filter((apt) => dayjs(apt.scheduled_start).isAfter(dayjs()))
                  .sort(
                    (a, b) =>
                      dayjs(a.scheduled_start).valueOf() -
                      dayjs(b.scheduled_start).valueOf()
                  )
                  .map((appointment) => (
                    <AppointmentCard
                      key={appointment.id}
                      appointment={appointment}
                      onClick={() =>
                        router.push(`/pro/appointments/${appointment.id}`)
                      }
                      showDate
                    />
                  ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </ProLayout>
  );
}

// Appointment Card Component
function AppointmentCard({
  appointment,
  onClick,
  showDate = false,
}: {
  appointment: Appointment;
  onClick: () => void;
  showDate?: boolean;
}) {
  const startTime = dayjs(appointment.scheduled_start);
  const endTime = dayjs(appointment.scheduled_end);
  const isPast = startTime.isBefore(dayjs());
  
  const statusColors: Record<string, string> = {
    confirmed: "bg-green-600 text-white",
    rescheduled: "bg-blue-600 text-white",
    cancelled_by_customer: "bg-red-600 text-white",
    cancelled_by_mester: "bg-red-600 text-white",
    completed: "bg-gray-600 text-white",
    no_show: "bg-orange-600 text-white",
  };

  return (
    <div
      className="p-4 bg-green-50 border border-green-200 rounded-lg hover:shadow-md transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-green-600" />
          <div>
            {showDate && (
              <div className="text-sm font-semibold text-gray-900 mb-1">
                {startTime.format("ddd, MMM D, YYYY")}
              </div>
            )}
            <div className="text-base font-medium text-gray-900">
              {startTime.format("h:mm A")} - {endTime.format("h:mm A")}
              <span className="text-sm text-gray-500 ml-2">
                ({appointment.duration_minutes} min)
              </span>
            </div>
          </div>
        </div>
        <span className={`text-xs px-2 py-1 rounded ${statusColors[appointment.status] || "bg-gray-100 text-gray-600"}`}>
          {appointment.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
        </span>
      </div>

      <div className="flex items-start gap-2 mb-2">
        <MapPin className="h-4 w-4 text-gray-500 mt-0.5" />
        <span className="text-sm text-gray-700">
          {appointment.location_address || appointment.location}
        </span>
      </div>

      {appointment.mester_notes && (
        <div className="mt-2 p-2 bg-white rounded border border-green-200">
          <p className="text-xs font-medium text-green-700 mb-1">Your notes:</p>
          <p className="text-sm text-gray-700">{appointment.mester_notes}</p>
        </div>
      )}

      {appointment.customer_notes && (
        <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200">
          <p className="text-xs font-medium text-blue-700 mb-1">Customer notes:</p>
          <p className="text-sm text-gray-700">{appointment.customer_notes}</p>
        </div>
      )}
    </div>
  );
}


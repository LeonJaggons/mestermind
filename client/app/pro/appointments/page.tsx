"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { Calendar, MapPin, DollarSign, CheckCircle, XCircle, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { useI18n } from "@/lib/contexts/I18nContext";
import { API_BASE_URL } from "@/lib/api/config";
import { startOfWeek, addDays, format } from "date-fns";
import { WeeklyCalendar, WeeklyEvent } from "@/components/WeeklyCalendar";
import { ProAppointmentsAgenda } from "@/components/ProAppointmentsAgenda";

interface Appointment {
  id: number;
  job_id: number;
  customer_id: number;
  pro_id: number;
  service_category: string;
  appointment_date: string;
  appointment_start_time: string;
  estimated_duration_minutes: number;
  time_flexibility: string | null;
  address_line1: string;
  address_line2: string | null;
  city: string;
  postal_code: string | null;
  access_note: string | null;
  pricing_type: "fixed_price" | "hourly_rate";
  quoted_amount_huf: number | null;
  hourly_rate_huf: number | null;
  min_hours: number | null;
  price_note: string | null;
  status: "pending_customer_confirmation" | "confirmed" | "cancelled" | "completed";
  notify_customer_by_sms: boolean;
  notify_customer_by_email: boolean;
  reminder_minutes_before: number;
  pro_internal_note: string | null;
  created_at: string;
  updated_at: string | null;
  job?: {
    id: number;
    description: string;
  };
}

export default function ProAppointmentsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { t, language } = useI18n();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"week" | "agenda">("week");
  const [weekStart, setWeekStart] = useState<Date>(
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );

  useEffect(() => {
    const fetchAppointments = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // Get user ID from backend
        const userResponse = await fetch(`${API_BASE_URL}/api/v1/users/firebase/${user.uid}`);
        if (!userResponse.ok) return;
        const userData = await userResponse.json();

        // Get pro profile
        const proProfileResponse = await fetch(`${API_BASE_URL}/api/v1/pro-profiles?user_id=${userData.id}`);
        if (proProfileResponse.ok) {
          const proProfileData = await proProfileResponse.json();
          if (proProfileData.length > 0) {
            const proProfile = proProfileData[0];

            // Fetch appointments
            const appointmentsResponse = await fetch(
              `${API_BASE_URL}/api/v1/appointments?pro_id=${proProfile.id}${filterStatus !== "all" ? `&status=${filterStatus}` : ""}`
            );
            if (appointmentsResponse.ok) {
              const appointmentsData = await appointmentsResponse.json();

              // Fetch job details for each appointment
              const appointmentsWithJobs = await Promise.all(
                appointmentsData.map(async (apt: Appointment) => {
                  if (apt.job_id) {
                    const jobResponse = await fetch(`${API_BASE_URL}/api/v1/jobs/${apt.job_id}`);
                    if (jobResponse.ok) {
                      const jobData = await jobResponse.json();
                      return { ...apt, job: jobData };
                    }
                  }
                  return apt;
                })
              );

              setAppointments(appointmentsWithJobs);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching appointments:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAppointments();
  }, [user, filterStatus]);

  const filteredAppointments = appointments.sort((a, b) => {
    const dateA = new Date(`${a.appointment_date}T${a.appointment_start_time}`);
    const dateB = new Date(`${b.appointment_date}T${b.appointment_start_time}`);
    return dateA.getTime() - dateB.getTime();
  });

  const weekEnd = addDays(weekStart, 7);

  const weeklyEvents: WeeklyEvent[] = filteredAppointments
    .map((appointment) => {
      const start = new Date(`${appointment.appointment_date}T${appointment.appointment_start_time}`);
      const durationMinutes = appointment.estimated_duration_minutes || 60;
      const end = new Date(start.getTime() + durationMinutes * 60 * 1000);

      return {
        id: appointment.id,
        start,
        end,
        status: appointment.status,
        serviceCategory: appointment.service_category,
        location: `${appointment.city} • ${appointment.address_line1}`,
        jobDescription: appointment.job?.description,
      } as WeeklyEvent;
    })
    .filter((event) => event.start >= weekStart && event.start < weekEnd);

  const now = new Date();
  const upcomingAppointments: Appointment[] = filteredAppointments.filter(
    (appointment) => {
      const start = new Date(
        `${appointment.appointment_date}T${appointment.appointment_start_time}`
      );
      return start >= now;
    }
  );

  const nextAppointment: Appointment | undefined = upcomingAppointments[0];

  const goToNextAppointment = () => {
    if (!nextAppointment) return;
    const start = new Date(
      `${nextAppointment.appointment_date}T${nextAppointment.appointment_start_time}`
    );
    const targetWeekStart = startOfWeek(start, { weekStartsOn: 1 });
    const targetHour = start.getHours();

    setViewMode("week");
    setWeekStart(targetWeekStart);

    // Allow the week view to render before scrolling
    setTimeout(() => {
      const rowElement = document.getElementById(`weekly-hour-${targetHour}`);
      if (rowElement) {
        rowElement.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 50);
  };

  return (
    <div className="min-h-screen bg-white pb-18">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            {t("pro.appointments.title")}
          </h1>
          <p className="mt-2 text-gray-600">
            {t("pro.appointments.subtitle")}
          </p>
        </div>

        {/* Weekly time-grid calendar / Agenda toggle */}
        <div className="space-y-4">
          {/* Header controls like Google Calendar (current week + prev/next) and view toggle */}
          <div className="sticky top-0 z-30 bg-white/95 backdrop-blur flex flex-wrap items-center justify-between gap-3 py-2 border-b border-gray-100">
            <div className="inline-flex rounded-full border border-gray-200 bg-gray-50 p-1">
              <button
                type="button"
                onClick={() => setViewMode("week")}
                className={`px-3 py-1 text-xs font-medium rounded-full ${
                  viewMode === "week"
                    ? "bg-white shadow-sm text-gray-900"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {t("pro.appointments.view.week")}
              </button>
              <button
                type="button"
                onClick={() => setViewMode("agenda")}
                className={`px-3 py-1 text-xs font-medium rounded-full ${
                  viewMode === "agenda"
                    ? "bg-white shadow-sm text-gray-900"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {t("pro.appointments.view.agenda")}
              </button>
            </div>

            <div className="flex items-center gap-3 ml-auto">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="h-8 rounded-full border border-gray-200 bg-white px-3 text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]/40"
              >
                <option value="all">{t("pro.appointments.filter.all")}</option>
                <option value="pending_customer_confirmation">
                  {t("pro.appointments.filter.pending")}
                </option>
                <option value="confirmed">
                  {t("pro.appointments.filter.confirmed")}
                </option>
                <option value="completed">
                  {t("pro.appointments.filter.completed")}
                </option>
                <option value="cancelled">
                  {t("pro.appointments.filter.cancelled")}
                </option>
              </select>

              <button
                type="button"
                onClick={goToNextAppointment}
                disabled={!nextAppointment || loading}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                  !nextAppointment || loading
                    ? "border-gray-100 text-gray-300 cursor-not-allowed"
                    : "border-[hsl(var(--primary))]/40 text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/5"
                }`}
              >
                {t("pro.appointments.nextAppointment")}
              </button>

              {viewMode === "week" && (
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setWeekStart(addDays(weekStart, -7))}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <div className="text-sm font-medium text-gray-900">
                    {`${format(weekStart, "MMM d")} – ${format(
                      addDays(weekStart, 6),
                      "MMM d, yyyy"
                    )}`}
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))
                    }
                    className="rounded-full border border-gray-200 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                  >
                    {t("pro.appointments.today")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setWeekStart(addDays(weekStart, 7))}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 min-h-[420px]">
            {loading ? (
              <div className="h-full flex flex-col gap-4">
                <div className="h-6 w-40 bg-gray-100 rounded animate-pulse" />
                <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-3 animate-pulse">
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <div key={idx} className="space-y-3">
                      <div className="h-4 bg-gray-100 rounded w-3/4" />
                      {Array.from({ length: 4 }).map((__, rowIdx) => (
                        <div
                          key={rowIdx}
                          className="h-6 bg-gray-50 rounded w-full"
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            ) : viewMode === "week" ? (
              <WeeklyCalendar
                weekStart={weekStart}
                events={weeklyEvents}
                onEventClick={(id) => router.push(`/pro/appointments/${id}`)}
              />
            ) : upcomingAppointments.length === 0 ? (
              <div className="py-6 text-center">
                <h3 className="text-sm font-medium text-gray-900">
                  {t("pro.appointments.noUpcomingTitle")}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {t("pro.appointments.noUpcomingDescription")}
                </p>
              </div>
            ) : (
              <ProAppointmentsAgenda
                appointments={upcomingAppointments}
                onAppointmentClick={(id) => router.push(`/pro/appointments/${id}`)}
                t={t}
                language={language}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/contexts/AuthContext";
import Link from "next/link";
import { Calendar, Clock, MapPin, DollarSign, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { API_BASE_URL } from "@/lib/api/config";

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
  pro_profile?: {
    id: number;
    business_name: string;
  };
}

export default function CustomerAppointmentsPage() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [acceptingId, setAcceptingId] = useState<number | null>(null);

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
        setCurrentUserId(userData.id);

        // Fetch appointments
        const appointmentsResponse = await fetch(
          `${API_BASE_URL}/api/v1/appointments?customer_id=${userData.id}${filterStatus !== "all" ? `&status=${filterStatus}` : ""}`
        );
        if (appointmentsResponse.ok) {
          const appointmentsData = await appointmentsResponse.json();
          
          // Fetch job and pro profile details for each appointment
          const appointmentsWithDetails = await Promise.all(
            appointmentsData.map(async (apt: Appointment) => {
              const [jobResponse, proResponse] = await Promise.all([
                apt.job_id ? fetch(`${API_BASE_URL}/api/v1/jobs/${apt.job_id}`).catch(() => null) : null,
                fetch(`${API_BASE_URL}/api/v1/pro-profiles/${apt.pro_id}`).catch(() => null),
              ]);

              const job = jobResponse && jobResponse.ok ? await jobResponse.json() : null;
              const proProfile = proResponse && proResponse.ok ? await proResponse.json() : null;

              return {
                ...apt,
                job: job || undefined,
                pro_profile: proProfile || undefined,
              };
            })
          );
          
          setAppointments(appointmentsWithDetails);
        }
      } catch (error) {
        console.error("Error fetching appointments:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAppointments();
  }, [user, filterStatus]);

  const handleAcceptAppointment = async (appointmentId: number) => {
    if (!appointmentId) return;

    setAcceptingId(appointmentId);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/appointments/${appointmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "confirmed",
        }),
      });

      if (response.ok) {
        // Update local state
        setAppointments((prev) =>
          prev.map((apt) =>
            apt.id === appointmentId ? { ...apt, status: "confirmed" as const } : apt
          )
        );
        alert("Appointment confirmed!");
      } else {
        const errorData = await response.json().catch(() => ({ detail: "Failed to accept appointment" }));
        alert(errorData.detail || "Failed to accept appointment");
      }
    } catch (error) {
      console.error("Error accepting appointment:", error);
      alert("Failed to accept appointment. Please try again.");
    } finally {
      setAcceptingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending_customer_confirmation":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <AlertCircle className="w-3 h-3 mr-1" />
            Pending Your Confirmation
          </span>
        );
      case "confirmed":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Confirmed
          </span>
        );
      case "cancelled":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircle className="w-3 h-3 mr-1" />
            Cancelled
          </span>
        );
      case "completed":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Completed
          </span>
        );
      default:
        return null;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  };

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const filteredAppointments = appointments.sort((a, b) => {
    const dateA = new Date(`${a.appointment_date}T${a.appointment_start_time}`);
    const dateB = new Date(`${b.appointment_date}T${b.appointment_start_time}`);
    return dateA.getTime() - dateB.getTime();
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Appointments</h1>
          <p className="mt-2 text-gray-600">View and manage your appointments</p>
        </div>

        {/* Filter Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: "all", label: "All" },
              { id: "pending_customer_confirmation", label: "Pending" },
              { id: "confirmed", label: "Confirmed" },
              { id: "completed", label: "Completed" },
              { id: "cancelled", label: "Cancelled" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterStatus(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  filterStatus === tab.id
                    ? "border-[hsl(var(--primary))] text-[hsl(var(--primary))]"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(var(--primary))]"></div>
          </div>
        ) : filteredAppointments.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No appointments</h3>
            <p className="mt-1 text-sm text-gray-500">
              {filterStatus === "all"
                ? "You don't have any appointments yet."
                : `You don't have any ${filterStatus.replace("_", " ")} appointments.`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAppointments.map((appointment) => (
              <div
                key={appointment.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-4">
                      {getStatusBadge(appointment.status)}
                      <span className="text-sm text-gray-500">
                        {appointment.service_category}
                      </span>
                      {appointment.pro_profile && (
                        <span className="text-sm font-medium text-gray-900">
                          with {appointment.pro_profile.business_name}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Date & Time */}
                      <div className="flex items-start gap-3">
                        <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {formatDate(appointment.appointment_date)}
                          </p>
                          <p className="text-sm text-gray-600 flex items-center gap-2 mt-1">
                            <Clock className="w-4 h-4" />
                            {formatTime(appointment.appointment_start_time)} • {appointment.estimated_duration_minutes} min
                            {appointment.time_flexibility && (
                              <span className="text-xs text-gray-500">({appointment.time_flexibility})</span>
                            )}
                          </p>
                        </div>
                      </div>

                      {/* Location */}
                      <div className="flex items-start gap-3">
                        <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Location</p>
                          <p className="text-sm text-gray-600">
                            {appointment.address_line1}
                            {appointment.address_line2 && `, ${appointment.address_line2}`}
                            <br />
                            {appointment.city} {appointment.postal_code}
                          </p>
                          {appointment.access_note && (
                            <p className="text-xs text-gray-500 mt-1">{appointment.access_note}</p>
                          )}
                        </div>
                      </div>

                      {/* Pricing */}
                      <div className="flex items-start gap-3">
                        <DollarSign className="w-5 h-5 text-gray-400 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Pricing</p>
                          <p className="text-sm text-gray-600">
                            {appointment.pricing_type === "fixed_price" && appointment.quoted_amount_huf
                              ? `${appointment.quoted_amount_huf.toLocaleString()} HUF`
                              : appointment.pricing_type === "hourly_rate" && appointment.hourly_rate_huf
                              ? `${appointment.hourly_rate_huf.toLocaleString()} HUF/hour${appointment.min_hours ? ` (min ${appointment.min_hours}h)` : ""}`
                              : "Not specified"}
                          </p>
                          {appointment.price_note && (
                            <p className="text-xs text-gray-500 mt-1">{appointment.price_note}</p>
                          )}
                        </div>
                      </div>

                      {/* Job Details */}
                      {appointment.job && (
                        <div>
                          <p className="text-sm font-medium text-gray-900">Job</p>
                          <p className="text-sm text-gray-600">{appointment.job.description}</p>
                          <Link
                            href={`/customer/messages/${appointment.job_id}`}
                            className="text-xs text-[hsl(var(--primary))] hover:underline mt-1 inline-block"
                          >
                            View conversation →
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Accept Button for Pending Appointments */}
                  {appointment.status === "pending_customer_confirmation" && (
                    <div className="ml-6">
                      <button
                        onClick={() => handleAcceptAppointment(appointment.id)}
                        disabled={acceptingId === appointment.id}
                        className="px-6 py-2 bg-[hsl(var(--primary))] text-white rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
                      >
                        {acceptingId === appointment.id ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Accepting...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4" />
                            Accept Appointment
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


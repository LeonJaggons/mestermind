"use client";

import { Calendar, Clock, MapPin, DollarSign, CheckCircle, XCircle, AlertCircle } from "lucide-react";

interface AppointmentJob {
  id: number;
  description: string;
}

export interface AgendaAppointment {
  id: number;
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
  pro_internal_note: string | null;
  job?: AppointmentJob;
}

interface ProAppointmentsAgendaProps {
  appointments: AgendaAppointment[];
  onAppointmentClick: (id: number) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  language: string;
}

export function ProAppointmentsAgenda({
  appointments,
  onAppointmentClick,
  t,
  language,
}: ProAppointmentsAgendaProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending_customer_confirmation":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <AlertCircle className="w-3 h-3 mr-1" />
            {t("pro.appointments.status.pending")}
          </span>
        );
      case "confirmed":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            {t("pro.appointments.status.confirmed")}
          </span>
        );
      case "cancelled":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircle className="w-3 h-3 mr-1" />
            {t("pro.appointments.status.cancelled")}
          </span>
        );
      case "completed":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            {t("pro.appointments.status.completed")}
          </span>
        );
      default:
        return null;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const locale = language === "hu" ? "hu-HU" : "en-US";
    return date.toLocaleDateString(locale, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(":");
    const hour = parseInt(hours, 10);
    if (language === "hu") {
      return `${hours}:${minutes}`;
    } else {
      const ampm = hour >= 12 ? "PM" : "AM";
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${minutes} ${ampm}`;
    }
  };

  return (
    <div className="space-y-3 max-h-[720px] overflow-y-auto pr-1">
      {appointments.map((appointment) => (
        <button
          key={appointment.id}
          type="button"
          onClick={() => onAppointmentClick(appointment.id)}
          className="w-full text-left bg-white rounded-lg border border-gray-200 hover:border-[hsl(var(--primary))]/50 hover:shadow-sm transition cursor-pointer p-4"
        >
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="flex-1 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                {getStatusBadge(appointment.status)}
                <span className="text-xs font-medium text-gray-500">
                  {appointment.service_category}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Date & Time */}
                <div className="flex items-start gap-2">
                  <Calendar className="w-4 h-4 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-gray-500">
                      {formatDate(appointment.appointment_date)}
                    </p>
                    <p className="text-xs text-gray-600 flex items-center gap-2 mt-0.5">
                      <Clock className="w-3 h-3" />
                      {formatTime(appointment.appointment_start_time)} •{" "}
                      {appointment.estimated_duration_minutes}{" "}
                      {t("pro.appointments.minutes")}
                      {appointment.time_flexibility && (
                        <span className="text-[11px] text-gray-500">
                          ({appointment.time_flexibility})
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Location */}
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-gray-500">
                      {t("pro.appointments.location")}
                    </p>
                    <p className="text-xs text-gray-600">
                      {appointment.address_line1}
                      {appointment.address_line2 && `, ${appointment.address_line2}`}
                      <br />
                      {appointment.city} {appointment.postal_code}
                    </p>
                    {appointment.access_note && (
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        {appointment.access_note}
                      </p>
                    )}
                  </div>
                </div>

                {/* Pricing */}
                <div className="flex items-start gap-2">
                  <DollarSign className="w-4 h-4 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-gray-500">
                      {t("pro.appointments.pricing")}
                    </p>
                    <p className="text-xs text-gray-600">
                      {appointment.pricing_type === "fixed_price" &&
                      appointment.quoted_amount_huf
                        ? `${appointment.quoted_amount_huf.toLocaleString()} HUF`
                        : appointment.pricing_type === "hourly_rate" &&
                          appointment.hourly_rate_huf
                        ? `${appointment.hourly_rate_huf.toLocaleString()} HUF/${t(
                            "pro.appointments.hours"
                          )}${
                            appointment.min_hours
                              ? ` (min ${appointment.min_hours}${t(
                                  "pro.appointments.hours"
                                )})`
                              : ""
                          }`
                        : t("pro.appointments.notSpecified")}
                    </p>
                    {appointment.price_note && (
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        {appointment.price_note}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Job & internal note */}
              <div className="space-y-2">
                {appointment.job && (
                  <div>
                    <p className="text-xs font-medium text-gray-500">
                      {t("pro.appointments.job")}
                    </p>
                    <p className="text-xs text-gray-600">
                      {appointment.job.description}
                    </p>
                  </div>
                )}

                {appointment.pro_internal_note && (
                  <div className="p-2 bg-gray-50 rounded-lg">
                    <p className="text-[11px] font-medium text-gray-700 mb-0.5">
                      {t("pro.appointments.internalNote")}
                    </p>
                    <p className="text-xs text-gray-600">
                      {appointment.pro_internal_note}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}



"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/contexts/AuthContext";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Calendar,
  Clock,
  MapPin,
  DollarSign,
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowLeft,
  Phone,
  Mail,
  MessageSquare,
  Edit,
  Trash2,
  Send,
  FileText,
  User,
  Building,
  Navigation,
} from "lucide-react";
import { API_BASE_URL } from "@/lib/api/config";
import { useI18n } from "@/lib/contexts/I18nContext";

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
}

interface Job {
  id: number;
  description: string;
  user_id: number;
}

interface CustomerProfile {
  id: number;
  user_id: number;
  first_name: string;
  last_name: string;
  phone: string;
  city: string;
}

interface User {
  id: number;
  email: string;
}

interface AppointmentActivity {
  id: number;
  type: string;
  description: string;
  timestamp: string;
}

export default function ProAppointmentDetailPage() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const { t, language } = useI18n();
  const appointmentId = params?.id as string;

  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [customerProfile, setCustomerProfile] = useState<CustomerProfile | null>(null);
  const [customer, setCustomer] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [completionNotes, setCompletionNotes] = useState("");

  useEffect(() => {
    const fetchAppointmentDetails = async () => {
      if (!user || !appointmentId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // Fetch appointment
        const appointmentResponse = await fetch(`${API_BASE_URL}/api/v1/appointments/${appointmentId}`);
        if (!appointmentResponse.ok) {
          alert(t("pro.appointments.detail.notFoundTitle"));
          router.push("/pro/appointments");
          return;
        }
        const appointmentData = await appointmentResponse.json();
        setAppointment(appointmentData);

        // Fetch job details
        if (appointmentData.job_id) {
          const jobResponse = await fetch(`${API_BASE_URL}/api/v1/jobs/${appointmentData.job_id}`);
          if (jobResponse.ok) {
            const jobData = await jobResponse.json();
            setJob(jobData);

            // Fetch customer profile
            const customerProfileResponse = await fetch(
              `${API_BASE_URL}/api/v1/customer-profiles?user_id=${jobData.user_id}`
            );
            if (customerProfileResponse.ok) {
              const customerProfileData = await customerProfileResponse.json();
              if (customerProfileData.length > 0) {
                setCustomerProfile(customerProfileData[0]);
              }
            }

            // Fetch customer user
            const customerResponse = await fetch(`${API_BASE_URL}/api/v1/users/${jobData.user_id}`);
            if (customerResponse.ok) {
              const customerData = await customerResponse.json();
              setCustomer(customerData);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching appointment details:", error);
        alert(t("common.error"));
      } finally {
        setLoading(false);
      }
    };

    fetchAppointmentDetails();
  }, [user, appointmentId, router]);

  const handleStatusUpdate = async (newStatus: "confirmed" | "cancelled" | "completed", notes?: string) => {
    if (!appointment) return;

    setUpdating(true);
    try {
      const updateData: any = { status: newStatus };
      if (notes && newStatus === "completed") {
        updateData.pro_internal_note = notes;
      }

      const response = await fetch(`${API_BASE_URL}/api/v1/appointments/${appointment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        const updatedAppointment = await response.json();
        setAppointment(updatedAppointment);
        setShowCancelDialog(false);
        setShowCompleteDialog(false);
        setCancelReason("");
        setCompletionNotes("");
        alert(
          newStatus === "completed"
            ? t("pro.appointments.detail.markCompleted")
            : t("pro.appointments.detail.cancel")
        );
      } else {
        const errorData = await response.json().catch(() => ({ detail: "Failed to update appointment" }));
        alert(errorData.detail || t("common.error"));
      }
    } catch (error) {
      console.error("Error updating appointment:", error);
      alert(t("common.error"));
    } finally {
      setUpdating(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(
      language === "hu" ? "hu-HU" : "en-US",
      { weekday: "long", year: "numeric", month: "long", day: "numeric" }
    );
  };

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const formatDateTime = (dateString: string, timeString: string) => {
    const date = new Date(`${dateString}T${timeString}`);
    return date.toLocaleString(language === "hu" ? "hu-HU" : "en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending_customer_confirmation":
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
            <AlertCircle className="w-4 h-4 mr-1" />
            {t("pro.appointments.detail.status.pending")}
          </span>
        );
      case "confirmed":
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
            <CheckCircle className="w-4 h-4 mr-1" />
            {t("pro.appointments.detail.status.confirmed")}
          </span>
        );
      case "cancelled":
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
            <XCircle className="w-4 h-4 mr-1" />
            {t("pro.appointments.detail.status.cancelled")}
          </span>
        );
      case "completed":
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
            <CheckCircle className="w-4 h-4 mr-1" />
            {t("pro.appointments.detail.status.completed")}
          </span>
        );
      default:
        return null;
    }
  };

  const getStatusTimeline = () => {
    if (!appointment) return [];

    const timeline = [
      {
        status: "created",
                label: t("pro.appointments.detail.timeline.created"),
        timestamp: appointment.created_at,
        completed: true,
      },
    ];

    if (appointment.status === "pending_customer_confirmation") {
      timeline.push({
        status: "pending",
        label: t("pro.appointments.detail.timeline.pending"),
        timestamp: appointment.created_at,
        completed: false,
      });
    } else if (appointment.status === "confirmed") {
      timeline.push(
        {
          status: "confirmed",
          label: t("pro.appointments.detail.timeline.confirmed"),
          timestamp: appointment.updated_at || appointment.created_at,
          completed: true,
        },
        {
          status: "upcoming",
          label: t("pro.appointments.detail.timeline.scheduled"),
          timestamp: `${appointment.appointment_date}T${appointment.appointment_start_time}`,
          completed: false,
        }
      );
    } else if (appointment.status === "completed") {
      timeline.push(
        {
          status: "confirmed",
          label: "Customer Confirmed",
          timestamp: appointment.updated_at || appointment.created_at,
          completed: true,
        },
        {
          status: "completed",
          label: t("pro.appointments.detail.timeline.completed"),
          timestamp: appointment.updated_at || appointment.created_at,
          completed: true,
        }
      );
    } else if (appointment.status === "cancelled") {
      timeline.push({
        status: "cancelled",
        label: "Appointment Cancelled",
        timestamp: appointment.updated_at || appointment.created_at,
        completed: true,
      });
    }

    return timeline;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[hsl(var(--primary))]"></div>
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {t("pro.appointments.detail.notFoundTitle")}
          </h2>
          <Link href="/pro/appointments" className="text-[hsl(var(--primary))] hover:underline">
            {t("pro.appointments.detail.backToAppointments")}
          </Link>
        </div>
      </div>
    );
  }

  const timeline = getStatusTimeline();
  const appointmentDateTime = new Date(`${appointment.appointment_date}T${appointment.appointment_start_time}`);
  const isUpcoming = appointmentDateTime > new Date() && appointment.status === "confirmed";
  const canCancel = appointment.status === "pending_customer_confirmation" || appointment.status === "confirmed";
  const canComplete = appointment.status === "confirmed" && !isUpcoming;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/pro/appointments"
            className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t("pro.appointments.detail.backToAppointments")}
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {t("pro.appointments.detail.title")}
              </h1>
              <p className="mt-2 text-gray-600">{appointment.service_category}</p>
            </div>
            <div className="flex items-center gap-3">
              {getStatusBadge(appointment.status)}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Status Timeline */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                {t("pro.appointments.detail.timelineTitle")}
              </h2>
              <div className="space-y-4">
                {timeline.map((item, index) => (
                  <div key={index} className="flex items-start gap-4">
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      item.completed
                        ? "bg-green-100 text-green-600"
                        : "bg-gray-200 text-gray-400"
                    }`}>
                      {item.completed ? (
                        <CheckCircle className="w-5 h-5" />
                      ) : (
                        <div className="w-3 h-3 rounded-full bg-current" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${item.completed ? "text-gray-900" : "text-gray-500"}`}>
                        {item.label}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(item.timestamp).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Appointment Information */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                {t("pro.appointments.detail.infoTitle")}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="flex items-start gap-3 mb-4">
                    <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {t("pro.appointments.detail.dateTime")}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        {formatDate(appointment.appointment_date)}
                      </p>
                      <p className="text-sm text-gray-600 flex items-center gap-2 mt-1">
                        <Clock className="w-4 h-4" />
                        {formatTime(appointment.appointment_start_time)} • {appointment.estimated_duration_minutes} minutes
                      </p>
                      {appointment.time_flexibility && (
                        <p className="text-xs text-gray-500 mt-1">Flexibility: {appointment.time_flexibility}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {t("pro.appointments.detail.location")}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        {appointment.address_line1}
                        {appointment.address_line2 && `, ${appointment.address_line2}`}
                        <br />
                        {appointment.city} {appointment.postal_code}
                      </p>
                      {appointment.access_note && (
                        <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-600">
                          <strong>
                            {t("pro.appointments.detail.accessNotes")}:
                          </strong>{" "}
                          {appointment.access_note}
                        </div>
                      )}
                      <a
                        href={`https://maps.google.com/?q=${encodeURIComponent(
                          `${appointment.address_line1}, ${appointment.city}`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-[hsl(var(--primary))] hover:underline mt-2"
                      >
                        <Navigation className="w-3 h-3" />
                        {t("pro.appointments.detail.openInMaps")}
                      </a>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-start gap-3 mb-4">
                    <DollarSign className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {t("pro.appointments.detail.pricing")}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        {appointment.pricing_type === "fixed_price" && appointment.quoted_amount_huf
                          ? `${appointment.quoted_amount_huf.toLocaleString()} HUF`
                          : appointment.pricing_type === "hourly_rate" && appointment.hourly_rate_huf
                          ? `${appointment.hourly_rate_huf.toLocaleString()} HUF/hour${appointment.min_hours ? ` (min ${appointment.min_hours}h)` : ""}`
                          : t("pro.appointments.detail.notSpecified")}
                      </p>
                      {appointment.price_note && (
                        <p className="text-xs text-gray-500 mt-1">{appointment.price_note}</p>
                      )}
                    </div>
                  </div>

                  {job && (
                    <div className="flex items-start gap-3">
                      <FileText className="w-5 h-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {t("pro.appointments.detail.jobDescription")}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">{job.description}</p>
                        <Link
                          href={`/pro/messages/${job.id}`}
                          className="inline-flex items-center gap-1 text-xs text-[hsl(var(--primary))] hover:underline mt-2"
                        >
                          <MessageSquare className="w-3 h-3" />
                          {t("pro.appointments.detail.viewConversation")}
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Internal Notes */}
            {appointment.pro_internal_note && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  {t("pro.appointments.detail.internalNotes")}
                </h2>
                <p className="text-sm text-gray-600">{appointment.pro_internal_note}</p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Customer Information */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                {t("pro.appointments.detail.customerInfo")}
              </h2>
              {customerProfile ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[hsl(var(--primary)/0.1)] flex items-center justify-center text-[hsl(var(--primary))] font-bold">
                      {customerProfile.first_name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {customerProfile.first_name} {customerProfile.last_name}
                      </p>
                      {customer?.email && (
                        <p className="text-xs text-gray-500">{customer.email}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 pt-4 border-t border-gray-200">
                    {customer?.email && (
                      <a
                        href={`mailto:${customer.email}`}
                        className="flex items-center gap-2 text-sm text-gray-700 hover:text-[hsl(var(--primary))]"
                      >
                        <Mail className="w-4 h-4" />
                        {customer.email}
                      </a>
                    )}
                    {customerProfile.phone && (
                      <a
                        href={`tel:${customerProfile.phone}`}
                        className="flex items-center gap-2 text-sm text-gray-700 hover:text-[hsl(var(--primary))]"
                      >
                        <Phone className="w-4 h-4" />
                        {customerProfile.phone}
                      </a>
                    )}
                    {job && (
                      <Link
                        href={`/pro/messages/${job.id}`}
                        className="flex items-center gap-2 text-sm text-gray-700 hover:text-[hsl(var(--primary))]"
                      >
                        <MessageSquare className="w-4 h-4" />
                        {t("pro.messages.detail.send")}
                      </Link>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  {t("pro.appointments.detail.customerInfoNotAvailable")}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                {t("pro.appointments.detail.actions")}
              </h2>
              <div className="space-y-3">
                {canCancel && (
                  <button
                    onClick={() => setShowCancelDialog(true)}
                    disabled={updating}
                    className="w-full px-4 py-2 border border-red-300 text-red-700 rounded-lg font-medium hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
                  >
                    <XCircle className="w-4 h-4" />
                    {t("pro.appointments.detail.cancel")}
                  </button>
                )}

                {canComplete && (
                  <button
                    onClick={() => setShowCompleteDialog(true)}
                    disabled={updating}
                    className="w-full px-4 py-2 bg-[hsl(var(--primary))] text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    {t("pro.appointments.detail.markCompleted")}
                  </button>
                )}

                {job && (
                  <Link
                    href={`/pro/messages/${job.id}`}
                    className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition flex items-center justify-center gap-2"
                  >
                    <MessageSquare className="w-4 h-4" />
                    View Conversation
                  </Link>
                )}

                <button
                  onClick={() => {
                    const address = `${appointment.address_line1}, ${appointment.city}`;
                    window.open(`https://maps.google.com/?q=${encodeURIComponent(address)}`, "_blank");
                  }}
                    className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition flex items-center justify-center gap-2"
                >
                  <Navigation className="w-4 h-4" />
                    {t("pro.appointments.detail.getDirections")}
                </button>
              </div>
            </div>

            {/* Appointment Details Summary */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                {t("pro.appointments.detail.quickInfoTitle")}
              </h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">
                    {t("pro.appointments.detail.quickInfoService")}:
                  </span>
                  <span className="font-medium text-gray-900">{appointment.service_category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">
                    {t("pro.appointments.detail.quickInfoDuration")}:
                  </span>
                  <span className="font-medium text-gray-900">{appointment.estimated_duration_minutes} min</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">
                    {t("pro.appointments.detail.quickInfoCreated")}:
                  </span>
                  <span className="font-medium text-gray-900">
                    {new Date(appointment.created_at).toLocaleDateString()}
                  </span>
                </div>
                {appointment.updated_at && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">
                      {t("pro.appointments.detail.quickInfoUpdated")}:
                    </span>
                    <span className="font-medium text-gray-900">
                      {new Date(appointment.updated_at).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cancel Dialog */}
      {showCancelDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {t("pro.appointments.detail.cancelDialog.title")}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              {t("pro.appointments.detail.cancelDialog.body")}
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("pro.appointments.detail.cancelDialog.reasonLabel")}
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder={t(
                  "pro.appointments.detail.cancelDialog.reasonPlaceholder"
                )}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[hsl(var(--primary))] resize-none"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCancelDialog(false);
                  setCancelReason("");
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
              >
                {t("pro.appointments.detail.cancelDialog.keep")}
              </button>
              <button
                onClick={() => handleStatusUpdate("cancelled")}
                disabled={updating}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updating
                  ? t("common.loading")
                  : t("pro.appointments.detail.cancelDialog.confirm")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Complete Dialog */}
      {showCompleteDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {t("pro.appointments.detail.completeDialog.title")}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              {t("pro.appointments.detail.completeDialog.body")}
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("pro.appointments.detail.completeDialog.notesLabel")}
              </label>
              <textarea
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                placeholder={t(
                  "pro.appointments.detail.completeDialog.notesPlaceholder"
                )}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[hsl(var(--primary))] resize-none"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCompleteDialog(false);
                  setCompletionNotes("");
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
              >
                {t("pro.appointments.detail.completeDialog.cancel")}
              </button>
              <button
                onClick={() => handleStatusUpdate("completed", completionNotes)}
                disabled={updating}
                className="flex-1 px-4 py-2 bg-[hsl(var(--primary))] text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updating
                  ? t("common.loading")
                  : t("pro.appointments.detail.completeDialog.confirm")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


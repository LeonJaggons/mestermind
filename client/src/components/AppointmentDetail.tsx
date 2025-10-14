import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar, Clock, MapPin, User, AlertCircle, Download } from 'lucide-react';
import { format } from 'date-fns';
import TimeSlotPicker from './TimeSlotPicker';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Appointment {
  id: string;
  proposal_id: string;
  thread_id: string;
  mester_id: string;
  request_id: string;
  customer_user_id: string;
  scheduled_start: string;
  scheduled_end: string;
  duration_minutes: number;
  location: string;
  location_address?: string;
  mester_notes?: string;
  customer_notes?: string;
  status: string;
  cancelled_at?: string;
  cancellation_reason?: string;
  completed_at?: string;
  rescheduled_from_id?: string;
  rescheduled_to_id?: string;
}

interface AppointmentDetailProps {
  appointmentId: string;
  userId: string;
  userType: 'customer' | 'mester';
}

const statusColors: Record<string, string> = {
  confirmed: 'bg-green-500',
  rescheduled: 'bg-blue-500',
  cancelled_by_customer: 'bg-red-500',
  cancelled_by_mester: 'bg-red-500',
  completed: 'bg-gray-500',
  no_show: 'bg-orange-500',
};

const statusLabels: Record<string, string> = {
  confirmed: 'Confirmed',
  rescheduled: 'Rescheduled',
  cancelled_by_customer: 'Cancelled',
  cancelled_by_mester: 'Cancelled',
  completed: 'Completed',
  no_show: 'No Show',
};

export default function AppointmentDetail({
  appointmentId,
  userId,
  userType,
}: AppointmentDetailProps) {
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [showReschedule, setShowReschedule] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [selectedSlot, setSelectedSlot] = useState<any>(null);

  useEffect(() => {
    fetchAppointment();
  }, [appointmentId]);

  const fetchAppointment = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/appointments/${appointmentId}`);
      if (response.ok) {
        const data = await response.json();
        setAppointment(data);
      }
    } catch (error) {
      console.error('Failed to fetch appointment:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReschedule = async () => {
    if (!selectedSlot || !appointment) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/appointments/${appointmentId}/reschedule?rescheduled_by=${userType}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            new_start: selectedSlot.start,
            reason: 'Rescheduled by ' + userType,
          }),
        }
      );

      if (response.ok) {
        alert('Appointment rescheduled successfully!');
        window.location.reload();
      } else {
        alert('Failed to reschedule appointment');
      }
    } catch (error) {
      console.error('Failed to reschedule:', error);
      alert('Failed to reschedule appointment');
    }
  };

  const handleCancel = async () => {
    if (!cancelReason.trim() || !appointment) return;

    try {
      const response = await fetch(`${API_BASE_URL}/appointments/${appointmentId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: cancelReason,
          cancelled_by: userType,
        }),
      });

      if (response.ok) {
        alert('Appointment cancelled successfully');
        window.location.reload();
      } else {
        alert('Failed to cancel appointment');
      }
    } catch (error) {
      console.error('Failed to cancel:', error);
      alert('Failed to cancel appointment');
    }
  };

  const handleComplete = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/appointments/${appointmentId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes: 'Completed',
        }),
      });

      if (response.ok) {
        alert('Appointment marked as completed!');
        window.location.reload();
      } else {
        alert('Failed to complete appointment');
      }
    } catch (error) {
      console.error('Failed to complete:', error);
      alert('Failed to complete appointment');
    }
  };

  const downloadIcal = () => {
    window.location.href = `${API_BASE_URL}/appointments/export/${appointmentId}/ical`;
  };

  if (loading) {
    return <div className="text-center py-8">Loading appointment...</div>;
  }

  if (!appointment) {
    return <div className="text-center py-8 text-red-500">Appointment not found</div>;
  }

  const canReschedule = appointment.status === 'confirmed';
  const canCancel = ['confirmed', 'rescheduled'].includes(appointment.status);
  const canComplete = userType === 'mester' && appointment.status === 'confirmed';

  return (
    <div className="space-y-6">
      {/* Appointment Details */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <CardTitle>Appointment Details</CardTitle>
            <Badge className={statusColors[appointment.status]}>
              {statusLabels[appointment.status]}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center gap-2 text-gray-600 mb-1">
                <Calendar className="h-4 w-4" />
                <span className="text-sm font-medium">Date</span>
              </div>
              <p className="text-lg">
                {format(new Date(appointment.scheduled_start), 'PPP')}
              </p>
            </div>

            <div>
              <div className="flex items-center gap-2 text-gray-600 mb-1">
                <Clock className="h-4 w-4" />
                <span className="text-sm font-medium">Time</span>
              </div>
              <p className="text-lg">
                {format(new Date(appointment.scheduled_start), 'p')} -{' '}
                {format(new Date(appointment.scheduled_end), 'p')}
              </p>
              <p className="text-sm text-gray-500">{appointment.duration_minutes} minutes</p>
            </div>

            <div className="col-span-2">
              <div className="flex items-center gap-2 text-gray-600 mb-1">
                <MapPin className="h-4 w-4" />
                <span className="text-sm font-medium">Location</span>
              </div>
              <p>{appointment.location_address || appointment.location}</p>
            </div>
          </div>

          {appointment.mester_notes && (
            <div>
              <h4 className="font-medium mb-1">Mester Notes</h4>
              <p className="text-gray-600">{appointment.mester_notes}</p>
            </div>
          )}

          {appointment.customer_notes && (
            <div>
              <h4 className="font-medium mb-1">Customer Notes</h4>
              <p className="text-gray-600">{appointment.customer_notes}</p>
            </div>
          )}

          {appointment.cancellation_reason && (
            <div className="p-3 bg-red-50 rounded-md">
              <div className="flex items-center gap-2 text-red-700 mb-1">
                <AlertCircle className="h-4 w-4" />
                <span className="font-medium">Cancelled</span>
              </div>
              <p className="text-sm text-red-600">{appointment.cancellation_reason}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={downloadIcal}>
              <Download className="h-4 w-4 mr-2" />
              Download iCal
            </Button>

            {canReschedule && (
              <Button onClick={() => setShowReschedule(!showReschedule)}>
                Reschedule
              </Button>
            )}

            {canCancel && (
              <Button variant="destructive" onClick={() => setShowCancel(!showCancel)}>
                Cancel Appointment
              </Button>
            )}

            {canComplete && (
              <Button variant="default" onClick={handleComplete}>
                Mark as Completed
              </Button>
            )}
          </div>

          {/* Reschedule Form */}
          {showReschedule && canReschedule && (
            <div className="mt-4 p-4 border rounded-lg">
              <h3 className="font-semibold mb-3">Reschedule Appointment</h3>
              <TimeSlotPicker
                mesterId={appointment.mester_id}
                durationMinutes={appointment.duration_minutes}
                onSelectSlot={setSelectedSlot}
                selectedSlot={selectedSlot}
              />
              <div className="mt-4 flex gap-2">
                <Button onClick={handleReschedule} disabled={!selectedSlot}>
                  Confirm Reschedule
                </Button>
                <Button variant="outline" onClick={() => setShowReschedule(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Cancel Form */}
          {showCancel && canCancel && (
            <div className="mt-4 p-4 border rounded-lg">
              <h3 className="font-semibold mb-3">Cancel Appointment</h3>
              <div>
                <Label htmlFor="reason">Cancellation Reason</Label>
                <Input
                  id="reason"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Please provide a reason for cancellation"
                  className="mt-1"
                />
              </div>
              <div className="mt-4 flex gap-2">
                <Button
                  variant="destructive"
                  onClick={handleCancel}
                  disabled={!cancelReason.trim()}
                >
                  Confirm Cancellation
                </Button>
                <Button variant="outline" onClick={() => setShowCancel(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


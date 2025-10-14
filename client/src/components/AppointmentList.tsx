import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, MapPin, User } from 'lucide-react';
import { format } from 'date-fns';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

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

interface AppointmentListProps {
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

export default function AppointmentList({ userId, userType }: AppointmentListProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    fetchAppointments();
  }, [userId, userType, filter]);

  const fetchAppointments = async () => {
    try {
      const params = new URLSearchParams();
      if (userType === 'mester') {
        params.append('mester_id', userId);
      } else {
        params.append('customer_user_id', userId);
      }
      if (filter !== 'all') {
        params.append('status', filter);
      }

      const response = await fetch(`${API_BASE_URL}/appointments/list?${params}`);
      if (response.ok) {
        const data = await response.json();
        setAppointments(data);
      }
    } catch (error) {
      console.error('Failed to fetch appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const getUpcomingAppointments = () => {
    const now = new Date();
    return appointments.filter(apt => 
      new Date(apt.scheduled_start) > now && 
      apt.status === 'confirmed'
    );
  };

  const getPastAppointments = () => {
    const now = new Date();
    return appointments.filter(apt => 
      new Date(apt.scheduled_start) <= now || 
      ['completed', 'cancelled_by_customer', 'cancelled_by_mester', 'no_show'].includes(apt.status)
    );
  };

  if (loading) {
    return <div className="text-center py-8">Loading appointments...</div>;
  }

  const upcomingAppointments = getUpcomingAppointments();
  const pastAppointments = getPastAppointments();

  return (
    <div className="space-y-6">
      {/* Filters (standardized Tabs) */}
      <Tabs value={filter} onValueChange={setFilter} className="-mt-2">
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="confirmed">Confirmed</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Upcoming Appointments */}
      {upcomingAppointments.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Upcoming Appointments</h3>
          <div className="space-y-3">
            {upcomingAppointments.map(appointment => (
              <AppointmentCard
                key={appointment.id}
                appointment={appointment}
                onView={() => window.location.href = `/appointments/${appointment.id}`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Past Appointments */}
      {pastAppointments.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Past Appointments</h3>
          <div className="space-y-3">
            {pastAppointments.map(appointment => (
              <AppointmentCard
                key={appointment.id}
                appointment={appointment}
                onView={() => window.location.href = `/appointments/${appointment.id}`}
              />
            ))}
          </div>
        </div>
      )}

      {appointments.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-gray-500">
            No appointments found
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function AppointmentCard({ appointment, onView }: { appointment: Appointment; onView: () => void }) {
  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={onView}>
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <span className="font-medium">
                {format(new Date(appointment.scheduled_start), 'PPP')}
              </span>
              <Badge className={statusColors[appointment.status]}>
                {statusLabels[appointment.status]}
              </Badge>
            </div>
            
            <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {format(new Date(appointment.scheduled_start), 'p')} - {format(new Date(appointment.scheduled_end), 'p')}
              </div>
              <div className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {appointment.location_address || appointment.location}
              </div>
            </div>

            {appointment.customer_notes && (
              <p className="text-sm text-gray-500 mt-2">
                <strong>Notes:</strong> {appointment.customer_notes}
              </p>
            )}
          </div>

          <Button variant="outline" size="sm">
            View Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}


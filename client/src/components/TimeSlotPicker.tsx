import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Clock, Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface TimeSlot {
  start: string;
  end: string;
  duration_minutes: number;
}

interface TimeSlotPickerProps {
  mesterId: string;
  durationMinutes: number;
  onSelectSlot: (slot: TimeSlot) => void;
  selectedSlot?: TimeSlot | null;
}

export default function TimeSlotPicker({
  mesterId,
  durationMinutes,
  onSelectSlot,
  selectedSlot = null
}: TimeSlotPickerProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedDate) {
      fetchAvailableSlots();
    }
  }, [selectedDate, mesterId, durationMinutes]);

  const fetchAvailableSlots = async () => {
    if (!selectedDate) return;

    setLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/appointments/availability/${mesterId}/check`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date: format(selectedDate, 'yyyy-MM-dd'),
            duration_minutes: durationMinutes,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setAvailableSlots(data.available_slots || []);
      } else {
        setAvailableSlots([]);
      }
    } catch (error) {
      console.error('Failed to fetch available slots:', error);
      setAvailableSlots([]);
    } finally {
      setLoading(false);
    }
  };

  const isSlotSelected = (slot: TimeSlot) => {
    return selectedSlot?.start === slot.start;
  };

  const groupSlotsByPeriod = (slots: TimeSlot[]) => {
    const morning: TimeSlot[] = [];
    const afternoon: TimeSlot[] = [];
    const evening: TimeSlot[] = [];

    slots.forEach(slot => {
      const hour = new Date(slot.start).getHours();
      if (hour < 12) {
        morning.push(slot);
      } else if (hour < 17) {
        afternoon.push(slot);
      } else {
        evening.push(slot);
      }
    });

    return { morning, afternoon, evening };
  };

  const { morning, afternoon, evening } = groupSlotsByPeriod(availableSlots);

  return (
    <div className="space-y-4">
      {/* Date Picker */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <CalendarIcon className="h-5 w-5 text-gray-600" />
            <h3 className="font-semibold">Select Date</h3>
          </div>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            disabled={(date) => date < new Date()}
            className="rounded-md border"
          />
        </CardContent>
      </Card>

      {/* Time Slots */}
      {selectedDate && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-5 w-5 text-gray-600" />
              <h3 className="font-semibold">
                Available Times - {format(selectedDate, 'PPP')}
              </h3>
            </div>

            {loading && (
              <div className="text-center py-8 text-gray-500">
                Loading available times...
              </div>
            )}

            {!loading && availableSlots.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No available times for this date. Please select another date.
              </div>
            )}

            {!loading && availableSlots.length > 0 && (
              <div className="space-y-4">
                {/* Morning Slots */}
                {morning.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-600 mb-2">Morning</h4>
                    <div className="grid grid-cols-3 gap-2">
                      {morning.map((slot, index) => (
                        <Button
                          key={index}
                          variant={isSlotSelected(slot) ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => onSelectSlot(slot)}
                          className="justify-center"
                        >
                          {format(new Date(slot.start), 'h:mm a')}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Afternoon Slots */}
                {afternoon.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-600 mb-2">Afternoon</h4>
                    <div className="grid grid-cols-3 gap-2">
                      {afternoon.map((slot, index) => (
                        <Button
                          key={index}
                          variant={isSlotSelected(slot) ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => onSelectSlot(slot)}
                          className="justify-center"
                        >
                          {format(new Date(slot.start), 'h:mm a')}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Evening Slots */}
                {evening.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-600 mb-2">Evening</h4>
                    <div className="grid grid-cols-3 gap-2">
                      {evening.map((slot, index) => (
                        <Button
                          key={index}
                          variant={isSlotSelected(slot) ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => onSelectSlot(slot)}
                          className="justify-center"
                        >
                          {format(new Date(slot.start), 'h:mm a')}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {selectedSlot && (
              <div className="mt-4 p-3 bg-blue-50 rounded-md">
                <p className="text-sm font-medium text-blue-900">
                  Selected: {format(new Date(selectedSlot.start), 'PPP')} at{' '}
                  {format(new Date(selectedSlot.start), 'p')}
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  Duration: {selectedSlot.duration_minutes} minutes
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}


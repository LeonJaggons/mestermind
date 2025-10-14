import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Clock, Calendar, Settings } from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface WorkingHours {
  [key: string]: {
    start: string;
    end: string;
  } | null;
}

interface CalendarSettings {
  id: string;
  mester_id: string;
  timezone: string;
  default_working_hours: WorkingHours | null;
  buffer_minutes: number;
  min_advance_hours: number;
  max_advance_days: number;
  default_duration_minutes: number;
  allow_online_booking: boolean;
}

interface CalendarSettingsProps {
  mesterId: string;
}

const DAYS_OF_WEEK = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

const DAY_LABELS: Record<string, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
};

export default function CalendarSettingsComponent({ mesterId }: CalendarSettingsProps) {
  const [settings, setSettings] = useState<CalendarSettings | null>(null);
  const [workingHours, setWorkingHours] = useState<WorkingHours>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, [mesterId]);

  const fetchSettings = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/appointments/calendar/${mesterId}`);
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
        setWorkingHours(data.default_working_hours || getDefaultWorkingHours());
      }
    } catch (error) {
      console.error('Failed to fetch calendar settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDefaultWorkingHours = (): WorkingHours => {
    const defaults: WorkingHours = {};
    DAYS_OF_WEEK.forEach(day => {
      if (['saturday', 'sunday'].includes(day)) {
        defaults[day] = null;
      } else {
        defaults[day] = { start: '09:00', end: '17:00' };
      }
    });
    return defaults;
  };

  const handleSave = async () => {
    if (!settings) return;

    setSaving(true);
    try {
      const response = await fetch(`${API_BASE_URL}/appointments/calendar/${mesterId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timezone: settings.timezone,
          default_working_hours: workingHours,
          buffer_minutes: settings.buffer_minutes,
          min_advance_hours: settings.min_advance_hours,
          max_advance_days: settings.max_advance_days,
          default_duration_minutes: settings.default_duration_minutes,
          allow_online_booking: settings.allow_online_booking,
        }),
      });

      if (response.ok) {
        alert('Settings saved successfully!');
      } else {
        alert('Failed to save settings');
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const toggleDay = (day: string) => {
    setWorkingHours(prev => ({
      ...prev,
      [day]: prev[day] ? null : { start: '09:00', end: '17:00' },
    }));
  };

  const updateDayHours = (day: string, field: 'start' | 'end', value: string) => {
    setWorkingHours(prev => ({
      ...prev,
      [day]: prev[day] ? { ...prev[day]!, [field]: value } : null,
    }));
  };

  if (loading) {
    return <div className="text-center py-8">Loading settings...</div>;
  }

  if (!settings) {
    return <div className="text-center py-8 text-red-500">Failed to load settings</div>;
  }

  return (
    <div className="space-y-6">
      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            General Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="buffer">Buffer Time (minutes)</Label>
              <Input
                id="buffer"
                type="number"
                value={settings.buffer_minutes}
                onChange={(e) => setSettings({ ...settings, buffer_minutes: parseInt(e.target.value) })}
              />
              <p className="text-xs text-gray-500 mt-1">
                Time between appointments for preparation
              </p>
            </div>

            <div>
              <Label htmlFor="duration">Default Duration (minutes)</Label>
              <Input
                id="duration"
                type="number"
                value={settings.default_duration_minutes}
                onChange={(e) => setSettings({ ...settings, default_duration_minutes: parseInt(e.target.value) })}
              />
            </div>

            <div>
              <Label htmlFor="advance">Min Advance Notice (hours)</Label>
              <Input
                id="advance"
                type="number"
                value={settings.min_advance_hours}
                onChange={(e) => setSettings({ ...settings, min_advance_hours: parseInt(e.target.value) })}
              />
              <p className="text-xs text-gray-500 mt-1">
                Minimum time before appointments can be booked
              </p>
            </div>

            <div>
              <Label htmlFor="maxdays">Max Booking Window (days)</Label>
              <Input
                id="maxdays"
                type="number"
                value={settings.max_advance_days}
                onChange={(e) => setSettings({ ...settings, max_advance_days: parseInt(e.target.value) })}
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="online-booking"
              checked={settings.allow_online_booking}
              onCheckedChange={(checked) => setSettings({ ...settings, allow_online_booking: checked })}
            />
            <Label htmlFor="online-booking">Allow online booking</Label>
          </div>
        </CardContent>
      </Card>

      {/* Working Hours */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Working Hours
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {DAYS_OF_WEEK.map(day => (
            <div key={day} className="flex items-center gap-4">
              <div className="w-32">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={workingHours[day] !== null}
                    onCheckedChange={() => toggleDay(day)}
                  />
                  <span className="text-sm font-medium">{DAY_LABELS[day]}</span>
                </div>
              </div>

              {workingHours[day] && (
                <div className="flex items-center gap-2 flex-1">
                  <Input
                    type="time"
                    value={workingHours[day]!.start}
                    onChange={(e) => updateDayHours(day, 'start', e.target.value)}
                    className="w-32"
                  />
                  <span className="text-gray-500">to</span>
                  <Input
                    type="time"
                    value={workingHours[day]!.end}
                    onChange={(e) => updateDayHours(day, 'end', e.target.value)}
                    className="w-32"
                  />
                </div>
              )}

              {!workingHours[day] && (
                <span className="text-sm text-gray-400">Closed</span>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
}


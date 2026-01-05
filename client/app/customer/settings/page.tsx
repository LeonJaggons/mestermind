"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/contexts/AuthContext";
import { API_BASE_URL } from "@/lib/api/config";
import { Bell, BellOff, Loader2 } from "lucide-react";

export default function CustomerSettingsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [userId, setUserId] = useState<number | null>(null);

  useEffect(() => {
    const fetchUserSettings = async () => {
      if (!user) return;

      try {
        // Get user data
        const response = await fetch(`${API_BASE_URL}/api/v1/users/firebase/${user.uid}`);
        if (response.ok) {
          const userData = await response.json();
          setUserId(userData.id);
          setEmailNotifications(userData.email_notifications_enabled ?? true);
        }
      } catch (error) {
        console.error("Error fetching settings:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserSettings();
  }, [user]);

  const handleToggleEmailNotifications = async () => {
    if (!userId || saving) return;

    setSaving(true);
    const newValue = !emailNotifications;

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email_notifications_enabled: newValue,
        }),
      });

      if (response.ok) {
        setEmailNotifications(newValue);
      } else {
        alert("Failed to update settings");
      }
    } catch (error) {
      console.error("Error updating settings:", error);
      alert("An error occurred");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Settings</h1>

        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Notifications</h2>

            <div className="border-t border-gray-200 pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-start">
                  {emailNotifications ? (
                    <Bell className="w-5 h-5 text-gray-400 mt-0.5 mr-3" />
                  ) : (
                    <BellOff className="w-5 h-5 text-gray-400 mt-0.5 mr-3" />
                  )}
                  <div>
                    <h3 className="text-base font-medium text-gray-900">Email Notifications</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Receive email notifications for new messages, appointments, and job updates
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleToggleEmailNotifications}
                  disabled={saving}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    emailNotifications ? "bg-blue-600" : "bg-gray-200"
                  } ${saving ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      emailNotifications ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              {!emailNotifications && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>Note:</strong> You'll still receive important in-app notifications, but won't get emails.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { Bell, X, Check } from "lucide-react";
import { useRouter } from "next/router";
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  type Notification,
} from "@/lib/api";
import { useWebSocketEvent } from "@/lib/useWebSocket";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";

interface NotificationBellProps {
  token: string;
  onDark?: boolean;
}

export function NotificationBell({ token, onDark = false }: NotificationBellProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadNotifications();
  }, [token]);

  async function loadNotifications() {
    if (!token) return;

    try {
      const data = await getNotifications(token, { limit: 20 });
      setNotifications(data.items);
      setUnreadCount(data.unread_count);
    } catch (error) {
      console.error("Failed to load notifications:", error);
    }
  }

  // Real-time notification updates via WebSocket
  useWebSocketEvent('notification', (message) => {
    console.log('[NotificationBell] Received notification event:', message);
    if (message.data) {
      const data = message.data as Record<string, unknown>;
      const newNotification: Notification = {
        id: data.id as string,
        user_id: (data.user_id as string | null) || undefined,
        mester_id: (data.mester_id as string | null) || undefined,
        type: data.notification_type as string,
        title: data.title as string,
        body: data.body as string,
        request_id: (data.request_id as string | null) || undefined,
        offer_id: (data.offer_id as string | null) || undefined,
        message_id: (data.message_id as string | null) || undefined,
        action_url: (data.action_url as string | null) || undefined,
        data: (data.data as Record<string, unknown> | null) || undefined,
        is_read: data.is_read as boolean,
        read_at: (data.read_at as string | null) || undefined,
        created_at: data.created_at as string,
      };
      
      console.log('[NotificationBell] Adding notification to list, current count:', unreadCount);
      
      // Add to top of notifications list
      setNotifications(prev => [newNotification, ...prev.slice(0, 19)]);
      
      // Increment unread count if not read
      if (!newNotification.is_read) {
        setUnreadCount(prev => {
          const newCount = prev + 1;
          console.log('[NotificationBell] Incrementing unread count:', prev, '->', newCount);
          return newCount;
        });
      }
    }
  }, !!token);

  async function handleNotificationClick(notification: Notification) {
    try {
      // Mark as read
      if (!notification.is_read) {
        await markNotificationRead(notification.id, token);
        setUnreadCount((prev) => Math.max(0, prev - 1));

        // Update local state
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notification.id ? { ...n, is_read: true } : n,
          ),
        );
      }

      // Close dropdown
      setIsOpen(false);

      // Navigate to action URL
      if (notification.action_url) {
        router.push(notification.action_url);
      }
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  }

  async function handleMarkAllRead() {
    if (!token) return;

    try {
      setLoading(true);
      await markAllNotificationsRead(token);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    } finally {
      setLoading(false);
    }
  }

  function formatTimestamp(timestamp: string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          className={`relative p-2 rounded-full transition-colors ${
            onDark ? "hover:bg-white/10" : "hover:bg-gray-100"
          }`}
          aria-label="Notifications"
        >
          <Bell size={24} className={onDark ? "text-white" : "text-gray-700"} />
          {unreadCount > 0 && (
            <span className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold rounded-full h-5 min-w-[20px] flex items-center justify-center px-1">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
          <h3 className="font-semibold text-gray-900">Notifications</h3>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                disabled={loading}
                className="text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50 flex items-center gap-1"
              >
                <Check size={14} />
                Mark all read
              </button>
            )}
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Notification List */}
        <div className="overflow-y-auto max-h-[520px]">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Bell size={48} className="mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No notifications yet</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${
                  !notification.is_read ? "bg-blue-50" : ""
                }`}
              >
                <div className="flex items-start gap-3">
                  {!notification.is_read && (
                    <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div
                      className={`text-sm mb-1 ${
                        !notification.is_read
                          ? "font-semibold text-gray-900"
                          : "font-medium text-gray-700"
                      }`}
                    >
                      {notification.title}
                    </div>
                    <div className="text-sm text-gray-600 line-clamp-2">
                      {notification.body}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {formatTimestamp(notification.created_at)}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="p-3 border-t border-gray-200 bg-gray-50">
            <button
              onClick={() => {
                setIsOpen(false);
                router.push("/notifications");
              }}
              className="w-full text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              View all notifications
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

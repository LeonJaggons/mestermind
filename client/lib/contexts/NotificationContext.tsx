"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
} from "react";
import { useAuth } from "./AuthContext";
import {
  subscribeToNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
} from "@/lib/services/notifications";
import { Notification } from "@/lib/types/notifications";
import { API_BASE_URL } from "@/lib/api/config";

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refreshUnreadCount: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  unreadCount: 0,
  loading: true,
  markAsRead: async () => {},
  markAllAsRead: async () => {},
  refreshUnreadCount: async () => {},
});

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider = ({ children }: NotificationProviderProps) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<number | null>(null);

  // Fetch user ID from backend
  useEffect(() => {
    const fetchUserId = async () => {
      if (!user) {
        setUserId(null);
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `${API_BASE_URL}/api/v1/users/firebase/${user.uid}`
        );
        if (response.ok) {
          const userData = await response.json();
          setUserId(userData.id);
        }
      } catch (error) {
        console.error("Failed to fetch user ID:", error);
        setLoading(false);
      }
    };

    fetchUserId();
  }, [user]);

  // Subscribe to real-time notifications
  useEffect(() => {
    if (!user || !userId) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = subscribeToNotifications(
      user.uid,
      (newNotifications) => {
        setNotifications(newNotifications);
        const unread = newNotifications.filter((n) => n.status === "unread").length;
        setUnreadCount(unread);
        setLoading(false);
      },
      { limitCount: 50 }
    );

    return () => unsubscribe();
  }, [user, userId]);

  const handleMarkAsRead = useCallback(
    async (notificationId: string) => {
      try {
        await markAsRead(notificationId);
        // Optimistically update local state
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notificationId ? { ...n, status: "read" as const } : n
          )
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (error) {
        console.error("Failed to mark notification as read:", error);
      }
    },
    []
  );

  const handleMarkAllAsRead = useCallback(async () => {
    if (!user) return;
    try {
      await markAllAsRead(user.uid);
      // Optimistically update local state
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, status: "read" as const }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
    }
  }, [user]);

  const refreshUnreadCount = useCallback(async () => {
    if (!user) {
      setUnreadCount(0);
      return;
    }
    try {
      const count = await getUnreadCount(user.uid);
      setUnreadCount(count);
    } catch (error) {
      console.error("Failed to refresh unread count:", error);
    }
  }, [user]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        markAsRead: handleMarkAsRead,
        markAllAsRead: handleMarkAllAsRead,
        refreshUnreadCount,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

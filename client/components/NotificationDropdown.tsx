"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Check,
  CheckCheck,
  Calendar,
  XCircle,
  CheckCircle,
  MessageSquare,
  DollarSign,
  Settings,
  PartyPopper,
} from "lucide-react";
import { useNotifications } from "@/lib/contexts/NotificationContext";
import { Notification, NotificationType } from "@/lib/types/notifications";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/contexts/I18nContext";

interface NotificationDropdownProps {
  className?: string;
}

const getNotificationIcon = (type: NotificationType) => {
  const iconProps = { className: "h-5 w-5", "aria-hidden": true as const };
  
  switch (type) {
    case "appointment_created":
    case "appointment_confirmed":
    case "appointment_reminder":
      return <Calendar {...iconProps} className="h-5 w-5 text-blue-600" />;
    case "appointment_cancelled":
      return <XCircle {...iconProps} className="h-5 w-5 text-red-600" />;
    case "appointment_completed":
      return <CheckCircle {...iconProps} className="h-5 w-5 text-green-600" />;
    case "new_message":
      return <MessageSquare {...iconProps} className="h-5 w-5 text-purple-600" />;
    case "job_created":
    case "job_opened":
      return <Bell {...iconProps} className="h-5 w-5 text-orange-600" />;
    case "lead_purchased":
    case "payment_received":
      return <DollarSign {...iconProps} className="h-5 w-5 text-green-600" />;
    case "job_in_progress":
      return <Settings {...iconProps} className="h-5 w-5 text-blue-600" />;
    case "job_completed":
      return <PartyPopper {...iconProps} className="h-5 w-5 text-yellow-600" />;
    default:
      return <Bell {...iconProps} className="h-5 w-5 text-gray-600" />;
  }
};

const formatNotificationTime = (
  date: Date,
  language: string,
  t: (key: string) => string
) => {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return t("notification.time.justNow");
  }

  if (diffInSeconds < 3600) {
    const mins = Math.floor(diffInSeconds / 60);
    return `${mins}${t("notification.time.minutes")} ${t(
      "notification.time.ago"
    )}`;
  }

  if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours}${t("notification.time.hours")} ${t(
      "notification.time.ago"
    )}`;
  }

  const days = Math.floor(diffInSeconds / 86400);
  if (diffInSeconds < 604800) {
    return `${days}${t("notification.time.days")} ${t(
      "notification.time.ago"
    )}`;
  }

  return date.toLocaleDateString(language === "hu" ? "hu-HU" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

export default function NotificationDropdown({ className = "" }: NotificationDropdownProps) {
  const { notifications, unreadCount, markAsRead, markAllAsRead, loading } =
    useNotifications();
  const router = useRouter();
  const { t } = useI18n();

  const handleNotificationClick = async (notification: Notification) => {
    if (notification.status === "unread") {
      await markAsRead(notification.id);
    }

    if (notification.link) {
      router.push(notification.link);
    }
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  const unreadNotifications = notifications.filter((n) => n.status === "unread");
  const readNotifications = notifications.filter((n) => n.status === "read");

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("relative overflow-visible", className)}
          aria-label={t("notification.viewNotifications")}
        >
          <Bell className="h-5 w-5 text-[rgb(103,109,115)]" />
          {unreadCount > 0 && (
            <span
              className="absolute -top-1 -right-1 h-5 w-5 min-w-[20px] flex items-center justify-center rounded-full bg-red-500 text-white text-xs font-semibold z-10 pointer-events-none"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-96 p-0 max-h-[600px] flex flex-col bg-white border-gray-200"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h3 className="text-lg font-semibold">{t("nav.notifications")}</h3>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllAsRead}
                className="h-auto py-1 px-2 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                title={t("nav.markAllRead")}
              >
                <CheckCheck className="h-3.5 w-3.5 mr-1" />
                {t("nav.markAllRead")}
              </Button>
            )}
          </div>
        </div>

        {/* Notifications List */}
        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">
              {t("nav.loadingNotifications")}
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              {t("nav.noNotifications")}
            </div>
          ) : (
            <>
              {unreadNotifications.length > 0 && (
                <div className="px-2 py-2">
                  {unreadNotifications.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onClick={handleNotificationClick}
                      onMarkAsRead={markAsRead}
                    />
                  ))}
                </div>
              )}

              {readNotifications.length > 0 && (
                <>
                  {unreadNotifications.length > 0 && (
                    <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase border-t">
                      {t("nav.older")}
                    </div>
                  )}
                  <div className="px-2 py-2">
                    {readNotifications.map((notification) => (
                      <NotificationItem
                        key={notification.id}
                        notification={notification}
                        onClick={handleNotificationClick}
                        onMarkAsRead={markAsRead}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface NotificationItemProps {
  notification: Notification;
  onClick: (notification: Notification) => void;
  onMarkAsRead: (id: string) => Promise<void>;
}

function NotificationItem({
  notification,
  onClick,
  onMarkAsRead,
}: NotificationItemProps) {
  const { t, language } = useI18n();
  const isUnread = notification.status === "unread";

  const handleClick = () => {
    onClick(notification);
  };

  const handleMarkAsRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isUnread) {
      await onMarkAsRead(notification.id);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        "p-3 cursor-pointer hover:bg-accent transition-colors rounded-md",
        isUnread && "bg-blue-50/50"
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 flex items-center justify-center">
          {getNotificationIcon(notification.type)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <p
                className={cn(
                  "text-sm font-medium",
                  isUnread ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {notification.title}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {notification.message}
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                {formatNotificationTime(notification.createdAt, language, t)}
              </p>
            </div>
            {isUnread && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleMarkAsRead}
                className="h-6 w-6 flex-shrink-0"
                title={t("notification.markAsRead")}
                aria-label={t("notification.markAsRead")}
              >
                <Check className="h-4 w-4 text-muted-foreground" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

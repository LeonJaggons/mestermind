export type NotificationType =
  | "job_created"
  | "job_opened"
  | "appointment_created"
  | "appointment_confirmed"
  | "appointment_cancelled"
  | "appointment_completed"
  | "appointment_reminder"
  | "new_message"
  | "lead_purchased"
  | "payment_received"
  | "job_in_progress"
  | "job_completed";

export type NotificationStatus = "unread" | "read";

export interface Notification {
  id: string;
  userId: number; // Backend user ID
  firebaseUid: string; // Firebase UID for real-time subscriptions
  type: NotificationType;
  status: NotificationStatus;
  title: string;
  message: string;
  link?: string; // URL to navigate when clicked
  metadata?: Record<string, unknown>; // Additional data (job_id, appointment_id, etc.)
  createdAt: Date;
  readAt?: Date;
}

export interface CreateNotificationData {
  userId: number;
  firebaseUid: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  metadata?: Record<string, unknown>;
}

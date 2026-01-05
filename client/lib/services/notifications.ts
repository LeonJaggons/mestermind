import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  QueryConstraint,
  Unsubscribe,
  Timestamp,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { Notification, CreateNotificationData, NotificationStatus } from "@/lib/types/notifications";

const COLLECTION_NAME = "notifications";

/**
 * Subscribe to real-time notifications for a user
 */
export const subscribeToNotifications = (
  firebaseUid: string,
  callback: (notifications: Notification[]) => void,
  options: { limitCount?: number; unreadOnly?: boolean } = {}
): Unsubscribe => {
  const { limitCount = 50, unreadOnly = false } = options;

  const constraints: QueryConstraint[] = [
    where("firebaseUid", "==", firebaseUid),
    orderBy("createdAt", "desc"),
  ];

  if (unreadOnly) {
    constraints.push(where("status", "==", "unread"));
  }

  if (limitCount) {
    constraints.push(limit(limitCount));
  }

  const q = query(collection(db, COLLECTION_NAME), ...constraints);

  return onSnapshot(q, (snapshot) => {
    const notifications = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        readAt: data.readAt?.toDate() || undefined,
      } as Notification;
    });
    callback(notifications);
  });
};

/**
 * Get unread notification count
 */
export const getUnreadCount = async (firebaseUid: string): Promise<number> => {
  const { queryDocuments, createQueryConstraints } = await import("@/lib/firebase/firestore");
  
  const notifications = await queryDocuments<Notification>(COLLECTION_NAME, [
    createQueryConstraints.where("firebaseUid", "==", firebaseUid),
    createQueryConstraints.where("status", "==", "unread"),
  ]);

  return notifications.length;
};

/**
 * Mark notification as read
 */
export const markAsRead = async (notificationId: string): Promise<void> => {
  const { updateDocument } = await import("@/lib/firebase/firestore");
  
  await updateDocument(COLLECTION_NAME, notificationId, {
    status: "read" as NotificationStatus,
    readAt: serverTimestamp(),
  });
};

/**
 * Mark all notifications as read for a user
 */
export const markAllAsRead = async (firebaseUid: string): Promise<void> => {
  const { queryDocuments, updateDocument, createQueryConstraints } = await import("@/lib/firebase/firestore");
  
  const notifications = await queryDocuments<Notification>(COLLECTION_NAME, [
    createQueryConstraints.where("firebaseUid", "==", firebaseUid),
    createQueryConstraints.where("status", "==", "unread"),
  ]);

  const updatePromises = notifications.map((notification) =>
    updateDocument(COLLECTION_NAME, notification.id, {
      status: "read" as NotificationStatus,
      readAt: serverTimestamp(),
    })
  );

  await Promise.all(updatePromises);
};

/**
 * Create a notification (typically called from backend)
 * This is a client-side helper, but notifications should primarily be created server-side
 */
export const createNotification = async (
  data: CreateNotificationData
): Promise<void> => {
  const { createDocument } = await import("@/lib/firebase/firestore");
  
  await createDocument<CreateNotificationData & { status: NotificationStatus }>(
    COLLECTION_NAME,
    {
      ...data,
      status: "unread" as NotificationStatus,
    }
  );
};

/**
 * Delete a notification
 */
export const deleteNotification = async (notificationId: string): Promise<void> => {
  const { deleteDocument } = await import("@/lib/firebase/firestore");
  await deleteDocument(COLLECTION_NAME, notificationId);
};

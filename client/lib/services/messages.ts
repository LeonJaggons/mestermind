import {
  collection,
  query,
  orderBy,
  onSnapshot,
  Unsubscribe,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";

export interface RealtimeMessage {
  id: number;
  jobId: number;
  senderId: number;
  receiverId: number;
  content: string;
  isRead: boolean;
  isFromPro: boolean;
  createdAt: Date;
  senderName?: string;
}

/**
 * Subscribe to realtime messages for a conversation (job)
 */
export const subscribeToMessages = (
  jobId: number,
  callback: (messages: RealtimeMessage[]) => void
): Unsubscribe => {
  const messagesRef = collection(db, "conversations", jobId.toString(), "messages");
  const q = query(messagesRef, orderBy("createdAt", "asc"));

  console.log(`[FIRESTORE] Subscribing to messages for job ${jobId}`);

  return onSnapshot(q, (snapshot) => {
    console.log(`[FIRESTORE] Snapshot received: ${snapshot.docs.length} messages`);
    
    const messages = snapshot.docs.map((doc) => {
      const data = doc.data();
      console.log(`[FIRESTORE] Message ${data.id}:`, data);
      return {
        id: data.id,
        jobId: data.jobId,
        senderId: data.senderId,
        receiverId: data.receiverId,
        content: data.content,
        isRead: data.isRead,
        isFromPro: data.isFromPro,
        createdAt: data.createdAt?.toDate() || new Date(),
        senderName: data.senderName,
      } as RealtimeMessage;
    });
    
    console.log(`[FIRESTORE] Calling callback with ${messages.length} messages`);
    callback(messages);
  });
};

/**
 * Mark message as read in Firestore
 */
export const markMessageAsRead = async (
  jobId: number,
  messageId: number
): Promise<void> => {
  try {
    const messageRef = doc(
      db,
      "conversations",
      jobId.toString(),
      "messages",
      messageId.toString()
    );
    await updateDoc(messageRef, {
      isRead: true,
    });
  } catch (error) {
    console.error("Error marking message as read:", error);
  }
};

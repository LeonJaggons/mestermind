/**
 * WebSocket service for real-time updates
 */

const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';

console.log('[WebSocket] Configuration:', {
  WS_BASE_URL,
  env: process.env.NEXT_PUBLIC_WS_URL
});

export type WebSocketEventType = 
  | 'connection'
  | 'pong'
  | 'new_message'
  | 'notification'
  | 'appointment_proposal'
  | 'appointment_status_update'
  | 'new_offer';

export interface WebSocketMessage {
  type: WebSocketEventType;
  data?: any;
  status?: string;
  user_id?: string;
  mester_id?: string;
  timestamp?: string;
}

export type WebSocketEventHandler = (message: WebSocketMessage) => void;

class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second
  private pingInterval: NodeJS.Timeout | null = null;
  private eventHandlers: Map<WebSocketEventType, Set<WebSocketEventHandler>> = new Map();
  private connectionId: string | null = null;
  private isIntentionalClose = false;

  /**
   * Connect to WebSocket for a user
   */
  connectUser(userId: string): void {
    console.log('[WebSocket] Connecting user:', userId);
    this.connect(`${WS_BASE_URL}/ws/user/${userId}`);
  }

  /**
   * Connect to WebSocket for a mester
   */
  connectMester(mesterId: string): void {
    console.log('[WebSocket] Connecting mester:', mesterId);
    this.connect(`${WS_BASE_URL}/ws/mester/${mesterId}`);
  }

  /**
   * Internal connection method
   */
  private connect(url: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('[WebSocket] Already connected to:', url);
      return;
    }

    this.isIntentionalClose = false;
    this.connectionId = url;

    console.log('[WebSocket] Attempting to connect to:', url);

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        console.log('[WebSocket] Connected');
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000;
        this.startPingInterval();
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          console.log('[WebSocket] Message received:', message.type);
          
          // Notify all handlers for this event type
          const handlers = this.eventHandlers.get(message.type);
          if (handlers) {
            handlers.forEach(handler => {
              try {
                handler(message);
              } catch (error) {
                console.error('[WebSocket] Error in event handler:', error);
              }
            });
          }

          // Also notify wildcard handlers
          const wildcardHandlers = this.eventHandlers.get('*' as WebSocketEventType);
          if (wildcardHandlers) {
            wildcardHandlers.forEach(handler => {
              try {
                handler(message);
              } catch (error) {
                console.error('[WebSocket] Error in wildcard handler:', error);
              }
            });
          }
        } catch (error) {
          console.error('[WebSocket] Error parsing message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('[WebSocket] Error:', error);
      };

      this.ws.onclose = (event) => {
        console.log('[WebSocket] Disconnected', event.code, event.reason);
        this.stopPingInterval();

        // Attempt to reconnect if not an intentional close
        if (!this.isIntentionalClose && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
          console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
          
          setTimeout(() => {
            if (this.connectionId) {
              this.connect(this.connectionId);
            }
          }, delay);
        }
      };
    } catch (error) {
      console.error('[WebSocket] Connection error:', error);
    }
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect(): void {
    this.isIntentionalClose = true;
    this.stopPingInterval();
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.connectionId = null;
    this.reconnectAttempts = 0;
  }

  /**
   * Subscribe to an event type
   */
  on(eventType: WebSocketEventType | '*', handler: WebSocketEventHandler): () => void {
    if (!this.eventHandlers.has(eventType as WebSocketEventType)) {
      this.eventHandlers.set(eventType as WebSocketEventType, new Set());
    }
    
    this.eventHandlers.get(eventType as WebSocketEventType)!.add(handler);

    // Return unsubscribe function
    return () => {
      const handlers = this.eventHandlers.get(eventType as WebSocketEventType);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.eventHandlers.delete(eventType as WebSocketEventType);
        }
      }
    };
  }

  /**
   * Send a message to the server
   */
  send(message: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(message);
    } else {
      console.warn('[WebSocket] Cannot send message, not connected');
    }
  }

  /**
   * Check connection status
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Start ping interval to keep connection alive
   */
  private startPingInterval(): void {
    this.stopPingInterval();
    
    this.pingInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.send('ping');
      }
    }, 30000); // Ping every 30 seconds
  }

  /**
   * Stop ping interval
   */
  private stopPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }
}

// Export singleton instance
export const wsService = new WebSocketService();


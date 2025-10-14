/**
 * React hook for WebSocket connection
 */

import { useEffect, useRef } from 'react';
import { wsService, WebSocketEventType, WebSocketMessage, WebSocketEventHandler } from './websocket';

interface UseWebSocketOptions {
  userId?: string;
  mesterId?: string;
  onMessage?: WebSocketEventHandler;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

/**
 * Hook to manage WebSocket connection
 */
export function useWebSocket(options: UseWebSocketOptions) {
  const { userId, mesterId, onMessage, onConnect, onDisconnect } = options;
  const handlersRef = useRef<(() => void)[]>([]);

  useEffect(() => {
    // Only connect if we have a user or mester ID
    if (!userId && !mesterId) {
      return;
    }

    // Connect based on user type
    if (userId) {
      wsService.connectUser(userId);
    } else if (mesterId) {
      wsService.connectMester(mesterId);
    }

    // Set up connection event handlers
    const unsubConnection = wsService.on('connection', (message) => {
      console.log('[useWebSocket] Connection established:', message);
      if (message.status === 'connected') {
        onConnect?.();
      }
    });

    handlersRef.current.push(unsubConnection);

    // Set up general message handler if provided
    if (onMessage) {
      const unsubMessage = wsService.on('*', onMessage);
      handlersRef.current.push(unsubMessage);
    }

    // Cleanup on unmount
    return () => {
      handlersRef.current.forEach(unsub => unsub());
      handlersRef.current = [];
      wsService.disconnect();
      onDisconnect?.();
    };
  }, [userId, mesterId]); // Only reconnect if user/mester ID changes

  return {
    isConnected: () => wsService.isConnected(),
    send: (message: string) => wsService.send(message),
    on: (eventType: WebSocketEventType, handler: WebSocketEventHandler) => {
      const unsub = wsService.on(eventType, handler);
      handlersRef.current.push(unsub);
      return unsub;
    },
  };
}

/**
 * Hook to listen to specific WebSocket events
 */
export function useWebSocketEvent(
  eventType: WebSocketEventType,
  handler: WebSocketEventHandler,
  enabled: boolean = true
) {
  const handlerRef = useRef(handler);
  
  // Update handler ref when it changes
  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    if (!enabled) return;

    const unsubscribe = wsService.on(eventType, (message) => {
      handlerRef.current(message);
    });

    return () => {
      unsubscribe();
    };
  }, [eventType, enabled]);
}


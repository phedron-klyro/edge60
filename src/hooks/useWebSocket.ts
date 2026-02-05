/**
 * Edge60 Frontend - WebSocket Hook
 *
 * Manages WebSocket connection to the backend
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// WebSocket server URL
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3002/ws";

// Connection states
export type ConnectionStatus =
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";

// Server event types
// Server event types
export type ServerEvent =
  | { type: "CONNECTED"; playerId: string; message: string }
  | { type: "QUEUE_JOINED"; position: number }
  | { type: "QUEUE_LEFT" }
  | {
      type: "MATCH_PROPOSED";
      matchId: string;
      stake: number;
      gameType: string;
      asset: string;
      expiresAt: number;
    }
  | { type: "MATCH_FOUND"; match: any }
  | {
      type: "START_MATCH";
      matchId: string;
      startTime: number;
      startPrice: number;
      asset?: string;
      duration?: number;
    }
  | { type: "GAME_STATE_UPDATE"; matchId: string; state: any }
  | { type: "PREDICTION_RECEIVED"; matchId: string }
  | { type: "MATCH_RESULT"; match: any }
  | { type: "SETTLEMENT_STARTED"; matchId: string }
  | { type: "SETTLEMENT_COMPLETE"; match: any; settlement: any }
  | { type: "SETTLEMENT_FAILED"; matchId: string; error: string }
  | { type: "ERROR"; message: string }
  | { type: "PONG" };

interface UseWebSocketOptions {
  onMessage?: (event: ServerEvent) => void;
  onConnect?: (playerId: string) => void;
  onDisconnect?: () => void;
  autoConnect?: boolean;
}

interface UseWebSocketReturn {
  status: ConnectionStatus;
  playerId: string | null;
  connect: () => void;
  disconnect: () => void;
  send: (event: object) => void;
  isConnected: boolean;
}

export function useWebSocket(
  options: UseWebSocketOptions = {},
): UseWebSocketReturn {
  const { onMessage, onConnect, onDisconnect, autoConnect = true } = options;

  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [playerId, setPlayerId] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  // Refs for callbacks to prevent re-renders when they change
  const onMessageRef = useRef(onMessage);
  const onConnectRef = useRef(onConnect);
  const onDisconnectRef = useRef(onDisconnect);

  // Keep refs up to date
  useEffect(() => {
    onMessageRef.current = onMessage;
    onConnectRef.current = onConnect;
    onDisconnectRef.current = onDisconnect;
  }, [onMessage, onConnect, onDisconnect]);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const connectRef = useRef<() => void>(() => {});

  // Connect to WebSocket
  const connect = useCallback(() => {
    cleanup();
    setStatus("connecting");

    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("[WS] Connected to Edge60 backend");
        setStatus("connected");
        reconnectAttempts.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as ServerEvent;
          console.log("[WS] Received:", data.type);

          // Handle CONNECTED event specially
          if (data.type === "CONNECTED" && data.playerId) {
            const id = data.playerId as string;
            setPlayerId(id);
            onConnectRef.current?.(id);
          }

          // Forward all events to handler
          onMessageRef.current?.(data);
        } catch (error) {
          console.error("[WS] Failed to parse message:", error);
        }
      };

      ws.onclose = () => {
        console.log("[WS] Disconnected");
        setStatus("disconnected");
        setPlayerId(null);
        onDisconnectRef.current?.();

        // Auto-reconnect with exponential backoff
        if (reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.min(
            1000 * Math.pow(2, reconnectAttempts.current),
            10000,
          );
          reconnectAttempts.current++;
          console.log(
            `[WS] Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current})`,
          );
          reconnectTimeoutRef.current = setTimeout(
            () => connectRef.current(),
            delay,
          );
        }
      };

      ws.onerror = (error) => {
        console.error("[WS] Connection Error:", {
          url: WS_URL,
          readyState: ws.readyState,
          error,
        });
        setStatus("error");
      };
    } catch (error) {
      console.error("[WS] Failed to connect:", error);
      setStatus("error");
    }
  }, [cleanup]);

  // Disconnect
  const disconnect = useCallback(() => {
    reconnectAttempts.current = maxReconnectAttempts; // Stop auto-reconnect
    cleanup();
    setStatus("disconnected");
    setPlayerId(null);
  }, [cleanup]);

  // Send message
  const send = useCallback((event: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(event));
      console.log("[WS] Sent:", (event as { type?: string }).type || event);
    } else {
      console.warn("[WS] Cannot send - not connected");
    }
  }, []);

  // Update connectRef whenever connect changes
  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      // Small delay to avoid "Calling setState synchronously within an effect" warning
      const timeout = setTimeout(() => {
        connect();
      }, 0);
      return () => {
        clearTimeout(timeout);
        cleanup();
      };
    }
    return cleanup;
  }, [autoConnect, connect, cleanup]);

  return {
    status,
    playerId,
    connect,
    disconnect,
    send,
    isConnected: status === "connected",
  };
}

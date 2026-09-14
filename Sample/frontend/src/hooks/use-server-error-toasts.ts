import { useEffect, useRef, useCallback } from 'react';
import { io, type Socket } from 'socket.io-client';
import { SOCKET_BASE_URL } from '@config/socket';
import { useAuthStore } from '@stores/auth-store';
import { toast } from 'sonner';

export interface ServerErrorToast {
  /** Unique error ID for deduplication */
  id: string;
  /** HTTP status code */
  statusCode: number;
  /** Error code string */
  code: string;
  /** Human-readable message */
  message: string;
  /** Request path that triggered the error */
  path: string;
  /** HTTP method */
  method: string;
  /** Severity */
  severity: 'error' | 'warn' | 'info';
  /** ISO timestamp */
  timestamp: string;
  /** Whether the toast has been dismissed */
  dismissed: boolean;
}

type ServerErrorCallback = (toast: ServerErrorToast) => void;

const AUTO_DISMISS_MS = 8000;

function showServerError(payload: ServerErrorToast) {
  const title = payload.code.replace(/_/g, ' ');
  const options = {
    id: payload.id,
    description: payload.message,
    duration: AUTO_DISMISS_MS,
    closeButton: true,
  };

  switch (payload.severity) {
    case 'error':
      toast.error(title, options);
      break;
    case 'warn':
      toast.warning(title, options);
      break;
    default:
      toast.info(title, options);
  }
}

/**
 * React hook that connects to the Socket.IO server and listens for
 * `server-error` events, rendering them as sonner (shadcn/ui) toasts.
 *
 * - Automatically connects when a user is logged in
 * - Joins `user:<id>` room on connection
 * - Reuses the error id so duplicate events update an existing toast
 * - Optional `onNewError` callback fires for each event received
 */
export function useServerErrorToasts(onNewError?: ServerErrorCallback) {
  const socketRef = useRef<Socket | null>(null);
  const user = useAuthStore((s) => s.user);

  const handleServerError = useCallback(
    (payload: ServerErrorToast) => {
      showServerError(payload);
      onNewError?.(payload);
    },
    [onNewError],
  );

  useEffect(() => {
    if (!user?.id) return;

    const socket = io(SOCKET_BASE_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    socket.on('connect', () => {
      // Join the user's personal notification room for server-error events
      socket.emit('join-user', user.id);
    });

    socket.on('server-error', handleServerError);

    socket.on('connect_error', (err) => {
      console.error('[server-error-toasts] Socket connection error:', err.message);
    });

    socketRef.current = socket;

    return () => {
      socket.emit('leave-user', user.id);
      socket.off('server-error', handleServerError);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user?.id, handleServerError]);

  return null;
}

export default useServerErrorToasts;
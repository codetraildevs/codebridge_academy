import { useEffect, useRef, useCallback } from 'react';
import { io, type Socket } from 'socket.io-client';
import { SOCKET_BASE_URL } from '@config/socket';
import { useAuthStore } from '@stores/auth-store';
import { authService } from '@services/auth-service';

export interface ReviewCompletedPayload {
  submissionId: string;
  examId: string;
  examTitle: string;
  assessorScore: number | null;
  finalScore: number | null;
  status: string;
}

type ReviewCallback = (payload: ReviewCompletedPayload) => void;

/**
 * React hook that connects to the Socket.IO server and provides
 * real-time assessment review notifications for candidates.
 *
 * - Automatically connects when a CANDIDATE / INDIVIDUAL_CANDIDATE user is logged in
 * - Joins the `candidate:<id>` room on connection
 * - Fires `onReviewCompleted` when an assessor finishes a review
 * - Disconnects on unmount
 */
export function useAssessmentSocket(onReviewCompleted?: ReviewCallback) {
  const socketRef = useRef<Socket | null>(null);
  const user = useAuthStore((s) => s.user);
  const isCandidate = user?.role === 'CANDIDATE' || user?.role === 'INDIVIDUAL_CANDIDATE';

  const handleReviewCompleted = useCallback(
    (payload: ReviewCompletedPayload) => {
      onReviewCompleted?.(payload);
    },
    [onReviewCompleted],
  );

  useEffect(() => {
    if (!isCandidate || !user?.id) return;

    // Sessions persisted before the backend exposed candidateId lack it; fetch
    // the fresh profile once so the socket joins the correct candidate room.
    if (!user.candidateId) {
      authService
        .getCurrentUser()
        .then((fresh) => {
          if (fresh?.id === user.id) useAuthStore.getState().setUser(fresh);
        })
        .catch(() => {
          // Non-fatal: fall back to the user id room below.
        });
    }

    // The server emits review-completed to `candidate:<Candidate.id>`, so join
    // that room (fall back to the user account id for legacy sessions).
    const candidateRoomId = user.candidateId ?? user.id;

    // Connect directly to the backend Socket.IO server (see @config/socket).
    const socket = io(SOCKET_BASE_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    socket.on('connect', () => {
      // Join the candidate's personal notification room
      socket.emit('join-candidate', candidateRoomId);
    });

    socket.on('review-completed', handleReviewCompleted);

    socket.on('connect_error', (err) => {
      console.error('[socket] Connection error:', err.message);
    });

    socketRef.current = socket;

    return () => {
      socket.emit('leave-candidate', candidateRoomId);
      socket.off('review-completed', handleReviewCompleted);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [isCandidate, user?.id, user?.candidateId, handleReviewCompleted]);

  return { socket: socketRef.current };
}

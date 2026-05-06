import { useEffect } from 'react';
import toast from 'react-hot-toast';
import { getSocket, disconnectSocket } from '@/lib/socket';
import { useAuth } from '@/store/auth';

export function useRealtime(handlers: {
  onSubmissionReviewed?: (e: { submission_id: string; status: string; feedback: string; points: number }) => void;
  onSubmissionNew?: (e: { submission_id: string; user_id: string; task_id: string }) => void;
  onEmergencyNew?: (e: { request_id: string; user_id: string }) => void;
  onEmergencyReviewed?: (e: { request_id: string; status: string; response: string }) => void;
  onLeaderboardDirty?: (e: { user_id: string }) => void;
} = {}) {
  const session = useAuth((s) => s.session);
  const fetchProfile = useAuth((s) => s.fetchProfile);

  useEffect(() => {
    if (!session) {
      disconnectSocket();
      return;
    }

    let cancelled = false;

    (async () => {
      const socket = await getSocket();
      if (!socket || cancelled) return;

      socket.on('submission:reviewed', (e) => {
        if (e.status === 'approved') {
          toast.success(`Approved! +${e.points} XP`, { icon: '🚀' });
          fetchProfile();
        } else if (e.status === 'rejected') {
          toast.error(`Rejected: ${e.feedback || 'see feedback'}`);
        }
        handlers.onSubmissionReviewed?.(e);
      });

      socket.on('submission:new', (e) => {
        toast(`New submission to review`, { icon: '📥' });
        handlers.onSubmissionNew?.(e);
      });

      socket.on('emergency:new', (e) => {
        toast('New emergency request', { icon: '⚠️' });
        handlers.onEmergencyNew?.(e);
      });

      socket.on('emergency:reviewed', (e) => {
        if (e.status === 'approved') {
          toast.success('Emergency approved — access restored');
          fetchProfile();
        } else {
          toast.error('Emergency rejected');
        }
        handlers.onEmergencyReviewed?.(e);
      });

      socket.on('leaderboard:dirty', (e) => {
        handlers.onLeaderboardDirty?.(e);
      });
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);
}

import { io, type Socket } from 'socket.io-client';
import { supabase } from './supabase';

const baseURL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1').replace(
  /\/api\/v1\/?$/,
  '',
);

let socket: Socket | null = null;

export async function getSocket(): Promise<Socket | null> {
  if (socket?.connected) return socket;
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return null;

  if (socket) socket.disconnect();
  socket = io(baseURL, {
    path: '/socket.io',
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

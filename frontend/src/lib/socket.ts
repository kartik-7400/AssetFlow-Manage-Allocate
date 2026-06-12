import { io, Socket } from 'socket.io-client'

let socket: Socket | null = null

/**
 * Retrieve the singleton Socket.io client instance.
 * Automatically connects to the serving origin (proxied during local development).
 */
export function getSocket(): Socket {
  if (!socket) {
    const url = import.meta.env.VITE_BACKEND_URL || undefined
    socket = io(url, {
      autoConnect: false,
      transports: ['websocket', 'polling'],
    })
  }
  return socket
}

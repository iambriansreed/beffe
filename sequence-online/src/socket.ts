import { io, Socket } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL ?? '';

let _socket: Socket | null = null;

export function getSocket(): Socket {
    if (!_socket) {
        _socket = io(`${API_URL}/sequence`, {
            transports: ['websocket', 'polling'],
            autoConnect: true,
        });
    }
    return _socket;
}

export function disconnectSocket(): void {
    _socket?.disconnect();
    _socket = null;
}


import { io, Socket } from 'socket.io-client';
import { config } from './config';

const SERVER_URL = config.getServerUrl();

class SocketService {
  public socket: Socket;

  constructor() {
    this.socket = io(SERVER_URL, {
      transports: ['websocket', 'polling'], // Fallback to polling if websocket fails
      autoConnect: false,
      timeout: 10000, // 10 second timeout
      reconnection: true,
      reconnectionAttempts: 10, // More attempts
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000, // Max delay between attempts
    });
  }
}

const socket = new SocketService().socket;
export default socket;

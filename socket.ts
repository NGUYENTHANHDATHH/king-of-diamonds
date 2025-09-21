
import { io, Socket } from 'socket.io-client';
import { config } from './config';

const SERVER_URL = config.getServerUrl();

class SocketService {
  public socket: Socket;

  constructor() {
    this.socket = io(SERVER_URL, {
      transports: ['websocket'],
      autoConnect: false,
    });
  }
}

const socket = new SocketService().socket;
export default socket;

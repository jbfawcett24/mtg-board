import { io } from 'socket.io-client';

const BACKEND_URL = 'http://192.168.1.230:3001';

export const socket = io(BACKEND_URL, { autoConnect: false });

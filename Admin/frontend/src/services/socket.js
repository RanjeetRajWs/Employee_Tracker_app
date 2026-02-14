import { io } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:5000'; // Adjust as needed, maybe from env

export const socket = io(SOCKET_URL, {
  query: {
    type: 'admin',
    clientId: 'admin-dashboard' // You might want to use a real user ID here
  },
  autoConnect: true,
  reconnection: true
});

socket.on('connect', () => {
  console.log('✅ Connected to socket server');
});

socket.on('disconnect', () => {
  console.log('❌ Disconnected from socket server');
});

export const emitMessage = (event, payload, target = 'project4', userId = null) => {
  socket.emit('relay-message', {
    target,
    event,
    payload,
    userId
  });
};

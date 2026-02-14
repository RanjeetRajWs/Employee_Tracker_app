const { Server } = require('socket.io');
const logger = require('../config/logger');
const User = require('../models/user');

let io;
const onlineUsers = new Set();

/**
 * Initialize Socket.io server
 * @param {import('http').Server} httpServer - Node.js HTTP server instance
 */
const initSocketServer = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: "*", // Adjust this for production
      methods: ["GET", "POST"]
    }
  });

  io.on('connection', (socket) => {
    const { type, clientId } = socket.handshake.query;
    socket.clientId = clientId;
    socket.clientType = type;

    logger.info(`🔌 New connection: ${socket.id} (Type: ${type}, ID: ${clientId})`);

    // Join rooms based on client type
    if (type === 'admin') {
      socket.join('admin-room');
      // Send initial online users to the new admin
      socket.emit('initial-online-users', Array.from(onlineUsers));
    } else if (type === 'project4') {
      socket.join('project4-room');
      if (clientId && clientId !== 'electron-app') {
        socket.join(`user-${clientId}`);
        onlineUsers.add(clientId);
        // Broadcast online status
        io.to('admin-room').emit('employee-status-changed', { userId: clientId, status: 'online' });
      } else if (clientId === 'electron-app') {
        // Still allow generic electron app to join its own room if needed
        socket.join('user-electron-app');
      }
    }

    socket.on('get-online-users', () => {
      socket.emit('initial-online-users', Array.from(onlineUsers));
    });

    socket.on('disconnect', async (reason) => {
      logger.info(`🔌 Client disconnected: ${socket.id} (Reason: ${reason})`);
      if (socket.clientType === 'project4') {
        if (socket.clientId && socket.clientId !== 'electron-app') {
          onlineUsers.delete(socket.clientId);
          
          // Update lastActive in database
          try {
            await User.findByIdAndUpdate(socket.clientId, { lastActive: new Date() });
          } catch (err) {
            logger.error(`Error updating lastActive for user ${socket.clientId}: ${err.message}`);
          }

          io.to('admin-room').emit('employee-status-changed', { userId: socket.clientId, status: 'offline' });
        }
      }
    });

    // Custom message handler for relaying messages
    socket.on('relay-message', (data) => {
      const { target, event, payload, userId } = data;
      logger.info(`📨 Relaying message from ${socket.id} to ${target}: ${event} ${userId ? `(User: ${userId})` : ''}`);

      if (target === 'project4') {
        if (userId) {
          io.to(`user-${userId}`).emit(event, payload);
        } else {
          io.to('project4-room').emit(event, payload);
        }
      } else if (target === 'admin') {
        io.to('admin-room').emit(event, { ...payload, userId });
      } else {
        socket.broadcast.emit(event, payload);
      }
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized!");
  }
  return io;
};

module.exports = {
  initSocketServer,
  getIO,
  onlineUsers
};

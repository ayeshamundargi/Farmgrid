let ioInstance = null;

/**
 * Initialize Socket.IO with HTTP Server
 */
function initSocket(io) {
  ioInstance = io;

  io.on('connection', (socket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id}`);

    // Join user-specific notification channel
    socket.on('joinUserRoom', (userId) => {
      if (userId) {
        socket.join(`user-${userId}`);
        console.log(`[Socket.IO] Socket ${socket.id} joined user-${userId}`);
      }
    });

    // Join booking-specific live tracking room
    socket.on('joinTrackingRoom', (bookingId) => {
      if (bookingId) {
        socket.join(`tracking-${bookingId}`);
        console.log(`[Socket.IO] Socket ${socket.id} joined tracking-${bookingId}`);
      }
    });

    socket.on('leaveTrackingRoom', (bookingId) => {
      if (bookingId) {
        socket.leave(`tracking-${bookingId}`);
        console.log(`[Socket.IO] Socket ${socket.id} left tracking-${bookingId}`);
      }
    });

    socket.on('disconnect', () => {
      console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
    });
  });

  return ioInstance;
}

/**
 * Getter for current Socket.IO instance
 */
function getIO() {
  return ioInstance;
}

/**
 * Helper to emit events safely even if socket isn't active
 */
function broadcast(event, data) {
  if (ioInstance) {
    ioInstance.emit(event, data);
  }
}

function sendToUser(userId, event, data) {
  if (ioInstance && userId) {
    ioInstance.to(`user-${userId}`).emit(event, data);
  }
}

function broadcastTracking(bookingId, event, data) {
  if (ioInstance) {
    // Emit to specific tracking room
    if (bookingId) {
      ioInstance.to(`tracking-${bookingId}`).emit(event, data);
    }
    // Also emit broadcast so general dashboards update without refresh
    ioInstance.emit(event, data);
  }
}

module.exports = {
  initSocket,
  getIO,
  broadcast,
  sendToUser,
  broadcastTracking
};


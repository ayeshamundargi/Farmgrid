import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [lastEvent, setLastEvent] = useState(null);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    // Connect to backend socket
    const newSocket = io('/', {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    newSocket.on('connect', () => {
      console.log('[Socket.IO Client] Connected with ID:', newSocket.id);
      if (user && user.id) {
        newSocket.emit('joinUserRoom', user.id);
      }
    });

    newSocket.on('scheduleUpdated', (data) => {
      console.log('[Socket.IO Client] Event: scheduleUpdated', data);
      setLastEvent({ type: 'scheduleUpdated', data, time: new Date() });
      window.dispatchEvent(new CustomEvent('farmgrid_schedule_updated', { detail: data }));
    });

    newSocket.on('conflictDetected', (data) => {
      console.log('[Socket.IO Client] Event: conflictDetected', data);
      setLastEvent({ type: 'conflictDetected', data, time: new Date() });
      window.dispatchEvent(new CustomEvent('farmgrid_conflict_detected', { detail: data }));
    });

    newSocket.on('disruptionCreated', (data) => {
      console.log('[Socket.IO Client] Event: disruptionCreated', data);
      setLastEvent({ type: 'disruptionCreated', data, time: new Date() });
      window.dispatchEvent(new CustomEvent('farmgrid_disruption_created', { detail: data }));
    });

    newSocket.on('bookingReallocated', (data) => {
      console.log('[Socket.IO Client] Event: bookingReallocated', data);
      setLastEvent({ type: 'bookingReallocated', data, time: new Date() });
      window.dispatchEvent(new CustomEvent('farmgrid_booking_reallocated', { detail: data }));
    });

    newSocket.on('resourceStatusChanged', (data) => {
      console.log('[Socket.IO Client] Event: resourceStatusChanged', data);
      setLastEvent({ type: 'resourceStatusChanged', data, time: new Date() });
      window.dispatchEvent(new CustomEvent('farmgrid_resource_status_changed', { detail: data }));
    });

    newSocket.on('tractorLocationUpdated', (data) => {
      console.log('[Socket.IO Client] Event: tractorLocationUpdated', data);
      setLastEvent({ type: 'tractorLocationUpdated', data, time: new Date() });
      window.dispatchEvent(new CustomEvent('farmgrid_tractor_location_updated', { detail: data }));
    });

    newSocket.on('trackingStatusChanged', (data) => {
      console.log('[Socket.IO Client] Event: trackingStatusChanged', data);
      setLastEvent({ type: 'trackingStatusChanged', data, time: new Date() });
      window.dispatchEvent(new CustomEvent('farmgrid_tracking_status_changed', { detail: data }));
    });

    newSocket.on('trackingOtpVerified', (data) => {
      console.log('[Socket.IO Client] Event: trackingOtpVerified', data);
      setLastEvent({ type: 'trackingOtpVerified', data, time: new Date() });
      window.dispatchEvent(new CustomEvent('farmgrid_tracking_otp_verified', { detail: data }));
    });

    newSocket.on('notification', (data) => {
      console.log('[Socket.IO Client] Event: notification', data);
      setNotifications((prev) => [data, ...prev.slice(0, 9)]);
      window.dispatchEvent(new CustomEvent('farmgrid_notification_received', { detail: data }));
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [user]);

  return (
    <SocketContext.Provider value={{ socket, lastEvent, notifications }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}

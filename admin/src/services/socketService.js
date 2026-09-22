import { io } from "socket.io-client";

let socketInstance = null;
let currentUserId = null;
const listeners = new Set();

const getSocketUrl = () => {
  const explicit = import.meta.env.VITE_APP_API_SOCKET_URL;
  if (explicit) {
    if (/\/\/(backend|store|mongo|redis)(:\d+)?$/i.test(explicit)) {
      const apiBase = import.meta.env.VITE_APP_API_BASE_URL;
      if (apiBase) return apiBase.replace(/\/api$/, "");
      return `${window.location.protocol}//${window.location.hostname}:5055`;
    }
    return explicit;
  }
  const apiBase = import.meta.env.VITE_APP_API_BASE_URL;
  if (apiBase) return apiBase.replace(/\/api$/, "");
  return window.location.origin;
};

const createSocket = (userId) => {
  if (socketInstance && currentUserId === userId) {
    return socketInstance;
  }

  if (socketInstance) {
    socketInstance.disconnect();
  }

  const socketUrl = getSocketUrl();
  const socket = io(socketUrl, {
    transports: ["websocket"],
    withCredentials: true,
    auth: { userId },
  });

  socket.on("connect", () => {
    socket.emit("join", `user:${userId}`);
  });

  socket.on("notification.created", (payload) => {
    listeners.forEach((listener) => listener(payload));
  });

  socketInstance = socket;
  currentUserId = userId;
  return socket;
};

const addNotificationListener = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const getSocket = () => socketInstance;

const disconnectSocket = () => {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
    currentUserId = null;
  }
};

export {
  createSocket,
  addNotificationListener,
  getSocket,
  disconnectSocket,
};

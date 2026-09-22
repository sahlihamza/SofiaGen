import { useContext, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { toast } from "react-toastify";
import { notifySuccess, notifyError } from "@/utils/toast";
import { AdminContext } from "@/context/AdminContext";
import NotificationServices from "@/services/NotificationServices";
import NotificationToast from "@/components/notification/NotificationToast";
import { onUnreadCountChange } from "@/utils/notificationBus";

export const showNotificationToast = (notification) => {
  toast(<NotificationToast notification={notification} />, {
    toastId: notification?._id,
    position: "top-right",
    autoClose: 8000,
    closeButton: false,
    hideProgressBar: true,
    icon: false,
    style: {
      background: "transparent",
      boxShadow: "none",
      padding: 0,
      minHeight: 0,
    },
  });
};

const useNotification = () => {
  const { state } = useContext(AdminContext);
  const adminInfo = state?.adminInfo;

  const [socket, setSocket] = useState(null);
  const [updated, setUpdated] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [recentNotifications, setRecentNotifications] = useState([]);
  const socketRef = useRef(null);

  const refreshUnreadCount = async () => {
    try {
      const res = await NotificationServices.getUnreadCount();
      setUnreadCount(res?.unreadCount || 0);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[notifications] refreshUnreadCount failed:", err?.response?.status, err?.response?.data || err?.message);
    }
  };

  const refreshRecent = async () => {
    try {
      const res = await NotificationServices.getMyNotifications({ limit: 5 });
      setRecentNotifications(res?.notifications || []);
      setUnreadCount(res?.unreadCount ?? 0);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[notifications] refreshRecent failed:", err?.response?.status, err?.response?.data || err?.message);
    }
  };

  useEffect(() => {
    if (!adminInfo?._id) return undefined;

    const explicitSocketUrl = import.meta.env.VITE_APP_API_SOCKET_URL;
    let socketUrl = explicitSocketUrl || window.location.origin;
    if (/\/\/(backend|store|mongo|redis)(:\d+)?$/i.test(socketUrl)) {
      const apiBase = import.meta.env.VITE_APP_API_BASE_URL;
      if (apiBase) socketUrl = apiBase.replace(/\/api$/, "");
      const isServiceHost = /^https?:\/\/(backend|store|mongo|redis)(:\d+)?$/i.test(window.location.origin);
      if (!isServiceHost) {
        socketUrl = `${window.location.protocol}//${window.location.hostname}:5055`;
      }
    }
    const socketInstance = io(socketUrl, {
      transports: ["websocket"],
      withCredentials: true,
      auth: { userId: adminInfo._id },
    });
    socketRef.current = socketInstance;
    setSocket(socketInstance);

    let isIntentionalDisconnect = false;

    socketInstance.on("connect", () => {
      // eslint-disable-next-line no-console
      console.info("[notifications] socket connected, joining room", `user:${adminInfo._id}`);
      socketInstance.emit("join", `user:${adminInfo._id}`);
    });

    socketInstance.on("connect_error", (err) => {
      // eslint-disable-next-line no-console
      console.error("[notifications] socket connect_error:", err.message, " url:", socketUrl);
    });

    socketInstance.on("disconnect", (reason) => {
      if (!isIntentionalDisconnect) {
        // eslint-disable-next-line no-console
        console.warn("[notifications] socket disconnected:", reason);
      }
    });

    socketInstance.on("notification.created", (payload) => {
      // eslint-disable-next-line no-console
      console.info("[notifications] notification.created received:", payload);
      setUnreadCount(payload?.unreadCount ?? ((c) => c + 1));
      setUpdated((u) => !u);
      refreshRecent();

      if (payload?.notification) {
        showNotificationToast(payload.notification);
      }
    });

    refreshUnreadCount();
    refreshRecent();

    return () => {
      isIntentionalDisconnect = true;
      socketInstance.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminInfo?._id]);

  useEffect(() => {
    if (!import.meta.env.DEV) return undefined;
    window.__testNotifToast = () =>
      showNotificationToast({
        _id: `test-${Date.now()}`,
        type: "order.created",
        title: "Test notification",
        message: "If you can read this, toast rendering works.",
        priority: "normal",
        actionUrl: "/notifications",
      });
    return () => {
      delete window.__testNotifToast;
    };
  }, []);

  useEffect(() => {
    return onUnreadCountChange(({ detail }) => {
      if (detail?.reset) {
        setUnreadCount(0);
        return;
      }
      setUnreadCount((c) => Math.max(0, c + (detail?.delta || 0)));
    });
  }, []);

  return {
    socket,
    updated,
    setUpdated,
    unreadCount,
    recentNotifications,
    refreshUnreadCount,
    refreshRecent,
    successMessage: notifySuccess,
    errorMessage: notifyError,
  };
};

export default useNotification;

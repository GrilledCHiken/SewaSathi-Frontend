import { useCallback, useEffect, useRef, useState } from "react";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { getToken } from "../api/tokenStorage";
import useDesktopNotifications from "./useDesktopNotifications";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../api/notificationApi";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";
const WS_BASE = API_BASE.replace(/\/api\/?$/, "") + "/ws";

/**
 * Notification feed: REST for history, STOMP for anything arriving while the page is open.
 *
 * Subscribes to `/user/queue/notifications` rather than a topic keyed by user id. Spring
 * resolves the `/user` prefix against the authenticated STOMP session, so the server decides
 * whose stream this is — the client cannot ask for someone else's by changing an id.
 */
export default function useNotifications(enabled = true) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(enabled);
  const clientRef = useRef(null);
  /** Ids already mirrored to the desktop, so a reconnect does not re-announce them. */
  const announcedIds = useRef(new Set());

  const { notify } = useDesktopNotifications();
  // Held in a ref so the socket effect does not tear down and reconnect every time the
  // notify callback identity changes.
  const notifyRef = useRef(notify);
  useEffect(() => {
    notifyRef.current = notify;
  }, [notify]);

  const refresh = useCallback(async () => {
    try {
      setNotifications(await listNotifications(20));
    } catch {
      // A failed poll is not worth interrupting the user for; the socket or the next
      // refresh will catch up.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return undefined;

    // Loaded inside the effect with a cancellation guard: the request can outlive the
    // component, and a late write would clobber the next mount's data.
    let cancelled = false;
    (async () => {
      try {
        const data = await listNotifications(20);
        if (!cancelled) setNotifications(data);
      } catch {
        // A failed initial load is not worth interrupting the user for.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    const client = new Client({
      webSocketFactory: () => new SockJS(WS_BASE),
      connectHeaders: { Authorization: `Bearer ${getToken()}` },
      reconnectDelay: 4000,
      onConnect: () => {
        client.subscribe("/user/queue/notifications", (frame) => {
          const incoming = JSON.parse(frame.body);

          // Deduplicated against a ref, not inside the setState updater: React may run an
          // updater twice, which would fire the desktop notification twice.
          if (announcedIds.current.has(incoming.id)) return;
          announcedIds.current.add(incoming.id);

          // Mirror to the desktop when the user has opted in and the tab is not in front
          // of them.
          notifyRef.current?.({
            title: incoming.title,
            body: incoming.body,
            link: incoming.link,
          });

          setNotifications((prev) =>
            // The socket and a racing refresh can both deliver the same item.
            prev.some((n) => n.id === incoming.id) ? prev : [incoming, ...prev].slice(0, 20),
          );
        });
      },
    });
    client.activate();
    clientRef.current = client;

    return () => {
      cancelled = true;
      client.deactivate();
      clientRef.current = null;
    };
  }, [enabled]);

  const markRead = useCallback(async (id) => {
    // Update locally first so the badge responds immediately, then persist.
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    try {
      await markNotificationRead(id);
    } catch {
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: false } : n)));
    }
  }, []);

  const markAllRead = useCallback(async () => {
    const previous = notifications;
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await markAllNotificationsRead();
    } catch {
      setNotifications(previous);
    }
  }, [notifications]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return { notifications, unreadCount, loading, markRead, markAllRead, refresh };
}

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { getToken } from "../api/tokenStorage";
import {
  getChatUnreadCounts,
  markConversationRead as markConversationReadRequest,
} from "../api/messageApi";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";
const WS_BASE = API_BASE.replace(/\/api\/?$/, "") + "/ws";

const EMPTY_UNREAD = {};

/**
 * Owns the one chat socket for the whole dashboard, plus the unread counts every badge in the
 * app reads from.
 *
 * <p>The connection lives here rather than in the messages page so the Messages nav badge
 * moves from anywhere in the app.
 *
 * <p>Two streams arrive: `/topic/conversations/{key}` for the thread on screen, subscribed by
 * the page, and `/user/queue/chat` for everything addressed to this user, subscribed here.
 * Spring resolves the `/user` prefix against the authenticated STOMP session, so the server
 * decides whose stream this is — the client cannot ask for someone else's.
 */
const ChatContext = createContext(null);

export function ChatProvider({ children }) {
  const clientRef = useRef(null);
  const onConnectCallbacksRef = useRef([]);
  const [connected, setConnected] = useState(false);
  const [unreadByKey, setUnreadByKey] = useState(EMPTY_UNREAD);
  const personalListenersRef = useRef(new Set());

  // The socket handler is built once, on connect, so anything it needs is held in a ref
  // rather than closed over — otherwise the subscription would have to be torn down and
  // rebuilt on every render.
  const activeKeyRef = useRef(null);
  const markReadRef = useRef(null);
  const refreshRef = useRef(null);

  const refreshUnread = useCallback(async () => {
    try {
      const summary = await getChatUnreadCounts();
      setUnreadByKey(summary?.byConversation || EMPTY_UNREAD);
    } catch {
      // A failed count is not worth interrupting the user for — the next open of a thread
      // or the next reload catches up.
    }
  }, []);

  /**
   * Called when a thread is opened, and again as messages land in it. Always hits the server
   * even when this client thinks there is nothing unread: the POST is what flips the *other*
   * side's "Seen" ticks, and that has to happen whether or not a badge was showing here.
   */
  const markConversationRead = useCallback(async (conversationKey) => {
    if (!conversationKey) return;
    setUnreadByKey((prev) => (prev[conversationKey] ? { ...prev, [conversationKey]: 0 } : prev));
    try {
      await markConversationReadRequest(conversationKey);
    } catch {
      refreshRef.current?.();
    }
  }, []);

  /** Lets the provider tell "arrived in the thread you are reading" from "arrived elsewhere". */
  const setActiveConversation = useCallback((conversationKey) => {
    activeKeyRef.current = conversationKey;
    if (conversationKey) {
      setUnreadByKey((prev) => (prev[conversationKey] ? { ...prev, [conversationKey]: 0 } : prev));
    }
  }, []);

  useEffect(() => {
    markReadRef.current = markConversationRead;
    refreshRef.current = refreshUnread;
  }, [markConversationRead, refreshUnread]);

  useEffect(() => {
    // Fetched inside the effect with a cancellation guard: the request can outlive the
    // component, and a late write would clobber the next mount's data.
    let cancelled = false;
    (async () => {
      try {
        const summary = await getChatUnreadCounts();
        if (!cancelled) setUnreadByKey(summary?.byConversation || EMPTY_UNREAD);
      } catch {
        // Badges start empty; the socket and the next navigation fill them in.
      }
    })();

    const handlePersonalEvent = (event) => {
      personalListenersRef.current.forEach((listener) => listener(event));

      if (event.type === "READ") {
        // Our own read, from another tab.
        setUnreadByKey((prev) =>
          prev[event.conversationKey] ? { ...prev, [event.conversationKey]: 0 } : prev,
        );
        return;
      }
      if (event.type !== "MESSAGE") return;

      // A tombstone lowers the count, and the event does not say whether we had counted that
      // message — refetching is cheaper than tracking deltas for a rare case.
      if (event.message?.deleted) {
        refreshRef.current?.();
        return;
      }

      // Arriving in the thread on screen, with the window in front of the user, is read on
      // sight. Unfocused, it still counts — they have not actually seen it.
      if (event.conversationKey === activeKeyRef.current && document.hasFocus()) {
        markReadRef.current?.(event.conversationKey);
        return;
      }
      setUnreadByKey((prev) => ({
        ...prev,
        [event.conversationKey]: (prev[event.conversationKey] || 0) + 1,
      }));
    };

    const client = new Client({
      webSocketFactory: () => new SockJS(WS_BASE),
      connectHeaders: { Authorization: `Bearer ${getToken()}` },
      reconnectDelay: 4000,
      onConnect: () => {
        setConnected(true);
        client.subscribe("/user/queue/chat", (frame) => {
          handlePersonalEvent(JSON.parse(frame.body));
        });
        // A reconnect can have missed messages, so the counts are re-seeded rather than
        // carried over from before the drop.
        refreshRef.current?.();
        onConnectCallbacksRef.current.forEach((cb) => cb());
      },
      onDisconnect: () => setConnected(false),
      onStompError: () => setConnected(false),
      onWebSocketClose: () => setConnected(false),
    });
    client.activate();
    clientRef.current = client;

    return () => {
      cancelled = true;
      client.deactivate();
      clientRef.current = null;
      setConnected(false);
    };
  }, []);

  const subscribeToConversation = useCallback((conversationKey, onEvent) => {
    const client = clientRef.current;
    if (!client) return () => {};

    let subscription = null;
    const doSubscribe = () => {
      subscription = client.subscribe(`/topic/conversations/${conversationKey}`, (frame) => {
        onEvent(JSON.parse(frame.body));
      });
    };

    if (client.connected) {
      doSubscribe();
    } else {
      onConnectCallbacksRef.current.push(doSubscribe);
    }

    return () => {
      subscription?.unsubscribe();
      onConnectCallbacksRef.current = onConnectCallbacksRef.current.filter(
        (cb) => cb !== doSubscribe,
      );
    };
  }, []);

  /**
   * Everything addressed to this user, whichever thread it belongs to. The messages page uses
   * it to keep previews and ordering current for conversations it is not subscribed to.
   */
  const onChatEvent = useCallback((listener) => {
    const listeners = personalListenersRef.current;
    listeners.add(listener);
    return () => listeners.delete(listener);
  }, []);

  const sendMessage = useCallback((conversationKey, content) => {
    const client = clientRef.current;
    if (!client || !client.connected) return false;
    client.publish({
      destination: `/app/conversations/${conversationKey}/send`,
      body: JSON.stringify({ content }),
    });
    return true;
  }, []);

  const totalUnread = useMemo(
    () => Object.values(unreadByKey).reduce((sum, n) => sum + n, 0),
    [unreadByKey],
  );

  const value = useMemo(
    () => ({
      connected,
      subscribeToConversation,
      sendMessage,
      unreadByKey,
      totalUnread,
      onChatEvent,
      markConversationRead,
      setActiveConversation,
      refreshUnread,
    }),
    [
      connected,
      subscribeToConversation,
      sendMessage,
      unreadByKey,
      totalUnread,
      onChatEvent,
      markConversationRead,
      setActiveConversation,
      refreshUnread,
    ],
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

/**
 * Returns null outside a ChatProvider. The sidebars are shared with the admin panel, which has
 * no chat, so callers that only want a badge can treat null as "no unread".
 */
// eslint-disable-next-line react-refresh/only-export-components -- hook colocated with provider
export function useChat() {
  return useContext(ChatContext);
}

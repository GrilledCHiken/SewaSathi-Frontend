import { useEffect, useRef, useState } from "react";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { getToken } from "../api/tokenStorage";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";
const WS_BASE = API_BASE.replace(/\/api\/?$/, "") + "/ws";

export default function useChatSocket() {
  const clientRef = useRef(null);
  const onConnectCallbacksRef = useRef([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const client = new Client({
      webSocketFactory: () => new SockJS(WS_BASE),
      connectHeaders: { Authorization: `Bearer ${getToken()}` },
      reconnectDelay: 4000,
      onConnect: () => {
        setConnected(true);
        onConnectCallbacksRef.current.forEach((cb) => cb());
      },
      onDisconnect: () => setConnected(false),
      onStompError: () => setConnected(false),
      onWebSocketClose: () => setConnected(false),
    });
    client.activate();
    clientRef.current = client;

    return () => {
      client.deactivate();
      clientRef.current = null;
    };
  }, []);

  const subscribeToTask = (taskId, onMessage) => {
    const client = clientRef.current;
    if (!client) return () => {};

    let subscription = null;
    const doSubscribe = () => {
      subscription = client.subscribe(`/topic/tasks/${taskId}`, (frame) => {
        onMessage(JSON.parse(frame.body));
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
  };

  const sendMessage = (taskId, content) => {
    const client = clientRef.current;
    if (!client || !client.connected) return false;
    client.publish({
      destination: `/app/tasks/${taskId}/send`,
      body: JSON.stringify({ content }),
    });
    return true;
  };

  return { connected, subscribeToTask, sendMessage };
}

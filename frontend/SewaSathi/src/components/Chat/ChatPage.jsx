import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../../context/AuthContext";
import useChatSocket from "../../hooks/useChatSocket";
import { getMessageHistory, listConversations, uploadAttachment } from "../../api/messageApi";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";
const API_ORIGIN = API_BASE.replace(/\/api\/?$/, "");

const AVATAR_PALETTE = [
  { bg: "bg-sky-100", text: "text-sky-700" },
  { bg: "bg-emerald-100", text: "text-emerald-700" },
  { bg: "bg-amber-100", text: "text-amber-700" },
  { bg: "bg-rose-100", text: "text-rose-700" },
  { bg: "bg-violet-100", text: "text-violet-700" },
  { bg: "bg-cyan-100", text: "text-cyan-700" },
];

const EMPTY_MESSAGES = [];

const ALLOWED_ATTACHMENT_TYPES =
  "image/jpeg,image/png,image/gif,image/webp,application/pdf,application/msword,.docx,text/plain";

function initialsOf(name) {
  return (name || "?")
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function paletteFor(id) {
  return AVATAR_PALETTE[Math.abs(id ?? 0) % AVATAR_PALETTE.length];
}

function formatTime(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDateLabel(dateStr) {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function groupByDate(messages) {
  const groups = [];
  for (const msg of messages) {
    const label = formatDateLabel(msg.createdAt);
    const lastGroup = groups.at(-1);
    if (lastGroup && lastGroup.label === label) {
      lastGroup.items.push(msg);
    } else {
      groups.push({ label, items: [msg] });
    }
  }
  return groups;
}

function ConversationItem({ conversation, active, onSelect }) {
  const palette = paletteFor(conversation.otherParty?.id);
  const initials = initialsOf(conversation.otherParty?.fullName);
  const lastMessage = conversation.lastMessage;
  const preview = lastMessage
    ? lastMessage.content || (lastMessage.attachmentName ? `📎 ${lastMessage.attachmentName}` : "")
    : "No messages yet";

  return (
    <button
      type="button"
      onClick={() => onSelect(conversation.taskId)}
      className={[
        "flex w-full gap-3 rounded-xl px-3 py-3 text-left transition",
        active ? "bg-brand/10" : "hover:bg-slate-50",
      ].join(" ")}
    >
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold ${palette.bg} ${palette.text}`}
      >
        {initials}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate font-semibold text-slate-900">
            {conversation.otherParty?.fullName}
          </span>
          {lastMessage && (
            <span className="shrink-0 text-xs text-slate-500">
              {formatTime(lastMessage.createdAt)}
            </span>
          )}
        </div>
        <p className="truncate text-xs text-slate-500">
          {conversation.category} · {conversation.taskTitle}
        </p>
        <p className="mt-0.5 truncate text-sm text-slate-600">{preview}</p>
      </div>
    </button>
  );
}

function AttachmentBubble({ message }) {
  const isImage = message.attachmentType?.startsWith("image/");
  const url = `${API_ORIGIN}${message.attachmentUrl}`;

  if (isImage) {
    return (
      <a href={url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-xl">
        <img src={url} alt={message.attachmentName || "attachment"} className="max-h-64 w-full object-cover" />
      </a>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
    >
      <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
      </svg>
      <span className="truncate">{message.attachmentName || "Attachment"}</span>
    </a>
  );
}

function MessageBubble({ message, isSelf, otherInitials, otherPalette, selfInitials }) {
  return (
    <div className={["flex gap-2", isSelf ? "flex-row-reverse" : "flex-row"].join(" ")}>
      <span
        className={[
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold",
          isSelf ? "bg-brand text-white" : `${otherPalette.bg} ${otherPalette.text}`,
        ].join(" ")}
      >
        {isSelf ? selfInitials : otherInitials}
      </span>
      <div
        className={[
          "max-w-[85%] rounded-2xl px-4 py-2.5 sm:max-w-[75%]",
          isSelf
            ? "rounded-tr-sm bg-slate-200 text-slate-900"
            : "rounded-tl-sm border border-slate-200 bg-white text-slate-900",
        ].join(" ")}
      >
        {message.attachmentUrl && <AttachmentBubble message={message} />}
        {message.content && (
          <p className={`text-sm leading-relaxed ${message.attachmentUrl ? "mt-2" : ""}`}>
            {message.content}
          </p>
        )}
        <p className="mt-1 text-right text-xs text-slate-500">{formatTime(message.createdAt)}</p>
      </div>
    </div>
  );
}

export default function ChatPage({ renderHeader }) {
  const { user } = useAuth();
  const { connected, subscribeToTask, sendMessage } = useChatSocket();
  // Task pages link here as /messages?taskId=123 to open that task's thread.
  const [searchParams] = useSearchParams();
  const requestedTaskId = Number(searchParams.get("taskId")) || null;

  const [conversations, setConversations] = useState([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  // Messages are stored with the task they belong to, so switching conversations
  // swaps the thread during render instead of flashing the previous one.
  const [thread, setThread] = useState({ taskId: null, items: EMPTY_MESSAGES });
  const [convSearch, setConvSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const scrollRef = useRef(null);
  const stickToBottomRef = useRef(true);

  useEffect(() => {
    listConversations()
      .then((data) => {
        setConversations(data);
        if (data.length === 0) return;
        const requested = data.find((c) => c.taskId === requestedTaskId);
        setSelectedTaskId(requested ? requested.taskId : data[0].taskId);
        if (requested) setMobileShowChat(true);
      })
      .catch(() => toast.error("Could not load your conversations."))
      .finally(() => setLoadingConversations(false));
  }, [requestedTaskId]);

  useEffect(() => {
    if (!selectedTaskId) return undefined;
    let stale = false;
    getMessageHistory(selectedTaskId)
      .then((items) => {
        if (!stale) setThread({ taskId: selectedTaskId, items });
      })
      .catch(() => {
        if (stale) return;
        toast.error("Could not load this conversation.");
        setThread({ taskId: selectedTaskId, items: EMPTY_MESSAGES });
      });

    const unsubscribe = subscribeToTask(selectedTaskId, (incoming) => {
      setThread((prev) => {
        if (prev.taskId !== incoming.taskId || prev.items.some((m) => m.id === incoming.id)) {
          return prev;
        }
        return { taskId: prev.taskId, items: [...prev.items, incoming] };
      });
      setConversations((prev) => {
        const idx = prev.findIndex((c) => c.taskId === incoming.taskId);
        if (idx === -1) return prev;
        const updated = { ...prev[idx], lastMessage: incoming };
        const rest = prev.filter((_, i) => i !== idx);
        return [updated, ...rest];
      });
    });

    return () => {
      stale = true;
      unsubscribe?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTaskId]);

  const threadLoaded = thread.taskId === selectedTaskId;
  const messages = threadLoaded ? thread.items : EMPTY_MESSAGES;
  const loadingMessages = !threadLoaded;

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || loadingMessages || !stickToBottomRef.current) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, loadingMessages]);

  const handleMessagesScroll = (e) => {
    const el = e.currentTarget;
    stickToBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  };

  const filteredConversations = useMemo(() => {
    const q = convSearch.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter(
      (c) =>
        c.otherParty?.fullName?.toLowerCase().includes(q) ||
        c.taskTitle?.toLowerCase().includes(q),
    );
  }, [conversations, convSearch]);

  const activeConversation = conversations.find((c) => c.taskId === selectedTaskId);
  const otherPalette = paletteFor(activeConversation?.otherParty?.id);
  const otherInitials = initialsOf(activeConversation?.otherParty?.fullName);
  const selfInitials = initialsOf(user?.fullName);

  const handleSelectConversation = (taskId) => {
    stickToBottomRef.current = true;
    setSelectedTaskId(taskId);
    setMobileShowChat(true);
  };

  const handleSend = () => {
    const text = draft.trim();
    if (!text || !selectedTaskId) return;
    stickToBottomRef.current = true;
    const sent = sendMessage(selectedTaskId, text);
    if (!sent) {
      toast.error("Not connected. Please wait a moment and try again.");
      return;
    }
    setDraft("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleAttachClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !selectedTaskId) return;
    setUploading(true);
    try {
      await uploadAttachment(selectedTaskId, file);
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not send attachment.");
    } finally {
      setUploading(false);
    }
  };

  const messageGroups = useMemo(() => groupByDate(messages), [messages]);

  return (
    <div className="flex h-svh flex-col overflow-hidden">
      {renderHeader?.()}

      <main className="flex min-h-0 flex-1 flex-col px-4 py-4 sm:px-6 lg:px-8">
        <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {/* Conversation list */}
          <aside
            className={[
              "flex min-h-0 w-full flex-col border-r border-slate-200 lg:w-[340px] lg:shrink-0",
              mobileShowChat ? "hidden lg:flex" : "flex",
            ].join(" ")}
          >
            <div className="border-b border-slate-200 px-4 py-4">
              <h2 className="text-lg font-bold text-slate-900">Messages</h2>
              <div className="relative mt-3">
                <svg
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="search"
                  value={convSearch}
                  onChange={(e) => setConvSearch(e.target.value)}
                  placeholder="Search conversations..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-10 pr-3 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                  aria-label="Search conversations"
                />
              </div>
            </div>

            <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
              {loadingConversations ? (
                <li className="px-3 py-6 text-center text-sm text-slate-500">Loading...</li>
              ) : filteredConversations.length === 0 ? (
                <li className="px-3 py-6 text-center text-sm text-slate-500">
                  No conversations yet. Messaging opens once a worker is assigned to a task.
                </li>
              ) : (
                filteredConversations.map((conv) => (
                  <li key={conv.taskId}>
                    <ConversationItem
                      conversation={conv}
                      active={conv.taskId === selectedTaskId}
                      onSelect={handleSelectConversation}
                    />
                  </li>
                ))
              )}
            </ul>
          </aside>

          {/* Chat panel */}
          <section
            className={[
              "flex min-h-0 min-w-0 flex-1 flex-col",
              mobileShowChat ? "flex" : "hidden lg:flex",
            ].join(" ")}
          >
            {!activeConversation ? (
              <div className="flex flex-1 items-center justify-center px-6 text-center text-sm text-slate-500">
                Select a conversation to start chatting.
              </div>
            ) : (
              <>
                {/* Chat header */}
                <div className="flex shrink-0 items-center gap-3 border-b border-slate-200 px-4 py-3">
                  <button
                    type="button"
                    className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
                    aria-label="Back to conversations"
                    onClick={() => setMobileShowChat(false)}
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>

                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${otherPalette.bg} ${otherPalette.text}`}
                  >
                    {otherInitials}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-900">
                      {activeConversation.otherParty?.fullName}
                    </p>
                    <p className="flex items-center gap-1.5 text-xs text-slate-500">
                      <span className={`h-2 w-2 rounded-full ${connected ? "bg-emerald-500" : "bg-slate-300"}`} />
                      {connected ? "Connected" : "Connecting..."} · {activeConversation.taskTitle}
                    </p>
                  </div>
                </div>

                {/* Messages */}
                <div
                  ref={scrollRef}
                  onScroll={handleMessagesScroll}
                  className="min-h-0 flex-1 overflow-y-auto bg-slate-50/80 px-4 py-4"
                >
                  {loadingMessages ? (
                    <p className="text-center text-sm text-slate-500">Loading messages...</p>
                  ) : (
                    <div className="space-y-6">
                      {messageGroups.map((group) => (
                        <div key={group.label}>
                          <div className="mb-4 flex justify-center">
                            <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-500 shadow-sm ring-1 ring-slate-200/80">
                              {group.label}
                            </span>
                          </div>
                          <div className="space-y-4">
                            {group.items.map((msg) => (
                              <MessageBubble
                                key={msg.id}
                                message={msg}
                                isSelf={msg.sender?.id === user?.id}
                                otherInitials={otherInitials}
                                otherPalette={otherPalette}
                                selfInitials={selfInitials}
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Input */}
                <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-3">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <textarea
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Type a message..."
                        rows={1}
                        className="h-11 w-full resize-none overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-4 pr-10 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                        aria-label="Message input"
                      />
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept={ALLOWED_ATTACHMENT_TYPES}
                        className="hidden"
                        onChange={handleFileChange}
                      />
                      <button
                        type="button"
                        onClick={handleAttachClick}
                        disabled={uploading}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label="Attach file"
                      >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                        </svg>
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={handleSend}
                      disabled={!connected}
                      className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="m22 2-7 20-4-9-9-4 20-2z" />
                        <path d="M22 2 11 13" />
                      </svg>
                      <span className="hidden sm:inline">Send</span>
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-slate-400">
                    {uploading ? "Sending attachment..." : "Press Enter to send, Shift + Enter for new line"}
                  </p>
                </div>
              </>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

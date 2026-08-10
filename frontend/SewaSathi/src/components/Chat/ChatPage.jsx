import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../../context/AuthContext";
import { useChat } from "../../context/ChatContext";
import { useBodyScrollLock } from "../../hooks/useBodyScrollLock";
import AuthedImage from "../AuthedImage";
import DocumentViewerModal from "../DocumentViewerModal";
import { downloadFile } from "../../api/fileApi";
import {
  deleteMessage,
  getMessageHistory,
  listConversations,
  uploadAttachment,
} from "../../api/messageApi";
import { ADVANCE_PERCENT_LABEL } from "../tasks/taskUi";

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

// A thread covers every task shared with one person, so the timeline carries both
// date separators and — when there is more than one job — task separators.
function buildTimeline(messages, showTaskChips) {
  const items = [];
  let lastDateLabel = null;
  let lastTaskId = null;

  for (const msg of messages) {
    const label = formatDateLabel(msg.createdAt);
    if (label !== lastDateLabel) {
      items.push({ kind: "date", key: `date-${msg.id}`, label });
      lastDateLabel = label;
    }
    if (showTaskChips && msg.taskId !== lastTaskId) {
      items.push({ kind: "task", key: `task-${msg.id}`, title: msg.taskTitle });
      lastTaskId = msg.taskId;
    }
    items.push({ kind: "message", key: `msg-${msg.id}`, message: msg });
  }
  return items;
}

function previewOf(lastMessage) {
  if (!lastMessage) return "No messages yet";
  if (lastMessage.deleted) return "This message was deleted";
  if (lastMessage.content) return lastMessage.content;
  return lastMessage.attachmentName ? `📎 ${lastMessage.attachmentName}` : "";
}

function ConversationItem({ conversation, active, unread, onSelect }) {
  const palette = paletteFor(conversation.otherParty?.id);
  const initials = initialsOf(conversation.otherParty?.fullName);
  const lastMessage = conversation.lastMessage;
  const preview = previewOf(lastMessage);
  const hasUnread = unread > 0;

  return (
    <button
      type="button"
      onClick={() => onSelect(conversation.conversationKey)}
      className={[
        "flex w-full gap-3 rounded-xl px-3 py-3 text-left transition",
        active ? "bg-brand/10" : "hover:bg-surface-muted",
      ].join(" ")}
    >
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold ${palette.bg} ${palette.text}`}
      >
        {initials}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate font-semibold text-ink">
            {conversation.otherParty?.fullName}
          </span>
          {lastMessage && (
            <span
              className={[
                "shrink-0 text-xs",
                hasUnread ? "font-semibold text-brand-dark" : "text-ink-muted",
              ].join(" ")}
            >
              {formatTime(lastMessage.createdAt)}
            </span>
          )}
        </div>
        <p className="truncate text-xs text-ink-muted">
          {conversation.latestCategory} · {conversation.latestTaskTitle}
          {conversation.taskCount > 1 && ` · ${conversation.taskCount} jobs`}
        </p>
        {/* The preview shares its row with the count so an unread thread reads as one
            unit — darker, heavier text next to the number saying how much of it is new. */}
        <div className="mt-0.5 flex items-center justify-between gap-2">
          <p
            className={[
              "truncate text-sm",
              lastMessage?.deleted
                ? "italic text-ink-faint"
                : hasUnread
                  ? "font-semibold text-ink"
                  : "text-ink-muted",
            ].join(" ")}
          >
            {preview}
          </p>
          {hasUnread && (
            <span
              className="flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white"
              aria-label={`${unread} unread ${unread === 1 ? "message" : "messages"}`}
            >
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

/**
 * Attachments come from the authenticated /api/files endpoint, so they are fetched through the
 * axios client — a bare href would arrive without a token and come back 401. Images open in
 * the viewer; everything else downloads.
 */
function AttachmentBubble({ message }) {
  const isImage = message.attachmentType?.startsWith("image/");
  const [viewing, setViewing] = useState(false);

  if (isImage) {
    return (
      <>
        <button
          type="button"
          onClick={() => setViewing(true)}
          className="block overflow-hidden rounded-xl"
          title="View image"
        >
          <AuthedImage
            storedUrl={message.attachmentUrl}
            alt={message.attachmentName || "attachment"}
            className="max-h-64 w-full object-cover"
          />
        </button>
        {viewing && (
          <DocumentViewerModal
            storedUrl={message.attachmentUrl}
            title={message.attachmentName || "Attachment"}
            onClose={() => setViewing(false)}
          />
        )}
      </>
    );
  }

  return (
    <button
      type="button"
      onClick={() => downloadFile(message.attachmentUrl, message.attachmentName)}
      className="flex items-center gap-2 rounded-xl border border-line bg-surface-muted px-3 py-2 text-sm font-medium text-ink-body hover:bg-surface-sunken"
    >
      <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
      </svg>
      <span className="truncate">{message.attachmentName || "Attachment"}</span>
    </button>
  );
}

/**
 * Shown under your own bubbles only. Nothing here acknowledges delivery, so the two honest
 * states are "the server stored it" and "they opened the thread" — Sent and Seen.
 */
function ReadReceipt({ readAt }) {
  const seen = Boolean(readAt);
  return (
    <span
      className={seen ? "text-white" : "text-white/70"}
      title={seen ? `Seen at ${formatTime(readAt)}` : "Sent"}
    >
      <span className="sr-only">{seen ? "Seen" : "Sent"}</span>
      <svg
        className="h-3.5 w-4"
        viewBox="0 0 20 14"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {seen ? (
          <>
            <path d="M1 7.5 4.5 11 11 3" />
            <path d="M7.5 7.5 11 11 18 3" />
          </>
        ) : (
          <path d="M4 7.5 8 11 15.5 3" />
        )}
      </svg>
    </span>
  );
}

function MessageBubble({ message, isSelf, otherInitials, otherPalette, selfInitials, onDelete }) {
  const [confirming, setConfirming] = useState(false);
  // You can only take back your own messages, and only once.
  const canDelete = isSelf && !message.deleted;

  return (
    <div className={["group flex gap-2", isSelf ? "flex-row-reverse" : "flex-row"].join(" ")}>
      <span
        className={[
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold",
          isSelf ? "bg-brand text-white" : `${otherPalette.bg} ${otherPalette.text}`,
        ].join(" ")}
      >
        {isSelf ? selfInitials : otherInitials}
      </span>
      {/* Sent messages sit in the brand colour and received ones on a white
          card, so the two sides are distinguishable at a glance rather than by
          alignment alone — which is all a reader has when the thread is long. */}
      <div
        className={[
          "max-w-[85%] rounded-card px-4 py-2.5 shadow-e1 sm:max-w-[75%]",
          message.deleted
            ? "border border-dashed border-line bg-surface-sunken shadow-none"
            : isSelf
              ? "rounded-tr-sm bg-brand text-white"
              : "rounded-tl-sm border border-line bg-surface text-ink",
        ].join(" ")}
      >
        {message.deleted ? (
          <p className="text-sm italic leading-relaxed text-ink-faint">This message was deleted</p>
        ) : (
          <>
            {message.attachmentUrl && <AttachmentBubble message={message} />}
            {message.content && (
              <p className={`text-sm leading-relaxed ${message.attachmentUrl ? "mt-2" : ""}`}>
                {message.content}
              </p>
            )}
          </>
        )}
        <p
          className={[
            "mt-1 flex items-center justify-end gap-1 text-xs",
            isSelf && !message.deleted ? "text-white/70" : "text-ink-muted",
          ].join(" ")}
        >
          <span>{formatTime(message.createdAt)}</span>
          {isSelf && !message.deleted && <ReadReceipt readAt={message.readAt} />}
        </p>
      </div>

      {canDelete && (
        <span className="flex items-center">
          {confirming ? (
            <span className="flex items-center gap-2 rounded-lg border border-line bg-surface px-2 py-1 text-xs shadow-e1">
              <button
                type="button"
                onClick={() => {
                  setConfirming(false);
                  onDelete(message.id);
                }}
                className="font-semibold text-rose-600 hover:underline"
              >
                Delete
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="text-ink-muted hover:underline"
              >
                Cancel
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="rounded-lg p-1.5 text-ink-faint transition hover:bg-line hover:text-rose-600 focus:opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
              aria-label="Delete message"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0 1 16.138 21H7.862a2 2 0 0 1-1.995-1.858L5 7m5 4v6m4-6v6M4 7h16m-5 0V5a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v2" />
              </svg>
            </button>
          )}
        </span>
      )}
    </div>
  );
}

export default function ChatPage({ renderHeader }) {
  // A fixed full-viewport shell: only the thread and conversation list scroll. Without this
  // the document stays a live scroll container and focusing the composer hides the header.
  useBodyScrollLock();

  const { user } = useAuth();
  const {
    connected,
    subscribeToConversation,
    sendMessage,
    unreadByKey,
    onChatEvent,
    markConversationRead,
    setActiveConversation,
  } = useChat();
  // Task pages link here as /messages?taskId=123 to open the thread with that task's other
  // party; the thread spans every task shared with them.
  const [searchParams] = useSearchParams();
  const requestedTaskId = Number(searchParams.get("taskId")) || null;

  const [conversations, setConversations] = useState([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [selectedKey, setSelectedKey] = useState(null);
  // Messages are stored with the conversation they belong to, so switching
  // conversations swaps the thread during render instead of flashing the previous one.
  const [thread, setThread] = useState({ key: null, items: EMPTY_MESSAGES });
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
        const requested = data.find((c) => c.taskIds?.includes(requestedTaskId));
        setSelectedKey(requested ? requested.conversationKey : data[0].conversationKey);
        if (requested) setMobileShowChat(true);
      })
      .catch(() => toast.error("Could not load your conversations."))
      .finally(() => setLoadingConversations(false));
  }, [requestedTaskId]);

  // Handles both new messages and updates to existing ones (a delete arrives as
  // the same message flagged as deleted), from the socket or our own requests.
  const applyMessage = useCallback((conversationKey, incoming) => {
    setThread((prev) => {
      if (prev.key !== conversationKey) return prev;
      const known = prev.items.some((m) => m.id === incoming.id);
      const items = known
        ? prev.items.map((m) => (m.id === incoming.id ? incoming : m))
        : [...prev.items, incoming];
      return { key: prev.key, items };
    });
    setConversations((prev) => {
      const idx = prev.findIndex((c) => c.conversationKey === conversationKey);
      if (idx === -1) return prev;
      const current = prev[idx].lastMessage;
      // An edit to the newest message refreshes the preview in place; only a
      // genuinely new message bumps the conversation to the top of the list.
      if (current && current.id === incoming.id) {
        return prev.map((c, i) => (i === idx ? { ...c, lastMessage: incoming } : c));
      }
      if (current && new Date(current.createdAt) > new Date(incoming.createdAt)) return prev;
      const updated = { ...prev[idx], lastMessage: incoming };
      return [updated, ...prev.filter((_, i) => i !== idx)];
    });
  }, []);

  /** Flips your own bubbles to "Seen" when the other side reports catching up. */
  const applyReadReceipt = useCallback(
    (conversationKey, receipt) => {
      if (receipt.readerId === user?.id) return;
      setThread((prev) => {
        if (prev.key !== conversationKey) return prev;
        if (!prev.items.some((m) => m.sender?.id === user?.id && !m.readAt)) return prev;
        return {
          key: prev.key,
          items: prev.items.map((m) =>
            m.sender?.id === user?.id && !m.readAt ? { ...m, readAt: receipt.readAt } : m,
          ),
        };
      });
    },
    [user?.id],
  );

  useEffect(() => {
    if (!selectedKey) return undefined;
    let stale = false;

    // The provider needs to know which thread is on screen so a message arriving here is
    // read on sight rather than badged.
    setActiveConversation(selectedKey);

    getMessageHistory(selectedKey)
      .then((items) => {
        if (stale) return;
        setThread({ key: selectedKey, items });
        // Only once the thread is rendered; this is also what flips the sender to Seen.
        markConversationRead(selectedKey);
      })
      .catch(() => {
        if (stale) return;
        toast.error("Could not load this conversation.");
        setThread({ key: selectedKey, items: EMPTY_MESSAGES });
      });

    const unsubscribe = subscribeToConversation(selectedKey, (event) => {
      if (event.type === "READ") {
        applyReadReceipt(selectedKey, event.read);
        return;
      }
      // The provider marks it read: it sees the same message on the personal stream.
      applyMessage(selectedKey, event.message);
    });

    return () => {
      stale = true;
      setActiveConversation(null);
      unsubscribe?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedKey]);

  // Only the open thread subscribes to its topic; previews and ordering for the rest come off
  // the personal stream.
  useEffect(
    () =>
      onChatEvent((event) => {
        if (event.type !== "MESSAGE") return;
        applyMessage(event.conversationKey, event.message);
      }),
    [onChatEvent, applyMessage],
  );

  // Coming back to the tab counts as reading whatever piled up while it sat in the background.
  useEffect(() => {
    if (!selectedKey) return undefined;
    const onFocus = () => markConversationRead(selectedKey);
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedKey]);

  const threadLoaded = thread.key === selectedKey;
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
        c.latestTaskTitle?.toLowerCase().includes(q),
    );
  }, [conversations, convSearch]);

  const activeConversation = conversations.find((c) => c.conversationKey === selectedKey);
  const otherPalette = paletteFor(activeConversation?.otherParty?.id);
  const otherInitials = initialsOf(activeConversation?.otherParty?.fullName);
  const selfInitials = initialsOf(user?.fullName);

  const handleSelectConversation = (conversationKey) => {
    stickToBottomRef.current = true;
    setSelectedKey(conversationKey);
    setMobileShowChat(true);
  };

  const handleSend = () => {
    const text = draft.trim();
    if (!text || !selectedKey) return;
    stickToBottomRef.current = true;
    const sent = sendMessage(selectedKey, text);
    if (!sent) {
      toast.error("Not connected. Please wait a moment and try again.");
      return;
    }
    setDraft("");
  };

  const handleDeleteMessage = async (messageId) => {
    try {
      // The server also broadcasts this, so applying it here only matters
      // when the socket happens to be down.
      applyMessage(selectedKey, await deleteMessage(messageId));
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not delete this message.");
    }
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
    if (!file || !selectedKey) return;
    setUploading(true);
    try {
      await uploadAttachment(selectedKey, file);
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not send attachment.");
    } finally {
      setUploading(false);
    }
  };

  // Task chips are noise when the whole thread is about a single job.
  const showTaskChips = (activeConversation?.taskCount ?? 0) > 1;
  const timeline = useMemo(
    () => buildTimeline(messages, showTaskChips),
    [messages, showTaskChips],
  );

  return (
    // `h-dvh`, not `h-svh`: the shell has to track the mobile toolbar collapsing
    // and the on-screen keyboard, otherwise the composer ends up below the fold.
    <div className="flex h-dvh flex-col overflow-hidden">
      <div className="shrink-0">{renderHeader?.()}</div>

      <main className="flex min-h-0 flex-1 flex-col px-4 py-4 sm:px-6 lg:px-8">
        <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 overflow-hidden rounded-card border border-line bg-surface shadow-e1">
          {/* Conversation list */}
          <aside
            className={[
              "flex min-h-0 w-full flex-col border-r border-line lg:w-[340px] lg:shrink-0",
              mobileShowChat ? "hidden lg:flex" : "flex",
            ].join(" ")}
          >
            <div className="shrink-0 border-b border-line px-4 py-4">
              <h2 className="text-lg font-bold text-ink">Messages</h2>
              <div className="relative mt-3">
                <svg
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint"
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
                  className="w-full rounded-xl border border-line bg-surface-muted py-2 pl-10 pr-3 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                  aria-label="Search conversations"
                />
              </div>
            </div>

            <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain p-2">
              {loadingConversations ? (
                <li className="px-3 py-6 text-center text-sm text-ink-muted">Loading...</li>
              ) : filteredConversations.length === 0 ? (
                <li className="px-3 py-6 text-center text-sm text-ink-muted">
                  No conversations yet. Messaging opens once a booking is confirmed with
                  the {ADVANCE_PERCENT_LABEL} advance.
                </li>
              ) : (
                filteredConversations.map((conv) => (
                  <li key={conv.conversationKey}>
                    <ConversationItem
                      conversation={conv}
                      active={conv.conversationKey === selectedKey}
                      unread={unreadByKey[conv.conversationKey] || 0}
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
              <div className="flex flex-1 items-center justify-center px-6 text-center text-sm text-ink-muted">
                Select a conversation to start chatting.
              </div>
            ) : (
              <>
                {/* Chat header */}
                <div className="flex shrink-0 items-center gap-3 border-b border-line px-4 py-3">
                  <button
                    type="button"
                    className="rounded-lg p-2 text-ink-muted hover:bg-surface-sunken lg:hidden"
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
                    <p className="font-semibold text-ink">
                      {activeConversation.otherParty?.fullName}
                    </p>
                    <p className="flex items-center gap-1.5 text-xs text-ink-muted">
                      <span className={`h-2 w-2 rounded-full ${connected ? "bg-emerald-500" : "bg-line-strong"}`} />
                      {connected ? "Connected" : "Connecting..."} · {activeConversation.latestTaskTitle}
                    </p>
                  </div>
                </div>

                {/* Messages */}
                <div
                  ref={scrollRef}
                  onScroll={handleMessagesScroll}
                  className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-surface-muted px-4 py-4"
                >
                  {loadingMessages ? (
                    <p className="text-center text-sm text-ink-muted">Loading messages...</p>
                  ) : (
                    <div className="space-y-4">
                      {timeline.map((item) => {
                        if (item.kind === "date") {
                          return (
                            <div key={item.key} className="flex justify-center pt-2">
                              <span className="rounded-full bg-surface px-3 py-1 text-xs font-medium text-ink-muted shadow-e1 ring-1 ring-line">
                                {item.label}
                              </span>
                            </div>
                          );
                        }
                        if (item.kind === "task") {
                          return (
                            <div key={item.key} className="flex justify-center">
                              <span className="inline-flex max-w-[85%] items-center gap-1.5 rounded-full bg-brand/10 px-3 py-1 text-xs font-medium text-brand-dark">
                                <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 7H4a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1zM9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                                </svg>
                                <span className="truncate">Task: {item.title}</span>
                              </span>
                            </div>
                          );
                        }
                        return (
                          <MessageBubble
                            key={item.key}
                            message={item.message}
                            isSelf={item.message.sender?.id === user?.id}
                            otherInitials={otherInitials}
                            otherPalette={otherPalette}
                            selfInitials={selfInitials}
                            onDelete={handleDeleteMessage}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Input */}
                <div className="shrink-0 border-t border-line bg-surface px-4 py-3">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <textarea
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Type a message..."
                        rows={1}
                        className="h-11 w-full resize-none overflow-y-auto rounded-xl border border-line bg-surface-muted py-2.5 pl-4 pr-10 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
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
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-ink-faint hover:bg-surface-sunken hover:text-ink-body disabled:cursor-not-allowed disabled:opacity-50"
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
                  <p className="mt-2 text-xs text-ink-faint">
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

"use client";

import { useState, useEffect, useRef } from "react";
import { Check, Bell, X, Trash2 } from "lucide-react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { formatDistanceToNow } from "date-fns";
import { toast } from "@/hooks/use-toast";

export default function NotificationBell() {
  const [user, setUser] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);
  const seenNotificationsRef = useRef(new Set());
  const initialLoadRef = useRef(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    seenNotificationsRef.current = new Set();
    initialLoadRef.current = true;
    if (!user) {
      setNotifications([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  useEffect(() => {
    if (!user) return;
  fetchNotifications(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Lightweight polling and refetch on window focus
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      fetchNotifications(true);
    }, 30000); // 30s

    const onFocus = () => fetchNotifications(true);
    const onVisibility = () => {
      if (document.visibilityState === "visible") fetchNotifications(true);
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [user]);

  useEffect(() => {
    function handleOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  async function fetchNotifications(showToastForNew = false) {
    setLoading(true);
    try {
      const res = await fetch(`/api/notifications?uid=${user.uid}`);
      if (res.ok) {
        const data = await res.json();
        const incoming = data.notifications || [];

        if (!initialLoadRef.current && showToastForNew) {
          const seen = seenNotificationsRef.current;
          incoming
            .filter((n) => !seen.has(n.id) && !n.read)
            .forEach((n) => {
              toast({
                title: n.title || "New notification",
                description: n.message || "You have a new notification.",
              });
            });
        }

        incoming.forEach((n) => {
          seenNotificationsRef.current.add(n.id);
        });

        setNotifications(incoming);
        initialLoadRef.current = false;
      }
    } catch (err) {
      console.error("Fetch notifications error:", err);
    } finally {
      setLoading(false);
    }
  }

  // SSE subscription for instant notifications
  useEffect(() => {
    if (!user) return;
    const src = new EventSource(`/api/notifications/stream?uid=${encodeURIComponent(user.uid)}`);
    src.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data);
        if (data?.type === "notification") {
          const n = data;
          // Toast immediately
          toast({ title: n.title || "New notification", description: n.message || "" });
          // Merge into list (avoid duplicates)
          setNotifications((prev) => {
            const exists = prev.some((p) => p.id === n.id);
            if (exists) return prev;
            return [
              {
                id: n.id,
                title: n.title,
                message: n.message,
                read: !!n.read,
                createdAt: n.createdAt,
                ...(n.extra || {}),
              },
              ...prev,
            ];
          });
        }
      } catch (_) {}
    };
    src.onerror = () => {
      // auto-close on error to avoid leaks
      src.close();
    };
    return () => src.close();
  }, [user]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  async function markAsRead(id) {
    try {
      const res = await fetch(`/api/notifications`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((p) => (p.id === id ? { ...p, read: true } : p))
        );
      }
    } catch (err) {
      console.error("markAsRead error:", err);
    }
  }

  async function markAllAsRead() {
    if (!user) return;
    try {
      const res = await fetch(`/api/notifications`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "markAll", uid: user.uid }),
      });
      if (res.ok) {
        setNotifications((prev) => prev.map((p) => ({ ...p, read: true })));
      }
    } catch (err) {
      console.error("markAllAsRead error:", err);
    }
  }

  async function deleteNotification(id) {
    try {
      const res = await fetch(`/api/notifications`, {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setNotifications((prev) => prev.filter((p) => p.id !== id));
      } else {
        const err = await res.json().catch(() => ({}));
        console.error("deleteNotification failed:", err);
      }
    } catch (err) {
      console.error("deleteNotification error:", err);
    }
  }

  function renderNotification(n) {
    const id = n.id;
    return (
      <div
        key={id}
        className={`p-3 border-b last:border-b-0 ${n.read ? "bg-white/50" : "bg-white"
          } `}
      >
        <div className="flex justify-between items-start">
          <div>
            <div className="font-medium text-sm">
              {n.title || "Notification"}
            </div>
            <div className="text-xs text-muted-foreground">{n.message}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {n.createdAt
                ? formatDistanceToNow(new Date(n.createdAt)) + " ago"
                : ""}
            </div>
          </div>
          <div className="ml-3 text-right flex flex-col items-end gap-2">
            <div>
              <button
                onClick={() => deleteNotification(id)}
                className="rounded-full text-sm px-1.5 py-1.5 bg-black text-white"
                title="Delete notification"
              >
                <Check className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((s) => !s)}
        className="relative w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center font-medium"
        title="Notifications"
      >
        <Bell className="w-5 h-5 cursor-pointer" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-foreground rounded-full text-[10px] flex items-center justify-center text-background">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-800 rounded-md shadow-lg z-50 ring-1 ring-black/5">
          <div className="flex items-center justify-between px-3 py-2 border-b">
            <div className="font-medium">Notifications</div>
            <div className="flex items-center gap-2">
              <button
                onClick={markAllAsRead}
                className="text-xs text-muted-foreground hover:underline cursor-pointer"
              >
                Mark all as read
              </button>
              <button onClick={() => setOpen(false)} className="p-1">
                <X className="w-4 h-4 cursor-pointer" />
              </button>
            </div>
          </div>

          <div className="max-h-72 overflow-auto">
            {loading && <div className="p-3 text-sm">Loading...</div>}
            {!loading && notifications.length === 0 && (
              <div className="p-3 text-sm">No notifications</div>
            )}
            {!loading && notifications.map((n) => renderNotification(n))}
          </div>
        </div>
      )}
    </div>
  );
}

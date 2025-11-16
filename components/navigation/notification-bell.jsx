"use client";

import { useState, useEffect, useRef } from "react";
import { Check, Bell, X } from "lucide-react";
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
      // Delete all notifications instead of just marking as read
      const deletePromises = notifications.map((n) =>
        fetch(`/api/notifications`, {
          method: "DELETE",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ id: n.id }),
        })
      );
      await Promise.all(deletePromises);
      setNotifications([]);
      toast({
        title: "Success",
        description: "All notifications have been cleared.",
      });
    } catch (err) {
      console.error("markAllAsRead error:", err);
      toast({
        title: "Error",
        description: "Failed to clear notifications.",
        variant: "destructive",
      });
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

  // Single action: mark as read, then delete (tick behavior)
  async function tickNotification(id) {
    try {
      await Promise.allSettled([
        fetch(`/api/notifications`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ id }),
        }),
        fetch(`/api/notifications`, {
          method: "DELETE",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ id }),
        }),
      ]);
    } catch (_) {
      // ignore network error; we'll still optimistically update UI
    } finally {
      setNotifications((prev) => prev.filter((p) => p.id !== id));
    }
  }

  function renderNotification(n) {
    const id = n.id;
    return (
      <div
        key={id}
        className={`p-3 border-b border-border last:border-b-0 rounded-md ${n.read ? "bg-muted/30" : "bg-card"
          } hover:bg-muted/50 transition-colors`}
      >
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="font-semibold text-sm text-foreground">
              {n.title || "Notification"}
            </div>
            <div className="text-xs text-muted-foreground mt-1">{n.message}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {n.createdAt
                ? formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })
                : ""}
            </div>
          </div>
          <div className="ml-3 flex items-center gap-1">
            <button
              onClick={() => tickNotification(id)}
              className="p-1 text-primary hover:text-primary/80 transition-colors focus:outline-none"
              title="Mark as read and dismiss"
            >
              <Check className="w-4 h-4" strokeWidth={3} />
            </button>
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
        <div className="absolute right-0 mt-2 w-80 bg-card border border-border rounded-lg shadow-2xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
            <div className="font-semibold text-foreground">Notifications</div>
            <div className="flex items-center gap-3">
              <button
                onClick={markAllAsRead}
                className="text-xs text-primary hover:text-primary/80 font-medium cursor-pointer"
              >
                Mark all as read
              </button>
              <button onClick={() => setOpen(false)} className="p-1 hover:bg-muted rounded-md transition-colors">
                <X className="w-4 h-4 cursor-pointer text-muted-foreground" />
              </button>
            </div>
          </div>

          <div className="max-h-72 overflow-auto">
            {loading && (
              <div className="p-8 text-center">
                <div className="inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                <div className="text-sm text-muted-foreground mt-2">Loading notifications...</div>
              </div>
            )}
            {!loading && notifications.length === 0 && (
              <div className="p-8 text-center">
                <Bell className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                <div className="text-sm font-medium text-foreground">No notifications</div>
                <div className="text-xs text-muted-foreground mt-1">You're all caught up!</div>
              </div>
            )}
            {!loading && notifications.map((n) => renderNotification(n))}
          </div>
        </div>
      )}
    </div>
  );
}

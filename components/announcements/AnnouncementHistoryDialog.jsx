"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

function formatDate(value) {
  if (!value) {
    return "Unknown";
  }
  const date = new Date(value);
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function VersionEntry({ version, order }) {
  return (
    <div className="space-y-3 rounded-md border border-border bg-muted/40 p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <span>Revision {order}</span>
          {version.isImportant && <Badge variant="default">Important</Badge>}
          {version.isUrgent && <Badge variant="destructive">Urgent</Badge>}
          {version.isPinned && <Badge variant="outline">Pinned</Badge>}
        </div>
        <span className="text-xs text-muted-foreground">{formatDate(version.editedAt)}</span>
      </div>
      <div className="space-y-2 text-sm">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Title</p>
          <p className="font-medium text-foreground">{version.title}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Content</p>
          <p className="whitespace-pre-wrap text-foreground">{version.content}</p>
        </div>
        {Array.isArray(version.tags) && version.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {version.tags.map((tag, idx) => (
              <Badge key={`${tag}-${idx}`} variant="outline">
                {tag}
              </Badge>
            ))}
          </div>
        )}
        {version.link?.url && (
          <p className="text-xs text-muted-foreground">
            Link: {version.link?.text || version.link?.url}
          </p>
        )}
        {version.poll && (
          <div className="rounded-md border border-dashed p-3 text-xs">
            <p className="font-semibold">Poll</p>
            <p className="text-muted-foreground">{version.poll.question}</p>
            <p className="mt-1 text-muted-foreground">
              {version.poll.allowMultiple ? 'Multiple answers allowed' : 'Single answer only'} • {version.poll.isEnabled === false ? 'Closed' : 'Open'}
            </p>
            {Array.isArray(version.poll.options) && version.poll.options.length > 0 && (
              <ul className="mt-2 space-y-1">
                {version.poll.options.map((option, idx) => (
                  <li key={`${option.id || idx}`} className="text-foreground">
                    • {option.text}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ActivityEntry({ activity }) {
  return (
    <div className="space-y-1 rounded-md border border-border bg-background p-3">
      <div className="flex items-center justify-between text-sm font-medium">
        <span className="capitalize">{activity.action}</span>
        <span className="text-xs text-muted-foreground">{formatDate(activity.timestamp)}</span>
      </div>
      <p className="text-sm text-muted-foreground">
        {activity.performedBy?.name || "Unknown"}
        {activity.performedBy?.role ? ` • ${activity.performedBy.role}` : ""}
      </p>
      {activity.meta?.title && (
        <p className="text-xs text-muted-foreground">Title: {activity.meta.title}</p>
      )}
    </div>
  );
}

export default function AnnouncementHistoryDialog({
  announcementId,
  announcementTitle,
  editHistory = [],
  open,
  onOpenChange,
}) {
  const [loading, setLoading] = useState(false);
  const [activityError, setActivityError] = useState("");
  const [activities, setActivities] = useState([]);

  const sortedHistory = useMemo(() => {
    if (!Array.isArray(editHistory)) {
      return [];
    }
    return [...editHistory].sort((a, b) => {
      const aTime = new Date(a.editedAt || 0).getTime();
      const bTime = new Date(b.editedAt || 0).getTime();
      return bTime - aTime;
    });
  }, [editHistory]);

  useEffect(() => {
    if (!open || !announcementId) {
      return;
    }

    const controller = new AbortController();
    const loadActivity = async () => {
      setLoading(true);
      setActivityError("");
      try {
        const response = await fetch(`/api/announcements/${announcementId}/activity`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`Failed to fetch history (${response.status})`);
        }
        const payload = await response.json();
        const items = Array.isArray(payload.data) ? payload.data : [];
        setActivities(items);
      } catch (error) {
        if (error.name !== "AbortError") {
          console.error("History fetch failed:", error);
          setActivityError("Unable to load activity history.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    loadActivity();

    return () => controller.abort();
  }, [open, announcementId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Announcement history</DialogTitle>
          <DialogDescription>
            {announcementTitle ? `Tracking changes for “${announcementTitle}”.` : "Tracking changes for this announcement."}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[420px] pr-2">
          <div className="space-y-6">
            <section>
              <h3 className="text-sm font-semibold text-foreground">Edit versions</h3>
              <p className="text-xs text-muted-foreground mb-3">
                Each revision shows the announcement content before an edit was applied.
              </p>
              {sortedHistory.length === 0 ? (
                <p className="text-xs text-muted-foreground">No previous versions saved yet.</p>
              ) : (
                <div className="space-y-3">
                  {sortedHistory.map((version, index) => (
                    <VersionEntry
                      key={`${announcementId}-rev-${index}`}
                      version={version}
                      order={index + 1}
                    />
                  ))}
                </div>
              )}
            </section>

            <Separator />

            <section>
              <h3 className="text-sm font-semibold text-foreground">Activity log</h3>
              <p className="text-xs text-muted-foreground mb-3">
                Actions recorded for this announcement (create, edit, pin, delete, undo).
              </p>
              {loading ? (
                <div className="space-y-2">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : activityError ? (
                <p className="text-xs text-destructive">{activityError}</p>
              ) : activities.length === 0 ? (
                <p className="text-xs text-muted-foreground">No activity recorded yet.</p>
              ) : (
                <div className="space-y-3">
                  {activities.map((activity) => (
                    <ActivityEntry key={activity.id} activity={activity} />
                  ))}
                </div>
              )}
            </section>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

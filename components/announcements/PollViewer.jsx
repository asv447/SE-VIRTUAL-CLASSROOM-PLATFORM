"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

const formatPercent = (count, total) => {
  if (!total) {
    return "0%";
  }
  return `${Math.round((count / total) * 100)}%`;
};

const ensurePoll = (poll) => {
  if (!poll || typeof poll !== "object") {
    return null;
  }
  return {
    question: poll.question || "",
    allowMultiple: Boolean(poll.allowMultiple),
    isEnabled: poll.isEnabled !== false,
    options: Array.isArray(poll.options)
      ? poll.options.map((option) => ({
          id: option?.id,
          text: option?.text || "",
          voters: Array.isArray(option?.voters) ? option.voters.filter(Boolean) : [],
        }))
      : [],
  };
};

export default function PollViewer({
  poll,
  announcementId,
  currentUserId,
  currentUserName,
  currentUserRole,
  onVoteSuccess,
  isAdmin,
}) {
  const [submitting, setSubmitting] = useState(false);
  const normalizedPoll = useMemo(() => ensurePoll(poll), [poll]);

  const hasUser = Boolean(currentUserId);

  const totalVotes = useMemo(() => {
    if (!normalizedPoll) {
      return 0;
    }
    const voterSet = new Set();
    normalizedPoll.options.forEach((option) => {
      option.voters.forEach((voterId) => voterSet.add(voterId));
    });
    return voterSet.size;
  }, [normalizedPoll]);

  const currentSelection = useMemo(() => {
    if (!normalizedPoll) {
      return new Set();
    }
    const selected = new Set();
    normalizedPoll.options.forEach((option) => {
      if (option.voters.includes(currentUserId)) {
        selected.add(option.id);
      }
    });
    return selected;
  }, [normalizedPoll, currentUserId]);

  const [pendingSelection, setPendingSelection] = useState(() => new Set(currentSelection));

  useEffect(() => {
    setPendingSelection(new Set(currentSelection));
  }, [currentSelection]);

  const pollDisabled = !normalizedPoll || (!isAdmin && !normalizedPoll.isEnabled);

  const handleToggle = (optionId, checked) => {
    setPendingSelection((prev) => {
      const next = new Set(prev);
      if (normalizedPoll.allowMultiple) {
        if (checked) {
          next.add(optionId);
        } else {
          next.delete(optionId);
        }
      } else {
        next.clear();
        if (checked) {
          next.add(optionId);
        }
      }
      return next;
    });
  };

  const submitVote = async () => {
    try {
      setSubmitting(true);
      const optionIds = Array.from(pendingSelection);
      const response = await fetch(`/api/announcements/${announcementId}/poll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          optionIds,
          userId: currentUserId,
          userName: currentUserName,
          userRole: currentUserRole,
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || "Unable to submit vote");
      }
      onVoteSuccess?.(payload.data);
    } catch (error) {
      console.error("Vote error", error);
    } finally {
      setSubmitting(false);
    }
  };

  const clearVote = async () => {
    try {
      setSubmitting(true);
      const response = await fetch(`/api/announcements/${announcementId}/poll`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUserId,
          userName: currentUserName,
          userRole: currentUserRole,
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || "Unable to clear vote");
      }
      onVoteSuccess?.(payload.data);
      setPendingSelection(new Set());
    } catch (error) {
      console.error("Clear vote error", error);
    } finally {
      setSubmitting(false);
    }
  };

  if (!normalizedPoll) {
    return null;
  }

  return (
    <Card className="border-primary/30 bg-muted/40">
      <CardHeader>
        <CardTitle className="text-base">Poll</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm font-medium text-foreground">{normalizedPoll.question}</p>
        <p className="text-xs text-muted-foreground">
          {normalizedPoll.allowMultiple ? "You may select multiple answers." : "Select one answer."}
        </p>
        <div className="space-y-2">
          {normalizedPoll.options.map((option) => {
            const voters = Array.isArray(option.voters) ? option.voters : [];
            const isChecked = pendingSelection.has(option.id);
            const optionVotes = voters.length;
            return (
              <label
                key={option.id}
                className={cn(
                  "flex items-center justify-between gap-3 rounded-md border p-3 text-sm",
                  isChecked ? "border-primary bg-primary/5" : "border-border"
                )}
              >
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={isChecked}
                    onCheckedChange={(checked) => handleToggle(option.id, Boolean(checked))}
                    disabled={pollDisabled || submitting}
                  />
                  <span>{option.text}</span>
                </div>
                <div className="text-xs text-muted-foreground text-right">
                  <p>{optionVotes} vote{optionVotes !== 1 ? "s" : ""}</p>
                  <p>{formatPercent(optionVotes, totalVotes)}</p>
                </div>
              </label>
            );
          })}
        </div>
        {!normalizedPoll.isEnabled && !isAdmin && (
          <p className="text-xs text-muted-foreground">Voting is closed for this poll.</p>
        )}
        {!hasUser && (
          <p className="text-xs text-muted-foreground">
            Sign in to participate in this poll.
          </p>
        )}
      </CardContent>
      <CardFooter className="flex flex-wrap gap-2">
        <Button
          type="button"
          disabled={pollDisabled || submitting || pendingSelection.size === 0 || !hasUser}
          onClick={submitVote}
        >
          Submit vote
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={pollDisabled || submitting || currentSelection.size === 0 || !hasUser}
          onClick={clearVote}
        >
          Clear my vote
        </Button>
        <div className="ml-auto text-xs text-muted-foreground self-center">
          {totalVotes} total vote{totalVotes !== 1 ? "s" : ""}
        </div>
      </CardFooter>
    </Card>
  );
}

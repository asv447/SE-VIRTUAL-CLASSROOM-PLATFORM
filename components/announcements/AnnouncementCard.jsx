"use client";

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Pin,
  PinOff,
  Edit2,
  Trash2,
  Undo2,
  ExternalLink,
  Calendar,
  User,
  Tag,
  History
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import EditAnnouncementDialog from './EditAnnouncementDialog';
import AnnouncementHistoryDialog from './AnnouncementHistoryDialog';
import PollViewer from './PollViewer';

export default function AnnouncementCard({
  announcement,
  isAdmin = false,
  onUpdate,
  onDelete,
  currentUser,
}) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [loading, setLoading] = useState(false);

  const me = useMemo(() => {
    if (!currentUser) {
      return { id: '', name: '', role: '' };
    }
    return {
      id: currentUser.uid || currentUser.id || currentUser.userId || '',
      name: currentUser.displayName || currentUser.name || currentUser.username || currentUser.email || '',
      role: currentUser.role || (isAdmin ? 'Professor' : 'Student'),
    };
  }, [currentUser, isAdmin]);

  const handleTogglePin = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/announcements/${announcement.id}/pin`, {
        method: 'PATCH'
      });
      const result = await response.json();
      
      if (result.success && onUpdate) {
        onUpdate(result.data);
      }
    } catch (err) {
      console.error('Error toggling pin:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/announcements/${announcement.id}`, {
        method: 'DELETE'
      });
      const result = await response.json();
      
      if (result.success && onDelete) {
        onDelete(announcement.id);
      }
    } catch (err) {
      console.error('Error deleting announcement:', err);
    } finally {
      setLoading(false);
      setShowDeleteDialog(false);
    }
  };

  const handleUndo = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/announcements/${announcement.id}/undo`, {
        method: 'POST'
      });
      const result = await response.json();
      
      if (result.success && onUpdate) {
        onUpdate(result.data);
      }
    } catch (err) {
      console.error('Error undoing edit:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <>
      <Card className={`w-full ${announcement.isPinned ? 'border-primary border-2' : ''}`}>
        <CardHeader className="space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <CardTitle className="text-xl flex items-center gap-2">
                {announcement.isPinned && <Pin className="h-5 w-5 text-primary" />}
                {announcement.title}
              </CardTitle>
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  {announcement.authorName} • {announcement.authorRole}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {formatDate(announcement.createdAt)}
                </span>
              </div>
            </div>
            
            {isAdmin && (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleTogglePin}
                  disabled={loading}
                  title={announcement.isPinned ? "Unpin" : "Pin"}
                >
                  {announcement.isPinned ? (
                    <PinOff className="h-4 w-4" />
                  ) : (
                    <Pin className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowEditDialog(true)}
                  disabled={loading}
                  title="Edit announcement"
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                {announcement.editHistory && announcement.editHistory.length > 0 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowHistoryDialog(true)}
                    disabled={loading}
                    title="View edit history"
                  >
                    <History className="h-4 w-4" />
                  </Button>
                )}
                {announcement.editHistory && announcement.editHistory.length > 0 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleUndo}
                    disabled={loading}
                    title="Undo last edit"
                  >
                    <Undo2 className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowDeleteDialog(true)}
                  disabled={loading}
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {announcement.isImportant && (
              <Badge variant="default" className="bg-orange-500">Important</Badge>
            )}
            {announcement.isUrgent && (
              <Badge variant="destructive">Urgent</Badge>
            )}
            {announcement.tags && announcement.tags.map((tag, index) => (
              <Badge key={index} variant="outline" className="flex items-center gap-1">
                <Tag className="h-3 w-3" />
                {tag}
              </Badge>
            ))}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <p className="whitespace-pre-wrap text-foreground">{announcement.content}</p>

          {announcement.link && announcement.link.url && (
            <a 
              href={announcement.link.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-primary hover:underline"
            >
              <ExternalLink className="h-4 w-4" />
              {announcement.link.text || 'View Link'}
            </a>
          )}

          {announcement.updatedAt !== announcement.createdAt && (
            <p className="text-xs text-muted-foreground">
              Last edited: {formatDate(announcement.updatedAt)}
            </p>
          )}

          {announcement.poll && (
            <PollViewer
              poll={announcement.poll}
              announcementId={announcement.id}
              currentUserId={me.id}
              currentUserName={me.name}
              currentUserRole={me.role}
              onVoteSuccess={(updated) => onUpdate?.(updated)}
              isAdmin={isAdmin}
            />
          )}
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the announcement "{announcement.title}". 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <EditAnnouncementDialog
        announcement={announcement}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        onAnnouncementUpdated={onUpdate}
      />

      <AnnouncementHistoryDialog
        announcementId={announcement.id}
        announcementTitle={announcement.title}
        history={announcement.editHistory || []}
        open={showHistoryDialog}
        onOpenChange={setShowHistoryDialog}
      />
    </>
  );
}

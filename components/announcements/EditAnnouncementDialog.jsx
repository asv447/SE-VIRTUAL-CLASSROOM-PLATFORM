"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Save } from 'lucide-react';
import PollBuilder from './PollBuilder';

export default function EditAnnouncementDialog({ announcement, open, onOpenChange, onAnnouncementUpdated }) {
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    tags: '',
    linkUrl: '',
    linkText: 'View Link',
    isImportant: false,
    isUrgent: false,
    isPinned: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pollEnabled, setPollEnabled] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollAllowMultiple, setPollAllowMultiple] = useState(false);
  const [pollOptions, setPollOptions] = useState([]);
  const [pollResponsesEnabled, setPollResponsesEnabled] = useState(true);
  const [pollError, setPollError] = useState('');

  // Populate form when announcement changes
  useEffect(() => {
    if (announcement) {
      setFormData({
        title: announcement.title || '',
        content: announcement.content || '',
        tags: announcement.tags ? announcement.tags.join(', ') : '',
        linkUrl: announcement.link?.url || '',
        linkText: announcement.link?.text || 'View Link',
        isImportant: announcement.isImportant || false,
        isUrgent: announcement.isUrgent || false,
        isPinned: announcement.isPinned || false
      });
      if (announcement.poll) {
        setPollEnabled(true);
        setPollQuestion(announcement.poll.question || '');
        setPollAllowMultiple(Boolean(announcement.poll.allowMultiple));
        setPollResponsesEnabled(announcement.poll.isEnabled !== false);
        setPollOptions(
          Array.isArray(announcement.poll.options) && announcement.poll.options.length >= 2
            ? announcement.poll.options.map((option) => ({
                id: option.id || `poll-${Date.now()}-${Math.random()}`,
                text: option.text || ''
              }))
            : [
                { id: `poll-${Date.now()}-1`, text: '' },
                { id: `poll-${Date.now()}-2`, text: '' }
              ]
        );
      } else {
        setPollEnabled(false);
        setPollQuestion('');
        setPollAllowMultiple(false);
        setPollResponsesEnabled(true);
        setPollOptions([
          { id: `poll-${Date.now()}-1`, text: '' },
          { id: `poll-${Date.now()}-2`, text: '' }
        ]);
      }
      setPollError('');
    }
  }, [announcement]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
  setPollError('');
    setLoading(true);

    try {
      const tagsArray = formData.tags
        ? formData.tags.split(',').map(tag => tag.trim()).filter(Boolean)
        : [];

      let pollPayload;
      if (pollEnabled) {
        const trimmedQuestion = pollQuestion.trim();
        const cleanedOptions = pollOptions
          .map(option => ({ id: option.id, text: option.text.trim() }))
          .filter(option => option.text.length > 0);

        if (!trimmedQuestion) {
          setPollError('Provide a poll question before saving.');
          throw new Error('Provide a poll question before saving.');
        }
        if (cleanedOptions.length < 2) {
          setPollError('Add at least two answer choices for the poll.');
          throw new Error('Add at least two answer choices for the poll.');
        }

        pollPayload = {
          question: trimmedQuestion,
          allowMultiple: pollAllowMultiple,
          isEnabled: pollResponsesEnabled,
          options: cleanedOptions
        };
      } else if (announcement?.poll) {
        pollPayload = null;
      }

      const updateData = {
        title: formData.title,
        content: formData.content,
        isImportant: formData.isImportant,
        isUrgent: formData.isUrgent,
        isPinned: formData.isPinned,
        tags: tagsArray,
        link: {
          url: formData.linkUrl || '',
          text: formData.linkText || 'View Link'
        },
        ...(pollPayload !== undefined ? { poll: pollPayload } : {}),
        editorName: announcement.authorName, // In production, get from current user
        editorRole: announcement.authorRole
      };

      const response = await fetch(`/api/announcements/${announcement.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to update announcement');
      }

      if (onAnnouncementUpdated) {
        onAnnouncementUpdated(result.data);
        if (result.data.poll) {
          setPollOptions(
            result.data.poll.options.map((option) => ({
              id: option.id,
              text: option.text
            }))
          );
          setPollResponsesEnabled(result.data.poll.isEnabled !== false);
        } else {
          setPollResponsesEnabled(true);
        }
      }

      onOpenChange(false);
    } catch (err) {
      setError(err.message || 'An error occurred while updating the announcement');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Announcement</DialogTitle>
          <DialogDescription>
            Make changes to your announcement. Previous version will be saved in edit history.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="edit-title">Title *</Label>
            <Input
              id="edit-title"
              required
              placeholder="Enter announcement title"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-content">Content *</Label>
            <Textarea
              id="edit-content"
              required
              placeholder="Write your announcement here..."
              value={formData.content}
              onChange={(e) => handleChange('content', e.target.value)}
              rows={5}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-tags">Tags (comma-separated)</Label>
            <Input
              id="edit-tags"
              placeholder="e.g., Assignment, Exam, General"
              value={formData.tags}
              onChange={(e) => handleChange('tags', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-linkUrl">Link URL (optional)</Label>
              <Input
                id="edit-linkUrl"
                type="url"
                placeholder="https://example.com"
                value={formData.linkUrl}
                onChange={(e) => handleChange('linkUrl', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-linkText">Link Text</Label>
              <Input
                id="edit-linkText"
                placeholder="e.g., View Assignment"
                value={formData.linkText}
                onChange={(e) => handleChange('linkText', e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="edit-isImportant"
                checked={formData.isImportant}
                onCheckedChange={(checked) => handleChange('isImportant', checked)}
              />
              <Label htmlFor="edit-isImportant" className="cursor-pointer">Mark as Important</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="edit-isUrgent"
                checked={formData.isUrgent}
                onCheckedChange={(checked) => handleChange('isUrgent', checked)}
              />
              <Label htmlFor="edit-isUrgent" className="cursor-pointer">Mark as Urgent</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="edit-isPinned"
                checked={formData.isPinned}
                onCheckedChange={(checked) => handleChange('isPinned', checked)}
              />
              <Label htmlFor="edit-isPinned" className="cursor-pointer">Pin to Top</Label>
            </div>
          </div>

          <PollBuilder
            enabled={pollEnabled}
            onEnabledChange={(checked) => {
              const value = Boolean(checked);
              setPollEnabled(value);
              if (!value) {
                setPollError('');
                setPollQuestion('');
                setPollAllowMultiple(false);
                setPollResponsesEnabled(true);
                setPollOptions([
                  { id: `poll-${Date.now()}-1`, text: '' },
                  { id: `poll-${Date.now()}-2`, text: '' }
                ]);
              } else {
                setPollResponsesEnabled(true);
              }
            }}
            question={pollQuestion}
            onQuestionChange={setPollQuestion}
            allowMultiple={pollAllowMultiple}
            onAllowMultipleChange={(checked) => setPollAllowMultiple(Boolean(checked))}
            options={pollOptions}
            onOptionsChange={setPollOptions}
            responsesEnabled={pollResponsesEnabled}
            onResponsesEnabledChange={(checked) => setPollResponsesEnabled(Boolean(checked))}
            errorMessage={pollError}
          />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              <Save className="mr-2 h-4 w-4" />
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Send } from 'lucide-react';
import PollBuilder from './PollBuilder';

export default function CreateAnnouncement({ classroomId, subject, authorName, authorRole, onAnnouncementCreated }) {
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
  const [success, setSuccess] = useState('');
  const [pollEnabled, setPollEnabled] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollAllowMultiple, setPollAllowMultiple] = useState(false);
  const [pollOptions, setPollOptions] = useState(() => [
    { id: `poll-${Date.now()}-1`, text: '' },
    { id: `poll-${Date.now()}-2`, text: '' }
  ]);
  const [pollResponsesEnabled, setPollResponsesEnabled] = useState(true);
  const [pollError, setPollError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setPollError('');
    setLoading(true);

    try {
      const tagsArray = formData.tags
        ? formData.tags.split(',').map(tag => tag.trim()).filter(Boolean)
        : [];

      let pollPayload = null;
      if (pollEnabled) {
        const trimmedQuestion = pollQuestion.trim();
        const cleanedOptions = pollOptions
          .map(option => ({ id: option.id, text: option.text.trim() }))
          .filter(option => option.text.length > 0);

        if (!trimmedQuestion) {
          setPollError('Provide a poll question before posting.');
          throw new Error('Provide a poll question before posting.');
        }
        if (cleanedOptions.length < 2) {
          setPollError('Add at least two answer choices for the poll.');
          throw new Error('Add at least two answer choices for the poll.');
        }

        setPollError('');
        pollPayload = {
          question: trimmedQuestion,
          allowMultiple: pollAllowMultiple,
          isEnabled: pollResponsesEnabled,
          options: cleanedOptions
        };
      }

      const announcementData = {
        title: formData.title,
        content: formData.content,
        authorName,
        authorRole,
        classroomId,
        subject,
        isImportant: formData.isImportant,
        isUrgent: formData.isUrgent,
        isPinned: formData.isPinned,
        tags: tagsArray,
        link: {
          url: formData.linkUrl || '',
          text: formData.linkText || 'View Link'
        },
        ...(pollPayload ? { poll: pollPayload } : {})
      };

      const response = await fetch('/api/announcements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(announcementData)
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to create announcement');
      }

      setSuccess('Announcement posted successfully!');
      setFormData({
        title: '',
        content: '',
        tags: '',
        linkUrl: '',
        linkText: 'View Link',
        isImportant: false,
        isUrgent: false,
        isPinned: false
      });
      setPollEnabled(false);
      setPollQuestion('');
      setPollAllowMultiple(false);
      setPollOptions([
        { id: `poll-${Date.now()}-1`, text: '' },
        { id: `poll-${Date.now()}-2`, text: '' }
      ]);
      setPollResponsesEnabled(true);
      setPollError('');

      if (onAnnouncementCreated) {
        onAnnouncementCreated(result.data);
      }

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'An error occurred while creating the announcement');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Create New Announcement</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="bg-green-50 text-green-900 border-green-200">
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              required
              placeholder="Enter announcement title"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Content *</Label>
            <Textarea
              id="content"
              required
              placeholder="Write your announcement here..."
              value={formData.content}
              onChange={(e) => handleChange('content', e.target.value)}
              rows={5}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">Tags (comma-separated)</Label>
            <Input
              id="tags"
              placeholder="e.g., Assignment, Exam, General"
              value={formData.tags}
              onChange={(e) => handleChange('tags', e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              Available: Assignment, Exam, General, Database, Important, Urgent
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="linkUrl">Link URL (optional)</Label>
              <Input
                id="linkUrl"
                type="url"
                placeholder="https://example.com"
                value={formData.linkUrl}
                onChange={(e) => handleChange('linkUrl', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="linkText">Link Text</Label>
              <Input
                id="linkText"
                placeholder="e.g., View Assignment"
                value={formData.linkText}
                onChange={(e) => handleChange('linkText', e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isImportant"
                checked={formData.isImportant}
                onCheckedChange={(checked) => handleChange('isImportant', checked)}
              />
              <Label htmlFor="isImportant" className="cursor-pointer">Mark as Important</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isUrgent"
                checked={formData.isUrgent}
                onCheckedChange={(checked) => handleChange('isUrgent', checked)}
              />
              <Label htmlFor="isUrgent" className="cursor-pointer">Mark as Urgent</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isPinned"
                checked={formData.isPinned}
                onCheckedChange={(checked) => handleChange('isPinned', checked)}
              />
              <Label htmlFor="isPinned" className="cursor-pointer">Pin to Top</Label>
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
                setPollOptions([
                  { id: `poll-${Date.now()}-1`, text: '' },
                  { id: `poll-${Date.now()}-2`, text: '' }
                ]);
                setPollResponsesEnabled(true);
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

          <Button type="submit" disabled={loading} className="w-full">
            <Send className="mr-2 h-4 w-4" />
            {loading ? 'Posting...' : 'Post Announcement'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

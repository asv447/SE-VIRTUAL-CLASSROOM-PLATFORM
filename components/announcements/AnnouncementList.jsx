"use client";

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Filter, X } from 'lucide-react';
import AnnouncementCard from './AnnouncementCard';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function AnnouncementList({ classroomId, isAdmin = false, currentUser = null }) {
  const [announcements, setAnnouncements] = useState([]);
  const [filteredAnnouncements, setFilteredAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    important: false,
    urgent: false,
    pinned: false
  });

  useEffect(() => {
    if (classroomId) {
      fetchAnnouncements();
    }
  }, [classroomId]);

  useEffect(() => {
    applyFilters();
  }, [announcements, searchQuery, filters]);

  const fetchAnnouncements = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/announcements?classroomId=${classroomId}`);
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to fetch announcements');
      }

      setAnnouncements(result.data || []);
    } catch (err) {
      setError(err.message || 'An error occurred while fetching announcements');
      setAnnouncements([]);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...announcements];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(announcement =>
        announcement.title.toLowerCase().includes(query) ||
        announcement.content.toLowerCase().includes(query) ||
        (announcement.tags && announcement.tags.some(tag => tag.toLowerCase().includes(query)))
      );
    }

    // Apply boolean filters
    if (filters.important) {
      filtered = filtered.filter(announcement => announcement.isImportant);
    }
    if (filters.urgent) {
      filtered = filtered.filter(announcement => announcement.isUrgent);
    }
    if (filters.pinned) {
      filtered = filtered.filter(announcement => announcement.isPinned);
    }

    setFilteredAnnouncements(filtered);
  };

  const toggleFilter = (filterName) => {
    setFilters(prev => ({ ...prev, [filterName]: !prev[filterName] }));
  };

  const clearFilters = () => {
    setSearchQuery('');
    setFilters({ important: false, urgent: false, pinned: false });
  };

  const handleAnnouncementUpdate = (updatedAnnouncement) => {
    setAnnouncements(prev =>
      prev.map(a => a.id === updatedAnnouncement.id ? updatedAnnouncement : a)
    );
  };

  const handleAnnouncementDelete = (deletedId) => {
    setAnnouncements(prev => prev.filter(a => a.id !== deletedId));
  };

  const hasActiveFilters = searchQuery.trim() || filters.important || filters.urgent || filters.pinned;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search announcements..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={filters.important ? "default" : "outline"}
            size="sm"
            onClick={() => toggleFilter('important')}
          >
            <Filter className="h-4 w-4 mr-2" />
            Important
          </Button>
          <Button
            variant={filters.urgent ? "default" : "outline"}
            size="sm"
            onClick={() => toggleFilter('urgent')}
          >
            <Filter className="h-4 w-4 mr-2" />
            Urgent
          </Button>
          <Button
            variant={filters.pinned ? "default" : "outline"}
            size="sm"
            onClick={() => toggleFilter('pinned')}
          >
            <Filter className="h-4 w-4 mr-2" />
            Pinned
          </Button>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="h-4 w-4 mr-2" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Announcements Count */}
      <div className="text-sm text-muted-foreground">
        {filteredAnnouncements.length} announcement{filteredAnnouncements.length !== 1 ? 's' : ''}
        {hasActiveFilters && ` (filtered from ${announcements.length})`}
      </div>

      {/* Announcements Grid */}
      <div className="space-y-4">
        {filteredAnnouncements.length > 0 ? (
          filteredAnnouncements.map((announcement) => (
            <AnnouncementCard
              key={announcement.id}
              announcement={announcement}
              isAdmin={isAdmin}
              onUpdate={handleAnnouncementUpdate}
              onDelete={handleAnnouncementDelete}
              currentUser={currentUser}
            />
          ))
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            {hasActiveFilters 
              ? 'No announcements match your search or filters.'
              : 'No announcements posted yet.'}
          </div>
        )}
      </div>
    </div>
  );
}

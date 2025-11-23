'use client';
import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function GroupPage() {
  const { id, groupId } = useParams(); // id = class id, groupId = group id
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!groupId) return;
    const fetchGroup = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/groups/${encodeURIComponent(groupId)}`);
        if (!res.ok) throw new Error('Failed to fetch group');
        const data = await res.json();
        setGroup(data.group || data);
      } catch (err) {
        console.error(err);
        setGroup(null);
      } finally {
        setLoading(false);
      }
    };
    fetchGroup();
  }, [groupId]);

  if (loading) return <p className="text-center mt-6">Loading group...</p>;
  if (!group) return <p className="text-center mt-6 text-muted-foreground">Group not found.</p>;

  return (
    <div className="min-h-screen px-6 py-8 flex justify-center">
      <div className="w-full max-w-3xl">
        <Card className="border border-border">
          <CardHeader>
            <CardTitle>{group.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4"><strong>Representative:</strong> {group.representative?.name || '—'}</p>
            <div className="mb-4">
              <strong>Members ({(group.members || []).length}):</strong>
              <ul className="mt-2 space-y-2">
                {(group.members || []).map((m) => (
                  <li key={m.userId} className="flex items-center justify-between">
                    <span>{m.name}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex gap-2">
              <Button asChild variant="outline"><a href={`/classroom/${id}`}>Back to Class</a></Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
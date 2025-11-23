"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Star } from "lucide-react";
import dynamic from 'next/dynamic';

const GroupEditControls = dynamic(
  () => import('../../../../../components/group-edit/GroupEditControls.jsx'),
  { ssr: false }
);

export default function GroupDetailsPage(props) {
  const params = useParams();
  const { id: courseId, groupId } = params; 

  const { currentUserRole, allStudents } = props;

  // FIX 1: Defined 'group' state (singular) to match your logic
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (groupId) {
      const fetchGroupDetails = async () => {
        try {
          setLoading(true);
          const res = await fetch(`/api/groups/${groupId}`);
          
          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || "Failed to load group details");
          }
          
          const data = await res.json();
          
          // FIX 2: Check if data is wrapped in { group: ... } or returned directly
          const groupData = data.group || data;
          
          // FIX 3: Use the correct setter 'setGroup'
          setGroup(groupData);
        } catch (err) {
          console.error("Fetch error:", err);
          setError(err.message);
        } finally {
          setLoading(false);
        }
      };
      fetchGroupDetails();
    }
  }, [groupId]);

  if (loading) {
    return <p className="text-center text-muted-foreground mt-10">Loading group...</p>;
  }
  if (error) {
    return <p className="text-center text-destructive mt-10">{error}</p>;
  }
  if (!group) {
    return <p className="text-center text-muted-foreground mt-10">Group not found.</p>;
  }

  return (
    <div className="min-h-screen bg-background text-foreground px-6 py-10 flex justify-center">
      <div className="w-full max-w-3xl space-y-8">
        <h1 className="text-3xl font-semibold text-foreground">{group.name}</h1>

        <Card className="border border-border bg-card shadow-sm">
          <CardHeader>
            <CardTitle className="text-foreground">Group Representative</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Star className="w-6 h-6 text-amber-500" />
              <span className="font-medium text-lg text-foreground">
                {/* FIX 4: Safe navigation in case representative is missing */}
                {group.representative?.name || "Unknown"}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card shadow-sm">
          <CardHeader>
            <CardTitle className="text-foreground">Members ({group.members?.length || 0})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {group.members && group.members.map((member) => (
              <div key={member.userId} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-lg font-semibold">
                  {member.name ? member.name[0].toUpperCase() : "S"}
                </div>
                <span className="font-medium text-foreground">
                   {/* FIX 5: Fallback for missing member names */}
                  {member.name || "Unknown Member"}
                </span>
                {group.representative && member.userId === group.representative.userId && (
                  <span className="text-xs font-semibold text-amber-600">
                    (Representative)
                  </span>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {currentUserRole === 'instructor' && (
          <div className="mt-3">
            <GroupEditControls group={group} allStudents={allStudents} currentUserRole={currentUserRole} />
          </div>
        )}
      </div>
    </div>
  );
}
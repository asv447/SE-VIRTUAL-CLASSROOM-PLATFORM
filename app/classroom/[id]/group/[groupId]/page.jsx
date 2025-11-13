// app/classroom/[id]/group/[groupId]/page.jsx

"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { User, Star } from "lucide-react";

export default function GroupDetailsPage() {
  const params = useParams();
  const { id: courseId, groupId } = params; // Rename id to courseId for clarity

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
          setGroup(data);
        } catch (err) {
          setError(err.message);
        } finally {
          setLoading(false);
        }
      };
      fetchGroupDetails();
    }
  }, [groupId]);

  if (loading) {
    return <p className="text-center text-gray-500 mt-10">Loading group...</p>;
  }
  if (error) {
    return <p className="text-center text-red-500 mt-10">{error}</p>;
  }
  if (!group) {
    return <p className="text-center text-gray-500 mt-10">Group not found.</p>;
  }

  return (
    <div className="min-h-screen bg-white text-black px-6 py-10 flex justify-center">
      <div className="w-full max-w-3xl space-y-8">
        <h1 className="text-3xl font-semibold">{group.name}</h1>

        <Card>
          <CardHeader>
            <CardTitle>Group Representative</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Star className="w-6 h-6 text-yellow-500" />
              <span className="font-medium text-lg">
                {group.representative.name}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Members ({group.members.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {group.members.map((member) => (
              <div key={member.userId} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-500 text-white flex items-center justify-center text-lg font-semibold">
                  {member.name ? member.name[0].toUpperCase() : "S"}
                </div>
                <span className="font-medium text-gray-800">
                  {member.name}
                </span>
                {member.userId === group.representative.userId && (
                  <span className="text-xs font-semibold text-yellow-600">
                    (Representative)
                  </span>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
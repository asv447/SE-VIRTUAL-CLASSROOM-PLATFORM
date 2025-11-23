import { useState } from "react";
import PropTypes from "prop-types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function CreateCourseForm({ instructor }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [subject, setSubject] = useState("");
  const [creating, setCreating] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();

    setCreating(true);
    try {
      const res = await fetch("/api/courses/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, instructor, subject }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast({
          title: "Course creation failed",
          description: data?.message || `Server responded with ${res.status}`,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Course created",
        description: `Share this code with students: ${data?.course?.courseCode}`,
      });

      setTitle("");
      setDescription("");
      setSubject("");
    } catch (error) {
      toast({
        title: "Course creation failed",
        description: error.message || "Unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        type="text"
        placeholder="Course Name"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
      />
      <Input
        type="text"
        placeholder="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        required
      />
      <Input
        type="text"
        placeholder="Subject"
        value={subject}
        onChange={(e) => setSubject(e.g.value)}
        required
      />
      <Button type="submit" disabled={creating} className="w-full sm:w-auto">
        {creating ? "Creating..." : "Create Course"}
      </Button>
    </form>
  );
}

CreateCourseForm.propTypes = {
  instructor: PropTypes.string.isRequired,
};

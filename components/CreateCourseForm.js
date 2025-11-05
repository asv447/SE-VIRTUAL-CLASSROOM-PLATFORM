// components/CreateCourseForm.js
import { useState } from "react";

export default function CreateCourseForm({ instructor }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [subject, setSubject] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    const res = await fetch("/api/courses/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description, instructor, subject }),
    });

    const data = await res.json();
    if (res.ok) {
      alert("Course created! Code: " + data.course.courseCode);
      setTitle("");
      setDescription("");
      setSubject("");
    } else {
      alert("Error: " + data.message);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Course Name"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
      />
      <input
        type="text"
        placeholder="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        required
      />
      <input
        type="text"
        placeholder="Subject"
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        required
      />
      <button type="submit">Create Course</button>
    </form>
  );
}


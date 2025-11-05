// pages/api/courses/create.js
import { getCoursesCollection } from "../../../lib/mongodb";
import { generateCourseCode } from "../../../utils/generateCourseCode";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { title, description, instructor, subject } = req.body;

    if (!title || !description || !instructor || !subject) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const courseCode = generateCourseCode(instructor, subject);

    const coursesCollection = await getCoursesCollection();
    const newCourse = {
      title,
      description,
      instructor,
      subject,
      courseCode,
    };

    await coursesCollection.insertOne(newCourse);

    res.status(201).json({ message: "Course created successfully", course: newCourse });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
}

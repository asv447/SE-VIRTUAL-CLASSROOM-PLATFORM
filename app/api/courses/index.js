// pages/api/courses/index.js
import { getCoursesCollection } from "../../../lib/mongodb";

export default async function handler(req, res) {
  try {
    const coursesCollection = await getCoursesCollection();
    const courses = await coursesCollection
      .find({})
      .project({ title: 1, description: 1, instructor: 1 })
      .toArray();

    res.status(200).json(courses);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
}

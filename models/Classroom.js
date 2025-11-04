import mongoose from "mongoose";

const ClassroomSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    instructor: { type: String, required: true },
    classId: { type: String, required: true, unique: true },
    posts: [
      {
        content: String,
        createdAt: { type: Date, default: Date.now },
      },
    ],
    assignments: [
      {
        title: String,
        description: String,
        deadline: Date,
      },
    ],
    chat: [
      {
        user: String,
        message: String,
        timestamp: { type: Date, default: Date.now },
      },
    ],
    people: [String],
  },
  { timestamps: true }
);

export default mongoose.models.Classroom ||
  mongoose.model("Classroom", ClassroomSchema);

import mongoose from 'mongoose';

const postSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  type: { type: String, required: true }, 
  title: { type: String, required: true },
  author: { name: { type: String, required: true } },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  dueDate: Date, 
  chats: [{
    author: { name: { type: String, required: true } },
    text: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
  }]
});

const classroomSchema = new mongoose.Schema({
  _id: { type: String, required: true }, 
  subjectName: { type: String, required: true },
  courseCode: { type: String, required: true },
  professor: {
    _id: String,
    name: { type: String, required: true },
    email: { type: String, required: true }
  },
  classCode: { type: String, required: true },
  students: [{
    _id: String,
    name: { type: String, required: true },
    email: { type: String, required: true }
  }],
  posts: [postSchema],
  classroomChat: [{
    author: { name: { type: String, required: true } },
    text: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

export default mongoose.models.Classroom || mongoose.model('Classroom', classroomSchema);
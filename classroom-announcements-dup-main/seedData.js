const mongoose = require('mongoose');
const Announcement = require('./models/Announcements');

const sampleAnnouncements = [
  {
    title: "Mid-term Exam Schedule",
    content: "The mid-term examination for IT-314 will be conducted on October 25th, 2025 at 2:00 PM. Please bring your student ID and required materials.",
    authorName: "Prof. Rajesh Kumar",
    authorRole: "Professor",
    classroomId: "IT-314",
    subject: "Software Engineering",
    isImportant: true,
    isUrgent: true,
    isPinned: true,
    tags: ["Exam", "Important", "Urgent"],
    link: {
      url: "/exam/mid-term-it314",
      text: "View Exam Details"
    },
    editHistory: []
  },
  {
    title: "Assignment 3 Released",
    content: "Assignment 3 on Database Design is now available. Due date is November 1st, 2025. Please submit through the course portal.",
    authorName: "TA Sarah",
    authorRole: "TA",
    classroomId: "IT-314",
    subject: "Software Engineering",
    isImportant: false,
    isUrgent: false,
    isPinned: false,
    tags: ["Assignment", "Database"],
    link: {
      url: "/assignments/assignment-3",
      text: "View Assignment"
    },
    editHistory: []
  },
  {
    title: "Welcome to the Course",
    content: "All course materials and future announcements will be posted here. Please check regularly for updates.",
    authorName: "Saurabh Tiwari",
    authorRole: "Instructor",
    classroomId: "IT-314",
    subject: "Software Engineering",
    isImportant: false,
    isUrgent: false,
    isPinned: false,
    tags: ["General"],
    link: {
      url: "/classroom/IT-314",
      text: "Go to Classroom"
    },
    editHistory: []
  }
];

const seedDatabase = async () => {
  const logger = require('./utils/logger');
  try {
    await mongoose.connect('mongodb://localhost:27017/announcement-system');
    
    const count = await Announcement.countDocuments();
    
    if (count === 0) {
      await Announcement.insertMany(sampleAnnouncements);
      logger.info('Sample data inserted successfully (first time only)');
    } else {
      logger.info(`Database already has ${count} announcements. Skipping seed.`);
    }
    
    process.exit(0);
  } catch (error) {
    logger.error('Error seeding database:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  seedDatabase();
}

module.exports = sampleAnnouncements;

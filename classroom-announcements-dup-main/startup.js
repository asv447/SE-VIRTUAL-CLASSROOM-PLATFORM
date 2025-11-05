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

async function initializeDatabase() {
  const logger = require('./utils/logger');
  try {
    logger.info('Initializing database...');
    await mongoose.connect('mongodb://localhost:27017/announcement-system', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    logger.info('MongoDB connected');

    const count = await Announcement.countDocuments();
    
    if (count === 0) {
      logger.info('Database is empty. Seeding initial data...');
      await Announcement.insertMany(sampleAnnouncements);
      logger.info('Initial sample data inserted successfully');
    } else {
      logger.info(`Database already contains ${count} announcements`);
    }

    await mongoose.connection.close();
    logger.info('Database initialization complete');
    process.exit(0);
  } catch (error) {
    logger.error('Error during initialization:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  initializeDatabase();
}

module.exports = initializeDatabase;

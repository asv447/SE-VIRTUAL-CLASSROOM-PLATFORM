/**
 * Simple script to insert sample notifications for testing.
 * Usage (Windows cmd.exe):
 * set MONGODB_URI="your-uri" && node scripts\seed-notifications.js <userId>
 */
const { MongoClient } = require('mongodb');

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('Please set MONGODB_URI env var');
    process.exit(1);
  }
  const userId = process.argv[2];
  if (!userId) {
    console.error('Usage: node scripts/seed-notifications.js <userId>');
    process.exit(1);
  }

  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db();
    const col = db.collection('notifications');
    const docs = [
      { userId, title: 'Welcome', message: 'Welcome to Classync!', read: false, createdAt: new Date() },
      { userId, title: 'Assignment posted', message: 'A new assignment was posted.', read: false, createdAt: new Date(Date.now() - 1000*60*60) },
      { userId, title: 'Reminder', message: 'Don\'t forget to submit your work.', read: true, createdAt: new Date(Date.now() - 1000*60*60*24) }
    ];
    const result = await col.insertMany(docs);
    console.log('Inserted notifications:', result.insertedCount);
  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
}

main();

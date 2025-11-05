# Testing Notifications

This guide explains how to test the notification system using the provided seed script and API endpoints.

## Prerequisites

- MongoDB URI (in `.env.local` or as environment variable)
- Node.js installed
- Next.js dev server for API testing

## 1. Seed Test Notifications

Use the seed script to insert sample notifications for a user:

```cmd
# If MONGODB_URI is in .env.local:
node scripts\seed-notifications.js <userId>

# Or set MONGODB_URI manually:
set MONGODB_URI=your-mongo-uri && node scripts\seed-notifications.js <userId>
```

The script will insert 3 sample notifications:

- Welcome message (unread)
- Assignment posted notification (unread)
- Reminder (read)

## 2. Test Via UI

1. Start the development server:

```cmd
npm run dev
```

2. Open http://localhost:3000 in your browser
3. Sign in with the user account matching the userId you used for seeding
4. Click the notification bell icon in the top navigation
5. You should see the seeded notifications
6. Test these features:
   - Click ✓ to mark a notification as read
   - Click 🗑️ to delete a notification
   - Click "Mark all as read" to mark all notifications as read

## 3. Test Via API

### Get Notifications

```cmd
curl "http://localhost:3000/api/notifications?uid=<userId>"
```

### Mark as Read

```cmd
curl -X PATCH "http://localhost:3000/api/notifications" ^
  -H "Content-Type: application/json" ^
  -d "{\"id\":\"<notificationId>\"}"
```

### Delete Notification

```cmd
curl -X DELETE "http://localhost:3000/api/notifications" ^
  -H "Content-Type: application/json" ^
  -d "{\"id\":\"<notificationId>\"}"
```

### Mark All as Read

```cmd
curl -X PATCH "http://localhost:3000/api/notifications" ^
  -H "Content-Type: application/json" ^
  -d "{\"action\":\"markAll\",\"uid\":\"<userId>\"}"
```

## Expected Behaviors

1. After seeding:

   - Database should have 3 new notifications
   - 2 notifications should be unread
   - 1 notification should be read

2. UI interactions:

   - Clicking ✓ marks notification as read (disappears from unread count)
   - Clicking 🗑️ removes notification from list and database
   - "Mark all as read" updates all notifications to read state

3. Database effects:
   - DELETE removes the notification document completely
   - PATCH updates the read status and adds readAt timestamp
   - GET filters by userId and sorts by createdAt descending

## Troubleshooting

1. If seed script fails:

   - Ensure MONGODB_URI is set correctly
   - Check MongoDB connection is accessible
   - Verify database permissions

2. If API calls fail:

   - Ensure Next.js dev server is running
   - Check browser console for errors
   - Verify notification IDs exist in database

3. If UI doesn't update:
   - Check browser console for API errors
   - Verify user authentication state
   - Try refreshing the notifications list

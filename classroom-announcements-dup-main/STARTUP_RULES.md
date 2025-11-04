# 🚀 Synchronized Announcement System - Startup Rules

## 1️⃣ First Time Setup (After Installing MongoDB & Dependencies)

1. **Start MongoDB**
   - Open a terminal and run:
     ```powershell
     mongod
     ```
   - Wait for: `[initandlisten] waiting for connections on port 27017`
   - **Keep this terminal open during your session!**

2. **Seed Initial Data (Only ONCE)**
   - Open a second terminal, navigate to your backend folder, and run:
     ```powershell
     cd c:\IT314_announcement_ClassSync\synchronized_announcement\backend
     npm run seed
     ```
   - Wait for confirmation that data was seeded.
   - **Do NOT run this again unless you want to reset your data!**

3. **Start the Backend Server**
   - In the same terminal, run:
     ```powershell
     npm run dev
     ```
   - Wait for: `Server running on port 5000`

4. **Open Frontends in Browser**
   - Faculty: `frontend_faculty/index.html`
   - Student: `frontend_student/index.html`

---

## 2️⃣ Starting Server After Laptop Restart (New Session)

1. **Start MongoDB**
   - Open a terminal and run:
     ```powershell
     mongod
     ```
   - Wait for: `[initandlisten] waiting for connections on port 27017`
   - **Keep this terminal open!**

2. **Start the Backend Server**
   - Open a second terminal, navigate to your backend folder, and run:
     ```powershell
     cd c:\IT314_announcement_ClassSync\synchronized_announcement\backend
     npm run dev
     ```
   - Wait for: `Server running on port 5000`

3. **Open Frontends in Browser**
   - Faculty: `frontend_faculty/index.html`
   - Student: `frontend_student/index.html`

---

## 3️⃣ Restarting Backend Multiple Times During a Session

- If you stop the backend server (Terminal 1) but MongoDB (Terminal 2) is still running:
  - Just run:
    ```powershell
    npm run dev
    ```
  - No need to restart MongoDB.
  - Your data will persist as long as MongoDB is running.

---

## 📝 Key Rules

- **Run `npm run seed` only ONCE for initial setup.**
- **Always start MongoDB (`mongod`) before starting the backend server.**
- **Keep the MongoDB terminal open during your session.**
- **Use `npm run dev` to start the backend server.**
- **Your data will persist across server restarts as long as MongoDB is running.**
- **Restarting the backend server during a session does NOT require reseeding or restarting MongoDB.**

---

## 🆘 Troubleshooting

- If announcements disappear after restart, check if you ran `npm run seed` more than once (it resets data).
- If you see a MongoDB connection error, make sure `mongod` is running.
- If port 5000 is busy, change the port in `.env` or close other processes using it.

---

**Follow these rules for smooth, persistent operation of your announcement system!**

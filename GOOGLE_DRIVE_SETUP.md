# Google Drive Storage Setup Guide

## ✅ Current Implementation

ClassSync now stores announcement attachments in **Google Drive** using OAuth 2.0 credentials (your personal Google account). Files are uploaded to a folder you own and are exposed to students via “Open” and “Download” buttons.

---

## 🔧 What Was Added

- `lib/google-drive.js` – OAuth-based helpers (upload/delete metadata)
- `app/api/files/upload/route.js` – Upload API (unchanged interface)
- `app/classroom/[id]/page.jsx` – UI buttons for open/download
- `scripts/generate-google-drive-refresh-token.js` – CLI helper to obtain refresh token
- `.env.local` – stores OAuth credentials and folder ID

---

## 🪜 Setup Checklist

1. Configure OAuth consent screen (External)
2. Create OAuth client credentials (Desktop app)
3. Generate a refresh token (run helper script once)
4. Create a Drive folder and copy its ID
5. Fill all values in `.env.local`
6. Restart `npm run dev` and test an upload

---

## 1️⃣ OAuth Consent Screen

1. Go to https://console.cloud.google.com/apis/credentials?project=classsync-storage
2. In sidebar choose **OAuth consent screen**
3. User type → **External**
4. App name `ClassSync Drive Uploader`
5. User support email → your Gmail
6. Developer contact email → your Gmail
7. Leave scopes default (Drive scope added later by auth URL)
8. Add your Gmail under “Test users”
9. Save

---

## 2️⃣ Create OAuth Client (Desktop)

1. Still on the credentials page, click **Create credentials → OAuth client ID**
2. Application type: **Desktop app**
3. Name: `ClassSync Desktop Client` (any name)
4. Copy the generated **Client ID** and **Client secret**
5. Add to `.env.local`:
   ```env
   GOOGLE_CLIENT_ID=YOUR_CLIENT_ID
   GOOGLE_CLIENT_SECRET=YOUR_CLIENT_SECRET
   ```

---

## 3️⃣ Generate Refresh Token

The server needs an offline refresh token for Drive access.

1. Ensure the two variables above are saved in `.env.local`
2. Run the helper script:
   ```powershell
   node scripts/generate-google-drive-refresh-token.js
   ```
3. Open the printed URL, choose your Google account, grant Drive access
4. Copy the auth code shown after approval
5. Paste the code back into the terminal prompt
6. Script prints a refresh token – add to `.env.local`:
   ```env
   GOOGLE_REFRESH_TOKEN=PASTE_REFRESH_TOKEN_HERE
   ```

> Treat the refresh token like a password. Keep `.env.local` out of source control.

---

## 4️⃣ Prepare Google Drive Folder

1. Visit https://drive.google.com/
2. Create folder (e.g. `ClassSync-Materials`)
3. Copy folder ID from the URL (`https://drive.google.com/drive/folders/<ID>`)
4. Add to `.env.local`:
   ```env
   GOOGLE_DRIVE_FOLDER_ID=<YOUR_FOLDER_ID>
   ```
5. Optional – share folder with other instructors for manual management

---

## 5️⃣ Verify `.env.local`

```
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REFRESH_TOKEN=...
GOOGLE_DRIVE_FOLDER_ID=1cEpN2XqObqfcld4o9DZWE47FK7FV-ONY
```

Restart after changes:
```powershell
npm run dev
```

---

## 🧪 Test Upload Flow

1. Open `http://localhost:3000/classroom/[classId]`
2. Click **Create Post**
3. Attach a PDF/DOCX (≤ 50 MB)
4. Click **Post**
5. Toast should show “Uploading file to Google Drive…” → “Post created!”
6. Attachment shows two buttons:
   - **Open** – Google Drive viewer (new tab)
   - **Download** – Direct download
7. Verify as student – both buttons work without additional login

---

## �️ Troubleshooting

| Symptom | Fix |
| --- | --- |
| `Missing Google Drive OAuth credentials` | Ensure all four variables exist in `.env.local` |
| `invalid_grant` while running script | Make sure code is used once and belongs to same client ID |
| Upload error `insufficientPermissions` | Re-run auth flow and grant Drive access |
| Upload error `File size exceeds 50MB` | Reduce size or raise limit in `app/api/files/upload/route.js` |
| Students see 404 on Open/Download | Refresh page; ensure upload completed successfully |

Check `npm run dev` logs for detailed stack traces if issues persist.

---

## � Deployment

When deploying (Vercel/Netlify):
- Add the same four environment variables in the hosting dashboard
- No extra build steps; API route handles uploads server-side

---

## 📁 Relevant Files

```
lib/google-drive.js
app/api/files/upload/route.js
app/classroom/[id]/page.jsx
scripts/generate-google-drive-refresh-token.js
.env.local
```

Need help generating the refresh token or updating credentials? Re-run the helper script or drop the assistant a message. Happy teaching! 🎉

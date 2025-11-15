import { google } from "googleapis";
import { Readable } from "stream";

let cachedDriveClient = null;

const getGoogleDriveClient = () => {
  if (cachedDriveClient) {
    return cachedDriveClient;
  }

  const {
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REFRESH_TOKEN,
  } = process.env;

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN) {
    throw new Error(
      "Missing Google Drive OAuth credentials. Please set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REFRESH_TOKEN."
    );
  }

  try {
    const oauth2Client = new google.auth.OAuth2(
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET
    );

    oauth2Client.setCredentials({ refresh_token: GOOGLE_REFRESH_TOKEN });

    cachedDriveClient = google.drive({
      version: "v3",
      auth: oauth2Client,
    });

    return cachedDriveClient;
  } catch (error) {
    console.error("Error initializing Google Drive OAuth client:", error);
    throw error;
  }
};

const toReadableStream = async (file) => {
  if (!file) return null;

  if (Buffer.isBuffer(file)) {
    return Readable.from(file);
  }

  if (typeof Blob !== "undefined" && file instanceof Blob) {
    const arrayBuffer = await file.arrayBuffer();
    return Readable.from(Buffer.from(arrayBuffer));
  }

  if (file.arrayBuffer) {
    const arrayBuffer = await file.arrayBuffer();
    return Readable.from(Buffer.from(arrayBuffer));
  }

  if (file.stream && typeof file.stream === "function") {
    return file.stream();
  }

  throw new Error("Unsupported file type for Google Drive upload");
};

export async function uploadToGoogleDrive(file, fileName, mimeType) {
  const drive = getGoogleDriveClient();
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

  if (!folderId) {
    throw new Error("Google Drive folder ID is not configured. Please set GOOGLE_DRIVE_FOLDER_ID.");
  }

  const fileStream = await toReadableStream(file);

  const response = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
      mimeType,
    },
    media: {
      mimeType,
      body: fileStream,
    },
    fields: "id, name, mimeType, size, webViewLink, webContentLink",
    supportsAllDrives: true,
  });

  const fileId = response.data.id;

  await drive.permissions.create({
    fileId,
    requestBody: {
      role: "reader",
      type: "anyone",
    },
    supportsAllDrives: true,
  });

  const fileData = await drive.files.get({
    fileId,
    fields: "id, name, mimeType, size, webViewLink, webContentLink",
    supportsAllDrives: true,
  });

  return {
    fileId: fileData.data.id,
    fileName: fileData.data.name,
    fileSize: parseInt(fileData.data.size || "0", 10),
    contentType: fileData.data.mimeType,
    viewLink: fileData.data.webViewLink,
    downloadLink: fileData.data.webContentLink,
  };
}

export async function deleteFromGoogleDrive(fileId) {
  if (!fileId) return;
  try {
    const drive = getGoogleDriveClient();
    await drive.files.delete({
      fileId,
      supportsAllDrives: true,
    });
  } catch (error) {
    console.error("Error deleting from Google Drive:", error);
  }
}

export async function getFileMetadata(fileId) {
  if (!fileId) return null;
  const drive = getGoogleDriveClient();
  const response = await drive.files.get({
    fileId,
    fields: "id, name, mimeType, size, webViewLink, webContentLink",
    supportsAllDrives: true,
  });
  return response.data;
}

import { google } from 'googleapis';
import { Readable } from 'stream';

let cachedDriveClient = null;

// Initialize Google Drive API using OAuth 2.0 credentials
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
      'Missing Google Drive OAuth credentials. Please set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REFRESH_TOKEN.',
    );
  }

  try {
    const oauth2Client = new google.auth.OAuth2(
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
    );

    oauth2Client.setCredentials({ refresh_token: GOOGLE_REFRESH_TOKEN });

    cachedDriveClient = google.drive({
      version: 'v3',
      auth: oauth2Client,
    });

    return cachedDriveClient;
  } catch (error) {
    console.error('Error initializing Google Drive OAuth client:', error);
    throw error;
  }
};

/**
 * Upload a file to Google Drive
 * @param {File|Buffer} file - The file to upload
 * @param {string} fileName - Name of the file
 * @param {string} mimeType - MIME type of the file
 * @returns {Promise<Object>} - File metadata including ID and web URLs
 */
export async function uploadToGoogleDrive(file, fileName, mimeType) {
  try {
    const drive = getGoogleDriveClient();
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

    if (!folderId) {
      throw new Error('Google Drive folder ID is not configured. Please set GOOGLE_DRIVE_FOLDER_ID.');
    }

    // Convert file to stream
    let fileStream;
    if (Buffer.isBuffer(file)) {
      fileStream = Readable.from(file);
    } else if (file instanceof Blob) {
      const arrayBuffer = await file.arrayBuffer();
      fileStream = Readable.from(Buffer.from(arrayBuffer));
    } else {
      throw new Error('Invalid file type');
    }

    // Upload file to Google Drive
    const response = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [folderId],
        mimeType: mimeType,
      },
      media: {
        mimeType: mimeType,
        body: fileStream,
      },
      fields: 'id, name, mimeType, size, webViewLink, webContentLink',
      supportsAllDrives: true,
    });

    const fileId = response.data.id;

    // Make the file publicly accessible (anyone with link can view)
    await drive.permissions.create({
      fileId: fileId,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
      supportsAllDrives: true,
    });

    // Get the updated file with public links
    const fileData = await drive.files.get({
      fileId: fileId,
      fields: 'id, name, mimeType, size, webViewLink, webContentLink',
      supportsAllDrives: true,
    });

    return {
      fileId: fileData.data.id,
      fileName: fileData.data.name,
      fileSize: parseInt(fileData.data.size),
      contentType: fileData.data.mimeType,
      viewLink: fileData.data.webViewLink, // Opens in Google Drive viewer
      downloadLink: fileData.data.webContentLink, // Direct download link
    };
  } catch (error) {
    console.error('Error uploading to Google Drive:', error);
    throw new Error('Failed to upload file to Google Drive');
  }
}

/**
 * Delete a file from Google Drive
 * @param {string} fileId - The Google Drive file ID
 * @returns {Promise<void>}
 */
export async function deleteFromGoogleDrive(fileId) {
  try {
    const drive = getGoogleDriveClient();
    await drive.files.delete({
      fileId,
      supportsAllDrives: true,
    });
  } catch (error) {
    console.error('Error deleting from Google Drive:', error);
    throw new Error('Failed to delete file from Google Drive');
  }
}

/**
 * Get file metadata from Google Drive
 * @param {string} fileId - The Google Drive file ID
 * @returns {Promise<Object>} - File metadata
 */
export async function getFileMetadata(fileId) {
  try {
    const drive = getGoogleDriveClient();
    const response = await drive.files.get({
      fileId: fileId,
      fields: 'id, name, mimeType, size, webViewLink, webContentLink',
      supportsAllDrives: true,
    });
    return response.data;
  } catch (error) {
    console.error('Error getting file metadata:', error);
    throw new Error('Failed to get file metadata');
  }
}

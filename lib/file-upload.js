// lib/file-upload.js - File utilities for MongoDB storage

export const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    try {
      if (file instanceof Buffer) {
        const base64 = file.toString('base64');
        resolve(base64);
      } else if (file.arrayBuffer) {
        file.arrayBuffer().then(buffer => {
          const base64 = Buffer.from(buffer).toString('base64');
          resolve(base64);
        }).catch(reject);
      } else if (file.buffer) {
        const base64 = Buffer.from(file.buffer).toString('base64');
        resolve(base64);
      } else {
        const base64 = Buffer.from(file).toString('base64');
        resolve(base64);
      }
    } catch (error) {
      reject(error);
    }
  });
};

export const prepareFileForStorage = async (file) => {
  if (!file) return null;
  
  try {
    const base64Data = await fileToBase64(file);
    return {
      name: file.name || 'unknown_file',
      size: file.size || 0,
      type: file.type || 'application/octet-stream',
      data: `data:${file.type || 'application/octet-stream'};base64,${base64Data}`,
      uploadedAt: new Date()
    };
  } catch (error) {
    console.error("Error converting file to base64:", error);
    throw error;
  }
};

export const createDownloadUrl = (fileData) => {
  if (!fileData || !fileData.data) return "";
  return fileData.data;
};

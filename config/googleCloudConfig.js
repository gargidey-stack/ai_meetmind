import { Storage } from '@google-cloud/storage';
import path from 'path';

// Google Cloud Storage configuration
const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT_ID;
const BUCKET_NAME = process.env.GOOGLE_CLOUD_BUCKET_NAME;
const KEY_FILE_PATH = process.env.GOOGLE_APPLICATION_CREDENTIALS;

let storage = null;
let bucket = null;

if (PROJECT_ID && BUCKET_NAME) {
  try {
    const storageConfig = {
      projectId: PROJECT_ID,
    };

    // Add keyFilename if provided
    if (KEY_FILE_PATH) {
      storageConfig.keyFilename = KEY_FILE_PATH;
    }

    storage = new Storage(storageConfig);
    bucket = storage.bucket(BUCKET_NAME);
    
    console.log(`Google Cloud Storage configured for project: ${PROJECT_ID}, bucket: ${BUCKET_NAME}`);
  } catch (error) {
    console.error('Error configuring Google Cloud Storage:', error);
  }
} else {
  console.warn('Google Cloud Storage not configured. File uploads will use local storage.');
}

// Helper functions
export const isGCSConfigured = () => {
  return !!(storage && bucket);
};

export const uploadFile = async (file, fileName, folder = 'meetings') => {
  if (!isGCSConfigured()) {
    throw new Error('Google Cloud Storage not configured');
  }

  const filePath = `${folder}/${Date.now()}-${fileName}`;
  const fileUpload = bucket.file(filePath);

  const stream = fileUpload.createWriteStream({
    metadata: {
      contentType: file.mimetype,
    },
    resumable: false,
  });

  return new Promise((resolve, reject) => {
    stream.on('error', (error) => {
      reject(error);
    });

    stream.on('finish', async () => {
      try {
        // Make the file publicly readable (optional)
        // await fileUpload.makePublic();
        
        // Get signed URL for secure access
        const [signedUrl] = await fileUpload.getSignedUrl({
          action: 'read',
          expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
        });

        resolve({
          fileName: filePath,
          publicUrl: `https://storage.googleapis.com/${BUCKET_NAME}/${filePath}`,
          signedUrl: signedUrl,
        });
      } catch (error) {
        reject(error);
      }
    });

    stream.end(file.buffer);
  });
};

export const deleteFile = async (fileName) => {
  if (!isGCSConfigured()) {
    throw new Error('Google Cloud Storage not configured');
  }

  const file = bucket.file(fileName);
  await file.delete();
};

export const getSignedUrl = async (fileName, action = 'read', expiresIn = 7 * 24 * 60 * 60 * 1000) => {
  if (!isGCSConfigured()) {
    throw new Error('Google Cloud Storage not configured');
  }

  const file = bucket.file(fileName);
  const [signedUrl] = await file.getSignedUrl({
    action,
    expires: Date.now() + expiresIn,
  });

  return signedUrl;
};

// Local storage fallback
export const saveFileLocally = async (file, fileName, folder = 'uploads') => {
  const fs = await import('fs');
  const uploadDir = path.join(process.cwd(), folder);
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const filePath = path.join(uploadDir, `${Date.now()}-${fileName}`);
  fs.writeFileSync(filePath, file.buffer);

  return {
    fileName: path.basename(filePath),
    localPath: filePath,
    publicUrl: `/uploads/${path.basename(filePath)}`,
  };
};

export { storage, bucket };
export default { storage, bucket, isGCSConfigured, uploadFile, deleteFile, getSignedUrl, saveFileLocally };

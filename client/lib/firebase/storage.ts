import {
  ref,
  uploadBytes,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  listAll,
  getMetadata,
  updateMetadata,
  UploadTask,
  UploadResult,
  StorageReference,
  FullMetadata,
  UploadMetadata,
} from "firebase/storage";
import { storage } from "./config";

// Upload a file
export const uploadFile = async (
  path: string,
  file: File | Blob,
  metadata?: UploadMetadata
): Promise<UploadResult> => {
  const storageRef = ref(storage, path);
  return await uploadBytes(storageRef, file, metadata);
};

// Upload a file with progress tracking
export const uploadFileWithProgress = (
  path: string,
  file: File | Blob,
  metadata?: UploadMetadata,
  onProgress?: (progress: number) => void,
  onError?: (error: Error) => void,
  onComplete?: (downloadURL: string) => void
): UploadTask => {
  const storageRef = ref(storage, path);
  const uploadTask = uploadBytesResumable(storageRef, file, metadata);

  uploadTask.on(
    "state_changed",
    (snapshot) => {
      const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
      onProgress?.(progress);
    },
    (error) => {
      onError?.(error);
    },
    async () => {
      const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
      onComplete?.(downloadURL);
    }
  );

  return uploadTask;
};

// Get download URL for a file
export const getFileURL = async (path: string): Promise<string> => {
  const storageRef = ref(storage, path);
  return await getDownloadURL(storageRef);
};

// Delete a file
export const deleteFile = async (path: string): Promise<void> => {
  const storageRef = ref(storage, path);
  await deleteObject(storageRef);
};

// List all files in a directory
export const listFiles = async (
  path: string
): Promise<{ items: StorageReference[]; prefixes: StorageReference[] }> => {
  const storageRef = ref(storage, path);
  const result = await listAll(storageRef);
  return {
    items: result.items,
    prefixes: result.prefixes,
  };
};

// Get file metadata
export const getFileMetadata = async (path: string): Promise<FullMetadata> => {
  const storageRef = ref(storage, path);
  return await getMetadata(storageRef);
};

// Update file metadata
export const updateFileMetadata = async (
  path: string,
  metadata: UploadMetadata
): Promise<FullMetadata> => {
  const storageRef = ref(storage, path);
  return await updateMetadata(storageRef, metadata);
};

// Upload multiple files
export const uploadMultipleFiles = async (
  files: File[],
  basePath: string,
  onProgress?: (fileIndex: number, progress: number) => void
): Promise<string[]> => {
  const uploadPromises = files.map((file, index) => {
    return new Promise<string>((resolve, reject) => {
      const path = `${basePath}/${file.name}`;
      uploadFileWithProgress(
        path,
        file,
        undefined,
        (progress) => onProgress?.(index, progress),
        reject,
        resolve
      );
    });
  });

  return await Promise.all(uploadPromises);
};

// Helper function to generate a unique file path
export const generateFilePath = (
  folder: string,
  fileName: string,
  userId?: string
): string => {
  const timestamp = Date.now();
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.]/g, "_");
  return userId
    ? `${folder}/${userId}/${timestamp}_${sanitizedFileName}`
    : `${folder}/${timestamp}_${sanitizedFileName}`;
};

// Helper function to get file extension
export const getFileExtension = (fileName: string): string => {
  return fileName.slice(((fileName.lastIndexOf(".") - 1) >>> 0) + 2);
};

// Helper function to validate file type
export const validateFileType = (
  file: File,
  allowedTypes: string[]
): boolean => {
  return allowedTypes.some((type) => {
    if (type.endsWith("/*")) {
      const category = type.split("/")[0];
      return file.type.startsWith(category);
    }
    return file.type === type;
  });
};

// Helper function to validate file size (size in MB)
export const validateFileSize = (file: File, maxSizeMB: number): boolean => {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return file.size <= maxSizeBytes;
};

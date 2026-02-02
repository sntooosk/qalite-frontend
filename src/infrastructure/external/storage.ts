import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';

import { firebaseStorage } from '../database/firebase';

const sanitizeFileName = (name: string) =>
  name
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9._-]/g, '')
    .toLowerCase();

export const buildStorageFileName = (file: File) => {
  const safeName = sanitizeFileName(file.name);
  const extension = safeName.includes('.') ? safeName.split('.').pop() : '';
  const baseName = safeName.replace(/\.[^/.]+$/, '');
  const timestamp = Date.now();
  return extension ? `${baseName}-${timestamp}.${extension}` : `${baseName}-${timestamp}`;
};

export const uploadFileAndGetUrl = async (path: string, file: File): Promise<string> => {
  const storageRef = ref(firebaseStorage, path);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
};

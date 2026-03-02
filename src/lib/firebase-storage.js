/**
 * Firebase Storage helper functions
 * Provides Supabase-compatible storage API using Firebase Storage
 */

import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from './firebase-config';

/**
 * Upload a file to Firebase Storage
 * @param {string} path - Path in storage (e.g., "user-id/filename.jpg")
 * @param {File} file - File to upload
 * @param {string} bucket - Bucket name (default: 'attachments')
 * @returns {Promise<{data: object|null, error: Error|null}>}
 */
export async function uploadFile(path, file, bucket = 'attachments') {
  try {
    const storageRef = ref(storage, `${bucket}/${path}`);
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    return {
      data: {
        path: snapshot.ref.fullPath,
        fullPath: snapshot.ref.fullPath,
        id: snapshot.ref.name,
        downloadURL
      },
      error: null
    };
  } catch (error) {
    console.error('Firebase Storage upload error:', error);
    return { data: null, error };
  }
}

/**
 * Get public URL for a file
 * @param {string} path - Path in storage
 * @param {string} bucket - Bucket name (default: 'attachments')
 * @returns {Promise<{data: {publicUrl: string}}>}
 */
export async function getPublicUrl(path, bucket = 'attachments') {
  try {
    const storageRef = ref(storage, `${bucket}/${path}`);
    const url = await getDownloadURL(storageRef);
    return { data: { publicUrl: url } };
  } catch (error) {
    console.error('Firebase Storage getPublicUrl error:', error);
    // Return empty URL on error to match Supabase behavior
    return { data: { publicUrl: '' } };
  }
}

/**
 * Delete a file from Firebase Storage
 * @param {string} path - Path in storage
 * @param {string} bucket - Bucket name (default: 'attachments')
 * @returns {Promise<{data: object|null, error: Error|null}>}
 */
export async function deleteFile(path, bucket = 'attachments') {
  try {
    const storageRef = ref(storage, `${bucket}/${path}`);
    await deleteObject(storageRef);
    return { data: { message: 'File deleted successfully' }, error: null };
  } catch (error) {
    console.error('Firebase Storage delete error:', error);
    return { data: null, error };
  }
}

/**
 * Supabase-compatible storage API
 */
export const createStorageClient = () => ({
  from: (bucketName) => ({
    upload: async (path, file) => uploadFile(path, file, bucketName),
    getPublicUrl: (path) => getPublicUrl(path, bucketName),
    remove: async (paths) => {
      // Handle array of paths
      const pathArray = Array.isArray(paths) ? paths : [paths];
      const results = await Promise.all(
        pathArray.map(path => deleteFile(path, bucketName))
      );
      
      // Return first error if any
      const error = results.find(r => r.error)?.error || null;
      return { data: error ? null : { message: 'Files deleted' }, error };
    }
  })
});

export default createStorageClient;

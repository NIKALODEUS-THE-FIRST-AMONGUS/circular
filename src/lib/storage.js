import { getThumbnailUrl, getResponsiveUrls } from './cloudinary';
import { uploadToSupabase } from './supabase-storage';

const FIVE_MB = 5 * 1024 * 1024;

/**
 * Upload any file to the appropriate storage provider
 * Uses Cloudinary for small files/images (< 5MB)
 * Uses Supabase Storage for large files (5MB - 100MB)
 * 
 * @param {File} file - File to upload
 * @param {string} _userId - User ID for organizing files
 * @returns {Promise<{url: string, error: null} | {url: null, error: Error}>}
 */
export async function uploadFile(file, _userId) {
  const isLargeFile = file.size > FIVE_MB;

  if (isLargeFile) {
    console.log(`📤 Uploading LARGE file (${(file.size / (1024 * 1024)).toFixed(1)}MB) to Supabase:`, file.name);
    const { url, error } = await uploadToSupabase(file);
    
    if (error) {
      console.error('Supabase upload error:', error);
      return { url: null, error: error };
    }

    return {
      url,
      provider: 'supabase',
      type: file.type.startsWith('image/') ? 'image' : 'document',
      size: file.size,
      error: null
    };
  }

  try {
    // Get Cloudinary config
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      throw new Error('Cloudinary configuration missing. Please set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET in .env');
    }

    // Determine resource type
    const isImage = file.type.startsWith('image/');
    const resourceType = isImage ? 'image' : 'raw'; // 'raw' for PDFs, docs, etc.

    console.log(`📤 Uploading ${isImage ? 'image' : 'document'} to Cloudinary:`, file.name);

    // Create form data
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);
    formData.append('folder', 'circular-attachments');
    formData.append('tags', 'circular,attachment');

    // Upload to Cloudinary
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`,
      {
        method: 'POST',
        body: formData
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Upload failed');
    }

    const data = await response.json();

    // For images, return optimized URL
    let finalUrl = data.secure_url;
    if (isImage) {
      finalUrl = data.secure_url.replace(
        '/upload/',
        '/upload/q_auto,f_auto/'
      );
    }

    return {
      url: finalUrl,
      publicId: data.public_id,
      originalUrl: data.secure_url,
      thumbnail: isImage ? getThumbnailUrl(finalUrl) : null,
      responsive: isImage ? getResponsiveUrls(finalUrl) : null,
      provider: 'cloudinary',
      type: isImage ? 'image' : 'document',
      format: data.format,
      size: data.bytes,
      resourceType: resourceType,
      error: null
    };
  } catch (error) {
    console.error('Upload error:', error);
    return {
      url: null,
      error: error
    };
  }
}

/**
 * Delete a file from Cloudinary
 * Note: Requires backend API for security (can't delete from frontend directly)
 * @param {string} publicId - Cloudinary public ID
 * @returns {Promise<{success: boolean, error: Error|null}>}
 */
export async function deleteFile(publicId) {
  console.warn('Cloudinary deletion requires backend API. Public ID:', publicId);
  // TODO: Implement backend API endpoint for deletion
  // For now, files remain in Cloudinary (can be cleaned up manually from dashboard)
  return {
    success: false,
    error: new Error('Deletion requires backend API')
  };
}

/**
 * Get optimized image URL
 * @param {string} url - Original URL
 * @param {object} options - Transformation options
 * @returns {string} Optimized URL
 */
export function getOptimizedUrl(url, options = {}) {
  if (!url) return '';
  
  // If it's a Cloudinary URL, apply transformations
  if (url.includes('cloudinary.com')) {
    const { width, height, quality = 'auto' } = options;
    let transforms = [`q_${quality}`, 'f_auto'];
    
    if (width) transforms.push(`w_${width}`);
    if (height) transforms.push(`h_${height}`);
    
    return url.replace('/upload/', `/upload/${transforms.join(',')}/`);
  }
  
  // Return original URL for non-Cloudinary files
  return url;
}

/**
 * Check if URL is an image
 * @param {string} url - File URL
 * @returns {boolean}
 */
export function isImageUrl(url) {
  if (!url) return false;
  
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
  const lowerUrl = url.toLowerCase();
  
  return imageExtensions.some(ext => lowerUrl.includes(ext)) || 
         url.includes('cloudinary.com');
}

/**
 * Get file type from URL
 * @param {string} url - File URL
 * @returns {string} File type ('image', 'pdf', 'document', 'unknown')
 */
export function getFileType(url) {
  if (!url) return 'unknown';
  
  const lowerUrl = url.toLowerCase();
  
  if (isImageUrl(url)) return 'image';
  if (lowerUrl.includes('.pdf')) return 'pdf';
  if (lowerUrl.includes('.doc') || lowerUrl.includes('.docx')) return 'document';
  if (lowerUrl.includes('.xls') || lowerUrl.includes('.xlsx')) return 'spreadsheet';
  
  return 'unknown';
}

export default {
  uploadFile,
  deleteFile,
  getOptimizedUrl,
  isImageUrl,
  getFileType,
  getThumbnailUrl,
  getResponsiveUrls
};

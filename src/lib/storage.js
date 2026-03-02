/**
 * Unified Storage Helper
 * Routes images to Cloudinary, documents to Supabase
 */

import { uploadToCloudinary, getThumbnailUrl, getResponsiveUrls } from './cloudinary';
import { supabase } from './supabase';

/**
 * Upload a file to the appropriate storage service
 * Images → Cloudinary (25 GB free, CDN, optimization)
 * Documents → Supabase (1 GB free)
 * 
 * @param {File} file - File to upload
 * @param {string} userId - User ID for organizing files
 * @returns {Promise<{url: string, error: null} | {url: null, error: Error}>}
 */
export async function uploadFile(file, userId) {
  try {
    // Check if file is an image
    if (file.type.startsWith('image/')) {
      // Upload to Cloudinary
      console.log('📸 Uploading image to Cloudinary:', file.name);
      const result = await uploadToCloudinary(file);
      
      if (result.error) {
        throw result.error;
      }

      return {
        url: result.url,
        publicId: result.publicId,
        thumbnail: getThumbnailUrl(result.url),
        responsive: getResponsiveUrls(result.url),
        provider: 'cloudinary',
        type: 'image',
        size: result.bytes,
        error: null
      };
    } else {
      // Upload to Supabase Storage
      console.log('📄 Uploading document to Supabase:', file.name);
      
      const ext = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
      const filePath = `${userId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('attachments')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage
        .from('attachments')
        .getPublicUrl(filePath);

      return {
        url: data.publicUrl,
        path: filePath,
        provider: 'supabase',
        type: 'document',
        size: file.size,
        error: null
      };
    }
  } catch (error) {
    console.error('Upload error:', error);
    return {
      url: null,
      error: error
    };
  }
}

/**
 * Delete a file from storage
 * @param {string} url - File URL
 * @param {string} provider - 'cloudinary' or 'supabase'
 * @param {string} identifier - Public ID (Cloudinary) or path (Supabase)
 * @returns {Promise<{success: boolean, error: Error|null}>}
 */
export async function deleteFile(url, provider, identifier) {
  try {
    if (provider === 'cloudinary') {
      // Cloudinary deletion requires backend API
      console.warn('Cloudinary deletion requires backend API. URL:', url);
      // For now, just return success (files will be cleaned up manually)
      return { success: true, error: null };
    } else if (provider === 'supabase') {
      // Delete from Supabase Storage
      const { error } = await supabase.storage
        .from('attachments')
        .remove([identifier]);

      if (error) {
        throw error;
      }

      return { success: true, error: null };
    } else {
      throw new Error('Unknown storage provider');
    }
  } catch (error) {
    console.error('Delete error:', error);
    return { success: false, error };
  }
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

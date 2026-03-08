/**
 * Cloudinary Upload Helper
 * Direct upload to Cloudinary without SDK dependencies
 * Works with React 19+
 */

import { retryWithBackoff, isRetryableError } from '../utils/retryWithBackoff';

/**
 * Upload an image to Cloudinary with retry logic
 * @param {File} file - Image file to upload
 * @param {Object} options - Upload options
 * @param {number} options.maxRetries - Maximum retry attempts (default: 3)
 * @param {Function} options.onProgress - Progress callback
 * @returns {Promise<{url: string, error: null} | {url: null, error: Error}>}
 */
export async function uploadToCloudinary(file, options = {}) {
  const { maxRetries = 3, onProgress } = options;

  try {
    // Get Cloudinary config from environment
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      throw new Error('Cloudinary configuration missing. Please set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET in .env');
    }

    // Upload with retry logic
    const data = await retryWithBackoff(
      async () => {
        // Create form data
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', uploadPreset);
        
        // Optional: Add folder organization
        formData.append('folder', 'circular-attachments');
        
        // Optional: Add tags for organization
        formData.append('tags', 'circular,attachment');
        
        // Upload to Cloudinary
        const response = await fetch(
          `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
          {
            method: 'POST',
            body: formData
          }
        );

        if (!response.ok) {
          const error = await response.json();
          const err = new Error(error.error?.message || 'Upload failed');
          err.status = response.status;
          throw err;
        }

        return await response.json();
      },
      {
        maxRetries,
        shouldRetry: isRetryableError,
        onRetry: ({ attempt, maxRetries: max, delay, error }) => {
          console.warn(`Upload retry ${attempt}/${max} after ${delay}ms:`, error.message);
          onProgress?.({ status: 'retrying', attempt, maxRetries: max });
        },
      }
    );

    // Return optimized URL with automatic format, quality, and size limit
    const optimizedUrl = data.secure_url.replace(
      '/upload/',
      '/upload/q_auto:good,f_auto,w_1200,c_limit/'
    );

    return {
      url: optimizedUrl,
      publicId: data.public_id,
      originalUrl: data.secure_url,
      width: data.width,
      height: data.height,
      format: data.format,
      bytes: data.bytes,
      error: null
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    return {
      url: null,
      error: error
    };
  }
}

/**
 * Delete an image from Cloudinary
 * Note: Requires backend API for security (can't delete from frontend directly)
 * @param {string} publicId - Cloudinary public ID
 * @returns {Promise<{success: boolean, error: Error|null}>}
 */
export async function deleteFromCloudinary(publicId) {
  console.warn('Cloudinary deletion requires backend API. Public ID:', publicId);
  // TODO: Implement backend API endpoint for deletion
  return {
    success: false,
    error: new Error('Deletion requires backend API')
  };
}

/**
 * Generate Cloudinary URL with transformations
 * @param {string} publicId - Cloudinary public ID
 * @param {object} options - Transformation options
 * @returns {string} Transformed URL
 */
export function getCloudinaryUrl(publicId, options = {}) {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  
  const {
    width,
    height,
    crop = 'fill',
    quality = 'auto',
    format = 'auto',
    gravity = 'auto'
  } = options;

  let transformations = [];
  
  if (width) transformations.push(`w_${width}`);
  if (height) transformations.push(`h_${height}`);
  if (crop) transformations.push(`c_${crop}`);
  if (quality) transformations.push(`q_${quality}`);
  if (format) transformations.push(`f_${format}`);
  if (gravity) transformations.push(`g_${gravity}`);

  const transformString = transformations.join(',');

  return `https://res.cloudinary.com/${cloudName}/image/upload/${transformString}/${publicId}`;
}

/**
 * Optimize any Cloudinary URL (even existing ones)
 * @param {string} url - Any Cloudinary URL
 * @param {object} options - Transformation options
 * @returns {string} Optimized URL
 */
export function optimizeCloudinaryUrl(url, options = {}) {
  if (!url || !url.includes('cloudinary.com')) return url;
  
  const {
    width = 400,
    height = 400,
    crop = 'fill',
    quality = 'auto:good',
    format = 'auto',
    gravity = 'face'
  } = options;

  // Remove any existing transformations
  const cleanUrl = url.replace(/\/upload\/[^/]+\//, '/upload/');
  
  // Build transformation string
  const transformations = [
    `w_${width}`,
    `h_${height}`,
    `c_${crop}`,
    `q_${quality}`,
    `f_${format}`,
    `g_${gravity}`
  ].join(',');

  return cleanUrl.replace('/upload/', `/upload/${transformations}/`);
}

/**
 * Get thumbnail URL
 * @param {string} url - Original Cloudinary URL
 * @param {number} size - Thumbnail size (default: 150)
 * @returns {string} Thumbnail URL
 */
export function getThumbnailUrl(url, size = 150) {
  if (!url || !url.includes('cloudinary.com')) return url;
  
  return optimizeCloudinaryUrl(url, {
    width: size,
    height: size,
    crop: 'fill',
    quality: 'auto:good',
    format: 'auto',
    gravity: 'face'
  });
}

/**
 * Get responsive image URLs for different screen sizes
 * @param {string} url - Original Cloudinary URL
 * @returns {object} URLs for different sizes
 */
export function getResponsiveUrls(url) {
  if (!url || !url.includes('cloudinary.com')) {
    return {
      thumbnail: url,
      small: url,
      medium: url,
      large: url,
      original: url
    };
  }

  // Remove any existing transformations first
  const cleanUrl = url.replace(/\/upload\/[^/]+\//, '/upload/');

  return {
    thumbnail: cleanUrl.replace('/upload/', '/upload/w_150,h_150,c_fill,q_auto:good,f_auto/'),
    small: cleanUrl.replace('/upload/', '/upload/w_400,h_400,c_limit,q_auto:good,f_auto/'),
    medium: cleanUrl.replace('/upload/', '/upload/w_800,h_800,c_limit,q_auto:good,f_auto/'),
    large: cleanUrl.replace('/upload/', '/upload/w_1200,h_1200,c_limit,q_auto:good,f_auto/'),
    original: url
  };
}

export default {
  uploadToCloudinary,
  deleteFromCloudinary,
  getCloudinaryUrl,
  getThumbnailUrl,
  getResponsiveUrls,
  optimizeCloudinaryUrl
};

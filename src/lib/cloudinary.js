/**
 * Cloudinary Upload Helper
 * Direct upload to Cloudinary without SDK dependencies
 * Works with React 19+
 */

/**
 * Upload an image to Cloudinary
 * @param {File} file - Image file to upload
 * @returns {Promise<{url: string, error: null} | {url: null, error: Error}>}
 */
export async function uploadToCloudinary(file) {
  try {
    // Get Cloudinary config from environment
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      throw new Error('Cloudinary configuration missing. Please set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET in .env');
    }

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
      throw new Error(error.error?.message || 'Upload failed');
    }

    const data = await response.json();

    // Return optimized URL with automatic format and quality
    const optimizedUrl = data.secure_url.replace(
      '/upload/',
      '/upload/q_auto,f_auto/'
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
 * Get thumbnail URL
 * @param {string} url - Original Cloudinary URL
 * @param {number} size - Thumbnail size (default: 150)
 * @returns {string} Thumbnail URL
 */
export function getThumbnailUrl(url, size = 150) {
  if (!url || !url.includes('cloudinary.com')) return url;
  
  return url.replace(
    '/upload/',
    `/upload/w_${size},h_${size},c_fill,q_auto,f_auto/`
  );
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

  return {
    thumbnail: url.replace('/upload/', '/upload/w_150,h_150,c_fill,q_auto,f_auto/'),
    small: url.replace('/upload/', '/upload/w_400,h_400,c_limit,q_auto,f_auto/'),
    medium: url.replace('/upload/', '/upload/w_800,h_800,c_limit,q_auto,f_auto/'),
    large: url.replace('/upload/', '/upload/w_1200,h_1200,c_limit,q_auto,f_auto/'),
    original: url
  };
}

export default {
  uploadToCloudinary,
  deleteFromCloudinary,
  getCloudinaryUrl,
  getThumbnailUrl,
  getResponsiveUrls
};

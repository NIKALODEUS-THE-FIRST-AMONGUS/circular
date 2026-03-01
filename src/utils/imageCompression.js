/**
 * Image compression utility for optimizing uploads
 */

export const compressImage = async (file, options = {}) => {
    const {
        maxWidth = 1920,
        maxHeight = 1080,
        quality = 0.8,
        mimeType = 'image/jpeg'
    } = options;

    // Skip if not an image
    if (!file.type.startsWith('image/')) {
        return file;
    }

    // Skip if already small enough (< 500KB)
    if (file.size < 500 * 1024) {
        return file;
    }

    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            const img = new Image();
            
            img.onload = () => {
                // Calculate new dimensions
                let width = img.width;
                let height = img.height;
                
                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }
                
                if (height > maxHeight) {
                    width = (width * maxHeight) / height;
                    height = maxHeight;
                }
                
                // Create canvas
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                
                const ctx = canvas.getContext('2d');
                
                // Enable image smoothing for better quality
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                
                // Draw image
                ctx.drawImage(img, 0, 0, width, height);
                
                // Convert to blob
                canvas.toBlob(
                    (blob) => {
                        if (!blob) {
                            reject(new Error('Canvas to Blob conversion failed'));
                            return;
                        }
                        
                        // Create new file with compressed blob
                        const compressedFile = new File(
                            [blob],
                            file.name.replace(/\.[^.]+$/, '.jpg'),
                            {
                                type: mimeType,
                                lastModified: Date.now()
                            }
                        );
                        
                        console.log(`📦 Compressed ${file.name}: ${(file.size / 1024).toFixed(0)}KB → ${(compressedFile.size / 1024).toFixed(0)}KB`);
                        
                        resolve(compressedFile);
                    },
                    mimeType,
                    quality
                );
            };
            
            img.onerror = () => {
                reject(new Error('Failed to load image'));
            };
            
            img.src = e.target.result;
        };
        
        reader.onerror = () => {
            reject(new Error('Failed to read file'));
        };
        
        reader.readAsDataURL(file);
    });
};

/**
 * Compress multiple images in parallel
 */
export const compressImages = async (files, options = {}) => {
    const compressionPromises = files.map(file => 
        compressImage(file, options).catch(err => {
            console.error(`Failed to compress ${file.name}:`, err);
            return file; // Return original on error
        })
    );
    
    return Promise.all(compressionPromises);
};

/**
 * Generate thumbnail for preview
 */
export const generateThumbnail = async (file, size = 200) => {
    if (!file.type.startsWith('image/')) {
        return null;
    }

    return new Promise((resolve) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            const img = new Image();
            
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // Calculate thumbnail dimensions (square crop)
                const minDim = Math.min(img.width, img.height);
                
                canvas.width = size;
                canvas.height = size;
                
                // Center crop
                const sx = (img.width - minDim) / 2;
                const sy = (img.height - minDim) / 2;
                
                ctx.drawImage(
                    img,
                    sx, sy, minDim, minDim,
                    0, 0, size, size
                );
                
                resolve(canvas.toDataURL('image/jpeg', 0.7));
            };
            
            img.onerror = () => resolve(null);
            img.src = e.target.result;
        };
        
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(file);
    });
};
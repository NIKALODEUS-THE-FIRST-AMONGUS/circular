import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase credentials missing in .env');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Upload a file to Supabase Storage
 * @param {File} file - The file object to upload
 * @param {string} bucket - The storage bucket name (default: 'documents')
 * @returns {Promise<{url: string, error: any}>}
 */
export const uploadToSupabase = async (file, bucket = 'documents') => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) throw error;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    return { url: publicUrl, error: null };
  } catch (error) {
    console.error('Supabase upload error:', error);
    return { url: null, error };
  }
};

/**
 * Delete a file from Supabase Storage
 * @param {string} url - The public URL of the file
 * @param {string} bucket - The storage bucket name
 */
export const deleteFromSupabase = async (url, bucket = 'documents') => {
  try {
    // Extract file path from URL
    // Format: https://[project].supabase.co/storage/v1/object/public/[bucket]/[filePath]
    const urlParts = url.split(`/public/${bucket}/`);
    if (urlParts.length !== 2) return { error: 'Invalid Supabase URL' };
    
    const filePath = urlParts[1];
    const { error } = await supabase.storage.from(bucket).remove([filePath]);
    return { error };
  } catch (error) {
    console.error('Supabase delete error:', error);
    return { error };
  }
};

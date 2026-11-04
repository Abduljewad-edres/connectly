import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';

// Check if Cloudinary is configured via environment variables
export const isCloudinaryConfigured = () => {
  return Boolean(
    process.env.CLOUDINARY_URL ||
    (process.env.CLOUDINARY_CLOUD_NAME &&
     process.env.CLOUDINARY_API_KEY &&
     process.env.CLOUDINARY_API_SECRET)
  );
};

// Initialize Cloudinary
if (isCloudinaryConfigured()) {
  if (process.env.CLOUDINARY_URL) {
    cloudinary.config();
  } else {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true
    });
  }
  console.log('[Cloudinary] Cloudinary media delivery initialized successfully.');
} else {
  console.log('[Cloudinary] Cloudinary credentials not detected; using local storage with HTTP 206 Range streaming.');
}

/**
 * Upload a video file to Cloudinary with optimized delivery settings
 * @param {string} filePath - Local disk path to uploaded video
 * @param {Object} [options] - Additional options
 * @returns {Promise<Object>} Upload result { url, duration, format, public_id }
 */
export const uploadVideoToCloudinary = async (filePath, options = {}) => {
  if (!isCloudinaryConfigured()) {
    throw new Error('Cloudinary is not configured in environment variables.');
  }

  try {
    const result = await cloudinary.uploader.upload(filePath, {
      resource_type: 'video',
      folder: 'connectly/reels',
      chunk_size: 6000000, // 6MB chunks for large files
      eager_async: true,
      allowed_formats: ['mp4', 'webm', 'mov', 'mkv', 'avi', 'm4v', '3gp'],
      transformation: [
        { quality: 'auto:good' },
        { fetch_format: 'auto' }
      ],
      ...options
    });

    // Clean up local temp file after upload
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (cleanupErr) {
      console.warn('[Cloudinary] Temp file cleanup warning:', cleanupErr.message);
    }

    return {
      success: true,
      url: result.secure_url || result.url,
      duration: Math.round(result.duration || 0),
      format: result.format,
      publicId: result.public_id,
      thumbnailUrl: result.secure_url?.replace(/\.[^/.]+$/, '.jpg') || ''
    };
  } catch (err) {
    console.error('[Cloudinary] Video upload error:', err);
    throw err;
  }
};

/**
 * Upload an image file to Cloudinary with automatic optimization
 * @param {string} filePath - Local disk path to uploaded image
 * @param {Object} [options] - Additional options
 * @returns {Promise<Object>} Upload result { url, publicId }
 */
export const uploadImageToCloudinary = async (filePath, options = {}) => {
  if (!isCloudinaryConfigured()) {
    throw new Error('Cloudinary is not configured in environment variables.');
  }

  try {
    const result = await cloudinary.uploader.upload(filePath, {
      resource_type: 'image',
      folder: options.folder || 'connectly/images',
      transformation: [
        { quality: 'auto:good' },
        { fetch_format: 'auto' }
      ],
      ...options
    });

    // Clean up local temp file after upload
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (_) {}

    return {
      success: true,
      url: result.secure_url || result.url,
      publicId: result.public_id
    };
  } catch (err) {
    console.error('[Cloudinary] Image upload error:', err);
    throw err;
  }
};

/**
 * Robust image storage helper:
 * 1. If Cloudinary is configured, uploads to Cloudinary CDN (permanent cloud URL).
 * 2. If Cloudinary is not configured, converts images <= 2.5MB to persistent base64 Data URLs so they are stored directly in MongoDB Atlas and survive all server restarts/sleeps.
 * 3. Falls back to local disk URL (/uploads/...) for large files.
 * @param {Object} file - Express multer file object
 * @param {string} [folder] - Target folder name
 * @returns {Promise<string>} Persistent Image URL
 */
export const saveImagePermanently = async (file, folder = 'connectly/images') => {
  if (!file) return '';

  // 1. If Cloudinary is configured, use it first
  if (isCloudinaryConfigured()) {
    try {
      const res = await uploadImageToCloudinary(file.path, { folder });
      return res.url;
    } catch (cloudErr) {
      console.warn('[Cloudinary] Image upload failed, falling back to persistent storage:', cloudErr.message);
    }
  }

  // 2. If Cloudinary is not configured or failed, check file size for Data URL persistence in MongoDB
  // Files under 2.5MB can be stored directly as base64 Data URIs in MongoDB Atlas so Render ephemeral resets cannot delete them!
  try {
    if (file.path && fs.existsSync(file.path)) {
      const stats = fs.statSync(file.path);
      if (stats.size <= 2.5 * 1024 * 1024) {
        const buffer = fs.readFileSync(file.path);
        const mimeType = file.mimetype || 'image/jpeg';
        const base64 = buffer.toString('base64');
        const dataUri = `data:${mimeType};base64,${base64}`;
        // Clean up local temp file
        try { fs.unlinkSync(file.path); } catch (_) {}
        return dataUri;
      }
    }
  } catch (dataUriErr) {
    console.warn('[Storage] Base64 data conversion error:', dataUriErr.message);
  }

  // 3. Fallback to local /uploads/
  return `/uploads/${file.filename}`;
};

/**
 * Helper to get optimized Cloudinary video URL (or pass-through local URL)
 * @param {string} rawUrl - Video URL (local path or Cloudinary URL)
 * @returns {string} Optimized URL
 */
export const getOptimizedVideoUrl = (rawUrl) => {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  if (rawUrl.includes('cloudinary.com') && !rawUrl.includes('f_auto,q_auto')) {
    // Inject automatic modern format (AV1/VP9/H264) and auto compression
    return rawUrl.replace('/upload/', '/upload/f_auto,q_auto/');
  }
  return rawUrl;
};


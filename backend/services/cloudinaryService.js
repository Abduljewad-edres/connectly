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

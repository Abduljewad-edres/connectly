import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Ensure environment variables are loaded
dotenv.config();

/**
 * Ultra-resilient Cloudinary credential parser
 * Automatically cleans:
 * - "CLOUDINARY_URL=cloudinary://..." prefix if user copied the full key-value line
 * - Quotes like "cloudinary://..." or 'cloudinary://...'
 * - Trailing or leading whitespace
 * - Separate variables CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
 */
export const getCleanCloudinaryConfig = () => {
  let rawUrl = (process.env.CLOUDINARY_URL || '').trim();

  // Strip enclosing quotes if present
  while (rawUrl.startsWith('"') || rawUrl.startsWith("'")) rawUrl = rawUrl.slice(1);
  while (rawUrl.endsWith('"') || rawUrl.endsWith("'")) rawUrl = rawUrl.slice(0, -1);
  rawUrl = rawUrl.trim();

  // Strip leading "CLOUDINARY_URL=" if user accidentally pasted key name into Render's value field
  if (rawUrl.startsWith('CLOUDINARY_URL=')) {
    rawUrl = rawUrl.slice('CLOUDINARY_URL='.length).trim();
    while (rawUrl.startsWith('"') || rawUrl.startsWith("'")) rawUrl = rawUrl.slice(1);
    while (rawUrl.endsWith('"') || rawUrl.endsWith("'")) rawUrl = rawUrl.slice(0, -1);
    rawUrl = rawUrl.trim();
  }

  if (rawUrl.startsWith('cloudinary://')) {
    const match = rawUrl.match(/^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/);
    if (match) {
      return {
        api_key: match[1].trim(),
        api_secret: match[2].trim(),
        cloud_name: match[3].trim(),
        secure: true
      };
    }
  }

  // Also check separate environment variables
  const cloudName = (process.env.CLOUDINARY_CLOUD_NAME || '').trim().replace(/^["']|["']$/g, '');
  const apiKey = (process.env.CLOUDINARY_API_KEY || '').trim().replace(/^["']|["']$/g, '');
  const apiSecret = (process.env.CLOUDINARY_API_SECRET || '').trim().replace(/^["']|["']$/g, '');

  if (cloudName && apiKey && apiSecret) {
    return {
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true
    };
  }

  return null;
};

/**
 * Configure Cloudinary on-the-fly before every upload
 */
export const ensureCloudinaryConfigured = () => {
  const cfg = getCleanCloudinaryConfig();
  if (cfg) {
    cloudinary.config(cfg);
    return true;
  }
  return false;
};

// Check if Cloudinary is configured via environment variables
export const isCloudinaryConfigured = () => {
  return Boolean(getCleanCloudinaryConfig());
};

// Initialize once at startup if credentials present
if (ensureCloudinaryConfigured()) {
  const cfg = getCleanCloudinaryConfig();
  console.log(`[Cloudinary] Initialized successfully with cloud_name: "${cfg.cloud_name}"`);
} else {
  console.log('[Cloudinary] Cloudinary credentials not detected yet; local fallback active.');
}

/**
 * Upload a video file to Cloudinary with optimized delivery settings
 * @param {string} filePath - Local disk path to uploaded video
 * @param {Object} [options] - Additional options
 * @returns {Promise<Object>} Upload result { url, duration, format, public_id }
 */
export const uploadVideoToCloudinary = async (filePath, options = {}) => {
  if (!ensureCloudinaryConfigured()) {
    throw new Error('Cloudinary is not configured in environment variables.');
  }

  const cfg = getCleanCloudinaryConfig();
  console.log(`[Cloudinary] Uploading video to cloud "${cfg?.cloud_name}": ${path.basename(filePath)}`);

  try {
    const result = await cloudinary.uploader.upload(filePath, {
      resource_type: 'video',
      folder: options.folder || 'connectly/reels',
      chunk_size: 6000000, // 6MB chunks for large files
      ...options
    });

    console.log('[Cloudinary] Video upload success! CDN URL:', result.secure_url || result.url);

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
    console.error('[Cloudinary] Video upload error:', err.message || err);
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
 * Ultra-robust persistent video storage:
 * 1. If Cloudinary credentials are valid, uploads to Cloudinary CDN (permanent streaming URL).
 * 2. If Cloudinary fails (e.g. cloud_name mismatch) or is not configured:
 *    If video is <= 12MB, encodes it as a persistent Base64 Data URI directly in MongoDB Atlas!
 *    MongoDB Atlas is hosted in the cloud and NEVER wiped by Render restarts!
 * 3. Falls back to /uploads/ only for large files > 12MB.
 * @param {Object} file - Express multer file object
 * @param {Object} [options] - Options (folder, duration, etc.)
 * @returns {Promise<{ url: string, duration: number, provider: string }>}
 */
export const saveVideoPermanently = async (file, options = {}) => {
  if (!file) return null;

  // 1. Try Cloudinary CDN first
  if (ensureCloudinaryConfigured()) {
    try {
      const res = await uploadVideoToCloudinary(file.path, options);
      return {
        url: res.url,
        duration: res.duration || 0,
        provider: 'cloudinary'
      };
    } catch (cErr) {
      const cfg = getCleanCloudinaryConfig();
      console.error(`[Cloudinary Video Upload Failed] ${cErr.message}`);
      if (cErr.message && cErr.message.toLowerCase().includes('cloud_name mismatch')) {
        console.error(`[Cloudinary Auth Warning] The Cloud Name '${cfg?.cloud_name}' does not match your API Key '${cfg?.api_key}'. Please check your Cloudinary Dashboard and update CLOUDINARY_URL in Render.`);
      }
    }
  }

  // 2. Persistent MongoDB Atlas Base64 storage for short videos <= 12MB
  try {
    if (file.path && fs.existsSync(file.path)) {
      const stats = fs.statSync(file.path);
      if (stats.size <= 12 * 1024 * 1024) {
        const ext = path.extname(file.originalname || file.filename || '').toLowerCase();
        const mimeMap = {
          '.mp4': 'video/mp4',
          '.webm': 'video/webm',
          '.mov': 'video/quicktime',
          '.mkv': 'video/x-matroska',
          '.m4v': 'video/x-m4v'
        };
        const mimeType = file.mimetype || mimeMap[ext] || 'video/mp4';
        const buffer = fs.readFileSync(file.path);
        const base64 = buffer.toString('base64');
        const dataUri = `data:${mimeType};base64,${base64}`;

        console.log(`[Storage] Short video saved persistently to MongoDB Atlas (${(stats.size / (1024 * 1024)).toFixed(2)} MB). Safe from Render ephemeral restarts!`);

        try { fs.unlinkSync(file.path); } catch (_) {}
        return {
          url: dataUri,
          duration: Number(options.duration) || 0,
          provider: 'database'
        };
      }
    }
  } catch (dbErr) {
    console.error('[Storage] Persistent video encoding error:', dbErr.message);
  }

  // 3. Fallback to local disk (note: ephemeral on Render free tier for files > 12MB)
  return {
    url: `/uploads/${file.filename}`,
    duration: Number(options.duration) || 0,
    provider: 'local'
  };
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


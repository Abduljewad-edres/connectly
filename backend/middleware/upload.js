import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, '..', 'uploads');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname || '').toLowerCase();
  const allowedImageExts = /\.(jpeg|jpg|png|gif|webp|svg|avif|heic|heif)$/i;
  const allowedVideoExts = /\.(mp4|webm|mov|mkv|avi|m4v|3gp|wmv|ogv|flv)$/i;

  const isImageExt = allowedImageExts.test(ext);
  const isVideoExt = allowedVideoExts.test(ext);

  const mime = (file.mimetype || '').toLowerCase();
  const isImageMime = mime.startsWith('image/');
  const isVideoMime = mime.startsWith('video/') || /quicktime|matroska|mp4|webm|avi|x-msvideo/.test(mime);

  // Accept if valid extension OR valid mime type (solves Windows application/octet-stream video uploads)
  if (isImageExt || isVideoExt || isImageMime || isVideoMime) {
    cb(null, true);
  } else {
    cb(new Error('Only image and video files are supported (JPG, PNG, GIF, WEBP, MP4, WEBM, MOV, MKV, AVI).'));
  }
};

export const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB max
  fileFilter
});

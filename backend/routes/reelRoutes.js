import express from 'express';
import { protect, optionalAuth } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import {
  createReel,
  getReelsFeed,
  toggleLikeReel,
  recordReelView,
  shareReel,
  getReelComments,
  addReelComment,
  deleteReel
} from '../controllers/reelController.js';

const router = express.Router();

// Safe upload middleware that catches Multer errors gracefully
const reelMediaUpload = upload.fields([
  { name: 'video', maxCount: 1 },
  { name: 'media', maxCount: 1 }
]);

const handleReelUpload = (req, res, next) => {
  reelMediaUpload(req, res, (err) => {
    if (err) {
      console.error('[Reel Upload Middleware Error]:', err);
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'Uploaded video exceeds the 100MB file size limit.'
        });
      }
      return res.status(400).json({
        success: false,
        message: err.message || 'Failed to upload video file.'
      });
    }

    // Normalize req.file from req.files so createReel can use req.file directly
    if (req.files) {
      if (req.files.video && req.files.video[0]) {
        req.file = req.files.video[0];
      } else if (req.files.media && req.files.media[0]) {
        req.file = req.files.media[0];
      }
    }

    next();
  });
};

router.get('/', optionalAuth, getReelsFeed);
router.post('/', protect, handleReelUpload, createReel);
router.post('/:id/like', protect, toggleLikeReel);
router.post('/:id/view', recordReelView);
router.post('/:id/share', shareReel);
router.get('/:id/comments', getReelComments);
router.post('/:id/comments', protect, addReelComment);
router.delete('/:id', protect, deleteReel);

export default router;

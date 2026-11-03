import express from 'express';
import {
  createPost,
  getFeed,
  getPostById,
  updatePost,
  deletePost,
  toggleBookmark,
  getBookmarkedPosts,
  sharePost,
  reportPost,
  getSuggestions
} from '../controllers/postController.js';
import {
  addComment,
  getComments
} from '../controllers/commentController.js';
import { toggleLike } from '../controllers/likeController.js';
import { protect, optionalAuth } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

const postMediaUpload = upload.fields([
  { name: 'images', maxCount: 10 },
  { name: 'image', maxCount: 10 },
  { name: 'video', maxCount: 1 },
  { name: 'videos', maxCount: 5 },
  { name: 'media', maxCount: 10 }
]);

// Suggestions for hashtags and mentions (autocomplete)
router.get('/suggestions', optionalAuth, getSuggestions);

// Saved / Bookmarked posts (registered before /:id)
router.get('/saved', protect, getBookmarkedPosts);

// Posts CRUD & Feed
router.route('/')
  .post(protect, postMediaUpload, createPost)
  .get(optionalAuth, getFeed);

router.route('/:id')
  .get(optionalAuth, getPostById)
  .put(protect, postMediaUpload, updatePost)
  .delete(protect, deletePost);

// Comments on posts
router.route('/:id/comments')
  .post(protect, addComment)
  .get(optionalAuth, getComments);

// Post interactions: Like, Bookmark, Share, Report
router.post('/:id/like', protect, toggleLike);
router.post('/:id/bookmark', protect, toggleBookmark);
router.post('/:id/share', optionalAuth, sharePost);
router.post('/:id/report', protect, reportPost);

export default router;

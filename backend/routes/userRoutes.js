import express from 'express';
import {
  getUserProfile,
  updateProfile,
  searchUsers,
  updateLanguagePreference
} from '../controllers/userController.js';
import {
  toggleFollow,
  getFollowers,
  getFollowing
} from '../controllers/followController.js';
import { getUserPosts } from '../controllers/postController.js';
import { protect, optionalAuth } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

// Specific routes before param routes
router.get('/search', optionalAuth, searchUsers);
router.put('/preferred-language', protect, updateLanguagePreference);
router.put(
  '/profile',
  protect,
  upload.fields([
    { name: 'profilePicture', maxCount: 1 },
    { name: 'bannerImage', maxCount: 1 }
  ]),
  updateProfile
);

// Follow endpoints per SRS Section 9
router.post('/:id/follow', protect, toggleFollow);
router.get('/:id/followers', optionalAuth, getFollowers);
router.get('/:id/following', optionalAuth, getFollowing);

// User posts endpoint
router.get('/:id/posts', optionalAuth, getUserPosts);

// Single user profile endpoint
router.get('/:id', optionalAuth, getUserProfile);

export default router;


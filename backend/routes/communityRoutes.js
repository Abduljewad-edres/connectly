import express from 'express';
import { protect, optionalAuth } from '../middleware/auth.js';
import {
  getCommunities,
  createCommunity,
  getCommunityDetails,
  toggleJoinCommunity,
  getCommunityPosts,
  createCommunityPost
} from '../controllers/communityController.js';

const router = express.Router();

router.get('/', optionalAuth, getCommunities);
router.post('/', protect, createCommunity);
router.get('/:slug', optionalAuth, getCommunityDetails);
router.post('/:slug/join', protect, toggleJoinCommunity);
router.get('/:slug/posts', optionalAuth, getCommunityPosts);
router.post('/:slug/posts', protect, createCommunityPost);

export default router;


import express from 'express';
import { optionalAuth } from '../middleware/auth.js';
import { getExploreData, searchExplore } from '../controllers/exploreController.js';

const router = express.Router();

router.get('/', optionalAuth, getExploreData);
router.get('/search', optionalAuth, searchExplore);

export default router;


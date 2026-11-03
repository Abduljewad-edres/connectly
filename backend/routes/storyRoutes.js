import express from 'express';
import { protect } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import {
  createStory,
  getFeedStories,
  recordStoryView,
  getStoryViewers,
  reactToStory,
  deleteStory
} from '../controllers/storyController.js';

const router = express.Router();

router.use(protect);

router.get('/', getFeedStories);
router.post('/', upload.single('media'), createStory);
router.post('/:id/view', recordStoryView);
router.get('/:id/viewers', getStoryViewers);
router.post('/:id/react', reactToStory);
router.delete('/:id', deleteStory);

export default router;


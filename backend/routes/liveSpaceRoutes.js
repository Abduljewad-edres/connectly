import express from 'express';
import {
  getLiveSpaces,
  getLiveSpaceById,
  createLiveSpace,
  joinLiveSpace,
  leaveLiveSpace,
  updateParticipantRole,
  endLiveSpace,
  reportLiveSpace
} from '../controllers/liveSpaceController.js';
import { protect, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// Public / Optional feeds
router.get('/', optionalAuth, getLiveSpaces);
router.get('/:id', optionalAuth, getLiveSpaceById);

// Protected actions
router.post('/', protect, createLiveSpace);
router.post('/:id/join', protect, joinLiveSpace);
router.post('/:id/leave', protect, leaveLiveSpace);
router.patch('/:id/participants/:targetUserId/role', protect, updateParticipantRole);
router.post('/:id/end', protect, endLiveSpace);
router.post('/:id/report', protect, reportLiveSpace);

export default router;


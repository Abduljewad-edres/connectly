import express from 'express';
import { protect } from '../middleware/auth.js';
import {
  updatePrivacySettings,
  getFollowRequests,
  respondFollowRequest,
  toggleBlockUser,
  getBlockedUsers,
  createReport,
  changePassword
} from '../controllers/privacyController.js';

const router = express.Router();

router.use(protect);

router.put('/settings', updatePrivacySettings);
router.get('/follow-requests', getFollowRequests);
router.post('/follow-requests/:id/respond', respondFollowRequest);
router.post('/block/:id', toggleBlockUser);
router.get('/blocked', getBlockedUsers);
router.post('/reports', createReport);
router.put('/change-password', changePassword);

export default router;


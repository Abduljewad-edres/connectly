import express from 'express';
import {
  getOpportunities,
  getOpportunityById,
  createOpportunity,
  updateOpportunity,
  deleteOpportunity,
  toggleSaveOpportunity,
  getSavedOpportunities,
  moderateOpportunity,
  reportOpportunity
} from '../controllers/opportunityController.js';
import { protect, optionalAuth, adminOnly } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

// Public / Optional Auth feeds
router.get('/', optionalAuth, getOpportunities);
router.get('/saved', protect, getSavedOpportunities);
router.get('/:id', optionalAuth, getOpportunityById);

// Opportunity publishing and editing (supports optional logo upload)
router.post('/', protect, upload.single('logo'), createOpportunity);
router.put('/:id', protect, upload.single('logo'), updateOpportunity);
router.delete('/:id', protect, deleteOpportunity);

// Interaction endpoints
router.post('/:id/save', protect, toggleSaveOpportunity);
router.post('/:id/report', protect, reportOpportunity);

// Administration & moderation
router.patch('/:id/moderate', protect, adminOnly, moderateOpportunity);

export default router;


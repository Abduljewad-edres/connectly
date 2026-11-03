import express from 'express';
import {
  getSupportedLocations,
  getLocalFeed,
  getDiscoveryEvents,
  getEventById,
  createEvent,
  toggleEventAttendance,
  deleteEvent,
  updateUserLocationPreferences
} from '../controllers/discoveryController.js';
import { protect, optionalAuth } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

// Public metadata & feeds
router.get('/locations', getSupportedLocations);
router.get('/feed', optionalAuth, getLocalFeed);
router.get('/events', optionalAuth, getDiscoveryEvents);
router.get('/events/:id', optionalAuth, getEventById);

// Authenticated actions
router.post('/events', protect, upload.single('coverImage'), createEvent);
router.post('/events/:id/attend', protect, toggleEventAttendance);
router.delete('/events/:id', protect, deleteEvent);
router.put('/preferences', protect, updateUserLocationPreferences);

export default router;


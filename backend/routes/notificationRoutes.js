import express from 'express';
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  getNotificationSettings,
  updateNotificationSettings
} from '../controllers/notificationController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect); // All notification endpoints require authentication

// Settings routes (registered before param routes)
router.route('/settings')
  .get(getNotificationSettings)
  .put(updateNotificationSettings);

router.route('/read-all')
  .put(markAllNotificationsRead);

router.route('/')
  .get(getNotifications);

router.route('/:id/read')
  .put(markNotificationRead);

router.route('/:id')
  .delete(deleteNotification);

export default router;


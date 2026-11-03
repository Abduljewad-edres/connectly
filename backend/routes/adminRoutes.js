import express from 'express';
import { protect, adminOnly } from '../middleware/auth.js';
import {
  getAdminDashboardStats,
  getAdminUsers,
  updateUserStatus,
  getAdminReports,
  resolveReport,
  getAdminVerifications,
  reviewVerification,
  getAdminAuditLogs,
  deletePostAdmin
} from '../controllers/adminController.js';

const router = express.Router();

// All routes require authentication and Admin role
router.use(protect, adminOnly);

router.get('/stats', getAdminDashboardStats);
router.get('/users', getAdminUsers);
router.put('/users/:id/status', updateUserStatus);
router.get('/reports', getAdminReports);
router.post('/reports/:id/resolve', resolveReport);
router.get('/verifications', getAdminVerifications);
router.post('/verifications/:id/review', reviewVerification);
router.get('/audit-logs', getAdminAuditLogs);
router.delete('/posts/:id', deletePostAdmin);

export default router;


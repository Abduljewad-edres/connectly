import express from 'express';
import { protect } from '../middleware/auth.js';
import {
  applyForVerification,
  getVerificationStatus
} from '../controllers/verificationController.js';

const router = express.Router();

router.use(protect);

router.post('/apply', applyForVerification);
router.get('/status', getVerificationStatus);

export default router;


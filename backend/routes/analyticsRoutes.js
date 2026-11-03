import express from 'express';
import { protect } from '../middleware/auth.js';
import { getCreatorAnalytics } from '../controllers/analyticsController.js';

const router = express.Router();

router.use(protect);

router.get('/', getCreatorAnalytics);

export default router;


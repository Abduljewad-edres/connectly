import express from 'express';
import {
  translateText,
  batchTranslate,
  getSupportedLanguages,
  detectTextLanguage
} from '../controllers/translationController.js';
import { optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// Public / Optional Auth Translation endpoints
router.get('/languages', getSupportedLanguages);
router.post('/detect', detectTextLanguage);
router.post('/translate', optionalAuth, translateText);
router.post('/batch', optionalAuth, batchTranslate);

export default router;


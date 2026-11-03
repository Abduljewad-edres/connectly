import express from 'express';
import { protect } from '../middleware/auth.js';
import {
  getUserCollections,
  createCollection,
  getCollectionPosts,
  togglePostInCollection,
  deleteCollection
} from '../controllers/collectionController.js';

const router = express.Router();

router.use(protect);

router.get('/', getUserCollections);
router.post('/', createCollection);
router.get('/:id', getCollectionPosts);
router.post('/:id/posts', togglePostInCollection);
router.delete('/:id', deleteCollection);

export default router;


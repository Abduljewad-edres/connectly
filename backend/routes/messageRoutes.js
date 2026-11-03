import express from 'express';
import { protect } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import {
  getUserConversations,
  getOrCreateConversation,
  getConversationMessages,
  sendMessage,
  markConversationSeen,
  getTotalUnreadCount,
  getOnlineUsers
} from '../controllers/messageController.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

router.get('/conversations', getUserConversations);
router.post('/conversations', getOrCreateConversation);
router.get('/conversations/:id/messages', getConversationMessages);
router.post('/conversations/:id/messages', upload.single('image'), sendMessage);
router.put('/conversations/:id/seen', markConversationSeen);
router.get('/unread-count', getTotalUnreadCount);
router.get('/online-users', getOnlineUsers);

export default router;


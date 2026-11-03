# Connectly Platform REST API & WebSocket Documentation
**Version 1.0 (Phases 1 - 14 Complete)**
*Connect. Share. Belong.*

---

## Architecture Overview
* **Frontend**: React 19 + Vite (Chunk-split production build: `vendor`, `socket`, `main`)
* **Backend**: Node.js + Express.js + Socket.IO real-time engine
* **Database**: MongoDB + Mongoose ODM with compound indexing, text indexing, and TTL auto-expirations
* **Authentication**: JWT Bearer Tokens with bcrypt password hashing
* **Base URL**: `http://localhost:5000/api`

---

## 1. Authentication (`/api/auth`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | Public | Register new user account (`fullName`, `username`, `email`, `password`) |
| `POST` | `/api/auth/login` | Public | Authenticate user credentials and return JWT token + user profile |
| `GET` | `/api/auth/me` | Authenticated | Retrieve currently authenticated user payload |
| `PUT` | `/api/auth/password` | Authenticated | Change account password |

---

## 2. Users & Profiles (`/api/users`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/users/:id` | Public | Fetch user profile by MongoDB ObjectId or `@username` |
| `PUT` | `/api/users/profile` | Authenticated | Update user bio, avatar, and banner image |
| `GET` | `/api/users/search?q=` | Public | Search users by username or full name |
| `GET` | `/api/users/:id/posts` | Public | Retrieve posts published by specific user |

---

## 3. Social Feed & Posts (`/api/posts`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/posts/feed?page=1&limit=10&mode=for_you&tag=` | Public/Auth | Infinite feed (`for_you`, `following`, `all`, hashtag filter) |
| `POST` | `/api/posts` | Authenticated | Create post with text, multi-image URLs, videos, visibility settings |
| `GET` | `/api/posts/:id` | Public | Get single post details with comments |
| `PUT` | `/api/posts/:id` | Owner | Edit post content and visibility |
| `DELETE` | `/api/posts/:id` | Owner/Admin | Delete post |
| `POST` | `/api/posts/:id/like` | Authenticated | Toggle like on post |
| `POST` | `/api/posts/:id/bookmark` | Authenticated | Toggle bookmark on post |
| `POST` | `/api/posts/:id/share` | Authenticated | Record post share / re-share count |

---

## 4. Comments (`/api/comments`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/comments/post/:postId` | Public | List comments on a post |
| `POST` | `/api/comments/post/:postId` | Authenticated | Add a comment to post |
| `DELETE` | `/api/comments/:id` | Owner | Delete comment |

---

## 5. Notifications (`/api/notifications`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/notifications` | Authenticated | Get user notifications list with unread counts |
| `PATCH` | `/api/notifications/:id/read` | Authenticated | Mark notification as read |
| `PATCH` | `/api/notifications/read-all` | Authenticated | Mark all notifications as read |
| `GET` | `/api/notifications/settings` | Authenticated | Retrieve notification delivery preferences |
| `PUT` | `/api/notifications/settings` | Authenticated | Update notification delivery preferences |

---

## 6. Real-Time Direct Messaging (`/api/messages`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/messages/conversations` | Authenticated | List all active 1-on-1 conversations with unread counts |
| `POST` | `/api/messages/conversations` | Authenticated | Get or create conversation with recipient |
| `GET` | `/api/messages/:conversationId` | Authenticated | Retrieve paginated message history |
| `POST` | `/api/messages` | Authenticated | Send text or image message |
| `PATCH` | `/api/messages/seen/:conversationId`| Authenticated | Mark messages in conversation as seen |

---

## 7. 24-Hour Ephemeral Stories (`/api/stories`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/stories/feed` | Authenticated | Grouped 24-hour active stories from followed users |
| `POST` | `/api/stories` | Authenticated | Upload photo/video story with automatic 24-hour TTL expiration |
| `GET` | `/api/stories/:id` | Authenticated | View story item details |
| `POST` | `/api/stories/:id/view` | Authenticated | Record story view and timestamp |
| `POST` | `/api/stories/:id/react` | Authenticated | React with emoji to story |
| `DELETE` | `/api/stories/:id` | Owner | Delete active story |

---

## 8. Short Videos & Reels (`/api/reels`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/reels?page=1&limit=10&tag=` | Public | Vertical video reel feed with view & like metrics |
| `POST` | `/api/reels` | Authenticated | Upload vertical video clip with caption and hashtags |
| `POST` | `/api/reels/:id/like` | Authenticated | Toggle like on reel |
| `POST` | `/api/reels/:id/view` | Public/Auth | Increment reel view counter |
| `POST` | `/api/reels/:id/share` | Authenticated | Record reel share count |
| `GET` | `/api/reels/:id/comments` | Public | Paginated comments on reel |
| `POST` | `/api/reels/:id/comments` | Authenticated | Add comment to reel |
| `DELETE` | `/api/reels/:id` | Owner/Admin | Delete reel |

---

## 9. Explore & Discovery (`/api/explore`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/explore` | Public/Auth | Trending tags, suggested accounts, and popular communities |
| `GET` | `/api/explore/search?q=&type=` | Public/Auth | Unified search across users, posts, and communities |

---

## 10. Bookmarks & Collections (`/api/collections`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/collections` | Authenticated | List user bookmark collections |
| `POST` | `/api/collections` | Authenticated | Create named bookmark folder |
| `GET` | `/api/collections/:id` | Authenticated | Get all saved posts in a collection |
| `POST` | `/api/collections/:id/posts` | Authenticated | Add/remove post in collection |
| `DELETE` | `/api/collections/:id` | Owner | Delete collection |

---

## 11. Communities & Groups (`/api/communities`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/communities` | Public/Auth | List communities filtered by category, search keyword |
| `POST` | `/api/communities` | Authenticated | Create new community |
| `GET` | `/api/communities/:slug` | Public/Auth | Get community profile details & membership status |
| `POST` | `/api/communities/:slug/join` | Authenticated | Join or leave community |
| `GET` | `/api/communities/:slug/posts`| Public/Auth | Retrieve community discussion posts |
| `POST` | `/api/communities/:slug/posts`| Authenticated | Publish post to community feed |

---

## 12. Creator Analytics Dashboard (`/api/analytics`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/analytics` | Authenticated | Aggregated metrics (follower count, 7-day follower growth, post count, reel count, total likes, total comments, top performing content) |

---

## 13. Privacy & Security (`/api/privacy`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `PUT` | `/api/privacy/settings` | Authenticated | Update private account switch, 2FA toggle, default visibility |
| `GET` | `/api/privacy/follow-requests` | Authenticated | List pending follow requests (for private accounts) |
| `POST` | `/api/privacy/follow-requests/:id/respond` | Authenticated | Approve or reject follow request |
| `POST` | `/api/privacy/block/:id` | Authenticated | Block or unblock a user |
| `GET` | `/api/privacy/blocked` | Authenticated | View list of blocked accounts |
| `POST` | `/api/privacy/reports` | Authenticated | Report inappropriate user or post |
| `PUT` | `/api/privacy/change-password`| Authenticated | Update account password with verification |

---

## 14. Creator Verification (`/api/verification`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/verification/apply` | Authenticated | Submit application for official blue checkmark badge |
| `GET` | `/api/verification/status` | Authenticated | Check current verification application status |

---

## 15. Administration Portal (`/api/admin`)
*All admin routes require `protect` and `adminOnly` (`role === 'admin'`).*

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/admin/stats` | Admin Only | System-wide statistics (users, posts, reels, reports, verifications) |
| `GET` | `/api/admin/users` | Admin Only | Search and filter registered users with status flags |
| `PUT` | `/api/admin/users/:id/status`| Admin Only | Modify roles (`admin`, `moderator`, `user`), toggle verification, suspend/unsuspend |
| `GET` | `/api/admin/reports` | Admin Only | List moderation reports |
| `POST` | `/api/admin/reports/:id/resolve` | Admin Only | Resolve or dismiss report |
| `DELETE` | `/api/admin/posts/:id` | Admin Only | Administratively delete post |
| `GET` | `/api/admin/verifications` | Admin Only | Review pending verification requests |
| `POST` | `/api/admin/verifications/:id/review`| Admin Only | Approve or reject verification request |
| `GET` | `/api/admin/audit-logs` | Admin Only | Immutable security audit trail |

---

## 16. Socket.IO Real-Time Events
| Event Name | Direction | Payload | Description |
|---|---|---|---|
| `join` | Client -> Server | `{ userId }` | Registers user socket for presence & room notifications |
| `notification` | Server -> Client | `Notification Object` | Pushes instant notification for like, comment, follow, mention |
| `send_message` | Client -> Server | `{ recipientId, text, imageUrl, conversationId }` | Dispatches real-time direct chat message |
| `receive_message`| Server -> Client | `Message Object` | Delivers incoming message to recipient in real-time |
| `message_delivered` | Server -> Client | `{ messageId, conversationId }` | Acknowledges message delivery |
| `message_seen` | Client -> Server | `{ conversationId, seenBy }` | Updates read status to seen |
| `typing` | Client -> Server | `{ recipientId, conversationId, isTyping }` | Dispatches typing indicator |
| `user_typing` | Server -> Client | `{ userId, conversationId, isTyping }` | Broadcasts typing indicator to partner |
| `user_status` | Server -> Client | `{ userId, isOnline }` | Broadcasts online/offline presence changes |


# Connectly — Mini Social Media Platform
> *Connect. Share. Belong.*

Connectly is a full-stack, responsive social media web application built strictly according to the **Connectly Software Requirements Specification (SRS v1.0)**.

---

## 🌟 Tech Stack & Architecture

- **Frontend**: React 19, Vite, Modern CSS (Responsive Design: Desktop, Tablet, Mobile)
- **Backend**: Node.js, Express.js (RESTful API, modular controllers & routes)
- **Database**: MongoDB with Mongoose ODM (Compound unique indexes, timestamps)
- **Authentication**: JSON Web Tokens (JWT) & bcrypt password hashing
- **Media Uploads**: Multer disk storage (served statically at `/uploads/`)

---

## 🚀 How to Run Connectly

Connectly is configured so you can run the backend and frontend in **two separate terminals** using `npm run dev`.

### Prerequisites
1. **Node.js** (v18+)
2. **MongoDB**: Local MongoDB instance running on `mongodb://localhost:27017` OR a MongoDB Atlas URI configured in `backend/.env`.

---

### Terminal 1: Backend API Server
```bash
cd backend
npm run dev
```
> The backend server will start on **http://localhost:5000** with nodemon auto-reload.

*(Optional)* **Seed Demo Data**:
To pre-populate Connectly with sample users, posts, comments, likes, and follow relationships:
```bash
cd backend
npm run seed
```

---

### Terminal 2: Frontend Client
```bash
cd frontend
npm run dev
```
*(Or `cd connectly && npm run dev`)*
> The Vite React app will start on **http://localhost:5173** and automatically proxy API calls to port 5000.

---

## 🔑 Demo Accounts (After running `npm run seed`)

| Full Name | Username | Email | Password | Role |
| :--- | :--- | :--- | :--- | :--- |
| **Abdul Rahman** | `@abdul_dev` | `abdul@example.com` | `password123` | Developer & Creator |
| **Sarah Connor** | `@sarah_designs` | `sarah@example.com` | `password123` | UI/UX Designer |
| **Alex Morgan** | `@alex_tech` | `alex@example.com` | `password123` | Tech Lead |

*(You can also register your own brand new accounts via the Registration page!)*

---

## 📋 Features Implemented (SRS Compliance)

### 1. Authentication & Security
- **FR-01**: User registration with full name, unique username, unique email, and bcrypt password hashing into `passwordHash`.
- **FR-02**: User login with email & password, JWT token generation, auth validation, and logout mechanism.
- **FR-10**: Server-side access control verifying token on protected endpoints.

### 2. User Profiles
- **FR-03**: View user profiles, bio, avatar, posts count, follower count, following count.
- Update profile: Full name, username (with uniqueness check), biography, and profile picture upload/URL.
- Posts tab showing all posts published by that user.

### 3. Post Management
- **FR-04**: Create posts with text content and image upload (or image URL).
- Edit own posts (BR-08: strictly restricted to post owner on backend).
- Delete own posts (BR-08 & BR-12: strictly restricted to owner, cascade deletes comments).

### 4. Home Feed
- **FR-05 & BR-14**: Feed showing posts from followed users + own posts, sorted newest first.
- "For You" (personalized feed) and "Explore All" tabs.
- Pagination / "Load More" incremental loading.

### 5. Likes & Comments
- **FR-06**: Comment management: add comments, view comments, delete own comments (BR-09: comment owner validation on backend).
- **FR-07**: Like management: instant toggle like/unlike, like count, animated heart, duplicate prevention (BR-07).

### 6. Follow System & Search
- **FR-08**: Follow/unfollow toggle, self-follow prevention (BR-05), duplicate prevention (BR-06: compound unique index).
- Followers and Following lists modal.
- **FR-09**: User search by username or full name with instant follow/unfollow from search results.

---

## 📡 REST API Endpoints Reference

All endpoints use `/api` prefix:

| Module | Method | Endpoint | Description | Auth |
| :--- | :--- | :--- | :--- | :--- |
| **Auth** | `POST` | `/api/auth/register` | Register new user account | Public |
| **Auth** | `POST` | `/api/auth/login` | Authenticate user & get JWT | Public |
| **Auth** | `GET` | `/api/auth/me` | Get current logged-in user info | Private |
| **Users** | `GET` | `/api/users/search?q=` | Search users by name or username | Public |
| **Users** | `PUT` | `/api/users/profile` | Update profile (bio, avatar, name, etc.) | Private |
| **Users** | `GET` | `/api/users/:id` | Get user profile by ID or username | Public |
| **Users** | `GET` | `/api/users/:id/posts` | Get posts by user ID or username | Public |
| **Follows** | `POST` | `/api/users/:id/follow` | Toggle follow / unfollow user | Private |
| **Follows** | `GET` | `/api/users/:id/followers` | Get user's followers list | Public |
| **Follows** | `GET` | `/api/users/:id/following` | Get user's following list | Public |
| **Posts** | `GET` | `/api/posts` | Get feed posts with pagination | Public |
| **Posts** | `POST` | `/api/posts` | Create new post (supports image upload) | Private |
| **Posts** | `GET` | `/api/posts/:id` | Get single post details | Public |
| **Posts** | `PUT` | `/api/posts/:id` | Edit post (owner only) | Private |
| **Posts** | `DELETE`| `/api/posts/:id` | Delete post (owner only) | Private |
| **Likes** | `POST` | `/api/posts/:id/like` | Toggle like / unlike on post | Private |
| **Comments**| `GET` | `/api/posts/:id/comments` | Get comments for a post | Public |
| **Comments**| `POST` | `/api/posts/:id/comments` | Add comment to a post | Private |
| **Comments**| `DELETE`| `/api/comments/:id` | Delete comment (owner only) | Private |


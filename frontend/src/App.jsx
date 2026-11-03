import React, { useState } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider, useSocket } from './context/SocketContext';
import { RouterProvider, useRouter } from './context/RouterContext';
import { LanguageProvider } from './context/LanguageContext';
import { PWAProvider } from './context/PWAContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { RightSidebar } from './components/RightSidebar';
import { CreatePostModal } from './components/CreatePostModal';
import { EditPostModal } from './components/EditPostModal';
import { ProfileSettingsModal } from './components/ProfileSettingsModal';
import { EditProfileModal } from './components/EditProfileModal';
import { NotificationDrawer } from './components/NotificationDrawer';
import { InstallAppModal } from './components/InstallAppModal';
import { PWAUpdateBanner } from './components/PWAUpdateBanner';

// Pages
import { HomePage } from './pages/HomePage';
import { ProfilePage } from './pages/ProfilePage';
import { SearchPage } from './pages/SearchPage';
import { MessagesPage } from './pages/MessagesPage';
import { ReelsPage } from './pages/ReelsPage';
import { OpportunitiesPage } from './pages/OpportunitiesPage';
import { LocalDiscoveryPage } from './pages/LocalDiscoveryPage';
import { LiveSpacesPage } from './pages/LiveSpacesPage';
import { CollectionsPage } from './pages/CollectionsPage';
import { CommunitiesPage } from './pages/CommunitiesPage';
import { CommunityDetailPage } from './pages/CommunityDetailPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { PrivacySecurityModal } from './components/PrivacySecurityModal';

// Mobile icons
import { HomeIcon, SearchIcon, PlusSquareIcon, UserIcon, BellIcon, MessageSquareIcon, FilmIcon } from './components/Icons';
import './App.css';

function MainApp() {
  const { user, isAuthenticated } = useAuth();
  const { currentPath, navigate } = useRouter();
  const { unreadCount, unreadMessagesCount } = useSocket();

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
  const [isNotificationDrawerOpen, setIsNotificationDrawerOpen] = useState(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);

  const handleOpenCreatePost = () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    setIsCreateModalOpen(true);
  };

  const handleOpenSettings = () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    setIsSettingsModalOpen(true);
  };

  const handleEditPostClick = (post) => {
    setEditingPost(post);
  };

  // Determine which page to render
  const renderCurrentPage = () => {
    if (currentPath === '/login') {
      return <LoginPage />;
    }
    if (currentPath === '/register') {
      return <RegisterPage />;
    }
    if (currentPath === '/search' || currentPath.startsWith('/search?')) {
      return <SearchPage />;
    }
    if (currentPath === '/messages' || currentPath.startsWith('/messages?')) {
      return <MessagesPage />;
    }
    if (currentPath === '/reels' || currentPath.startsWith('/reels?')) {
      return <ReelsPage />;
    }
    if (currentPath === '/opportunities' || currentPath.startsWith('/opportunities/')) {
      return <OpportunitiesPage />;
    }
    if (currentPath === '/discovery' || currentPath.startsWith('/discovery') || currentPath.startsWith('/local-discovery')) {
      return <LocalDiscoveryPage />;
    }
    if (currentPath === '/spaces' || currentPath.startsWith('/spaces') || currentPath.startsWith('/live-spaces')) {
      return <LiveSpacesPage />;
    }
    if (currentPath === '/collections' || currentPath === '/bookmarks') {
      return <CollectionsPage />;
    }
    if (currentPath === '/communities') {
      return <CommunitiesPage />;
    }
    if (currentPath.startsWith('/communities/')) {
      const slug = currentPath.split('/communities/')[1]?.split('?')[0];
      return <CommunityDetailPage slug={slug} />;
    }
    if (currentPath === '/analytics') {
      return <AnalyticsPage />;
    }
    if (currentPath === '/admin' || currentPath.startsWith('/admin?')) {
      return <AdminDashboardPage />;
    }
    if (currentPath.startsWith('/profile/')) {
      const parts = currentPath.split('/profile/');
      const targetParam = parts[1] ? parts[1].split('/')[0] : '';
      return (
        <ProfilePage
          usernameOrId={targetParam}
          onEditPostClick={handleEditPostClick}
        />
      );
    }
    // Default to Home Feed
    return (
      <HomePage
        onOpenCreatePost={handleOpenCreatePost}
        onEditPostClick={handleEditPostClick}
        onOpenSettings={handleOpenSettings}
      />
    );
  };

  const isAuthPage = currentPath === '/login' || currentPath === '/register';
  const isMessagesPage = currentPath.startsWith('/messages');
  const isReelsPage = currentPath.startsWith('/reels');
  const isAdminPage = currentPath.startsWith('/admin');

  return (
    <div className="app-layout">
      {/* Top Navbar with Settings & Notifications Actions */}
      <Navbar
        onOpenSettings={handleOpenSettings}
        onOpenNotifications={() => setIsNotificationDrawerOpen(true)}
      />

      {/* Main Content Area */}
      <div className={`app-main-container ${isAuthPage ? 'auth-mode' : ''}`}>
        {!isAuthPage && (
          <Sidebar
            onOpenCreatePost={handleOpenCreatePost}
            onOpenNotifications={() => setIsNotificationDrawerOpen(true)}
            onOpenPrivacy={() => setIsPrivacyModalOpen(true)}
          />
        )}

        <main className={`app-content-column ${isAuthPage ? 'auth-full' : ''} ${isMessagesPage || isReelsPage || isAdminPage ? 'messages-full-column' : ''}`}>
          {renderCurrentPage()}
        </main>

        {!isAuthPage && !isMessagesPage && !isReelsPage && !isAdminPage && <RightSidebar />}
      </div>

      {/* Mobile Bottom Navigation Bar */}
      {!isAuthPage && (
        <nav className="mobile-bottom-bar">
          <button
            className={`mobile-tab-btn ${currentPath === '/' ? 'active' : ''}`}
            onClick={() => navigate('/')}
            title="Home"
          >
            <HomeIcon size={22} />
          </button>

          <button
            className={`mobile-tab-btn ${currentPath.startsWith('/reels') ? 'active' : ''}`}
            onClick={() => navigate('/reels')}
            title="Shorts & Reels"
          >
            <FilmIcon size={22} />
          </button>

          <button
            className={`mobile-tab-btn ${currentPath.startsWith('/search') ? 'active' : ''}`}
            onClick={() => navigate('/search')}
            title="Search"
          >
            <SearchIcon size={22} />
          </button>

          <button
            className="mobile-tab-btn mobile-post-btn"
            onClick={handleOpenCreatePost}
            title="Create Post"
          >
            <PlusSquareIcon size={24} />
          </button>

          {isAuthenticated && (
            <button
              className={`mobile-tab-btn relative-container ${currentPath.startsWith('/messages') ? 'active' : ''}`}
              onClick={() => navigate('/messages')}
              title="Messages"
            >
              <MessageSquareIcon size={22} />
              {unreadMessagesCount > 0 && (
                <span className="nav-unread-badge">
                  {unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}
                </span>
              )}
            </button>
          )}

          <button
            className={`mobile-tab-btn ${user && currentPath === `/profile/${user.username}` ? 'active' : ''}`}
            onClick={() => navigate(user ? `/profile/${user.username}` : '/login')}
            title="Profile"
          >
            <UserIcon size={22} />
          </button>
        </nav>
      )}

      {/* Global Modals */}
      <CreatePostModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onPostCreated={() => {
          // If on home, refresh or reload
          if (currentPath === '/') {
            window.location.reload();
          }
        }}
      />

      <EditPostModal
        isOpen={!!editingPost}
        post={editingPost}
        onClose={() => setEditingPost(null)}
        onPostUpdated={() => {
          setEditingPost(null);
          window.location.reload();
        }}
      />

      {/* Real-Time Notifications Drawer (Phase 2) */}
      <NotificationDrawer
        isOpen={isNotificationDrawerOpen}
        onClose={() => setIsNotificationDrawerOpen(false)}
      />

      {/* Global Settings & Preferences Modal (Main page top-right three dots) */}
      {user && (
        <>
          <ProfileSettingsModal
            isOpen={isSettingsModalOpen}
            onClose={() => setIsSettingsModalOpen(false)}
            profileUser={user}
            isOwnProfile={true}
            onOpenEditProfile={() => setIsEditProfileModalOpen(true)}
          />
          <EditProfileModal
            isOpen={isEditProfileModalOpen}
            onClose={() => setIsEditProfileModalOpen(false)}
            onProfileUpdated={() => {
              window.location.reload();
            }}
          />
          <PrivacySecurityModal
            isOpen={isPrivacyModalOpen}
            onClose={() => setIsPrivacyModalOpen(false)}
          />
        </>
      )}

      {/* PWA Progressive Web App Modals & Updates */}
      <InstallAppModal />
      <PWAUpdateBanner />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <LanguageProvider>
            <SocketProvider>
              <PWAProvider>
                <RouterProvider>
                  <MainApp />
                </RouterProvider>
              </PWAProvider>
            </SocketProvider>
          </LanguageProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

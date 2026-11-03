import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from '../context/RouterContext';
import { useToast } from '../context/ToastContext';
import {
  apiGetCollections,
  apiCreateCollection,
  apiGetCollectionPosts,
  apiDeleteCollection
} from '../services/api';
import { PostCard } from '../components/PostCard';
import EmptyState from '../components/EmptyState';
import { PostSkeleton, Skeleton } from '../components/SkeletonLoader';
import {
  BookmarkIcon,
  PlusSquareIcon,
  TrashIcon,
  XIcon,
  FolderIcon,
  LockIcon
} from '../components/Icons';

export const CollectionsPage = () => {
  const { user, isAuthenticated } = useAuth();
  const { navigate } = useRouter();
  const { showToast } = useToast();

  const [collections, setCollections] = useState([]);
  const [activeCollection, setActiveCollection] = useState(null);
  const [collectionPosts, setCollectionPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(false);

  // New Collection modal
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [newColName, setNewColName] = useState('');
  const [newColDesc, setNewColDesc] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    loadCollections();
  }, [isAuthenticated]);

  const loadCollections = async () => {
    try {
      setLoading(true);
      const res = await apiGetCollections();
      if (res.success) {
        setCollections(res.collections || []);
      }
    } catch (err) {
      console.error('Failed to load collections:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCollection = async (col) => {
    try {
      setActiveCollection(col);
      setPostsLoading(true);
      const res = await apiGetCollectionPosts(col._id);
      if (res.success) {
        setCollectionPosts(res.posts || []);
      }
    } catch (err) {
      showToast('Failed to load collection posts.', 'error');
    } finally {
      setPostsLoading(false);
    }
  };

  const handleCreateCollection = async (e) => {
    e.preventDefault();
    if (!newColName.trim() || creating) return;

    try {
      setCreating(true);
      const res = await apiCreateCollection({
        name: newColName.trim(),
        description: newColDesc.trim(),
        isPrivate: true
      });

      if (res.success) {
        showToast(`Collection "${res.collection.name}" created!`, 'success');
        setNewColName('');
        setNewColDesc('');
        setIsNewModalOpen(false);
        loadCollections();
      }
    } catch (err) {
      showToast(err.message || 'Failed to create collection.', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteCollection = async (colId) => {
    if (!window.confirm('Are you sure you want to delete this collection? Saved posts will remain in your main bookmarks.')) return;

    try {
      const res = await apiDeleteCollection(colId);
      if (res.success) {
        showToast('Collection deleted.', 'success');
        setActiveCollection(null);
        loadCollections();
      }
    } catch (err) {
      showToast(err.message || 'Failed to delete collection.', 'error');
    }
  };

  return (
    <div className="collections-page-wrapper">
      {/* Header bar */}
      <div className="card collections-header-card mb-4">
        <div className="collections-title-row">
          <div className="title-with-icon">
            <BookmarkIcon size={24} className="text-primary" />
            <div>
              <h2>Bookmarks & Collections</h2>
              <p className="text-muted text-sm">
                Organize and save posts into private collections
              </p>
            </div>
          </div>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => setIsNewModalOpen(true)}
          >
            <PlusSquareIcon size={16} />
            <span>New Collection</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="collections-grid">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card collection-card-item p-4">
              <Skeleton width="100%" height="110px" borderRadius="var(--radius-md)" style={{ marginBottom: '12px' }} />
              <Skeleton width="60%" height="16px" style={{ marginBottom: '8px' }} />
              <Skeleton width="40%" height="12px" />
            </div>
          ))}
        </div>
      ) : activeCollection ? (
        /* Single Collection Posts View */
        <div className="active-collection-view">
          <div className="card collection-banner-card mb-4">
            <div className="banner-left">
              <button
                className="btn btn-outline btn-sm mb-2"
                onClick={() => {
                  setActiveCollection(null);
                  loadCollections();
                }}
              >
                ← Back to Collections
              </button>
              <h3>{activeCollection.name}</h3>
              {activeCollection.description && (
                <p className="text-muted">{activeCollection.description}</p>
              )}
              <span className="collection-count-badge">
                🔒 Private • {collectionPosts.length} saved posts
              </span>
            </div>
            {activeCollection.name !== 'All Saved' && (
              <button
                className="btn-icon text-danger"
                onClick={() => handleDeleteCollection(activeCollection._id)}
                title="Delete this collection"
              >
                <TrashIcon size={18} />
              </button>
            )}
          </div>

          {postsLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <PostSkeleton />
              <PostSkeleton />
            </div>
          ) : collectionPosts.length === 0 ? (
            <EmptyState
              icon={BookmarkIcon}
              title="No posts in this collection yet"
              description="Browse the feed and tap the bookmark icon on any post to add it here."
              actionText="Explore Feed"
              onAction={() => navigate('/')}
            />
          ) : (
            <div className="collection-posts-feed">
              {collectionPosts.map((post) => (
                <PostCard
                  key={post._id}
                  post={post}
                  onDeletePost={() => {
                    setCollectionPosts((prev) => prev.filter((p) => p._id !== post._id));
                  }}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Collections Grid View */
        <div className="collections-grid">
          {collections.map((col) => (
            <div
              key={col._id}
              className="card collection-card-item"
              onClick={() => handleSelectCollection(col)}
            >
              <div
                className="collection-cover-stage"
                style={
                  col.coverImage
                    ? { backgroundImage: `url(${col.coverImage})` }
                    : {}
                }
              >
                {!col.coverImage && (
                  <div className="folder-fallback-icon">
                    <BookmarkIcon size={36} />
                  </div>
                )}
                <span className="collection-privacy-pill">
                  <LockIcon size={12} />
                  <span>Private</span>
                </span>
              </div>
              <div className="collection-card-body">
                <h4>{col.name}</h4>
                <p className="text-muted text-xs">
                  {col.description || 'Collection of saved posts'}
                </p>
                <span className="posts-count-text">
                  {col.postsCount || 0} posts
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Collection Modal */}
      {isNewModalOpen && (
        <div className="modal-overlay" onClick={() => setIsNewModalOpen(false)}>
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '440px' }}
          >
            <div className="modal-header">
              <h3 className="modal-title">New Collection</h3>
              <button
                className="btn-icon"
                onClick={() => setIsNewModalOpen(false)}
              >
                <XIcon size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateCollection} className="modal-body p-4">
              <div className="form-group">
                <label className="form-label">Collection Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Design Inspiration, Tech, Quotes"
                  maxLength={50}
                  value={newColName}
                  onChange={(e) => setNewColName(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className="form-group mt-3">
                <label className="form-label">Description (Optional)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Brief description of this collection"
                  maxLength={200}
                  value={newColDesc}
                  onChange={(e) => setNewColDesc(e.target.value)}
                />
              </div>

              <div className="modal-actions mt-4">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setIsNewModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={creating || !newColName.trim()}
                >
                  {creating ? 'Creating...' : 'Create Collection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};


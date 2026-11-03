import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from '../context/RouterContext';
import { useToast } from '../context/ToastContext';
import {
  apiGetCommunities,
  apiCreateCommunity,
  apiToggleJoinCommunity
} from '../services/api';
import { getAvatarUrl } from '../utils/formatDate';
import EmptyState from '../components/EmptyState';
import { Skeleton } from '../components/SkeletonLoader';
import {
  UsersIcon,
  PlusSquareIcon,
  SearchIcon,
  XIcon,
  GlobeIcon,
  LockIcon
} from '../components/Icons';

export const CommunitiesPage = () => {
  const { user, isAuthenticated } = useAuth();
  const { navigate } = useRouter();
  const { showToast } = useToast();

  const [communities, setCommunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState('all'); // 'all' | 'joined'

  // Create Community Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Technology');
  const [privacy, setPrivacy] = useState('public');
  const [submitting, setSubmitting] = useState(false);

  const categories = [
    'All',
    'Technology',
    'Design',
    'Gaming',
    'Music',
    'Photography',
    'Business',
    'Lifestyle'
  ];

  const loadCommunities = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiGetCommunities({
        category: selectedCategory !== 'All' ? selectedCategory : '',
        search: searchQuery.trim(),
        filter: filterMode
      });
      if (res.success) {
        setCommunities(res.communities || []);
      }
    } catch (err) {
      console.error('Failed to load communities:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, searchQuery, filterMode]);

  useEffect(() => {
    loadCommunities();
  }, [loadCommunities]);

  const handleJoinToggle = async (e, comm) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    try {
      const res = await apiToggleJoinCommunity(comm.slug);
      if (res.success) {
        setCommunities((prev) =>
          prev.map((c) =>
            c.slug === comm.slug
              ? {
                  ...c,
                  isMember: res.isMember,
                  membersCount: res.membersCount
                }
              : c
          )
        );
        showToast(res.message, 'success');
      }
    } catch (err) {
      showToast(err.message || 'Membership action failed.', 'error');
    }
  };

  const handleCreateCommunity = async (e) => {
    e.preventDefault();
    if (!name.trim() || submitting) return;

    try {
      setSubmitting(true);
      const res = await apiCreateCommunity({
        name: name.trim(),
        description: description.trim(),
        category,
        privacy
      });

      if (res.success && res.community) {
        showToast('Community created successfully!', 'success');
        setIsCreateModalOpen(false);
        setName('');
        setDescription('');
        navigate(`/communities/${res.community.slug}`);
      }
    } catch (err) {
      showToast(err.message || 'Failed to create community.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="communities-page-wrapper">
      {/* Header bar */}
      <div className="card communities-header-card mb-4">
        <div className="communities-title-row">
          <div className="title-info">
            <UsersIcon size={24} className="text-primary" />
            <div>
              <h2>Communities & Groups</h2>
              <p className="text-muted text-sm">
                Discover interest groups, join discussions, and connect with like-minded creators
              </p>
            </div>
          </div>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => {
              if (!isAuthenticated) {
                navigate('/login');
                return;
              }
              setIsCreateModalOpen(true);
            }}
          >
            <PlusSquareIcon size={16} />
            <span>Create Community</span>
          </button>
        </div>

        {/* Search bar & filter tabs */}
        <div className="communities-toolbar mt-3">
          <div className="communities-search-box">
            <SearchIcon size={18} className="search-icon" />
            <input
              type="text"
              placeholder="Search communities by name or topic..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="btn-icon btn-sm"
                onClick={() => setSearchQuery('')}
              >
                <XIcon size={14} />
              </button>
            )}
          </div>

          {isAuthenticated && (
            <div className="filter-pills">
              <button
                className={`filter-pill-btn ${filterMode === 'all' ? 'active' : ''}`}
                onClick={() => setFilterMode('all')}
              >
                Explore All
              </button>
              <button
                className={`filter-pill-btn ${filterMode === 'joined' ? 'active' : ''}`}
                onClick={() => setFilterMode('joined')}
              >
                My Groups
              </button>
            </div>
          )}
        </div>

        {/* Category Pills Strip */}
        <div className="category-pills-strip mt-3">
          {categories.map((cat) => (
            <button
              key={cat}
              className={`category-pill ${selectedCategory === cat ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Communities Grid */}
      {loading ? (
        <div className="communities-grid">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="card community-card-item p-4">
              <Skeleton width="100%" height="90px" borderRadius="var(--radius-md)" style={{ marginBottom: '12px' }} />
              <Skeleton width="60%" height="18px" style={{ marginBottom: '8px' }} />
              <Skeleton width="85%" height="12px" style={{ marginBottom: '12px' }} />
              <Skeleton width="40%" height="28px" borderRadius="var(--radius-full)" />
            </div>
          ))}
        </div>
      ) : communities.length === 0 ? (
        <EmptyState
          icon={UsersIcon}
          title="No Communities Found"
          description={
            searchQuery || selectedCategory !== 'All'
              ? 'Try selecting a different category or clearing your search keywords.'
              : 'Be the first to create a vibrant community on Connectly!'
          }
          actionText="Create Community"
          onAction={() => setIsCreateModalOpen(true)}
        />
      ) : (
        <div className="communities-grid">
          {communities.map((comm) => (
            <div
              key={comm._id}
              className="card community-card-item"
              onClick={() => navigate(`/communities/${comm.slug}`)}
            >
              <div className="comm-banner-placeholder">
                <span className="comm-category-badge">{comm.category}</span>
                <span className="comm-privacy-badge">
                  {comm.privacy === 'private' ? (
                    <>
                      <LockIcon size={11} /> Private
                    </>
                  ) : (
                    <>
                      <GlobeIcon size={11} /> Public
                    </>
                  )}
                </span>
              </div>

              <div className="comm-card-main">
                <div className="comm-avatar-circle">
                  <span>{comm.name.charAt(0).toUpperCase()}</span>
                </div>
                <h4 className="comm-title">{comm.name}</h4>
                <p className="comm-desc-text">
                  {comm.description || 'A hub for enthusiasts to share posts and ideas.'}
                </p>

                <div className="comm-card-action-row">
                  <span className="comm-members-count">
                    👥 {comm.membersCount || 1} members
                  </span>
                  <button
                    className={`btn btn-sm ${comm.isMember ? 'btn-outline' : 'btn-primary'}`}
                    onClick={(e) => handleJoinToggle(e, comm)}
                  >
                    {comm.isMember ? 'Joined' : 'Join'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Community Modal */}
      {isCreateModalOpen && (
        <div
          className="modal-overlay"
          onClick={() => setIsCreateModalOpen(false)}
        >
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '480px' }}
          >
            <div className="modal-header">
              <div className="modal-title-row">
                <UsersIcon size={20} className="text-primary" />
                <h3 className="modal-title">Create a New Community</h3>
              </div>
              <button
                className="btn-icon"
                onClick={() => setIsCreateModalOpen(false)}
              >
                <XIcon size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateCommunity} className="modal-body p-4">
              <div className="form-group">
                <label className="form-label">Community Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Full-Stack Developers, UI Designers Hub"
                  maxLength={80}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className="form-group mt-3">
                <label className="form-label">Category</label>
                <select
                  className="form-select"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {categories.filter((c) => c !== 'All').map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group mt-3">
                <label className="form-label">Description</label>
                <textarea
                  className="form-input"
                  placeholder="What is this group about? What can members discuss and share?"
                  rows={3}
                  maxLength={500}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="form-group mt-3">
                <label className="form-label">Privacy</label>
                <select
                  className="form-select"
                  value={privacy}
                  onChange={(e) => setPrivacy(e.target.value)}
                >
                  <option value="public">🌍 Public (Anyone can view and join)</option>
                  <option value="private">🔒 Private (Members only)</option>
                </select>
              </div>

              <div className="modal-actions mt-4">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setIsCreateModalOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting || !name.trim()}
                >
                  {submitting ? 'Creating...' : 'Create Community'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};


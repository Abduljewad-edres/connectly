import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiGetFeedStories } from '../services/api';
import { getAvatarUrl } from '../utils/formatDate';
import { StoryViewerModal } from './StoryViewerModal';
import { CreateStoryModal } from './CreateStoryModal';
import { PlusSquareIcon } from './Icons';

export const StoriesBar = () => {
  const { user, isAuthenticated } = useAuth();

  const getCachedStories = () => {
    try {
      const raw = sessionStorage.getItem('connectly_cached_stories');
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    return [];
  };

  const [storyGroups, setStoryGroups] = useState(getCachedStories);
  const [loading, setLoading] = useState(() => getCachedStories().length === 0);

  // Modals
  const [isCreateStoryOpen, setIsCreateStoryOpen] = useState(false);
  const [viewerModalState, setViewerModalState] = useState({
    isOpen: false,
    initialIndex: 0
  });

  const loadStories = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      if (storyGroups.length === 0) setLoading(true);
      const res = await apiGetFeedStories();
      if (res.success) {
        setStoryGroups(res.storyGroups || []);
        try { sessionStorage.setItem('connectly_cached_stories', JSON.stringify(res.storyGroups || [])); } catch (_) {}
      }
    } catch (err) {
      console.error('Failed to load feed stories:', err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, storyGroups.length]);

  useEffect(() => {
    loadStories();
  }, [loadStories]);

  if (!isAuthenticated) return null;

  // Check if current user has an active story group
  const myStoryGroup = storyGroups.find((g) => g.isSelf);
  const otherStoryGroups = storyGroups.filter((g) => !g.isSelf);

  const handleOpenMyStory = (e) => {
    e.stopPropagation();
    if (myStoryGroup && myStoryGroup.stories.length > 0) {
      // Find index in overall storyGroups
      const idx = storyGroups.findIndex((g) => g.isSelf);
      setViewerModalState({ isOpen: true, initialIndex: idx });
    } else {
      setIsCreateStoryOpen(true);
    }
  };

  const handleOpenUserStory = (group) => {
    const idx = storyGroups.findIndex((g) => g.author?._id === group.author?._id);
    setViewerModalState({ isOpen: true, initialIndex: idx > -1 ? idx : 0 });
  };

  const handleStoryDeleted = () => {
    loadStories();
  };

  return (
    <div className="stories-bar-card card mb-4">
      <div className="stories-bar-scroll">
        {/* Current User Story Item */}
        <div className="story-circle-item my-story-item">
          <div
            className={`story-ring-wrapper ${
              myStoryGroup && myStoryGroup.stories.length > 0
                ? 'has-stories ring-active'
                : 'no-stories'
            }`}
            onClick={handleOpenMyStory}
            title={
              myStoryGroup && myStoryGroup.stories.length > 0
                ? 'View your active stories'
                : 'Add a new story'
            }
          >
            <img
              src={getAvatarUrl(user)}
              alt="Your story"
              className="story-circle-avatar"
            />
            {/* Plus badge to create story */}
            <button
              type="button"
              className="add-story-badge"
              onClick={(e) => {
                e.stopPropagation();
                setIsCreateStoryOpen(true);
              }}
              title="Add to your story"
            >
              +
            </button>
          </div>
          <span className="story-circle-label">Your Story</span>
        </div>

        {/* Other Users' Story Circles */}
        {otherStoryGroups.map((group) => {
          const hasUnviewed = group.hasUnviewed;

          return (
            <div
              key={group.author?._id}
              className="story-circle-item"
              onClick={() => handleOpenUserStory(group)}
              title={`View ${group.author?.fullName}'s story`}
            >
              <div
                className={`story-ring-wrapper ${
                  hasUnviewed ? 'ring-unviewed' : 'ring-viewed'
                }`}
              >
                <img
                  src={getAvatarUrl(group.author)}
                  alt={group.author?.fullName}
                  className="story-circle-avatar"
                />
              </div>
              <span className="story-circle-label">
                {group.author?.username || 'User'}
              </span>
            </div>
          );
        })}

        {/* If no other stories exist yet, show friendly prompt */}
        {!loading && otherStoryGroups.length === 0 && (
          <div className="stories-empty-hint">
            <span>Stories from creators you follow will appear here</span>
          </div>
        )}
      </div>

      {/* Create Story Modal */}
      <CreateStoryModal
        isOpen={isCreateStoryOpen}
        onClose={() => setIsCreateStoryOpen(false)}
        onStoryCreated={() => {
          loadStories();
        }}
      />

      {/* Story Viewer Modal */}
      <StoryViewerModal
        isOpen={viewerModalState.isOpen}
        onClose={() => setViewerModalState({ isOpen: false, initialIndex: 0 })}
        storyGroups={storyGroups}
        initialGroupIndex={viewerModalState.initialIndex}
        onStoryDeleted={handleStoryDeleted}
      />
    </div>
  );
};


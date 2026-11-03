import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  apiGetLiveSpaces,
  apiCreateLiveSpace,
  apiJoinLiveSpace,
  apiGetLiveSpaceById
} from '../services/api';
import { LiveSpaceCard } from '../components/LiveSpaceCard';
import { CreateSpaceModal } from '../components/CreateSpaceModal';
import { LiveSpaceRoomModal } from '../components/LiveSpaceRoomModal';
import {
  RadioIcon,
  HeadphonesIcon,
  MicIcon,
  CalendarIcon,
  SearchIcon,
  PlusSquareIcon,
  FilterIcon,
  SparklesIcon
} from '../components/Icons';

const TOPICS = [
  { id: 'all', label: 'All Topics' },
  { id: 'general', label: 'General' },
  { id: 'tech', label: 'Tech & AI' },
  { id: 'culture', label: 'Culture & Arts' },
  { id: 'education', label: 'Education' },
  { id: 'business', label: 'Business' },
  { id: 'music', label: 'Music' },
  { id: 'social', label: 'Social' },
  { id: 'languages', label: 'Languages' },
  { id: 'careers', label: 'Careers' }
];

export const LiveSpacesPage = () => {
  const { user, isAuthenticated } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState('live'); // 'live' | 'scheduled' | 'all'
  const [selectedTopic, setSelectedTopic] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [spaces, setSpaces] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [activeRoomSpace, setActiveRoomSpace] = useState(null);
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);

  const fetchSpaces = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiGetLiveSpaces({
        topic: selectedTopic === 'all' ? '' : selectedTopic,
        status: activeTab,
        search: searchQuery
      });
      if (res.success) {
        setSpaces(res.spaces || []);
      }
    } catch (err) {
      console.error('Error fetching live spaces:', err);
      showToast('Could not load Live Spaces.', 'error');
    } finally {
      setLoading(false);
    }
  }, [activeTab, selectedTopic, searchQuery, showToast]);

  useEffect(() => {
    fetchSpaces();
  }, [fetchSpaces]);

  // Handle Create Space
  const handleCreateSpace = async (formData) => {
    const res = await apiCreateLiveSpace(formData);
    if (res.success && res.space) {
      showToast(res.message || 'Space ready!', 'success');
      fetchSpaces();
      // If immediate live, open room directly
      if (res.space.status === 'live') {
        setActiveRoomSpace(res.space);
        setIsRoomModalOpen(true);
      }
    }
  };

  // Handle Join Space
  const handleJoinSpace = async (space) => {
    if (!isAuthenticated) {
      showToast('Please sign in to join audio rooms.', 'info');
      return;
    }

    try {
      const res = await apiJoinLiveSpace(space._id);
      if (res.success && res.space) {
        setActiveRoomSpace(res.space);
        setIsRoomModalOpen(true);
      }
    } catch (err) {
      showToast(err.message || 'Failed to join space.', 'error');
    }
  };

  return (
    <div className="live-spaces-page">
      
      {/* Hero Header */}
      <div className="live-spaces-hero">
        <div style={{ zIndex: 10, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div>
            <div className="badge-live-now" style={{ marginBottom: '0.75rem' }}>
              <RadioIcon size={14} /> Connectly Live Spaces
            </div>
            <h1 className="live-spaces-hero-title">
              Real-Time Audio Discussions & Voice Rooms
            </h1>
            <p className="live-spaces-hero-subtitle">
              Drop in, listen, and share perspectives across cultures and communities using genuine WebRTC peer-to-peer audio.
            </p>
          </div>

          <div>
            <button
              onClick={() => {
                if (!isAuthenticated) {
                  showToast('Please sign in to start a Live Space.', 'info');
                  return;
                }
                setIsCreateModalOpen(true);
              }}
              className="btn btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800 }}
            >
              <MicIcon size={18} /> Start a Space
            </button>
          </div>
        </div>
      </div>

      {/* Status Filter Tabs & Search Bar */}
      <div className="live-spaces-filter-bar">
        
        {/* Status Tabs */}
        <div className="live-spaces-tabs">
          {[
            { id: 'live', label: 'Live Now 🔴' },
            { id: 'scheduled', label: 'Upcoming 📅' },
            { id: 'all', label: 'All Spaces' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`live-spaces-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="live-spaces-search-wrapper">
          <SearchIcon size={14} className="live-spaces-search-icon" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search audio rooms..."
            className="live-spaces-search-input"
          />
        </div>

      </div>

      {/* Topic Filter Pills */}
      <div className="live-spaces-topics-bar">
        {TOPICS.map((topic) => {
          const isSelected = selectedTopic === topic.id;
          return (
            <button
              key={topic.id}
              onClick={() => setSelectedTopic(topic.id)}
              className={`live-space-topic-pill ${isSelected ? 'active' : ''}`}
            >
              {topic.label}
            </button>
          );
        })}
      </div>

      {/* Spaces Grid */}
      {loading ? (
        <div className="discovery-empty-card" style={{ padding: '4rem 1rem' }}>
          <div className="loading-spinner-sm" style={{ width: '28px', height: '28px' }} />
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Tuning into live discussions...</span>
        </div>
      ) : spaces.length === 0 ? (
        <div className="discovery-empty-card">
          <RadioIcon size={44} className="discovery-empty-icon" />
          <h3 className="discovery-empty-title">
            {activeTab === 'live' ? 'No Live Spaces active right now' : 'No matching spaces found'}
          </h3>
          <p className="discovery-empty-text">
            {activeTab === 'live'
              ? 'Be the host! Start an audio space to discuss topics with your community.'
              : 'Try selecting a different topic or start your own discussion room.'}
          </p>
          <button
            onClick={() => {
              if (!isAuthenticated) {
                showToast('Please sign in to start a Live Space.', 'info');
                return;
              }
              setIsCreateModalOpen(true);
            }}
            className="btn btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.5rem', fontWeight: 800 }}
          >
            <MicIcon size={16} /> Start a Space Now
          </button>
        </div>
      ) : (
        <div className="live-spaces-grid">
          {spaces.map((space) => (
            <LiveSpaceCard
              key={space._id}
              space={space}
              currentUserId={user?._id}
              onJoin={handleJoinSpace}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <CreateSpaceModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSpaceCreated={handleCreateSpace}
      />

      <LiveSpaceRoomModal
        isOpen={isRoomModalOpen}
        onClose={() => {
          setIsRoomModalOpen(false);
          setActiveRoomSpace(null);
          fetchSpaces();
        }}
        space={activeRoomSpace}
        onSpaceUpdated={fetchSpaces}
      />

    </div>
  );
};
export default LiveSpacesPage;


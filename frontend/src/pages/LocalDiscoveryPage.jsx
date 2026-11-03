import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  apiGetDiscoveryFeed,
  apiGetSupportedLocations,
  apiGetDiscoveryEvents,
  apiCreateDiscoveryEvent,
  apiToggleEventAttendance,
  apiDeleteDiscoveryEvent,
  apiUpdateDiscoveryPreferences
} from '../services/api';
import { EventCard } from '../components/EventCard';
import { EventDetailModal } from '../components/EventDetailModal';
import { CreateEventModal } from '../components/CreateEventModal';
import { PostCard } from '../components/PostCard';
import {
  CompassIcon,
  MapPinIcon,
  GlobeIcon,
  CalendarIcon,
  UsersIcon,
  PlusSquareIcon,
  FilterIcon,
  SearchIcon,
  CheckIcon,
  SparklesIcon
} from '../components/Icons';
import { getAvatarUrl } from '../utils/formatDate';

export const LocalDiscoveryPage = () => {
  const { user, refreshUser } = useAuth();
  const { showToast } = useToast();

  // Location selector state
  const [selectedCountry, setSelectedCountry] = useState(user?.location?.country || 'Ethiopia');
  const [selectedCity, setSelectedCity] = useState(user?.location?.city || 'Addis Ababa');
  const [scope, setScope] = useState('local'); // 'local' | 'international'
  const [isOptedIn, setIsOptedIn] = useState(Boolean(user?.locationDiscovery?.enabled));

  // Catalogue data
  const [curatedLocations, setCuratedLocations] = useState([]);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'events' | 'posts' | 'communities' | 'people'

  // Feed & Events Data
  const [feedData, setFeedData] = useState({
    events: [],
    posts: [],
    communities: [],
    people: []
  });
  const [eventsList, setEventsList] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [feedLoading, setFeedLoading] = useState(true);

  // Filters for Events tab
  const [eventCategory, setEventCategory] = useState('all');
  const [eventTimeframe, setEventTimeframe] = useState('upcoming');
  const [eventSearch, setEventSearch] = useState('');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Load locations catalogue
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const res = await apiGetSupportedLocations();
        if (res.success && res.curated) {
          setCuratedLocations(res.curated);
        }
      } catch (err) {
        console.warn('Failed to load supported locations:', err);
      }
    };
    fetchLocations();
  }, []);

  // Fetch local feed
  const loadFeed = useCallback(async () => {
    try {
      setFeedLoading(true);
      const res = await apiGetDiscoveryFeed({
        country: scope === 'international' ? '' : selectedCountry,
        city: scope === 'international' ? '' : selectedCity,
        scope
      });
      if (res.success && res.feed) {
        setFeedData(res.feed);
        if (res.isOptedIn !== undefined) {
          setIsOptedIn(res.isOptedIn);
        }
      }
    } catch (err) {
      console.error('Error loading discovery feed:', err);
      showToast('Could not load discovery feed.', 'error');
    } finally {
      setFeedLoading(false);
    }
  }, [selectedCountry, selectedCity, scope, showToast]);

  // Fetch dedicated events list
  const loadEvents = useCallback(async () => {
    try {
      setEventsLoading(true);
      const res = await apiGetDiscoveryEvents({
        search: eventSearch,
        category: eventCategory === 'all' ? '' : eventCategory,
        country: scope === 'international' ? '' : selectedCountry,
        city: scope === 'international' ? '' : selectedCity,
        timeframe: eventTimeframe
      });
      if (res.success) {
        setEventsList(res.events || []);
      }
    } catch (err) {
      console.error('Error loading events:', err);
    } finally {
      setEventsLoading(false);
    }
  }, [eventSearch, eventCategory, eventTimeframe, selectedCountry, selectedCity, scope]);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  useEffect(() => {
    if (activeTab === 'events') {
      loadEvents();
    }
  }, [activeTab, loadEvents]);

  // Toggle location discovery opt-in
  const handleToggleOptIn = async () => {
    if (!user) {
      showToast('Please sign in to update location settings.', 'info');
      return;
    }
    const newStatus = !isOptedIn;
    try {
      setIsOptedIn(newStatus);
      const res = await apiUpdateDiscoveryPreferences({
        location: {
          country: selectedCountry,
          city: selectedCity
        },
        locationDiscovery: {
          enabled: newStatus,
          shareLocationPublicly: user?.locationDiscovery?.shareLocationPublicly || false
        }
      });
      if (res.success) {
        showToast(
          newStatus
            ? 'Location-based discovery enabled.'
            : 'Location-based recommendations disabled.',
          'success'
        );
        if (refreshUser) refreshUser();
      }
    } catch (err) {
      setIsOptedIn(!newStatus);
      showToast('Failed to update discovery preferences.', 'error');
    }
  };

  // RSVP handler
  const handleRSVP = async (eventId, status) => {
    if (!user) {
      showToast('Please sign in to RSVP for events.', 'info');
      return;
    }
    try {
      const res = await apiToggleEventAttendance(eventId, status);
      if (res.success) {
        showToast(res.message || 'RSVP updated!', 'success');
        // Update item in feed
        setFeedData((prev) => ({
          ...prev,
          events: prev.events.map((evt) =>
            evt._id === eventId
              ? {
                  ...evt,
                  isAttending: res.isAttending,
                  isInterested: res.isInterested,
                  attendeesCount: res.attendeesCount,
                  interestedCount: res.interestedCount
                }
              : evt
          )
        }));
        // Update item in eventsList
        setEventsList((prev) =>
          prev.map((evt) =>
            evt._id === eventId
              ? {
                  ...evt,
                  isAttending: res.isAttending,
                  isInterested: res.isInterested,
                  attendeesCount: res.attendeesCount,
                  interestedCount: res.interestedCount
                }
              : evt
          )
        );
        if (selectedEvent && selectedEvent._id === eventId) {
          setSelectedEvent((prev) => ({
            ...prev,
            isAttending: res.isAttending,
            isInterested: res.isInterested,
            attendeesCount: res.attendeesCount,
            interestedCount: res.interestedCount
          }));
        }
      }
    } catch (err) {
      showToast(err.message || 'Failed to update RSVP', 'error');
    }
  };

  // Handle Event Creation
  const handleEventCreated = async (formData) => {
    const res = await apiCreateDiscoveryEvent(formData);
    if (res.success) {
      showToast('Event published successfully!', 'success');
      loadFeed();
      if (activeTab === 'events') {
        loadEvents();
      }
    }
  };

  // Handle Event Deletion
  const handleDeleteEvent = async (eventId) => {
    try {
      const res = await apiDeleteDiscoveryEvent(eventId);
      if (res.success) {
        showToast('Event deleted.', 'success');
        loadFeed();
        if (activeTab === 'events') {
          loadEvents();
        }
      }
    } catch (err) {
      showToast('Failed to delete event.', 'error');
    }
  };

  // Quick city list for selected country
  const currentCountryObj = curatedLocations.find((c) => c.country === selectedCountry);
  const cityOptions = currentCountryObj ? currentCountryObj.cities : ['Addis Ababa'];

  return (
    <div className="discovery-page-container">
      
      {/* Hero Header */}
      <div className="discovery-hero-card">
        <div className="discovery-hero-left">
          <div className="discovery-hero-badge">
            <CompassIcon size={14} /> Connectly Local Discovery
          </div>
          <h1 className="discovery-hero-title">
            Explore Your Local & Global Community
          </h1>
          <p className="discovery-hero-subtitle">
            Discover cultural gatherings, tech meetups, nearby discussions, and active local hubs. No GPS tracking required.
          </p>
        </div>

        <div className="discovery-hero-actions">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="btn btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold' }}
          >
            <PlusSquareIcon size={16} /> Schedule Event
          </button>
        </div>
      </div>

      {/* Location Control Bar & Privacy Shield */}
      <div className="discovery-location-bar">
        
        {/* Country & City Dropdowns */}
        <div className="discovery-location-selects">
          <div className="discovery-select-pill">
            <GlobeIcon size={15} className="text-primary" />
            <select
              value={scope === 'international' ? 'international' : selectedCountry}
              onChange={(e) => {
                if (e.target.value === 'international') {
                  setScope('international');
                } else {
                  setScope('local');
                  setSelectedCountry(e.target.value);
                  const cObj = curatedLocations.find((c) => c.country === e.target.value);
                  if (cObj && cObj.cities.length > 0) {
                    setSelectedCity(cObj.cities[0]);
                  }
                }
              }}
              className="discovery-select-control"
            >
              <optgroup label="International Mode">
                <option value="international">🌐 Worldwide (All Hubs)</option>
              </optgroup>
              <optgroup label="Regional Hubs">
                {curatedLocations.map((loc) => (
                  <option key={loc.country} value={loc.country}>
                    {loc.country}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          {scope !== 'international' && (
            <div className="discovery-select-pill">
              <MapPinIcon size={15} className="text-primary" />
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="discovery-select-control"
              >
                {cityOptions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Privacy Pill & Opt-In Switch */}
        <div className="discovery-privacy-section">
          <span className="discovery-privacy-note">Privacy: GPS not required</span>

          <button
            onClick={handleToggleOptIn}
            className={`discovery-privacy-btn ${isOptedIn ? 'active' : ''}`}
            title="Toggle whether Connectly suggests local content automatically"
          >
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: isOptedIn ? '#10b981' : '#94a3b8',
              display: 'inline-block'
            }} />
            <span>{isOptedIn ? 'Local Discovery: ON' : 'Enable Local Discovery'}</span>
          </button>
        </div>

      </div>

      {/* Navigation Tabs */}
      <div className="discovery-tabs-bar">
        {[
          { id: 'overview', label: 'Local Spotlight', icon: SparklesIcon },
          { id: 'events', label: `Events (${feedData.events.length})`, icon: CalendarIcon },
          { id: 'posts', label: `Local Posts (${feedData.posts.length})`, icon: CompassIcon },
          { id: 'communities', label: `Communities (${feedData.communities.length})`, icon: UsersIcon },
          { id: 'people', label: `Locals (${feedData.people.length})`, icon: UsersIcon }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`discovery-tab-btn ${isActive ? 'active' : ''}`}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Tab Content */}
      {feedLoading ? (
        <div className="discovery-empty-card" style={{ padding: '4rem 1rem' }}>
          <div className="loading-spinner-sm" style={{ width: '28px', height: '28px' }} />
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Discovering local activities...</span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              
              {/* Upcoming Events Spotlight */}
              <div>
                <div className="discovery-section-header">
                  <h2 className="discovery-section-title">
                    <CalendarIcon size={18} className="text-primary" />
                    Upcoming Events in {scope === 'international' ? 'the World' : `${selectedCity || selectedCountry}`}
                  </h2>
                  <button
                    onClick={() => setActiveTab('events')}
                    className="discovery-view-all-link"
                  >
                    View All &rarr;
                  </button>
                </div>

                {feedData.events.length === 0 ? (
                  <div className="discovery-empty-card">
                    <CalendarIcon size={34} className="discovery-empty-icon" />
                    <h3 className="discovery-empty-title">No upcoming events scheduled yet</h3>
                    <p className="discovery-empty-text">
                      Be the first organizer to schedule a meetup or cultural gathering!
                    </p>
                    <button
                      onClick={() => setIsCreateModalOpen(true)}
                      className="btn btn-primary btn-sm"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.5rem' }}
                    >
                      <PlusSquareIcon size={14} /> Schedule Event
                    </button>
                  </div>
                ) : (
                  <div className="discovery-events-grid">
                    {feedData.events.slice(0, 3).map((event) => (
                      <EventCard
                        key={event._id}
                        event={event}
                        currentUserId={user?._id}
                        onSelect={(evt) => {
                          setSelectedEvent(evt);
                          setIsDetailModalOpen(true);
                        }}
                        onRSVP={handleRSVP}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Local Communities Grid */}
              {feedData.communities.length > 0 && (
                <div>
                  <div className="discovery-section-header">
                    <h2 className="discovery-section-title">
                      <UsersIcon size={18} className="text-primary" />
                      Active Communities & Diaspora Hubs
                    </h2>
                    <button
                      onClick={() => setActiveTab('communities')}
                      className="discovery-view-all-link"
                    >
                      View All &rarr;
                    </button>
                  </div>

                  <div className="discovery-communities-grid">
                    {feedData.communities.map((comm) => (
                      <div
                        key={comm._id}
                        className="discovery-community-card"
                      >
                        <div className="discovery-community-avatar">
                          {comm.name ? comm.name[0].toUpperCase() : 'C'}
                        </div>
                        <div className="discovery-community-info">
                          <h4 className="discovery-community-name">
                            {comm.name}
                          </h4>
                          <span className="discovery-community-meta">
                            {comm.membersCount || 1} members · {comm.category || 'General'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Local Posts */}
              <div>
                <div className="discovery-section-header">
                  <h2 className="discovery-section-title">
                    <CompassIcon size={18} className="text-primary" />
                    Local Posts & Moments
                  </h2>
                </div>

                {feedData.posts.length === 0 ? (
                  <div className="discovery-empty-card">
                    <p className="discovery-empty-text">
                      No location-tagged posts found yet for this region. Write a post and tag your city!
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '640px', margin: '0 auto', width: '100%' }}>
                    {feedData.posts.map((post) => (
                      <PostCard key={post._id} post={post} />
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB 2: EVENTS */}
          {activeTab === 'events' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {/* Event Filter Bar */}
              <div className="discovery-filter-bar">
                <div className="discovery-search-wrapper">
                  <SearchIcon size={15} className="discovery-search-icon" />
                  <input
                    type="text"
                    value={eventSearch}
                    onChange={(e) => setEventSearch(e.target.value)}
                    placeholder="Search events by title or topic..."
                    className="discovery-search-input"
                  />
                </div>

                <div className="discovery-filters-group">
                  <select
                    value={eventCategory}
                    onChange={(e) => setEventCategory(e.target.value)}
                    className="discovery-filter-select"
                  >
                    <option value="all">All Categories</option>
                    <option value="cultural">Cultural</option>
                    <option value="tech">Tech & AI</option>
                    <option value="academic">Academic</option>
                    <option value="community">Community</option>
                    <option value="arts">Arts & Music</option>
                    <option value="sports">Sports</option>
                    <option value="business">Business</option>
                    <option value="networking">Networking</option>
                  </select>

                  <select
                    value={eventTimeframe}
                    onChange={(e) => setEventTimeframe(e.target.value)}
                    className="discovery-filter-select"
                  >
                    <option value="upcoming">Upcoming</option>
                    <option value="today">Today</option>
                    <option value="this_week">This Week</option>
                    <option value="this_month">This Month</option>
                  </select>
                </div>
              </div>

              {/* Events Grid */}
              {eventsLoading ? (
                <div className="discovery-empty-card" style={{ padding: '3rem 1rem' }}>
                  <div className="loading-spinner-sm" style={{ width: '24px', height: '24px' }} />
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Loading events...</span>
                </div>
              ) : eventsList.length === 0 ? (
                <div className="discovery-empty-card">
                  <CalendarIcon size={36} className="discovery-empty-icon" />
                  <h3 className="discovery-empty-title">No matching events found</h3>
                  <p className="discovery-empty-text">Try adjusting your filters or schedule a new event.</p>
                  <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="btn btn-primary btn-sm"
                    style={{ marginTop: '0.5rem' }}
                  >
                    Schedule an Event
                  </button>
                </div>
              ) : (
                <div className="discovery-events-grid">
                  {eventsList.map((event) => (
                    <EventCard
                      key={event._id}
                      event={event}
                      currentUserId={user?._id}
                      onSelect={(evt) => {
                        setSelectedEvent(evt);
                        setIsDetailModalOpen(true);
                      }}
                      onRSVP={handleRSVP}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: LOCAL POSTS */}
          {activeTab === 'posts' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '640px', margin: '0 auto', width: '100%' }}>
              {feedData.posts.length === 0 ? (
                <div className="discovery-empty-card">
                  <p className="discovery-empty-text">
                    No local posts found for {selectedCity || selectedCountry}. Start the conversation!
                  </p>
                </div>
              ) : (
                feedData.posts.map((post) => (
                  <PostCard key={post._id} post={post} />
                ))
              )}
            </div>
          )}

          {/* TAB 4: COMMUNITIES */}
          {activeTab === 'communities' && (
            <div className="discovery-communities-grid">
              {feedData.communities.length === 0 ? (
                <div className="discovery-empty-card" style={{ gridColumn: '1 / -1' }}>
                  <p className="discovery-empty-text">No local communities registered yet for this location.</p>
                </div>
              ) : (
                feedData.communities.map((comm) => (
                  <div
                    key={comm._id}
                    className="discovery-community-card"
                  >
                    <div className="discovery-community-avatar">
                      {comm.name ? comm.name[0].toUpperCase() : 'C'}
                    </div>
                    <div className="discovery-community-info">
                      <h3 className="discovery-community-name">{comm.name}</h3>
                      <p className="discovery-community-meta" style={{ marginBottom: '0.35rem', lineHeight: '1.4' }}>
                        {comm.description || 'Community connecting locals and friends.'}
                      </p>
                      <span style={{ fontSize: '0.72rem', color: 'var(--primary)', fontWeight: '700' }}>
                        {comm.membersCount || 1} members · {comm.category}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 5: LOCALS / PEOPLE */}
          {activeTab === 'people' && (
            <div className="discovery-people-grid">
              {feedData.people.length === 0 ? (
                <div className="discovery-empty-card" style={{ gridColumn: '1 / -1' }}>
                  <p className="discovery-empty-text">
                    No public creators located in {selectedCity || selectedCountry}. Enable public profile location in settings to be discovered here!
                  </p>
                </div>
              ) : (
                feedData.people.map((person) => (
                  <div
                    key={person._id}
                    className="discovery-person-card"
                  >
                    <img
                      src={getAvatarUrl(person.profilePicture)}
                      alt={person.fullName}
                      className="discovery-person-avatar"
                    />
                    <div className="discovery-person-info">
                      <h4 className="discovery-person-name">
                        {person.fullName}
                        {person.isVerified && <span style={{ color: '#3b82f6', marginLeft: '0.25rem' }}>●</span>}
                      </h4>
                      <span className="discovery-person-handle">@{person.username}</span>
                      {person.location?.city && (
                        <span style={{ fontSize: '0.72rem', color: 'var(--primary)', fontWeight: '600', display: 'block' }}>
                          📍 {person.location.city}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

        </div>
      )}

      {/* Modals */}
      <CreateEventModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onEventCreated={handleEventCreated}
        initialLocation={{
          country: selectedCountry,
          city: selectedCity
        }}
      />

      <EventDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedEvent(null);
        }}
        event={selectedEvent}
        currentUserId={user?._id}
        isAdmin={user?.role === 'admin'}
        onRSVP={handleRSVP}
        onDelete={handleDeleteEvent}
      />

    </div>
  );
};
export default LocalDiscoveryPage;

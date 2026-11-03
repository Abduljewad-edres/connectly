import React, { useState } from 'react';
import {
  CalendarIcon,
  MapPinIcon,
  UsersIcon,
  CheckIcon,
  SparklesIcon,
  ExternalLinkIcon
} from './Icons';

export const EventCard = ({ event, onSelect, onRSVP, currentUserId }) => {
  const [rsvpLoading, setRsvpLoading] = useState(false);

  const eventDate = new Date(event.startDate);
  const monthStr = eventDate.toLocaleString('default', { month: 'short' }).toUpperCase();
  const dayStr = eventDate.getDate();
  const timeStr = eventDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const isAttending = event.isAttending;
  const isInterested = event.isInterested;

  const handleRSVPClick = async (e, status) => {
    e.stopPropagation();
    if (!onRSVP) return;
    try {
      setRsvpLoading(true);
      await onRSVP(event._id, status);
    } finally {
      setRsvpLoading(false);
    }
  };

  const getCategoryClass = (cat) => {
    switch (cat) {
      case 'cultural': return 'category-cultural';
      case 'tech': return 'category-tech';
      case 'academic': return 'category-academic';
      case 'arts': return 'category-arts';
      case 'sports': return 'category-sports';
      case 'business': return 'category-business';
      case 'networking': return 'category-networking';
      default: return 'category-tech';
    }
  };

  return (
    <div
      onClick={() => onSelect && onSelect(event)}
      className="event-card"
    >
      {/* Cover Image or Themed Gradient Header */}
      <div className="event-card-cover">
        {event.coverImage ? (
          <img
            src={event.coverImage}
            alt={event.title}
            className="event-card-cover-img"
          />
        ) : (
          <div style={{ textAlign: 'center', padding: '1rem' }}>
            <span style={{ fontSize: '1.65rem', fontWeight: 900, color: 'var(--primary)', opacity: 0.5, textTransform: 'uppercase', display: 'block', letterSpacing: '0.05em' }}>
              {event.category || 'Event'}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Connectly Local Discovery</span>
          </div>
        )}

        {/* Floating Date Badge */}
        <div className="event-date-badge">
          <span className="event-date-month">
            {monthStr}
          </span>
          <span className="event-date-day">
            {dayStr}
          </span>
        </div>

        {/* Location Type Badge */}
        <div className="event-location-pill">
          {event.locationType === 'online' ? '🌐 Online' : event.locationType === 'hybrid' ? '⚡ Hybrid' : '📍 In-Person'}
        </div>
      </div>

      {/* Card Content */}
      <div className="event-card-body">
        <div>
          {/* Category & Timing */}
          <div className="event-meta-top">
            <span className={`event-category-pill ${getCategoryClass(event.category)}`}>
              {event.category}
            </span>
            <span className="event-time-text">
              <CalendarIcon size={13} />
              {timeStr}
            </span>
          </div>

          {/* Title */}
          <h3 className="event-card-title">
            {event.title}
          </h3>

          {/* Description snippet */}
          <p className="event-card-desc">
            {event.description}
          </p>

          {/* Location / Venue */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            <MapPinIcon size={14} className="text-primary" style={{ flexShrink: 0 }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {event.location?.venue ? `${event.location.venue}, ` : ''}
              {event.location?.city ? `${event.location.city}` : ''}
              {event.location?.country ? `, ${event.location.country}` : (event.locationType === 'online' ? 'Virtual Session' : 'Global')}
            </span>
          </div>
        </div>

        {/* Footer with Attendees & RSVP Button */}
        <div className="event-card-footer">
          <div className="event-attendee-count">
            <UsersIcon size={14} className="text-primary" />
            <span>
              <strong style={{ color: 'var(--text-main)' }}>{event.attendeesCount || 1}</strong> attending
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={(e) => e.stopPropagation()}>
            {isAttending ? (
              <button
                disabled={rsvpLoading}
                onClick={(e) => handleRSVPClick(e, 'not_going')}
                className="event-rsvp-btn attending"
                title="Click to cancel attendance"
              >
                <CheckIcon size={13} /> Going
              </button>
            ) : (
              <button
                disabled={rsvpLoading}
                onClick={(e) => handleRSVPClick(e, 'going')}
                className="event-rsvp-btn"
              >
                RSVP / Attend
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};


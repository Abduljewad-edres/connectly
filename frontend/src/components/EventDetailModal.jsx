import React, { useState } from 'react';
import {
  XIcon,
  CalendarIcon,
  MapPinIcon,
  UsersIcon,
  CheckIcon,
  ExternalLinkIcon,
  ClockIcon,
  SparklesIcon,
  TrashIcon
} from './Icons';
import { getAvatarUrl, formatRelativeTime } from '../utils/formatDate';

export const EventDetailModal = ({
  isOpen,
  onClose,
  event,
  currentUserId,
  isAdmin,
  onRSVP,
  onDelete
}) => {
  if (!isOpen || !event) return null;

  const [rsvpLoading, setRsvpLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const startDate = new Date(event.startDate);
  const formattedStart = startDate.toLocaleString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const isOwner = currentUserId && event.creator && (event.creator._id === currentUserId || event.creator === currentUserId);
  const canDelete = isOwner || isAdmin;

  const handleRSVP = async (status) => {
    if (!onRSVP) return;
    try {
      setRsvpLoading(true);
      await onRSVP(event._id, status);
    } finally {
      setRsvpLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this event?')) return;
    if (!onDelete) return;
    try {
      setDeleteLoading(true);
      await onDelete(event._id);
      onClose();
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="event-modal-card">
        
        {/* Modal Header / Banner */}
        <div style={{ position: 'relative', height: '220px', width: '100%', overflow: 'hidden', background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(168, 85, 247, 0.3))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {event.coverImage ? (
            <img
              src={event.coverImage}
              alt={event.title}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <div style={{ textAlign: 'center', padding: '1.5rem' }}>
              <span style={{ fontSize: '2.25rem', fontWeight: 900, color: 'var(--primary)', opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }}>
                {event.category || 'Event'}
              </span>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Connectly Local Discovery</p>
            </div>
          )}

          {/* Close button */}
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '1rem',
              right: '1rem',
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: 'rgba(0, 0, 0, 0.65)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              cursor: 'pointer'
            }}
          >
            <XIcon size={18} />
          </button>

          {/* Badges */}
          <div style={{ position: 'absolute', bottom: '1rem', left: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.72rem', fontWeight: 800, background: 'var(--primary)', color: '#ffffff', textTransform: 'uppercase' }}>
              {event.category}
            </span>
            <span style={{ padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.72rem', fontWeight: 700, background: 'rgba(0, 0, 0, 0.75)', color: '#f8fafc', backdropFilter: 'blur(6px)', border: '1px solid rgba(255, 255, 255, 0.15)' }}>
              {event.locationType === 'online' ? '🌐 Virtual Event' : event.locationType === 'hybrid' ? '⚡ Hybrid' : '📍 In-Person'}
            </span>
          </div>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Title & Organizer Info */}
          <div>
            <h2 style={{ fontSize: '1.45rem', fontWeight: 900, color: 'var(--text-main)', marginBottom: '0.5rem', lineHeight: '1.3' }}>
              {event.title}
            </h2>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <img
                src={getAvatarUrl(event.creator?.profilePicture)}
                alt={event.creator?.fullName || 'Organizer'}
                style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border-color)' }}
              />
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-main)' }}>
                    {event.organizerName || event.creator?.fullName || 'Event Organizer'}
                  </span>
                  {event.creator?.isVerified && (
                    <span style={{ color: '#3b82f6', fontSize: '0.75rem' }} title="Verified Creator">●</span>
                  )}
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {event.creator?.username ? `@${event.creator.username}` : 'Community Organizer'}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Schedule & Location Strip */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '0.85rem',
            background: 'var(--bg-page)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <CalendarIcon size={16} />
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Date & Time</span>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)' }}>{formattedStart}</span>
                {event.timezone && <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)' }}>({event.timezone})</span>}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(6, 182, 212, 0.15)', color: '#0891b2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <MapPinIcon size={16} />
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Location / Venue</span>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', display: 'block' }}>
                  {event.location?.venue ? `${event.location.venue}` : (event.locationType === 'online' ? 'Online Session' : 'Venue TBA')}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {event.location?.city ? `${event.location.city}, ` : ''}
                  {event.location?.country || ''}
                </span>
              </div>
            </div>
          </div>

          {/* Online Link if applicable */}
          {event.onlineUrl && (
            <div style={{ background: 'var(--primary-light)', border: '1px solid rgba(99, 102, 241, 0.25)', borderRadius: 'var(--radius-md)', padding: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-main)', overflow: 'hidden' }}>
                <ExternalLinkIcon size={15} className="text-primary" />
                <span style={{ fontWeight: 700 }}>Meeting URL:</span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>{event.onlineUrl}</span>
              </div>
              <a
                href={event.onlineUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary btn-sm"
                style={{ flexShrink: 0 }}
              >
                Join Link
              </a>
            </div>
          )}

          {/* Description */}
          <div>
            <h4 style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>About This Event</h4>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-main)', lineHeight: '1.6', background: 'var(--bg-page)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1rem', whiteSpace: 'pre-wrap' }}>
              {event.description}
            </div>
          </div>

          {/* Attendees Strip */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', padding: '1rem', background: 'var(--bg-page)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <UsersIcon size={18} className="text-primary" />
              <div>
                <span style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-main)', display: 'block' }}>
                  {event.attendeesCount || 1} Attending
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {event.interestedCount || 0} interested
                </span>
              </div>
            </div>

            {/* RSVP Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {event.isAttending ? (
                <button
                  disabled={rsvpLoading}
                  onClick={() => handleRSVP('not_going')}
                  className="event-rsvp-btn attending"
                  title="Click to cancel attendance"
                >
                  <CheckIcon size={14} /> Going (Cancel)
                </button>
              ) : (
                <button
                  disabled={rsvpLoading}
                  onClick={() => handleRSVP('going')}
                  className="btn btn-primary btn-sm"
                  style={{ fontWeight: 800 }}
                >
                  RSVP: I'm Going
                </button>
              )}

              {canDelete && (
                <button
                  disabled={deleteLoading}
                  onClick={handleDelete}
                  className="btn btn-outline btn-sm"
                  style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}
                  title="Delete event"
                >
                  <TrashIcon size={15} />
                </button>
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

import React from 'react';
import {
  RadioIcon,
  HeadphonesIcon,
  MicIcon,
  CalendarIcon,
  LockIcon,
  UsersIcon
} from './Icons';
import { getAvatarUrl } from '../utils/formatDate';

export const LiveSpaceCard = ({ space, onJoin, currentUserId }) => {
  const isLive = space.status === 'live';
  const isScheduled = space.status === 'scheduled';

  const scheduledDate = space.scheduledFor ? new Date(space.scheduledFor) : null;
  const formattedScheduled = scheduledDate
    ? scheduledDate.toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : '';

  const host = space.host || {};
  const speakers = (space.participants || []).filter((p) =>
    ['host', 'co_host', 'speaker'].includes(p.role)
  );

  return (
    <div
      onClick={() => onJoin && onJoin(space)}
      className="live-space-card-container group"
    >
      {/* Top Banner Status & Topic */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {isLive ? (
            <span className="badge-live-now">
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
              LIVE NOW
            </span>
          ) : (
            <span style={{ padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-full)', fontSize: '0.7rem', fontWeight: 700, background: 'rgba(245, 158, 11, 0.15)', color: '#d97706', border: '1px solid rgba(245, 158, 11, 0.3)', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
              <CalendarIcon size={12} />
              {formattedScheduled || 'Scheduled'}
            </span>
          )}

          <span className="badge-topic">
            {space.topic}
          </span>
        </div>

        {space.isPrivate && (
          <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', fontSize: '0.75rem' }} title="Private room">
            <LockIcon size={13} />
          </span>
        )}
      </div>

      {/* Title & Description */}
      <div style={{ marginBottom: '1rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.35rem', lineHeight: 1.35 }}>
          {space.title}
        </h3>
        {space.description && (
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {space.description}
          </p>
        )}
      </div>

      {/* Host & Speakers Preview */}
      <div style={{ paddingTop: '0.85rem', borderTop: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
        
        {/* Host Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0 }}>
          <div style={{ position: 'relative' }}>
            <img
              src={getAvatarUrl(host.profilePicture)}
              alt={host.fullName || 'Host'}
              style={{ width: '38px', height: '38px', borderRadius: '50%', border: '2px solid var(--primary)', objectFit: 'cover' }}
            />
            <div style={{ position: 'absolute', bottom: '-2px', right: '-2px', width: '16px', height: '16px', borderRadius: '50%', background: 'var(--primary)', color: '#ffffff', fontSize: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }} title="Host">
              ★
            </div>
          </div>
          <div style={{ minWidth: 0 }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-main)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {host.fullName || 'Host'}
            </span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              @{host.username || 'host'}
            </span>
          </div>
        </div>

        {/* Counts & Join Action */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            <HeadphonesIcon size={13} className="text-primary" />
            <span style={{ fontWeight: 800, color: 'var(--text-main)' }}>{space.participantsCount || 1}</span>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onJoin) onJoin(space);
            }}
            className="btn btn-primary btn-sm"
            style={{ fontWeight: 800, padding: '0.4rem 0.85rem' }}
          >
            {isLive ? <RadioIcon size={12} /> : <CalendarIcon size={12} />}
            <span>{isLive ? 'Join' : 'Details'}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
export default LiveSpaceCard;


import React from 'react';

/**
 * Base shimmering skeleton line or block
 */
export const Skeleton = ({
  width = '100%',
  height = '1rem',
  borderRadius = 'var(--radius-sm)',
  className = '',
  style = {}
}) => {
  return (
    <div
      className={`skeleton-shimmer ${className}`}
      style={{
        width,
        height,
        borderRadius,
        ...style
      }}
    />
  );
};

/**
 * Post Card Skeleton
 */
export const PostSkeleton = () => {
  return (
    <div className="card post-skeleton-card">
      <div className="post-skeleton-header">
        <Skeleton width="44px" height="44px" borderRadius="50%" />
        <div className="post-skeleton-meta">
          <Skeleton width="130px" height="14px" />
          <Skeleton width="90px" height="11px" style={{ marginTop: '6px' }} />
        </div>
      </div>

      <div className="post-skeleton-body">
        <Skeleton width="92%" height="13px" style={{ marginBottom: '8px' }} />
        <Skeleton width="75%" height="13px" style={{ marginBottom: '16px' }} />
        <Skeleton width="100%" height="220px" borderRadius="var(--radius-md)" />
      </div>

      <div className="post-skeleton-footer">
        <Skeleton width="60px" height="24px" borderRadius="var(--radius-full)" />
        <Skeleton width="60px" height="24px" borderRadius="var(--radius-full)" />
        <Skeleton width="60px" height="24px" borderRadius="var(--radius-full)" />
      </div>
    </div>
  );
};

/**
 * Profile Header Skeleton
 */
export const ProfileSkeleton = () => {
  return (
    <div className="card profile-skeleton-card">
      <Skeleton width="100%" height="180px" borderRadius="0" />
      <div className="profile-skeleton-details">
        <div className="profile-skeleton-avatar-row">
          <Skeleton
            width="100px"
            height="100px"
            borderRadius="50%"
            style={{ marginTop: '-50px', border: '4px solid var(--bg-card)' }}
          />
          <Skeleton width="110px" height="36px" borderRadius="var(--radius-md)" />
        </div>
        <div style={{ marginTop: '16px' }}>
          <Skeleton width="160px" height="20px" style={{ marginBottom: '8px' }} />
          <Skeleton width="100px" height="14px" style={{ marginBottom: '14px' }} />
          <Skeleton width="85%" height="13px" style={{ marginBottom: '6px' }} />
          <Skeleton width="60%" height="13px" style={{ marginBottom: '16px' }} />
        </div>
        <div className="profile-skeleton-stats">
          <Skeleton width="70px" height="32px" borderRadius="var(--radius-md)" />
          <Skeleton width="70px" height="32px" borderRadius="var(--radius-md)" />
          <Skeleton width="70px" height="32px" borderRadius="var(--radius-md)" />
        </div>
      </div>
    </div>
  );
};

/**
 * User Item Skeleton (for suggestions & search)
 */
export const UserSkeleton = () => {
  return (
    <div className="user-skeleton-row">
      <Skeleton width="42px" height="42px" borderRadius="50%" />
      <div style={{ flex: 1 }}>
        <Skeleton width="120px" height="13px" style={{ marginBottom: '6px' }} />
        <Skeleton width="80px" height="11px" />
      </div>
      <Skeleton width="72px" height="28px" borderRadius="var(--radius-full)" />
    </div>
  );
};

/**
 * Reel Card Skeleton (for vertical shorts feed)
 */
export const ReelSkeleton = () => {
  return (
    <div className="reel-skeleton-card">
      <div className="reel-skeleton-actions">
        <Skeleton width="40px" height="40px" borderRadius="50%" />
        <Skeleton width="40px" height="40px" borderRadius="50%" />
        <Skeleton width="40px" height="40px" borderRadius="50%" />
      </div>
      <div className="reel-skeleton-info">
        <Skeleton width="120px" height="15px" style={{ marginBottom: '8px' }} />
        <Skeleton width="75%" height="12px" />
      </div>
    </div>
  );
};

export default {
  Skeleton,
  PostSkeleton,
  ProfileSkeleton,
  UserSkeleton,
  ReelSkeleton
};


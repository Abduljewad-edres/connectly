import React from 'react';
import { BadgeCheckIcon } from './Icons';

/**
 * VerifiedBadge
 * Renders a verified social checkmark badge for verified creators and public figures.
 */
const VerifiedBadge = ({ isVerified = false, size = 16, className = '', title = 'Verified Account' }) => {
  if (!isVerified) return null;

  return (
    <span
      className={`verified-badge inline-flex items-center align-middle ${className}`}
      title={title}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        verticalAlign: 'middle',
        marginLeft: '4px',
        cursor: 'default'
      }}
    >
      <BadgeCheckIcon size={size} />
    </span>
  );
};

export default VerifiedBadge;


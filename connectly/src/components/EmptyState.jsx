import React from 'react';
import { SparklesIcon } from './Icons';

/**
 * Reusable EmptyState Component
 * Displays a clean modern card with icon, title, description, and action button.
 */
export const EmptyState = ({
  icon: Icon = SparklesIcon,
  title = 'No items found',
  description = 'There are no items to display at this time.',
  actionText,
  onAction,
  secondaryActionText,
  onSecondaryAction,
  className = ''
}) => {
  return (
    <div className={`empty-state-card ${className}`}>
      <div className="empty-state-icon-wrapper">
        <Icon size={32} className="empty-state-icon" />
      </div>

      <h3 className="empty-state-title">{title}</h3>
      <p className="empty-state-description">{description}</p>

      {(actionText || secondaryActionText) && (
        <div className="empty-state-actions">
          {actionText && (
            <button
              type="button"
              className="btn btn-primary empty-state-btn"
              onClick={onAction}
            >
              {actionText}
            </button>
          )}

          {secondaryActionText && (
            <button
              type="button"
              className="btn btn-outline empty-state-btn"
              onClick={onSecondaryAction}
            >
              {secondaryActionText}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default EmptyState;


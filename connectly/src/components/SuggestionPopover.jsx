import React from 'react';
import { getAvatarUrl } from '../utils/formatDate';

export const SuggestionPopover = ({
  suggestions = [],
  type = 'tag',
  selectedIndex = 0,
  onSelect
}) => {
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div className="suggestion-popover card">
      <div className="suggestion-header">
        <span>Suggested {type === 'user' ? 'People' : 'Hashtags'}</span>
      </div>
      <div className="suggestion-list">
        {suggestions.map((item, idx) => {
          const isSelected = idx === selectedIndex;
          if (type === 'user') {
            return (
              <div
                key={item._id || item.username}
                className={`suggestion-item ${isSelected ? 'selected' : ''}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onSelect(item.username);
                }}
              >
                <img
                  src={getAvatarUrl(item)}
                  alt={item.fullName}
                  className="suggestion-avatar"
                />
                <div className="suggestion-meta">
                  <span className="suggestion-name">{item.fullName}</span>
                  <span className="suggestion-sub">@{item.username}</span>
                </div>
              </div>
            );
          }

          // Hashtag item
          return (
            <div
              key={item}
              className={`suggestion-item ${isSelected ? 'selected' : ''}`}
              onMouseDown={(e) => {
                e.preventDefault();
                onSelect(item);
              }}
            >
              <div className="suggestion-tag-icon">#</div>
              <div className="suggestion-meta">
                <span className="suggestion-name">#{item}</span>
                <span className="suggestion-sub">Trending tag</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};


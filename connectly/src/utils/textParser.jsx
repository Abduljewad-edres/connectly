import React from 'react';

/**
 * Parses text and wraps hashtags (#tag) and mentions (@username) in interactive links
 */
export const renderParsedText = (text, { onTagClick, onUserClick } = {}) => {
  if (!text) return null;

  // Regex for hashtags (#word) and mentions (@word)
  const regex = /((?:#|@)[a-zA-Z0-9_]+)/g;
  const parts = text.split(regex);

  return parts.map((part, index) => {
    if (part.startsWith('#')) {
      const tag = part.slice(1);
      return (
        <span
          key={index}
          className="post-hashtag"
          onClick={(e) => {
            e.stopPropagation();
            if (onTagClick) onTagClick(tag);
          }}
          title={`Filter posts with #${tag}`}
        >
          {part}
        </span>
      );
    }

    if (part.startsWith('@')) {
      const username = part.slice(1);
      return (
        <span
          key={index}
          className="post-mention"
          onClick={(e) => {
            e.stopPropagation();
            if (onUserClick) onUserClick(username);
          }}
          title={`View @${username}'s profile`}
        >
          {part}
        </span>
      );
    }

    return part;
  });
};


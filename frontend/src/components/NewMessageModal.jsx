import React, { useState, useEffect } from 'react';
import { apiSearchUsers, apiGetOrCreateConversation } from '../services/api';
import { getAvatarUrl } from '../utils/formatDate';
import { SearchIcon, XIcon, MessageSquareIcon } from './Icons';

export const NewMessageModal = ({ isOpen, onClose, onSelectConversation }) => {
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setUsers([]);
      return;
    }
    // Initial fetch of popular/recent users
    handleSearch('');
  }, [isOpen]);

  const handleSearch = async (searchTerm) => {
    try {
      setLoading(true);
      const res = await apiSearchUsers(searchTerm);
      if (res.success) {
        setUsers(res.users || []);
      }
    } catch (err) {
      console.error('Error searching users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleQueryChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    handleSearch(val);
  };

  const handleStartChat = async (targetUser) => {
    try {
      setSubmitting(true);
      const res = await apiGetOrCreateConversation({ recipientId: targetUser._id });
      if (res.success && res.conversation) {
        onSelectConversation(res.conversation);
        onClose();
      }
    } catch (err) {
      alert(err.message || 'Failed to start conversation.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card new-message-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="modal-title-row">
            <MessageSquareIcon size={20} className="text-primary" />
            <h3 className="modal-title">New Direct Message</h3>
          </div>
          <button className="btn-icon" onClick={onClose} aria-label="Close modal">
            <XIcon size={18} />
          </button>
        </div>

        <div className="modal-body new-message-body">
          <div className="search-input-wrapper">
            <SearchIcon size={18} className="search-icon" />
            <input
              type="text"
              className="form-input search-input"
              placeholder="Search people by name or @username..."
              value={query}
              onChange={handleQueryChange}
              autoFocus
            />
          </div>

          <div className="users-selection-list">
            {loading ? (
              <div className="py-6 text-center text-muted">
                <div className="spinner mx-auto mb-2"></div>
                <p>Searching users...</p>
              </div>
            ) : users.length === 0 ? (
              <div className="py-6 text-center text-muted">
                <p>No users found matching "{query}"</p>
              </div>
            ) : (
              users.map((u) => (
                <div
                  key={u._id}
                  className="user-select-row"
                  onClick={() => !submitting && handleStartChat(u)}
                >
                  <img
                    src={getAvatarUrl(u)}
                    alt={u.fullName}
                    className="user-select-avatar"
                  />
                  <div className="user-select-info">
                    <span className="user-select-name">{u.fullName}</span>
                    <span className="user-select-uname">@{u.username}</span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    disabled={submitting}
                  >
                    Chat
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};


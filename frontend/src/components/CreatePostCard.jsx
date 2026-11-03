import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from '../context/RouterContext';
import { getAvatarUrl } from '../utils/formatDate';
import { ImageIcon, PlusSquareIcon } from './Icons';

export const CreatePostCard = ({ onOpenModal }) => {
  const { user, isAuthenticated } = useAuth();
  const { navigate } = useRouter();

  const handleClick = () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (onOpenModal) onOpenModal();
  };

  return (
    <div className="card composer-feed-card" onClick={handleClick}>
      <div className="composer-feed-top">
        <img
          src={getAvatarUrl(user)}
          alt={user?.fullName || 'User'}
          className="composer-feed-avatar"
        />
        <div className="composer-feed-placeholder">
          {isAuthenticated
            ? `What's on your mind, ${user?.fullName?.split(' ')[0] || 'friend'}?`
            : 'Join Connectly to share what\'s happening...'}
        </div>
      </div>

      <div className="composer-feed-bottom">
        <button type="button" className="composer-action-pill">
          <ImageIcon size={18} className="text-primary" />
          <span>Photo / Media</span>
        </button>
        <button type="button" className="btn btn-primary btn-sm composer-publish-pill">
          <PlusSquareIcon size={16} />
          <span>New Post</span>
        </button>
      </div>
    </div>
  );
};


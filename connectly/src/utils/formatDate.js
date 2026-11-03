export const formatRelativeTime = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  });
};

export const getAvatarUrl = (user) => {
  if (user?.profilePicture) {
    if (user.profilePicture.startsWith('http') || user.profilePicture.startsWith('data:')) {
      return user.profilePicture;
    }
    return user.profilePicture; // Served from static backend /uploads
  }
  // Fallback to DiceBear UI avatar using username
  const seed = encodeURIComponent(user?.username || user?.fullName || 'user');
  return `https://api.dicebear.com/7.x/initials/svg?seed=${seed}&backgroundColor=4f46e5&textColor=ffffff`;
};


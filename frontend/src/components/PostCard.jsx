import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from '../context/RouterContext';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';
import {
  apiToggleLike,
  apiToggleBookmark,
  apiGetComments,
  apiAddComment,
  apiDeleteComment,
  apiDeletePost,
  apiTranslateText
} from '../services/api';
import { formatRelativeTime, getAvatarUrl } from '../utils/formatDate';
import { renderParsedText } from '../utils/textParser';
import { ShareModal } from './ShareModal';
import { ReportModal } from './ReportModal';
import VerifiedBadge from './VerifiedBadge';
import {
  HeartIcon,
  MessageCircleIcon,
  BookmarkIcon,
  Share2Icon,
  TrashIcon,
  EditIcon,
  SendIcon,
  MoreVerticalIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  CheckIcon,
  GlobeIcon,
  LanguagesIcon,
  SparklesIcon,
  UsersIcon,
  LockIcon,
  FlagIcon,
  ImageIcon
} from './Icons';

export const PostCard = ({ post, onPostDeleted, onEditPostClick, onPostReported }) => {
  const { user, isAuthenticated } = useAuth();
  const { navigate } = useRouter();
  const { showToast } = useToast();
  const { currentLanguage, activeLanguage, supportedLanguages, t } = useLanguage();

  // Post Translation State (Phase 1: Multilingual Bridge)
  const [isTranslated, setIsTranslated] = useState(false);
  const [translatedContent, setTranslatedContent] = useState('');
  const [sourceLang, setSourceLang] = useState('');
  const [translatedTargetLang, setTranslatedTargetLang] = useState('');
  const [translatingPost, setTranslatingPost] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const [showTranslationMenu, setShowTranslationMenu] = useState(false);
  const translationMenuRef = useRef(null);

  // Comment Translations State Map: { [commentId]: { translatedText, sourceLang, showOriginal, loading } }
  const [commentTranslations, setCommentTranslations] = useState({});
  const [openCommentTransId, setOpenCommentTransId] = useState(null);
  const commentTransMenuRef = useRef(null);

  // Close post translation dropdown on outside click
  useEffect(() => {
    if (!showTranslationMenu) return;
    const handleOutsideClick = (e) => {
      if (translationMenuRef.current && !translationMenuRef.current.contains(e.target)) {
        setShowTranslationMenu(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [showTranslationMenu]);

  // Close comment translation dropdown on outside click
  useEffect(() => {
    if (!openCommentTransId) return;
    const handleOutsideCommentClick = (e) => {
      if (commentTransMenuRef.current && !commentTransMenuRef.current.contains(e.target)) {
        setOpenCommentTransId(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideCommentClick);
    return () => document.removeEventListener('mousedown', handleOutsideCommentClick);
  }, [openCommentTransId]);

  // Helper to translate post
  const handleTranslatePost = async (targetLangCode) => {
    if (!post.content || translatingPost) return;

    let target = targetLangCode;
    if (!target) {
      if (currentLanguage && currentLanguage !== 'en') {
        target = currentLanguage;
      } else {
        const isArabic = /[\u0600-\u06FF]/.test(post.content);
        const isAmharic = /[\u1200-\u137F]/.test(post.content);
        if (isArabic || isAmharic) {
          target = 'en';
        } else {
          target = 'am'; // Default English to Amharic
        }
      }
    }

    try {
      setTranslatingPost(true);
      const res = await apiTranslateText({
        text: post.content,
        targetLang: target
      });

      if (res.success && res.translatedText && res.translatedText.trim() !== post.content.trim()) {
        setTranslatedContent(res.translatedText);
        setSourceLang(res.sourceLanguage || 'auto');
        setTranslatedTargetLang(target);
        setIsTranslated(true);
        setShowOriginal(false);
      } else {
        showToast(res.message || 'Translation unavailable for this text right now.', 'error');
      }
    } catch (err) {
      showToast(err.message || 'Translation unavailable at the moment.', 'error');
    } finally {
      setTranslatingPost(false);
    }
  };

  // Helper to translate an individual comment
  const handleTranslateComment = async (commentId, content, targetLangCode) => {
    if (!content) return;

    const existing = commentTranslations[commentId];
    if (existing && existing.translatedText && !targetLangCode) {
      setCommentTranslations((prev) => ({
        ...prev,
        [commentId]: {
          ...prev[commentId],
          showOriginal: !prev[commentId].showOriginal
        }
      }));
      return;
    }

    let target = targetLangCode;
    if (!target) {
      const isArabic = /[\u0600-\u06FF]/.test(content);
      const isAmharic = /[\u1200-\u137F]/.test(content);
      if (isArabic) {
        target = currentLanguage !== 'ar' ? currentLanguage : 'en';
      } else if (isAmharic) {
        target = currentLanguage !== 'am' ? currentLanguage : 'en';
      } else {
        target = currentLanguage !== 'en' ? currentLanguage : 'ar';
      }
    }

    try {
      setCommentTranslations((prev) => ({
        ...prev,
        [commentId]: { loading: true }
      }));

      const res = await apiTranslateText({
        text: content,
        targetLang: target
      });

      if (res.success && res.translatedText) {
        setCommentTranslations((prev) => ({
          ...prev,
          [commentId]: {
            translatedText: res.translatedText,
            sourceLang: res.sourceLanguage || 'auto',
            targetLang: target,
            showOriginal: false,
            loading: false
          }
        }));
      }
    } catch (err) {
      setCommentTranslations((prev) => ({
        ...prev,
        [commentId]: { loading: false }
      }));
      showToast(err.message || 'Comment translation unavailable.', 'error');
    }
  };

  // Images carousel state
  const postImages = (post.imageUrls && post.imageUrls.length > 0)
    ? post.imageUrls
    : (post.imageUrl ? [post.imageUrl] : []);
  const [currentImgIdx, setCurrentImgIdx] = useState(0);
  const [failedImages, setFailedImages] = useState(new Set());

  const handlePrevImage = (e) => {
    e.stopPropagation();
    setCurrentImgIdx((prev) => (prev > 0 ? prev - 1 : postImages.length - 1));
  };

  const handleNextImage = (e) => {
    e.stopPropagation();
    setCurrentImgIdx((prev) => (prev < postImages.length - 1 ? prev + 1 : 0));
  };

  // Like state
  const [isLiked, setIsLiked] = useState(post.isLiked || false);
  const [likesCount, setLikesCount] = useState(post.likesCount || (post.likes ? post.likes.length : 0));
  const [likeLoading, setLikeLoading] = useState(false);

  // Bookmark state
  const [isBookmarked, setIsBookmarked] = useState(post.isBookmarked || false);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);

  // Shares state
  const [shareCount, setShareCount] = useState(post.shareCount || 0);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Report state
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // Double-tap heart animation state
  const [showHeartBurst, setShowHeartBurst] = useState(false);

  // Comments state
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentsCount, setCommentsCount] = useState(post.commentsCount || 0);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  // Menu dropdown state
  const [showMenu, setShowMenu] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isOwner = user && post.author && user._id === (post.author._id || post.author);

  // Toggle Like / Unlike (FR-07)
  const handleLikeClick = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (likeLoading) return;

    const prevLiked = isLiked;
    const prevCount = likesCount;
    setIsLiked(!prevLiked);
    setLikesCount(prevLiked ? prevCount - 1 : prevCount + 1);

    try {
      setLikeLoading(true);
      const res = await apiToggleLike(post._id);
      if (res.success) {
        setIsLiked(res.isLiked);
        setLikesCount(res.likesCount);
      } else {
        setIsLiked(prevLiked);
        setLikesCount(prevCount);
      }
    } catch (err) {
      console.error('Like error:', err);
      setIsLiked(prevLiked);
      setLikesCount(prevCount);
    } finally {
      setLikeLoading(false);
    }
  };

  // Double-click on media to like
  const handlePhotoDoubleClick = () => {
    setShowHeartBurst(true);
    setTimeout(() => setShowHeartBurst(false), 800);
    if (!isLiked) {
      handleLikeClick();
    }
  };

  // Toggle Bookmark
  const handleBookmarkClick = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (bookmarkLoading) return;

    const prevBookmarked = isBookmarked;
    setIsBookmarked(!prevBookmarked);

    try {
      setBookmarkLoading(true);
      const res = await apiToggleBookmark(post._id);
      if (res.success) {
        setIsBookmarked(res.isBookmarked);
        showToast(
          res.isBookmarked ? 'Post saved to bookmarks! 🔖' : 'Removed from bookmarks.',
          'success'
        );
      } else {
        setIsBookmarked(prevBookmarked);
      }
    } catch (err) {
      setIsBookmarked(prevBookmarked);
      showToast(err.message || 'Failed to update bookmark.', 'error');
    } finally {
      setBookmarkLoading(false);
    }
  };

  // Toggle Comments section (FR-06)
  const handleToggleComments = async () => {
    const nextState = !showComments;
    setShowComments(nextState);

    if (nextState && comments.length === 0) {
      fetchComments();
    }
  };

  const fetchComments = async () => {
    try {
      setLoadingComments(true);
      const res = await apiGetComments(post._id);
      if (res.success) {
        setComments(res.comments);
        setCommentsCount(res.comments.length);
      }
    } catch (err) {
      console.error('Fetch comments error:', err);
    } finally {
      setLoadingComments(false);
    }
  };

  // Add Comment (FR-06)
  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (!newComment.trim() || submittingComment) return;

    try {
      setSubmittingComment(true);
      const res = await apiAddComment(post._id, newComment.trim());
      if (res.success && res.comment) {
        setComments((prev) => [...prev, res.comment]);
        setCommentsCount((prev) => prev + 1);
        setNewComment('');
        showToast('Comment added!', 'success');
      }
    } catch (err) {
      showToast(err.message || 'Failed to add comment.', 'error');
    } finally {
      setSubmittingComment(false);
    }
  };

  // Delete Comment (FR-06, BR-09)
  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Delete this comment?')) return;

    try {
      const res = await apiDeleteComment(commentId);
      if (res.success) {
        setComments((prev) => prev.filter((c) => c._id !== commentId));
        setCommentsCount((prev) => Math.max(0, prev - 1));
        showToast('Comment deleted.', 'info');
      }
    } catch (err) {
      showToast(err.message || 'Failed to delete comment.', 'error');
    }
  };

  // Delete Post (FR-04, BR-08)
  const handleDeletePost = async () => {
    if (!window.confirm('Are you sure you want to delete this post? This cannot be undone.')) {
      return;
    }

    try {
      setIsDeleting(true);
      const res = await apiDeletePost(post._id);
      if (res.success) {
        showToast('Post deleted successfully.', 'info');
        if (onPostDeleted) {
          onPostDeleted(post._id);
        }
      }
    } catch (err) {
      showToast(err.message || 'Failed to delete post.', 'error');
      setIsDeleting(false);
    }
  };

  const author = post.author || {};
  const authorUsername = author.username || 'unknown';
  const authorFullName = author.fullName || 'Connectly User';

  const exactFullTimestamp = new Date(post.createdAt).toLocaleString(undefined, {
    dateStyle: 'full',
    timeStyle: 'medium'
  });

  return (
    <article className="card post-card">
      {/* Header */}
      <div className="post-header">
        <div
          className="post-author-info"
          onClick={() => navigate(`/profile/${authorUsername}`)}
        >
          <img
            src={getAvatarUrl(author)}
            alt={authorFullName}
            className="post-author-avatar"
          />
          <div className="post-meta">
            <div className="post-author-line">
              <span className="post-author-name">{authorFullName}</span>
              <VerifiedBadge isVerified={author.isVerified} size={15} />
              {/* Visibility Badge */}
              {post.visibility === 'followers' && (
                <span className="post-visibility-pill followers" title="Followers only">
                  <UsersIcon size={11} />
                </span>
              )}
              {post.visibility === 'only_me' && (
                <span className="post-visibility-pill private" title="Only you can see this">
                  <LockIcon size={11} />
                </span>
              )}
              {post.visibility === 'public' && (
                <span className="post-visibility-pill public" title="Public post">
                  <GlobeIcon size={11} />
                </span>
              )}
            </div>

            <div className="post-sub-meta">
              <span className="post-author-username">@{authorUsername}</span>
              <span className="post-dot">•</span>
              <span className="post-time" title={exactFullTimestamp}>
                {formatRelativeTime(post.createdAt)}
              </span>
              {post.isEdited && (
                <span
                  className="post-edited-indicator"
                  title={`Edited on ${new Date(post.editedAt || post.updatedAt).toLocaleString()}`}
                >
                  • (Edited)
                </span>
              )}
              {(post.location?.city || post.location?.country || post.location?.displayLocation) && (
                <>
                  <span className="post-dot">•</span>
                  <span className="post-location-tag text-[11px] text-purple-300 font-medium">
                    📍 {post.location.displayLocation || [post.location.city, post.location.country].filter(Boolean).join(', ')}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Post Options Menu */}
        <div className="post-options-container">
          <button
            className="btn-icon post-menu-trigger"
            onClick={() => setShowMenu(!showMenu)}
            title="Post Options"
          >
            <MoreVerticalIcon size={18} />
          </button>

          {showMenu && (
            <div className="post-dropdown-menu">
              {isOwner ? (
                <>
                  <button
                    className="dropdown-item"
                    onClick={() => {
                      setShowMenu(false);
                      if (onEditPostClick) onEditPostClick(post);
                    }}
                  >
                    <EditIcon size={16} />
                    <span>Edit Post</span>
                  </button>
                  <button
                    className="dropdown-item text-danger"
                    onClick={() => {
                      setShowMenu(false);
                      handleDeletePost();
                    }}
                    disabled={isDeleting}
                  >
                    <TrashIcon size={16} />
                    <span>Delete Post</span>
                  </button>
                </>
              ) : (
                <button
                  className="dropdown-item text-danger"
                  onClick={() => {
                    setShowMenu(false);
                    if (!isAuthenticated) {
                      navigate('/login');
                      return;
                    }
                    setIsReportModalOpen(true);
                  }}
                >
                  <FlagIcon size={16} />
                  <span>Report Post</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Post Text Content with Hashtag & Mention Support (BR-13) */}
      {post.content && (
        <div className="post-content">
          <p className={isTranslated && !showOriginal && (activeLanguage.direction === 'rtl' || /[\u0600-\u06FF]/.test(translatedContent)) ? 'rtl-text' : ''}>
            {renderParsedText(
              isTranslated && !showOriginal ? translatedContent : post.content,
              {
                onTagClick: (tag) => navigate(`/?tag=${encodeURIComponent(tag)}`),
                onUserClick: (uname) => navigate(`/profile/${uname}`)
              }
            )}
          </p>

          {/* Multilingual Bridge Translation Meta */}
          <div className="post-translation-meta">
            {isTranslated ? (
              <div className="translation-active-badge">
                <div className="translation-active-info">
                  <SparklesIcon size={12} className="text-primary inline-icon mr-1" />
                  <span className="translation-provider-text">
                    {showOriginal
                      ? 'Showing original'
                      : `Translated to ${supportedLanguages.find((l) => l.code === translatedTargetLang)?.name || translatedTargetLang.toUpperCase()} by Connectly AI Bridge`}
                  </span>
                </div>

                <div className="translation-active-actions">
                  <button
                    type="button"
                    className="translation-toggle-btn"
                    onClick={() => setShowOriginal((prev) => !prev)}
                  >
                    {showOriginal ? t('seeTranslation') : t('seeOriginal')}
                  </button>

                  <div className="translation-switch-wrapper" ref={translationMenuRef}>
                    <button
                      type="button"
                      className="translation-switch-btn"
                      onClick={() => setShowTranslationMenu((prev) => !prev)}
                      title="Switch language"
                    >
                      <LanguagesIcon size={12} />
                      <span>{supportedLanguages.find((l) => l.code === translatedTargetLang)?.nativeName || 'Language'}</span>
                      <ChevronDownIcon size={11} className={`trans-chevron ${showTranslationMenu ? 'rotate-180' : ''}`} />
                    </button>

                    {showTranslationMenu && (
                      <div className="translation-dropdown-menu">
                        <div className="translation-dropdown-header">
                          <span>{t('selectLanguage') || 'Select Language'}</span>
                        </div>
                        <div className="translation-dropdown-list">
                          {supportedLanguages.map((l) => (
                            <button
                              key={l.code}
                              type="button"
                              className={`translation-dropdown-item ${translatedTargetLang === l.code && !showOriginal ? 'active' : ''}`}
                              onClick={() => {
                                setShowTranslationMenu(false);
                                handleTranslatePost(l.code);
                              }}
                              disabled={translatingPost}
                            >
                              <span className="trans-flag">{l.flag}</span>
                              <span className="trans-name">{l.name}</span>
                              <span className="trans-native">{l.nativeName}</span>
                              {translatedTargetLang === l.code && !showOriginal && (
                                <CheckIcon size={13} className="trans-check-icon" />
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="translation-trigger-wrapper" ref={translationMenuRef}>
                <div className="post-translate-btn-group">
                  <button
                    type="button"
                    className="post-translate-btn"
                    onClick={() => handleTranslatePost()}
                    disabled={translatingPost}
                    title="Translate post"
                  >
                    <LanguagesIcon size={13} />
                    <span>
                      {translatingPost
                        ? t('translating')
                        : `${t('translate')}`}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="post-translate-chevron-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowTranslationMenu((prev) => !prev);
                    }}
                    disabled={translatingPost}
                    title="Choose language"
                  >
                    <ChevronDownIcon size={11} className={`trans-chevron ${showTranslationMenu ? 'rotate-180' : ''}`} />
                  </button>
                </div>

                {showTranslationMenu && (
                  <div className="translation-dropdown-menu">
                    <div className="translation-dropdown-header">
                      <span>{t('selectLanguage') || 'Select Language'}</span>
                    </div>
                    <div className="translation-dropdown-list">
                      {supportedLanguages.map((l) => (
                        <button
                          key={l.code}
                          type="button"
                          className="translation-dropdown-item"
                          onClick={() => {
                            setShowTranslationMenu(false);
                            handleTranslatePost(l.code);
                          }}
                          disabled={translatingPost}
                        >
                          <span className="trans-flag">{l.flag}</span>
                          <span className="trans-name">{l.name}</span>
                          <span className="trans-native">{l.nativeName}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Post Video Player */}
      {post.videoUrl && (
        <div
          className="post-video-container relative-container"
          onDoubleClick={handlePhotoDoubleClick}
          title="Double click video to like"
        >
          <video
            src={post.videoUrl}
            controls
            playsInline
            preload="metadata"
            className="post-video-player"
          />
          {showHeartBurst && (
            <div className="heart-burst-overlay">
              <HeartIcon filled={true} size={70} className="heart-burst-icon" />
            </div>
          )}
        </div>
      )}

      {/* Post Image(s) with Double-Tap to Like & Multi-Image Carousel */}
      {postImages.length > 0 && !post.videoUrl && (
        <div
          className="post-image-container relative-container post-carousel-container"
          onDoubleClick={handlePhotoDoubleClick}
          title="Double click photo to like"
        >
          {failedImages.has(postImages[currentImgIdx]) ? (
            <div className="post-media-error-placeholder">
              <ImageIcon size={36} className="text-muted mb-2" />
              <span className="text-muted text-sm font-medium">Image temporarily unavailable</span>
            </div>
          ) : (
            <img
              src={postImages[currentImgIdx]}
              alt={`Post media ${currentImgIdx + 1} of ${postImages.length}`}
              className="post-image"
              loading="lazy"
              onError={() => {
                setFailedImages((prev) => new Set([...prev, postImages[currentImgIdx]]));
              }}
            />
          )}

          {/* Multi-image indicators & navigation controls */}
          {postImages.length > 1 && (
            <>
              <button
                type="button"
                className="carousel-nav-btn carousel-prev-btn"
                onClick={handlePrevImage}
                aria-label="Previous image"
              >
                <ChevronLeftIcon size={18} />
              </button>
              <button
                type="button"
                className="carousel-nav-btn carousel-next-btn"
                onClick={handleNextImage}
                aria-label="Next image"
              >
                <ChevronRightIcon size={18} />
              </button>
              <div className="carousel-badge">
                {currentImgIdx + 1} / {postImages.length}
              </div>
              <div className="carousel-dots">
                {postImages.map((_, idx) => (
                  <span
                    key={idx}
                    className={`carousel-dot ${idx === currentImgIdx ? 'active' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentImgIdx(idx);
                    }}
                  />
                ))}
              </div>
            </>
          )}

          {showHeartBurst && (
            <div className="heart-burst-overlay">
              <HeartIcon filled={true} size={70} className="heart-burst-icon" />
            </div>
          )}
        </div>
      )}

      {/* Action Buttons: Like, Comment, Bookmark, Share */}
      <div className="post-actions">
        <button
          className={`post-action-btn like-btn ${isLiked ? 'active' : ''}`}
          onClick={handleLikeClick}
          title={isLiked ? 'Unlike' : 'Like'}
        >
          <HeartIcon filled={isLiked} size={19} className={isLiked ? 'heart-liked' : ''} />
          <span>{likesCount} {likesCount === 1 ? 'Like' : 'Likes'}</span>
        </button>

        <button
          className={`post-action-btn comment-btn ${showComments ? 'active' : ''}`}
          onClick={handleToggleComments}
          title="Comments"
        >
          <MessageCircleIcon size={19} />
          <span>{commentsCount} {commentsCount === 1 ? 'Comment' : 'Comments'}</span>
        </button>

        <button
          className={`post-action-btn bookmark-btn ${isBookmarked ? 'active' : ''}`}
          onClick={handleBookmarkClick}
          title={isBookmarked ? 'Remove Bookmark' : 'Save Post'}
        >
          <BookmarkIcon filled={isBookmarked} size={19} />
          <span>{isBookmarked ? 'Saved' : 'Save'}</span>
        </button>

        <button
          className="post-action-btn share-btn"
          onClick={() => setIsShareModalOpen(true)}
          title="Share Post Link & Social"
        >
          <Share2Icon size={18} />
          <span>{shareCount > 0 ? `${shareCount} ${shareCount === 1 ? 'Share' : 'Shares'}` : 'Share'}</span>
        </button>
      </div>

      {/* Expandable Comments Section */}
      {showComments && (
        <div className="comments-section">
          {isAuthenticated ? (
            <form className="comment-form" onSubmit={handleAddComment}>
              <img
                src={getAvatarUrl(user)}
                alt={user.fullName}
                className="comment-user-avatar"
              />
              <div className="comment-input-wrapper">
                <input
                  type="text"
                  placeholder="Write a comment... (use #tags or @mentions)"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  maxLength={1000}
                />
                <button
                  type="submit"
                  className="btn btn-primary btn-sm comment-submit-btn"
                  disabled={!newComment.trim() || submittingComment}
                >
                  <SendIcon size={16} />
                </button>
              </div>
            </form>
          ) : (
            <div className="comment-guest-prompt">
              <span onClick={() => navigate('/login')} className="link-text">
                Log in
              </span>{' '}
              to leave a comment.
            </div>
          )}

          {/* Comments list */}
          <div className="comments-list">
            {loadingComments ? (
              <div className="comments-loading">Loading comments...</div>
            ) : comments.length > 0 ? (
              comments.map((comment) => {
                const commentAuthor = comment.author || {};
                const isCommentOwner = user && commentAuthor._id === user._id;
                const cTrans = commentTranslations[comment._id];

                return (
                  <div key={comment._id} className="comment-item">
                    <img
                      src={getAvatarUrl(commentAuthor)}
                      alt={commentAuthor.fullName}
                      className="comment-author-avatar"
                      onClick={() => navigate(`/profile/${commentAuthor.username}`)}
                    />
                    <div className="comment-bubble">
                      <div className="comment-header">
                        <span
                          className="comment-author-name"
                          onClick={() => navigate(`/profile/${commentAuthor.username}`)}
                        >
                          {commentAuthor.fullName || 'User'}
                        </span>
                        <VerifiedBadge isVerified={commentAuthor.isVerified} size={13} />
                        <span className="comment-date">
                          {formatRelativeTime(comment.createdAt)}
                        </span>
                      </div>
                      <p className={`comment-text ${cTrans?.translatedText && !cTrans?.showOriginal && (activeLanguage.direction === 'rtl' || /[\u0600-\u06FF]/.test(cTrans.translatedText)) ? 'rtl-text' : ''}`}>
                        {renderParsedText(
                          cTrans?.translatedText && !cTrans?.showOriginal
                            ? cTrans.translatedText
                            : comment.content,
                          {
                            onTagClick: (tag) => navigate(`/?tag=${encodeURIComponent(tag)}`),
                            onUserClick: (uname) => navigate(`/profile/${uname}`)
                          }
                        )}
                      </p>

                      {/* Comment Translation Meta */}
                      <div className="comment-translation-meta">
                        {cTrans?.translatedText ? (
                          <div className="comment-trans-badge">
                            <span className="comment-trans-note">
                              {cTrans.showOriginal
                                ? 'Original'
                                : `Translated to ${supportedLanguages.find((l) => l.code === cTrans.targetLang)?.name || 'target'}`}
                            </span>
                            <button
                              type="button"
                              className="comment-trans-toggle"
                              onClick={() => handleTranslateComment(comment._id, comment.content)}
                            >
                              {cTrans.showOriginal ? t('seeTranslation') : t('seeOriginal')}
                            </button>
                            <div
                              className="comment-trans-switch-wrapper"
                              ref={openCommentTransId === comment._id ? commentTransMenuRef : null}
                            >
                              <button
                                type="button"
                                className="comment-trans-switch-btn"
                                onClick={() => setOpenCommentTransId(openCommentTransId === comment._id ? null : comment._id)}
                                title="Switch language"
                              >
                                <LanguagesIcon size={11} />
                                <ChevronDownIcon size={9} />
                              </button>

                              {openCommentTransId === comment._id && (
                                <div className="translation-dropdown-menu comment-dropdown">
                                  <div className="translation-dropdown-header">
                                    <span>{t('selectLanguage') || 'Select Language'}</span>
                                  </div>
                                  <div className="translation-dropdown-list">
                                    {supportedLanguages.map((l) => (
                                      <button
                                        key={l.code}
                                        type="button"
                                        className={`translation-dropdown-item ${cTrans.targetLang === l.code && !cTrans.showOriginal ? 'active' : ''}`}
                                        onClick={() => {
                                          setOpenCommentTransId(null);
                                          handleTranslateComment(comment._id, comment.content, l.code);
                                        }}
                                      >
                                        <span className="trans-flag">{l.flag}</span>
                                        <span className="trans-name">{l.name}</span>
                                        <span className="trans-native">{l.nativeName}</span>
                                        {cTrans.targetLang === l.code && !cTrans.showOriginal && (
                                          <CheckIcon size={12} className="trans-check-icon" />
                                        )}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div
                            className="comment-translate-actions"
                            ref={openCommentTransId === comment._id ? commentTransMenuRef : null}
                          >
                            <div className="comment-trans-switch-wrapper">
                              <button
                                type="button"
                                className="comment-translate-link"
                                onClick={() => setOpenCommentTransId(openCommentTransId === comment._id ? null : comment._id)}
                                disabled={cTrans?.loading}
                                title="Translate comment"
                              >
                                <LanguagesIcon size={11} />
                                <span>
                                  {cTrans?.loading
                                    ? t('translating')
                                    : t('translate')}
                                </span>
                                <ChevronDownIcon size={9} />
                              </button>

                              {openCommentTransId === comment._id && (
                                <div className="translation-dropdown-menu comment-dropdown">
                                  <div className="translation-dropdown-header">
                                    <span>{t('selectLanguage') || 'Select Language'}</span>
                                  </div>
                                  <div className="translation-dropdown-list">
                                    {supportedLanguages.map((l) => (
                                      <button
                                        key={l.code}
                                        type="button"
                                        className="translation-dropdown-item"
                                        onClick={() => {
                                          setOpenCommentTransId(null);
                                          handleTranslateComment(comment._id, comment.content, l.code);
                                        }}
                                      >
                                        <span className="trans-flag">{l.flag}</span>
                                        <span className="trans-name">{l.name}</span>
                                        <span className="trans-native">{l.nativeName}</span>
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {isCommentOwner && (
                      <button
                        className="comment-delete-btn"
                        onClick={() => handleDeleteComment(comment._id)}
                        title="Delete Comment"
                      >
                        <TrashIcon size={14} />
                      </button>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="comments-empty">No comments yet. Be the first to join the conversation!</div>
            )}
          </div>
        </div>
      )}

      {/* Share Modal */}
      <ShareModal
        isOpen={isShareModalOpen}
        post={post}
        onClose={() => setIsShareModalOpen(false)}
        onPostShared={(_id, updatedCount) => setShareCount(updatedCount)}
      />

      {/* Report Modal */}
      <ReportModal
        isOpen={isReportModalOpen}
        post={post}
        onClose={() => setIsReportModalOpen(false)}
        onPostReported={(reportedId) => {
          if (onPostReported) onPostReported(reportedId);
        }}
      />
    </article>
  );
};

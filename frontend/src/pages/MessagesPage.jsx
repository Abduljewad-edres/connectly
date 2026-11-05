import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from '../context/RouterContext';
import { useSocket } from '../context/SocketContext';
import { useToast } from '../context/ToastContext';
import {
  apiGetConversations,
  apiGetOrCreateConversation,
  apiGetMessages,
  apiSendMessage,
  apiMarkConversationSeen
} from '../services/api';
import { getAvatarUrl, formatRelativeTime } from '../utils/formatDate';
import { NewMessageModal } from '../components/NewMessageModal';
import { Skeleton } from '../components/SkeletonLoader';
import {
  SendIcon,
  ImageIcon,
  XIcon,
  SearchIcon,
  CheckIcon,
  CheckCheckIcon,
  MessageSquareIcon,
  PlusSquareIcon,
  UserIcon
} from '../components/Icons';

export const MessagesPage = () => {
  const { user, isAuthenticated } = useAuth();
  const { currentPath, navigate } = useRouter();
  const {
    socket,
    latestMessage,
    isUserOnline,
    activeConversationId,
    setActiveConversationId,
    sendTypingStart,
    sendTypingStop,
    sendConversationSeen,
    setUnreadMessagesCount
  } = useSocket();
  const { showToast } = useToast();

  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [conversationsLoading, setConversationsLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);

  // Filter/search in sidebar
  const [searchFilter, setSearchFilter] = useState('');

  // New message input state
  const [messageText, setMessageText] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState('');
  const [sending, setSending] = useState(false);

  // Typing state
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const typingTimeoutRef = useRef(null);

  // Modals
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [lightboxImageUrl, setLightboxImageUrl] = useState(null);

  // Refs
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  // Scroll to bottom helper
  const scrollToBottom = (smooth = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
    }
  };

  // 1. Initial conversations fetch
  const loadConversations = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      setConversationsLoading(true);
      const res = await apiGetConversations();
      if (res.success) {
        const convs = res.conversations || [];
        setConversations(convs);
        if (res.totalUnread !== undefined) {
          setUnreadMessagesCount(res.totalUnread);
        }

        // Auto-select conversation with unread messages or recent conversation on desktop
        if (!activeConversation && convs.length > 0) {
          const unreadConv = convs.find((c) => (c.unreadCount || 0) > 0);
          const isDesktop = window.innerWidth >= 768;
          if (unreadConv) {
            selectConversation(unreadConv);
          } else if (isDesktop) {
            selectConversation(convs[0]);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setConversationsLoading(false);
    }
  }, [isAuthenticated, setUnreadMessagesCount, activeConversation]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Handle URL query parameters (e.g., /messages?user=john or /messages?conv=123)
  useEffect(() => {
    const handleUrlParams = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const targetUsername = urlParams.get('user');
      const targetConvId = urlParams.get('conv');

      if (targetUsername) {
        try {
          const res = await apiGetOrCreateConversation({ username: targetUsername });
          if (res.success && res.conversation) {
            selectConversation(res.conversation);
          }
        } catch (err) {
          console.error('Failed to get conversation for user:', err);
        }
      } else if (targetConvId && conversations.length > 0) {
        const found = conversations.find((c) => c._id === targetConvId);
        if (found && (!activeConversation || activeConversation._id !== found._id)) {
          selectConversation(found);
        }
      }
    };

    if (isAuthenticated) {
      handleUrlParams();
    }
  }, [conversations, currentPath, isAuthenticated]);

  // 2. Select conversation and load messages
  const selectConversation = async (conv) => {
    setActiveConversation(conv);
    setActiveConversationId(conv._id);
    setIsOtherTyping(false);

    try {
      setMessagesLoading(true);
      const res = await apiGetMessages(conv._id);
      if (res.success) {
        setMessages(res.messages || []);
        setTimeout(() => scrollToBottom(false), 50);
      }

      // Mark conversation as seen
      if (conv.unreadCount > 0) {
        await apiMarkConversationSeen(conv._id);
        const otherParticipant = conv.otherParticipant || conv.participants.find(
          (p) => (p._id || p).toString() !== user._id.toString()
        );
        if (otherParticipant) {
          sendConversationSeen(conv._id, otherParticipant._id || otherParticipant);
        }

        // Update local counts
        setConversations((prev) =>
          prev.map((c) => (c._id === conv._id ? { ...c, unreadCount: 0 } : c))
        );
        setUnreadMessagesCount((prev) => Math.max(0, prev - (conv.unreadCount || 0)));
      }
    } catch (err) {
      console.error('Failed to load messages for conversation:', err);
    } finally {
      setMessagesLoading(false);
    }
  };

  // Clean up active conversation on unmount
  useEffect(() => {
    return () => {
      setActiveConversationId(null);
    };
  }, [setActiveConversationId]);

  // 3. Listen to incoming real-time socket message
  useEffect(() => {
    if (!latestMessage) return;

    // Check if the message belongs to current active conversation
    if (activeConversation && latestMessage.conversation === activeConversation._id) {
      setMessages((prev) => {
        // Guard against duplicate messages
        if (prev.some((m) => m._id === latestMessage._id)) return prev;
        return [...prev, latestMessage];
      });
      setTimeout(() => scrollToBottom(true), 50);

      // If message is from other user, automatically mark as seen
      if (latestMessage.sender?._id !== user._id) {
        apiMarkConversationSeen(activeConversation._id).catch(() => {});
        sendConversationSeen(activeConversation._id, latestMessage.sender?._id);
      }
    }

    // Update conversation sidebar list
    setConversations((prev) => {
      let found = false;
      const updated = prev.map((c) => {
        if (c._id === latestMessage.conversation) {
          found = true;
          const isCurrentActive = activeConversation && activeConversation._id === c._id;
          return {
            ...c,
            lastMessageText: latestMessage.text || (latestMessage.imageUrl ? '📷 Photo' : ''),
            lastMessageAt: latestMessage.createdAt,
            unreadCount: isCurrentActive ? 0 : (c.unreadCount || 0) + 1
          };
        }
        return c;
      });

      if (!found) {
        // If this message is from a conversation not currently in list, reload from server
        loadConversations();
        return prev;
      }

      // Sort with latest on top
      return updated.sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));
    });
  }, [latestMessage, activeConversation, user?._id, sendConversationSeen]);

  // 4. Socket listeners for typing & seen events
  useEffect(() => {
    if (!socket || !activeConversation) return;

    const handleTypingStarted = (data) => {
      if (data.conversationId === activeConversation._id) {
        setIsOtherTyping(true);
        scrollToBottom(true);
      }
    };

    const handleTypingStopped = (data) => {
      if (data.conversationId === activeConversation._id) {
        setIsOtherTyping(false);
      }
    };

    const handleSeenAll = (data) => {
      if (data.conversationId === activeConversation._id) {
        setMessages((prev) =>
          prev.map((m) =>
            m.sender?._id === user._id || m.sender === user._id
              ? { ...m, status: 'seen', seenAt: data.seenAt }
              : m
          )
        );
      }
    };

    socket.on('typing:started', handleTypingStarted);
    socket.on('typing:stopped', handleTypingStopped);
    socket.on('message:seen_all', handleSeenAll);

    return () => {
      socket.off('typing:started', handleTypingStarted);
      socket.off('typing:stopped', handleTypingStopped);
      socket.off('message:seen_all', handleSeenAll);
    };
  }, [socket, activeConversation, user?._id]);

  // 5. Typing emission handler
  const handleInputChange = (e) => {
    const val = e.target.value;
    setMessageText(val);

    if (!activeConversation) return;
    const otherParticipant = activeConversation.participants.find(
      (p) => p._id.toString() !== user._id.toString()
    );
    if (!otherParticipant) return;

    // Send typing start
    sendTypingStart(activeConversation._id, otherParticipant._id);

    // Reset stop timer
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      sendTypingStop(activeConversation._id, otherParticipant._id);
    }, 1500);
  };

  // Image file select handler
  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        showToast('Please select a valid image file.', 'error');
        return;
      }
      setSelectedImage(file);
      setImagePreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleClearImage = () => {
    setSelectedImage(null);
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
      setImagePreviewUrl('');
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 6. Send message handler
  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!activeConversation || sending) return;

    const trimmed = messageText.trim();
    if (!trimmed && !selectedImage) return;

    // Clear typing indicator
    const otherParticipant = activeConversation.participants.find(
      (p) => p._id.toString() !== user._id.toString()
    );
    if (otherParticipant) {
      sendTypingStop(activeConversation._id, otherParticipant._id);
    }

    try {
      setSending(true);
      const res = await apiSendMessage(activeConversation._id, {
        text: trimmed,
        image: selectedImage
      });

      if (res.success && res.data) {
        const newMsg = res.data;
        setMessages((prev) => [...prev, newMsg]);
        setMessageText('');
        handleClearImage();
        setTimeout(() => scrollToBottom(true), 50);

        // Update conversation sidebar preview
        setConversations((prev) => {
          const updated = prev.map((c) =>
            c._id === activeConversation._id
              ? {
                  ...c,
                  lastMessageText: newMsg.text || '📷 Photo',
                  lastMessageAt: newMsg.createdAt
                }
              : c
          );
          return updated.sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));
        });
      }
    } catch (err) {
      showToast(err.message || 'Failed to send message.', 'error');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Active other participant
  const otherParticipant = activeConversation
    ? (activeConversation.otherParticipant ||
       activeConversation.participants?.find((p) => (p._id || p).toString() !== user?._id?.toString()))
    : null;

  const isOtherOnline = otherParticipant ? isUserOnline(otherParticipant._id) : false;

  // Filter conversations
  const filteredConversations = conversations.filter((c) => {
    if (!searchFilter.trim()) return true;
    const other = c.participants.find((p) => p._id.toString() !== user?._id.toString());
    if (!other) return false;
    const term = searchFilter.toLowerCase();
    return (
      other.fullName?.toLowerCase().includes(term) ||
      other.username?.toLowerCase().includes(term) ||
      c.lastMessageText?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="messages-page-wrapper">
      <div className="messages-layout-card">
        {/* Left: Conversations Sidebar */}
        <aside
          className={`messages-sidebar ${
            activeConversation ? 'hide-on-mobile' : 'show-on-mobile'
          }`}
        >
          <div className="messages-sidebar-header">
            <div className="sidebar-header-title">
              <h2>Messages</h2>
              <span className="badge badge-primary">{conversations.length}</span>
            </div>
            <button
              className="btn btn-primary btn-sm btn-new-chat"
              onClick={() => setIsNewChatModalOpen(true)}
              title="Start a new chat"
            >
              <PlusSquareIcon size={16} />
              <span>New</span>
            </button>
          </div>

          {/* Search conversation */}
          <div className="messages-search-bar">
            <SearchIcon size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Search chats..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
            />
            {searchFilter && (
              <button
                className="btn-icon btn-sm clear-btn"
                onClick={() => setSearchFilter('')}
              >
                <XIcon size={14} />
              </button>
            )}
          </div>

          {/* Conversations List */}
          <div className="conversations-scroll-list">
            {conversationsLoading ? (
              <div style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px' }}>
                    <Skeleton width="44px" height="44px" borderRadius="50%" />
                    <div style={{ flex: 1 }}>
                      <Skeleton width="110px" height="14px" style={{ marginBottom: '6px' }} />
                      <Skeleton width="80%" height="11px" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-6 text-center text-muted empty-convs">
                <MessageSquareIcon size={36} className="mb-2 opacity-50" />
                <p>No conversations found.</p>
                <button
                  className="btn btn-outline btn-sm mt-3"
                  onClick={() => setIsNewChatModalOpen(true)}
                >
                  Start a conversation
                </button>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const other = conv.otherParticipant || conv.participants?.find(
                  (p) => (p._id || p).toString() !== user?._id?.toString()
                );
                if (!other) return null;
                const isOnline = isUserOnline(other._id);
                const isSelected = activeConversation && activeConversation._id === conv._id;

                return (
                  <div
                    key={conv._id}
                    className={`conversation-item ${isSelected ? 'selected' : ''} ${
                      conv.unreadCount > 0 ? 'unread' : ''
                    }`}
                    onClick={() => selectConversation(conv)}
                  >
                    <div className="avatar-wrapper">
                      <img
                        src={getAvatarUrl(other)}
                        alt={other.fullName}
                        className="conversation-avatar"
                      />
                      <span
                        className={`presence-dot ${isOnline ? 'online' : 'offline'}`}
                        title={isOnline ? 'Online now' : 'Offline'}
                      />
                    </div>

                    <div className="conversation-content">
                      <div className="conversation-top-row">
                        <span className="participant-name">{other.fullName}</span>
                        <span className="conversation-time">
                          {formatRelativeTime(conv.lastMessageAt || conv.createdAt)}
                        </span>
                      </div>
                      <div className="conversation-bottom-row">
                        <span className="last-message-snippet">
                          {conv.lastMessageText || 'Started a conversation'}
                        </span>
                        {conv.unreadCount > 0 && (
                          <span className="unread-badge">{conv.unreadCount}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* Right: Active Chat Area */}
        <main
          className={`messages-chat-pane ${
            !activeConversation ? 'hide-on-mobile' : 'show-on-mobile'
          }`}
        >
          {activeConversation && otherParticipant ? (
            <>
              {/* Chat Header */}
              <header className="chat-header">
                <div className="chat-header-left">
                  <button
                    className="btn-icon mobile-back-btn"
                    onClick={() => {
                      setActiveConversation(null);
                      setActiveConversationId(null);
                    }}
                    title="Back to conversations"
                  >
                    ←
                  </button>
                  <div className="avatar-wrapper">
                    <img
                      src={getAvatarUrl(otherParticipant)}
                      alt={otherParticipant.fullName}
                      className="chat-header-avatar"
                    />
                    <span
                      className={`presence-dot ${isOtherOnline ? 'online' : 'offline'}`}
                    />
                  </div>
                  <div className="chat-participant-meta">
                    <h3
                      className="chat-participant-name"
                      onClick={() => navigate(`/profile/${otherParticipant.username}`)}
                    >
                      {otherParticipant.fullName}
                    </h3>
                    <div className="chat-participant-sub">
                      {isOtherTyping ? (
                        <span className="typing-indicator-text">
                          <span className="typing-dot"></span>
                          <span className="typing-dot"></span>
                          <span className="typing-dot"></span>
                          typing...
                        </span>
                      ) : isOtherOnline ? (
                        <span className="status-online">Online</span>
                      ) : (
                        <span className="status-offline">Offline</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="chat-header-actions">
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => navigate(`/profile/${otherParticipant.username}`)}
                  >
                    <UserIcon size={14} />
                    <span>Profile</span>
                  </button>
                </div>
              </header>

              {/* Message History Thread */}
              <div className="chat-messages-container">
                {messagesLoading ? (
                  <div className="p-8 text-center text-muted">
                    <div className="spinner mx-auto mb-2"></div>
                    <p>Loading chat history...</p>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="chat-start-prompt">
                    <img
                      src={getAvatarUrl(otherParticipant)}
                      alt={otherParticipant.fullName}
                      className="prompt-avatar"
                    />
                    <h4>{otherParticipant.fullName}</h4>
                    <p className="text-muted">@{otherParticipant.username}</p>
                    <p className="prompt-text">
                      No messages here yet. Send a friendly message or photo to start the
                      conversation!
                    </p>
                  </div>
                ) : (
                  messages.map((msg, index) => {
                    const isMine =
                      (msg.sender?._id || msg.sender) === user?._id ||
                      (msg.sender?._id || msg.sender).toString() === user?._id.toString();

                    return (
                      <div
                        key={msg._id || index}
                        className={`message-bubble-row ${isMine ? 'outgoing' : 'incoming'}`}
                      >
                        {!isMine && (
                          <img
                            src={getAvatarUrl(msg.sender || otherParticipant)}
                            alt=""
                            className="message-sender-avatar"
                          />
                        )}

                        <div className="message-bubble-content">
                          {/* Photo Attachment if present */}
                          {msg.imageUrl && (
                            <div
                              className="message-image-wrapper"
                              onClick={() => setLightboxImageUrl(msg.imageUrl)}
                            >
                              <img
                                src={msg.imageUrl}
                                alt="Attachment"
                                className="message-image-thumb"
                                loading="lazy"
                              />
                            </div>
                          )}

                          {/* Text Body */}
                          {msg.text && <p className="message-text">{msg.text}</p>}

                          {/* Footer: Time + Status Indicator */}
                          <div className="message-footer">
                            <span className="message-timestamp">
                              {formatRelativeTime(msg.createdAt)}
                            </span>

                            {isMine && (
                              <span
                                className={`message-status-icon ${
                                  msg.status === 'seen' ? 'status-seen' : ''
                                }`}
                                title={
                                  msg.status === 'seen'
                                    ? `Seen at ${new Date(msg.seenAt || msg.updatedAt).toLocaleTimeString()}`
                                    : msg.status === 'delivered'
                                    ? 'Delivered'
                                    : 'Sent'
                                }
                              >
                                {msg.status === 'seen' ? (
                                  <CheckCheckIcon size={14} className="text-seen" />
                                ) : msg.status === 'delivered' ? (
                                  <CheckCheckIcon size={14} />
                                ) : (
                                  <CheckIcon size={14} />
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}

                {/* Animated typing indicator bubble */}
                {isOtherTyping && (
                  <div className="message-bubble-row incoming">
                    <img
                      src={getAvatarUrl(otherParticipant)}
                      alt=""
                      className="message-sender-avatar"
                    />
                    <div className="message-bubble-content typing-bubble">
                      <div className="bouncing-dots">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Image Preview before send */}
              {imagePreviewUrl && (
                <div className="chat-image-preview-bar">
                  <div className="preview-thumb-container">
                    <img src={imagePreviewUrl} alt="Preview" className="preview-thumb" />
                    <button
                      className="btn-icon remove-preview-btn"
                      onClick={handleClearImage}
                      title="Remove image"
                    >
                      <XIcon size={14} />
                    </button>
                  </div>
                  <span className="preview-filename">{selectedImage?.name}</span>
                </div>
              )}

              {/* Chat Input Toolbar */}
              <form className="chat-input-toolbar" onSubmit={handleSendMessage}>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleImageSelect}
                />

                <button
                  type="button"
                  className="btn-icon attach-media-btn"
                  onClick={() => fileInputRef.current?.click()}
                  title="Attach an image"
                >
                  <ImageIcon size={20} />
                </button>

                <textarea
                  ref={textareaRef}
                  className="chat-textarea"
                  placeholder={`Message @${otherParticipant.username}...`}
                  rows={1}
                  value={messageText}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                />

                <button
                  type="submit"
                  className="btn btn-primary send-msg-btn"
                  disabled={sending || (!messageText.trim() && !selectedImage)}
                  title="Send Message"
                >
                  <SendIcon size={18} />
                </button>
              </form>
            </>
          ) : (
            /* Empty placeholder when no chat selected */
            <div className="chat-empty-state">
              <div className="empty-state-card">
                <div className="empty-state-icon-circle">
                  <MessageSquareIcon size={42} />
                </div>
                <h3>Your Direct Messages</h3>
                <p>
                  Send private messages and photos to your friends and creators on Connectly.
                </p>
                <button
                  className="btn btn-primary mt-4"
                  onClick={() => setIsNewChatModalOpen(true)}
                >
                  <PlusSquareIcon size={18} />
                  <span>Start a Conversation</span>
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* New Chat Modal */}
      <NewMessageModal
        isOpen={isNewChatModalOpen}
        onClose={() => setIsNewChatModalOpen(false)}
        onSelectConversation={(conv) => {
          // If conversation is already in list, select it
          setConversations((prev) => {
            if (!prev.some((c) => c._id === conv._id)) {
              return [conv, ...prev];
            }
            return prev;
          });
          selectConversation(conv);
        }}
      />

      {/* Lightbox Modal for Full Image View */}
      {lightboxImageUrl && (
        <div className="image-lightbox-overlay" onClick={() => setLightboxImageUrl(null)}>
          <button
            className="btn-icon lightbox-close-btn"
            onClick={() => setLightboxImageUrl(null)}
          >
            <XIcon size={24} />
          </button>
          <img
            src={lightboxImageUrl}
            alt="Full Preview"
            className="lightbox-full-image"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};


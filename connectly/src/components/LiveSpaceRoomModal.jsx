import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useToast } from '../context/ToastContext';
import { useWebRTCAudio } from '../utils/useWebRTCAudio';
import {
  apiLeaveLiveSpace,
  apiUpdateParticipantRole,
  apiEndLiveSpace,
  apiReportLiveSpace
} from '../services/api';
import {
  XIcon,
  MicIcon,
  MicOffIcon,
  HandIcon,
  HeadphonesIcon,
  RadioIcon,
  UsersIcon,
  CheckIcon,
  LockIcon,
  SparklesIcon,
  FlagIcon
} from './Icons';
import { getAvatarUrl } from '../utils/formatDate';

const REACTION_EMOJIS = ['👏', '❤️', '🔥', '💡', '🚀', '😂', '🎉', '🙌'];

export const LiveSpaceRoomModal = ({ isOpen, onClose, space, onSpaceUpdated }) => {
  if (!isOpen || !space) return null;

  const { user } = useAuth();
  const { socket } = useSocket();
  const { showToast } = useToast();

  const currentUserId = user?._id;
  const isHost = space.host && (space.host._id === currentUserId || space.host === currentUserId);
  const isCoHost = (space.coHosts || []).some((ch) => (ch._id || ch) === currentUserId);

  // Participants & Role State
  const [participants, setParticipants] = useState(space.participants || []);
  const currentUserParticipant = participants.find(
    (p) => (p.user?._id || p.user)?.toString() === currentUserId?.toString()
  );
  const currentRole = isHost ? 'host' : currentUserParticipant?.role || (isCoHost ? 'co_host' : 'listener');
  const isSpeakerOrHost = ['host', 'co_host', 'speaker'].includes(currentRole);

  const [isMuted, setIsMuted] = useState(currentUserParticipant ? currentUserParticipant.isMuted : true);
  const [isHandRaised, setIsHandRaised] = useState(currentUserParticipant ? currentUserParticipant.isHandRaised : false);
  const [floatingReactions, setFloatingReactions] = useState([]);
  const [showReactionsPicker, setShowReactionsPicker] = useState(false);
  const [showRaisedHandsDrawer, setShowRaisedHandsDrawer] = useState(false);

  // WebRTC Real Audio hook
  const { micAllowed, micError, audioLevel, initMicrophone } = useWebRTCAudio({
    socket,
    spaceId: space._id,
    currentUser: user,
    role: currentRole,
    isMuted
  });

  // 1. Join room on Socket.IO when modal opens
  useEffect(() => {
    if (!socket || !space._id || !user) return;

    socket.emit('space:join', {
      spaceId: space._id,
      user: {
        _id: user._id,
        fullName: user.fullName,
        username: user.username,
        profilePicture: user.profilePicture,
        isVerified: user.isVerified
      },
      role: currentRole
    });

    // Socket Event: New participant joined
    const handleUserJoined = (participant) => {
      setParticipants((prev) => {
        const idx = prev.findIndex(
          (p) => (p.user?._id || p.user)?.toString() === participant.user?._id?.toString()
        );
        if (idx > -1) {
          const updated = [...prev];
          updated[idx] = { ...updated[idx], ...participant };
          return updated;
        }
        return [...prev, participant];
      });
    };

    // Socket Event: Participant left
    const handleUserLeft = ({ userId }) => {
      setParticipants((prev) =>
        prev.filter((p) => (p.user?._id || p.user)?.toString() !== userId?.toString())
      );
    };

    // Socket Event: Participant mute changed
    const handleUserMuted = ({ userId, isMuted: mutedState }) => {
      setParticipants((prev) =>
        prev.map((p) =>
          (p.user?._id || p.user)?.toString() === userId?.toString()
            ? { ...p, isMuted: mutedState }
            : p
        )
      );
    };

    // Socket Event: Hand raised
    const handleHandRaised = ({ userId, user: raisedUser }) => {
      setParticipants((prev) =>
        prev.map((p) =>
          (p.user?._id || p.user)?.toString() === userId?.toString()
            ? { ...p, isHandRaised: true, handRaisedAt: new Date() }
            : p
        )
      );
      if (isHost || isCoHost) {
        showToast(`${raisedUser?.fullName || 'A listener'} raised their hand to speak ✋`, 'info');
      }
    };

    // Socket Event: Hand lowered
    const handleHandLowered = ({ userId }) => {
      setParticipants((prev) =>
        prev.map((p) =>
          (p.user?._id || p.user)?.toString() === userId?.toString()
            ? { ...p, isHandRaised: false }
            : p
        )
      );
    };

    // Socket Event: Role changed
    const handleRoleChanged = ({ userId, newRole }) => {
      setParticipants((prev) =>
        prev.map((p) =>
          (p.user?._id || p.user)?.toString() === userId?.toString()
            ? { ...p, role: newRole, isHandRaised: false, isMuted: newRole === 'listener' }
            : p
        )
      );
      if (userId?.toString() === currentUserId?.toString()) {
        showToast(
          newRole === 'speaker'
            ? "You've been approved to speak! Turn on your mic 🎙️"
            : `Your role is now: ${newRole}`,
          'success'
        );
        if (newRole === 'speaker') {
          setIsMuted(false);
        }
      }
    };

    // Socket Event: Live reactions
    const handleReactionReceived = ({ emoji, user: reactionUser, timestamp }) => {
      const id = `${timestamp}-${Math.random()}`;
      setFloatingReactions((prev) => [
        ...prev,
        { id, emoji, senderName: reactionUser?.fullName || 'User' }
      ]);
      setTimeout(() => {
        setFloatingReactions((prev) => prev.filter((r) => r.id !== id));
      }, 3000);
    };

    // Socket Event: Space ended
    const handleSpaceEnded = () => {
      showToast('This Live Space has ended.', 'info');
      onClose();
    };

    socket.on('space:user_joined', handleUserJoined);
    socket.on('space:user_left', handleUserLeft);
    socket.on('space:user_muted', handleUserMuted);
    socket.on('space:hand_raised', handleHandRaised);
    socket.on('space:hand_lowered', handleHandLowered);
    socket.on('space:role_changed', handleRoleChanged);
    socket.on('space:reaction_received', handleReactionReceived);
    socket.on('space:ended', handleSpaceEnded);

    return () => {
      socket.emit('space:leave', { spaceId: space._id, userId: user._id });
      socket.off('space:user_joined', handleUserJoined);
      socket.off('space:user_left', handleUserLeft);
      socket.off('space:user_muted', handleUserMuted);
      socket.off('space:hand_raised', handleHandRaised);
      socket.off('space:hand_lowered', handleHandLowered);
      socket.off('space:role_changed', handleRoleChanged);
      socket.off('space:reaction_received', handleReactionReceived);
      socket.off('space:ended', handleSpaceEnded);
    };
  }, [socket, space._id, user, currentRole, currentUserId, isHost, isCoHost, showToast, onClose]);

  // Toggle Microphone
  const handleToggleMute = () => {
    if (!isSpeakerOrHost) {
      showToast('Raise your hand to request speaking permission.', 'info');
      return;
    }
    const newMute = !isMuted;
    setIsMuted(newMute);
    if (socket) {
      socket.emit('space:mute_toggle', {
        spaceId: space._id,
        isMuted: newMute,
        userId: currentUserId
      });
    }
  };

  // Toggle Raise Hand
  const handleToggleHand = () => {
    const newHand = !isHandRaised;
    setIsHandRaised(newHand);
    if (socket) {
      if (newHand) {
        socket.emit('space:raise_hand', { spaceId: space._id, user });
        showToast('Hand raised! The host will review your request.', 'info');
      } else {
        socket.emit('space:lower_hand', { spaceId: space._id, userId: currentUserId });
      }
    }
  };

  // Promote / Demote Participant (Host / Co-host action)
  const handleSetRole = async (targetUserId, newRole) => {
    try {
      const res = await apiUpdateParticipantRole(space._id, targetUserId, newRole);
      if (res.success) {
        if (socket) {
          socket.emit('space:role_change', {
            spaceId: space._id,
            targetUserId,
            newRole
          });
        }
        showToast(`Updated user role to ${newRole}`, 'success');
      }
    } catch (err) {
      showToast(err.message || 'Failed to update role', 'error');
    }
  };

  // Send live reaction
  const handleSendReaction = (emoji) => {
    if (socket) {
      socket.emit('space:reaction', {
        spaceId: space._id,
        emoji,
        user
      });
    }
    setShowReactionsPicker(false);
  };

  // Leave Room
  const handleLeave = async () => {
    try {
      await apiLeaveLiveSpace(space._id);
    } catch (e) {
      // Ignore
    }
    onClose();
  };

  // End Space (Host only)
  const handleEndSpace = async () => {
    if (!window.confirm('Are you sure you want to end this Live Space for everyone?')) return;
    try {
      await apiEndLiveSpace(space._id);
      showToast('Space ended.', 'info');
      onClose();
    } catch (err) {
      showToast(err.message || 'Failed to end space.', 'error');
    }
  };

  // Group participants into Speakers and Listeners
  const speakers = participants.filter((p) =>
    ['host', 'co_host', 'speaker'].includes(p.role)
  );
  const listeners = participants.filter((p) => p.role === 'listener');
  const raisedHands = participants.filter((p) => p.isHandRaised && p.role === 'listener');

  return (
    <div className="live-space-modal-overlay animate-fadeIn">
      <div className="live-space-modal-card">
        
        {/* Floating Animated Reaction Bubbles */}
        <div className="absolute inset-x-0 bottom-24 pointer-events-none flex justify-center z-40 overflow-hidden h-64">
          {floatingReactions.map((r) => (
            <div
              key={r.id}
              className="absolute animate-floatUp text-4xl select-none"
              style={{
                left: `${45 + (Math.random() * 20 - 10)}%`,
                bottom: '10px'
              }}
            >
              {r.emoji}
            </div>
          ))}
        </div>

        {/* Room Header */}
        <div className="live-space-header">
          <div className="min-w-0">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <span className="badge-live-now">
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
                LIVE AUDIO
              </span>
              <span className="badge-topic">
                {space.topic}
              </span>
              {space.isPrivate && (
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'flex', alignItems: 'center' }} title="Private Space">
                  <LockIcon size={12} />
                </span>
              )}
            </div>

            <h2 className="live-space-header-title">
              {space.title}
            </h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
            {(isHost || isCoHost) && raisedHands.length > 0 && (
              <button
                onClick={() => setShowRaisedHandsDrawer(!showRaisedHandsDrawer)}
                className="btn-raised-requests"
              >
                <HandIcon size={14} />
                <span>{raisedHands.length} Request{raisedHands.length > 1 ? 's' : ''}</span>
              </button>
            )}

            <button
              onClick={handleLeave}
              className="live-space-pill-action"
            >
              Leave Quietly
            </button>
          </div>
        </div>

        {/* Room Scrollable Body */}
        <div className="live-space-body scrollbar-thin">
          
          {/* Raised Hands Banner for Hosts */}
          {showRaisedHandsDrawer && (isHost || isCoHost) && (
            <div className="live-space-raised-hands-box animate-fadeIn">
              <h4 style={{ fontSize: '0.75rem', fontWeight: 800, color: '#f59e0b', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <HandIcon size={14} /> Speaking Requests ({raisedHands.length})
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {raisedHands.map((rh) => (
                  <div
                    key={rh.user?._id || rh.user}
                    className="live-space-raised-hand-item"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                      <img
                        src={getAvatarUrl(rh.user?.profilePicture)}
                        alt={rh.user?.fullName}
                        style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border-color)' }}
                      />
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {rh.user?.fullName}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <button
                        onClick={() => handleSetRole(rh.user?._id || rh.user, 'speaker')}
                        className="btn btn-primary btn-sm"
                        style={{ padding: '0.25rem 0.65rem', fontSize: '0.72rem' }}
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => {
                          if (socket) {
                            socket.emit('space:lower_hand', {
                              spaceId: space._id,
                              userId: rh.user?._id || rh.user
                            });
                          }
                        }}
                        className="btn btn-outline btn-sm"
                        style={{ padding: '0.25rem 0.65rem', fontSize: '0.72rem' }}
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STAGE: SPEAKERS & HOSTS */}
          <div>
            <div className="live-space-section-header">
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <RadioIcon size={14} className="text-primary" />
                Speakers ({speakers.length})
              </span>
              {micError && (
                <span style={{ fontSize: '0.72rem', color: 'var(--danger)', fontWeight: 600 }}>
                  ⚠️ {micError}
                </span>
              )}
            </div>

            <div className="live-space-speakers-grid">
              {speakers.map((speaker) => {
                const u = speaker.user || {};
                const isCurrent = (u._id || u).toString() === currentUserId?.toString();
                const isSpeakingNow = isCurrent && !isMuted && audioLevel > 15;

                return (
                  <div
                    key={u._id || u}
                    className="live-space-speaker-card"
                  >
                    {/* Speaking Ripple Avatar */}
                    <div style={{ position: 'relative', marginBottom: '0.5rem' }}>
                      <img
                        src={getAvatarUrl(u.profilePicture)}
                        alt={u.fullName || 'Speaker'}
                        style={{
                          width: '64px',
                          height: '64px',
                          borderRadius: '50%',
                          objectFit: 'cover',
                          border: isSpeakingNow ? '3px solid #10b981' : '2px solid var(--primary)',
                          boxShadow: isSpeakingNow ? '0 0 12px rgba(16, 185, 129, 0.5)' : 'none',
                          transform: isSpeakingNow ? 'scale(1.05)' : 'none',
                          transition: 'all 0.2s ease'
                        }}
                      />
                      {/* Mic Status Badge */}
                      <div
                        style={{
                          position: 'absolute',
                          bottom: '-2px',
                          right: '-2px',
                          width: '22px',
                          height: '22px',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#ffffff',
                          fontSize: '11px',
                          background: speaker.isMuted ? '#ef4444' : '#10b981',
                          border: '2px solid var(--bg-card)',
                          boxShadow: '0 2px 5px rgba(0,0,0,0.3)'
                        }}
                      >
                        {speaker.isMuted ? <MicOffIcon size={11} /> : <MicIcon size={11} />}
                      </div>
                    </div>

                    <span className="live-space-user-fullname">
                      {u.fullName || 'Speaker'}
                    </span>
                    <span className="live-space-user-handle">
                      @{u.username || 'user'}
                    </span>

                    {/* Role Pill */}
                    <span
                      className={speaker.role === 'host' ? 'badge-host' : speaker.role === 'co_host' ? 'badge-cohost' : 'badge-speaker'}
                      style={{ marginTop: '0.35rem' }}
                    >
                      {speaker.role === 'host' ? '★ Host' : speaker.role === 'co_host' ? 'Co-Host' : 'Speaker'}
                    </span>

                    {/* Host Moderation Dropdown Action */}
                    {(isHost || isCoHost) && !isCurrent && speaker.role !== 'host' && (
                      <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <button
                          onClick={() => handleSetRole(u._id || u, 'listener')}
                          className="btn-demote"
                          title="Move to listeners"
                        >
                          Demote
                        </button>
                        {isHost && speaker.role !== 'co_host' && (
                          <button
                            onClick={() => handleSetRole(u._id || u, 'co_host')}
                            className="btn-cohost"
                            title="Make Co-Host"
                          >
                            +Co-Host
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* LISTENERS SECTION */}
          <div>
            <div className="live-space-section-header">
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <HeadphonesIcon size={14} className="text-primary" />
                Listeners ({listeners.length})
              </span>
            </div>

            {listeners.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '1.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                No listeners in the room yet. Share the space link to invite friends!
              </div>
            ) : (
              <div className="live-space-listeners-grid">
                {listeners.map((listener) => {
                  const u = listener.user || {};
                  const isCurrent = (u._id || u).toString() === currentUserId?.toString();

                  return (
                    <div
                      key={u._id || u}
                      className="live-space-listener-card"
                    >
                      <div style={{ position: 'relative', marginBottom: '0.35rem' }}>
                        <img
                          src={getAvatarUrl(u.profilePicture)}
                          alt={u.fullName || 'Listener'}
                          style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border-color)' }}
                        />
                        {listener.isHandRaised && (
                          <div style={{ position: 'absolute', top: '-4px', right: '-4px', width: '20px', height: '20px', borderRadius: '50%', background: '#f59e0b', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
                            ✋
                          </div>
                        )}
                      </div>

                      <span className="live-space-user-fullname" style={{ fontSize: '0.75rem' }}>
                        {u.fullName || 'Listener'}
                      </span>

                      {/* Host can invite listener to speak */}
                      {(isHost || isCoHost) && !isCurrent && (
                        <button
                          onClick={() => handleSetRole(u._id || u, 'speaker')}
                          className="btn-cohost"
                          style={{ marginTop: '0.35rem', fontSize: '0.65rem', padding: '0.15rem 0.4rem' }}
                        >
                          Invite
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* BOTTOM CONTROLS TOOLBAR */}
        <div className="live-space-toolbar">
          
          {/* Mic Toggle or Raise Hand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {isSpeakerOrHost ? (
              <button
                onClick={handleToggleMute}
                className={isMuted ? 'btn-demote' : 'btn btn-primary'}
                style={{ padding: '0.55rem 1.15rem', borderRadius: 'var(--radius-md)', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 800 }}
              >
                {isMuted ? <MicOffIcon size={16} /> : <MicIcon size={16} />}
                <span>{isMuted ? 'Muted' : 'Speaking (Live)'}</span>
              </button>
            ) : (
              <button
                onClick={handleToggleHand}
                className={isHandRaised ? 'btn-raised-requests' : 'live-space-pill-action'}
                style={{ padding: '0.55rem 1.15rem' }}
              >
                <HandIcon size={16} />
                <span>{isHandRaised ? 'Hand Raised ✋' : 'Request to Speak'}</span>
              </button>
            )}
          </div>

          {/* Reactions Picker & End Room */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', position: 'relative' }}>
            
            {/* Reaction Popover */}
            {showReactionsPicker && (
              <div className="live-space-reactions-popover animate-fadeIn">
                {REACTION_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleSendReaction(emoji)}
                    style={{ width: '36px', height: '36px', borderRadius: '8px', border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', cursor: 'pointer' }}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}

            <button
              onClick={() => setShowReactionsPicker(!showReactionsPicker)}
              className="live-space-pill-action"
              title="React with emojis"
            >
              😊 React
            </button>

            {isHost && (
              <button
                onClick={handleEndSpace}
                className="btn-end-space"
              >
                End Space
              </button>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
export default LiveSpaceRoomModal;


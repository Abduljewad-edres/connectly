import mongoose from 'mongoose';
import LiveSpace from '../models/LiveSpace.js';
import Report from '../models/Report.js';
import { notifyFollowersOfLiveSpace, getIO } from '../utils/socket.js';

// @desc    Get live and scheduled spaces
// @route   GET /api/spaces
// @access  Public (Optional Auth)
export const getLiveSpaces = async (req, res) => {
  try {
    const { topic, status = 'live', search, page = 1, limit = 12 } = req.query;
    const currentUserId = req.user ? req.user._id : null;

    if (!mongoose.connection || mongoose.connection.readyState !== 1) {
      return res.status(200).json({
        success: true,
        spaces: [],
        pagination: { page: 1, limit: parseInt(limit, 10), total: 0, totalPages: 0 }
      });
    }

    const query = {};

    // Status filter: 'live', 'scheduled', or 'all' (excluding ended by default)
    if (status && status !== 'all') {
      query.status = status;
    } else {
      query.status = { $in: ['live', 'scheduled'] };
    }

    // Topic filter
    if (topic && topic !== 'all') {
      query.topic = topic;
    }

    // Text search
    if (search && search.trim()) {
      query.$text = { $search: search.trim() };
    }

    // Privacy filter: show public spaces, or private spaces where user is host or participant
    if (currentUserId) {
      query.$or = [
        { isPrivate: false },
        { host: currentUserId },
        { coHosts: currentUserId },
        { 'participants.user': currentUserId }
      ];
    } else {
      query.isPrivate = false;
    }

    const skip = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
    const take = parseInt(limit, 10);

    const [spaces, total] = await Promise.all([
      LiveSpace.find(query)
        .sort({ status: 1, createdAt: -1 })
        .skip(skip)
        .limit(take)
        .populate('host', 'fullName username profilePicture isVerified')
        .populate('coHosts', 'fullName username profilePicture isVerified')
        .populate('participants.user', 'fullName username profilePicture isVerified'),
      LiveSpace.countDocuments(query)
    ]);

    const formatted = spaces.map((space) => {
      const obj = space.toObject();
      const speakers = (obj.participants || []).filter((p) =>
        ['host', 'co_host', 'speaker'].includes(p.role)
      );
      const listeners = (obj.participants || []).filter((p) => p.role === 'listener');
      const isUserInSpace = currentUserId
        ? (obj.participants || []).some((p) => (p.user?._id || p.user)?.toString() === currentUserId.toString())
        : false;

      return {
        ...obj,
        speakersCount: speakers.length,
        listenersCount: listeners.length,
        isUserInSpace
      };
    });

    return res.status(200).json({
      success: true,
      spaces: formatted,
      pagination: {
        page: parseInt(page, 10),
        limit: take,
        total,
        totalPages: Math.ceil(total / take)
      }
    });
  } catch (error) {
    console.error('getLiveSpaces error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve live spaces.'
    });
  }
};

// @desc    Get single live space by ID
// @route   GET /api/spaces/:id
// @access  Public (Optional Auth)
export const getLiveSpaceById = async (req, res) => {
  try {
    const currentUserId = req.user ? req.user._id : null;
    const space = await LiveSpace.findById(req.params.id)
      .populate('host', 'fullName username profilePicture isVerified')
      .populate('coHosts', 'fullName username profilePicture isVerified')
      .populate('participants.user', 'fullName username profilePicture isVerified');

    if (!space) {
      return res.status(404).json({ success: false, message: 'Live space not found.' });
    }

    if (space.isPrivate && (!currentUserId || (space.host._id.toString() !== currentUserId.toString() && !space.participants.some((p) => p.user?._id?.toString() === currentUserId.toString())))) {
      return res.status(403).json({ success: false, message: 'This audio space is private.' });
    }

    const obj = space.toObject();
    const speakers = (obj.participants || []).filter((p) =>
      ['host', 'co_host', 'speaker'].includes(p.role)
    );
    const listeners = (obj.participants || []).filter((p) => p.role === 'listener');

    const currentUserParticipant = currentUserId
      ? (obj.participants || []).find((p) => (p.user?._id || p.user)?.toString() === currentUserId.toString())
      : null;

    return res.status(200).json({
      success: true,
      space: {
        ...obj,
        speakersCount: speakers.length,
        listenersCount: listeners.length,
        userRole: currentUserParticipant ? currentUserParticipant.role : null,
        isMuted: currentUserParticipant ? currentUserParticipant.isMuted : true,
        isHandRaised: currentUserParticipant ? currentUserParticipant.isHandRaised : false
      }
    });
  } catch (error) {
    console.error('getLiveSpaceById error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve space.'
    });
  }
};

// @desc    Create / Schedule a live audio space
// @route   POST /api/spaces
// @access  Private
export const createLiveSpace = async (req, res) => {
  try {
    const {
      title,
      description,
      topic = 'general',
      isPrivate = false,
      scheduledFor,
      recordingEnabled = false
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Space title is required.' });
    }

    const isScheduled = scheduledFor && new Date(scheduledFor) > new Date();
    const status = isScheduled ? 'scheduled' : 'live';
    const startedAt = isScheduled ? null : new Date();

    const initialParticipants = [
      {
        user: req.user._id,
        role: 'host',
        isMuted: false,
        isHandRaised: false,
        joinedAt: new Date()
      }
    ];

    const newSpace = await LiveSpace.create({
      title: title.trim(),
      description: (description || '').trim(),
      topic,
      host: req.user._id,
      coHosts: [],
      isPrivate: Boolean(isPrivate),
      status,
      scheduledFor: scheduledFor ? new Date(scheduledFor) : undefined,
      startedAt,
      participants: initialParticipants,
      participantsCount: 1,
      recordingEnabled: Boolean(recordingEnabled)
    });

    const populated = await LiveSpace.findById(newEventIdOrDefault(newSpace._id))
      .populate('host', 'fullName username profilePicture isVerified')
      .populate('participants.user', 'fullName username profilePicture isVerified');

    // If starting live immediately and public, notify host's followers
    if (status === 'live' && !isPrivate) {
      notifyFollowersOfLiveSpace({
        hostId: req.user._id,
        spaceId: newSpace._id,
        spaceTitle: newSpace.title
      }).catch((err) => console.error('Notification broadcast error:', err));
    }

    return res.status(201).json({
      success: true,
      message: status === 'live' ? 'Live space started! 🎙️' : 'Live space scheduled successfully!',
      space: populated
    });
  } catch (error) {
    console.error('createLiveSpace error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to start live space.'
    });
  }
};

// Helper
const newEventIdOrDefault = (id) => id;

// @desc    Join an active live space
// @route   POST /api/spaces/:id/join
// @access  Private
export const joinLiveSpace = async (req, res) => {
  try {
    const space = await LiveSpace.findById(req.params.id);
    if (!space) {
      return res.status(404).json({ success: false, message: 'Space not found.' });
    }

    if (space.status === 'ended') {
      return res.status(400).json({ success: false, message: 'This live space has already ended.' });
    }

    const userId = req.user._id;
    const isHost = space.host.toString() === userId.toString();
    const isCoHost = space.coHosts.some((ch) => ch.toString() === userId.toString());

    // Determine initial role
    let role = 'listener';
    if (isHost) role = 'host';
    else if (isCoHost) role = 'co_host';

    const existingIndex = space.participants.findIndex(
      (p) => p.user.toString() === userId.toString()
    );

    if (existingIndex > -1) {
      // Already inside, update role if needed
      role = space.participants[existingIndex].role;
    } else {
      space.participants.push({
        user: userId,
        role,
        isMuted: role === 'listener',
        isHandRaised: false,
        joinedAt: new Date()
      });
      space.participantsCount = space.participants.length;
      await space.save();
    }

    const updated = await LiveSpace.findById(space._id)
      .populate('host', 'fullName username profilePicture isVerified')
      .populate('coHosts', 'fullName username profilePicture isVerified')
      .populate('participants.user', 'fullName username profilePicture isVerified');

    return res.status(200).json({
      success: true,
      message: 'Joined space.',
      space: updated,
      role
    });
  } catch (error) {
    console.error('joinLiveSpace error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to join live space.'
    });
  }
};

// @desc    Leave a live space
// @route   POST /api/spaces/:id/leave
// @access  Private
export const leaveLiveSpace = async (req, res) => {
  try {
    const space = await LiveSpace.findById(req.params.id);
    if (!space) {
      return res.status(404).json({ success: false, message: 'Space not found.' });
    }

    const userId = req.user._id;
    space.participants = space.participants.filter(
      (p) => p.user.toString() !== userId.toString()
    );
    space.participantsCount = space.participants.length;

    // If host leaves and no co-hosts remain, space ends automatically
    if (space.host.toString() === userId.toString()) {
      if (space.coHosts.length > 0) {
        space.host = space.coHosts[0];
        space.coHosts.shift();
      } else {
        space.status = 'ended';
        space.endedAt = new Date();
      }
    }

    await space.save();

    return res.status(200).json({
      success: true,
      message: 'Left space.'
    });
  } catch (error) {
    console.error('leaveLiveSpace error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to leave space.'
    });
  }
};

// @desc    Update a participant role (promote to speaker, demote to listener, co-host)
// @route   PATCH /api/spaces/:id/participants/:targetUserId/role
// @access  Private (Host or Co-Host only)
export const updateParticipantRole = async (req, res) => {
  try {
    const { id, targetUserId } = req.params;
    const { role } = req.body; // 'speaker' | 'listener' | 'co_host'

    if (!['speaker', 'listener', 'co_host'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role specified.' });
    }

    const space = await LiveSpace.findById(id);
    if (!space) {
      return res.status(404).json({ success: false, message: 'Space not found.' });
    }

    const isHost = space.host.toString() === req.user._id.toString();
    const isCoHost = space.coHosts.some((ch) => ch.toString() === req.user._id.toString());

    if (!isHost && !isCoHost) {
      return res.status(403).json({ success: false, message: 'Only hosts and co-hosts can manage participant roles.' });
    }

    const participant = space.participants.find(
      (p) => p.user.toString() === targetUserId.toString()
    );

    if (!participant) {
      return res.status(404).json({ success: false, message: 'Participant not in space.' });
    }

    participant.role = role;
    if (role === 'listener') {
      participant.isMuted = true;
      participant.isHandRaised = false;
    } else if (role === 'speaker' || role === 'co_host') {
      participant.isHandRaised = false;
    }

    if (role === 'co_host' && !space.coHosts.some((c) => c.toString() === targetUserId.toString())) {
      space.coHosts.push(targetUserId);
    }

    await space.save();

    return res.status(200).json({
      success: true,
      message: `Role updated to ${role}.`,
      targetUserId,
      newRole: role
    });
  } catch (error) {
    console.error('updateParticipantRole error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update participant role.'
    });
  }
};

// @desc    End a live space
// @route   POST /api/spaces/:id/end
// @access  Private (Host or Admin only)
export const endLiveSpace = async (req, res) => {
  try {
    const space = await LiveSpace.findById(req.params.id);
    if (!space) {
      return res.status(404).json({ success: false, message: 'Space not found.' });
    }

    const isHost = space.host.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isHost && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Only the host or an administrator can end this space.' });
    }

    space.status = 'ended';
    space.endedAt = new Date();
    await space.save();

    const io = getIO();
    if (io) {
      io.to(`space:${space._id}`).emit('space:ended', { spaceId: space._id });
    }

    return res.status(200).json({
      success: true,
      message: 'Live space ended.'
    });
  } catch (error) {
    console.error('endLiveSpace error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to end space.'
    });
  }
};

// @desc    Report an audio space for inappropriate content or abuse
// @route   POST /api/spaces/:id/report
// @access  Private
export const reportLiveSpace = async (req, res) => {
  try {
    const { reason = 'other', description = '' } = req.body;
    const space = await LiveSpace.findById(req.params.id);
    if (!space) {
      return res.status(404).json({ success: false, message: 'Space not found.' });
    }

    const report = await Report.create({
      reporter: req.user._id,
      targetType: 'space',
      targetId: space._id,
      reason,
      description: description.slice(0, 500)
    });

    return res.status(201).json({
      success: true,
      message: 'Report submitted for review. Thank you for keeping Connectly safe!',
      reportId: report._id
    });
  } catch (error) {
    console.error('reportLiveSpace error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to submit report.'
    });
  }
};


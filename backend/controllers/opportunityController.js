import Opportunity from '../models/Opportunity.js';
import Report from '../models/Report.js';
import User from '../models/User.js';

// Helper to format an opportunity with isSaved & isExpired status
const formatOpportunity = (opp, currentUserId) => {
  const oppObj = opp.toObject ? opp.toObject() : opp;
  const isSaved = currentUserId && Array.isArray(oppObj.savedBy)
    ? oppObj.savedBy.some((id) => id.toString() === currentUserId.toString())
    : false;

  const now = new Date();
  const deadline = new Date(oppObj.applicationDeadline);
  const isExpired = deadline < now || oppObj.status === 'expired';

  // Calculate days remaining
  const diffMs = deadline - now;
  const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  return {
    ...oppObj,
    isSaved,
    isExpired,
    daysRemaining: isExpired ? 0 : Math.max(0, daysRemaining),
    savedCount: (oppObj.savedBy || []).length
  };
};

// @desc    Get opportunities feed / search / filter
// @route   GET /api/opportunities
// @access  Public (Optional auth for isSaved)
export const getOpportunities = async (req, res) => {
  try {
    const currentUserId = req.user ? req.user._id : null;
    const {
      category,
      workType,
      search,
      location,
      includeExpired,
      page = 1,
      limit = 15,
      publisher
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 15));
    const skip = (pageNum - 1) * limitNum;

    const query = { status: 'active' };

    // Category filter
    if (category && category !== 'all') {
      query.category = category.toLowerCase().trim();
    }

    // Work type filter
    if (workType && ['remote', 'hybrid', 'on_site'].includes(workType)) {
      query.workType = workType;
    }

    // Specific publisher filter
    if (publisher) {
      query.publisher = publisher;
    }

    // Expiration filter: by default show active unexpired opportunities
    if (includeExpired !== 'true') {
      query.applicationDeadline = { $gte: new Date() };
    }

    // Search by title, organizationName, or location
    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [
        { title: regex },
        { organizationName: regex },
        { location: regex },
        { requirements: regex }
      ];
    } else if (location && location.trim()) {
      query.location = new RegExp(location.trim(), 'i');
    }

    const [total, opportunities] = await Promise.all([
      Opportunity.countDocuments(query),
      Opportunity.find(query)
        .sort({ isFeatured: -1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('publisher', 'fullName username profilePicture isVerified role')
    ]);

    const formatted = opportunities.map((opp) => formatOpportunity(opp, currentUserId));

    return res.status(200).json({
      success: true,
      total,
      page: pageNum,
      limit: limitNum,
      hasMore: pageNum * limitNum < total,
      opportunities: formatted
    });
  } catch (error) {
    console.error('getOpportunities error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error loading opportunities.'
    });
  }
};

// @desc    Get single opportunity details
// @route   GET /api/opportunities/:id
// @access  Public (Optional Auth)
export const getOpportunityById = async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user ? req.user._id : null;

    const opportunity = await Opportunity.findById(id).populate(
      'publisher',
      'fullName username profilePicture isVerified role bio'
    );

    if (!opportunity) {
      return res.status(404).json({
        success: false,
        message: 'Opportunity not found.'
      });
    }

    // Increment views asynchronously
    Opportunity.findByIdAndUpdate(id, { $inc: { viewsCount: 1 } }).exec();

    const formatted = formatOpportunity(opportunity, currentUserId);

    return res.status(200).json({
      success: true,
      opportunity: formatted
    });
  } catch (error) {
    console.error('getOpportunityById error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error loading opportunity details.'
    });
  }
};

// @desc    Create new opportunity
// @route   POST /api/opportunities
// @access  Private
export const createOpportunity = async (req, res) => {
  try {
    const user = req.user;
    const {
      title,
      organizationName,
      organizationWebsite,
      category,
      workType,
      location,
      description,
      requirements,
      benefits,
      applicationDeadline,
      applicationLink,
      contactEmail,
      contactPhone
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Opportunity title is required.' });
    }
    if (!organizationName || !organizationName.trim()) {
      return res.status(400).json({ success: false, message: 'Organization name is required.' });
    }
    if (!category) {
      return res.status(400).json({ success: false, message: 'Opportunity category is required.' });
    }
    if (!description || !description.trim()) {
      return res.status(400).json({ success: false, message: 'Opportunity description is required.' });
    }
    if (!applicationDeadline) {
      return res.status(400).json({ success: false, message: 'Application deadline is required.' });
    }

    const deadlineDate = new Date(applicationDeadline);
    if (isNaN(deadlineDate.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid deadline date format.' });
    }

    // Determine logo
    let organizationLogo = '';
    if (req.file) {
      organizationLogo = `/uploads/${req.file.filename}`;
    } else if (req.body.organizationLogo && typeof req.body.organizationLogo === 'string') {
      organizationLogo = req.body.organizationLogo.trim();
    }

    // Check publisher authorization status:
    // Verified users, admins, and moderators publish immediately as 'active'.
    // Unverified members are submitted as 'pending' for review.
    const isAuthorizedPublisher = user.role === 'admin' || user.role === 'moderator' || user.isVerified;
    const initialStatus = isAuthorizedPublisher ? 'active' : 'pending';

    const opportunity = await Opportunity.create({
      title: title.trim(),
      organizationName: organizationName.trim(),
      organizationLogo,
      organizationWebsite: (organizationWebsite || '').trim(),
      publisher: user._id,
      category: category.toLowerCase().trim(),
      workType: workType || 'remote',
      location: (location || 'Global').trim(),
      description: description.trim(),
      requirements: (requirements || '').trim(),
      benefits: (benefits || '').trim(),
      applicationDeadline: deadlineDate,
      applicationLink: (applicationLink || '').trim(),
      contactEmail: (contactEmail || '').trim(),
      contactPhone: (contactPhone || '').trim(),
      status: initialStatus,
      savedBy: [],
      viewsCount: 0,
      isFeatured: false
    });

    const populated = await Opportunity.findById(opportunity._id).populate(
      'publisher',
      'fullName username profilePicture isVerified role'
    );

    return res.status(201).json({
      success: true,
      message: isAuthorizedPublisher
        ? 'Opportunity published successfully!'
        : 'Opportunity submitted successfully and is pending administrator approval.',
      opportunity: formatOpportunity(populated, user._id)
    });
  } catch (error) {
    console.error('createOpportunity error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error creating opportunity.'
    });
  }
};

// @desc    Update existing opportunity
// @route   PUT /api/opportunities/:id
// @access  Private (Owner or Admin)
export const updateOpportunity = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const opportunity = await Opportunity.findById(id);
    if (!opportunity) {
      return res.status(404).json({ success: false, message: 'Opportunity not found.' });
    }

    // Authorization check
    const isOwner = opportunity.publisher.toString() === user._id.toString();
    const isAdmin = user.role === 'admin' || user.role === 'moderator';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to update this opportunity.'
      });
    }

    const {
      title,
      organizationName,
      organizationWebsite,
      category,
      workType,
      location,
      description,
      requirements,
      benefits,
      applicationDeadline,
      applicationLink,
      contactEmail,
      contactPhone
    } = req.body;

    if (title) opportunity.title = title.trim();
    if (organizationName) opportunity.organizationName = organizationName.trim();
    if (organizationWebsite !== undefined) opportunity.organizationWebsite = organizationWebsite.trim();
    if (category) opportunity.category = category.toLowerCase().trim();
    if (workType) opportunity.workType = workType;
    if (location !== undefined) opportunity.location = location.trim();
    if (description) opportunity.description = description.trim();
    if (requirements !== undefined) opportunity.requirements = requirements.trim();
    if (benefits !== undefined) opportunity.benefits = benefits.trim();
    if (applicationDeadline) opportunity.applicationDeadline = new Date(applicationDeadline);
    if (applicationLink !== undefined) opportunity.applicationLink = applicationLink.trim();
    if (contactEmail !== undefined) opportunity.contactEmail = contactEmail.trim();
    if (contactPhone !== undefined) opportunity.contactPhone = contactPhone.trim();

    if (req.file) {
      opportunity.organizationLogo = `/uploads/${req.file.filename}`;
    } else if (req.body.organizationLogo !== undefined) {
      opportunity.organizationLogo = req.body.organizationLogo;
    }

    await opportunity.save();

    const populated = await Opportunity.findById(opportunity._id).populate(
      'publisher',
      'fullName username profilePicture isVerified role'
    );

    return res.status(200).json({
      success: true,
      message: 'Opportunity updated successfully.',
      opportunity: formatOpportunity(populated, user._id)
    });
  } catch (error) {
    console.error('updateOpportunity error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error updating opportunity.'
    });
  }
};

// @desc    Delete opportunity
// @route   DELETE /api/opportunities/:id
// @access  Private (Owner or Admin)
export const deleteOpportunity = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const opportunity = await Opportunity.findById(id);
    if (!opportunity) {
      return res.status(404).json({ success: false, message: 'Opportunity not found.' });
    }

    const isOwner = opportunity.publisher.toString() === user._id.toString();
    const isAdmin = user.role === 'admin' || user.role === 'moderator';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to delete this opportunity.'
      });
    }

    await Opportunity.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: 'Opportunity deleted successfully.'
    });
  } catch (error) {
    console.error('deleteOpportunity error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error deleting opportunity.'
    });
  }
};

// @desc    Bookmark / Save opportunity
// @route   POST /api/opportunities/:id/save
// @access  Private
export const toggleSaveOpportunity = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const opportunity = await Opportunity.findById(id);
    if (!opportunity) {
      return res.status(404).json({ success: false, message: 'Opportunity not found.' });
    }

    const isSaved = opportunity.savedBy.some((uid) => uid.toString() === userId.toString());

    if (isSaved) {
      opportunity.savedBy = opportunity.savedBy.filter((uid) => uid.toString() !== userId.toString());
    } else {
      opportunity.savedBy.push(userId);
    }

    await opportunity.save();

    return res.status(200).json({
      success: true,
      isSaved: !isSaved,
      savedCount: opportunity.savedBy.length,
      message: !isSaved ? 'Opportunity saved to your bookmarks!' : 'Opportunity removed from bookmarks.'
    });
  } catch (error) {
    console.error('toggleSaveOpportunity error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error saving opportunity.'
    });
  }
};

// @desc    Get user's saved opportunities
// @route   GET /api/opportunities/saved
// @access  Private
export const getSavedOpportunities = async (req, res) => {
  try {
    const userId = req.user._id;

    const opportunities = await Opportunity.find({ savedBy: userId })
      .sort({ createdAt: -1 })
      .populate('publisher', 'fullName username profilePicture isVerified role');

    const formatted = opportunities.map((opp) => formatOpportunity(opp, userId));

    return res.status(200).json({
      success: true,
      count: formatted.length,
      opportunities: formatted
    });
  } catch (error) {
    console.error('getSavedOpportunities error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error loading saved opportunities.'
    });
  }
};

// @desc    Admin moderation (Approve, reject, feature)
// @route   PATCH /api/opportunities/:id/moderate
// @access  Private (Admin Only)
export const moderateOpportunity = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, isFeatured } = req.body;

    const opportunity = await Opportunity.findById(id);
    if (!opportunity) {
      return res.status(404).json({ success: false, message: 'Opportunity not found.' });
    }

    if (status && ['active', 'pending', 'rejected', 'expired'].includes(status)) {
      opportunity.status = status;
    }
    if (typeof isFeatured === 'boolean') {
      opportunity.isFeatured = isFeatured;
    }

    await opportunity.save();

    const populated = await Opportunity.findById(id).populate(
      'publisher',
      'fullName username profilePicture isVerified role'
    );

    return res.status(200).json({
      success: true,
      message: `Opportunity status updated to ${opportunity.status}.`,
      opportunity: formatOpportunity(populated, req.user._id)
    });
  } catch (error) {
    console.error('moderateOpportunity error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error moderating opportunity.'
    });
  }
};

// @desc    Report suspicious opportunity
// @route   POST /api/opportunities/:id/report
// @access  Private
export const reportOpportunity = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, description } = req.body;
    const reporter = req.user._id;

    const opportunity = await Opportunity.findById(id);
    if (!opportunity) {
      return res.status(404).json({ success: false, message: 'Opportunity not found.' });
    }

    const validReasons = [
      'spam',
      'harassment',
      'hate_speech',
      'inappropriate_media',
      'violence',
      'misinformation',
      'other'
    ];

    const chosenReason = validReasons.includes(reason) ? reason : 'misinformation';

    const report = await Report.create({
      reporter,
      targetType: 'opportunity',
      targetId: id,
      reason: chosenReason,
      description: (description || 'Suspicious or fraudulent opportunity reported by user.').trim(),
      status: 'pending'
    });

    return res.status(201).json({
      success: true,
      message: 'Opportunity reported to Connectly administration for review.',
      reportId: report._id
    });
  } catch (error) {
    console.error('reportOpportunity error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error reporting opportunity.'
    });
  }
};


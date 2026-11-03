import mongoose from 'mongoose';
import Event from '../models/Event.js';
import Post from '../models/Post.js';
import Community from '../models/Community.js';
import User from '../models/User.js';
import Follow from '../models/Follow.js';

// Curated list of popular regions & cities for quick selection without requiring GPS
export const CURATED_LOCATIONS = [
  {
    country: 'Ethiopia',
    code: 'ET',
    cities: ['Addis Ababa', 'Dire Dawa', 'Hawassa', 'Adama', 'Jimma', 'Bahir Dar', 'Mekelle', 'Gondar']
  },
  {
    country: 'United Arab Emirates',
    code: 'AE',
    cities: ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Ras Al Khaimah']
  },
  {
    country: 'United States',
    code: 'US',
    cities: ['New York', 'San Francisco', 'Washington DC', 'Los Angeles', 'Chicago', 'Seattle', 'Dallas']
  },
  {
    country: 'United Kingdom',
    code: 'GB',
    cities: ['London', 'Manchester', 'Birmingham', 'Edinburgh', 'Glasgow']
  },
  {
    country: 'Kenya',
    code: 'KE',
    cities: ['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret']
  },
  {
    country: 'Saudi Arabia',
    code: 'SA',
    cities: ['Riyadh', 'Jeddah', 'Mecca', 'Medina', 'Dammam']
  },
  {
    country: 'Canada',
    code: 'CA',
    cities: ['Toronto', 'Vancouver', 'Montreal', 'Ottawa', 'Calgary']
  },
  {
    country: 'Germany',
    code: 'DE',
    cities: ['Berlin', 'Munich', 'Frankfurt', 'Hamburg', 'Cologne']
  },
  {
    country: 'Nigeria',
    code: 'NG',
    cities: ['Lagos', 'Abuja', 'Port Harcourt', 'Ibadan', 'Kano']
  }
];

// @desc    Get curated and dynamically discovered locations
// @route   GET /api/discovery/locations
// @access  Public
export const getSupportedLocations = async (req, res) => {
  try {
    let dynamicCountries = [];
    if (mongoose.connection && mongoose.connection.readyState === 1) {
      // Collect distinct countries and cities from existing events & posts
      const dbEventCountries = await Event.distinct('location.country');
      const dbPostCountries = await Post.distinct('location.country');
      dynamicCountries = Array.from(
        new Set([...dbEventCountries, ...dbPostCountries].filter(Boolean))
      );
    }

    return res.status(200).json({
      success: true,
      curated: CURATED_LOCATIONS,
      dynamicCountries
    });
  } catch (error) {
    console.error('getSupportedLocations error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve location catalogue.'
    });
  }
};

// @desc    Get location-aware discovery feed (posts, events, communities, locals)
// @route   GET /api/discovery/feed
// @access  Public (Optional Auth)
export const getLocalFeed = async (req, res) => {
  try {
    const currentUserId = req.user ? req.user._id : null;
    const user = req.user || null;

    let country = (req.query.country || '').trim();
    let region = (req.query.region || '').trim();
    let city = (req.query.city || '').trim();
    const scope = (req.query.scope || 'local').toLowerCase(); // 'local' | 'international'

    const isOptedIn = Boolean(user?.locationDiscovery?.enabled);

    // If no explicit location is passed, fallback to user's saved location if opted in
    if (!country && isOptedIn && user?.location?.country) {
      country = user.location.country;
      region = region || user.location.region || '';
      city = city || user.location.city || '';
    }

    const hasLocation = Boolean(country || city);

    let events = [];
    let posts = [];
    let communities = [];
    let people = [];

    if (mongoose.connection && mongoose.connection.readyState === 1) {
      // 1. Fetch Events
      let eventQuery = { isCancelled: false };
      const now = new Date(Date.now() - 6 * 60 * 60 * 1000); // include events started recently
      eventQuery.startDate = { $gte: now };

      if (hasLocation && scope === 'local') {
        const locationConditions = [{ locationType: 'online' }];
        if (country) {
          locationConditions.push({ 'location.country': new RegExp(`^${country}$`, 'i') });
        }
        if (city) {
          locationConditions.push({ 'location.city': new RegExp(`^${city}$`, 'i') });
        }
        eventQuery.$or = locationConditions;
      }

      const rawEvents = await Event.find(eventQuery)
        .sort({ startDate: 1 })
        .limit(8)
        .populate('creator', 'fullName username profilePicture isVerified');

      events = rawEvents.map((evt) => {
        const obj = evt.toObject();
        const isAttending = currentUserId
          ? (obj.attendees || []).some((id) => id.toString() === currentUserId.toString())
          : false;
        const isInterested = currentUserId
          ? (obj.interested || []).some((id) => id.toString() === currentUserId.toString())
          : false;

        return {
          ...obj,
          attendeesCount: (obj.attendees || []).length,
          interestedCount: (obj.interested || []).length,
          isAttending,
          isInterested
        };
      });

      // 2. Fetch Local Posts
      let postQuery = { visibility: 'public' };
      if (hasLocation && scope === 'local') {
        const postLocConditions = [];
        if (country) {
          postLocConditions.push({ 'location.country': new RegExp(`^${country}$`, 'i') });
        }
        if (city) {
          postLocConditions.push({ 'location.city': new RegExp(`^${city}$`, 'i') });
        }

        // Also find posts by users from this location who share location publicly
        const localUsers = await User.find({
          'location.country': new RegExp(`^${country}$`, 'i'),
          'locationDiscovery.shareLocationPublicly': true
        }).select('_id');

        if (localUsers.length > 0) {
          postLocConditions.push({ author: { $in: localUsers.map((u) => u._id) } });
        }

        if (postLocConditions.length > 0) {
          postQuery.$or = postLocConditions;
        }
      }

      const rawPosts = await Post.find(postQuery)
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('author', 'fullName username profilePicture isVerified location locationDiscovery');

      posts = rawPosts.map((post) => {
        const p = post.toObject();
        const isLiked = currentUserId
          ? (p.likes || []).some((id) => id.toString() === currentUserId.toString())
          : false;
        return {
          ...p,
          likesCount: (p.likes || []).length,
          isLiked
        };
      });

      // 3. Fetch Nearby / Local Communities
      let communityQuery = { privacy: 'public' };
      if (hasLocation && scope === 'local') {
        const commLoc = [];
        if (country) {
          commLoc.push({ 'location.country': new RegExp(`^${country}$`, 'i') });
        }
        if (city) {
          commLoc.push({ 'location.city': new RegExp(`^${city}$`, 'i') });
        }
        if (commLoc.length > 0) {
          communityQuery.$or = commLoc;
        }
      }

      communities = await Community.find(communityQuery)
        .sort({ membersCount: -1 })
        .limit(6)
        .populate('creator', 'fullName username profilePicture');

      // If few or none found, fallback to top public communities
      if (communities.length === 0) {
        communities = await Community.find({ privacy: 'public' })
          .sort({ membersCount: -1 })
          .limit(6)
          .populate('creator', 'fullName username profilePicture');
      }

      // 4. Fetch Local Creators / Members to connect with
      if (hasLocation) {
        const peopleQuery = {
          'locationDiscovery.shareLocationPublicly': true,
          isSuspended: false
        };
        if (currentUserId) {
          peopleQuery._id = { $ne: currentUserId };
        }
        if (country) {
          peopleQuery['location.country'] = new RegExp(`^${country}$`, 'i');
        }
        if (city) {
          peopleQuery['location.city'] = new RegExp(`^${city}$`, 'i');
        }

        people = await User.find(peopleQuery)
          .sort({ isVerified: -1, createdAt: -1 })
          .limit(6)
          .select('fullName username profilePicture bio isVerified location');
      }
    }

    return res.status(200).json({
      success: true,
      currentLocation: {
        country: country || (hasLocation ? '' : 'Global'),
        region: region || '',
        city: city || ''
      },
      scope,
      isOptedIn,
      counts: {
        eventsCount: events.length,
        postsCount: posts.length,
        communitiesCount: communities.length,
        peopleCount: people.length
      },
      feed: {
        events,
        posts,
        communities,
        people
      }
    });
  } catch (error) {
    console.error('getLocalFeed error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve local discovery feed.'
    });
  }
};

// @desc    Get discoverable events with search and filters
// @route   GET /api/discovery/events
// @access  Public (Optional Auth)
export const getDiscoveryEvents = async (req, res) => {
  try {
    const currentUserId = req.user ? req.user._id : null;
    const {
      search,
      category,
      locationType,
      country,
      city,
      timeframe = 'upcoming',
      page = 1,
      limit = 12
    } = req.query;

    const query = { isCancelled: false };

    // Search query
    if (search && search.trim()) {
      query.$text = { $search: search.trim() };
    }

    // Category filter
    if (category && category !== 'all') {
      query.category = category;
    }

    // Location type filter (in_person, online, hybrid)
    if (locationType && locationType !== 'all') {
      query.locationType = locationType;
    }

    // Country & City filter
    if (country && country.trim()) {
      query['location.country'] = new RegExp(`^${country.trim()}$`, 'i');
    }
    if (city && city.trim()) {
      query['location.city'] = new RegExp(`^${city.trim()}$`, 'i');
    }

    // Timeframe filter
    const now = new Date();
    if (timeframe === 'today') {
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);
      query.startDate = { $gte: now, $lte: endOfDay };
    } else if (timeframe === 'this_week') {
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      query.startDate = { $gte: now, $lte: nextWeek };
    } else if (timeframe === 'this_month') {
      const nextMonth = new Date();
      nextMonth.setDate(nextMonth.getDate() + 30);
      query.startDate = { $gte: now, $lte: nextMonth };
    } else if (timeframe === 'upcoming') {
      query.startDate = { $gte: new Date(now.getTime() - 6 * 60 * 60 * 1000) };
    }

    const skip = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
    const take = parseInt(limit, 10);

    if (!mongoose.connection || mongoose.connection.readyState !== 1) {
      return res.status(200).json({
        success: true,
        events: [],
        pagination: {
          page: parseInt(page, 10),
          limit: take,
          total: 0,
          totalPages: 0
        }
      });
    }

    const [events, total] = await Promise.all([
      Event.find(query)
        .sort({ startDate: 1 })
        .skip(skip)
        .limit(take)
        .populate('creator', 'fullName username profilePicture isVerified'),
      Event.countDocuments(query)
    ]);

    const formattedEvents = events.map((evt) => {
      const obj = evt.toObject();
      const isAttending = currentUserId
        ? (obj.attendees || []).some((id) => id.toString() === currentUserId.toString())
        : false;
      const isInterested = currentUserId
        ? (obj.interested || []).some((id) => id.toString() === currentUserId.toString())
        : false;

      return {
        ...obj,
        attendeesCount: (obj.attendees || []).length,
        interestedCount: (obj.interested || []).length,
        isAttending,
        isInterested
      };
    });

    return res.status(200).json({
      success: true,
      events: formattedEvents,
      pagination: {
        page: parseInt(page, 10),
        limit: take,
        total,
        totalPages: Math.ceil(total / take)
      }
    });
  } catch (error) {
    console.error('getDiscoveryEvents error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve discovery events.'
    });
  }
};

// @desc    Get single event by ID
// @route   GET /api/discovery/events/:id
// @access  Public (Optional Auth)
export const getEventById = async (req, res) => {
  try {
    const currentUserId = req.user ? req.user._id : null;
    const event = await Event.findById(req.params.id)
      .populate('creator', 'fullName username profilePicture isVerified')
      .populate('attendees', 'fullName username profilePicture isVerified')
      .populate('interested', 'fullName username profilePicture');

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found.'
      });
    }

    const obj = event.toObject();
    const isAttending = currentUserId
      ? (obj.attendees || []).some((u) => (u._id || u).toString() === currentUserId.toString())
      : false;
    const isInterested = currentUserId
      ? (obj.interested || []).some((u) => (u._id || u).toString() === currentUserId.toString())
      : false;

    return res.status(200).json({
      success: true,
      event: {
        ...obj,
        attendeesCount: (obj.attendees || []).length,
        interestedCount: (obj.interested || []).length,
        isAttending,
        isInterested
      }
    });
  } catch (error) {
    console.error('getEventById error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve event.'
    });
  }
};

// @desc    Create a new local/discovery event
// @route   POST /api/discovery/events
// @access  Private
export const createEvent = async (req, res) => {
  try {
    const {
      title,
      description,
      category = 'community',
      organizerName,
      locationType = 'in_person',
      onlineUrl,
      startDate,
      endDate,
      timezone,
      capacity
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Event title is required.' });
    }
    if (!description || !description.trim()) {
      return res.status(400).json({ success: false, message: 'Event description is required.' });
    }
    if (!startDate) {
      return res.status(400).json({ success: false, message: 'Event start date is required.' });
    }

    // Parse location object or individual fields
    let location = { country: '', region: '', city: '', venue: '' };
    if (req.body.location) {
      try {
        const parsed = typeof req.body.location === 'string' ? JSON.parse(req.body.location) : req.body.location;
        location = {
          country: (parsed.country || '').trim(),
          region: (parsed.region || '').trim(),
          city: (parsed.city || '').trim(),
          venue: (parsed.venue || '').trim()
        };
      } catch (e) {
        // Fallback
      }
    } else {
      location = {
        country: (req.body.country || '').trim(),
        region: (req.body.region || '').trim(),
        city: (req.body.city || '').trim(),
        venue: (req.body.venue || '').trim()
      };
    }

    let coverImage = '';
    if (req.file) {
      coverImage = `/uploads/${req.file.filename}`;
    } else if (req.body.coverImage && typeof req.body.coverImage === 'string') {
      coverImage = req.body.coverImage.trim();
    }

    const newEvent = await Event.create({
      title: title.trim(),
      description: description.trim(),
      category,
      coverImage,
      creator: req.user._id,
      organizerName: (organizerName || req.user.fullName || '').trim(),
      locationType,
      location,
      onlineUrl: (onlineUrl || '').trim(),
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : undefined,
      timezone: (timezone || 'UTC').trim(),
      capacity: capacity ? Math.max(0, parseInt(capacity, 10)) : 0,
      attendees: [req.user._id], // Creator attends by default
      interested: []
    });

    const populated = await Event.findById(newEvent._id).populate(
      'creator',
      'fullName username profilePicture isVerified'
    );

    return res.status(201).json({
      success: true,
      message: 'Event published successfully!',
      event: {
        ...populated.toObject(),
        attendeesCount: 1,
        interestedCount: 0,
        isAttending: true,
        isInterested: false
      }
    });
  } catch (error) {
    console.error('createEvent error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to create event.'
    });
  }
};

// @desc    Toggle event attendance (RSVP: going / interested / not_going)
// @route   POST /api/discovery/events/:id/attend
// @access  Private
export const toggleEventAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    const { status = 'going' } = req.body; // 'going' | 'interested' | 'not_going'
    const userId = req.user._id;

    const event = await Event.findById(id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }

    const isAttending = event.attendees.some((aId) => aId.toString() === userId.toString());
    const isInterested = event.interested.some((iId) => iId.toString() === userId.toString());

    if (status === 'going') {
      if (!isAttending) {
        event.attendees.push(userId);
      }
      // Remove from interested if moving to going
      if (isInterested) {
        event.interested = event.interested.filter((iId) => iId.toString() !== userId.toString());
      }
    } else if (status === 'interested') {
      if (!isInterested) {
        event.interested.push(userId);
      }
      // Remove from attending if moving to interested
      if (isAttending) {
        event.attendees = event.attendees.filter((aId) => aId.toString() !== userId.toString());
      }
    } else if (status === 'not_going') {
      event.attendees = event.attendees.filter((aId) => aId.toString() !== userId.toString());
      event.interested = event.interested.filter((iId) => iId.toString() !== userId.toString());
    }

    await event.save();

    return res.status(200).json({
      success: true,
      message: `RSVP updated to ${status}.`,
      attendeesCount: event.attendees.length,
      interestedCount: event.interested.length,
      isAttending: event.attendees.some((aId) => aId.toString() === userId.toString()),
      isInterested: event.interested.some((iId) => iId.toString() === userId.toString())
    });
  } catch (error) {
    console.error('toggleEventAttendance error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update attendance status.'
    });
  }
};

// @desc    Delete event (Creator or Admin)
// @route   DELETE /api/discovery/events/:id
// @access  Private
export const deleteEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }

    const isOwner = event.creator.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this event.' });
    }

    await Event.findByIdAndDelete(req.params.id);

    return res.status(200).json({
      success: true,
      message: 'Event deleted successfully.'
    });
  } catch (error) {
    console.error('deleteEvent error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete event.'
    });
  }
};

// @desc    Update user location and discovery preferences
// @route   PUT /api/discovery/preferences
// @access  Private
export const updateUserLocationPreferences = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const { location, locationDiscovery } = req.body;

    if (location && typeof location === 'object') {
      user.location = {
        country: location.country !== undefined ? String(location.country).trim() : (user.location?.country || ''),
        region: location.region !== undefined ? String(location.region).trim() : (user.location?.region || ''),
        city: location.city !== undefined ? String(location.city).trim() : (user.location?.city || '')
      };
    }

    if (locationDiscovery && typeof locationDiscovery === 'object') {
      user.locationDiscovery = {
        enabled: locationDiscovery.enabled !== undefined ? Boolean(locationDiscovery.enabled) : (user.locationDiscovery?.enabled || false),
        shareLocationPublicly: locationDiscovery.shareLocationPublicly !== undefined ? Boolean(locationDiscovery.shareLocationPublicly) : (user.locationDiscovery?.shareLocationPublicly || false),
        radiusKm: typeof locationDiscovery.radiusKm === 'number' ? locationDiscovery.radiusKm : (user.locationDiscovery?.radiusKm || 50)
      };
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Location preferences updated successfully.',
      location: user.location,
      locationDiscovery: user.locationDiscovery
    });
  } catch (error) {
    console.error('updateUserLocationPreferences error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update location preferences.'
    });
  }
};

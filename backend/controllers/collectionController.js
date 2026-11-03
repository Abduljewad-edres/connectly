import Collection from '../models/Collection.js';
import Post from '../models/Post.js';
import User from '../models/User.js';

// @desc    Get user's bookmark collections
// @route   GET /api/collections
// @access  Private
export const getUserCollections = async (req, res) => {
  try {
    const currentUserId = req.user._id;

    let collections = await Collection.find({ user: currentUserId })
      .sort({ createdAt: -1 })
      .populate({
        path: 'posts',
        select: 'imageUrl imageUrls media content createdAt',
        options: { limit: 4 }
      });

    // If user has no collections, create a default "All Saved" collection
    if (collections.length === 0) {
      const userDoc = await User.findById(currentUserId).select('bookmarks');
      const defaultCol = await Collection.create({
        user: currentUserId,
        name: 'All Saved',
        description: 'Your default saved posts collection',
        posts: userDoc?.bookmarks || [],
        isPrivate: true
      });
      collections = [defaultCol];
    }

    const formatted = collections.map((col) => {
      // Find cover image from posts if available
      let cover = col.coverImage || '';
      if (!cover && col.posts && col.posts.length > 0) {
        const firstPost = col.posts[0];
        cover = firstPost.imageUrl || (firstPost.media && firstPost.media[0]?.url) || '';
      }

      return {
        _id: col._id,
        name: col.name,
        description: col.description,
        isPrivate: col.isPrivate,
        postsCount: col.posts.length,
        coverImage: cover,
        createdAt: col.createdAt
      };
    });

    return res.status(200).json({
      success: true,
      collections: formatted
    });
  } catch (error) {
    console.error('getUserCollections error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error loading collections.'
    });
  }
};

// @desc    Create a new bookmark collection
// @route   POST /api/collections
// @access  Private
export const createCollection = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const { name, description, isPrivate } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Collection name is required.'
      });
    }

    const collection = await Collection.create({
      user: currentUserId,
      name: name.trim(),
      description: (description || '').trim(),
      isPrivate: isPrivate !== undefined ? Boolean(isPrivate) : true,
      posts: []
    });

    return res.status(201).json({
      success: true,
      message: 'Collection created successfully.',
      collection
    });
  } catch (error) {
    console.error('createCollection error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error creating collection.'
    });
  }
};

// @desc    Get posts in a specific collection
// @route   GET /api/collections/:id
// @access  Private
export const getCollectionPosts = async (req, res) => {
  try {
    const { id: collectionId } = req.params;
    const currentUserId = req.user._id;

    const collection = await Collection.findOne({
      _id: collectionId,
      user: currentUserId
    }).populate({
      path: 'posts',
      populate: {
        path: 'author',
        select: 'fullName username profilePicture'
      }
    });

    if (!collection) {
      return res.status(404).json({
        success: false,
        message: 'Collection not found.'
      });
    }

    return res.status(200).json({
      success: true,
      collection: {
        _id: collection._id,
        name: collection.name,
        description: collection.description,
        isPrivate: collection.isPrivate,
        postsCount: collection.posts.length
      },
      posts: collection.posts
    });
  } catch (error) {
    console.error('getCollectionPosts error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error loading collection posts.'
    });
  }
};

// @desc    Add / Remove a post to / from a collection
// @route   POST /api/collections/:id/posts
// @access  Private
export const togglePostInCollection = async (req, res) => {
  try {
    const { id: collectionId } = req.params;
    const { postId } = req.body;
    const currentUserId = req.user._id;

    const collection = await Collection.findOne({
      _id: collectionId,
      user: currentUserId
    });

    if (!collection) {
      return res.status(404).json({
        success: false,
        message: 'Collection not found.'
      });
    }

    const postIndex = collection.posts.findIndex((p) => p.toString() === postId.toString());
    let isSaved = false;

    if (postIndex > -1) {
      collection.posts.splice(postIndex, 1);
      isSaved = false;
    } else {
      collection.posts.push(postId);
      isSaved = true;
    }

    await collection.save();

    // Also sync user's main bookmarks array
    const userDoc = await User.findById(currentUserId);
    if (userDoc) {
      const bIdx = userDoc.bookmarks.findIndex((b) => b.toString() === postId.toString());
      if (isSaved && bIdx === -1) {
        userDoc.bookmarks.push(postId);
      }
      await userDoc.save();
    }

    return res.status(200).json({
      success: true,
      message: isSaved ? `Post saved to "${collection.name}".` : `Post removed from "${collection.name}".`,
      isSaved,
      postsCount: collection.posts.length
    });
  } catch (error) {
    console.error('togglePostInCollection error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error updating collection.'
    });
  }
};

// @desc    Delete a collection
// @route   DELETE /api/collections/:id
// @access  Private
export const deleteCollection = async (req, res) => {
  try {
    const { id: collectionId } = req.params;
    const currentUserId = req.user._id;

    const deleted = await Collection.findOneAndDelete({
      _id: collectionId,
      user: currentUserId
    });

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Collection not found.'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Collection deleted successfully.'
    });
  } catch (error) {
    console.error('deleteCollection error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error deleting collection.'
    });
  }
};


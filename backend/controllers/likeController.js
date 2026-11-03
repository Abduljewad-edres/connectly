import Post from '../models/Post.js';
import { createAndEmitNotification } from '../utils/socket.js';

// @desc    Toggle like / unlike post
// @route   POST /api/posts/:id/like
// @access  Private (BR-04)
export const toggleLike = async (req, res) => {
  try {
    const { id: postId } = req.params;
    const userId = req.user._id;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found.'
      });
    }

    const alreadyLikedIndex = post.likes.findIndex(
      (likeId) => likeId.toString() === userId.toString()
    );

    let isLiked = false;

    if (alreadyLikedIndex > -1) {
      // Unlike post
      post.likes.splice(alreadyLikedIndex, 1);
      isLiked = false;
    } else {
      // Like post (BR-07: prevents duplicate likes)
      post.likes.push(userId);
      isLiked = true;

      // Real-time Notification
      createAndEmitNotification({
        recipient: post.author,
        sender: userId,
        type: 'like',
        post: post._id
      });
    }

    await post.save();

    return res.status(200).json({
      success: true,
      message: isLiked ? 'Post liked.' : 'Post unliked.',
      isLiked,
      likesCount: post.likes.length
    });
  } catch (error) {
    console.error('toggleLike error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error toggling like.'
    });
  }
};

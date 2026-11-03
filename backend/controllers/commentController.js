import Comment from '../models/Comment.js';
import Post from '../models/Post.js';
import User from '../models/User.js';
import { createAndEmitNotification } from '../utils/socket.js';

// @desc    Add comment to a post
// @route   POST /api/posts/:id/comments
// @access  Private
export const addComment = async (req, res) => {
  try {
    const { id: postId } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Comment content cannot be empty.'
      });
    }

    // BR-10: Comment must belong to an existing post
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found. Cannot add comment.'
      });
    }

    const comment = await Comment.create({
      post: postId,
      author: req.user._id,
      content: content.trim()
    });

    const populatedComment = await Comment.findById(comment._id).populate(
      'author',
      'fullName username profilePicture isVerified'
    );

    // 1. Notify Post Author
    createAndEmitNotification({
      recipient: post.author,
      sender: req.user._id,
      type: 'comment',
      post: post._id,
      comment: comment._id,
      text: content.trim()
    });

    // 2. Notify any mentioned users (@username)
    const mentionRegex = /@([a-zA-Z0-9_]+)/g;
    let match;
    const mentionedUsernames = new Set();
    while ((match = mentionRegex.exec(content)) !== null) {
      mentionedUsernames.add(match[1].toLowerCase());
    }

    for (const uname of mentionedUsernames) {
      try {
        const mentionedUser = await User.findOne({ username: uname });
        if (
          mentionedUser &&
          mentionedUser._id.toString() !== req.user._id.toString() &&
          mentionedUser._id.toString() !== post.author.toString()
        ) {
          createAndEmitNotification({
            recipient: mentionedUser._id,
            sender: req.user._id,
            type: 'mention',
            post: post._id,
            comment: comment._id,
            text: content.trim()
          });
        }
      } catch (err) {
        // Continue
      }
    }

    return res.status(201).json({
      success: true,
      message: 'Comment added successfully.',
      comment: populatedComment
    });
  } catch (error) {
    console.error('addComment error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error adding comment.'
    });
  }
};

// @desc    Get comments for a post
// @route   GET /api/posts/:id/comments
// @access  Public
export const getComments = async (req, res) => {
  try {
    const { id: postId } = req.params;

    // BR-10: Check post exists
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found.'
      });
    }

    const comments = await Comment.find({ post: postId })
      .sort({ createdAt: 1 })
      .populate('author', 'fullName username profilePicture isVerified');

    return res.status(200).json({
      success: true,
      count: comments.length,
      comments
    });
  } catch (error) {
    console.error('getComments error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error loading comments.'
    });
  }
};

// @desc    Delete a comment
// @route   DELETE /api/comments/:id
// @access  Private (Owner only BR-09)
export const deleteComment = async (req, res) => {
  try {
    const { id: commentId } = req.params;

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found.'
      });
    }

    // BR-09: Only the comment owner can delete that comment
    if (comment.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized: You can only delete your own comments.'
      });
    }

    await Comment.findByIdAndDelete(commentId);

    return res.status(200).json({
      success: true,
      message: 'Comment deleted successfully.',
      commentId
    });
  } catch (error) {
    console.error('deleteComment error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error deleting comment.'
    });
  }
};

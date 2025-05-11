// frontend/src/components/NestedComment.js
import React, { useState, useContext, useCallback } from 'react';
import axios from 'axios';
import { AuthContext } from '../contexts/AuthContext';
import moment from 'moment';
import NestedCommentForm from './NestedCommentForm';

// SVG icons as components
const HeartIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
  </svg>
);

const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
    <line x1="10" y1="11" x2="10" y2="17"></line>
    <line x1="14" y1="11" x2="14" y2="17"></line>
  </svg>
);

const ReplyIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
  </svg>
);

const ChevronDownIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9"></polyline>
  </svg>
);

const ChevronUpIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="18 15 12 9 6 15"></polyline>
  </svg>
);

const NestedComment = ({
  comment,
  onCommentDeleted,
  onReplyAdded,
  depth = 0,
  maxDepth = 5
}) => {
  const { currentUser, isAuthenticated } = useContext(AuthContext);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replies, setReplies] = useState([]);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [showReplies, setShowReplies] = useState(false);
  const [repliesLoaded, setRepliesLoaded] = useState(false);
  
  // Format relative time (e.g., "5 minutes ago")
  const formatTimeAgo = (dateString) => {
    try {
      if (!dateString) return 'unknown time';
      return moment(dateString).fromNow();
    } catch (error) {
      console.error('Error formatting time:', error);
      return 'unknown time';
    }
  };

  // Fetch replies to this comment
  const fetchReplies = useCallback(async () => {
    if (loadingReplies || !comment?.id || repliesLoaded) return;
    
    setLoadingReplies(true);
    
    try {
      // Don't send token for this request since we've made the endpoint public
      const response = await axios.get(
        `http://localhost:8000/comments/${comment.id}/replies`
      );
      
      setReplies(response.data || []);
      setRepliesLoaded(true);
      setShowReplies(true);
    } catch (error) {
      console.error('Error fetching replies:', error);
      setReplies([]);
    } finally {
      setLoadingReplies(false);
    }
  }, [comment?.id, loadingReplies, repliesLoaded]);
  
  // Toggle replies visibility
  const toggleReplies = useCallback(() => {
    if (!repliesLoaded) {
      fetchReplies();
    } else {
      setShowReplies(!showReplies);
    }
  }, [fetchReplies, repliesLoaded, showReplies]);
  
  // Handle comment deletion
  const handleDelete = async () => {
    if (!isAuthenticated || isDeleting) return;
    
    if (!window.confirm('Are you sure you want to delete this comment?')) {
      return;
    }
    
    setIsDeleting(true);
    
    try {
      await axios.delete(`http://localhost:8000/comments/${comment.id}`, {
        headers: {
          Authorization: `Bearer ${currentUser.access_token}`
        }
      });
      
      // Notify parent component
      if (onCommentDeleted && typeof onCommentDeleted === 'function') {
        onCommentDeleted(comment.id);
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
      alert('Failed to delete comment. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };
  
  // Handle adding a reply
  const handleReplyAdded = (newReply) => {
    setReplies(prev => [newReply, ...prev]);
    setShowReplies(true);
    setShowReplyForm(false);
    
    // Update this comment's replies count
    comment.replies_count = (comment.replies_count || 0) + 1;
    
    // Also notify parent component
    if (onReplyAdded && typeof onReplyAdded === 'function') {
      onReplyAdded(newReply);
    }
  };
  
  // Handle deleting a reply
  const handleReplyDeleted = (replyId) => {
    setReplies(prev => prev.filter(reply => reply.id !== replyId));
    
    // Update this comment's replies count
    comment.replies_count = Math.max(0, (comment.replies_count || 0) - 1);
  };
  
  // Check if current user is the author of the comment
  const isAuthor = isAuthenticated && currentUser?.id === comment?.user_id;
  
  // Check if this is a deleted comment
  const isDeleted = comment.is_deleted || comment.content === "[deleted]";
  
  return (
    <div 
      className={`py-2 px-3 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
        depth > 0 ? 'bg-gray-50 hover:bg-gray-100' : ''
      }`}
      style={{ marginLeft: `${depth * 16}px`, maxWidth: `calc(100% - ${depth * 16}px)` }}
    >
      <div className="flex items-start">
        <div className="flex-shrink-0 mt-1">
          <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-bold text-sm">
            {comment.username?.[0]?.toUpperCase() || '?'}
          </div>
        </div>
        
        <div className="ml-2 flex-1">
          <div className="flex items-center">
            <span className="font-bold text-gray-900 text-sm">{comment.username}</span>
            <span className="mx-1 text-gray-500 text-xs">·</span>
            <span className="text-gray-500 text-xs">
              {formatTimeAgo(comment.created_at)}
            </span>
          </div>
          
          <p className={`mt-1 text-sm ${isDeleted ? 'text-gray-400 italic' : 'text-gray-800'}`}>
            {comment.content}
          </p>
          
          {!isDeleted && (
            <div className="mt-1 flex items-center">
              <button 
                className="flex items-center text-gray-500 hover:text-red-500 group mr-3"
              >
                <div className="p-1 rounded-full group-hover:bg-red-50">
                  <HeartIcon />
                </div>
                <span className="ml-1 text-xs">{comment.likes_count || 0}</span>
              </button>
              
              {/* Reply button - only show if not at max depth and user is authenticated */}
              {depth < maxDepth && isAuthenticated && !isDeleted && (
                <button
                  className="flex items-center text-gray-500 hover:text-blue-500 group mr-3"
                  onClick={() => setShowReplyForm(!showReplyForm)}
                >
                  <div className="p-1 rounded-full group-hover:bg-blue-50">
                    <ReplyIcon />
                  </div>
                  <span className="ml-1 text-xs">Reply</span>
                </button>
              )}
              
              {/* Delete button for author */}
              {isAuthor && !isDeleted && (
                <button 
                  className="flex items-center text-gray-500 hover:text-red-500 group"
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  <div className="p-1 rounded-full group-hover:bg-red-50">
                    <TrashIcon />
                  </div>
                </button>
              )}
              
              {/* Show replies toggle - only if this comment has replies */}
              {(comment.replies_count > 0) && (
                <button
                  className="flex items-center text-gray-500 hover:text-blue-500 group ml-auto"
                  onClick={toggleReplies}
                >
                  <span className="mr-1 text-xs">
                    {showReplies ? 'Hide' : 'Show'} {comment.replies_count} {comment.replies_count === 1 ? 'reply' : 'replies'}
                  </span>
                  <div className="p-1 rounded-full group-hover:bg-blue-50">
                    {showReplies ? <ChevronUpIcon /> : <ChevronDownIcon />}
                  </div>
                </button>
              )}
            </div>
          )}
          
          {/* Reply form */}
          {showReplyForm && (
            <div className="mt-2">
              <NestedCommentForm
                tweetId={comment.tweet_id}
                parentId={comment.id}
                onCommentAdded={handleReplyAdded}
                onCancel={() => setShowReplyForm(false)}
              />
            </div>
          )}
          
          {/* Loading indicator for replies */}
          {loadingReplies && (
            <div className="mt-2 ml-4 text-gray-500 text-xs">
              Loading replies...
            </div>
          )}
          
          {/* Nested replies */}
          {showReplies && replies.length > 0 && (
            <div className="mt-2">
              {replies.map(reply => (
                <NestedComment
                  key={reply.id}
                  comment={reply}
                  onCommentDeleted={handleReplyDeleted}
                  onReplyAdded={onReplyAdded}
                  depth={depth + 1}
                  maxDepth={maxDepth}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NestedComment;
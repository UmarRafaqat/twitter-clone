// frontend/src/components/CommentsSection.js
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import NestedComment from './NestedComment';
import CommentForm from './CommentForm';
import { AuthContext } from '../contexts/AuthContext';

const CommentsSection = ({ tweetId, onCommentAdded }) => {
  const [comments, setComments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [totalCount, setTotalCount] = useState(0);
  const { currentUser, isAuthenticated } = React.useContext(AuthContext);
  
  // Fetch top-level comments from API
  const fetchComments = useCallback(async () => {
    if (isLoading || !tweetId) return;
    
    setIsLoading(true);
    setError(null);
    
    console.log(`Fetching comments for tweet: ${tweetId}`);
    
    try {
      // Get comment count first
      const countResponse = await axios.get(
        `http://localhost:8000/tweets/${tweetId}/comments/count`,
        {
          headers: isAuthenticated ? {
            Authorization: `Bearer ${currentUser.access_token}`
          } : {}
        }
      );
      
      setTotalCount(countResponse.data.count || 0);
      
      // Then get the actual comments
      const response = await axios.get(
        `http://localhost:8000/tweets/${tweetId}/comments`, 
        {
          params: { 
            parent_id: null  // Only get top-level comments
          },
          headers: isAuthenticated ? {
            Authorization: `Bearer ${currentUser.access_token}`
          } : {}
        }
      );
      
      console.log('Comments response:', response.data);
      setComments(response.data || []);
    } catch (err) {
      console.error('Error fetching comments:', err);
      setError('Failed to load comments. Please try again.');
      // Set empty data on error
      setComments([]);
    } finally {
      setIsLoading(false);
    }
  }, [tweetId, isLoading, currentUser, isAuthenticated]);
  
  // Load comments when component mounts
  useEffect(() => {
    fetchComments();
  }, [fetchComments]);
  
  // Handle new comment added
  const handleCommentAdded = (newComment) => {
    // Add to top of list if it's a top-level comment
    if (!newComment.parent_id) {
      setComments(prevComments => [newComment, ...prevComments]);
      setTotalCount(prev => prev + 1);
    } else {
      // If it's a reply, increment the replies_count of the parent
      setComments(prevComments => 
        prevComments.map(comment => 
          comment.id === newComment.parent_id
            ? { ...comment, replies_count: (comment.replies_count || 0) + 1 }
            : comment
        )
      );
      setTotalCount(prev => prev + 1);
    }
    
    // Also notify parent component
    if (onCommentAdded && typeof onCommentAdded === 'function') {
      onCommentAdded(newComment);
    }
  };
  
  // Handle comment deletion
  const handleCommentDeleted = (commentId) => {
    // Find the comment first to get its replies_count
    const deletedComment = comments.find(c => c.id === commentId);
    
    // Remove the comment from the list
    setComments(prevComments => prevComments.filter(comment => comment.id !== commentId));
    
    // Update total count, including nested replies that were deleted
    if (deletedComment) {
      const lostComments = 1 + (deletedComment.replies_count || 0);
      setTotalCount(prev => Math.max(0, prev - lostComments));
    }
  };
  
  return (
    <div className="mt-3 border-t border-gray-200 pt-3">
      <h3 className="text-sm font-semibold mb-2">
        {totalCount} {totalCount === 1 ? 'Comment' : 'Comments'}
      </h3>
      
      <CommentForm tweetId={tweetId} onCommentAdded={handleCommentAdded} />
      
      {isLoading && <p className="py-2 text-gray-500 text-sm">Loading comments...</p>}
      
      {error && <p className="py-2 text-red-500 text-sm">{error}</p>}
      
      {!isLoading && comments.length === 0 && !error && (
        <p className="py-2 text-gray-500 text-sm">No comments yet</p>
      )}
      
      <div className="mt-2">
        {comments.map(comment => (
          <NestedComment 
            key={comment.id}
            comment={comment}
            onCommentDeleted={handleCommentDeleted}
            onReplyAdded={handleCommentAdded}
            depth={0}
            maxDepth={5}
          />
        ))}
      </div>
    </div>
  );
};

export default CommentsSection;
// frontend/src/components/CommentForm.js
import React, { useState, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../contexts/AuthContext';

const CommentForm = ({ tweetId, onCommentAdded }) => {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { currentUser, isAuthenticated } = useContext(AuthContext);
  
  const handleContentChange = (e) => {
    setContent(e.target.value);
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim() || !isAuthenticated || isSubmitting) return;
    
    setIsSubmitting(true);
    
    try {
      // Use the updated comment endpoint with parent_id: null for top-level comments
      const response = await axios.post(
        `http://localhost:8000/tweets/${tweetId}/comments`,
        { 
          content: content.trim(),
          parent_id: null  // Explicitly set to null for top-level comment
        },
        {
          headers: {
            'Authorization': `Bearer ${currentUser.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('Comment created successfully:', response.data);
      
      // Reset form
      setContent('');
      
      // Notify parent component to update the comments list
      if (onCommentAdded && typeof onCommentAdded === 'function') {
        onCommentAdded(response.data);
      }
    } catch (error) {
      console.error('Error creating comment:', error);
      alert('Failed to add comment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (!isAuthenticated) {
    return (
      <div className="py-2 px-4 text-sm text-gray-500 italic">
        Please log in to leave a comment.
      </div>
    );
  }
  
  return (
    <form onSubmit={handleSubmit} className="border-b border-gray-100 py-3 px-2">
      <div className="flex">
        <div className="flex-shrink-0">
          <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-bold text-sm">
            {currentUser?.username?.[0]?.toUpperCase() || '?'}
          </div>
        </div>
        <div className="ml-2 flex-1">
          <input
            type="text"
            className="w-full border border-gray-200 rounded-full px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-twitter-blue focus:border-twitter-blue"
            placeholder="Add a comment..."
            value={content}
            onChange={handleContentChange}
            disabled={isSubmitting}
          />
          <div className="flex justify-end mt-1">
            <button
              type="submit"
              className="px-3 py-1 bg-twitter-blue text-white rounded-full text-xs hover:bg-twitter-blue-dark disabled:opacity-50"
              disabled={!content.trim() || isSubmitting}
            >
              {isSubmitting ? 'Posting...' : 'Comment'}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
};

export default CommentForm;
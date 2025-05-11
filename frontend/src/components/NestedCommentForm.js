// frontend/src/components/NestedCommentForm.js
import React, { useState, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../contexts/AuthContext';

const NestedCommentForm = ({ tweetId, parentId, onCommentAdded, onCancel }) => {
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
      // Send the comment with parentId for nested reply
      const response = await axios.post(
        `http://localhost:8000/tweets/${tweetId}/comments`,
        { 
          content: content.trim(),
          parent_id: parentId
        },
        {
          headers: {
            'Authorization': `Bearer ${currentUser.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('Nested comment created successfully:', response.data);
      
      // Reset form
      setContent('');
      
      // Notify parent component to update the comments list
      if (onCommentAdded && typeof onCommentAdded === 'function') {
        onCommentAdded(response.data);
      }
    } catch (error) {
      console.error('Error creating nested comment:', error);
      alert('Failed to add reply. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (!isAuthenticated) {
    return (
      <div className="py-2 px-4 text-sm text-gray-500 italic">
        Please log in to leave a reply.
      </div>
    );
  }
  
  return (
    <form onSubmit={handleSubmit} className="py-2">
      <div className="flex">
        <div className="flex-shrink-0">
          <div className="h-6 w-6 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-bold text-xs">
            {currentUser?.username?.[0]?.toUpperCase() || '?'}
          </div>
        </div>
        <div className="ml-2 flex-1">
          <input
            type="text"
            className="w-full border border-gray-200 rounded-full px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-twitter-blue focus:border-twitter-blue"
            placeholder="Write a reply..."
            value={content}
            onChange={handleContentChange}
            disabled={isSubmitting}
            autoFocus
          />
          <div className="flex justify-end mt-1 space-x-2">
            <button
              type="button"
              className="px-3 py-1 border border-gray-300 text-gray-700 rounded-full text-xs hover:bg-gray-100"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3 py-1 bg-twitter-blue text-white rounded-full text-xs hover:bg-twitter-blue-dark disabled:opacity-50"
              disabled={!content.trim() || isSubmitting}
            >
              {isSubmitting ? 'Replying...' : 'Reply'}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
};

export default NestedCommentForm;
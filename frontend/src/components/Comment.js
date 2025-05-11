  // frontend/src/components/Comment.js
  import React, { useState, useContext } from 'react';
  import axios from 'axios';
  import { AuthContext } from '../contexts/AuthContext';
  import moment from 'moment';

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

  const Comment = ({ comment, onCommentDeleted }) => {
    const { currentUser, isAuthenticated } = useContext(AuthContext);
    const [isDeleting, setIsDeleting] = useState(false);
    
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
    
    // Check if current user is the author of the comment
    const isAuthor = isAuthenticated && currentUser?.id === comment?.user_id;
    
    return (
      <div className="py-2 px-3 border-b border-gray-100 hover:bg-gray-50">
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
            
            <p className="mt-1 text-gray-800 text-sm">{comment.content}</p>
            
            <div className="mt-1 flex items-center">
              <button 
                className="flex items-center text-gray-500 hover:text-red-500 group mr-3"
              >
                <div className="p-1 rounded-full group-hover:bg-red-50">
                  <HeartIcon />
                </div>
                <span className="ml-1 text-xs">{comment.likes_count || 0}</span>
              </button>
              
              {isAuthor && (
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
            </div>
          </div>
        </div>
      </div>
    );
  };

  export default Comment;
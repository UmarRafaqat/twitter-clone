// File: frontend/src/components/FollowButton.js
import React, { useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { AuthContext } from '../contexts/AuthContext';

const FollowButton = ({ userId, initialIsFollowing = false, onFollowChange }) => {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [loading, setLoading] = useState(false);
  const { currentUser, isAuthenticated } = useContext(AuthContext);
  const [isSelf, setIsSelf] = useState(false);
  
  useEffect(() => {
    // Check if already following when component mounts
    const checkFollowStatus = async () => {
      if (!isAuthenticated || !currentUser || !userId) return;
      
      try {
        const response = await axios.get(`http://localhost:8000/users/${userId}/follow-status`, {
          headers: {
            Authorization: `Bearer ${currentUser.access_token}`
          }
        });
        
        setIsFollowing(response.data.is_following);
        setIsSelf(response.data.is_self);
      } catch (error) {
        console.error('Error checking follow status:', error);
      }
    };
    
    if (initialIsFollowing !== undefined) {
      setIsFollowing(initialIsFollowing);
    } else {
      checkFollowStatus();
    }
  }, [userId, currentUser, isAuthenticated, initialIsFollowing]);
  
  const toggleFollow = async () => {
    if (!isAuthenticated || isSelf) return;
    
    setLoading(true);
    try {
      if (isFollowing) {
        // Unfollow
        await axios.post(`http://localhost:8000/users/${userId}/unfollow`, {}, {
          headers: {
            Authorization: `Bearer ${currentUser.access_token}`
          }
        });
      } else {
        // Follow
        await axios.post(`http://localhost:8000/users/${userId}/follow`, {}, {
          headers: {
            Authorization: `Bearer ${currentUser.access_token}`
          }
        });
      }
      
      setIsFollowing(!isFollowing);
      if (onFollowChange) {
        onFollowChange(!isFollowing);
      }
    } catch (error) {
      console.error('Error toggling follow status:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Show edit profile button for own profile
  if (isSelf) {
    return (
      <button className="border border-gray-300 text-gray-800 px-4 py-2 rounded-full font-bold hover:bg-gray-100">
        Edit profile
      </button>
    );
  }
  
  // If not authenticated, show disabled button
  if (!isAuthenticated) {
    return (
      <button
        disabled
        className="px-4 py-2 rounded-full font-bold bg-gray-300 text-white opacity-50 cursor-not-allowed"
      >
        Follow
      </button>
    );
  }
  
  return (
    <button
      onClick={toggleFollow}
      disabled={loading}
      className={`px-4 py-2 rounded-full font-bold ${
        isFollowing 
          ? 'border border-twitter-blue text-twitter-blue hover:bg-blue-50' 
          : 'bg-twitter-blue text-white hover:bg-blue-600'
      } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {loading ? 'Loading...' : isFollowing ? 'Following' : 'Follow'}
    </button>
  );
};


export default FollowButton;
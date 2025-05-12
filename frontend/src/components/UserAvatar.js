// src/components/UserAvatar.js
import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';

const UserAvatar = ({ username, imageUrl, size = "md", className = "" }) => {
  const { currentUser } = useContext(AuthContext);
  const [imgSrc, setImgSrc] = useState('');
  const [imageError, setImageError] = useState(false);
  
  // Get size classes based on size prop
  const sizeClasses = {
    "sm": "h-8 w-8",
    "md": "h-10 w-10",
    "lg": "h-12 w-12",
    "xl": "h-16 w-16",
    "2xl": "h-24 w-24"
  }[size] || "h-10 w-10";
  
  // Initialize image source on mount and when props change
  useEffect(() => {
    if (imageUrl) {
      // Add cache busting parameter
      setImgSrc(`${imageUrl}${imageUrl.includes('?') ? '&' : '?'}t=${Date.now()}`);
      setImageError(false);
    } else if (username && currentUser && username === currentUser.username && currentUser.profile_image_url) {
      // If no image URL but username matches current user, use their profile image
      setImgSrc(`${currentUser.profile_image_url}${currentUser.profile_image_url.includes('?') ? '&' : '?'}t=${Date.now()}`);
      setImageError(false);
    }
  }, [imageUrl, username, currentUser]);
  
  // Listen for user profile updates
  useEffect(() => {
    const handleUserUpdate = (event) => {
      const updatedUser = event.detail;
      // Update if username matches the updated user
      if (updatedUser && username === updatedUser.username && updatedUser.profile_image_url) {
        // Add cache busting parameter to force fresh image load
        setImgSrc(`${updatedUser.profile_image_url}${updatedUser.profile_image_url.includes('?') ? '&' : '?'}t=${Date.now()}`);
        setImageError(false);
      }
    };
    
    window.addEventListener('user-updated', handleUserUpdate);
    return () => window.removeEventListener('user-updated', handleUserUpdate);
  }, [username]);
  
  if (!imgSrc || imageError) {
    return (
      <div className={`${sizeClasses} rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-bold text-xl ${className}`}>
        {username?.[0]?.toUpperCase() || 'U'}
      </div>
    );
  }
  
  return (
    <img 
      src={imgSrc}
      alt={username || "User"}
      className={`${sizeClasses} rounded-full object-cover ${className}`}
      onError={(e) => {
        e.target.onerror = null;
        setImageError(true);
      }}
    />
  );
};

export default UserAvatar;
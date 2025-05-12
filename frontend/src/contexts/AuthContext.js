import React, { createContext, useState, useEffect } from 'react';
import authService from '../services/auth.service';
import axios from 'axios';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Debug the stored user data
  useEffect(() => {
    console.log("Current user in AuthContext:", currentUser);
  }, [currentUser]);

  // Initial auth check
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check if user is stored in localStorage
        const user = authService.getCurrentUser();
        console.log("User from localStorage:", user);
        
        if (user && user.access_token) {
          // Simple check - try to fetch user data with the token
          try {
            const response = await axios.get('http://localhost:8000/users/me', {
              headers: { 
                'Authorization': `Bearer ${user.access_token}` 
              }
            });
            
            console.log("Token validation response:", response.data);
            
            // Merge the existing user data with any new data from the API
            const mergedUser = {
              ...user,
              ...response.data,
              // Ensure the token is preserved
              access_token: user.access_token
            };
            
            console.log("Updated user data:", mergedUser);
            
            // If successful, set the current user
            setCurrentUser(mergedUser);
            
            // Update localStorage with the merged data
            localStorage.setItem('user', JSON.stringify(mergedUser));
          } catch (tokenError) {
            console.error('Token validation failed:', tokenError);
            // Token is invalid, clear it
            authService.logout();
          }
        }
      } catch (error) {
        console.error('Auth check error:', error);
        authService.logout();
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Login function
  const login = async (username, password) => {
    try {
      const userData = await authService.login(username, password);
      setCurrentUser(userData);
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        message: error.response?.data?.detail || "Login failed"
      };
    }
  };

  // Register function
  const register = async (username, email, password) => {
    try {
      await authService.register(username, email, password);
      return { success: true };
    } catch (error) {
      console.error('Registration error:', error);
      return {
        success: false,
        message: error.response?.data?.detail || "Registration failed"
      };
    }
  };

  // Logout function
  const logout = () => {
    authService.logout();
    setCurrentUser(null);
  };

  // Enhanced updateUser function with specific handling for profile images
  const updateUser = (userData) => {
  try {
    if (!userData) {
      console.error("Attempted to update user with no data");
      return false;
    }
    
    // Create merged data with all fields
    const mergedData = {
      ...(currentUser || {}),
      ...userData,
      
      // Ensure critical fields are never lost
      id: userData.id || (currentUser ? currentUser.id : null),
      access_token: userData.access_token || (currentUser ? currentUser.access_token : null),
    };
    
    // Explicit handling for image fields
    if (userData.profile_image_url) {
      // Add cache-busting parameter to force fresh image load
      mergedData.profile_image_url = userData.profile_image_url + `?t=${Date.now()}`;
    }
    
    if (userData.banner_image_url) {
      mergedData.banner_image_url = userData.banner_image_url + `?t=${Date.now()}`;
    }
    
    // Update React state
    setCurrentUser(mergedData);
    
    // Update localStorage
    localStorage.setItem('user', JSON.stringify(mergedData));
    
    // Broadcast event to notify other components of the update
    window.dispatchEvent(new CustomEvent('user-updated', { detail: mergedData }));
    
    return true;
  } catch (error) {
    console.error("Error in updateUser:", error);
    return false;
  }
};
  // Function to get user avatar URL with fallback
  const getUserAvatar = (user = null) => {
    const targetUser = user || currentUser;
    if (!targetUser) return null;
    
    return targetUser.profile_image_url || 
      `https://ui-avatars.com/api/?name=${encodeURIComponent(targetUser.username)}&background=random`;
  };

  const value = {
    currentUser,
    login,
    register,
    logout,
    updateUser,
    getUserAvatar,
    isAuthenticated: !!currentUser
  };

  // Show loading indicator while checking authentication
  if (loading) {
    return <div className="flex justify-center items-center h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>;
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
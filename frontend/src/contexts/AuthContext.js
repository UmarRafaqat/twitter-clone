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

  // Manual update user function since the existing one might be missing
  const updateUser = (userData) => {
    try {
      if (!userData) {
        console.error("Attempted to update user with no data");
        return;
      }
      
      console.log("Updating user data:", userData);
      
      // Create merged data with all fields
      const mergedData = {
        ...(currentUser || {}),  // Start with current user data if it exists
        ...userData,             // Override with new data
        
        // Ensure critical fields are never lost
        id: userData.id || (currentUser ? currentUser.id : null),
        access_token: userData.access_token || (currentUser ? currentUser.access_token : null)
      };
      
      // Update state
      setCurrentUser(mergedData);
      
      // Update localStorage
      try {
        localStorage.setItem('user', JSON.stringify(mergedData));
        console.log("Updated user data in localStorage");
      } catch (e) {
        console.error("Error updating localStorage:", e);
      }
    } catch (error) {
      console.error("Error in updateUser:", error);
    }
  };

  const value = {
    currentUser,
    login,
    register,
    logout,
    updateUser,  // Always include this function
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
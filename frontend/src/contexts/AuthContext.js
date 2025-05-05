import React, { createContext, useState, useEffect } from 'react';
import authService from '../services/auth.service';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is stored in localStorage
    const user = authService.getCurrentUser();
    if (user) {
      setCurrentUser(user);
    }
    setLoading(false);
  }, []);

  // Login function
  const login = async (username, password) => {
    try {
      const userData = await authService.login(username, password);
      setCurrentUser(userData);
      return { success: true };
    } catch (error) {
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

  const value = {
    currentUser,
    login,
    register,
    logout,
    isAuthenticated: !!currentUser
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

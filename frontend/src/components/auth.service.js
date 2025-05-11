import axios from 'axios';

const API_URL = 'http://localhost:8000';

class AuthService {
  // Login - fixed to properly handle the user ID
  async login(username, password) {
    try {
      const formData = new FormData();
      formData.append('username', username);
      formData.append('password', password);

      // Get token
      const tokenResponse = await axios.post(`${API_URL}/token`, formData);
      
      if (!tokenResponse.data.access_token) {
        console.error("No access token in response:", tokenResponse.data);
        throw new Error("No access token received");
      }

      // Store token temporarily
      const token = tokenResponse.data.access_token;
      
      // Get user info with the token
      const userResponse = await axios.get(`${API_URL}/users/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      // Validate user data
      if (!userResponse.data || !userResponse.data.id) {
        console.error("Missing user ID in response:", userResponse.data);
        throw new Error("Missing user ID in server response");
      }
      
      // Create complete user object
      const user = {
        ...userResponse.data,
        access_token: token
      };
      
      // Log the complete user object
      console.log("Complete user object:", {
        id: user.id,
        username: user.username,
        email: user.email,
        hasToken: !!user.access_token
      });
      
      // Store user data in localStorage
      localStorage.setItem('user', JSON.stringify(user));
      
      return user;
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    }
  }

  // Get user info directly from API
  getUserInfo(token) {
    return axios
      .get(`${API_URL}/users/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      .then(response => {
        if (!response.data || !response.data.id) {
          console.error("Invalid user data received:", response.data);
          throw new Error("Invalid user data received from server");
        }
        return response.data;
      });
  }

  // Logout - clear all user data
  logout() {
    console.log("Logging out, removing user data from localStorage");
    localStorage.removeItem('user');
  }

  // Register new user
  register(username, email, password) {
    return axios.post(`${API_URL}/register`, {
      username,
      email,
      password
    });
  }

  // Get current user from localStorage with validation
  getCurrentUser() {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      console.log("No user found in localStorage");
      return null;
    }
    
    try {
      const user = JSON.parse(userStr);
      
      // Validate that user has required fields
      if (!user.id) {
        console.error("User in localStorage is missing ID", user);
        return null;
      }
      
      if (!user.access_token) {
        console.error("User in localStorage is missing access token", user);
        return null;
      }
      
      return user;
    } catch (e) {
      console.error('Error parsing user data:', e);
      localStorage.removeItem('user'); // Clear invalid data
      return null;
    }
  }

  // Update user data in localStorage
  updateUserData(userData) {
    if (!userData) {
      console.error('Cannot update user with undefined data');
      return null;
    }
    
    const currentUser = this.getCurrentUser();
    if (!currentUser) {
      console.error('No current user found in localStorage');
      return null;
    }
    
    // Log current stored data and update
    console.log("Current user data:", {
      id: currentUser.id,
      username: currentUser.username
    });
    console.log("Updating with:", userData);
    
    // Create a complete user object with validation
    const updatedUser = { 
      ...currentUser,  // Start with all current user data
      ...userData,     // Override with new data
      
      // Explicitly ensure critical fields are never lost
      id: userData.id || currentUser.id,
      access_token: userData.access_token || currentUser.access_token,
      username: userData.username || currentUser.username,
      email: userData.email || currentUser.email,
      created_at: userData.created_at || currentUser.created_at
    };
    
    // Log the updated user data
    console.log('Final user data to save:', {
      id: updatedUser.id,
      username: updatedUser.username,
      hasToken: !!updatedUser.access_token,
      bio: updatedUser.bio
    });
    
    try {
      localStorage.setItem('user', JSON.stringify(updatedUser));
      return updatedUser;
    } catch (e) {
      console.error('Error saving user data to localStorage:', e);
      return currentUser; // Return original on error
    }
  }
  
  // Utility function to check if token exists
  hasValidToken() {
    const user = this.getCurrentUser();
    return !!(user && user.access_token);
  }
}

export default new AuthService();
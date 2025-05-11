import React, { useState, useContext, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import axios from 'axios';

const API_URL = 'http://localhost:8000';

const Login = () => {
  const { setDirectUserData, isAuthenticated, currentUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState(null);

  // Debug current authentication state
  useEffect(() => {
    console.log("Login page - isAuthenticated:", isAuthenticated);
    if (currentUser) {
      console.log("Login page - currentUser:", currentUser);
    }
  }, [isAuthenticated, currentUser]);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && currentUser && currentUser.id) {
      navigate('/');
    }
  }, [isAuthenticated, navigate, currentUser]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setDebugInfo(null);
    
    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // STEP 1: Direct API call to get token
      console.log("Step 1: Getting token...");
      const formData = new FormData();
      formData.append('username', username);
      formData.append('password', password);
      
      const tokenResponse = await axios.post(`${API_URL}/token`, formData);
      console.log("Token response:", tokenResponse.data);
      
      if (!tokenResponse.data || !tokenResponse.data.access_token) {
        setError("Server error: No access token received");
        setDebugInfo(tokenResponse.data);
        setIsLoading(false);
        return;
      }
      
      const token = tokenResponse.data.access_token;
      
      // STEP 2: Get user data with token
      console.log("Step 2: Getting user data with token...");
      const userResponse = await axios.get(`${API_URL}/users/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log("User data response:", userResponse.data);
      
      // STEP 3: Create complete user object and validate
      const userData = {
        ...userResponse.data,
        access_token: token
      };
      
      console.log("Final user data:", userData);
      
      // Show debug info
      setDebugInfo({
        token: token,
        userData: userData
      });
      
      // Save user in context and localStorage
      if (setDirectUserData) {
        setDirectUserData(userData);
      } else {
        // Fallback if setDirectUserData isn't available
        localStorage.setItem('user', JSON.stringify(userData));
        window.location.href = '/'; // Force reload as fallback
      }
      
      // Navigate to home
      navigate('/');
    } catch (err) {
      console.error('Login error:', err);
      
      // Handle different error types
      if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else if (err.message) {
        setError(`Error: ${err.message}`);
      } else {
        setError('Login failed. Please check your username and password.');
      }
      
      // Include debug info
      setDebugInfo({
        error: err.message,
        response: err.response?.data
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h1 className="mt-6 text-center text-3xl font-extrabold text-gray-900">Sign in to your account</h1>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{' '}
            <Link to="/register" className="font-medium text-twitter-blue hover:text-blue-500">
              create a new account
            </Link>
          </p>
        </div>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        )}
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="username" className="sr-only">Username</label>
              <input
                id="username"
                name="username"
                type="text"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-twitter-blue focus:border-twitter-blue focus:z-10 sm:text-sm"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-twitter-blue focus:border-twitter-blue focus:z-10 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-twitter-blue hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-twitter-blue ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </>
              ) : 'Sign in'}
            </button>
          </div>
        </form>
        
        {/* Debug info section (remove in production) */}
        {debugInfo && (
          <div className="mt-4 p-4 bg-gray-100 rounded-md text-xs overflow-auto max-h-64">
            <h3 className="font-bold mb-2">Debug Info:</h3>
            <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;
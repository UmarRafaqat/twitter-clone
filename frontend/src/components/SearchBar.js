import React, { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import axios from 'axios';
import authService from '../services/auth.service';

const API_URL = 'http://localhost:8000';

const SearchBar = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef(null);
  
  // Helper to set auth token in requests
  const authHeader = () => {
    const user = authService.getCurrentUser();
    if (user && user.access_token) {
      return { Authorization: `Bearer ${user.access_token}` };
    } else {
      return {};
    }
  };
  
  useEffect(() => {
    // Add a click event listener to close the search results when clicking outside
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowResults(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  useEffect(() => {
    const searchUsers = async () => {
      if (query.length < 2) {
        setResults([]);
        return;
      }
      
      setLoading(true);
      setError(null);
      
      try {
        const response = await axios.get(`${API_URL}/users/search?query=${encodeURIComponent(query)}`, {
          headers: authHeader()
        });
        setResults(response.data);
        setShowResults(true);
      } catch (err) {
        setError('Failed to search users');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    // Debounce search to avoid too many requests
    const debounceTimeout = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounceTimeout);
  }, [query]);
  
  const handleFollow = async (userId, isFollowing) => {
    try {
      if (!isFollowing) {
        await axios.post(`${API_URL}/users/${userId}/follow`, {}, {
          headers: authHeader()
        });
      } else {
        await axios.post(`${API_URL}/users/${userId}/unfollow`, {}, {
          headers: authHeader()
        });
      }
      
      // Update result list to reflect the change
      setResults(results.map(user => 
        user.id === userId 
          ? { ...user, is_following: !isFollowing } 
          : user
      ));
    } catch (err) {
      console.error('Error following/unfollowing user:', err);
    }
  };
  
  return (
    <div className="relative" ref={searchRef}>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          className="bg-gray-100 text-gray-900 text-sm rounded-full block w-full pl-10 pr-10 p-2.5 focus:outline-none focus:ring-twitter-blue focus:border-twitter-blue"
          placeholder="Search Twitter"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => { if (results.length > 0) setShowResults(true) }}
        />
        {query && (
          <button
            className="absolute inset-y-0 right-0 flex items-center pr-3"
            onClick={() => {
              setQuery('');
              setResults([]);
              setShowResults(false);
            }}
          >
            <X className="h-5 w-5 text-gray-400 hover:text-gray-600" />
          </button>
        )}
      </div>
      
      {showResults && (
        <div className="absolute mt-1 w-full bg-white rounded-lg shadow-lg z-10 max-h-96 overflow-y-auto">
          {loading ? (
            <div className="text-center p-4">
              <svg className="animate-spin h-5 w-5 text-twitter-blue mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          ) : error ? (
            <div className="text-red-500 p-4 text-center">{error}</div>
          ) : results.length === 0 && query.length >= 2 ? (
            <div className="text-gray-500 p-4 text-center">No users found</div>
          ) : (
            <ul>
              {results.map((user) => (
                <li key={user.id} className="border-b border-gray-100 last:border-0">
                  <div className="flex items-center justify-between p-4 hover:bg-gray-50">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-bold">
                        {user.username && user.username[0].toUpperCase()}
                      </div>
                      <div className="ml-3">
                        <div className="font-bold text-gray-900">{user.username}</div>
                        <div className="text-gray-500 text-sm">@{user.username}</div>
                      </div>
                    </div>
                    
                    {!user.is_self && (
                      <button
                        className={`px-4 py-1 rounded-full text-sm font-bold ${
                          user.is_following
                            ? 'bg-white text-black border border-gray-300 hover:bg-red-50 hover:text-red-600 hover:border-red-300'
                            : 'bg-black text-white hover:bg-gray-800'
                        }`}
                        onClick={() => handleFollow(user.id, user.is_following)}
                      >
                        {user.is_following ? 'Following' : 'Follow'}
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBar;

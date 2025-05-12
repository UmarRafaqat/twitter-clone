// frontend/src/pages/Discover.js
import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { RefreshCw, Users } from 'lucide-react';
import { AuthContext } from '../contexts/AuthContext';
import Tweet from '../components/Tweet';
import FollowButton from '../components/FollowButton';

const Discover = () => {
  const [discoverTweets, setDiscoverTweets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const { currentUser, isAuthenticated } = useContext(AuthContext);

  // Function to fetch discover feed posts
  const fetchDiscoverFeed = async () => {
    if (!isAuthenticated) {
      setLoading(false);
      setDiscoverTweets([]);
      console.log("Not authenticated, showing sample discover content");
      return;
    }
    
    try {
      console.log("Fetching discover feed...");
      setLoading(true);
      setError(null);
      
      // Fetch discover feed posts
      const response = await axios.get('http://localhost:8000/discover', {
        headers: {
          Authorization: `Bearer ${currentUser.access_token}`
        }
      });
      
      // Verify data structure
      if (!Array.isArray(response.data)) {
        console.error("Expected array of tweets, got:", typeof response.data);
        setDiscoverTweets([]);
        setLoading(false);
        return;
      }
      
      console.log('Fetched discover tweets:', response.data);
      
      // Process each tweet to ensure we have complete data
      const enhancedTweets = await Promise.all(response.data.map(async (tweet) => {
        try {
          // Get comment count for each tweet
          const commentsResponse = await axios.get(`http://localhost:8000/tweets/${tweet.id}/comments/count`, {
            headers: {
              Authorization: `Bearer ${currentUser.access_token}`
            }
          });
          
          // Combine data
          return {
            ...tweet,
            comments_count: commentsResponse.data.count
          };
        } catch (err) {
          console.error(`Error enhancing tweet ${tweet.id}:`, err);
          // Use original tweet data as fallback
          return tweet;
        }
      }));
      
      setDiscoverTweets(enhancedTweets);
    } catch (err) {
      console.error('Error fetching discover feed:', err);
      setError('Failed to load discover feed: ' + (err.response?.data?.detail || err.message));
      setDiscoverTweets([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch discover feed when component mounts and auth status changes
  useEffect(() => {
    if (isAuthenticated) {
      fetchDiscoverFeed();
    } else {
      setDiscoverTweets([]);
      setLoading(false);
    }
  }, [isAuthenticated]);

  const handleRefresh = async () => {
    if (!isAuthenticated || refreshing) return;
    
    setRefreshing(true);
    await fetchDiscoverFeed();
    setRefreshing(false);
  };

  const handleReplyAdded = (reply) => {
    console.log('Reply added to discover feed tweet:', reply);
    // Update reply count for the parent tweet
    setDiscoverTweets(prevTweets => 
      prevTweets.map(tweet => 
        tweet.id === reply.in_reply_to
          ? { 
              ...tweet, 
              comments_count: (tweet.comments_count || 0) + 1 
            }
          : tweet
      )
    );
  };

  // Group tweets by user for a more organized display
  const tweetsByUser = discoverTweets.reduce((acc, tweet) => {
    const userId = tweet.user_id;
    if (!acc[userId]) {
      acc[userId] = [];
    }
    acc[userId].push(tweet);
    return acc;
  }, {});

  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-10 bg-white bg-opacity-90 backdrop-blur-sm">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h1 className="text-xl font-bold">Discover</h1>
          <button
            className={`p-2 rounded-full hover:bg-gray-200 ${refreshing ? 'animate-spin' : ''}`}
            onClick={handleRefresh}
            disabled={refreshing || !isAuthenticated}
          >
            <RefreshCw size={20} />
          </button>
        </div>
      </div>
      
      {/* Show login message if not authenticated */}
      {!isAuthenticated && (
        <div className="p-8 text-center">
          <h2 className="text-xl font-bold mb-2">Discover Popular Content</h2>
          <p className="text-gray-600 mb-4">Sign in to view popular tweets from various users.</p>
          <a 
            href="/login" 
            className="inline-block px-4 py-2 bg-twitter-blue text-white rounded-full hover:bg-blue-600"
          >
            Sign in
          </a>
        </div>
      )}
      
      {/* Discover feed content */}
      {isAuthenticated && (
        <>
          {loading && !refreshing ? (
            <div className="p-4 text-center text-gray-500">
              <div className="animate-pulse flex justify-center">
                <div className="h-5 w-5 bg-gray-300 rounded-full mr-2"></div>
                <div className="h-5 w-32 bg-gray-300 rounded"></div>
              </div>
            </div>
          ) : error ? (
            <div className="p-4 text-center text-red-500">
              <p>{error}</p>
              <button 
                className="mt-2 px-4 py-1 bg-gray-200 rounded-full text-gray-700 text-sm"
                onClick={handleRefresh}
              >
                Try again
              </button>
            </div>
          ) : discoverTweets.length === 0 ? (
            <div className="p-8 text-center border-t border-gray-100">
              <p className="text-gray-500 mb-3">No discover content available right now.</p>
              <p className="text-gray-600 text-sm">
                Try refreshing or come back later!
              </p>
            </div>
          ) : (
            <div className="discover-feed" data-testid="discover-feed">
              {Object.entries(tweetsByUser).map(([userId, userTweets]) => (
                <div key={userId} className="user-tweets-container border-b border-gray-200 pb-2">
                  {/* User header with follow button */}
                  <div className="flex items-center justify-between p-3 bg-gray-50">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-bold">
                        {userTweets[0].username?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div className="ml-3">
                        <p className="font-bold">{userTweets[0].username}</p>
                        <p className="text-gray-500 text-sm">@{userTweets[0].username?.toLowerCase()}</p>
                      </div>
                    </div>
                    <FollowButton userId={userId} />
                  </div>
                  
                  {/* User's tweets */}
                  {userTweets.map(tweet => (
                    <Tweet 
                      key={tweet.id} 
                      tweet={tweet} 
                      onReplyAdded={handleReplyAdded}
                    />
                  ))}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Discover;
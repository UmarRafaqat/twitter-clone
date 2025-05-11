// frontend/src/components/Timeline.js
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { RefreshCw } from 'lucide-react';
import { AuthContext } from '../contexts/AuthContext';
import Tweet from './Tweet';
import TweetForm from './TweetForm';

const Timeline = () => {
  const [tweets, setTweets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const { currentUser, isAuthenticated } = React.useContext(AuthContext);

  // Debug info
  console.log("Timeline rendered, auth status:", isAuthenticated);

  // Enhanced fetchTweets with counts preservation
  const fetchTweets = useCallback(async () => {
    // Skip fetch if not authenticated
    if (!isAuthenticated) {
      setLoading(false);
      setTweets([]);
      console.log("Not authenticated, skipping tweet fetch");
      return;
    }
    
    try {
      console.log("Fetching tweets...");
      setLoading(true);
      setError(null);
      
      // Fetch timeline tweets
      const response = await axios.get('http://localhost:8000/timeline', {
        headers: {
          Authorization: `Bearer ${currentUser.access_token}`
        }
      });
      
      // Verify data structure
      if (!Array.isArray(response.data)) {
        console.error("Expected array of tweets, got:", typeof response.data);
        setTweets([]);
        setLoading(false);
        return;
      }
      
      console.log('Fetched tweets:', response.data);
      
      // Process each tweet to ensure we have complete data
      const enhancedTweets = await Promise.all(response.data.map(async (tweet) => {
        // For each tweet, fetch accurate comment count and fresh like count
        try {
          // First, get the full tweet to ensure we have the most up-to-date data
          const tweetResponse = await axios.get(`http://localhost:8000/tweets/${tweet.id}`, {
            headers: {
              Authorization: `Bearer ${currentUser.access_token}`
            }
          });
          
          // Then get comment count
          const commentsResponse = await axios.get(`http://localhost:8000/tweets/${tweet.id}/comments/count`, {
            headers: {
              Authorization: `Bearer ${currentUser.access_token}`
            }
          });
          
          // Combine data
          return {
            ...tweetResponse.data,
            comments_count: commentsResponse.data.count
          };
        } catch (err) {
          console.error(`Error enhancing tweet ${tweet.id}:`, err);
          // Use original tweet data as fallback
          return tweet;
        }
      }));
      
      setTweets(enhancedTweets);
    } catch (err) {
      console.error('Error fetching tweets:', err);
      setError('Failed to load tweets: ' + (err.response?.data?.detail || err.message));
      setTweets([]);
    } finally {
      setLoading(false);
    }
  }, [currentUser, isAuthenticated]);

  // Fetch tweets when auth status changes
  useEffect(() => {
    if (isAuthenticated) {
      fetchTweets();
    } else {
      setTweets([]);
      setLoading(false);
    }
  }, [isAuthenticated, fetchTweets]);
  
  // Setup refresh interval (less frequent to avoid too many API calls)
  useEffect(() => {
    if (!isAuthenticated) return;
    
    // Initial fetch
    fetchTweets();
    
    // Refresh timeline every 60 seconds
    const intervalId = setInterval(() => {
      if (isAuthenticated) {
        console.log("Auto-refreshing timeline");
        fetchTweets();
      }
    }, 60000); // 60 seconds refresh interval
    
    return () => clearInterval(intervalId);
  }, [fetchTweets, isAuthenticated]);

  const handleRefresh = async () => {
    if (!isAuthenticated || refreshing) return;
    
    setRefreshing(true);
    await fetchTweets();
    setRefreshing(false);
  };

  const handleTweetAdded = (newTweet) => {
    console.log('New tweet added to timeline:', newTweet);
    // Add the new tweet to the beginning of the timeline
    setTweets(prevTweets => [newTweet, ...prevTweets]);
  };

  const handleReplyAdded = (reply) => {
    console.log('Reply added:', reply);
    // Update reply count for the parent tweet
    setTweets(prevTweets => 
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

  return (
    <div className="border-x border-gray-200 min-h-screen">
      <div className="sticky top-0 z-10 bg-white bg-opacity-90 backdrop-blur-sm">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h1 className="text-xl font-bold">Home</h1>
          <button
            className={`p-2 rounded-full hover:bg-gray-200 ${refreshing ? 'animate-spin' : ''}`}
            onClick={handleRefresh}
            disabled={refreshing || !isAuthenticated}
          >
            <RefreshCw size={20} />
          </button>
        </div>
      </div>
      
      {/* Always show the tweet form if authenticated */}
      {isAuthenticated && (
        <TweetForm onTweetAdded={handleTweetAdded} />
      )}
      
      {/* Show login message if not authenticated */}
      {!isAuthenticated && (
        <div className="p-8 text-center">
          <h2 className="text-xl font-bold mb-2">Welcome to Mini-Twitter</h2>
          <p className="text-gray-600 mb-4">Sign in to post tweets and view your timeline.</p>
          <a 
            href="/login" 
            className="inline-block px-4 py-2 bg-twitter-blue text-white rounded-full hover:bg-blue-600"
          >
            Sign in
          </a>
        </div>
      )}
      
      {/* Tweet display section */}
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
          ) : tweets.length === 0 ? (
            <div className="p-8 text-center border-t border-gray-100">
              <p className="text-gray-500 mb-3">No tweets in your timeline yet.</p>
              <p className="text-gray-600 text-sm">
                Follow other users or post your first tweet to get started!
              </p>
            </div>
          ) : (
            <div className="tweet-list" data-testid="tweet-list">
              {tweets.map(tweet => (
                <Tweet 
                  key={tweet.id} 
                  tweet={tweet} 
                  onReplyAdded={handleReplyAdded}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Timeline;
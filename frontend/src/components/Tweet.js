// frontend/src/components/Tweet.js
import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import moment from 'moment';
import { AuthContext } from '../contexts/AuthContext';
import CommentsSection from './CommentsSection';
import UserAvatar from './UserAvatar';

// Lucide icons as components
const HeartIcon = ({ filled }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill={filled ? "red" : "none"} stroke={filled ? "red" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
  </svg>
);

const MessageCircleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
  </svg>
);

const RetweetIcon = ({ active }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={active ? "green" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="17 1 21 5 17 9"></polyline>
    <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
    <polyline points="7 23 3 19 7 15"></polyline>
    <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
  </svg>
);

const Tweet = ({ tweet: initialTweet, onReplyAdded }) => {
  const [tweet, setTweet] = useState(initialTweet);
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(tweet?.likes_count || 0);
  const [commentsCount, setCommentsCount] = useState(tweet?.comments_count || 0);
  const [retweetsCount, setRetweetsCount] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [isRetweeting, setIsRetweeting] = useState(false);
  const [isRetweetedByUser, setIsRetweetedByUser] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const { currentUser, isAuthenticated } = useContext(AuthContext);

  // Format relative time (e.g., "5 minutes ago")
  const formatTimeAgo = (dateString) => {
    return moment(dateString).fromNow();
  };

  // Check if tweet is a retweet
  const isRetweet = tweet && tweet.retweeted_from != null;

  // Listen for user profile updates
  useEffect(() => {
    const handleUserUpdate = (e) => {
      // If the updated user matches this tweet's author, trigger refresh
      if (e.detail && tweet && e.detail.username === tweet.username) {
        setRefreshTrigger(prev => prev + 1);
      }
    };
    
    window.addEventListener('user-updated', handleUserUpdate);
    return () => window.removeEventListener('user-updated', handleUserUpdate);
  }, [tweet]);

  // On component mount and when tweet changes, fetch the latest counts and statuses
  useEffect(() => {
    if (!tweet || !isAuthenticated) return;

    // Function to fetch like status
    const fetchLikeStatus = async () => {
      try {
        const response = await axios.get(`http://localhost:8000/tweets/${tweet.id}/like-status`, {
          headers: {
            Authorization: `Bearer ${currentUser.access_token}`
          }
        });
        setIsLiked(response.data.is_liked);
      } catch (error) {
        console.error('Error fetching like status:', error);
      }
    };

    // Fetch comment count
    const fetchCommentCount = async () => {
      try {
        const response = await axios.get(`http://localhost:8000/tweets/${tweet.id}/comments/count`, {
          headers: {
            Authorization: `Bearer ${currentUser.access_token}`
          }
        });
        setCommentsCount(response.data.count || 0);
      } catch (error) {
        console.error('Error fetching comment count:', error);
      }
    };

    // Fetch retweet count and status
    const fetchRetweetInfo = async () => {
      try {
        // Fetch retweet count
        const countResponse = await axios.get(`http://localhost:8000/tweets/${tweet.id}/retweets/count`, {
          headers: {
            Authorization: `Bearer ${currentUser.access_token}`
          }
        });
        setRetweetsCount(countResponse.data.count || 0);
        
        // Check if user has retweeted this tweet
        const statusResponse = await axios.get(`http://localhost:8000/tweets/${tweet.id}/retweet-status`, {
          headers: {
            Authorization: `Bearer ${currentUser.access_token}`
          }
        });
        setIsRetweetedByUser(statusResponse.data.is_retweeted || false);
      } catch (error) {
        console.error('Error fetching retweet info:', error);
        
        // Fallback: Check user's tweets for any retweets of this tweet
        try {
          const userTweetsResponse = await axios.get('http://localhost:8000/tweets', {
            params: { user_id: currentUser.id },
            headers: {
              Authorization: `Bearer ${currentUser.access_token}`
            }
          });
          
          // Check if any of the user's tweets is a retweet of this tweet
          const hasRetweeted = userTweetsResponse.data.some(t => 
            t.retweeted_from === tweet.id || 
            (isRetweet && t.retweeted_from === tweet.retweeted_from)
          );
          
          setIsRetweetedByUser(hasRetweeted);
        } catch (fallbackError) {
          console.error('Error with retweet status fallback check:', fallbackError);
        }
      }
    };

    // Fetch fresh tweet data to get accurate counts
    const fetchTweetData = async () => {
      try {
        const response = await axios.get(`http://localhost:8000/tweets/${tweet.id}`, {
          headers: {
            Authorization: `Bearer ${currentUser.access_token}`
          }
        });
        // Update likes count from fresh data
        setLikesCount(response.data.likes_count || 0);
        
        // Update tweet data if needed
        if (JSON.stringify(tweet) !== JSON.stringify(response.data)) {
          setTweet(response.data);
        }
      } catch (error) {
        console.error('Error fetching tweet data:', error);
      }
    };

    // Execute all fetch operations
    fetchLikeStatus();
    fetchCommentCount();
    fetchRetweetInfo();
    fetchTweetData();
  }, [tweet.id, currentUser, isAuthenticated, isRetweet, refreshTrigger]);

  // Handle like and unlike
  const handleLikeToggle = async () => {
    if (!isAuthenticated) return;

    try {
      let response;
      if (isLiked) {
        // Unlike the tweet
        response = await axios.post(`http://localhost:8000/tweets/${tweet.id}/unlike`, {}, {
          headers: {
            Authorization: `Bearer ${currentUser.access_token}`
          }
        });
      } else {
        // Like the tweet
        response = await axios.post(`http://localhost:8000/tweets/${tweet.id}/like`, {}, {
          headers: {
            Authorization: `Bearer ${currentUser.access_token}`
          }
        });
      }

      // Update state with the count from the response
      setLikesCount(response.data.likes_count);
      setIsLiked(!isLiked);
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  // Handle retweet
  const handleRetweet = async () => {
    if (!isAuthenticated || isRetweeting) return;
    
    // If already retweeted, show a message
    if (isRetweetedByUser) {
      alert('You have already retweeted this tweet');
      return;
    }

    setIsRetweeting(true);
    
    try {
      // Get the original tweet ID if this is a retweet
      const originalId = isRetweet ? tweet.retweeted_from : tweet.id;
      
      const response = await axios.post(
        `http://localhost:8000/tweets/${originalId}/retweet`,
        {},
        {
          headers: {
            Authorization: `Bearer ${currentUser.access_token}`
          }
        }
      );
      
      console.log('Retweet successful:', response.data);
      
      // Update UI to show this tweet is retweeted by the user
      setIsRetweetedByUser(true);
      
      // Increment retweet count
      setRetweetsCount(prev => prev + 1);
    } catch (error) {
      console.error('Error retweeting:', error);
      alert('Failed to retweet. ' + (error.response?.data?.detail || error.message));
    } finally {
      setIsRetweeting(false);
    }
  };

  // Handle when a comment is added to update the comment count
  const handleCommentAdded = (newComment) => {
    setCommentsCount(prev => prev + 1);
    
    // Also pass to parent if provided
    if (onReplyAdded && typeof onReplyAdded === 'function') {
      onReplyAdded(newComment);
    }
  };

  // Format hashtags as clickable links
  const renderContent = (content) => {
    if (!content) return '';
    
    // Replace hashtags with styled spans
    return content.split(/(\s+)/).map((word, i) => {
      if (word.startsWith('#')) {
        return (
          <span key={i} className="text-twitter-blue hover:underline cursor-pointer">
            {word}
          </span>
        );
      }
      return word;
    });
  };

  if (!tweet) return null;

  // Reference the original tweet if this is a retweet
  const displayTweet = isRetweet && tweet.original_user_id ? {
    ...tweet,
    originalUsername: tweet.original_username || 'Unknown',
    originalUserId: tweet.original_user_id
  } : tweet;

  return (
    <div className="border-b border-gray-200 p-4 hover:bg-gray-50 transition">
      {/* Retweet header if this is a retweet */}
      {isRetweet && (
        <div className="flex items-center text-gray-500 text-sm mb-2">
          <RetweetIcon active={true} />
          <span className="ml-2">
            Retweeted by {tweet.username || 'user'}
          </span>
        </div>
      )}
      
      <div className="flex">
        {/* User avatar */}
        <div className="flex-shrink-0 mr-3">
          <UserAvatar 
            username={displayTweet.username}
            imageUrl={displayTweet.profile_image_url}
            size="md"
          />
        </div>
        
        {/* Tweet content */}
        <div className="flex-1">
          {/* Tweet header */}
          <div className="flex items-center">
            <span className="font-bold">{displayTweet.username}</span>
            <span className="text-gray-500 ml-2 text-sm">
              @{displayTweet.username?.toLowerCase()}
            </span>
            <span className="mx-1 text-gray-500">·</span>
            <span className="text-gray-500 text-sm">
              {formatTimeAgo(displayTweet.created_at)}
            </span>
          </div>
          
          {/* Tweet text */}
          <div className="mt-1 text-gray-800">
            {renderContent(displayTweet.content)}
          </div>
          
          {/* Media attachments */}
          {displayTweet.media_urls && displayTweet.media_urls.length > 0 && (
            <div className="mt-2 rounded-lg overflow-hidden">
              {displayTweet.media_urls.length === 1 ? (
                <img 
                  src={displayTweet.media_urls[0]} 
                  alt="Tweet attachment" 
                  className="max-h-80 w-auto object-contain rounded-lg border border-gray-200"
                />
              ) : (
                <div className="grid grid-cols-2 gap-1">
                  {displayTweet.media_urls.slice(0, 4).map((url, i) => (
                    <div key={i} className={`${i >= 2 ? 'mt-1' : ''}`}>
                      <img 
                        src={url} 
                        alt={`Attachment ${i+1}`} 
                        className="h-40 w-full object-cover rounded-lg border border-gray-200"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {/* Tweet actions */}
          <div className="mt-3 flex items-center justify-between max-w-md">
            {/* Comment button */}
            <button 
              className="flex items-center text-gray-500 hover:text-twitter-blue group"
              onClick={() => setShowComments(!showComments)}
            >
              <div className="p-2 rounded-full group-hover:bg-blue-50">
                <MessageCircleIcon />
              </div>
              <span className="ml-1 text-sm">{commentsCount}</span>
            </button>
            
            {/* Retweet button */}
            <button 
              className={`flex items-center ${isRetweetedByUser ? 'text-green-600' : 'text-gray-500 hover:text-green-600'} group`}
              onClick={handleRetweet}
              disabled={isRetweeting || !isAuthenticated}
            >
              <div className="p-2 rounded-full group-hover:bg-green-50">
                <RetweetIcon active={isRetweetedByUser} />
              </div>
              <span className="ml-1 text-sm">{retweetsCount}</span>
            </button>
            
            {/* Like button */}
            <button 
              className={`flex items-center ${isLiked ? 'text-red-600' : 'text-gray-500 hover:text-red-600'} group`}
              onClick={handleLikeToggle}
              disabled={!isAuthenticated}
            >
              <div className="p-2 rounded-full group-hover:bg-red-50">
                <HeartIcon filled={isLiked} />
              </div>
              <span className="ml-1 text-sm">{likesCount}</span>
            </button>
          </div>
          
          {/* Comments section */}
          {showComments && (
            <CommentsSection 
              tweetId={tweet.id} 
              onCommentAdded={handleCommentAdded}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default Tweet;
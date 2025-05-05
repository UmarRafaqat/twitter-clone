import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, Link as LinkIcon } from 'lucide-react';
import Tweet from '../components/Tweet';
import tweetService from '../services/tweet.service';
import { AuthContext } from '../contexts/AuthContext';
import moment from 'moment';

const Profile = () => {
  const { currentUser } = useContext(AuthContext);
  const [tweets, setTweets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const fetchUserTweets = async () => {
      try {
        setLoading(true);
        // This would ideally be a specific API endpoint for user tweets
        // For now, we'll use the timeline assuming it includes user's tweets
        const response = await tweetService.getTimeline();
        // Filter to only show the current user's tweets
        const userTweets = response.data.filter(tweet => 
          tweet.user_id === currentUser?.id || tweet.username === currentUser?.username
        );
        setTweets(userTweets);
      } catch (err) {
        setError('Failed to load tweets');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (currentUser) {
      fetchUserTweets();
    } else {
      setLoading(false);
    }
  }, [currentUser]);

  if (!currentUser) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <p className="text-gray-600 mb-4">Please sign in to view your profile</p>
        <Link to="/login" className="bg-twitter-blue text-white px-4 py-2 rounded-full">
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="border-x border-gray-200 min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white bg-opacity-90 backdrop-blur-sm p-4 border-b border-gray-200">
        <div className="flex items-center">
          <Link to="/" className="mr-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
          </Link>
          <div>
            <h1 className="text-xl font-bold">{currentUser.username}</h1>
            <p className="text-gray-500 text-sm">{tweets.length} Tweets</p>
          </div>
        </div>
      </div>
      
      {/* Profile header */}
      <div className="relative">
        <div className="h-48 bg-twitter-blue"></div>
        <div className="absolute top-36 left-4">
          <div className="h-24 w-24 rounded-full bg-white p-1">
            <div className="h-full w-full rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-bold text-4xl">
              {currentUser.username?.[0]?.toUpperCase()}
            </div>
          </div>
        </div>
        <div className="pt-16 px-4">
          <div className="flex justify-end">
            <button className="border border-twitter-blue text-twitter-blue px-4 py-2 rounded-full font-bold hover:bg-blue-50">
              Edit profile
            </button>
          </div>
          <h2 className="text-xl font-bold mt-4">{currentUser.username}</h2>
          <p className="text-gray-500">@{currentUser.username}</p>
          
          <div className="flex flex-wrap items-center text-gray-500 mt-3 gap-4">
            <div className="flex items-center">
              <Calendar size={16} className="mr-1" />
              <span>Joined {moment().format('MMMM YYYY')}</span>
            </div>
          </div>
          
          <div className="flex mt-4">
            <div className="mr-6">
              <span className="font-bold">0</span> <span className="text-gray-500">Following</span>
            </div>
            <div>
              <span className="font-bold">0</span> <span className="text-gray-500">Followers</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="border-b border-gray-200 mt-4">
        <nav className="flex">
          <button className="flex-1 py-4 font-bold text-twitter-blue border-b-2 border-twitter-blue">
            Tweets
          </button>
          <button className="flex-1 py-4 text-gray-500 hover:bg-gray-50">
            Replies
          </button>
          <button className="flex-1 py-4 text-gray-500 hover:bg-gray-50">
            Media
          </button>
          <button className="flex-1 py-4 text-gray-500 hover:bg-gray-50">
            Likes
          </button>
        </nav>
      </div>
      
      {/* Tweets */}
      {loading ? (
        <div className="flex justify-center items-center p-8">
          <svg className="animate-spin h-8 w-8 text-twitter-blue" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      ) : error ? (
        <div className="p-4 text-red-500 text-center">{error}</div>
      ) : tweets.length === 0 ? (
        <div className="p-8 text-center text-gray-500">
          You haven't posted any tweets yet.
        </div>
      ) : (
        <div>
          {tweets.map(tweet => (
            <Tweet key={tweet.id} tweet={tweet} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Profile;

import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import Tweet from '../components/Tweet';
import TweetForm from '../components/TweetForm';
import tweetService from '../services/tweet.service';
import { AuthContext } from '../contexts/AuthContext';

const Home = () => {
  const [tweets, setTweets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { isAuthenticated, currentUser } = useContext(AuthContext);

  useEffect(() => {
    const fetchTweets = async () => {
      if (!isAuthenticated) {
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        const response = await tweetService.getTimeline();
        setTweets(response.data);
      } catch (err) {
        setError('Failed to load tweets. Please try again later.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchTweets();
  }, [isAuthenticated]);

  const handleTweetAdded = (newTweet) => {
    setTweets([newTweet, ...tweets]);
  };

  return (
    <div className="border-x border-gray-200 min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white bg-opacity-90 backdrop-blur-sm border-b border-gray-200">
        <h1 className="text-xl font-bold p-4">Home</h1>
      </div>

      {isAuthenticated ? (
        <>
          {/* Tweet Form */}
          <div className="border-b border-gray-200">
            <TweetForm onTweetAdded={handleTweetAdded} />
          </div>

          {/* Tweets Feed */}
          {loading ? (
            <div className="flex justify-center items-center p-8">
              <svg className="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          ) : error ? (
            <div className="p-4 text-red-500 text-center">{error}</div>
          ) : tweets.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p className="text-lg font-bold mb-2">Welcome to your timeline!</p>
              <p className="mb-4">When you follow people, you'll see their Tweets here.</p>
              <Link to="/explore" className="text-blue-500 font-bold">Find people to follow</Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {tweets.map(tweet => (
                <Tweet key={tweet.id} tweet={tweet} />
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <h2 className="text-3xl font-bold mb-3">Welcome to Twitter</h2>
          <p className="text-gray-600 mb-8">See what's happening in the world right now</p>
          
          <div className="w-full max-w-xs space-y-4">
            <Link 
              to="/login"
              className="block w-full bg-blue-500 text-white py-3 px-4 rounded-full font-bold text-center hover:bg-blue-600 transition"
            >
              Sign in
            </Link>
            <Link 
              to="/register"
              className="block w-full bg-white text-blue-500 py-3 px-4 rounded-full font-bold text-center border border-blue-500 hover:bg-blue-50 transition"
            >
              Create account
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
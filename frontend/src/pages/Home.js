import React, { useState, useEffect, useContext } from 'react';
import Tweet from '../components/Tweet';
import TweetForm from '../components/TweetForm';
import tweetService from '../services/tweet.service';
import { AuthContext } from '../contexts/AuthContext';

const Home = () => {
  const [tweets, setTweets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { isAuthenticated } = useContext(AuthContext);

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
      <div className="sticky top-0 z-10 bg-white bg-opacity-90 backdrop-blur-sm border-b border-gray-200">
        <h1 className="text-xl font-bold p-4">Home</h1>
      </div>

      {isAuthenticated && <TweetForm onTweetAdded={handleTweetAdded} />}

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
          {isAuthenticated ? 
            "Your timeline is empty. Try following some users or posting a tweet!" :
            "Sign in to see your personalized timeline."}
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

export default Home;

import React, { useState, useEffect } from 'react';
import SearchBar from './SearchBar';
import tweetService from '../services/tweet.service';

const TrendingPanel = () => {
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTrends = async () => {
      try {
        setLoading(true);
        const response = await tweetService.getTrendingHashtags();
        setTrends(response.data);
      } catch (err) {
        setError('Failed to load trending topics');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchTrends();
    
    // Refresh trends every 2 minutes
    const interval = setInterval(fetchTrends, 120000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-gray-50 rounded-2xl overflow-hidden">
      <div className="p-3">
        <SearchBar />
      </div>

      <div className="bg-gray-50 rounded-2xl my-4">
        <div className="p-3 font-bold text-xl">Trends for you</div>
        
        {loading ? (
          <div className="p-3 text-center text-gray-500">Loading trends...</div>
        ) : error ? (
          <div className="p-3 text-center text-red-500">{error}</div>
        ) : trends.length === 0 ? (
          <div className="p-3 text-center text-gray-500">No trends available</div>
        ) : (
          <div>
            {trends.map((trend, index) => (
              <div key={index} className="px-3 py-2 hover:bg-gray-100 cursor-pointer">
                <div className="text-xs text-gray-500">Trending</div>
                <div className="font-bold">#{trend.hashtag}</div>
                <div className="text-sm text-gray-500">{trend.count} Tweets</div>
              </div>
            ))}
            <div className="p-3 text-twitter-blue hover:bg-gray-100 cursor-pointer">
              Show more
            </div>
          </div>
        )}
      </div>

      <div className="p-3 text-xs text-gray-500">
        <a href="#" className="hover:underline mr-2">Terms of Service</a>
        <a href="#" className="hover:underline mr-2">Privacy Policy</a>
        <a href="#" className="hover:underline mr-2">Cookie Policy</a>
        <a href="#" className="hover:underline mr-2">Accessibility</a>
        <a href="#" className="hover:underline mr-2">Ads info</a>
        <a href="#" className="hover:underline">More</a>
        <div className="mt-1">© 2025 Mini-Twitter Corp.</div>
      </div>
    </div>
  );
};

export default TrendingPanel;

// In TrendingPanel.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Hash } from 'lucide-react';
import SearchBar from './SearchBar';

const TrendingPanel = () => {
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTrends = async () => {
      try {
        setLoading(true);
        const response = await axios.get('http://localhost:8000/trending');
        
        // Process data from the API
        if (Array.isArray(response.data)) {
          setTrends(response.data.map(trend => ({
            hashtag: trend.hashtag || trend._id,
            count: trend.count
          })));
        } else {
          setTrends([]);
        }
      } catch (err) {
        console.error('Error fetching trends:', err);
        setError('Failed to load trending topics');
      } finally {
        setLoading(false);
      }
    };

    fetchTrends();
    
    // Refresh trends every 5 minutes
    const interval = setInterval(fetchTrends, 300000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-gray-50 rounded-lg overflow-hidden">
      <div className="p-4">
        <SearchBar />
      </div>

      <div className="bg-gray-50 rounded-lg my-4">
        <div className="p-4 font-bold text-xl">Trends for you</div>
        
        {loading ? (
          <div className="p-4 flex justify-center items-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-twitter-blue"></div>
          </div>
        ) : error ? (
          <div className="p-4 text-center text-red-500">{error}</div>
        ) : trends.length === 0 ? (
          <div className="p-4 text-center text-gray-500">No trending topics available</div>
        ) : (
          <div>
            {trends.map((trend, index) => (
              <div key={index} className="px-4 py-3 hover:bg-gray-100 cursor-pointer transition">
                <div className="flex items-center text-xs text-gray-500">
                  <Hash size={12} className="mr-1" />
                  <span>Trending</span>
                </div>
                <div className="font-bold mt-1">#{trend.hashtag}</div>
                <div className="text-sm text-gray-500 mt-1">{trend.count} Tweets</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TrendingPanel;
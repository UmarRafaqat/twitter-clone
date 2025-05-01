import React from 'react';
import { trends } from '../../data/mockData';
import { Search } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';

const TrendingPanel: React.FC = () => {
  const { setSearchQuery } = useAppContext();

  const handleTrendClick = (hashtag: string) => {
    setSearchQuery(hashtag);
  };

  return (
    <div className="sticky top-0 pt-4">
      {/* Search Bar */}
      <div className="mb-4 relative">
        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
          <Search size={18} className="text-gray-500" />
        </div>
        <input
          type="text"
          placeholder="Search Twitter"
          className="w-full pl-10 pr-4 py-3 bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white"
        />
      </div>

      {/* Trending topics card */}
      <div className="bg-gray-50 rounded-xl mb-4">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-xl font-bold">Trends for you</h2>
        </div>
        <div>
          {trends.map((trend) => (
            <div 
              key={trend.id} 
              className="p-4 hover:bg-gray-100 transition-colors duration-200 cursor-pointer"
              onClick={() => handleTrendClick(trend.hashtag)}
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs text-gray-500">{trend.category} · Trending</p>
                  <p className="font-bold my-0.5">#{trend.hashtag}</p>
                  <p className="text-xs text-gray-500">{trend.tweetCount.toLocaleString()} Tweets</p>
                </div>
                <button className="rounded-full p-1 hover:bg-blue-50 hover:text-blue-500 transition-colors duration-200 text-gray-500">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="p-4 text-blue-500 hover:bg-gray-100 transition-colors duration-200 cursor-pointer rounded-b-xl">
          <span>Show more</span>
        </div>
      </div>

      {/* Who to follow card */}
      <div className="bg-gray-50 rounded-xl">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-xl font-bold">Who to follow</h2>
        </div>
        <div className="p-4 hover:bg-gray-100 transition-colors duration-200 cursor-pointer">
          <div className="flex items-center">
            <img
              src="https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150"
              alt="Suggested user"
              className="w-12 h-12 rounded-full mr-3"
            />
            <div className="flex-1 min-w-0">
              <p className="font-bold truncate">Robert Johnson</p>
              <p className="text-gray-500 truncate">@robertj</p>
            </div>
            <button className="bg-black text-white font-bold rounded-full py-1.5 px-4">
              Follow
            </button>
          </div>
        </div>
        <div className="p-4 hover:bg-gray-100 transition-colors duration-200 cursor-pointer">
          <div className="flex items-center">
            <img
              src="https://images.pexels.com/photos/1036623/pexels-photo-1036623.jpeg?auto=compress&cs=tinysrgb&w=150"
              alt="Suggested user"
              className="w-12 h-12 rounded-full mr-3"
            />
            <div className="flex-1 min-w-0">
              <p className="font-bold truncate">Sarah Miller</p>
              <p className="text-gray-500 truncate">@sarahm</p>
            </div>
            <button className="bg-black text-white font-bold rounded-full py-1.5 px-4">
              Follow
            </button>
          </div>
        </div>
        <div className="p-4 text-blue-500 hover:bg-gray-100 transition-colors duration-200 cursor-pointer rounded-b-xl">
          <span>Show more</span>
        </div>
      </div>

      {/* Footer links */}
      <div className="mt-4 px-4 text-xs text-gray-500">
        <div className="flex flex-wrap">
          <a href="#" className="mr-3 mb-1 hover:underline">Terms of Service</a>
          <a href="#" className="mr-3 mb-1 hover:underline">Privacy Policy</a>
          <a href="#" className="mr-3 mb-1 hover:underline">Cookie Policy</a>
          <a href="#" className="mr-3 mb-1 hover:underline">Accessibility</a>
          <a href="#" className="mr-3 mb-1 hover:underline">Ads info</a>
          <a href="#" className="mb-1 hover:underline">More</a>
        </div>
        <p className="mt-1">© 2025 Twitter, Inc.</p>
      </div>
    </div>
  );
};

export default TrendingPanel;
import React from 'react';
import { Search } from 'lucide-react';

const ExplorePage: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen">
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200">
        <div className="px-4 py-3">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search Twitter"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-full bg-gray-100 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      <div className="flex-1 p-4">
        <div className="space-y-4">
          <h2 className="text-xl font-bold">Trends for you</h2>
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-sm text-gray-500">No trends available</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExplorePage;
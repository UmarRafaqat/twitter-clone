// frontend/src/components/MainLayout.js
import React from 'react';
import Sidebar from './Sidebar';
import TrendingPanel from './TrendingPanel';

const MainLayout = ({ children }) => {
  return (
    <div className="flex min-h-screen bg-white">
      {/* Left sidebar */}
      <div className="w-64 flex-shrink-0 fixed h-full border-r border-gray-200">
        <Sidebar />
      </div>
      
      {/* Main content */}
      <div className="ml-64 flex-grow">
        <div className="max-w-6xl mx-auto flex">
          {/* Center column - Timeline or other content */}
          <div className="flex-grow max-w-xl border-x border-gray-200">
            {children}
          </div>
          
          {/* Right sidebar - Trending */}
          <div className="w-80 ml-8 hidden lg:block">
            <TrendingPanel />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MainLayout;
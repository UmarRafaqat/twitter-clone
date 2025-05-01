import React from 'react';
import Sidebar from './Sidebar';
import Feed from '../Feed/Feed';
import TrendingPanel from '../Trending/TrendingPanel';
import { AppProvider } from '../../context/AppContext';

const MainLayout: React.FC = () => {
  return (
    <AppProvider>
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto flex">
          {/* Sidebar - hidden on mobile, visible on md and up */}
          <div className="hidden md:block md:w-1/4 lg:w-1/5 p-4">
            <Sidebar />
          </div>
          
          {/* Main content */}
          <div className="w-full md:w-2/4 lg:w-3/5 border-x border-gray-200 bg-white min-h-screen">
            <Feed />
          </div>
          
          {/* Trending panel - hidden on mobile and md, visible on lg and up */}
          <div className="hidden lg:block lg:w-1/5 p-4">
            <TrendingPanel />
          </div>
          
          {/* Mobile bottom navigation - visible only on mobile */}
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-2 flex justify-around md:hidden">
            <button className="p-2 text-blue-500">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-home"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            </button>
            <button className="p-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-search"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            </button>
            <button className="p-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-bell"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
            </button>
            <button className="p-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-mail"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
            </button>
          </div>
        </div>
      </div>
    </AppProvider>
  );
};

export default MainLayout;
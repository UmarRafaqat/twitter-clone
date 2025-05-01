import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Home, Search, Bell, User, Settings, LogOut, BarChart2 } from 'lucide-react';

const Sidebar: React.FC = () => {
  const { currentUser, setActiveTimeline, activeTimeline, logout } = useAppContext();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const menuItems = [
    { icon: Home, text: 'Home', timeline: 'home' as const },
    { icon: Search, text: 'Explore', timeline: 'explore' as const },
    { icon: Bell, text: 'Notifications', timeline: 'notifications' as const },
    { icon: BarChart2, text: 'Analytics', timeline: 'analytics' as const },
  ];

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <div className="flex flex-col h-screen sticky top-0 pr-4">
      <div className="mb-4 pt-2">
        <div className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-blue-50 transition-colors duration-200">
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1DA1F2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-twitter"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"/></svg>
        </div>
      </div>

      <nav className="mb-8">
        <ul className="space-y-1">
          {menuItems.map((item) => (
            <li key={item.text}>
              <button
                onClick={() => setActiveTimeline(item.timeline)}
                className={`flex items-center p-3 rounded-full transition-colors duration-200 hover:bg-gray-100 hover:text-blue-500 ${
                  activeTimeline === item.timeline ? 'font-bold text-blue-500' : ''
                }`}
              >
                <item.icon size={24} className="mr-4" />
                <span className="text-xl">{item.text}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <button className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-8 rounded-full transition-colors duration-200 w-full">
        Tweet
      </button>

      {currentUser && (
        <div className="mt-auto mb-4 relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="w-full flex items-center p-3 rounded-full hover:bg-gray-100 transition-colors duration-200"
          >
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              className="w-10 h-10 rounded-full mr-3"
            />
            <div className="flex-1 overflow-hidden text-left">
              <p className="font-bold truncate">{currentUser.name}</p>
              <p className="text-gray-500 truncate">@{currentUser.username}</p>
            </div>
            <Settings size={16} className="text-gray-600" />
          </button>

          {showProfileMenu && (
            <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              <button
                onClick={() => {
                  setActiveTimeline('profile');
                  setShowProfileMenu(false);
                }}
                className="w-full flex items-center px-4 py-3 hover:bg-gray-50 text-left"
              >
                <User size={18} className="mr-3" />
                <span>Profile</span>
              </button>
              <button
                onClick={handleLogout}
                className="w-full flex items-center px-4 py-3 hover:bg-gray-50 text-left text-red-600 border-t border-gray-100"
              >
                <LogOut size={18} className="mr-3" />
                <span>Log out</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Sidebar;
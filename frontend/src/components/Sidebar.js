import React, { useContext, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import UserAvatar from './UserAvatar';
import { 
  HomeIcon, 
  UserIcon, 
  LogOutIcon, 
  LogInIcon, 
  UserPlusIcon,
  CompassIcon,
  DatabaseIcon,
  HashIcon
} from 'lucide-react';

const Sidebar = () => {
  const { currentUser, isAuthenticated, logout } = useContext(AuthContext);
  const location = useLocation();
  const [expanded, setExpanded] = useState(false);
  
  // Navigation items
  const navItems = [
    {
      name: 'Home',
      path: '/',
      icon: <HomeIcon size={24} />,
      showWhen: 'always'
    },
    {
      name: 'Discover',
      path: '/discover',
      icon: <CompassIcon size={24} />,
      showWhen: 'authenticated'
    },
    {
      name: 'Profile',
      path: '/profile',
      icon: <UserIcon size={24} />,
      showWhen: 'authenticated'
    },
    {
      name: 'DB Explorer',
      path: '/db-explorer',
      icon: <DatabaseIcon size={24} />,
      showWhen: 'authenticated'
    },
    {
      name: 'Login',
      path: '/login',
      icon: <LogInIcon size={24} />,
      showWhen: 'unauthenticated'
    },
    {
      name: 'Register',
      path: '/register',
      icon: <UserPlusIcon size={24} />,
      showWhen: 'unauthenticated'
    }
  ];
  
  // Filter navigation items based on auth status
  const filteredNavItems = navItems.filter(item => {
    if (item.showWhen === 'always') return true;
    if (item.showWhen === 'authenticated' && isAuthenticated) return true;
    if (item.showWhen === 'unauthenticated' && !isAuthenticated) return true;
    return false;
  });
  
  const handleLogout = () => {
    logout();
  };
  
  return (
    <>
     {/* Logo */}
<div className="px-4">
  <Link to="/" className="flex items-center">
    <div className="p-2">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="#1DA1F2"
      >
        <path d="M23.954 4.569c-.885.392-1.83.656-2.825.775 
          1.014-.611 1.794-1.574 2.163-2.723-.949.564-2.005.974-3.127 
          1.195-.897-.959-2.178-1.555-3.594-1.555-2.723 
          0-4.928 2.205-4.928 4.928 0 .39.045.765.127 
          1.124C7.69 8.094 4.066 6.13 1.64 
          3.161c-.427.722-.666 1.561-.666 
          2.475 0 1.71.87 3.213 2.188 
          4.096-.807-.026-1.566-.248-2.229-.616v.061c0 
          2.385 1.693 4.374 3.946 4.827-.413.111-.849.171-1.296.171-.317 
          0-.626-.03-.928-.086.631 1.953 2.445 
          3.377 4.6 3.418-1.68 1.319-3.809 
          2.105-6.102 2.105-.396 0-.788-.023-1.175-.067 
          2.179 1.397 4.768 2.212 7.557 
          2.212 9.054 0 14.002-7.496 
          14.002-13.986 0-.21 0-.423-.015-.634.962-.689 
          1.8-1.56 2.46-2.548l-.047-.02z" />
       </svg>
     </div>
   </Link>
  </div>

      
      {/* Navigation */}
      <nav className="mt-6 flex-grow">
        <ul>
          {filteredNavItems.map((item, index) => (
            <li key={index} className="mb-1">
              <Link
                to={item.path}
                className={`flex items-center px-4 py-3 rounded-full transition ${
                  location.pathname === item.path 
                    ? 'font-bold text-twitter-blue' 
                    : 'hover:bg-gray-200'
                }`}
                title={item.name}
              >
                <div className="flex items-center justify-center">
                  {item.icon}
                </div>
                <span className="ml-4 hidden lg:block">{item.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      
      {/* User info */}
      {isAuthenticated && (
        <div className="mt-auto mb-6 px-4">
          <div className="flex items-center">
            <UserAvatar 
    username={currentUser.username}
    imageUrl={currentUser.profile_image_url}
    size="md"
    />
            <div className="ml-3 hidden lg:block">
              <div className="font-bold">{currentUser.username}</div>
              <div className="text-gray-500 text-sm">@{currentUser.username.toLowerCase()}</div>
            </div>
          </div>
          
          <button
            onClick={handleLogout}
            className="mt-4 flex items-center text-red-500 hover:text-red-600 transition"
          >
            <LogOutIcon size={24} />
            <span className="ml-3 hidden lg:block">Logout</span>
          </button>
        </div>
      )}
    </>
  );
};

export default Sidebar;
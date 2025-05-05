import React, { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Home, Hash, Bell, Mail, User, Settings, LogOut } from 'lucide-react';
import { AuthContext } from '../contexts/AuthContext';

const Sidebar = () => {
  const { logout, isAuthenticated } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="w-64 p-4 h-screen bg-white border-r border-gray-200">
      <div className="flex items-center justify-center mb-8">
        <svg viewBox="0 0 24 24" className="h-8 w-8 text-twitter-blue">
          <g>
            <path
              fill="currentColor"
              d="M23.643 4.937c-.835.37-1.732.62-2.675.733.962-.576 1.7-1.49 2.048-2.578-.9.534-1.897.922-2.958 1.13-.85-.904-2.06-1.47-3.4-1.47-2.572 0-4.658 2.086-4.658 4.66 0 .364.042.718.12 1.06-3.873-.195-7.304-2.05-9.602-4.868-.4.69-.63 1.49-.63 2.342 0 1.616.823 3.043 2.072 3.878-.764-.025-1.482-.234-2.11-.583v.06c0 2.257 1.605 4.14 3.737 4.568-.392.106-.803.162-1.227.162-.3 0-.593-.028-.877-.082.593 1.85 2.313 3.198 4.352 3.234-1.595 1.25-3.604 1.995-5.786 1.995-.376 0-.747-.022-1.112-.065 2.062 1.323 4.51 2.093 7.14 2.093 8.57 0 13.255-7.098 13.255-13.254 0-.2-.005-.402-.014-.602.91-.658 1.7-1.477 2.323-2.41z"
            ></path>
          </g>
        </svg>
      </div>

      <nav>
        <ul className="space-y-2">
          <li>
            <Link
              to="/"
              className="flex items-center p-2 rounded-full hover:bg-gray-100 text-lg text-gray-800 hover:text-twitter-blue"
            >
              <Home className="mr-4" />
              <span>Home</span>
            </Link>
          </li>
          <li>
            <Link
              to="/explore"
              className="flex items-center p-2 rounded-full hover:bg-gray-100 text-lg text-gray-800 hover:text-twitter-blue"
            >
              <Hash className="mr-4" />
              <span>Explore</span>
            </Link>
          </li>
          <li>
            <Link
              to="/notifications"
              className="flex items-center p-2 rounded-full hover:bg-gray-100 text-lg text-gray-800 hover:text-twitter-blue"
            >
              <Bell className="mr-4" />
              <span>Notifications</span>
            </Link>
          </li>
          <li>
            <Link
              to="/messages"
              className="flex items-center p-2 rounded-full hover:bg-gray-100 text-lg text-gray-800 hover:text-twitter-blue"
            >
              <Mail className="mr-4" />
              <span>Messages</span>
            </Link>
          </li>
          <li>
            <Link
              to="/profile"
              className="flex items-center p-2 rounded-full hover:bg-gray-100 text-lg text-gray-800 hover:text-twitter-blue"
            >
              <User className="mr-4" />
              <span>Profile</span>
            </Link>
          </li>
          <li>
            <Link
              to="/settings"
              className="flex items-center p-2 rounded-full hover:bg-gray-100 text-lg text-gray-800 hover:text-twitter-blue"
            >
              <Settings className="mr-4" />
              <span>Settings</span>
            </Link>
          </li>
          {isAuthenticated && (
            <li>
              <button
                onClick={handleLogout}
                className="flex items-center p-2 rounded-full hover:bg-gray-100 text-lg text-gray-800 hover:text-twitter-blue w-full text-left"
              >
                <LogOut className="mr-4" />
                <span>Logout</span>
              </button>
            </li>
          )}
        </ul>
      </nav>

      {isAuthenticated ? (
        <button className="mt-8 bg-twitter-blue hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-full w-full">
          Tweet
        </button>
      ) : (
        <Link
          to="/login"
          className="mt-8 bg-twitter-blue hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-full w-full block text-center"
        >
          Sign in
        </Link>
      )}
    </div>
  );
};

export default Sidebar;

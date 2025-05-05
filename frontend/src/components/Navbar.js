import React, { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, LogOut } from 'lucide-react';
import { AuthContext } from '../contexts/AuthContext';

const Navbar = () => {
  const { currentUser, logout, isAuthenticated } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
        <Link to="/" className="text-2xl font-bold text-blue-500">Mini-Twitter</Link>
        
        <div className="flex items-center space-x-4">
          {isAuthenticated ? (
            <>
              <span className="text-gray-600">Hello, {currentUser?.username || 'User'}</span>
              <button 
                className="p-2 text-gray-600 hover:text-blue-500"
                onClick={() => navigate('/profile')}
              >
                <User className="w-5 h-5" />
              </button>
              <button 
                className="p-2 text-gray-600 hover:text-blue-500"
                onClick={handleLogout}
              >
                <LogOut className="w-5 h-5" />
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-blue-500 hover:text-blue-700">Login</Link>
              <Link to="/register" className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600">
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AuthContext, AuthProvider } from './contexts/AuthContext';
import Sidebar from './components/Sidebar';
import TrendingPanel from './components/TrendingPanel';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import DbExplorer from './pages/DbExplorer';
import Discover from './pages/Discover';

// Conditional right sidebar with trending panel
const ConditionalTrending = () => {
  const location = useLocation();
  const { isAuthenticated } = useContext(AuthContext);
  
  // Hide the trending panel on login/register pages
  // Also hide on home page if not authenticated
  if (
    location.pathname === '/login' || 
    location.pathname === '/register' || 
    (location.pathname === '/' && !isAuthenticated)
  ) {
    return null;
  }
  
  return (
    <div className="hidden lg:block w-80 min-h-screen">
      <div className="fixed w-80 p-4">
        <TrendingPanel />
      </div>
    </div>
  );
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="min-h-screen bg-white">
          <div className="container mx-auto flex">
            {/* Sidebar - with the requested classes */}
            <div className="w-16 lg:w-64 border-r border-gray-200 fixed h-full flex flex-col justify-between pt-4">
              <Sidebar />
            </div>

            {/* Main content */}
            <div className="flex-1 ml-16 lg:ml-64 flex">
              <div className="flex-1 max-w-xl border-x border-gray-200 min-h-screen">
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/discover" element={
                    <ProtectedRoute>
                      <Discover />
                    </ProtectedRoute>
                  } />
                  <Route path="/profile" element={
                    <ProtectedRoute>
                      <Profile />
                    </ProtectedRoute>
                  } />
                  <Route path="/db-explorer" element={
                    <ProtectedRoute>
                      <DbExplorer />
                    </ProtectedRoute>
                  } />
                </Routes>
              </div>

              {/* Right sidebar with trending - conditionally rendered */}
              <Routes>
                <Route path="*" element={<ConditionalTrending />} />
              </Routes>
            </div>
          </div>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Sidebar from './components/Sidebar';
import TrendingPanel from './components/TrendingPanel';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import DbExplorer from './pages/DbExplorer';

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="min-h-screen bg-white">
          <div className="container mx-auto flex">
            {/* Sidebar */}
            <div className="w-64 fixed h-screen">
              <Sidebar />
            </div>

            {/* Main content */}
            <div className="flex-1 ml-64 flex">
              <div className="flex-1 max-w-xl border-x border-gray-200 min-h-screen">
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
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

              {/* Right sidebar */}
              <div className="hidden lg:block w-80 min-h-screen">
                <div className="fixed w-80 p-4">
                  <TrendingPanel />
                </div>
              </div>
            </div>
          </div>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;

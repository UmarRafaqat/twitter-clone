import React from 'react';
import { BarChart3, TrendingUp, Users, MessageSquare } from 'lucide-react';

const AnalyticsDashboard: React.FC = () => {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Analytics Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-700">Total Tweets</h3>
            <MessageSquare className="text-blue-500 w-6 h-6" />
          </div>
          <p className="text-3xl font-bold">1,234</p>
          <p className="text-sm text-green-600 mt-2">+12% from last month</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-700">Followers</h3>
            <Users className="text-purple-500 w-6 h-6" />
          </div>
          <p className="text-3xl font-bold">5,678</p>
          <p className="text-sm text-green-600 mt-2">+8% from last month</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-700">Engagement Rate</h3>
            <TrendingUp className="text-green-500 w-6 h-6" />
          </div>
          <p className="text-3xl font-bold">4.2%</p>
          <p className="text-sm text-red-600 mt-2">-2% from last month</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-700">Impressions</h3>
            <BarChart3 className="text-orange-500 w-6 h-6" />
          </div>
          <p className="text-3xl font-bold">25.4K</p>
          <p className="text-sm text-green-600 mt-2">+15% from last month</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-6">Engagement Overview</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Likes</span>
            <div className="w-2/3">
              <div className="h-4 bg-gray-200 rounded-full">
                <div className="h-4 bg-blue-500 rounded-full" style={{ width: '75%' }}></div>
              </div>
            </div>
            <span className="text-gray-900 font-semibold">75%</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-gray-600">Retweets</span>
            <div className="w-2/3">
              <div className="h-4 bg-gray-200 rounded-full">
                <div className="h-4 bg-green-500 rounded-full" style={{ width: '45%' }}></div>
              </div>
            </div>
            <span className="text-gray-900 font-semibold">45%</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-gray-600">Replies</span>
            <div className="w-2/3">
              <div className="h-4 bg-gray-200 rounded-full">
                <div className="h-4 bg-purple-500 rounded-full" style={{ width: '30%' }}></div>
              </div>
            </div>
            <span className="text-gray-900 font-semibold">30%</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
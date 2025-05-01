import React from 'react';
import FeedHeader from '../Feed/FeedHeader';

const NotificationsPage: React.FC = () => {
  return (
    <div className="flex flex-col">
      <FeedHeader title="Notifications" />
      <div className="p-4">
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
          <h3 className="text-xl font-bold text-gray-800 mb-2">
            No notifications yet
          </h3>
          <p className="text-gray-600">
            When you receive notifications, they'll show up here
          </p>
        </div>
      </div>
    </div>
  );
};

export default NotificationsPage;
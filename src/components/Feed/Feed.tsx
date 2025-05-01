import React from 'react';
import { useAppContext } from '../../context/AppContext';
import TweetComposer from './TweetComposer';
import TweetItem from './TweetItem';
import FeedHeader from './FeedHeader';
import ExplorePage from '../Explore/ExplorePage';
import NotificationsPage from '../Notifications/NotificationsPage';
import ProfilePage from '../Profile/ProfilePage';
import AnalyticsDashboard from '../Analytics/AnalyticsDashboard';

const Feed: React.FC = () => {
  const { tweets, activeTimeline, searchQuery } = useAppContext();

  // Filter tweets based on search query
  const filteredTweets = searchQuery
    ? tweets.filter(
        tweet =>
          tweet.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
          tweet.hashtags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : tweets;

  // Render the appropriate component based on the active timeline
  const renderTimeline = () => {
    switch (activeTimeline) {
      case 'explore':
        return <ExplorePage />;
      case 'notifications':
        return <NotificationsPage />;
      case 'profile':
        return <ProfilePage />;
      case 'analytics':
        return <AnalyticsDashboard />;
      default:
        return (
          <>
            <FeedHeader title="Home" />
            <TweetComposer />
            <div className="divide-y divide-gray-200">
              {filteredTweets.map(tweet => (
                <TweetItem key={tweet.id} tweet={tweet} />
              ))}
              
              {filteredTweets.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                  <h3 className="text-xl font-bold text-gray-800 mb-2">
                    {searchQuery ? 'No results found' : 'No tweets to display'}
                  </h3>
                  <p className="text-gray-600">
                    {searchQuery
                      ? `There were no results for "${searchQuery}"`
                      : 'Follow more people to see tweets in your timeline'}
                  </p>
                </div>
              )}
            </div>
          </>
        );
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      {renderTimeline()}
    </div>
  );
};

export default Feed;
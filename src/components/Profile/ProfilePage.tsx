import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Camera, Calendar } from 'lucide-react';

const ProfilePage: React.FC = () => {
  const { currentUser, tweets } = useAppContext();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(currentUser?.name || '');
  const [bio, setBio] = useState(currentUser?.bio || '');
  const [location, setLocation] = useState(currentUser?.location || '');
  const [website, setWebsite] = useState(currentUser?.website || '');
  
  // Filter tweets to only show the current user's tweets
  const userTweets = tweets.filter(tweet => tweet.authorId === currentUser?.id);

  const handleSaveProfile = async () => {
    try {
      // TODO: Implement profile update logic
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  const joinDate = currentUser?.createdAt 
    ? new Date(currentUser.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : 'January 2025';

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Profile Header */}
      <div className="sticky top-0 z-10 bg-white bg-opacity-90 backdrop-blur-sm border-b border-gray-200 px-4 py-3">
        <h1 className="text-xl font-bold">Profile</h1>
      </div>

      {/* Cover Photo */}
      <div className="relative">
        <div className="h-48 w-full bg-blue-500">
          {isEditing && (
            <button className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 opacity-0 hover:opacity-100 transition-opacity">
              <Camera className="text-white" size={24} />
            </button>
          )}
        </div>
        
        {/* Profile Picture */}
        <div className="absolute left-4 -bottom-16">
          <div className="relative group">
            <img
              src={currentUser?.avatar || "https://images.pexels.com/photos/771742/pexels-photo-771742.jpeg"}
              alt="Profile"
              className="h-32 w-32 rounded-full border-4 border-white object-cover"
            />
            {isEditing && (
              <button className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="text-white" size={24} />
              </button>
            )}
          </div>
        </div>

        {/* Edit Profile Button */}
        <div className="flex justify-end px-4 py-3">
          {isEditing ? (
            <div className="space-x-3">
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 border border-gray-300 rounded-full font-semibold text-gray-800 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveProfile}
                className="px-4 py-2 bg-black text-white rounded-full font-semibold hover:bg-gray-800 transition-colors"
              >
                Save
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 border border-gray-300 rounded-full font-semibold text-gray-800 hover:bg-gray-50 transition-colors"
            >
              Edit profile
            </button>
          )}
        </div>
      </div>

      {/* Profile Info */}
      <div className="px-4 pt-20 pb-4">
        {isEditing ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={50}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="Your name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={160}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="Describe yourself"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                maxLength={30}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="Where are you based?"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
              <input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="https://example.com"
              />
            </div>
          </div>
        ) : (
          <div>
            <h2 className="text-xl font-bold">{currentUser?.name}</h2>
            <p className="text-gray-600">@{currentUser?.username}</p>
            {bio && <p className="mt-3 text-gray-800">{bio}</p>}
            
            <div className="flex flex-wrap gap-x-4 mt-3 text-gray-600">
              {location && (
                <span className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                  {location}
                </span>
              )}
              {website && (
                <a href={website} target="_blank" rel="noopener noreferrer" className="flex items-center text-blue-500 hover:underline">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><circle cx="12" cy="12" r="10"/><line x1="2" x2="22" y1="12" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                  {website.replace(/^https?:\/\//, '')}
                </a>
              )}
              <span className="flex items-center">
                <Calendar size={16} className="mr-1" />
                Joined {joinDate}
              </span>
            </div>

            <div className="flex gap-x-6 mt-3">
              <button className="hover:underline">
                <span className="font-bold">{currentUser?.followingCount || 0}</span>
                <span className="text-gray-600 ml-1">Following</span>
              </button>
              <button className="hover:underline">
                <span className="font-bold">{currentUser?.followersCount || 0}</span>
                <span className="text-gray-600 ml-1">Followers</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mt-4">
        <div className="flex">
          <button className="flex-1 py-4 text-center border-b-2 border-blue-500 font-semibold text-blue-500">
            Tweets
          </button>
          <button className="flex-1 py-4 text-center text-gray-500 hover:bg-gray-50 transition-colors">
            Replies
          </button>
          <button className="flex-1 py-4 text-center text-gray-500 hover:bg-gray-50 transition-colors">
            Media
          </button>
          <button className="flex-1 py-4 text-center text-gray-500 hover:bg-gray-50 transition-colors">
            Likes
          </button>
        </div>
      </div>

      {/* Tweets */}
      <div className="divide-y divide-gray-200 bg-white">
        {userTweets.map(tweet => (
          <div key={tweet.id} className="p-4 hover:bg-gray-50 transition-colors">
            <p className="text-gray-900">{tweet.content}</p>
            {tweet.hashtags && tweet.hashtags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {tweet.hashtags.map(tag => (
                  <span key={tag} className="text-blue-500 hover:underline cursor-pointer">
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}

        {userTweets.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-gray-600">No tweets yet</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;
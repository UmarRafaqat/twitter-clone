import React, { useState, useEffect, useContext, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Calendar, MapPin, Link as LinkIcon, Camera } from 'lucide-react';
import Tweet from '../components/Tweet';
import FollowButton from '../components/FollowButton';
import { AuthContext } from '../contexts/AuthContext';
import moment from 'moment';
import axios from 'axios';

const API_URL = 'http://localhost:8000';

// Avatar component with improved handling
const ProfileAvatar = ({ user, size = "2xl", className = "", onClick = null }) => {
  const [imageSrc, setImageSrc] = useState('');
  const [hasError, setHasError] = useState(false);
  
  useEffect(() => {
    if (user?.profile_image_url) {
      // Add cache-busting parameter to force fresh image
      setImageSrc(`${user.profile_image_url}${user.profile_image_url.includes('?') ? '&' : '?'}t=${Date.now()}`);
      setHasError(false);
    }
  }, [user]);
  
  // Set size classes
  const sizeClasses = {
    'sm': 'h-8 w-8',
    'md': 'h-10 w-10',
    'lg': 'h-12 w-12',
    'xl': 'h-16 w-16',
    '2xl': 'h-24 w-24',
  }[size] || 'h-24 w-24';
  
  if (!user) return null;
  
  if (!imageSrc || hasError) {
    return (
      <div 
        className={`${sizeClasses} rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-bold text-4xl ${className} ${onClick ? 'cursor-pointer' : ''}`}
        onClick={onClick}
      >
        {user.username?.[0]?.toUpperCase()}
      </div>
    );
  }
  
  return (
    <img
      src={imageSrc}
      alt={user.username || "User"}
      className={`${sizeClasses} rounded-full object-cover ${className} ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
      onError={(e) => {
        e.target.onerror = null;
        setHasError(true);
      }}
    />
  );
};

const Profile = () => {
  const navigate = useNavigate();
  const authContext = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('tweets');
  const [tweets, setTweets] = useState([]);
  const [replies, setReplies] = useState([]);
  const [mediaContent, setMediaContent] = useState([]);
  const [likedTweets, setLikedTweets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({ bio: '' });
  const [updateError, setUpdateError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [profileImage, setProfileImage] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const fileInputRef = useRef(null);
  const [dbError, setDbError] = useState(null);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isOwnProfile, setIsOwnProfile] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [profileUserId, setProfileUserId] = useState(null);

  // Safe access to currentUser and logout
  const currentUser = authContext?.currentUser;
  const logout = authContext?.logout;
  const updateUser = authContext?.updateUser;

  // Initialize form data from current user and fetch follow counts
  useEffect(() => {
    if (currentUser) {
      setFormData({
        bio: currentUser.bio || '',
      });
      
      // Set profile image if it exists
      if (currentUser.profile_image_url) {
        setPreviewImage(currentUser.profile_image_url);
      }

      // Set profile user ID to current user's ID by default (own profile)
      setProfileUserId(currentUser.id);
      setIsOwnProfile(true);

      // Fetch followers and following counts
      fetchFollowCounts(currentUser.id);
    }
  }, [currentUser]);

  // Function to fetch followers and following counts
  const fetchFollowCounts = async (userId) => {
    if (!userId || !currentUser?.access_token) return;

    try {
      const headers = {
        'Authorization': `Bearer ${currentUser.access_token}`
      };

      // Fetch followers count
      const followersResponse = await axios.get(
        `${API_URL}/users/${userId}/followers/count`,
        { headers }
      );
      
      // Fetch following count
      const followingResponse = await axios.get(
        `${API_URL}/users/${userId}/following/count`,
        { headers }
      );

      setFollowersCount(followersResponse.data.count);
      setFollowingCount(followingResponse.data.count);

      // Check if current user is following this profile (if not own profile)
      if (userId !== currentUser.id) {
        try {
          const followStatusResponse = await axios.get(
            `${API_URL}/users/${userId}/follow-status`,
            { headers }
          );
          setIsFollowing(followStatusResponse.data.is_following);
        } catch (error) {
          // If endpoint doesn't exist, default to false
          setIsFollowing(false);
        }
      }
    } catch (error) {
      console.error('Error fetching follow counts:', error);
    }
  };

  // Fetch user content based on active tab
  useEffect(() => {
    const fetchUserContent = async () => {
      try {
        setLoading(true);
        if (!currentUser?.id || !currentUser?.access_token) {
          setLoading(false);
          return;
        }

        const headers = {
          'Authorization': `Bearer ${currentUser.access_token}`
        };

        // Fetch appropriate content based on active tab
        if (activeTab === 'tweets') {
          const response = await axios.get(
            `${API_URL}/tweets?user_id=${currentUser.id}`,
            { headers }
          );
          setTweets(response.data || []);
        } else if (activeTab === 'replies') {
          // This would ideally be a specific endpoint for replies
          // For now we'll simulate by getting all tweets and filtering
          const response = await axios.get(
            `${API_URL}/tweets?user_id=${currentUser.id}`,
            { headers }
          );
          const userReplies = (response.data || []).filter(tweet => tweet.in_reply_to);
          setReplies(userReplies);
        } else if (activeTab === 'media') {
          // Get tweets with media
          const response = await axios.get(
            `${API_URL}/tweets?user_id=${currentUser.id}`,
            { headers }
          );
          const mediaTweets = (response.data || []).filter(tweet => 
            tweet.media_urls && tweet.media_urls.length > 0
          );
          setMediaContent(mediaTweets);
        } else if (activeTab === 'likes') {
          // This would ideally be a specific endpoint for liked tweets
          // For now, we'll set an empty array as the API doesn't support it yet
          setLikedTweets([]);
        }
      } catch (err) {
        // Handle authentication errors
        if (err.response?.status === 401) {
          setError('Your session has expired. Please log in again.');
          setTimeout(() => {
            if (logout) logout();
            navigate('/login');
          }, 2000);
        } else {
          setError(`Failed to load ${activeTab}`);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUserContent();
  }, [currentUser, logout, navigate, activeTab]);

  // Handle image selection
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setUpdateError('Only image files are allowed');
        return;
      }
      
      // Validate file size (limit to 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setUpdateError('Image size must be less than 5MB');
        return;
      }
      
      setProfileImage(file);
      setUpdateError('');
      
      // Create a preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Trigger file input click
  const triggerFileInput = () => {
    fileInputRef.current.click();
  };

  // Broadcast user profile updates to all components
  const broadcastUserUpdate = (userData) => {
    const event = new CustomEvent('user-updated', { detail: userData });
    window.dispatchEvent(event);
  };

  // Manual update of user data without using updateUser function
  const manualUpdateUserData = (updatedData) => {
    try {
      // Get current user data from localStorage
      const userStr = localStorage.getItem('user');
      if (!userStr) {
        console.error("No user data found in localStorage");
        return false;
      }
      
      // Parse the existing user data
      const userData = JSON.parse(userStr);
      
      // Merge the existing user data with the updated data
      const mergedData = {
        ...userData,
        ...updatedData,
        // Ensure critical fields are preserved
        id: userData.id,
        username: userData.username,
        email: userData.email,
        access_token: userData.access_token,
        created_at: userData.created_at
      };
      
      // Add cache busting to profile image URL if it exists
      if (mergedData.profile_image_url) {
        mergedData.profile_image_url = `${mergedData.profile_image_url}${
          mergedData.profile_image_url.includes('?') ? '&' : '?'
        }t=${Date.now()}`;
      }
      
      // Save the updated data back to localStorage
      localStorage.setItem('user', JSON.stringify(mergedData));
      
      // Broadcast the update to all listening components
      broadcastUserUpdate(mergedData);
      
      // Reload the page to apply the changes
      window.location.reload();
      
      return true;
    } catch (error) {
      console.error("Error in manualUpdateUserData:", error);
      return false;
    }
  };

  // Handle profile update - only update the bio field
  const handleProfileUpdate = async () => {
    setUpdateError('');
    setDbError(null);
    
    // Verify authentication
    if (!currentUser || !currentUser.id || !currentUser.access_token) {
      setUpdateError('User authentication error. Please log in again.');
      setTimeout(() => {
        if (logout) logout();
        navigate('/login');
      }, 2000);
      return;
    }

    try {
      setIsSaving(true);
      
      // First, upload the image if it exists
      let profileImageUrl = currentUser.profile_image_url;
      
      if (profileImage) {
        const imageFormData = new FormData();
        imageFormData.append('file', profileImage);
        
        try {
          const imageResponse = await axios.post(
            `${API_URL}/upload/image`,
            imageFormData,
            {
              headers: {
                'Content-Type': 'multipart/form-data',
                'Authorization': `Bearer ${currentUser.access_token}`
              }
            }
          );
          
          if (imageResponse.data && imageResponse.data.url) {
            // Add cache busting parameter to force fresh image load
            profileImageUrl = `${imageResponse.data.url}?t=${Date.now()}`;
          }
        } catch (uploadErr) {
          // Check for authentication errors
          if (uploadErr.response?.status === 401) {
            setUpdateError('Your session has expired. Please log in again.');
            setTimeout(() => {
              if (logout) logout();
              navigate('/login');
            }, 2000);
            setIsSaving(false);
            return;
          }
          
          const errorMessage = uploadErr.response?.data?.detail || 'Failed to upload profile image';
          setUpdateError(errorMessage);
          setIsSaving(false);
          return;
        }
      }
      
      // Then update the user profile with only bio and profile image
      const updatedUserData = {
        bio: formData.bio,
        profile_image_url: profileImageUrl
      };
      
      // Make the API call to update the profile
      const response = await axios.put(
        `${API_URL}/users/${currentUser.id}`,
        updatedUserData,
        { 
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentUser.access_token}`
          } 
        }
      );
      
      if (response.data) {
        // Create a complete user object with all necessary fields
        const completeUserData = {
          ...currentUser,
          bio: response.data.bio,
          profile_image_url: response.data.profile_image_url,
          // Ensure the critical fields are preserved
          id: currentUser.id,
          username: currentUser.username,
          email: currentUser.email,
          access_token: currentUser.access_token,
          created_at: currentUser.created_at
        };
        
        // Broadcast the update to other components
        broadcastUserUpdate(completeUserData);
        
        // Try to update the user context using different methods
        let updateSuccess = false;
        if (typeof updateUser === 'function') {
          // Method 1: Use the context's updateUser function if it exists
          updateSuccess = updateUser(completeUserData);
          console.log("Context update result:", updateSuccess);
        }
        
        // If context update failed or wasn't available, fall back to manual update
        if (!updateSuccess) {
          console.log("Falling back to manual update");
          manualUpdateUserData(completeUserData);
        }
        
        // Close the modal and reset states
        setEditMode(false);
        setProfileImage(null);
        setUpdateError('');
      }
    } catch (err) {
      console.error("Profile update error:", err);
      
      // Handle specific database errors
      if (err.response?.status === 500 && err.response?.data?.detail?.includes("column")) {
        const errorMsg = err.response.data.detail;
        setDbError(errorMsg);
        setUpdateError(`Database error: ${errorMsg}`);
      } 
      // Handle authentication errors
      else if (err.response?.status === 401) {
        setUpdateError('Your session has expired. Please log in again.');
        setTimeout(() => {
          if (logout) logout();
          navigate('/login');
        }, 2000);
      } else {
        let errorMessage = 'Failed to update profile. Please try again.';
        
        if (err.response?.data?.detail) {
          errorMessage = err.response.data.detail;
        } else if (err.response?.data?.errors) {
          errorMessage = Array.isArray(err.response.data.errors) 
            ? err.response.data.errors.join(', ') 
            : err.response.data.errors;
        } else if (err.response?.data?.message) {
          errorMessage = err.response.data.message;
        }
        
        setUpdateError(errorMessage);
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Render content based on active tab
  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center p-8">
          <svg className="animate-spin h-8 w-8 text-twitter-blue" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      );
    }

    if (error) {
      return <div className="p-4 text-red-500 text-center">{error}</div>;
    }

    switch (activeTab) {
      case 'tweets':
        return tweets.length === 0 ? (
          <div className="p-8 text-center text-gray-500">You haven't posted any tweets yet.</div>
        ) : (
          <div>
            {tweets.map(tweet => (
              <Tweet key={tweet.id} tweet={tweet} />
            ))}
          </div>
        );
      
      case 'replies':
        return replies.length === 0 ? (
          <div className="p-8 text-center text-gray-500">You haven't replied to any tweets yet.</div>
        ) : (
          <div>
            {replies.map(reply => (
              <Tweet key={reply.id} tweet={reply} />
            ))}
          </div>
        );
      
      case 'media':
        return mediaContent.length === 0 ? (
          <div className="p-8 text-center text-gray-500">You haven't shared any media yet.</div>
        ) : (
          <div>
            {mediaContent.map(mediaTweet => (
              <Tweet key={mediaTweet.id} tweet={mediaTweet} />
            ))}
          </div>
        );
      
      case 'likes':
        return likedTweets.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p>You haven't liked any tweets yet.</p>
            <p className="mt-2 text-sm">When you do, they'll show up here.</p>
          </div>
        ) : (
          <div>
            {likedTweets.map(likedTweet => (
              <Tweet key={likedTweet.id} tweet={likedTweet} />
            ))}
          </div>
        );
      
      default:
        return (
          <div className="p-8 text-center text-gray-500">Select a tab to view content.</div>
        );
    }
  };

  if (!currentUser) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <p className="text-gray-600 mb-4">Please sign in to view your profile</p>
        <Link to="/login" className="bg-twitter-blue text-white px-4 py-2 rounded-full">
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="border-x border-gray-200 min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white bg-opacity-90 backdrop-blur-sm p-4 border-b border-gray-200">
        <div className="flex items-center">
          <Link to="/" className="mr-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
          </Link>
          <div>
            <h1 className="text-xl font-bold">{currentUser.username}</h1>
            <p className="text-gray-500 text-sm">
              {activeTab === 'tweets' ? tweets.length : 
               activeTab === 'replies' ? replies.length : 
               activeTab === 'media' ? mediaContent.length : 
               likedTweets.length} {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
            </p>
          </div>
        </div>
      </div>

      {/* Profile header */}
      <div className="relative">
        <div className="h-48 bg-twitter-blue"></div>
        <div className="absolute top-36 left-4">
          <div className="h-24 w-24 rounded-full bg-white p-1">
            <ProfileAvatar user={currentUser} size="2xl" />
          </div>
        </div>
        <div className="pt-16 px-4">
          <div className="flex justify-end">
            {isOwnProfile ? (
              <button
                className="border border-twitter-blue text-twitter-blue px-4 py-2 rounded-full font-bold hover:bg-blue-50"
                onClick={() => setEditMode(true)}
              >
                Edit profile
              </button>
            ) : (
              <FollowButton 
                userId={profileUserId} 
                initialIsFollowing={isFollowing}
                onFollowChange={(newFollowStatus) => {
                  setIsFollowing(newFollowStatus);
                  // Update followers count when follow status changes
                  setFollowersCount(prevCount => newFollowStatus ? prevCount + 1 : prevCount - 1);
                }}
              />
            )}
          </div>
          <h2 className="text-xl font-bold mt-4">{currentUser.username}</h2>
          <p className="text-gray-500">@{currentUser.username}</p>

          {currentUser.bio && <p className="mt-2">{currentUser.bio}</p>}

          <div className="flex items-center mt-2">
            <Calendar size={16} className="mr-1" />
            <span className="text-gray-500">Joined {moment(currentUser.created_at).format('MMMM YYYY')}</span>
          </div>
          
          {/* Followers & Following Information */}
          <div className="flex mt-3 text-gray-500">
            <Link to={`/users/${profileUserId}/following`} className="flex items-center mr-4 hover:underline">
              <span className="font-bold text-black">{followingCount}</span>
              <span className="ml-1">Following</span>
            </Link>
            <Link to={`/users/${profileUserId}/followers`} className="flex items-center hover:underline">
              <span className="font-bold text-black">{followersCount}</span>
              <span className="ml-1">Followers</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mt-4">
        <nav className="flex">
          <button 
            className={`flex-1 py-4 font-medium ${activeTab === 'tweets' ? 'text-twitter-blue font-bold border-b-2 border-twitter-blue' : 'text-gray-500 hover:bg-gray-50'}`}
            onClick={() => setActiveTab('tweets')}
          >
            Tweets
          </button>
          <button 
            className={`flex-1 py-4 font-medium ${activeTab === 'replies' ? 'text-twitter-blue font-bold border-b-2 border-twitter-blue' : 'text-gray-500 hover:bg-gray-50'}`}
            onClick={() => setActiveTab('replies')}
          >
            Replies
          </button>
          <button 
            className={`flex-1 py-4 font-medium ${activeTab === 'media' ? 'text-twitter-blue font-bold border-b-2 border-twitter-blue' : 'text-gray-500 hover:bg-gray-50'}`}
            onClick={() => setActiveTab('media')}
          >
            Media
          </button>
          <button 
            className={`flex-1 py-4 font-medium ${activeTab === 'likes' ? 'text-twitter-blue font-bold border-b-2 border-twitter-blue' : 'text-gray-500 hover:bg-gray-50'}`}
            onClick={() => setActiveTab('likes')}
          >
            Likes
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {renderContent()}

      {/* Edit Modal */}
      {editMode && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Edit Profile</h2>

            {dbError && (
              <div className="mb-4 p-2 bg-yellow-100 text-yellow-800 rounded-md">
                <p className="font-bold">Database Issue:</p>
                <p className="text-sm">{dbError}</p>
                <p className="text-sm mt-2">Only updating bio and profile picture.</p>
              </div>
            )}

            {updateError && (
              <div className="mb-4 p-2 bg-red-100 text-red-700 rounded-md">
                {updateError}
              </div>
            )}
            
            {/* Profile Image Upload */}
            <div className="mb-4 flex flex-col items-center">
              <div className="relative mb-3">
                {previewImage ? (
                  <img 
                    src={previewImage} 
                    alt="Profile Preview" 
                    className="h-24 w-24 rounded-full object-cover border-2 border-twitter-blue"
                  />
                ) : (
                  <div className="h-24 w-24 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-bold text-4xl border-2 border-twitter-blue">
                    {currentUser.username?.[0]?.toUpperCase()}
                  </div>
                )}
                <button 
                  onClick={triggerFileInput}
                  className="absolute bottom-0 right-0 bg-twitter-blue text-white p-2 rounded-full hover:bg-blue-600"
                  type="button"
                >
                  <Camera size={18} />
                </button>
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageChange}
                accept="image/*"
                className="hidden"
              />
              <button
                onClick={triggerFileInput}
                className="text-twitter-blue text-sm hover:underline"
                type="button"
              >
                Change profile photo
              </button>
            </div>

            <div className="mb-3">
              <label className="block text-sm text-gray-700 mb-1">Bio</label>
              <textarea
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-twitter-blue"
                rows={3}
                maxLength={160}
                placeholder="Add a bio about yourself"
              />
              <div className="text-xs text-gray-500 text-right">
                {formData.bio.length}/160
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <button
                className="px-4 py-2 border border-gray-300 rounded-md disabled:opacity-50 hover:bg-gray-50"
                onClick={() => {
                  setEditMode(false);
                  setPreviewImage(currentUser.profile_image_url || null);
                  setProfileImage(null);
                  setUpdateError('');
                  setDbError(null);
                }}
                disabled={isSaving}
                type="button"
              >
                Cancel
              </button>
              <button
                className="bg-twitter-blue text-white px-4 py-2 rounded-md disabled:opacity-50 hover:bg-blue-600"
                onClick={handleProfileUpdate}
                disabled={isSaving}
                type="button"
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


export default Profile;
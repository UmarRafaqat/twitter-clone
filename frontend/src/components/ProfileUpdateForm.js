// frontend/src/components/ProfileUpdateForm.js
import React, { useState, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { Camera } from 'lucide-react';
import axios from 'axios';

const ProfileUpdateForm = () => {
  const { currentUser, updateUserProfile } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    bio: currentUser?.bio || '',
    location: currentUser?.location || '',
    website: currentUser?.website || '',
    profile_image_url: currentUser?.profile_image_url || ''
  });
  
  // Image preview state
  const [imagePreview, setImagePreview] = useState(currentUser?.profile_image_url || null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Reset states
    setError(null);
    setUploadingImage(true);
    
    // Validate file
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      setUploadingImage(false);
      return;
    }
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
    
    // Upload image
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await axios.post(
        'http://localhost:8000/upload/image',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${currentUser.access_token}`
          }
        }
      );
      
      // Save the URL to form data
      if (response.data.url) {
        setFormData(prev => ({
          ...prev,
          profile_image_url: response.data.url
        }));
      } else if (response.data.error) {
        setError(response.data.error);
      }
    } catch (err) {
      setError('Failed to upload image: ' + (err.response?.data?.detail || err.message));
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);
    
    try {
      await updateUserProfile(formData);
      setSuccess(true);
      
      // Reset success message after 3 seconds
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch (err) {
      setError('Failed to update profile: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h2 className="text-xl font-bold mb-4">Edit Profile</h2>
      
      {error && (
        <div className="bg-red-100 text-red-700 p-3 rounded-md mb-4">
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-100 text-green-700 p-3 rounded-md mb-4">
          Profile updated successfully!
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        {/* Profile Image */}
        <div className="mb-4">
          <label className="block text-gray-700 mb-2">Profile Image</label>
          <div className="flex items-end">
            <div className="relative group cursor-pointer">
              <div className="h-24 w-24 rounded-full overflow-hidden border-2 border-gray-200">
                {imagePreview ? (
                  <img 
                    src={imagePreview} 
                    alt="Profile preview" 
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      setImagePreview(null);
                      setFormData(prev => ({
                        ...prev,
                        profile_image_url: ''
                      }));
                    }}
                  />
                ) : (
                  <div className="h-full w-full bg-gray-200 flex items-center justify-center text-gray-500 text-xl font-bold">
                    {currentUser.username?.[0]?.toUpperCase() || '?'}
                  </div>
                )}
              </div>
              
              <input 
                type="file" 
                className="hidden" 
                accept="image/*"
                onChange={handleImageUpload}
                id="profile-image-upload"
              />
              
              <label 
                htmlFor="profile-image-upload"
                className="absolute bottom-0 right-0 bg-twitter-blue text-white p-2 rounded-full hover:bg-blue-600 transition"
              >
                <Camera size={16} />
              </label>
            </div>
            
            {uploadingImage && (
              <span className="ml-3 text-gray-500">Uploading...</span>
            )}
          </div>
        </div>
        
        {/* Bio */}
        <div className="mb-4">
          <label className="block text-gray-700 mb-2" htmlFor="bio">Bio</label>
          <textarea
            id="bio"
            name="bio"
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-twitter-blue"
            value={formData.bio}
            onChange={handleInputChange}
            placeholder="Tell us about yourself"
          />
        </div>
        
        {/* Location */}
        <div className="mb-4">
          <label className="block text-gray-700 mb-2" htmlFor="location">Location</label>
          <input
            type="text"
            id="location"
            name="location"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-twitter-blue"
            value={formData.location}
            onChange={handleInputChange}
            placeholder="Where are you located?"
          />
        </div>
        
        {/* Website */}
        <div className="mb-4">
          <label className="block text-gray-700 mb-2" htmlFor="website">Website</label>
          <input
            type="url"
            id="website"
            name="website"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-twitter-blue"
            value={formData.website}
            onChange={handleInputChange}
            placeholder="https://your-website.com"
          />
        </div>
        
        {/* Submit Button */}
        <button
          type="submit"
          className="px-4 py-2 bg-twitter-blue text-white rounded-full hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={loading}
        >
          {loading ? 'Saving...' : 'Save Profile'}
        </button>
      </form>
    </div>
  );
};

export default ProfileUpdateForm;
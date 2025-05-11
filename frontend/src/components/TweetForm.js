// frontend/src/components/TweetForm.js
import React, { useState, useContext, useRef } from 'react';
import { Camera, X } from 'lucide-react';
import axios from 'axios';
import { AuthContext } from '../contexts/AuthContext';

const TweetForm = ({ onTweetAdded }) => {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageUrl, setImageUrl] = useState(null);
  const [imagePreview, setImagePreview] = useState(null); // Added for preview
  const [uploadError, setUploadError] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);
  
  const { currentUser, isAuthenticated } = useContext(AuthContext);

  const handleContentChange = (e) => {
    setContent(e.target.value);
  };

  const handleImageClick = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Reset error state
    setUploadError(null);
    setIsUploading(true);

    // File type validation
    if (!file.type.startsWith('image/')) {
      setUploadError('Only image files are allowed');
      setIsUploading(false);
      return;
    }

    // File size validation (8MB max)
    if (file.size > 8 * 1024 * 1024) {
      setUploadError('File size must be less than 8MB');
      setIsUploading(false);
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);

    const formData = new FormData();
    formData.append('file', file);

    try {
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

      // Log full response for debugging
      console.log('Image upload response:', response.data);

      if (response.data.url) {
        // Store the URL but don't display it
        setImageUrl(response.data.url);
      } else if (response.data.error) {
        setUploadError(response.data.error);
        setImagePreview(null);
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      setUploadError(error.response?.data?.detail || 'Failed to upload image');
      setImagePreview(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim() || !isAuthenticated || isSubmitting) return;

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('content', content);
      
      // Include image URL if available
      if (imageUrl) {
        console.log('Adding media URL to tweet:', imageUrl);
        formData.append('media_urls', JSON.stringify([imageUrl]));
      }

      // Log the complete FormData for debugging
      for (let pair of formData.entries()) {
        console.log(pair[0] + ': ' + pair[1]);
      }

      const response = await axios.post(
        'http://localhost:8000/tweets',
        formData,
        {
          headers: {
            'Authorization': `Bearer ${currentUser.access_token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      console.log('Tweet created successfully:', response.data);

      // Reset form
      setContent('');
      setImageUrl(null);
      setImagePreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Notify parent component to update the timeline
      if (onTweetAdded && typeof onTweetAdded === 'function') {
        onTweetAdded(response.data);
      }
    } catch (error) {
      console.error('Error creating tweet:', error);
      alert('Failed to create tweet. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClearImage = () => {
    setImageUrl(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="border-b border-gray-200 p-4">
      <form onSubmit={handleSubmit} encType="multipart/form-data">
        <div className="flex">
          <div className="flex-shrink-0">
            <div className="h-12 w-12 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-bold text-xl">
              {currentUser?.username?.[0]?.toUpperCase() || '?'}
            </div>
          </div>
          <div className="ml-3 flex-1">
            <textarea
              className="w-full border-none focus:ring-0 text-lg placeholder-gray-500 pb-3"
              placeholder="What's happening?"
              value={content}
              onChange={handleContentChange}
              rows={3}
              disabled={!isAuthenticated}
            />
            
            {/* Display upload error if any */}
            {uploadError && (
              <div className="mb-3 p-2 bg-red-50 text-red-600 rounded-lg text-sm">
                {uploadError}
              </div>
            )}
            
            {/* Show preview of uploaded image - without the URL */}
            {imagePreview && (
              <div className="relative mb-3 rounded-2xl overflow-hidden border border-gray-200 max-w-md">
                <img
                  src={imagePreview}
                  alt="Upload preview"
                  className="max-h-80 w-full object-contain bg-gray-100"
                  onError={(e) => {
                    console.error(`Failed to load image preview`);
                    e.target.style.display = 'none';
                  }}
                />
                <button
                  type="button"
                  className="absolute top-2 right-2 p-1 bg-black bg-opacity-70 rounded-full text-white"
                  onClick={handleClearImage}
                >
                  <X size={16} />
                </button>
              </div>
            )}
            
            {/* Hidden file input */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
              disabled={isUploading}
            />
            
            <div className="flex items-center justify-between border-t border-gray-200 pt-3">
              <div className="flex space-x-2">
                <button
                  type="button"
                  className="rounded-full p-2 text-twitter-blue hover:bg-blue-50"
                  disabled={!isAuthenticated || isUploading}
                  onClick={handleImageClick}
                >
                  <Camera size={20} />
                </button>
                {isUploading && (
                  <span className="text-gray-500 text-sm my-auto">Uploading...</span>
                )}
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-twitter-blue text-white rounded-full hover:bg-twitter-blue-dark disabled:opacity-50"
                disabled={!content.trim() || !isAuthenticated || isSubmitting}
              >
                Tweet
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default TweetForm;
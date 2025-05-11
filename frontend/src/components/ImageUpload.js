// frontend/src/components/ImageUpload.js
import React, { useState } from 'react';
import axios from 'axios';
import { Upload, AlertCircle } from 'lucide-react';
import { AuthContext } from '../contexts/AuthContext';

const ImageUpload = ({ onImageUploaded }) => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [preview, setPreview] = useState(null);
  const { currentUser } = React.useContext(AuthContext);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    setError(null);
    
    // Show preview of the selected file
    if (selectedFile) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(selectedFile);
      
      // Auto-upload when file is selected
      handleUpload(selectedFile);
    }
  };

  const handleUpload = async (selectedFile) => {
    if (!selectedFile) return;
    
    const formData = new FormData();
    formData.append('file', selectedFile);
    
    setUploading(true);
    setError(null);
    
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
      
      // Log the response to verify image upload
      console.log('Image uploaded:', response.data);
      
      if (response.data.url) {
        // Call the callback with the image URL, but don't display it in UI
        onImageUploaded(response.data.url);
      } else if (response.data.error) {
        setError(response.data.error);
        setPreview(null);
      }
    } catch (err) {
      console.error('Error uploading image:', err);
      setError(err.response?.data?.detail || 'Failed to upload image');
      setPreview(null);
    } finally {
      setUploading(false);
      // Don't reset file input and preview on success - only on error
      if (error) {
        setFile(null);
      }
    }
  };

  const handleRemovePreview = () => {
    setPreview(null);
    setFile(null);
    // Let the parent component know the image was removed
    onImageUploaded(null);
  };

  return (
    <div className="w-full">
      {error && (
        <div className="mb-3 p-3 bg-red-50 text-red-600 rounded-lg flex items-center">
          <AlertCircle size={18} className="mr-2" />
          <span>{error}</span>
        </div>
      )}
      
      {!preview ? (
        <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <Upload className="w-8 h-8 mb-2 text-gray-500" />
            <p className="mb-2 text-sm text-gray-500">
              <span className="font-semibold">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-gray-500">PNG, JPG or GIF (max 8MB)</p>
          </div>
          <input 
            id="file-upload"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
            disabled={uploading}
          />
        </label>
      ) : (
        <div className="relative rounded-lg overflow-hidden border border-gray-200">
          <img 
            src={preview} 
            alt="Preview" 
            className="w-full max-h-80 object-contain"
          />
          <button
            type="button"
            onClick={handleRemovePreview}
            className="absolute top-2 right-2 p-1 bg-black bg-opacity-70 rounded-full text-white"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      )}
      
      {uploading && (
        <div className="mt-3 p-2 bg-gray-50 rounded-lg text-center">
          <span className="text-sm text-gray-600">Uploading image...</span>
        </div>
      )}
    </div>
  );
};

export default ImageUpload;
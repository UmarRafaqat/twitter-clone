import React, { useState } from 'react';
import { Image, Smile, Calendar, MapPin } from 'lucide-react';
import tweetService from '../services/tweet.service';

const TweetForm = ({ onTweetAdded }) => {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim() || isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      const response = await tweetService.createTweet(content);
      setContent('');
      if (onTweetAdded) {
        onTweetAdded(response.data);
      }
    } catch (error) {
      console.error('Error creating tweet:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const characterLimit = 280;
  const remainingChars = characterLimit - content.length;
  const isOverLimit = remainingChars < 0;
  
  return (
    <div className="p-4 border-b border-gray-200">
      <div className="flex">
        <div className="flex-shrink-0">
          <div className="h-12 w-12 rounded-full bg-gray-300"></div>
        </div>
        <div className="ml-3 flex-1">
          <textarea
            className="w-full p-2 text-lg border-b border-gray-200 focus:outline-none focus:border-twitter-blue resize-none"
            placeholder="What's happening?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
            maxLength={characterLimit}
          ></textarea>
          
          <div className="mt-2 flex justify-between items-center">
            <div className="flex space-x-2 text-twitter-blue">
              <button className="p-2 rounded-full hover:bg-blue-50">
                <Image size={18} />
              </button>
              <button className="p-2 rounded-full hover:bg-blue-50">
                <Smile size={18} />
              </button>
              <button className="p-2 rounded-full hover:bg-blue-50">
                <Calendar size={18} />
              </button>
              <button className="p-2 rounded-full hover:bg-blue-50">
                <MapPin size={18} />
              </button>
            </div>
            
            <div className="flex items-center">
              {content.length > 0 && (
                <span className={`mr-3 text-sm ${isOverLimit ? 'text-red-500' : 'text-gray-500'}`}>
                  {remainingChars}
                </span>
              )}
              <button
                className={`bg-twitter-blue text-white font-bold px-4 py-2 rounded-full ${
                  !content.trim() || isSubmitting || isOverLimit
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:bg-blue-600'
                }`}
                disabled={!content.trim() || isSubmitting || isOverLimit}
                onClick={handleSubmit}
              >
                {isSubmitting ? 'Posting...' : 'Tweet'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TweetForm;
